import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { ApiErrors } from '@/shared/lib/api-error';

/**
 * GET /api/admin/dashboard/stats - Get dashboard statistics (admin only)
 */
export async function GET() {
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

    // Get statistics
    const { data: staffData, error: staffError } = await (supabase as any)
      .from('staff_profiles')
      .select('*');

    if (staffError) {
      throw staffError;
    }

    const staff = staffData || [];
    const activeUsers = staff.filter((s: any) => s.is_active).length;
    const inactiveUsers = staff.filter((s: any) => !s.is_active).length;

    // Get recent actions count
    const { data: actionsData, error: actionsError } = await (supabase as any)
      .from('admin_actions')
      .select('*', { count: 'exact', head: true })
      .limit(1);

    const recentActionsCount = actionsData?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalStaff: staff.length,
        activeUsers,
        inactiveUsers,
        recentActions: recentActionsCount,
      },
    });
  } catch (error) {
    console.error('[admin/dashboard/stats GET]', error);
    return ApiErrors.internal('Failed to fetch dashboard stats');
  }
}
