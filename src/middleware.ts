import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import type { StaffRole } from '@/entities/staff/model/staff.types';

const protectedRoutesByRole: Record<string, StaffRole[]> = {
  '/staff/dashboard': ['receptionist', 'hygienist', 'dentist', 'admin'],
  '/staff/admin': ['admin'],
  '/staff/dentist': ['dentist', 'admin'],
  '/staff/hygienist': ['hygienist', 'admin'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
