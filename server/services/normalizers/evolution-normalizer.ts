import { parseWebhookEvent } from '../evolution-api.js';
import type { NormalizedMessage, NormalizedMessageType, NormalizedStatusUpdate } from './types.js';

export function normalizeEvolutionMessage(
  tenantId: string,
  body: any
): NormalizedMessage | null {
  const event = parseWebhookEvent(body);
  if (!event) return null;

  return {
    tenantId,
    provider: 'evolution',
    externalMessageId: event.messageId || '',
    direction: event.isFromMe ? 'outbound' : 'inbound',
    messageType: mapEvolutionType(event.type),
    text: event.type === 'text' ? event.content : undefined,
    phone: event.from || '',
    contactName: event.fromName,
    mediaUrl: event.mediaUrl,
    mimeType: event.mediaMimeType,
    timestamp: event.timestamp ? event.timestamp * 1000 : Date.now(),
    raw: event.raw as Record<string, unknown>,
  };
}

export function normalizeEvolutionStatusUpdate(
  tenantId: string,
  body: any
): NormalizedStatusUpdate | null {
  const event = parseWebhookEvent(body);
  if (!event) return null;

  const status = mapEvolutionStatus(body.data?.status);

  return {
    tenantId,
    provider: 'evolution',
    externalMessageId: event.messageId || '',
    status,
    timestamp: event.timestamp ? event.timestamp * 1000 : Date.now(),
    raw: body as Record<string, unknown>,
  };
}

function mapEvolutionType(type: string): NormalizedMessageType {
  switch (type) {
    case 'text': return 'text';
    case 'image': return 'image';
    case 'audio': return 'audio';
    case 'document': return 'document';
    case 'button': return 'button';
    case 'list': return 'list';
    default: return 'unknown';
  }
}

function mapEvolutionStatus(status: string | undefined): 'sent' | 'delivered' | 'read' | 'failed' {
  switch (status) {
    case 'sent': return 'sent';
    case 'delivered': return 'delivered';
    case 'read': return 'read';
    case 'failed': return 'failed';
    default: return 'sent';
  }
}
