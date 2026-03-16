import type { StaffRole } from '@/entities/staff/model/staff.types';

export function canManageAllAppointments(role: string): boolean {
  return role === 'admin' || role === 'receptionist';
}

export function canManageAllPatientData(role: string): boolean {
  return role === 'admin' || role === 'receptionist';
}

export function isClinicalStaffRole(role: string): role is Extract<StaffRole, 'dentist' | 'hygienist'> {
  return role === 'dentist' || role === 'hygienist';
}

export function canManageOwnCalendar(role: string): boolean {
  return isClinicalStaffRole(role);
}

export async function getAssignedPatientIds(
  supabase: any,
  providerId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('patient_id')
    .eq('provider_id', providerId)
    .not('patient_id', 'is', null);

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((row: { patient_id: string | null }) => row.patient_id)
        .filter((value: string | null): value is string => Boolean(value)),
    ),
  );
}

export async function hasAssignedPatientAccess(
  supabase: any,
  providerId: string,
  patientId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id')
    .eq('provider_id', providerId)
    .eq('patient_id', patientId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.length);
}