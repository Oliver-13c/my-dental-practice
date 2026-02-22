import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(resendApiKey);

serve(async (req) => {
  try {
    // Fetch patients with last appointment date
    const { data: patients, error } = await supabase
      .from('patients')
      .select(`id, email, full_name, last_appointment_date`)
      .not('last_appointment_date', 'is', null);

    if (error) {
      console.error('Error fetching patients:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch patients' }), { status: 500 });
    }

    const today = new Date();
    const patientsDueForRecall = patients!.filter((patient) => {
      if (!patient.last_appointment_date) return false;

      const lastApptDate = new Date(patient.last_appointment_date);
      const nextRecallDate = new Date(lastApptDate);
      nextRecallDate.setMonth(nextRecallDate.getMonth() + 6);

      // Due if next recall date is today or past
      return nextRecallDate <= today;
    });

    const emailsSent: string[] = [];
    const errors: string[] = [];

    for (const patient of patientsDueForRecall) {
      if (!patient.email) {
        errors.push(`Missing email for patient ID ${patient.id}`);
        continue;
      }

      try {
        await resend.emails.send({
          from: 'clinic@mydentalpractice.com',
          to: patient.email,
          subject: 'Dental Recall Reminder',
          html: `<p>Dear ${patient.full_name},</p><p>It's time to schedule your next dental appointment. Please contact us to book your recall.</p><p>Best regards,<br/>My Dental Practice</p>`,
        });
        emailsSent.push(patient.email);
      } catch (sendError) {
        errors.push(`Failed to send email to ${patient.email}: ${sendError}`);
      }
    }

    // Logging
    console.log(`Recall emails sent: ${emailsSent.length}`);
    if (errors.length > 0) {
      console.error('Errors sending emails:', errors);
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent: emailsSent.length, errors }),
      { status: 200 }
    );
  } catch (e) {
    console.error('Unexpected error in recall management:', e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
});

// Note: Setup to call this daily via Supabase scheduled functions or Vercel Cron Jobs externally.
