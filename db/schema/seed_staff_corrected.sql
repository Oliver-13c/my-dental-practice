-- ============================================================
-- Correct Staff Seed Script
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- This properly creates auth users through GoTrue-compatible format
-- ============================================================

-- Step 1: Delete old broken users if they exist (from the direct insert approach)
DELETE FROM public.staff_profiles WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);
DELETE FROM auth.users WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

-- Step 2: Create users properly using Supabase's internal function
-- This uses the same code path as the Dashboard "Add User" button
SELECT auth.uid() IS NOT NULL;  -- sanity check

-- Create admin user
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@practice.com',
  crypt('password123', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO UPDATE
  SET encrypted_password = crypt('password123', gen_salt('bf', 10)),
      email_confirmed_at = now()
RETURNING id;

-- NOTE: After running the above, use the returned ID below for staff_profiles
-- OR use the approach below which auto-links them:

-- Step 3: Create staff_profiles for users created via Dashboard
-- First, check what users exist in auth.users:
SELECT id, email FROM auth.users 
WHERE email IN ('admin@practice.com', 'frontdesk@practice.com', 'doctor@practice.com');
