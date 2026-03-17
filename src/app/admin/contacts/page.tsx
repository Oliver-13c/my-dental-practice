'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { Card } from '@/shared/ui/card';
import { useSendMessage, ContactPreferenceBadge, MessageHistoryList } from '@/features/shared/messaging';
import type { MessageLogRecord, ContactPreferences } from '@/features/shared/messaging';

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

type ContactPreference = {
  preferred_contact_method: 'email' | 'sms' | 'phone';
  do_not_contact: boolean;
  preferred_language: string;
};

export default function AdminContactsPage() {
  const tc = useTranslations('contacts');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [messages, setMessages] = useState<MessageLogRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [useEmail, setUseEmail] = useState(true);
  const [useSms, setUseSms] = useState(false);

  const [prefs, setPrefs] = useState<ContactPreference>({
    preferred_contact_method: 'email',
    do_not_contact: false,
    preferred_language: 'es',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Use shared send message hook
  const { send: sendMessage, loading: sendingMessage, error: sendError } = useSendMessage();

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  const fetchPatients = useCallback(async () => {
    const res = await fetch('/api/patients');
    if (!res.ok) {
      throw new Error('Failed to load patients');
    }
    const json = await res.json();
    const list = (json.data ?? []) as Patient[];
    setPatients(list);
    if (list.length && !selectedPatientId) {
      setSelectedPatientId(list[0].id);
    }
  }, [selectedPatientId]);

  const fetchMessages = useCallback(async (patientId?: string) => {
    const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}&limit=30` : '?limit=30';
    const res = await fetch(`/api/messages${query}`);
    if (!res.ok) {
      throw new Error('Failed to load messages');
    }
    const json = await res.json();
    setMessages((json.data ?? []) as MessageLogRecord[]);
  }, []);

  const fetchPreferences = useCallback(async (patientId: string) => {
    const res = await fetch(`/api/contacts/preferences/${patientId}`);
    if (!res.ok) {
      throw new Error('Failed to load contact preferences');
    }
    const json = await res.json();
    if (json.data) {
      setPrefs({
        preferred_contact_method: json.data.preferred_contact_method ?? 'email',
        do_not_contact: Boolean(json.data.do_not_contact),
        preferred_language: json.data.preferred_language ?? 'es',
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchPatients();
      } catch {
        if (mounted) {
          setError('No se pudieron cargar los contactos.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fetchPatients]);

  useEffect(() => {
    if (!selectedPatientId) return;

    (async () => {
      try {
        setError(null);
        await Promise.all([fetchMessages(selectedPatientId), fetchPreferences(selectedPatientId)]);
      } catch {
        setError('No se pudo cargar la informacion del contacto.');
      }
    })();
  }, [fetchMessages, fetchPreferences, selectedPatientId]);

  const handleSendMessage = async () => {
    if (!selectedPatientId) {
      setError('Selecciona un paciente.');
      return;
    }

    const channels = [useEmail ? 'email' : null, useSms ? 'sms' : null].filter(Boolean) as string[];
    if (!channels.length) {
      setError('Selecciona al menos un canal (email o sms).');
      return;
    }
    if (!messageBody.trim()) {
      setError('Escribe el mensaje a enviar.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const result = await sendMessage({
        patient_id: selectedPatientId,
        thread_key: `admin-${selectedPatientId}`,
        body: messageBody.trim(),
        channels,
        message_type: 'custom',
      });

      if (!result.success) {
        throw new Error(result.error || tc('messageFailed'));
      }

      setSubject('');
      setMessageBody('');
      setSuccess(tc('messageSent'));
      await fetchMessages(selectedPatientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('messageFailed'));
    }
  };

  const handleSavePreferences = async () => {
    if (!selectedPatientId) return;

    try {
      setSavingPrefs(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/contacts/preferences/${selectedPatientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_contact_method: prefs.preferred_contact_method,
          do_not_contact: prefs.do_not_contact,
          preferred_language: prefs.preferred_language,
        }),
      });

      if (!res.ok) {
        throw new Error('No se pudieron guardar las preferencias.');
      }

      setSuccess(tc('preferences.updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar las preferencias.');
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tc('title')}</h1>
          <p className="text-gray-600">{tc('directory')} · {tc('inbox')}</p>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        {loading ? (
          <Card className="p-6 text-sm text-gray-500">Cargando contactos...</Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-4 lg:col-span-1">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">{tc('directory')}</h2>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                aria-label="Seleccionar paciente"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
              >
                <option value="">Selecciona un paciente</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>

              {selectedPatient && (
                <div className="mt-4 space-y-1 text-sm text-gray-700">
                  <p><span className="font-medium">{tc('recipientEmail')}:</span> {selectedPatient.email || '-'}</p>
                  <p><span className="font-medium">{tc('recipientPhone')}:</span> {selectedPatient.phone || '-'}</p>
                </div>
              )}
            </Card>

            <Card className="p-4 lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">{tc('sendMessage')}</h2>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useEmail}
                    onChange={(e) => setUseEmail(e.target.checked)}
                  />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useSms}
                    onChange={(e) => setUseSms(e.target.checked)}
                  />
                  SMS
                </label>
              </div>

              <input
                type="text"
                className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder={tc('subject')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />

              <textarea
                className="mt-3 h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder={tc('body')}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
              />

              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {sendingMessage ? tc('sendingMessage') : tc('sendMessage')}
                </button>
              </div>
            </Card>

            <Card className="p-4 lg:col-span-1">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">{tc('preferences.title')}</h2>

              <label className="mb-2 block text-xs font-medium text-gray-600">{tc('preferredMethod')}</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                aria-label="Metodo de contacto preferido"
                value={prefs.preferred_contact_method}
                onChange={(e) =>
                  setPrefs((current) => ({ ...current, preferred_contact_method: e.target.value as ContactPreference['preferred_contact_method'] }))
                }
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="phone">Phone</option>
              </select>

              <label className="mt-3 mb-2 block text-xs font-medium text-gray-600">{tc('language')}</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                aria-label="Idioma preferido"
                value={prefs.preferred_language}
                onChange={(e) => setPrefs((current) => ({ ...current, preferred_language: e.target.value }))}
              >
                <option value="es">Espanol</option>
                <option value="en">English</option>
              </select>

              <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={prefs.do_not_contact}
                  onChange={(e) => setPrefs((current) => ({ ...current, do_not_contact: e.target.checked }))}
                />
                {tc('doNotContact')}
              </label>

              <button
                onClick={handleSavePreferences}
                disabled={savingPrefs || !selectedPatientId}
                className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
              >
                {savingPrefs ? 'Guardando...' : 'Guardar preferencias'}
              </button>
            </Card>

            <Card className="p-4 lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">{tc('inbox')}</h2>

              <MessageHistoryList
                messages={messages}
                emptyText={tc('noMessages')}
              />
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
