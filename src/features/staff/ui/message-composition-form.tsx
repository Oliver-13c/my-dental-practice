/**
 * Message Composition Form Component
 * 
 * Allows staff to compose and send SMS/email messages to patients
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface MessageCompositionFormProps {
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  threadKey: string | null;
  onMessageSent?: (messageId: string) => void;
  onError?: (error: string) => void;
}

export function MessageCompositionForm({
  patientId,
  patientName,
  patientPhone,
  threadKey,
  onMessageSent,
  onError,
}: MessageCompositionFormProps) {
  const t = useTranslations('staff.messages');
  const [messageText, setMessageText] = useState('');
  const [useSms, setUseSms] = useState(!!patientPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    if (!messageText.trim()) {
      setError(t('compose.errors.emptyMessage'));
      return;
    }

    if (!useSms && !patientPhone) {
      setError(t('compose.errors.noPhone'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          thread_key: threadKey,
          body: messageText,
          channels: useSms ? ['sms'] : [],
          message_type: 'custom',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('compose.errors.sendFailed'));
      }

      const data = await response.json();
      setSuccess(true);
      setMessageText('');
      
      if (onMessageSent) {
        onMessageSent(data.message_id);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('compose.errors.sendFailed');
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="mb-3 text-sm font-semibold text-slate-900">
        {t('compose.title')}
      </h4>

      <form onSubmit={handleSendMessage} className="space-y-3">
        {/* Message Input */}
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder={t('compose.placeholder')}
          maxLength={160}
          rows={4}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {/* Character Count */}
        <div className="text-xs text-slate-500">
          {messageText.length}/160 {t('compose.characters')}
        </div>

        {/* Channel Selection */}
        {patientPhone && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useSms}
              onChange={(e) => setUseSms(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">
              {t('compose.sendSms')} ({patientPhone})
            </span>
          </label>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
            {t('compose.success')}
          </div>
        )}

        {/* Send Button */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !messageText.trim()}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            {loading ? t('compose.sending') : t('compose.send')}
          </button>
        </div>
      </form>
    </div>
  );
}
