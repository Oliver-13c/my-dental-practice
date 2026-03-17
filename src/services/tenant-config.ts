import { createClient } from '@supabase/supabase-js';

interface TenantTwilioConfig {
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_phone_number: string;
  twilio_webhook_url: string;
  twilio_status_webhook_url: string;
  twilio_enabled: boolean;
}

/**
 * Retrieves Twilio configuration from database
 * Falls back to environment variables if database config not found
 * @returns Twilio configuration object or null if not configured
 */
export async function getTenantTwilioConfig(): Promise<TenantTwilioConfig | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Try to get from database first
    const { data, error } = await supabase
      .from('tenant_configurations')
      .select(
        'twilio_account_sid, twilio_auth_token, twilio_phone_number, ' +
        'twilio_webhook_url, twilio_status_webhook_url, twilio_enabled'
      )
      .eq('twilio_enabled', true)
      .single();

    if (data && !error) {
      return data as unknown as TenantTwilioConfig;
    }

    // Fall back to environment variables
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER &&
      process.env.TWILIO_WEBHOOK_URL &&
      process.env.TWILIO_STATUS_WEBHOOK_URL
    ) {
      return {
        twilio_account_sid: process.env.TWILIO_ACCOUNT_SID,
        twilio_auth_token: process.env.TWILIO_AUTH_TOKEN,
        twilio_phone_number: process.env.TWILIO_PHONE_NUMBER,
        twilio_webhook_url: process.env.TWILIO_WEBHOOK_URL,
        twilio_status_webhook_url: process.env.TWILIO_STATUS_WEBHOOK_URL,
        twilio_enabled: true,
      };
    }

    return null;
  } catch (err) {
    console.error('Error retrieving Twilio configuration:', err);
    // Silently fall back to environment variables if database fails
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      return {
        twilio_account_sid: process.env.TWILIO_ACCOUNT_SID,
        twilio_auth_token: process.env.TWILIO_AUTH_TOKEN,
        twilio_phone_number: process.env.TWILIO_PHONE_NUMBER,
        twilio_webhook_url: process.env.TWILIO_WEBHOOK_URL || '',
        twilio_status_webhook_url: process.env.TWILIO_STATUS_WEBHOOK_URL || '',
        twilio_enabled: true,
      };
    }
    return null;
  }
}

/**
 * Validates Twilio configuration has required fields
 */
export function isValidTwilioConfig(config: TenantTwilioConfig | null): boolean {
  if (!config) return false;
  return !!(
    config.twilio_account_sid &&
    config.twilio_auth_token &&
    config.twilio_phone_number &&
    config.twilio_enabled
  );
}
