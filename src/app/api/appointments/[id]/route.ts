import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { updateAppointmentSchema } from '@/entities/appointment/model/appointment.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/appointments/[id]
 * Get a single appointment with full details.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient<Database>() as any;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients!patient_id (id, first_name, last_name, email, phone),
        provider:staff_profiles!provider_id (id, first_name, last_name, role),
        appointment_type:appointment_types!appointment_type_id (id, name, duration_minutes, color)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[api/appointments/id] GET exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/appointments/[id]
 * Update appointment: status, reschedule, notes, etc.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const supabase = createServerClient<Database>() as any;

    // If rescheduling (start_time changed), recalculate end_time and check availability
    const updates: Record<string, unknown> = { ...input };

    if (input.start_time) {
      // Get appointment type to determine duration
      let typeId = input.appointment_type_id;
      if (!typeId) {
        const { data: existing } = await supabase
          .from('appointments')
          .select('appointment_type_id')
          .eq('id', id)
          .single();
        typeId = existing?.appointment_type_id;
      }

      let durationMinutes = 30; // default
      if (typeId) {
        const { data: apptType } = await supabase
          .from('appointment_types')
          .select('duration_minutes')
          .eq('id', typeId)
          .single();
        if (apptType) durationMinutes = apptType.duration_minutes;
      }

      const startMs = new Date(input.start_time).getTime();
      const endMs = startMs + durationMinutes * 60_000;
      updates.end_time = new Date(endMs).toISOString();

      // Get provider_id for conflict check
      let providerId = input.provider_id;
      if (!providerId) {
        const { data: existing } = await supabase
          .from('appointments')
          .select('provider_id')
          .eq('id', id)
          .single();
        providerId = existing?.provider_id;
      }

      if (providerId) {
        // Check for conflicts (excluding current appointment)
        const { data: conflicts } = await supabase
          .from('appointments')
          .select('id')
          .eq('provider_id', providerId)
          .neq('id', id)
          .neq('status', 'cancelled')
          .lt('start_time', updates.end_time)
          .gt('end_time', input.start_time)
          .limit(1);

        if (conflicts && conflicts.length > 0) {
          return NextResponse.json(
            { error: 'New time conflicts with an existing appointment' },
            { status: 409 },
          );
        }
      }
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        patient:patients!patient_id (id, first_name, last_name, email, phone),
        provider:staff_profiles!provider_id (id, first_name, last_name, role),
        appointment_type:appointment_types!appointment_type_id (id, name, duration_minutes, color)
      `)
      .single();

    if (error) {
      console.error('[api/appointments/id] PATCH error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[api/appointments/id] Updated:', id, 'changes:', Object.keys(input));

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[api/appointments/id] PATCH exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/appointments/[id]
 * Soft-cancel an appointment (sets status to 'cancelled').
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient<Database>() as any;

    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) {
      console.error('[api/appointments/id] DELETE error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[api/appointments/id] Cancelled:', id);

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[api/appointments/id] DELETE exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
