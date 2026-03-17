/**
 * Message Thread Search Hook
 * 
 * Search and filter message threads
 */

'use client';

import { useMemo } from 'react';
import type { PatientThread } from './use-messages';

export function useThreadSearch(
  threads: PatientThread[],
  searchQuery: string
): PatientThread[] {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      return threads;
    }

    const query = searchQuery.toLowerCase();
    return threads.filter(
      (thread) =>
        thread.patient_name.toLowerCase().includes(query) ||
        thread.last_message_preview.toLowerCase().includes(query) ||
        (thread.patient_phone?.includes(query) || false)
    );
  }, [threads, searchQuery]);
}
