/**
 * GET /api/sentry-test
 *
 * Synthetic 5xx endpoint used to verify that Sentry error capture and
 * alerting pipelines (Slack / email) are working correctly.
 *
 * USAGE (development / staging only):
 *   curl -X GET http://localhost:3000/api/sentry-test
 *
 * The request intentionally throws an unhandled error so that:
 *  1. Sentry captures it immediately.
 *  2. The configured alert rule (error rate > 1 % over 5 min) fires.
 *  3. A notification is delivered to the configured Slack channel / email.
 *
 * This route is disabled in production (returns 404).
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  // Disallow in production to prevent accidental noise
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const syntheticError = new Error(
    '[Sentry Test] Synthetic 5xx – verifying error-rate alerting pipeline'
  );

  // Explicitly capture so it shows up in Sentry even if the framework
  // swallows the exception before it propagates.
  Sentry.captureException(syntheticError);

  // Also throw so the Next.js error boundary records an unhandled exception.
  throw syntheticError;
}
