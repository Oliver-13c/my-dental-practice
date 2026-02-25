import { supabase } from '@/shared/api/supabase-client';
import { resend } from '@/shared/api/resend-client';
import { appointmentReminderEmail } from '@/email/templates/appointment-reminder';
import { logAudit } from '@/shared/lib/audit';

export async function checkAndSendReminders() {
  try {
    // Get appointments scheduled 24 hours from now (allowing a margin of +/- 15 minutes)
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowStart = new Date(twentyFourHoursLater.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(twentyFourHoursLater.getTime() + 15 * 60 * 1000);

    // Query for appointments in that window with status pending
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, patient_id')
      .gte('appointment_date', windowStart.toISOString().split('T')[0])
      .lte('appointment_date', windowEnd.toISOString().split('T')[0])
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching appointments for reminders:', error);
      return;
    }

    if (!appointments || appointments.length === 0) {
      console.log('No appointments requiring reminders at this time.');
      return;
    }

    for (const appointment of appointments) {
      // Fetch patient email and info - replacing with mock for demo purposes
      // TODO: replace with actual patient data fetch
      const patientInfo = {
        fullName: 'Patient Name',
        dateOfBirth: '',
        contactNumber: '',
        email: 'patient@example.com',
      };
      const lang = 'en';

      const { subject, plainText, html } = appointmentReminderEmail(
        patientInfo,
        appointment.appointment_date,
        appointment.appointment_time,
        lang
      );

      try {
        await resend.emails.send({
          from: 'no-reply@dentalpractice.com',
          to: patientInfo.email,
          subject,
          text: plainText,
          html,
        });
        console.log(`Sent reminder email to ${patientInfo.email} for appointment ${appointment.id}`);
        await logAudit(
          appointment.patient_id,
          'reminder.sent',
          'appointment',
          appointment.id,
          { email: patientInfo.email },
        );
      } catch (emailError) {
        console.error(`Failed to send reminder email for appointment ${appointment.id}:`, emailError);
      }
    }
  } catch (err) {
    console.error('Error in checkAndSendReminders:', err);
  }
}
