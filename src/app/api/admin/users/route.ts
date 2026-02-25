import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getStaffMembers,
  createStaffMember,
} from '@/features/admin-dashboard/api/admin-users';
import { ApiErrors } from '@/shared/lib/api-error';

/**
 * GET /api/admin/users - Get all staff members
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const result = await getStaffMembers({
      active: searchParams.get('active') === 'true' ? true : undefined,
      role: searchParams.get('role') || undefined,
      search: searchParams.get('search') || undefined,
    });

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
    console.error('[admin/users GET]', error);
    return ApiErrors.internalServerError('Failed to fetch staff members');
  }
}

/**
 * POST /api/admin/users - Create new staff member
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.first_name || !body.last_name || !body.role) {
      return ApiErrors.badRequest(
        'Missing required fields: email, password, first_name, last_name, role'
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return ApiErrors.badRequest('Invalid email format');
    }

    // Validate password strength
    if (body.password.length < 8) {
      return ApiErrors.badRequest('Password must be at least 8 characters');
    }

    const result = await createStaffMember({
      email: body.email,
      password: body.password,
      first_name: body.first_name,
      last_name: body.last_name,
      role: body.role,
    });

    if (result.error) {
      if (result.error.includes('Unauthorized')) {
        return ApiErrors.unauthorized(result.error);
      }
      if (result.error.includes('Forbidden')) {
        return ApiErrors.forbidden(result.error);
      }
      if (result.error.includes('already registered')) {
        return ApiErrors.conflict('Email already exists');
      }
      return ApiErrors.internalServerError(result.error);
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 }
    );
  } catch (error) {
    console.error('[admin/users POST]', error);
    return ApiErrors.internalServerError('Failed to create staff member');
  }
}
