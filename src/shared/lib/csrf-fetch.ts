/**
 * Utility for making CSRF-protected API requests
 */

const CSRF_TOKEN_KEY = '__csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Fetch a fresh CSRF token from the server
 */
async function fetchCsrfToken(): Promise<string> {
  const response = await fetch('/api/csrf');
  const data = await response.json();
  return data.csrfToken;
}

/**
 * Get the CSRF token, fetching it if not already cached
 */
let cachedToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (!cachedToken) {
    cachedToken = await fetchCsrfToken();
  }
  return cachedToken;
}

/**
 * Make a CSRF-protected fetch request
 * Automatically includes the CSRF token header for mutation methods
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';
  const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (needsCsrf) {
    const token = await getCsrfToken();
    const headers = new Headers(options.headers);
    headers.set(CSRF_HEADER_NAME, token);

    options.headers = headers;
  }

  return fetch(url, options);
}

/**
 * Clear the cached CSRF token (e.g., on logout or token expiry)
 */
export function clearCsrfToken(): void {
  cachedToken = null;
}
