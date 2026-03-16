# Reminders & Contacts Implementation Plan

**Date:** March 16, 2026  
**Author:** GitHub Copilot  
**Status:** Planning Phase

---

## 1. Overview

This plan outlines the implementation of two interconnected features for the dental practice management app:

1. **Reminders System** - Automated appointment reminders with configurable timing and channels
2. **Contacts & Messaging** - Centralized contact management, message history tracking, and delivery status monitoring

---

## 2. Feature Scope

### 2.1 Reminders

**Automated appointment reminders:**
- Send reminders X hours/days before appointment (configurable: 24h, 12h, 1h)
- Support multiple channels: Email, SMS, or both
- Respect patient communication preferences (opt-in/out per channel)
- Track reminder delivery status
- Allow manual reminder sends for specific appointments
- Show reminder history for each appointment

**Reminder settings (per practice/global):**
- Default reminder timing (hours before appointment)
- Default channels (email, SMS, both)
- Enable/disable by appointment type
- Disable for cancelled/rescheduled appointments

### 2.2 Contacts & Messaging

**Contacts management:**
- Directory of all patients with quick contact info display
- Contact preferences (preferred contact method, language, do-not-contact)
- Emergency contact information
- Communication notes/history
- Last contact date tracking

**Message tracking:**
- Centralized inbox showing all sent/received messages (email, SMS, in-app)
- Message status: pending, sent, delivered, failed, read
- Search and filter messages (by patient, date, type, status)
- Resend failed messages
- Log manual messages sent to patients
- View response history for patient conversations

---

## 3. Database Schema

### 3.1 New Tables Required

#### `appointment_reminders`
```sql
CREATE TABLE public.appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  
  -- Configuration
  reminder_type text NOT NULL DEFAULT 'appointment', -- 'appointment', 'custom', 'followup'
  send_before_mins integer NOT NULL, -- e.g., 1440 (24h), 720 (12h), 60 (1h)
  channels text[] NOT NULL DEFAULT ARRAY['email', 'sms'], -- channels to send via
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending', -- pending, sent, failed, cancelled, delivered
  sent_at timestamp with time zone,
  delivery_status jsonb, -- {email: {sent: true, delivery_time: ..., error: null}, sms: {...}}
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_send_before CHECK (send_before_mins > 0),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled', 'delivered'))
);

CREATE INDEX idx_appointment_reminders_appointment_id ON public.appointment_reminders(appointment_id);
CREATE INDEX idx_appointment_reminders_status ON public.appointment_reminders(status);
CREATE INDEX idx_appointment_reminders_sent_at ON public.appointment_reminders(sent_at);
```

#### `message_logs`
```sql
CREATE TABLE public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  recipient_email text,
  recipient_phone text,
  
  -- Message metadata
  message_type text NOT NULL, -- 'appointment_confirmation', 'appointment_reminder', 'appointment_cancellation', 'appointment_reschedule', 'manual', 'system'
  channels text[] NOT NULL, -- ['email'], ['sms'], ['email', 'sms']
  subject text,
  body text NOT NULL,
  
  -- Related appointment (if applicable)
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  
  -- Status & delivery
  status text NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed, bounced, read, clicked
  email_status text, -- sent, delivered, failed, bounced, open, click
  sms_status text, -- sent, delivered, failed, unsubscribed
  
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  failed_at timestamp with time zone,
  failure_reason text,
  
  -- Retry tracking
  retry_count integer DEFAULT 0,
  last_retry_at timestamp with time zone,
  
  -- External IDs (for tracking with Resend/Twilio)
  email_message_id text,
  sms_message_sid text,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id), -- who initiated (system or staff)
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'read', 'clicked')),
  CONSTRAINT has_recipient CHECK (recipient_email IS NOT NULL OR recipient_phone IS NOT NULL)
);

CREATE INDEX idx_message_logs_patient_id ON public.message_logs(patient_id);
CREATE INDEX idx_message_logs_appointment_id ON public.message_logs(appointment_id);
CREATE INDEX idx_message_logs_status ON public.message_logs(status);
CREATE INDEX idx_message_logs_created_at ON public.message_logs(created_at DESC);
CREATE INDEX idx_message_logs_message_type ON public.message_logs(message_type);
```

#### `contact_preferences`
```sql
CREATE TABLE public.contact_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  
  -- Preferred contact methods
  preferred_contact_method text, -- 'email', 'sms', 'call'
  
  -- Opt-in/out preferences
  marketing_emails boolean DEFAULT true,
  appointment_emails boolean DEFAULT true,
  reminder_emails boolean DEFAULT true,
  
  marketing_sms boolean DEFAULT true,
  appointment_sms boolean DEFAULT true,
  reminder_sms boolean DEFAULT true,
  
  -- Other preferences
  preferred_language text DEFAULT 'en', -- 'en', 'es'
  do_not_contact boolean DEFAULT false,
  contact_notes text,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_contact_date timestamp with time zone
);

CREATE INDEX idx_contact_preferences_patient_id ON public.contact_preferences(patient_id);
```

#### `reminder_config` (Global settings)
```sql
CREATE TABLE public.reminder_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Practice-wide defaults
  default_reminder_minutes_before integer DEFAULT 1440, -- 24 hours
  default_channels text[] DEFAULT ARRAY['email'],
  
  -- Feature flags
  enabled boolean DEFAULT true,
  auto_send boolean DEFAULT true, -- Automatically send or just queue?
  
  -- By appointment type
  appointment_type_overrides jsonb, -- {type_id: {minutes: 120, channels: ['sms']}}
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
```

---

## 4. Backend Implementation

### 4.1 API Routes

#### Reminder Configuration (`/api/reminders/config`)
```
GET /api/reminders/config
  - Get current practice reminder settings
  - Requires: admin role
  - Returns: reminder_config

PUT /api/reminders/config
  - Update reminder settings
  - Requires: admin role
  - Body: { default_reminder_minutes_before, default_channels, appointment_type_overrides, auto_send }
```

#### Appointment Reminders (`/api/reminders`)
```
GET /api/reminders?appointment_id=xyz&status=pending
  - List reminders for an appointment or by status
  - Requires: staff role

POST /api/reminders
  - Manually create/queue a reminder
  - Body: { appointment_id, send_before_mins, channels }
  - Auto-generates if appointment is created

PUT /api/reminders/:id
  - Update reminder status/channels
  - Body: { status, channels }

POST /api/reminders/:id/send
  - Force send a queued reminder
  - Bypasses timing checks

DELETE /api/reminders/:id
  - Cancel a queued reminder
```

#### Message Logs (`/api/messages`)
```
GET /api/messages?patient_id=xyz&appointment_id=abc&status=sent&type=appointment_reminder
  - List messages with filtering/pagination
  - Requires: staff can see own patient messages, admin sees all
  - Returns: paginated message_logs

GET /api/messages/:id
  - Get single message details
  - Returns: full message_logs record + related appointment/patient

POST /api/messages
  - Manually send a message to patient
  - Body: { patient_id, channels, subject, body, message_type: 'manual' }
  - Returns: created message_log

POST /api/messages/:id/resend
  - Retry failed message
  - Increments retry_count, clears failure_reason

PUT /api/messages/:id
  - Update message status/notes (e.g., manual delivery confirmation)
  - Body: { status, delivery_notes }

GET /api/messages/export?start_date=...&end_date=...&format=csv
  - Export message history for compliance/audit
```

#### Contact Preferences (`/api/contacts/preferences/:patient_id`)
```
GET /api/contacts/preferences/:patient_id
  - Get patient contact preferences
  - Requires: staff with patient access

PUT /api/contacts/preferences/:patient_id
  - Update contact preferences
  - Body: { preferred_contact_method, marketing_emails, reminder_sms, language, do_not_contact, contact_notes }
  - Can be called by patient (own data) or staff (if permitted)
```

#### Contacts Directory (`/api/contacts`)
```
GET /api/contacts?search=query&sort=name|last_contact
  - List all patients with contact info + last message
  - Requires: staff role
  - Returns: light patient records + last_contact_date, preferred_contact_method

GET /api/contacts/analytics
  - Communication metrics (total sent, delivery rate, failures)
  - Requires: admin role
```

### 4.2 Cron Job / Edge Function

#### `/api/cron/send-pending-reminders`
**Frequency:** Every 5 minutes  
**Triggered by:** Vercel Cron (or external service)

```typescript
// Pseudo-code
async function sendPendingReminders() {
  1. Query appointment_reminders with status='pending'
  2. For each reminder:
     a. Calculate if it's time to send (scheduled_send_time = appointment.start_time - send_before_mins)
     b. If now >= scheduled_send_time:
        - Fetch appointment + patient
        - Check patient contact preferences
        - Send via applicable channels (Resend for email, Twilio for SMS)
        - Log to message_logs table
        - Update appointment_reminders.status = 'sent' + delivery_status
     c. If send fails: appointment_reminders.status = 'failed' + retry logic
  3. Return summary { sent: N, failed: N, retried: N }
}
```

### 4.3 Service Layer

#### `notification-service.ts` (Enhanced)
```typescript
// Add to existing service:

export async function sendAppointmentReminder(
  appt: NotificationAppointment,
  reminderId: string,
): Promise<NotificationResult>

export async function logMessage(
  recipientEmail: string,
  recipientPhone: string,
  messageType: string,
  channels: string[],
  content: { subject?: string; body: string },
  externalIds: { email_message_id?: string; sms_message_sid?: string },
): Promise<{ id: string; status: string }>

export async function updateMessageStatus(
  messageLogId: string,
  updates: { status: string; delivered_at?: Date; failure_reason?: string },
): Promise<void>

export async function getContactPreferences(patientId: string): Promise<ContactPreferences>

export async function respectsContactPreferences(
  patientId: string,
  channels: string[],
): Promise<{ email: boolean; sms: boolean }>
```

---

## 5. Frontend Implementation

### 5.1 Reminders Management UI

**Location:** `/admin/reminders` (new page)

**Sections:**

#### A. Global Settings
- Form to configure default reminder timing and channels
- Enable/disable reminders globally
- Set appointment-type-specific overrides
- Toast notifications for save success/error

#### B. Pending Reminders Queue
- Table of upcoming reminders (next 7 days)
- Columns: Patient, Appointment, Scheduled Time, Channels, Status, Actions
- Quick actions: Send Now, Edit, Cancel
- Filter by status (pending, sent, failed)
- Bulk actions: Send All, Cancel Selected

#### C. Reminder History
- Table of past reminders
- Columns: Patient, Appointment, Sent At, Channels, Delivery Status, View Details
- Status badges: ✓ Sent, ⚠️ Failed, ✗ Cancelled
- Click to expand delivery details (email: sent/opened/bounced, SMS: sent/delivered)

### 5.2 Contacts & Messaging UI

**Location:** `/admin/contacts` (new page)

**Sections:**

#### A. Contacts Directory
- Searchable table of all patients
- Columns: Name, Phone, Email, Last Contact, Preferred Method
- Sort by: Name, Last Contact Date
- Click to open contact card with:
  - Full contact info
  - Contact preferences (edit form)
  - Message history (expandable)
  - Quick actions: Send Message, Call, Edit Preferences

#### B. Message Inbox/History
- Table of all messages sent/received
- Columns: Date, Patient, Type, Channels, Status, Subject (truncated)
- Filters: Patient, Message Type, Status, Date Range, Channel
- Status indicators: pending ⏳, sent ✓, delivered ✓✓, failed ❌, read 👁️
- Click to expand: Full message body, delivery details, timestamps
- Actions: View Appointment, Resend (if failed), View Patient Profile

#### C. Send Message Form
- Recipient patient selector (searchable, show contact preferences)
- Channel selection (email ☑️ / SMS ☑️) with preference hints
- Message templates (Appointment Reminder, Appointment Confirmation, Custom)
- Subject (if email)
- Body editor (plain text, auto-insert patient/appointment placeholders)
- Language selector (EN/ES for template text)
- Preview
- Send button - queues message to message_logs with status='pending'

#### D. Contact Preferences Modal
- Shown when editing contact preferences
- Toggle: Email reminders, SMS reminders, Marketing, Do Not Contact
- Preferred contact method selector
- Preferred language selector
- Notes field (staff-only field for internal notes)
- Last contact date (read-only)
- Save button

### 5.3 Message Status Integration

Show message status inline across the app:
- Appointment detail view: "Confirmation sent ✓ (delivered)" with timestamp
- Patient profile: "Last contact: 3 days ago via SMS"
- Dashboard widget: "X messages pending delivery" with retry option
- Toast after sending: "Message queued - will send at [time]" + "Resend now?" link

---

## 6. Email/SMS Template Updates

### 6.1 New Templates

#### `src/email/templates/appointment-reminder.ts`
- Subject: "Appointment Reminder - [Date] [Time]"
- Body: Bilingual (EN/ES), includes appointment details, call to confirm/reschedule

#### `src/email/templates/custom-message.ts`
- Generic template for staff-sent custom messages
- Header: "Message from [Practice Name]"
- Body: Raw staff-provided text

### 6.2 Enhanced Existing Templates
- Add unsubscribe link to all transactional emails (if using Resend)
- Track open/click events via Resend webhook
- Add SMS tracking via Twilio webhook

---

## 7. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create database migrations (appointment_reminders, message_logs, contact_preferences, reminder_config)
- [ ] Add RLS policies for new tables
- [ ] Create Supabase client utilities for new tables
- [ ] Write database seed script with sample data

### Phase 2: Backend APIs (Week 1-2)
- [ ] Implement `/api/reminders/*` routes
- [ ] Implement `/api/messages/*` routes
- [ ] Implement `/api/contacts/preferences/*` routes
- [ ] Implement `/api/contacts` directory endpoint
- [ ] Enhance notification-service with logging/preference checks
- [ ] Create cron job endpoint `/api/cron/send-pending-reminders`

### Phase 3: Cron & Webhooks (Week 2)
- [ ] Set up Vercel Cron deployment (or external scheduler)
- [ ] Implement Resend webhook handler for email delivery/open events
- [ ] Implement Twilio webhook handler for SMS delivery/failure events
- [ ] Update message_logs status on webhook hits
- [ ] Add retry logic with exponential backoff

### Phase 4: Frontend UI (Week 2-3)
- [ ] Create `/admin/reminders` page with settings, queue, history
- [ ] Create `/admin/contacts` page with directory, inbox, preferences
- [ ] Add send message modal/form
- [ ] Add status indicators throughout app
- [ ] Implement i18n for all new labels/messages

### Phase 5: Testing & Polish (Week 3)
- [ ] Write E2E tests for reminder flow
- [ ] Write E2E tests for message send flow
- [ ] Manual testing on live Supabase
- [ ] Performance testing (query optimization for message_logs)
- [ ] Accessibility audit

### Phase 6: Deployment & Monitoring (Week 3-4)
- [ ] Deploy to Vercel with env vars for cron
- [ ] Set up monitoring/alerts for failed reminders/messages
- [ ] Create admin dashboard widget for message stats
- [ ] Document manual procedures (resend failed messages, bulk contact)

---

## 8. Localization Keys Required

```json
{
  "reminders": {
    "title": "Appointment Reminders",
    "settings": "Reminder Settings",
    "defaultTiming": "Default Reminder Timing",
    "defaultChannels": "Default Channels",
    "autoSend": "Automatically Send Reminders",
    "queue": "Pending Reminders",
    "history": "Reminder History",
    "sendNow": "Send Now",
    "cancel": "Cancel",
    "pending": "Pending",
    "sent": "Sent",
    "failed": "Failed"
  },
  "contacts": {
    "title": "Contacts & Messaging",
    "directory": "Contact Directory",
    "inbox": "Message Inbox",
    "sendMessage": "Send Message",
    "preferences": "Contact Preferences",
    "lastContact": "Last Contact",
    "preferredMethod": "Preferred Method",
    "doNotContact": "Do Not Contact",
    "language": "Language",
    "messageType": "Message Type",
    "status": "Status",
    "delivered": "Delivered",
    "failed": "Failed",
    "pending": "Pending",
    "read": "Read"
  },
  "messageTemplates": {
    "appointmentReminder": "Appointment Reminder",
    "appointmentConfirmation": "Appointment Confirmation",
    "appointmentCancellation": "Appointment Cancellation",
    "appointmentReschedule": "Appointment Rescheduled",
    "custom": "Custom Message"
  }
}
```

---

## 9. Security & Compliance

### 9.1 RLS Policies
- Staff can only see messages for their own patients
- Admin can see all messages
- Patients cannot create/delete messages (read-only inbox when patient-facing UI added later)
- No staff can modify sent messages (audit trail protection)

### 9.2 PII Handling
- Don't log message body in audit table
- Hash/mask phone numbers in logs if compliance required
- Implement data retention policy (delete messages older than 1 year)
- Add GDPR "right to be forgotten" request handling

### 9.3 Rate Limiting
- Limit to 5 reminders per patient per day
- Prevent duplicate reminders for same appointment
- Throttle manual send requests (e.g., 1 per 10 minutes per staff member)

---

## 10. Success Metrics

- [ ] 100% of appointments generate automatic reminders
- [ ] Reminder delivery rate > 95% (tracked in message_logs)
- [ ] Staff use message history feature (track page visits)
- [ ] Patient response to reminders improves no-show rate
- [ ] Contact preferences reduce opt-out complaints
- [ ] Load time for message inbox < 2s (with pagination)

---

## 11. Rollout Strategy

1. **Beta (Internal):** Test with admin staff only for 1 week
2. **Gradual (20% patient base):** Enable reminders for 20% of new appointments
3. **Full (100%):** Roll out to all appointments
4. **Feedback:** Collect feedback and iterate on templates/timing

---

## 12. Dependencies & Integrations

- **Resend.com:** Email delivery (already integrated)
- **Twilio:** SMS delivery (already integrated)
- **Vercel Cron:** Schedule reminder sending (new)
- **Supabase:** Storage + RLS + webhooks
- **NextAuth.js:** User auth (existing)
- **next-intl:** i18n support (existing)

---

## 13. Open Questions / Risks

1. **When to send reminders?**
   - Option A: 24 hours before (current plan)
   - Option B: Configurable per appointment type
   - Option C: Multiple reminders (24h + 1h before)
   - **Recommendation:** Start with Option B (config per type)

2. **Should reminders respect patient timezone?**
   - Current: Send at [appointment_time - offset] in practice timezone
   - Better: Send at [appointment_time - offset] in patient timezone
   - **Recommendation:** Add patient timezone field to patients table, then adjust

3. **Who can manually resend messages?**
   - Option A: Admins only
   - Option B: Any staff
   - **Recommendation:** Option B with audit logging

4. **Webhook security for Resend/Twilio?**
   - Need to verify webhook signatures
   - Add webhook validation middleware

5. **Performance impact of querying message_logs?**
   - May need pagination + date range limits
   - Consider PostgreSQL JSONB query optimization

---

## 14. Future Enhancements

- [ ] Patient-facing message history and preferences portal
- [ ] Automated follow-up sequences (post-appointment feedback)
- [ ] SMS two-way conversations (reply-to-confirm)
- [ ] WhatsApp channel integration
- [ ] Calendar sync notifications (Google Calendar push)
- [ ] Bulk messaging campaigns
- [ ] Message analytics (open rates, response rates)
- [ ] AI-powered message suggestions

---

## Next Steps

1. **Review & confirm** this plan with stakeholders
2. **Create session memory** with agreed-on implementation approach
3. **Begin Phase 1** with database migrations
4. **Set up local testing** with Supabase and Vercel dev environment

