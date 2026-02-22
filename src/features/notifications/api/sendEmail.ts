import { emailTemplates } from '@/shared/config/emailTemplates';
import Resend from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

// Function to send email notification
export async function sendBookingConfirmationEmail(to: string, lang: string) {
  const subject = emailTemplates.bookingConfirmation.subject[lang] || emailTemplates.bookingConfirmation.subject['es'];
  const body = emailTemplates.bookingConfirmation.body[lang] || emailTemplates.bookingConfirmation.body['es'];

  await resend.emails.send({
    from: 'noreply@dentalpractice.com',
    to,
    subject,
    html: body,
  });
}
