/**
 * GET /api/messages
 * POST /api/messages
 * 
 * List and send messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patient_id');
    const appointmentId = searchParams.get('appointment_id');
    const messageType = searchParams.get('message_type');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const supabase = createServerClient();

    let query = supabase.from('message_logs').select(
      `
      id,
      patient_id,
      recipient_email,
      recipient_phone,
      message_type,
      channels,
      subject,
      body,
      appointment_id,
      status,
      email_status,
      sms_status,
      sent_at,
      delivered_at,
      read_at,
      failure_reason,
      created_at,
      updated_at
      `,
      { count: 'exact' }
    );

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    if (appointmentId) {
      query = query.eq('appointment_id', appointmentId);
    }
    if (messageType) {
      query = query.eq('message_type', messageType);
    }
    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        data,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil((count || 0) / limit),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[api/messages] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patient_id,
      channels,
      subject,
      body: messageBody,
      message_type,
    } = body;

    if (!patient_id || !channels || !messageBody) {
      return NextResponse.json(
        { error: 'patient_id, channels, and body are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch patient's contact info
    const { data: patient } = (await supabase
      .from('patients')
      .select('id, email, phone')
      .eq('id', patient_id)
      .single()) as any;

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check contact preferences if message_type includes reminders/marketing
    const { data: prefs } = (await supabase
      .from('contact_preferences')
      .select('*')
      .eq('patient_id', patient_id)
      .single()) as any;

    if (prefs?.do_not_contact) {
      return NextResponse.json(
        { error: 'Patient has opted out of contact' },
        { status: 400 }
      );
    }

    // Create message log entry
    const { data, error } = await (supabase as any)
      .from('message_logs')
      .insert({
        patient_id,
        recipient_email: patient.email,
        recipient_phone: patient.phone,
        channels: channels || ['email'],
        subject: subject || 'Message from Practice',
        body: messageBody,
        message_type: message_type || 'custom',
        status: 'pending',
        created_by: user.data.user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Queue for sending via notification service
    // For now, just log as pending

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[api/messages] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
