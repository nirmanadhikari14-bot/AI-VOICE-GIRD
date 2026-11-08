export interface ISecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clearAll(): Promise<void>;
}

class DesktopSecureStorage implements ISecureStorage {
  private memoryStore: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
      return this.memoryStore.get(key) || null;
    } catch {
      return this.memoryStore.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!key || typeof value !== 'string') {
      throw new Error('Invalid key or value');
    }
    this.memoryStore.set(key, value);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
      }
    } catch {
      // Memory store already preserved
    }
  }

  async removeItem(key: string): Promise<void> {
    this.memoryStore.delete(key);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  }

  async clearAll(): Promise<void> {
    this.memoryStore.clear();
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch {
      // Ignore
    }
  }
}

export const desktopSecureStorage = new DesktopSecureStorage();

export const DESKTOP_STORAGE_KEYS = {
  AUTH_TOKEN: 'vg_soc_access_token',
  TOKEN_TYPE: 'vg_soc_token_type',
  USER_ID: 'vg_soc_user_id',
  API_URL: 'vg_soc_api_url',
  API_BASE_URL: 'vg_soc_api_url',
  NOTIFICATIONS_MUTED: 'vg_soc_notifications_muted',
} as const;

