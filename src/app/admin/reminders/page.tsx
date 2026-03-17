'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, Send, Save } from 'lucide-react';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

export const dynamic = 'force-dynamic';

// ── Types ──────────────────────────────────────────────────────

interface TwilioStatus {
  twilioConfigured: boolean;
  smsEnabled: boolean;
  accountSidMasked: string | null;
  fromPhoneMasked: string | null;
}

interface ReminderConfig {
  default_reminder_minutes_before: number;
  default_channels: string[];
  enabled: boolean;
  auto_send: boolean;
}

// ── Constants ──────────────────────────────────────────────────

const TIMING_OPTIONS = [
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 240, label: '4 hours before' },
  { value: 720, label: '12 hours before' },
  { value: 1440, label: '24 hours before' },
  { value: 2880, label: '48 hours before' },
];

// ── Toggle component ───────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label ?? (checked ? 'Enabled' : 'Disabled')}
      data-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function AdminRemindersPage() {
  const tr = useTranslations('reminders');

  // Twilio state
  const [twilio, setTwilio] = useState<TwilioStatus | null>(null);
  const [twilioLoading, setTwilioLoading] = useState(true);
  const [testPhone, setTestPhone] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Reminder config state
  const [configLoading, setConfigLoading] = useState(true);
  const [minutesBefore, setMinutesBefore] = useState(1440);
  const [useEmail, setUseEmail] = useState(true);
  const [useSms, setUseSms] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [autoSend, setAutoSend] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadTwilioStatus = useCallback(async () => {
    try {
      setTwilioLoading(true);
      const res = await fetch('/api/admin/messaging/config');
      if (!res.ok) throw new Error('Failed to load Twilio status');
      setTwilio(await res.json());
    } catch {
      setTwilio(null);
    } finally {
      setTwilioLoading(false);
    }
  }, []);

  const loadReminderConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      const res = await fetch('/api/reminders/config');
      if (!res.ok) throw new Error('Failed to load reminder config');
      const json = await res.json();
      const data: ReminderConfig | null = json.data ?? null;
      if (data) {
        setMinutesBefore(data.default_reminder_minutes_before ?? 1440);
        setUseEmail(data.default_channels?.includes('email') ?? true);
        setUseSms(data.default_channels?.includes('sms') ?? true);
        setReminderEnabled(data.enabled ?? true);
        setAutoSend(data.auto_send ?? true);
      }
    } catch {
      // Keep defaults; user can still save to create the first config row
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTwilioStatus();
    void loadReminderConfig();
  }, [loadTwilioStatus, loadReminderConfig]);

  // ── Send test SMS ──────────────────────────────────────────

  const handleTestSms = async () => {
    const to = testPhone.trim();
    if (!to) {
      setTestResult({ ok: false, msg: 'Phone number is required' });
      return;
    }
    setTestBusy(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/messaging/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? tr('twilio.testFailed'));
      setTestResult({ ok: true, msg: tr('twilio.testSuccess') });
      setTestPhone('');
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : tr('twilio.testFailed') });
    } finally {
      setTestBusy(false);
    }
  };

  // ── Save reminder config ───────────────────────────────────

  const handleSave = async () => {
    const channels = [useEmail && 'email', useSms && 'sms'].filter(Boolean) as string[];
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/reminders/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_reminder_minutes_before: minutesBefore,
          default_channels: channels,
          enabled: reminderEnabled,
          auto_send: autoSend,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      setSaveResult({ ok: true, msg: tr('saved') });
      setTimeout(() => setSaveResult(null), 4000);
    } catch (err) {
      setSaveResult({ ok: false, msg: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tr('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{tr('configuration')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ── Twilio Connection Card ─────────────────────── */}
          <Card density="comfortable">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{tr('twilio.title')}</h2>

            {twilioLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <div className="space-y-4">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  {twilio?.twilioConfigured ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-green-700">{tr('twilio.configured')}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium text-red-700">{tr('twilio.notConfigured')}</span>
                    </>
                  )}
                </div>

                {twilio?.twilioConfigured ? (
                  <>
                    {/* Masked credentials */}
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 space-y-1 text-sm text-gray-700">
                      <p>
                        <span className="font-medium">{tr('twilio.accountSid')}:</span>{' '}
                        <code className="font-mono tracking-wide">{twilio.accountSidMasked}</code>
                      </p>
                      <p>
                        <span className="font-medium">{tr('twilio.fromPhone')}:</span>{' '}
                        <code className="font-mono tracking-wide">{twilio.fromPhoneMasked}</code>
                      </p>
                    </div>

                    {/* Test SMS form */}
                    <div className="space-y-2">
                      <label htmlFor="test-phone" className="block text-sm font-medium text-gray-700">
                        {tr('twilio.testPhoneLabel')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="test-phone"
                          type="tel"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleTestSms()}
                          placeholder={tr('twilio.testPhonePlaceholder')}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        />
                        <Button
                          size="sm"
                          onClick={handleTestSms}
                          disabled={testBusy || !testPhone.trim()}
                          leftIcon={<Send className="h-4 w-4" />}
                        >
                          {testBusy ? tr('twilio.testSending') : tr('twilio.testSms')}
                        </Button>
                      </div>
                      {testResult && (
                        <p className={`text-sm ${testResult.ok ? 'text-green-700' : 'text-red-700'}`}>
                          {testResult.msg}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {tr('twilio.envHint')}
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* ── Reminder Defaults Card ─────────────────────── */}
          <Card density="comfortable">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{tr('settings')}</h2>

            {configLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <div className="space-y-5">
                {/* Enable reminders toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tr('enabled')}</p>
                    <p className="text-xs text-gray-500">Send automated reminders for appointments</p>
                  </div>
                  <Toggle checked={reminderEnabled} onChange={setReminderEnabled} label={tr('enabled')} />
                </div>

                {/* Auto-send toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tr('autoSend')}</p>
                    <p className="text-xs text-gray-500">Send automatically when due; otherwise only queue</p>
                  </div>
                  <Toggle checked={autoSend} onChange={setAutoSend} label={tr('autoSend')} />
                </div>

                {/* Default timing */}
                <div>
                  <label htmlFor="timing-select" className="block text-sm font-medium text-gray-700 mb-1">
                    {tr('defaultTiming')}
                  </label>
                  <select
                    id="timing-select"
                    value={minutesBefore}
                    onChange={(e) => setMinutesBefore(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {TIMING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default channels */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">{tr('defaultChannels')}</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={useEmail}
                        onChange={(e) => setUseEmail(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Email
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={useSms}
                        onChange={(e) => setUseSms(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      SMS
                    </label>
                  </div>
                </div>

                {/* Save */}
                <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    {saving ? 'Saving…' : tr('saveSettings')}
                  </Button>
                  {saveResult && (
                    <p className={`text-sm ${saveResult.ok ? 'text-green-700' : 'text-red-700'}`}>
                      {saveResult.msg}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
