-- Migration: create staff_profiles table
CREATE TYPE IF NOT EXISTS staff_role AS ENUM ('receptionist', 'hygienist', 'dentist', 'admin');

CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        staff_role NOT NULL DEFAULT 'receptionist',
  first_name  text NOT NULL DEFAULT '',
  last_name   text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Staff can read their own profile
CREATE POLICY "Staff can view their own profile"
  ON public.staff_profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can view all staff"
  ON public.staff_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role = 'admin'
    )
  );
