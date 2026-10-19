import React, { useState } from 'react';
import { Lock, Unlock, ShieldCheck, Key, AlertCircle, Fingerprint } from 'lucide-react';
import { Language } from '../translations';

interface VaultLockScreenProps {
  hasMasterPassword: boolean;
  lang: Language;
  onUnlock: (password: string) => boolean;
  onSetMasterPassword: (password: string) => void;
  onBiometricUnlock?: () => void;
}

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  hasMasterPassword,
  lang,
  onUnlock,
  onSetMasterPassword,
  onBiometricUnlock,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    const ok = onUnlock(password);
    if (!ok) {
      setErrorMsg(
        lang === 'km'
          ? 'លេខសម្ងាត់ Master Password មិនត្រឹមត្រូវ សូមព្យាយាមម្តងទៀត!'
          : 'Incorrect Master Password. Please try again!'
      );
    }
  };

  const handleSetMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg(lang === 'km' ? 'សូមបញ្ចូលលេខសម្ងាត់' : 'Please enter a password');
      return;
    }
    if (password.length < 6) {
      setErrorMsg(
        lang === 'km'
          ? 'លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ ខ្ទង់'
          : 'Password must be at least 6 characters'
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(
        lang === 'km'
          ? 'លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ'
          : 'Passwords do not match'
      );
      return;
    }

    onSetMasterPassword(password);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/src/assets/images/atong_app_logo_1792388205054.jpg"
            alt="អាតុង (Atong) Logo"
            referrerPolicy="no-referrer"
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-cyan-500/30 shadow-2xl shadow-cyan-950/60 mb-3"
          />
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xl font-extrabold text-white">
              {lang === 'km' ? 'អាតុង (Atong)' : 'Atong Vault'}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 rounded-md font-semibold tracking-wider">
              AES-256
            </span>
          </div>
          <h1 className="text-sm font-semibold text-neutral-300 mb-1">
            {hasMasterPassword
              ? (lang === 'km' ? 'ឃ្លាំង Vault ត្រូវបានចាក់សោ' : 'Secure Vault Locked')
              : (lang === 'km' ? 'កំណត់ Master Password ការពារ Vault' : 'Set Master Password')}
          </h1>
          <p className="text-xs text-neutral-400 max-w-xs">
            {hasMasterPassword
              ? (lang === 'km'
                  ? 'សូមបញ្ចូល Master Password ដើម្បីដោះសោ និងបើកមើល Password, 2FA, Cookies'
                  : 'Enter your Master Password to unlock your credentials, 2FA codes, and cookies')
              : (lang === 'km'
                  ? 'Master Password នឹងការពាររាល់ទិន្នន័យគណនីរបស់អ្នក ដោយប្រើប្រាស់ AES-256-GCM'
                  : 'Your Master Password encrypts and protects all social media accounts with AES-256-GCM')}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {hasMasterPassword ? (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'លេខសម្ងាត់ Master Password' : 'Master Password'}
              </label>
              <input
                type="password"
                autoFocus
                required
                placeholder="••••••••••••"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>{lang === 'km' ? 'ដោះសោ Vault' : 'Unlock Vault'}</span>
            </button>

            {onBiometricUnlock && (
              <button
                type="button"
                onClick={onBiometricUnlock}
                className="w-full py-2 px-3 bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'km' ? 'ដោះសោរហ័ស (Biometric / Passkey)' : 'Quick Biometric Unlock'}</span>
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={handleSetMaster} className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'បង្កើត Master Password ថ្មី' : 'Create Master Password'}
              </label>
              <input
                type="password"
                autoFocus
                required
                placeholder="យ៉ាងតិច ៦ ខ្ទង់..."
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'ផ្ទៀងផ្ទាត់ Master Password' : 'Confirm Master Password'}
              </label>
              <input
                type="password"
                required
                placeholder="បញ្ចូលម្តងទៀត..."
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{lang === 'km' ? 'រក្សាទុក និងការពារ Vault' : 'Save & Secure Vault'}</span>
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
          <p className="text-[11px] text-neutral-500">
            {lang === 'km'
              ? 'ទិន្នន័យត្រូវបានការពារនៅលើ Browser របស់អ្នក ដោយមិនបញ្ជូន Password ទៅក្រៅទេ'
              : 'End-to-end client-side storage with zero unencrypted transmission'}
          </p>
        </div>
      </div>
    </div>
  );
};
