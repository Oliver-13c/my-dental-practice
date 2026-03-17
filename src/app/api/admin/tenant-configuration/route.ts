import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface TenantTwilioConfig {
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_phone_number: string;
  twilio_webhook_url: string;
  twilio_status_webhook_url: string;
}

export interface TenantConfigResponse {
  id: string;
  twilio_enabled: boolean;
  twilio_configured_at: string | null;
  twilio_account_sid: string | null;
  twilio_phone_number: string | null;
  twilio_webhook_url: string | null;
  twilio_status_webhook_url: string | null;
}

/**
 * GET /api/admin/tenant-configuration
 * Retrieve current tenant Twilio configuration (masked sensitive fields)
 */
export async function GET(request: Request) {
  try {
    // Verify admin access
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('is_admin, role')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin && profile?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get tenant configuration
    const { data: config, error } = await supabase
      .from('tenant_configurations')
      .select(
        'id, twilio_enabled, twilio_configured_at, twilio_account_sid, ' +
        'twilio_phone_number, twilio_webhook_url, twilio_status_webhook_url'
      )
      .single();

    // If no config exists, return empty object
    if (error?.code === 'PGRST116') {
      return Response.json({
        data: {
          id: null,
          twilio_enabled: false,
          twilio_account_sid: null,
          twilio_phone_number: null,
          twilio_webhook_url: null,
          twilio_status_webhook_url: null,
          twilio_configured_at: null,
        },
      });
    }

    if (error) {
      throw error;
    }

    return Response.json({ data: config });
  } catch (err) {
    console.error('Error fetching tenant configuration:', err);
    return Response.json({ error: 'Failed to fetch configuration' }, { status: 500 });
  }
}

/**
 * POST /api/admin/tenant-configuration
 * Update tenant Twilio configuration
 */
export async function POST(request: Request) {
  try {
    // Verify admin access
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('is_admin, role')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin && profile?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as TenantTwilioConfig;

    // Validate required fields
    if (
      !body.twilio_account_sid ||
      !body.twilio_auth_token ||
      !body.twilio_phone_number ||
      !body.twilio_webhook_url ||
      !body.twilio_status_webhook_url
    ) {
      return Response.json(
        { error: 'Missing required Twilio configuration fields' },
        { status: 400 }
      );
    }

    // Check if config exists
    const { data: existing } = await supabase
      .from('tenant_configurations')
      .select('id')
      .single();

    const configData = {
      twilio_account_sid: body.twilio_account_sid,
      twilio_auth_token: body.twilio_auth_token,
      twilio_phone_number: body.twilio_phone_number,
      twilio_webhook_url: body.twilio_webhook_url,
      twilio_status_webhook_url: body.twilio_status_webhook_url,
      twilio_enabled: true,
      twilio_configured_at: new Date().toISOString(),
      configured_by: userId,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing?.id) {
      // Update existing config
      const { data, error } = await supabase
        .from('tenant_configurations')
        .update(configData)
        .eq('id', existing.id)
        .select();

      if (error) throw error;
      result = data?.[0];

      // Log audit entry
      await supabase.from('tenant_configuration_audit').insert({
        configuration_id: existing.id,
        changed_by: userId,
        changes: {
          op: 'update',
          fields: {
            twilio_account_sid: '***REDACTED***',
            twilio_auth_token: '***REDACTED***',
            twilio_phone_number: body.twilio_phone_number,
            twilio_webhook_url: body.twilio_webhook_url,
            twilio_status_webhook_url: body.twilio_status_webhook_url,
          },
        },
      });
    } else {
      // Create new config
      const { data, error } = await supabase
        .from('tenant_configurations')
        .insert([{ ...configData, created_at: new Date().toISOString() }])
        .select();

      if (error) throw error;
      result = data?.[0];

      // Log audit entry
      if (result?.id) {
        await supabase.from('tenant_configuration_audit').insert({
          configuration_id: result.id,
          changed_by: userId,
          changes: {
            op: 'create',
            fields: {
              twilio_account_sid: '***REDACTED***',
              twilio_auth_token: '***REDACTED***',
              twilio_phone_number: body.twilio_phone_number,
              twilio_webhook_url: body.twilio_webhook_url,
              twilio_status_webhook_url: body.twilio_status_webhook_url,
            },
          },
        });
      }
    }

    return Response.json({
      data: {
        id: result?.id,
        twilio_enabled: result?.twilio_enabled,
        twilio_configured_at: result?.twilio_configured_at,
        twilio_account_sid: result?.twilio_account_sid?.slice(0, 4) + '****',
        twilio_phone_number: result?.twilio_phone_number,
        twilio_webhook_url: result?.twilio_webhook_url,
        twilio_status_webhook_url: result?.twilio_status_webhook_url,
        message: existing?.id ? 'Configuration updated' : 'Configuration created',
      },
    });
  } catch (err) {
    console.error('Error saving tenant configuration:', err);
    return Response.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
