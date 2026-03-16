import { type calendar_v3 } from 'googleapis';
import {
  getCalendarClientForProvider,
  getGoogleCalendarConnectionByWatchToken,
  isGoogleCalendarOAuthConfigured,
  markGoogleCalendarSyncError,
  markGoogleCalendarSyncSuccess,
} from '@/services/google-calendar-connections';

// ── Types ──────────────────────────────────────────────────────

export interface CalendarAppointment {
  id: string;
  provider_id: string | null;
  start_time: string;
  end_time: string;
  patient_name: string | null;
  status: string;
  notes: string | null;
  google_calendar_event_id: string | null;
  provider?: {
    first_name: string;
    last_name: string;
  } | null;
  appointment_type?: {
    name: string;
    duration_minutes: number;
    color: string;
  } | null;
}

interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
  skipped?: boolean;
}

// ── Color mapping (Google Calendar uses colorId 1-11) ──────────

const COLOR_MAP: Record<string, string> = {
  '#4285F4': '1',  // Lavender → Blue
  '#34A853': '2',  // Sage → Green
  '#EA4335': '11', // Tomato → Red
  '#FBBC04': '5',  // Banana → Yellow
  '#FF6D01': '6',  // Tangerine → Orange
  '#A142F4': '3',  // Grape → Purple
  '#46BDC6': '7',  // Peacock → Cyan
  '#7CB342': '10', // Basil → Green
  '#E67C73': '4',  // Flamingo → Pink
};

function mapColor(hexColor: string | undefined): string | undefined {
  if (!hexColor) return undefined;
  return COLOR_MAP[hexColor.toUpperCase()] ?? '1';
}

// ── Build event body ───────────────────────────────────────────

function buildEvent(appt: CalendarAppointment): calendar_v3.Schema$Event {
  const providerName = appt.provider
    ? `Dr. ${appt.provider.first_name} ${appt.provider.last_name}`
    : 'TBD';
  const typeName = appt.appointment_type?.name ?? 'Appointment';

  return {
    summary: `${typeName} — ${appt.patient_name ?? 'Patient'}`,
    description: [
      `Provider: ${providerName}`,
      `Type: ${typeName}`,
      appt.notes ? `Notes: ${appt.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    start: {
      dateTime: appt.start_time,
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: appt.end_time,
      timeZone: 'America/New_York',
    },
    colorId: mapColor(appt.appointment_type?.color),
    status: appt.status === 'cancelled' ? 'cancelled' : 'confirmed',
  };
}

// ── Public API ─────────────────────────────────────────────────

export async function createCalendarEvent(
  appt: CalendarAppointment,
): Promise<SyncResult> {
  if (!appt.provider_id) {
    return { success: false, skipped: true, error: 'Appointment has no provider' };
  }

  const context = await getCalendarClientForProvider(appt.provider_id);
  if (!context) {
    return { success: false, skipped: true, error: 'Google Calendar not connected for provider' };
  }

  try {
    const event = buildEvent(appt);
    const res = await context.calendar.events.insert({
      calendarId: context.calendarId,
      requestBody: event,
    });

    const eventId = res.data.id ?? undefined;
    console.log(`[google-calendar] Created event ${eventId} for appointment ${appt.id}`);
    await markGoogleCalendarSyncSuccess(appt.provider_id);
    return { success: true, eventId: eventId };
  } catch (err) {
    console.error('[google-calendar] Create event error:', err);
    await markGoogleCalendarSyncError(appt.provider_id, String(err));
    return { success: false, error: String(err) };
  }
}

export async function updateCalendarEvent(
  appt: CalendarAppointment,
): Promise<SyncResult> {
  if (!appt.provider_id) {
    return { success: false, skipped: true, error: 'Appointment has no provider' };
  }

  const context = await getCalendarClientForProvider(appt.provider_id);
  if (!context) {
    return { success: false, skipped: true, error: 'Google Calendar not connected for provider' };
  }

  if (!appt.google_calendar_event_id) {
    return createCalendarEvent(appt);
  }

  try {
    const event = buildEvent(appt);
    await context.calendar.events.update({
      calendarId: context.calendarId,
      eventId: appt.google_calendar_event_id,
      requestBody: event,
    });

    console.log(
      `[google-calendar] Updated event ${appt.google_calendar_event_id} for appointment ${appt.id}`,
    );
    await markGoogleCalendarSyncSuccess(appt.provider_id);
    return { success: true, eventId: appt.google_calendar_event_id };
  } catch (err) {
    console.error('[google-calendar] Update event error:', err);
    await markGoogleCalendarSyncError(appt.provider_id, String(err));
    return { success: false, error: String(err) };
  }
}

export async function deleteCalendarEvent(
  providerId: string | null,
  googleEventId: string,
): Promise<SyncResult> {
  if (!providerId) {
    return { success: false, skipped: true, error: 'Appointment has no provider' };
  }

  const context = await getCalendarClientForProvider(providerId);
  if (!context) {
    return { success: false, skipped: true, error: 'Google Calendar not connected for provider' };
  }

  try {
    await context.calendar.events.delete({
      calendarId: context.calendarId,
      eventId: googleEventId,
    });

    console.log(`[google-calendar] Deleted event ${googleEventId}`);
    await markGoogleCalendarSyncSuccess(providerId);
    return { success: true, eventId: googleEventId };
  } catch (err) {
    console.error('[google-calendar] Delete event error:', err);
    await markGoogleCalendarSyncError(providerId, String(err));
    return { success: false, error: String(err) };
  }
}

export async function getWebhookCalendarContext(watchToken: string): Promise<{
  calendar: calendar_v3.Calendar;
  calendarId: string;
  providerId: string;
} | null> {
  const connection = await getGoogleCalendarConnectionByWatchToken(watchToken);
  if (!connection?.provider_id) {
    return null;
  }

  const context = await getCalendarClientForProvider(connection.provider_id);
  if (!context) {
    return null;
  }

  return {
    calendar: context.calendar,
    calendarId: context.calendarId,
    providerId: connection.provider_id,
  };
}

export { isGoogleCalendarOAuthConfigured as isGoogleCalendarConfigured };
