-- Migration: 006_appointments_schema_v2.sql
-- Purpose: Evolve appointments table from date+time columns to proper
--          timestamptz start/end, add provider, type, notification fields.

-- 1. Add new columns
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS start_time       timestamptz,
  ADD COLUMN IF NOT EXISTS end_time         timestamptz,
  ADD COLUMN IF NOT EXISTS provider_id      uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS appointment_type_id uuid,
  ADD COLUMN IF NOT EXISTS patient_name     text,
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS notes            text,
  ADD COLUMN IF NOT EXISTS language_preference text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now();

-- 2. Migrate existing data: combine appointment_date + appointment_time → start_time
--    Set end_time to start_time + 30 min (default duration for legacy rows)
UPDATE public.appointments
SET start_time = (appointment_date + appointment_time)::timestamptz,
    end_time   = (appointment_date + appointment_time + interval '30 minutes')::timestamptz
WHERE start_time IS NULL
  AND appointment_date IS NOT NULL
  AND appointment_time IS NOT NULL;

-- 3. Denormalize patient_name from patients table for quick display
UPDATE public.appointments a
SET patient_name = p.first_name || ' ' || p.last_name,
    phone = p.phone
FROM public.patients p
WHERE a.patient_id = p.id
  AND a.patient_name IS NULL;

-- 4. Make start_time/end_time NOT NULL after migration
-- (only safe if all rows have been migrated)
-- ALTER TABLE public.appointments ALTER COLUMN start_time SET NOT NULL;
-- ALTER TABLE public.appointments ALTER COLUMN end_time SET NOT NULL;

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_appointments_provider_start
  ON public.appointments (provider_id, start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_start_time
  ON public.appointments (start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON public.appointments (status);

-- 6. Auto-update updated_at trigger (reuse function from patients if it exists)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointments_set_updated_at ON public.appointments;
CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 7. Update RLS policy for clinical staff to also manage their own appointments
-- (dentists/hygienists can update status on appointments assigned to them)
CREATE POLICY "Providers can update own appointments"
  ON public.appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role IN ('dentist', 'hygienist')
        AND public.appointments.provider_id = sp.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role IN ('dentist', 'hygienist')
        AND public.appointments.provider_id = sp.id
    )
  );
