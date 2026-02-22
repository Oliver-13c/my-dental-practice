import { PatientInfo } from '@/features/appointment-booking/ui/AppointmentBookingWizard';

export function appointmentReminderEmail(patientInfo: PatientInfo, appointmentDate: string, appointmentTime: string, lang: string = 'en') {
  const isSpanish = lang === 'es';

  const subject = isSpanish ? 'Recordatorio de cita dental' : 'Dental Appointment Reminder';

  const plainText = isSpanish
    ? `Hola ${patientInfo.fullName},\n\nEste es un recordatorio de que su cita dental es el ${appointmentDate} a las ${appointmentTime}.\n\nEsperamos verle pronto.`
    : `Hello ${patientInfo.fullName},\n\nThis is a reminder that your dental appointment is on ${appointmentDate} at ${appointmentTime}.\n\nWe look forward to seeing you.`;

  const html = `
    <html lang="${lang}">
      <body style="font-family: Arial, sans-serif;">
        <h2>${subject}</h2>
        <p>${isSpanish ? 'Hola' : 'Hello'} ${patientInfo.fullName},</p>
        <p>
          ${isSpanish ? 'Este es un recordatorio de que su cita dental es el' : 'This is a reminder that your dental appointment is on'} <strong>${appointmentDate}</strong> ${isSpanish ? 'a las' : 'at'} <strong>${appointmentTime}</strong>.
        </p>
        <p>${isSpanish ? 'Esperamos verle pronto.' : 'We look forward to seeing you.'}</p>
      </body>
    </html>
  `;

  return { subject, plainText, html };
}
