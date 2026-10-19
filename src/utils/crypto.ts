/**
 * Cryptographic and Security Utilities
 * Includes Web Crypto API RFC 6238 TOTP generator, AES-GCM vault encryption,
 * password generator, and session cookie inspector.
 */

// --- Base32 Decoding for TOTP (RFC 3548 / RFC 4648) ---
const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32ToUint8Array(base32Str: string): Uint8Array {
  const cleanStr = base32Str.toUpperCase().replace(/[\s\-=]/g, '');
  if (!cleanStr) return new Uint8Array(0);

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    const index = RFC4648_ALPHABET.indexOf(char);
    if (index === -1) continue; // Skip invalid chars

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/**
 * Generate 6-digit TOTP code using Web Crypto API HMAC-SHA1 (RFC 6238 compliant)
 */
export async function generateTOTP(secretBase32: string, timeStepSeconds: number = 30): Promise<{ code: string; secondsRemaining: number }> {
  try {
    const cleanSecret = secretBase32.trim();
    if (!cleanSecret) {
      return { code: '------', secondsRemaining: 30 };
    }

    const keyBytes = base32ToUint8Array(cleanSecret);
    if (keyBytes.length === 0) {
      return { code: 'INVALID', secondsRemaining: 30 };
    }

    const epochSeconds = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epochSeconds / timeStepSeconds);
    const secondsRemaining = timeStepSeconds - (epochSeconds % timeStepSeconds);

    // Counter as 8-byte big-endian Uint8Array
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setUint32(0, 0, false);
    counterView.setUint32(4, counter, false);

    // Import HMAC-SHA1 Key
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    // Sign the counter
    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
    const hmacResult = new Uint8Array(signature);

    // Dynamic truncation
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const binary =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    const otp = binary % 1000000;
    const code = otp.toString().padStart(6, '0');

    return { code, secondsRemaining };
  } catch {
    return { code: 'ERROR', secondsRemaining: 30 };
  }
}

// --- AES-256-GCM Vault Encryption using PBKDF2 ---

export async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await window.crypto.subtle.exportKey('raw', key);
  return Array.from(new Uint8Array(exported))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function encryptData(plainText: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    enc.encode(plainText)
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(cipherBase64: string, password: string): Promise<string> {
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  const rawData = atob(cipherBase64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }

  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const data = bytes.slice(28);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  return dec.decode(decrypted);
}

// --- Password Generator & Strength Calculator ---

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

export function generateStrongPassword(options: PasswordGeneratorOptions): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.?';

  let charPool = '';
  if (options.includeUppercase) charPool += upper;
  if (options.includeLowercase) charPool += lower;
  if (options.includeNumbers) charPool += numbers;
  if (options.includeSymbols) charPool += symbols;

  if (!charPool) charPool = lower + numbers;

  const array = new Uint32Array(options.length);
  window.crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < options.length; i++) {
    password += charPool[array[i] % charPool.length];
  }

  return password;
}

export interface PasswordCriteria {
  hasMinLength: boolean;
  hasStrongLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSymbols: boolean;
  hasVariety: boolean;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0=none, 1=weak, 2=medium, 3=strong, 4=very strong
  percent: number; // 0 - 100
  labelKh: string;
  labelEn: string;
  color: string;
  barColor: string;
  feedbackKh: string;
  feedbackEn: string;
  criteria: PasswordCriteria;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const criteria: PasswordCriteria = {
    hasMinLength: password.length >= 8,
    hasStrongLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /[0-9]/.test(password),
    hasSymbols: /[^A-Za-z0-9]/.test(password),
    hasVariety: false,
  };

  const varietyCount =
    (criteria.hasUppercase ? 1 : 0) +
    (criteria.hasLowercase ? 1 : 0) +
    (criteria.hasNumbers ? 1 : 0) +
    (criteria.hasSymbols ? 1 : 0);

  criteria.hasVariety = varietyCount >= 3;

  if (!password) {
    return {
      score: 0,
      percent: 0,
      labelKh: 'មិនទាន់មាន',
      labelEn: 'Empty',
      color: 'text-neutral-500',
      barColor: 'bg-neutral-800',
      feedbackKh: 'សូមបញ្ចូលលេខសម្ងាត់យ៉ាងតិច ៨ ខ្ទង់',
      feedbackEn: 'Please enter at least 8 characters',
      criteria,
    };
  }

  // Scoring algorithm
  let points = 0;

  // Length points
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;

  // Variety points
  if (criteria.hasUppercase && criteria.hasLowercase) points += 1;
  if (criteria.hasNumbers) points += 1;
  if (criteria.hasSymbols) points += 1;

  // Repetition or simplistic penalties
  if (/(.)\1{2,}/.test(password)) points = Math.max(1, points - 1);
  if (/^(123|abc|password|admin)/i.test(password)) points = Math.min(1, points);

  if (password.length < 8) {
    return {
      score: 1,
      percent: 20,
      labelKh: 'ខ្សោយខ្លាំង (< 8 ខ្ទង់)',
      labelEn: 'Very Weak (< 8 chars)',
      color: 'text-rose-500',
      barColor: 'bg-rose-500',
      feedbackKh: 'លេខសម្ងាត់ខ្លីពេក ត្រូវមានយ៉ាងតិច ៨ ទៅ ១២ ខ្ទង់',
      feedbackEn: 'Too short. Aim for at least 12 characters',
      criteria,
    };
  }

  if (points <= 2) {
    return {
      score: 1,
      percent: 35,
      labelKh: 'ខ្សោយ (Weak)',
      labelEn: 'Weak',
      color: 'text-rose-400',
      barColor: 'bg-rose-500',
      feedbackKh: 'គួរតែបន្ថែមអក្សរធំ លេខ ឬនិមិត្តសញ្ញាដើម្បីសុវត្ថិភាព',
      feedbackEn: 'Add uppercase, numbers, or symbols for better security',
      criteria,
    };
  }

  if (points <= 4) {
    return {
      score: 2,
      percent: 60,
      labelKh: 'មធ្យម (Medium)',
      labelEn: 'Medium',
      color: 'text-amber-400',
      barColor: 'bg-amber-500',
      feedbackKh: 'កម្រិតមធ្យម គួរតែបន្ថែមនិមិត្តសញ្ញាពិសេស (!@#$) ឬធ្វើឱ្យវែងជាងនេះ',
      feedbackEn: 'Decent, but add symbols or extend length to make it strong',
      criteria,
    };
  }

  if (points === 5) {
    return {
      score: 3,
      percent: 85,
      labelKh: 'ខ្លាំង (Strong)',
      labelEn: 'Strong',
      color: 'text-emerald-400',
      barColor: 'bg-emerald-500',
      feedbackKh: 'លេខសម្ងាត់ល្អ មានភាពស្មុគស្មាញ និងធន់នឹងការ Hack',
      feedbackEn: 'Strong password with diverse characters and sufficient length',
      criteria,
    };
  }

  return {
    score: 4,
    percent: 100,
    labelKh: 'ខ្លាំងបំផុត (Very Strong)',
    labelEn: 'Very Strong',
    color: 'text-emerald-300',
    barColor: 'bg-emerald-400',
    feedbackKh: 'ល្អឥតខ្ចោះ! កម្រិតសុវត្ថិភាពខ្ពស់បំផុត និងមាន Entropy ពេញលេញ',
    feedbackEn: 'Maximum security rating with high entropy and optimal length',
    criteria,
  };
}

// --- Cookie Inspector Utility ---

export interface ParsedCookieSummary {
  format: 'json' | 'key-value' | 'netscape' | 'raw';
  cookieCount: number;
  highlightedTokens: { key: string; preview: string }[];
  isLikelyFacebook: boolean;
  isLikelyTikTok: boolean;
  isLikelyGoogle: boolean;
  isLikelyTelegram: boolean;
}

export function inspectCookieString(cookieString?: string): ParsedCookieSummary {
  if (!cookieString || !cookieString.trim()) {
    return {
      format: 'raw',
      cookieCount: 0,
      highlightedTokens: [],
      isLikelyFacebook: false,
      isLikelyTikTok: false,
      isLikelyGoogle: false,
      isLikelyTelegram: false,
    };
  }

  const trimmed = cookieString.trim();
  const highlightedTokens: { key: string; preview: string }[] = [];
  let cookieCount = 0;
  let format: 'json' | 'key-value' | 'netscape' | 'raw' = 'raw';

  // Check JSON format (e.g. exported from J2TEAM Cookies, EditThisCookie)
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) {
        format = 'json';
        cookieCount = arr.length;
        arr.forEach(item => {
          if (item && item.name) {
            const name = String(item.name);
            if (['c_user', 'xs', 'datr', 'fr', 'sb', 'sessionid', 'sid_guard', 'auth_token', 'SAPISID', 'SSID', 'psid'].includes(name)) {
              highlightedTokens.push({
                key: name,
                preview: String(item.value || '').slice(0, 14) + '...',
              });
            }
          }
        });
      }
    } catch {
      // not JSON
    }
  }

  // Key=Value string parsing (e.g., c_user=1000123; xs=382%3A...)
  if (format === 'raw' && trimmed.includes('=')) {
    format = 'key-value';
    const parts = trimmed.split(';').map(p => p.trim()).filter(Boolean);
    cookieCount = parts.length;
    parts.forEach(pair => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx !== -1) {
        const key = pair.slice(0, eqIdx).trim();
        const value = pair.slice(eqIdx + 1).trim();
        if (['c_user', 'xs', 'datr', 'fr', 'sb', 'sessionid', 'sid_guard', 'auth_token', 'SAPISID', 'SSID'].includes(key)) {
          highlightedTokens.push({
            key,
            preview: value.slice(0, 14) + '...',
          });
        }
      }
    });
  }

  const isLikelyFacebook = highlightedTokens.some(t => t.key === 'c_user' || t.key === 'xs');
  const isLikelyTikTok = highlightedTokens.some(t => t.key === 'sessionid' || t.key === 'sid_guard');
  const isLikelyGoogle = highlightedTokens.some(t => t.key === 'SAPISID' || t.key === 'SSID');
  const isLikelyTelegram = trimmed.toLowerCase().includes('stel_token') || trimmed.toLowerCase().includes('stel_ssid');

  return {
    format,
    cookieCount,
    highlightedTokens,
    isLikelyFacebook,
    isLikelyTikTok,
    isLikelyGoogle,
    isLikelyTelegram,
  };
}
