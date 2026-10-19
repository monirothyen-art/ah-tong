export type PlatformType =
  | 'facebook'
  | 'telegram'
  | 'tiktok'
  | 'google'
  | 'twitter'
  | 'instagram'
  | 'youtube'
  | 'linkedin'
  | 'github'
  | 'banking'
  | 'discord'
  | 'other';

export type CategoryType =
  | 'social'
  | 'messaging'
  | 'work'
  | 'banking'
  | 'email'
  | 'entertainment'
  | 'agency'
  | 'other';

export type AccountStatus =
  | 'active'
  | 'checkpoint'
  | 'password_reset_needed'
  | 'backup'
  | 'suspended';

export interface RecoveryCodeItem {
  id: string;
  code: string;
  used: boolean;
}

export interface Account {
  id: string;
  title: string;
  platform: PlatformType;
  customPlatformName?: string;
  category: CategoryType;
  username: string;
  email?: string;
  phone?: string;
  password: string;
  url?: string;
  totpSecret?: string; // Base32 2FA secret (e.g. JBSWY3DPEHPK3PXP)
  recoveryCodes?: RecoveryCodeItem[];
  cookies?: string; // Cookie string or JSON format
  notes?: string;
  status: AccountStatus;
  lastLogin?: string; // ISO string
  lastPasswordChange?: string; // ISO string
  tags: string[];
  favorite?: boolean;
  avatarUrl?: string;
  proxy?: string; // Optional proxy / IP info (e.g. 192.168.1.1:8080)
  createdAt: string;
  updatedAt: string;
}

export interface VaultSettings {
  isLocked: boolean;
  masterPasswordHash?: string;
  salt?: string;
  autoLockMinutes: number; // 0 for never, 5, 15, 30, 60
  lastUnlockedTime?: number;
  securityPromptCount?: number;
}
