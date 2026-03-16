import { redirect } from 'next/navigation';
import { getCurrentStaffProfile } from '@/features/admin-dashboard/api/admin-auth';
import { StaffDashboardShell } from '@/widgets/staff-dashboard/StaffDashboardShell';

export const dynamic = 'force-dynamic';

export default async function StaffDashboardPage() {
  const { profile } = await getCurrentStaffProfile();

  if (!profile?.role || !profile?.id) {
    redirect('/staff/login');
  }

  return <StaffDashboardShell role={profile.role} staffProfileId={profile.id} />;
}
