import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Upload,
  AlertCircle,
  Check,
  KeyRound,
  ShieldCheck,
  SwitchCamera,
  FileImage,
  Sparkles,
} from 'lucide-react';
import jsQR from 'jsqr';
import { Language } from '../translations';
import {
  ParsedTotpResult,
  parseTotpQrData,
  playScanSuccessFeedback,
} from '../utils/totpQrParser';
import { LiveTOTPDisplay } from './LiveTOTPDisplay';

interface QRCodeScannerModalProps {
  lang: Language;
  onScanSuccess: (result: ParsedTotpResult) => void;
  onClose: () => void;
}

export const QRCodeScannerModal: React.FC<QRCodeScannerModalProps> = ({
  lang,
  onScanSuccess,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedResult, setScannedResult] = useState<ParsedTotpResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop current video stream
  const stopStream = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(
        lang === 'km'
          ? 'ឧបករណ៍របស់អ្នកមិនគាំទ្រ Camera API ឬ WebRTC ទេ'
          : 'Camera access is not supported by this browser environment'
      );
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const capabilities = track.getCapabilities() as unknown as { torch?: boolean };
          if (capabilities && capabilities.torch) {
            setHasTorch(true);
          }
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Camera access error:', error);
      let errorMsg =
        lang === 'km'
          ? 'មិនអាចបើកកាមេរ៉ាបានទេ: សូមអនុញ្ញាតសិទ្ធិប្រើប្រាស់ Camera នៅក្នុង Browser settings'
          : 'Unable to access camera: Please grant camera permissions in browser settings';

      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        errorMsg =
          lang === 'km'
            ? 'ការអនុញ្ញាតកាមេរ៉ាត្រូវបានបដិសេធ។ សូមចុចលើរូបសោ (Lock icon) នៅលើ Address Bar ដើម្បីអនុញ្ញាត Camera'
            : 'Camera permission denied. Please allow camera permissions in your browser URL bar';
      } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        errorMsg =
          lang === 'km'
            ? 'រកមិនឃើញកាមេរ៉ានៅលើឧបករណ៍នេះទេ'
            : 'No camera hardware found on this device';
      }
      setCameraError(errorMsg);
      setIsCameraActive(false);
    }
  }, [facingMode, lang, stopStream]);

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorchState = !isTorchOn;
      await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: newTorchState }],
      });
      setIsTorchOn(newTorchState);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  // Toggle facing mode (front vs rear)
  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Process video frames with jsQR
  const scanFrame = useCallback(() => {
    if (!isScanning || scannedResult) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          const parsed = parseTotpQrData(code.data);
          if (parsed && parsed.secret) {
            playScanSuccessFeedback();
            setScannedResult(parsed);
            setIsScanning(false);
            stopStream();
            return;
          }
        }
      }
    }

    if (isScanning && !scannedResult) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
    }
  }, [isScanning, scannedResult, stopStream]);

  // Start scanning loop whenever camera becomes active
  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [activeTab, facingMode, startCamera, stopStream]);

  useEffect(() => {
    if (isCameraActive && isScanning && !scannedResult) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isCameraActive, isScanning, scannedResult, scanFrame]);

  // Image file decoding handler
  const handleProcessImage = (file: File) => {
    setImageError(null);
    if (!file.type.startsWith('image/')) {
      setImageError(lang === 'km' ? 'សូមជ្រើសរើសឯកសាររូបភាព (PNG, JPG, WebP)' : 'Please select an image file (PNG, JPG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setImageError(lang === 'km' ? 'មិនអាចដំណើរការរូបភាពបានទេ' : 'Could not process image');
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          const parsed = parseTotpQrData(code.data);
          if (parsed && parsed.secret) {
            playScanSuccessFeedback();
            setScannedResult(parsed);
            setIsScanning(false);
          } else {
            setImageError(
              lang === 'km'
                ? `បានរកឃើញ QR Code ប៉ុន្តែមិនមាន TOTP Secret Key ត្រឹមត្រូវទេ: "${code.data.slice(0, 40)}..."`
                : `QR code found but does not contain a valid TOTP key: "${code.data.slice(0, 40)}..."`
            );
          }
        } else {
          setImageError(
            lang === 'km'
              ? 'រកមិនឃើញ QR Code ក្នុងរូបភាពនេះទេ។ សូមសាកល្បងរូបភាពដែលច្បាស់ជាងនេះ។'
              : 'No QR code detected in this image. Please ensure the QR code is clearly visible.'
          );
        }
      };
      img.onerror = () => {
        setImageError(lang === 'km' ? 'បរាជ័យក្នុងការបើករូបភាព' : 'Failed to load image');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessImage(e.dataTransfer.files[0]);
    }
  };

  // Reset scanner to scan again
  const handleScanAgain = () => {
    setScannedResult(null);
    setIsScanning(true);
    setImageError(null);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  // Confirm and apply scanned secret
  const handleConfirmResult = () => {
    if (scannedResult) {
      onScanSuccess(scannedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                {lang === 'km' ? 'ស្កេន Authenticator QR Code' : 'Scan Authenticator QR Code'}
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-md">
                  TOTP 2FA
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                {lang === 'km'
                  ? 'តម្រង់កាមេរ៉ាទៅលើ QR Code ឬបញ្ចូលរូបថត'
                  : 'Point camera at authenticator QR code or upload image'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switchers: Live Camera vs Image Upload */}
        {!scannedResult && (
          <div className="flex border-b border-neutral-800 bg-neutral-950/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'camera'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'កាមេរ៉ាផ្ទាល់ (Camera)' : 'Live Camera'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'upload'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'បញ្ចូលរូបថត (Upload)' : 'Upload Image'}</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center">
          {/* STATE 1: SCANNED SUCCESS PREVIEW */}
          {scannedResult ? (
            <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">
                    {lang === 'km' ? 'ស្កេនជោគជ័យ!' : 'QR Code Scanned Successfully!'}
                  </h4>
                  <p className="text-xs text-neutral-300">
                    {lang === 'km'
                      ? 'រកឃើញ TOTP Secret Key ត្រឹមត្រូវ និងបានបង្កើត Live OTP'
                      : 'Valid TOTP secret key extracted and verified.'}
                  </p>
                </div>
              </div>

              {/* Scanned Details Card */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                {scannedResult.issuer && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">{lang === 'km' ? 'អ្នកផ្តល់សេវា (Issuer):' : 'Issuer / Provider:'}</span>
                    <span className="font-semibold text-neutral-100 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded">
                      {scannedResult.issuer}
                    </span>
                  </div>
                )}

                {scannedResult.account && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">{lang === 'km' ? 'គណនី / អ៊ីមែល:' : 'Account / User:'}</span>
                    <span className="font-mono text-neutral-200 truncate max-w-[220px]">
                      {scannedResult.account}
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-xs text-neutral-400 block">
                    {lang === 'km' ? 'TOTP Secret Key (Base32):' : 'Extracted Secret Key (Base32):'}
                  </span>
                  <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg font-mono text-xs text-emerald-400 tracking-wider break-all select-all">
                    {scannedResult.secret}
                  </div>
                </div>

                {/* Instant Live OTP verification display */}
                <div className="pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-300 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === 'km' ? 'ការផ្ទៀងផ្ទាត់ OTP ផ្ទាល់ (Live Verification):' : 'Live OTP Verification Preview:'}</span>
                  </div>
                  <LiveTOTPDisplay secret={scannedResult.secret} compact={false} />
                </div>
              </div>

              {/* Actions: Apply Key or Rescan */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="flex-1 py-2.5 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'ស្កេនម្តងទៀត' : 'Scan Again'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmResult}
                  className="flex-[2] py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{lang === 'km' ? 'ប្រើប្រាស់ Secret Key នេះ' : 'Apply This Secret Key'}</span>
                </button>
              </div>
            </div>
          ) : activeTab === 'camera' ? (
            /* STATE 2: LIVE CAMERA SCANNER */
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="p-5 text-center bg-rose-950/20 border border-rose-900/50 rounded-2xl max-w-md my-4 space-y-3">
                  <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                  <h4 className="text-sm font-semibold text-rose-300">
                    {lang === 'km' ? 'មិនអាចបើកកាមេរ៉ាបានទេ' : 'Camera Unavailable'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {cameraError}
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'សាកល្បងម្តងទៀត' : 'Retry Camera'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'បញ្ចូលរូបថត QR ជំនួស' : 'Upload QR Image Instead'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full aspect-square max-w-[340px] rounded-2xl overflow-hidden bg-black border-2 border-neutral-800 shadow-inner flex items-center justify-center">
                  {/* Camera Video Stream */}
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Hidden Canvas for Frame Processing */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Darkened Reticle Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Outer Mask */}
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Target Viewfinder Box */}
                    <div className="relative w-56 h-56 rounded-2xl border-2 border-dashed border-emerald-400/70 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-transparent">
                      {/* Corner Target Markers */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                      {/* Animated Laser Scanning Line */}
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-laser-scan" />
                    </div>
                  </div>

                  {/* Camera Floating Controls */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      title={lang === 'km' ? 'ប្តូរកាមេរ៉ាមុខ/ក្រោយ' : 'Switch Camera'}
                      className="p-2.5 bg-neutral-900/80 backdrop-blur hover:bg-neutral-800 text-neutral-200 rounded-full border border-neutral-700/80 transition-colors"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>

                    <div className="px-3 py-1 bg-neutral-900/80 backdrop-blur rounded-full border border-neutral-700/80 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{lang === 'km' ? 'កំពុងស្វែងរក...' : 'Scanning...'}</span>
                    </div>

                    {hasTorch ? (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        title={isTorchOn ? 'បិទពិល' : 'បើកពិល'}
                        className={`p-2.5 rounded-full border backdrop-blur transition-colors ${
                          isTorchOn
                            ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                            : 'bg-neutral-900/80 text-neutral-200 border-neutral-700/80 hover:bg-neutral-800'
                        }`}
                      >
                        {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                      </button>
                    ) : (
                      <div className="w-9 h-9" /> // placeholder for symmetry
                    )}
                  </div>
                </div>
              )}

              {/* Guide tips */}
              <p className="text-xs text-neutral-400 text-center mt-3 max-w-sm">
                {lang === 'km'
                  ? 'សូមតម្រង់កាមេរ៉ាទៅលើ QR Code របស់ Authenticator (Google, GitHub, Facebook, etc.) ក្នុងប្រអប់ដើម្បីស្កេន'
                  : 'Align the 2FA authenticator QR code inside the frame to capture the secret key'}
              </p>
            </div>
          ) : (
            /* STATE 3: IMAGE UPLOAD / DROP ZONE */
            <div className="w-full flex flex-col items-center space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessImage(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-md p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-emerald-400 bg-emerald-950/20'
                    : 'border-neutral-750 hover:border-neutral-600 bg-neutral-950/50 hover:bg-neutral-900/60'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 border border-neutral-700/80 flex items-center justify-center text-neutral-300 mb-3">
                  <FileImage className="w-6 h-6 text-emerald-400" />
                </div>
                <h4 className="text-sm font-semibold text-neutral-200 mb-1">
                  {lang === 'km'
                    ? 'ចុចដើម្បីជ្រើសរើសរូបថត ឬទាញទម្លាក់ទីនេះ'
                    : 'Click to choose image or drag & drop here'}
                </h4>
                <p className="text-xs text-neutral-400 max-w-xs">
                  {lang === 'km'
                    ? 'គាំទ្ររូបថត Screenshot ឬរូបភាព QR Code (PNG, JPG, WebP)'
                    : 'Supports screenshot images or photos containing authenticator QR codes'}
                </p>
              </div>

              {imageError && (
                <div className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-xl text-xs text-rose-300 flex items-center gap-2 max-w-md w-full animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800/80 text-[11px] text-neutral-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {lang === 'km'
                ? 'ដំណើរការស្កេនក្នុង Local មិនបញ្ជូនរូបភាពចេញក្រៅឡើយ'
                : '100% Client-side processing. Video frames never leave your browser.'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-xs px-2 py-1 rounded"
          >
            {lang === 'km' ? 'បោះបង់' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
