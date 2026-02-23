-- SQL schema for staff_profiles table
CREATE TYPE staff_role AS ENUM ('receptionist', 'hygienist', 'dentist', 'admin');

CREATE TABLE IF NOT EXISTS staff_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role staff_role NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can view their own profile"
  ON staff_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all staff"
  ON staff_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to handle new user registration for staff
CREATE OR REPLACE FUNCTION public.handle_new_staff()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.staff_profiles (id, role, first_name, last_name)
  VALUES (new.id, 'receptionist', '', '');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
