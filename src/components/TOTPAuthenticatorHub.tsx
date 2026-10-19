import React, { useState } from 'react';
import {
  KeyRound,
  ExternalLink,
  Camera,
  Plus,
} from 'lucide-react';
import { Account } from '../types/account';
import { LiveTOTPDisplay } from './LiveTOTPDisplay';
import { getPlatformMeta } from '../utils/platformHelper';
import { Language } from '../translations';
import { QRCodeScannerModal } from './QRCodeScannerModal';
import { ParsedTotpResult } from '../utils/totpQrParser';

interface TOTPAuthenticatorHubProps {
  accounts: Account[];
  lang: Language;
  onOpenAccount: (account: Account) => void;
  onToast: (msg: string) => void;
  onAddNewWithTOTP?: (secret: string, issuer?: string, account?: string) => void;
}

export const TOTPAuthenticatorHub: React.FC<TOTPAuthenticatorHubProps> = ({
  accounts,
  lang,
  onOpenAccount,
  onToast,
  onAddNewWithTOTP,
}) => {
  const [showQrScanner, setShowQrScanner] = useState(false);
  const totpAccounts = accounts.filter(a => a.totpSecret && a.totpSecret.trim());

  const handleQrScanSuccess = (result: ParsedTotpResult) => {
    setShowQrScanner(false);
    onToast(
      lang === 'km'
        ? `✓ បានស្កេន 2FA Secret Key ជោគជ័យ: ${result.issuer || result.secret.slice(0, 8)}`
        : `✓ Scanned 2FA secret key: ${result.issuer || result.secret.slice(0, 8)}`
    );
    if (onAddNewWithTOTP) {
      onAddNewWithTOTP(result.secret, result.issuer, result.account);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <span>{lang === 'km' ? 'ផ្ទាំង 2FA / TOTP Live Authenticator' : '2FA / TOTP Live Authenticator Hub'}</span>
            </h2>
            <p className="text-xs text-neutral-400">
              {lang === 'km'
                ? 'បង្កើតលេខកូដ 6 ខ្ទង់ស្វ័យប្រវត្តិ ជំនួស Google Authenticator ឬ Authy ដោយមិនបាច់បើក App ក្រៅ'
                : 'Live RFC 6238 time-based one-time password generation. Point your camera at any 2FA QR code to add.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 tabular-nums px-3 py-1.5 bg-neutral-950/60 border border-neutral-800 rounded-xl">
            <span>{lang === 'km' ? 'គណនីមាន 2FA:' : 'Active Keys:'}</span>
            <span className="font-bold text-emerald-400 text-sm">{totpAccounts.length}</span>
          </div>

          {/* Quick Scan QR Code Button */}
          <button
            type="button"
            onClick={() => setShowQrScanner(true)}
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-emerald-500/20 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>{lang === 'km' ? 'ស្កេន QR Code បន្ថែម 2FA' : 'Scan QR Code'}</span>
          </button>
        </div>
      </div>

      {/* Empty State or Accounts Grid */}
      {totpAccounts.length === 0 ? (
        <div className="text-center py-12 px-4 bg-neutral-900/40 border border-neutral-800/60 rounded-2xl">
          <KeyRound className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-neutral-200 mb-1">
            {lang === 'km' ? 'មិនទាន់មានគណនីដែលបានកំណត់ 2FA Secret Key នៅឡើយ' : 'No 2FA keys configured yet'}
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-5">
            {lang === 'km'
              ? 'តម្រង់កាមេរ៉ារបស់អ្នកទៅលើ Authenticator QR Code របស់ Google, Facebook, GitHub, Telegram ឬសេវាផ្សេងៗដើម្បីបន្ថែមភ្លាមៗ។'
              : 'Point your device camera at any authenticator QR code to instantly capture the secret key and generate live OTPs.'}
          </p>

          <button
            type="button"
            onClick={() => setShowQrScanner(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>{lang === 'km' ? 'ស្កេន Authenticator QR Code ឥឡូវនេះ' : 'Scan Authenticator QR Code Now'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {totpAccounts.map(account => {
            const meta = getPlatformMeta(account.platform, account.customPlatformName);
            return (
              <div
                key={account.id}
                onClick={() => onOpenAccount(account)}
                className="bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700/80 rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${meta.bgColor} ${meta.borderColor}`}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-neutral-100 truncate group-hover:text-emerald-300 transition-colors">
                          {account.title}
                        </h4>
                        <span className="text-[11px] text-neutral-400 truncate block">
                          {account.username || account.email}
                        </span>
                      </div>
                    </div>

                    {account.url && (
                      <a
                        href={account.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1 text-neutral-400 hover:text-neutral-200"
                        title={lang === 'km' ? 'ចូលគេហទំព័រ' : 'Launch URL'}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Live TOTP Display */}
                  <div onClick={e => e.stopPropagation()}>
                    <LiveTOTPDisplay
                      secret={account.totpSecret}
                      compact={false}
                      onCopy={code =>
                        onToast(lang === 'km' ? `បានចម្លង OTP: ${code}` : `Copied OTP: ${code}`)
                      }
                    />
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="truncate max-w-[140px]">
                    {account.notes || (lang === 'km' ? 'គណនីមានសុវត្ថិភាព' : 'Secured account')}
                  </span>
                  <span className="text-emerald-400 font-medium group-hover:underline">
                    {lang === 'km' ? 'មើល Profile →' : 'View Profile →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Camera QR Code Scanner Modal */}
      {showQrScanner && (
        <QRCodeScannerModal
          lang={lang}
          onScanSuccess={handleQrScanSuccess}
          onClose={() => setShowQrScanner(false)}
        />
      )}
    </div>
  );
};
