/**
 * GET /api/calendar/callback
 *
 * OAuth2 callback from Google. Exchanges the authorization code for tokens.
 * Displays the refresh_token for the admin to save as GOOGLE_REFRESH_TOKEN env var.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: `OAuth error: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
  }

  try {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2.getToken(code);

    // Return the tokens (admin should save refresh_token as env var)
    return new NextResponse(
      `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 2rem;">
          <h2>Google Calendar Connected!</h2>
          <p>Save the following refresh token as <code>GOOGLE_REFRESH_TOKEN</code> in your environment variables:</p>
          <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; word-break: break-all;">${tokens.refresh_token ?? 'No refresh token returned (try revoking access and re-authorizing)'}</pre>
          <p>You can close this page now.</p>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      },
    );
  } catch (err) {
    console.error('[calendar/callback] Token exchange error:', err);
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 });
  }
}
