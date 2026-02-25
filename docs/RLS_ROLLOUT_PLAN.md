# RLS Rollout Plan

## Overview

This document describes the staged rollout for enabling Row Level Security (RLS) and revoking default public privileges on the four core staff tables:

- `staff_profiles`
- `appointments`
- `notifications`
- `audit_logs`

---

## Migrations Applied

| Migration file | Purpose |
|---|---|
| `20240101000000_create_staff_profiles.sql` | Creates `staff_profiles`, enables RLS, adds SELECT policies |
| `20240102000000_rls_appointments.sql` | Enables RLS on `appointments`, adds role-based policies |
| `20240103000000_rls_notifications.sql` | Creates `notifications`, enables RLS, adds SELECT/UPDATE policies |
| `20240104000000_rls_audit_logs.sql` | Creates `audit_logs`, enables RLS, adds SELECT policies; INSERT restricted to service role |
| `20240105000000_rls_staff_profiles_update.sql` | Adds UPDATE/INSERT/DELETE policies for `staff_profiles` |
| `20240106000000_revoke_public_privileges.sql` | **Revokes all default `PUBLIC`/`anon` access; grants minimum necessary permissions to `authenticated` role** |

---

## Policy Summary

### `staff_profiles`
| Operation | Who can perform it |
|---|---|
| SELECT | Staff member (own row) · Admin (all rows) |
| INSERT | Admin only |
| UPDATE | Staff member (own row) · Admin |
| DELETE | Admin only |

### `appointments`
| Operation | Who can perform it |
|---|---|
| SELECT | Receptionist · Admin · Dentist · Hygienist |
| INSERT / UPDATE / DELETE | Receptionist · Admin |

### `notifications`
| Operation | Who can perform it |
|---|---|
| SELECT | Staff member (own rows) · Admin (all rows) |
| UPDATE | Staff member (own rows) |
| INSERT / DELETE | Service role only |

### `audit_logs`
| Operation | Who can perform it |
|---|---|
| SELECT | Staff member (own rows) · Admin (all rows) |
| INSERT | Service role only (no direct user writes) |
| UPDATE / DELETE | No one (immutable log) |

---

## Rollout Steps

### Stage 1 – Staging Database

1. Apply all migrations in order via the Supabase CLI:
   ```bash
   supabase db push --db-url "$STAGING_DB_URL"
   ```
2. Confirm RLS is enabled on each table:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename IN ('staff_profiles', 'appointments', 'notifications', 'audit_logs');
   ```
   All four rows should show `rowsecurity = true`.
3. Confirm public/anon grants have been revoked:
   ```sql
   SELECT grantee, table_name, privilege_type
   FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND table_name IN ('staff_profiles', 'appointments', 'notifications', 'audit_logs')
     AND grantee IN ('PUBLIC', 'anon');
   ```
   This query should return **zero rows**.
4. Run integration tests against staging:
   ```bash
   npx cypress run --spec "cypress/e2e/rls-access.spec.ts"
   ```
5. Log in as each role (receptionist, dentist/hygienist, admin) and verify:
   - Each staff member can only see data they are authorised to view.
   - No 406/PGRST116 or permission-denied errors appear in the browser console.

### Stage 2 – Code Review & Sign-off

- Review this document and the migration with at least one other engineer.
- Confirm no regressions in the full E2E test suite:
  ```bash
  npx cypress run
  ```
- Sign off on staging stability (24 h with no 5xx errors).

### Stage 3 – Production Database

1. Schedule a low-traffic maintenance window.
2. Take a manual point-in-time backup via the Supabase dashboard.
3. Apply migrations to production:
   ```bash
   supabase db push --db-url "$PRODUCTION_DB_URL"
   ```
4. Re-run the verification queries from Stage 1 against production.
5. Perform a smoke test: log in as one staff member per role and confirm normal operation.
6. Monitor the Supabase dashboard logs and application error tracking for 30 minutes post-deploy.

### Rollback Procedure

If an issue is detected after applying the privilege-revocation migration:

1. Restore public access immediately:
   ```sql
   GRANT ALL ON public.staff_profiles  TO PUBLIC, anon;
   GRANT ALL ON public.appointments    TO PUBLIC, anon;
   GRANT ALL ON public.notifications   TO PUBLIC, anon;
   GRANT ALL ON public.audit_logs      TO PUBLIC, anon;
   ```
2. Investigate the root cause before re-applying the migration.
3. Restore from the pre-migration backup if data integrity is in doubt.

---

## Acceptance Criteria

- [x] RLS enabled on `staff_profiles`, `appointments`, `notifications`, `audit_logs`
- [x] Default `PUBLIC`/`anon` access revoked from all four tables
- [x] `authenticated` role granted only the minimum necessary privileges
- [x] `audit_logs` INSERT restricted to the service role
- [ ] Staging rollout completed with zero regressions
- [ ] Production rollout completed after staging sign-off
