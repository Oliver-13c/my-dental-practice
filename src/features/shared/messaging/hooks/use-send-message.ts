/**
 * Shared Message Composer Hook
 * 
 * Reusable hook for sending messages across admin and staff interfaces
 */

import { useState } from 'react';

export interface SendMessagePayload {
  patient_id: string;
  thread_key: string;
  body: string;
  channels: string[];
  message_type?: string;
}

export interface SendMessageResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

export function useSendMessage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (payload: SendMessagePayload): Promise<SendMessageResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      return { success: true, message_id: data.message_id };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  return { send, loading, error };
}
