import { apiClient } from '../../api/client';
import { UnauthorizedError, ApiError } from '../../api/errors';
import { secureStorage, STORAGE_KEYS } from '../../services/secureStorage/secureStorage';

describe('ApiClient Integration Tests', () => {
  beforeEach(async () => {
    await secureStorage.clearAll();
  });

  it('triggers onAuthFailure callback when 401 response is returned', async () => {
    let authFailureCalled = false;
    const unsub = apiClient.onAuthFailure(() => {
      authFailureCalled = true;
    });

    // Mock fetch to simulate 401 Unauthorized
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: jest.fn().mockResolvedValue('Unauthorized'),
    }) as any;

    try {
      await expect(apiClient.get('/api/v1/auth/me')).rejects.toThrow(UnauthorizedError);
      expect(authFailureCalled).toBe(true);
    } finally {
      global.fetch = originalFetch;
      unsub();
    }
  });

  it('injects Authorization Bearer token from secure storage', async () => {
    await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'test_jwt_secops_token');

    const originalFetch = global.fetch;
    let interceptedHeaders: any = null;

    global.fetch = jest.fn().mockImplementation((url, init) => {
      interceptedHeaders = init?.headers;
      return Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    }) as any;

    try {
      await apiClient.get('/api/v1/test');
      expect(interceptedHeaders?.['Authorization']).toBe('Bearer test_jwt_secops_token');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('normalizes HTTP 500 server errors into ApiError', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      status: 500,
      ok: false,
      json: () => Promise.resolve({ detail: 'Internal Gatekeeper Failure' }),
    }) as any;

    try {
      await expect(apiClient.get('/api/v1/faulty', { retries: 0 })).rejects.toThrow(ApiError);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
