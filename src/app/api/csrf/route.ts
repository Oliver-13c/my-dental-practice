import { NextResponse } from 'next/server';
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/shared/lib/csrf';

/**
 * GET /api/csrf
 *
 * Issues a fresh CSRF token.  The same token is:
 *  - returned in the JSON response body so the client can store it in memory,
 *  - set as a cookie (`SameSite=Strict`) so the middleware can compare the
 *    two values on subsequent mutation requests.
 */
export async function GET() {
  const token = generateCsrfToken();

  const response = NextResponse.json({ csrfToken: token });

  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false, // must be readable by JS so the client can send it as a header
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
