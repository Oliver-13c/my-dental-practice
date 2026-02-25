-- Migration: revoke default public/anon access on RLS-protected tables
-- and grant minimum necessary permissions to the authenticated role.
-- RLS policies defined in earlier migrations continue to enforce row-level access.

-- staff_profiles ---------------------------------------------------------------
REVOKE ALL ON public.staff_profiles FROM PUBLIC, anon;
-- Authenticated staff may read/update their own row; admins manage all rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles TO authenticated;

-- appointments -----------------------------------------------------------------
REVOKE ALL ON public.appointments FROM PUBLIC, anon;
-- Receptionists/admins manage all; clinical staff read their schedule.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;

-- notifications ----------------------------------------------------------------
REVOKE ALL ON public.notifications FROM PUBLIC, anon;
-- Staff read and mark their own notifications; admins read all.
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- audit_logs -------------------------------------------------------------------
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon;
-- Inserts are performed exclusively by the service role (server-side).
-- Authenticated users may only read their own log entries (admins read all).
GRANT SELECT ON public.audit_logs TO authenticated;
