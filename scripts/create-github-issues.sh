#!/bin/bash
# Create GitHub issues from TASKS.md
# Requirements: gh CLI installed and authenticated
# Usage: bash scripts/create-github-issues.sh

set -e

# GitHub repo details
REPO="Oliver-13c/my-dental-practice"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is required. Install from: https://cli.github.com"
    exit 1
fi

# Check authentication
if ! gh auth status > /dev/null 2>&1; then
    echo "❌ Not authenticated. Run: gh auth login"
    exit 1
fi

echo "📋 Creating GitHub issues from TASKS.md..."
echo ""

# Phase 1 Tasks
echo "🟦 Phase 1: Core Stability"
gh issue create --repo "$REPO" --title "Task 1.1.1: Audit database tables" --body "**Description:** Check current state of staff_profiles, appointments, notifications, audit_logs tables. Document which have RLS enabled and what policies exist.\n\n**Acceptance Criteria:**\n- [ ] Audit completed\n- [ ] Current state documented\n- [ ] Gaps identified\n\n**Priority:** HIGH" --label "phase-1,data-layer,high-priority"

gh issue create --repo "$REPO" --title "Task 1.1.2: Enable RLS on all staff tables" --body "**Description:** Enable Row-Level Security on staff_profiles, appointments, audit_logs, and notifications tables.\n\n**Acceptance Criteria:**\n- [ ] RLS enabled on all tables\n- [ ] Default deny policy in place\n- [ ] Tested in SQL editor\n\n**Priority:** HIGH" --label "phase-1,data-layer,high-priority"

gh issue create --repo "$REPO" --title "Task 1.1.3: Write RLS policy for staff_profiles" --body "**Description:** Create RLS policies for staff_profiles table.\n- Staff can read/update only their own row\n- Admin can read all rows\n\n**Acceptance Criteria:**\n- [ ] Policy created and tested\n- [ ] Receptionist verified: can only see own profile\n- [ ] Doctor verified: can only see own profile\n- [ ] Admin verified: can see all profiles\n\n**Priority:** HIGH" --label "phase-1,data-layer,rls,high-priority"

gh issue create --repo "$REPO" --title "Task 1.1.4: Write RLS policy for appointments" --body "**Description:** Create RLS policies for appointments table.\n- Receptionist: read/write all; full calendar access\n- Doctor: read assigned appointments + view reminders sent\n- Admin: read all\n\n**Acceptance Criteria:**\n- [ ] Policy created for each role\n- [ ] Tested with real appointments\n- [ ] Receptionist can see all appointments\n- [ ] Doctor can only see assigned appointments\n- [ ] Admin can see all\n\n**Priority:** HIGH" --label "phase-1,data-layer,rls,high-priority"

gh issue create --repo "$REPO" --title "Task 1.1.5: Write RLS policy for audit_logs & notifications" --body "**Description:** Create RLS policies for audit_logs and notifications.\n- Staff: read own activity only\n- Admin: read all\n\n**Acceptance Criteria:**\n- [ ] Policies created\n- [ ] Tested by role\n- [ ] No unintended cross-role access\n\n**Priority:** HIGH" --label "phase-1,data-layer,rls,high-priority"

gh issue create --repo "$REPO" --title "Task 1.1.6: End-to-end RLS testing" --body "**Description:** Comprehensive test of all RLS policies across roles.\n\n**Acceptance Criteria:**\n- [ ] Login as receptionist → verify data access\n- [ ] Login as doctor → verify data access\n- [ ] Login as admin → verify all access\n- [ ] Document any gaps or unexpected behavior\n- [ ] All tests pass\n\n**Priority:** HIGH" --label "phase-1,data-layer,rls,testing,high-priority"

gh issue create --repo "$REPO" --title "Task 1.2.1: Set up error tracking (Sentry)" --body "**Description:** Configure Sentry for error tracking and alerting.\n\n**Acceptance Criteria:**\n- [ ] Sentry project created\n- [ ] SDK integrated into Next.js app\n- [ ] Test error is captured\n- [ ] Slack/email alerts configured\n\n**Priority:** HIGH" --label "phase-1,logging,high-priority"

gh issue create --repo "$REPO" --title "Task 1.2.2: Centralize API error handler" --body "**Description:** Create standardized error handler for all API routes.\n\n**Acceptance Criteria:**\n- [ ] utils/api-error.ts created\n- [ ] Standardized error response format\n- [ ] 5xx errors logged to Sentry\n- [ ] Error handler used in 5+ routes\n- [ ] Error responses tested\n\n**Priority:** HIGH" --label "phase-1,logging,error-handling,high-priority"

gh issue create --repo "$REPO" --title "Task 1.2.3: Audit logging for staff actions" --body "**Description:** Log all staff actions (login, appointments changes, etc.) to audit_logs table.\n\n**Acceptance Criteria:**\n- [ ] Logging middleware/util created\n- [ ] Logged actions: login, logout, appointment create/update/delete, notes added\n- [ ] Includes: user_id, action, resource_type, timestamp\n- [ ] Tested: verify logs appear in DB\n\n**Priority:** MEDIUM" --label "phase-1,logging,compliance,medium-priority"

gh issue create --repo "$REPO" --title "Task 1.2.4: Set up error rate alerting" --body "**Description:** Configure Sentry alerts for error rate spikes.\n\n**Acceptance Criteria:**\n- [ ] Alert rule: error rate >1% in 5min window\n- [ ] Notification: Slack + email\n- [ ] Test alert: trigger manually\n- [ ] Alert confirmed received\n\n**Priority:** MEDIUM" --label "phase-1,logging,monitoring,medium-priority"

gh issue create --repo "$REPO" --title "Task 1.3.1: Add security headers" --body "**Description:** Add Content-Security-Policy and other security headers to all responses.\n\n**Acceptance Criteria:**\n- [ ] CSP header configured (default-src 'self')\n- [ ] HSTS enabled (max-age=31536000)\n- [ ] X-Frame-Options: DENY\n- [ ] X-Content-Type-Options: nosniff\n- [ ] Headers appear in all responses (verify in DevTools)\n\n**Priority:** HIGH" --label "phase-1,security,headers,high-priority"

gh issue create --repo "$REPO" --title "Task 1.3.2: Implement rate limiting on /staff/login" --body "**Description:** Limit login attempts to prevent brute-force attacks.\n\n**Acceptance Criteria:**\n- [ ] Rate limiter implemented: 5 attempts per 5 minutes per IP\n- [ ] Returns 429 when limit exceeded\n- [ ] Cooldown message shown to user\n- [ ] Tested: 6 failed attempts → rate limited\n\n**Priority:** HIGH" --label "phase-1,security,rate-limiting,high-priority"

gh issue create --repo "$REPO" --title "Task 1.3.3: Server-side form validation" --body "**Description:** Validate all API inputs server-side using zod.\n\n**Acceptance Criteria:**\n- [ ] Zod schemas written for: appointment creation, staff login, profile updates\n- [ ] API routes validate input before processing\n- [ ] Invalid input returns 400 with error message\n- [ ] Tested: send invalid data → 400 response\n\n**Priority:** HIGH" --label "phase-1,security,validation,high-priority"

gh issue create --repo "$REPO" --title "Task 1.3.4: Add CSRF token protection" --body "**Description:** Implement anti-CSRF tokens on state-changing mutations.\n\n**Acceptance Criteria:**\n- [ ] CSRF token middleware created\n- [ ] Token issued on page load\n- [ ] Token verified on POST/PUT/DELETE\n- [ ] Invalid token returns 403\n- [ ] Tested: request without token → 403\n\n**Priority:** MEDIUM" --label "phase-1,security,csrf,medium-priority"

gh issue create --repo "$REPO" --title "Task 1.4.1: E2E test - Login flow" --body "**Description:** Create Cypress E2E test for login → dashboard → logout.\n\n**Acceptance Criteria:**\n- [ ] Test file: cypress/e2e/auth-flow.spec.ts\n- [ ] Test visits /staff/login\n- [ ] Test enters valid credentials\n- [ ] Test asserts dashboard loads\n- [ ] Test logout works\n- [ ] Test passes consistently\n\n**Priority:** HIGH" --label "phase-1,testing,e2e,high-priority"

gh issue create --repo "$REPO" --title "Task 1.4.2: E2E test - Appointment booking" --body "**Description:** Test receptionist books appointment → doctor sees it.\n\n**Acceptance Criteria:**\n- [ ] Test logs in as receptionist\n- [ ] Test creates appointment with doctor\n- [ ] Test logs out + logs in as doctor\n- [ ] Test verifies appointment visible in calendar\n- [ ] Test passes\n\n**Priority:** HIGH" --label "phase-1,testing,e2e,high-priority"

gh issue create --repo "$REPO" --title "Task 1.4.3: Unit tests for auth & RLS" --body "**Description:** Unit tests for NextAuth callback and RLS policy logic.\n\n**Acceptance Criteria:**\n- [ ] Test file: src/__tests__/auth.test.ts\n- [ ] Test NextAuth authorize callback (valid/invalid credentials)\n- [ ] Test role extraction from session\n- [ ] Coverage: >80% of auth code\n- [ ] All tests pass\n\n**Priority:** MEDIUM" --label "phase-1,testing,unit,medium-priority"

gh issue create --repo "$REPO" --title "Task 1.4.4: Pre-deploy smoke tests" --body "**Description:** Create automated smoke tests to run on every deploy.\n\n**Acceptance Criteria:**\n- [ ] Script checks: login page loads (200)\n- [ ] Script checks: dashboard accessible\n- [ ] Script checks: /api/auth/session returns 200\n- [ ] Script is part of Vercel build pipeline\n- [ ] Tested on staging\n\n**Priority:** MEDIUM" --label "phase-1,testing,smoke-tests,medium-priority"

echo ""
echo "🟩 Phase 2: Operational Excellence"

gh issue create --repo "$REPO" --title "Task 2.1.1: Verify Resend email setup" --body "**Description:** Verify Resend API is configured correctly for sending emails.\n\n**Acceptance Criteria:**\n- [ ] Test email sent successfully\n- [ ] DKIM/SPF records configured\n- [ ] Sender domain verified\n- [ ] Test email received by test account\n\n**Priority:** HIGH" --label "phase-2,email,high-priority"

gh issue create --repo "$REPO" --title "Task 2.1.2: Test appointment reminder flow" --body "**Description:** End-to-end test of 24-hour appointment reminders.\n\n**Acceptance Criteria:**\n- [ ] Create appointment for tomorrow 10am\n- [ ] Trigger reminder (or wait/mock time)\n- [ ] Verify doctor receives email\n- [ ] Verify receptionist receives email\n- [ ] Email includes: patient name, time, procedure\n\n**Priority:** HIGH" --label "phase-2,email,notifications,high-priority"

gh issue create --repo "$REPO" --title "Task 2.1.3: Implement email retry logic" --body "**Description:** Add exponential backoff retry for failed email sends.\n\n**Acceptance Criteria:**\n- [ ] Retry strategy: 1s, 5s, 30s, 5m (max 3 retries)\n- [ ] Retry count stored in DB\n- [ ] Tested: simulate send failure → automatic retry\n- [ ] After 3 failures: log and alert\n\n**Priority:** MEDIUM" --label "phase-2,email,reliability,medium-priority"

gh issue create --repo "$REPO" --title "Task 2.1.4: Track email metrics" --body "**Description:** Dashboard widget showing email delivery stats.\n\n**Acceptance Criteria:**\n- [ ] Widget: emails sent today\n- [ ] Widget: emails failed today\n- [ ] Widget: failure rate %\n- [ ] Alert if failure rate >5%\n- [ ] Visible on admin dashboard\n\n**Priority:** MEDIUM" --label "phase-2,email,monitoring,medium-priority"

gh issue create --repo "$REPO" --title "Task 2.2.1: Enable Supabase automated backups" --body "**Description:** Configure automated daily database backups.\n\n**Acceptance Criteria:**\n- [ ] Backup schedule: 2am UTC daily\n- [ ] Verified in Supabase dashboard\n- [ ] Backup retention: 30 days\n\n**Priority:** HIGH" --label "phase-2,backups,high-priority"

gh issue create --repo "$REPO" --title "Task 2.2.2: Document backup & restore procedure" --body "**Description:** Write step-by-step guide for manual backup and restore.\n\n**Acceptance Criteria:**\n- [ ] docs/BACKUP_RESTORE.md written\n- [ ] Includes: export backup, restore to staging, verify data\n- [ ] Tested: procedure works end-to-end\n- [ ] Shared with team\n\n**Priority:** HIGH" --label "phase-2,backups,documentation,high-priority"

gh issue create --repo "$REPO" --title "Task 2.2.3: Test full restore procedure" --body "**Description:** Verify data integrity after backup/restore cycle.\n\n**Acceptance Criteria:**\n- [ ] Export prod backup\n- [ ] Restore to staging schema\n- [ ] Verify row counts match\n- [ ] Spot-check data integrity (sample queries)\n- [ ] Document time to restore\n\n**Priority:** MEDIUM" --label "phase-2,backups,testing,medium-priority"

gh issue create --repo "$REPO" --title "Task 2.3.1: Build admin stats dashboard" --body "**Description:** Dashboard widget with key appointment metrics.\n\n**Acceptance Criteria:**\n- [ ] Widget: total appointments (week/month)\n- [ ] Widget: trend chart (30 days)\n- [ ] Widget: breakdown by doctor (pie chart)\n- [ ] Widget: cancellations/rescheduled count\n- [ ] Dashboard loads <2s\n\n**Priority:** HIGH" --label "phase-3,admin-dashboard,high-priority"

gh issue create --repo "$REPO" --title "Task 2.3.2: Set up uptime monitoring" --body "**Description:** Monitor /staff/login endpoint for availability.\n\n**Acceptance Criteria:**\n- [ ] Uptime monitor configured (Pingdom/UptimeRobot)\n- [ ] Checks /staff/login every 5 minutes\n- [ ] Alert if down >5 min\n- [ ] Alert: Slack + email\n- [ ] Test alert: trigger manually\n\n**Priority:** HIGH" --label "phase-2,monitoring,uptime,high-priority"

gh issue create --repo "$REPO" --title "Task 2.3.3: Performance monitoring setup" --body "**Description:** Track dashboard load time and API latency.\n\n**Acceptance Criteria:**\n- [ ] Dashboard load time <2s average\n- [ ] API latency <500ms average\n- [ ] Alert if load time >3s or latency >1s\n- [ ] Metrics visible in Vercel/Next.js analytics\n\n**Priority:** MEDIUM" --label "phase-2,monitoring,performance,medium-priority"

gh issue create --repo "$REPO" --title "Task 2.3.4: Build admin audit log viewer" --body "**Description:** Page for admin to view staff activity logs.\n\n**Acceptance Criteria:**\n- [ ] Route: /staff/admin/audit-logs\n- [ ] Display: timestamp, user, action, resource\n- [ ] Filters: user, action, date range\n- [ ] Export: CSV download\n- [ ] Tested with real audit data\n\n**Priority:** MEDIUM" --label "phase-2,admin-dashboard,medium-priority"

gh issue create --repo "$REPO" --title "Task 2.4.1: Document data retention policy" --body "**Description:** Define how long to keep appointments and audit logs.\n\n**Acceptance Criteria:**\n- [ ] docs/DATA_RETENTION.md written\n- [ ] Policy: appointments kept 1 year?\n- [ ] Policy: audit logs kept 90 days?\n- [ ] Approved by stakeholder\n\n**Priority:** MEDIUM" --label "phase-2,compliance,documentation,medium-priority"

gh issue create --repo "$REPO" --title "Task 2.4.2: Sanitize audit logs (no PII)" --body "**Description:** Ensure no passwords or PII logged.\n\n**Acceptance Criteria:**\n- [ ] Audit all log statements\n- [ ] Remove: passwords, API keys, full emails\n- [ ] Mask: partial emails if needed\n- [ ] Code review: verify no sensitive data\n\n**Priority:** MEDIUM" --label "phase-2,compliance,security,medium-priority"

gh issue create --repo "$REPO" --title "Task 2.4.3: Add staff data export endpoint" --body "**Description:** Allow staff to export their data (GDPR-like).\n\n**Acceptance Criteria:**\n- [ ] Endpoint: /api/staff/export-data\n- [ ] Returns: own profile, own appointments as JSON\n- [ ] Download: JSON file or email\n- [ ] Tested: data matches DB\n\n**Priority:** MEDIUM" --label "phase-2,compliance,gdpr,medium-priority"

gh issue create --repo "$REPO" --title "Task 2.4.4: Create staff security checklist" --body "**Description:** Training document for staff on security best practices.\n\n**Acceptance Criteria:**\n- [ ] docs/STAFF_SECURITY_CHECKLIST.md written\n- [ ] Includes: password best practices, phishing awareness, 2FA prep\n- [ ] Provided to all staff before launch\n- [ ] Staff sign-off required\n\n**Priority:** MEDIUM" --label "phase-2,compliance,training,medium-priority"

echo ""
echo "🟨 Phase 3: Admin Dashboard & Features"

gh issue create --repo "$REPO" --title "Task 3.1.1: Build appointment stats widgets" --body "**Description:** Dashboard showing key appointment metrics.\n\n**Acceptance Criteria:**\n- [ ] Widget: total appointments (this week, month, YTD)\n- [ ] Widget: 30-day trend chart\n- [ ] Widget: breakdown by doctor (pie)\n- [ ] Fully responsive\n- [ ] Tested with real data\n\n**Priority:** HIGH" --label "phase-3,admin-dashboard,stats,high-priority"

gh issue create --repo "$REPO" --title "Task 3.1.2: Build operational metrics widgets" --body "**Description:** Dashboard showing cancellations, duration stats, activity.\n\n**Acceptance Criteria:**\n- [ ] Widget: cancellations/rescheduled count + %\n- [ ] Widget: avg appointment duration\n- [ ] Widget: staff login activity (bars/chart)\n- [ ] Data accurate and auto-refreshing\n\n**Priority:** MEDIUM" --label "phase-3,admin-dashboard,stats,medium-priority"

gh issue create --repo "$REPO" --title "Task 3.1.3: Export admin data as CSV" --body "**Description:** Admin can export appointment data for reporting.\n\n**Acceptance Criteria:**\n- [ ] Endpoint: /api/admin/export-appointments\n- [ ] Filters: date range, doctor\n- [ ] CSV includes: date, patient, doctor, procedure, status\n- [ ] Tested: CSV opens in Excel\n\n**Priority:** MEDIUM" --label "phase-3,admin-dashboard,export,medium-priority"

gh issue create --repo "$REPO" --title "Task 3.2.1: Build doctor calendar view" --body "**Description:** Internet calendar showing doctor's appointments.\n\n**Acceptance Criteria:**\n- [ ] Route: /staff/doctor/calendar\n- [ ] Grid: week or month view\n- [ ] Shows: all appointments for logged-in doctor\n- [ ] Click appointment: see details (patient, procedure, notes)\n- [ ] Responsive design\n\n**Priority:** HIGH" --label "phase-3,appointments,calendar,high-priority"

gh issue create --repo "$REPO" --title "Task 3.2.2: Build receptionist calendar grid" --body "**Description:** Multi-doctor calendar for receptionist scheduling.\n\n**Acceptance Criteria:**\n- [ ] Route: /staff/receptionist/calendar\n- [ ] Display: all doctors' calendars side-by-side\n- [ ] Color-coded by doctor\n- [ ] Click appointment: quick-view details\n- [ ] Responsive on tablet\n\n**Priority:** HIGH" --label "phase-3,appointments,calendar,high-priority"

gh issue create --repo "$REPO" --title "Task 3.2.3: Add appointment status indicators" --body "**Description:** Visual status badges (confirmed, pending, cancelled, etc.).\n\n**Acceptance Criteria:**\n- [ ] Status options: confirmed, pending, completed, cancelled, rescheduled\n- [ ] Color-coded: green=confirmed, gray=cancelled, yellow=pending\n- [ ] Visible in calendar + list views\n- [ ] Matches design/branding\n\n**Priority:** MEDIUM" --label "phase-3,appointments,status,medium-priority"

gh issue create --repo "$REPO" --title "Task 3.2.4: Quick appointment action buttons" --body "**Description:** Buttons to confirm, reschedule, cancel, add notes.\n\n**Acceptance Criteria:**\n- [ ] Buttons: Confirm, Reschedule, Cancel, Add Notes\n- [ ] Reschedule: modal shows available slots\n- [ ] Cancel: triggers reminder update\n- [ ] Add Notes: inline editor\n- [ ] All actions logged to audit_logs\n\n**Priority:** MEDIUM" --label "phase-3,appointments,actions,medium-priority"

gh issue create --repo "$REPO" --title "Task 3.3.1: Receptionist book/reschedule appointment" --body "**Description:** Form for receptionist to manage appointments.\n\n**Acceptance Criteria:**\n- [ ] Form: date, time, doctor, patient, procedure\n- [ ] Validation: no double-booking\n- [ ] Auto-trigger reminder on create\n- [ ] Reschedule: updates existing appointment\n- [ ] Tested: full workflow\n\n**Priority:** HIGH" --label "phase-3,appointments,booking,high-priority"

gh issue create --repo "$REPO" --title "Task 3.3.2: Auto-reminder system (24h before)" --body "**Description:** Automated email reminders 24 hours before appointment.\n\n**Acceptance Criteria:**\n- [ ] Cron job or scheduled function: runs daily\n- [ ] Finds appointments for tomorrow\n- [ ] Sends email to doctor + receptionist\n- [ ] Includes: patient name, time, procedure\n- [ ] Tested: reminder sent on schedule\n\n**Priority:** HIGH" --label "phase-3,reminders,automation,high-priority"

gh issue create --repo "$REPO" --title "Task 3.3.3: Reminder delivery tracking" --body "**Description:** Track and display reminder delivery status.\n\n**Acceptance Criteria:**\n- [ ] Dashboard widget: reminders sent/failed today\n- [ ] All reminders logged to audit_logs\n- [ ] Status: sent, failed, retrying\n- [ ] Admin can view reminder history\n\n**Priority:** MEDIUM" --label "phase-3,reminders,monitoring,medium-priority"

gh issue create --repo "$REPO" --title "Task 3.3.4: Bulk appointment actions" --body "**Description:** Select multiple appointments for batch operations.\n\n**Acceptance Criteria:**\n- [ ] Multi-select checkboxes in list view\n- [ ] Bulk actions: Send reminder now, Cancel all, Export\n- [ ] Confirmation dialog before bulk delete\n- [ ] All bulk actions logged\n\n**Priority:** MEDIUM" --label "phase-3,appointments,bulk-actions,medium-priority"

gh issue create --repo "$REPO" --title "Task 3.4.1: Audit i18n keys for Spanish" --body "**Description:** Identify missing Spanish translations.\n\n**Acceptance Criteria:**\n- [ ] List all untranslated UI strings\n- [ ] Check messages/es.json completeness\n- [ ] Identify missing keys in dashboard, errors, buttons\n- [ ] Document gaps\n\n**Priority:** HIGH" --label "phase-3,i18n,localization,high-priority"

gh issue create --repo "$REPO" --title "Task 3.4.2: Add missing Spanish translations" --body "**Description:** Translate all dashboard and UI strings to Spanish.\n\n**Acceptance Criteria:**\n- [ ] Update messages/es.json\n- [ ] All dashboard labels in Spanish\n- [ ] Error messages translated\n- [ ] Buttons, placeholders translated\n- [ ] Review for tone/context\n\n**Priority:** HIGH" --label "phase-3,i18n,localization,high-priority"

gh issue create --repo "$REPO" --title "Task 3.4.3: Test Spanish language toggle" --body "**Description:** Verify all pages render correctly in Spanish.\n\n**Acceptance Criteria:**\n- [ ] Toggle to Spanish on login page\n- [ ] Toggle to Spanish on dashboard\n- [ ] All text renders (no English fallback)\n- [ ] No layout breaks\n- [ ] Links/buttons work in Spanish\n\n**Priority:** MEDIUM" --label "phase-3,i18n,testing,medium-priority"

gh issue create --repo "$REPO" --title "Task 3.5.1: Review error messages for clarity" --body "**Description:** Ensure error messages are clear and actionable.\n\n**Acceptance Criteria:**\n- [ ] Audit all error messages\n- [ ] Words suitable for staff (no jargon)\n- [ ] Include actionable next steps\n- [ ] Example: 'Invalid credentials. Check email and password.'\n- [ ] Test with user feedback\n\n**Priority:** MEDIUM" --label "phase-3,ux,error-messages,medium-priority"

gh issue create --repo "$REPO" --title "Task 3.5.2: Test mobile/tablet responsiveness" --body "**Description:** Ensure UI works on tablets (receptionist desk use).\n\n**Acceptance Criteria:**\n- [ ] Test on iPad (1024px width)\n- [ ] Test on Android tablet\n- [ ] Buttons/inputs large enough to tap (48px+)\n- [ ] Calendar responsive\n- [ ] Forms readable\n\n**Priority:** MEDIUM" --label "phase-3,ux,responsive-design,medium-priority"

gh issue create --repo "$REPO" --title "Task 3.5.3: Accessibility audit (WCAG 2.1 AA)" --body "**Description:** Ensure app meets accessibility standards.\n\n**Acceptance Criteria:**\n- [ ] Color contrast: 4.5:1 for text\n- [ ] Alt text on all images\n- [ ] ARIA labels on buttons/forms\n- [ ] Test with screen reader\n- [ ] Fix any failures\n\n**Priority:** MEDIUM" --label "phase-3,ux,accessibility,medium-priority"

gh issue create --repo "$REPO" --title "Task 3.5.4: Keyboard navigation test" --body "**Description:** Verify keyboard-only navigation works.\n\n**Acceptance Criteria:**\n- [ ] Tab through login page\n- [ ] Tab through dashboard\n- [ ] Enter to submit forms\n- [ ] Space/Enter to activate buttons\n- [ ] Escape to close modals\n\n**Priority:** MEDIUM" --label "phase-3,ux,accessibility,medium-priority"

echo ""
echo "✅ GitHub issues created!"
echo "📊 View issues: https://github.com/$REPO/issues"
