-- Migration: 20240108000000_appointments_patient_fk.sql

ALTER TABLE public.appointments
  ADD CONSTRAINT fk_appointments_patient
  FOREIGN KEY (patient_id) REFERENCES public.patients(id)
  ON DELETE RESTRICT;

CREATE INDEX idx_appointments_patient ON public.appointments (patient_id);
