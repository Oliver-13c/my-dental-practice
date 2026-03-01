import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { UserForm } from '@/features/admin-dashboard/ui/UserForm';
import { Button } from '@/shared/ui/button';

export const dynamic = 'force-dynamic';

export default function CreateUserPage() {
  const t = useTranslations('admin.users');

  const handleSubmit = async (data: any) => {
    console.log('Create user:', data);
    // TODO: Call API to create user
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <Link href="/admin/users">
            <Button variant="ghost">&larr; Back to Users</Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            {t('createNewUser') || 'Create New User'}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('createUserDescription') || 'Add a new staff member or patient to the system'}
          </p>
        </div>

        <UserForm onSubmit={handleSubmit} submitLabel="Create User" />
      </div>
    </AdminLayout>
  );
}
