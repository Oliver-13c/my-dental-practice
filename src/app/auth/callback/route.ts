import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/**
 * Email confirmation callback handler
 * Supabase redirects here after user clicks email link
 * Handles: email_confirmation, password_reset, magic_link
 *
 * Uses @supabase/ssr (not the deprecated auth-helpers) so cookies
 * are written directly onto the redirect response — required for Next.js 15
 * where cookies() is async.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  /* ── Handle error params from Supabase ──────────────────────── */
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

  /* ── Extract params ─────────────────────────────────────────── */
  const token = searchParams.get('token');
  const type = searchParams.get('type') as
    | 'signup'
    | 'recovery'
    | 'invite'
    | 'email_change'
    | 'magiclink'
    | undefined;
  const code = searchParams.get('code');
  const next =
    searchParams.get('next') ||
    (type === 'recovery' ? '/auth/reset-password' : '/staff/dashboard');

  /* ── Build the redirect response FIRST so we can set cookies on it ── */
  const redirectUrl = new URL(next, request.url);
  redirectUrl.searchParams.set('confirmed', 'true');
  const response = NextResponse.redirect(redirectUrl);

  /**
   * Create a Supabase client that reads cookies from the incoming request
   * and writes cookies onto the outgoing redirect response.
   * This is the officially recommended pattern from Supabase for Next.js 15.
   */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  /* ── PKCE code flow (modern — used by magic links & recovery) ── */
  if (code) {
    try {
      console.log('[auth/callback] Exchanging PKCE code, type:', type);

      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      /* ── If PKCE verifier missing (e.g., fresh browser clicking recovery email), 
             fall back to treating code as token hash for legacy OTP verification ── */
      if (exchangeError?.message?.includes('code_verifier')) {
        console.log('[auth/callback] PKCE verifier missing, attempting legacy OTP verification with code as token');
        if (!type) {
          console.error('[auth/callback] Cannot perform legacy OTP verification without type parameter');
          return NextResponse.redirect(
            new URL('/auth/error?error=missing_type', request.url),
          );
        }
        try {
          const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
            token_hash: code,
            type: type as 'recovery' | 'signup' | 'invite' | 'email_change' | 'magiclink',
          });

          if (otpError || !otpData) {
            console.error('[auth/callback] Legacy OTP verification failed:', otpError?.message);
            return NextResponse.redirect(
              new URL(
                `/auth/error?error=invalid_token&message=${encodeURIComponent(otpError?.message ?? 'Token verification failed')}`,
                request.url,
              ),
            );
          }
          console.log('[auth/callback] Legacy OTP verification succeeded');
          // Continue to provisioning below
        } catch (otpErr) {
          console.error('[auth/callback] Legacy OTP verification exception:', otpErr);
          return NextResponse.redirect(
            new URL('/auth/error?error=callback_failed', request.url),
          );
        }
      } else if (exchangeError) {
        console.error(
          '[auth/callback] Code exchange error:',
          exchangeError.message,
        );
        return NextResponse.redirect(
          new URL(
            `/auth/error?error=invalid_token&message=${encodeURIComponent(exchangeError.message)}`,
            request.url,
          ),
        );
      }

      /* ── Auto-provision staff_profiles row if missing ────────── */
      // Uses service-role key to bypass RLS.
      // Without a staff_profiles row the middleware will bounce back to login.
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey) {
        console.warn(
          '[auth/callback] SUPABASE_SERVICE_ROLE_KEY not set — skipping auto-provision.',
          'Add it in Vercel → Settings → Environment Variables.',
        );
      } else {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          console.log('[auth/callback] getUser for provision:', user?.id ?? 'null');
          if (user) {
            const admin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
              serviceKey,
              { auth: { persistSession: false } },
            );
            const { data: existingProfile, error: selectErr } = await admin
              .from('staff_profiles')
              .select('id')
              .eq('id', user.id)
              .single();

            console.log(
              '[auth/callback] existing profile:',
              existingProfile ? 'yes' : 'no',
              selectErr ? `selectErr=${selectErr.message}` : '',
            );

            if (!existingProfile) {
              // Check if any admin exists already
              const { count } = await admin
                .from('staff_profiles')
                .select('id', { count: 'exact', head: true })
                .eq('role', 'admin');
              const defaultRole = (count ?? 0) === 0 ? 'admin' : 'receptionist';

              const { error: insertErr } = await admin
                .from('staff_profiles')
                .insert({
                  id: user.id,
                  role: defaultRole,
                  first_name: user.email?.split('@')[0] ?? '',
                  last_name: '',
                  is_active: true,
                  is_admin: defaultRole === 'admin',
                });
              console.log(
                '[auth/callback] Auto-provisioned staff_profiles:',
                defaultRole,
                insertErr ? `error=${insertErr.message}` : 'OK',
              );
            } else {
              console.log('[auth/callback] staff_profiles row exists for', user.id);
            }
          }
        } catch (provisionErr) {
          console.error('[auth/callback] Profile provision error:', provisionErr);
          // Non-fatal — continue with redirect; dashboard will retry via API
        }
      }

      // Recovery flow: only redirect to reset-password when the caller
      // explicitly passed ?type=recovery (set by handleForgotPassword).
      // Do NOT check recovery_sent_at — it persists on the user forever
      // and would incorrectly capture regular magic-link logins.
      if (type === 'recovery') {
        console.log('[auth/callback] Recovery flow → /auth/reset-password');
        const recoveryUrl = new URL('/auth/reset-password', request.url);
        const recoveryResponse = NextResponse.redirect(recoveryUrl);
        // Forward all cookies set during the PKCE exchange
        response.cookies.getAll().forEach((cookie) => {
          recoveryResponse.cookies.set(cookie.name, cookie.value, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true,
          });
        });
        return recoveryResponse;
      }

      // Log cookies that were set during the session exchange
      const cookieNames = response.cookies.getAll().map(c => c.name).join(', ');
      console.log('[auth/callback] Magic-link login → redirecting to', next);
      console.log('[auth/callback] Cookies set on response:', cookieNames || '(none)');
      return response;
    } catch (err) {
      console.error('[auth/callback] Code exchange error:', err);
      return NextResponse.redirect(
        new URL('/auth/error?error=callback_failed', request.url),
      );
    }
  }

  /* ── Legacy token-hash flow ─────────────────────────────────── */
  if (!token || !type) {
    return NextResponse.redirect(
      new URL('/auth/error?error=missing_token', request.url),
    );
  }

  try {
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type,
    });

    if (verifyError || !data) {
      console.error(
        '[auth/callback] Verification error:',
        verifyError?.message,
      );
      return NextResponse.redirect(
        new URL(
          `/auth/error?error=invalid_token&message=${encodeURIComponent(verifyError?.message ?? 'Token verification failed')}`,
          request.url,
        ),
      );
    }

    return response;
  } catch (err) {
    console.error('[auth/callback] Error:', err);
    return NextResponse.redirect(
      new URL('/auth/error?error=callback_failed', request.url),
    );
  }
}
