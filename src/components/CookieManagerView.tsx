import React, { useState } from 'react';
import { Cookie, Copy, Check, ExternalLink, Search, RefreshCw, Key, ShieldCheck } from 'lucide-react';
import { Account } from '../types/account';
import { inspectCookieString } from '../utils/crypto';
import { getPlatformMeta } from '../utils/platformHelper';
import { Language } from '../translations';

interface CookieManagerViewProps {
  accounts: Account[];
  lang: Language;
  onOpenAccount: (account: Account) => void;
  onToast: (msg: string) => void;
}

export const CookieManagerView: React.FC<CookieManagerViewProps> = ({
  accounts,
  lang,
  onOpenAccount,
  onToast,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Quick Cookie Tester sandbox
  const [testCookieInput, setTestCookieInput] = useState('');

  const cookieAccounts = accounts.filter(a => a.cookies && a.cookies.trim());

  const filteredAccounts = cookieAccounts.filter(a => {
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.username.toLowerCase().includes(q) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.platform && a.platform.toLowerCase().includes(q))
    );
  });

  const handleCopy = (e: React.MouseEvent, text: string, accountId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(accountId);
    onToast(lang === 'km' ? 'បានចម្លង Cookie ទៅ Clipboard' : 'Copied Cookie to clipboard');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const testSummary = inspectCookieString(testCookieInput);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Cookie className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-100">
              {lang === 'km' ? 'កម្មវិធីគ្រប់គ្រង Cookie & Session' : 'Cookie & Session Manager'}
            </h2>
            <p className="text-xs text-neutral-400">
              {lang === 'km'
                ? 'រក្សាទុក និងចម្លង Cookie សម្រាប់ Facebook, TikTok, X, Google ងាយស្រួល Restore Session'
                : 'Manage session tokens (c_user, xs, sessionid, auth_token) for quick login.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 tabular-nums">
          <span>{lang === 'km' ? 'គណនីមាន Cookie:' : 'Saved Sessions:'}</span>
          <span className="font-bold text-sky-400 text-sm">{cookieAccounts.length}</span>
        </div>
      </div>

      {/* Interactive Cookie Inspector / Tester Sandbox */}
      <div className="p-4 bg-neutral-900/70 border border-neutral-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {lang === 'km'
                ? 'ឧបករណ៍វិភាគ Cookie ផ្ទាល់ (Cookie Inspector)'
                : 'Cookie Inspector & Token Validator'}
            </span>
          </div>
          {testCookieInput && (
            <button
              onClick={() => setTestCookieInput('')}
              className="text-[11px] text-neutral-400 hover:text-neutral-200"
            >
              {lang === 'km' ? 'សម្អាត' : 'Clear'}
            </button>
          )}
        </div>

        <textarea
          rows={2}
          value={testCookieInput}
          onChange={e => setTestCookieInput(e.target.value)}
          placeholder={
            lang === 'km'
              ? 'បិទភ្ជាប់ Cookie JSON ឬ c_user=...; xs=... នៅទីនេះ ដើម្បីធ្វើតេស្ត format និងមើល token...'
              : 'Paste cookie string or JSON array here to inspect tokens and format...'
          }
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 font-mono text-xs placeholder:text-neutral-600 focus:outline-none focus:border-sky-500"
        />

        {testCookieInput.trim() && (
          <div className="p-3 bg-neutral-950/80 border border-neutral-800/80 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
              <span>
                Format: <strong className="text-neutral-200 uppercase">{testSummary.format}</strong>
              </span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>
                Total items: <strong className="font-mono text-neutral-200 tabular-nums">{testSummary.cookieCount}</strong>
              </span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>
                Platform:{' '}
                <strong className="text-sky-300">
                  {testSummary.isLikelyFacebook
                    ? 'Facebook'
                    : testSummary.isLikelyTikTok
                    ? 'TikTok'
                    : testSummary.isLikelyGoogle
                    ? 'Google'
                    : 'Universal'}
                </strong>
              </span>
            </div>

            {testSummary.highlightedTokens.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {testSummary.highlightedTokens.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-sky-950/60 border border-sky-800/50 rounded font-mono text-sky-300 text-[11px]"
                  >
                    {t.key} = {t.preview}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Cookie List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-200">
            {lang === 'km' ? 'បញ្ជីគណនីដែលមានរក្សាទុក Cookie' : 'Accounts with Stored Cookies'}
          </h3>
          <div className="relative w-64">
            <input
              type="text"
              placeholder={lang === 'km' ? 'ស្វែងរកគណនី...' : 'Search accounts...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
            />
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="text-center py-10 px-4 bg-neutral-900/40 border border-neutral-800/60 rounded-xl text-neutral-400 text-xs">
            {lang === 'km' ? 'មិនមានគណនីដែលត្រូវនឹងតម្រងស្វែងរកឡើយ' : 'No accounts matching search'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAccounts.map(account => {
              const meta = getPlatformMeta(account.platform, account.customPlatformName);
              const inspected = inspectCookieString(account.cookies);

              return (
                <div
                  key={account.id}
                  onClick={() => onOpenAccount(account)}
                  className="bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 rounded-xl p-4 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${meta.bgColor} ${meta.borderColor}`}>
                        {meta.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-100">
                          {account.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          <span>{account.username || account.email}</span>
                          <span aria-hidden="true" className="text-neutral-600">·</span>
                          <span className="font-mono text-[11px] tabular-nums">
                            {inspected.cookieCount} cookies ({inspected.format})
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={e => handleCopy(e, account.cookies || '', account.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      {copiedId === account.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">បានចម្លង</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-neutral-400" />
                          <span>ចម្លង Cookie</span>
                        </>
                      )}
                    </button>
                  </div>

                  {inspected.highlightedTokens.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 my-2">
                      {inspected.highlightedTokens.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-sky-950/40 border border-sky-800/40 rounded font-mono text-sky-300 text-[10px]"
                        >
                          {t.key}: {t.preview}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative mt-2">
                    <div className="p-2.5 bg-neutral-950 border border-neutral-800/80 rounded-lg font-mono text-[11px] text-neutral-400 truncate">
                      {account.cookies}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
