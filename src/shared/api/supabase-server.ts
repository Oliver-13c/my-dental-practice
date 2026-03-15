import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

function getSupabaseUrl() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL environment variable');
  }

  return supabaseUrl;
}

export function createAdminClient<T extends Database = Database>() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient<T>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

export function createPublicServerClient<T extends Database = Database>() {
  const supabaseUrl = getSupabaseUrl();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error('Missing Supabase anon key environment variable');
  }

  return createClient<T>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
    },
  });
}

export function createServerClient<T extends Database = Database>() {
  // Backward-compatible alias for privileged server operations.
  // New code should call createAdminClient() or createPublicServerClient()
  // explicitly based on intended privilege level.
  return createAdminClient<T>();
}
