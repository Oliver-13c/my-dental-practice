import React from 'react';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { Card } from '@/shared/ui/card';

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  const t = useTranslations('admin');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            {t('analyticsDescription') || 'View system analytics and metrics'}
          </p>
        </div>

        <Card className="p-6">
          <p className="text-gray-600">Analytics dashboard coming soon...</p>
        </Card>
      </div>
    </AdminLayout>
  );
}
