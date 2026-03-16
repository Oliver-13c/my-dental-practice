-- Migration: 011_create_audit_logs_baseline.sql
-- Purpose:
--   Ensure canonical public.audit_logs exists in environments that
--   missed earlier Supabase audit migrations.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action        text NOT NULL,
  resource_type text,
  resource_id   text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.staff_profiles') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'audit_logs'
        AND policyname = 'Staff can view own audit logs'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "Staff can view own audit logs"
          ON public.audit_logs FOR SELECT
          USING (auth.uid() = user_id)
      $policy$;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'audit_logs'
        AND policyname = 'Admins can view all audit logs'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "Admins can view all audit logs"
          ON public.audit_logs FOR SELECT
          USING (
            EXISTS (
              SELECT 1
              FROM public.staff_profiles sp
              WHERE sp.id = auth.uid()
                AND sp.role = 'admin'
            )
          )
      $policy$;
    END IF;
  END IF;
END
$$;

COMMIT;
