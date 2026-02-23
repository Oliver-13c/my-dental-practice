'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppointmentType } from '@/entities/appointment/model/appointment.types';
import { cancelBooking, rescheduleBooking } from '@/features/book-appointment/api/manage-booking';

interface AppointmentListProps {
  patientName: string;
}

export function AppointmentList({ patientName }: AppointmentListProps) {
  const t = useTranslations('appointments');
  const [appointments, setAppointments] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState('');

  React.useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const res = await (globalThis as any).fetch(`/api/patient/appointments?patientName=${encodeURIComponent(
          patientName
        )}`);
        const data = await res.json();
        setAppointments(data);
        setError(null);
      } catch {
        setError(t('error.fetch'));
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [patientName, t]);

  async function handleCancel(id: string) {
    setActionLoading(id);
    try {
      await cancelBooking(id);
      setAppointments((aps) => aps.filter((a) => a.id !== id));
    } catch {
      setError(t('error.action'));
    } finally {
      setActionLoading('');
    }
  }

  async function handleReschedule(id: string) {
    // Simplified: Just cancel and inform rebooking needed
    if (!confirm(t('confirmReschedule'))) return;
    setActionLoading(id);
    try {
      await cancelBooking(id);
      setAppointments((aps) => aps.filter((a) => a.id !== id));
      alert(t('infoReschedule'));
    } catch {
      setError(t('error.action'));
    } finally {
      setActionLoading('');
    }
  }

  if (loading) return <p>{t('loading')}</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (appointments.length === 0) return <p>{t('noAppointments')}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      <ul className="space-y-4" role="list">
        {appointments.map((appt) => (
          <li key={appt.id} className="p-4 border rounded shadow">
            <p><strong>{new Date(appt.startTime).toLocaleString()}</strong></p>
            <p>{appt.patientName}</p>
            <p>{appt.startTime < new Date().toISOString() ? t('past') : t('upcoming')}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => handleReschedule(appt.id)}
                disabled={actionLoading === appt.id}
                className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {t('reschedule')}
              </button>
              <button
                onClick={() => {
                  if (confirm(t('confirmCancel'))) handleCancel(appt.id);
                }}
                disabled={actionLoading === appt.id}
                className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                {t('cancel')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
