import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';

/**
 * Records an audit log entry for a staff action.
 *
 * @param userId       - The ID of the user performing the action.
 * @param action       - A short description of the action (e.g. 'login', 'appointment.create').
 * @param resourceType - The type of resource affected (e.g. 'appointment', 'note').
 * @param resourceId   - The ID of the affected resource, if applicable.
 * @param metadata     - Optional additional context to store with the log entry.
 */
export async function logAudit(
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = createServerClient<Database>();
    const { error } = await (supabase as any).from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType ?? null,
      resource_id: resourceId ?? null,
      metadata: metadata ?? null,
    });
    if (error) {
      console.error('[audit] Failed to write audit log:', error.message);
    }
  } catch (err) {
    console.error('[audit] Unexpected error writing audit log:', err);
  }
}
