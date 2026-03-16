/**
 * POST /api/cron/send-pending-reminders
 * 
 * Cron job to send pending appointment reminders
 * Triggered every 5 minutes by Vercel Cron
 * 
 * Security: Verify cron secret in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';
import { sendAppointmentReminder } from '@/services/notification-service';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  try {
    // Verify cron authorization
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // 1. Get reminders that should be sent NOW
    const now = new Date();
    const { data: reminders, error: remindersError } = (await supabase
      .from('appointment_reminders')
      .select(
        `
        id,
        appointment_id,
        send_before_mins,
        channels,
        reminder_type,
        appointments (
          id,
          start_time,
          patient_id,
          provider_id,
          appointment_type_id,
          patients (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          staff_profiles (
            id,
            first_name,
            last_name,
            role
          ),
          appointment_types (
            id,
            name,
            duration_minutes
          )
        )
        `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50)) as any; // Process max 50 at a time

    if (remindersError) {
      console.error('[cron/send-pending-reminders] Error fetching reminders:', remindersError);
      return NextResponse.json(
        { error: remindersError.message, processed: 0 },
        { status: 500 }
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // 2. Process each reminder
    for (const reminder of reminders || []) {
      try {
        if (!reminder.appointments) {
          failed++;
          errors.push(`Reminder ${reminder.id}: appointment not found`);
          continue;
        }

        const appointment = reminder.appointments;
        const appointmentTime = new Date(appointment.start_time);
        const sendTime = new Date(appointmentTime.getTime() - reminder.send_before_mins * 60000);

        // Check if it's time to send (with 5-minute window for cron frequency)
        if (now >= sendTime && now < new Date(sendTime.getTime() + 5 * 60000)) {
          // Check contact preferences
          const { data: preferences } = (await supabase
            .from('contact_preferences')
            .select('*')
            .eq('patient_id', appointment.patient_id)
            .single()) as any;

          // Determine which channels to actually send based on preferences
          const actualChannels = (reminder.channels || ['email']).filter((channel: string) => {
            if (channel === 'email' && !preferences?.reminder_emails) return false;
            if (channel === 'sms' && !preferences?.reminder_sms) return false;
            return true;
          });

          if (actualChannels.length === 0) {
            // Patient has opted out of all channels
            await (supabase as any)
              .from('appointment_reminders')
              .update({
                status: 'cancelled',
                sent_at: now.toISOString(),
                delivery_status: { note: 'Patient opted out of reminders' },
              })
              .eq('id', reminder.id);

            failed++;
            continue;
          }

          // Send reminder via notification service
          const result = await sendAppointmentReminder({
            id: appointment.id,
            patient_id: appointment.patient_id,
            start_time: appointment.start_time,
            end_time: appointment.start_time, // Will be calculated in service
            status: 'scheduled',
            patient_name: appointment.patients
              ? `${appointment.patients.first_name} ${appointment.patients.last_name}`
              : null,
            phone: appointment.patients?.phone || null,
            language_preference: preferences?.preferred_language || 'en',
            patient: appointment.patients,
            provider: appointment.staff_profiles,
            appointment_type: appointment.appointment_types,
          });

          // Update reminder status
          const status = result.emailSent || result.smsSent ? 'sent' : 'failed';

          await (supabase as any)
            .from('appointment_reminders')
            .update({
              status,
              sent_at: now.toISOString(),
              delivery_status: {
                email: {
                  sent: result.emailSent,
                  error: result.errors.find(e => e.includes('Email')) || null,
                },
                sms: {
                  sent: result.smsSent,
                  error: result.errors.find(e => e.includes('SMS')) || null,
                },
              },
            })
            .eq('id', reminder.id);

          if (status === 'sent') {
            sent++;
          } else {
            failed++;
            errors.push(
              `Reminder ${reminder.id}: ${result.errors.join(', ')}`
            );
          }
        }
      } catch (err) {
        failed++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[cron/send-pending-reminders] Error processing reminder:`, err);
        errors.push(`Reminder ${reminder.id}: ${errorMsg}`);
      }
    }

    console.log(
      `[cron/send-pending-reminders] Completed: ${sent} sent, ${failed} failed`
    );

    return NextResponse.json(
      {
        status: 'ok',
        processed: reminders.length,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[cron/send-pending-reminders] Fatal error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Unknown error',
        processed: 0,
      },
      { status: 500 }
    );
  }
}
