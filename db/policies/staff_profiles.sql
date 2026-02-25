-- ============================================================
-- RLS Policies for: public.staff_profiles
-- ============================================================
-- Purpose:
--   Enforce row-level security so that each staff member can
--   only read and update their own profile row, while users
--   with the 'admin' role can read every row.
--
-- How role checking works:
--   Supabase sets auth.uid() to the authenticated user's UUID.
--   The staff_profiles.id column is a FK to auth.users.id, so
--   auth.uid() = id uniquely identifies the current user's row.
--   Admin checks query the same table (using a security-definer
--   helper or a direct subquery) to confirm the caller's role.
--
-- Roles:
--   receptionist – front-desk staff; own profile only
--   hygienist    – clinical staff;   own profile only
--   dentist      – clinical staff;   own profile only
--   admin        – practice admin;   all profiles (read-only via policy)
-- ============================================================

-- Ensure RLS is active on the table (idempotent).
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- ── SELECT policies ─────────────────────────────────────────

-- Policy: any authenticated staff member may read their own row.
-- The primary key (id) is the same UUID stored in auth.uid(),
-- so this condition is both sufficient and precise.
CREATE POLICY "Staff can view their own profile"
  ON public.staff_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: admins may read every row in the table.
-- The subquery looks up the caller's own row to confirm they
-- hold the 'admin' role before granting access.
-- NOTE: Postgres evaluates USING per-row, so non-admins simply
--       see no extra rows – no error is raised.
CREATE POLICY "Admins can view all staff profiles"
  ON public.staff_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   public.staff_profiles sp
      WHERE  sp.id   = auth.uid()
        AND  sp.role = 'admin'
    )
  );

-- ── UPDATE policy ────────────────────────────────────────────

-- Policy: a staff member may update only their own row.
-- USING  – which rows the UPDATE is allowed to target.
-- WITH CHECK – the row must still belong to them after the update
--              (prevents a user from changing their own id).
CREATE POLICY "Staff can update their own profile"
  ON public.staff_profiles
  FOR UPDATE
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── INSERT policy ────────────────────────────────────────────

-- Policy: only admins may create new staff profile rows directly.
-- Normal staff accounts are created server-side via a
-- SECURITY DEFINER trigger (handle_new_staff), so they never
-- need this permission.
CREATE POLICY "Admins can insert staff profiles"
  ON public.staff_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.staff_profiles sp
      WHERE  sp.id   = auth.uid()
        AND  sp.role = 'admin'
    )
  );

-- ── DELETE policy ────────────────────────────────────────────

-- Policy: only admins may delete staff profile rows.
CREATE POLICY "Admins can delete staff profiles"
  ON public.staff_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM   public.staff_profiles sp
      WHERE  sp.id   = auth.uid()
        AND  sp.role = 'admin'
    )
  );
