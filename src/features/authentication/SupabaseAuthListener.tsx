'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/shared/api/supabase-browser';

/**
 * Global auth-state listener mounted in the root layout.
 *
 * Handles two scenarios that the server-side callback route cannot:
 *
 * 1. **Implicit-flow hash tokens** – When Supabase redirects to the Site URL
 *    with `#access_token=…&type=recovery`, the Supabase JS client detects
 *    the hash, establishes a session, and fires `PASSWORD_RECOVERY`.
 *    We redirect to `/auth/reset-password` so the user can set a new password.
 *
 * 2. **General session sync** – Keeps the client-side Supabase state in sync
 *    with cookies so that `getSession()` works on both client and server.
 */
export default function SupabaseAuthListener() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Supabase detected a recovery token in the hash → redirect to reset page
        router.replace('/auth/reset-password');
        return;
      }

      if (event === 'SIGNED_IN' && session) {
        // If we're on the login page or homepage after a magic link, redirect
        if (pathname === '/staff/login' || pathname === '/') {
          router.replace('/staff/dashboard');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, pathname]);

  // This component renders nothing — it only listens
  return null;
}
