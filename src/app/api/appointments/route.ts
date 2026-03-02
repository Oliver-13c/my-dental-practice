import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { createAppointmentSchema } from '@/entities/appointment/model/appointment.types';

/**
 * GET /api/appointments
 * List appointments with optional filters: date, startDate, endDate, provider_id, status, patient_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = createServerClient<Database>() as any;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients!patient_id (id, first_name, last_name, email, phone),
        provider:staff_profiles!provider_id (id, first_name, last_name, role),
        appointment_type:appointment_types!appointment_type_id (id, name, duration_minutes, color)
      `)
      .order('start_time', { ascending: true });

    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const providerId = searchParams.get('provider_id');
    const status = searchParams.get('status');
    const patientId = searchParams.get('patient_id');

    if (date) {
      query = query
        .gte('start_time', `${date}T00:00:00.000Z`)
        .lte('start_time', `${date}T23:59:59.999Z`);
    }
    if (startDate) {
      query = query.gte('start_time', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte('start_time', `${endDate}T23:59:59.999Z`);
    }
    if (providerId) {
      query = query.eq('provider_id', providerId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[api/appointments] GET error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error('[api/appointments] GET exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/appointments
 * Create a new appointment with availability check.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const supabase = createServerClient<Database>() as any;

    // 1. Get appointment type to determine duration
    const { data: apptType, error: typeError } = await supabase
      .from('appointment_types')
      .select('duration_minutes, name')
      .eq('id', input.appointment_type_id)
      .single();

    if (typeError || !apptType) {
      return NextResponse.json({ error: 'Invalid appointment type' }, { status: 400 });
    }

    // 2. Calculate end_time from start_time + duration
    const startMs = new Date(input.start_time).getTime();
    const endMs = startMs + apptType.duration_minutes * 60_000;
    const end_time = new Date(endMs).toISOString();

    // 3. Check for overlapping appointments for this provider
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('provider_id', input.provider_id)
      .neq('status', 'cancelled')
      .lt('start_time', end_time)
      .gt('end_time', input.start_time)
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Time slot is not available — conflicts with an existing appointment' },
        { status: 409 },
      );
    }

    // 4. Check for overlapping time blocks (breaks, meetings, etc.)
    const { data: blockConflicts } = await supabase
      .from('provider_time_blocks')
      .select('id')
      .eq('provider_id', input.provider_id)
      .lt('start_time', end_time)
      .gt('end_time', input.start_time)
      .limit(1);

    if (blockConflicts && blockConflicts.length > 0) {
      return NextResponse.json(
        { error: 'Provider is blocked during this time' },
        { status: 409 },
      );
    }

    // 5. Get patient info for denormalized fields
    const { data: patient } = await supabase
      .from('patients')
      .select('first_name, last_name, phone')
      .eq('id', input.patient_id)
      .single();

    const patient_name = patient
      ? `${patient.first_name} ${patient.last_name}`
      : null;

    // 6. Insert appointment
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        patient_id: input.patient_id,
        provider_id: input.provider_id,
        appointment_type_id: input.appointment_type_id,
        start_time: input.start_time,
        end_time,
        status: 'confirmed',
        patient_name,
        phone: input.phone ?? patient?.phone ?? null,
        notes: input.notes ?? null,
        language_preference: input.language_preference,
      })
      .select(`
        *,
        patient:patients!patient_id (id, first_name, last_name, email, phone),
        provider:staff_profiles!provider_id (id, first_name, last_name, role),
        appointment_type:appointment_types!appointment_type_id (id, name, duration_minutes, color)
      `)
      .single();

    if (insertError) {
      console.error('[api/appointments] INSERT error:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('[api/appointments] Created appointment:', appointment.id);

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (err) {
    console.error('[api/appointments] POST exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
