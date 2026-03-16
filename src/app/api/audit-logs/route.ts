import { NextResponse } from 'next/server';
import { getAdminAuditLogs } from '@/features/admin-dashboard/api/admin-audit';
import { ApiErrors } from '@/shared/lib/api-error';

/**
 * GET /api/audit-logs
 *
 * Returns recent audit log entries. Admin-only.
 *
 * Query params:
 *   limit  - number of records to return (default: 50, max: 200)
 *   userId - filter by a specific user ID (optional)
 *   action - filter by action string (optional)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200);
  const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);
  const action = searchParams.get('action');

  const result = await getAdminAuditLogs({ limit, offset, action });

  if (result.error) {
    if (result.error.includes('Auth session missing') || result.error.includes('Unauthorized')) {
      return ApiErrors.unauthorized(result.error);
    }
    if (result.error.includes('Forbidden')) {
      return ApiErrors.forbidden(result.error);
    }
    return ApiErrors.internal(result.error);
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
}
