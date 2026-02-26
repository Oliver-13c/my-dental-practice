'use client';

import { useMemo, useState } from 'react';
import { ReceptionistCalendar } from './receptionist-calendar';

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
}

interface BlockedTime {
    id: string;
    start: string;
    end: string;
    provider: string;
    reason: string;
}

const initialAppointments: Appointment[] = [
    {
        id: 'apt-1',
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
        time: '11:30',
        patient: 'Wes Parker',
        provider: 'Dr. Ross',
        room: 'Room 3',
        duration: 90,
        reason: 'Root canal',
        status: 'scheduled',
    },
];

const initialBlocks: BlockedTime[] = [
    {
        id: 'blk-1',
        start: '12:30',
        end: '13:15',
        provider: 'Dr. Patel',
        reason: 'Team huddle',
    },
    {
        id: 'blk-2',
        start: '15:00',
        end: '15:30',
        provider: 'Hygiene',
        reason: 'Sterilization',
    },
];

const waitlist = [
    { id: 'wl-1', name: 'Dani Lopez', preference: 'Anytime after 2:00 PM', reason: 'Tooth pain' },
    { id: 'wl-2', name: 'Erica Hughes', preference: 'Morning only', reason: 'Crown recement' },
    { id: 'wl-3', name: 'Noah Bennett', preference: 'First available', reason: 'Consult' },
];

function formatTime(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function statusBadge(status: AppointmentStatus) {
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

export function ReceptionistDashboard() {
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
    const [providerFilter, setProviderFilter] = useState('all');
    const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
    const [blocks, setBlocks] = useState<BlockedTime[]>(initialBlocks);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [blockSuccess, setBlockSuccess] = useState(false);
    const [createForm, setCreateForm] = useState({
        patient: '',
        phone: '',
        provider: 'Dr. Patel',
        date: selectedDate,
        time: '09:00',
        duration: 30,
        reason: '',
    });
    const [blockForm, setBlockForm] = useState({
        provider: 'Dr. Patel',
        start: '12:00',
        end: '12:30',
        reason: '',
    });

    const filteredAppointments = useMemo(() => {
        const filtered = providerFilter === 'all'
            ? appointments
            : appointments.filter((appt) => appt.provider === providerFilter);
        return [...filtered].sort((a, b) => a.time.localeCompare(b.time));
    }, [appointments, providerFilter]);

    const totals = useMemo(() => {
        const checkedIn = appointments.filter((appt) => appt.status === 'arrived' || appt.status === 'in-room').length;
        const totalSlots = 16;
        const openSlots = Math.max(totalSlots - appointments.length - blocks.length, 0);
        return {
            total: appointments.length,
            checkedIn,
            waitlist: waitlist.length,
            openSlots,
        };
    }, [appointments, blocks.length]);

    function handleCreateAppointment(event: React.FormEvent) {
        event.preventDefault();
        if (!createForm.patient || !createForm.reason || !createForm.time) {
            return;
        }

        const newAppointment: Appointment = {
            id: `apt-${Date.now()}`,
            time: createForm.time,
            patient: createForm.patient,
            provider: createForm.provider,
            room: createForm.provider === 'Hygiene' ? 'Room 4' : 'Room 2',
            duration: Number(createForm.duration),
            reason: createForm.reason,
            status: 'scheduled',
        };

        setAppointments((prev) => [...prev, newAppointment]);
        setCreateSuccess(true);
        setTimeout(() => setCreateSuccess(false), 2000);
        setCreateForm((prev) => ({
            ...prev,
            patient: '',
            phone: '',
            reason: '',
        }));
    }

    function handleBlockTime(event: React.FormEvent) {
        event.preventDefault();
        if (!blockForm.reason || !blockForm.start || !blockForm.end) {
            return;
        }

        setBlocks((prev) => [
            ...prev,
            {
                id: `blk-${Date.now()}`,
                start: blockForm.start,
                end: blockForm.end,
                provider: blockForm.provider,
                reason: blockForm.reason,
            },
        ]);
        setBlockSuccess(true);
        setTimeout(() => setBlockSuccess(false), 2000);
        setBlockForm((prev) => ({ ...prev, reason: '' }));
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
                        <option value="Dr. Patel">Dr. Patel</option>
                        <option value="Dr. Ross">Dr. Ross</option>
                        <option value="Hygiene">Hygiene</option>
                    </select>
                </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Appointments</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.total}</p>
                    <p className="text-xs text-slate-500">Scheduled for {viewMode === 'day' ? 'today' : 'this week'}</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Checked In</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-700">{totals.checkedIn}</p>
                    <p className="text-xs text-slate-500">Waiting to be seated</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Open Slots</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-700">{totals.openSlots}</p>
                    <p className="text-xs text-slate-500">Ready for quick fills</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Waitlist</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.waitlist}</p>
                    <p className="text-xs text-slate-500">Patients awaiting a slot</p>
                </div>
            </div>

            {/* Calendar Grid - New Section */}
            <ReceptionistCalendar viewMode={viewMode} selectedDate={selectedDate} onDateChange={setSelectedDate} />

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">Schedule</h3>
                            <span className="text-xs uppercase tracking-[0.25em] text-slate-400">{selectedDate}</span>
                        </div>
                        <div className="mt-4 space-y-3">
                            {filteredAppointments.map((appt) => (
                                <div
                                    key={appt.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {formatTime(appt.time)} · {appt.patient}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {appt.reason} · {appt.provider} · {appt.room} · {appt.duration} min
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(appt.status)}`}>
                                            {appt.status.replace('-', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-300">
                                            Check In
                                        </button>
                                        <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-300">
                                            Reschedule
                                        </button>
                                        <button className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 transition hover:bg-rose-100">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900">Arrivals & Check-In</h3>
                            <ul className="mt-4 space-y-3">
                                {appointments.slice(0, 3).map((appt) => (
                                    <li key={appt.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{appt.patient}</p>
                                            <p className="text-xs text-slate-500">{formatTime(appt.time)} · {appt.provider}</p>
                                        </div>
                                        {appt.status === 'arrived' ? (
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Checked In</span>
                                        ) : (
                                            <button className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                                                Check In
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900">Waitlist</h3>
                            <ul className="mt-4 space-y-3">
                                {waitlist.map((entry) => (
                                    <li key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                        <p className="text-sm font-semibold text-slate-900">{entry.name}</p>
                                        <p className="text-xs text-slate-500">{entry.reason} · {entry.preference}</p>
                                        <button className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                            Offer next opening
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900">Quick Create Appointment</h3>
                        <p className="text-xs text-slate-500">Capture new requests and drop them into the schedule.</p>
                        <form onSubmit={handleCreateAppointment} className="mt-4 space-y-3 text-sm">
                            <input
                                type="text"
                                placeholder="Patient name"
                                value={createForm.patient}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, patient: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label="Enter patient name"
                                required
                            />
                            <input
                                type="tel"
                                placeholder="Phone number"
                                value={createForm.phone}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label="Enter phone number"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={createForm.date}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label="Select appointment date"
                                />
                                <input
                                    type="time"
                                    value={createForm.time}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, time: event.target.value }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label="Select appointment time"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={createForm.provider}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, provider: event.target.value }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label="Select provider for appointment"
                                >
                                    <option value="Dr. Patel">Dr. Patel</option>
                                    <option value="Dr. Ross">Dr. Ross</option>
                                    <option value="Hygiene">Hygiene</option>
                                </select>
                                <select
                                    value={createForm.duration}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, duration: Number(event.target.value) }))}
                                    className="rounded-xl border border-slate-200 px-3 py-2"
                                    aria-label="Select appointment duration"
                                >
                                    <option value={30}>30 min</option>
                                    <option value={45}>45 min</option>
                                    <option value={60}>60 min</option>
                                    <option value={90}>90 min</option>
                                </select>
                            </div>
                            <input
                                type="text"
                                placeholder="Reason for visit"
                                value={createForm.reason}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, reason: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label="Enter reason for visit"
                                required
                            />
                            <button
                                type="submit"
                                className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Add appointment
                            </button>
                            {createSuccess && (
                                <p className="rounded-full bg-emerald-100 px-3 py-2 text-center text-xs font-semibold text-emerald-800">
                                    Appointment added to the schedule.
                                </p>
                            )}
                        </form>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900">Availability Controls</h3>
                        <p className="text-xs text-slate-500">Block time for meetings, breaks, or equipment changes.</p>
                        <form onSubmit={handleBlockTime} className="mt-4 space-y-3 text-sm">
                            <select
                                value={blockForm.provider}
                                onChange={(event) => setBlockForm((prev) => ({ ...prev, provider: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                                aria-label="Select provider to block time"
                            >
                                <option value="Dr. Patel">Dr. Patel</option>
                                <option value="Dr. Ross">Dr. Ross</option>
                                <option value="Hygiene">Hygiene</option>
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
                                className="w-full rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Block time
                            </button>
                            {blockSuccess && (
                                <p className="rounded-full bg-amber-100 px-3 py-2 text-center text-xs font-semibold text-amber-800">
                                    Time blocked successfully.
                                </p>
                            )}
                        </form>
                        <div className="mt-4 space-y-2 text-xs">
                            {blocks.map((block) => (
                                <div key={block.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                    <div>
                                        <p className="font-semibold text-slate-800">{block.provider}</p>
                                        <p className="text-slate-500">{formatTime(block.start)} - {formatTime(block.end)} · {block.reason}</p>
                                    </div>
                                    <button className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
