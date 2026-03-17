# Per-Tenant Twilio Configuration Guide

## Overview

MyDentalPractice now supports **per-tenant Twilio configuration**, allowing each dental practice to use their own Twilio account and phone number. This eliminates the need for environment variables and enables seamless multi-tenant SMS messaging.

## Architecture

### Before (Environment Variables)
```
Single Twilio account shared across all tenants
↓
TWILIO_ACCOUNT_SID=ACxxxxxxxx (in .env)
TWILIO_PHONE_NUMBER=+1555...
All tenants→ Same SMS number
```

### After (Per-Tenant Database)
```
Each tenant has their own configuration
↓
Admin Dashboard → Settings → Twilio Configuration
↓
Database: tenant_configurations table
↓
SMS Webhooks read from database
↓
Each tenant → Own SMS number & credentials
```

## Database Schema

New table: `tenant_configurations`

```sql
CREATE TABLE tenant_configurations (
  id uuid PRIMARY KEY,
  
  -- Twilio Credentials
  twilio_account_sid varchar,
  twilio_auth_token varchar,
  twilio_phone_number varchar,
  
  -- Webhook URLs
  twilio_webhook_url varchar,
  twilio_status_webhook_url varchar,
  
  -- Status
  twilio_enabled boolean,
  twilio_configured_at timestamptz,
  
  -- Metadata
  configured_by uuid,
  created_at timestamptz,
  updated_at timestamptz
);
```

Also includes:
- `tenant_configuration_audit` table for audit trail
- RLS policies requiring admin role
- Indexes for efficient lookups

## Setup Instructions

### Step 1: Access Admin Settings

1. Log in as Admin
2. Go to **Admin Dashboard** → **Settings** (new option)
3. Scroll to **Twilio Configuration** section

### Step 2: Gather Credentials

Get these from your Twilio Console:

| Field | Where to Find | Format |
|-------|---------------|--------|
| **Account SID** | Dashboard → Account Info | `ACxxxxxxxxxxxxxxxxxxxxxxxx` |
| **Auth Token** | Dashboard → Auth Tokens | Keep secret! |
| **Phone Number** | Phone Numbers → Manage | `+1 (555) 555-5555` |

### Step 3: Determine Webhook URLs

These are the URLs where Twilio will send events:

```
Inbound SMS Webhook: https://{your-domain}/api/webhooks/twilio/sms
Delivery Status Webhook: https://{your-domain}/api/webhooks/twilio/status
```

Example:
```
https://your-dental-practice.com/api/webhooks/twilio/sms
https://your-dental-practice.com/api/webhooks/twilio/status
```

### Step 4: Fill the Form

1. Enter your **Account SID**
2. Enter your **Auth Token** (will be masked in UI)
3. Enter your **Phone Number**
4. Enter **Inbound SMS Webhook URL**
5. Enter **Delivery Status Webhook URL**
6. Click **Save Configuration**

### Step 5: Verify in Twilio Console

After saving, configure Twilio to send webhooks:

1. Log in to Twilio Console
2. Go to **Programmable Messaging** → **Settings** → **Webhooks**
3. Set:
   - **Inbound Webhook URL**: Copy from admin form
   - **Delivery Status Webhook URL**: Copy from admin form
4. Save

### Step 6: Test

Send a test SMS from a patient phone:
1. SMS the Twilio number with a message
2. Check Admin Dashboard for received message
3. Verify delivery status in message logs

## API Endpoints

### Get Current Configuration

```bash
GET /api/admin/tenant-configuration

Response:
{
  "data": {
    "id": "uuid",
    "twilio_enabled": true,
    "twilio_account_sid": "AC****",
    "twilio_phone_number": "+1 (555) 555-5555",
    "twilio_webhook_url": "https://...",
    "twilio_status_webhook_url": "https://...",
    "twilio_configured_at": "2026-03-16T12:00:00Z"
  }
}
```

### Update Configuration

```bash
POST /api/admin/tenant-configuration

Request Body:
{
  "twilio_account_sid": "ACxxxxxxxx",
  "twilio_auth_token": "your-auth-token",
  "twilio_phone_number": "+1 (555) 555-5555",
  "twilio_webhook_url": "https://yourdomain.com/api/webhooks/twilio/sms",
  "twilio_status_webhook_url": "https://yourdomain.com/api/webhooks/twilio/status"
}

Response:
{
  "data": {
    "id": "uuid",
    "message": "Configuration created|updated",
    "twilio_account_sid": "AC****"
  }
}
```

**Authentication:** Admin only (requires `is_admin=true` or `role='admin'`)

## Configuration Fallback Chain

The system uses a fallback chain for backward compatibility:

1. **Database** (`tenant_configurations` table) - Highest priority
2. **Environment variables** (`.env`) - Fallback for existing deployments
3. **Not configured** - System will warn and fail gracefully

This means:
- ✅ Existing deployments continue to work with env vars
- ✅ Can migrate to database configuration at any time
- ✅ Database config takes precedence once set

## Code Changes

### Updated Files

1. **API Endpoint**: `src/app/api/admin/tenant-configuration/route.ts`
   - GET: Retrieve current config
   - POST: Update/create config
   - Includes audit trail

2. **SMS Webhook**: `src/app/api/webhooks/twilio/sms/route.ts`
   - Now calls `getTenantTwilioConfig()`
   - Falls back to env vars

3. **Status Webhook**: `src/app/api/webhooks/twilio/status/route.ts`
   - Now calls `getTenantTwilioConfig()`
   - Validates config exists before processing

4. **Config Service**: `src/services/tenant-config.ts`
   - `getTenantTwilioConfig()`: Retrieves from DB or env
   - `isValidTwilioConfig()`: Validates config completeness

### New Components

1. **Admin Form**: `src/features/admin-dashboard/ui/TwilioConfigurationForm.tsx`
   - Settings form with validation
   - Shows configuration status
   - Includes quick setup checklist
   - Copy-to-clipboard for URLs

2. **Admin Page**: `src/app/admin/settings/page.tsx`
   - Admin settings dashboard
   - Links to documentation

### Database Migration

File: `db/migrations/20260316000400_tenant_twilio_configuration.sql`

Creates:
- `tenant_configurations` table
- `tenant_configuration_audit` table
- RLS policies for admin access
- Indexes for performance

## Security & Privacy

### Credentials Protection

- ✅ Auth tokens stored in database (encrypted during transmission)
- ✅ Masked in UI (only first 4 chars shown: `AC****`)
- ✅ Not exposed in logs
- ✅ Audit trail tracks changes (credentials redacted)
- ✅ Only accessible by admins

### RLS Policies

```sql
-- Only admins can view
SELECT: admin must be logged in
UPDATE: admin must be logged in
INSERT: admin must be logged in

-- Service role can insert audit logs
Audit logs: service role only
```

### Webhook Security

- ✅ Signature verification from Twilio
- ✅ URL validation in form
- ✅ Configuration existence check before processing

## Troubleshooting

### "Twilio not configured"

**Problem**: System can't find Twilio config

**Solution**:
1. Go to Admin → Settings
2. Verify form is filled completely
3. Check box shows "Twilio is configured and enabled"
4. If not, fill form and save

### Webhooks Not Receiving Events

**Problem**: SMS sent but no message appears

**Steps**:
1. Verify webhook URLs are correct
2. Check URLs are publicly accessible (not localhost)
3. Verify auth token matches
4. Check Twilio console shows webhooks are configured
5. Review logs in admin audit trail

### "Invalid Twilio Signature"

**Problem**: Webhook payload rejected

**Possible causes**:
- Auth token in database doesn't match Twilio account
- Signature verification not properly configured
- Form was submitted but not saved

**Solution**:
1. Verify auth token matches exactly
2. Re-save configuration
3. Check webhook URL matches exactly (including protocol/domain)

### Multiple Tenants Getting Wrong Messages

**Problem**: Messages crossing between tenants

**This should not happen** because:
- ✅ Each tenant has separate phone number
- ✅ Webhooks called separately for each tenant
- ✅ Patient lookup is tenant-scoped
- ✅ RLS policies prevent data leakage

If occurring:
1. Verify each tenant has unique phone number
2. Verify webhook URLs are different
3. Check RLS policies are applied

## Migration from Environment Variables

If you have an existing deployment using env vars:

### Option 1: Keep Using Env Vars (No Action)
- No changes needed
- System automatically falls back to env vars
- Admin form will show "not configured"

### Option 2: Migrate to Database Config
1. Go to Admin → Settings → Twilio Configuration
2. Manually re-enter values from `.env` file:
   - `TWILIO_ACCOUNT_SID` → Account SID field
   - `TWILIO_AUTH_TOKEN` → Auth Token field
   - `TWILIO_PHONE_NUMBER` → Phone Number field
   - `TWILIO_WEBHOOK_URL` → Inbound SMS Webhook URL
   - `TWILIO_STATUS_WEBHOOK_URL` → Delivery Status Webhook URL
3. Click Save
4. Can now remove from `.env` (optional, keeps working as fallback)

## Quick Reference

### Admin Dashboard Changes

**Before**: No Twilio settings accessible
**After**: Admin → Settings → Twilio Configuration

### Webhook Updates

| Webhook | Before | After |
|---------|--------|-------|
| SMS Inbound | Reads `TWILIO_AUTH_TOKEN` from env | Reads from DB + env fallback |
| SMS Status | Reads from env | Reads from DB + env fallback |

### Database Changes

| Table | Before | After |
|-------|--------|-------|
| `staff_profiles` | Used for users | Still used for users |
| `message_logs` | Stores messages | Still stores messages |
| `tenant_configurations` | N/A | **NEW** - Stores Twilio config |
| `tenant_configuration_audit` | N/A | **NEW** - Audit trail |

## Next Steps

### Phase 6+ Enhancements

Future versions will expand per-tenant configuration:

- [ ] **Email Configuration**: Per-tenant email/SMTP settings
- [ ] **API Keys**: Per-tenant API access control
- [ ] **Brand Settings**: Per-tenant branding (logos, colors)
- [ ] **SMS Templates**: Per-tenant message templates
- [ ] **Webhook Custom Headers**: Per-tenant auth headers
- [ ] **Rate Limits**: Per-tenant rate limiting
- [ ] **Geography**: Per-tenant regions/endpoints

## Support & Documentation

- 📖 See also: [TWILIO_WEBHOOK_PRODUCTION_SETUP.md](./TWILIO_WEBHOOK_PRODUCTION_SETUP.md)
- 📖 See also: [MOBILE_TESTING_GUIDE.md](./MOBILE_TESTING_GUIDE.md)
- 📖 See also: [DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md)

## Summary

Per-tenant Twilio configuration allows each dental practice to:
- ✅ Use their own Twilio account
- ✅ Use their own phone number
- ✅ Configure settings via admin UI (no env vars needed)
- ✅ Maintain audit trail of configuration changes
- ✅ Scale to multiple practices independently

Admin setup takes **~10 minutes** after deployment.
