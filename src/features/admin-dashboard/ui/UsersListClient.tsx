'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { UsersTable, type User } from './UsersTable';
import { Button } from '@/shared/ui/button';
import { csrfFetch } from '@/shared/lib/csrf-fetch';

export function UsersListClient() {
  const t = useTranslations('admin.users');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await csrfFetch('/api/admin/users');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      // Transform data from backend format to UI format
      const transformedUsers: User[] = result.data.map((staff: any) => ({
        id: staff.id,
        email: staff.email,
        firstName: staff.first_name,
        lastName: staff.last_name,
        role: staff.is_admin ? 'admin' : 'staff',
        isActive: staff.is_active,
        lastLogin: staff.last_login,
        createdAt: staff.created_at,
      }));

      setUsers(transformedUsers);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <Button onClick={fetchUsers}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('title') || 'User Management'}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('description') || 'Manage staff members and their access'}
          </p>
        </div>
        <Link href="/admin/users/create">
          <Button>{t('createNewUser') || 'Create New User'}</Button>
        </Link>
      </div>

      <UsersTable users={users} isLoading={isLoading} onRefresh={fetchUsers} />
    </div>
  );
}
