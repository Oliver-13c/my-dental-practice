/**
 * GET /api/reminders?appointment_id=xyz&status=pending
 * POST /api/reminders
 * 
 * List and create appointment reminders
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get('appointment_id');
    const status = searchParams.get('status');

    const supabase = createServerClient();

    let query = supabase.from('appointment_reminders').select(
      `
      id,
      appointment_id,
      reminder_type,
      send_before_mins,
      channels,
      status,
      sent_at,
      delivery_status,
      created_at,
      updated_at
      `
    );

    if (appointmentId) {
      query = query.eq('appointment_id', appointmentId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('[api/reminders] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointment_id, send_before_mins, channels, reminder_type } = body;

    if (!appointment_id) {
      return NextResponse.json(
        { error: 'appointment_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check appointment exists
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', appointment_id)
      .single();

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Create reminder
    const { data, error } = await (supabase as any)
      .from('appointment_reminders')
      .insert({
        appointment_id,
        send_before_mins: send_before_mins || 1440,
        channels: channels || ['email', 'sms'],
        reminder_type: reminder_type || 'appointment',
        status: 'pending',
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[api/reminders] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
