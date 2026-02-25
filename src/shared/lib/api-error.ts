import { NextResponse } from 'next/server';
import { captureError } from './sentry';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

/**
 * Creates a standardised JSON error response for Next.js Route Handlers.
 * 5xx responses are automatically captured in Sentry.
 */
export function apiError(
  message: string,
  status = 500,
  code?: string,
  cause?: unknown
): NextResponse {
  if (status >= 500) {
    captureError(cause ?? new Error(message), { status, code, message });
  }
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

export const ApiErrors = {
  badRequest: (message = 'Bad Request') => apiError(message, 400, 'BAD_REQUEST'),
  unauthorized: (message = 'Unauthorized') => apiError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Forbidden') => apiError(message, 403, 'FORBIDDEN'),
  notFound: (message = 'Not Found') => apiError(message, 404, 'NOT_FOUND'),
  tooManyRequests: (message = 'Too Many Requests') => apiError(message, 429, 'RATE_LIMITED'),
  internal: (message = 'Internal Server Error', cause?: unknown) =>
    apiError(message, 500, 'INTERNAL_ERROR', cause),
} as const;
