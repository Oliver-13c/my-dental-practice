interface PatientInfo {
  fullName: string;
  dateOfBirth?: string;
  contactNumber?: string;
  email?: string;
}

export function appointmentConfirmationEmail(patientInfo: PatientInfo, appointmentDate: string, appointmentTime: string, lang: string = 'en') {
  const isSpanish = lang === 'es';

  const subject = isSpanish ? 'Confirmación de cita dental' : 'Dental Appointment Confirmation';

  const plainText = isSpanish
    ? `Hola ${patientInfo.fullName},\n\nSu cita dental está confirmada para el ${appointmentDate} a las ${appointmentTime}.\n\nGracias por elegirnos.`
    : `Hello ${patientInfo.fullName},\n\nYour dental appointment is confirmed for ${appointmentDate} at ${appointmentTime}.\n\nThank you for choosing us.`;

  const html = `
    <html lang="${lang}">
      <body style="font-family: Arial, sans-serif;">
        <h2>${subject}</h2>
        <p>${isSpanish ? 'Hola' : 'Hello'} ${patientInfo.fullName},</p>
        <p>
          ${isSpanish ? 'Su cita dental está confirmada para el' : 'Your dental appointment is confirmed for'} <strong>${appointmentDate}</strong> ${isSpanish ? 'a las' : 'at'} <strong>${appointmentTime}</strong>.
        </p>
        <p>${isSpanish ? 'Gracias por elegirnos.' : 'Thank you for choosing us.'}</p>
      </body>
    </html>
  `;

  return { subject, plainText, html };
}
