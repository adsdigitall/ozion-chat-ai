export type MessageType = 'text' | 'template' | 'audio' | 'image' | 'document' | 'button' | 'list';

export interface SendTextParams {
  to: string;
  text: string;
  previewUrl?: boolean;
}

export interface SendTemplateParams {
  to: string;
  templateName: string;
  langCode?: string;
  params?: string[];
}

export interface SendMediaParams {
  to: string;
  mediaUrl: string;
  caption?: string;
  type: 'audio' | 'image' | 'document';
  fileName?: string;
}

export interface SendButtonParams {
  to: string;
  text: string;
  buttons: Array<{ id: string; text: string }>;
}

export interface SendListParams {
  to: string;
  title: string;
  description: string;
  buttonText?: string;
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
}

export interface ProviderMessageResult {
  success: boolean;
  externalId?: string;
  error?: string;
  raw?: Record<string, unknown>;
}

export interface MessageProvider {
  readonly name: string;
  sendText(params: SendTextParams): Promise<ProviderMessageResult>;
  sendTemplate(params: SendTemplateParams): Promise<ProviderMessageResult>;
  sendMedia(params: SendMediaParams): Promise<ProviderMessageResult>;
  sendButton?(params: SendButtonParams): Promise<ProviderMessageResult>;
  sendList?(params: SendListParams): Promise<ProviderMessageResult>;
}
