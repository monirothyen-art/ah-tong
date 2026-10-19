import { Account, VaultSettings } from '../types/account';
import { INITIAL_ACCOUNTS } from './initialData';
import { encryptData, decryptData } from './crypto';

const STORAGE_ACCOUNTS_KEY = 'secure_vault_accounts_v1';
const STORAGE_SETTINGS_KEY = 'secure_vault_settings_v1';

export function getStoredSettings(): VaultSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse vault settings:', err);
  }
  // Default: Vault unlocked, auto-lock after 15 minutes, no master password set yet
  return {
    isLocked: false,
    autoLockMinutes: 15,
  };
}

export function saveStoredSettings(settings: VaultSettings): void {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save vault settings:', err);
  }
}

export function getStoredAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasCanva = parsed.some((a: Account) => a.id === 'acc-canva-7');
        if (!hasCanva) {
          const canvaAcc = INITIAL_ACCOUNTS.find(a => a.id === 'acc-canva-7');
          if (canvaAcc) {
            parsed.push(canvaAcc);
            saveStoredAccounts(parsed);
          }
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse accounts from storage:', err);
  }
  // Fallback to initial seeds
  saveStoredAccounts(INITIAL_ACCOUNTS);
  return INITIAL_ACCOUNTS;
}

export function saveStoredAccounts(accounts: Account[]): void {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save accounts to storage:', err);
  }
}

/**
 * Export vault to JSON file
 */
export async function exportVaultJSON(accounts: Account[], encryptionPassword?: string): Promise<void> {
  let fileContent: string;
  let filename: string;

  if (encryptionPassword && encryptionPassword.trim()) {
    const encryptedPayload = await encryptData(JSON.stringify(accounts), encryptionPassword.trim());
    const exportObject = {
      vaultType: 'SecureVault-Khmer-Encrypted',
      version: 1,
      encryptedData: encryptedPayload,
      exportedAt: new Date().toISOString(),
    };
    fileContent = JSON.stringify(exportObject, null, 2);
    filename = `securevault-encrypted-backup-${new Date().toISOString().slice(0, 10)}.svault`;
  } else {
    fileContent = JSON.stringify(accounts, null, 2);
    filename = `securevault-plain-backup-${new Date().toISOString().slice(0, 10)}.json`;
  }

  const blob = new Blob([fileContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export accounts to CSV format for printing or offline backup
 */
export function exportVaultCSV(accounts: Account[]): void {
  const headers = ['Platform', 'Title', 'Username', 'Email', 'Phone', 'Password', '2FA_Secret', 'Status', 'Category', 'Notes', 'Last_Login'];
  const rows = accounts.map(acc => [
    `"${(acc.platform || '').replace(/"/g, '""')}"`,
    `"${(acc.title || '').replace(/"/g, '""')}"`,
    `"${(acc.username || '').replace(/"/g, '""')}"`,
    `"${(acc.email || '').replace(/"/g, '""')}"`,
    `"${(acc.phone || '').replace(/"/g, '""')}"`,
    `"${(acc.password || '').replace(/"/g, '""')}"`,
    `"${(acc.totpSecret || '').replace(/"/g, '""')}"`,
    `"${(acc.status || '').replace(/"/g, '""')}"`,
    `"${(acc.category || '').replace(/"/g, '""')}"`,
    `"${(acc.notes || '').replace(/"/g, '""')}"`,
    `"${(acc.lastLogin || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `securevault-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import accounts from JSON or Encrypted payload
 */
export async function importVaultFile(fileContent: string, decryptionPassword?: string): Promise<Account[]> {
  const parsed = JSON.parse(fileContent);

  // Check if encrypted
  if (parsed && parsed.vaultType === 'SecureVault-Khmer-Encrypted' && parsed.encryptedData) {
    if (!decryptionPassword) {
      throw new Error('PASSWORD_REQUIRED');
    }
    const decryptedRaw = await decryptData(parsed.encryptedData, decryptionPassword);
    const decryptedAccounts = JSON.parse(decryptedRaw);
    if (!Array.isArray(decryptedAccounts)) {
      throw new Error('INVALID_FORMAT');
    }
    return decryptedAccounts;
  }

  // Plain JSON array
  if (Array.isArray(parsed)) {
    return parsed;
  }

  throw new Error('INVALID_FORMAT');
}
