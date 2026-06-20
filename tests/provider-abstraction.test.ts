// @ts-nocheck
import { describe, it, mock, before } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Shared mutable state that tests can override per-scenario.
// These are closed over by the mock.module factories below.
// ---------------------------------------------------------------------------
let mockCredentials = null;
let metaSendTextImpl = (...args) => Promise.resolve({ messages: [] });
let evoSendTextImpl = (...args) => Promise.resolve({ ok: true });

// ---------------------------------------------------------------------------
// ESM module mocks – must be called at top level (before any dynamic import
// of the modules they replace).  mock.module hooks into Node's loader so
// these override the real modules everywhere they are imported.
// ---------------------------------------------------------------------------
mock.module('../server/lib/encryption.js', {
  namedExports: {
    decrypt: () => 'decrypted-token',
  },
});

mock.module('../server/db/supabase.js', {
  namedExports: {
    getSupabase: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: mockCredentials, error: null }),
            }),
          }),
        }),
      }),
    }),
  },
});

mock.module('../server/services/meta-api.js', {
  namedExports: {
    sendTextMessage: (...args) => metaSendTextImpl(...args),
  },
});

mock.module('../server/services/evolution-api.js', {
  namedExports: {
    sendTextMessage: (...args) => evoSendTextImpl(...args),
  },
});

// ---------------------------------------------------------------------------
// Dynamic imports after mocks are registered
// ---------------------------------------------------------------------------
let getProviderForTenant;
let sendByProvider;
let MetaMessageProvider;
let EvolutionMessageProvider;

before(async () => {
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_ANON_KEY = 'test-key';
  process.env.ENCRYPTION_KEY = 'test-encryption-key';

  const prov = await import('../server/services/providers/index.js');
  getProviderForTenant = prov.getProviderForTenant;
  sendByProvider = prov.sendByProvider;

  const meta = await import('../server/services/providers/meta-provider.js');
  MetaMessageProvider = meta.MetaMessageProvider;

  const evo = await import('../server/services/providers/evolution-provider.js');
  EvolutionMessageProvider = evo.EvolutionMessageProvider;
});

// ---------------------------------------------------------------------------
// Provider Factory
// ---------------------------------------------------------------------------
describe('Provider Factory', () => {
  it('should return MetaMessageProvider for meta credentials', async () => {
    mockCredentials = {
      provider: 'meta',
      phone_number_id: '123',
      access_token_encrypted: 'abc',
    };

    const result = await getProviderForTenant('tenant-meta');

    assert.ok(result.provider);
    assert.equal(result.provider.name, 'meta');
    assert.ok(result.provider instanceof MetaMessageProvider);
    assert.equal(result.error, undefined);
  });

  it('should return EvolutionMessageProvider for evolution credentials', async () => {
    mockCredentials = {
      provider: 'evolution',
      instance_name: 'my-instance',
    };

    const result = await getProviderForTenant('tenant-evo');

    assert.ok(result.provider);
    assert.equal(result.provider.name, 'evolution');
    assert.ok(result.provider instanceof EvolutionMessageProvider);
    assert.equal(result.error, undefined);
  });

  it('should return error for missing credentials', async () => {
    mockCredentials = null;

    const result = await getProviderForTenant('tenant-none');

    assert.equal(result.provider, null);
    assert.ok(result.error);
    assert.ok(result.error.includes('No credentials found'));
  });

  it('should return error for unknown provider type', async () => {
    mockCredentials = {
      provider: 'twilio',
    };

    const result = await getProviderForTenant('tenant-unknown');

    assert.equal(result.provider, null);
    assert.ok(result.error);
    assert.ok(result.error.includes('Unknown provider type'));
  });
});

// ---------------------------------------------------------------------------
// MetaMessageProvider.sendText
// ---------------------------------------------------------------------------
describe('MetaMessageProvider.sendText', () => {
  it('should call sendTextMessage with correct params and return success', async () => {
    let callArgs = null;
    metaSendTextImpl = (...args) => {
      callArgs = args;
      return Promise.resolve({ messages: [{ id: 'wamid.abc123' }] });
    };

    const provider = new MetaMessageProvider('phone-555', 'encrypted');
    const result = await provider.sendText({ to: '5511912345678', text: 'Hello from test' });

    assert.ok(result.success);
    assert.equal(result.externalId, 'wamid.abc123');
    assert.equal(callArgs[0], 'phone-555');
    assert.equal(callArgs[1], 'decrypted-token');
    assert.equal(callArgs[2], '5511912345678');
    assert.equal(callArgs[3], 'Hello from test');
  });
});

// ---------------------------------------------------------------------------
// EvolutionMessageProvider.sendText
// ---------------------------------------------------------------------------
describe('EvolutionMessageProvider.sendText', () => {
  it('should call sendTextMessage with correct params and return success', async () => {
    let callArgs = null;
    evoSendTextImpl = (...args) => {
      callArgs = args;
      return Promise.resolve({ ok: true, key: { id: 'evo.msg.789' } });
    };

    const provider = new EvolutionMessageProvider('evo-instance');
    const result = await provider.sendText({ to: '5511987654321', text: 'Evo test' });

    assert.ok(result.success);
    assert.equal(callArgs[0], 'evo-instance');
    assert.equal(callArgs[1], '5511987654321');
    assert.equal(callArgs[2], 'Evo test');
  });
});

// ---------------------------------------------------------------------------
// sendByProvider convenience
// ---------------------------------------------------------------------------
describe('sendByProvider', () => {
  it('should delegate to provider send function', async () => {
    mockCredentials = {
      provider: 'meta',
      phone_number_id: '123',
      access_token_encrypted: 'abc',
    };
    metaSendTextImpl = (...args) => Promise.resolve({
      messages: [{ id: 'wamid.sendby.1' }],
    });

    const result = await sendByProvider('tenant-send', (p) =>
      p.sendText({ to: '5511999999999', text: 'via sendByProvider' })
    );

    assert.ok(result.success);
    assert.equal(result.externalId, 'wamid.sendby.1');
  });

  it('should return error when no provider found', async () => {
    mockCredentials = null;
    metaSendTextImpl = () => Promise.resolve({ messages: [{ id: 'nope' }] });

    const result = await sendByProvider('tenant-missing', (p) =>
      p.sendText({ to: '5511999999999', text: 'Hi' })
    );

    assert.equal(result.success, false);
    assert.ok(result.error);
  });
});
