/**
 * CSRF protection utilities – double-submit cookie pattern.
 *
 * Flow:
 *  1. Client calls GET /api/csrf which returns a random token in the response
 *     body and sets a `__csrf` cookie with the same value.
 *  2. Client stores the token and attaches it as an `x-csrf-token` header on
 *     every state-changing request (POST / PUT / DELETE / PATCH).
 *  3. Middleware calls `validateCsrfTokens` to confirm the header value matches
 *     the cookie value.  A mismatch or missing values → 403 Forbidden.
 *
 * The double-submit pattern is sufficient here because:
 *  - The cookie is SameSite=Strict so it is never sent on cross-site requests.
 *  - A cross-origin attacker cannot read the cookie value (Same-Origin Policy).
 *  - All traffic is HTTPS in production, preventing interception.
 */

export const CSRF_COOKIE_NAME = '__csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generates a cryptographically random CSRF token.
 * Uses the Web Crypto API which is available in both Node.js ≥ 19 and the
 * Next.js Edge Runtime.
 */
export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

/**
 * Returns true when the token supplied in the request header matches the value
 * stored in the cookie – i.e. the request originated from the same site and
 * has a valid token issued by this server.
 */
export function validateCsrfTokens(headerValue: string | null, cookieValue: string | null): boolean {
  if (!headerValue || !cookieValue) return false;
  return headerValue === cookieValue;
}
