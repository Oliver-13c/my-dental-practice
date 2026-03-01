'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserForm } from './UserForm';
import { Button } from '@/shared/ui/button';

interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'staff' | 'patient';
  isActive: boolean;
}

export function CreateUserClient() {
  const t = useTranslations('admin.users');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateUserData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Map role from UI to backend format
      const roleMap: Record<string, string> = {
        admin: 'admin',
        staff: 'receptionist',
        patient: 'patient',
      };

      // Generate a temporary password (in production, email this to the user)
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: tempPassword,
          first_name: data.firstName,
          last_name: data.lastName,
          role: roleMap[data.role] || 'receptionist',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      // Show success message
      alert(`User created successfully!\nTemporary password: ${tempPassword}\n\nPlease share this with the user securely.`);
      
      // Redirect to users list
      router.push('/admin/users');
      router.refresh();
    } catch (err) {
      console.error('Failed to create user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users">
          <Button variant="ghost">&larr; Back to Users</Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">
          {t('createNewUser') || 'Create New User'}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('createUserDescription') || 'Add a new staff member to the system'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <UserForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel={t('createUser') || 'Create User'}
      />
    </div>
  );
}
