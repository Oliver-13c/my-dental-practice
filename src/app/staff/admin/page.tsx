'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalStaff: number;
  activeUsers: number;
  inactiveUsers: number;
  recentActions: number;
}

interface RecentAction {
  id: string;
  action: string;
  target_name: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStaff: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    recentActions: 0,
  });
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch stats
        const statsRes = await fetch('/api/admin/dashboard/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data || stats);
        }

        // Fetch recent actions
        const actionsRes = await fetch('/api/admin/audit-logs?limit=5');
        if (actionsRes.ok) {
          const actionsData = await actionsRes.json();
          setRecentActions(actionsData.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to the admin dashboard</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-1">Note: Some features require database migration. Run <code className="bg-yellow-100 px-2 py-1 rounded">npx supabase db push</code></p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Staff</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStaff}</p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
          <p className="text-xs text-gray-500 mt-3">All registered staff members</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Users</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeUsers}</p>
            </div>
            <div className="text-3xl">✓</div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Currently active</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-red-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Inactive Users</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.inactiveUsers}</p>
            </div>
            <div className="text-3xl">✕</div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Deactivated accounts</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Recent Actions</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.recentActions}</p>
            </div>
            <div className="text-3xl">📋</div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Admin actions logged</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Actions */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <Link
              href="/staff/admin/audit-logs"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </Link>
          </div>

          {recentActions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {recentActions.map((action) => (
                <div key={action.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="capitalize bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold mr-2">
                          {action.action}
                        </span>
                        {action.target_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(action.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">No recent actions</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/staff/admin/users/create"
              className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium text-sm"
            >
              ➕ Create New User
            </Link>
            <Link
              href="/staff/admin/users"
              className="block w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-center font-medium text-sm"
            >
              👥 Manage Users
            </Link>
            <Link
              href="/staff/admin/audit-logs"
              className="block w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-center font-medium text-sm"
            >
              📋 View Audit Logs
            </Link>
            <Link
              href="/staff/admin/settings"
              className="block w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-center font-medium text-sm"
            >
              ⚙️ Settings
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> Some features require database setup. See setup guide in docs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
