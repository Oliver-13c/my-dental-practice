/**
 * POST /api/calendar/webhook
 *
 * Receives push notifications from Google Calendar when events change.
 * Syncs changes back to the local appointments table.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? '';
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN ?? '';
const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Verify the webhook token
    const token = request.headers.get('x-goog-channel-token');
    const expectedToken = process.env.GOOGLE_WEBHOOK_VERIFY_TOKEN ?? 'dental-practice';

    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Google sends a sync message first — acknowledge it
    const resourceState = request.headers.get('x-goog-resource-state');
    if (resourceState === 'sync') {
      return NextResponse.json({ ok: true });
    }

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 500 });
    }

    // Fetch recent changes from Google Calendar
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2 });

    // Get events updated in the last 5 minutes
    const updatedMin = new Date(Date.now() - 5 * 60_000).toISOString();

    const { data: eventList } = await calendar.events.list({
      calendarId,
      updatedMin,
      showDeleted: true,
      singleEvents: true,
      maxResults: 50,
    });

    if (!eventList.items || eventList.items.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let synced = 0;

    for (const event of eventList.items) {
      if (!event.id) continue;

      // Find matching appointment by google_calendar_event_id
      const { data: appointment } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, status')
        .eq('google_calendar_event_id', event.id)
        .single();

      if (!appointment) continue; // Not a synced appointment

      const updates: Record<string, unknown> = {};

      // Sync time changes
      if (event.start?.dateTime && event.start.dateTime !== appointment.start_time) {
        updates.start_time = event.start.dateTime;
      }
      if (event.end?.dateTime && event.end.dateTime !== appointment.end_time) {
        updates.end_time = event.end.dateTime;
      }

      // Sync cancellations
      if (event.status === 'cancelled' && appointment.status !== 'cancelled') {
        updates.status = 'cancelled';
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('appointments')
          .update(updates)
          .eq('id', appointment.id);

        synced++;
        console.log(`[calendar/webhook] Synced appointment ${appointment.id}:`, updates);
      }
    }

    return NextResponse.json({ synced });
  } catch (err) {
    console.error('[calendar/webhook] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
