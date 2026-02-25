import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { logAudit } from '@/shared/lib/audit';

const supabase = createServerClient<Database>() as any;

export async function cancelBooking(appointmentId: string, userId?: string) {
  const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
  if (error) {
    console.error('Error cancelling appointment:', error.message);
    throw new Error('Failed to cancel appointment');
  }
  if (userId) {
    await logAudit(userId, 'appointment.delete', 'appointment', appointmentId);
  }
}

// Placeholder for reschedule booking (could be implemented as update with new date/time)
export async function rescheduleBooking(appointmentId: string, newStartTime: string, newEndTime: string, userId?: string) {
  const { error } = await supabase
    .from('appointments')
    .update({ start_time: newStartTime, end_time: newEndTime })
    .eq('id', appointmentId);
  if (error) {
    console.error('Error rescheduling appointment:', error.message);
    throw new Error('Failed to reschedule appointment');
  }
  if (userId) {
    await logAudit(userId, 'appointment.update', 'appointment', appointmentId, {
      new_start_time: newStartTime,
      new_end_time: newEndTime,
    });
  }
}
