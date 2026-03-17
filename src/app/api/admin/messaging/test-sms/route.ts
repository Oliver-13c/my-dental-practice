/**
 * POST /api/admin/messaging/test-sms
 *
 * Sends a test SMS via Twilio to verify connectivity.
 * Requires admin role.
 * Logs result to audit_logs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminProfile } from '@/features/admin-dashboard/api/admin-auth';
import { twilioClient, twilioFromPhone } from '@/shared/api/twilio-client';
import { createServerClient } from '@/shared/api/supabase-server';

// Permissive phone validation — Twilio rejects invalid numbers server-side anyway
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

export async function POST(req: NextRequest) {
  const { profile, error } = await getCurrentAdminProfile();
  if (!profile) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
  }

  if (!twilioClient) {
    return NextResponse.json(
      { error: 'Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment.' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const to = typeof (body as any)?.to === 'string' ? (body as any).to.trim() : '';
  if (!to || !PHONE_RE.test(to)) {
    return NextResponse.json({ error: 'A valid to phone number is required' }, { status: 400 });
  }

  try {
    const msg = await twilioClient.messages.create({
      body: 'This is a test SMS from your dental practice management system.',
      from: twilioFromPhone,
      to,
    });

    // Best-effort audit log — non-fatal
    const supabase = createServerClient();
    await (supabase as any)
      .rpc('log_admin_action', {
        p_action: 'test_sms_sent',
        p_target_type: 'twilio_config',
        p_target_id: profile.id,
        p_target_name: 'Twilio Test SMS',
        p_changes: { to, sid: msg.sid, status: msg.status },
      })
      .catch(() => {});

    return NextResponse.json({ success: true, sid: msg.sid, status: msg.status });
  } catch (err: any) {
    console.error('[api/admin/messaging/test-sms]', err);
    return NextResponse.json({ error: err.message ?? 'SMS send failed' }, { status: 500 });
  }
}
