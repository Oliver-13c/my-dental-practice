'use client';

import { useCallback, useRef } from 'react';
import { CSRF_HEADER_NAME } from '@/shared/lib/csrf';

/**
 * React hook that provides a function to get the current CSRF token, fetching
 * it from GET /api/csrf the first time and caching it for the lifetime of the
 * component.
 *
 * Usage:
 *   const getCsrfHeaders = useCsrfToken();
 *   const res = await fetch('/api/something', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', ...await getCsrfHeaders() },
 *     body: JSON.stringify(data),
 *   });
 */
export function useCsrfToken() {
  const tokenRef = useRef<string | null>(null);

  const getCsrfHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!tokenRef.current) {
      const res = await fetch('/api/csrf');
      if (!res.ok) throw new Error('Failed to fetch CSRF token');
      const { csrfToken } = (await res.json()) as { csrfToken: string };
      tokenRef.current = csrfToken;
    }
    return { [CSRF_HEADER_NAME]: tokenRef.current };
  }, []);

  return getCsrfHeaders;
}
