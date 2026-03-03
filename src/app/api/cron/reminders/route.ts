/**
 * GET /api/cron/reminders
 *
 * Vercel Cron Job: Runs daily to send 24-hour appointment reminders.
 * Queries appointments where start_time is within the next 24–25 hours
 * and reminder_sent_at IS NULL. Sends email + SMS, then marks reminder_sent_at.
 *
 * Protected by CRON_SECRET header to prevent unauthorized invocations.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAppointmentReminder } from '@/services/notification-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this header automatically)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service-role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Window: appointments starting 23–25 hours from now
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60_000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60_000);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients!patient_id (id, first_name, last_name, email, phone),
        provider:staff_profiles!provider_id (id, first_name, last_name, role),
        appointment_type:appointment_types!appointment_type_id (id, name, duration_minutes, color)
      `)
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString())
      .in('status', ['confirmed', 'pending'])
      .is('reminder_sent_at', null);

    if (error) {
      console.error('[cron/reminders] Query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No reminders to send' });
    }

    console.log(`[cron/reminders] Found ${appointments.length} appointments needing reminders`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const appt of appointments) {
      const result = await sendAppointmentReminder(appt);

      if (result.emailSent || result.smsSent) {
        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', appt.id);

        if (updateError) {
          errors.push(`Failed to update reminder_sent_at for ${appt.id}`);
        } else {
          sentCount++;
        }
      } else {
        errors.push(`No notification sent for ${appt.id}: ${result.errors.join(', ')}`);
      }
    }

    console.log(`[cron/reminders] Sent ${sentCount}/${appointments.length} reminders`);

    return NextResponse.json({
      sent: sentCount,
      total: appointments.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[cron/reminders] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
