-- Migration: 20260316000301_message_logs_table.sql
-- Purpose: Create message_logs table to track all sent/received messages and delivery status

BEGIN;

-- Create message_logs table
CREATE TABLE IF NOT EXISTS public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  recipient_email text,
  recipient_phone text,
  
  -- Message metadata
  message_type text NOT NULL,
  channels text[] NOT NULL DEFAULT ARRAY['email']::text[], -- ['email'], ['sms'], ['email', 'sms']
  subject text,
  body text NOT NULL,
  
  -- Related context
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  reminder_id uuid REFERENCES public.appointment_reminders(id) ON DELETE SET NULL,
  
  -- Status & delivery tracking
  status text NOT NULL DEFAULT 'pending',
  email_status text, -- sent, delivered, failed, bounced, open, click
  sms_status text, -- sent, delivered, failed, unsubscribed
  
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  failed_at timestamp with time zone,
  failure_reason text,
  
  -- Retry tracking
  retry_count integer DEFAULT 0,
  last_retry_at timestamp with time zone,
  max_retries integer DEFAULT 3,
  
  -- External IDs (for tracking with Resend/Twilio)
  email_message_id text,
  sms_message_sid text,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'read', 'clicked')),
  CONSTRAINT has_recipient CHECK (recipient_email IS NOT NULL OR recipient_phone IS NOT NULL),
  CONSTRAINT valid_message_type CHECK (message_type IN (
    'appointment_confirmation', 
    'appointment_reminder', 
    'appointment_cancellation', 
    'appointment_reschedule', 
    'custom', 
    'system',
    'followup'
  ))
);

-- Create indexes (critical for query performance)
CREATE INDEX IF NOT EXISTS idx_message_logs_patient_id ON public.message_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_staff_id ON public.message_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_appointment_id ON public.message_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_reminder_id ON public.message_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_status ON public.message_logs(status);
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON public.message_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_logs_message_type ON public.message_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_message_logs_email_status ON public.message_logs(email_status) WHERE email_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_logs_sms_status ON public.message_logs(sms_status) WHERE sms_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_logs_timestamp_status ON public.message_logs(created_at DESC, status);

-- Enable RLS
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Staff can view messages for their own patients
CREATE POLICY "Staff can view own patient messages"
  ON public.message_logs FOR SELECT
  USING (
    -- If this is their patient
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id
        AND a.provider_id = (
          SELECT id FROM public.staff_profiles
          WHERE id = auth.uid()::text::uuid
        )
    )
    -- Or they are admin
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()::text::uuid
        AND sp.role = 'admin'
    )
  );

-- 2. Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.message_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()::text::uuid
        AND sp.role = 'admin'
    )
  );

-- 3. Service role can insert/update (for logging services)
CREATE POLICY "Service role can log messages"
  ON public.message_logs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.message_logs TO authenticated;
GRANT INSERT, UPDATE ON public.message_logs TO service_role;

-- Grant staff insert permission for manual messages
CREATE POLICY "Staff can insert manual messages"
  ON public.message_logs FOR INSERT
  WITH CHECK (
    message_type = 'custom'
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()::text::uuid
    )
  );

COMMIT;
