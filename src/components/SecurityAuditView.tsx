import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  Lock,
  ExternalLink,
  Flame,
  Radio,
  FileWarning,
  ArrowRight,
  Database,
} from 'lucide-react';
import { Account } from '../types/account';
import { evaluatePasswordStrength } from '../utils/crypto';
import { getPlatformMeta } from '../utils/platformHelper';
import { Language, translations } from '../translations';
import { auditVaultBreaches, BreachAuditResult } from '../utils/breachChecker';

interface SecurityAuditViewProps {
  accounts: Account[];
  lang: Language;
  onOpenAccount: (account: Account) => void;
  onEditAccount?: (account: Account) => void;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({
  accounts,
  lang,
  onOpenAccount,
  onEditAccount,
}) => {
  const t = translations[lang];
  const [breachMap, setBreachMap] = useState<Map<string, BreachAuditResult>>(new Map());
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedTime, setLastScannedTime] = useState<Date | null>(new Date());
  const [activeFilter, setActiveFilter] = useState<'all' | 'breached' | 'weak' | 'no2fa' | 'checkpoint'>('all');

  const runAudit = async () => {
    setIsScanning(true);
    // Brief realistic audit latency for UI satisfaction
    await new Promise(res => setTimeout(res, 400));
    const results = await auditVaultBreaches(accounts);
    setBreachMap(results);
    setIsScanning(false);
    setLastScannedTime(new Date());
  };

  useEffect(() => {
    runAudit();
  }, [accounts]);

  // Compute compromised accounts from breachMap
  const compromisedAccounts: { account: Account; breach: BreachAuditResult }[] = [];
  accounts.forEach(acc => {
    const b = breachMap.get(acc.id);
    if (b && (b.isPasswordLeaked || b.isEmailBreached)) {
      compromisedAccounts.push({ account: acc, breach: b });
    }
  });

  const leakedPasswordsCount = Array.from(breachMap.values()).filter(b => b.isPasswordLeaked).length;
  const breachedEmailsCount = Array.from(breachMap.values()).filter(b => b.isEmailBreached).length;

  // Accounts without 2FA
  const no2FA = accounts.filter(a => !a.totpSecret || !a.totpSecret.trim());

  // Weak passwords
  const weakPasswords = accounts.filter(a => {
    const s = evaluatePasswordStrength(a.password);
    return s.score <= 1;
  });

  // Reused passwords
  const passwordMap: Record<string, Account[]> = {};
  accounts.forEach(a => {
    if (a.password) {
      if (!passwordMap[a.password]) passwordMap[a.password] = [];
      passwordMap[a.password].push(a);
    }
  });
  const reusedGroups = Object.values(passwordMap).filter(group => group.length > 1);

  // Checkpoint accounts
  const checkpoints = accounts.filter(a => a.status === 'checkpoint');

  // Overall Health Score calculation (0 - 100)
  let score = 100;
  if (accounts.length > 0) {
    const breachPenalty = (leakedPasswordsCount / accounts.length) * 45;
    const no2FaPenalty = (no2FA.length / accounts.length) * 25;
    const weakPenalty = (weakPasswords.length / accounts.length) * 20;
    const checkpointPenalty = checkpoints.length * 5;
    const reusedPenalty = Math.min(15, reusedGroups.length * 5);

    score = Math.max(5, Math.round(100 - (breachPenalty + no2FaPenalty + weakPenalty + checkpointPenalty + reusedPenalty)));
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Score & Scan Action */}
      <div className="p-6 bg-neutral-900/80 border border-neutral-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-neutral-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-500'}
                strokeDasharray={`${score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono font-bold text-lg tabular-nums text-neutral-100">
              {score}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-100">
                {lang === 'km' ? 'ពិន្ទុត្រួតពិនិត្យសុវត្ថិភាព Vault' : 'Vault Security Health Score'}
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {leakedPasswordsCount > 0
                ? (lang === 'km'
                    ? `រកឃើញលេខសម្ងាត់បែកធ្លាយចំនួន ${leakedPasswordsCount} គណនី! ត្រូវប្តូរជាបន្ទាន់។`
                    : `Critical: ${leakedPasswordsCount} compromised password(s) found in breach databases!`)
                : score >= 80
                ? (lang === 'km' ? 'កម្រិតសុវត្ថិភាពល្អឥតខ្ចោះ! មិនមានទិន្នន័យបែកធ្លាយត្រូវបានរកឃើញឡើយ' : 'High security posture. No compromised credentials found.')
                : (lang === 'km' ? 'សូមពិនិត្យគណនីដែលខ្វះ 2FA ឬមានលេខសម្ងាត់ខ្សោយ' : 'Action recommended for accounts without 2FA or weak passwords.')}
            </p>
          </div>
        </div>

        {/* Scan Button & Last Scan Info */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full md:w-auto">
          {lastScannedTime && (
            <span className="text-[11px] text-neutral-500 font-mono tabular-nums">
              {lang === 'km' ? 'ស្កេនចុងក្រោយ:' : 'Last scan:'} {lastScannedTime.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={runAudit}
            disabled={isScanning}
            className="w-full sm:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-850 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-emerald-400' : 'text-neutral-400'}`} />
            <span>
              {isScanning
                ? (lang === 'km' ? 'កំពុងស្កេន...' : 'Auditing...')
                : (lang === 'km' ? 'ស្កេនការបែកធ្លាយម្តងទៀត' : 'Re-scan Credentials')}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Leaked Passwords */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'breached' ? 'all' : 'breached')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            leakedPasswordsCount > 0
              ? 'bg-rose-950/20 border-rose-800/60 hover:border-rose-700'
              : 'bg-neutral-900/70 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-neutral-400 font-medium">
              {lang === 'km' ? 'Password បែកធ្លាយ' : 'Leaked Passwords'}
            </span>
            <Flame className={`w-4 h-4 ${leakedPasswordsCount > 0 ? 'text-rose-400' : 'text-neutral-500'}`} />
          </div>
          <span className={`text-xl font-bold font-mono tabular-nums ${leakedPasswordsCount > 0 ? 'text-rose-400' : 'text-neutral-300'}`}>
            {leakedPasswordsCount}
          </span>
          <span className="block text-[10px] text-neutral-500 mt-0.5">
            {lang === 'km' ? 'ប្រឈមការបន្លំចូល (Stuffing)' : 'High takeover risk'}
          </span>
        </div>

        {/* Weak Passwords */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'weak' ? 'all' : 'weak')}
          className="p-3.5 bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-neutral-400 font-medium">
              {lang === 'km' ? 'Password ខ្សោយ' : 'Weak Passwords'}
            </span>
            <ShieldAlert className={`w-4 h-4 ${weakPasswords.length > 0 ? 'text-amber-400' : 'text-neutral-500'}`} />
          </div>
          <span className={`text-xl font-bold font-mono tabular-nums ${weakPasswords.length > 0 ? 'text-amber-400' : 'text-neutral-300'}`}>
            {weakPasswords.length}
          </span>
          <span className="block text-[10px] text-neutral-500 mt-0.5">
            {lang === 'km' ? 'ប្រវែងខ្លី ឬទាយងាយ' : 'Low entropy score'}
          </span>
        </div>

        {/* Missing 2FA */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'no2fa' ? 'all' : 'no2fa')}
          className="p-3.5 bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-neutral-400 font-medium">
              {lang === 'km' ? 'មិនទាន់មាន 2FA' : 'Missing 2FA'}
            </span>
            <KeyRound className={`w-4 h-4 ${no2FA.length > 0 ? 'text-sky-400' : 'text-neutral-500'}`} />
          </div>
          <span className={`text-xl font-bold font-mono tabular-nums ${no2FA.length > 0 ? 'text-sky-400' : 'text-neutral-300'}`}>
            {no2FA.length}
          </span>
          <span className="block text-[10px] text-neutral-500 mt-0.5">
            {lang === 'km' ? 'គ្មានស្រទាប់ការពារទី ២' : 'Single factor only'}
          </span>
        </div>

        {/* Checkpoint */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'checkpoint' ? 'all' : 'checkpoint')}
          className="p-3.5 bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-neutral-400 font-medium">
              {lang === 'km' ? 'ជាប់ Checkpoint' : 'Checkpoint'}
            </span>
            <AlertTriangle className={`w-4 h-4 ${checkpoints.length > 0 ? 'text-amber-400' : 'text-neutral-500'}`} />
          </div>
          <span className={`text-xl font-bold font-mono tabular-nums ${checkpoints.length > 0 ? 'text-amber-400' : 'text-neutral-300'}`}>
            {checkpoints.length}
          </span>
          <span className="block text-[10px] text-neutral-500 mt-0.5">
            {lang === 'km' ? 'ទាមទារផ្ទៀងផ្ទាត់' : 'Action required'}
          </span>
        </div>
      </div>

      {/* SECTION 1: CRITICAL BREACH & LEAK DETECTION ALERTS */}
      <div className="p-5 bg-neutral-900/90 border border-neutral-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="text-sm font-bold text-neutral-100">
                {lang === 'km'
                  ? 'ការបែកធ្លាយទិន្នន័យគណនី (Compromised & Leaked Credentials)'
                  : 'Compromised Credentials & Breach Analysis'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {lang === 'km'
                  ? 'ប្រៀបធៀបលេខសម្ងាត់ និងអ៊ីមែលជាមួយបណ្តុំទិន្នន័យបែកធ្លាយសាធារណៈ (k-Anonymity simulation & known breach lists)'
                  : 'Audited against known compromised dictionaries, collection dumps, and scraped databases.'}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs tabular-nums text-neutral-400">
            {compromisedAccounts.length} {lang === 'km' ? 'រកឃើញ' : 'detected'}
          </span>
        </div>

        {compromisedAccounts.length === 0 ? (
          <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center gap-3 text-xs text-emerald-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-semibold text-neutral-200">
                {lang === 'km' ? 'មិនមានលេខសម្ងាត់ណាមួយត្រូវបានរកឃើញក្នុងទិន្នន័យបែកធ្លាយឡើយ' : 'All passwords and emails are clean'}
              </div>
              <p className="text-neutral-400 text-[11px] mt-0.5">
                {lang === 'km'
                  ? 'លេខសម្ងាត់របស់អ្នកមិនមាននៅក្នុងបណ្តុំទិន្នន័យ RockYou, Collection #1 ឬ Combo lists ឡើយ។'
                  : 'Your credentials do not match any known public breach dumps or leaked dictionaries.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {compromisedAccounts.map(({ account, breach }) => {
              const meta = getPlatformMeta(account.platform, account.customPlatformName);
              return (
                <div
                  key={account.id}
                  onClick={() => onOpenAccount(account)}
                  className="p-4 bg-neutral-950 border border-rose-900/50 hover:border-rose-700/80 rounded-xl transition-all cursor-pointer space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-850">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${meta.bgColor} ${meta.borderColor}`}>
                        {meta.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-neutral-100">
                            {account.title}
                          </h4>
                          <span className="text-[11px] font-mono text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
                            {breach.isPasswordLeaked
                              ? (lang === 'km' ? 'Password ធ្លាប់បែកធ្លាយ' : 'Leaked Password')
                              : (lang === 'km' ? 'អ៊ីមែលមានក្នុង Breach' : 'Breached Email')}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-400 font-mono">
                          {account.username || account.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onEditAccount && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onEditAccount(account);
                          }}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{lang === 'km' ? 'ប្តូរលេខសម្ងាត់ឥឡូវនេះ' : 'Change Password'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Breach Details & Reasoning */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Password Leak detail */}
                    {breach.isPasswordLeaked && (
                      <div className="p-2.5 bg-neutral-900/80 border border-neutral-800 rounded-lg space-y-1">
                        <span className="text-neutral-400 font-medium block">
                          {lang === 'km' ? 'ព័ត៌មានលម្អិតអំពី Password:' : 'Password Breach Details:'}
                        </span>
                        <p className="text-rose-300 text-[11px]">
                          {breach.passwordBreachReason}
                        </p>
                        {breach.passwordOccurrences > 0 && (
                          <div className="text-[10px] text-neutral-400 font-mono tabular-nums">
                            {lang === 'km' ? 'បានរកឃើញ:' : 'Observed count:'}{' '}
                            <strong className="text-neutral-200">
                              {breach.passwordOccurrences.toLocaleString()}
                            </strong>{' '}
                            {lang === 'km' ? 'ដងក្នុងបណ្តុំទិន្នន័យ' : 'times in dumps'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Email Breach detail */}
                    {breach.isEmailBreached && (
                      <div className="p-2.5 bg-neutral-900/80 border border-neutral-800 rounded-lg space-y-1">
                        <span className="text-neutral-400 font-medium block">
                          {lang === 'km' ? 'ប្រភពបែកធ្លាយអ៊ីមែល:' : 'Email Breach Sources:'}
                        </span>
                        <div className="space-y-1">
                          {breach.breachSources.map((src, idx) => (
                            <div key={idx} className="text-[11px] text-neutral-300 flex items-center justify-between">
                              <span>{lang === 'km' ? src.nameKh : src.name}</span>
                              <span className="text-[10px] text-neutral-500 font-mono tabular-nums">{src.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recommendation banner */}
                  <div className="p-2 bg-neutral-900/50 rounded-lg text-[11px] text-neutral-300 flex items-start gap-2">
                    <FileWarning className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{lang === 'km' ? breach.recommendationKh : breach.recommendationEn}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: OTHER HYGIENE RISKS (Missing 2FA, Reused Passwords, Checkpoints) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Missing 2FA List */}
        <div className="p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
              <KeyRound className="w-4 h-4 text-sky-400" />
              <span>
                {lang === 'km'
                  ? `គណនីមិនទាន់មាន 2FA TOTP (${no2FA.length})`
                  : `Accounts Missing 2FA (${no2FA.length})`}
              </span>
            </div>
            <span className="text-[11px] text-neutral-500">
              {lang === 'km' ? 'ណែនាំបើក 2FA' : 'Enable 2FA'}
            </span>
          </div>

          {no2FA.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400 py-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'km' ? 'គ្រប់គណនីទាំងអស់បានបើក 2FA រួចរាល់' : 'All accounts are protected with 2FA!'}</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {no2FA.map(acc => {
                const meta = getPlatformMeta(acc.platform, acc.customPlatformName);
                return (
                  <div
                    key={acc.id}
                    onClick={() => onOpenAccount(acc)}
                    className="flex items-center justify-between p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs cursor-pointer hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded flex items-center justify-center border text-[10px] ${meta.bgColor} ${meta.borderColor}`}>
                        {meta.icon}
                      </div>
                      <span className="text-neutral-200 truncate">{acc.title}</span>
                    </div>
                    <span className="text-sky-400 text-[11px] shrink-0 font-medium">
                      + បន្ថែម 2FA
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Checkpoint & Action Needed */}
        <div className="p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {lang === 'km'
                  ? `គណនីជាប់ Checkpoint / Verification (${checkpoints.length})`
                  : `Checkpoint / Verification Required (${checkpoints.length})`}
              </span>
            </div>
          </div>

          {checkpoints.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400 py-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'km' ? 'មិនមានគណនីណាជាប់ Checkpoint ឡើយ' : 'No accounts currently locked or under checkpoint.'}</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {checkpoints.map(acc => (
                <div
                  key={acc.id}
                  onClick={() => onOpenAccount(acc)}
                  className="flex items-center justify-between p-2.5 bg-neutral-950 border border-amber-900/40 rounded-lg text-xs cursor-pointer hover:border-amber-700/60 transition-colors"
                >
                  <span className="font-medium text-neutral-200 truncate">{acc.title} ({acc.username})</span>
                  <span className="text-amber-400 text-[11px] shrink-0 font-medium">{lang === 'km' ? 'ពិនិត្យដោះស្រាយ →' : 'Review →'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
