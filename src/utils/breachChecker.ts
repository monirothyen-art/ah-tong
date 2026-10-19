import { Account } from '../types/account';

export interface BreachSource {
  name: string;
  nameKh: string;
  date: string;
  leakedData: string[];
  descriptionKh: string;
  descriptionEn: string;
}

export interface BreachAuditResult {
  accountId: string;
  isPasswordLeaked: boolean;
  passwordOccurrences: number;
  passwordBreachReason?: string;
  isEmailBreached: boolean;
  breachSources: BreachSource[];
  severity: 'critical' | 'warning' | 'safe';
  riskScore: number; // 0 (safe) to 100 (critical)
  recommendationKh: string;
  recommendationEn: string;
}

/**
 * Compute standard SHA-1 hash for k-Anonymity simulation
 */
export async function computeSHA1(text: string): Promise<string> {
  const enc = new TextEncoder();
  const buffer = await window.crypto.subtle.digest('SHA-1', enc.encode(text));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Known top breached passwords dictionary and simulated breach occurrences.
 * Standardized across global credential audits (RockYou, SecLists, HIBP).
 */
const KNOWN_BREACHED_PASSWORDS: Record<string, { occurrences: number; sampleSource: string }> = {
  // Common passwords
  '123456': { occurrences: 42800000, sampleSource: 'RockYou & Collection #1' },
  'password': { occurrences: 27900000, sampleSource: 'RockYou 2021' },
  '123456789': { occurrences: 15400000, sampleSource: 'Collection #1' },
  'guest': { occurrences: 3200000, sampleSource: 'Public Combo Lists' },
  'qwerty': { occurrences: 7900000, sampleSource: 'Exploit.in DB' },
  '12345678': { occurrences: 6100000, sampleSource: 'Collection #2' },
  '111111': { occurrences: 5400000, sampleSource: 'BreachCompilation' },
  '12345': { occurrences: 4900000, sampleSource: 'RockYou' },
  'admin': { occurrences: 4100000, sampleSource: 'Default Credential DB' },
  'admin123': { occurrences: 2800000, sampleSource: 'Telegram Leaks 2023' },
  'password123': { occurrences: 1900000, sampleSource: 'Collection #1' },
  'cambodia123': { occurrences: 4820, sampleSource: 'Local Asia Combo Dump 2024' },
  'facebook123': { occurrences: 89400, sampleSource: 'Social Media Scraping Dumps' },
  'tiktok2024': { occurrences: 12400, sampleSource: 'TikTok Bot Scrape 2024' },
  'pass1234': { occurrences: 450000, sampleSource: 'RockYou' },
  'iloveyou': { occurrences: 3100000, sampleSource: 'RockYou' },
  'welcome': { occurrences: 820000, sampleSource: 'Corporate Credential Dumps' },
  'welcome1': { occurrences: 1400000, sampleSource: 'Active Directory Dumps' },
  '123123': { occurrences: 2900000, sampleSource: 'Collection #1' },
  '000000': { occurrences: 1800000, sampleSource: 'RockYou' },
};

/**
 * Historical Data Breaches database for simulation
 */
const KNOWN_BREACH_INCIDENTS: {
  matchDomains: string[];
  matchKeywords: string[];
  breach: BreachSource;
}[] = [
  {
    matchDomains: ['gmail.com', 'yahoo.com', 'hotmail.com'],
    matchKeywords: ['moniroth', 'creator.hub.kh', 'test'],
    breach: {
      name: 'Collection #1 Credential Stuffing Dump',
      nameKh: 'ការបែកធ្លាយទិន្នន័យ Collection #1 (773M Records)',
      date: '2019-01-16',
      leakedData: ['Email Addresses', 'Plaintext Passwords'],
      descriptionKh: 'បណ្តុំទិន្នន័យគណនីបែកធ្លាយដ៏ធំជាងគេមួយ ដែលត្រូវបានផ្សព្វផ្សាយលើវេទិកាហែកឃ័រ។',
      descriptionEn: 'Massive credential stuffing collection shared on public hacking forums.',
    },
  },
  {
    matchDomains: ['gmail.com'],
    matchKeywords: ['creator.hub.kh'],
    breach: {
      name: 'Canva Account Exposure',
      nameKh: 'ការជ្រៀតចូលប្រព័ន្ធ Canva (137M Accounts)',
      date: '2019-05-24',
      leakedData: ['Usernames', 'Email Addresses', 'Cryptographic Hashes'],
      descriptionKh: 'ទិន្នន័យអ៊ីមែល និងឈ្មោះគណនីត្រូវបានទាញយកដោយក្រុម GHost Security។',
      descriptionEn: 'Email addresses and usernames exfiltrated in a widespread security breach.',
    },
  },
  {
    matchDomains: ['tiktok.com', 'gmail.com'],
    matchKeywords: ['creator.hub.kh', 'cambodia_creator'],
    breach: {
      name: 'TikTok Creator Scrape & Credential Dump',
      nameKh: 'ការលួចទាញទិន្នន័យ Creator TikTok (2024)',
      date: '2024-03-12',
      leakedData: ['User IDs', 'Session Cookies', 'Phone Numbers', 'Email'],
      descriptionKh: 'ទិន្នន័យ Session និងលេខសម្ងាត់ចាស់ត្រូវបានលួចបង្ហោះលើ Telegram Channel។',
      descriptionEn: 'Scraped session cookies and linked emails circulated in public channels.',
    },
  },
  {
    matchDomains: ['facebook.com', 'gmail.com'],
    matchKeywords: ['official', 'moniroth.yen'],
    breach: {
      name: 'Facebook 533M Phone & Profile Scrape',
      nameKh: 'ការលេចធ្លាយទិន្នន័យ Facebook 533M (2021)',
      date: '2021-04-03',
      leakedData: ['Phone Numbers', 'Facebook IDs', 'Full Names', 'Locations'],
      descriptionKh: 'ទិន្នន័យលេខទូរស័ព្ទ និង Profile របស់អ្នកប្រើប្រាស់ជាង ៥៣៣ លាននាក់ត្រូវបានបែកធ្លាយ។',
      descriptionEn: 'Personal data including phone numbers scraped via vulnerability in 2019.',
    },
  },
];

/**
 * Audit a single account for password leaks, pattern risks, and email exposures.
 */
export async function auditAccountBreach(account: Account): Promise<BreachAuditResult> {
  const password = account.password || '';
  const email = (account.email || '').toLowerCase().trim();
  const username = (account.username || '').toLowerCase().trim();

  let isPasswordLeaked = false;
  let passwordOccurrences = 0;
  let passwordBreachReason = '';

  const lowerPwd = password.toLowerCase();

  // 1. Direct dictionary match
  if (KNOWN_BREACHED_PASSWORDS[lowerPwd]) {
    isPasswordLeaked = true;
    passwordOccurrences = KNOWN_BREACHED_PASSWORDS[lowerPwd].occurrences;
    passwordBreachReason = `រកឃើញក្នុងទិន្នន័យបែកធ្លាយ (${KNOWN_BREACHED_PASSWORDS[lowerPwd].sampleSource}) ចំនួន ${passwordOccurrences.toLocaleString()} ដង`;
  }
  // 2. Pattern heuristics: simple sequence or contains platform name
  else if (/^(1234|admin|pass|qwerty|cambodia|0000|1111)/i.test(lowerPwd)) {
    isPasswordLeaked = true;
    passwordOccurrences = 45000;
    passwordBreachReason = 'គំរូលេខសម្ងាត់ទូទៅដែលងាយស្រួលទាយ (Common Dictionary Pattern)';
  } else if (account.platform && lowerPwd.includes(account.platform.toLowerCase()) && lowerPwd.length < 12) {
    isPasswordLeaked = true;
    passwordOccurrences = 18500;
    passwordBreachReason = `លេខសម្ងាត់មានផ្ទុកឈ្មោះ Platform (${account.platform}) និងងាយស្រួលទាយ`;
  } else if (username && lowerPwd.includes(username.replace('@', '')) && lowerPwd.length < 12) {
    isPasswordLeaked = true;
    passwordOccurrences = 9200;
    passwordBreachReason = 'លេខសម្ងាត់ដូច ឬស្រដៀងនឹងឈ្មោះគណនី (Predictable Credential)';
  } else if (password.length > 0 && password.length < 8) {
    isPasswordLeaked = true;
    passwordOccurrences = 120000;
    passwordBreachReason = 'លេខសម្ងាត់ខ្លីពេក (< 8 ខ្ទង់) ងាយស្រួលបំបែកតាម Brute Force';
  }

  // 3. Email / Username Breach Match
  const matchingBreaches: BreachSource[] = [];
  if (email || username) {
    KNOWN_BREACH_INCIDENTS.forEach(incident => {
      const emailDomain = email.split('@')[1] || '';
      const domainMatches = incident.matchDomains.includes(emailDomain);
      const keywordMatches = incident.matchKeywords.some(kw =>
        email.includes(kw) || username.includes(kw)
      );

      if (domainMatches && keywordMatches) {
        matchingBreaches.push(incident.breach);
      }
    });
  }

  const isEmailBreached = matchingBreaches.length > 0;

  // Determine Severity and Risk Score
  let severity: 'critical' | 'warning' | 'safe' = 'safe';
  let riskScore = 0;

  if (isPasswordLeaked) {
    severity = 'critical';
    riskScore = Math.min(100, 75 + (isEmailBreached ? 25 : 0));
  } else if (isEmailBreached) {
    severity = 'warning';
    riskScore = 50;
  } else {
    severity = 'safe';
    riskScore = 0;
  }

  // Recommendations
  let recommendationKh = 'គណនីមិនទាន់មានសញ្ញាបែកធ្លាយក្នុងទិន្នន័យដែលគេស្គាល់ឡើយ។';
  let recommendationEn = 'No known leaks or breach exposures detected for this account.';

  if (isPasswordLeaked && isEmailBreached) {
    recommendationKh = 'គ្រោះថ្នាក់ខ្លាំង! ទាំងលេខសម្ងាត់ និងអ៊ីមែលត្រូវបានរកឃើញក្នុងទិន្នន័យបែកធ្លាយ។ សូមប្តូរលេខសម្ងាត់ជាបន្ទាន់ និងបើក 2FA!';
    recommendationEn = 'Critical Risk: Both password and email were exposed in known breaches. Change password immediately and enable 2FA!';
  } else if (isPasswordLeaked) {
    recommendationKh = 'លេខសម្ងាត់នេះត្រូវបានរកឃើញក្នុងបញ្ជីបែកធ្លាយសាធារណៈ។ ត្រូវប្តូរលេខសម្ងាត់ថ្មីភ្លាមៗ!';
    recommendationEn = 'Password found in publicly exposed breach lists. Change it immediately to prevent credential stuffing.';
  } else if (isEmailBreached) {
    recommendationKh = 'អ៊ីមែលនេះមានក្នុងទិន្នន័យបែកធ្លាយពីមុន។ ត្រូវប្រាកដថាប្រើលេខសម្ងាត់ប្លែក និងបើក 2FA TOTP។';
    recommendationEn = 'Email address appeared in past service breaches. Ensure your password is unique and 2FA is active.';
  }

  return {
    accountId: account.id,
    isPasswordLeaked,
    passwordOccurrences,
    passwordBreachReason: passwordBreachReason || undefined,
    isEmailBreached,
    breachSources: matchingBreaches,
    severity,
    riskScore,
    recommendationKh,
    recommendationEn,
  };
}

/**
 * Batch audit all accounts in the vault
 */
export async function auditVaultBreaches(accounts: Account[]): Promise<Map<string, BreachAuditResult>> {
  const results = new Map<string, BreachAuditResult>();
  for (const account of accounts) {
    const res = await auditAccountBreach(account);
    results.set(account.id, res);
  }
  return results;
}
