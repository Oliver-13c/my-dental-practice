# Sentry Error-Rate Alerting — Setup Guide

## Overview

This guide covers how to configure Sentry so that an alert fires whenever the
application's error rate exceeds **1 % over any 5-minute window** (or when
more than a configurable number of distinct errors occur), and how to route
that alert to the team Slack channel and/or email.

---

## 1. Prerequisites

| Item | Where to get it |
|------|-----------------|
| Sentry account | <https://sentry.io/signup/> |
| Sentry project DSN | Project Settings → Client Keys (DSN) |
| Sentry auth token | Settings → Auth Tokens → Create New Token (`project:releases`, `org:read`) |
| Slack workspace admin access | Required to install the Sentry Slack app |

Set the following environment variables (see `.env.example`):

```
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@oXXXX.ingest.sentry.io/XXXX
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=my-dental-practice
SENTRY_AUTH_TOKEN=sntrys_...
```

---

## 2. Sentry Alert Rule — Error Rate > 1 %

### 2a. Navigate to Alerts

1. Open your Sentry project.
2. Go to **Alerts** → **Alert Rules** → **Create Alert Rule**.
3. Select **Metric Alert** (not Issue Alert).

### 2b. Configure the Metric

| Field | Value |
|-------|-------|
| **Dataset** | Errors |
| **Metric** | `count()` (number of events) |
| **Filter** | — (leave empty to cover all errors) |
| **Time window** | **5 minutes** |
| **Threshold type** | Percentage of total requests |

> **Tip**: if your Sentry plan supports *Error Rate* as a first-class metric,
> select it directly. Otherwise use the formula:
> `count() / count_unique(transaction) * 100 > 1`

### 2c. Set the Threshold

| Level | Condition |
|-------|-----------|
| **Warning** | error count > 5 in 5 min |
| **Critical** | error count > 20 in 5 min **or** error rate > 1 % |

Adjust thresholds to match your baseline traffic once the app is in production.

### 2d. Rule name

```
Error rate > 1% (5-min window)
```

---

## 3. Hook Alert to Slack

### 3a. Install the Sentry Slack App

1. Sentry → **Settings** → **Integrations** → search **Slack** → **Add to Slack**.
2. Authorise the app for your workspace.
3. In the integration settings, add the channel (e.g. `#alerts-dental-practice`).

### 3b. Add Slack Action to the Alert Rule

In the alert rule form under **Actions**:

| Action type | Target |
|-------------|--------|
| Send a Slack notification | `#alerts-dental-practice` |

Optionally add **Send an email** → list of on-call staff email addresses.

---

## 4. Hook Alert to Email

In the alert rule **Actions** section add:

```
Send an email to <member/team>
```

Select the Sentry team or individual members who should receive the page.

---

## 5. Verify with Synthetic 5xx

A test endpoint is provided at `GET /api/sentry-test`.  
It is **disabled in production** (returns 404) and only available in
`development` and `staging` environments.

### Run the test

```bash
# Against local dev server
curl -X GET http://localhost:3000/api/sentry-test

# Against staging
curl -X GET https://<staging-url>/api/sentry-test
```

### Expected outcome

1. The endpoint returns an HTTP 500 response.
2. Within ~30 seconds, a new issue appears in Sentry under:
   **Issues** → *[Sentry Test] Synthetic 5xx – verifying error-rate alerting pipeline*
3. If you trigger the endpoint **≥ threshold** times within 5 minutes, the
   alert rule fires.
4. A Slack message (and optional email) is delivered to the configured
   destination.

---

## 6. Checklist

- [ ] `NEXT_PUBLIC_SENTRY_DSN` set in Vercel / CI environment variables
- [ ] `SENTRY_AUTH_TOKEN` set in Vercel / CI environment variables (for source-map upload)
- [ ] Sentry metric alert rule created (error rate > 1 % / 5-min window)
- [ ] Slack integration installed and `#alerts-dental-practice` channel linked
- [ ] Email recipients added to the alert rule
- [ ] Synthetic 5xx test run and alert confirmed received in Slack
