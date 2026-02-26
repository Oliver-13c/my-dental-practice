'use client';

import { useCallback, useMemo, useState } from 'react';

type AppointmentStatus = 'scheduled' | 'arrived' | 'in-room' | 'complete' | 'no-show';

interface Appointment {
  id: string;
  time: string;
  patient: string;
  provider: string;
  room: string;
  duration: number;
  reason: string;
  status: AppointmentStatus;
  date: string;
}

interface CalendarSlot {
  time: string;
  appointments: Appointment[];
  isBlocked?: boolean;
}

interface DayColumn {
  date: string;
  dayName: string;
  provider: string;
  slots: CalendarSlot[];
}

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    date: '2026-02-25',
    time: '08:30',
    patient: 'Tania Reed',
    provider: 'Dr. Patel',
    room: 'Room 2',
    duration: 60,
    reason: 'Crown prep',
    status: 'arrived',
  },
  {
    id: 'apt-2',
    date: '2026-02-25',
    time: '09:15',
    patient: 'Marcus Green',
    provider: 'Hygiene',
    room: 'Room 4',
    duration: 45,
    reason: 'Cleaning',
    status: 'scheduled',
  },
  {
    id: 'apt-3',
    date: '2026-02-25',
    time: '10:00',
    patient: 'Isabella Cruz',
    provider: 'Dr. Patel',
    room: 'Room 1',
    duration: 30,
    reason: 'Post-op check',
    status: 'in-room',
  },
  {
    id: 'apt-4',
    date: '2026-02-25',
    time: '11:30',
    patient: 'Wes Parker',
    provider: 'Dr. Ross',
    room: 'Room 3',
    duration: 90,
    reason: 'Root canal',
    status: 'scheduled',
  },
  {
    id: 'apt-5',
    date: '2026-02-26',
    time: '09:00',
    patient: 'Alex Thompson',
    provider: 'Dr. Patel',
    room: 'Room 1',
    duration: 45,
    reason: 'Consultation',
    status: 'scheduled',
  },
  {
    id: 'apt-6',
    date: '2026-02-26',
    time: '10:30',
    patient: 'Jordan Lee',
    provider: 'Hygiene',
    room: 'Room 4',
    duration: 60,
    reason: 'Deep cleaning',
    status: 'scheduled',
  },
];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00',
];

const PROVIDERS = ['Dr. Patel', 'Dr. Ross', 'Hygiene'];

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function statusColor(status: AppointmentStatus) {
  switch (status) {
    case 'arrived':
      return 'border-l-4 border-emerald-500 bg-emerald-50';
    case 'in-room':
      return 'border-l-4 border-sky-500 bg-sky-50';
    case 'complete':
      return 'border-l-4 border-slate-400 bg-slate-50';
    case 'no-show':
      return 'border-l-4 border-rose-500 bg-rose-50';
    default:
      return 'border-l-4 border-amber-500 bg-amber-50';
  }
}

function statusBgColor(status: AppointmentStatus) {
  switch (status) {
    case 'arrived':
      return 'bg-emerald-100 text-emerald-800';
    case 'in-room':
      return 'bg-sky-100 text-sky-800';
    case 'complete':
      return 'bg-slate-100 text-slate-700';
    case 'no-show':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

function getDayName(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dateToString(date: Date) {
  return date.toISOString().slice(0, 10);
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
  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null);

  const dateObj = new Date(selectedDate + 'T00:00:00Z');

  const dates = useMemo(() => {
    if (viewMode === 'day') {
      return [selectedDate];
    }
    // Week view: Mon-Fri from selected date
    const dates: string[] = [];
    let current = new Date(dateObj);
    // Move to Monday
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    current.setDate(diff);

    for (let i = 0; i < 5; i++) {
      dates.push(dateToString(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [selectedDate, viewMode, dateObj]);

  const calendars = useMemo(() => {
    const calendarDays: DayColumn[] = [];

    dates.forEach((date) => {
      PROVIDERS.forEach((provider) => {
        const dayAppts = MOCK_APPOINTMENTS.filter(
          (apt) => apt.date === date && apt.provider === provider
        );

        const slots: CalendarSlot[] = TIME_SLOTS.map((time) => {
          const apptAtTime = dayAppts.find((apt) => apt.time === time);
          return {
            time,
            appointments: apptAtTime ? [apptAtTime] : [],
          };
        });

        calendarDays.push({
          date,
          dayName: getDayName(date),
          provider,
          slots,
        });
      });
    });

    return calendarDays;
  }, [dates]);

  const displayCalendars = useMemo(
    () =>
      selectedProvider
        ? calendars.filter((cal) => cal.provider === selectedProvider)
        : calendars,
    [calendars, selectedProvider]
  );

  const handleDragStart = useCallback((appt: Appointment) => {
    setDraggedAppt(appt);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((slot: CalendarSlot, date: string, provider: string) => {
    if (!draggedAppt) return;
    // In a real app, this would update the appointment time
    console.log(`Reschedule ${draggedAppt.patient} to ${date} at ${slot.time} with ${provider}`);
    setDraggedAppt(null);
  }, [draggedAppt]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
            {PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="mt-6 space-y-4">
          {displayCalendars.map((cal) => (
            <div key={`${cal.date}-${cal.provider}`} className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-semibold text-slate-900">{cal.provider}</h4>
                <span className="text-xs text-slate-500">{cal.dayName}</span>
              </div>
              <div className="grid auto-rows-min gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {cal.slots.map((slot, idx) => (
                  <div
                    key={`${cal.provider}-${slot.time}-${idx}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 transition hover:bg-slate-100"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(slot, cal.date, cal.provider)}
                  >
                    <div className="text-xs font-semibold text-slate-600">{formatTime(slot.time)}</div>
                    {slot.appointments.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {slot.appointments.map((appt) => (
                          <div
                            key={appt.id}
                            draggable
                            onDragStart={() => handleDragStart(appt)}
                            className={`cursor-move rounded-lg p-2 text-xs transition hover:shadow-md ${statusColor(
                              appt.status
                            )}`}
                          >
                            <p className="font-semibold text-slate-900">{appt.patient}</p>
                            <p className="text-slate-600">{appt.reason}</p>
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
                {displayCalendars.slice(0, 5).map((cal) => (
                  <th
                    key={`${cal.date}-${cal.provider}`}
                    className="min-w-40 border-l border-slate-200 bg-slate-50 p-3 text-left font-semibold text-slate-900"
                  >
                    <div className="text-sm">{cal.provider}</div>
                    <div className="text-xs text-slate-500">{cal.dayName}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((time) => (
                <tr key={time} className="border-b border-slate-200 hover:bg-slate-50/50">
                  <td className="sticky left-0 z-10 bg-white text-xs font-semibold text-slate-600 p-3 border-r border-slate-200">
                    {formatTime(time)}
                  </td>
                  {displayCalendars.slice(0, 5).map((cal, idx) => {
                    const slot = cal.slots.find((s) => s.time === time);
                    return (
                      <td
                        key={`${cal.date}-${cal.provider}-${time}`}
                        className="border-l border-slate-200 p-2 align-top"
                        onDragOver={handleDragOver}
                        onDrop={() => slot && handleDrop(slot, cal.date, cal.provider)}
                      >
                        {slot?.appointments.length ? (
                          <div className="space-y-1">
                            {slot.appointments.map((appt) => (
                              <div
                                key={appt.id}
                                draggable
                                onDragStart={() => handleDragStart(appt)}
                                className={`cursor-move rounded-lg p-2 text-xs transition hover:shadow-md ${statusColor(
                                  appt.status
                                )}`}
                              >
                                <p className="font-semibold text-slate-900 truncate">{appt.patient}</p>
                                <p className="text-slate-600 truncate">{appt.reason}</p>
                                <div className="mt-1 flex items-center justify-between gap-1">
                                  <span className="text-xs text-slate-600">{appt.room}</span>
                                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${statusBgColor(appt.status)}`}>
                                    {appt.status === 'in-room' ? 'In' : appt.status === 'arrived' ? 'Arr' : 'Sch'}
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

      {/* Drag Overlay */}
      {draggedAppt && (
        <div className="fixed bottom-4 left-4 rounded-2xl border-2 border-dashed border-slate-400 bg-white p-3 shadow-lg pointer-events-none">
          <p className="text-sm font-semibold text-slate-900">{draggedAppt.patient}</p>
          <p className="text-xs text-slate-500">Release to reschedule</p>
        </div>
      )}
    </div>
  );
}
