import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session, User } from '@supabase/supabase-js';
import type { StaffRole, StaffSession } from '@/entities/staff/model/staff.types';

let supabase: ReturnType<typeof createClientComponentClient> | null = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClientComponentClient();
  }
  return supabase;
}

export async function signInStaff(email: string, password: string): Promise<StaffSession | null> {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('SignIn Error:', error.message);
    return null;
  }
  if (!data.session) return null;

  // Retrieve user role from custom claim or profile table
  const { data: profileData, error: profileError } = await sb
    .from('staff_profiles')
    .select('role')
    .eq('id', data.user?.id)
    .single();

  if (profileError || !profileData) {
    console.error('Failed to load staff role:', profileError?.message);
    return null;
  }

  const role = profileData.role as StaffRole;

  return {
    userId: data.user!.id,
    email: data.user!.email!,
    role,
  };
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const sb = getSupabase();
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) return null;

  const userId = data.session.user.id;

  const { data: profileData, error: profileError } = await sb
    .from('staff_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profileError || !profileData) {
    console.error('Failed to fetch staff role:', profileError?.message);
    return null;
  }

  return {
    userId,
    email: data.session.user.email!,
    role: profileData.role as StaffRole,
  };
}

export async function signOutStaff(): Promise<void> {
  const sb = getSupabase();
  await sb.auth.signOut();
}

export async function getServerSession(): Promise<Session | null> {
  try {
    const { cookies } = await import('next/headers');
    const sb = createServerComponentClient({ cookies });
    const { data, error } = await sb.auth.getSession();
    if (error || !data.session) return null;
    return data.session;
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}
