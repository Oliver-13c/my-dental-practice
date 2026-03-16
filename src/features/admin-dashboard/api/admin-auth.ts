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
 * Get the current authenticated staff profile.
 */
export async function getCurrentStaffProfile() {
  const { user, error: userError } = await getCurrentUser();

  if (!user?.email && !user?.id) {
    return { profile: null, error: userError || 'Unauthorized' };
  }

  try {
    const supabase = createServerClient<Database>();

    let profile: any = null;
    let profileError: any = null;

    // Prefer immutable user id from the session token when available.
    if (user?.id && user.id !== user.email) {
      const result = await (supabase as any)
        .from('staff_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      profile = result.data;
      profileError = result.error;
    }

    // Fallback to case-insensitive email match to avoid casing mismatches in production.
    if (!profile && user?.email) {
      const result = await (supabase as any)
        .from('staff_profiles')
        .select('*')
        .ilike('email', user.email)
        .maybeSingle();
      profile = result.data;
      profileError = result.error;
    }

    if (profileError || !profile) {
      return { profile: null, error: profileError?.message || 'Staff profile not found' };
    }

    if (!profile.is_active) {
      return { profile: null, error: 'Forbidden: Staff account inactive' };
    }

    return { profile, error: null };
  } catch (err) {
    console.error('[getCurrentStaffProfile]', err);
    return { profile: null, error: 'Failed to verify staff session' };
  }
}

/**
 * Get the current user's profile from staff_profiles table and verify admin status
 */
export async function getCurrentAdminProfile() {
  const { profile, error } = await getCurrentStaffProfile();

  if (!profile) {
    return { profile: null, error: error || 'Unauthorized' };
  }

  if (!(profile?.is_admin || profile?.role === 'admin')) {
    return { profile: null, error: 'Forbidden: Admin access required' };
  }

  return { profile, error: null };
}

/**
 * Returns a verified admin profile together with a privileged Supabase client.
 */
export async function getAdminServerContext() {
  const { profile, error } = await getCurrentAdminProfile();

  if (!profile) {
    return { profile: null, supabase: null, error: error || 'Unauthorized' };
  }

  return {
    profile,
    supabase: createServerClient<Database>() as any,
    error: null,
  };
}
