import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import type { AvailableSlot } from '@/entities/appointment/model/appointment.types';

/**
 * GET /api/appointments/availability
 * Returns available time slots for a given provider, date, and appointment type.
 *
 * Query params:
 *   provider_id (required) — UUID
 *   date        (required) — YYYY-MM-DD
 *   type_id     (required) — UUID of appointment_type (to determine duration)
 *   slot_interval (optional) — minutes between slot starts, default 15
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('provider_id');
    const date = searchParams.get('date');
    const typeId = searchParams.get('type_id');
    const slotInterval = parseInt(searchParams.get('slot_interval') ?? '15', 10);

    if (!providerId || !date || !typeId) {
      return NextResponse.json(
        { error: 'provider_id, date, and type_id are required' },
        { status: 400 },
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format, use YYYY-MM-DD' }, { status: 400 });
    }

    const supabase = createServerClient<Database>() as any;

    // 1. Get appointment type duration
    const { data: apptType, error: typeError } = await supabase
      .from('appointment_types')
      .select('duration_minutes')
      .eq('id', typeId)
      .single();

    if (typeError || !apptType) {
      return NextResponse.json({ error: 'Appointment type not found' }, { status: 404 });
    }
    const durationMs = apptType.duration_minutes * 60_000;

    // 2. Get provider schedule for this day of week
    const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // 0=Sun..6=Sat
    const { data: schedule } = await supabase
      .from('provider_schedules')
      .select('start_time, end_time, is_active')
      .eq('provider_id', providerId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!schedule || !schedule.is_active) {
      // Provider doesn't work this day
      return NextResponse.json({ data: [] as AvailableSlot[] });
    }

    // Convert schedule times (HH:MM) to Date objects on the target date
    const dayStart = new Date(`${date}T${schedule.start_time}:00`);
    const dayEnd = new Date(`${date}T${schedule.end_time}:00`);

    // 3. Get existing appointments for provider on this date
    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('provider_id', providerId)
      .neq('status', 'cancelled')
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString());

    // 4. Get time blocks for provider on this date
    const { data: timeBlocks } = await supabase
      .from('provider_time_blocks')
      .select('start_time, end_time, is_all_day')
      .eq('provider_id', providerId)
      .lt('start_time', dayEnd.toISOString())
      .gt('end_time', dayStart.toISOString());

    // If there's an all-day block, no slots available
    if (timeBlocks?.some((b: { is_all_day: boolean }) => b.is_all_day)) {
      return NextResponse.json({ data: [] as AvailableSlot[] });
    }

    // Build list of busy intervals
    const busy: Array<{ start: number; end: number }> = [];

    for (const appt of appointments ?? []) {
      busy.push({
        start: new Date(appt.start_time).getTime(),
        end: new Date(appt.end_time).getTime(),
      });
    }

    for (const block of timeBlocks ?? []) {
      busy.push({
        start: new Date(block.start_time).getTime(),
        end: new Date(block.end_time).getTime(),
      });
    }

    // Sort by start time
    busy.sort((a, b) => a.start - b.start);

    // 5. Generate available slots
    const slots: AvailableSlot[] = [];
    const intervalMs = slotInterval * 60_000;
    let cursor = dayStart.getTime();
    const endBound = dayEnd.getTime();

    while (cursor + durationMs <= endBound) {
      const slotEnd = cursor + durationMs;

      // Check if this slot overlaps any busy interval
      const hasConflict = busy.some(
        (b) => cursor < b.end && slotEnd > b.start,
      );

      if (!hasConflict) {
        slots.push({
          start_time: new Date(cursor).toISOString(),
          end_time: new Date(slotEnd).toISOString(),
        });
      }

      cursor += intervalMs;
    }

    return NextResponse.json({ data: slots });
  } catch (err) {
    console.error('[api/appointments/availability] GET exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
