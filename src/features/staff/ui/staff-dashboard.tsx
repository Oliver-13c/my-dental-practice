'use client';

import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { DentistDashboard } from './dentist-dashboard';
import { ReceptionistDashboard } from './receptionist-dashboard';
import { useSessionExpiry } from '@/features/session-management/hooks/use-session-expiry';
import { createClient } from '@/shared/api/supabase-browser';
import Link from 'next/link';
import type { StaffRole } from '@/entities/staff/model/staff.types';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import type { CalendarConnectionState } from '@/services/google-calendar-connections';

const disconnectedCalendarState: CalendarConnectionState = {
  connected: false,
  calendarAvailable: true,
  googleAccountEmail: null,
  calendarId: null,
  syncEnabled: false,
  connectedAt: null,
  disconnectedAt: null,
  lastError: null,
};

export function StaffDashboard({
  initialRole,
  staffProfileId,
}: {
  initialRole: StaffRole;
  staffProfileId: string;
}) {
  const t = useTranslations('staff');

  useSessionExpiry();

  const effectiveRole = initialRole;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            {effectiveRole === 'receptionist' && t('roles.receptionist')}
            {effectiveRole === 'dentist' && t('roles.dentist')}
            {effectiveRole === 'hygienist' && t('roles.hygienist')}
            {effectiveRole === 'admin' && t('roles.admin')}
            {!effectiveRole && t('roles.unknown')}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-text-muted capitalize px-3 py-1 bg-surface-muted rounded-full">
              {effectiveRole}
            </span>
            {effectiveRole === 'admin' && (
              <Link
                href="/admin"
                className="text-sm font-medium text-primary hover:opacity-90"
              >
                {t('goToAdmin')}
              </Link>
            )}
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                // Sign out of both Supabase and NextAuth
                const supabase = createClient();
                supabase.auth.signOut().then(() => {
                  signOut({ callbackUrl: '/staff/login' });
                });
              }}
            >
              {t('signOut')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {(effectiveRole === 'receptionist' || effectiveRole === 'admin') && <ReceptionistDashboard staffRole={effectiveRole} />}
        {effectiveRole === 'dentist' && (
          <DentistDashboard
            providerId={staffProfileId}
            viewerRole="dentist"
            calendarConnection={disconnectedCalendarState}
          />
        )}
        {effectiveRole === 'hygienist' && (
          <DentistDashboard
            providerId={staffProfileId}
            viewerRole="hygienist"
            calendarConnection={disconnectedCalendarState}
          />
        ) /* Reuse dentist for now as clinical placeholder */}
        {!effectiveRole && (
          <Card status="critical">
            <p className="text-critical">{t('unknownRole')}</p>
          </Card>
        )}
      </main>
    </div>
  );
}
