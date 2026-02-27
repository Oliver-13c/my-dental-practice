import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/provision-profile
 *
 * Auto-provisions a staff_profiles row for the currently authenticated
 * Supabase user.  Uses the service-role key so it can bypass RLS.
 *
 * Returns:
 *   201  – profile created
 *   200  – profile already exists
 *   401  – no authenticated user
 *   500  – provisioning failed
 */
export async function POST(request: NextRequest) {
  /* ── Build a Supabase client that reads the caller's cookies ── */
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Validate the caller's identity
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 },
    );
  }

  /* ── Use service-role to bypass RLS ─────────────────────────── */
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('[provision-profile] SUPABASE_SERVICE_ROLE_KEY is not set');
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 },
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    serviceKey,
    { auth: { persistSession: false } },
  );

  // Check if profile already exists
  const { data: existing } = await admin
    .from('staff_profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (existing) {
    return NextResponse.json(
      { message: 'Profile already exists', role: existing.role },
      { status: 200 },
    );
  }

  // Determine default role: first user gets admin, rest get receptionist
  const { count } = await admin
    .from('staff_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');

  const defaultRole = (count ?? 0) === 0 ? 'admin' : 'receptionist';

  const { error: insertErr } = await admin.from('staff_profiles').insert({
    id: user.id,
    role: defaultRole,
    first_name: user.email?.split('@')[0] ?? '',
    last_name: '',
    is_active: true,
    is_admin: defaultRole === 'admin',
  });

  if (insertErr) {
    console.error('[provision-profile] Insert error:', insertErr.message);
    return NextResponse.json(
      { error: insertErr.message },
      { status: 500 },
    );
  }

  console.log(
    '[provision-profile] Created profile for',
    user.id,
    'role=',
    defaultRole,
  );

  return NextResponse.json(
    { message: 'Profile created', role: defaultRole },
    { status: 201 },
  );
}
