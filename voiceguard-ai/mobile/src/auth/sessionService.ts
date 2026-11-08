import { secureStorage, STORAGE_KEYS } from '../services/secureStorage/secureStorage';
import { AuthTokens, UserProfile } from '../types';

export class SessionService {
  async saveTokens(tokens: AuthTokens): Promise<void> {
    await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.access_token);
    await secureStorage.setItem(STORAGE_KEYS.TOKEN_TYPE, tokens.token_type || 'bearer');
  }

  async getAccessToken(): Promise<string | null> {
    return secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  async clearSession(): Promise<void> {
    await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await secureStorage.removeItem(STORAGE_KEYS.TOKEN_TYPE);
    await secureStorage.removeItem(STORAGE_KEYS.USER_ID);
  }

  async isBiometricLockEnabled(): Promise<boolean> {
    const val = await secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_LOCK_ENABLED);
    return val === 'true';
  }

  async setBiometricLockEnabled(enabled: boolean): Promise<void> {
    await secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_LOCK_ENABLED, enabled ? 'true' : 'false');
  }
}

export const sessionService = new SessionService();
