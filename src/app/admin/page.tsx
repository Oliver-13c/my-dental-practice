'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { Card } from '@/shared/ui/card';

interface DashboardStats {
  totalStaff: number;
  activeUsers: number;
  inactiveUsers: number;
  totalAppointments: number;
  activeAppointments: number;
  todaysAppointments: number;
  upcomingAppointments: number;
  recentActions: Array<{
    id: string;
    action: string;
    target_name: string;
    admin_email: string;
    created_at: string;
  }>;
}

export default function AdminDashboard() {
  const t = useTranslations('admin');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setStats(json.data);
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }

  const statCards = stats
    ? [
        { label: t('totalUsers'), value: stats.totalStaff, icon: '👥' },
        { label: t('activeAppointments'), value: stats.activeAppointments, icon: '📅' },
        { label: t('todaysAppointments'), value: stats.todaysAppointments, icon: '🕐' },
        { label: t('staffMembers'), value: stats.activeUsers, icon: '👨‍⚕️' },
      ]
    : [];

  const quickActions = [
    {
      href: '/admin/users/create',
      icon: '➕',
      title: t('createUser'),
      desc: t('createUserDesc'),
    },
    {
      href: '/admin/users',
      icon: '👥',
      title: t('manageUsers'),
      desc: t('manageUsersDesc'),
    },
    {
      href: '/admin/appointments',
      icon: '📅',
      title: t('viewAppointments'),
      desc: t('viewAppointmentsDesc'),
    },
    {
      href: '/admin/staff',
      icon: '👨‍⚕️',
      title: t('viewStaff'),
      desc: t('viewStaffDesc'),
    },
    {
      href: '/admin/audit-logs',
      icon: '📋',
      title: t('viewAuditLogs'),
      desc: t('viewAuditLogsDesc'),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('welcomeAdmin')}
          </h1>
          <p className="text-gray-600">
            {t('adminDescription')}
          </p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-6 text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={fetchStats}
              className="text-blue-600 hover:underline text-sm"
            >
              {t('retry')}
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, idx) => (
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
        )}

        {/* Secondary Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-sm text-gray-600">{t('upcomingAppointments')}</p>
              <p className="text-xl font-semibold text-blue-600">{stats.upcomingAppointments}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600">{t('active')}</p>
              <p className="text-xl font-semibold text-green-600">{stats.activeUsers}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600">{t('inactive')}</p>
              <p className="text-xl font-semibold text-red-600">{stats.inactiveUsers}</p>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('quickActions')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickActions.map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <p className="font-medium text-gray-900">
                  {action.icon} {action.title}
                </p>
                <p className="text-sm text-gray-600">{action.desc}</p>
              </a>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        {stats && stats.recentActions.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('recentActivity')}
            </h2>
            <div className="space-y-3">
              {stats.recentActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {action.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {action.target_name} — {action.admin_email}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(action.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
