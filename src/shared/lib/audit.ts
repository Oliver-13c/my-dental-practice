import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';

/**
 * Records an audit log entry for a staff action.
 *
 * Target table: public.audit_logs (current production schema).
 *
 * @param userId       - The ID of the user performing the action (admin_id).
 * @param action       - A short description of the action (e.g. 'login', 'appointment.create').
 * @param resourceType - The type of resource affected (target_type: 'appointment', 'user', etc).
 * @param resourceId   - The ID of the affected resource (target_id).
 * @param metadata     - Optional additional context to store with the log (changes field).
 */
export async function logAudit(
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = createServerClient<Database>() as any;

    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType ?? 'system',
      resource_id: resourceId ?? null,
      metadata: metadata ?? null,
    });

    if (error) {
      console.error('[audit] Failed to write audit log:', {
        audit_logs: error.message,
      });
    }
  } catch (err) {
    console.error('[audit] Unexpected error writing audit log:', err);
  }
}
