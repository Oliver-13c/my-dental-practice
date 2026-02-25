import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
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
  const session = await auth();
  if (!session?.user) {
    return ApiErrors.unauthorized();
  }
  if (session.user.role !== 'admin') {
    return ApiErrors.forbidden('Only admins can view audit logs');
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200);
  const userId = searchParams.get('userId');
  const action = searchParams.get('action');

  const supabase = createServerClient<Database>();
  let query = (supabase as any)
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (action) {
    query = query.eq('action', action);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[audit-logs] Error fetching audit logs:', error.message);
    return ApiErrors.internal('Failed to fetch audit logs');
  }

  return NextResponse.json({ data });
}
