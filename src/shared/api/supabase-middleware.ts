import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Create a Supabase client for use in **middleware**.
 *
 * Reads cookies from the incoming request and writes updated cookies
 * onto the provided response so the session stays in sync.
 */
export function createMiddlewareSupabaseClient(
  req: NextRequest,
  res: NextResponse,
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set on the request so downstream reads see the updated values
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });
          // Set on the response so the browser receives the updated cookies
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
