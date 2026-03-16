-- Migration: 20260316000302_contact_preferences_table.sql
-- Purpose: Create contact_preferences table for patient communication preferences

BEGIN;

-- Create contact_preferences table
CREATE TABLE IF NOT EXISTS public.contact_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  
  -- Preferred contact methods
  preferred_contact_method text DEFAULT 'email', -- 'email', 'sms', 'phone', 'in-person'
  
  -- Opt-in/out preferences - Appointments
  appointment_emails boolean DEFAULT true,
  appointment_sms boolean DEFAULT true,
  
  -- Opt-in/out preferences - Reminders
  reminder_emails boolean DEFAULT true,
  reminder_sms boolean DEFAULT true,
  
  -- Opt-in/out preferences - Marketing/General
  marketing_emails boolean DEFAULT true,
  marketing_sms boolean DEFAULT true,
  
  -- Additional preferences
  preferred_language text DEFAULT 'en', -- 'en', 'es'
  do_not_contact boolean DEFAULT false,
  contact_notes text,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_contact_date timestamp with time zone,
  
  CONSTRAINT valid_language CHECK (preferred_language IN ('en', 'es')),
  CONSTRAINT valid_contact_method CHECK (preferred_contact_method IN ('email', 'sms', 'phone', 'in-person'))
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_contact_preferences_patient_id ON public.contact_preferences(patient_id);
CREATE INDEX IF NOT EXISTS idx_contact_preferences_do_not_contact ON public.contact_preferences(do_not_contact) WHERE do_not_contact = true;

-- Enable RLS
ALTER TABLE public.contact_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Staff can view preferences for their patients
CREATE POLICY "Staff can view patient contact preferences"
  ON public.contact_preferences FOR SELECT
  USING (
    -- Clinical staff can see their own patients' preferences
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = patient_id
        AND a.provider_id = (
          SELECT id FROM public.staff_profiles
          WHERE id = auth.uid()::text::uuid
        )
    )
    -- Receptionists can see all patient preferences
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()::text::uuid
        AND sp.role = 'receptionist'
    )
    -- Admins can see all
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()::text::uuid
        AND sp.role = 'admin'
    )
  );

-- 2. Staff can update patient preferences
CREATE POLICY "Staff can update patient contact preferences"
  ON public.contact_preferences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()::text::uuid
    )
  );

-- 3. Service role can read/write
CREATE POLICY "Service role manages contact preferences"
  ON public.contact_preferences
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.contact_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contact_preferences TO service_role;

-- Create trigger to auto-create contact_preferences for new patients
CREATE OR REPLACE FUNCTION public.create_contact_preferences_for_patient()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.contact_preferences(patient_id)
  VALUES (NEW.id)
  ON CONFLICT (patient_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_contact_preferences_for_patient ON public.patients;

CREATE TRIGGER trigger_create_contact_preferences_for_patient
  AFTER INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.create_contact_preferences_for_patient();

COMMIT;
