'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AppointmentWithDetails,
  AppointmentTypeRecord,
  AvailableSlot,
} from '@/entities/appointment/model/appointment.types';

// ── Generic fetch helper ───────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  const body = await res.json();
  return body.data as T;
}

// ── Provider type ──────────────────────────────────────────────
export interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

// ── useProviders ───────────────────────────────────────────────
export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Provider[]>('/api/providers')
      .then(setProviders)
      .catch((err) => console.error('Failed to load providers:', err))
      .finally(() => setLoading(false));
  }, []);

  return { providers, loading };
}

// ── useAppointmentTypes ────────────────────────────────────────
export function useAppointmentTypes() {
  const [types, setTypes] = useState<AppointmentTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AppointmentTypeRecord[]>('/api/appointment-types')
      .then(setTypes)
      .catch((err) => console.error('Failed to load appointment types:', err))
      .finally(() => setLoading(false));
  }, []);

  return { types, loading };
}

// ── useAppointments ────────────────────────────────────────────
export interface AppointmentFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  provider_id?: string;
  status?: string;
  patient_id?: string;
}

export function useAppointments(filters: AppointmentFilters = {}) {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }

    apiFetch<AppointmentWithDetails[]>(`/api/appointments?${params}`)
      .then(setAppointments)
      .catch((err) => {
        console.error('Failed to load appointments:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { appointments, loading, error, refetch };
}

// ── useAvailability ────────────────────────────────────────────
export function useAvailability(
  providerId: string | null,
  date: string | null,
  typeId: string | null,
) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!providerId || !date || !typeId) {
      setSlots([]);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({
      provider_id: providerId,
      date,
      type_id: typeId,
    });

    apiFetch<AvailableSlot[]>(`/api/appointments/availability?${params}`)
      .then(setSlots)
      .catch((err) => {
        console.error('Failed to load availability:', err);
        setSlots([]);
      })
      .finally(() => setLoading(false));
  }, [providerId, date, typeId]);

  return { slots, loading };
}

// ── usePatientSearch ───────────────────────────────────────────
export interface PatientResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
}

export function usePatientSearch(query: string) {
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setPatients([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    apiFetch<PatientResult[]>(
      `/api/patients/search?q=${encodeURIComponent(query)}`,
      { signal: controller.signal },
    )
      .then(setPatients)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Patient search failed:', err);
          setPatients([]);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query]);

  return { patients, loading };
}

// ── Mutation helpers ───────────────────────────────────────────
export async function createAppointment(data: {
  patient_id: string;
  provider_id: string;
  appointment_type_id: string;
  start_time: string;
  notes?: string;
  phone?: string;
  language_preference?: 'en' | 'es';
}) {
  return apiFetch<AppointmentWithDetails>('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateAppointment(
  id: string,
  data: {
    status?: string;
    start_time?: string;
    provider_id?: string;
    appointment_type_id?: string;
    notes?: string;
  },
) {
  return apiFetch<AppointmentWithDetails>(`/api/appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function cancelAppointment(id: string) {
  return apiFetch<{ id: string; status: string }>(`/api/appointments/${id}`, {
    method: 'DELETE',
  });
}

export async function createTimeBlock(
  providerId: string,
  data: {
    start_time: string;
    end_time: string;
    reason?: string;
    is_all_day?: boolean;
  },
) {
  return apiFetch(`/api/providers/${providerId}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
