-- Migration: 20260316000303_reminder_config_table.sql
-- Purpose: Create reminder_config table for global practice reminder settings

BEGIN;

-- Create reminder_config table
CREATE TABLE IF NOT EXISTS public.reminder_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Practice-wide defaults
  default_reminder_minutes_before integer DEFAULT 1440, -- 24 hours
  default_channels text[] DEFAULT ARRAY['email', 'sms']::text[],
  
  -- Feature flags
  enabled boolean DEFAULT true,
  auto_send boolean DEFAULT true, -- Automatically send or just queue?
  
  -- By appointment type - JSON structure: {type_id: {minutes: 120, channels: ['sms']}}
  appointment_type_overrides jsonb DEFAULT '{}',
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_default_reminder CHECK (default_reminder_minutes_before > 0)
);

-- Only one configuration record should exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_config_singleton ON public.reminder_config ((true));

-- Enable RLS
ALTER TABLE public.reminder_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Everyone can view reminder config
CREATE POLICY "Everyone can view reminder config"
  ON public.reminder_config FOR SELECT
  USING (true);

-- 2. Only admins can update
CREATE POLICY "Only admins can update reminder config"
  ON public.reminder_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()::text::uuid
        AND sp.role = 'admin'
    )
  );

-- 3. Service role can update
CREATE POLICY "Service role can update reminder config"
  ON public.reminder_config
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.reminder_config TO authenticated;
GRANT UPDATE ON public.reminder_config TO service_role;

-- Insert default configuration
INSERT INTO public.reminder_config (
  default_reminder_minutes_before,
  default_channels,
  enabled,
  auto_send
)
VALUES (
  1440, -- 24 hours
  ARRAY['email', 'sms']::text[],
  true,
  true
)
ON CONFLICT DO NOTHING;

COMMIT;
