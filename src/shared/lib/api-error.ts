import { NextResponse } from 'next/server';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

/**
 * Creates a standardised JSON error response for Next.js Route Handlers.
 */
export function apiError(message: string, status = 500, code?: string): NextResponse {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

export const ApiErrors = {
  badRequest: (message = 'Bad Request') => apiError(message, 400, 'BAD_REQUEST'),
  unauthorized: (message = 'Unauthorized') => apiError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Forbidden') => apiError(message, 403, 'FORBIDDEN'),
  notFound: (message = 'Not Found') => apiError(message, 404, 'NOT_FOUND'),
  tooManyRequests: (message = 'Too Many Requests') => apiError(message, 429, 'RATE_LIMITED'),
  internal: (message = 'Internal Server Error') => apiError(message, 500, 'INTERNAL_ERROR'),
} as const;
