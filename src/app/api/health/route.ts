/**
 * GET /api/health
 *
 * Lightweight health-check endpoint used by pre-deploy smoke tests and
 * uptime monitors to verify the application is running and reachable.
 *
 * Always returns HTTP 200 so that infrastructure tooling (Vercel, CI,
 * load-balancers) can distinguish a live deployment from a failed one.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV ?? 'unknown',
    },
    { status: 200 },
  );
}
