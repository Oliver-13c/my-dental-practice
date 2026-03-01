import React from 'react';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { CreateUserClient } from '@/features/admin-dashboard/ui/CreateUserClient';

export const dynamic = 'force-dynamic';

export default function CreateUserPage() {
  return (
    <AdminLayout>
      <CreateUserClient />
    </AdminLayout>
  );
}
