import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { createAppointmentTypeSchema } from '@/entities/appointment/model/appointment.types';

/**
 * GET /api/appointment-types
 * List all appointment types (optionally filter by is_active).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false'; // default: active only
    const supabase = createServerClient<Database>() as any;

    let query = supabase
      .from('appointment_types')
      .select('*')
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[api/appointment-types] GET error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[api/appointment-types] GET exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/appointment-types
 * Create a new appointment type (admin only).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createAppointmentTypeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const supabase = createServerClient<Database>() as any;
    const { data, error } = await supabase
      .from('appointment_types')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      console.error('[api/appointment-types] POST error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[api/appointment-types] POST exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/appointment-types
 * Update an appointment type. Expects { id, ...fields }.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createServerClient<Database>() as any;
    const { data, error } = await supabase
      .from('appointment_types')
      .update(fields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[api/appointment-types] PATCH error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[api/appointment-types] PATCH exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
