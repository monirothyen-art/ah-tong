import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Upload,
  FileText,
  Lock,
  Unlock,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Cloud,
  CloudUpload,
  CloudDownload,
  Trash2,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  FolderGit2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Account } from '../types/account';
import {
  exportVaultJSON,
  exportVaultCSV,
  importVaultFile,
} from '../utils/storage';
import {
  googleSignIn,
  googleSignOut,
  initGoogleAuth,
  uploadVaultBackupToDrive,
  listVaultBackupsFromDrive,
  downloadVaultBackupFromDrive,
  deleteVaultBackupFromDrive,
  GoogleDriveBackupFile,
  hasActiveToken,
} from '../utils/googleDrive';
import { Language, translations } from '../translations';

interface ExportImportModalProps {
  accounts: Account[];
  lang: Language;
  initialTab?: 'google' | 'export' | 'import';
  onImportComplete: (accounts: Account[], mode: 'merge' | 'replace') => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  accounts,
  lang,
  initialTab = 'google',
  onImportComplete,
  onClose,
  onToast,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'google' | 'export' | 'import'>(initialTab);

  // Local Export states
  const [exportPassword, setExportPassword] = useState('');
  const [exportType, setExportType] = useState<'encrypted' | 'plain' | 'csv'>('encrypted');

  // Local Import states
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isEncryptedFile, setIsEncryptedFile] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importError, setImportError] = useState<string | null>(null);

  // Google Drive states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [driveBackups, setDriveBackups] = useState<GoogleDriveBackupFile[]>([]);
  const [drivePassword, setDrivePassword] = useState('');
  const [driveEncryptEnabled, setDriveEncryptEnabled] = useState(true);
  const [driveStatusMessage, setDriveStatusMessage] = useState<string | null>(null);
  const [driveErrorMessage, setDriveErrorMessage] = useState<string | null>(null);

  // Drive restore modal dialog state
  const [restoreTargetFile, setRestoreTargetFile] = useState<GoogleDriveBackupFile | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Mandatory confirmation dialog for deleting a file on Google Drive (Workspace integration requirement)
  const [fileToDelete, setFileToDelete] = useState<GoogleDriveBackupFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Listen to Google Auth state
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        if (token) {
          fetchDriveBackups();
        }
      },
      () => {
        setGoogleUser(null);
        setDriveBackups([]);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch list of backups from Google Drive
  const fetchDriveBackups = async () => {
    if (!hasActiveToken()) return;
    setIsDriveLoading(true);
    setDriveErrorMessage(null);
    try {
      const files = await listVaultBackupsFromDrive();
      setDriveBackups(files);
    } catch (err: any) {
      if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
        setDriveErrorMessage(
          lang === 'km'
            ? 'សិទ្ធិ Google Drive បានផុតកំណត់ សូមចុច Connect ម្តងទៀត'
            : 'Google Drive authorization expired. Please reconnect.'
        );
      } else {
        setDriveErrorMessage(
          lang === 'km'
            ? 'មិនអាចទាញយកបញ្ជី Backup ពី Google Drive បានទេ'
            : 'Failed to fetch backups from Google Drive.'
        );
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    setIsDriveLoading(true);
    setDriveErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        onToast(lang === 'km' ? 'បានភ្ជាប់គណនី Google ដោយជោគជ័យ' : 'Connected to Google Drive');
        const files = await listVaultBackupsFromDrive();
        setDriveBackups(files);
      }
    } catch (err: any) {
      console.error(err);
      setDriveErrorMessage(
        lang === 'km'
          ? 'ការភ្ជាប់ជាមួយ Google មិនបានសម្រេច សូមព្យាយាមម្តងទៀត'
          : 'Google sign-in failed. Please try again.'
      );
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Handle Google Sign-Out
  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setDriveBackups([]);
      onToast(lang === 'km' ? 'បានចាកចេញពី Google' : 'Signed out of Google');
    } catch {
      onToast(lang === 'km' ? 'មានបញ្ហាក្នុងការចាកចេញ' : 'Sign out error');
    }
  };

  // Handle Upload Vault to Google Drive
  const handleUploadToDrive = async () => {
    if (!googleUser || !hasActiveToken()) {
      handleGoogleLogin();
      return;
    }
    if (driveEncryptEnabled && !drivePassword.trim()) {
      setDriveErrorMessage(
        lang === 'km'
          ? 'សូមបញ្ចូលពាក្យសម្ងាត់ដើម្បី Encrypt Backup លើ Drive'
          : 'Please enter a password to encrypt your cloud backup'
      );
      return;
    }

    setIsDriveUploading(true);
    setDriveErrorMessage(null);
    setDriveStatusMessage(t.backingUpToDrive);
    try {
      const result = await uploadVaultBackupToDrive(
        accounts,
        driveEncryptEnabled ? drivePassword.trim() : undefined
      );
      setDriveStatusMessage(null);
      onToast(t.backupSuccessDrive);
      setDrivePassword('');
      // Refresh list
      await fetchDriveBackups();
    } catch (err: any) {
      setDriveStatusMessage(null);
      if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
        setDriveErrorMessage(
          lang === 'km'
            ? 'សូមចុច Sign in ជាមួយ Google ឡើងវិញដើម្បីបន្ត'
            : 'Session expired. Please sign in with Google again.'
        );
      } else {
        setDriveErrorMessage(
          lang === 'km'
            ? 'មានបញ្ហាក្នុងការ Upload ទៅ Google Drive'
            : 'Failed to upload backup to Google Drive.'
        );
      }
    } finally {
      setIsDriveUploading(false);
    }
  };

  // Handle Restore from Google Drive
  const handleExecuteRestoreFromDrive = async () => {
    if (!restoreTargetFile) return;
    setIsRestoring(true);
    setRestoreError(null);
    try {
      const imported = await downloadVaultBackupFromDrive(
        restoreTargetFile.id,
        restoreTargetFile.isEncrypted ? restorePassword.trim() : undefined
      );

      onImportComplete(imported, restoreMode);
      onToast(
        lang === 'km'
          ? `បានស្ដារគណនីចំនួន ${imported.length} ពី Google Drive ដោយជោគជ័យ!`
          : `Restored ${imported.length} accounts from Google Drive!`
      );
      setRestoreTargetFile(null);
      setRestorePassword('');
      onClose();
    } catch (err: any) {
      if (err.message === 'PASSWORD_REQUIRED') {
        setRestoreError(
          lang === 'km'
            ? 'សូមបញ្ចូលពាក្យសម្ងាត់សម្រាប់ដោះសោ File នេះ'
            : 'Password required to decrypt this file'
        );
      } else if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
        setRestoreError(
          lang === 'km'
            ? 'សិទ្ធិ Google Drive បានផុតកំណត់ សូម Login ម្តងទៀត'
            : 'Session expired. Please reconnect Google account.'
        );
      } else {
        setRestoreError(
          lang === 'km'
            ? 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ ឬ File ខូច'
            : 'Decryption failed. Incorrect password or invalid file.'
        );
      }
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle Confirm Delete on Google Drive (Workspace mandatory explicit confirmation)
  const handleExecuteDeleteDriveFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteVaultBackupFromDrive(fileToDelete.id);
      onToast(lang === 'km' ? 'បានលុប Backup ពី Google Drive រួចរាល់' : 'Backup deleted from Google Drive');
      setFileToDelete(null);
      await fetchDriveBackups();
    } catch (err: any) {
      onToast(lang === 'km' ? 'មានបញ្ហាក្នុងការលុបពី Google Drive' : 'Failed to delete file from Google Drive');
    } finally {
      setIsDeleting(false);
    }
  };

  // Local Export
  const handleLocalExport = async () => {
    try {
      if (exportType === 'csv') {
        exportVaultCSV(accounts);
        onToast(lang === 'km' ? 'បានទាញយក CSV File រួចរាល់' : 'Exported CSV successfully');
      } else if (exportType === 'plain') {
        await exportVaultJSON(accounts);
        onToast(lang === 'km' ? 'បានទាញយក JSON File រួចរាល់' : 'Exported plain JSON backup');
      } else {
        if (!exportPassword) {
          onToast(lang === 'km' ? 'សូមបញ្ចូល Password ដើម្បីការពារ Encrypted File' : 'Enter a password for the encrypted file');
          return;
        }
        await exportVaultJSON(accounts, exportPassword);
        onToast(lang === 'km' ? 'បានទាញយក Encrypted Backup រួចរាល់' : 'Exported encrypted backup file');
      }
    } catch {
      onToast(lang === 'km' ? 'មានបញ្ហាក្នុងការទាញយក' : 'Export failed');
    }
  };

  // Local File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const text = evt.target?.result as string;
        setFileContent(text);
        const parsed = JSON.parse(text);
        if (parsed && parsed.vaultType === 'SecureVault-Khmer-Encrypted') {
          setIsEncryptedFile(true);
        } else {
          setIsEncryptedFile(false);
        }
      } catch {
        setImportError(lang === 'km' ? 'File មិនត្រឹមត្រូវតាមទម្រង់ JSON' : 'Invalid JSON file format');
      }
    };
    reader.readAsText(file);
  };

  // Local Import
  const handleLocalImport = async () => {
    if (!fileContent) return;
    try {
      setImportError(null);
      const importedAccounts = await importVaultFile(
        fileContent,
        isEncryptedFile ? importPassword : undefined
      );

      onImportComplete(importedAccounts, importMode);
      onToast(
        lang === 'km'
          ? `បានស្ដារគណនីចំនួន ${importedAccounts.length} បានជោគជ័យ!`
          : `Restored ${importedAccounts.length} accounts successfully!`
      );
      onClose();
    } catch (err: any) {
      if (err.message === 'PASSWORD_REQUIRED') {
        setImportError(lang === 'km' ? 'សូមបញ្ចូល Password សម្រាប់ដោះសោ File នេះ' : 'Password is required to decrypt this file');
      } else {
        setImportError(lang === 'km' ? 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ ឬ File ខូច' : 'Decryption failed. Incorrect password or corrupt file');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <span>{t.cloudBackupTitle}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {t.cloudBackupDesc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Tab Segmented Switcher */}
        <div className="p-3 border-b border-neutral-800/80 bg-neutral-950/50 shrink-0">
          <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
            <button
              onClick={() => setActiveTab('google')}
              className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'google'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-neutral-700/50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Google Drive</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`py-2 px-3 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm border border-neutral-700/50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'នាំចេញ File' : 'Export File'}</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`py-2 px-3 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm border border-neutral-700/50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{lang === 'km' ? 'ស្ដារ File' : 'Import File'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-xs overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: GOOGLE DRIVE CLOUD SYNC */}
          {activeTab === 'google' && (
            <div className="space-y-5">
              {/* Not connected: Show Official Sign in with Google Button */}
              {!googleUser || !hasActiveToken() ? (
                <div className="p-6 bg-neutral-950/70 border border-neutral-800 rounded-xl text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CloudUpload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-100 mb-1">
                      {lang === 'km' ? 'ភ្ជាប់ Google Drive សម្រាប់ Backup ទិន្នន័យ' : 'Connect Google Drive for Cloud Backup'}
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                      {t.driveHelpNote}
                    </p>
                  </div>

                  {/* Error display if any */}
                  {driveErrorMessage && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-center justify-center gap-2 text-left">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{driveErrorMessage}</span>
                    </div>
                  )}

                  {/* Official Google Sign-in Button style per Google Workspace guidelines */}
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isDriveLoading}
                      className="inline-flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-800 font-medium text-xs rounded-lg shadow-md border border-neutral-200 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {/* Official Google G SVG */}
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        className="w-4 h-4 shrink-0"
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                      <span className="font-semibold tracking-wide">
                        {isDriveLoading ? 'Connecting...' : t.googleSignIn}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Connected: Show Account Bar + Backup Actions + File List */
                <div className="space-y-4">
                  {/* Google User Connected Card */}
                  <div className="flex items-center justify-between p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      {googleUser.photoURL ? (
                        <img
                          src={googleUser.photoURL}
                          alt={googleUser.displayName || 'Google User'}
                          className="w-9 h-9 rounded-full border border-neutral-700 object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                          {googleUser.email?.[0].toUpperCase() || 'G'}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-neutral-100 flex items-center gap-2">
                          <span>{googleUser.displayName || googleUser.email}</span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {t.googleConnected}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          {googleUser.email}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleGoogleLogout}
                      title={t.googleSignOut}
                      className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-neutral-100 rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{lang === 'km' ? 'ចាកចេញ' : 'Disconnect'}</span>
                    </button>
                  </div>

                  {/* Create New Cloud Backup Box */}
                  <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-neutral-200 flex items-center gap-2">
                        <CloudUpload className="w-4 h-4 text-emerald-400" />
                        <span>{lang === 'km' ? 'បង្កើត Backup ថ្មីលើ Google Drive' : 'Create New Cloud Backup'}</span>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        {accounts.length} {lang === 'km' ? 'គណនី' : 'accounts'}
                      </span>
                    </div>

                    {/* Encryption Toggle */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={driveEncryptEnabled}
                          onChange={e => setDriveEncryptEnabled(e.target.checked)}
                          className="accent-emerald-500 rounded"
                        />
                        <span className="font-medium">
                          {lang === 'km' ? 'Encrypt ជាមួយពាក្យសម្ងាត់ (AES-256)' : 'Encrypt with password (AES-256)'}
                        </span>
                      </label>

                      {driveEncryptEnabled && (
                        <input
                          type="password"
                          placeholder={lang === 'km' ? 'បញ្ចូលពាក្យសម្ងាត់សម្រាប់ Encrypt Backup...' : 'Enter encryption password...'}
                          value={drivePassword}
                          onChange={e => setDrivePassword(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                        />
                      )}
                    </div>

                    {driveErrorMessage && (
                      <div className="p-2.5 bg-rose-950/40 border border-rose-800/80 rounded-lg text-rose-300 text-[11px] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{driveErrorMessage}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isDriveUploading}
                      onClick={handleUploadToDrive}
                      className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-neutral-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDriveUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{driveStatusMessage || t.backingUpToDrive}</span>
                        </>
                      ) : (
                        <>
                          <CloudUpload className="w-4 h-4" />
                          <span>{t.backupNowToDrive}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* List of Backups in Google Drive */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{t.driveBackupsFound}</span>
                        <span className="text-[11px] text-neutral-500 font-mono">
                          ({driveBackups.length})
                        </span>
                      </span>
                      <button
                        onClick={fetchDriveBackups}
                        disabled={isDriveLoading}
                        title="Refresh"
                        className="p-1 text-neutral-400 hover:text-neutral-200 rounded transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isDriveLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {isDriveLoading && driveBackups.length === 0 ? (
                      <div className="p-6 text-center text-neutral-500 flex flex-col items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                        <span>{lang === 'km' ? 'កំពុងស្វែងរក Backups ក្នុង Google Drive...' : 'Checking Google Drive for backups...'}</span>
                      </div>
                    ) : driveBackups.length === 0 ? (
                      <div className="p-6 bg-neutral-950/40 border border-neutral-800/80 rounded-xl text-center text-neutral-500 text-xs">
                        {t.noDriveBackups}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {driveBackups.map(file => (
                          <div
                            key={file.id}
                            className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-neutral-200 truncate font-mono text-[11px]">
                                  {file.name}
                                </span>
                                {file.isEncrypted ? (
                                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Encrypted</span>
                                  </span>
                                ) : (
                                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                    <FileText className="w-2.5 h-2.5" />
                                    <span>Plain</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-500 mt-0.5 flex items-center gap-3">
                                <span>{new Date(file.modifiedTime).toLocaleString()}</span>
                                {file.size && <span>{file.size}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setRestoreTargetFile(file);
                                  setRestorePassword('');
                                  setRestoreError(null);
                                }}
                                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-emerald-500 hover:text-neutral-950 text-neutral-200 font-semibold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <CloudDownload className="w-3.5 h-3.5" />
                                <span>{t.restoreFromDrive}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setFileToDelete(file)}
                                title={t.deleteDriveBackup}
                                className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOCAL EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div>
                <label className="block text-neutral-300 font-medium mb-2">
                  {lang === 'km' ? 'ជ្រើសរើសទម្រង់ Backup:' : 'Choose Backup Format:'}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <label className="flex items-center gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700">
                    <input
                      type="radio"
                      name="exportType"
                      checked={exportType === 'encrypted'}
                      onChange={() => setExportType('encrypted')}
                      className="accent-emerald-500"
                    />
                    <div>
                      <div className="text-neutral-200 font-semibold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{lang === 'km' ? 'Encrypted JSON (.svault) - សុវត្ថិភាពខ្ពស់បំផុត' : 'Encrypted JSON (.svault) - High Security'}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {lang === 'km'
                          ? 'ការពារដោយពាក្យសម្ងាត់ AES-256-GCM គ្មាននរណាអាចបើកអានក្រៅពីអ្នកឡើយ'
                          : 'AES-256-GCM encrypted with custom password.'}
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700">
                    <input
                      type="radio"
                      name="exportType"
                      checked={exportType === 'plain'}
                      onChange={() => setExportType('plain')}
                      className="accent-emerald-500"
                    />
                    <div>
                      <div className="text-neutral-200 font-semibold flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        <span>{lang === 'km' ? 'Plain JSON (.json) ធម្មតា' : 'Plain JSON (.json)'}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {lang === 'km' ? 'មិនមាន encryption ងាយស្រួលផ្ទេរចូលកម្មវិធីផ្សេង' : 'Raw JSON format without encryption.'}
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700">
                    <input
                      type="radio"
                      name="exportType"
                      checked={exportType === 'csv'}
                      onChange={() => setExportType('csv')}
                      className="accent-emerald-500"
                    />
                    <div>
                      <div className="text-neutral-200 font-semibold flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'km' ? 'CSV Spreadsheet (.csv)' : 'CSV Spreadsheet (.csv)'}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {lang === 'km' ? 'សម្រាប់បើកក្នុង Excel ឬ Print ចេញទុកក្រៅបណ្តាញ' : 'Suitable for Excel, Google Sheets, or printing.'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {exportType === 'encrypted' && (
                <div>
                  <label className="block text-neutral-300 font-medium mb-1.5">
                    {lang === 'km' ? 'ពាក្យសម្ងាត់ការពារ Backup File (Password) *' : 'Backup Protection Password *'}
                  </label>
                  <input
                    type="password"
                    placeholder="បញ្ចូលលេខសម្ងាត់សម្រាប់ Encrypt..."
                    value={exportPassword}
                    onChange={e => setExportPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleLocalExport}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {lang === 'km' ? `ទាញយក (${accounts.length} គណនី)` : `Download Backup (${accounts.length} Accounts)`}
                </span>
              </button>
            </div>
          )}

          {/* TAB 3: LOCAL IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div>
                <label className="block text-neutral-300 font-medium mb-1.5">
                  {lang === 'km' ? 'ជ្រើសរើស File Backup (.svault ឬ .json)' : 'Select Backup File (.svault or .json)'}
                </label>
                <input
                  type="file"
                  accept=".json,.svault"
                  onChange={handleFileChange}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-300 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer"
                />
              </div>

              {isEncryptedFile && (
                <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Lock className="w-4 h-4" />
                    <span>{lang === 'km' ? 'File នេះត្រូវបាន Encrypt ដោយសុវត្ថិភាព' : 'File is Encrypted'}</span>
                  </div>
                  <label className="block text-neutral-400 text-[11px]">
                    {lang === 'km' ? 'សូមបញ្ចូល Password ដែលបានដាក់ពេល Export:' : 'Enter the password used when exporting:'}
                  </label>
                  <input
                    type="password"
                    placeholder="បញ្ចូល Decryption Password..."
                    value={importPassword}
                    onChange={e => setImportPassword(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-3 py-2 text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {importError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Import Mode: Merge vs Replace */}
              <div className="space-y-1.5">
                <span className="text-neutral-300 font-medium">
                  {lang === 'km' ? 'របៀបបញ្ចូលទិន្នន័យ:' : 'Import Mode:'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2.5 bg-neutral-950/60 rounded-lg border border-neutral-800 cursor-pointer hover:border-neutral-700">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-emerald-500"
                    />
                    <div>
                      <div className="font-semibold text-neutral-200">
                        {lang === 'km' ? 'Merge (បញ្ចូលរួមគ្នា)' : 'Merge'}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {lang === 'km' ? 'រក្សាគណនីចាស់ និងបន្ថែមថ្មី' : 'Keep existing & add new'}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-neutral-950/60 rounded-lg border border-neutral-800 cursor-pointer hover:border-neutral-700">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-rose-500"
                    />
                    <div>
                      <div className="font-semibold text-rose-300">
                        {lang === 'km' ? 'Replace (ជំនួសទាំងអស់)' : 'Replace All'}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {lang === 'km' ? 'លុបចាស់ចោល ជំនួសដោយ File ថ្មី' : 'Overwrite existing vault'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="button"
                disabled={!fileContent}
                onClick={handleLocalImport}
                className="w-full py-2.5 px-4 bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                <span>{lang === 'km' ? 'ចាប់ផ្តើមស្ដារទិន្នន័យ (Restore)' : 'Restore Accounts'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RESTORE FROM GOOGLE DRIVE SUB-MODAL */}
      {restoreTargetFile && (
        <div className="fixed inset-0 z-60 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2 font-bold text-neutral-100">
                <CloudDownload className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'km' ? 'ស្ដារទិន្នន័យពី Google Drive' : 'Restore from Google Drive'}</span>
              </div>
              <button
                onClick={() => setRestoreTargetFile(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
              <div className="font-mono text-neutral-200 truncate font-semibold">
                {restoreTargetFile.name}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                {new Date(restoreTargetFile.modifiedTime).toLocaleString()} &bull; {restoreTargetFile.size}
              </div>
            </div>

            {restoreTargetFile.isEncrypted && (
              <div className="space-y-1.5">
                <label className="block text-neutral-300 font-medium text-xs">
                  {lang === 'km' ? 'បញ្ចូល Decryption Password *' : 'Decryption Password *'}
                </label>
                <input
                  type="password"
                  placeholder="បញ្ចូលលេខសម្ងាត់ដោះសោ File..."
                  value={restorePassword}
                  onChange={e => setRestorePassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Mode: Merge vs Replace */}
            <div className="space-y-1.5 text-xs">
              <span className="text-neutral-300 font-medium">
                {lang === 'km' ? 'របៀបបញ្ចូលទិន្នន័យ:' : 'Import Mode:'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRestoreMode('merge')}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    restoreMode === 'merge'
                      ? 'bg-neutral-800 border-emerald-500/50 text-neutral-100'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="font-semibold text-xs">Merge</div>
                  <div className="text-[10px] text-neutral-500">
                    {lang === 'km' ? 'រក្សាទុកចាស់ + ថែមថ្មី' : 'Keep existing & add new'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRestoreMode('replace')}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    restoreMode === 'replace'
                      ? 'bg-neutral-800 border-rose-500/50 text-neutral-100'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="font-semibold text-xs text-rose-300">Replace All</div>
                  <div className="text-[10px] text-neutral-500">
                    {lang === 'km' ? 'ជំនួសគណនីទាំងអស់' : 'Overwrite entire vault'}
                  </div>
                </button>
              </div>
            </div>

            {restoreError && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestoreTargetFile(null)}
                className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleExecuteRestoreFromDrive}
                className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudDownload className="w-4 h-4" />
                )}
                <span>{lang === 'km' ? 'ទាញយក និងស្ដារ' : 'Download & Restore'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY EXPLICIT CONFIRMATION DIALOG FOR DELETING FROM GOOGLE DRIVE (Workspace Skill Requirement) */}
      {fileToDelete && (
        <div className="fixed inset-0 z-60 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-100">
                {lang === 'km' ? 'លុបឯកសារ Backup ពី Google Drive?' : 'Delete Backup File from Google Drive?'}
              </h3>
              <p className="text-xs text-neutral-400">
                {t.confirmDeleteDriveBackup}
              </p>
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-300 text-center truncate">
              {fileToDelete.name}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFileToDelete(null)}
                className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDeleteDriveFile}
                className="flex-1 py-2 px-3 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{lang === 'km' ? 'លុបជាអចិន្ត្រៃយ៍' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
