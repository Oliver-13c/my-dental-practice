import React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { UserForm } from '@/features/admin-dashboard/ui/UserForm';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

export const dynamic = 'force-dynamic';

// Mock data - replace with actual API call
const mockUser = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'receptionist@dentalpractice.com',
  role: 'staff' as const,
  isActive: true,
};

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = useTranslations('admin.users');

  const handleSubmit = async (data: any) => {
    console.log('Update user:', id, data);
    // TODO: Call API to update user
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/admin/users">
              <Button variant="ghost">&larr; Back to Users</Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">
              {mockUser.firstName} {mockUser.lastName}
            </h1>
            <p className="text-gray-600 mt-1">{mockUser.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* User Form */}
          <div className="col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit User</h2>
            <UserForm
              initialData={mockUser}
              onSubmit={handleSubmit}
              submitLabel="Update User"
            />
          </div>

          {/* User Info Card */}
          <div>
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">User Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">User ID</p>
                  <p className="font-mono text-xs text-gray-900">{id}</p>
                </div>
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="text-gray-900">{new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
                <Button variant="outline" className="w-full">
                  Reset Password
                </Button>
                <Button variant="destructive" className="w-full">
                  Deactivate User
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
