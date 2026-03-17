/**
 * Shared Messaging Types
 * 
 * Common types used across messaging interfaces
 */

export interface MessageLogRecord {
  id: string;
  patient_id: string;
  staff_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  message_type: string;
  channels: string[];
  subject?: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  sms_status?: string;
  email_status?: string;
  thread_key: string;
  is_read: boolean;
  read_by?: string;
  read_at_timestamp?: string;
  sent_at?: string;
  delivered_at?: string;
  received_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface MessageThread {
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  thread_key: string;
  last_message_preview: string;
  last_message_at: string;
  unread_count: number;
  message_count: number;
}

export interface ContactPreferences {
  id: string;
  patient_id: string;
  email: string;
  phone: string;
  reminder_email: boolean;
  reminder_sms: boolean;
  appointment_email: boolean;
  appointment_sms: boolean;
  do_not_contact: boolean;
  created_at: string;
  updated_at: string;
}
