import { getSupabase } from '../db/supabase.js';

export type ContactEventType =
  | 'opt_in' | 'opt_out' | 'block' | 'unblock'
  | 'profile_updated' | 'phone_updated' | 'name_updated'
  | 'tag_added' | 'tag_removed'
  | 'custom_field_updated'
  | 'first_message' | 'returned_after_inactivity';

export async function recordContactEvent(params: {
  tenantId: string;
  contactId?: string;
  conversationId?: string;
  provider?: string;
  eventType: ContactEventType;
  source?: string;
  payload?: Record<string, unknown>;
  occurredAt?: string;
}): Promise<{ id?: string; error?: string }> {
  const sb = getSupabase();

  const { data, error } = await sb.from('contact_events').insert({
    tenant_id: params.tenantId,
    contact_id: params.contactId || null,
    conversation_id: params.conversationId || null,
    provider: params.provider || 'meta',
    event_type: params.eventType,
    source: params.source || null,
    payload: params.payload || {},
    occurred_at: params.occurredAt || new Date().toISOString(),
  }).select('id').single();

  if (error) return { error: error.message };
  return { id: data?.id };
}

export async function getContactEvents(
  tenantId: string,
  options?: {
    contactId?: string;
    eventType?: string;
    limit?: number;
  }
) {
  const sb = getSupabase();
  let query = sb.from('contact_events')
    .select('*')
    .eq('tenant_id', tenantId);

  if (options?.contactId) {
    query = query.eq('contact_id', options.contactId);
  }
  if (options?.eventType) {
    query = query.eq('event_type', options.eventType);
  }

  const { data } = await query
    .order('occurred_at', { ascending: false })
    .limit(options?.limit || 50);

  return data || [];
}

export async function hasContactEvent(
  tenantId: string,
  contactId: string,
  eventType: ContactEventType
): Promise<boolean> {
  const sb = getSupabase();
  const { data } = await sb.from('contact_events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .eq('event_type', eventType)
    .limit(1);

  return (data?.length || 0) > 0;
}
