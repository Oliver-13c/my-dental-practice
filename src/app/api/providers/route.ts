import { NextResponse } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';

/**
 * GET /api/providers
 * List active providers (dentists, hygienists) for appointment booking.
 * Returns id, first_name, last_name, role.
 */
export async function GET() {
  try {
    const supabase = createServerClient<Database>() as any;

    const { data, error } = await supabase
      .from('staff_profiles')
      .select('id, first_name, last_name, role')
      .in('role', ['dentist', 'hygienist'])
      .order('last_name');

    if (error) {
      console.error('[api/providers] GET error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[api/providers] GET exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
