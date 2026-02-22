import { createServerClient } from '@/shared/api/supabase-server';
import { Database } from '@/shared/api/supabase-types';

const supabase = createServerClient<Database>();

/**
 * Checks appointment availability for a given datetime and duration.
 * Returns true if no conflicting appointment exists.
 */
export async function checkAppointmentAvailability(
  dateTime: string,
  durationMinutes: number
): Promise<boolean> {
  const endTime = new Date(new Date(dateTime).getTime() + durationMinutes * 60000).toISOString();

  const { data, error } = await supabase
    .from('appointments')
    .select('id')
    .or(
      `and(start_time.gte.${dateTime},start_time.lt.${endTime}),and(end_time.gt.${dateTime},end_time.lte.${endTime}),and(start_time.lte.${dateTime},end_time.gte.${endTime})`
    )
    .limit(1)
    .single();

  if (error) {
    console.error('Error checking availability:', error.message);
    throw new Error('Failed to check appointment availability');
  }

  return !data; // Available if no conflicting appointments
}
