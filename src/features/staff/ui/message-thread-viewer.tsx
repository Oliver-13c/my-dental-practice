/**
 * Message Thread Viewer Component
 * 
 * Displays a conversation thread between staff and patient
 */

'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRealtimeMessages, useMarkAsRead } from '../hooks/use-messages';
import type { MessageLogRecord } from '../hooks/use-messages';

interface MessageThreadViewerProps {
  patientId: string;
  patientName: string;
  onMarkAsRead?: (messageId: string) => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function MessageThreadViewer({
  patientId,
  patientName,
  onMarkAsRead,
}: MessageThreadViewerProps) {
  const t = useTranslations('staff.messages');
  const { messages, loading } = useRealtimeMessages(patientId);
  const { markAsRead } = useMarkAsRead();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-mark visible inbound messages as read
  useEffect(() => {
    const markVisibleAsRead = async () => {
      for (const msg of messages) {
        if (msg.direction === 'inbound' && !msg.is_read) {
          const success = await markAsRead(msg.id);
          if (success && onMarkAsRead) {
            onMarkAsRead(msg.id);
          }
        }
      }
    };

    markVisibleAsRead();
  }, [messages, markAsRead, onMarkAsRead]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <span className="text-sm text-slate-500">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <p className="text-center text-sm text-slate-500">
          {t('noMessages')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-96 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{patientName}</h3>
        <p className="text-xs text-slate-500">
          {messages.length} {messages.length === 1 ? t('message') : t('messages')}
        </p>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, idx) => {
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const showDateDivider =
            !prevMsg ||
            formatDate(msg.created_at) !==
              formatDate(prevMsg.created_at);

          return (
            <div key={msg.id}>
              {showDateDivider && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 px-2">
                    {formatDate(msg.created_at)}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}

              <div
                className={`flex gap-3 ${
                  msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 ${
                    msg.direction === 'outbound'
                      ? 'bg-blue-600 text-white'
                      : msg.is_read
                        ? 'bg-slate-100 text-slate-900'
                        : 'bg-amber-50 border border-amber-200 text-slate-900'
                  }`}
                >
                  <p className="text-sm break-words">{msg.body}</p>
                  <div
                    className={`mt-1 text-xs ${
                      msg.direction === 'outbound'
                        ? 'text-blue-100'
                        : 'text-slate-500'
                    }`}
                  >
                    {formatTime(msg.received_at || msg.created_at)}
                    {msg.direction === 'inbound' && msg.is_read && (
                      <span className="ml-1 inline-block">✓ {t('read')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
