import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';

/**
 * Email confirmation callback handler
 * Supabase redirects here after user clicks email link
 * Handles: email_confirmation, password_reset, magic_link
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const token = searchParams.get('token');
  const type = searchParams.get('type') as
    | 'signup'
    | 'recovery'
    | 'invite'
    | 'email_change'
    | undefined;
  const next = searchParams.get('next') || '/staff/dashboard';

  if (!token || !type) {
    return NextResponse.redirect(
      new URL('/auth/error?error=missing_token', request.url)
    );
  }

  const supabase = createServerClient<Database>();

  try {
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type,
    });

    if (error || !data) {
      console.error('[auth/callback] Verification error:', error?.message);
      return NextResponse.redirect(
        new URL('/auth/error?error=invalid_token', request.url)
      );
    }

    // Success - redirect to next page
    // The session cookie is automatically set by Supabase
    const redirectUrl = new URL(next, request.url);
    redirectUrl.searchParams.set('confirmed', 'true');

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('[auth/callback] Error:', err);
    return NextResponse.redirect(
      new URL('/auth/error?error=callback_failed', request.url)
    );
  }
}
