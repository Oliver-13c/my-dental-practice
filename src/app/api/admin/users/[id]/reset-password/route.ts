import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sendPasswordReset } from '@/features/admin-dashboard/api/admin-users';
import { ApiErrors } from '@/shared/lib/api-error';

/**
 * POST /api/admin/users/:id/reset-password - Send password reset email
 */
export async function POST(request: NextRequest, context: any) {
  const params = context.params as { id: string };
  try {
    const recoveryRedirectTo = `${request.nextUrl.origin}/auth/callback?type=recovery`;
    const result = await sendPasswordReset(params.id, recoveryRedirectTo);

    if (result.error) {
      if (result.error.includes('Unauthorized')) {
        return ApiErrors.unauthorized(result.error);
      }
      if (result.error.includes('Forbidden')) {
        return ApiErrors.forbidden(result.error);
      }
      return ApiErrors.internal(result.error);
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[admin/users/:id/reset-password POST]', error);
    return ApiErrors.internal('Failed to send password reset email');
  }
}
