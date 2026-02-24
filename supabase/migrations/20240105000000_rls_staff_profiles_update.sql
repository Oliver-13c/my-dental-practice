-- Migration: add UPDATE and admin INSERT/DELETE policies for staff_profiles

-- Staff can update their own profile
CREATE POLICY "Staff can update their own profile"
  ON public.staff_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can insert new staff profiles
CREATE POLICY "Admins can insert staff profiles"
  ON public.staff_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role = 'admin'
    )
  );

-- Admins can delete staff profiles
CREATE POLICY "Admins can delete staff profiles"
  ON public.staff_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role = 'admin'
    )
  );
