import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import type { AppointmentWithDetails } from '../model/appointment.types';

/**
 * Get appointments with optional filters.
 * Joins patients, providers (staff_profiles), and appointment_types.
 */
export async function getAppointments(filters?: {
  date?: string;        // YYYY-MM-DD — filter to a single day
  startDate?: string;   // YYYY-MM-DD — range start (inclusive)
  endDate?: string;     // YYYY-MM-DD — range end (inclusive)
  provider_id?: string;
  status?: string;
  patient_id?: string;
}): Promise<AppointmentWithDetails[]> {
  const supabase = createServerClient<Database>() as any;

  let query = supabase
    .from('appointments')
    .select(`
      *,
      patient:patients!patient_id (id, first_name, last_name, email, phone),
      provider:staff_profiles!provider_id (id, first_name, last_name, role),
      appointment_type:appointment_types!appointment_type_id (id, name, duration_minutes, color)
    `)
    .order('start_time', { ascending: true });

  if (filters?.date) {
    const dayStart = `${filters.date}T00:00:00.000Z`;
    const dayEnd = `${filters.date}T23:59:59.999Z`;
    query = query.gte('start_time', dayStart).lte('start_time', dayEnd);
  }

  if (filters?.startDate) {
    query = query.gte('start_time', `${filters.startDate}T00:00:00.000Z`);
  }

  if (filters?.endDate) {
    query = query.lte('start_time', `${filters.endDate}T23:59:59.999Z`);
  }

  if (filters?.provider_id) {
    query = query.eq('provider_id', filters.provider_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.patient_id) {
    query = query.eq('patient_id', filters.patient_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching appointments:', error.message);
    throw new Error('Error fetching appointments');
  }

  return data ?? [];
}

/**
 * Get a single appointment by ID with full details.
 */
export async function getAppointmentById(id: string): Promise<AppointmentWithDetails | null> {
  const supabase = createServerClient<Database>() as any;

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patients!patient_id (id, first_name, last_name, email, phone),
      provider:staff_profiles!provider_id (id, first_name, last_name, role),
      appointment_type:appointment_types!appointment_type_id (id, name, duration_minutes, color)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching appointment:', error.message);
    return null;
  }

  return data;
}

// ── Legacy exports for backward compatibility ──────────────────
export async function getAllAppointments() {
  return getAppointments();
}

export async function getPatientAppointments(patientId: string) {
  return getAppointments({ patient_id: patientId });
}
