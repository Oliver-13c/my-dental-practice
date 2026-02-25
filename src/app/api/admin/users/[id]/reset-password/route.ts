import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sendPasswordReset } from '@/features/admin-dashboard/api/admin-users';
import { ApiErrors } from '@/shared/lib/api-error';

type Params = {
  id: string;
};

/**
 * POST /api/admin/users/:id/reset-password - Send password reset email
 */
export async function POST(request: NextRequest, { params }: { params: Params }) {
  try {
    const result = await sendPasswordReset(params.id);

    if (result.error) {
      if (result.error.includes('Unauthorized')) {
        return ApiErrors.unauthorized(result.error);
      }
      if (result.error.includes('Forbidden')) {
        return ApiErrors.forbidden(result.error);
      }
      return ApiErrors.internalServerError(result.error);
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[admin/users/:id/reset-password POST]', error);
    return ApiErrors.internalServerError('Failed to send password reset email');
  }
}
