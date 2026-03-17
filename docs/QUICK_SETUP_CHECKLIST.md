# Quick Setup Checklist - Per-Tenant Twilio Configuration

## Overview

This checklist guides you through configuring Twilio SMS messaging for your dental practice. **Each practice must configure their own Twilio account and credentials** - configuration is stored in the database per tenant (not environment variables).

## Pre-Deployment Checklist

### ✅ 1. Set Up Twilio Account
- [ ] Create Twilio account at https://www.twilio.com
- [ ] Get your **Account SID** (starts with `AC`)
- [ ] Get your **Auth Token** (keep secret!)
- [ ] Purchase or verify a phone number for SMS
- [ ] Note your phone number (format: +1 (555) 555-5555)

### ✅ 2. Deploy Application to Production
- [ ] Push code to main branch
- [ ] Deploy to production hosting (Vercel, AWS, Azure, etc.)
- [ ] Verify application is running at your domain
- [ ] Test that domain is publicly accessible

### ✅ 3. Generate Webhook URLs
- [ ] Replace `{your-domain}` in URLs below with your actual domain
- [ ] **Inbound SMS Webhook**: `https://{your-domain}/api/webhooks/twilio/sms`
- [ ] **Delivery Status Webhook**: `https://{your-domain}/api/webhooks/twilio/status`

Example (if your domain is `dentalcare.example.com`):
```
Inbound SMS: https://dentalcare.example.com/api/webhooks/twilio/sms
Status: https://dentalcare.example.com/api/webhooks/twilio/status
```

## Post-Deployment Configuration (10 minutes)

### ✅ 4. Access Admin Settings
1. Log in to your application as **Admin**
2. Go to **Admin Dashboard**
3. Click **Settings** (⚙️ icon in quick actions)
4. Scroll to **Twilio Configuration** section

### ✅ 5. Configure Twilio in Admin Dashboard

**Fill in these fields:**

| Field | Value | Source |
|-------|-------|--------|
| **Account SID** | `AC...` | Twilio Console → Account Info |
| **Auth Token** | `••••••` (masked) | Twilio Console → Auth Tokens |
| **Phone Number** | `+1 (555) 555-5555` | Your purchased Twilio number |
| **Inbound SMS Webhook** | `https://{domain}/api/webhooks/twilio/sms` | From step 3 |
| **Delivery Status Webhook** | `https://{domain}/api/webhooks/twilio/status` | From step 3 |

Then click **Save Configuration**

✅ **Status check**: You should see "Twilio is configured and enabled"

### ✅ 6. Configure Webhooks in Twilio Console

1. Log in to **Twilio Console**
2. Go to **Programmable Messaging** → **Settings** → **Webhooks**
3. Set webhook URLs:
   - **URL (Request POST)**: `https://{your-domain}/api/webhooks/twilio/sms`
   - (Check the box to enable)
4. Scroll down and set:
   - **Delivery Status Webhook URL**: `https://{your-domain}/api/webhooks/twilio/status`
5. Click **Save**

### ✅ 7. Run Database Migration

Run the migration to create the tenant configuration tables:

```bash
# Using Supabase CLI
supabase migration up

# Or manually in Supabase dashboard:
# Run: db/migrations/20260316000400_tenant_twilio_configuration.sql
```

This creates:
- `tenant_configurations` table - stores your Twilio settings
- `tenant_configuration_audit` table - audit trail of changes

### ✅ 8. Send Test SMS

1. From a phone number (not the practice), send SMS to your Twilio number
2. Message arrives in admin dashboard → **Staff Dashboard** → **Messages**
3. Verify message appears with sender's phone number
4. Check message status is "delivered" or "received"

### ✅ 9. Test Reply (Optional)

1. Staff member sends reply via admin dashboard
2. Verify SMS is received on phone that sent initial message
3. Check message status updates to "sent" then "delivered"

### ✅ 10. Verify Configuration

Go back to **Admin → Settings** and confirm:
- [ ] Status shows "Twilio is configured and enabled"
- [ ] All fields are populated correctly
- [ ] Last configured date is recent

## After Configuration

### 📱 SMS Messaging is Now Live

- **Staff Dashboard**: Messages tab shows patient conversations
- **Patient Portal** (if enabled): Patients can see SMS from practice
- **Admin Dashboard**: Full message history and audit trail

### 🔧 Configuration Changes

To update Twilio settings later:
1. Go to **Admin → Settings → Twilio Configuration**
2. Modify any fields
3. Click **Save Configuration**
4. Changes are audit-logged automatically

### 📋 Full Documentation

For more details, see:
- [TENANT_TWILIO_CONFIGURATION.md](./TENANT_TWILIO_CONFIGURATION.md) - Per-tenant setup guide
- [TWILIO_WEBHOOK_PRODUCTION_SETUP.md](./TWILIO_WEBHOOK_PRODUCTION_SETUP.md) - Production deployment details
- [MOBILE_TESTING_GUIDE.md](./MOBILE_TESTING_GUIDE.md) - Testing procedures

## Troubleshooting

### "Webhooks not receiving SMS"

**Check list:**
1. ✅ Webhook URLs are exactly correct (including HTTPS protocol)
2. ✅ URLs are publicly accessible (test in browser)
3. ✅ Configuration was saved in admin dashboard
4. ✅ Twilio console has correct webhook URLs configured
5. ✅ Auth token matches between Twilio and admin form

### "Messages not appearing in dashboard"

1. ✅ Verify patient phone number matches patient record
2. ✅ Check SMS came from a valid patient (not random number)
3. ✅ Look in admin audit logs for errors
4. ✅ Check application logs for webhook errors

### "Can't log in to admin dashboard"

1. ✅ Verify user account has `is_admin=true` or `role='admin'`
2. ✅ Check staff_profiles table in database
3. ✅ Verify authentication is working (other users can log in)

## Environment Variables (Optional)

For **development/testing only**, you can use environment variables:

```bash
# .env (development only - don't commit credentials!)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+15555555555
TWILIO_WEBHOOK_URL=https://localhost:3000/api/webhooks/twilio/sms
TWILIO_STATUS_WEBHOOK_URL=https://localhost:3000/api/webhooks/twilio/status
```

**For production**: Use Admin Dashboard → Settings instead (no env vars needed).

## Multi-Tenant Deployment

If running **multiple dental practices**:

1. Each practice gets their own URL/domain
2. Each practice has their own Admin user
3. Each admin configures their own Twilio credentials
4. Each tenant's data is completely isolated (RLS policies)

**Example**:
```
Practice A: https://practice-a.dentalcare.example.com
  - Admin: admin@practice-a.com
  - Twilio SID: ACaaa...
  - Phone: +1 (555) 111-1111

Practice B: https://practice-b.dentalcare.example.com
  - Admin: admin@practice-b.com
  - Twilio SID: ACbbb...
  - Phone: +1 (555) 222-2222
```

Each practice's SMS messages stay isolated in their practice's database.

## Security Notes

- 🔒 **Never commit credentials** to git
- 🔒 **Auth Token is masked** in admin UI (only first 4 chars shown)
- 🔒 **Credentials only accessible to admins** (RLS policy)
- 🔒 **All changes are audit-logged** (tenant_configuration_audit table)
- 🔒 **HTTPS only** - webhooks validate signature
- 🔒 **Encryption in transit** - all API calls use TLS

## Summary

| Step | Time | Notes |
|------|------|-------|
| Create Twilio account | 5 min | One-time setup |
| Deploy app | 5 min | Same as normal deployment |
| Configure in admin dashboard | 3 min | Fill form, click save |
| Set webhooks in Twilio console | 2 min | Copy/paste URLs |
| Test SMS | 5 min | Send test message |
| **Total** | **20 minutes** | Per practice per environment |

## Getting Help

- 📖 Full setup guide: [TENANT_TWILIO_CONFIGURATION.md](./TENANT_TWILIO_CONFIGURATION.md)
- 🔧 Production deployment: [TWILIO_WEBHOOK_PRODUCTION_SETUP.md](./TWILIO_WEBHOOK_PRODUCTION_SETUP.md)
- 📱 Testing guide: [MOBILE_TESTING_GUIDE.md](./MOBILE_TESTING_GUIDE.md)
- 📋 Database schema: [DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md)

---

**Ready to start?** Log in to your admin dashboard and go to **Settings** → **Twilio Configuration** 🚀
