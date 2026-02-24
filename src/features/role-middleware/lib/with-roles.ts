import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { StaffRole } from '@/entities/staff/model/staff.types';
import { ApiErrors } from '@/shared/lib/api-error';

type RouteHandler = (req: NextRequest, context?: unknown) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a Next.js Route Handler with role-based access control.
 *
 * Usage:
 * ```ts
 * export const GET = withRoles(['admin', 'receptionist'], async (req) => {
 *   // handler logic
 * });
 * ```
 */
export function withRoles(allowedRoles: StaffRole[], handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: unknown) => {
    const session = await auth();

    if (!session?.user) {
      return ApiErrors.unauthorized();
    }

    const role = session.user.role;

    if (!role || !allowedRoles.includes(role)) {
      return ApiErrors.forbidden();
    }

    return handler(req, context);
  };
}
