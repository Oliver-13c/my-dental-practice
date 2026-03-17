/**
 * POST /api/messages/send
 * 
 * Send a message to a patient via SMS or email
 * Staff-initiated message from dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';
import { twilioClient, twilioFromPhone } from '@/shared/api/twilio-client';
import { generateThreadKey } from '@/services/message-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patient_id,
      thread_key: providedThreadKey,
      channels,
      body: messageBody,
      message_type = 'custom',
    } = body;

    if (!patient_id || !messageBody) {
      return NextResponse.json(
        { error: 'patient_id and body are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get staff profile
    const { data: staffProfile }: { data: { id: string } | null } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('auth_user_id', user.data.user.id)
      .single();

    if (!staffProfile) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
    }

    // Get patient contact info
    const { data: patient }: { data: { id: string; email: string | null; phone: string | null } | null } = await supabase
      .from('patients')
      .select('id, email, phone')
      .eq('id', patient_id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check contact preferences
    const { data: prefs }: { data: { do_not_contact: boolean } | null } = await supabase
      .from('contact_preferences')
      .select('*')
      .eq('patient_id', patient_id)
      .single();

    if (prefs?.do_not_contact) {
      return NextResponse.json(
        { error: 'Patient has opted out of contact' },
        { status: 400 }
      );
    }

    // Generate or use provided thread_key
    let threadKey = providedThreadKey;
    if (!threadKey && patient.phone) {
      threadKey = await generateThreadKey(supabase, patient_id, 'outbound', patient.phone);
    }

    // Determine which channels to actually send
    const actualChannels = channels && channels.length > 0 ? channels : ['sms'];
    let smsSent = false;
    let smsError: string | null = null;

    // Send SMS if requested and patient has phone
    if (actualChannels.includes('sms') && patient.phone) {
      try {
        const result = await twilioClient?.messages.create({
          body: messageBody,
          from: twilioFromPhone,
          to: patient.phone,
        });

        smsSent = !!result;
      } catch (err) {
        console.error('[api/messages/send] SMS send error:', err);
        smsError = err instanceof Error ? err.message : 'SMS send failed';
        smsSent = false;
      }
    }

    // Create message log entry
    const { data: insertedMessage, error: insertError }: { data: { id: string } | null; error: any } = await supabase
      .from('message_logs')
      .insert({
        patient_id,
        staff_id: staffProfile.id,
        recipient_phone: patient.phone,
        recipient_email: patient.email,
        message_type,
        channels: actualChannels,
        body: messageBody,
        direction: 'outbound',
        thread_key: threadKey,
        is_read: false, // Outbound messages aren't "read" by staff
        status: smsSent ? 'sent' : 'failed',
        sms_status: smsSent ? 'sent' : smsError || 'failed',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.data.user.id,
      } as any)
      .select('id')
      .single();

    if (insertError || !insertedMessage) {
      console.error('[api/messages/send] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to log message' }, { status: 500 });
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      action: 'staff_message_sent',
      entity_type: 'message_logs',
      entity_id: insertedMessage.id,
      details: {
        patient_id,
        staff_id: staffProfile.id,
        channels: actualChannels,
        status: smsSent ? 'sent' : 'failed',
      },
    } as any);

    // Broadcast to real-time subscribers
    (supabase
      .channel(`patient_messages:${patient_id}`) as any)
      .send('broadcast', {
        event: 'staff_message_sent',
        payload: {
          message_id: insertedMessage.id,
          patient_id,
          thread_key: threadKey,
          timestamp: new Date().toISOString(),
        },
      })
      .catch((err: any) => {
        console.warn('[api/messages/send] Broadcast error:', err);
      });

    return NextResponse.json(
      {
        success: smsSent,
        message_id: insertedMessage.id,
        sms_sent: smsSent,
        sms_error: smsError,
        status: smsSent ? 'sent' : 'failed',
      },
      { status: smsSent ? 200 : 206 } // 206 if partial send
    );
  } catch (err) {
    console.error('[api/messages/send] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
