# Master Project Plan

## 1. Architecture & Schema

### Goal
Make the live system trustworthy before building more UI on top of it.

### Priority A: Fix the access model
- Split Supabase access into:
  - request-scoped user client
  - explicit admin/service client
- Stop using the current generic helper in src/shared/api/supabase-server.ts as the default for normal API routes.
- Add explicit auth and role checks to all protected routes before any privileged query.

### Priority B: Remove unsafe public account creation
- Remove the public signup route and form.
- Remove the “first confirmed user becomes admin” bootstrap logic.
- Make staff creation invite-only or admin-created.

### Priority C: Normalize the schema contract
- Generate real Supabase types to replace src/shared/api/supabase-types.ts.
- Reconcile the audit model so one table and one reader/writer path is canonical.
- Verify current migrations and policies against actual route behavior:
  - patients
  - appointments
  - notifications
  - provider schedules
  - audit/admin actions

### Priority D: Consolidate integrations
- Keep one reminder implementation:
  - retain the cron + notification-service path
  - retire or rewrite src/lib/scheduler/check-appointment-reminders.ts
- Bring the recall edge function into line with the real patient schema.
- Fail closed for missing Google webhook/calendar secrets instead of using defaults.

## 2. UI/UX Specs

### Goal
Replace every remaining hard-coded or placeholder user flow with one canonical routed experience.

### Canonical route decisions
- Keep /admin as the only admin surface.
- Redirect or remove old /staff/admin pages.
- Remove or archive orphan placeholder components:
  - features/staff-dashboard/ui/StaffDashboard.tsx
  - widgets/AppointmentCalendar/ui/AppointmentCalendar.tsx
  - legacy book-appointment scaffold if not reused

### Booking completion
- Make src/features/appointment-booking/ui/AppointmentBookingWizard.tsx the canonical booking UI.
- Align its payload with the live appointments API contract.
- Replace raw date/time entry with real availability-backed slot selection.
- Localize language selection instead of forcing English in booking notifications.
- Add real success, failure, and conflict states.

### Staff/admin UX completion
- Wire old hard-coded admin actions to real endpoints or remove the old page entirely.
- Build a distinct hygienist workflow instead of reusing dentist UI as a placeholder.
- Replace alert() and confirm() with accessible feedback and confirmation components.
- Add mobile/tablet-safe layouts for admin and staff management views.

### Translation cleanup
- Collapse duplicate message sources into one source of truth.
- Remove leftover placeholder copy and untranslated strings.
- Standardize terminology for roles, statuses, and actions.

## 3. Security & RLS

### Goal
Make auth, RLS, privacy, and audit behavior real, not implied.

### Required hardening
- Remove public signup.
- Add per-route authorization independent of middleware.
- Ensure anonymous intake cannot overwrite canonical patient records.
- Make public intake append-only to submissions, then add staff review/merge.

### Data protection
- Stop logging reset links, profile payloads, and unnecessary email/PII.
- Sanitize audit metadata.
- Define one audit source of truth and retention strategy.
- Move rate limiting from in-memory to a shared store for production.

### CSP and platform hardening
- Keep CSP report-only only long enough to finish allowlist tuning.
- Then enforce CSP instead of leaving it report-only.
- Review Vercel live-toolbar CSP noise separately from actual app runtime errors.

## 4. QA Test Suite

### Goal
Prove the real business flows work and remove false confidence from stale tests.

### First test wave
- Route/integration tests for:
  - appointment create
  - appointment conflict
  - appointment reschedule
  - appointment cancel
  - admin user create/update/deactivate/reset
- End-to-end flow:
  - receptionist books appointment
  - provider sees appointment
  - appointment status changes
  - reminder job runs
  - cancellation/reschedule updates propagate

### Test cleanup
- Convert mounted Cypress specs into real component tests or real browser E2E.
- Remove or rewrite RLS specs that target missing or outdated routes.
- Expand CI beyond smoke and login-only checks.

### Final regression gate
- Auth and role checks
- Protected API access rejection
- Notification failure handling
- Calendar sync failure handling
- Bilingual UI checks on critical flows
## 5. Dentist Enablement Backlog

### Phase 1: Real Roles in Admin (Priority)
- [x] Enable real role options in create/edit user UI: `dentist`, `hygienist`, `receptionist`, `admin`.
- [x] Remove frontend mapping `staff -> receptionist` and send the selected role directly.
- [ ] Verify backend persistence in `/api/admin/users` for `dentist` and `hygienist`.
- [x] Add role filters in admin users panel for clinical roles.
- [x] Define and document role permissions (dentist vs receptionist vs admin).

### Phase 2: Dentist Personalized Surface
- [x] Create or refine dedicated route `/staff/dentist` with clinical layout.
- [x] Show dentist day/week schedule for authenticated provider.
- [x] Show quick patient snapshot for the current appointment: name, contact, reason, medical notes.
- [x] Add clinical appointment states: `waiting`, `in-progress`, `completed`, `no-show`.
- [x] Add quick actions: start visit, complete visit, add/update clinical note.
- [x] Add "current patient" + "upcoming patients" panels.

### Phase 3: Patient Data Scope and Safety
- [ ] Define minimum required fields for in-visit patient card.
- [ ] Define sensitive fields and explicit redaction rules per role.
- [x] Build reusable `PatientSnapshotCard` component in shared/feature UI.
- [x] Register audit events for clinical read/update actions.
- [ ] Review and update RLS policies so each role can only access permitted data.

### Phase 4: Calendar Strategy (App-first + Gmail Optional)
- [ ] Keep internal app calendar as primary source of truth (MVP).
- [ ] Add optional Google Calendar connect toggle per dentist user.
- [ ] Implement OAuth connect/disconnect flow for staff Google account.
- [ ] Implement initial sync operations: create, update, cancel event.
- [ ] Implement conflict/fallback behavior: if Google fails, app schedule remains authoritative.
- [ ] Add connection status UI: connected, error, reconnect, disconnect.

### Phase 5: QA and Security Hardening
- [ ] Add E2E for dentist user creation and dentist dashboard access.
- [ ] Add permission tests for forbidden role access to clinical routes.
- [ ] Add tests for app calendar flow with Google disconnected.
- [ ] Add tests for app calendar flow with Google connected and sync failures.
- [ ] Add data exposure tests to ensure sensitive fields are not leaked.

### Delivery Order
- [ ] 1) Real roles in Admin UI + persistence.
- [ ] 2) Dentist personalized dashboard with internal schedule.
- [ ] 3) Patient snapshot + clinical actions.
- [ ] 4) Optional Google Calendar integration.
- [ ] 5) QA, audit, and security hardening.
