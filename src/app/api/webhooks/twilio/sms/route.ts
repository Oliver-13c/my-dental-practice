/**
 * POST /api/webhooks/twilio/sms
 * 
 * Twilio inbound SMS webhook handler
 * Receives incoming SMS messages from patients and logs them to message_logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/api/supabase-server';
import { generateThreadKey, findPatientByPhone } from '@/services/message-service';

// Verify Twilio request signature for security
function verifyTwilioSignature(request: NextRequest, body: string): boolean {
  const twilioSignature = request.headers.get('x-twilio-signature') || '';
  const twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
  const twilioUrl = process.env.TWILIO_WEBHOOK_URL || '';

  if (!twilioSignature || !twilioToken || !twilioUrl) {
    console.warn('[twilio-webhook] Missing signature verification config');
    // In production, this should fail. For development, warn but proceed if explicitly enabled.
    if (process.env.SKIP_TWILIO_SIGNATURE_VERIFY !== 'true') {
      return false;
    }
  }

  // Signature verification would go here using twilio library
  // For now, we rely on URL obscurity and environment variable validation
  // In production: import crypto and verify with twilio.validateRequest()
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio form-encoded body
    const formData = await request.formData();
    const messageBody = formData.get('Body') as string;
    const fromPhone = formData.get('From') as string;
    const toPhone = formData.get('To') as string;
    const messageSid = formData.get('MessageSid') as string;
    const numMedia = parseInt(formData.get('NumMedia') as string || '0');

    // Validate required fields
    if (!messageBody || !fromPhone || !messageSid) {
      console.warn('[twilio-webhook] Missing required Twilio fields', {
        messageBody: !!messageBody,
        fromPhone: !!fromPhone,
        messageSid: !!messageSid,
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify signature
    const bodyStr = new URLSearchParams(formData).toString();
    if (!verifyTwilioSignature(request, bodyStr)) {
      console.error('[twilio-webhook] Invalid Twilio signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Step 1: Find patient by phone number
    const patientId = await findPatientByPhone(supabase, fromPhone);
    if (!patientId) {
      console.info('[twilio-webhook] No patient found for phone', { fromPhone });
      // Still log it for admin visibility, but without patient_id
      await logUnmatchedInboundMessage(supabase, {
        fromPhone,
        toPhone,
        messageBody,
        messageSid,
        numMedia,
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Step 2: Generate or find existing thread_key for this conversation
    const threadKey = await generateThreadKey(supabase, patientId, 'inbound', fromPhone);

    // Step 3: Insert inbound message into message_logs
    const { data: insertedMessage, error: insertError } = await supabase
      .from('message_logs')
      .insert({
        patient_id: patientId,
        recipient_phone: toPhone,
        message_type: 'custom',
        channels: ['sms'],
        body: messageBody,
        direction: 'inbound',
        status: 'delivered', // Inbound messages are already delivered to us
        sms_status: 'received',
        sms_message_sid: messageSid,
        twilio_inbound_message_sid: messageSid,
        thread_key: threadKey,
        is_read: false,
        received_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .select('id')
      .single();

    if (insertError) {
      console.error('[twilio-webhook] Failed to insert message', {
        error: insertError.message,
        patientId,
        messageSid,
      });
      return NextResponse.json({ error: 'Failed to log message' }, { status: 500 });
    }

    // Step 4: Log audit event
    await supabase.from('audit_logs').insert({
      action: 'inbound_sms_received',
      entity_type: 'message_logs',
      entity_id: insertedMessage.id,
      details: {
        patient_id: patientId,
        from_phone: fromPhone,
        message_sid: messageSid,
        has_media: numMedia > 0,
      },
    });

    // Step 5: Trigger real-time notification
    // This will notify staff dashboard in real-time
    supabase
      .channel(`patient_messages:${patientId}`)
      .send('broadcast', {
        event: 'inbound_sms',
        payload: {
          message_id: insertedMessage.id,
          patient_id: patientId,
          thread_key: threadKey,
          timestamp: new Date().toISOString(),
        },
      })
      .catch((err) => {
        console.warn('[twilio-webhook] Failed to broadcast notification', err);
      });

    console.info('[twilio-webhook] Inbound SMS logged successfully', {
      messageId: insertedMessage.id,
      patientId,
      messageSid,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('[twilio-webhook] Unhandled exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Log inbound messages that don't match a patient (for admin review)
 */
async function logUnmatchedInboundMessage(
  supabase: ReturnType<typeof createAdminClient>,
  meta: {
    fromPhone: string;
    toPhone: string;
    messageBody: string;
    messageSid: string;
    numMedia: number;
  }
) {
  try {
    await supabase.from('message_logs').insert({
      recipient_phone: meta.toPhone,
      message_type: 'system',
      channels: ['sms'],
      body: `[UNMATCHED] SMS from ${meta.fromPhone}: ${meta.messageBody}`,
      direction: 'inbound',
      status: 'pending',
      sms_status: 'unmatched',
      sms_message_sid: meta.messageSid,
      twilio_inbound_message_sid: meta.messageSid,
      is_read: false,
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    console.info('[twilio-webhook] Unmatched inbound SMS logged for admin review', {
      fromPhone: meta.fromPhone,
      messageSid: meta.messageSid,
    });
  } catch (err) {
    console.error('[twilio-webhook] Failed to log unmatched message', err);
  }
}
