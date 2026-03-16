import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentStaffProfile } from '@/features/admin-dashboard/api/admin-auth';
import {
  buildGoogleCalendarAuthUrl,
  createCalendarOAuthState,
  isGoogleCalendarOAuthConfigured,
} from '@/services/google-calendar-connections';
import { ApiErrors } from '@/shared/lib/api-error';
import { canManageOwnCalendar } from '@/shared/lib/staff-permissions';

export async function GET(request: NextRequest) {
  const { profile, error } = await getCurrentStaffProfile();
  if (!profile) {
    return error?.includes('Forbidden')
      ? ApiErrors.forbidden(error)
      : ApiErrors.unauthorized(error || 'Unauthorized');
  }

  if (!canManageOwnCalendar(profile.role)) {
    return ApiErrors.forbidden('Only dentists and hygienists can connect Google Calendar');
  }

  if (!isGoogleCalendarOAuthConfigured()) {
    return ApiErrors.internal(
      'Google Calendar OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.',
    );
  }

  const returnTo = request.nextUrl.searchParams.get('returnTo');
  const safeReturnTo = returnTo && returnTo.startsWith('/')
    ? returnTo
    : profile.role === 'hygienist'
      ? '/staff/hygienist'
      : '/staff/dentist';
  const state = createCalendarOAuthState();
  const authUrl = buildGoogleCalendarAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('google_calendar_oauth', JSON.stringify({
    actorId: profile.id,
    providerId: profile.id,
    returnTo: safeReturnTo,
    state,
  }), {
    httpOnly: true,
    maxAge: 60 * 10,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
