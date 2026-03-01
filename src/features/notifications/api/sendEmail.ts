import { emailTemplates } from '@/shared/config/emailTemplates';
import { resend } from '@/shared/api/resend-client';

// Function to send email notification
export async function sendBookingConfirmationEmail(to: string, lang: 'en' | 'es') {
  const subject = emailTemplates.bookingConfirmation.subject[lang] || emailTemplates.bookingConfirmation.subject['es'];
  const body = emailTemplates.bookingConfirmation.body[lang] || emailTemplates.bookingConfirmation.body['es'];

  await resend.emails.send({
    from: 'noreply@dentalpractice.com',
    to,
    subject,
    html: body,
  });
}
