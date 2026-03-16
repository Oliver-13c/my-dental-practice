-- Migration: 20260316000300_appointment_reminders_table.sql
-- Purpose: Create appointment_reminders table to track reminder scheduling and delivery status

BEGIN;

-- Create appointment_reminders table
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  
  -- Configuration
  reminder_type text NOT NULL DEFAULT 'appointment', -- 'appointment', 'custom', 'followup'
  send_before_mins integer NOT NULL DEFAULT 1440, -- e.g., 1440 (24h), 720 (12h), 60 (1h)
  channels text[] NOT NULL DEFAULT ARRAY['email', 'sms']::text[], -- channels to send via
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending', -- pending, sent, failed, cancelled, delivered
  sent_at timestamp with time zone,
  delivery_status jsonb DEFAULT '{}', -- {email: {sent: true, delivery_time: ..., error: null}, sms: {...}}
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_send_before CHECK (send_before_mins > 0),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled', 'delivered')),
  CONSTRAINT valid_reminder_type CHECK (reminder_type IN ('appointment', 'custom', 'followup'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment_id ON public.appointment_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_status ON public.appointment_reminders(status);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_sent_at ON public.appointment_reminders(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_created_at ON public.appointment_reminders(created_at DESC);

-- Enable RLS
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Staff can view reminders for their own appointments
CREATE POLICY "Staff can view appointment reminders"
  ON public.appointment_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.staff_profiles sp ON a.provider_id = sp.id
      WHERE a.id = appointment_reminders.appointment_id
        AND sp.id = (
          SELECT id FROM public.staff_profiles
          WHERE id = auth.uid()::text::uuid OR auth.uid() IN (SELECT id FROM auth.users WHERE id::text = split_part(auth.uid()::text, '@', 1))
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()::text::uuid
        AND sp.role = 'admin'
    )
  );

-- 2. Admins can view all reminders
CREATE POLICY "Admins can view all reminders"
  ON public.appointment_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()::text::uuid
        AND sp.role = 'admin'
    )
  );

-- 3. Service role can insert/update (for cron jobs)
CREATE POLICY "Service role can manage reminders"
  ON public.appointment_reminders
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.appointment_reminders TO authenticated;
GRANT INSERT, UPDATE ON public.appointment_reminders TO service_role;

COMMIT;
