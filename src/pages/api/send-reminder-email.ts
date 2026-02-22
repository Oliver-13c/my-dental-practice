import type { NextApiRequest, NextApiResponse } from 'next';
import { resend } from '@/shared/api/resend-client';
import { appointmentReminderEmail } from '@/email/templates/appointment-reminder';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, patientInfo, appointmentDate, appointmentTime, lang = 'en' } = req.body;
    if (!email || !patientInfo || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { subject, plainText, html } = appointmentReminderEmail(patientInfo, appointmentDate, appointmentTime, lang);

    await resend.emails.send({
      from: 'no-reply@dentalpractice.com',
      to: email,
      subject,
      text: plainText,
      html,
    });

    return res.status(200).json({ message: 'Reminder email sent' });
  } catch (error) {
    console.error('Send reminder email error:', error);
    return res.status(500).json({ error: 'Failed to send reminder email' });
  }
}
