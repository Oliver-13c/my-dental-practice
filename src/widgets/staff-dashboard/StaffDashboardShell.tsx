import { StaffDashboard } from '@/features/staff/ui/staff-dashboard';
import type { StaffRole } from '@/entities/staff/model/staff.types';

export function StaffDashboardShell({
  role,
  staffProfileId,
}: {
  role: StaffRole;
  staffProfileId: string;
}) {
  return <StaffDashboard initialRole={role} staffProfileId={staffProfileId} />;
}
