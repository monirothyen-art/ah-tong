import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Star,
  MoreVertical,
  ShieldAlert,
  Cookie,
  KeyRound,
  FileCode,
  Globe,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Flame,
} from 'lucide-react';
import { Account, AccountStatus } from '../types/account';
import { getPlatformMeta } from '../utils/platformHelper';
import { LiveTOTPDisplay } from './LiveTOTPDisplay';
import { Language } from '../translations';
import { BreachAuditResult } from '../utils/breachChecker';

interface AccountCardProps {
  account: Account;
  lang: Language;
  breachResult?: BreachAuditResult;
  onSelect: (account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToast: (message: string) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  lang,
  breachResult,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  onToast,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const platformMeta = getPlatformMeta(account.platform, account.customPlatformName);

  const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    onToast(lang === 'km' ? `បានចម្លង ${label} រួចរាល់` : `Copied ${label}`);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const getStatusLabel = (status: AccountStatus) => {
    switch (status) {
      case 'active':
        return {
          text: lang === 'km' ? 'ដំណើរការល្អ' : 'Active',
          color: 'text-emerald-400',
        };
      case 'checkpoint':
        return {
          text: lang === 'km' ? 'ជាប់ Checkpoint' : 'Checkpoint',
          color: 'text-amber-400 font-semibold',
        };
      case 'password_reset_needed':
        return {
          text: lang === 'km' ? 'ត្រូវប្តូរ Password' : 'Reset Needed',
          color: 'text-rose-400 font-semibold',
        };
      case 'backup':
        return {
          text: lang === 'km' ? 'គណនីបម្រុង' : 'Backup',
          color: 'text-neutral-400',
        };
      case 'suspended':
        return {
          text: lang === 'km' ? 'ផ្អាកដំណើរការ' : 'Suspended',
          color: 'text-rose-500',
        };
    }
  };

  const statusInfo = getStatusLabel(account.status);
  const unusedRecoveryCodesCount = (account.recoveryCodes || []).filter(c => !c.used).length;
  const hasCookies = Boolean(account.cookies && account.cookies.trim());

  return (
    <div
      onClick={() => onSelect(account)}
      className="group relative bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700/80 rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      {/* Top Header: Platform mark, title, and quick icons */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Platform Icon Badge */}
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${platformMeta.bgColor} ${platformMeta.borderColor}`}
            >
              {platformMeta.icon}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-neutral-100 truncate group-hover:text-emerald-300 transition-colors">
                {account.title}
              </h3>
              {/* Unboxed Metadata Line with typographic separators */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 truncate">
                <span className="font-medium text-neutral-300">
                  {lang === 'km' ? platformMeta.nameKh : platformMeta.name}
                </span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className={statusInfo.color}>{statusInfo.text}</span>
              </div>
            </div>
          </div>

          {/* Top Actions: Star favorite + direct URL link + 3-dots */}
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onToggleFavorite(account.id)}
              title={account.favorite ? 'ដកចេញពី Favorite' : 'ដាក់ចូល Favorite'}
              className="p-1 text-neutral-400 hover:text-amber-400 transition-colors"
            >
              <Star
                className={`w-4 h-4 ${account.favorite ? 'fill-amber-400 text-amber-400' : ''}`}
              />
            </button>

            {account.url && (
              <a
                href={account.url}
                target="_blank"
                rel="noreferrer"
                title={lang === 'km' ? 'បើកគេហទំព័រ' : 'Open Website'}
                className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-6 z-20 w-36 bg-neutral-900 border border-neutral-750 rounded-lg shadow-xl py-1 text-xs"
                  onClick={e => {
                    e.stopPropagation();
                    setMenuOpen(false);
                  }}
                >
                  <button
                    onClick={() => onEdit(account)}
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-neutral-200 hover:bg-neutral-800 text-left"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{lang === 'km' ? 'កែសម្រួល' : 'Edit'}</span>
                  </button>
                  <button
                    onClick={() => onDelete(account.id)}
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-400 hover:bg-neutral-800 text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'លុបគណនី' : 'Delete'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Breach Alert Banner if password or email is compromised */}
        {breachResult?.isPasswordLeaked && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-950/50 border border-rose-800/70 rounded-lg text-[11px] text-rose-300 my-2">
            <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-medium truncate">
              {lang === 'km' ? '⚠ Password បែកធ្លាយក្នុង Data Dump' : '⚠ Leaked in Data Breach'}
            </span>
          </div>
        )}

        {/* Credentials Grid */}
        <div className="space-y-2 my-3 pt-2 border-t border-neutral-800/80">
          {/* Username / Email row */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-neutral-400 shrink-0">
              {lang === 'km' ? 'គណនី:' : 'User:'}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-neutral-200 truncate select-all">
                {account.username || account.email || account.phone || '-'}
              </span>
              <button
                type="button"
                onClick={e => handleCopy(e, account.username || account.email || '', 'Username')}
                title="ចម្លង Username"
                className="p-1 text-neutral-400 hover:text-emerald-400 transition-colors"
              >
                {copiedField === 'Username' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Password row with hide/reveal */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-neutral-400 shrink-0">
              {lang === 'km' ? 'សម្ងាត់:' : 'Pass:'}
            </span>
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-mono text-neutral-300 truncate tracking-wide">
                {showPassword ? account.password : '••••••••••••'}
              </span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                title={showPassword ? 'លាក់' : 'បង្ហាញ'}
                className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={e => handleCopy(e, account.password, 'Password')}
                title="ចម្លង Password"
                className="p-1 text-neutral-400 hover:text-emerald-400 transition-colors"
              >
                {copiedField === 'Password' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Live 2FA TOTP Bar if account has totpSecret */}
        {account.totpSecret && (
          <div className="my-2.5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
              <span className="flex items-center gap-1 text-emerald-400">
                <KeyRound className="w-3 h-3" />
                <span>2FA OTP Live</span>
              </span>
            </div>
            <LiveTOTPDisplay
              secret={account.totpSecret}
              compact={true}
              onCopy={code => onToast(lang === 'km' ? `បានចម្លង OTP: ${code}` : `Copied OTP: ${code}`)}
            />
          </div>
        )}

        {/* Notes preview if available */}
        {account.notes && (
          <p className="text-[11px] text-neutral-400 line-clamp-1 italic mt-1">
            "{account.notes}"
          </p>
        )}
      </div>

      {/* Bottom Footer Info: Unboxed tags and indicators */}
      <div className="pt-2.5 mt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
        <div className="flex items-center gap-2">
          {hasCookies && (
            <span
              title="មានរក្សាទុក Cookie / Session"
              className="inline-flex items-center gap-1 text-sky-400"
            >
              <Cookie className="w-3 h-3" />
              <span>Cookie</span>
            </span>
          )}

          {unusedRecoveryCodesCount > 0 && (
            <span
              title={`${unusedRecoveryCodesCount} កូដសង្គ្រោះមិនទាន់ប្រើ`}
              className="inline-flex items-center gap-1 text-amber-400"
            >
              <FileCode className="w-3 h-3" />
              <span className="font-mono tabular-nums">{unusedRecoveryCodesCount} Backup</span>
            </span>
          )}
        </div>

        {/* Last login / edit time */}
        <div className="flex items-center gap-1 text-neutral-400 font-mono text-[10px] tabular-nums">
          <Clock className="w-2.5 h-2.5 text-neutral-400" />
          <span>{account.lastLogin ? new Date(account.lastLogin).toLocaleDateString() : 'Never'}</span>
        </div>
      </div>
    </div>
  );
};
