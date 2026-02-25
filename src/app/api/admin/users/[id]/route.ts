import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getStaffMember,
  updateStaffMember,
  deleteStaffMember,
} from '@/features/admin-dashboard/api/admin-users';
import { ApiErrors } from '@/shared/lib/api-error';

/**
 * GET /api/admin/users/:id - Get staff member details
 */
export async function GET(request: NextRequest, context: any) {
  const params = context.params as { id: string };
  try {
    const result = await getStaffMember(params.id);

    if (result.error) {
      if (result.error.includes('Unauthorized')) {
        return ApiErrors.unauthorized(result.error);
      }
      if (result.error.includes('Forbidden')) {
        return ApiErrors.forbidden(result.error);
      }
      return ApiErrors.internal(result.error);
    }

    if (!result.data) {
      return ApiErrors.notFound('Staff member not found');
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[admin/users/:id GET]', error);
    return ApiErrors.internal('Failed to fetch staff member');
  }
}

/**
 * PATCH /api/admin/users/:id - Update staff member
 */
export async function PATCH(request: NextRequest, context: any) {
  const params = context.params as { id: string };
  try {
    const body = await request.json();

    const result = await updateStaffMember(params.id, body);

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
    console.error('[admin/users/:id PATCH]', error);
    return ApiErrors.internal('Failed to update staff member');
  }
}

/**
 * DELETE /api/admin/users/:id - Delete (deactivate) staff member
 */
export async function DELETE(request: NextRequest, context: any) {
  const params = context.params as { id: string };
  try {
    const result = await deleteStaffMember(params.id);

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
    console.error('[admin/users/:id DELETE]', error);
    return ApiErrors.internal('Failed to delete staff member');
  }
}
