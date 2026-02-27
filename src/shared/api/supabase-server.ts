import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

export function createServerClient<T extends Database = Database>() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseServerKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServerKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<T>(supabaseUrl, supabaseServerKey, {
    auth: {
      persistSession: false,
    },
  });
}
