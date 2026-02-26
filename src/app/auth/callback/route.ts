import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/shared/api/supabase-types';

/**
 * Email confirmation callback handler
 * Supabase redirects here after user clicks email link
 * Handles: email_confirmation, password_reset, magic_link
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  if (error || errorCode) {
    const redirect = new URL('/auth/error', request.url);
    redirect.searchParams.set('error', errorCode ?? error ?? 'unknown');
    if (errorDescription) {
      redirect.searchParams.set('message', errorDescription);
    }
    return NextResponse.redirect(redirect);
  }

  const token = searchParams.get('token');
  const type = searchParams.get('type') as 
    | 'signup'
    | 'recovery'
    | 'invite'
    | 'email_change'
    | undefined;
  const code = searchParams.get('code');
  const next =
    searchParams.get('next') ||
    (type === 'recovery' ? '/auth/reset-password' : '/staff/dashboard');

  const supabase = createRouteHandlerClient<Database>({ cookies });

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[auth/callback] Code exchange error:', error.message);
        return NextResponse.redirect(
          new URL('/auth/error?error=invalid_token', request.url)
        );
      }

      const redirectUrl = new URL(next, request.url);
      redirectUrl.searchParams.set('confirmed', 'true');
      return NextResponse.redirect(redirectUrl);
    } catch (err) {
      console.error('[auth/callback] Code exchange error:', err);
      return NextResponse.redirect(
        new URL('/auth/error?error=callback_failed', request.url)
      );
    }
  }

  if (!token || !type) {
    return NextResponse.redirect(
      new URL('/auth/error?error=missing_token', request.url)
    );
  }

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
