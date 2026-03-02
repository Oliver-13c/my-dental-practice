'use client';

import { useCallback, useMemo, useState } from 'react';
import { ReceptionistCalendar } from './receptionist-calendar';
import {
  useAppointments,
  useProviders,
  useAppointmentTypes,
  usePatientSearch,
  useAvailability,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  createTimeBlock,
} from '../hooks/use-appointments-data';
import type { AppointmentWithDetails } from '@/entities/appointment/model/appointment.types';

// ── Helpers ────────────────────────────────────────────────────
function formatISOToTime(iso: string) {
    const d = new Date(iso);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function providerDisplayName(appt: AppointmentWithDetails) {
    if (appt.provider) return `Dr. ${appt.provider.last_name}`;
    return 'Unassigned';
}

function patientDisplayName(appt: AppointmentWithDetails) {
    if (appt.patient) return `${appt.patient.first_name} ${appt.patient.last_name}`;
    return appt.patient_name ?? 'Unknown';
}

type StatusStyle = 'arrived' | 'in-progress' | 'completed' | 'no-show' | 'confirmed' | 'pending' | 'cancelled';

function statusBadge(status: string) {
    switch (status as StatusStyle) {
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

export function ReceptionistDashboard() {
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
    const [providerFilter, setProviderFilter] = useState('all');

    // ── API data ───────────────────────────────────────────────
    const { providers } = useProviders();
    const { types: appointmentTypes } = useAppointmentTypes();
    const { appointments, loading: appointmentsLoading, refetch } = useAppointments({ date: selectedDate });

    // ── Create form state ──────────────────────────────────────
    const [patientQuery, setPatientQuery] = useState('');
    const { patients: patientResults } = usePatientSearch(patientQuery);
    const [createForm, setCreateForm] = useState({
        patient_id: '',
        patient_display: '',
        phone: '',
        provider_id: '',
        appointment_type_id: '',
        date: selectedDate,
        start_time: '',
        notes: '',
        language_preference: 'en' as 'en' | 'es',
    });
    const [createBusy, setCreateBusy] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [createError, setCreateError] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);

    // Availability for the selected provider + date + type
    const { slots: availableSlots } = useAvailability(
        createForm.provider_id || null,
        createForm.date || null,
        createForm.appointment_type_id || null,
    );

    // ── Block time form ────────────────────────────────────────
    const [blockForm, setBlockForm] = useState({
        provider_id: '',
        date: selectedDate,
        start: '12:00',
        end: '12:30',
        reason: '',
    });
    const [blockBusy, setBlockBusy] = useState(false);
    const [blockSuccess, setBlockSuccess] = useState(false);

    // ── Derived data ───────────────────────────────────────────
    const filteredAppointments = useMemo(() => {
        const list = providerFilter === 'all'
            ? appointments
            : appointments.filter((appt) => appt.provider_id === providerFilter);
        return [...list].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }, [appointments, providerFilter]);

    const totals = useMemo(() => {
        const checkedIn = appointments.filter((a) => a.status === 'arrived' || a.status === 'in-progress').length;
        const completed = appointments.filter((a) => a.status === 'completed').length;
        const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
        return {
            total: appointments.length - cancelled,
            checkedIn,
            completed,
            upcoming: appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed').length,
        };
    }, [appointments]);

    // ── Handlers ───────────────────────────────────────────────
    const handleStatusChange = useCallback(async (id: string, status: string) => {
        try {
            await updateAppointment(id, { status });
            refetch();
        } catch (err) {
            console.error('Status update failed:', err);
        }
    }, [refetch]);

    const handleCancel = useCallback(async (id: string) => {
        if (!confirm('Cancel this appointment?')) return;
        try {
            await cancelAppointment(id);
            refetch();
        } catch (err) {
            console.error('Cancel failed:', err);
        }
    }, [refetch]);

    async function handleCreateAppointment(event: React.FormEvent) {
        event.preventDefault();
        if (!createForm.patient_id || !createForm.provider_id || !createForm.appointment_type_id || !createForm.start_time) {
            setCreateError('Please fill in all required fields.');
            return;
        }

        setCreateBusy(true);
        setCreateError('');
        try {
            await createAppointment({
                patient_id: createForm.patient_id,
                provider_id: createForm.provider_id,
                appointment_type_id: createForm.appointment_type_id,
                start_time: createForm.start_time,
                notes: createForm.notes || undefined,
                phone: createForm.phone || undefined,
                language_preference: createForm.language_preference,
            });
            setCreateSuccess(true);
            setTimeout(() => setCreateSuccess(false), 3000);
            setCreateForm((prev) => ({
                ...prev,
                patient_id: '',
                patient_display: '',
                phone: '',
                start_time: '',
                notes: '',
            }));
            setPatientQuery('');
            refetch();
        } catch (err: any) {
            setCreateError(err.message ?? 'Failed to create appointment');
        } finally {
            setCreateBusy(false);
        }
    }

    async function handleBlockTime(event: React.FormEvent) {
        event.preventDefault();
        if (!blockForm.provider_id || !blockForm.reason || !blockForm.start || !blockForm.end) return;

        setBlockBusy(true);
        try {
            const startISO = `${blockForm.date}T${blockForm.start}:00`;
            const endISO = `${blockForm.date}T${blockForm.end}:00`;
            await createTimeBlock(blockForm.provider_id, {
                start_time: new Date(startISO).toISOString(),
                end_time: new Date(endISO).toISOString(),
                reason: blockForm.reason,
            });
            setBlockSuccess(true);
            setTimeout(() => setBlockSuccess(false), 3000);
            setBlockForm((prev) => ({ ...prev, reason: '' }));
            refetch();
        } catch (err) {
            console.error('Block time failed:', err);
        } finally {
            setBlockBusy(false);
        }
    }

    return (
        <section className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-amber-50 via-white to-teal-50 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Receptionist Workspace</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900 font-serif">Front Desk Control Center</h2>
                    <p className="mt-1 text-sm text-slate-600">Stay ahead of arrivals, open slots, and provider availability.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                        <span className="text-xs uppercase text-slate-400">View</span>
                        <button
                            type="button"
                            onClick={() => setViewMode('day')}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                viewMode === 'day' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Day
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('week')}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                viewMode === 'week' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Week
                        </button>
                    </div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(event) => {
                            setSelectedDate(event.target.value);
                            setCreateForm((prev) => ({ ...prev, date: event.target.value }));
                            setBlockForm((prev) => ({ ...prev, date: event.target.value }));
                        }}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
                        aria-label="Select schedule date"
                    />
                    <select
                        value={providerFilter}
                        onChange={(event) => setProviderFilter(event.target.value)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
                        aria-label="Filter appointments by provider"
                    >
                        <option value="all">All Providers</option>
                        {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                                Dr. {p.last_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Appointments</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.total}</p>
                    <p className="text-xs text-slate-500">Scheduled for today</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Checked In</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-700">{totals.checkedIn}</p>
                    <p className="text-xs text-slate-500">In clinic right now</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-700">{totals.upcoming}</p>
                    <p className="text-xs text-slate-500">Pending &amp; confirmed</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.completed}</p>
                    <p className="text-xs text-slate-500">Done for the day</p>
                </div>
            </div>

            {/* Calendar Grid */}
            <ReceptionistCalendar viewMode={viewMode} selectedDate={selectedDate} onDateChange={setSelectedDate} />

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                    {/* Schedule List */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">Schedule</h3>
                            <span className="text-xs uppercase tracking-[0.25em] text-slate-400">{selectedDate}</span>
                        </div>

                        {appointmentsLoading ? (
                            <div className="mt-4 flex items-center justify-center py-8">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                                <span className="ml-3 text-sm text-slate-500">Loading appointments...</span>
                            </div>
                        ) : filteredAppointments.length === 0 ? (
                            <div className="mt-4 py-8 text-center text-sm text-slate-400">
                                No appointments for this date.
                            </div>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {filteredAppointments.map((appt) => (
                                    <div
                                        key={appt.id}
                                        className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {formatISOToTime(appt.start_time)} · {patientDisplayName(appt)}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {appt.appointment_type?.name ?? 'General'} · {providerDisplayName(appt)} · {appt.appointment_type?.duration_minutes ?? 30} min
                                                </p>
                                                {appt.notes && (
                                                    <p className="mt-1 text-xs text-slate-400 italic">{appt.notes}</p>
                                                )}
                                            </div>
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(appt.status)}`}>
                                                {appt.status.replace('-', ' ')}
                                            </span>
                                        </div>
                                        {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {appt.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleStatusChange(appt.id, 'confirmed')}
                                                        className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-teal-700 transition hover:bg-teal-100"
                                                    >
                                                        Confirm
                                                    </button>
                                                )}
                                                {(appt.status === 'pending' || appt.status === 'confirmed') && (
                                                    <button
                                                        onClick={() => handleStatusChange(appt.id, 'arrived')}
                                                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-300"
                                                    >
                                                        Check In
                                                    </button>
                                                )}
                                                {appt.status === 'arrived' && (
                                                    <button
                                                        onClick={() => handleStatusChange(appt.id, 'in-progress')}
                                                        className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 transition hover:bg-sky-100"
                                                    >
                                                        Start Visit
                                                    </button>
                                                )}
                                                {appt.status === 'in-progress' && (
                                                    <button
                                                        onClick={() => handleStatusChange(appt.id, 'completed')}
                                                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-300"
                                                    >
                                                        Complete
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleStatusChange(appt.id, 'no-show')}
                                                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-300"
                                                >
                                                    No-Show
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(appt.id)}
                                                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 transition hover:bg-rose-100"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Arrivals & Check-In */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900">Arrivals &amp; Check-In</h3>
                        <ul className="mt-4 space-y-3">
                            {appointments
                                .filter((a) => a.status === 'confirmed' || a.status === 'pending' || a.status === 'arrived')
                                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                .slice(0, 5)
                                .map((appt) => (
                                    <li key={appt.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{patientDisplayName(appt)}</p>
                                            <p className="text-xs text-slate-500">{formatISOToTime(appt.start_time)} · {providerDisplayName(appt)}</p>
                                        </div>
                                        {appt.status === 'arrived' ? (
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Checked In</span>
                                        ) : (
                                            <button
                                                onClick={() => handleStatusChange(appt.id, 'arrived')}
                                                className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                                            >
                                                Check In
                                            </button>
                                        )}
                                    </li>
                                ))}
                            {appointments.filter((a) => a.status === 'confirmed' || a.status === 'pending' || a.status === 'arrived').length === 0 && (
                                <li className="py-4 text-center text-sm text-slate-400">No patients waiting</li>
                            )}
                        </ul>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Quick Create Appointment */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900">Quick Create Appointment</h3>
                        <p className="text-xs text-slate-500">Select a patient, provider, and time slot.</p>
                        <form onSubmit={handleCreateAppointment} className="mt-4 space-y-3 text-sm">
                            {/* Patient Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search patient by name..."
                                    value={createForm.patient_display || patientQuery}
                                    onChange={(event) => {
                                        const val = event.target.value;
                                        setPatientQuery(val);
                                        setCreateForm((prev) => ({ ...prev, patient_id: '', patient_display: '' }));
                                        setShowPatientDropdown(true);
                                    }}
                                    onFocus={() => setShowPatientDropdown(true)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label="Search for a patient"
                                    required
                                />
                                {showPatientDropdown && patientResults.length > 0 && !createForm.patient_id && (
                                    <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                                        {patientResults.map((p) => (
                                            <li key={p.id}>
                                                <button
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left hover:bg-slate-50"
                                                    onClick={() => {
                                                        setCreateForm((prev) => ({
                                                            ...prev,
                                                            patient_id: p.id,
                                                            patient_display: `${p.first_name} ${p.last_name}`,
                                                            phone: p.phone ?? '',
                                                        }));
                                                        setShowPatientDropdown(false);
                                                    }}
                                                >
                                                    <span className="font-medium">{p.first_name} {p.last_name}</span>
                                                    {p.phone && <span className="ml-2 text-xs text-slate-400">{p.phone}</span>}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <input
                                type="tel"
                                placeholder="Phone number"
                                value={createForm.phone}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label="Enter phone number"
                            />

                            {/* Provider + Type */}
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={createForm.provider_id}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, provider_id: event.target.value, start_time: '' }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label="Select provider"
                                    required
                                >
                                    <option value="">Provider...</option>
                                    {providers.map((p) => (
                                        <option key={p.id} value={p.id}>Dr. {p.last_name}</option>
                                    ))}
                                </select>
                                <select
                                    value={createForm.appointment_type_id}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, appointment_type_id: event.target.value, start_time: '' }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label="Select appointment type"
                                    required
                                >
                                    <option value="">Type...</option>
                                    {appointmentTypes.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.duration_minutes}m)</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date + Available Time Slot */}
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={createForm.date}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value, start_time: '' }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label="Select appointment date"
                                />
                                <select
                                    value={createForm.start_time}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, start_time: event.target.value }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label="Select available time slot"
                                    required
                                >
                                    <option value="">Time slot...</option>
                                    {availableSlots.map((s) => (
                                        <option key={s.start_time} value={s.start_time}>
                                            {formatISOToTime(s.start_time)}
                                        </option>
                                    ))}
                                    {createForm.provider_id && createForm.appointment_type_id && availableSlots.length === 0 && (
                                        <option value="" disabled>No slots available</option>
                                    )}
                                </select>
                            </div>

                            {/* Language Preference */}
                            <select
                                value={createForm.language_preference}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, language_preference: event.target.value as 'en' | 'es' }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label="Select language preference"
                            >
                                <option value="en">English</option>
                                <option value="es">Español</option>
                            </select>

                            <input
                                type="text"
                                placeholder="Notes (optional)"
                                value={createForm.notes}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label="Enter appointment notes"
                            />

                            <button
                                type="submit"
                                disabled={createBusy}
                                className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                            >
                                {createBusy ? 'Creating...' : 'Add appointment'}
                            </button>

                            {createSuccess && (
                                <p className="rounded-full bg-emerald-100 px-3 py-2 text-center text-xs font-semibold text-emerald-800">
                                    Appointment added to the schedule.
                                </p>
                            )}
                            {createError && (
                                <p className="rounded-full bg-rose-100 px-3 py-2 text-center text-xs font-semibold text-rose-800">
                                    {createError}
                                </p>
                            )}
                        </form>
                    </div>

                    {/* Block Time */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900">Block Time</h3>
                        <p className="text-xs text-slate-500">Block time for meetings, breaks, or equipment changes.</p>
                        <form onSubmit={handleBlockTime} className="mt-4 space-y-3 text-sm">
                            <select
                                value={blockForm.provider_id}
                                onChange={(event) => setBlockForm((prev) => ({ ...prev, provider_id: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label="Select provider to block time"
                                required
                            >
                                <option value="">Select provider...</option>
                                {providers.map((p) => (
                                    <option key={p.id} value={p.id}>Dr. {p.last_name}</option>
                                ))}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="time"
                                    value={blockForm.start}
                                    onChange={(event) => setBlockForm((prev) => ({ ...prev, start: event.target.value }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label="Select block start time"
                                />
                                <input
                                    type="time"
                                    value={blockForm.end}
                                    onChange={(event) => setBlockForm((prev) => ({ ...prev, end: event.target.value }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label="Select block end time"
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Reason for block"
                                value={blockForm.reason}
                                onChange={(event) => setBlockForm((prev) => ({ ...prev, reason: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label="Enter reason for blocking time"
                                required
                            />
                            <button
                                type="submit"
                                disabled={blockBusy}
                                className="w-full rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                            >
                                {blockBusy ? 'Blocking...' : 'Block time'}
                            </button>
                            {blockSuccess && (
                                <p className="rounded-full bg-amber-100 px-3 py-2 text-center text-xs font-semibold text-amber-800">
                                    Time blocked successfully.
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
