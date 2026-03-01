-- Migration: 20240109000000_patient_intake_submissions.sql

CREATE TABLE public.patient_intake_submissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  raw_data    jsonb NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.staff_profiles(id),
  reviewed_at timestamptz
);

ALTER TABLE public.patient_intake_submissions ENABLE ROW LEVEL SECURITY;
