import { NextResponse } from 'next/server';
import { getAdminAuditLogs } from '@/features/admin-dashboard/api/admin-audit';
import { getAdminServerContext } from '@/features/admin-dashboard/api/admin-auth';
import { ApiErrors } from '@/shared/lib/api-error';

/**
 * GET /api/admin/dashboard/stats - Get dashboard statistics (admin only)
 */
export async function GET() {
  try {
    const { supabase, error: authError } = await getAdminServerContext();

    if (!supabase) {
      if (authError?.includes('Auth session missing') || authError?.includes('Unauthorized')) {
        return ApiErrors.unauthorized(authError);
      }
      return ApiErrors.forbidden(authError || 'Forbidden');
    }

    // Get staff statistics
    const { data: staffData, error: staffError } = await (supabase as any)
      .from('staff_profiles')
      .select('*');

    if (staffError) {
      throw staffError;
    }

    const staff = staffData || [];
    const activeUsers = staff.filter((s: any) => s.is_active).length;
    const inactiveUsers = staff.filter((s: any) => !s.is_active).length;

    // Get appointment statistics
    const today = new Date().toISOString().split('T')[0];

    const { data: todayAppointments } = await (supabase as any)
      .from('appointments')
      .select('id, status')
      .gte('start_time', `${today}T00:00:00.000Z`)
      .lte('start_time', `${today}T23:59:59.999Z`);

    const { data: upcomingAppointments } = await (supabase as any)
      .from('appointments')
      .select('id, status')
      .gte('start_time', new Date().toISOString())
      .in('status', ['scheduled', 'confirmed']);

    const { data: allAppointments } = await (supabase as any)
      .from('appointments')
      .select('id, status');

    const todayCount = todayAppointments?.length || 0;
    const upcomingCount = upcomingAppointments?.length || 0;
    const totalAppointments = allAppointments?.length || 0;
    const activeAppointments = (allAppointments || []).filter(
      (a: any) => ['scheduled', 'confirmed', 'in_progress'].includes(a.status)
    ).length;

    // Get recent admin actions
    const recentActionsResult = await getAdminAuditLogs({ limit: 5, offset: 0 });

    if (recentActionsResult.error) {
      throw new Error(recentActionsResult.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalStaff: staff.length,
        activeUsers,
        inactiveUsers,
        totalAppointments,
        activeAppointments,
        todaysAppointments: todayCount,
        upcomingAppointments: upcomingCount,
        recentActions: (recentActionsResult.data || []).map((action) => ({
          id: action.id,
          action: action.action,
          target_name: action.target_name,
          admin_email: action.admin_email,
          created_at: action.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('[admin/dashboard/stats GET]', error);
    return ApiErrors.internal('Failed to fetch dashboard stats');
  }
}
