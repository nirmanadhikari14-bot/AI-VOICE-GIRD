export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Session expired or unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Insufficient permissions for this resource') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network connection failed. Verify backend connectivity.') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class TimeoutError extends ApiError {
  constructor(timeoutMsOrMessage: number | string = 'Request timed out') {
    const message = typeof timeoutMsOrMessage === 'number'
      ? `Request timed out after ${timeoutMsOrMessage}ms`
      : timeoutMsOrMessage;
    super(message, 408, 'TIMEOUT');
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  // DOMException (AbortError from fetch AbortController) — check name before instanceof
  if (error !== null && typeof error === 'object' && 'name' in error) {
    const named = error as { name: string; message?: string };
    if (named.name === 'AbortError') {
      return new TimeoutError('Request aborted due to timeout');
    }
  }
  if (error instanceof TypeError) {
    return new NetworkError(error.message);
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new TimeoutError('Request aborted due to timeout');
    }
    return new ApiError(error.message, 500, 'UNKNOWN_ERROR');
  }
  // Handle fetch-like response objects: { status, statusText }
  if (error !== null && typeof error === 'object') {
    const res = error as { status?: number; statusText?: string };
    if (typeof res.status === 'number') {
      if (res.status === 401) return new UnauthorizedError();
      if (res.status === 403) return new ForbiddenError();
      if (res.status === 404) return new NotFoundError();
      return new ApiError(res.statusText || 'Server error', res.status, 'SERVER_ERROR');
    }
  }
  return new ApiError('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
}

