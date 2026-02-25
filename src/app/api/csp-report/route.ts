import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const report = body['csp-report'] ?? body;
    console.warn('[CSP Violation]', JSON.stringify(report));
  } catch {
    // Ignore parse errors from malformed reports
  }

  return new NextResponse(null, { status: 204 });
}
