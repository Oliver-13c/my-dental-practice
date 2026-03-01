import React from 'react';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { EditUserClient } from '@/features/admin-dashboard/ui/EditUserClient';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminLayout>
      <EditUserClient userId={id} />
    </AdminLayout>
  );
}
