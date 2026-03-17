/**
 * Messages Tab Component
 * 
 * Displays message threads for staff dashboard
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMessageThreads } from '../hooks/use-messages';
import { useThreadSearch } from '../hooks/use-thread-search';
import { MessageThreadViewer } from './message-thread-viewer';
import { MessageCompositionForm } from './message-composition-form';

export function MessagesTab() {
  const t = useTranslations('staff.messages');
  const { threads, loading, error, refetch } = useMessageThreads();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');
  const [selectedPatientPhone, setSelectedPatientPhone] = useState<string | null>(null);
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredThreads = useThreadSearch(threads, searchQuery);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm text-rose-700">{t('error')}: {error}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Thread List Sidebar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{t('threads')}</h3>
          {threads.length > 0 && (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {threads.filter((t) => t.unread_count > 0).length}
            </span>
          )}
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder={t('search.placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4"
        />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            {searchQuery ? t('search.noResults') : t('noThreads')}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredThreads.map((thread) => (
              <button
                key={`${thread.patient_id}::${thread.thread_key}`}
                onClick={() => {
                  setSelectedPatientId(thread.patient_id);
                  setSelectedPatientName(thread.patient_name);
                  setSelectedPatientPhone(thread.patient_phone);
                  setSelectedThreadKey(thread.thread_key);
                }}
                className={`w-full rounded-xl p-3 text-left transition ${
                  selectedPatientId === thread.patient_id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {thread.patient_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate line-clamp-2">
                      {thread.last_message_preview}
                    </p>
                  </div>
                  {thread.unread_count > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-fit items-center justify-center rounded-full bg-red-500 px-2 text-xs font-semibold text-white shrink-0">
                      {thread.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Viewer + Composer */}
      <div className="space-y-6">
        {selectedPatientId ? (
          <>
            <MessageThreadViewer
              patientId={selectedPatientId}
              patientName={selectedPatientName}
              onMarkAsRead={() => refetch()}
            />
            <MessageCompositionForm
              patientId={selectedPatientId}
              patientName={selectedPatientName}
              patientPhone={selectedPatientPhone}
              threadKey={selectedThreadKey}
              onMessageSent={() => refetch()}
            />
          </>
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
