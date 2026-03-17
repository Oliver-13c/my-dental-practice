/**
 * POST /api/webhooks/twilio/status
 * 
 * Twilio delivery status webhook handler
 * Receives SMS delivery/failure updates and updates message_logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/api/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio form-encoded body
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const accountSid = formData.get('AccountSid') as string;

    // Validate required fields
    if (!messageSid || !messageStatus) {
      console.warn('[twilio-status-webhook] Missing required fields', {
        messageSid: !!messageSid,
        messageStatus: !!messageStatus,
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find the message by sms_message_sid
    const { data: message, error: findError }: { data: { id: string; sms_status: string } | null; error: any } = await supabase
      .from('message_logs')
      .select('id, sms_status')
      .eq('sms_message_sid', messageSid)
      .maybeSingle();

    if (findError || !message) {
      console.warn('[twilio-status-webhook] Message not found', { messageSid });
      // Still return 200 to acknowledge receipt
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Map Twilio status to our status field
    const statusMap: Record<string, { status: string; sms_status: string }> = {
      'queued': { status: 'pending', sms_status: 'queued' },
      'sending': { status: 'pending', sms_status: 'sending' },
      'sent': { status: 'sent', sms_status: 'sent' },
      'failed': { status: 'failed', sms_status: 'failed' },
      'delivered': { status: 'delivered', sms_status: 'delivered' },
      'undelivered': { status: 'failed', sms_status: 'undelivered' },
      'received': { status: 'delivered', sms_status: 'received' },
    };

    const mappedStatus = statusMap[messageStatus] || { status: messageStatus, sms_status: messageStatus };

    // Prepare update data
    const updateData: Record<string, any> = {
      sms_status: mappedStatus.sms_status,
      status: mappedStatus.status,
      updated_at: new Date().toISOString(),
    };

    // Add timestamps based on status
    if (messageStatus === 'delivered' || messageStatus === 'received') {
      updateData.delivered_at = new Date().toISOString();
    } else if (messageStatus === 'failed' || messageStatus === 'undelivered') {
      updateData.failed_at = new Date().toISOString();
      
      // Capture failure reason if provided
      const errorCode = formData.get('ErrorCode') as string;
      const errorMessage = formData.get('ErrorMessage') as string;
      
      if (errorCode || errorMessage) {
        updateData.failure_reason = `${errorCode || 'Unknown'}: ${errorMessage || 'No details available'}`;
      }
    }

    // Update the message in the database
    const { error: updateError } = await (supabase as any)
      .from('message_logs')
      .update(updateData)
      .eq('id', message.id);

    if (updateError) {
      console.error('[twilio-status-webhook] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    // Log for audit trail
    console.info('[twilio-status-webhook] SMS status updated', {
      messageSid,
      previousStatus: message.sms_status,
      newStatus: mappedStatus.sms_status,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('[twilio-status-webhook] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
