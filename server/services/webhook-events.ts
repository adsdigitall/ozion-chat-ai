import crypto from 'crypto';
import { getSupabase } from '../db/supabase.js';

export type WebhookEventStatus = 'received' | 'processing' | 'processed' | 'failed' | 'ignored' | 'duplicate';

export interface WebhookEventRow {
  id: string;
  tenant_id: string;
  provider: string;
  event_id: string;
  event_type: string;
  payload: unknown;
  raw_body_hash?: string;
  signature_valid?: boolean;
  status: WebhookEventStatus;
  attempts: number;
  error_message?: string;
  received_at: string;
  processed_at?: string;
  failed_at?: string;
}

export function getWebhookEventIdempotencyKey(
  provider: string,
  eventType: string,
  providerEventId: string
): string {
  return `${provider}:${eventType}:${providerEventId}`;
}

export function hashRawBody(rawBody: string): string {
  return crypto.createHash('sha256').update(rawBody).digest('hex');
}

export async function createWebhookEvent(params: {
  tenantId: string;
  provider: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  rawBodyHash?: string;
  signatureValid?: boolean;
}): Promise<{ event: WebhookEventRow | null; duplicate: boolean; error?: string }> {
  const sb = getSupabase();

  const existing = await findExistingWebhookEvent(params.tenantId, params.provider, params.eventId);
  if (existing) {
    if (existing.status !== 'duplicate') {
      await sb.from('webhook_events')
        .update({ status: 'duplicate', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      existing.status = 'duplicate';
    }
    return { event: existing, duplicate: true };
  }

  const { data, error } = await sb.from('webhook_events').insert({
    tenant_id: params.tenantId,
    provider: params.provider,
    event_id: params.eventId,
    event_type: params.eventType,
    payload: JSON.stringify(params.payload),
    raw_body_hash: params.rawBodyHash || null,
    signature_valid: params.signatureValid ?? null,
    status: 'received',
    attempts: 1,
    received_at: new Date().toISOString(),
  }).select('*').single();

  if (error) {
    if (error.message?.includes('unique') || error.code === '23505') {
      const existingAfterRace = await findExistingWebhookEvent(params.tenantId, params.provider, params.eventId);
      if (existingAfterRace) {
        return { event: existingAfterRace, duplicate: true };
      }
    }
    return { event: null, duplicate: false, error: error.message };
  }

  return { event: data as unknown as WebhookEventRow, duplicate: false };
}

export async function findExistingWebhookEvent(
  tenantId: string,
  provider: string,
  eventId: string
): Promise<WebhookEventRow | null> {
  const sb = getSupabase();
  const { data } = await sb.from('webhook_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('event_id', eventId)
    .limit(1);

  return (data?.[0] as unknown as WebhookEventRow) || null;
}

async function updateWebhookEvent(
  eventId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const sb = getSupabase();
  await sb.from('webhook_events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', eventId);
}

export async function markWebhookEventProcessing(eventId: string): Promise<void> {
  await updateWebhookEvent(eventId, { status: 'processing' });
}

export async function markWebhookEventProcessed(eventId: string): Promise<void> {
  await updateWebhookEvent(eventId, {
    status: 'processed',
    processed_at: new Date().toISOString(),
  });
}

export async function markWebhookEventFailed(
  eventId: string,
  errorMessage: string
): Promise<void> {
  await updateWebhookEvent(eventId, {
    status: 'failed',
    failed_at: new Date().toISOString(),
    error_message: errorMessage,
  });
}

export async function markWebhookEventIgnored(eventId: string, reason?: string): Promise<void> {
  await updateWebhookEvent(eventId, {
    status: 'ignored',
    error_message: reason || null,
  });
}
