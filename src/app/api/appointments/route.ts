import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';

const APPOINTMENT_DURATION_MS = 60 * 60 * 1000; // 1 hour

// POST /api/appointments — create a new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patient_id, appointment_date, appointment_time } = body;

    if (!patient_id || !appointment_date || !appointment_time) {
      return NextResponse.json(
        { error: 'patient_id, appointment_date, and appointment_time are required' },
        { status: 400 },
      );
    }

    const supabase = createServerClient() as any;
    const startMs = new Date(`${appointment_date}T${appointment_time}`).getTime();
    const startTs = new Date(startMs).toISOString();
    const endTs = new Date(startMs + APPOINTMENT_DURATION_MS).toISOString();

    const { data, error } = await supabase.from('appointments').insert({
      patient_id,
      start_ts: startTs,
      end_ts: endTs,
      status: 'scheduled',
    }).select().single();

    if (error) {
      console.error('Appointment creation error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Appointment API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/appointments — list all appointments (staff only)
export async function GET() {
  try {
    const supabase = createServerClient() as any;
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('start_ts', { ascending: true });

    if (error) {
      console.error('Appointments fetch error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Appointments API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
