import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, ShieldCheck } from 'lucide-react';
import {
  generateStrongPassword,
  evaluatePasswordStrength,
  PasswordGeneratorOptions,
} from '../utils/crypto';

interface PasswordGeneratorProps {
  onSelectPassword?: (password: string) => void;
  onClose?: () => void;
  lang?: 'km' | 'en';
}

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({
  onSelectPassword,
  onClose,
  lang = 'km',
}) => {
  const [options, setOptions] = useState<PasswordGeneratorOptions>({
    length: 18,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
  });

  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const regenerate = () => {
    const newPwd = generateStrongPassword(options);
    setPassword(newPwd);
    setCopied(false);
  };

  useEffect(() => {
    regenerate();
  }, [options]);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = evaluatePasswordStrength(password);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-xl max-w-md w-full">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-neutral-100">
            {lang === 'km' ? 'បង្កើតលេខសម្ងាត់សុវត្ថិភាពខ្ពស់' : 'Strong Password Generator'}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        )}
      </div>

      {/* Generated Password Display */}
      <div className="relative mb-3">
        <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-lg p-3">
          <span className="font-mono text-sm tracking-wide text-emerald-300 break-all select-all">
            {password}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={regenerate}
              title={lang === 'km' ? 'បង្កើតឡើងវិញ' : 'Regenerate'}
              className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              title={lang === 'km' ? 'ចម្លង' : 'Copy'}
              className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Strength indicator */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-neutral-400">
            {lang === 'km' ? 'កម្រិតសុវត្ថិភាព:' : 'Strength:'}
          </span>
          <span className={`font-semibold ${strength.color}`}>
            {lang === 'km' ? strength.labelKh : strength.labelEn}
          </span>
        </div>
        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden flex gap-1">
          {[1, 2, 3, 4].map(step => (
            <div
              key={step}
              className={`h-full flex-1 transition-all ${
                step <= strength.score
                  ? strength.score === 1
                    ? 'bg-rose-500'
                    : strength.score === 2
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                  : 'bg-neutral-800'
              }`}
            />
          ))}
        </div>
        <p className="text-[11px] text-neutral-500 mt-1">
          {lang === 'km' ? strength.feedbackKh : strength.feedbackEn}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-5">
        <div>
          <div className="flex items-center justify-between text-xs text-neutral-300 mb-1.5">
            <span>{lang === 'km' ? 'ប្រវែងលេខសម្ងាត់' : 'Password Length'}:</span>
            <span className="font-mono text-emerald-400 font-bold tabular-nums">
              {options.length}
            </span>
          </div>
          <input
            type="range"
            min="8"
            max="40"
            value={options.length}
            onChange={e => setOptions({ ...options, length: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-500 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300">
          <label className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded border border-neutral-800/80 cursor-pointer hover:border-neutral-700">
            <input
              type="checkbox"
              checked={options.includeUppercase}
              onChange={e => setOptions({ ...options, includeUppercase: e.target.checked })}
              className="accent-emerald-500 rounded"
            />
            <span>A-Z (អក្សរធំ)</span>
          </label>
          <label className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded border border-neutral-800/80 cursor-pointer hover:border-neutral-700">
            <input
              type="checkbox"
              checked={options.includeLowercase}
              onChange={e => setOptions({ ...options, includeLowercase: e.target.checked })}
              className="accent-emerald-500 rounded"
            />
            <span>a-z (អក្សរតូច)</span>
          </label>
          <label className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded border border-neutral-800/80 cursor-pointer hover:border-neutral-700">
            <input
              type="checkbox"
              checked={options.includeNumbers}
              onChange={e => setOptions({ ...options, includeNumbers: e.target.checked })}
              className="accent-emerald-500 rounded"
            />
            <span>0-9 (លេខ)</span>
          </label>
          <label className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded border border-neutral-800/80 cursor-pointer hover:border-neutral-700">
            <input
              type="checkbox"
              checked={options.includeSymbols}
              onChange={e => setOptions({ ...options, includeSymbols: e.target.checked })}
              className="accent-emerald-500 rounded"
            />
            <span>!@#$% (និមិត្តសញ្ញា)</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onSelectPassword && (
          <button
            type="button"
            onClick={() => {
              onSelectPassword(password);
              if (onClose) onClose();
            }}
            className="flex-1 py-2 px-3 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg transition-colors"
          >
            {lang === 'km' ? 'ប្រើប្រាស់លេខសម្ងាត់នេះ' : 'Use This Password'}
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="py-2 px-3 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 transition-colors"
        >
          {copied ? (lang === 'km' ? 'បានចម្លង' : 'Copied') : (lang === 'km' ? 'ចម្លង' : 'Copy')}
        </button>
      </div>
    </div>
  );
};
