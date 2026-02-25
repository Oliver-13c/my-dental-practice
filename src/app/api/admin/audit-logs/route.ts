import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
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
    const session = await auth();
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    // Verify admin role
    const supabase = createServerClient<Database>();
    const { data: adminProfile } = await (supabase as any)
      .from('staff_profiles')
      .select('is_admin')
      .eq('email', session.user.email)
      .single();

    if (!adminProfile?.is_admin) {
      return ApiErrors.forbidden();
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const action = searchParams.get('action');

    // Build query
    let query = (supabase as any)
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false });

    if (action && action !== 'all') {
      query = query.eq('action', action);
    }

    const { data: logs, error: logsError, count } = await query
      .range(offset, offset + limit - 1);

    if (logsError) {
      throw logsError;
    }

    return NextResponse.json({
      success: true,
      data: (logs || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        target_type: log.target_type,
        target_name: log.target_name,
        admin_email: log.admin_email,
        timestamp: log.created_at,
        ip_address: log.ip_address || null,
        changes: log.changes,
      })),
      pagination: {
        offset,
        limit,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error('[admin/audit-logs GET]', error);
    return ApiErrors.internal('Failed to fetch audit logs');
  }
}
