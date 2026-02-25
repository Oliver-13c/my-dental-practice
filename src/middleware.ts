import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import type { StaffRole } from '@/entities/staff/model/staff.types';
import { checkRateLimit } from '@/shared/lib/rate-limiter';
import { ApiErrors } from '@/shared/lib/api-error';

const protectedRoutesByRole: Record<string, StaffRole[]> = {
  '/staff/dashboard': ['receptionist', 'hygienist', 'dentist', 'admin'],
  '/staff/admin': ['admin'],
  '/staff/dentist': ['dentist', 'admin'],
  '/staff/hygienist': ['hygienist', 'admin'],
};

/** Rate-limit the credentials sign-in endpoint: 5 attempts per 5 minutes per IP and per account. */
const LOGIN_RATE_LIMIT = { maxRequests: 5, windowMs: 5 * 60 * 1000 };
const LOGIN_PATH = '/api/auth/callback/credentials';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate-limit login attempts
  if (pathname === LOGIN_PATH && req.method === 'POST') {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';
    const ipResult = checkRateLimit(`login:ip:${ip}`, LOGIN_RATE_LIMIT);

    // Also rate-limit per account (email) to prevent credential stuffing
    let accountResult: ReturnType<typeof checkRateLimit> | null = null;
    try {
      const cloned = req.clone();
      const contentType = req.headers.get('content-type') ?? '';
      let email: string | null = null;
      if (contentType.includes('application/json')) {
        const body = await cloned.json();
        email = body?.email ?? null;
      } else {
        const body = await cloned.formData();
        email = body.get('email') as string | null;
      }
      if (email) {
        accountResult = checkRateLimit(`login:account:${email}`, LOGIN_RATE_LIMIT);
      }
    } catch {
      // If body cannot be parsed, fall back to IP-only limiting
    }

    const blocked = !ipResult.allowed || (accountResult !== null && !accountResult.allowed);
    if (blocked) {
      const resetAt = !ipResult.allowed ? ipResult.resetAt : (accountResult?.resetAt ?? ipResult.resetAt);
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      console.warn(`[rate-limit] Login blocked – ip=${ip} retryAfter=${retryAfter}s`);
      const response = ApiErrors.tooManyRequests('Too many login attempts. Please try again later.');
      response.headers.set('Retry-After', String(retryAfter));
      return response;
    }
  }

  const matchedPaths = Object.keys(protectedRoutesByRole).filter(
    (key) => pathname === key || pathname.startsWith(key + '/'),
  );

  if (matchedPaths.length === 0) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user) {
    return NextResponse.redirect(new URL('/staff/login', req.url));
  }

  const role = session.user.role;

  if (!role) {
    return NextResponse.redirect(new URL('/staff/login', req.url));
  }

  const allowedRoles = matchedPaths.flatMap((path) => protectedRoutesByRole[path]);

  if (!allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL('/403', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
