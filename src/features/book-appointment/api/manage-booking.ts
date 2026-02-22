import { createServerClient } from '@/shared/api/supabase-server';
import { Database } from '@/shared/api/supabase-types';

const supabase = createServerClient<Database>();

export async function cancelBooking(appointmentId: string) {
  const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
  if (error) {
    console.error('Error cancelling appointment:', error.message);
    throw new Error('Failed to cancel appointment');
  }
}

// Placeholder for reschedule booking (could be implemented as update with new date/time)
export async function rescheduleBooking(appointmentId: string, newStartTime: string, newEndTime: string) {
  // Implement update logic with availability check
}
