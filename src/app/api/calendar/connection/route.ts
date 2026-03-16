import { NextResponse } from 'next/server';
import { getCurrentStaffProfile } from '@/features/admin-dashboard/api/admin-auth';
import {
  disconnectGoogleCalendarConnection,
  getGoogleCalendarConnectionState,
} from '@/services/google-calendar-connections';
import { ApiErrors } from '@/shared/lib/api-error';
import { canManageOwnCalendar } from '@/shared/lib/staff-permissions';

export async function GET() {
  const { profile, error } = await getCurrentStaffProfile();
  if (!profile) {
    return error?.includes('Forbidden')
      ? ApiErrors.forbidden(error)
      : ApiErrors.unauthorized(error || 'Unauthorized');
  }

  if (!canManageOwnCalendar(profile.role)) {
    return ApiErrors.forbidden('Only dentists and hygienists can access calendar settings');
  }

  const data = await getGoogleCalendarConnectionState(profile.id);
  return NextResponse.json({ data });
}

export async function DELETE() {
  const { profile, error } = await getCurrentStaffProfile();
  if (!profile) {
    return error?.includes('Forbidden')
      ? ApiErrors.forbidden(error)
      : ApiErrors.unauthorized(error || 'Unauthorized');
  }

  if (!canManageOwnCalendar(profile.role)) {
    return ApiErrors.forbidden('Only dentists and hygienists can disconnect Google Calendar');
  }

  const data = await disconnectGoogleCalendarConnection(profile.id);
  return NextResponse.json({ data });
}