import { NextResponse } from 'next/server';
import { getAdminAuditLogs } from '@/features/admin-dashboard/api/admin-audit';
import { ApiErrors } from '@/shared/lib/api-error';

/**
 * GET /api/admin/audit-logs - Get audit logs (admin only)
 * Query params:
 *   - limit: number of logs to return (default: 20)
 *   - offset: pagination offset (default: 0)
 *   - action: filter by action type (create, update, delete)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
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
  } catch (error) {
    console.error('[admin/audit-logs GET]', error);
    return ApiErrors.internal('Failed to fetch audit logs');
  }
}
