import { createServerClient } from '@/shared/api/supabase-server';
import { Database } from '@/shared/api/supabase-types';

const supabase = createServerClient<Database>();

interface CreateBookingParams {
  startTime: string;
  endTime: string;
  patientName: string;
}

export async function createBooking({ startTime, endTime, patientName }: CreateBookingParams) {
  // Check if user is authenticated and allowed to book (patients can only book own)
  // This can be expanded later for role-based permissions

  // Check availability again to avoid race conditions
  const { data: existing, error: existError } = await supabase
    .from('appointments')
    .select('id')
    .or(
      `and(start_time.gte.${startTime},start_time.lt.${endTime}),and(end_time.gt.${startTime},end_time.lte.${endTime}),and(start_time.lte.${startTime},end_time.gte.${endTime})`
    )
    .limit(1)
    .single();

  if (existError) {
    console.error('Error checking existing appointments:', existError.message);
    throw new Error('Failed to check appointment availability');
  }

  if (existing) {
    throw new Error('Selected slot is no longer available');
  }

  const { error } = await supabase.from('appointments').insert({
    start_time: startTime,
    end_time: endTime,
    patient_name: patientName,
  });

  if (error) {
    console.error('Error creating booking:', error.message);
    throw new Error('Failed to create booking');
  }
}
