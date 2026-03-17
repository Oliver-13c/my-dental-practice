# Twilio Webhook Production Setup Guide

## Overview

This guide covers configuring Twilio webhooks for production deployment of the My Dental Practice messaging system. Two webhooks are required:

1. **Inbound SMS Webhook** — Receives incoming SMS messages from patients
2. **Delivery Status Webhook** — Receives SMS delivery status updates (sent, delivered, failed)

---

## 1. Environment Configuration

### 1.1 Required Environment Variables

Add these to your `.env.local` (development) or Vercel/deployment platform environment settings:

```bash
# Twilio Account Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890

# Webhook URLs (production domain)
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/webhooks/twilio/sms
TWILIO_STATUS_WEBHOOK_URL=https://yourdomain.com/api/webhooks/twilio/status
```

### 1.2 Obtaining Credentials

1. Visit [Twilio Console](https://www.twilio.com/console)
2. Navigate to **Account Info** section
3. Copy your **Account SID** and **Auth Token**
4. Your phone number is listed in **Phone Numbers** section

---

## 2. Webhook Endpoints

### 2.1 Inbound SMS Webhook

**Endpoint:** `POST /api/webhooks/twilio/sms`

**Location:** [src/app/api/webhooks/twilio/sms/route.ts](../src/app/api/webhooks/twilio/sms/route.ts)

**Features:**
- Receives incoming SMS from patients
- Finds matching patient by phone number
- Creates message_logs record
- Broadcasts real-time notification to staff
- Logs unmatched messages for admin review

**Expected Twilio Payload:**
```
MessageSid=SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AccountSid=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
From=+1234567890
To=+0987654321
NumMedia=0
Body=Your+appointment+is+confirmed
```

### 2.2 Delivery Status Webhook

**Endpoint:** `POST /api/webhooks/twilio/status`

**Location:** [src/app/api/webhooks/twilio/status/route.ts](../src/app/api/webhooks/twilio/status/route.ts)

**Features:**
- Receives SMS delivery status updates
- Maps Twilio status to internal schema
- Updates message_logs with timestamps
- Captures error codes for failed deliveries
- Logs audit trail

**Status Mappings:**
- `queued` → `pending`
- `sent` → `sent`
- `delivered` → `delivered`
- `failed` / `undelivered` → `failed`

**Expected Twilio Payload:**
```
MessageSid=SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MessageStatus=delivered
Timestamp=2026-03-16T10:30:00Z
ErrorCode=  (only on failure)
```

---

## 3. Twilio Console Configuration

### 3.1 Setup for Inbound SMS

1. **Log in** to [Twilio Console](https://www.twilio.com/console)

2. **Navigate to Messaging → Services** (or Phone Numbers if using legacy setup)

3. **Select or create** your Messaging Service

4. **Set Inbound Message Handler:**
   - **URL:** `https://yourdomain.com/api/webhooks/twilio/sms`
   - **Method:** `HTTP POST`
   - **Fallback URL:** (optional, for error cases)

5. **Save** configuration

### 3.2 Setup for Delivery Status Callbacks

1. **In the same Messaging Service**, find **Webhook Settings**

2. **Set Delivery Status Callback:**
   - **URL:** `https://yourdomain.com/api/webhooks/twilio/status`
   - **Method:** `HTTP POST`
   - **Enable:** Check the "Delivery Status Callback" option

3. **Save** configuration

### 3.3 Phone Number Configuration (Legacy Setup)

If not using Messaging Service, configure individual phone numbers:

1. **Navigate to Phone Numbers → Active**

2. **Select your phone number**

3. **Messaging:**
   - **Inbound Message Webhook:** `https://yourdomain.com/api/webhooks/twilio/sms`
   - **HTTP POST**

4. **Save**

---

## 4. Signature Verification

### 4.1 Security Implementation

All webhook handlers verify Twilio request signatures using:

```
X-Twilio-Signature header + TWILIO_AUTH_TOKEN
```

**Implementation:** [src/lib/twilio.ts](../src/lib/twilio.ts)

```typescript
function verifyTwilioSignature(request: Request, bodyStr: string): boolean {
  // Verifies that incoming request originated from Twilio
  // Uses HMAC-SHA1 with Auth Token
}
```

### 4.2 Verification in Development

When testing with **ngrok** tunneling:

1. Start ngrok tunnel: `ngrok http 3000`
2. Copy ngrok URL (e.g., `https://abc123.ngrok.io`)
3. In Twilio Console, use: `https://abc123.ngrok.io/api/webhooks/twilio/sms`
4. Requests are verified the same way

---

## 5. Production Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set in your deployment platform
- [ ] Twilio phone number purchased and activated
- [ ] Twilio Auth Token rotated (if compromised)
- [ ] Rate limiting enabled (optional, see Rate Limiting section)

### Post-Deployment

- [ ] Test inbound SMS: Send test SMS to your Twilio number
- [ ] Verify in database: Check `message_logs` table for incoming message
- [ ] Test status webhook: Check delivered and failed message statuses
- [ ] Monitor logs: Watch application logs for webhook errors

### Verification Commands

```bash
# Check if endpoints are accessible
curl -X POST https://yourdomain.com/api/webhooks/twilio/sms

# Should return 400 (missing required Twilio fields)
# If you get 404, endpoint not deployed correctly
```

---

## 6. Database Requirements

### 6.1 message_logs Table Schema

Required columns for webhook handlers:

```sql
CREATE TABLE message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  sms_message_sid TEXT UNIQUE,
  message_type VARCHAR(50), -- 'inbound', 'outbound', 'system'
  sms_status VARCHAR(50), -- 'queued', 'sent', 'delivered', 'failed', 'unmatched'
  body TEXT,
  direction VARCHAR(20), -- 'inbound', 'outbound'
  status VARCHAR(50), -- 'pending', 'sent', 'delivered', 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  channels TEXT[] -- '{sms}', '{email}'
);
```

### 6.2 Migrations

Required migrations:

- [20260316000300_appointment_reminders_table.sql](../db/migrations/20260316000300_appointment_reminders_table.sql)
- [20260316000301_message_logs_table.sql](../db/migrations/20260316000301_message_logs_table.sql)

---

## 7. Troubleshooting

### 7.1 Webhook Not Receiving Events

**Problem:** Twilio webhooks not hitting endpoint

**Solutions:**
1. Verify URL in Twilio Console matches exactly (including protocol/domain)
2. Check that domain is publicly accessible (not localhost)
3. Verify DNS resolution: `nslookup yourdomain.com`
4. Check application logs for 500 errors

### 7.2 Signature Verification Failing

**Problem:** All requests rejected with "Invalid signature"

**Solutions:**
1. Verify `TWILIO_AUTH_TOKEN` is correct (from Twilio Console, not phone number)
2. Ensure webhook body is not modified before verification
3. Check that `X-Twilio-Signature` header is intact

### 7.3 Messages Not Appearing in Database

**Problem:** Webhooks hit endpoint but messages not in DB

**Solutions:**
1. Check patient phone number matches exactly (format: +1234567890)
2. Verify patient record exists in database
3. Check application logs for "No patient found" warning
4. Messages without matching patient are logged with `patient_id=NULL` for admin review

### 7.4 Delivery Status Updates Missing

**Problem:** SMS status remains "pending" after delivery

**Solutions:**
1. Verify Delivery Status Callback URL in Twilio Console
2. Check that `sms_message_sid` from inbound SMS matches status webhook
3. Verify database schema includes `delivered_at` column
4. Check logs for "Message not found" warnings

---

## 8. Monitoring & Logging

### 8.1 Log Messages

**Successful inbound SMS:**
```
[twilio-webhook] Inbound SMS logged successfully: {patient_id, phone, messageSid}
```

**Successful delivery update:**
```
[twilio-status-webhook] SMS status updated: {messageSid, status, deliveredAt}
```

**Failure cases:**
```
[twilio-webhook] No patient found for phone: {fromPhone}
[twilio-webhook] Invalid Twilio signature
[twilio-status-webhook] Message not found: {messageSid}
```

### 8.2 Monitoring Tools

- **Twilio Console → Logs** — View all webhook attempts
- **Application Logs** — Check `/logs` or Vercel/platform logs
- **Database Queries** — Monitor `message_logs` table growth

---

## 9. Rate Limiting (Optional)

### 9.1 Recommended Configuration

```typescript
// In route handler
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
});

export const POST = limiter(async (request) => {
  // Handler code
});
```

### 9.2 Why Important

- Prevents abuse if webhook URL is leaked
- Protects database from SMS floods
- Complies with API best practices

---

## 10. Mobile Layout Verification

### 10.1 Messages Tab Responsive Design

**Desktop (lg breakpoint +):**
- Thread list: Fixed 300px sidebar on left
- Viewer/Composer: Full width on right
- Both visible simultaneously

**Tablet/Mobile (<lg):**
- Full width layout stacking vertically
- Thread list full width
- Message viewer full width below
- Both scrollable independently

### 10.2 Mobile Testing Checklist

- [ ] Thread list scrolls on small screens
- [ ] Message text wraps properly
- [ ] Unread badge displays correctly
- [ ] Composition form fits in viewport
- [ ] Send button is easy to tap (min 44x44px)
- [ ] Search input works on touch devices
- [ ] No horizontal scrolling required

### 10.3 Responsive Classes Used

```tsx
// Mobile-first approach
<div className="flex flex-col gap-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
  {/* Mobile: stacked vertically */}
  {/* Desktop (lg+): 2-column grid */}
</div>

// Adaptive padding
<div className="p-4 sm:p-6">
  {/* 4px padding on mobile, 6px on small screens+ */}
</div>

// Scaled heights
<div className="h-64 sm:h-96">
  {/* Smaller placeholder on mobile, larger on desktop */}
</div>
```

---

## 11. Production Readiness Checklist

### Infrastructure
- [ ] Domain configured with SSL/TLS
- [ ] Domain points to deployment platform
- [ ] Platform supports background jobs (for real-time updates)
- [ ] Database replicated and backed up

### Twilio
- [ ] Phone number purchased
- [ ] Inbound SMS webhook configured
- [ ] Delivery Status webhook configured
- [ ] Test SMS sent and verified in database
- [ ] Auth Token securely stored (never in code)

### Application
- [ ] Environment variables set
- [ ] Signature verification enabled
- [ ] Error logging configured
- [ ] Rate limiting enabled (recommended)
- [ ] Database migrations applied

### Security
- [ ] HTTPS/TLS enforced
- [ ] Auth Token rotated from development
- [ ] IP whitelisting considered for extra security
- [ ] Logs do not contain sensitive data
- [ ] Patient data masked in logs

### Monitoring
- [ ] Error alerts configured
- [ ] Webhook success rate monitored
- [ ] Database query performance monitored
- [ ] Real-time message delivery verified
- [ ] Staff can receive messages

---

## 12. Support Resources

- [Twilio Webhooks Documentation](https://www.twilio.com/docs/usage/webhooks)
- [Twilio Messaging API](https://www.twilio.com/docs/sms/api)
- [Signature Verification](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Status Callback Events](https://www.twilio.com/docs/sms/api/message-resource#message-status-values)

---

**Last Updated:** March 16, 2026  
**Next Review:** After first production week
