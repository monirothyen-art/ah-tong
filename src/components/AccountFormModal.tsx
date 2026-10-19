import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Shield,
  Cookie,
  FileCode,
  Sparkles,
  Server,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  RefreshCw,
  Copy,
  Lock,
  ShieldCheck,
  Camera,
} from 'lucide-react';
import {
  Account,
  PlatformType,
  CategoryType,
  AccountStatus,
  RecoveryCodeItem,
} from '../types/account';
import { LiveTOTPDisplay } from './LiveTOTPDisplay';
import { QRCodeScannerModal } from './QRCodeScannerModal';
import { ParsedTotpResult } from '../utils/totpQrParser';
import {
  evaluatePasswordStrength,
  inspectCookieString,
  generateStrongPassword,
} from '../utils/crypto';
import { Language } from '../translations';

interface AccountFormModalProps {
  initialAccount?: Account | null;
  lang: Language;
  onSave: (account: Account) => void;
  onClose: () => void;
}

export const AccountFormModal: React.FC<AccountFormModalProps> = ({
  initialAccount,
  lang,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(initialAccount);

  const [title, setTitle] = useState(initialAccount?.title || '');
  const [platform, setPlatform] = useState<PlatformType>(initialAccount?.platform || 'facebook');
  const [customPlatformName, setCustomPlatformName] = useState(initialAccount?.customPlatformName || '');
  const [category, setCategory] = useState<CategoryType>(initialAccount?.category || 'social');
  const [status, setStatus] = useState<AccountStatus>(initialAccount?.status || 'active');
  const [username, setUsername] = useState(initialAccount?.username || '');
  const [email, setEmail] = useState(initialAccount?.email || '');
  const [phone, setPhone] = useState(initialAccount?.phone || '');
  const [password, setPassword] = useState(initialAccount?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [url, setUrl] = useState(initialAccount?.url || '');
  const [totpSecret, setTotpSecret] = useState(initialAccount?.totpSecret || '');
  const [recoveryCodesRaw, setRecoveryCodesRaw] = useState(
    (initialAccount?.recoveryCodes || []).map(r => r.code).join('\n')
  );
  const [cookies, setCookies] = useState(initialAccount?.cookies || '');
  const [proxy, setProxy] = useState(initialAccount?.proxy || '');
  const [notes, setNotes] = useState(initialAccount?.notes || '');
  const [tagsRaw, setTagsRaw] = useState((initialAccount?.tags || []).join(', '));
  const [favorite, setFavorite] = useState(initialAccount?.favorite || false);

  // Built-in Secure Password Generator State
  const [showGenerator, setShowGenerator] = useState(!isEditing);
  const [genLength, setGenLength] = useState(18);
  const [genUppercase, setGenUppercase] = useState(true);
  const [genLowercase, setGenLowercase] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copiedGeneratorOnly, setCopiedGeneratorOnly] = useState(false);
  const [appliedToFieldNotice, setAppliedToFieldNotice] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scannedNotice, setScannedNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQrScanSuccess = (result: ParsedTotpResult) => {
    setTotpSecret(result.secret);
    setScannedNotice(result.issuer ? `${result.issuer} (${result.secret.slice(0, 8)}...)` : result.secret);

    // Auto-fill title if empty
    if (!title.trim() && (result.issuer || result.label)) {
      setTitle(result.issuer || result.label || '');
    }
    // Auto-fill username if empty
    if (!username.trim() && result.account) {
      setUsername(result.account);
    }
    // Auto-detect platform from issuer
    if (result.issuer) {
      const lower = result.issuer.toLowerCase();
      if (lower.includes('facebook') || lower.includes('meta')) {
        setPlatform('facebook');
        if (!url) setUrl('https://facebook.com');
      } else if (lower.includes('google') || lower.includes('gmail')) {
        setPlatform('google');
        if (!url) setUrl('https://myaccount.google.com');
      } else if (lower.includes('telegram')) {
        setPlatform('telegram');
        if (!url) setUrl('https://web.telegram.org');
      } else if (lower.includes('twitter') || lower.includes('x.com')) {
        setPlatform('twitter');
        if (!url) setUrl('https://x.com');
      } else if (lower.includes('instagram')) {
        setPlatform('instagram');
        if (!url) setUrl('https://instagram.com');
      } else if (lower.includes('tiktok')) {
        setPlatform('tiktok');
        if (!url) setUrl('https://tiktok.com');
      } else if (lower.includes('github')) {
        setPlatform('other');
        setCustomPlatformName('GitHub');
        if (!url) setUrl('https://github.com');
      }
    }
    setShowQrScanner(false);
  };

  const handleRegeneratePassword = () => {
    const hasAny = genUppercase || genLowercase || genNumbers || genSymbols;
    const pwd = generateStrongPassword({
      length: genLength,
      includeUppercase: hasAny ? genUppercase : true,
      includeLowercase: hasAny ? genLowercase : true,
      includeNumbers: genNumbers,
      includeSymbols: genSymbols,
    });
    setGeneratedPassword(pwd);
    setCopiedGeneratorOnly(false);
  };

  useEffect(() => {
    handleRegeneratePassword();
  }, [genLength, genUppercase, genLowercase, genNumbers, genSymbols]);

  const handleCopyAndApply = () => {
    if (!generatedPassword) return;
    setPassword(generatedPassword);
    setShowPassword(true);
    navigator.clipboard.writeText(generatedPassword);
    setAppliedToFieldNotice(true);
    setTimeout(() => setAppliedToFieldNotice(false), 2500);
  };

  const handleCopyGeneratorOnly = () => {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword);
    setCopiedGeneratorOnly(true);
    setTimeout(() => setCopiedGeneratorOnly(false), 2000);
  };

  const pwdStrength = evaluatePasswordStrength(password);
  const cookieMeta = inspectCookieString(cookies);

  const handlePlatformChange = (newPlatform: PlatformType) => {
    setPlatform(newPlatform);
    if (!url || url === 'https://facebook.com' || url === 'https://tiktok.com' || url === 'https://web.telegram.org' || url === 'https://x.com') {
      if (newPlatform === 'facebook') setUrl('https://facebook.com');
      else if (newPlatform === 'telegram') setUrl('https://web.telegram.org');
      else if (newPlatform === 'tiktok') setUrl('https://tiktok.com');
      else if (newPlatform === 'google') setUrl('https://accounts.google.com');
      else if (newPlatform === 'twitter') setUrl('https://x.com');
      else if (newPlatform === 'instagram') setUrl('https://instagram.com');
      else if (newPlatform === 'youtube') setUrl('https://youtube.com');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg(lang === 'km' ? 'សូមបញ្ចូលចំណងជើងគណនី (Title)' : 'Please enter an account title');
      return;
    }
    if (!password) {
      setErrorMsg(lang === 'km' ? 'សូមបញ្ចូលលេខសម្ងាត់ (Password)' : 'Please enter a password');
      return;
    }

    // Parse recovery codes
    const parsedRecoveryCodes: RecoveryCodeItem[] = recoveryCodesRaw
      .split(/[\n,]+/)
      .map(c => c.trim())
      .filter(Boolean)
      .map((code, idx) => {
        // preserve used state if existing
        const existing = initialAccount?.recoveryCodes?.find(r => r.code === code);
        return {
          id: existing ? existing.id : `rc-${Date.now()}-${idx}`,
          code,
          used: existing ? existing.used : false,
        };
      });

    // Parse tags
    const parsedTags = tagsRaw
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const now = new Date().toISOString();
    const updatedAccount: Account = {
      id: initialAccount?.id || `acc-${Date.now()}`,
      title: title.trim(),
      platform,
      customPlatformName: platform === 'other' ? customPlatformName.trim() : undefined,
      category,
      status,
      username: username.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      password,
      url: url.trim() || undefined,
      totpSecret: totpSecret.trim() || undefined,
      recoveryCodes: parsedRecoveryCodes,
      cookies: cookies.trim() || undefined,
      proxy: proxy.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: parsedTags,
      favorite,
      createdAt: initialAccount?.createdAt || now,
      updatedAt: now,
      lastLogin: initialAccount?.lastLogin || now,
      lastPasswordChange:
        initialAccount?.password !== password
          ? now
          : initialAccount?.lastPasswordChange || now,
    };

    onSave(updatedAccount);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900/90">
          <div>
            <h2 className="text-base font-bold text-neutral-100">
              {isEditing
                ? (lang === 'km' ? 'កែសម្រួលព័ត៌មានគណនី' : 'Edit Account Details')
                : (lang === 'km' ? 'បន្ថែមគណនី Social Media ថ្មី' : 'Add New Social Media Account')}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {lang === 'km'
                ? 'រក្សាទុកទិន្នន័យ Password, 2FA, Cookies ជំនួសការកត់ត្រាលើក្រដាស'
                : 'Save credentials securely instead of writing on paper'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-neutral-200">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Platform & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'បណ្តាញ / Platform *' : 'Platform *'}
              </label>
              <select
                value={platform}
                onChange={e => handlePlatformChange(e.target.value as PlatformType)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="facebook">Facebook (ហ្វេសប៊ុក)</option>
                <option value="telegram">Telegram (តេឡេក្រាម)</option>
                <option value="tiktok">TikTok (ធីកតុក)</option>
                <option value="google">Google / YouTube</option>
                <option value="twitter">X / Twitter</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="banking">Banking (ABA, Wing, etc.)</option>
                <option value="github">GitHub</option>
                <option value="discord">Discord</option>
                <option value="other">Other (ផ្សេងៗ)</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'ឈ្មោះសម្គាល់គណនី (Title) *' : 'Account Title *'}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Facebook Business Page, TikTok Main..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {platform === 'other' && (
            <div>
              <label className="block text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'ឈ្មោះ Platform ផ្ទាល់ខ្លួន' : 'Custom Platform Name'}
              </label>
              <input
                type="text"
                placeholder="e.g. Canva, ChatGPT, Netflix..."
                value={customPlatformName}
                onChange={e => setCustomPlatformName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'ប្រភេទ (Category)' : 'Category'}
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as CategoryType)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="social">Social Media (បណ្តាញសង្គម)</option>
                <option value="messaging">Messaging & Chat</option>
                <option value="work">Work & Business</option>
                <option value="banking">Banking & Payment</option>
                <option value="email">Email</option>
                <option value="agency">Agency & Ads</option>
                <option value="entertainment">Entertainment</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'ស្ថានភាព (Status)' : 'Status'}
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as AccountStatus)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="active">Active (ដំណើរការល្អ)</option>
                <option value="checkpoint">Checkpoint (ជាប់ Checkpoint)</option>
                <option value="password_reset_needed">Password Reset Needed (ត្រូវប្តូរ)</option>
                <option value="backup">Backup (គណនីបម្រុង)</option>
                <option value="suspended">Suspended (ផ្អាក)</option>
              </select>
            </div>
          </div>

          {/* Credentials: Username, Email, Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'ឈ្មោះគណនី (Username)' : 'Username'}
              </label>
              <input
                type="text"
                placeholder="e.g. moniroth.yen"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'អ៊ីមែល (Email)' : 'Email'}
              </label>
              <input
                type="email"
                placeholder="name@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'លេខទូរស័ព្ទ (Phone)' : 'Phone'}
              </label>
              <input
                type="tel"
                placeholder="+855 ..."
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Password with Built-in Secure Generator */}
          <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-neutral-200 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                <span>{lang === 'km' ? 'លេខសម្ងាត់ (Password) *' : 'Password *'}</span>
              </label>

              <button
                type="button"
                onClick={() => setShowGenerator(!showGenerator)}
                className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                  showGenerator
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-neutral-900 border-neutral-750 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {showGenerator
                    ? (lang === 'km' ? 'លាក់ Generator' : 'Hide Generator')
                    : (lang === 'km' ? 'បើក Password Generator' : 'Use Password Generator')}
                </span>
              </button>
            </div>

            {/* Direct Password Input with Hide/Reveal */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 pr-10 text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-200"
                title={showPassword ? 'លាក់' : 'បង្ហាញ'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Real-time Password Strength Meter with Visual Bar & Criteria Checklist */}
            {password ? (
              <div className="space-y-2 pt-1 pb-1">
                {/* Strength Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">
                      {lang === 'km' ? 'កម្រិតសុវត្ថិភាព:' : 'Strength:'}
                    </span>
                    <strong className={`font-semibold ${pwdStrength.color}`}>
                      {lang === 'km' ? pwdStrength.labelKh : pwdStrength.labelEn}
                    </strong>
                  </div>
                  <span className="font-mono text-xs text-neutral-300 tabular-nums">
                    {pwdStrength.percent}% ({password.length} {lang === 'km' ? 'ខ្ទង់' : 'chars'})
                  </span>
                </div>

                {/* Visual Segmented Progress Bar */}
                <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden flex gap-1 p-0.5 border border-neutral-800">
                  {[1, 2, 3, 4].map(step => (
                    <div
                      key={step}
                      className={`h-full flex-1 rounded-sm transition-all duration-300 ${
                        step <= pwdStrength.score
                          ? pwdStrength.score === 1
                            ? 'bg-rose-500'
                            : pwdStrength.score === 2
                            ? 'bg-amber-500'
                            : pwdStrength.score === 3
                            ? 'bg-emerald-500'
                            : 'bg-emerald-400'
                          : 'bg-neutral-800/80'
                      }`}
                    />
                  ))}
                </div>

                {/* Helpful feedback advice */}
                <p className="text-[11px] text-neutral-400 leading-tight">
                  {lang === 'km' ? pwdStrength.feedbackKh : pwdStrength.feedbackEn}
                </p>

                {/* Character Variety & Length Real-time Criteria Checklist */}
                <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                      pwdStrength.criteria.hasMinLength
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {pwdStrength.criteria.hasMinLength ? '✓' : '○'} 8+ {lang === 'km' ? 'ខ្ទង់' : 'chars'}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                      pwdStrength.criteria.hasStrongLength
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {pwdStrength.criteria.hasStrongLength ? '✓' : '○'} 12+ {lang === 'km' ? 'ខ្ទង់' : 'chars'}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                      pwdStrength.criteria.hasUppercase
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {pwdStrength.criteria.hasUppercase ? '✓' : '○'} A-Z {lang === 'km' ? '(អក្សរធំ)' : '(upper)'}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                      pwdStrength.criteria.hasLowercase
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {pwdStrength.criteria.hasLowercase ? '✓' : '○'} a-z {lang === 'km' ? '(អក្សរតូច)' : '(lower)'}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                      pwdStrength.criteria.hasNumbers
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {pwdStrength.criteria.hasNumbers ? '✓' : '○'} 0-9 {lang === 'km' ? '(លេខ)' : '(num)'}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                      pwdStrength.criteria.hasSymbols
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {pwdStrength.criteria.hasSymbols ? '✓' : '○'} !@#$ {lang === 'km' ? '(និមិត្តសញ្ញា)' : '(sym)'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-0.5">
                <span>{lang === 'km' ? 'សូមបញ្ចូលលេខសម្ងាត់ ឬប្រើ Generator ខាងក្រោម' : 'Enter password or generate a secure one below'}</span>
                <span className="font-mono text-neutral-600">0 chars</span>
              </div>
            )}

            {/* Success notice when applied to password field */}
            {appliedToFieldNotice && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {lang === 'km'
                    ? '✓ លេខសម្ងាត់សុវត្ថិភាពខ្ពស់ត្រូវបានចម្លង និងដាក់ចូល Password field រួចរាល់!'
                    : '✓ Secure password copied and applied directly into the password field!'}
                </span>
              </div>
            )}

            {/* BUILT-IN SECURE PASSWORD GENERATOR PANEL */}
            {showGenerator && (
              <div className="pt-3 mt-1 border-t border-neutral-850 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>
                      {lang === 'km'
                        ? 'ឧបករណ៍បង្កើតលេខសម្ងាត់ស្វ័យប្រវត្តិ (Built-in Generator)'
                        : 'Built-in Secure Password Generator'}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Crypto-random
                  </span>
                </div>

                {/* Generated Password Preview Box */}
                <div className="flex items-center justify-between gap-2 p-3 bg-neutral-900 border border-neutral-750 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-sm tracking-wide text-emerald-300 font-semibold break-all select-all">
                      {generatedPassword}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleRegeneratePassword}
                      title={lang === 'km' ? 'បង្កើតលេខសម្ងាត់ថ្មី (Regenerate)' : 'Regenerate'}
                      className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyGeneratorOnly}
                      title={lang === 'km' ? 'ចម្លងទៅ Clipboard' : 'Copy to Clipboard'}
                      className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
                    >
                      {copiedGeneratorOnly ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary Action Button: Copy Directly into Password Field */}
                <button
                  type="button"
                  onClick={handleCopyAndApply}
                  className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {lang === 'km'
                      ? 'ចម្លង និងដាក់ចូល Password Field ភ្លាមៗ (Copy & Apply Directly)'
                      : 'Copy Directly into Password Field'}
                  </span>
                </button>

                {/* Password Length Controls */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-neutral-300">
                    <span>{lang === 'km' ? 'ប្រវែងលេខសម្ងាត់ (Length):' : 'Password Length:'}</span>
                    <span className="font-mono text-emerald-400 font-bold tabular-nums text-sm">
                      {genLength} {lang === 'km' ? 'ខ្ទង់' : 'chars'}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="8"
                    max="40"
                    value={genLength}
                    onChange={e => setGenLength(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 bg-neutral-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-neutral-500">Presets:</span>
                    {[12, 16, 20, 24, 32].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setGenLength(preset)}
                        className={`px-2 py-0.5 text-[10px] rounded font-mono transition-colors ${
                          genLength === preset
                            ? 'bg-neutral-800 border border-neutral-700 text-emerald-300 font-semibold'
                            : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Character Types Checkboxes */}
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] text-neutral-400 font-medium block">
                    {lang === 'km' ? 'ប្រភេទអក្សរ និងនិមិត្តសញ្ញា (Character Types):' : 'Character Types:'}
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300">
                    <label className="flex items-center gap-2 p-2 bg-neutral-900/90 rounded-lg border border-neutral-800 cursor-pointer hover:border-neutral-700">
                      <input
                        type="checkbox"
                        checked={genUppercase}
                        onChange={e => setGenUppercase(e.target.checked)}
                        className="accent-emerald-500 rounded"
                      />
                      <span>A-Z (អក្សរធំ / Uppercase)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-neutral-900/90 rounded-lg border border-neutral-800 cursor-pointer hover:border-neutral-700">
                      <input
                        type="checkbox"
                        checked={genLowercase}
                        onChange={e => setGenLowercase(e.target.checked)}
                        className="accent-emerald-500 rounded"
                      />
                      <span>a-z (អក្សរតូច / Lowercase)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-neutral-900/90 rounded-lg border border-neutral-800 cursor-pointer hover:border-neutral-700">
                      <input
                        type="checkbox"
                        checked={genNumbers}
                        onChange={e => setGenNumbers(e.target.checked)}
                        className="accent-emerald-500 rounded"
                      />
                      <span>0-9 (លេខ / Numbers)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-neutral-900/90 rounded-lg border border-neutral-800 cursor-pointer hover:border-neutral-700">
                      <input
                        type="checkbox"
                        checked={genSymbols}
                        onChange={e => setGenSymbols(e.target.checked)}
                        className="accent-emerald-500 rounded"
                      />
                      <span>!@#$% (និមិត្តសញ្ញា / Symbols)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2FA / TOTP Secret Key with Live Preview and Camera QR Scanner */}
          <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-neutral-200 font-medium flex items-center gap-1.5 text-xs">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'km' ? '2FA TOTP Secret Key (Base32)' : '2FA TOTP Secret Key'}</span>
              </label>

              <button
                type="button"
                onClick={() => setShowQrScanner(true)}
                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title={lang === 'km' ? 'ស្កេន Authenticator QR Code ដោយប្រើកាមេរ៉ា' : 'Scan authenticator QR code with camera'}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'ស្កេន QR (កាមេរ៉ា)' : 'Scan QR Code'}</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="JBSWY3DPEHPK3PXP"
                value={totpSecret}
                onChange={e => {
                  setTotpSecret(e.target.value.toUpperCase());
                  setScannedNotice(null);
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono tracking-wider uppercase placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            {scannedNotice && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {lang === 'km'
                      ? `✓ បានស្កេន QR Code និងបញ្ចូល 2FA Secret Key រួចរាល់: ${scannedNotice}`
                      : `✓ Authenticator QR scanned & secret key imported: ${scannedNotice}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setScannedNotice(null)}
                  className="text-neutral-400 hover:text-neutral-200 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {totpSecret.trim() && (
              <div className="pt-1">
                <div className="text-[11px] text-neutral-400 mb-1">
                  {lang === 'km' ? 'ការផ្ទៀងផ្ទាត់ OTP ផ្ទាល់ (Live Test):' : 'Live Test Verification:'}
                </div>
                <LiveTOTPDisplay secret={totpSecret.trim()} compact={true} />
              </div>
            )}
          </div>

          {/* Recovery Codes */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'km' ? 'កូដសង្គ្រោះបម្រុង (Recovery Codes)' : 'Backup Recovery Codes'}</span>
              </span>
              <span className="text-neutral-500 text-[11px]">
                {lang === 'km' ? 'មួយជួរមួយកូដ (One per line)' : 'One code per line'}
              </span>
            </label>
            <textarea
              rows={3}
              placeholder={'8492 1048\n9183 4721\n4019 5520'}
              value={recoveryCodesRaw}
              onChange={e => setRecoveryCodesRaw(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Cookie / Session String */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cookie className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'km' ? 'Cookie / Session Data' : 'Cookie / Session String'}</span>
              </span>
              {cookies && (
                <span className="text-neutral-400 text-[11px]">
                  {cookieMeta.cookieCount} cookies ({cookieMeta.format})
                </span>
              )}
            </label>
            <textarea
              rows={3}
              placeholder="c_user=1000...; xs=... or JSON array [{name, value}]"
              value={cookies}
              onChange={e => setCookies(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 font-mono text-[11px] placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Proxy & URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 font-medium mb-1.5 flex items-center gap-1">
                <Server className="w-3 h-3 text-neutral-400" />
                <span>{lang === 'km' ? 'Proxy / IP ភ្ជាប់ (បើមាន)' : 'Proxy / Bound IP'}</span>
              </label>
              <input
                type="text"
                placeholder="103.20.212.18:8080"
                value={proxy}
                onChange={e => setProxy(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'តំណភ្ជាប់គេហទំព័រ (URL)' : 'Login Website URL'}
              </label>
              <input
                type="url"
                placeholder="https://facebook.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Tags & Favorite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-neutral-300 font-medium mb-1.5">
                {lang === 'km' ? 'ស្លាកសម្គាល់ (Tags)' : 'Tags'}
              </label>
              <input
                type="text"
                placeholder="Ads Manager, Main Page, VIP"
                value={tagsRaw}
                onChange={e => setTagsRaw(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer p-2 bg-neutral-950/60 rounded-lg border border-neutral-800/80 hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={favorite}
                  onChange={e => setFavorite(e.target.checked)}
                  className="accent-amber-400 rounded"
                />
                <span className="text-xs text-neutral-200">
                  {lang === 'km' ? 'សម្គាល់ជាគណនីសំខាន់ (Favorite)' : 'Mark as Favorite Account'}
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1.5">
              {lang === 'km' ? 'កំណត់សម្គាល់បន្ថែម (Notes)' : 'Notes & Internal Comments'}
            </label>
            <textarea
              rows={2}
              placeholder="កាលបរិច្ឆេទបង្កើត ព័ត៌មានកាតធនាគារភ្ជាប់ ឬសំណួរសុវត្ថិភាព..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors font-medium"
            >
              {lang === 'km' ? 'បោះបង់' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
            >
              {isEditing
                ? (lang === 'km' ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Changes')
                : (lang === 'km' ? 'បង្កើតគណនីថ្មី' : 'Create Account')}
            </button>
          </div>
        </form>
      </div>

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
