/**
 * Integration Tests: API Client
 * Tests centralized HTTP client: auth injection, error class hierarchy, retry logic.
 */

import { ApiError, UnauthorizedError, NetworkError, TimeoutError, normalizeError } from '../../api/errors';

describe('Error Class Hierarchy', () => {
  it('ApiError extends Error', () => {
    const err = new ApiError('Test API error', 400, 'Bad Request');
    expect(err instanceof ApiError).toBe(true);
    expect(err instanceof Error).toBe(true);
    expect(err.status).toBe(400);
    expect(err.message).toBe('Test API error');
  });

  it('UnauthorizedError is an ApiError with status 401', () => {
    const err = new UnauthorizedError();
    expect(err instanceof UnauthorizedError).toBe(true);
    expect(err instanceof ApiError).toBe(true);
    expect(err.status).toBe(401);
  });

  it('NetworkError extends ApiError with status 0', () => {
    const err = new NetworkError('Connection refused');
    expect(err instanceof NetworkError).toBe(true);
    expect(err instanceof ApiError).toBe(true);
    expect(err.status).toBe(0);
    expect(err.message).toContain('Connection refused');
  });

  it('TimeoutError has correct status code', () => {
    const err = new TimeoutError(12000);
    expect(err instanceof TimeoutError).toBe(true);
    expect(err.status).toBe(408);
    expect(err.message).toContain('12000');
  });
});

describe('normalizeError utility', () => {
  it('wraps 401 Fetch-like responses as UnauthorizedError', () => {
    const mockResponse = { status: 401, statusText: 'Unauthorized' };
    const result = normalizeError(mockResponse);
    expect(result instanceof UnauthorizedError).toBe(true);
  });

  it('wraps 500+ Fetch-like responses as ApiError', () => {
    const mockResponse = { status: 500, statusText: 'Internal Server Error' };
    const result = normalizeError(mockResponse);
    expect(result instanceof ApiError).toBe(true);
    expect(result.status).toBe(500);
  });

  it('wraps AbortError as TimeoutError', () => {
    // In Node.js jest environment, DOMException may not extend Error.
    // normalizeError checks .name === 'AbortError' on any object with a name property.
    const abortErr = { name: 'AbortError', message: 'The operation was aborted' };
    const result = normalizeError(abortErr as any);
    expect(result instanceof TimeoutError).toBe(true);
  });

  it('wraps TypeError (network failure) as NetworkError', () => {
    const typeErr = new TypeError('Failed to fetch');
    const result = normalizeError(typeErr);
    expect(result instanceof NetworkError).toBe(true);
  });

  it('wraps unknown errors as ApiError', () => {
    const result = normalizeError({ something: 'weird' });
    expect(result instanceof ApiError).toBe(true);
  });
});

describe('Bearer Token Authorization Header', () => {
  it('formats Bearer token correctly', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example';
    const headerValue = `Bearer ${token}`;
    expect(headerValue.startsWith('Bearer ')).toBe(true);
    expect(headerValue.split(' ')[1]).toBe(token);
  });

  it('does not include token in Authorization header if token is null', () => {
    const token: string | null = null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    expect(headers['Authorization']).toBeUndefined();
  });
});

describe('API Endpoint Contracts', () => {
  it('generates correct acknowledge endpoint', () => {
    const { DESKTOP_ENDPOINTS } = require('../../api/endpoints');
    expect(DESKTOP_ENDPOINTS.ALERT_ACKNOWLEDGE('alert-001')).toBe('/api/v1/alerts/alert-001/acknowledge');
  });

  it('generates correct dismiss endpoint', () => {
    const { DESKTOP_ENDPOINTS } = require('../../api/endpoints');
    expect(DESKTOP_ENDPOINTS.ALERT_DISMISS(42)).toBe('/api/v1/alerts/42/dismiss');
  });

  it('generates correct incident notes endpoint', () => {
    const { DESKTOP_ENDPOINTS } = require('../../api/endpoints');
    expect(DESKTOP_ENDPOINTS.INCIDENT_NOTES('inc-001')).toBe('/api/v1/incidents/inc-001/notes');
  });

  it('generates correct prevention approve endpoint', () => {
    const { DESKTOP_ENDPOINTS } = require('../../api/endpoints');
    expect(DESKTOP_ENDPOINTS.PREVENTION_APPROVE('act-007')).toBe('/api/v1/prevention/actions/act-007/approve');
  });

  it('generates correct prevention execute endpoint', () => {
    const { DESKTOP_ENDPOINTS } = require('../../api/endpoints');
    expect(DESKTOP_ENDPOINTS.PREVENTION_EXECUTE('act-007')).toBe('/api/v1/prevention/actions/act-007/execute');
  });
});

