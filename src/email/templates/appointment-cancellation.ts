interface PatientInfo {
  fullName: string;
  dateOfBirth?: string;
  contactNumber?: string;
  email?: string;
}

export function appointmentCancellationEmail(
  patientInfo: PatientInfo,
  appointmentDate: string,
  appointmentTime: string,
  lang: string = 'en',
) {
  const isSpanish = lang === 'es';

  const subject = isSpanish
    ? 'Cita dental cancelada'
    : 'Dental Appointment Cancelled';

  const plainText = isSpanish
    ? `Hola ${patientInfo.fullName},\n\nSu cita dental del ${appointmentDate} a las ${appointmentTime} ha sido cancelada.\n\nSi desea reprogramar, por favor contáctenos.\n\nGracias.`
    : `Hello ${patientInfo.fullName},\n\nYour dental appointment on ${appointmentDate} at ${appointmentTime} has been cancelled.\n\nIf you would like to reschedule, please contact us.\n\nThank you.`;

  const html = `
    <html lang="${lang}">
      <body style="font-family: Arial, sans-serif;">
        <h2>${subject}</h2>
        <p>${isSpanish ? 'Hola' : 'Hello'} ${patientInfo.fullName},</p>
        <p>
          ${isSpanish ? 'Su cita dental del' : 'Your dental appointment on'} <strong>${appointmentDate}</strong> ${isSpanish ? 'a las' : 'at'} <strong>${appointmentTime}</strong> ${isSpanish ? 'ha sido cancelada' : 'has been cancelled'}.
        </p>
        <p>${isSpanish ? 'Si desea reprogramar, por favor contáctenos.' : 'If you would like to reschedule, please contact us.'}</p>
        <p>${isSpanish ? 'Gracias.' : 'Thank you.'}</p>
      </body>
    </html>
  `;

  return { subject, plainText, html };
}
