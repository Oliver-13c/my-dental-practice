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
    const { data: recentActions } = await (supabase as any)
      .from('admin_actions')
      .select('id, action, target_name, admin_email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

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
        recentActions: recentActions || [],
      },
    });
  } catch (error) {
    console.error('[admin/dashboard/stats GET]', error);
    return ApiErrors.internal('Failed to fetch dashboard stats');
  }
}
