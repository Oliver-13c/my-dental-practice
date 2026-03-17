'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Activity, ChevronDown, Search, Stethoscope, UserPlus, Users } from 'lucide-react';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

type StaffRole = 'dentist' | 'hygienist' | 'receptionist' | 'admin';
type RoleFilter = StaffRole | 'all';
type StatusFilter = 'all' | 'active' | 'inactive';

interface StaffMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_sign_in_at?: string;
}

interface RawStaffMember extends Omit<StaffMember, 'role'> {
  role: string;
}

interface ScheduleRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const CLINICAL_ROLES = new Set<StaffRole>(['dentist', 'hygienist']);

const ROLE_OPTIONS: Array<{ value: RoleFilter; fallback: string; labelKey: string }> = [
  { value: 'all', fallback: 'All - Role', labelKey: 'all' },
  { value: 'dentist', fallback: 'Dentist', labelKey: 'dentistLabel' },
  { value: 'hygienist', fallback: 'Hygienist', labelKey: 'hygienistLabel' },
  { value: 'receptionist', fallback: 'Receptionist', labelKey: 'receptionistLabel' },
  { value: 'admin', fallback: 'Admin', labelKey: 'users.form.roleAdmin' },
];

const STATUS_OPTIONS: Array<{ value: StatusFilter; fallback: string; labelKey: string }> = [
  { value: 'all', fallback: 'All - Status', labelKey: 'all' },
  { value: 'active', fallback: 'Active', labelKey: 'active' },
  { value: 'inactive', fallback: 'Inactive', labelKey: 'inactive' },
];

function normalizeRole(role: string): StaffRole {
  if (role === 'dentist' || role === 'hygienist' || role === 'receptionist' || role === 'admin') {
    return role;
  }
  return 'receptionist';
}

function buildDefaultSchedule(): ScheduleRow[] {
  return Array.from({ length: 7 }, (_, day_of_week) => ({
    day_of_week,
    start_time: '08:00',
    end_time: '17:00',
    is_active: day_of_week >= 1 && day_of_week <= 5,
  }));
}

function mergeScheduleRows(rows: ScheduleRow[] | undefined): ScheduleRow[] {
  const defaults = buildDefaultSchedule();
  const byDay = new Map((rows ?? []).map((row) => [row.day_of_week, row]));
  return defaults.map((row) => byDay.get(row.day_of_week) ?? row);
}

export default function StaffPage() {
  const t = useTranslations('admin');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedScheduleMember, setSelectedScheduleMember] = useState<StaffMember | null>(null);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(buildDefaultSchedule());
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);

  const tx = useCallback(
    (key: string, fallback: string, values?: Record<string, string | number>) => {
      try {
        return values ? t(key as never, values as never) : t(key as never);
      } catch {
        return fallback;
      }
    },
    [t],
  );

  const dayLabels = [
    tx('days.sunday', 'Sunday'),
    tx('days.monday', 'Monday'),
    tx('days.tuesday', 'Tuesday'),
    tx('days.wednesday', 'Wednesday'),
    tx('days.thursday', 'Thursday'),
    tx('days.friday', 'Friday'),
    tx('days.saturday', 'Saturday'),
  ];

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('active', statusFilter === 'active' ? 'true' : 'false');
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const json = await res.json();
      const rows: RawStaffMember[] = Array.isArray(json.data) ? (json.data as RawStaffMember[]) : [];
      const typedRows: StaffMember[] = rows.map((row: RawStaffMember) => ({
        ...row,
        role: normalizeRole(row.role),
      }));
      setStaff(typedRows);
    } catch {
      setStaff([]);
      setError(tx('error', 'Could not load staff data.'));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search, tx]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const loadSchedule = useCallback(
    async (member: StaffMember) => {
      setSelectedScheduleMember(member);
      setScheduleLoading(true);
      setScheduleError(null);
      setScheduleSuccess(null);

      try {
        const res = await fetch(`/api/providers/${member.id}/schedule`);
        if (!res.ok) throw new Error('Failed to fetch schedule');

        const json = await res.json();
        setScheduleRows(mergeScheduleRows(json.data?.schedules));
      } catch {
        setScheduleRows(buildDefaultSchedule());
        setScheduleError(tx('scheduleLoadError', 'Could not load provider schedule.'));
      } finally {
        setScheduleLoading(false);
      }
    },
    [tx],
  );

  const updateScheduleRow = useCallback((dayOfWeek: number, updates: Partial<ScheduleRow>) => {
    setScheduleRows((current) =>
      current.map((row) => (row.day_of_week === dayOfWeek ? { ...row, ...updates } : row)),
    );
  }, []);

  const saveSchedule = useCallback(async () => {
    if (!selectedScheduleMember) return;

    setScheduleSaving(true);
    setScheduleError(null);
    setScheduleSuccess(null);

    try {
      const payload = {
        schedules: scheduleRows.map((row) => ({
          day_of_week: row.day_of_week,
          start_time: row.start_time,
          end_time: row.end_time,
          is_active: row.is_active,
        })),
      };

      const res = await fetch(`/api/providers/${selectedScheduleMember.id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save schedule');
      setScheduleSuccess(tx('scheduleSaved', 'Schedule updated successfully.'));
    } catch {
      setScheduleError(tx('scheduleSaveError', 'Could not save provider schedule.'));
    } finally {
      setScheduleSaving(false);
    }
  }, [scheduleRows, selectedScheduleMember, tx]);

  const closeScheduleEditor = useCallback(() => {
    setSelectedScheduleMember(null);
    setScheduleError(null);
    setScheduleSuccess(null);
    setScheduleRows(buildDefaultSchedule());
  }, []);

  const toggleActive = async (member: StaffMember) => {
    try {
      const res = await fetch(`/api/admin/users/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchStaff();
    } catch {
      alert(tx('error', 'Could not load staff data.'));
    }
  };

  const roleLabel = (role: StaffRole) => {
    const labels: Record<StaffRole, string> = {
      dentist: tx('dentistLabel', 'Dentist'),
      hygienist: tx('hygienistLabel', 'Hygienist'),
      receptionist: tx('receptionistLabel', 'Receptionist'),
      admin: tx('users.form.roleAdmin', 'Admin'),
    };
    return labels[role];
  };

  const totalProviders = staff.filter((s) => s.role === 'dentist' || s.role === 'hygienist').length;
  const activeProviders = staff.filter(
    (s) => (s.role === 'dentist' || s.role === 'hygienist') && s.is_active,
  ).length;
  const receptionists = staff.filter((s) => s.role === 'receptionist').length;
  const activeStaff = staff.filter((s) => s.is_active).length;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div className="sticky top-16 z-30 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {tx('staffManagement', 'Staff Management')}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {tx('staffDescription', 'Manage staff schedules and assignments')}
              </p>
            </div>
            <Link
              href="/admin/users/create"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Nuevo Miembro
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="rounded-xl border-slate-200 bg-white p-5">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Stethoscope className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-500">{tx('totalProviders', 'Total Providers')}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{totalProviders}</p>
            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              +{Math.max(1, totalProviders)} este mes
            </span>
          </Card>

          <Card className="rounded-xl border-slate-200 bg-white p-5">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Activity className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-500">{tx('activeProviders', 'Active Providers')}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{activeProviders}</p>
            <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              +{activeStaff} online
            </span>
          </Card>

          <Card className="rounded-xl border-slate-200 bg-white p-5">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-500">{tx('totalReceptionists', 'Receptionists')}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{receptionists}</p>
            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              Equipo administrativo
            </span>
          </Card>
        </div>

        <Card className="rounded-xl border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="w-full md:max-w-md">
              <Input
                type="text"
                placeholder={tx('search', 'Search')}
                leadingIcon={<Search className="h-4 w-4" />}
                inputSize="lg"
                className="border-slate-300"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <label className="relative min-w-[220px] flex-1 md:max-w-xs">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                className="h-11 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                aria-label={tx('role', 'Role')}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value === 'all'
                      ? `${tx('all', 'All')} - ${tx('role', 'Role')}`
                      : tx(option.labelKey, option.fallback)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </label>

            <label className="relative min-w-[220px] flex-1 md:max-w-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="h-11 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                aria-label={tx('status', 'Status')}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value === 'all'
                      ? `${tx('all', 'All')} - ${tx('status', 'Status')}`
                      : tx(option.labelKey, option.fallback)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </label>
          </div>
        </Card>

        {error ? (
          <Card className="rounded-xl border-red-200 bg-white p-6 text-center">
            <p className="mb-3 text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={fetchStaff}
              className="inline-flex h-11 items-center rounded-md border border-blue-200 px-4 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              {tx('retry', 'Retry')}
            </button>
          </Card>
        ) : loading ? (
          <Card className="rounded-xl border-slate-200 bg-white p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    {Array.from({ length: 6 }).map((_, col) => (
                      <th key={col} className="px-4 py-3">
                        <Skeleton className="h-3 w-20" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, row) => (
                    <tr key={row}>
                      {Array.from({ length: 6 }).map((_, col) => (
                        <td key={`${row}-${col}`} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : staff.length === 0 ? (
          <Card className="rounded-xl border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto max-w-md space-y-3">
              <p className="text-lg font-semibold text-slate-900">{tx('noData', 'No staff members found.')}</p>
              <p className="text-sm text-slate-600">Aun no hay personal registrado en la practica.</p>
              <Link
                href="/admin/users/create"
                className="mx-auto inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                Agregar personal
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-xl border-slate-200 bg-white p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {tx('name', 'Name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {tx('email', 'Email')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {tx('role', 'Role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {tx('status', 'Status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {tx('lastLogin', 'Last Login')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {tx('actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                            {member.first_name?.[0]}
                            {member.last_name?.[0]}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-slate-900">
                              {member.first_name} {member.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{member.email}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {roleLabel(member.role)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            member.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {member.is_active ? tx('active', 'Active') : tx('inactive', 'Inactive')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {member.last_sign_in_at
                          ? new Date(member.last_sign_in_at).toLocaleDateString()
                          : tx('neverLoggedIn', 'Never')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/users/${member.id}`}
                            className="inline-flex h-11 items-center rounded-md border border-slate-300 px-3 text-slate-700 transition hover:bg-slate-100"
                          >
                            {tx('edit', 'Edit')}
                          </Link>

                          {CLINICAL_ROLES.has(member.role) && (
                            <button
                              onClick={() => {
                                if (selectedScheduleMember?.id === member.id) {
                                  closeScheduleEditor();
                                  return;
                                }
                                loadSchedule(member);
                              }}
                              className="inline-flex h-11 items-center rounded-md border border-slate-300 px-3 text-slate-700 transition hover:bg-slate-100"
                            >
                              {selectedScheduleMember?.id === member.id
                                ? tx('closeSchedule', 'Close Schedule')
                                : tx('editSchedule', 'Edit Schedule')}
                            </button>
                          )}

                          <button
                            onClick={() => toggleActive(member)}
                            className={`inline-flex h-11 items-center rounded-md px-3 text-sm font-medium transition ${
                              member.is_active
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {member.is_active ? tx('deactivate', 'Deactivate') : tx('activate', 'Activate')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {selectedScheduleMember && CLINICAL_ROLES.has(selectedScheduleMember.role) && (
          <Card className="rounded-xl border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {tx('scheduleEditorTitle', 'Weekly Schedule')} - {selectedScheduleMember.first_name}{' '}
                  {selectedScheduleMember.last_name}
                </h2>
                <p className="text-sm text-slate-600">
                  {tx('scheduleEditorDescription', 'Set the provider working hours used for appointment availability.')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {tx('scheduleDefaultHint', 'New providers default to Monday-Friday, 8:00 AM to 5:00 PM.')}
                </p>
              </div>
              <button
                onClick={closeScheduleEditor}
                className="inline-flex h-11 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {tx('closeSchedule', 'Close Schedule')}
              </button>
            </div>

            {scheduleError && <p className="mt-4 text-sm text-red-700">{scheduleError}</p>}
            {scheduleSuccess && <p className="mt-4 text-sm text-emerald-700">{scheduleSuccess}</p>}

            {scheduleLoading ? (
              <div className="mt-4 grid gap-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                        {tx('scheduleDay', 'Day')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                        {tx('scheduleAvailable', 'Available')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                        {tx('scheduleStart', 'Start')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                        {tx('scheduleEnd', 'End')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {scheduleRows.map((row) => (
                      <tr key={row.day_of_week}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{dayLabels[row.day_of_week]}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={row.is_active}
                            onChange={(event) =>
                              updateScheduleRow(row.day_of_week, { is_active: event.target.checked })
                            }
                            className="h-4 w-4 rounded border-slate-300"
                            aria-label={`${tx('scheduleAvailable', 'Available')} ${dayLabels[row.day_of_week]}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <input
                            type="time"
                            value={row.start_time}
                            disabled={!row.is_active}
                            onChange={(event) =>
                              updateScheduleRow(row.day_of_week, { start_time: event.target.value })
                            }
                            className="h-11 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                            aria-label={`${tx('scheduleStart', 'Start')} ${dayLabels[row.day_of_week]}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <input
                            type="time"
                            value={row.end_time}
                            disabled={!row.is_active}
                            onChange={(event) => updateScheduleRow(row.day_of_week, { end_time: event.target.value })}
                            className="h-11 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                            aria-label={`${tx('scheduleEnd', 'End')} ${dayLabels[row.day_of_week]}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveSchedule}
                disabled={scheduleLoading || scheduleSaving}
                className="inline-flex h-11 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {scheduleSaving ? tx('scheduleSaving', 'Saving...') : tx('scheduleSave', 'Save Schedule')}
              </button>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
