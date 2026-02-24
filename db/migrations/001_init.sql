-- Migration: 001_init
-- Initial schema for My Dental Practice

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles enum
CREATE TYPE user_role AS ENUM ('patient', 'staff', 'admin');
CREATE TYPE staff_role AS ENUM ('receptionist', 'hygienist', 'dentist', 'admin');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     uuid UNIQUE,
  email       text NOT NULL UNIQUE,
  full_name   text NOT NULL DEFAULT '',
  role        user_role NOT NULL DEFAULT 'patient',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Staff profiles table
CREATE TABLE IF NOT EXISTS staff_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        staff_role NOT NULL DEFAULT 'receptionist',
  first_name  text NOT NULL DEFAULT '',
  last_name   text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid REFERENCES users(id) ON DELETE SET NULL,
  first_name          text NOT NULL,
  last_name           text NOT NULL,
  phone               text,
  dob                 date,
  insurance           jsonb,
  medical_history     jsonb,
  emergency_contact   jsonb,
  last_cleaning_date  date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      uuid REFERENCES patients(id) ON DELETE SET NULL,
  staff_user_id   uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  start_ts        timestamptz NOT NULL,
  end_ts          timestamptz NOT NULL,
  reason          text,
  status          appointment_status NOT NULL DEFAULT 'scheduled',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id   ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id     ON appointments(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_ts     ON appointments(start_ts);
CREATE INDEX IF NOT EXISTS idx_patients_user_id          ON patients(user_id);

-- Enable Row Level Security
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments    ENABLE ROW LEVEL SECURITY;

-- RLS Policies (apply via Supabase dashboard or supabase CLI)
-- Users: each user can see their own record; admins see all
-- CREATE POLICY "Users can view own record"    ON users FOR SELECT USING (auth.uid() = auth_id);
-- CREATE POLICY "Admins can view all users"    ON users FOR SELECT USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Staff profiles: staff can view own; admins see all
-- CREATE POLICY "Staff view own profile"       ON staff_profiles FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Admins view all staff"        ON staff_profiles FOR SELECT USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Patients: patients view own; staff view all; admins view all
-- CREATE POLICY "Patients view own record"     ON patients FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));
-- CREATE POLICY "Staff view all patients"      ON patients FOR SELECT USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid()));

-- Appointments: patients view own; staff view all; staff can update status
-- CREATE POLICY "Patients view own apts"       ON appointments FOR SELECT USING (patient_id IN (SELECT id FROM patients WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())));
-- CREATE POLICY "Staff view all apts"          ON appointments FOR SELECT USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid()));
-- CREATE POLICY "Staff update apt status"      ON appointments FOR UPDATE USING (EXISTS (SELECT 1 FROM staff_profiles WHERE id = auth.uid()));

-- Trigger: auto-create users row when auth user signs up
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'patient'
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger on Supabase:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_created();
