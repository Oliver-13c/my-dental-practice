import React from 'react';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/features/admin-dashboard/ui/AdminLayout';
import { TwilioConfigurationForm } from '@/features/admin-dashboard/ui/TwilioConfigurationForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: 'Admin Settings - Twilio Configuration',
};

export default function AdminSettingsPage() {
  const t = useTranslations('admin');

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/admin"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Settings
          </h1>
          <p className="mt-2 text-gray-600">
            Manage practice-wide settings and integrations
          </p>
        </div>

        {/* Main Content */}
        <div className="grid max-w-4xl">
          <TwilioConfigurationForm />
        </div>

        {/* Documentation Section */}
        <div className="grid max-w-4xl gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              📚 Documentation & Resources
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                • See our complete setup guide:{' '}
                <a
                  href="/docs/TWILIO_WEBHOOK_PRODUCTION_SETUP.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Twilio Webhook Production Setup
                </a>
              </li>
              <li>
                • Troubleshooting help in the same guide (Section 7)
              </li>
              <li>
                • After configuration, SMS features will be available in the
                staff messaging interface
              </li>
              <li>
                • Test your configuration by sending a test SMS from a patient
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
