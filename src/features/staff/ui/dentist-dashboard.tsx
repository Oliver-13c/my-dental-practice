'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  useAppointments,
  updateAppointment,
} from '../hooks/use-appointments-data';
import type { AppointmentWithDetails } from '@/entities/appointment/model/appointment.types';

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
        case 'arrived': return 'bg-emerald-100 text-emerald-800';
        case 'in-progress': return 'bg-sky-100 text-sky-800';
        case 'completed': return 'bg-slate-100 text-slate-700';
        case 'no-show': return 'bg-rose-100 text-rose-800';
        case 'confirmed': return 'bg-teal-100 text-teal-800';
        case 'cancelled': return 'bg-gray-100 text-gray-500';
        default: return 'bg-amber-100 text-amber-800';
    }
}

function patientName(appt: AppointmentWithDetails) {
    if (appt.patient) return `${appt.patient.first_name} ${appt.patient.last_name}`;
    return appt.patient_name ?? 'Unknown';
}

export function DentistDashboard() {
    const { data: session } = useSession();
    const today = new Date().toISOString().slice(0, 10);
    const [selectedDate] = useState(today);

    // Attempt to get provider_id from session (staff_profiles.id)
    const providerId = (session?.user as any)?.staffProfileId ?? null;

    const { appointments, loading, refetch } = useAppointments({
        date: selectedDate,
        ...(providerId ? { provider_id: providerId } : {}),
    });

    const activeAppointments = useMemo(
        () => appointments
            .filter((a) => a.status !== 'cancelled')
            .sort((a, b) => a.start_time.localeCompare(b.start_time)),
        [appointments],
    );

    const stats = useMemo(() => ({
        total: activeAppointments.length,
        waiting: activeAppointments.filter((a) => a.status === 'arrived').length,
        inProgress: activeAppointments.filter((a) => a.status === 'in-progress').length,
        completed: activeAppointments.filter((a) => a.status === 'completed').length,
    }), [activeAppointments]);

    async function handleStatus(id: string, status: string) {
        try {
            await updateAppointment(id, { status });
            refetch();
        } catch (err) {
            console.error('Status update failed:', err);
        }
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-blue-600">Today&apos;s Patients</p>
                    <p className="mt-2 text-2xl font-semibold text-blue-900">{stats.total}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-emerald-600">Waiting</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-900">{stats.waiting}</p>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-sky-600">In Progress</p>
                    <p className="mt-2 text-2xl font-semibold text-sky-900">{stats.inProgress}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-700">{stats.completed}</p>
                </div>
            </div>

            {/* Schedule */}
            <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-blue-800 mb-4">Today&apos;s Schedule</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
                        <span className="ml-3 text-sm text-blue-500">Loading schedule...</span>
                    </div>
                ) : activeAppointments.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No appointments scheduled for today.</p>
                ) : (
                    <ul className="space-y-3">
                        {activeAppointments.map((appt) => (
                            <li
                                key={appt.id}
                                className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:shadow-md"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {formatTime(appt.start_time)} — {patientName(appt)}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {appt.appointment_type?.name ?? 'General'} · {appt.appointment_type?.duration_minutes ?? 30} min
                                        </p>
                                        {appt.notes && (
                                            <p className="mt-1 text-xs text-slate-400 italic">{appt.notes}</p>
                                        )}
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(appt.status)}`}>
                                        {appt.status.replace('-', ' ')}
                                    </span>
                                </div>

                                {appt.status !== 'completed' && appt.status !== 'no-show' && (
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {appt.status === 'arrived' && (
                                            <button
                                                onClick={() => handleStatus(appt.id, 'in-progress')}
                                                className="rounded-full bg-sky-600 px-3 py-1 text-white hover:bg-sky-700"
                                            >
                                                Start Visit
                                            </button>
                                        )}
                                        {appt.status === 'in-progress' && (
                                            <button
                                                onClick={() => handleStatus(appt.id, 'completed')}
                                                className="rounded-full bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700"
                                            >
                                                Complete Visit
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleStatus(appt.id, 'no-show')}
                                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 hover:border-slate-300"
                                        >
                                            No-Show
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
