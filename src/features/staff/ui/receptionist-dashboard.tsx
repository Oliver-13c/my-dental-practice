'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
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
import { getProviderDisplayName, localizeAppointmentTypeName } from '@/shared/lib/appointment-display';

// ── Helpers ────────────────────────────────────────────────────
function formatISOToTime(iso: string) {
    const d = new Date(iso);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
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
    const locale = useLocale();
    const t = useTranslations('staff');
    const tr = useTranslations('staff.reception');
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
        language_preference: 'es' as 'en' | 'es',
    });
    const [createBusy, setCreateBusy] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [createError, setCreateError] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);

    // Availability for the selected provider + date + type
    const { slots: availableSlots, loading: availabilityLoading } = useAvailability(
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

    const statusLabelByKey: Record<StatusStyle, string> = {
        arrived: tr('status.arrived'),
        'in-progress': tr('status.inProgress'),
        completed: tr('status.completed'),
        'no-show': tr('status.noShow'),
        confirmed: tr('status.confirmed'),
        pending: tr('status.pending'),
        cancelled: tr('status.cancelled'),
    };

    const providerDisplayName = (appt: AppointmentWithDetails) => {
        if (appt.provider) return getProviderDisplayName(appt.provider, locale);
        return t('calendar.unassignedProvider');
    };

    const patientDisplayName = (appt: AppointmentWithDetails) => {
        if (appt.patient) return `${appt.patient.first_name} ${appt.patient.last_name}`;
        return appt.patient_name ?? t('calendar.unknownPatient');
    };

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
        if (!confirm(tr('confirmCancel'))) return;
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
            setCreateError(tr('errors.requiredFields'));
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
            setCreateError(err.message ?? tr('errors.createFailed'));
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
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{tr('header.kicker')}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900 font-serif">{tr('header.title')}</h2>
                    <p className="mt-1 text-sm text-slate-600">{tr('header.description')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                        <span className="text-xs uppercase text-slate-400">{tr('view.label')}</span>
                        <button
                            type="button"
                            onClick={() => setViewMode('day')}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                viewMode === 'day' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            {tr('view.day')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('week')}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                viewMode === 'week' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            {tr('view.week')}
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
                        aria-label={tr('aria.selectDate')}
                    />
                    <select
                        value={providerFilter}
                        onChange={(event) => setProviderFilter(event.target.value)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
                        aria-label={tr('aria.filterByProvider')}
                    >
                        <option value="all">{tr('providers.all')}</option>
                        {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {getProviderDisplayName(p, locale)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{tr('stats.appointments')}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.total}</p>
                    <p className="text-xs text-slate-500">{tr('stats.scheduledToday')}</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{tr('stats.reception')}</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-700">{totals.checkedIn}</p>
                    <p className="text-xs text-slate-500">{tr('stats.inClinicNow')}</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{tr('stats.upcoming')}</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-700">{totals.upcoming}</p>
                    <p className="text-xs text-slate-500">{tr('stats.pendingAndConfirmed')}</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{tr('stats.completed')}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.completed}</p>
                    <p className="text-xs text-slate-500">{tr('stats.completedToday')}</p>
                </div>
            </div>

            {/* Calendar Grid */}
            <ReceptionistCalendar viewMode={viewMode} selectedDate={selectedDate} onDateChange={setSelectedDate} />

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                    {/* Schedule List */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">{t('schedule.title')}</h3>
                            <span className="text-xs uppercase tracking-[0.25em] text-slate-400">{selectedDate}</span>
                        </div>

                        {appointmentsLoading ? (
                            <div className="mt-4 flex items-center justify-center py-8">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                                <span className="ml-3 text-sm text-slate-500">{tr('schedule.loading')}</span>
                            </div>
                        ) : filteredAppointments.length === 0 ? (
                            <div className="mt-4 py-8 text-center text-sm text-slate-400">
                                {tr('schedule.empty')}
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
                                                    {localizeAppointmentTypeName(appt.appointment_type?.name, locale)} · {providerDisplayName(appt)} · {appt.appointment_type?.duration_minutes ?? 30} min
                                                </p>
                                                {appt.notes && (
                                                    <p className="mt-1 text-xs text-slate-400 italic">{appt.notes}</p>
                                                )}
                                            </div>
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(appt.status)}`}>
                                                {statusLabelByKey[appt.status as StatusStyle] ?? appt.status}
                                            </span>
                                        </div>
                                        {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {appt.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleStatusChange(appt.id, 'confirmed')}
                                                        className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-teal-700 transition hover:bg-teal-100"
                                                    >
                                                        {tr('actions.confirm')}
                                                    </button>
                                                )}
                                                {(appt.status === 'pending' || appt.status === 'confirmed') && (
                                                    <button
                                                        onClick={() => handleStatusChange(appt.id, 'arrived')}
                                                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-300"
                                                    >
                                                        {tr('actions.checkIn')}
                                                    </button>
                                                )}
                                                {appt.status === 'arrived' && (
                                                    <button
                                                        onClick={() => handleStatusChange(appt.id, 'in-progress')}
                                                        className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 transition hover:bg-sky-100"
                                                    >
                                                        {tr('actions.startVisit')}
                                                    </button>
                                                )}
                                                {appt.status === 'in-progress' && (
                                                    <button
                                                        onClick={() => handleStatusChange(appt.id, 'completed')}
                                                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-300"
                                                    >
                                                        {tr('actions.complete')}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleStatusChange(appt.id, 'no-show')}
                                                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-300"
                                                >
                                                    {tr('actions.noShow')}
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(appt.id)}
                                                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 transition hover:bg-rose-100"
                                                >
                                                    {tr('actions.cancel')}
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
                        <h3 className="text-lg font-semibold text-slate-900">{tr('arrivals.title')}</h3>
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
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">{tr('arrivals.inReception')}</span>
                                        ) : (
                                            <button
                                                onClick={() => handleStatusChange(appt.id, 'arrived')}
                                                className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                                            >
                                                {tr('actions.checkIn')}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            {appointments.filter((a) => a.status === 'confirmed' || a.status === 'pending' || a.status === 'arrived').length === 0 && (
                                <li className="py-4 text-center text-sm text-slate-400">{tr('arrivals.empty')}</li>
                            )}
                        </ul>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Quick Create Appointment */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900">{tr('create.title')}</h3>
                        <p className="text-xs text-slate-500">{tr('create.description')}</p>
                        <form onSubmit={handleCreateAppointment} className="mt-4 space-y-3 text-sm">
                            {/* Patient Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={tr('create.searchPatientPlaceholder')}
                                    value={createForm.patient_display || patientQuery}
                                    onChange={(event) => {
                                        const val = event.target.value;
                                        setPatientQuery(val);
                                        setCreateForm((prev) => ({ ...prev, patient_id: '', patient_display: '' }));
                                        setShowPatientDropdown(true);
                                    }}
                                    onFocus={() => setShowPatientDropdown(true)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label={tr('aria.searchPatient')}
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
                                placeholder={tr('create.phonePlaceholder')}
                                value={createForm.phone}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label={tr('aria.enterPhone')}
                            />

                            {/* Provider + Type */}
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={createForm.provider_id}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, provider_id: event.target.value, start_time: '' }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label={tr('aria.selectProvider')}
                                    required
                                >
                                    <option value="">{tr('create.providerPlaceholder')}</option>
                                    {providers.map((p) => (
                                        <option key={p.id} value={p.id}>{getProviderDisplayName(p, locale)}</option>
                                    ))}
                                </select>
                                <select
                                    value={createForm.appointment_type_id}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, appointment_type_id: event.target.value, start_time: '' }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label={tr('aria.selectAppointmentType')}
                                    required
                                >
                                    <option value="">{tr('create.typePlaceholder')}</option>
                                    {appointmentTypes.map((t) => (
                                        <option key={t.id} value={t.id}>{localizeAppointmentTypeName(t.name, locale)} ({t.duration_minutes}m)</option>
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
                                    aria-label={tr('aria.selectAppointmentDate')}
                                />
                                <select
                                    value={createForm.start_time}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, start_time: event.target.value }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label={tr('aria.selectAvailableTime')}
                                    required
                                >
                                    <option value="">{tr('create.timePlaceholder')}</option>
                                    {availableSlots.map((s) => (
                                        <option key={s.start_time} value={s.start_time}>
                                            {formatISOToTime(s.start_time)}
                                        </option>
                                    ))}
                                    {availabilityLoading && (
                                        <option value="" disabled>{tr('create.loadingTimes')}</option>
                                    )}
                                    {createForm.provider_id && createForm.appointment_type_id && availableSlots.length === 0 && (
                                        <option value="" disabled>{tr('create.noAvailableTimes')}</option>
                                    )}
                                </select>
                            </div>

                            {/* Language Preference */}
                            <select
                                value={createForm.language_preference}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, language_preference: event.target.value as 'en' | 'es' }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label={tr('aria.selectLanguage')}
                            >
                                <option value="es">{tr('create.languageSpanish')}</option>
                                <option value="en">{tr('create.languageEnglish')}</option>
                            </select>

                            <input
                                type="text"
                                placeholder={tr('create.notesPlaceholder')}
                                value={createForm.notes}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label={tr('aria.enterNotes')}
                            />

                            <button
                                type="submit"
                                disabled={createBusy}
                                className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                            >
                                {createBusy ? tr('create.creating') : tr('create.addAppointment')}
                            </button>

                            {createSuccess && (
                                <p className="rounded-full bg-emerald-100 px-3 py-2 text-center text-xs font-semibold text-emerald-800">
                                    {tr('create.success')}
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
                        <h3 className="text-lg font-semibold text-slate-900">{tr('block.title')}</h3>
                        <p className="text-xs text-slate-500">{tr('block.description')}</p>
                        <form onSubmit={handleBlockTime} className="mt-4 space-y-3 text-sm">
                            <select
                                value={blockForm.provider_id}
                                onChange={(event) => setBlockForm((prev) => ({ ...prev, provider_id: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label={tr('aria.selectProviderForBlock')}
                                required
                            >
                                <option value="">{tr('block.providerPlaceholder')}</option>
                                {providers.map((p) => (
                                    <option key={p.id} value={p.id}>{getProviderDisplayName(p, locale)}</option>
                                ))}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="time"
                                    value={blockForm.start}
                                    onChange={(event) => setBlockForm((prev) => ({ ...prev, start: event.target.value }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label={tr('aria.selectStartTime')}
                                />
                                <input
                                    type="time"
                                    value={blockForm.end}
                                    onChange={(event) => setBlockForm((prev) => ({ ...prev, end: event.target.value }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label={tr('aria.selectEndTime')}
                                />
                            </div>
                            <input
                                type="text"
                                placeholder={tr('block.reasonPlaceholder')}
                                value={blockForm.reason}
                                onChange={(event) => setBlockForm((prev) => ({ ...prev, reason: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label={tr('aria.enterBlockReason')}
                                required
                            />
                            <button
                                type="submit"
                                disabled={blockBusy}
                                className="w-full rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                            >
                                {blockBusy ? tr('block.blocking') : tr('block.submit')}
                            </button>
                            {blockSuccess && (
                                <p className="rounded-full bg-amber-100 px-3 py-2 text-center text-xs font-semibold text-amber-800">
                                    {tr('block.success')}
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
