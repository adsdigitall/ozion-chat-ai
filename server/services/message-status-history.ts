import { getSupabase } from '../db/supabase.js';

export type StatusTransition =
  | 'received' | 'sent' | 'delivered' | 'read' | 'failed';

export async function recordStatusEvent(params: {
  messageId: string;
  tenantId: string;
  provider?: string;
  newStatus: StatusTransition;
  previousStatus?: string;
  errorMessage?: string;
  errorCode?: number;
  raw?: Record<string, unknown>;
  occurredAt?: string;
}): Promise<{ id?: string; error?: string }> {
  const sb = getSupabase();

  const { data, error } = await sb.from('message_status_events').insert({
    message_id: params.messageId,
    tenant_id: params.tenantId,
    provider: params.provider || null,
    previous_status: params.previousStatus || null,
    new_status: params.newStatus,
    error_message: params.errorMessage || null,
    error_code: params.errorCode ?? null,
    raw: params.raw ? JSON.stringify(params.raw) : '{}',
    occurred_at: params.occurredAt || new Date().toISOString(),
  }).select('id').single();

  if (error) return { error: error.message };
  return { id: data?.id };
}
