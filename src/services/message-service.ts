/**
 * Message Service
 * 
 * Handles message threading, patient lookup, and thread key generation
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const THREAD_KEY_SEPARATOR = '::'; // Format: patient_id::contact_hash

/**
 * Generate a deterministic thread key for patient-staff conversations
 * Format: {patient_id}::{contact_identifier_hash}
 * This allows grouping all messages (inbound/outbound) for a given patient into one thread
 */
export async function generateThreadKey(
  supabase: SupabaseClient<any>,
  patientId: string,
  direction: 'inbound' | 'outbound',
  contactInfo: string
): Promise<string> {
  // If outbound message already has a thread_key from a prior inbound, use it
  if (direction === 'inbound') {
    // Try to find existing thread for this patient
    const { data: existingThread } = await supabase
      .from('message_logs')
      .select('thread_key')
      .eq('patient_id', patientId)
      .eq('direction', 'inbound')
      .limit(1)
      .single();

    if (existingThread?.thread_key) {
      return existingThread.thread_key;
    }
  }

  // Generate new thread key: patient_id::hash(contact_info)
  const hash = hashContactInfo(contactInfo);
  return `${patientId}${THREAD_KEY_SEPARATOR}${hash}`;
}

/**
 * Simple hash function for contact info (phone/email)
 * Creates a deterministic identifier for grouping
 */
function hashContactInfo(contact: string): string {
  let hash = 0;
  const normalized = contact.replace(/\D/g, ''); // Remove non-digits

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36).substring(0, 12);
}

/**
 * Find a patient by phone number
 * Searches contact_preferences and patients tables
 */
export async function findPatientByPhone(
  supabase: SupabaseClient<any>,
  phoneNumber: string
): Promise<string | null> {
  // Normalize phone: remove non-digits
  const normalized = phoneNumber.replace(/\D/g, '');
  if (normalized.length < 10) {
    console.warn('[message-service] Phone number too short', { phoneNumber });
    return null;
  }

  // Step 1: Try exact match in contact_preferences
  const { data: preference } = await supabase
    .from('contact_preferences')
    .select('patient_id')
    .eq('phone', phoneNumber)
    .limit(1)
    .single();

  if (preference?.patient_id) {
    return preference.patient_id;
  }

  // Step 2: Try phone match in patients table (if phone field exists)
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .or(`phone.eq.${phoneNumber},phone.ilike.%${normalized}%`)
    .limit(1)
    .single();

  if (patient?.id) {
    return patient.id;
  }

  return null;
}

/**
 * Find a patient by email address
 */
export async function findPatientByEmail(
  supabase: SupabaseClient<any>,
  email: string
): Promise<string | null> {
  // Try exact match in contact_preferences
  const { data: preference } = await supabase
    .from('contact_preferences')
    .select('patient_id')
    .eq('email', email)
    .limit(1)
    .single();

  if (preference?.patient_id) {
    return preference.patient_id;
  }

  // Try patients table
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('email', email)
    .limit(1)
    .single();

  if (patient?.id) {
    return patient.id;
  }

  return null;
}

/**
 * Mark a message as read by a staff member
 */
export async function markMessageAsRead(
  supabase: SupabaseClient<any>,
  messageId: string,
  staffId: string
): Promise<boolean> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('message_logs')
    .update({
      is_read: true,
      read_by: staffId,
      read_at_timestamp: now,
      updated_at: now,
    })
    .eq('id', messageId);

  if (error) {
    console.error('[message-service] Failed to mark message as read', {
      messageId,
      staffId,
      error: error.message,
    });
    return false;
  }

  return true;
}

/**
 * Get unread message count for a patient
 */
export async function getUnreadMessageCount(
  supabase: SupabaseClient<any>,
  patientId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('message_logs')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientId)
    .eq('direction', 'inbound')
    .eq('is_read', false);

  if (error) {
    console.error('[message-service] Failed to get unread count', {
      patientId,
      error: error.message,
    });
    return 0;
  }

  return count || 0;
}

/**
 * Get all messages in a thread
 */
export async function getThreadMessages(
  supabase: SupabaseClient<any>,
  threadKey: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from('message_logs')
    .select(
      `
      id,
      patient_id,
      staff_id,
      recipient_email,
      recipient_phone,
      message_type,
      channels,
      subject,
      body,
      direction,
      status,
      sms_status,
      email_status,
      is_read,
      read_by,
      read_at_timestamp,
      sent_at,
      received_at,
      created_at,
      updated_at
      `
    )
    .eq('thread_key', threadKey)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[message-service] Failed to get thread messages', {
      threadKey,
      error: error.message,
    });
    return [];
  }

  return data || [];
}
