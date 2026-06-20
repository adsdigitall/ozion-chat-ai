// @ts-nocheck
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Message Status History — Module Structure', () => {

  it('recordStatusEvent function signature is correct', async () => {
    // Test the function shape by parsing the source
    const fs = await import('fs');
    const source = fs.readFileSync(
      new URL('../server/services/message-status-history.ts', import.meta.url),
      'utf-8'
    );

    assert.ok(source.includes('export async function recordStatusEvent'));
    assert.ok(source.includes('newStatus: StatusTransition'));
    assert.ok(source.includes('previousStatus?: string'));
    assert.ok(source.includes('errorMessage?: string'));
    assert.ok(source.includes('getSupabase'));
    assert.ok(source.includes("from('message_status_events')"));
  });

  it('processStatusUpdate calls recordStatusEvent', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync(
      new URL('../server/services/webhook-handler.ts', import.meta.url),
      'utf-8'
    );

    assert.ok(source.includes('recordStatusEvent'));
    assert.ok(source.includes('previousStatus'));
    assert.ok(source.includes('failed_at'));
    assert.ok(source.includes('StatusTransition'));
  });

  it('normalizer modules export all expected functions', async () => {
    const fs = await import('fs');

    const meta = fs.readFileSync(
      new URL('../server/services/normalizers/meta-normalizer.ts', import.meta.url),
      'utf-8'
    );
    assert.ok(meta.includes('export function normalizeMetaMessage'));
    assert.ok(meta.includes('export function normalizeMetaStatusUpdate'));
    assert.ok(meta.includes('NormalizedStatusUpdate')); // after fix

    const evolution = fs.readFileSync(
      new URL('../server/services/normalizers/evolution-normalizer.ts', import.meta.url),
      'utf-8'
    );
    assert.ok(evolution.includes('export function normalizeEvolutionMessage'));
    assert.ok(evolution.includes('export function normalizeEvolutionStatusUpdate'));

    const index = fs.readFileSync(
      new URL('../server/services/normalizers/index.ts', import.meta.url),
      'utf-8'
    );
    assert.ok(index.includes('normalizeMetaMessage'));
    assert.ok(index.includes('normalizeEvolutionMessage'));
    assert.ok(index.includes('NormalizedMessage'));
    assert.ok(index.includes('NormalizedStatusUpdate'));
  });

  it('migration 007 creates correct structure', async () => {
    const fs = await import('fs');
    const migration = fs.readFileSync(
      new URL('../migrations/007_message_status_events.sql', import.meta.url),
      'utf-8'
    );

    assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS message_status_events'));
    assert.ok(migration.includes('previous_status TEXT'));
    assert.ok(migration.includes('new_status TEXT NOT NULL'));
    assert.ok(migration.includes('error_message TEXT'));
    assert.ok(migration.includes('occurred_at TIMESTAMPTZ'));
    assert.ok(migration.includes('ALTER TABLE messages ADD COLUMN IF NOT EXISTS failed_at TEXT'));
    assert.ok(migration.includes('tenant_id TEXT NOT NULL REFERENCES tenants(id)'));
  });

});
