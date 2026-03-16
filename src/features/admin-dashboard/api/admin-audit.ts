import { createServerClient } from '@/shared/api/supabase-server';
import type { Database } from '@/shared/api/supabase-types';
import { getCurrentAdminProfile } from './admin-auth';

interface AuditLogRow {
  id: string;
  user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface LegacyAdminActionRow {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  admin_email: string;
  timestamp: string;
  ip_address: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
}

interface GetAdminAuditLogsOptions {
  limit: number;
  offset: number;
  action?: string | null;
}

export async function getAdminAuditLogs(options: GetAdminAuditLogsOptions) {
  const { profile, error: authError } = await getCurrentAdminProfile();

  if (!profile) {
    return { data: null, pagination: null, error: authError || 'Unauthorized' };
  }

  const supabase = createServerClient<Database>() as any;
  let query = supabase
    .from('audit_logs')
    .select('id, user_id, action, resource_type, resource_id, metadata, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false });

  if (options.action && options.action !== 'all') {
    query = query.eq('action', options.action);
  }

  const { data: logs, error, count } = await query.range(
    options.offset,
    options.offset + options.limit - 1,
  );

  let typedLogs: AuditLogRow[] = [];
  let totalCount = count || 0;

  if (error) {
    // Backward-compatibility fallback for environments still using admin_actions.
    const legacyResult = await fetchLegacyAdminActions(supabase, options);
    if (legacyResult.error) {
      return { data: null, pagination: null, error: legacyResult.error };
    }

    typedLogs = legacyResult.logs;
    totalCount = legacyResult.count;
  } else {
    typedLogs = (logs || []) as AuditLogRow[];
  }

  const adminIds = [...new Set(typedLogs.map((log) => log.user_id).filter(Boolean))] as string[];
  const emailMap: Record<string, string> = {};

  if (adminIds.length > 0) {
    const { data: staffProfiles, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, email')
      .in('id', adminIds);

    if (staffError) {
      return { data: null, pagination: null, error: staffError.message };
    }

    for (const staffProfile of staffProfiles || []) {
      emailMap[staffProfile.id] = staffProfile.email;
    }
  }

  const data: AdminAuditLog[] = typedLogs.map((log) => ({
    id: log.id,
    action: log.action,
    target_type: log.resource_type ?? 'system',
    target_id: log.resource_id,
    target_name: resolveTargetName(log),
    admin_email: emailMap[log.user_id] || 'Unknown',
    timestamp: log.created_at,
    ip_address: resolveIpAddress(log.metadata),
    changes: log.metadata,
    created_at: log.created_at,
  }));

  return {
    data,
    pagination: {
      offset: options.offset,
      limit: options.limit,
      total: totalCount,
    },
    error: null,
  };
}

function resolveTargetName(log: AuditLogRow): string {
  const metadata = log.metadata ?? {};
  const candidate =
    (typeof metadata.target_name === 'string' && metadata.target_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    (typeof metadata.email === 'string' && metadata.email) ||
    log.resource_id ||
    'Unknown';

  return candidate;
}

function resolveIpAddress(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) {
    return null;
  }

  const candidate = metadata.ip_address;
  return typeof candidate === 'string' ? candidate : null;
}

async function fetchLegacyAdminActions(
  supabase: any,
  options: GetAdminAuditLogsOptions,
): Promise<{ logs: AuditLogRow[]; count: number; error: string | null }> {
  let legacyQuery = supabase
    .from('admin_actions')
    .select('id, admin_id, action, target_type, target_id, target_name, changes, ip_address, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false });

  if (options.action && options.action !== 'all') {
    legacyQuery = legacyQuery.eq('action', options.action);
  }

  const { data, error, count } = await legacyQuery.range(
    options.offset,
    options.offset + options.limit - 1,
  );

  if (error) {
    return { logs: [], count: 0, error: error.message };
  }

  const legacyRows = (data || []) as LegacyAdminActionRow[];
  const logs: AuditLogRow[] = legacyRows
    .filter((row) => Boolean(row.admin_id))
    .map((row) => ({
      id: row.id,
      user_id: row.admin_id as string,
      action: row.action,
      resource_type: row.target_type,
      resource_id: row.target_id,
      metadata: {
        ...(row.changes ?? {}),
        target_name: row.target_name,
        ip_address: row.ip_address,
      },
      created_at: row.created_at,
    }));

  return {
    logs,
    count: count || 0,
    error: null,
  };
}