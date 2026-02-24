import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { StaffRole } from '@/entities/staff/model/staff.types';

const protectedRoutesByRole: Record<string, string[]> = {
  '/staff/dashboard': ['receptionist', 'hygienist', 'dentist', 'admin'],
  '/staff/admin': ['admin'],
  '/staff/dentist': ['dentist', 'admin'],
  '/staff/hygienist': ['hygienist', 'admin'],
};

const VALID_ROLES: StaffRole[] = ['receptionist', 'hygienist', 'dentist', 'admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass through non-protected routes
  if (!Object.keys(protectedRoutesByRole).some((key) => pathname.startsWith(key))) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const loginUrl = new URL('/staff/login', req.url);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profileData } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profileData) {
      const loginUrl = new URL('/staff/login', req.url);
      return NextResponse.redirect(loginUrl);
    }

    const role = profileData.role;
    if (!VALID_ROLES.includes(role as StaffRole)) {
      const loginUrl = new URL('/staff/login', req.url);
      return NextResponse.redirect(loginUrl);
    }

    const allowedRoles = Object.entries(protectedRoutesByRole)
      .filter(([path]) => pathname.startsWith(path))
      .flatMap(([, roles]) => roles);

    if (!allowedRoles.includes(role)) {
      const forbiddenUrl = new URL('/403', req.url);
      return NextResponse.redirect(forbiddenUrl);
    }

    return res;
  } catch (error) {
    console.error('[middleware] Auth check failed, redirecting to login:', error);
    const loginUrl = new URL('/staff/login', req.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/staff/:path*'],
};
