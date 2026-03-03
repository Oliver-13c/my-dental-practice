-- Migration: 007_appointment_types.sql
-- Purpose: Create appointment_types table with default dental procedure types.

CREATE TABLE IF NOT EXISTS public.appointment_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  duration_minutes integer NOT NULL DEFAULT 30,
  color           text NOT NULL DEFAULT '#3B82F6',  -- tailwind blue-500
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read appointment types
CREATE POLICY "Staff can view appointment types"
  ON public.appointment_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
    )
  );

-- Only admins can manage appointment types
CREATE POLICY "Admins can manage appointment types"
  ON public.appointment_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role = 'admin'
    )
  );

-- Grant access to authenticated users (RLS will enforce row-level)
REVOKE ALL ON public.appointment_types FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_types TO authenticated;

-- Seed default appointment types
INSERT INTO public.appointment_types (name, duration_minutes, color) VALUES
  ('Cleaning',      30, '#10B981'),  -- green
  ('Checkup',       30, '#3B82F6'),  -- blue
  ('Filling',       60, '#F59E0B'),  -- amber
  ('Root Canal',    90, '#EF4444'),  -- red
  ('Extraction',    60, '#8B5CF6'),  -- purple
  ('Crown',         90, '#EC4899'),  -- pink
  ('Whitening',     45, '#06B6D4'),  -- cyan
  ('Consultation',  30, '#6366F1'),  -- indigo
  ('Emergency',     60, '#DC2626')   -- red-600
ON CONFLICT (name) DO NOTHING;

-- Add FK from appointments to appointment_types
ALTER TABLE public.appointments
  ADD CONSTRAINT fk_appointments_type
  FOREIGN KEY (appointment_type_id) REFERENCES public.appointment_types(id)
  ON DELETE SET NULL;
