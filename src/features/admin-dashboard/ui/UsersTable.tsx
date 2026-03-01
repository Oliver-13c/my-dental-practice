'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'staff' | 'patient';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface UsersTableProps {
  users: User[];
  isLoading?: boolean;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

export function UsersTable({ users, isLoading = false, onEdit, onDelete }: UsersTableProps) {
  const t = useTranslations('admin.users');
  const [sortBy, setSortBy] = useState<keyof User>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');

  const filteredUsers = users.filter((user) => {
    if (filterRole && user.role !== filterRole) return false;
    if (filterActive === 'active' && !user.isActive) return false;
    if (filterActive === 'inactive' && user.isActive) return false;
    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    return 0;
  });

  if (isLoading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">{t('filterByRole')}</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="patient">Patient</option>
        </select>

        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">{t('filterByStatus')}</option>
          <option value="active">{t('active')}</option>
          <option value="inactive">{t('inactive')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 cursor-pointer">
                <button onClick={() => setSortBy('email')}>{t('email')}</button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('name')}
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 cursor-pointer">
                <button onClick={() => setSortBy('role')}>{t('role')}</button>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('status')}
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">
                {t('lastLogin')}
              </th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-900">{user.email}</td>
                <td className="px-6 py-4 text-gray-900">
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? t('active') : t('inactive')}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 text-xs">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '—'}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="outline" size="sm">
                      {t('view')}
                    </Button>
                  </Link>
                  {onDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(user)}
                    >
                      {t('delete')}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {t('noUsers')}
        </div>
      )}
    </div>
  );
}
