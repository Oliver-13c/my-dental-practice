# Database Audit — Phase 1

**Date:** 2026-02-25  
**Auditor:** @copilot  
**Scope:** `staff_profiles`, `appointments`, `notifications`, `audit_logs`  
**Source files inspected:**
- `supabase/migrations/20240101000000_create_staff_profiles.sql`
- `supabase/migrations/20240102000000_rls_appointments.sql`
- `supabase/migrations/20240103000000_rls_notifications.sql`
- `supabase/migrations/20240104000000_rls_audit_logs.sql`
- `supabase/migrations/20240105000000_rls_staff_profiles_update.sql`
- `db/schema/staff.sql`
- `db/schema/appointments.sql`

---

## Table: `staff_profiles`

### Schema

| Column       | Type           | Nullable | Default         | Notes                          |
|--------------|----------------|----------|-----------------|--------------------------------|
| `id`         | `uuid`         | NOT NULL | —               | PK; FK → `auth.users(id)` CASCADE |
| `role`       | `staff_role`   | NOT NULL | `'receptionist'`| ENUM: receptionist/hygienist/dentist/admin |
| `first_name` | `text`         | NOT NULL | `''`            |                                |
| `last_name`  | `text`         | NOT NULL | `''`            |                                |
| `created_at` | `timestamptz`  | NOT NULL | `now()`         |                                |

**Custom type:** `staff_role ENUM ('receptionist', 'hygienist', 'dentist', 'admin')`

### RLS Status

✅ **Enabled** (`ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;`)

### Policies

| Policy name                          | Operation | Condition / Logic                                   |
|--------------------------------------|-----------|-----------------------------------------------------|
| `Staff can view their own profile`   | SELECT    | `auth.uid() = id`                                   |
| `Admins can view all staff`          | SELECT    | caller has `role = 'admin'` in `staff_profiles`     |
| `Staff can update their own profile` | UPDATE    | `auth.uid() = id` (USING + WITH CHECK)              |
| `Admins can insert staff profiles`   | INSERT    | caller has `role = 'admin'` in `staff_profiles`     |
| `Admins can delete staff profiles`   | DELETE    | caller has `role = 'admin'` in `staff_profiles`     |

### Indexes

| Index | Columns | Notes                        |
|-------|---------|------------------------------|
| PK    | `id`    | Auto-created on PRIMARY KEY  |

⚠️ No explicit secondary indexes defined. Consider indexing `role` if queries filter by role frequently.

### Foreign Keys

| Column | References              | On Delete |
|--------|-------------------------|-----------|
| `id`   | `auth.users(id)`        | CASCADE   |

### Sensitive Columns

| Column       | Sensitivity | Notes                    |
|--------------|-------------|--------------------------|
| `first_name` | Medium      | PII                      |
| `last_name`  | Medium      | PII                      |
| `role`       | Medium      | Controls access level    |

### Anomalies / Gaps

1. **No `email` column** — Staff email lives only in `auth.users`. Querying staff by email requires a join to `auth.users`, which is only accessible via the service role. Recommended: add a denormalized (read-only) `email text` column or a database view.
2. **No `updated_at` column** — Audit trail for profile changes is absent at the row level.
3. **Recursive admin check** — The admin policies do a sub-select on the same `staff_profiles` table. On the very first INSERT there is no row yet, so `Admins can insert staff profiles` will fail if no admin row exists. A bootstrap mechanism (e.g., service-role seed or a `handle_new_staff` trigger) is required.
4. **`db/schema/staff.sql` drift** — The legacy schema file omits default values (`''`) on `first_name`/`last_name`, and the migration file includes them. Keep a single source of truth.

### Suggested Owner

Backend / Supabase lead

### Estimated Effort (fixes)

| Fix                                | Effort  |
|------------------------------------|---------|
| Add `updated_at` column + trigger  | ~1 h    |
| Add `email` view / column          | ~2 h    |
| Document bootstrap flow            | ~1 h    |
| Reconcile schema vs migration file | ~30 min |

---

## Table: `appointments`

### Schema

| Column             | Type          | Nullable | Default              | Notes                        |
|--------------------|---------------|----------|----------------------|------------------------------|
| `id`               | `uuid`        | NOT NULL | `gen_random_uuid()`  | PK                           |
| `patient_id`       | `uuid`        | NOT NULL | —                    | No FK constraint declared    |
| `appointment_date` | `date`        | NOT NULL | —                    |                              |
| `appointment_time` | `time`        | NOT NULL | —                    |                              |
| `status`           | `text`        | NOT NULL | `'pending'`          | Free-form; no ENUM or CHECK  |
| `created_at`       | `timestamptz` | NOT NULL | `now()`              |                              |

*(Source: `db/schema/appointments.sql`; RLS migration: `20240102000000_rls_appointments.sql`)*

### RLS Status

✅ **Enabled** (`ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;`)

### Policies

| Policy name                              | Operation | Condition / Logic                                               |
|------------------------------------------|-----------|-----------------------------------------------------------------|
| `Receptionists can manage all appointments` | ALL    | caller has `role IN ('receptionist', 'admin')` (USING + WITH CHECK) |
| `Clinical staff can view appointments`   | SELECT    | caller has `role IN ('dentist', 'hygienist')`                   |

### Indexes

| Index | Columns | Notes                        |
|-------|---------|------------------------------|
| PK    | `id`    | Auto-created on PRIMARY KEY  |

⚠️ No indexes on `patient_id`, `appointment_date`, or `status`. High-volume queries will full-scan.

### Foreign Keys

| Column       | References | On Delete | Notes                               |
|--------------|------------|-----------|-------------------------------------|
| `patient_id` | —          | —         | ⚠️ No FK declared; referential integrity not enforced |

### Sensitive Columns

| Column             | Sensitivity | Notes                                    |
|--------------------|-------------|------------------------------------------|
| `patient_id`       | High        | Links record to a patient (PHI adjacent) |
| `appointment_date` | Medium      | Scheduling PII                           |
| `appointment_time` | Medium      | Scheduling PII                           |
| `status`           | Low         |                                          |

### Anomalies / Gaps

1. **Missing FK on `patient_id`** — No referential integrity to a `patients` table (or `auth.users`). Records can be orphaned.
2. **`status` is free-form `text`** — No CHECK constraint or ENUM. Invalid statuses (e.g., typos) can be inserted silently.
3. **No `created_by` / `assigned_to` column** — There is no way to know which staff member booked or owns an appointment.
4. **No `updated_at` column** — Changes cannot be tracked at the row level.
5. **No patient-facing RLS policy** — If patients ever have direct Supabase access, they cannot view their own appointments. A patient SELECT policy is missing.
6. **Missing performance indexes** — `appointment_date`, `patient_id`, and `status` are common filter columns with no index.

### Suggested Owner

Backend / Supabase lead + Clinical lead (to validate status values)

### Estimated Effort (fixes)

| Fix                                          | Effort  |
|----------------------------------------------|---------|
| Add FK `patient_id → patients(id)`           | ~1 h    |
| Add CHECK/ENUM for `status`                  | ~30 min |
| Add `created_by`, `updated_at` columns       | ~1 h    |
| Add patient SELECT policy                    | ~30 min |
| Add indexes (`patient_id`, `appointment_date`) | ~30 min |

---

## Table: `notifications`

### Schema

| Column       | Type          | Nullable | Default             | Notes                          |
|--------------|---------------|----------|---------------------|--------------------------------|
| `id`         | `uuid`        | NOT NULL | `gen_random_uuid()` | PK                             |
| `user_id`    | `uuid`        | NOT NULL | —                   | FK → `auth.users(id)` CASCADE  |
| `message`    | `text`        | NOT NULL | —                   | Notification body              |
| `read`       | `boolean`     | NOT NULL | `false`             |                                |
| `created_at` | `timestamptz` | NOT NULL | `now()`             |                                |

### RLS Status

✅ **Enabled** (`ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`)

### Policies

| Policy name                        | Operation | Condition / Logic                               |
|------------------------------------|-----------|-------------------------------------------------|
| `Staff can view own notifications` | SELECT    | `auth.uid() = user_id`                          |
| `Staff can update own notifications` | UPDATE  | `auth.uid() = user_id`                          |
| `Admins can view all notifications`| SELECT    | caller has `role = 'admin'` in `staff_profiles` |

### Indexes

| Index | Columns   | Notes                        |
|-------|-----------|------------------------------|
| PK    | `id`      | Auto-created on PRIMARY KEY  |

⚠️ No index on `user_id`. Fetching a user's notifications requires a full table scan.

### Foreign Keys

| Column    | References       | On Delete |
|-----------|------------------|-----------|
| `user_id` | `auth.users(id)` | CASCADE   |

### Sensitive Columns

| Column    | Sensitivity | Notes                                  |
|-----------|-------------|----------------------------------------|
| `message` | High        | May contain PHI or operational details |
| `user_id` | Medium      | Identifies the recipient               |

### Anomalies / Gaps

1. **No INSERT policy for staff** — There is no RLS policy allowing any role to insert notifications directly. Inserts must go through the service role or a privileged function. This is intentional if notifications are server-generated, but should be documented explicitly.
2. **No DELETE policy** — Users cannot delete their own notifications; admins cannot purge them. A retention/cleanup mechanism is absent.
3. **Missing index on `user_id`** — Critical for per-user notification queries.
4. **`message` column is unstructured** — No schema for notification type/category. Filtering or templating requires full-text search or application-side parsing.

### Suggested Owner

Backend / Notifications lead

### Estimated Effort (fixes)

| Fix                                              | Effort  |
|--------------------------------------------------|---------|
| Add index on `user_id`                           | ~15 min |
| Add DELETE policy (user or admin)                | ~15 min |
| Document insert-via-service-role contract        | ~30 min |
| Add `type` / `category` column for notifications | ~1 h    |

---

## Table: `audit_logs`

### Schema

| Column          | Type          | Nullable | Default             | Notes                         |
|-----------------|---------------|----------|---------------------|-------------------------------|
| `id`            | `uuid`        | NOT NULL | `gen_random_uuid()` | PK                            |
| `user_id`       | `uuid`        | NOT NULL | —                   | FK → `auth.users(id)` CASCADE |
| `action`        | `text`        | NOT NULL | —                   | Free-form action description  |
| `resource_type` | `text`        | NULL     | —                   | e.g. `'appointment'`          |
| `resource_id`   | `text`        | NULL     | —                   | ID of the affected resource   |
| `metadata`      | `jsonb`       | NULL     | —                   | Arbitrary extra context       |
| `created_at`    | `timestamptz` | NOT NULL | `now()`             |                               |

### RLS Status

✅ **Enabled** (`ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;`)

### Policies

| Policy name                      | Operation | Condition / Logic                               |
|----------------------------------|-----------|-------------------------------------------------|
| `Staff can view own audit logs`  | SELECT    | `auth.uid() = user_id`                          |
| `Admins can view all audit logs` | SELECT    | caller has `role = 'admin'` in `staff_profiles` |

### Indexes

| Index | Columns | Notes                        |
|-------|---------|------------------------------|
| PK    | `id`    | Auto-created on PRIMARY KEY  |

⚠️ No indexes on `user_id`, `action`, `resource_type`, or `created_at`. Audit queries (e.g., "all actions by user X in date range") will full-scan.

### Foreign Keys

| Column    | References       | On Delete |
|-----------|------------------|-----------|
| `user_id` | `auth.users(id)` | CASCADE   |

⚠️ `ON DELETE CASCADE` on an audit table means deleting a user also deletes their audit trail — this is typically undesirable for compliance.

### Sensitive Columns

| Column          | Sensitivity | Notes                                          |
|-----------------|-------------|------------------------------------------------|
| `user_id`       | High        | Identifies the acting staff member             |
| `action`        | High        | May contain sensitive operational detail       |
| `metadata`      | High        | Arbitrary JSONB; could contain PHI if misused  |
| `resource_id`   | Medium      | Could reveal what records were accessed        |

### Anomalies / Gaps

1. **`ON DELETE CASCADE` on audit trail** — Deleting an `auth.users` row cascades to `audit_logs`, destroying the audit history. This likely violates HIPAA/SOC2 audit retention requirements. Change to `ON DELETE SET NULL` or `ON DELETE RESTRICT`.
2. **No INSERT policy** — Only the service role can write audit logs (intended). Should be explicitly documented and enforced with a dedicated DB function (e.g., `log_audit_event()`).
3. **No UPDATE / DELETE policy for anyone** — Audit records should be immutable. Confirm `UPDATE` and `DELETE` are blocked for all roles (currently they are, by default with RLS enabled and no policy for those operations — but this should be explicitly tested).
4. **`action` is free-form text** — No standardised vocabulary. Recommend an ENUM or a lookup table.
5. **No composite index** — Queries like `WHERE user_id = X AND created_at BETWEEN ...` are common for audit review but have no supporting index.
6. **`metadata` contains arbitrary JSONB** — Risk of accidental PHI capture. Establish a schema contract for what keys are allowed.

### Suggested Owner

Security / Compliance lead

### Estimated Effort (fixes)

| Fix                                                    | Effort   |
|--------------------------------------------------------|----------|
| Change `ON DELETE CASCADE` → `RESTRICT` or `SET NULL`  | ~30 min  |
| Add composite index `(user_id, created_at)`            | ~15 min  |
| Add index on `resource_type`                           | ~15 min  |
| Create `log_audit_event()` function + document contract| ~2 h     |
| Define ENUM / allowed values for `action`              | ~1 h     |
| Document JSONB metadata schema contract                | ~1 h     |

---

## Cross-Table Observations

| Observation | Tables Affected | Priority |
|-------------|-----------------|----------|
| No `updated_at` audit columns | `staff_profiles`, `appointments` | Medium |
| Admin policies rely on recursive self-join on `staff_profiles` — may create lock contention under load | All | Medium |
| No patient table defined; `appointments.patient_id` is an unresolved FK | `appointments` | High |
| Service-role-only writes not formally documented or enforced via DB function | `notifications`, `audit_logs` | Medium |
| No database-level constraints on free-form status/action fields | `appointments`, `audit_logs` | Medium |

---

## Summary Status

| Table            | RLS Enabled | Policies Complete | Indexes Adequate | FK Integrity | Notable Risk          |
|------------------|:-----------:|:-----------------:|:----------------:|:------------:|-----------------------|
| `staff_profiles` | ✅          | ✅ (all CRUD)     | ⚠️ Missing role idx | ✅        | Recursive admin check |
| `appointments`   | ✅          | ⚠️ Missing patient policy | ❌ Missing date/patient idx | ❌ No patient FK | Free-form status |
| `notifications`  | ✅          | ⚠️ Missing DELETE | ❌ Missing user_id idx | ✅     | No INSERT policy doc  |
| `audit_logs`     | ✅          | ⚠️ No INSERT doc  | ❌ Missing composite idx | ⚠️ CASCADE risk | Immutability unverified |

---

## Proposed Next Steps (Prioritised)

| # | Action | Table(s) | Owner | Effort | Priority |
|---|--------|----------|-------|--------|----------|
| 1 | Change `audit_logs.user_id` FK to `ON DELETE RESTRICT` | `audit_logs` | Security/Compliance | 30 min | 🔴 High |
| 2 | Add FK `appointments.patient_id → patients(id)` (after `patients` table is created) | `appointments` | Backend | 1 h | 🔴 High |
| 3 | Add patient SELECT policy on `appointments` | `appointments` | Backend | 30 min | 🔴 High |
| 4 | Add CHECK constraint / ENUM for `appointments.status` | `appointments` | Backend | 30 min | 🟠 Medium |
| 5 | Add index `notifications(user_id)` | `notifications` | Backend | 15 min | 🟠 Medium |
| 6 | Add composite index `audit_logs(user_id, created_at)` | `audit_logs` | Backend | 15 min | 🟠 Medium |
| 7 | Add `updated_at` column + trigger to `staff_profiles` and `appointments` | Both | Backend | 1 h | 🟠 Medium |
| 8 | Document and enforce service-role-only insert contract for `notifications` and `audit_logs` | Both | Backend | 1 h | 🟠 Medium |
| 9 | Add `created_by` column to `appointments` | `appointments` | Backend | 1 h | 🟡 Low |
| 10 | Define ENUM / allowed-values list for `audit_logs.action` | `audit_logs` | Security | 1 h | 🟡 Low |
| 11 | Reconcile `db/schema/staff.sql` with migration files (single source of truth) | `staff_profiles` | Backend | 30 min | 🟡 Low |
| 12 | Add index `staff_profiles(role)` | `staff_profiles` | Backend | 15 min | 🟡 Low |
