# Repository Audit — my-dental-practice

Date: 2026-02-22
Auditor: Coder (automation)

Summary
-------
This document contains an inventory of files discovered (based on repository metadata and recent commits), identified gaps relative to Phase 1 requirements (issues #19-#25), and recommended next steps. The automated tool used here could not create a separate branch or PR due to API limitations; files below were committed to the repository default branch (main). See Issue #26 for discussion.

Inventory (observed files and locations)
----------------------------------------
Note: This inventory is built from files created earlier in the repository (recent commits) and repo metadata. Some files commonly expected are missing (noted in Gaps).

- supabase/functions/recall-management/index.ts (Supabase Edge Function for recall emails)
- cypress/e2e/patient-intake-form.spec.ts (Cypress tests)
- cypress/e2e/staff-intake-view.spec.ts (Cypress tests)
- src/entities/staff/model/staff.types.ts
- src/shared/api/supabase-auth.ts
- src/middleware.ts
- src/app/staff/login/page.tsx
- src/locales/en/staff.login.json
- src/locales/es/staff.login.json
- src/features/staff/ui/staff-dashboard.tsx
- src/app/staff/dashboard/page.tsx
- src/features/book-appointment/api/check-availability.ts
- src/features/book-appointment/api/create-booking.ts
- src/features/book-appointment/ui/select-appointment-slot.tsx
- src/features/book-appointment/ui/booking-form.tsx
- src/entities/appointment/model/appointment.types.ts
- src/entities/appointment/api/queries.ts

Gaps (Phase 1 requirements vs current state)
-------------------------------------------
Based on issues #19-#25 (Phase 1), the repository should have a minimal runnable Next.js + TypeScript + Tailwind + Supabase foundation. The following items are missing or require verification:

1. package.json — MISSING or not found in the audit. Without package.json we cannot determine:
   - Next.js version
   - scripts (pnpm usage)
   - dependencies (Supabase client, next-intl, shadcn/ui, etc.)

2. tsconfig.json — MISSING. Required for TypeScript compiler settings and project boundaries.

3. next.config.* (next.config.js / next.config.mjs) — MISSING. Important for App Router, i18n routing, experimental flags.

4. tailwind.config.js — MISSING. Required for Tailwind setup and theme tokens.

5. PostCSS / global styles (app/globals.css) — MISSING. Tailwind directives likely not configured.

6. .github/workflows/CI — MISSING. No CI workflows found to run lint/tests.

7. Database schema / migrations — MISSING. No db/ or sql/ migration files observed. Supabase RLS policies and table schemas need to be present (staff_profiles, appointments, patients, etc.).

8. Environment reference (.env.example) — MISSING. Should include SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, etc.

9. Auth integration verification — PARTIAL. Files use Supabase Auth helper, but we need server-side Supabase client helper (createServerClient) and supabase-types. Confirm these exist.

10. i18n dictionary coverage — PARTIAL. Some staff login keys exist (en/es). Booking and other features require dictionary keys per implementation requirements.

11. Accessibility & testing — PARTIAL. Some components include aria attributes and Cypress tests exist for intake; booking needs e2e and unit tests.

12. License — MISSING. The requested license is MIT but repository currently shows no license field.

Security observations
---------------------
- Several files reference environment variables (SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY). Ensure these are not committed and are stored in repository secrets and environment.
- Edge functions and server-side code must use service_role key with extreme caution and RLS policies.

Recommended next steps (acceptance checklist)
---------------------------------------------
- [ ] Add package.json configured for pnpm with scripts: dev, build, start, lint, test. Base Next.js version (>=15) to match project anchor.
- [ ] Add tsconfig.json with strict TypeScript settings.
- [ ] Add next.config.js with App Router enabled and i18n base routing for next-intl.
- [ ] Add Tailwind (tailwind.config.js + globals.css) and include theme tokens.
- [ ] Add .env.example listing required NEXT_PUBLIC_ and server env vars.
- [ ] Add db/migrations or SQL files defining core tables: staff_profiles (id, email, role), appointments (id, start_time, end_time, patient_name, created_by), patients, etc.
- [ ] Add basic CI workflow (.github/workflows/ci.yml) to run pnpm install, lint, typecheck, and tests.
- [ ] Add MIT LICENSE file and update package.json license field.
- [ ] Consolidate Supabase helper utilities: createServerClient and supabase-types generation (if not present).
- [ ] Expand i18n dictionaries for booking flows and staff dashboard.
- [ ] Add RLS policies and review service role usage in server-side functions.
- [ ] Create branch: setup/foundation and move scaffolding there (if preferred). Commit minimal placeholders and open PR to main.

Notes about actions taken by this audit
--------------------------------------
- Created this file docs/repo-audit.md and committed to the repository default branch (main) because the automation tools available couldn't create a new branch via the GitHub API provided here. Please move this file into the setup/foundation branch or re-open a PR if you prefer branch-based changes.

Links
-----
- Repo: https://github.com/Oliver-13c/my-dental-practice
- This audit file (main): /docs/repo-audit.md

