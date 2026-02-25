-- Migration: add admin UPDATE policy for staff_profiles (fixes GAP-002 from RLS test report)
-- See docs/RLS_TEST_REPORT.md for details.

CREATE POLICY "Admins can update staff profiles"
  ON public.staff_profiles FOR UPDATE
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
