// @ts-nocheck
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// In-memory store for webhook events
const store: Array<Record<string, unknown>> = [];
let idCounter = 0;

function eqFilter(records: Array<Record<string, unknown>>, field: string, value: unknown) {
  return records.filter(r => r[field] === value);
}

// Builder for chained .eq().eq().limit() calls
function selectBuilder(records: Array<Record<string, unknown>>) {
  return {
    eq: (field: string, value: unknown) => {
      const filtered = eqFilter(records, field, value);
      return selectBuilder(filtered);
    },
    limit: (_n: number) => Promise.resolve({ data: records.length > 0 ? records : null, error: null }),
  };
}

const mockSupabase = {
  from: mock.fn(() => ({
    insert: mock.fn((data: Record<string, unknown>) => {
      const id = `evt-${++idCounter}`;
      const record = { ...data, id };
      store.push(record);
      return {
        select: mock.fn(() => ({
          single: mock.fn(() => Promise.resolve({ data: record, error: null })),
        })),
      };
    }),
    select: mock.fn(() => selectBuilder([...store])),
    update: mock.fn((_updates: Record<string, unknown>) => ({
      eq: mock.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
};

mock.module('../server/db/supabase.js', {
  namedExports: {
    getSupabase: () => mockSupabase,
  },
});

const {
  createWebhookEvent,
  findExistingWebhookEvent,
  markWebhookEventProcessing,
  markWebhookEventProcessed,
  markWebhookEventFailed,
  hashRawBody,
  getWebhookEventIdempotencyKey,
} = await import('../server/services/webhook-events.js');

describe('Webhook Events — Idempotency', () => {

  it('should create a new webhook event', async () => {
    const result = await createWebhookEvent({
      tenantId: 'tenant-1',
      provider: 'meta',
      eventId: 'message:msg-001',
      eventType: 'message',
      payload: { text: 'hello' },
      signatureValid: true,
    });

    assert.equal(result.duplicate, false);
    assert.ok(result.event);
    assert.equal(result.event.status, 'received');
    assert.equal(result.event.tenant_id, 'tenant-1');
    assert.equal(result.event.provider, 'meta');
    assert.equal(result.event.event_id, 'message:msg-001');
    assert.equal(result.event.event_type, 'message');
  });

  it('should detect duplicate event by tenant + provider + event_id', async () => {
    const first = await createWebhookEvent({
      tenantId: 'tenant-2',
      provider: 'meta',
      eventId: 'message:dup-001',
      eventType: 'message',
      payload: { text: 'first' },
    });

    assert.equal(first.duplicate, false);

    const second = await createWebhookEvent({
      tenantId: 'tenant-2',
      provider: 'meta',
      eventId: 'message:dup-001',
      eventType: 'message',
      payload: { text: 'second attempt' },
    });

    assert.equal(second.duplicate, true);
    assert.equal(second.event.event_id, 'message:dup-001');
  });

  it('should not conflict between different providers with same event_id', async () => {
    const metaEvent = await createWebhookEvent({
      tenantId: 'tenant-3',
      provider: 'meta',
      eventId: 'message:id-001',
      eventType: 'message',
      payload: { text: 'meta' },
    });

    assert.equal(metaEvent.duplicate, false);

    const evolutionEvent = await createWebhookEvent({
      tenantId: 'tenant-3',
      provider: 'evolution',
      eventId: 'message:id-001',
      eventType: 'message',
      payload: { text: 'evolution' },
    });

    assert.equal(evolutionEvent.duplicate, false);
  });

  it('should not conflict between different tenants with same event_id', async () => {
    const tenantA = await createWebhookEvent({
      tenantId: 'tenant-a',
      provider: 'meta',
      eventId: 'message:shared-id',
      eventType: 'message',
      payload: { text: 'tenant A' },
    });

    assert.equal(tenantA.duplicate, false);

    const tenantB = await createWebhookEvent({
      tenantId: 'tenant-b',
      provider: 'meta',
      eventId: 'message:shared-id',
      eventType: 'message',
      payload: { text: 'tenant B' },
    });

    assert.equal(tenantB.duplicate, false);
  });

  it('should mark event as processed', async () => {
    const { event } = await createWebhookEvent({
      tenantId: 'tenant-4',
      provider: 'meta',
      eventId: 'message:process-test',
      eventType: 'message',
      payload: {},
    });
    await markWebhookEventProcessed(event.id);
    assert.ok(true, 'markProcessed did not throw');
  });

  it('should mark event as failed', async () => {
    const { event } = await createWebhookEvent({
      tenantId: 'tenant-5',
      provider: 'meta',
      eventId: 'message:fail-test',
      eventType: 'message',
      payload: {},
    });
    await markWebhookEventFailed(event.id, 'Something went wrong');
    assert.ok(true, 'markFailed did not throw');
  });

  it('should mark event as processing', async () => {
    const { event } = await createWebhookEvent({
      tenantId: 'tenant-6',
      provider: 'meta',
      eventId: 'message:processing-test',
      eventType: 'message',
      payload: {},
    });
    await markWebhookEventProcessing(event.id);
    assert.ok(true, 'markProcessing did not throw');
  });

});

describe('Webhook Events — Utilities', () => {

  it('hashRawBody should produce consistent SHA-256', () => {
    const hash = hashRawBody('{"test":"data"}');
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 64);
  });

  it('hashRawBody should produce different hash for different inputs', () => {
    const hash1 = hashRawBody('payload-1');
    const hash2 = hashRawBody('payload-2');
    assert.notEqual(hash1, hash2);
  });

  it('getWebhookEventIdempotencyKey should format correctly', () => {
    const key = getWebhookEventIdempotencyKey('meta', 'message', 'msg-001');
    assert.equal(key, 'meta:message:msg-001');
  });

});
