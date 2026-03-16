'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserForm } from './UserForm';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { csrfFetch } from '@/shared/lib/csrf-fetch';

interface EditUserData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'receptionist' | 'dentist' | 'hygienist';
  isActive: boolean;
}

interface EditUserClientProps {
  userId: string;
}

export function EditUserClient({ userId }: EditUserClientProps) {
  const t = useTranslations('admin.users');
  const router = useRouter();
  const [user, setUser] = useState<EditUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const response = await csrfFetch(`/api/admin/users/${userId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('errors.fetchUser'));
      }

      // Transform data from backend format to UI format
      const backendRole = result.data.role as string;
      const validRoles = ['admin', 'receptionist', 'dentist', 'hygienist'] as const;
      type UiRole = typeof validRoles[number];
      const role: UiRole = (validRoles as readonly string[]).includes(backendRole)
        ? (backendRole as UiRole)
        : 'receptionist';
      setUser({
        firstName: result.data.first_name,
        lastName: result.data.last_name,
        email: result.data.email,
        role,
        isActive: result.data.is_active,
      });
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : t('errors.fetchUser'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: EditUserData) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await csrfFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
          is_active: data.isActive,
          is_admin: data.role === 'admin',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('errors.updateUser'));
      }

      alert(t('messages.userUpdated'));
      router.push('/admin/users');
      router.refresh();
    } catch (err) {
      console.error('Failed to update user:', err);
      setError(err instanceof Error ? err.message : t('errors.updateUser'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('messages.confirmDeactivate'))) {
      return;
    }

    try {
      const response = await csrfFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('errors.deleteUser'));
      }

      alert(t('messages.userDeactivated'));
      router.push('/admin/users');
      router.refresh();
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err instanceof Error ? err.message : t('errors.deleteUser'));
    }
  };

  const handlePasswordReset = async () => {
    if (!confirm(t('messages.confirmPasswordReset'))) {
      return;
    }

    try {
      const response = await csrfFetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('errors.passwordReset'));
      }

      alert(t('messages.passwordResetSent'));
    } catch (err) {
      console.error('Failed to send password reset:', err);
      alert(err instanceof Error ? err.message : t('errors.passwordReset'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-gray-600">{t('loading')}</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || t('errors.userNotFound')}
        </div>
        <Link href="/admin/users">
          <Button variant="ghost">&larr; {t('backToUsers')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users">
          <Button variant="ghost">&larr; {t('backToUsers')}</Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">
          {t('editUser')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('editDescription')}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UserForm
            initialData={user}
            onSubmit={handleSubmit}
            isLoading={isSaving}
            submitLabel={t('saveChanges')}
          />
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">{t('actions')}</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handlePasswordReset}
              >
                {t('resetPassword')}
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
              >
                {t('deactivateUser')}
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-2">{t('userInfo')}</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">{t('email')}</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{t('status')}</dt>
                <dd>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    user.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? t('active') : t('inactive')}
                  </span>
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
