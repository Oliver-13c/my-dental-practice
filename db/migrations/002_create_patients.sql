-- Migration: 20240107000000_create_patients.sql

CREATE TABLE public.patients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core demographics
  first_name    text        NOT NULL,
  last_name     text        NOT NULL,
  date_of_birth date        NOT NULL,
  email         text        UNIQUE NOT NULL,
  phone         text,

  -- Emergency contact
  emergency_contact_name  text,
  emergency_contact_phone text,

  -- Medical
  medical_history text,

  -- Insurance
  insurance_provider      text,
  insurance_policy_number text,

  -- Metadata
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for common lookups
CREATE INDEX idx_patients_email ON public.patients (email);
CREATE INDEX idx_patients_name ON public.patients (last_name, first_name);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_set_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
