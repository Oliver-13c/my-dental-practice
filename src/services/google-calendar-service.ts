/**
 * Google Calendar Sync Service
 *
 * Two-way sync between appointments and a Google Calendar.
 * - On appointment create/update/delete → push to Google Calendar
 * - Webhook endpoint receives changes from Google → updates local DB
 *
 * Requires:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 *   GOOGLE_REFRESH_TOKEN (obtained via one-time OAuth flow)
 *   GOOGLE_CALENDAR_ID (the calendar to sync with)
 */
import { google, calendar_v3 } from 'googleapis';

const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? '';
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN ?? '';
const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary';

const isConfigured = !!(clientId && clientSecret && refreshToken);

function getAuth() {
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

function getCalendar(): calendar_v3.Calendar | null {
  if (!isConfigured) {
    console.warn('[google-calendar] Not configured — skipping sync');
    return null;
  }
  return google.calendar({ version: 'v3', auth: getAuth() });
}

// ── Types ──────────────────────────────────────────────────────

export interface CalendarAppointment {
  id: string;
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
  const calendar = getCalendar();
  if (!calendar) return { success: false, error: 'Google Calendar not configured' };

  try {
    const event = buildEvent(appt);
    const res = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    const eventId = res.data.id ?? undefined;
    console.log(`[google-calendar] Created event ${eventId} for appointment ${appt.id}`);
    return { success: true, eventId: eventId };
  } catch (err) {
    console.error('[google-calendar] Create event error:', err);
    return { success: false, error: String(err) };
  }
}

export async function updateCalendarEvent(
  appt: CalendarAppointment,
): Promise<SyncResult> {
  const calendar = getCalendar();
  if (!calendar) return { success: false, error: 'Google Calendar not configured' };

  if (!appt.google_calendar_event_id) {
    // No existing event — create one instead
    return createCalendarEvent(appt);
  }

  try {
    const event = buildEvent(appt);
    await calendar.events.update({
      calendarId,
      eventId: appt.google_calendar_event_id,
      requestBody: event,
    });

    console.log(
      `[google-calendar] Updated event ${appt.google_calendar_event_id} for appointment ${appt.id}`,
    );
    return { success: true, eventId: appt.google_calendar_event_id };
  } catch (err) {
    console.error('[google-calendar] Update event error:', err);
    return { success: false, error: String(err) };
  }
}

export async function deleteCalendarEvent(
  googleEventId: string,
): Promise<SyncResult> {
  const calendar = getCalendar();
  if (!calendar) return { success: false, error: 'Google Calendar not configured' };

  try {
    await calendar.events.delete({
      calendarId,
      eventId: googleEventId,
    });

    console.log(`[google-calendar] Deleted event ${googleEventId}`);
    return { success: true, eventId: googleEventId };
  } catch (err) {
    console.error('[google-calendar] Delete event error:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Start a watch channel for push notifications from Google Calendar.
 * Google will POST to our webhook when events change.
 */
export async function startWatch(webhookUrl: string): Promise<SyncResult> {
  const calendar = getCalendar();
  if (!calendar) return { success: false, error: 'Google Calendar not configured' };

  try {
    const channelId = `dental-sync-${Date.now()}`;
    await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: process.env.GOOGLE_WEBHOOK_VERIFY_TOKEN ?? 'dental-practice',
      },
    });

    console.log(`[google-calendar] Watch channel created: ${channelId}`);
    return { success: true, eventId: channelId };
  } catch (err) {
    console.error('[google-calendar] Start watch error:', err);
    return { success: false, error: String(err) };
  }
}

export { isConfigured as isGoogleCalendarConfigured };
