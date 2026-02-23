-- Supabase SQL Script
-- Run this in your Supabase SQL Editor to instantly create mock staff users for testing.

-- 1. Create a dummy Auth User for the admin
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@practice.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- 2. Create the corresponding staff_profile
INSERT INTO public.staff_profiles (id, role, first_name, last_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin', 'System', 'Admin')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Receptionist Auth User
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'frontdesk@practice.com', crypt('password123', gen_salt('bf')), now(), now(), now()
) ON CONFLICT (id) DO NOTHING;

-- 4. Create Receptionist profile
INSERT INTO public.staff_profiles (id, role, first_name, last_name)
VALUES ('00000000-0000-0000-0000-000000000002', 'receptionist', 'Jane', 'Doe')
ON CONFLICT (id) DO NOTHING;

-- 5. Create Dentist Auth User
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doctor@practice.com', crypt('password123', gen_salt('bf')), now(), now(), now()
) ON CONFLICT (id) DO NOTHING;

-- 6. Create Dentist profile
INSERT INTO public.staff_profiles (id, role, first_name, last_name)
VALUES ('00000000-0000-0000-0000-000000000003', 'dentist', 'John', 'Smith')
ON CONFLICT (id) DO NOTHING;
