-- Migration: 20240110000000_rls_patients.sql

-- Staff (any authenticated staff member) can manage all patient data
CREATE POLICY "Staff can manage all patient data"
  ON public.patients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
    )
  );

-- Staff can view all submissions
CREATE POLICY "Staff can view all intake submissions"
  ON public.patient_intake_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
    )
  );
