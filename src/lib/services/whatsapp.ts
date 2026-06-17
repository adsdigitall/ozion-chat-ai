export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  businessId: string;
  verifyToken: string;
  graphApiVersion?: string;
}

export interface SendMessageParams {
  to: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'template' | 'interactive';
  text?: { body: string; preview_url?: boolean };
  image?: { link: string; caption?: string };
  audio?: { link?: string; id?: string };
  document?: { link: string; caption?: string; filename?: string };
  video?: { link: string; caption?: string };
  template?: { name: string; language: { code: string }; components?: unknown[] };
  interactive?: Record<string, unknown>;
}

export class WhatsAppService {
  private baseUrl: string;
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
    this.baseUrl = `https://graph.facebook.com/${config.graphApiVersion || process.env.META_GRAPH_API_VERSION || "v23.0"}`;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async sendMessage(to: string, params: Omit<SendMessageParams, 'to'>) {
    const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/[^0-9]/g, ''),
        ...params,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async sendText(to: string, body: string) {
    return this.sendMessage(to, { type: 'text', text: { body } });
  }

  async sendImage(to: string, link: string, caption?: string) {
    return this.sendMessage(to, { type: 'image', image: { link, caption } });
  }

  async sendAudio(to: string, linkOrId: string, mode: 'link' | 'id' = 'link') {
    return this.sendMessage(to, {
      type: 'audio',
      audio: mode === 'id' ? { id: linkOrId } : { link: linkOrId },
    });
  }

  async sendVideo(to: string, link: string, caption?: string) {
    return this.sendMessage(to, { type: 'video', video: { link, caption } });
  }

  async sendDocument(to: string, link: string, caption?: string, filename?: string) {
    return this.sendMessage(to, { type: 'document', document: { link, caption, filename } });
  }

  async sendTemplate(to: string, templateName: string, languageCode: string = 'pt_BR', components?: unknown[]) {
    return this.sendMessage(to, {
      type: 'template',
      template: { name: templateName, language: { code: languageCode }, components },
    });
  }

  async markAsRead(messageId: string) {
    const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
    return response.json();
  }

  async getMessageStatus(messageId: string) {
    const response = await fetch(`${this.baseUrl}/${messageId}`, {
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async getMediaUrl(mediaId: string) {
    const response = await fetch(`${this.baseUrl}/${mediaId}`, {
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async downloadMedia(url: string) {
    const response = await fetch(url, { headers: this.getHeaders() });
    return response.blob();
  }

  async uploadMedia(file: Blob, mimeType: string, filename: string) {
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mimeType);
    formData.append('file', file, filename);

    const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.accessToken}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`WhatsApp media upload error: ${JSON.stringify(data)}`);
    }
    return data as { id: string };
  }

  async getBusinessProfile() {
    const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/whatsapp_business_profile`, {
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async getMessageTemplates(wabaId = this.config.wabaId) {
    if (!wabaId) throw new Error("WABA ID is required to list templates.");
    const response = await fetch(`${this.baseUrl}/${wabaId}/message_templates?fields=name,status,language,category,components`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`WhatsApp templates error: ${JSON.stringify(data)}`);
    }
    return data as { data?: Array<Record<string, unknown>> };
  }

  async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}`, {
        headers: this.getHeaders(),
      });
      const latency = Date.now() - start;
      return { status: response.ok ? 'online' : 'error', latency };
    } catch {
      return { status: 'error', latency: Date.now() - start };
    }
  }
}

export function parseWebhookMessage(body: unknown) {
  try {
    if (!body || typeof body !== "object") return null;
    const webhook = body as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<Record<string, unknown>>;
            statuses?: Array<Record<string, unknown>>;
            contacts?: Array<{ profile?: { name?: string } }>;
          };
        }>;
      }>;
    };
    const entry = webhook.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) return null;

    const messages = value.messages?.[0];
    const statuses = value.statuses?.[0];
    const contacts = value.contacts?.[0];

    if (messages) {
      return {
        type: 'message',
        messageId: String(messages.id ?? ""),
        from: String(messages.from ?? ""),
        timestamp: String(messages.timestamp ?? ""),
        contactName: contacts?.profile?.name,
        messageType: String(messages.type ?? "text"),
        content: extractMessageContent(messages),
        mediaId: extractMediaId(messages),
        context: messages.context,
        referral: messages.referral,
      };
    }

    if (statuses) {
      return {
        type: 'status',
        messageId: String(statuses.id ?? ""),
        status: String(statuses.status ?? ""),
        timestamp: String(statuses.timestamp ?? ""),
        recipientId: String(statuses.recipient_id ?? ""),
      };
    }

    return null;
  } catch {
    return null;
  }
}

function nestedRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function extractMessageContent(message: Record<string, unknown>) {
  const text = nestedRecord(message.text);
  const image = nestedRecord(message.image);
  const video = nestedRecord(message.video);
  const document = nestedRecord(message.document);
  return String(text.body ?? image.caption ?? video.caption ?? document.caption ?? "");
}

function extractMediaId(message: Record<string, unknown>) {
  for (const key of ["image", "video", "audio", "document"]) {
    const media = nestedRecord(message[key]);
    if (media.id) return String(media.id);
  }
  return undefined;
}
