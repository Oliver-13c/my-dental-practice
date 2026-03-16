'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppointments, updateAppointment } from '../hooks/use-appointments-data';
import type { AppointmentWithDetails } from '@/entities/appointment/model/appointment.types';
import { PatientSnapshotCard } from './patient-snapshot-card';

function formatTime(iso: string) {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function statusBadge(status: string) {
  switch (status) {
    case 'arrived':
      return 'bg-emerald-100 text-emerald-800';
    case 'in-progress':
      return 'bg-sky-100 text-sky-800';
    case 'completed':
      return 'bg-slate-100 text-slate-700';
    case 'no-show':
      return 'bg-rose-100 text-rose-800';
    case 'confirmed':
      return 'bg-teal-100 text-teal-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

function patientName(appointment: AppointmentWithDetails) {
  if (appointment.patient) {
    return `${appointment.patient.first_name} ${appointment.patient.last_name}`;
  }

  return appointment.patient_name ?? 'Unknown';
}

export function DentistDashboard({
  providerId,
  calendarConnected = false,
}: {
  providerId?: string | null;
  calendarConnected?: boolean;
}) {
  const t = useTranslations('staff.clinical');
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate] = useState(today);
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const { appointments, loading, refetch } = useAppointments({
    date: selectedDate,
    ...(providerId ? { provider_id: providerId } : {}),
  });

  const activeAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.status !== 'cancelled')
        .sort((left, right) => left.start_time.localeCompare(right.start_time)),
    [appointments],
  );

  const stats = useMemo(
    () => ({
      total: activeAppointments.length,
      waiting: activeAppointments.filter((appointment) => appointment.status === 'arrived').length,
      inProgress: activeAppointments.filter((appointment) => appointment.status === 'in-progress').length,
      completed: activeAppointments.filter((appointment) => appointment.status === 'completed').length,
    }),
    [activeAppointments],
  );

  const currentTimestamp = Date.now();

  const currentAppointment = useMemo(
    () =>
      activeAppointments.find((appointment) => {
        const start = new Date(appointment.start_time).getTime();
        const end = new Date(appointment.end_time).getTime();
        return currentTimestamp >= start && currentTimestamp <= end;
      }) ??
      activeAppointments.find(
        (appointment) => appointment.status === 'arrived' || appointment.status === 'in-progress',
      ) ??
      null,
    [activeAppointments, currentTimestamp],
  );

  const upcomingAppointments = useMemo(
    () =>
      activeAppointments
        .filter((appointment) => new Date(appointment.start_time).getTime() > currentTimestamp)
        .slice(0, 5),
    [activeAppointments, currentTimestamp],
  );

  const activeAppointment = useMemo(
    () =>
      activeAppointments.find((appointment) => appointment.id === activeAppointmentId) ??
      currentAppointment ??
      upcomingAppointments[0] ??
      null,
    [activeAppointmentId, activeAppointments, currentAppointment, upcomingAppointments],
  );

  async function handleStatus(id: string, status: string) {
    try {
      await updateAppointment(id, { status });
      refetch();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  }

  async function handleNotesSave(appointment: AppointmentWithDetails) {
    try {
      await updateAppointment(appointment.id, {
        notes: noteDrafts[appointment.id] ?? appointment.notes ?? '',
      });
      refetch();
    } catch (err) {
      console.error('Clinical note update failed:', err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs uppercase tracking-wide text-blue-600">{t('stats.totalPatients')}</p>
          <p className="mt-2 text-2xl font-semibold text-blue-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-600">{t('stats.waiting')}</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{stats.waiting}</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
          <p className="text-xs uppercase tracking-wide text-sky-600">{t('stats.inProgress')}</p>
          <p className="mt-2 text-2xl font-semibold text-sky-900">{stats.inProgress}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">{t('stats.completed')}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-700">{stats.completed}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-blue-800">{t('scheduleTitle')}</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
              <span className="ml-3 text-sm text-blue-500">{t('loadingSchedule')}</span>
            </div>
          ) : activeAppointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{t('emptySchedule')}</p>
          ) : (
            <ul className="space-y-3">
              {activeAppointments.map((appointment) => (
                <li
                  key={appointment.id}
                  className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition hover:shadow-md ${activeAppointment?.id === appointment.id ? 'border-blue-300 bg-blue-50/60' : 'border-gray-100 bg-gray-50/70'}`}
                  onClick={() => setActiveAppointmentId(appointment.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatTime(appointment.start_time)} - {patientName(appointment)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {appointment.appointment_type?.name ?? t('generalType')} - {appointment.appointment_type?.duration_minutes ?? 30} min
                      </p>
                      {appointment.notes && (
                        <p className="mt-1 text-xs italic text-slate-400">{appointment.notes}</p>
                      )}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(appointment.status)}`}>
                      {appointment.status.replace('-', ' ')}
                    </span>
                  </div>

                  {appointment.status !== 'completed' && appointment.status !== 'no-show' && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {appointment.status === 'arrived' && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStatus(appointment.id, 'in-progress');
                          }}
                          className="rounded-full bg-sky-600 px-3 py-1 text-white hover:bg-sky-700"
                        >
                          {t('actions.startVisit')}
                        </button>
                      )}
                      {appointment.status === 'in-progress' && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStatus(appointment.id, 'completed');
                          }}
                          className="rounded-full bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700"
                        >
                          {t('actions.completeVisit')}
                        </button>
                      )}
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleStatus(appointment.id, 'no-show');
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 hover:border-slate-300"
                      >
                        {t('actions.noShow')}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Calendar Sync</h2>
                <p className="mt-1 text-sm text-slate-500">
                  The app schedule stays authoritative. Google Calendar sync is optional.
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${calendarConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {calendarConnected ? 'Connected' : 'Setup required'}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href="/api/calendar/auth"
                className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                {calendarConnected ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Current Patient</h2>
            {currentAppointment ? (
              <PatientSnapshotCard appointment={currentAppointment} viewerRole="dentist" />
            ) : (
              <p className="text-sm text-slate-500">No patient currently in chair.</p>
            )}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Selected Appointment</h2>
            {activeAppointment ? (
              <div className="space-y-4">
                <PatientSnapshotCard appointment={activeAppointment} viewerRole="dentist" />
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Update Clinical Note
                  </label>
                  <textarea
                    aria-label="Clinical note"
                    value={noteDrafts[activeAppointment.id] ?? activeAppointment.notes ?? ''}
                    onChange={(event) =>
                      setNoteDrafts((current) => ({
                        ...current,
                        [activeAppointment.id]: event.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  />
                  <button
                    onClick={() => handleNotesSave(activeAppointment)}
                    className="mt-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
                  >
                    Save Clinical Note
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select an appointment to review details.</p>
            )}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Upcoming Patients</h2>
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-slate-500">No more patients scheduled after this.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <li key={appointment.id} className="rounded-lg border border-slate-100 p-3">
                    <button
                      onClick={() => setActiveAppointmentId(appointment.id)}
                      className="w-full text-left"
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {formatTime(appointment.start_time)} - {patientName(appointment)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {appointment.appointment_type?.name ?? t('generalType')}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
