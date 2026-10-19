import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Edit2,
  Trash2,
  Shield,
  KeyRound,
  FileCode,
  Cookie,
  Server,
  Calendar,
  Sparkles,
  AlertTriangle,
  Plus,
  Lock,
  Flame,
  FileWarning,
} from 'lucide-react';
import { Account, AccountStatus } from '../types/account';
import { getPlatformMeta } from '../utils/platformHelper';
import { LiveTOTPDisplay } from './LiveTOTPDisplay';
import { inspectCookieString, evaluatePasswordStrength } from '../utils/crypto';
import { Language } from '../translations';
import { auditAccountBreach, BreachAuditResult } from '../utils/breachChecker';

interface AccountDetailModalProps {
  account: Account;
  lang: Language;
  onClose: () => void;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onUpdateAccount: (updated: Account) => void;
  onToast: (message: string) => void;
}

export const AccountDetailModal: React.FC<AccountDetailModalProps> = ({
  account,
  lang,
  onClose,
  onEdit,
  onDelete,
  onUpdateAccount,
  onToast,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showTotpSecret, setShowTotpSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newRecoveryCode, setNewRecoveryCode] = useState('');
  const [breachResult, setBreachResult] = useState<BreachAuditResult | null>(null);

  useEffect(() => {
    auditAccountBreach(account).then(res => setBreachResult(res));
  }, [account]);

  const platformMeta = getPlatformMeta(account.platform, account.customPlatformName);
  const cookieData = inspectCookieString(account.cookies);
  const pwdStrength = evaluatePasswordStrength(account.password);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    onToast(lang === 'km' ? `បានចម្លង ${label} ទៅ Clipboard` : `Copied ${label} to clipboard`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const toggleRecoveryCodeUsed = (codeId: string) => {
    const updatedCodes = (account.recoveryCodes || []).map(item =>
      item.id === codeId ? { ...item, used: !item.used } : item
    );
    const updatedAccount = { ...account, recoveryCodes: updatedCodes, updatedAt: new Date().toISOString() };
    onUpdateAccount(updatedAccount);
  };

  const handleAddRecoveryCode = () => {
    if (!newRecoveryCode.trim()) return;
    const newCodeItem = {
      id: `rc-${Date.now()}`,
      code: newRecoveryCode.trim(),
      used: false,
    };
    const updatedCodes = [...(account.recoveryCodes || []), newCodeItem];
    const updatedAccount = { ...account, recoveryCodes: updatedCodes, updatedAt: new Date().toISOString() };
    onUpdateAccount(updatedAccount);
    setNewRecoveryCode('');
    onToast(lang === 'km' ? 'បានបន្ថែម Recovery Code ថ្មី' : 'Added new recovery code');
  };

  const getStatusBadge = (status: AccountStatus) => {
    switch (status) {
      case 'active':
        return { label: lang === 'km' ? 'ដំណើរការល្អ (Active)' : 'Active', color: 'text-emerald-400' };
      case 'checkpoint':
        return { label: lang === 'km' ? 'ជាប់ Checkpoint' : 'Checkpoint', color: 'text-amber-400 font-semibold' };
      case 'password_reset_needed':
        return { label: lang === 'km' ? 'ត្រូវប្តូរ Password' : 'Reset Needed', color: 'text-rose-400 font-semibold' };
      case 'backup':
        return { label: lang === 'km' ? 'គណនីបម្រុង' : 'Backup', color: 'text-neutral-400' };
      case 'suspended':
        return { label: lang === 'km' ? 'ផ្អាកដំណើរការ' : 'Suspended', color: 'text-rose-500' };
    }
  };

  const statusBadge = getStatusBadge(account.status);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${platformMeta.bgColor} ${platformMeta.borderColor}`}>
              {platformMeta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-100">
                  {account.title}
                </h2>
                {account.url && (
                  <a
                    href={account.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-400 hover:text-emerald-400 transition-colors"
                    title="បើកគេហទំព័រ"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                <span>{lang === 'km' ? platformMeta.nameKh : platformMeta.name}</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className={statusBadge.color}>{statusBadge.label}</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="capitalize">{account.category}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(account)}
              className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
              title="កែសម្រួល"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(account.id)}
              className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors"
              title="លុបគណនី"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Security Breach & Leak Alert Banner if compromised */}
          {breachResult && (breachResult.isPasswordLeaked || breachResult.isEmailBreached) && (
            <div className="p-4 bg-rose-950/30 border border-rose-800/70 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>
                    {lang === 'km'
                      ? 'ការព្រមាន: គណនីនេះត្រូវបានរកឃើញក្នុងទិន្នន័យបែកធ្លាយ (Data Breach)'
                      : 'Security Alert: Compromised Credentials Detected'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(account)}
                  className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>{lang === 'km' ? 'ប្តូរលេខសម្ងាត់' : 'Change Password'}</span>
                </button>
              </div>

              {breachResult.isPasswordLeaked && (
                <div className="text-xs text-rose-200/90 space-y-1">
                  <p>• {breachResult.passwordBreachReason}</p>
                  {breachResult.passwordOccurrences > 0 && (
                    <p className="text-[11px] text-neutral-400 font-mono tabular-nums">
                      • {lang === 'km' ? 'ចំនួនដងបែកធ្លាយសរុប:' : 'Total recorded breach instances:'}{' '}
                      <strong className="text-rose-300">{breachResult.passwordOccurrences.toLocaleString()}</strong>
                    </p>
                  )}
                </div>
              )}

              {breachResult.isEmailBreached && breachResult.breachSources.length > 0 && (
                <div className="text-xs text-neutral-300 pt-1 border-t border-rose-900/40">
                  <span className="text-[11px] text-neutral-400 font-medium block mb-1">
                    {lang === 'km' ? 'ប្រភពទិន្នន័យបែកធ្លាយដែលពាក់ព័ន្ធ:' : 'Linked breach incidents:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {breachResult.breachSources.map((b, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-neutral-900/90 border border-neutral-750 rounded text-[11px] text-neutral-300">
                        {lang === 'km' ? b.nameKh : b.name} ({b.date})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Credentials */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              {lang === 'km' ? 'ព័ត៌មានចូលគណនី (Credentials)' : 'Account Credentials'}
            </h3>

            {/* Username */}
            <div className="flex items-center justify-between gap-3 py-1 border-b border-neutral-800/60">
              <span className="text-xs text-neutral-400 shrink-0">
                {lang === 'km' ? 'ឈ្មោះគណនី / Username:' : 'Username:'}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-neutral-100 select-all truncate">
                  {account.username || '-'}
                </span>
                {account.username && (
                  <button
                    onClick={() => handleCopy(account.username, 'Username')}
                    className="p-1 text-neutral-400 hover:text-emerald-400 rounded transition-colors"
                  >
                    {copiedKey === 'Username' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Email */}
            {account.email && (
              <div className="flex items-center justify-between gap-3 py-1 border-b border-neutral-800/60">
                <span className="text-xs text-neutral-400 shrink-0">
                  {lang === 'km' ? 'អ៊ីមែល / Email:' : 'Email:'}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-neutral-100 select-all truncate">
                    {account.email}
                  </span>
                  <button
                    onClick={() => handleCopy(account.email || '', 'Email')}
                    className="p-1 text-neutral-400 hover:text-emerald-400 rounded transition-colors"
                  >
                    {copiedKey === 'Email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Phone */}
            {account.phone && (
              <div className="flex items-center justify-between gap-3 py-1 border-b border-neutral-800/60">
                <span className="text-xs text-neutral-400 shrink-0">
                  {lang === 'km' ? 'លេខទូរស័ព្ទ / Phone:' : 'Phone:'}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-neutral-100 select-all">
                    {account.phone}
                  </span>
                  <button
                    onClick={() => handleCopy(account.phone || '', 'Phone')}
                    className="p-1 text-neutral-400 hover:text-emerald-400 rounded transition-colors"
                  >
                    {copiedKey === 'Phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Password */}
            <div className="flex items-center justify-between gap-3 py-1">
              <div>
                <span className="text-xs text-neutral-400 block">
                  {lang === 'km' ? 'លេខសម្ងាត់ / Password:' : 'Password:'}
                </span>
                <span className={`text-[10px] ${pwdStrength.color}`}>
                  {lang === 'km' ? pwdStrength.labelKh : pwdStrength.labelEn}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-neutral-100 tracking-wider">
                  {showPassword ? account.password : '••••••••••••••••'}
                </span>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleCopy(account.password, 'Password')}
                  className="p-1 text-neutral-400 hover:text-emerald-400 rounded transition-colors"
                >
                  {copiedKey === 'Password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: 2FA / TOTP Live Hub */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <KeyRound className="w-4 h-4" />
                <span>2FA / TOTP Authenticator</span>
              </div>
              {account.totpSecret && (
                <button
                  onClick={() => setShowTotpSecret(!showTotpSecret)}
                  className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  {showTotpSecret
                    ? (lang === 'km' ? 'លាក់ Secret Key' : 'Hide Secret Key')
                    : (lang === 'km' ? 'បង្ហាញ Secret Key' : 'Show Secret Key')}
                </button>
              )}
            </div>

            {account.totpSecret ? (
              <div className="space-y-3">
                <LiveTOTPDisplay
                  secret={account.totpSecret}
                  onCopy={code => onToast(lang === 'km' ? `បានចម្លង OTP: ${code}` : `Copied OTP: ${code}`)}
                />

                {showTotpSecret && (
                  <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between text-xs font-mono">
                    <span className="text-neutral-300 select-all break-all">
                      {account.totpSecret}
                    </span>
                    <button
                      onClick={() => handleCopy(account.totpSecret || '', '2FA Secret')}
                      className="p-1 text-neutral-400 hover:text-emerald-400"
                    >
                      {copiedKey === '2FA Secret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic py-1">
                {lang === 'km'
                  ? 'មិនទាន់បានបញ្ចូល 2FA Secret Key នៅឡើយទេ។ ចុចកែសម្រួលដើម្បីបន្ថែម Base32 Secret Key (ឧទាហរណ៍ JBSWY3DPEHPK3PXP)។'
                  : 'No 2FA secret key configured yet. Click edit to add a Base32 TOTP key.'}
              </p>
            )}
          </div>

          {/* Section 3: Recovery Codes Checklist */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <FileCode className="w-4 h-4" />
                <span>
                  {lang === 'km' ? 'កូដសង្គ្រោះបម្រុង (Recovery Codes)' : 'Backup Recovery Codes'}
                </span>
              </div>
              <span className="text-xs font-mono text-neutral-400 tabular-nums">
                {(account.recoveryCodes || []).filter(c => !c.used).length} / {(account.recoveryCodes || []).length} {lang === 'km' ? 'នៅសល់' : 'left'}
              </span>
            </div>

            {account.recoveryCodes && account.recoveryCodes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {account.recoveryCodes.map(rc => (
                  <div
                    key={rc.id}
                    onClick={() => toggleRecoveryCodeUsed(rc.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                      rc.used
                        ? 'bg-neutral-900/40 border-neutral-800/50 text-neutral-500 line-through'
                        : 'bg-neutral-900 border-neutral-750 text-neutral-200 hover:border-neutral-600'
                    }`}
                  >
                    <span className="font-mono tracking-wider">{rc.code}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleCopy(rc.code, 'Recovery Code');
                      }}
                      className="p-1 text-neutral-400 hover:text-emerald-400 ml-1"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic">
                {lang === 'km' ? 'មិនទាន់មានកូដបម្រុងនៅឡើយទេ' : 'No recovery codes added yet'}
              </p>
            )}

            {/* Quick add single code */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder={lang === 'km' ? 'បញ្ចូល Recovery Code ថ្មី (ឧ. 8492 1048)...' : 'Add new recovery code...'}
                value={newRecoveryCode}
                onChange={e => setNewRecoveryCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddRecoveryCode()}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
              />
              <button
                type="button"
                onClick={handleAddRecoveryCode}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>{lang === 'km' ? 'បន្ថែម' : 'Add'}</span>
              </button>
            </div>
          </div>

          {/* Section 4: Cookie / Session Manager */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">
                <Cookie className="w-4 h-4" />
                <span>{lang === 'km' ? 'Cookie & Session Manager' : 'Cookie & Session Manager'}</span>
              </div>
              {account.cookies && (
                <button
                  onClick={() => handleCopy(account.cookies || '', 'Cookie Data')}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-sky-300 transition-colors"
                >
                  {copiedKey === 'Cookie Data' ? <Check className="w-3 h-3 text-sky-300" /> : <Copy className="w-3 h-3" />}
                  <span>{lang === 'km' ? 'ចម្លង Cookie ទាំងអស់' : 'Copy Full Cookie'}</span>
                </button>
              )}
            </div>

            {account.cookies ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <span>
                    Format: <strong className="text-neutral-200 uppercase">{cookieData.format}</strong>
                  </span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span>
                    Cookies count: <strong className="font-mono text-neutral-200 tabular-nums">{cookieData.cookieCount}</strong>
                  </span>
                </div>

                {cookieData.highlightedTokens.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {cookieData.highlightedTokens.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-sky-950/60 border border-sky-800/50 rounded font-mono text-sky-300 text-[11px]"
                      >
                        {t.key}: {t.preview}
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <pre className="max-h-32 overflow-y-auto p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-[11px] font-mono text-neutral-300 whitespace-pre-wrap break-all select-all">
                    {account.cookies}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic">
                {lang === 'km'
                  ? 'មិនមានទិន្នន័យ Cookie រក្សាទុកឡើយ។'
                  : 'No cookie data stored.'}
              </p>
            )}
          </div>

          {/* Section 5: Proxy / Bound IP & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Proxy */}
            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                <Server className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'Proxy / Bound IP' : 'Proxy / IP'}</span>
              </div>
              <span className="font-mono text-xs text-neutral-300 block select-all">
                {account.proxy || (lang === 'km' ? 'មិនបានកំណត់ (Direct Connection)' : 'Direct Connection')}
              </span>
            </div>

            {/* Timestamps */}
            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 text-xs text-neutral-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>{lang === 'km' ? 'ចូលចុងក្រោយ:' : 'Last Login:'}</span>
                <span className="font-mono text-neutral-300 tabular-nums">
                  {account.lastLogin ? new Date(account.lastLogin).toLocaleString() : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{lang === 'km' ? 'ផ្លាស់ប្តូរលេខសម្ងាត់:' : 'Password Updated:'}</span>
                <span className="font-mono text-neutral-300 tabular-nums">
                  {account.lastPasswordChange ? new Date(account.lastPasswordChange).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Tags */}
          {account.notes && (
            <div className="p-4 bg-neutral-950/40 border border-neutral-800/60 rounded-xl text-xs space-y-1">
              <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
                {lang === 'km' ? 'កំណត់សម្គាល់ (Notes):' : 'Notes:'}
              </span>
              <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {account.notes}
              </p>
            </div>
          )}

          {account.tags && account.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-400">
              <span className="text-neutral-500">Tags:</span>
              {account.tags.map((tag, idx) => (
                <span key={idx} className="text-neutral-300 font-medium">
                  #{tag}
                  {idx < account.tags.length - 1 ? <span className="text-neutral-600 ml-1.5">·</span> : null}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            Vault ID: <span className="font-mono">{account.id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors"
          >
            {lang === 'km' ? 'បិទ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
