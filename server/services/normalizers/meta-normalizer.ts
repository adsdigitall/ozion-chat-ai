import type { NormalizedMessage, NormalizedMessageType, NormalizedStatusUpdate } from './types.js';

export function normalizeMetaMessage(
  tenantId: string,
  message: Record<string, any>,
  contact: Record<string, any> | undefined
): NormalizedMessage {
  const waId = contact?.wa_id || message.from || '';
  const messageType = inferMetaMessageType(message);

  let text: string | undefined;
  let mediaUrl: string | undefined;
  let caption: string | undefined;

  if (message.text?.body) {
    text = message.text.body;
  } else if (message.interactive) {
    text = JSON.stringify(message.interactive);
  } else if (message.image?.id) {
    mediaUrl = message.image.id; // Meta returns media ID, not URL
    caption = message.image.caption;
    text = caption;
  } else if (message.audio?.id) {
    mediaUrl = message.audio.id;
  } else if (message.document?.id) {
    mediaUrl = message.document.id;
    caption = message.document.caption;
    text = message.document.filename;
  }

  return {
    tenantId,
    provider: 'meta',
    externalMessageId: message.id || '',
    direction: 'inbound',
    messageType,
    text,
    phone: waId,
    contactName: contact?.profile?.name,
    mediaUrl,
    caption,
    timestamp: message.timestamp ? parseInt(message.timestamp) * 1000 : Date.now(),
    raw: { message, contact } as unknown as Record<string, unknown>,
  };
}

export function normalizeMetaStatusUpdate(
  tenantId: string,
  status: Record<string, any>
): NormalizedStatusUpdate {
  return {
    tenantId,
    provider: 'meta',
    externalMessageId: status.id || '',
    status: mapMetaStatus(status.status),
    errorMessage: status.errors?.[0]?.message,
    timestamp: status.timestamp ? parseInt(status.timestamp) * 1000 : Date.now(),
    raw: status as unknown as Record<string, unknown>,
  };
}

function inferMetaMessageType(message: Record<string, any>): NormalizedMessageType {
  if (message.text) return 'text';
  if (message.image) return 'image';
  if (message.audio) return 'audio';
  if (message.document) return 'document';
  if (message.interactive?.button_reply) return 'button';
  if (message.interactive?.list_reply) return 'list';
  if (message.template) return 'template';
  if (message.type === 'system') return 'system';
  if (message.type) return message.type as NormalizedMessageType;
  return 'unknown';
}

function mapMetaStatus(status: string): 'sent' | 'delivered' | 'read' | 'failed' {
  switch (status) {
    case 'sent': return 'sent';
    case 'delivered': return 'delivered';
    case 'read': return 'read';
    case 'failed': return 'failed';
    default: return 'failed';
  }
}
