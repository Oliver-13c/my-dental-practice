import React from 'react';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { Card } from '@/shared/ui/card';

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const t = useTranslations('admin');

  const stats = [
    { label: t('totalUsers') || 'Total Users', value: '—', icon: '👥' },
    { label: t('activeAppointments') || 'Active Appointments', value: '—', icon: '📅' },
    { label: t('staffMembers') || 'Staff Members', value: '—', icon: '👨‍⚕️' },
    { label: t('systemHealth') || 'System Health', value: 'OK', icon: '✅' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('welcomeAdmin') || 'Welcome to Admin Dashboard'}
          </h1>
          <p className="text-gray-600">
            {t('adminDescription') || 'Manage your dental practice effectively'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className="text-3xl">{stat.icon}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('quickActions') || 'Quick Actions'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/users/create"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <p className="font-medium text-gray-900">➕ Create User</p>
              <p className="text-sm text-gray-600">Add a new staff or patient</p>
            </a>
            <a
              href="/admin/users"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <p className="font-medium text-gray-900">👥 Manage Users</p>
              <p className="text-sm text-gray-600">View and edit all users</p>
            </a>
            <a
              href="/admin/audit-logs"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <p className="font-medium text-gray-900">📋 Audit Logs</p>
              <p className="text-sm text-gray-600">Review system activities</p>
            </a>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
