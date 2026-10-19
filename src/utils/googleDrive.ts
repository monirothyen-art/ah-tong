import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Account } from '../types/account';
import { encryptData, decryptData } from './crypto';

// Initialize Firebase App & Auth
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google Auth Provider with Google Drive file scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
  isEncrypted: boolean;
}

/**
 * Initialize auth state listener. Call this on app load.
 */
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google Popup
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const hasActiveToken = (): boolean => {
  return !!cachedAccessToken;
};

export const ensureToken = async (): Promise<string> => {
  if (cachedAccessToken) return cachedAccessToken;
  const res = await googleSignIn();
  if (!res?.accessToken) {
    throw new Error('AUTH_REQUIRED');
  }
  return res.accessToken;
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Upload Vault backup directly to user's personal Google Drive
 */
export const uploadVaultBackupToDrive = async (
  accounts: Account[],
  encryptionPassword?: string
): Promise<{ fileId: string; fileName: string }> => {
  if (!cachedAccessToken) {
    throw new Error('AUTH_REQUIRED');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let fileContent: string;
  let fileName: string;
  let isEncrypted = false;

  if (encryptionPassword && encryptionPassword.trim()) {
    isEncrypted = true;
    const encryptedPayload = await encryptData(JSON.stringify(accounts), encryptionPassword.trim());
    const exportObject = {
      vaultType: 'SecureVault-Khmer-Encrypted',
      version: 1,
      encryptedData: encryptedPayload,
      exportedAt: new Date().toISOString(),
      accountCount: accounts.length,
    };
    fileContent = JSON.stringify(exportObject, null, 2);
    fileName = `SecureVault-Backup-Encrypted-${timestamp}.svault`;
  } else {
    fileContent = JSON.stringify(accounts, null, 2);
    fileName = `SecureVault-Backup-Plain-${timestamp}.json`;
  }

  // Create multipart boundary payload for Google Drive v3 REST API
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `SecureVault backup created on ${new Date().toLocaleString()} (${accounts.length} accounts, ${isEncrypted ? 'Encrypted' : 'Plain'})`,
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('AUTH_EXPIRED');
    }
    const errText = await response.text();
    throw new Error(`Drive Upload Error: ${errText}`);
  }

  const data = await response.json();
  return { fileId: data.id, fileName };
};

/**
 * List existing SecureVault backup files stored in Google Drive
 */
export const listVaultBackupsFromDrive = async (): Promise<GoogleDriveBackupFile[]> => {
  if (!cachedAccessToken) {
    throw new Error('AUTH_REQUIRED');
  }

  const query = encodeURIComponent("name contains 'SecureVault-Backup' and trashed = false");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=modifiedTime desc`,
    {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('AUTH_EXPIRED');
    }
    throw new Error('Failed to list backups from Google Drive');
  }

  const data = await response.json();
  const files: GoogleDriveBackupFile[] = (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime,
    size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : 'Unknown',
    isEncrypted: f.name.endsWith('.svault') || f.name.includes('Encrypted'),
  }));

  return files;
};

/**
 * Download and parse a backup file from Google Drive
 */
export const downloadVaultBackupFromDrive = async (
  fileId: string,
  decryptionPassword?: string
): Promise<Account[]> => {
  if (!cachedAccessToken) {
    throw new Error('AUTH_REQUIRED');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('AUTH_EXPIRED');
    }
    throw new Error('Failed to download file from Google Drive');
  }

  const text = await response.text();
  const parsed = JSON.parse(text);

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

  if (Array.isArray(parsed)) {
    return parsed;
  }

  throw new Error('INVALID_FORMAT');
};

/**
 * Delete a backup file from Google Drive with user confirmation
 */
export const deleteVaultBackupFromDrive = async (fileId: string): Promise<void> => {
  if (!cachedAccessToken) {
    throw new Error('AUTH_REQUIRED');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to delete file from Google Drive');
  }
};
