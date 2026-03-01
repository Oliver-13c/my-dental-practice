import React from 'react';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { UsersListClient } from '@/features/admin-dashboard/ui/UsersListClient';

export const dynamic = 'force-dynamic';

export default function UsersPage() {
  return (
    <AdminLayout>
      <UsersListClient />
    </AdminLayout>
  );
}
