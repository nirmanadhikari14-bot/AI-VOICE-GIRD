import { secureStorage, STORAGE_KEYS } from '../../services/secureStorage/secureStorage';
import { sessionService } from '../../auth/sessionService';

describe('Mobile Credential & Storage Security Tests', () => {
  beforeEach(async () => {
    await secureStorage.clearAll();
  });

  it('stores session tokens in secure storage and clears them completely on sign-out', async () => {
    // 1. Save tokens
    await sessionService.saveTokens({
      access_token: 'sec_bearer_token_xyz_99',
      token_type: 'bearer',
    });

    const storedToken = await sessionService.getAccessToken();
    expect(storedToken).toBe('sec_bearer_token_xyz_99');

    // 2. Clear session on sign-out
    await sessionService.clearSession();

    // 3. Verify tokens are purged to prevent cross-user leakage on shared devices
    const purgedToken = await sessionService.getAccessToken();
    expect(purgedToken).toBeNull();
  });

  it('supports biometric app lock state isolation', async () => {
    expect(await sessionService.isBiometricLockEnabled()).toBe(false);
    await sessionService.setBiometricLockEnabled(true);
    expect(await sessionService.isBiometricLockEnabled()).toBe(true);
  });
});
