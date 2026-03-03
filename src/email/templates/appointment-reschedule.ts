interface PatientInfo {
  fullName: string;
  dateOfBirth?: string;
  contactNumber?: string;
  email?: string;
}

export function appointmentRescheduleEmail(
  patientInfo: PatientInfo,
  newDate: string,
  newTime: string,
  lang: string = 'en',
) {
  const isSpanish = lang === 'es';

  const subject = isSpanish
    ? 'Cita dental reprogramada'
    : 'Dental Appointment Rescheduled';

  const plainText = isSpanish
    ? `Hola ${patientInfo.fullName},\n\nSu cita dental ha sido reprogramada para el ${newDate} a las ${newTime}.\n\nSi tiene alguna pregunta, por favor contáctenos.\n\nGracias.`
    : `Hello ${patientInfo.fullName},\n\nYour dental appointment has been rescheduled to ${newDate} at ${newTime}.\n\nIf you have any questions, please contact us.\n\nThank you.`;

  const html = `
    <html lang="${lang}">
      <body style="font-family: Arial, sans-serif;">
        <h2>${subject}</h2>
        <p>${isSpanish ? 'Hola' : 'Hello'} ${patientInfo.fullName},</p>
        <p>
          ${isSpanish ? 'Su cita dental ha sido reprogramada para el' : 'Your dental appointment has been rescheduled to'} <strong>${newDate}</strong> ${isSpanish ? 'a las' : 'at'} <strong>${newTime}</strong>.
        </p>
        <p>${isSpanish ? 'Si tiene alguna pregunta, por favor contáctenos.' : 'If you have any questions, please contact us.'}</p>
        <p>${isSpanish ? 'Gracias.' : 'Thank you.'}</p>
      </body>
    </html>
  `;

  return { subject, plainText, html };
}
