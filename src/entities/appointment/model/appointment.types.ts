import { z } from 'zod';

// ── Appointment Status ─────────────────────────────────────────
export const APPOINTMENT_STATUSES = [
  'pending',
  'confirmed',
  'arrived',
  'in-progress',
  'completed',
  'cancelled',
  'no-show',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

// ── DB row shape (matches the evolved schema) ──────────────────
export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string | null;
  appointment_type_id: string | null;
  start_time: string;       // ISO timestamptz
  end_time: string;          // ISO timestamptz
  status: AppointmentStatus;
  patient_name: string | null;
  phone: string | null;
  notes: string | null;
  language_preference: string;
  google_calendar_event_id: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Joined shape for display ───────────────────────────────────
export interface AppointmentWithDetails extends Appointment {
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
  provider?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  } | null;
  appointment_type?: {
    id: string;
    name: string;
    duration_minutes: number;
    color: string;
  } | null;
}

// ── Appointment Type (the procedure catalog) ───────────────────
export interface AppointmentTypeRecord {
  id: string;
  name: string;
  duration_minutes: number;
  color: string;
  is_active: boolean;
  created_at: string;
}

// Legacy aliases used by existing UI components
export interface AppointmentSlotType {
  id: string;
  startTime: string;
  endTime: string;
}

export interface AppointmentType {
  id: string;
  startTime: string;
  endTime: string;
  patientName: string;
  createdBy?: string;
}

// ── Provider Schedule ──────────────────────────────────────────
export interface ProviderSchedule {
  id: string;
  provider_id: string;
  day_of_week: number; // 0=Sun, 1=Mon, ... 6=Sat
  start_time: string;  // HH:MM time
  end_time: string;    // HH:MM time
  is_active: boolean;
  created_at: string;
}

// ── Provider Time Block ────────────────────────────────────────
export interface ProviderTimeBlock {
  id: string;
  provider_id: string;
  start_time: string;  // ISO timestamptz
  end_time: string;    // ISO timestamptz
  reason: string | null;
  is_all_day: boolean;
  google_calendar_event_id: string | null;
  created_at: string;
}

// ── Available Time Slot (computed, not stored) ─────────────────
export interface AvailableSlot {
  start_time: string;  // ISO
  end_time: string;    // ISO
}

// ── Zod Schemas for API validation ─────────────────────────────

export const createAppointmentSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  provider_id: z.string().uuid('Invalid provider ID'),
  appointment_type_id: z.string().uuid('Invalid appointment type ID'),
  start_time: z.string().datetime({ message: 'Invalid start time' }),
  notes: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  language_preference: z.enum(['en', 'es']).default('en'),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  start_time: z.string().datetime().optional(),
  provider_id: z.string().uuid().optional(),
  appointment_type_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  language_preference: z.enum(['en', 'es']).optional(),
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const createAppointmentTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  duration_minutes: z.number().int().min(5).max(480),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  is_active: z.boolean().default(true),
});

export type CreateAppointmentTypeInput = z.infer<typeof createAppointmentTypeSchema>;

export const updateProviderScheduleSchema = z.object({
  schedules: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
    is_active: z.boolean(),
  })),
});

export type UpdateProviderScheduleInput = z.infer<typeof updateProviderScheduleSchema>;

export const createTimeBlockSchema = z.object({
  provider_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  reason: z.string().max(200).optional(),
  is_all_day: z.boolean().default(false),
});

export type CreateTimeBlockInput = z.infer<typeof createTimeBlockSchema>;
