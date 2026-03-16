import crypto from 'crypto';
import type { Credentials, OAuth2Client } from 'google-auth-library';
import { google, type calendar_v3 } from 'googleapis';
import { createAdminClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';

const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? '';
const DEFAULT_CALENDAR_ID = 'primary';

export interface CalendarConnectionState {
  connected: boolean;
  calendarAvailable: boolean;
  googleAccountEmail: string | null;
  calendarId: string | null;
  syncEnabled: boolean;
  connectedAt: string | null;
  disconnectedAt: string | null;
  lastError: string | null;
}

type GoogleCalendarConnectionRow = Database['public']['Tables']['google_calendar_connections']['Row'];

function getAdminClient() {
  return createAdminClient<Database>() as any;
}

export function isGoogleCalendarOAuthConfigured(): boolean {
  return Boolean(clientId && clientSecret && redirectUri);
}

export function createGoogleOAuthClient(): OAuth2Client {
  if (!isGoogleCalendarOAuthConfigured()) {
    throw new Error('Google Calendar OAuth is not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildGoogleCalendarAuthUrl(state: string): string {
  const oauth2 = createGoogleOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent',
    state,
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
}

export function createCalendarOAuthState(): string {
  return crypto.randomUUID();
}

export async function getGoogleCalendarConnection(
  providerId: string,
): Promise<GoogleCalendarConnectionRow | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('google_calendar_connections')
    .select('*')
    .eq('provider_id', providerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function getGoogleCalendarConnectionByWatchToken(
  watchToken: string,
): Promise<GoogleCalendarConnectionRow | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('google_calendar_connections')
    .select('*')
    .eq('watch_token', watchToken)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function getGoogleCalendarConnectionState(
  providerId: string,
): Promise<CalendarConnectionState> {
  const connection = await getGoogleCalendarConnection(providerId);

  return {
    connected: Boolean(connection?.sync_enabled && connection?.refresh_token && !connection?.disconnected_at),
    calendarAvailable: isGoogleCalendarOAuthConfigured(),
    googleAccountEmail: connection?.google_account_email ?? null,
    calendarId: connection?.calendar_id ?? null,
    syncEnabled: connection?.sync_enabled ?? false,
    connectedAt: connection?.connected_at ?? null,
    disconnectedAt: connection?.disconnected_at ?? null,
    lastError: connection?.last_error ?? null,
  };
}

async function fetchGoogleAccountEmail(oauth2: OAuth2Client): Promise<string | null> {
  try {
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
    const { data } = await oauth2Api.userinfo.get();
    return data.email ?? null;
  } catch {
    return null;
  }
}

export async function upsertGoogleCalendarConnection(params: {
  providerId: string;
  tokens: Credentials;
  calendarId?: string;
}) {
  const { providerId, tokens, calendarId = DEFAULT_CALENDAR_ID } = params;
  const admin = getAdminClient();
  const existing = await getGoogleCalendarConnection(providerId);
  const refreshToken = tokens.refresh_token ?? existing?.refresh_token ?? null;

  if (!refreshToken) {
    throw new Error('Google did not return a refresh token for this provider');
  }

  const oauth2 = createGoogleOAuthClient();
  oauth2.setCredentials({
    access_token: tokens.access_token ?? existing?.access_token ?? undefined,
    refresh_token: refreshToken,
  });

  const googleAccountEmail =
    (await fetchGoogleAccountEmail(oauth2)) ?? existing?.google_account_email ?? null;
  const now = new Date().toISOString();

  const payload = {
    provider_id: providerId,
    google_account_email: googleAccountEmail,
    calendar_id: calendarId,
    refresh_token: refreshToken,
    access_token: tokens.access_token ?? existing?.access_token ?? null,
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : existing?.token_expiry ?? null,
    scopes: tokens.scope ? tokens.scope.split(' ').filter(Boolean) : existing?.scopes ?? [],
    sync_enabled: true,
    connected_at: existing?.connected_at ?? now,
    disconnected_at: null,
    last_error: null,
    updated_at: now,
  };

  const { data, error } = await admin
    .from('google_calendar_connections')
    .upsert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as GoogleCalendarConnectionRow;
}

export async function markGoogleCalendarSyncSuccess(providerId: string) {
  const admin = getAdminClient();
  await admin
    .from('google_calendar_connections')
    .update({ last_error: null, last_sync_at: new Date().toISOString() })
    .eq('provider_id', providerId);
}

export async function markGoogleCalendarSyncError(providerId: string, errorMessage: string) {
  const admin = getAdminClient();
  await admin
    .from('google_calendar_connections')
    .update({ last_error: errorMessage })
    .eq('provider_id', providerId);
}

export async function getCalendarClientForProvider(providerId: string): Promise<{
  calendar: calendar_v3.Calendar;
  calendarId: string;
  connection: GoogleCalendarConnectionRow;
} | null> {
  if (!isGoogleCalendarOAuthConfigured()) {
    return null;
  }

  const connection = await getGoogleCalendarConnection(providerId);
  if (!connection?.sync_enabled || !connection.refresh_token || connection.disconnected_at) {
    return null;
  }

  const oauth2 = createGoogleOAuthClient();
  oauth2.setCredentials({
    access_token: connection.access_token ?? undefined,
    refresh_token: connection.refresh_token,
    expiry_date: connection.token_expiry ? new Date(connection.token_expiry).getTime() : undefined,
  });

  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2 }),
    calendarId: connection.calendar_id || DEFAULT_CALENDAR_ID,
    connection,
  };
}

export async function startCalendarWatch(params: {
  providerId: string;
  webhookUrl: string;
}) {
  const { providerId, webhookUrl } = params;
  const context = await getCalendarClientForProvider(providerId);
  if (!context) {
    return null;
  }

  const watchToken = crypto.randomUUID();
  const channelId = `dental-calendar-${providerId}-${Date.now()}`;

  const response = await context.calendar.events.watch({
    calendarId: context.calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: watchToken,
    },
  });

  const admin = getAdminClient();
  const { error } = await admin
    .from('google_calendar_connections')
    .update({
      watch_channel_id: channelId,
      watch_resource_id: response.data.resourceId ?? null,
      watch_expires_at: response.data.expiration
        ? new Date(Number(response.data.expiration)).toISOString()
        : null,
      watch_token: watchToken,
      last_error: null,
    })
    .eq('provider_id', providerId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    channelId,
    watchToken,
  };
}

export async function stopCalendarWatch(providerId: string) {
  const context = await getCalendarClientForProvider(providerId);
  const connection = await getGoogleCalendarConnection(providerId);

  if (!context || !connection?.watch_channel_id || !connection.watch_resource_id) {
    return;
  }

  try {
    await context.calendar.channels.stop({
      requestBody: {
        id: connection.watch_channel_id,
        resourceId: connection.watch_resource_id,
      },
    });
  } catch {
    // Best-effort cleanup only.
  }
}

export async function disconnectGoogleCalendarConnection(providerId: string) {
  const admin = getAdminClient();
  const connection = await getGoogleCalendarConnection(providerId);

  if (!connection) {
    return {
      disconnected: true,
    };
  }

  await stopCalendarWatch(providerId);

  if (isGoogleCalendarOAuthConfigured()) {
    const oauth2 = createGoogleOAuthClient();
    const tokenToRevoke = connection.refresh_token ?? connection.access_token ?? null;
    if (tokenToRevoke) {
      try {
        await oauth2.revokeToken(tokenToRevoke);
      } catch {
        // Best-effort revoke only.
      }
    }
  }

  const { error } = await admin
    .from('google_calendar_connections')
    .update({
      refresh_token: null,
      access_token: null,
      token_expiry: null,
      sync_enabled: false,
      disconnected_at: new Date().toISOString(),
      watch_channel_id: null,
      watch_resource_id: null,
      watch_expires_at: null,
      watch_token: null,
      last_error: null,
    })
    .eq('provider_id', providerId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    disconnected: true,
  };
}