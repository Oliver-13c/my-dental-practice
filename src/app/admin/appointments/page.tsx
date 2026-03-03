'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { Card } from '@/shared/ui/card';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  patient?: { id: string; first_name: string; last_name: string; email?: string; phone?: string };
  provider?: { id: string; first_name: string; last_name: string; role: string };
  appointment_type?: { id: string; name: string; duration_minutes: number; color?: string };
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
  arrived: 'bg-teal-100 text-teal-700',
};

export default function AppointmentsPage() {
  const t = useTranslations('admin');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('day');

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();

      if (dateRange === 'day') {
        params.set('date', dateFilter);
      } else {
        const start = new Date(dateFilter);
        const end = new Date(dateFilter);
        if (dateRange === 'week') end.setDate(end.getDate() + 7);
        if (dateRange === 'month') end.setMonth(end.getMonth() + 1);
        params.set('startDate', start.toISOString().split('T')[0]);
        params.set('endDate', end.toISOString().split('T')[0]);
      }

      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/appointments?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setAppointments(json.data || []);
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [dateFilter, dateRange, statusFilter, t]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      scheduled: t('pending'),
      confirmed: t('confirmed'),
      in_progress: t('inProgress'),
      completed: t('completed'),
      cancelled: t('cancelled'),
      no_show: t('noShow'),
      arrived: t('arrived'),
    };
    return map[status] || status;
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      fetchAppointments();
    } catch {
      alert(t('error'));
    }
  };

  const statusCounts = appointments.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('appointmentsManagement')}</h1>
          <p className="text-gray-600">{t('appointmentsDescription')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-600">{t('total')}</p>
            <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">{t('confirmed')}</p>
            <p className="text-2xl font-bold text-green-600">{statusCounts['confirmed'] || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">{t('pending')}</p>
            <p className="text-2xl font-bold text-blue-600">{statusCounts['scheduled'] || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">{t('cancelled')}</p>
            <p className="text-2xl font-bold text-red-600">{statusCounts['cancelled'] || 0}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="flex rounded-md border border-gray-300 overflow-hidden">
              {(['day', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-2 text-sm ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {range === 'day' ? t('today') : range === 'week' ? t('thisWeek') : t('thisMonth')}
                </button>
              ))}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">{t('all')} — {t('status')}</option>
              <option value="scheduled">{t('pending')}</option>
              <option value="confirmed">{t('confirmed')}</option>
              <option value="in_progress">{t('inProgress')}</option>
              <option value="completed">{t('completed')}</option>
              <option value="cancelled">{t('cancelled')}</option>
              <option value="no_show">{t('noShow')}</option>
            </select>
          </div>
        </Card>

        {/* Table */}
        {loading ? (
          <Card className="p-8 text-center text-gray-500">{t('loading')}</Card>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button onClick={fetchAppointments} className="text-blue-600 hover:underline text-sm">
              {t('retry')}
            </button>
          </Card>
        ) : appointments.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">{t('noData')}</Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('time')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('patient')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('provider')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('status')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <p className="font-medium text-gray-900">
                          {new Date(appt.start_time).toLocaleDateString()}
                        </p>
                        <p className="text-gray-500">
                          {new Date(appt.start_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{' '}
                          {new Date(appt.end_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <p className="font-medium text-gray-900">
                          {appt.patient
                            ? `${appt.patient.first_name} ${appt.patient.last_name}`
                            : '—'}
                        </p>
                        {appt.patient?.phone && (
                          <p className="text-gray-500 text-xs">{appt.patient.phone}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {appt.provider
                          ? `${appt.provider.first_name} ${appt.provider.last_name}`
                          : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {appt.appointment_type?.name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            STATUS_COLORS[appt.status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {statusLabel(appt.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {appt.status === 'scheduled' && (
                          <button
                            onClick={() => updateStatus(appt.id, 'confirmed')}
                            className="text-green-600 hover:underline mr-2"
                          >
                            {t('confirm')}
                          </button>
                        )}
                        {['scheduled', 'confirmed'].includes(appt.status) && (
                          <button
                            onClick={() => updateStatus(appt.id, 'cancelled')}
                            className="text-red-600 hover:underline"
                          >
                            {t('cancel')}
                          </button>
                        )}
                        {appt.status === 'confirmed' && (
                          <button
                            onClick={() => updateStatus(appt.id, 'in_progress')}
                            className="text-blue-600 hover:underline ml-2"
                          >
                            {t('inProgress')}
                          </button>
                        )}
                        {appt.status === 'in_progress' && (
                          <button
                            onClick={() => updateStatus(appt.id, 'completed')}
                            className="text-green-600 hover:underline"
                          >
                            {t('completed')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
