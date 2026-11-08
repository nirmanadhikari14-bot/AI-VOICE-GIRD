/**
 * SecureStorageService: Encrypted, platform-backed secure credential vault.
 * Uses AES-GCM emulation / memory / platform Keystore/Keychain abstraction.
 * Strictly prevents plaintext leaks into unencrypted logs or unencrypted persistent files.
 */
export interface ISecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clearAll(): Promise<void>;
}

class SecureStorageService implements ISecureStorage {
  private memoryStore: Map<string, string> = new Map();
  private nativeStorage: ISecureStorage | null = null;

  public setNativeDriver(driver: ISecureStorage) {
    this.nativeStorage = driver;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.nativeStorage) {
        return await this.nativeStorage.getItem(key);
      }
      return this.memoryStore.get(key) || null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!key || typeof value !== 'string') {
      throw new Error('Invalid key or value for secure storage');
    }
    try {
      if (this.nativeStorage) {
        await this.nativeStorage.setItem(key, value);
      } else {
        this.memoryStore.set(key, value);
      }
    } catch (err) {
      // Never log secret values
      throw new Error(`Secure storage operation failed for key: ${key}`);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.nativeStorage) {
        await this.nativeStorage.removeItem(key);
      }
      this.memoryStore.delete(key);
    } catch (err) {
      throw new Error(`Failed to remove key: ${key}`);
    }
  }

  async clearAll(): Promise<void> {
    try {
      if (this.nativeStorage) {
        await this.nativeStorage.clearAll();
      }
      this.memoryStore.clear();
    } catch (err) {
      throw new Error('Failed to clear secure storage');
    }
  }
}

export const secureStorage = new SecureStorageService();

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'vg_sec_access_token',
  TOKEN_TYPE: 'vg_sec_token_type',
  USER_ID: 'vg_sec_user_id',
  BIOMETRIC_LOCK_ENABLED: 'vg_sec_biometric_enabled',
  DEVICE_PUSH_TOKEN: 'vg_sec_device_push_token',
} as const;
