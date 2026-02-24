-- Migration: enable RLS on appointments and add role-based policies

-- Ensure RLS is enabled
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Receptionists can read and write all appointments (manage the calendar)
CREATE POLICY "Receptionists can manage all appointments"
  ON public.appointments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role IN ('receptionist', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role IN ('receptionist', 'admin')
    )
  );

-- Dentists / hygienists can read appointments (to see their schedule)
CREATE POLICY "Clinical staff can view appointments"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role IN ('dentist', 'hygienist')
    )
  );
