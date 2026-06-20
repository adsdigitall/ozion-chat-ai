export type NormalizedMessageType =
  | 'text' | 'image' | 'audio' | 'document'
  | 'template' | 'button' | 'list'
  | 'system' | 'unknown';

export type NormalizedDirection = 'inbound' | 'outbound';

export type NormalizedStatusValue =
  | 'sent' | 'delivered' | 'read' | 'failed';

export interface NormalizedMessage {
  tenantId: string;
  provider: string;
  externalMessageId: string;
  direction: NormalizedDirection;
  messageType: NormalizedMessageType;
  text?: string;
  phone: string;
  contactName?: string;
  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  caption?: string;
  timestamp: number;
  raw: Record<string, unknown>;
}

export interface NormalizedStatusUpdate {
  tenantId: string;
  provider: string;
  externalMessageId: string;
  status: NormalizedStatusValue;
  errorMessage?: string;
  timestamp: number;
  raw: Record<string, unknown>;
}
