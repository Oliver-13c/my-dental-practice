# Twilio Configuration And Staff Messaging Plan

**Date:** March 16, 2026  
**Status:** Proposed follow-up scope  
**Related areas:** reminders, contacts, staff dashboard

---

## 1. Goal

Add two connected capabilities to the current reminders and messaging work:

1. An admin-facing section to manage Twilio connectivity status and default reminder settings.
2. A new Messages tab inside `/staff/dashboard` where staff can send messages and review messages received from patients.

This plan is intentionally scoped to the current implementation that already includes:

- Twilio runtime wiring through environment variables in `src/shared/api/twilio-client.ts`
- Reminder configuration API in `src/app/api/reminders/config/route.ts`
- Outbound message logging in `src/app/api/messages/route.ts`
- Admin contacts UI in `src/app/admin/contacts/page.tsx`
- Staff dashboard shell in `src/app/staff/dashboard/page.tsx` and `src/features/staff/ui/staff-dashboard.tsx`

---

## 2. Current Gap Analysis

### 2.1 What already exists

- SMS sending is already possible from the notification service when Twilio env vars are present.
- Practice-wide reminder defaults already have a database table and API surface.
- Message logs already support outgoing message records and delivery fields.
- Admin already has a contacts page that can list and create manual messages.

### 2.2 What is still missing

- There is no admin UI to see whether Twilio is configured, validate it, or send a test SMS.
- There is no admin form for editing reminder defaults in the main product flow.
- `/staff/dashboard` does not expose messaging as a tab or workspace.
- Received SMS messages are not being captured because there is no inbound Twilio webhook route yet.
- Message history is still modeled mainly as outbound log entries, not conversation threads.

---

## 3. Product Decisions

### 3.1 Twilio account configuration

Do **not** store raw `TWILIO_AUTH_TOKEN` directly in the normal app database or in `reminder_config`.

Recommended approach:

- Keep Twilio secrets in deployment secrets or environment variables.
- Build an admin section that shows configuration status, masked identifiers, and test tools.
- Treat the UI as a connection management screen, not a plaintext credential editor.

If true in-app secret editing is required later, that should be a separate security task using encrypted secret storage, not part of this first implementation.

### 3.2 Reminder settings ownership

Keep reminder behavior in `reminder_config` and keep provider credentials separate.

That means:

- `reminder_config` continues to own default timing, channels, enablement, and automation behavior.
- Twilio connection status is exposed by a separate admin config endpoint and never mixed with reminder business rules.

### 3.3 Staff messaging access

Recommended role behavior:

- `receptionist` and `admin`: full read and send access.
- `dentist` and `hygienist`: read access for their own patients first, optional send access behind a flag.

This keeps the first release aligned with front-desk communication workflows while avoiding broad new write permissions for all clinical roles.

---

## 4. Admin Configuration Scope

### 4.1 New admin UI section

Add a new admin settings surface, preferably under `/admin/reminders`, split into two cards:

#### A. Twilio Connection

- Connection status: configured or missing
- Masked Account SID
- Masked From phone number
- Last successful test SMS timestamp
- Button to send a test message to a staff phone number
- Validation hints when env vars are missing

#### B. Default Reminder Settings

- Global enabled toggle
- Auto-send toggle
- Default channels: email, sms, or both
- Default send timing
- Optional multiple reminder offsets for future support, for example `[1440, 120]`
- Appointment-type overrides

### 4.2 Backend changes for admin config

Keep the current reminder config API, but extend the admin config surface with one new endpoint group:

#### New endpoints

`GET /api/admin/messaging/config`
- Returns Twilio connection status only
- Returns masked values only
- Returns `smsEnabled`, `twilioConfigured`, `fromPhoneMasked`, `accountSidMasked`

`POST /api/admin/messaging/test-sms`
- Sends a test SMS to a provided phone number
- Logs success or failure to audit logs

#### Existing endpoint to keep using

`GET /api/reminders/config`

`PUT /api/reminders/config`

### 4.3 Data model changes

Keep existing `reminder_config`, but extend it if needed for the new UI:

Suggested additions:

- `default_schedule jsonb` or `default_offsets_minutes integer[]`
- `sms_reply_enabled boolean default false`
- `message_templates jsonb` for reminder text defaults in a later phase

If multiple reminder timings are not needed in this release, keep the current single `default_reminder_minutes_before` column and only ship the admin form around it.

---

## 5. Staff Dashboard Messaging Tab

### 5.1 Route and placement

Keep the main route as `/staff/dashboard`.

Add a tabbed layout in `src/features/staff/ui/staff-dashboard.tsx`:

- Schedule
- Messages
- Optional future tabs such as Tasks or Notifications

For the first release, only show the Messages tab for `receptionist` and `admin`. Clinical roles can be added after access rules and patient-scoping are verified.

### 5.2 Messages tab layout

Use a three-part layout on desktop and stacked panels on mobile:

#### Left panel: Conversation list

- Patient name
- Last message preview
- Unread indicator
- Channel badge: SMS or email
- Last activity timestamp
- Filters: unread, all, failed, mine

#### Center panel: Conversation thread

- Chronological sent and received messages
- Outgoing messages aligned right
- Incoming messages aligned left
- Delivery status badges for outgoing messages
- Read marker for staff review status

#### Right panel or drawer: Patient context

- Contact details
- Contact preferences
- Upcoming appointment summary
- Quick actions: open chart, resend reminder, update preferences

### 5.3 Compose actions

- Send SMS
- Send email
- Use quick template
- Write custom text
- Attach message to appointment when relevant
- Respect opt-out and do-not-contact rules before send

---

## 6. Received Messages Support

This is the main backend gap required for “see messages received”.

### 6.1 New webhook routes

Add Twilio webhook handlers:

`POST /api/webhooks/twilio/inbound`
- Receives inbound SMS payloads from Twilio
- Validates webhook signature
- Matches patient by normalized phone number
- Inserts a new `message_logs` record as an inbound message
- Marks the conversation as unread for staff

`POST /api/webhooks/twilio/status`
- Receives outbound delivery updates
- Updates `sms_status`, `status`, `delivered_at`, `failed_at`, `failure_reason`

### 6.2 Message log schema additions

The current `message_logs` table is close, but it needs conversation-specific fields.

Recommended migration:

- `direction text not null default 'outbound'` with values `inbound|outbound`
- `channel text` if easier than inferring from `channels[]`
- `thread_key text` for grouping by patient and channel
- `inbound_received_at timestamptz`
- `staff_read_at timestamptz`
- `provider_payload jsonb` for raw webhook metadata
- `assigned_staff_id uuid null references public.staff_profiles(id)`

Add indexes for:

- `(patient_id, created_at desc)`
- `(thread_key, created_at asc)`
- `(direction, created_at desc)`
- unread conversations where `staff_read_at is null` and `direction = 'inbound'`

### 6.3 Patient matching rules

Normalize phone numbers before matching.

Fallback behavior:

- If a patient match is found, attach the message to that patient.
- If no patient match is found, store the message in an unmatched inbox queue for admin review.

---

## 7. API And UI Reuse Strategy

Do not build a separate messaging stack for staff if the admin contacts page already covers similar workflows.

Refactor the existing admin messaging UI into shared components or feature modules:

- shared message thread list
- shared message composer
- shared message history query hook
- shared contact preference badge component

Then mount those shared pieces in:

- `/admin/contacts`
- `/staff/dashboard` Messages tab

This reduces duplicate logic and keeps send behavior consistent across admin and staff flows.

---

## 8. Permissions, Audit, And Safety

### 8.1 Authorization

- Only authenticated staff can access conversation data.
- Sending permissions should be role-gated.
- Staff should only see patients allowed by existing patient access rules.

### 8.2 Audit requirements

- Log every outbound manual message with `created_by`.
- Log every reminder-config update.
- Log every Twilio test send.
- Preserve inbound messages as immutable history.

### 8.3 Safety rules

- Block sends for `do_not_contact = true`.
- Respect `reminder_sms` and `appointment_sms` preferences.
- Mask Twilio credentials in UI responses.
- Verify Twilio webhook signatures.

---

## 9. Implementation Phases

### Phase 1: Admin config surface

- Build admin reminder settings form on top of existing `/api/reminders/config`
- Add Twilio status endpoint
- Add test SMS endpoint
- Add UI for masked Twilio status and reminder defaults

### Phase 2: Messaging data model

- Add `direction`, `thread_key`, unread tracking, and webhook payload fields to `message_logs`
- Update queries in `/api/messages` to support conversation mode
- Add thread and unread filters

### Phase 3: Twilio webhooks

- Add inbound SMS webhook route
- Add delivery-status webhook route
- Match patient by normalized phone
- Log inbound and delivery updates to `message_logs`

### Phase 4: Shared messaging components

- Extract shared messaging UI from admin contacts page
- Add shared fetch hooks for threads, messages, unread counts, and send actions
- Keep admin contacts page working during refactor

### Phase 5: Staff dashboard tab

- Add Messages tab to `/staff/dashboard`
- Show thread list, conversation view, and composer
- Show unread message count on the tab label
- Gate visibility by role

### Phase 6: Testing and rollout

- Add API tests for config, send, and inbound webhook handling
- Add E2E coverage for staff sending and reading messages
- Verify mobile layout inside `/staff/dashboard`
- Pilot with receptionist and admin roles first

---

## 10. Acceptance Criteria

- Admin can open a settings page and see whether Twilio is configured without exposing secrets.
- Admin can update default reminder settings from the UI and those values persist through `reminder_config`.
- Admin can send a Twilio test SMS and see success or failure feedback.
- Staff with permitted roles can open `/staff/dashboard`, switch to Messages, and send a message.
- Staff can see inbound patient SMS messages in a threaded conversation view.
- Outbound SMS delivery updates and inbound SMS replies are both reflected in `message_logs`.
- Opt-out and do-not-contact rules are enforced before send.

---

## 11. Recommended Build Order

1. Ship the admin reminder settings form first because the backend already exists.
2. Add Twilio connection-status and test-send endpoints next.
3. Extend `message_logs` for inbound and threaded conversations.
4. Implement Twilio inbound and status webhooks.
5. Refactor admin contacts messaging UI into shared components.
6. Mount the shared messaging workspace as a new Messages tab in `/staff/dashboard`.

This order keeps risk low because it delivers visible admin value early, then adds the more complex inbound messaging path before the staff UI depends on it.
