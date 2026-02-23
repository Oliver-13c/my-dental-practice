import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';

const supabase = createServerClient<Database>() as any;

// Get all appointments for staff
export async function getAllAppointments() {
  const { data, error } = await supabase.from('appointments').select('*');
  if (error) {
    console.error('Error fetching appointments:', error.message);
    throw new Error('Error fetching appointments');
  }
  return data;
}

// Get appointments for the current patient
export async function getPatientAppointments(patientName: string) {
  const { data, error } = await supabase.from('appointments').select('*').eq('patient_name', patientName);
  if (error) {
    console.error('Error fetching patient appointments:', error.message);
    throw new Error('Error fetching patient appointments');
  }
  return data;
}
