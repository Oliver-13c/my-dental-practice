/**
 * Messages Data Hooks
 * 
 * Custom hooks for fetching and managing message data
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/shared/api/supabase-browser';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface MessageLogRecord {
  id: string;
  patient_id: string | null;
  staff_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  message_type: string;
  channels: string[];
  subject: string | null;
  body: string;
  appointment_id: string | null;
  status: string;
  email_status: string | null;
  sms_status: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  received_at: string | null;
  read_at: string | null;
  direction: string; // 'inbound' or 'outbound'
  thread_key: string | null;
  is_read: boolean;
  read_by: string | null;
  read_at_timestamp: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientThread {
  patient_id: string;
  patient_name: string;
  patient_phone: string | null;
  thread_key: string | null;
  unread_count: number;
  last_message_at: string;
  last_message_preview: string;
  last_message_direction: 'inbound' | 'outbound';
}

/**
 * Hook: Fetch all unread message threads for the current staff
 */
export function useMessageThreads() {
  const supabase = createClient();
  const [threads, setThreads] = useState<PatientThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all inbound messages grouped by patient and thread
      const { data: messages, error: fetchError } = await supabase
        .from('message_logs')
        .select(
          `
          id,
          patient_id,
          direction,
          thread_key,
          is_read,
          body,
          created_at,
          received_at,
          patients(id, first_name, last_name, phone)
          `
        )
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Group by patient and create thread summaries
      const threadMap = new Map<string, PatientThread>();

      messages?.forEach((msg: any) => {
        if (!msg.patient_id) return;

        const key = `${msg.patient_id}::${msg.thread_key || 'default'}`;
        const existing = threadMap.get(key);

        const thread: PatientThread = {
          patient_id: msg.patient_id,
          patient_name: msg.patients
            ? `${msg.patients.first_name} ${msg.patients.last_name}`
            : 'Unknown Patient',
          patient_phone: msg.patients?.phone || null,
          thread_key: msg.thread_key,
          unread_count: existing
            ? existing.unread_count + (msg.is_read ? 0 : 1)
            : msg.is_read
              ? 0
              : 1,
          last_message_at: msg.received_at || msg.created_at,
          last_message_preview: msg.body.substring(0, 80),
          last_message_direction: msg.direction,
        };

        threadMap.set(key, thread);
      });

      const threadList = Array.from(threadMap.values()).sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime()
      );

      setThreads(threadList);
    } catch (err) {
      console.error('[useMessageThreads] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load threads');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return { threads, loading, error, refetch: fetchThreads };
}

/**
 * Hook: Subscribe to real-time message updates for a patient
 */
export function useRealtimeMessages(patientId: string | null) {
  const supabase = createClient();
  const [messages, setMessages] = useState<MessageLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    (async () => {
      try {
        const { data, error } = await supabase
          .from('message_logs')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: true });

        if (!error) {
          setMessages(data || []);
        }
        setLoading(false);
      } catch (err) {
        console.error('[useRealtimeMessages] Initial fetch error:', err);
        setLoading(false);
      }
    })();

    // Subscribe to changes
    const sub = supabase
      .channel(`patient_messages:${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_logs',
          filter: `patient_id=eq.${patientId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? payload.new : m))
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .on(
        'broadcast',
        { event: 'inbound_sms' },
        (payload: any) => {
          console.log('[useRealtimeMessages] Broadcast event:', payload);
          // Re-fetch to get latest
          supabase
            .from('message_logs')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: true })
            .then(({ data }) => {
              if (data) setMessages(data);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [patientId, supabase]);

  return { messages, loading };
}

/**
 * Hook: Mark a message as read
 */
export function useMarkAsRead() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark as read');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useMarkAsRead] Error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { markAsRead, loading, error };
}
