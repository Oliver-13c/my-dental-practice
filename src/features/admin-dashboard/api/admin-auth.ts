import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { auth } from '@/auth';

/**
 * Get the current authenticated user from NextAuth session.
 * Staff login uses NextAuth Credentials provider, so the session
 * is stored in a NextAuth JWT cookie — NOT in Supabase SSR cookies.
 */
export async function getCurrentUser() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return { user: null, error: 'Auth session missing' };
    }

    // Return a user-like object compatible with downstream code
    return {
      user: {
        id: session.user.id ?? session.user.email,
        email: session.user.email,
        role: (session.user as any).role,
      },
      error: null,
    };
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
