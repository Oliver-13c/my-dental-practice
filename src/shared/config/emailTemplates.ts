// Basic email templates for notifications with bilingual support
export const emailTemplates = {
  bookingConfirmation: {
    subject: {
      en: 'Your Appointment is Confirmed',
      es: 'Su cita está confirmada',
    },
    body: {
      en: 'Thank you for booking with us. Your appointment details are confirmed.',
      es: 'Gracias por reservar con nosotros. Los detalles de su cita están confirmados.',
    },
  },
  appointmentReminder: {
    subject: {
      en: 'Appointment Reminder',
      es: 'Recordatorio de cita',
    },
    body: {
      en: 'This is a reminder for your upcoming appointment.',
      es: 'Este es un recordatorio de su próxima cita.',
    },
  },
};
