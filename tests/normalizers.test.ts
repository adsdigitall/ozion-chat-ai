// @ts-nocheck
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { normalizeMetaMessage, normalizeMetaStatusUpdate } = await import('../server/services/normalizers/meta-normalizer.js');
const { normalizeEvolutionMessage } = await import('../server/services/normalizers/evolution-normalizer.js');

describe('Meta Normalizer', () => {

  it('should normalize a text message', () => {
    const msg = {
      from: '5511999999999',
      id: 'wamid.ABC123',
      timestamp: '1718000000',
      type: 'text',
      text: { body: 'Hello from Meta' },
    };
    const contact = { wa_id: '5511999999999', profile: { name: 'John Doe' } };

    const result = normalizeMetaMessage('tenant-1', msg, contact);

    assert.equal(result.provider, 'meta');
    assert.equal(result.externalMessageId, 'wamid.ABC123');
    assert.equal(result.direction, 'inbound');
    assert.equal(result.messageType, 'text');
    assert.equal(result.text, 'Hello from Meta');
    assert.equal(result.phone, '5511999999999');
    assert.equal(result.contactName, 'John Doe');
  });

  it('should normalize an image message', () => {
    const msg = {
      from: '5511888888888',
      id: 'wamid.IMG456',
      timestamp: '1718000100',
      type: 'image',
      image: { id: 'media-id-123', caption: 'Look at this' },
    };
    const contact = { wa_id: '5511888888888', profile: { name: 'Jane' } };

    const result = normalizeMetaMessage('tenant-1', msg, contact);

    assert.equal(result.messageType, 'image');
    assert.equal(result.mediaUrl, 'media-id-123');
    assert.equal(result.caption, 'Look at this');
  });

  it('should normalize an audio message', () => {
    const msg = {
      from: '5511777777777',
      id: 'wamid.AUD789',
      timestamp: '1718000200',
      type: 'audio',
      audio: { id: 'audio-id-456' },
    };

    const result = normalizeMetaMessage('tenant-2', msg, undefined);

    assert.equal(result.messageType, 'audio');
    assert.equal(result.mediaUrl, 'audio-id-456');
    assert.equal(result.phone, '5511777777777');
  });

  it('should normalize a button reply message', () => {
    const msg = {
      from: '5511666666666',
      id: 'wamid.BTN001',
      timestamp: '1718000300',
      type: 'interactive',
      interactive: { button_reply: { id: 'btn-1', title: 'Yes' } },
    };

    const result = normalizeMetaMessage('tenant-3', msg, undefined);

    assert.equal(result.messageType, 'button');
    assert.equal(result.text, JSON.stringify(msg.interactive));
  });

});

describe('Meta Status Normalizer', () => {

  it('should normalize a delivered status', () => {
    const status = {
      id: 'wamid.ABC123',
      status: 'delivered',
      timestamp: '1718000400',
    };

    const result = normalizeMetaStatusUpdate('tenant-1', status);

    assert.equal(result.provider, 'meta');
    assert.equal(result.externalMessageId, 'wamid.ABC123');
    assert.equal(result.status, 'delivered');
  });

  it('should normalize a failed status with error', () => {
    const status = {
      id: 'wamid.FAIL001',
      status: 'failed',
      timestamp: '1718000500',
      errors: [{ message: 'Message expired' }],
    };

    const result = normalizeMetaStatusUpdate('tenant-1', status);

    assert.equal(result.status, 'failed');
    assert.equal(result.errorMessage, 'Message expired');
  });

});

describe('Evolution Normalizer', () => {

  it('should normalize a text message from webhook payload', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'my-instance',
      data: {
        key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'evolution-msg-001' },
        pushName: 'Carlos',
        message: { conversation: 'Olá do Evolution!' },
        messageType: 'conversation',
        messageTimestamp: 1718000000,
      },
    };

    const result = normalizeEvolutionMessage('tenant-1', payload);

    assert.ok(result);
    assert.equal(result.provider, 'evolution');
    assert.equal(result.externalMessageId, 'evolution-msg-001');
    assert.equal(result.direction, 'inbound');
    assert.equal(result.messageType, 'text');
    assert.equal(result.text, 'Olá do Evolution!');
    assert.equal(result.phone, '5511999999999');
    assert.equal(result.contactName, 'Carlos');
  });

  it('should detect outbound direction', () => {
    const payload = {
      event: 'messages.upsert',
      instance: 'my-instance',
      data: {
        key: { remoteJid: '5511888888888@s.whatsapp.net', fromMe: true, id: 'evolution-msg-002' },
        pushName: 'Bot',
        message: { conversation: 'Auto reply' },
        messageType: 'conversation',
        messageTimestamp: 1718000100,
      },
    };

    const result = normalizeEvolutionMessage('tenant-2', payload);

    assert.ok(result);
    assert.equal(result.direction, 'outbound');
  });

});
