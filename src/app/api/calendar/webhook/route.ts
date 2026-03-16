import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/shared/api/supabase-server';
import { getWebhookCalendarContext } from '@/services/google-calendar-service';

export async function POST(request: NextRequest) {
  try {
    const watchToken = request.headers.get('x-goog-channel-token');
    if (!watchToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    const resourceState = request.headers.get('x-goog-resource-state');
    if (resourceState === 'sync') {
      return NextResponse.json({ ok: true });
    }

    const context = await getWebhookCalendarContext(watchToken);
    if (!context) {
      return NextResponse.json({ error: 'Unknown calendar watch token' }, { status: 404 });
    }

    const updatedMin = new Date(Date.now() - 5 * 60_000).toISOString();

    const { data: eventList } = await context.calendar.events.list({
      calendarId: context.calendarId,
      updatedMin,
      showDeleted: true,
      singleEvents: true,
      maxResults: 50,
    });

    if (!eventList.items || eventList.items.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const supabase = createAdminClient();
    let synced = 0;

    type SyncedAppointmentRow = {
      id: string;
      start_time: string;
      end_time: string;
      status: string;
    };

    for (const event of eventList.items) {
      if (!event.id) continue;

      // Find matching appointment by google_calendar_event_id
      const appointmentResult = await (supabase
        .from('appointments')
        .select('id, start_time, end_time, status')
        .eq('google_calendar_event_id', event.id)
        .eq('provider_id', context.providerId)
        .single() as unknown as Promise<{ data: SyncedAppointmentRow | null; error: { message: string } | null }>);

      const appointment = appointmentResult.data;

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
        await (supabase as any)
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
