-- Migration: 20260316000100_clinical_access_and_google_calendar_connections.sql
-- Purpose:
--   1. Scope dentist/hygienist access to assigned appointments and patients.
--   2. Persist per-provider Google Calendar OAuth connection state.

BEGIN;

CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
  provider_id           uuid PRIMARY KEY REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  google_account_email  text,
  calendar_id           text NOT NULL DEFAULT 'primary',
  refresh_token         text,
  access_token          text,
  token_expiry          timestamptz,
  scopes                text[] NOT NULL DEFAULT '{}'::text[],
  sync_enabled          boolean NOT NULL DEFAULT true,
  connected_at          timestamptz NOT NULL DEFAULT now(),
  disconnected_at       timestamptz,
  last_sync_at          timestamptz,
  last_error            text,
  watch_channel_id      text,
  watch_resource_id     text,
  watch_expires_at      timestamptz,
  watch_token           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_calendar_connections_calendar_id_not_blank CHECK (btrim(calendar_id) <> '')
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_sync_enabled
  ON public.google_calendar_connections (sync_enabled)
  WHERE sync_enabled = true;

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS google_calendar_connections_set_updated_at ON public.google_calendar_connections;
CREATE TRIGGER google_calendar_connections_set_updated_at
  BEFORE UPDATE ON public.google_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Providers can view own calendar connection" ON public.google_calendar_connections;
CREATE POLICY "Providers can view own calendar connection"
  ON public.google_calendar_connections
  FOR SELECT
  USING (
    auth.uid() = provider_id
    OR EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Providers can insert own calendar connection" ON public.google_calendar_connections;
CREATE POLICY "Providers can insert own calendar connection"
  ON public.google_calendar_connections
  FOR INSERT
  WITH CHECK (
    auth.uid() = provider_id
    OR EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Providers can update own calendar connection" ON public.google_calendar_connections;
CREATE POLICY "Providers can update own calendar connection"
  ON public.google_calendar_connections
  FOR UPDATE
  USING (
    auth.uid() = provider_id
    OR EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = provider_id
    OR EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Providers can delete own calendar connection" ON public.google_calendar_connections;
CREATE POLICY "Providers can delete own calendar connection"
  ON public.google_calendar_connections
  FOR DELETE
  USING (
    auth.uid() = provider_id
    OR EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role = 'admin'
    )
  );

REVOKE ALL ON public.google_calendar_connections FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_connections TO authenticated;

DROP POLICY IF EXISTS "Clinical staff can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinical staff can view assigned appointments" ON public.appointments;

CREATE POLICY "Clinical staff can view assigned appointments"
  ON public.appointments
  FOR SELECT
  USING (
    provider_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role IN ('dentist', 'hygienist')
    )
  );

DROP POLICY IF EXISTS "Staff can manage all patient data" ON public.patients;
DROP POLICY IF EXISTS "Admins and receptionists can manage all patient data" ON public.patients;
DROP POLICY IF EXISTS "Clinical staff can view assigned patients" ON public.patients;

CREATE POLICY "Admins and receptionists can manage all patient data"
  ON public.patients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role IN ('admin', 'receptionist')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role IN ('admin', 'receptionist')
    )
  );

CREATE POLICY "Clinical staff can view assigned patients"
  ON public.patients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role IN ('dentist', 'hygienist')
    )
    AND EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.patient_id = public.patients.id
        AND a.provider_id = auth.uid()
    )
  );

ALTER TABLE public.patient_intake_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view all intake submissions" ON public.patient_intake_submissions;
DROP POLICY IF EXISTS "Admins and receptionists can view all intake submissions" ON public.patient_intake_submissions;
DROP POLICY IF EXISTS "Clinical staff can view assigned intake submissions" ON public.patient_intake_submissions;

CREATE POLICY "Admins and receptionists can view all intake submissions"
  ON public.patient_intake_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role IN ('admin', 'receptionist')
    )
  );

CREATE POLICY "Clinical staff can view assigned intake submissions"
  ON public.patient_intake_submissions
  FOR SELECT
  USING (
    patient_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role IN ('dentist', 'hygienist')
    )
    AND EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.patient_id = public.patient_intake_submissions.patient_id
        AND a.provider_id = auth.uid()
    )
  );

COMMIT;