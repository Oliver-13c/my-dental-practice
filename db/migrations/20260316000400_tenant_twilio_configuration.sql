-- Migration: Add tenant Twilio configuration table
-- Created: 2026-03-16
-- Purpose: Store per-tenant Twilio settings (SID, auth token, phone number, webhook URLs)

CREATE TABLE IF NOT EXISTS tenant_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Twilio Configuration
  twilio_account_sid varchar,
  twilio_auth_token varchar,
  twilio_phone_number varchar,
  twilio_webhook_url varchar,
  twilio_status_webhook_url varchar,
  -- Configuration Status
  twilio_enabled boolean DEFAULT false,
  twilio_configured_at timestamptz,
  -- Metadata
  configured_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add comment for table documentation
COMMENT ON TABLE tenant_configurations IS 'Stores per-tenant integration configurations (e.g., Twilio credentials, webhook URLs)';
COMMENT ON COLUMN tenant_configurations.twilio_account_sid IS 'Twilio Account SID for SMS sending';
COMMENT ON COLUMN tenant_configurations.twilio_auth_token IS 'Twilio Auth Token (encrypted in production)';
COMMENT ON COLUMN tenant_configurations.twilio_phone_number IS 'Twilio phone number for sending SMS';
COMMENT ON COLUMN tenant_configurations.twilio_webhook_url IS 'Twilio inbound webhook URL for receiving SMS';
COMMENT ON COLUMN tenant_configurations.twilio_status_webhook_url IS 'Twilio delivery status webhook URL';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_configurations_created_at ON tenant_configurations(created_at DESC);

-- Enable RLS
ALTER TABLE tenant_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view tenant configurations
CREATE POLICY "Admins can view tenant configurations"
  ON tenant_configurations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')
    )
  );

-- RLS Policy: Admins can update tenant configurations
CREATE POLICY "Admins can update tenant configurations"
  ON tenant_configurations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')
    )
  );

-- RLS Policy: Admins can insert tenant configurations
CREATE POLICY "Admins can insert tenant configurations"
  ON tenant_configurations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')
    )
  );

-- Create audit logs for configuration changes
CREATE TABLE IF NOT EXISTS tenant_configuration_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id uuid NOT NULL REFERENCES tenant_configurations(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  changes jsonb NOT NULL, -- {op: 'update'|'create', fields: {...}}
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient audit queries
CREATE INDEX IF NOT EXISTS idx_tenant_config_audit_configuration_id ON tenant_configuration_audit(configuration_id);
CREATE INDEX IF NOT EXISTS idx_tenant_config_audit_created_at ON tenant_configuration_audit(created_at DESC);

-- Enable RLS on audit table
ALTER TABLE tenant_configuration_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view audit logs
CREATE POLICY "Admins can view configuration audit logs"
  ON tenant_configuration_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')
    )
  );

-- RLS Policy: Service role can insert audit logs
CREATE POLICY "Service role can insert configuration audit logs"
  ON tenant_configuration_audit FOR INSERT
  WITH CHECK (true);
