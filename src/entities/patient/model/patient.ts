import { z } from 'zod';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;         // ISO date string
  email: string;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalHistory?: string | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Zod schema for server-side validation
export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  medicalHistory: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
