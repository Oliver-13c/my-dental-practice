# Production Readiness Work Plan
**Staff-Only Clinic Management System** (Doctor + Receptionist + Admin)

No patient access or external scheduling in this phase.

## Phase 1: Core Stability (Weeks 1–2)
**Goal:** Make clinic staff system production-ready.
**Scope:** Doctor + Receptionist + Admin roles only.

### 1.1 Data Layer & RLS
- [ ] Audit all tables: `staff_profiles`, `appointments`, `notifications`, `audit_logs`
- [ ] Enable RLS on all tables
- [ ] Write & test RLS policies:
  - Staff can only see own profile
  - Receptionist sees all appointments + doctor calendars
  - Doctor sees only assigned appointments + reminders sent
  - Admin sees all (with bypass flag if needed)
- [ ] Test role boundaries with actual queries

### 1.2 Error Handling & Logging
- [ ] Set up Sentry or Logtail for error tracking
- [ ] Add centralized API error handler
- [ ] Log all staff actions: login, appointment changes, notes
- [ ] Alert on 5xx errors

### 1.3 Security Hardening
- [x] Add CSP (Content-Security-Policy) headers
- [x] Enable HSTS, X-Frame-Options
- [ ] Implement rate limiting on `/staff/login` (e.g., 5 attempts/5min)
- [ ] Validate all form inputs server-side
- [ ] Add CSRF token to sensitive mutations

### 1.4 Testing
- [ ] E2E: Login → Dashboard → View appointments → Logout
- [ ] E2E: Receptionist books appointment → Dentist sees it
- [ ] Unit tests for role-based access logic
- [ ] Smoke tests on pre-deploy

---

## Phase 2: Operational Excellence (Weeks 3–4)
**Goal:** Deployable, observable, recoverable system.

### 2.1 Email & Notifications
- [ ] Verify Resend API key and sender domain
- [ ] Test appointment reminder flow (24h before)
- [ ] Implement retry logic for failed emails (exponential backoff)
- [ ] Track email delivery/bounce rates
- [ ] Document fallback procedure if email fails

### 2.2 Backups & Recovery
- [ ] Enable automated Supabase daily backups
- [ ] Document manual backup restore steps
- [ ] Test restore procedure (data consistency check)
- [ ] Set up monitoring alerts for backup failures

### 2.3 Observability
- [ ] Dashboard/metrics for key flows (appointments booked/day, staff logins, errors)
- [ ] Uptime monitoring (Pingdom/Uptime Robot on `/staff/login`)
- [ ] Performance tracking (page load times, API latency)
- [ ] Audit log viewer for admin (who changed what, when)

### 2.4 Compliance & Privacy
- [ ] Document data retention policy (how long to keep appointments, etc.)
- [ ] Ensure no PII in logs (sanitize audit logs)
- [ ] Add "data export" endpoint for GDPR-like requests
- [ ] Review staff onboarding checklist (security, privacy training)

---

## Phase 3: Admin Dashboard & Stats (Week 5)
**Goal:** Give admin visibility into clinic operations.

### 3.1 Admin Dashboard
- [ ] Build admin stats view:
  - Total appointments (week, month)
  - Appointments by doctor
  - Cancellations/rescheduled count
  - Average appointment duration
  - Reminder delivery rate (successful/failed)
  - Staff activity log (logins, changes)
- [ ] Add simple charts: appointments trend, staff activity
- [ ] Export data (CSV) for reporting

### 3.2 Doctor Calendar View
- [ ] Doctor can see own calendar with all booked appointments
- [ ] Receptionist can view all doctors' calendars (grid/list)
- [ ] Quick-view appointment details (patient notes, procedure type)
- [ ] Appointment status indicators (confirmed, pending, completed)

### 3.3 Appointment Management
- [ ] Receptionist books/reschedules/cancels appointments
- [ ] Auto-reminder triggers (24h before appointment)
- [ ] Reminder delivery status tracking
- [ ] Bulk actions: send reminder, cancel series, export list

### 3.4 Content & Localization
- [ ] Check `messages/en.json` and `messages/es.json` completeness
- [ ] List missing keys (dashboard, stats, appointment labels)
- [ ] Add missing translations
- [ ] Test Spanish language toggle on all pages

### 3.5 UI/UX Polish
- [ ] Review error messages: clear to staff?
- [ ] Test on mobile (receptionist may use tablet at desk)
- [ ] Accessibility audit: WCAG 2.1 AA compliance
- [ ] Test keyboard navigation (tab, enter, escape)

---

---

## Deployment Checklist (Before Launch)

- [ ] All env vars set on Vercel (AUTH_SECRET, AUTH_URL, RESEND_API_KEY, etc.)
- [ ] DB backups tested
- [ ] Sentry/logging configured and tested
- [ ] Rate limiting active
- [ ] RLS enabled + policies verified
- [ ] E2E tests pass
- [ ] Load test: 10 concurrent staff users
- [ ] Staging deployment 24h stable (no errors)
- [ ] Rollback procedure documented
- [ ] Staff trained on system
- [ ] Support escalation process in place

---

## Success Metrics

- **Uptime:** 99.5%+ (staff can rely on it)
- **Error rate:** <0.1% of requests
- **Performance:** Dashboard loads <2s
- **Test coverage:** >70% critical paths
- **Security:** 0 known vulnerabilities (check Snyk weekly)

