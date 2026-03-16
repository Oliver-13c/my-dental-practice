'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { Card } from '@/shared/ui/card';

interface StaffMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_sign_in_at?: string;
}

interface ScheduleRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const CLINICAL_ROLES = new Set(['dentist', 'hygienist']);

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
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedScheduleMember, setSelectedScheduleMember] = useState<StaffMember | null>(null);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(buildDefaultSchedule());
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);

  const dayLabels = [
    t('days.sunday'),
    t('days.monday'),
    t('days.tuesday'),
    t('days.wednesday'),
    t('days.thursday'),
    t('days.friday'),
    t('days.saturday'),
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
      setStaff(json.data || []);
    } catch {
      setStaff([]);
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search, t]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const loadSchedule = useCallback(async (member: StaffMember) => {
    setSelectedScheduleMember(member);
    setScheduleLoading(true);
    setScheduleError(null);
    setScheduleSuccess(null);

    try {
      const res = await fetch(`/api/providers/${member.id}/schedule`);
      if (!res.ok) {
        throw new Error('Failed to fetch schedule');
      }

      const json = await res.json();
      setScheduleRows(mergeScheduleRows(json.data?.schedules));
    } catch {
      setScheduleRows(buildDefaultSchedule());
      setScheduleError(t('scheduleLoadError'));
    } finally {
      setScheduleLoading(false);
    }
  }, [t]);

  const updateScheduleRow = useCallback((dayOfWeek: number, updates: Partial<ScheduleRow>) => {
    setScheduleRows((current) =>
      current.map((row) => (row.day_of_week === dayOfWeek ? { ...row, ...updates } : row))
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

      if (!res.ok) {
        throw new Error('Failed to save schedule');
      }

      setScheduleSuccess(t('scheduleSaved'));
    } catch {
      setScheduleError(t('scheduleSaveError'));
    } finally {
      setScheduleSaving(false);
    }
  }, [scheduleRows, selectedScheduleMember, t]);

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
      alert(t('error'));
    }
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      dentist: t('dentistLabel'),
      hygienist: t('hygienistLabel'),
      receptionist: t('receptionistLabel'),
      admin: t('users.form.roleAdmin'),
    };
    return map[role] || role;
  };

  const closeScheduleEditor = useCallback(() => {
    setSelectedScheduleMember(null);
    setScheduleError(null);
    setScheduleSuccess(null);
    setScheduleRows(buildDefaultSchedule());
  }, []);

  const totalProviders = staff.filter((s) => s.role === 'dentist' || s.role === 'hygienist').length;
  const activeProviders = staff.filter(
    (s) => (s.role === 'dentist' || s.role === 'hygienist') && s.is_active
  ).length;
  const receptionists = staff.filter((s) => s.role === 'receptionist').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('staffManagement')}</h1>
          <p className="text-gray-600">{t('staffDescription')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-600">{t('totalProviders')}</p>
            <p className="text-2xl font-bold text-gray-900">{totalProviders}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">{t('activeProviders')}</p>
            <p className="text-2xl font-bold text-green-600">{activeProviders}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">{t('totalReceptionists')}</p>
            <p className="text-2xl font-bold text-gray-900">{receptionists}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              aria-label={t('role')}
            >
              <option value="all">{t('all')} — {t('role')}</option>
              <option value="dentist">{t('dentistLabel')}</option>
              <option value="hygienist">{t('hygienistLabel')}</option>
              <option value="receptionist">{t('receptionistLabel')}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              aria-label={t('status')}
            >
              <option value="all">{t('all')} — {t('status')}</option>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>
        </Card>

        {/* Table */}
        {error ? (
          <Card className="p-6 text-center">
            <p className="mb-3 text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={fetchStaff}
              className="inline-flex items-center rounded-md border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              {t('retry')}
            </button>
          </Card>
        ) : loading ? (
          <Card className="p-8 text-center text-gray-500">{t('loading')}</Card>
        ) : staff.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">{t('noData')}</Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('email')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('lastLogin')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            member.role === 'dentist'
                              ? 'bg-purple-100 text-purple-700'
                              : member.role === 'hygienist'
                              ? 'bg-cyan-100 text-cyan-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {roleLabel(member.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            member.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {member.is_active ? t('active') : t('inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.last_sign_in_at
                          ? new Date(member.last_sign_in_at).toLocaleDateString()
                          : t('neverLoggedIn')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <a
                          href={`/admin/users/${member.id}`}
                          className="text-blue-600 hover:underline mr-3"
                        >
                          {t('edit')}
                        </a>
                        {CLINICAL_ROLES.has(member.role) && (
                          <button
                            onClick={() => {
                              if (selectedScheduleMember?.id === member.id) {
                                closeScheduleEditor();
                                return;
                              }
                              loadSchedule(member);
                            }}
                            className="mr-3 text-slate-700 hover:text-slate-900 hover:underline"
                          >
                            {selectedScheduleMember?.id === member.id ? t('closeSchedule') : t('editSchedule')}
                          </button>
                        )}
                        <button
                          onClick={() => toggleActive(member)}
                          className={`${
                            member.is_active
                              ? 'text-red-600 hover:text-red-800'
                              : 'text-green-600 hover:text-green-800'
                          } hover:underline`}
                        >
                          {member.is_active ? t('deactivate') : t('activate')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {selectedScheduleMember && CLINICAL_ROLES.has(selectedScheduleMember.role) && (
          <Card className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('scheduleEditorTitle')} · {selectedScheduleMember.first_name} {selectedScheduleMember.last_name}
                </h2>
                <p className="text-sm text-gray-600">{t('scheduleEditorDescription')}</p>
                <p className="mt-1 text-xs text-gray-500">{t('scheduleDefaultHint')}</p>
              </div>
              <button
                onClick={closeScheduleEditor}
                className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {t('closeSchedule')}
              </button>
            </div>

            {scheduleError && <p className="mt-4 text-sm text-red-700">{scheduleError}</p>}
            {scheduleSuccess && <p className="mt-4 text-sm text-green-700">{scheduleSuccess}</p>}

            {scheduleLoading ? (
              <p className="mt-4 text-sm text-gray-500">{t('scheduleLoading')}</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('scheduleDay')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('scheduleAvailable')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('scheduleStart')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('scheduleEnd')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {scheduleRows.map((row) => (
                      <tr key={row.day_of_week}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{dayLabels[row.day_of_week]}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={row.is_active}
                            onChange={(event) => updateScheduleRow(row.day_of_week, { is_active: event.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                            aria-label={`${t('scheduleAvailable')} ${dayLabels[row.day_of_week]}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <input
                            type="time"
                            value={row.start_time}
                            disabled={!row.is_active}
                            onChange={(event) => updateScheduleRow(row.day_of_week, { start_time: event.target.value })}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                            aria-label={`${t('scheduleStart')} ${dayLabels[row.day_of_week]}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <input
                            type="time"
                            value={row.end_time}
                            disabled={!row.is_active}
                            onChange={(event) => updateScheduleRow(row.day_of_week, { end_time: event.target.value })}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                            aria-label={`${t('scheduleEnd')} ${dayLabels[row.day_of_week]}`}
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
                className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {scheduleSaving ? t('scheduleSaving') : t('scheduleSave')}
              </button>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
