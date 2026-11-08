import { API_CONFIG } from './endpoints';
import { ApiError, UnauthorizedError, NetworkError, TimeoutError, normalizeError } from './errors';
import { secureStorage, STORAGE_KEYS } from '../services/secureStorage/secureStorage';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  requiresAuth?: boolean;
  retries?: number;
  isFormUrlEncoded?: boolean;
}

type AuthFailureListener = () => void;

class ApiClient {
  private baseUrl: string = API_CONFIG.DEFAULT_BASE_URL;
  private authFailureListeners: AuthFailureListener[] = [];

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public onAuthFailure(listener: AuthFailureListener) {
    this.authFailureListeners.push(listener);
    return () => {
      this.authFailureListeners = this.authFailureListeners.filter((l) => l !== listener);
    };
  }

  private notifyAuthFailure() {
    this.authFailureListeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Prevent listener error propagation
      }
    });
  }

  public async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeoutMs = API_CONFIG.TIMEOUT_MS,
      requiresAuth = true,
      retries = method === 'GET' ? API_CONFIG.RETRY_COUNT : 0,
      isFormUrlEncoded = false,
    } = options;

    let url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...headers,
    };

    if (requiresAuth) {
      const token = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    let requestBody: string | undefined;
    if (body !== undefined) {
      if (isFormUrlEncoded) {
        requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        const formParams = new URLSearchParams();
        Object.entries(body as Record<string, string>).forEach(([k, v]) => formParams.append(k, v));
        requestBody = formParams.toString();
      } else {
        requestHeaders['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(body);
      }
    }

    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: requestBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
          this.notifyAuthFailure();
          throw new UnauthorizedError();
        }

        if (!response.ok) {
          let errDetail = 'Request failed';
          try {
            const errJson = await response.json();
            errDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
          } catch {
            errDetail = await response.text();
          }
          throw new ApiError(errDetail || `HTTP ${response.status}`, response.status);
        }

        // Return JSON or empty object for 204
        if (response.status === 204) {
          return {} as T;
        }

        const data: T = await response.json();
        return data;
      } catch (err) {
        clearTimeout(timeoutId);

        const normalized = normalizeError(err);

        // Don't retry on unauthorized, client errors (4xx), or non-idempotent methods
        const isTransient = normalized instanceof TimeoutError || normalized instanceof NetworkError || normalized.status >= 500;
        if (isTransient && attempt < retries) {
          attempt++;
          // Bounded exponential backoff
          await new Promise((res) => setTimeout(res, Math.min(1000 * 2 ** attempt, 4000)));
          continue;
        }

        throw normalized;
      }
    }
  }

  // Convenience methods
  get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
