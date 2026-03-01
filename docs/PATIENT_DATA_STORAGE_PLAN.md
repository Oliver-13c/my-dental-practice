# Patient Data Storage Plan — Supabase Postgres

## Executive Summary

This plan covers creating a `patients` table in the existing Supabase Postgres database, connecting it to the already-built patient intake form and appointment booking flow, adding RLS policies, and implementing CRUD API routes. The app already has a `Patient` TypeScript interface, a validated intake form (with i18n), and an `appointments` table with a `patient_id` column — but **no `patients` database table exists yet**.

---

## 1. Current State Audit

### What Exists

| Asset | Location | Status |
|-------|----------|--------|
| `Patient` TypeScript interface | `src/entities/patient/model/patient.ts` | ✅ Complete (id, firstName, lastName, email, phone, emergencyContact, medicalHistory, insuranceInfo) |
| Patient intake form (UI + Zod validation) | `src/features/patient-intake/ui/patient-intake-form.tsx` | ✅ Complete (fullName, dateOfBirth, contactNumber, email, medicalHistory, insuranceProvider, insurancePolicyNumber) |
| Staff intake view (table of submissions) | `src/features/patient-intake/ui/staff-intake-view.tsx` | ✅ Complete (reads from `/api/patient-intake`) |
| Intake form i18n (EN + ES) | `messages/en.json`, `messages/es.json` | ✅ Complete |
| `appointments` table | `db/schema/appointments.sql` | ✅ Has `patient_id uuid NOT NULL` — **but no FK** |
| RLS policies on appointments | `supabase/migrations/20240102000000_rls_appointments.sql` | ✅ Staff-role based |
| Patient registration page | `src/app/(patient)/register/page.tsx` | ❌ DEPRECATED/REMOVED (Out of scope) |
| Register patient feature | `src/features/register-patient/` | ❌ DEPRECATED/REMOVED (Out of scope) |
| `/api/patient-intake` route | Does not exist | ❌ Missing |
| `patients` database table | Does not exist | ❌ **Major gap** |

### Key Gaps (In Scope)

1. **No `patients` table** — the intake form posts to `/api/patient-intake` which doesn't exist
2. **No FK constraint** — `appointments.patient_id` references nothing
3. **No CRUD API** — no server-side routes for patient create/read/update/delete

### Intentional Out-of-Scope Decisions

- **No Patient Authentication** — Patients are data records managed by staff, not system users
- **No Patient Portal** — No client-side dashboard for patients; all access is staff-facing
- **New Requirement** — Staff-side UI (admin/reception) to create/edit/manage patient records

---

## 2. Database Schema

### 2a. `patients` Table

```sql
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
```

### 2b. Add FK to `appointments`

```sql
-- Migration: 20240108000000_appointments_patient_fk.sql

ALTER TABLE public.appointments
  ADD CONSTRAINT fk_appointments_patient
  FOREIGN KEY (patient_id) REFERENCES public.patients(id)
  ON DELETE RESTRICT;

CREATE INDEX idx_appointments_patient ON public.appointments (patient_id);
```

### 2c. `patient_intake_submissions` Table (optional: audit trail)

If you want to keep raw intake form submissions separate from the canonical patient record:

```sql
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
```

---

## 3. Row-Level Security (RLS) Policies

### 3a. Patients Table Policies

**Note:** Since the patient portal is out of scope, patients are data records managed by staff only. All RLS policies enforce staff-only access.

```sql
-- Migration: 20240110000000_rls_patients.sql

-- Staff (any authenticated staff member) can manage all patient data
CREATE POLICY "Staff can manage all patient data"
  ON public.patients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
    )
  );
```

### 3b. Intake Submissions Policies (if using audit table)

```sql
-- Staff can view all submissions
CREATE POLICY "Staff can view all intake submissions"
  ON public.patient_intake_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
    )
  );

-- Note: Public intake form submissions bypass RLS via Service Role Key (see Section 5b)
```

---

## 4. TypeScript Model Updates

Update the existing `Patient` interface to align with the database schema:

```typescript
// src/entities/patient/model/patient.ts

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
import { z } from 'zod';

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
```

---

## 5. API Routes

### 5a. Patient CRUD — `src/app/api/patients/route.ts`

```
GET    /api/patients           → List patients (staff only)
POST   /api/patients           → Create patient (staff or self-registration)
GET    /api/patients/[id]      → Get single patient
PATCH  /api/patients/[id]      → Update patient
DELETE /api/patients/[id]      → Soft-delete (set is_active = false)
```

### 5b. Patient Intake — `src/app/api/patient-intake/route.ts`

**Important:** Since public patients cannot authenticate, this endpoint uses the **Supabase Service Role Key** to bypass RLS and write to the database directly. This is safe because the endpoint itself validates input and enforces rate-limiting/CSRF protection.

```
POST   /api/patient-intake     → Submit intake form → create/upsert patient + log submission (public, via Service Role)
GET    /api/patient-intake     → Staff only: list submissions
DELETE /api/patient-intake     → Staff only: delete submission
```

### 5c. Implementation Outline

```typescript
// src/app/api/patient-intake/route.ts
import { createServerClient, createAdminClient } from '@/shared/api/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Use admin client for public intake form (bypasses RLS)
  const supabase = createAdminClient();
  const body = await request.json();

  // 1. Validate with Zod
  // 2. Upsert into patients table (match on email)
  // 3. Log raw submission in patient_intake_submissions
  // 4. Return patient record

  const { data, error } = await supabase
    .from('patients')
    .upsert({
      first_name: body.firstName ?? body.fullName?.split(' ')[0],
      last_name: body.lastName ?? body.fullName?.split(' ').slice(1).join(' '),
      date_of_birth: body.dateOfBirth,
      email: body.email,
      phone: body.contactNumber,
      medical_history: body.medicalHistory,
      insurance_provider: body.insuranceProvider,
      insurance_policy_number: body.insurancePolicyNumber,
    }, { onConflict: 'email' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function GET(request: NextRequest) {
  // Staff only: Use regular server client with RLS
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
```

---

## 6. Implementation Phases

### Phase 1: Database Foundation (Week 1)

| # | Task | Priority |
|---|------|----------|
| 1 | Create `patients` table migration | P0 |
| 2 | Add FK constraint to `appointments` | P0 |
| 3 | Apply RLS policies for patients | P0 |
| 4 | Update `Patient` TypeScript model | P0 |
| 5 | Run migration via Supabase dashboard or CLI | P0 |

### Phase 2: API Routes (Week 1–2)

| # | Task | Priority |
|---|------|----------|
| 6 | Implement `POST /api/patient-intake` (intake form handler) | P0 |
| 7 | Implement `GET /api/patient-intake` (staff view) | P0 |
| 8 | Implement `GET /api/patients` (patient list) | P1 |
| 9 | Implement `GET /api/patients/[id]` (patient detail) | P1 |
| 10 | Implement `PATCH /api/patients/[id]` (update) | P1 |
| 11 | Implement `DELETE /api/patients/[id]` (soft delete) | P2 |

### Phase 3: Connect Frontend (Week 2)

| # | Task | Priority |
|---|------|----------|
| 12 | Wire intake form to `POST /api/patient-intake` (already posts there) | P0 |
| 13 | Wire staff intake view to `GET /api/patient-intake` (already fetches there) | P0 |
| 14 | Build patient search/lookup in staff dashboard | P1 |
| 15 | Update appointment booking to select from existing patients | P1 |
| 16 | Build staff UI to manually create/edit patient records | P1 |

---

## 7. Field Mapping

The intake form fields need to map to database columns:

| Intake Form Field | DB Column | Notes |
|-------------------|-----------|-------|
| `fullName` | `first_name` + `last_name` | Split on first space |
| `dateOfBirth` | `date_of_birth` | Direct mapping |
| `contactNumber` | `phone` | Direct mapping |
| `email` | `email` | Direct mapping, unique constraint |
| `medicalHistory` | `medical_history` | Direct mapping |
| `insuranceProvider` | `insurance_provider` | Direct mapping |
| `insurancePolicyNumber` | `insurance_policy_number` | Direct mapping |

**Recommendation:** Update the intake form to use separate `firstName` / `lastName` fields instead of `fullName` to avoid parsing ambiguity with multi-word names. Update Zod schema accordingly.

---

## 8. Security Considerations

1. **RLS enforced** — All authenticated queries go through Supabase client with user JWT; RLS policies control access for staff operations
2. **Service role key for public intake** — The `/api/patient-intake` endpoint uses the Service Role Key server-side to bypass RLS and accept public form submissions; the endpoint itself validates input and enforces CSRF protection
3. **Email uniqueness** — Prevents duplicate patient records
4. **Soft delete** — `is_active = false` instead of physical deletion (data retention for medical records)
5. **CSRF protection** — Intake form already uses `useCsrfToken()` hook
6. **Input validation** — Zod schema on both client and server
7. **PHI compliance note** — If handling Protected Health Information (HIPAA), consider:
   - Column-level encryption for `medical_history`, `insurance_policy_number`
   - Audit logging of all access to patient records
   - Data retention policies
   - BAA with Supabase (available on Pro plan)

---

## 9. Migration Execution

Run migrations in this order:

```bash
# 1. Create patients table
supabase migration new create_patients
# Copy SQL from Section 2a into the generated file

# 2. Add FK to appointments
supabase migration new appointments_patient_fk
# Copy SQL from Section 2b

# 3. (Optional) Create intake submissions audit table
supabase migration new patient_intake_submissions
# Copy SQL from Section 2c

# 4. Add RLS policies
supabase migration new rls_patients
# Copy SQL from Section 3a

# 5. Apply
supabase db push
```

Or apply directly via the Supabase Dashboard SQL Editor if not using the CLI locally.

---

## 10. Quick-Start: What to Build First

The **minimum viable path** to get patient data flowing into Postgres:

1. **Run the `patients` table migration** (Section 2a) via Supabase Dashboard SQL Editor
2. **Create `/api/patient-intake/route.ts`** (Section 5c) — handles POST from existing form (via Service Role Key) + GET for staff view
3. **Done** — the intake form already posts to `/api/patient-intake` and the staff view already reads from it

Everything else (patient search, staff edit UI, appointment patient selection) builds on top of that foundation.
