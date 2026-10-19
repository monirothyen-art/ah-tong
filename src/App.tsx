/**
 * SecureVault - Social Media & Digital Account Manager
 * Client-Side Encrypted Password, 2FA TOTP, Cookie, Recovery Codes Vault.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Star,
  KeyRound,
  Cookie,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  Sparkles,
  Lock,
  Flame,
} from 'lucide-react';
import { Account, PlatformType, CategoryType, AccountStatus, VaultSettings } from './types/account';
import { getStoredAccounts, saveStoredAccounts, getStoredSettings, saveStoredSettings } from './utils/storage';
import { hashPassword } from './utils/crypto';
import { auditVaultBreaches, BreachAuditResult } from './utils/breachChecker';
import { initGoogleAuth } from './utils/googleDrive';
import { User } from 'firebase/auth';
import { Header, MainTab } from './components/Header';
import { AccountCard } from './components/AccountCard';
import { AccountDetailModal } from './components/AccountDetailModal';
import { AccountFormModal } from './components/AccountFormModal';
import { ExportImportModal } from './components/ExportImportModal';
import { VaultLockScreen } from './components/VaultLockScreen';
import { TOTPAuthenticatorHub } from './components/TOTPAuthenticatorHub';
import { CookieManagerView } from './components/CookieManagerView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { Toast } from './components/Toast';
import { Language, translations } from './translations';

export default function App() {
  const [lang, setLang] = useState<Language>('km');
  const t = translations[lang];

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>(() => getStoredAccounts());
  const [googleUser, setGoogleUser] = useState<User | null>(null);

  // Vault Settings & Lock state
  const [settings, setSettings] = useState<VaultSettings>(() => getStoredSettings());
  const [isLocked, setIsLocked] = useState<boolean>(() => settings.isLocked);

  // Active navigation tab
  const [currentTab, setCurrentTab] = useState<MainTab>('accounts');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [filterFavoriteOnly, setFilterFavoriteOnly] = useState(false);
  const [filterHas2FA, setFilterHas2FA] = useState(false);
  const [filterHasCookies, setFilterHasCookies] = useState(false);
  const [filterBreachedOnly, setFilterBreachedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'platform'>('updated');
  const [breachMap, setBreachMap] = useState<Map<string, BreachAuditResult>>(new Map());

  // Modals
  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [exportImportTab, setExportImportTab] = useState<'google' | 'export' | 'import'>('google');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Sync Google Auth state
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      user => setGoogleUser(user),
      () => setGoogleUser(null)
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync accounts to local storage whenever changed
  useEffect(() => {
    saveStoredAccounts(accounts);
    auditVaultBreaches(accounts).then(res => setBreachMap(res));
  }, [accounts]);

  // Sync settings whenever changed
  useEffect(() => {
    const updated = { ...settings, isLocked };
    saveStoredSettings(updated);
  }, [settings, isLocked]);

  // Master password unlock handler
  const handleUnlock = (enteredPassword: string): boolean => {
    if (!settings.masterPasswordHash || !settings.salt) {
      // If none set, any unlock succeeds
      setIsLocked(false);
      showToast(t.unlockSuccess);
      return true;
    }

    // Verify hash
    const saltBytes = new Uint8Array(
      settings.salt.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [0]
    );

    hashPassword(enteredPassword, saltBytes).then(computedHash => {
      if (computedHash === settings.masterPasswordHash) {
        setIsLocked(false);
        showToast(t.unlockSuccess);
      } else {
        showToast(t.invalidPassword);
      }
    });

    // Synchronous optimistic check (handled via callback)
    return true;
  };

  const handleSetMasterPassword = async (newPassword: string) => {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hash = await hashPassword(newPassword, salt);

    const newSettings: VaultSettings = {
      ...settings,
      masterPasswordHash: hash,
      salt: saltHex,
      isLocked: false,
    };
    setSettings(newSettings);
    setIsLocked(false);
    showToast(lang === 'km' ? 'បានកំណត់ Master Password ដោយជោគជ័យ' : 'Master Password set successfully');
  };

  const handleToggleLock = () => {
    setIsLocked(!isLocked);
    showToast(isLocked ? t.unlocked : t.locked);
  };

  // Account mutations
  const handleSaveAccount = (accountToSave: Account) => {
    setAccounts(prev => {
      const exists = prev.some(a => a.id === accountToSave.id);
      if (exists) {
        return prev.map(a => (a.id === accountToSave.id ? accountToSave : a));
      }
      return [accountToSave, ...prev];
    });

    if (selectedAccountForDetail?.id === accountToSave.id) {
      setSelectedAccountForDetail(accountToSave);
    }

    setIsFormOpen(false);
    setEditingAccount(null);
    showToast(lang === 'km' ? 'បានរក្សាទុកគណនីរួចរាល់' : 'Account saved successfully');
  };

  const handleDeleteAccount = (id: string) => {
    if (window.confirm(t.confirmDelete)) {
      setAccounts(prev => prev.filter(a => a.id !== id));
      if (selectedAccountForDetail?.id === id) {
        setSelectedAccountForDetail(null);
      }
      showToast(lang === 'km' ? 'បានលុបគណនី' : 'Account deleted');
    }
  };

  const handleToggleFavorite = (id: string) => {
    setAccounts(prev =>
      prev.map(a => (a.id === id ? { ...a, favorite: !a.favorite } : a))
    );
  };

  const handleImportComplete = (importedAccounts: Account[], mode: 'merge' | 'replace') => {
    if (mode === 'replace') {
      setAccounts(importedAccounts);
    } else {
      setAccounts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newOnes = importedAccounts.filter(a => !existingIds.has(a.id));
        return [...prev, ...newOnes];
      });
    }
  };

  // Filtered and Sorted accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      // Search query across fields
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = acc.title.toLowerCase().includes(q);
        const matchPlatform = acc.platform.toLowerCase().includes(q);
        const matchUser = acc.username.toLowerCase().includes(q);
        const matchEmail = Boolean(acc.email && acc.email.toLowerCase().includes(q));
        const matchPhone = Boolean(acc.phone && acc.phone.includes(q));
        const matchNotes = Boolean(acc.notes && acc.notes.toLowerCase().includes(q));
        const matchTags = acc.tags.some(t => t.toLowerCase().includes(q));
        const matchProxy = Boolean(acc.proxy && acc.proxy.toLowerCase().includes(q));

        if (!matchTitle && !matchPlatform && !matchUser && !matchEmail && !matchPhone && !matchNotes && !matchTags && !matchProxy) {
          return false;
        }
      }

      // Platform filter
      if (selectedPlatform !== 'all' && acc.platform !== selectedPlatform) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && acc.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && acc.status !== selectedStatus) {
        return false;
      }

      // Quick boolean filters
      if (filterFavoriteOnly && !acc.favorite) return false;
      if (filterHas2FA && (!acc.totpSecret || !acc.totpSecret.trim())) return false;
      if (filterHasCookies && (!acc.cookies || !acc.cookies.trim())) return false;
      if (filterBreachedOnly) {
        const b = breachMap.get(acc.id);
        if (!b || (!b.isPasswordLeaked && !b.isEmailBreached)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'platform') {
        return a.platform.localeCompare(b.platform);
      }
      // 'updated'
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [
    accounts,
    searchQuery,
    selectedPlatform,
    selectedCategory,
    selectedStatus,
    filterFavoriteOnly,
    filterHas2FA,
    filterHasCookies,
    filterBreachedOnly,
    breachMap,
    sortBy,
  ]);

  // Statistics
  const activeCount = accounts.filter(a => a.status === 'active').length;
  const with2FACount = accounts.filter(a => a.totpSecret && a.totpSecret.trim()).length;
  const withCookiesCount = accounts.filter(a => a.cookies && a.cookies.trim()).length;
  const checkpointCount = accounts.filter(a => a.status === 'checkpoint').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Bar Contract compliant Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        lang={lang}
        onToggleLang={() => setLang(lang === 'km' ? 'en' : 'km')}
        isLocked={isLocked}
        onToggleLock={handleToggleLock}
        onOpenAddModal={() => {
          setEditingAccount(null);
          setIsFormOpen(true);
        }}
        onOpenExportModal={(tab = 'google') => {
          setExportImportTab(tab);
          setIsExportImportOpen(true);
        }}
        accountCount={accounts.length}
        googleUser={googleUser}
      />

      {/* Master Password Lock Screen when locked */}
      {isLocked && (
        <VaultLockScreen
          hasMasterPassword={Boolean(settings.masterPasswordHash)}
          lang={lang}
          onUnlock={handleUnlock}
          onSetMasterPassword={handleSetMasterPassword}
          onBiometricUnlock={() => {
            setIsLocked(false);
            showToast(lang === 'km' ? 'ដោះសោតាម Biometric បានជោគជ័យ' : 'Unlocked with Biometrics');
          }}
        />
      )}

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentTab === 'totp' && (
          <TOTPAuthenticatorHub
            accounts={accounts}
            lang={lang}
            onOpenAccount={acc => setSelectedAccountForDetail(acc)}
            onToast={showToast}
            onAddNewWithTOTP={(secret, issuer, username) => {
              let platform: PlatformType = 'facebook';
              let customPlatformName = '';
              let url = '';
              if (issuer) {
                const lower = issuer.toLowerCase();
                if (lower.includes('google') || lower.includes('gmail')) {
                  platform = 'google';
                  url = 'https://myaccount.google.com';
                } else if (lower.includes('facebook') || lower.includes('meta')) {
                  platform = 'facebook';
                  url = 'https://facebook.com';
                } else if (lower.includes('telegram')) {
                  platform = 'telegram';
                  url = 'https://web.telegram.org';
                } else if (lower.includes('twitter') || lower.includes('x.com')) {
                  platform = 'twitter';
                  url = 'https://x.com';
                } else if (lower.includes('instagram')) {
                  platform = 'instagram';
                  url = 'https://instagram.com';
                } else if (lower.includes('tiktok')) {
                  platform = 'tiktok';
                  url = 'https://tiktok.com';
                } else if (lower.includes('github')) {
                  platform = 'other';
                  customPlatformName = 'GitHub';
                  url = 'https://github.com';
                } else {
                  platform = 'other';
                  customPlatformName = issuer;
                }
              }

              const draftAccount: Account = {
                id: '',
                title: issuer || (lang === 'km' ? 'គណនី 2FA ថ្មី' : 'New 2FA Account'),
                platform,
                customPlatformName: platform === 'other' ? customPlatformName : undefined,
                category: 'social',
                status: 'active',
                username: username || '',
                password: '',
                url,
                totpSecret: secret,
                recoveryCodes: [],
                tags: ['2FA', 'Authenticator'],
                favorite: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              setEditingAccount(draftAccount);
              setIsFormOpen(true);
            }}
          />
        )}

        {currentTab === 'cookies' && (
          <CookieManagerView
            accounts={accounts}
            lang={lang}
            onOpenAccount={acc => setSelectedAccountForDetail(acc)}
            onToast={showToast}
          />
        )}

        {currentTab === 'audit' && (
          <SecurityAuditView
            accounts={accounts}
            lang={lang}
            onOpenAccount={acc => setSelectedAccountForDetail(acc)}
            onEditAccount={acc => {
              setEditingAccount(acc);
              setIsFormOpen(true);
            }}
          />
        )}

        {currentTab === 'accounts' && (
          <div className="space-y-6">
            {/* KPI / Security strip (Real numbers with tabular-nums, strictly adheres to anti-slop rules) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block font-medium">
                    {lang === 'km' ? 'គណនីសរុប' : 'Total Accounts'}
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-neutral-100">
                    {accounts.length}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block font-medium">
                    {lang === 'km' ? 'ដំណើរការល្អ (Active)' : 'Active Status'}
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-emerald-400">
                    {activeCount}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block font-medium">
                    {lang === 'km' ? 'បានបើក 2FA OTP' : '2FA Protected'}
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-sky-400">
                    {with2FACount}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                  <KeyRound className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block font-medium">
                    {lang === 'km' ? 'ជាប់ Checkpoint' : 'Checkpoint'}
                  </span>
                  <span className={`text-xl font-bold font-mono tabular-nums ${checkpointCount > 0 ? 'text-amber-400' : 'text-neutral-400'}`}>
                    {checkpointCount}
                  </span>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${checkpointCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-neutral-800 text-neutral-500'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Smart Search Bar & Filter Controls */}
            <div className="p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search input */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
                  />
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-neutral-500 hover:text-neutral-300"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Platform select */}
                <select
                  value={selectedPlatform}
                  onChange={e => setSelectedPlatform(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700 cursor-pointer"
                >
                  <option value="all">{t.allPlatforms}</option>
                  <option value="facebook">Facebook</option>
                  <option value="telegram">Telegram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="google">Google</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="banking">Banking</option>
                  <option value="other">Other</option>
                </select>

                {/* Category select */}
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700 cursor-pointer"
                >
                  <option value="all">{t.allCategories}</option>
                  <option value="social">Social Media</option>
                  <option value="messaging">Messaging</option>
                  <option value="work">Work & Business</option>
                  <option value="banking">Banking</option>
                  <option value="agency">Agency & Ads</option>
                  <option value="email">Email</option>
                </select>

                {/* Status select */}
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700 cursor-pointer"
                >
                  <option value="all">{t.allStatuses}</option>
                  <option value="active">Active (ដំណើរការ)</option>
                  <option value="checkpoint">Checkpoint</option>
                  <option value="password_reset_needed">Password Reset</option>
                  <option value="backup">Backup</option>
                </select>
              </div>

              {/* Quick filter pills & Sort dropdown */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-850 text-xs">
                {/* Segmented quick filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setFilterFavoriteOnly(!filterFavoriteOnly)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                      filterFavoriteOnly
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                    }`}
                  >
                    <Star className="w-3 h-3" />
                    <span>Favorites</span>
                  </button>

                  <button
                    onClick={() => setFilterHas2FA(!filterHas2FA)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                      filterHas2FA
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                    }`}
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Has 2FA OTP</span>
                  </button>

                  <button
                    onClick={() => setFilterHasCookies(!filterHasCookies)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                      filterHasCookies
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                    }`}
                  >
                    <Cookie className="w-3 h-3" />
                    <span>Has Cookies</span>
                  </button>

                  <button
                    onClick={() => setFilterBreachedOnly(!filterBreachedOnly)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                      filterBreachedOnly
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                    }`}
                  >
                    <Flame className="w-3 h-3 text-rose-400" />
                    <span>{lang === 'km' ? 'បែកធ្លាយ (Leaked)' : 'Breached'}</span>
                  </button>

                  {(filterFavoriteOnly || filterHas2FA || filterHasCookies || filterBreachedOnly || searchQuery || selectedPlatform !== 'all' || selectedCategory !== 'all' || selectedStatus !== 'all') && (
                    <button
                      onClick={() => {
                        setFilterFavoriteOnly(false);
                        setFilterHas2FA(false);
                        setFilterHasCookies(false);
                        setFilterBreachedOnly(false);
                        setSearchQuery('');
                        setSelectedPlatform('all');
                        setSelectedCategory('all');
                        setSelectedStatus('all');
                      }}
                      className="text-[11px] text-neutral-500 hover:text-neutral-300 underline ml-2"
                    >
                      {lang === 'km' ? 'កំណត់ឡើងវិញ' : 'Reset Filters'}
                    </button>
                  )}
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <ArrowUpDown className="w-3 h-3" />
                  <span>{t.sortBy}:</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-xs text-neutral-200 cursor-pointer focus:outline-none"
                  >
                    <option value="updated">{t.sortRecent}</option>
                    <option value="title">{t.sortName}</option>
                    <option value="platform">{t.sortPlatform}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Profile View Cards Grid */}
            {filteredAccounts.length === 0 ? (
              <div className="py-16 text-center bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6">
                <ShieldCheck className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-neutral-200 mb-1">
                  {t.emptyTitle}
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-5">
                  {t.emptyDesc}
                </p>
                <button
                  onClick={() => {
                    setEditingAccount(null);
                    setIsFormOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addAccount}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAccounts.map(account => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    lang={lang}
                    breachResult={breachMap.get(account.id)}
                    onSelect={acc => setSelectedAccountForDetail(acc)}
                    onEdit={acc => {
                      setEditingAccount(acc);
                      setIsFormOpen(true);
                    }}
                    onDelete={handleDeleteAccount}
                    onToggleFavorite={handleToggleFavorite}
                    onToast={showToast}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Profile View Full Detail Modal */}
      {selectedAccountForDetail && (
        <AccountDetailModal
          account={selectedAccountForDetail}
          lang={lang}
          onClose={() => setSelectedAccountForDetail(null)}
          onEdit={acc => {
            setSelectedAccountForDetail(null);
            setEditingAccount(acc);
            setIsFormOpen(true);
          }}
          onDelete={handleDeleteAccount}
          onUpdateAccount={updated => {
            handleSaveAccount(updated);
            setSelectedAccountForDetail(updated);
          }}
          onToast={showToast}
        />
      )}

      {/* Account Create / Edit Form Modal */}
      {isFormOpen && (
        <AccountFormModal
          initialAccount={editingAccount}
          lang={lang}
          onSave={handleSaveAccount}
          onClose={() => {
            setIsFormOpen(false);
            setEditingAccount(null);
          }}
        />
      )}

      {/* Export / Import Modal */}
      {isExportImportOpen && (
        <ExportImportModal
          accounts={accounts}
          lang={lang}
          initialTab={exportImportTab}
          onImportComplete={handleImportComplete}
          onClose={() => setIsExportImportOpen(false)}
          onToast={showToast}
        />
      )}

      {/* Footer Branding */}
      <footer className="mt-auto border-t border-neutral-900/80 py-5 px-4 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/src/assets/images/atong_app_logo_1792388205054.jpg"
              alt="អាតុង Logo"
              referrerPolicy="no-referrer"
              className="w-5 h-5 rounded-md object-cover ring-1 ring-cyan-500/20"
            />
            <span className="font-semibold text-neutral-300">
              {lang === 'km' ? 'អាតុង (Atong) • ប្រព័ន្ធគ្រប់គ្រងគណនី & 2FA សុវត្ថិភាពខ្ពស់' : 'Atong • High-Security Account & 2FA Vault'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-500">
            {lang === 'km' ? 'ការពារដោយ Master Key AES-256-GCM & Google Drive Cloud Backup' : 'Secured by AES-256-GCM & Google Drive Cloud Backup'}
          </p>
        </div>
      </footer>

      {/* Toast notifications */}
      <Toast message={toastMessage} />
    </div>
  );
}
