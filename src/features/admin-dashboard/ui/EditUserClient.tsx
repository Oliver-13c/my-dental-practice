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
  role: 'admin' | 'staff' | 'patient';
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
        throw new Error(result.error || 'Failed to fetch user');
      }

      // Transform data from backend format to UI format
      setUser({
        firstName: result.data.first_name,
        lastName: result.data.last_name,
        email: result.data.email,
        role: result.data.is_admin ? 'admin' : result.data.role === 'receptionist' ? 'staff' : result.data.role,
        isActive: result.data.is_active,
      });
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: EditUserData) => {
    setIsSaving(true);
    setError(null);

    try {
      // Map role from UI to backend format
      const roleMap: Record<string, string> = {
        admin: 'admin',
        staff: 'receptionist',
        patient: 'patient',
      };

      const response = await csrfFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: data.firstName,
          last_name: data.lastName,
          role: roleMap[data.role] || 'receptionist',
          is_active: data.isActive,
          is_admin: data.role === 'admin',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      alert('User updated successfully!');
      router.push('/admin/users');
      router.refresh();
    } catch (err) {
      console.error('Failed to update user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      const response = await csrfFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      alert('User deactivated successfully!');
      router.push('/admin/users');
      router.refresh();
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handlePasswordReset = async () => {
    if (!confirm('Send password reset email to this user?')) {
      return;
    }

    try {
      const response = await csrfFetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send password reset');
      }

      alert('Password reset email sent successfully!');
    } catch (err) {
      console.error('Failed to send password reset:', err);
      alert(err instanceof Error ? err.message : 'Failed to send password reset');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'User not found'}
        </div>
        <Link href="/admin/users">
          <Button variant="ghost">&larr; Back to Users</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users">
          <Button variant="ghost">&larr; Back to Users</Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">
          {t('editUser') || 'Edit User'}
        </h1>
        <p className="text-gray-600 mt-1">
          Update user information and permissions
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
            submitLabel={t('saveChanges') || 'Save Changes'}
          />
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handlePasswordReset}
              >
                Reset Password
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
              >
                Deactivate User
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-2">User Info</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    user.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
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
