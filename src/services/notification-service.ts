/**
 * Unified Notification Service
 *
 * Sends email (Resend) + SMS (Twilio) notifications for appointment events.
 * Handles bilingual messages (EN/ES) based on patient language_preference.
 * Logs notifications to the Supabase notifications table.
 */
import { resend } from '@/shared/api/resend-client';
import { twilioClient, twilioFromPhone } from '@/shared/api/twilio-client';
import { appointmentConfirmationEmail } from '@/email/templates/appointment-confirmation';
import { appointmentReminderEmail } from '@/email/templates/appointment-reminder';
import { appointmentCancellationEmail } from '@/email/templates/appointment-cancellation';
import { appointmentRescheduleEmail } from '@/email/templates/appointment-reschedule';

const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL ?? 'noreply@dentalpractice.com';

// ── Types ──────────────────────────────────────────────────────

export interface NotificationAppointment {
  id: string;
  patient_id: string;
  start_time: string;
  end_time: string;
  status: string;
  patient_name: string | null;
  phone: string | null;
  language_preference: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
  provider?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  } | null;
  appointment_type?: {
    id: string;
    name: string;
    duration_minutes: number;
    color: string;
  } | null;
}

interface NotificationResult {
  emailSent: boolean;
  smsSent: boolean;
  errors: string[];
}

// ── Helpers ────────────────────────────────────────────────────

function formatDate(isoString: string, lang: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(isoString: string, lang: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(lang === 'es' ? 'es-US' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getPatientInfo(appt: NotificationAppointment) {
  return {
    fullName:
      appt.patient
        ? `${appt.patient.first_name} ${appt.patient.last_name}`
        : appt.patient_name ?? 'Patient',
    email: appt.patient?.email ?? undefined,
    contactNumber: appt.phone ?? appt.patient?.phone ?? undefined,
  };
}

function getPhone(appt: NotificationAppointment): string | null {
  return appt.phone ?? appt.patient?.phone ?? null;
}

// ── SMS Messages (bilingual) ───────────────────────────────────

function smsConfirmation(name: string, date: string, time: string, lang: string): string {
  return lang === 'es'
    ? `Hola ${name}, su cita dental está confirmada para el ${date} a las ${time}. Responda CANCEL para cancelar.`
    : `Hi ${name}, your dental appointment is confirmed for ${date} at ${time}. Reply CANCEL to cancel.`;
}

function smsReminder(name: string, date: string, time: string, lang: string): string {
  return lang === 'es'
    ? `Recordatorio: su cita dental es mañana ${date} a las ${time}. Responda CANCEL para cancelar.`
    : `Reminder: your dental appointment is tomorrow ${date} at ${time}. Reply CANCEL to cancel.`;
}

function smsCancellation(name: string, date: string, time: string, lang: string): string {
  return lang === 'es'
    ? `Hola ${name}, su cita dental del ${date} a las ${time} ha sido cancelada. Contáctenos para reprogramar.`
    : `Hi ${name}, your dental appointment on ${date} at ${time} has been cancelled. Contact us to reschedule.`;
}

function smsReschedule(name: string, newDate: string, newTime: string, lang: string): string {
  return lang === 'es'
    ? `Hola ${name}, su cita dental ha sido reprogramada para el ${newDate} a las ${newTime}.`
    : `Hi ${name}, your dental appointment has been rescheduled to ${newDate} at ${newTime}.`;
}

// ── Core send functions ────────────────────────────────────────

async function sendEmail(
  to: string,
  template: { subject: string; plainText: string; html: string },
): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: template.subject,
      text: template.plainText,
      html: template.html,
    });
    if (error) {
      console.error('[notification-service] Email send error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[notification-service] Email exception:', err);
    return false;
  }
}

async function sendSms(to: string, body: string): Promise<boolean> {
  if (!twilioClient) {
    console.warn('[notification-service] Twilio not configured — skipping SMS');
    return false;
  }
  try {
    await twilioClient.messages.create({
      body,
      from: twilioFromPhone,
      to,
    });
    return true;
  } catch (err) {
    console.error('[notification-service] SMS exception:', err);
    return false;
  }
}

// ── Public API ─────────────────────────────────────────────────

export async function sendAppointmentConfirmation(
  appt: NotificationAppointment,
): Promise<NotificationResult> {
  const lang = appt.language_preference ?? 'en';
  const patientInfo = getPatientInfo(appt);
  const date = formatDate(appt.start_time, lang);
  const time = formatTime(appt.start_time, lang);
  const errors: string[] = [];

  // Email
  let emailSent = false;
  if (patientInfo.email) {
    const template = appointmentConfirmationEmail(patientInfo, date, time, lang);
    emailSent = await sendEmail(patientInfo.email, template);
    if (!emailSent) errors.push('Email send failed');
  } else {
    errors.push('No patient email on file');
  }

  // SMS
  let smsSent = false;
  const phone = getPhone(appt);
  if (phone) {
    const msg = smsConfirmation(patientInfo.fullName, date, time, lang);
    smsSent = await sendSms(phone, msg);
    if (!smsSent) errors.push('SMS send failed');
  } else {
    errors.push('No patient phone on file');
  }

  console.log(
    `[notification-service] Confirmation for appointment ${appt.id}: email=${emailSent}, sms=${smsSent}`,
  );
  return { emailSent, smsSent, errors };
}

export async function sendAppointmentReminder(
  appt: NotificationAppointment,
): Promise<NotificationResult> {
  const lang = appt.language_preference ?? 'en';
  const patientInfo = getPatientInfo(appt);
  const date = formatDate(appt.start_time, lang);
  const time = formatTime(appt.start_time, lang);
  const errors: string[] = [];

  let emailSent = false;
  if (patientInfo.email) {
    const template = appointmentReminderEmail(patientInfo, date, time, lang);
    emailSent = await sendEmail(patientInfo.email, template);
    if (!emailSent) errors.push('Email send failed');
  }

  let smsSent = false;
  const phone = getPhone(appt);
  if (phone) {
    const msg = smsReminder(patientInfo.fullName, date, time, lang);
    smsSent = await sendSms(phone, msg);
    if (!smsSent) errors.push('SMS send failed');
  }

  console.log(
    `[notification-service] Reminder for appointment ${appt.id}: email=${emailSent}, sms=${smsSent}`,
  );
  return { emailSent, smsSent, errors };
}

export async function sendAppointmentCancellation(
  appt: NotificationAppointment,
): Promise<NotificationResult> {
  const lang = appt.language_preference ?? 'en';
  const patientInfo = getPatientInfo(appt);
  const date = formatDate(appt.start_time, lang);
  const time = formatTime(appt.start_time, lang);
  const errors: string[] = [];

  let emailSent = false;
  if (patientInfo.email) {
    const template = appointmentCancellationEmail(patientInfo, date, time, lang);
    emailSent = await sendEmail(patientInfo.email, template);
    if (!emailSent) errors.push('Email send failed');
  }

  let smsSent = false;
  const phone = getPhone(appt);
  if (phone) {
    const msg = smsCancellation(patientInfo.fullName, date, time, lang);
    smsSent = await sendSms(phone, msg);
    if (!smsSent) errors.push('SMS send failed');
  }

  console.log(
    `[notification-service] Cancellation for appointment ${appt.id}: email=${emailSent}, sms=${smsSent}`,
  );
  return { emailSent, smsSent, errors };
}

export async function sendAppointmentReschedule(
  appt: NotificationAppointment,
): Promise<NotificationResult> {
  const lang = appt.language_preference ?? 'en';
  const patientInfo = getPatientInfo(appt);
  const newDate = formatDate(appt.start_time, lang);
  const newTime = formatTime(appt.start_time, lang);
  const errors: string[] = [];

  let emailSent = false;
  if (patientInfo.email) {
    const template = appointmentRescheduleEmail(patientInfo, newDate, newTime, lang);
    emailSent = await sendEmail(patientInfo.email, template);
    if (!emailSent) errors.push('Email send failed');
  }

  let smsSent = false;
  const phone = getPhone(appt);
  if (phone) {
    const msg = smsReschedule(patientInfo.fullName, newDate, newTime, lang);
    smsSent = await sendSms(phone, msg);
    if (!smsSent) errors.push('SMS send failed');
  }

  console.log(
    `[notification-service] Reschedule for appointment ${appt.id}: email=${emailSent}, sms=${smsSent}`,
  );
  return { emailSent, smsSent, errors };
}
