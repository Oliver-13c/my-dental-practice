/**
 * Shared Message Threads Hook
 * 
 * Reusable hook for fetching message threads
 * Used by both staff dashboard and admin contacts page
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/shared/api/supabase-browser';
import type { MessageThread } from '../types/messaging.types';

export function useSharedMessageThreads(options?: { autoSubscribe?: boolean }) {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch message threads - this will be implemented as a SQL view or direct query
      // For now, using direct query to get threads grouped by patient
      const { data, error: fetchError } = await supabase
        .from('message_logs')
        .select(`
          patient_id,
          thread_key,
          body,
          created_at,
          is_read
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      // Group messages into threads
      const threadMap = new Map<string, MessageThread>();
      
      (data || []).forEach((msg: any) => {
        const threadId = `${msg.patient_id}::${msg.thread_key}`;
        if (!threadMap.has(threadId)) {
          threadMap.set(threadId, {
            patient_id: msg.patient_id,
            patient_name: 'Patient', // TODO: Join with patients table
            patient_phone: undefined,
            thread_key: msg.thread_key,
            last_message_preview: msg.body?.substring(0, 50) || '',
            last_message_at: msg.created_at,
            unread_count: msg.is_read ? 0 : 1,
            message_count: 1,
          });
        } else {
          const thread = threadMap.get(threadId)!;
          if (!msg.is_read) thread.unread_count += 1;
          thread.message_count += 1;
        }
      });

      setThreads(Array.from(threadMap.values()));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch threads';
      setError(message);
      console.error('[useSharedMessageThreads] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const refetch = useCallback(() => {
    void fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    void fetchThreads();
  }, [fetchThreads]);

  // Optional real-time subscription
  useEffect(() => {
    if (!options?.autoSubscribe) return;

    const subscription = supabase
      .channel('message_threads_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_logs',
        },
        () => {
          void refetch();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [supabase, refetch, options?.autoSubscribe]);

  return { threads, loading, error, refetch };
}
