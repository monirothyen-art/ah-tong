import React from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Plus,
  KeyRound,
  Cookie,
  ShieldAlert,
  Download,
  Languages,
  Cloud,
  Sun,
  Moon,
} from 'lucide-react';
import { Language } from '../translations';

export type MainTab = 'accounts' | 'totp' | 'cookies' | 'audit';
export type ThemeMode = 'dark' | 'light';

interface HeaderProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  lang: Language;
  onToggleLang: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  isLocked: boolean;
  onToggleLock: () => void;
  onOpenAddModal: () => void;
  onOpenExportModal: (initialTab?: 'google' | 'export' | 'import') => void;
  accountCount: number;
  googleUser?: { email?: string | null; photoURL?: string | null } | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  lang,
  onToggleLang,
  isLocked,
  onToggleLock,
  onOpenAddModal,
  onOpenExportModal,
  accountCount,
  googleUser,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Atong Brand with Generated App Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/src/assets/images/atong_app_logo_1792388205054.jpg"
            alt="អាតុង App Logo"
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-xl object-cover ring-1 ring-cyan-500/30 shadow-md shadow-cyan-950/50 hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-white whitespace-nowrap">
                {lang === 'km' ? 'អាតុង' : 'អាតុង (Atong)'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 rounded-md font-semibold tracking-wider">
                VAULT
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 hidden sm:inline leading-none font-normal">
              {lang === 'km' ? 'ប្រព័ន្ធគ្រប់គ្រងគណនី & 2FA' : 'Password & 2FA Security Manager'}
            </span>
          </div>
        </div>

        {/* Zone 2: 4 clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
          <button
            onClick={() => onTabChange('accounts')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'accounts'
                ? 'text-emerald-400 font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            {lang === 'km' ? 'គណនីទាំងអស់' : 'All Accounts'}
            <span className="ml-1.5 font-mono text-[10px] text-neutral-500 tabular-nums">
              ({accountCount})
            </span>
          </button>

          <button
            onClick={() => onTabChange('totp')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              currentTab === 'totp'
                ? 'text-emerald-400 font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>2FA Authenticator</span>
          </button>

          <button
            onClick={() => onTabChange('cookies')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              currentTab === 'cookies'
                ? 'text-emerald-400 font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'Cookie & Session' : 'Cookie Manager'}</span>
          </button>

          <button
            onClick={() => onTabChange('audit')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              currentTab === 'audit'
                ? 'text-emerald-400 font-semibold'
                : 'hover:text-neutral-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'សុខភាពសុវត្ថិភាព' : 'Security Audit'}</span>
          </button>
        </nav>

        {/* Zone 3: Primary action + Utilities */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Google Drive Cloud Sync indicator & button */}
          <button
            onClick={() => onOpenExportModal('google')}
            title={
              googleUser?.email
                ? `Google Drive: ${googleUser.email}`
                : lang === 'km'
                ? 'ភ្ជាប់ Google Drive សម្រាប់ Backup & Multi-device Sync'
                : 'Connect Google Drive for Cloud Backup & Sync'
            }
            className={`px-2.5 py-1.5 border rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
              googleUser
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            {googleUser ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="hidden lg:inline text-[11px] font-medium truncate max-w-[100px]">
                  Drive Sync
                </span>
              </>
            ) : (
              <span className="hidden lg:inline text-[11px] font-medium text-neutral-300">
                {lang === 'km' ? 'Google Sync' : 'Cloud Sync'}
              </span>
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            title={lang === 'km' ? 'ប្តូរទៅភាសាអង់គ្លេស' : 'Switch to Khmer'}
            className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-semibold">{lang === 'km' ? 'ខ្មែរ' : 'EN'}</span>
          </button>

          {/* Backup / Export */}
          <button
            onClick={() => onOpenExportModal('export')}
            title="Backup & Restore"
            className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Vault Lock button */}
          <button
            onClick={onToggleLock}
            title={isLocked ? 'ដោះសោ' : 'ចាក់សោ Vault'}
            className={`p-1.5 rounded-lg border transition-colors ${
              isLocked
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          {/* Primary CTA: Add Account */}
          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">
              {lang === 'km' ? 'បន្ថែមគណនី' : 'Add Account'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex md:hidden border-t border-neutral-850 px-4 py-2 gap-2 overflow-x-auto text-xs bg-neutral-950">
        <button
          onClick={() => onTabChange('accounts')}
          className={`px-3 py-1 rounded-md whitespace-nowrap shrink-0 ${
            currentTab === 'accounts' ? 'bg-neutral-800 text-emerald-400 font-medium' : 'text-neutral-400'
          }`}
        >
          {lang === 'km' ? 'គណនី' : 'Accounts'} ({accountCount})
        </button>
        <button
          onClick={() => onTabChange('totp')}
          className={`px-3 py-1 rounded-md whitespace-nowrap shrink-0 ${
            currentTab === 'totp' ? 'bg-neutral-800 text-emerald-400 font-medium' : 'text-neutral-400'
          }`}
        >
          2FA OTP
        </button>
        <button
          onClick={() => onTabChange('cookies')}
          className={`px-3 py-1 rounded-md whitespace-nowrap shrink-0 ${
            currentTab === 'cookies' ? 'bg-neutral-800 text-emerald-400 font-medium' : 'text-neutral-400'
          }`}
        >
          Cookie
        </button>
        <button
          onClick={() => onTabChange('audit')}
          className={`px-3 py-1 rounded-md whitespace-nowrap shrink-0 ${
            currentTab === 'audit' ? 'bg-neutral-800 text-emerald-400 font-medium' : 'text-neutral-400'
          }`}
        >
          {lang === 'km' ? 'សុវត្ថិភាព' : 'Audit'}
        </button>
      </div>
    </header>
  );
};
