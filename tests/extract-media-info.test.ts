import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: any;
  audio?: any;
  document?: any;
  interactive?: any;
  context?: any;
  referral?: any;
}

function extractMediaInfo(message: WebhookMessage): {
  externalMediaId: string;
  mediaType: string;
  mimeType?: string;
  fileName?: string;
  caption?: string;
  duration?: number;
} | null {
  if (message.image?.id) {
    return { externalMediaId: message.image.id, mediaType: 'image', mimeType: message.image.mime_type, caption: message.image.caption };
  }
  if (message.audio?.id) {
    return { externalMediaId: message.audio.id, mediaType: 'audio', mimeType: message.audio.mime_type, duration: message.audio.seconds };
  }
  if (message.document?.id) {
    return { externalMediaId: message.document.id, mediaType: 'document', mimeType: message.document.mime_type, fileName: message.document.filename, caption: message.document.caption };
  }
  if (message.type === 'image' || message.type === 'audio' || message.type === 'document') {
    const msgAny = message as any;
    if (msgAny.id && typeof msgAny.id === 'string') {
      return { externalMediaId: msgAny.id, mediaType: message.type, fileName: msgAny.filename };
    }
  }
  return null;
}

describe('extractMediaInfo', () => {

  it('should extract image info', () => {
    const msg: WebhookMessage = {
      from: '5511999999999',
      id: 'wamid.001',
      timestamp: '1718000000',
      type: 'image',
      image: { id: 'media-img-1', mime_type: 'image/jpeg', caption: 'Foto do produto' },
    };
    const result = extractMediaInfo(msg);
    assert.deepEqual(result, {
      externalMediaId: 'media-img-1',
      mediaType: 'image',
      mimeType: 'image/jpeg',
      caption: 'Foto do produto',
    });
  });

  it('should extract audio info', () => {
    const msg: WebhookMessage = {
      from: '5511999999999',
      id: 'wamid.002',
      timestamp: '1718000001',
      type: 'audio',
      audio: { id: 'media-audio-1', mime_type: 'audio/ogg', seconds: 12 },
    };
    const result = extractMediaInfo(msg);
    assert.deepEqual(result, {
      externalMediaId: 'media-audio-1',
      mediaType: 'audio',
      mimeType: 'audio/ogg',
      duration: 12,
    });
  });

  it('should extract document info', () => {
    const msg: WebhookMessage = {
      from: '5511999999999',
      id: 'wamid.003',
      timestamp: '1718000002',
      type: 'document',
      document: { id: 'media-doc-1', mime_type: 'application/pdf', filename: 'contrato.pdf', caption: 'Contrato assinado' },
    };
    const result = extractMediaInfo(msg);
    assert.deepEqual(result, {
      externalMediaId: 'media-doc-1',
      mediaType: 'document',
      mimeType: 'application/pdf',
      fileName: 'contrato.pdf',
      caption: 'Contrato assinado',
    });
  });

  it('should return null for text message', () => {
    const msg: WebhookMessage = {
      from: '5511999999999',
      id: 'wamid.004',
      timestamp: '1718000003',
      type: 'text',
      text: { body: 'Hello' },
    };
    assert.equal(extractMediaInfo(msg), null);
  });

  it('should fallback to type-based detection when image/audio/document sub-object is absent', () => {
    const msg: WebhookMessage = {
      from: '5511999999999',
      id: 'media-fallback-1',
      timestamp: '1718000004',
      type: 'image',
    } as any;
    (msg as any).id = 'direct-media-id';
    (msg as any).filename = 'foto.jpg';

    const result = extractMediaInfo(msg);
    assert.deepEqual(result, {
      externalMediaId: 'direct-media-id',
      mediaType: 'image',
      fileName: 'foto.jpg',
    });
  });

});
