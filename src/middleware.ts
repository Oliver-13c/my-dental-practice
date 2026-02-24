import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getStaffSession } from '@/shared/api/supabase-auth';

const protectedRoutesByRole: Record<string, string[]> = {
  '/staff/dashboard': ['receptionist', 'hygienist', 'dentist', 'admin'],
  '/staff/admin': ['admin'],
  '/staff/dentist': ['dentist', 'admin'],
  '/staff/hygienist': ['hygienist', 'admin'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass through non-protected routes
  if (!Object.keys(protectedRoutesByRole).some((key) => pathname.includes(key))) {
    return NextResponse.next();
  }

  const session = await getStaffSession();
  if (!session) {
    const loginUrl = new URL('/staff/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const allowedRoles = Object.entries(protectedRoutesByRole)
    .filter(([path]) => pathname.includes(path))
    .flatMap(([, roles]) => roles);

  if (!allowedRoles.includes(session.role)) {
    const forbiddenUrl = new URL('/403', req.url);
    return NextResponse.redirect(forbiddenUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
