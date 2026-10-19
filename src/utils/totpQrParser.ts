/**
 * Parser for Authenticator QR codes (otpauth:// URIs and raw Base32 secret keys)
 */

export interface ParsedTotpResult {
  raw: string;
  secret: string;
  label?: string;
  issuer?: string;
  account?: string;
  algorithm?: string;
  digits?: number;
  period?: number;
  type: 'totp' | 'hotp' | 'raw';
}

/**
 * Normalizes Base32 secret by removing spaces, hyphens, and converting to uppercase
 */
export const normalizeBase32 = (secret: string): string => {
  return secret.replace(/[\s\-_]/g, '').toUpperCase();
};

/**
 * Validates if string looks like a valid Base32 secret
 */
export const isValidBase32 = (str: string): boolean => {
  const cleaned = normalizeBase32(str);
  // Base32 RFC 4648 uses A-Z and 2-7
  return /^[A-Z2-7]+=*$/.test(cleaned) && cleaned.length >= 8;
};

/**
 * Parses raw text from a scanned QR code
 */
export const parseTotpQrData = (rawData: string): ParsedTotpResult | null => {
  if (!rawData || typeof rawData !== 'string') return null;
  const trimmed = rawData.trim();

  // Case 1: Standard otpauth:// URI
  // Example: otpauth://totp/GitHub:monirothyen?secret=JBSWY3DPEHPK3PXP&issuer=GitHub
  if (trimmed.toLowerCase().startsWith('otpauth://')) {
    try {
      const url = new URL(trimmed);
      const type = (url.hostname || url.pathname.split('/')[1] || 'totp').toLowerCase() as 'totp' | 'hotp';
      
      // Label parsing (path is usually /Issuer:Account or /Account)
      let label = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      let extractedIssuer = '';
      let extractedAccount = '';

      if (label.includes(':')) {
        const parts = label.split(':');
        extractedIssuer = parts[0].trim();
        extractedAccount = parts.slice(1).join(':').trim();
      } else {
        extractedAccount = label.trim();
      }

      const params = url.searchParams;
      const rawSecret = params.get('secret') || '';
      const secret = normalizeBase32(rawSecret);

      const issuerParam = params.get('issuer');
      const finalIssuer = issuerParam?.trim() || extractedIssuer || '';
      const algorithm = (params.get('algorithm') || 'SHA1').toUpperCase();
      const digitsStr = params.get('digits');
      const digits = digitsStr ? parseInt(digitsStr, 10) : 6;
      const periodStr = params.get('period');
      const period = periodStr ? parseInt(periodStr, 10) : 30;

      if (secret && isValidBase32(secret)) {
        return {
          raw: trimmed,
          secret,
          label: label || undefined,
          issuer: finalIssuer || undefined,
          account: extractedAccount || undefined,
          algorithm,
          digits: isNaN(digits) ? 6 : digits,
          period: isNaN(period) ? 30 : period,
          type: type === 'hotp' ? 'hotp' : 'totp',
        };
      }
    } catch {
      // If URL parsing fails, fallback to regex search below
    }
  }

  // Case 2: Query parameter style like ?secret=JBSWY3DPEHPK3PXP
  const secretMatch = trimmed.match(/[?&]secret=([A-Za-z2-7\s\-_]+)/i);
  if (secretMatch && secretMatch[1]) {
    const candidate = normalizeBase32(secretMatch[1]);
    if (isValidBase32(candidate)) {
      return {
        raw: trimmed,
        secret: candidate,
        type: 'totp',
      };
    }
  }

  // Case 3: Raw Base32 string
  const cleaned = normalizeBase32(trimmed);
  if (isValidBase32(cleaned)) {
    return {
      raw: trimmed,
      secret: cleaned,
      type: 'raw',
    };
  }

  return null;
};

/**
 * Play a pleasant synthetic confirmation chime upon successful QR scan
 */
export const playScanSuccessFeedback = (): void => {
  // 1. Synthetic Web Audio chime (no external audio assets required)
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Note 1: E6 (1318 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.5, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.1);

      // Note 2: B6 (1975 Hz) for a modern high-tech chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1975.5, now + 0.08);
      gain2.gain.setValueAtTime(0.15, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    }
  } catch {
    // Non-fatal if audio context is blocked
  }

  // 2. Haptic vibration feedback for mobile devices
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([60, 40, 90]);
    } catch {
      // Ignore vibration error
    }
  }
};
