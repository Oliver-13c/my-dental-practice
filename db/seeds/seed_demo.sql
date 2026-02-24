-- Seed: demo data for local development
-- WARNING: Do NOT run in production. Uses fixed UUIDs for demo accounts.

-- Demo staff user (receptionist)
-- Note: auth.users row must be created via Supabase Auth; this seed assumes it exists.
-- Replace the UUIDs below with real auth user IDs when testing locally.

-- Demo staff profile
INSERT INTO staff_profiles (id, role, first_name, last_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'receptionist', 'Demo', 'Staff')
ON CONFLICT (id) DO NOTHING;

-- Demo patient user
INSERT INTO users (id, auth_id, email, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000010',
  'demo.patient@example.com',
  'Demo Patient',
  'patient'
)
ON CONFLICT (id) DO NOTHING;

-- Demo patient record
INSERT INTO patients (id, user_id, first_name, last_name, phone, dob)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  'Demo',
  'Patient',
  '555-000-0001',
  '1985-06-15'
)
ON CONFLICT (id) DO NOTHING;

-- Sample appointment (next Monday at 10:00 AM)
INSERT INTO appointments (id, patient_id, staff_user_id, start_ts, end_ts, reason, status)
VALUES (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  now() + interval '7 days',
  now() + interval '7 days' + interval '1 hour',
  'Regular cleaning',
  'scheduled'
)
ON CONFLICT (id) DO NOTHING;
