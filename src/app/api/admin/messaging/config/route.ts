/**
 * GET /api/admin/messaging/config
 *
 * Returns Twilio connection status with masked credentials only.
 * Never exposes raw secrets.
 * Requires admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminProfile } from '@/features/admin-dashboard/api/admin-auth';

function maskString(s: string, visible: number): string {
  if (s.length <= visible) return '*'.repeat(s.length);
  return s.slice(0, visible) + '*'.repeat(Math.min(s.length - visible, 12));
}

export async function GET(_req: NextRequest) {
  const { profile, error } = await getCurrentAdminProfile();
  if (!profile) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
  const fromPhone = process.env.TWILIO_PHONE_NUMBER ?? '';

  const configured = Boolean(accountSid && authToken && fromPhone);

  return NextResponse.json({
    twilioConfigured: configured,
    smsEnabled: configured,
    accountSidMasked: configured ? maskString(accountSid, 8) : null,
    fromPhoneMasked: configured ? maskString(fromPhone, 4) : null,
  });
}
