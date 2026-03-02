import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';

/**
 * GET /api/patients/search
 * Search patients by name, phone, or email.
 *
 * Query params:
 *   q (required) — search term (min 2 chars)
 *   limit (optional) — max results, default 10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);

    if (!q || q.length < 2) {
      return NextResponse.json(
        { error: 'Search term must be at least 2 characters' },
        { status: 400 },
      );
    }

    const supabase = createServerClient<Database>() as any;

    // Use ilike for case-insensitive search across name, phone, and email
    const searchPattern = `%${q}%`;

    const { data, error } = await supabase
      .from('patients')
      .select('id, first_name, last_name, email, phone, date_of_birth')
      .or(
        `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern}`,
      )
      .order('last_name')
      .limit(limit);

    if (error) {
      console.error('[api/patients/search] GET error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[api/patients/search] GET exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
