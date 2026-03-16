import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentStaffProfile } from '@/features/admin-dashboard/api/admin-auth';
import {
  createGoogleOAuthClient,
  startCalendarWatch,
  upsertGoogleCalendarConnection,
} from '@/services/google-calendar-connections';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const returnedState = searchParams.get('state');
  const oauthCookie = request.cookies.get('google_calendar_oauth')?.value;

  const clearAndRedirect = (target: string) => {
    const response = NextResponse.redirect(new URL(target, request.url));
    response.cookies.set('google_calendar_oauth', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  };

  if (error) {
    return NextResponse.json({ error: `OAuth error: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  if (!oauthCookie) {
    return NextResponse.json({ error: 'Missing OAuth state cookie' }, { status: 400 });
  }

  try {
    const oauthState = JSON.parse(oauthCookie) as {
      actorId: string;
      providerId: string;
      returnTo: string;
      state: string;
    };

    if (!returnedState || returnedState !== oauthState.state) {
      return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
    }

    const { profile } = await getCurrentStaffProfile();
    if (!profile?.id || profile.id !== oauthState.actorId || profile.id !== oauthState.providerId) {
      return NextResponse.json({ error: 'Calendar callback session mismatch' }, { status: 403 });
    }

    const oauth2 = createGoogleOAuthClient();
    const { tokens } = await oauth2.getToken(code);
    await upsertGoogleCalendarConnection({
      providerId: oauthState.providerId,
      tokens,
    });

    try {
      await startCalendarWatch({
        providerId: oauthState.providerId,
        webhookUrl: new URL('/api/calendar/webhook', request.url).toString(),
      });
    } catch (watchError) {
      console.error('[calendar/callback] Watch setup error:', watchError);
    }

    return clearAndRedirect(`${oauthState.returnTo}?calendar=connected`);
  } catch (err) {
    console.error('[calendar/callback] Token exchange error:', err);
    return clearAndRedirect('/staff/dashboard?calendar=error');
  }
}
