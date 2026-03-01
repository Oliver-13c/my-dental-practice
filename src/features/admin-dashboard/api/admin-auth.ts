import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Get the current authenticated user from Supabase
 * This works with both NextAuth and direct Supabase authentication
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { user: null, error: 'Supabase configuration missing' };
    }

    const supabase = createSsrServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(_cookiesToSet) {
          return;
        },
      },
    });
    
    // Get current user from Supabase auth
    const { data: { user }, error } = await (supabase as any).auth.getUser();
    
    if (error || !user?.email) {
      return { user: null, error: error?.message || 'Unauthorized' };
    }

    return { user, error: null };
  } catch (err) {
    console.error('[getCurrentUser]', err);
    return { user: null, error: 'Unauthorized' };
  }
}

/**
 * Get the current user's profile from staff_profiles table and verify admin status
 */
export async function getCurrentAdminProfile() {
  const { user, error: userError } = await getCurrentUser();
  
  if (!user?.email) {
    return { profile: null, error: userError || 'Unauthorized' };
  }

  try {
    const supabase = createServerClient<Database>();
    
    const { data: profile, error } = await (supabase as any)
      .from('staff_profiles')
      .select('*')
      .eq('email', user.email)
      .single();

    if (error) {
      return { profile: null, error: error.message };
    }

    if (!profile?.is_admin) {
      return { profile: null, error: 'Forbidden: Admin access required' };
    }

    return { profile, error: null };
  } catch (err) {
    console.error('[getCurrentAdminProfile]', err);
    return { profile: null, error: 'Failed to verify admin status' };
  }
}
