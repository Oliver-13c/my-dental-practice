import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase client for use in **client components** (browser).
 *
 * Uses `@supabase/ssr` so that PKCE code verifiers and auth tokens are
 * stored in **cookies** (accessible by both client and server) instead of
 * localStorage (which is client-only and breaks the PKCE exchange on the
 * server-side callback route).
 *
 * Call once per component — the SDK deduplicates internally.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
