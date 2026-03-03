'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { Card } from '@/shared/ui/card';

interface AuditLog {
  id: string;
  action: string;
  target_type: string;
  target_name: string;
  admin_email: string;
  timestamp: string;
  ip_address?: string;
  changes?: Record<string, unknown>;
}

const PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const t = useTranslations('admin');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));
      if (actionFilter !== 'all') params.set('action', actionFilter);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      const data = json.data || [];
      setLogs(data);
      setHasMore(data.length >= PAGE_SIZE);
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionOptions = [
    'create_user',
    'update_user',
    'delete_user',
    'reset_password',
    'login',
    'logout',
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('auditLogsTitle')}</h1>
          <p className="text-gray-600">{t('auditLogsDescription')}</p>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">{t('all')} — {t('action')}</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Table */}
        {loading ? (
          <Card className="p-8 text-center text-gray-500">{t('loading')}</Card>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button onClick={fetchLogs} className="text-blue-600 hover:underline text-sm">
              {t('retry')}
            </button>
          </Card>
        ) : logs.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">{t('noData')}</Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('timestamp')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('adminEmail')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('action')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('targetName')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('details')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {log.admin_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className="text-gray-400 text-xs">{log.target_type}:</span>{' '}
                        {log.target_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {log.changes ? (
                          <details>
                            <summary className="cursor-pointer text-blue-600 hover:underline">
                              {t('changes')}
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {t('showing')} {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + logs.length} {t('results')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                >
                  {t('previous')}
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
