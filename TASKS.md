# Production Readiness Tasks

Track progress on production launch. Convert each task to a GitHub issue if needed.

---

## Phase 1: Core Stability (Weeks 1–2)

### Data Layer & RLS

- [ ] **Task 1.1.1:** Audit database tables
  - Check: `staff_profiles`, `appointments`, `notifications`, `audit_logs`
  - Document current state (RLS enabled? policies in place?)
  - Priority: HIGH

- [ ] **Task 1.1.2:** Enable RLS on all staff tables
  - Enable RLS on `staff_profiles`, `appointments`, `audit_logs`, `notifications`
  - Prevent default access
  - Priority: HIGH

- [ ] **Task 1.1.3:** Write RLS policy for staff_profiles
  - Staff can read/update only own row
  - Admin can read all
  - Test with: receptionist, doctor, admin roles
  - Priority: HIGH

- [ ] **Task 1.1.4:** Write RLS policy for appointments
  - Receptionist: read/write all; manage calendar
  - Doctor: read assigned; read reminders sent
  - Admin: read all
  - Test with real data
  - Priority: HIGH

- [ ] **Task 1.1.5:** Write RLS policy for audit_logs & notifications
  - Staff: read own activity only
  - Admin: read all
  - Priority: MEDIUM

- [ ] **Task 1.1.6:** Test RLS end-to-end
  - Login as each role
  - Verify data boundaries
  - Document any gaps
  - Priority: HIGH

### Error Handling & Logging

- [ ] **Task 1.2.1:** Set up Sentry or Logtail
  - Choose platform (recommend Sentry for simplicity)
  - Add SDK to Next.js
  - Configure error capture + alerts
  - Priority: HIGH

- [ ] **Task 1.2.2:** Centralize API error handler
  - Create utils/api-error.ts
  - Standardize error responses (status, message, code)
  - Log to Sentry on 5xx
  - Priority: HIGH

- [ ] **Task 1.2.3:** Audit logging for staff actions
  - Log: login, logout, appointment changes (create/update/delete), notes added
  - Store in `audit_logs` table
  - Include: user_id, action, resource_type, timestamp
  - Priority: MEDIUM

- [ ] **Task 1.2.4:** Set up alert on 5xx errors
  - Sentry: alert on error rate >1%
  - Slack/email notification
  - Test alert flow
  - Priority: MEDIUM

### Security Hardening

- [ ] **Task 1.3.1:** Add security headers
  - CSP (Content-Security-Policy)
  - HSTS (Strict-Transport-Security)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Add to next.config.mjs
  - Priority: HIGH

- [ ] **Task 1.3.2:** Implement rate limiting on /staff/login
  - Limit: 5 attempts per 5 minutes per IP
  - Use library: ratelimit or upstash-redis
  - Return 429 on limit exceeded
  - Priority: HIGH

- [ ] **Task 1.3.3:** Server-side form validation
  - Audit all API routes: validate email, password, appointment data
  - Reject invalid input with 400
  - Use zod for schema validation
  - Priority: HIGH

- [ ] **Task 1.3.4:** Add CSRF protection
  - Implement anti-CSRF tokens on state-changing mutations
  - Verify token on server
  - Priority: MEDIUM

### Testing

- [ ] **Task 1.4.1:** E2E test: Login → Dashboard → Logout
  - Use Cypress (already in project)
  - Test both staff/login and /staff/dashboard
  - Priority: HIGH

- [ ] **Task 1.4.2:** E2E test: Receptionist books appointment → Doctor sees it
  - Create appointment via receptionist
  - Verify doctor sees it in calendar
  - Priority: HIGH

- [ ] **Task 1.4.3:** Unit tests for role-based access
  - Test RLS policy logic (mock Supabase)
  - Test NextAuth authorize callback
  - Aim for >80% coverage on auth
  - Priority: MEDIUM

- [ ] **Task 1.4.4:** Smoke tests on pre-deploy
  - Automated check: login page loads, dashboard accessible, health endpoint 200
  - Run on every Vercel deploy
  - Priority: MEDIUM

---

## Phase 2: Operational Excellence (Weeks 3–4)

### Email & Notifications

- [ ] **Task 2.1.1:** Verify Resend API setup
  - Test sending from correct domain
  - Check DKIM/SPF records
  - Verify sender address is authorized
  - Priority: HIGH

- [ ] **Task 2.1.2:** Test appointment reminder flow
  - Appointment at 10am tomorrow
  - Trigger reminder at 10am today (24h before)
  - Verify email received by doctor + receptionist
  - Priority: HIGH

- [ ] **Task 2.1.3:** Implement retry logic for failed emails
  - Exponential backoff: 1s, 5s, 30s, 5m
  - Max 3 retries
  - Store retry count in DB
  - Priority: MEDIUM

- [ ] **Task 2.1.4:** Track email delivery metrics
  - Dashboard widget: emails sent/failed today
  - Alert if failure rate >5%
  - Priority: MEDIUM

### Backups & Recovery

- [ ] **Task 2.2.1:** Enable Supabase automated backups
  - Set to daily at 2am UTC
  - Verify in Supabase dashboard
  - Priority: HIGH

- [ ] **Task 2.2.2:** Document manual backup & restore
  - Write restore procedure (step-by-step)
  - Test restore on staging DB
  - Store in docs/
  - Priority: HIGH

- [ ] **Task 2.2.3:** Test full restore procedure
  - Export prod DB backup
  - Restore to separate schema
  - Verify data integrity (count rows, checksums)
  - Priority: MEDIUM

### Observability & Monitoring

- [ ] **Task 2.3.1:** Build admin stats dashboard
  - Widget: appointments this week/month
  - Widget: appointments by doctor (bar chart)
  - Widget: cancellations/rescheduled (count)
  - Widget: reminder delivery success rate
  - Priority: HIGH

- [ ] **Task 2.3.2:** Set up uptime monitoring
  - Use Pingdom or Uptime Robot
  - Monitor /staff/login (200 OK)
  - Alert if down >5 min
  - Priority: HIGH

- [ ] **Task 2.3.3:** Performance monitoring
  - Track dashboard load time (target <2s)
  - Track API latency (target <500ms avg)
  - Set alerts on degradation >20%
  - Priority: MEDIUM

- [ ] **Task 2.3.4:** Build audit log viewer for admin
  - Page: /staff/admin/audit-logs
  - Filters: user, action, date range
  - Display: timestamp, user, action, resource
  - Export to CSV
  - Priority: MEDIUM

### Compliance & Privacy

- [ ] **Task 2.4.1:** Document data retention policy
  - Appointments: keep 1 year?
  - Audit logs: keep 90 days?
  - Write to docs/DATA_RETENTION.md
  - Priority: MEDIUM

- [ ] **Task 2.4.2:** Sanitize audit logs
  - No passwords or PII in logs
  - Mask email if needed
  - Review all log calls
  - Priority: MEDIUM

- [ ] **Task 2.4.3:** Add data export for staff
  - Endpoint: /api/staff/export-data
  - Returns: appointments, profile as JSON
  - For GDPR-like requests
  - Priority: MEDIUM

- [ ] **Task 2.4.4:** Staff security checklist
  - Document: password best practices, 2FA prep, phishing awareness
  - Provide to all staff
  - Require sign-off before launch
  - Priority: MEDIUM

---

## Phase 3: Admin Dashboard & Features (Week 5)

### Admin Dashboard & Stats

- [ ] **Task 3.1.1:** Build appointment stats widgets
  - Total appointments (this week, this month, YTD)
  - Trend chart (appointments/day for last 30 days)
  - Breakdown by doctor (pie chart)
  - Priority: HIGH

- [ ] **Task 3.1.2:** Build operational metrics
  - Cancellations/rescheduled count (% of total)
  - Average appointment duration
  - Staff login activity (logins/day)
  - Priority: MEDIUM

- [ ] **Task 3.1.3:** Export admin data as CSV
  - Endpoint: /api/admin/export-appointments
  - Filters: date range, doctor
  - Return: appointments + metadata
  - Priority: MEDIUM

### Doctor Calendar & Appointment Mgmt

- [ ] **Task 3.2.1:** Build doctor calendar view
  - Calendar grid (week/month view)
  - Show all doctor's appointments
  - Click to see details: patient name, procedure, notes
  - Priority: HIGH

- [ ] **Task 3.2.2:** Build receptionist calendar grid
  - Show all doctors' calendars side-by-side
  - Color-code by doctor
  - Quick-view appointment details
  - Priority: HIGH

- [ ] **Task 3.2.3:** Appointment status indicators
  - States: confirmed, pending, completed, cancelled, rescheduled
  - Show in calendar + list views
  - Color-coded (green=confirmed, gray=cancelled, etc.)
  - Priority: MEDIUM

- [ ] **Task 3.2.4:** Quick appointment actions
  - Buttons: Confirm, Reschedule, Cancel, Add Notes
  - Reschedule modal shows available slots
  - Cancel trigger reminder to patient
  - Priority: MEDIUM

### Appointment Management & Reminders

- [ ] **Task 3.3.1:** Receptionist book/reschedule appointment
  - Form: date, time, doctor, patient, procedure
  - Check for conflicts
  - Auto-trigger reminder email
  - Priority: HIGH

- [ ] **Task 3.3.2:** Auto-reminder system
  - Trigger 24h before appointment
  - Send to: doctor + receptionist
  - Include: patient name, time, procedure
  - Priority: HIGH

- [ ] **Task 3.3.3:** Reminder delivery tracking
  - Dashboard widget: reminders sent/failed today
  - Log all reminder events in audit_logs
  - Show retry attempts
  - Priority: MEDIUM

- [ ] **Task 3.3.4:** Bulk actions on appointments
  - Select multiple → Send reminder now
  - Select multiple → Cancel all (batch reschedule option)
  - Select multiple → Export list
  - Priority: MEDIUM

### Content & Localization

- [ ] **Task 3.4.1:** Audit i18n keys
  - List all missing Spanish translations
  - Check for untranslated UI strings
  - Priority: HIGH

- [ ] **Task 3.4.2:** Add missing translations
  - Translate all dashboard labels to Spanish
  - Translate error messages, buttons, placeholders
  - Update messages/es.json
  - Priority: HIGH

- [ ] **Task 3.4.3:** Test Spanish language toggle
  - Switch language on all pages
  - Verify all text renders correctly
  - No English fallback leakage
  - Priority: MEDIUM

### UI/UX Polish

- [ ] **Task 3.5.1:** Review error messages
  - Ensure clear language for staff
  - No technical jargon
  - Provide actionable next steps
  - Priority: MEDIUM

- [ ] **Task 3.5.2:** Test mobile/tablet responsiveness
  - Receptionist may use tablet at desk
  - Test on iPad + Android tablets
  - Ensure buttons/inputs large enough to tap
  - Priority: MEDIUM

- [ ] **Task 3.5.3:** Accessibility audit (WCAG 2.1 AA)
  - Check: color contrast, alt text, ARIA labels
  - Test with screen reader
  - Fix any failures
  - Priority: MEDIUM

- [ ] **Task 3.5.4:** Keyboard navigation test
  - Tab through all pages
  - Enter/Space to activate buttons
  - Escape to close modals
  - Test without mouse
  - Priority: MEDIUM

---

## Pre-Launch Checklist

- [ ] All env vars set on Vercel
- [ ] DB backups automated + tested
- [ ] Sentry/logging configured + tested
- [ ] Rate limiting active on login
- [ ] RLS enabled + policies verified on all tables
- [ ] E2E tests pass (100%)
- [ ] Load test: 10 concurrent staff users (no errors)
- [ ] Staging deployment stable 24h (no 5xx errors)
- [ ] Rollback procedure documented
- [ ] Staff trained on system (docs + walkthrough)
- [ ] Support escalation process in place
- [ ] DNS/domain verified (email DKIM/SPF)
- [ ] Uptime monitoring active
- [ ] Sentry alerts configured
- [ ] Backup tested & documented

---

## Success Metrics (Target)

| Metric | Target |
|--------|--------|
| Uptime | 99.5%+ |
| Error rate | <0.1% |
| Dashboard load | <2s |
| API latency | <500ms avg |
| Test coverage (critical) | >70% |
| Security vulnerabilities | 0 known |

