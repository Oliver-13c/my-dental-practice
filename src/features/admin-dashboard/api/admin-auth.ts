import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';

/**
 * Get the current authenticated user from Supabase
 * This works with both NextAuth and direct Supabase authentication
 */
export async function getCurrentUser() {
  try {
    const supabase = createServerClient<Database>();
    
    // Get current user from Supabase auth
    const { data: { user }, error } = await (supabase as any).auth.getUser();
    
    if (error || !user?.email) {
      return { user: null, error: 'Unauthorized' };
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
