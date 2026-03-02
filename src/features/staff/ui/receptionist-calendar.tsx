'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  useAppointments,
  useProviders,
  updateAppointment,
} from '../hooks/use-appointments-data';
import type { AppointmentWithDetails } from '@/entities/appointment/model/appointment.types';

// ── Status colors ──────────────────────────────────────────────
function statusColor(status: string) {
  switch (status) {
    case 'arrived':
      return 'border-l-4 border-emerald-500 bg-emerald-50';
    case 'in-progress':
      return 'border-l-4 border-sky-500 bg-sky-50';
    case 'completed':
      return 'border-l-4 border-slate-400 bg-slate-50';
    case 'no-show':
      return 'border-l-4 border-rose-500 bg-rose-50';
    case 'cancelled':
      return 'border-l-4 border-gray-300 bg-gray-50';
    case 'confirmed':
      return 'border-l-4 border-teal-500 bg-teal-50';
    default:
      return 'border-l-4 border-amber-500 bg-amber-50';
  }
}

function statusBgColor(status: string) {
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

function statusLabel(status: string) {
  switch (status) {
    case 'in-progress': return 'In';
    case 'arrived': return 'Arr';
    case 'confirmed': return 'Conf';
    case 'completed': return 'Done';
    case 'no-show': return 'N/S';
    case 'cancelled': return 'Can';
    default: return 'Pend';
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatHHMM(hhmm: string) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function getSlotTimeKey(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${(Math.floor(d.getMinutes() / 30) * 30).toString().padStart(2, '0')}`;
}

function getDayName(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function dateToString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function patientName(appt: AppointmentWithDetails) {
  if (appt.patient) return `${appt.patient.first_name} ${appt.patient.last_name}`;
  return appt.patient_name ?? 'Unknown';
}

function providerLabel(appt: AppointmentWithDetails) {
  if (appt.provider) return `Dr. ${appt.provider.last_name}`;
  return 'Unassigned';
}

// ── Time slots ─────────────────────────────────────────────────
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00',
];

// ── Calendar slot / column types ───────────────────────────────
interface CalendarSlot {
  time: string;
  appointments: AppointmentWithDetails[];
}

interface DayColumn {
  date: string;
  dayName: string;
  providerId: string;
  providerLabel: string;
  slots: CalendarSlot[];
}

interface ReceptionistCalendarProps {
  viewMode: 'day' | 'week';
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function ReceptionistCalendar({
  viewMode,
  selectedDate,
  onDateChange,
}: ReceptionistCalendarProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [draggedAppt, setDraggedAppt] = useState<AppointmentWithDetails | null>(null);

  // Build date range for the query
  const dates = useMemo(() => {
    if (viewMode === 'day') return [selectedDate];
    const d = new Date(selectedDate + 'T12:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const result: string[] = [];
    for (let i = 0; i < 5; i++) {
      const curr = new Date(monday);
      curr.setDate(monday.getDate() + i);
      result.push(dateToString(curr));
    }
    return result;
  }, [selectedDate, viewMode]);

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // Fetch data
  const { providers } = useProviders();
  const { appointments, refetch } = useAppointments(
    viewMode === 'day' ? { date: startDate } : { startDate, endDate },
  );

  // Build calendar columns
  const calendars = useMemo(() => {
    const columns: DayColumn[] = [];
    dates.forEach((date) => {
      providers.forEach((provider) => {
        const dayAppts = appointments.filter((appt) => {
          const apptDate = appt.start_time.slice(0, 10);
          return apptDate === date && appt.provider_id === provider.id;
        });

        const slots: CalendarSlot[] = TIME_SLOTS.map((time) => {
          const slotsAtTime = dayAppts.filter((appt) => getSlotTimeKey(appt.start_time) === time);
          return { time, appointments: slotsAtTime };
        });

        columns.push({
          date,
          dayName: getDayName(date),
          providerId: provider.id,
          providerLabel: `Dr. ${provider.last_name}`,
          slots,
        });
      });
    });
    return columns;
  }, [dates, providers, appointments]);

  const displayCalendars = useMemo(
    () => selectedProvider
      ? calendars.filter((col) => col.providerId === selectedProvider)
      : calendars,
    [calendars, selectedProvider],
  );

  const handleDragStart = useCallback((appt: AppointmentWithDetails) => {
    setDraggedAppt(appt);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (slot: CalendarSlot, date: string, providerId: string) => {
    if (!draggedAppt) return;

    // Calculate new start_time from date + slot time
    const newStart = new Date(`${date}T${slot.time}:00`).toISOString();

    try {
      await updateAppointment(draggedAppt.id, {
        start_time: newStart,
        provider_id: providerId,
      });
      refetch();
    } catch (err) {
      console.error('Reschedule failed:', err);
      alert('Could not reschedule — time slot may conflict.');
    }
    setDraggedAppt(null);
  }, [draggedAppt, refetch]);

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {viewMode === 'day' ? 'Day Schedule' : 'Weekly Schedule'}
          </h3>
          <p className="text-xs text-slate-500">Drag appointments to reschedule. Click to view details.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedProvider || 'all'}
            onChange={(e) => setSelectedProvider(e.target.value === 'all' ? null : e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm"
            aria-label="Filter calendar by provider"
          >
            <option value="all">All Providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>Dr. {p.last_name}</option>
            ))}
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm"
            aria-label="Select calendar date"
          />
        </div>
      </div>

      {providers.length === 0 ? (
        <div className="mt-6 py-8 text-center text-sm text-slate-400">Loading providers...</div>
      ) : (
        <>
          {/* Day View */}
          {viewMode === 'day' && (
            <div className="mt-6 space-y-4">
              {displayCalendars.map((col) => (
                <div key={`${col.date}-${col.providerId}`} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-semibold text-slate-900">{col.providerLabel}</h4>
                    <span className="text-xs text-slate-500">{col.dayName}</span>
                  </div>
                  <div className="grid auto-rows-min gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {col.slots.map((slot, idx) => (
                      <div
                        key={`${col.providerId}-${slot.time}-${idx}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 transition hover:bg-slate-100"
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(slot, col.date, col.providerId)}
                      >
                        <div className="text-xs font-semibold text-slate-600">{formatHHMM(slot.time)}</div>
                        {slot.appointments.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {slot.appointments.map((appt) => (
                              <div
                                key={appt.id}
                                draggable
                                onDragStart={() => handleDragStart(appt)}
                                className={`cursor-move rounded-lg p-2 text-xs transition hover:shadow-md ${statusColor(appt.status)}`}
                              >
                                <p className="font-semibold text-slate-900">{patientName(appt)}</p>
                                <p className="text-slate-600">{appt.appointment_type?.name ?? 'General'}</p>
                                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusBgColor(appt.status)}`}>
                                  {appt.status.replace('-', ' ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-slate-400">Open</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Week View */}
          {viewMode === 'week' && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="sticky left-0 z-10 min-w-20 bg-white text-left text-xs font-semibold text-slate-600 p-3">
                      Time
                    </th>
                    {displayCalendars.slice(0, viewMode === 'week' ? undefined : 5).map((col) => (
                      <th
                        key={`${col.date}-${col.providerId}`}
                        className="min-w-40 border-l border-slate-200 bg-slate-50 p-3 text-left font-semibold text-slate-900"
                      >
                        <div className="text-sm">{col.providerLabel}</div>
                        <div className="text-xs text-slate-500">{col.dayName}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((time) => (
                    <tr key={time} className="border-b border-slate-200 hover:bg-slate-50/50">
                      <td className="sticky left-0 z-10 bg-white text-xs font-semibold text-slate-600 p-3 border-r border-slate-200">
                        {formatHHMM(time)}
                      </td>
                      {displayCalendars.map((col) => {
                        const slot = col.slots.find((s) => s.time === time);
                        return (
                          <td
                            key={`${col.date}-${col.providerId}-${time}`}
                            className="border-l border-slate-200 p-2 align-top"
                            onDragOver={handleDragOver}
                            onDrop={() => slot && handleDrop(slot, col.date, col.providerId)}
                          >
                            {slot?.appointments.length ? (
                              <div className="space-y-1">
                                {slot.appointments.map((appt) => (
                                  <div
                                    key={appt.id}
                                    draggable
                                    onDragStart={() => handleDragStart(appt)}
                                    className={`cursor-move rounded-lg p-2 text-xs transition hover:shadow-md ${statusColor(appt.status)}`}
                                  >
                                    <p className="font-semibold text-slate-900 truncate">{patientName(appt)}</p>
                                    <p className="text-slate-600 truncate">{appt.appointment_type?.name ?? 'General'}</p>
                                    <div className="mt-1 flex items-center justify-between gap-1">
                                      <span className="text-xs text-slate-600">
                                        {appt.appointment_type?.duration_minutes ?? 30}m
                                      </span>
                                      <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${statusBgColor(appt.status)}`}>
                                        {statusLabel(appt.status)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-12 flex items-center justify-center text-xs text-slate-300">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Drag Overlay */}
      {draggedAppt && (
        <div className="fixed bottom-4 left-4 rounded-2xl border-2 border-dashed border-slate-400 bg-white p-3 shadow-lg pointer-events-none">
          <p className="text-sm font-semibold text-slate-900">{patientName(draggedAppt)}</p>
          <p className="text-xs text-slate-500">Release to reschedule</p>
        </div>
      )}
    </div>
  );
}
