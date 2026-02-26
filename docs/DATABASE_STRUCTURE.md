# My Dental Practice - Database Structure

## Overview
Complete database schema for the My Dental Practice application. This document describes all tables, types, and Row Level Security (RLS) policies.

---

## Enum Types

### `staff_role`
Defines the role of a staff member in the practice.

```sql
CREATE TYPE staff_role AS ENUM ('receptionist', 'hygienist', 'dentist', 'admin');
```

**Values:**
- `receptionist` - Front desk staff
- `hygienist` - Dental hygienist
- `dentist` - Dentist
- `admin` - Administrative/system admin

---

## Tables

### `public.staff_profiles`

Staff member profiles linked to Supabase Auth users.

**Purpose:** Store staff information and define roles, permissions, and account status.

**Columns:**

| Column | Type | NOT NULL | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | ✅ | — | Primary key. References `auth.users(id)`. Cascade on delete. |
| `email` | text | ✅ | — | Staff email address (must match auth.users.email) |
| `role` | staff_role | ✅ | `'receptionist'` | Staff role (receptionist, hygienist, dentist, admin) |
| `first_name` | text | ✅ | `''` | Staff first name |
| `last_name` | text | ✅ | `''` | Staff last name |
| `is_active` | boolean | ✅ | `true` | Account active status. When false, login is denied. |
| `is_admin` | boolean | ✅ | `false` | Admin privileges flag. Controls system administration access. |
| `created_at` | timestamptz | ✅ | `now()` | Timestamp when record was created |
| `updated_at` | timestamptz | ✅ | `now()` | Timestamp when record was last updated |

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `id` → `auth.users(id)` (ON DELETE CASCADE)

---

## Row Level Security (RLS) Policies

All policies are applied to `public.staff_profiles` table.

### Select Policies

#### Policy: "Staff can view their own profile"
- **Operation:** SELECT
- **Condition:** Staff can only view their own profile
- **SQL:** `auth.uid() = id`
- **Use Case:** Users see their own profile information

#### Policy: "Admins can view all staff"
- **Operation:** SELECT
- **Condition:** Admins (is_admin = true) can view all staff profiles
- **SQL:** 
  ```sql
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.id = auth.uid() AND sp.is_admin = true
  )
  ```
- **Use Case:** Admin users manage all staff

### Update Policies

#### Policy: "Staff can update their own profile"
- **Operation:** UPDATE
- **Condition:** Staff can only update their own profile
- **SQL:** `auth.uid() = id`
- **Use Case:** Users update their own information

#### Policy: "Admins can update staff profiles"
- **Operation:** UPDATE
- **Condition:** Admins can update any staff profile
- **SQL:**
  ```sql
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.id = auth.uid() AND sp.is_admin = true
  )
  ```
- **Use Case:** Admins manage staff roles, status, etc.

### Insert Policies

#### Policy: "Admins can insert staff profiles"
- **Operation:** INSERT
- **Condition:** Only admins can create new staff profiles
- **SQL:**
  ```sql
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.id = auth.uid() AND sp.is_admin = true
  )
  ```
- **Use Case:** Admins onboard new staff

### Delete Policies

#### Policy: "Admins can delete staff profiles"
- **Operation:** DELETE
- **Condition:** Only admins can delete staff profiles
- **SQL:**
  ```sql
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.id = auth.uid() AND sp.is_admin = true
  )
  ```
- **Use Case:** Admins remove staff from system

---

## Authentication Flow

### Login Process
1. User enters email + password
2. Supabase Auth validates credentials (`auth.users` table)
3. If valid, NextAuth fetches `staff_profiles` record for user
4. Checks:
   - `is_active` = true (if false, login denied)
   - User `role` is retrieved
   - User `is_admin` flag is checked
5. Session created with role information

### Deactivating Users
To deactivate a user without deleting:
```sql
UPDATE public.staff_profiles
SET is_active = false
WHERE id = '<user-id>';
```
- User can no longer login
- All RLS policies still respect `is_active` status
- Data is preserved for audit/historical records

---

## Example Records

### Admin User
```sql
INSERT INTO public.staff_profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  is_active,
  is_admin
) VALUES (
  '5f371d84-f1e5-4a4b-9d0f-205ab8b3fe1c',
  'oliver.perezit@gmail.com',
  'Oliver',
  'Perez',
  'admin',
  true,
  true
);
```

### Receptionist User
```sql
INSERT INTO public.staff_profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  is_active,
  is_admin
) VALUES (
  '<user-id-from-auth>',
  'receptionist@dentalpractice.com',
  'Jane',
  'Smith',
  'receptionist',
  true,
  false
);
```

### Dentist User
```sql
INSERT INTO public.staff_profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  is_active,
  is_admin
) VALUES (
  '<user-id-from-auth>',
  'dentist@dentalpractice.com',
  'Dr. John',
  'Doe',
  'dentist',
  true,
  false
);
```

---

## Common Queries

### Get all active staff
```sql
SELECT * FROM public.staff_profiles
WHERE is_active = true
ORDER BY role, last_name;
```

### Get all admins
```sql
SELECT * FROM public.staff_profiles
WHERE is_admin = true AND is_active = true;
```

### Deactivate user
```sql
UPDATE public.staff_profiles
SET is_active = false, updated_at = now()
WHERE email = '<email>';
```

### Change user role
```sql
UPDATE public.staff_profiles
SET role = 'dentist', updated_at = now()
WHERE id = '<user-id>';
```

### Grant admin privileges
```sql
UPDATE public.staff_profiles
SET is_admin = true, updated_at = now()
WHERE id = '<user-id>';
```

---

## Security Considerations

1. **RLS Enabled:** All data access controlled by Supabase RLS policies
2. **Cascade On Delete:** If auth user deleted, staff_profiles record auto-deleted
3. **Email Uniqueness:** Email must match auth.users.email for login to work
4. **Active Status:** Always check `is_active` in application logic
5. **Admin Flag:** Separate from role for fine-grained access control

---

## Related Migrations

- `20240101000000_create_staff_profiles.sql` - Initial table creation
- `20240105000000_rls_staff_profiles_update.sql` - RLS policy updates
- `20240106000000_rls_staff_profiles_admin_update.sql` - Admin update policies

---

## Future Extensions

Possible columns to add:
- `phone` - Staff phone number
- `department` - Department/clinic location
- `license_number` - Professional license (for dentist/hygienist)
- `hire_date` - Date staff joined practice
- `employment_status` - Full-time/Part-time/Contractor
- `permissions` - JSON field for granular permissions
- `avatar_url` - Staff profile picture

---

**Last Updated:** February 26, 2026
**Version:** 1.0
