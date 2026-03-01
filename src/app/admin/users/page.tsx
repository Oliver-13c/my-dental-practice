import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { UsersTable } from '@/features/admin-dashboard/ui/UsersTable';
import { Button } from '@/shared/ui/button';

export const dynamic = 'force-dynamic';

// Mock data - replace with actual API call
const mockUsers = [
  {
    id: '1',
    email: 'admin@dentalpractice.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date(2024, 0, 1).toISOString(),
  },
  {
    id: '2',
    email: 'receptionist@dentalpractice.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'staff' as const,
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date(2024, 0, 15).toISOString(),
  },
  {
    id: '3',
    email: 'dentist@dentalpractice.com',
    firstName: 'Dr.',
    lastName: 'Smith',
    role: 'staff' as const,
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date(2024, 0, 15).toISOString(),
  },
];

export default function UsersPage() {
  const t = useTranslations('admin.users');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('users') || 'Users'}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('usersDescription') || 'Manage system users and permissions'}
            </p>
          </div>
          <Link href="/admin/users/create">
            <Button>{t('createUser') || 'Create User'}</Button>
          </Link>
        </div>

        <UsersTable users={mockUsers} />
      </div>
    </AdminLayout>
  );
}
