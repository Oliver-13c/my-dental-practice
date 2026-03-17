/**
 * Messages Tab Component
 * 
 * Displays message threads for staff dashboard
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMessageThreads } from '../hooks/use-messages';
import { MessageThreadViewer } from './message-thread-viewer';

export function MessagesTab() {
  const t = useTranslations('staff.messages');
  const { threads, loading, error, refetch } = useMessageThreads();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">{t('error')}: {error}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Thread List */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t('threads')}</h3>
          {threads.length > 0 && (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {threads.filter((t) => t.unread_count > 0).length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-4 flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          </div>
        ) : threads.length === 0 ? (
          <div className="mt-4 py-8 text-center text-sm text-slate-400">
            {t('noThreads')}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {threads.map((thread) => (
              <button
                key={`${thread.patient_id}::${thread.thread_key}`}
                onClick={() => {
                  setSelectedPatientId(thread.patient_id);
                  setSelectedPatientName(thread.patient_name);
                }}
                className={`w-full rounded-xl p-3 text-left transition ${
                  selectedPatientId === thread.patient_id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {thread.patient_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate line-clamp-2">
                      {thread.last_message_preview}
                    </p>
                  </div>
                  {thread.unread_count > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-fit items-center justify-center rounded-full bg-red-500 px-2 text-xs font-semibold text-white">
                      {thread.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thread Viewer */}
      <div>
        {selectedPatientId ? (
          <MessageThreadViewer
            patientId={selectedPatientId}
            patientName={selectedPatientName}
            onMarkAsRead={() => refetch()}
          />
        ) : (
          <div className="flex h-96 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
            <p className="text-center text-sm text-slate-400">
              {t('selectThread')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
