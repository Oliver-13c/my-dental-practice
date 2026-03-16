import { redirect } from 'next/navigation';
import { getCurrentStaffProfile } from '@/features/admin-dashboard/api/admin-auth';
import { DentistDashboard } from '@/features/staff/ui/dentist-dashboard';
import { isGoogleCalendarConfigured } from '@/services/google-calendar-service';

export const dynamic = 'force-dynamic';

export default async function HygienistPage() {
  const { profile } = await getCurrentStaffProfile();

  if (!profile?.role || !profile?.id) {
    redirect('/staff/login');
  }

  if (profile.role !== 'hygienist' && profile.role !== 'admin') {
    redirect('/staff/dashboard');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-foreground">
            Hygiene Portal — {profile.first_name} {profile.last_name}
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <DentistDashboard providerId={profile.id} calendarConnected={isGoogleCalendarConfigured} />
      </main>
    </div>
  );
}
