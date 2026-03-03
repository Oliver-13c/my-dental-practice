'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { Card } from '@/shared/ui/card';

export const dynamic = 'force-dynamic';

// ── Types ──────────────────────────────────────────────────────

interface AnalyticsData {
  dateRange: { startDate: string; endDate: string };
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
    uniquePatients: number;
    avgPerDay: number;
  };
  byStatus: Record<string, number>;
  byProvider: { id: string; name: string; total: number; completed: number; cancelled: number }[];
  byType: { id: string; name: string; color: string; count: number }[];
  dailyVolume: { date: string; total: number; completed: number; cancelled: number }[];
}

// ── Helpers ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sublabel,
  color = 'text-gray-900',
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
    </Card>
  );
}

function BarRow({
  label,
  value,
  max,
  color = '#4285F4',
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 w-40 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{value}</span>
    </div>
  );
}

function MiniChart({ data }: { data: { date: string; total: number }[] }) {
  if (data.length === 0) return <p className="text-gray-400 text-sm">No data</p>;
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const barWidth = Math.max(4, Math.min(20, Math.floor(600 / data.length)));

  return (
    <div className="flex items-end gap-[2px] h-32 overflow-x-auto">
      {data.map((d) => {
        const height = (d.total / maxVal) * 100;
        return (
          <div key={d.date} className="flex flex-col items-center group relative">
            <div
              className="bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
              style={{ width: barWidth, height: `${Math.max(height, 2)}%` }}
              title={`${d.date}: ${d.total} appointments`}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error('Failed to load analytics');
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with date range picker */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">Appointment statistics and trends</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {loading && (
          <Card className="p-6 text-center">
            <p className="text-gray-500">Loading analytics...</p>
          </Card>
        )}

        {error && (
          <Card className="p-6 text-center">
            <p className="text-red-600">{error}</p>
          </Card>
        )}

        {data && !loading && (
          <>
            {/* Summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <StatCard
                label="Total Appointments"
                value={data.summary.total}
              />
              <StatCard
                label="Completed"
                value={data.summary.completed}
                sublabel={`${data.summary.completionRate}% rate`}
                color="text-green-700"
              />
              <StatCard
                label="Cancelled"
                value={data.summary.cancelled}
                sublabel={`${data.summary.cancellationRate}% rate`}
                color="text-red-600"
              />
              <StatCard
                label="No-Shows"
                value={data.summary.noShow}
                sublabel={`${data.summary.noShowRate}% rate`}
                color="text-amber-600"
              />
              <StatCard
                label="Unique Patients"
                value={data.summary.uniquePatients}
                sublabel={`${data.summary.avgPerDay} avg/day`}
              />
            </div>

            {/* Daily Volume Chart */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Daily Appointment Volume</h2>
              <MiniChart data={data.dailyVolume} />
              {data.dailyVolume.length > 0 && (
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>{data.dailyVolume[0].date}</span>
                  <span>{data.dailyVolume[data.dailyVolume.length - 1].date}</span>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Provider */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Appointments by Provider</h2>
                <div className="space-y-3">
                  {data.byProvider.length === 0 && (
                    <p className="text-gray-400 text-sm">No data</p>
                  )}
                  {data.byProvider
                    .sort((a, b) => b.total - a.total)
                    .map((p) => (
                      <BarRow
                        key={p.id}
                        label={p.name}
                        value={p.total}
                        max={Math.max(...data.byProvider.map((x) => x.total))}
                        color="#4285F4"
                      />
                    ))}
                </div>
              </Card>

              {/* By Type */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Appointments by Type</h2>
                <div className="space-y-3">
                  {data.byType.length === 0 && (
                    <p className="text-gray-400 text-sm">No data</p>
                  )}
                  {data.byType
                    .sort((a, b) => b.count - a.count)
                    .map((t) => (
                      <BarRow
                        key={t.id}
                        label={t.name}
                        value={t.count}
                        max={Math.max(...data.byType.map((x) => x.count))}
                        color={t.color}
                      />
                    ))}
                </div>
              </Card>
            </div>

            {/* Status Breakdown */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Status Breakdown</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(data.byStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const colors: Record<string, string> = {
                      completed: 'bg-green-100 text-green-800',
                      confirmed: 'bg-blue-100 text-blue-800',
                      pending: 'bg-yellow-100 text-yellow-800',
                      cancelled: 'bg-red-100 text-red-800',
                      'no-show': 'bg-amber-100 text-amber-800',
                      'in-progress': 'bg-indigo-100 text-indigo-800',
                      arrived: 'bg-teal-100 text-teal-800',
                    };
                    const cls = colors[status] ?? 'bg-gray-100 text-gray-800';
                    return (
                      <div
                        key={status}
                        className={`rounded-lg p-3 ${cls}`}
                      >
                        <p className="text-sm font-medium capitalize">{status}</p>
                        <p className="text-2xl font-bold">{count}</p>
                      </div>
                    );
                  })}
              </div>
            </Card>

            {/* Provider Performance Table */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Provider Performance</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Provider</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                      <th className="pb-2 font-medium text-right">Completed</th>
                      <th className="pb-2 font-medium text-right">Cancelled</th>
                      <th className="pb-2 font-medium text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byProvider
                      .sort((a, b) => b.total - a.total)
                      .map((p) => {
                        const rate =
                          p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
                        return (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-2 font-medium text-gray-900">{p.name}</td>
                            <td className="py-2 text-right">{p.total}</td>
                            <td className="py-2 text-right text-green-700">{p.completed}</td>
                            <td className="py-2 text-right text-red-600">{p.cancelled}</td>
                            <td className="py-2 text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  rate >= 80
                                    ? 'bg-green-100 text-green-700'
                                    : rate >= 50
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
