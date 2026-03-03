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

export default function StaffPage() {
  const t = useTranslations('admin');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

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
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search, t]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

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
      dentist: t('dentist'),
      hygienist: t('hygienist'),
      receptionist: t('receptionist'),
    };
    return map[role] || role;
  };

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
            >
              <option value="all">{t('all')} — {t('role')}</option>
              <option value="dentist">{t('dentist')}</option>
              <option value="hygienist">{t('hygienist')}</option>
              <option value="receptionist">{t('receptionist')}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">{t('all')} — {t('status')}</option>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>
        </Card>

        {/* Table */}
        {loading ? (
          <Card className="p-8 text-center text-gray-500">{t('loading')}</Card>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button onClick={fetchStaff} className="text-blue-600 hover:underline text-sm">
              {t('retry')}
            </button>
          </Card>
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
      </div>
    </AdminLayout>
  );
}
