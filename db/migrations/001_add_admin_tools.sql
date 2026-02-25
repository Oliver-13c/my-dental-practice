-- Migration: Add admin tools (user management & audit)
-- Created: 2026-02-24

-- Add is_admin and is_active columns to staff_profiles if they don't exist
ALTER TABLE IF EXISTS staff_profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Create admin_actions table for audit trail of admin operations
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES staff_profiles(id) ON DELETE SET NULL,
  action varchar NOT NULL, -- e.g., 'create_user', 'update_user', 'delete_user', 'reset_password'
  target_type varchar NOT NULL, -- e.g., 'staff', 'appointment'
  target_id uuid, -- The ID of the resource being modified
  target_name varchar, -- Display name (e.g., staff name)
  changes jsonb, -- What changed (before/after values)
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_id ON admin_actions(target_id);

-- Enable RLS on admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policy: System can insert audit logs (via service role)
CREATE POLICY "Service role can insert audit logs"
  ON admin_actions FOR INSERT
  WITH CHECK (true);

-- Add RLS policies for staff_profiles admin operations
CREATE POLICY "Admins can update staff profiles"
  ON staff_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can view inactive staff"
  ON staff_profiles FOR SELECT
  USING (
    is_active = true OR
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Add columns to auth.users for password reset (native Supabase support)
-- Note: These are typically handled by Supabase automatically
-- But we add tracking columns:
ALTER TABLE IF EXISTS auth.users
ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
ADD COLUMN IF NOT EXISTS reset_sent_at timestamptz;

-- Function: Log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id uuid,
  p_action varchar,
  p_target_type varchar,
  p_target_id uuid,
  p_target_name varchar DEFAULT NULL,
  p_changes jsonb DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_action_id uuid;
BEGIN
  INSERT INTO admin_actions (
    admin_id,
    action,
    target_type,
    target_id,
    target_name,
    changes,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_id,
    p_action,
    p_target_type,
    p_target_id,
    p_target_name,
    p_changes,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_action_id;
  
  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;
