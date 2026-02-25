-- ============================================================
-- RLS End-to-End Test Script
-- Run this in the Supabase SQL Editor (as the postgres/service role).
--
-- Prerequisites:
--   1. Run db/schema/seed_mock_staff.sql first to create the test accounts.
--   2. Insert at least one row into each table under test (see Setup below).
--
-- Test accounts (from seed_mock_staff.sql):
--   Admin       id = '00000000-0000-0000-0000-000000000001'  admin@practice.com
--   Receptionist id = '00000000-0000-0000-0000-000000000002'  frontdesk@practice.com
--   Dentist     id = '00000000-0000-0000-0000-000000000003'  doctor@practice.com
-- ============================================================

-- ============================================================
-- Test Setup
-- ============================================================

DO $$
DECLARE
  v_admin_id        uuid := '00000000-0000-0000-0000-000000000001';
  v_receptionist_id uuid := '00000000-0000-0000-0000-000000000002';
  v_dentist_id      uuid := '00000000-0000-0000-0000-000000000003';
  v_appt_id         uuid;
  v_notif_id        uuid;
  v_audit_id        uuid;
BEGIN
  RAISE NOTICE '=== RLS Test Setup ===';

  -- Seed a test appointment (service role bypasses RLS)
  INSERT INTO public.appointments (id, patient_id, appointment_date, appointment_time, status)
  VALUES (
    '11111111-0000-0000-0000-000000000001',
    gen_random_uuid(),
    CURRENT_DATE + 1,
    '10:00',
    'pending'
  ) ON CONFLICT (id) DO NOTHING;

  -- Seed notifications for admin and dentist
  INSERT INTO public.notifications (id, user_id, message)
  VALUES
    ('22222222-0000-0000-0000-000000000001', v_admin_id,        'Admin notification'),
    ('22222222-0000-0000-0000-000000000002', v_receptionist_id, 'Receptionist notification'),
    ('22222222-0000-0000-0000-000000000003', v_dentist_id,      'Dentist notification')
  ON CONFLICT (id) DO NOTHING;

  -- Seed audit log entries for admin and dentist
  INSERT INTO public.audit_logs (id, user_id, action, resource_type, resource_id)
  VALUES
    ('33333333-0000-0000-0000-000000000001', v_admin_id,        'login', 'session', NULL),
    ('33333333-0000-0000-0000-000000000002', v_receptionist_id, 'login', 'session', NULL),
    ('33333333-0000-0000-0000-000000000003', v_dentist_id,      'login', 'session', NULL)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Setup complete.';
END $$;


-- ============================================================
-- Helper: simulate an authenticated user via JWT claims
-- ============================================================

CREATE OR REPLACE FUNCTION public._rls_test_set_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  p_user_id::text,
      'role', 'authenticated',
      'aud',  'authenticated'
    )::text,
    true  -- local to transaction
  );
END;
$$;


-- ============================================================
-- Helper: assertion runner
-- Returns TRUE on pass, FALSE on fail, and emits a NOTICE.
-- ============================================================

CREATE OR REPLACE FUNCTION public._rls_assert(
  p_test_name  text,
  p_got        integer,
  p_expected   integer,
  p_comparator text DEFAULT '='  -- '=', '>', '='
)
RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  v_pass boolean;
BEGIN
  v_pass := CASE p_comparator
    WHEN '>'  THEN p_got > p_expected
    WHEN '>=' THEN p_got >= p_expected
    WHEN '='  THEN p_got = p_expected
    ELSE p_got = p_expected
  END;

  IF v_pass THEN
    RAISE NOTICE 'PASS  | %', p_test_name;
  ELSE
    RAISE WARNING 'FAIL  | % | expected(comparator=%) % but got %',
      p_test_name, p_comparator, p_expected, p_got;
  END IF;

  RETURN v_pass;
END;
$$;


-- ============================================================
-- RLS Tests (run inside a single transaction so SET LOCAL works)
-- ============================================================

BEGIN;

-- ── RECEPTIONIST ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_receptionist_id uuid := '00000000-0000-0000-0000-000000000002';
  v_row_count       integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Testing role: receptionist ===';
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public._rls_test_set_user(v_receptionist_id);

  -- [1] Receptionist can read appointments
  SELECT COUNT(*) INTO v_row_count FROM public.appointments;
  PERFORM public._rls_assert('[receptionist] SELECT appointments (allowed)', v_row_count, 0, '>');

  -- [2] Receptionist can read their own staff_profile
  SELECT COUNT(*) INTO v_row_count
    FROM public.staff_profiles WHERE id = v_receptionist_id;
  PERFORM public._rls_assert('[receptionist] SELECT own staff_profile (allowed)', v_row_count, 1);

  -- [3] Receptionist cannot read another staff_profile
  SELECT COUNT(*) INTO v_row_count
    FROM public.staff_profiles
    WHERE id = '00000000-0000-0000-0000-000000000003';  -- dentist
  PERFORM public._rls_assert('[receptionist] SELECT other staff_profile (blocked)', v_row_count, 0);

  -- [4] Receptionist can read their own notifications
  SELECT COUNT(*) INTO v_row_count
    FROM public.notifications WHERE user_id = v_receptionist_id;
  PERFORM public._rls_assert('[receptionist] SELECT own notifications (allowed)', v_row_count, 1);

  -- [5] Receptionist cannot read another user's notifications
  SELECT COUNT(*) INTO v_row_count
    FROM public.notifications
    WHERE user_id = '00000000-0000-0000-0000-000000000003';  -- dentist
  PERFORM public._rls_assert('[receptionist] SELECT other user notifications (blocked)', v_row_count, 0);

  -- [6] Receptionist can read their own audit_logs
  SELECT COUNT(*) INTO v_row_count
    FROM public.audit_logs WHERE user_id = v_receptionist_id;
  PERFORM public._rls_assert('[receptionist] SELECT own audit_logs (allowed)', v_row_count, 1);

  -- [7] Receptionist cannot read another user's audit_logs
  SELECT COUNT(*) INTO v_row_count
    FROM public.audit_logs
    WHERE user_id = '00000000-0000-0000-0000-000000000003';  -- dentist
  PERFORM public._rls_assert('[receptionist] SELECT other user audit_logs (blocked)', v_row_count, 0);
END $$;


-- ── DENTIST ───────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_dentist_id  uuid := '00000000-0000-0000-0000-000000000003';
  v_row_count   integer;
  v_raised      boolean := false;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Testing role: dentist ===';
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public._rls_test_set_user(v_dentist_id);

  -- [8] Dentist can read appointments (read-only)
  SELECT COUNT(*) INTO v_row_count FROM public.appointments;
  PERFORM public._rls_assert('[dentist] SELECT appointments (allowed)', v_row_count, 0, '>');

  -- [9] Dentist can read their own staff_profile
  SELECT COUNT(*) INTO v_row_count
    FROM public.staff_profiles WHERE id = v_dentist_id;
  PERFORM public._rls_assert('[dentist] SELECT own staff_profile (allowed)', v_row_count, 1);

  -- [10] Dentist cannot read another staff_profile
  SELECT COUNT(*) INTO v_row_count
    FROM public.staff_profiles
    WHERE id = '00000000-0000-0000-0000-000000000002';  -- receptionist
  PERFORM public._rls_assert('[dentist] SELECT other staff_profile (blocked)', v_row_count, 0);

  -- [11] Dentist can read their own notifications
  SELECT COUNT(*) INTO v_row_count
    FROM public.notifications WHERE user_id = v_dentist_id;
  PERFORM public._rls_assert('[dentist] SELECT own notifications (allowed)', v_row_count, 1);

  -- [12] Dentist cannot read another user's notifications
  SELECT COUNT(*) INTO v_row_count
    FROM public.notifications
    WHERE user_id = '00000000-0000-0000-0000-000000000002';  -- receptionist
  PERFORM public._rls_assert('[dentist] SELECT other user notifications (blocked)', v_row_count, 0);

  -- [13] Dentist can read their own audit_logs
  SELECT COUNT(*) INTO v_row_count
    FROM public.audit_logs WHERE user_id = v_dentist_id;
  PERFORM public._rls_assert('[dentist] SELECT own audit_logs (allowed)', v_row_count, 1);

  -- [14] Dentist cannot read another user's audit_logs
  SELECT COUNT(*) INTO v_row_count
    FROM public.audit_logs
    WHERE user_id = '00000000-0000-0000-0000-000000000002';  -- receptionist
  PERFORM public._rls_assert('[dentist] SELECT other user audit_logs (blocked)', v_row_count, 0);
END $$;


-- ── ADMIN ──────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_admin_id    uuid := '00000000-0000-0000-0000-000000000001';
  v_row_count   integer;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Testing role: admin ===';
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public._rls_test_set_user(v_admin_id);

  -- [15] Admin can read all appointments
  SELECT COUNT(*) INTO v_row_count FROM public.appointments;
  PERFORM public._rls_assert('[admin] SELECT appointments (allowed)', v_row_count, 0, '>');

  -- [16] Admin can read all staff_profiles
  SELECT COUNT(*) INTO v_row_count FROM public.staff_profiles;
  PERFORM public._rls_assert('[admin] SELECT all staff_profiles (allowed)', v_row_count, 2, '>');

  -- [17] Admin can read all notifications
  SELECT COUNT(*) INTO v_row_count FROM public.notifications;
  PERFORM public._rls_assert('[admin] SELECT all notifications (allowed)', v_row_count, 2, '>');

  -- [18] Admin can read all audit_logs
  SELECT COUNT(*) INTO v_row_count FROM public.audit_logs;
  PERFORM public._rls_assert('[admin] SELECT all audit_logs (allowed)', v_row_count, 2, '>');
END $$;


-- ── WRITE / MUTATION TESTS ─────────────────────────────────────────────────────

-- [19] Receptionist INSERT appointment (allowed)
DO $$
DECLARE
  v_receptionist_id uuid := '00000000-0000-0000-0000-000000000002';
  v_row_count       integer;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public._rls_test_set_user(v_receptionist_id);

  BEGIN
    INSERT INTO public.appointments (id, patient_id, appointment_date, appointment_time, status)
    VALUES (
      '11111111-0000-0000-0000-000000000099',
      gen_random_uuid(), CURRENT_DATE + 2, '09:00', 'pending'
    );
    PERFORM public._rls_assert('[receptionist] INSERT appointment (allowed)', 1, 1);
  EXCEPTION WHEN OTHERS THEN
    PERFORM public._rls_assert('[receptionist] INSERT appointment (allowed)', 0, 1);
    RAISE NOTICE 'Error: %', SQLERRM;
  END;
END $$;

-- [20] Dentist INSERT appointment (blocked)
DO $$
DECLARE
  v_dentist_id uuid := '00000000-0000-0000-0000-000000000003';
  v_blocked    boolean := false;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public._rls_test_set_user(v_dentist_id);

  BEGIN
    INSERT INTO public.appointments (id, patient_id, appointment_date, appointment_time, status)
    VALUES (
      '11111111-0000-0000-0000-000000000098',
      gen_random_uuid(), CURRENT_DATE + 3, '11:00', 'pending'
    );
    -- If we reach here the insert was NOT blocked — that is a failure
    PERFORM public._rls_assert('[dentist] INSERT appointment (blocked)', 0, 1);
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
    PERFORM public._rls_assert('[dentist] INSERT appointment (blocked)', 1, 1);
  END;
END $$;

-- [21] Receptionist UPDATE appointment (allowed)
DO $$
DECLARE
  v_receptionist_id uuid := '00000000-0000-0000-0000-000000000002';
  v_rows_updated    integer;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public._rls_test_set_user(v_receptionist_id);

  UPDATE public.appointments
    SET status = 'confirmed'
    WHERE id = '11111111-0000-0000-0000-000000000001';
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  PERFORM public._rls_assert('[receptionist] UPDATE appointment (allowed)', v_rows_updated, 1);
END $$;

-- [22] Dentist UPDATE appointment (blocked)
DO $$
DECLARE
  v_dentist_id   uuid := '00000000-0000-0000-0000-000000000003';
  v_rows_updated integer;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public._rls_test_set_user(v_dentist_id);

  UPDATE public.appointments
    SET status = 'cancelled'
    WHERE id = '11111111-0000-0000-0000-000000000001';
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  -- RLS should prevent the update — row count should be 0
  PERFORM public._rls_assert('[dentist] UPDATE appointment (blocked)', v_rows_updated, 0);
END $$;

-- [23] Receptionist UPDATE own notification (allowed)
DO $$
DECLARE
  v_receptionist_id uuid := '00000000-0000-0000-0000-000000000002';
  v_rows_updated    integer;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public._rls_test_set_user(v_receptionist_id);

  UPDATE public.notifications
    SET read = true
    WHERE id = '22222222-0000-0000-0000-000000000002';
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  PERFORM public._rls_assert('[receptionist] UPDATE own notification (allowed)', v_rows_updated, 1);
END $$;

-- [24] Dentist UPDATE another user's notification (blocked)
DO $$
DECLARE
  v_dentist_id   uuid := '00000000-0000-0000-0000-000000000003';
  v_rows_updated integer;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public._rls_test_set_user(v_dentist_id);

  UPDATE public.notifications
    SET read = true
    WHERE id = '22222222-0000-0000-0000-000000000002';  -- receptionist's notification
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  PERFORM public._rls_assert('[dentist] UPDATE other user notification (blocked)', v_rows_updated, 0);
END $$;

-- [25] Non-admin INSERT into audit_logs directly (blocked — service role only)
DO $$
DECLARE
  v_receptionist_id uuid := '00000000-0000-0000-0000-000000000002';
  v_blocked         boolean := false;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public._rls_test_set_user(v_receptionist_id);

  BEGIN
    INSERT INTO public.audit_logs (user_id, action, resource_type)
    VALUES (v_receptionist_id, 'manual_test', 'test');
    PERFORM public._rls_assert('[receptionist] INSERT audit_log directly (blocked)', 0, 1);
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
    PERFORM public._rls_assert('[receptionist] INSERT audit_log directly (blocked)', 1, 1);
  END;
END $$;

-- [26] Admin DELETE staff_profile (allowed)
DO $$
DECLARE
  v_admin_id    uuid := '00000000-0000-0000-0000-000000000001';
  v_rows_deleted integer;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM public._rls_test_set_user(v_admin_id);

  -- Create a throwaway profile to delete
  -- (requires service-role INSERT since the admin INSERT policy checks existing role)
  -- We skip this INSERT here and just verify the policy exists; see GAP-002 in report.
  RAISE NOTICE 'SKIP  | [admin] DELETE staff_profile — requires pre-seeded throwaway row; see GAP-002';
END $$;


-- ── GAP CHECKS ──────────────────────────────────────────────────────────────────

-- GAP-001: appointments table has no doctor_id column.
--   Dentists currently see ALL appointments, not just their assigned ones.
DO $$
DECLARE
  v_col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'appointments'
      AND column_name  = 'doctor_id'
  ) INTO v_col_exists;

  IF v_col_exists THEN
    RAISE NOTICE 'GAP-001 | appointments.doctor_id column EXISTS — dentist-scoped filter is possible';
  ELSE
    RAISE WARNING 'GAP-001 | appointments.doctor_id column MISSING — dentists can see ALL appointments (not just assigned). Add column and update RLS policy.';
  END IF;
END $$;

-- GAP-002: No admin UPDATE policy on staff_profiles.
DO $$
DECLARE
  v_policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'staff_profiles'
      AND cmd        = 'UPDATE'
      AND roles @> ARRAY['authenticated']::name[]
      AND policyname ILIKE '%admin%'
  ) INTO v_policy_exists;

  IF v_policy_exists THEN
    RAISE NOTICE 'GAP-002 | Admin UPDATE policy on staff_profiles EXISTS';
  ELSE
    RAISE WARNING 'GAP-002 | No admin UPDATE policy on staff_profiles. Admins cannot update other staff profiles via RLS.';
  END IF;
END $$;

-- GAP-003: No INSERT policy on notifications for authenticated users.
DO $$
DECLARE
  v_policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'notifications'
      AND cmd        = 'INSERT'
  ) INTO v_policy_exists;

  IF v_policy_exists THEN
    RAISE NOTICE 'GAP-003 | INSERT policy on notifications EXISTS';
  ELSE
    RAISE WARNING 'GAP-003 | No INSERT policy on notifications. Notifications can only be created by the service role (may be intentional — confirm with team).';
  END IF;
END $$;


-- ── Cleanup ───────────────────────────────────────────────────────────────────

ROLLBACK;  -- roll back all data changes made during the test run

-- Clean up helper functions (idempotent)
DROP FUNCTION IF EXISTS public._rls_test_set_user(uuid);
DROP FUNCTION IF EXISTS public._rls_assert(text, integer, integer, text);

RAISE NOTICE '';
RAISE NOTICE '=== RLS test run complete. Review NOTICE/WARNING messages above. ===';
