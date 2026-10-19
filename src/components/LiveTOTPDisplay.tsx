import React, { useState, useEffect } from 'react';
import { Copy, Check, Clock, AlertTriangle } from 'lucide-react';
import { generateTOTP } from '../utils/crypto';

interface LiveTOTPDisplayProps {
  secret?: string;
  onCopy?: (code: string) => void;
  compact?: boolean;
}

export const LiveTOTPDisplay: React.FC<LiveTOTPDisplayProps> = ({ secret, onCopy, compact = false }) => {
  const [totpData, setTotpData] = useState<{ code: string; secondsRemaining: number }>({
    code: '------',
    secondsRemaining: 30,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!secret || !secret.trim()) {
      setTotpData({ code: '------', secondsRemaining: 30 });
      return;
    }

    let isMounted = true;

    const updateCode = async () => {
      const res = await generateTOTP(secret, 30);
      if (isMounted) {
        setTotpData(res);
      }
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [secret]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!totpData.code || totpData.code === '------' || totpData.code === 'INVALID') return;
    navigator.clipboard.writeText(totpData.code);
    setCopied(true);
    if (onCopy) onCopy(totpData.code);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!secret || !secret.trim()) {
    return (
      <span className="text-xs text-neutral-500 italic">
        មិនមាន 2FA
      </span>
    );
  }

  if (totpData.code === 'INVALID') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-rose-400">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Secret Key មិនត្រឹមត្រូវ</span>
      </div>
    );
  }

  // Calculate circular SVG progress
  const progressPercent = (totpData.secondsRemaining / 30) * 100;
  const isExpiringSoon = totpData.secondsRemaining <= 5;

  // Split code into two 3-digit segments for readability (e.g. 849 201)
  const formattedCode = totpData.code.length === 6
    ? `${totpData.code.slice(0, 3)} ${totpData.code.slice(3)}`
    : totpData.code;

  if (compact) {
    return (
      <button
        onClick={handleCopy}
        title="ចុចដើម្បីចម្លងកូដ 2FA OTP"
        className="group inline-flex items-center gap-2 px-2.5 py-1 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/60 rounded-md transition-all cursor-pointer font-mono text-xs tabular-nums"
      >
        <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-neutral-800"
              strokeWidth="4"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={isExpiringSoon ? 'text-rose-500' : 'text-emerald-400'}
              strokeDasharray={`${progressPercent}, 100`}
              strokeWidth="4"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>
        <span className={`font-semibold tracking-wider ${isExpiringSoon ? 'text-rose-400' : 'text-emerald-400'}`}>
          {formattedCode}
        </span>
        <span className="text-[10px] text-neutral-400 group-hover:text-neutral-200 shrink-0">
          {totpData.secondsRemaining}s
        </span>
        {copied ? (
          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
        ) : (
          <Copy className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300 shrink-0" />
        )}
      </button>
    );
  }

  return (
    <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-lg flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-neutral-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`transition-all duration-500 ${isExpiringSoon ? 'text-rose-500' : 'text-emerald-400'}`}
              strokeDasharray={`${progressPercent}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute text-[10px] font-mono tabular-nums text-neutral-400 font-semibold">
            {totpData.secondsRemaining}
          </span>
        </div>
        <div>
          <div className="text-[11px] text-neutral-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>2FA TOTP Code (Auto-Refresh)</span>
          </div>
          <div className={`text-xl font-mono font-bold tracking-widest tabular-nums ${isExpiringSoon ? 'text-rose-400' : 'text-emerald-400'}`}>
            {formattedCode}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-md transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">បានចម្លង</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-neutral-400" />
            <span>ចម្លង OTP</span>
          </>
        )}
      </button>
    </div>
  );
};
