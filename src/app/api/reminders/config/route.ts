/**
 * GET /api/reminders/config
 * PUT /api/reminders/config
 * 
 * Fetch and update global reminder configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminProfile } from '@/features/admin-dashboard/api/admin-auth';
import { createServerClient } from '@/shared/api/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Fetch current config
    const { data, error } = await supabase
      .from('reminder_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('[api/reminders/config] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Admin check
    const { profile, error: authError } = await getCurrentAdminProfile();
    if (!profile) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 403 });
    }

    const supabase = createServerClient();
    const body = await req.json();

    const { 
      default_reminder_minutes_before,
      default_channels,
      enabled,
      auto_send,
      appointment_type_overrides
    } = body;

    // Fetch current config
    const { data: existingConfig } = (await supabase as any)
      .from('reminder_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    let result;
    
    if (existingConfig) {
      // Update existing
      result = await (supabase as any)
        .from('reminder_config')
        .update({
          default_reminder_minutes_before: default_reminder_minutes_before ?? 1440,
          default_channels: default_channels ?? ['email', 'sms'],
          enabled: enabled ?? true,
          auto_send: auto_send ?? true,
          appointment_type_overrides: appointment_type_overrides ?? {},
          updated_at: new Date().toISOString(),
          updated_by: profile.id,
        })
        .eq('id', existingConfig.id)
        .select()
        .single();
    } else {
      // Insert first config
      result = await (supabase as any)
        .from('reminder_config')
        .insert({
          default_reminder_minutes_before: default_reminder_minutes_before ?? 1440,
          default_channels: default_channels ?? ['email', 'sms'],
          enabled: enabled ?? true,
          auto_send: auto_send ?? true,
          appointment_type_overrides: appointment_type_overrides ?? {},
          updated_by: profile.id,
        })
        .select()
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    // Audit log
    await (supabase as any).rpc('log_admin_action', {
      p_action: 'update_reminder_config',
      p_target_type: 'reminder_config',
      p_target_id: result.data.id,
      p_target_name: 'Global Reminder Settings',
      p_changes: {
        action: 'update_reminder_config',
        reminder_minutes_before: default_reminder_minutes_before,
        auto_send: auto_send,
      },
    }).catch((err: any) => console.warn('Audit log error:', err));

    return NextResponse.json({ data: result.data }, { status: 200 });
  } catch (err) {
    console.error('[api/reminders/config] PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
