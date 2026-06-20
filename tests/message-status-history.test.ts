// @ts-nocheck
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

const store = [];
let idCounter = 0;

mock.module('../server/db/supabase.js', {
  namedExports: {
    getSupabase: () => ({
      from: () => ({
        insert: (data) => {
          const id = `sev-${++idCounter}`;
          store.push({ ...data, id });
          return {
            select: () => ({
              single: () => Promise.resolve({ data: { id }, error: null }),
            }),
          };
        },
      }),
    }),
  },
});

const { recordStatusEvent } = await import('../server/services/message-status-history.js');

describe('Message Status History', () => {

  it('should record a delivered status event', async () => {
    const result = await recordStatusEvent({
      messageId: 'msg-001',
      tenantId: 'tenant-1',
      provider: 'meta',
      newStatus: 'delivered',
      previousStatus: 'sent',
    });

    assert.ok(result.id);
    assert.equal(result.error, undefined);
  });

  it('should record a failed status event', async () => {
    const result = await recordStatusEvent({
      messageId: 'msg-002',
      tenantId: 'tenant-1',
      provider: 'meta',
      newStatus: 'failed',
      errorMessage: 'Opt-out',
    });

    assert.ok(result.id);
  });

});
