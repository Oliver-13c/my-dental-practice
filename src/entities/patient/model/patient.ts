export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalHistory?: string | null;
  insuranceInfo?: string | null;
  createdAt: string;
  updatedAt: string;
}
