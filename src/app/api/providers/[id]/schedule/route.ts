import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import {
  updateProviderScheduleSchema,
  createTimeBlockSchema,
} from '@/entities/appointment/model/appointment.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/providers/[id]/schedule
 * Returns the provider's weekly schedule and upcoming time blocks.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient<Database>() as any;

    // Fetch weekly schedule (7 days)
    const { data: schedules, error: schedError } = await supabase
      .from('provider_schedules')
      .select('*')
      .eq('provider_id', id)
      .order('day_of_week');

    if (schedError) {
      return NextResponse.json({ error: schedError.message }, { status: 500 });
    }

    // Fetch time blocks from now forward (next 90 days)
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 90 * 86_400_000).toISOString();

    const { data: timeBlocks, error: blockError } = await supabase
      .from('provider_time_blocks')
      .select('*')
      .eq('provider_id', id)
      .gte('end_time', now)
      .lte('start_time', future)
      .order('start_time');

    if (blockError) {
      return NextResponse.json({ error: blockError.message }, { status: 500 });
    }

    return NextResponse.json({ data: { schedules, timeBlocks } });
  } catch (err) {
    console.error('[api/providers/schedule] GET exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/providers/[id]/schedule
 * Replace the provider's weekly schedule.
 * Body: { schedules: [{ day_of_week, start_time, end_time, is_active }] }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateProviderScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const supabase = createServerClient<Database>() as any;

    // Delete existing schedule, then insert new
    await supabase
      .from('provider_schedules')
      .delete()
      .eq('provider_id', id);

    const rows = parsed.data.schedules.map((s) => ({
      provider_id: id,
      ...s,
    }));

    const { data, error } = await supabase
      .from('provider_schedules')
      .insert(rows)
      .select();

    if (error) {
      console.error('[api/providers/schedule] PUT error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[api/providers/schedule] PUT exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/providers/[id]/schedule
 * Add a time block (vacation, break, etc.).
 * Body: { start_time, end_time, reason?, is_all_day? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = createTimeBlockSchema.safeParse({ ...body, provider_id: id });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const supabase = createServerClient<Database>() as any;
    const { data, error } = await supabase
      .from('provider_time_blocks')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      console.error('[api/providers/schedule] POST error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[api/providers/schedule] POST exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
