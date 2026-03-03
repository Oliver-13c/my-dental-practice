/**
 * GET /api/admin/analytics
 *
 * Returns comprehensive appointment analytics:
 * - Summary stats (total, by status, completion rate)
 * - Appointments by provider
 * - Appointments by type
 * - Daily volume over a date range
 * - Cancellation & no-show rates
 *
 * Query params:
 *   startDate (YYYY-MM-DD) — defaults to 30 days ago
 *   endDate   (YYYY-MM-DD) — defaults to today
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient<Database>() as any;

    // Verify admin or staff role
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role, is_admin')
      .eq('email', session.user.email)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Date range
    const { searchParams } = new URL(request.url);
    const endDate = searchParams.get('endDate') ?? new Date().toISOString().slice(0, 10);
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString().slice(0, 10);
    const startDate = searchParams.get('startDate') ?? defaultStart;

    // Fetch all appointments in range
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id, start_time, end_time, status, provider_id, appointment_type_id, patient_id,
        provider:staff_profiles!provider_id (id, first_name, last_name),
        appointment_type:appointment_types!appointment_type_id (id, name, color)
      `)
      .gte('start_time', `${startDate}T00:00:00.000Z`)
      .lte('start_time', `${endDate}T23:59:59.999Z`)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[api/admin/analytics] Query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const all = appointments ?? [];

    // ── Summary stats ────────────────────────────────────────
    const total = all.length;
    const byStatus: Record<string, number> = {};
    for (const a of all) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    }

    const completed = byStatus['completed'] ?? 0;
    const cancelled = byStatus['cancelled'] ?? 0;
    const noShow = byStatus['no-show'] ?? 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
    const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;

    // ── By provider ──────────────────────────────────────────
    const providerMap = new Map<string, { name: string; total: number; completed: number; cancelled: number }>();
    for (const a of all) {
      const pid = a.provider_id ?? 'unassigned';
      const prov = a.provider as { first_name: string; last_name: string } | null;
      const name = prov ? `${prov.first_name} ${prov.last_name}` : 'Unassigned';
      if (!providerMap.has(pid)) {
        providerMap.set(pid, { name, total: 0, completed: 0, cancelled: 0 });
      }
      const entry = providerMap.get(pid)!;
      entry.total++;
      if (a.status === 'completed') entry.completed++;
      if (a.status === 'cancelled') entry.cancelled++;
    }
    const byProvider = Array.from(providerMap.entries()).map(([id, data]) => ({
      id,
      ...data,
    }));

    // ── By appointment type ──────────────────────────────────
    const typeMap = new Map<string, { name: string; color: string; count: number }>();
    for (const a of all) {
      const tid = a.appointment_type_id ?? 'unknown';
      const t = a.appointment_type as { name: string; color: string } | null;
      const name = t?.name ?? 'Unknown';
      const color = t?.color ?? '#9CA3AF';
      if (!typeMap.has(tid)) {
        typeMap.set(tid, { name, color, count: 0 });
      }
      typeMap.get(tid)!.count++;
    }
    const byType = Array.from(typeMap.entries()).map(([id, data]) => ({
      id,
      ...data,
    }));

    // ── Daily volume ─────────────────────────────────────────
    const dailyMap = new Map<string, { total: number; completed: number; cancelled: number }>();
    for (const a of all) {
      const day = a.start_time.slice(0, 10);
      if (!dailyMap.has(day)) {
        dailyMap.set(day, { total: 0, completed: 0, cancelled: 0 });
      }
      const entry = dailyMap.get(day)!;
      entry.total++;
      if (a.status === 'completed') entry.completed++;
      if (a.status === 'cancelled') entry.cancelled++;
    }
    const dailyVolume = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    // ── Unique patients ──────────────────────────────────────
    const uniquePatients = new Set(all.map((a: { patient_id: string }) => a.patient_id)).size;

    // ── Average appointments per day ─────────────────────────
    const daysWithAppts = dailyMap.size || 1;
    const avgPerDay = Math.round((total / daysWithAppts) * 10) / 10;

    return NextResponse.json({
      data: {
        dateRange: { startDate, endDate },
        summary: {
          total,
          completed,
          cancelled,
          noShow,
          completionRate,
          cancellationRate,
          noShowRate,
          uniquePatients,
          avgPerDay,
        },
        byStatus,
        byProvider,
        byType,
        dailyVolume,
      },
    });
  } catch (err) {
    console.error('[api/admin/analytics] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
