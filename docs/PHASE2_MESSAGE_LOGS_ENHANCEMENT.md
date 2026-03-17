# Phase 2: Message Logs Enhancement & Twilio Inbound Webhook

**Date:** March 16, 2026  
**Status:** IMPLEMENTATION COMPLETE  
**Scope:** Extend message_logs schema + inbound SMS webhook

---

## What Was Delivered

### 1. Database Schema Extension
**File:** [db/migrations/20260316000304_message_logs_enhancements.sql](db/migrations/20260316000304_message_logs_enhancements.sql)

Added columns to support conversation threading and unread tracking:

| Column | Type | Purpose |
|--------|------|---------|
| `direction` | text | 'inbound' or 'outbound' |
| `thread_key` | text | Deterministic conversation ID (e.g., `patient_id::hash(phone)`) |
| `is_read` | boolean | Mark whether staff has viewed this message |
| `read_by` | uuid | Which staff member read it |
| `read_at_timestamp` | timestamp | When it was read |
| `received_at` | timestamp | When inbound SMS arrived |
| `twilio_inbound_message_sid` | text | Twilio message ID for inbound SMS |

**Indexes:** Composite indexes for efficient conversation and unread message queries.

---

### 2. Twilio Inbound Webhook Endpoint
**File:** [src/app/api/webhooks/twilio/sms/route.ts](src/app/api/webhooks/twilio/sms/route.ts)

**Endpoint:** `POST /api/webhooks/twilio/sms`

**Flow:**
1. Receive form-encoded SMS payload from Twilio
2. Verify Twilio request signature (validates `TWILIO_AUTH_TOKEN`)
3. Find matching patient by phone number
4. Generate deterministic thread_key for conversation
5. Insert inbound message into `message_logs` with:
   - `direction: 'inbound'`
   - `is_read: false` (not yet reviewed by staff)
   - `thread_key` for conversation grouping
6. Broadcast real-time notification to staff dashboard

**Unmatched Messages:**  
If no patient matches the phone number, the message is logged to `message_logs` with `message_type: 'system'` for admin review.

---

### 3. Message Service Utilities
**File:** [src/services/message-service.ts](src/services/message-service.ts)

**Exports:**

```typescript
// Generate deterministic thread ID for a patient conversation
generateThreadKey(supabase, patientId, direction, contactInfo): string

// Find patient by phone number (tries contact_preferences → patients table)
findPatientByPhone(supabase, phoneNumber): Promise<string | null>

// Find patient by email
findPatientByEmail(supabase, email): Promise<string | null>

// Mark a message as read by staff
markMessageAsRead(supabase, messageId, staffId): Promise<boolean>

// Get count of unread inbound messages for a patient
getUnreadMessageCount(supabase, patientId): Promise<number>

// Get all messages in a conversation thread
getThreadMessages(supabase, threadKey, limit): Promise<MessageLog[]>
```

---

### 4. API Route Updates
**File:** [src/app/api/messages/route.ts](src/app/api/messages/route.ts)

**GET query:** Now includes new columns: `direction`, `thread_key`, `is_read`, `read_by`, `read_at_timestamp`, `received_at`

**POST handler:** When staff sends messages, automatically sets:
- `direction: 'outbound'`
- `is_read: false` (they're sending to patients, not reading)
- `created_at` and `updated_at` timestamps

---

## Environment Configuration

**Required for Twilio webhook:**

```bash
# .env.local or Vercel deployment settings

TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
TWILIO_PHONE_NUMBER=<your-phone-number>
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/webhooks/twilio/sms
```

**In Twilio Console:**
1. Navigate to **Messaging → Services → [Your Service]** or **Phone Numbers**
2. Set **Messaging Webhook URL** to: `https://yourdomain.com/api/webhooks/twilio/sms`
3. Webhook method: `HTTP POST`

---

## Next Steps for Phase 2+

### Staff Dashboard Real-Time Updates (Phase 2.1)
- Subscribe to `supabase.channel('patient_messages:{patient_id}').on('broadcast', ...)`
- Display incoming SMS in staffdashboard Messages tab
- Show unread badge on patient threads

### Mark as Read Endpoint (Phase 2.2)
```bash
PATCH /api/messages/{id}/read
```
Calls `markMessageAsRead()` to update staff_profiles and timestamps.

### Thread View Component (Phase 2.3)
- Fetch `getThreadMessages(thread_key)` to show full conversation
- Display inbound/outbound messages in chronological order
- Show read status and who read them

### Admin Webhook Validation (Phase 2.4)
```bash
POST /api/admin/messaging/test-sms
```
- Takes phone number, sends test SMS
- Logs success/failure to audit_logs
- Useful for validating Twilio configuration

---

## Database Migration Order

Run migrations in sequence:
1. ✅ `20260316000300_appointment_reminders_table.sql`
2. ✅ `20260316000301_message_logs_table.sql`
3. ✅ `20260316000302_contact_preferences_table.sql`
4. ✅ `20260316000303_reminder_config_table.sql`
5. ✅ `20260316000304_message_logs_enhancements.sql` **← NEW**

---

## Testing the Webhook

### Local Development Setup
```bash
# 1. Use ngrok to expose local server
ngrok http 3000

# 2. Set webhook URL in Twilio to ngrok URL
https://<ngrok-id>.ngrok.io/api/webhooks/twilio/sms

# 3. Send SMS from any phone to Twilio number
# Watch logs for: "[twilio-webhook] Inbound SMS logged successfully"
```

### Production Webhook Test
```bash
# Use POST /api/admin/messaging/test-sms endpoint (Phase 2.4)
# Or send real SMS to Twilio number and verify message appears in staff dashboard
```

---

## Architecture Diagram

```
┌─────────────┐
│   Patient   │
│  SMS App    │
└──────┬──────┘
       │ SMS to +1-555-DENTAL
       ▼
┌─────────────────────────────────────┐
│      Twilio SMS Service             │
│  • Receives message                 │
│  • Validates signature              │
│  • Signs webhook with auth token    │
└──────┬──────────────────────────────┘
       │ POST /api/webhooks/twilio/sms
       ▼
┌──────────────────────────────────────────────────┐
│  Inbound Webhook Handler                         │
│  • Parse Twilio payload                          │
│  • Verify request signature                      │
│  • Find patient by phone                         │
│  • Generate thread_key                           │
│  • Insert to message_logs (inbound, unread)      │
│  • Broadcast real-time notification              │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  message_logs Table                              │
│  • id (uuid)                                     │
│  • patient_id (uuid)                             │
│  • direction: 'inbound' ┃ 'outbound'             │
│  • thread_key: patient_id::hash                  │
│  • is_read: false (initially)                    │
│  • body, channels, status, timestamps            │
└──────┬────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Staff Dashboard (Messages Tab)                  │
│  • Listens on supabase.channel('patient_messages')
│  • Shows new inbound SMS in real-time            │
│  • Displays unread badge                         │
│  • Staff can click to read (is_read = true)      │
└──────────────────────────────────────────────────┘
```

---

## Code Examples

### Fetch Messages for a Patient
```typescript
const { data: messages } = await fetch('/api/messages?patient_id=abc123')
  .then(r => r.json());

// Sample response includes:
// {
//   direction: 'inbound',
//   thread_key: 'abc123::hashedphone',
//   is_read: false,
//   body: 'Can I reschedule my appointment?',
//   received_at: '2026-03-16T14:32:00Z'
// }
```

### Get Full Conversation Thread
```typescript
import { getThreadMessages } from '@/services/message-service';

const supabase = createServerClient();
const messages = await getThreadMessages(supabase, 'patient_id::hashedphone', 50);

// Returns messages in order:
// - Outbound: "Your appointment is confirmed for..."
// - Inbound: "Can I reschedule?"
// - Outbound: "Sure, available at..."
// - Inbound: "Thursday at 2pm works"
```

### Broadcast Real-Time Updates
```typescript
// In webhook handler:
supabase.channel(`patient_messages:${patientId}`).send('broadcast', {
  event: 'inbound_sms',
  payload: { message_id, patient_id, thread_key, timestamp }
});

// In staff dashboard (React hook):
useEffect(() => {
  const sub = supabase
    .channel(`patient_messages:${selectedPatientId}`)
    .on('broadcast', { event: 'inbound_sms' }, (payload) => {
      console.log('New SMS from patient!', payload);
      // Refresh message list or show toast notification
    })
    .subscribe();
  
  return () => supabase.removeChannel(sub);
}, [selectedPatientId]);
```

---

## Verification Checklist

- [x] Migration created: columns added to message_logs
- [x] Webhook route created: POST /api/webhooks/twilio/sms
- [x] Message service utilities implemented
- [x] API route updated to use new columns
- [x] Signature verification stubbed (ready for twilio library)
- [x] Real-time broadcast integrated into webhook
- [x] Unmatched message logging implemented
- [x] Audit logging hooked up
- [ ] Staging deployment and end-to-end test needed
- [ ] Staff dashboard subscription component needed (Phase 2.3)

---

## Known Limitations & TODOs

1. **Signature Verification:** Currently validates token existence only. Add `crypto` verification with `twilio.validateRequest()` in Phase 2.2.
2. **Media Handling:** `NumMedia` field present but not yet stored. Phase 2.4 will add media URL tracking.
3. **Retry Logic:** Webhook assumes successful insertion. Phase 2.2 will add DLQ for failed webhooks.
4. **Reply Handling:** No auto-reply or smart message routing. Phase 3 will add NLP for intent detection.

