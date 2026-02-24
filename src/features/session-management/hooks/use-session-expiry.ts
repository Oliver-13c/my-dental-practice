'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

const EXPIRY_CHECK_INTERVAL_MS = 60_000; // check every minute

/**
 * Monitors the NextAuth session and automatically signs the user out when
 * the session has expired.  Should be mounted once near the root of the
 * authenticated layout.
 */
export function useSessionExpiry() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;

    function checkExpiry() {
      if (!session?.expires) return;
      const expiresAt = new Date(session.expires).getTime();
      if (Date.now() >= expiresAt) {
        signOut({ callbackUrl: '/staff/login' });
      }
    }

    checkExpiry();
    const id = setInterval(checkExpiry, EXPIRY_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [session, status]);
}
