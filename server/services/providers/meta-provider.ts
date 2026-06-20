import { decrypt } from '../../lib/encryption.js';
import * as MetaAPI from '../meta-api.js';
import type {
  MessageProvider, SendTextParams, SendTemplateParams,
  SendMediaParams, SendButtonParams, SendListParams, ProviderMessageResult,
} from './types.js';

export class MetaMessageProvider implements MessageProvider {
  readonly name = 'meta';

  private phoneNumberId: string;
  private accessToken: string;

  constructor(phoneNumberId: string, encryptedToken: string) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = decrypt(encryptedToken);
  }

  async sendText(params: SendTextParams): Promise<ProviderMessageResult> {
    try {
      const result = await MetaAPI.sendTextMessage(
        this.phoneNumberId, this.accessToken, params.to, params.text
      );
      return { success: true, externalId: result.messages?.[0]?.id, raw: result as Record<string, unknown> };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async sendTemplate(params: SendTemplateParams): Promise<ProviderMessageResult> {
    try {
      const result = await MetaAPI.sendTemplateMessage(
        this.phoneNumberId, this.accessToken,
        params.to, params.templateName, params.langCode, params.params
      );
      return { success: true, externalId: result.messages?.[0]?.id, raw: result as Record<string, unknown> };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async sendMedia(params: SendMediaParams): Promise<ProviderMessageResult> {
    try {
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: params.type,
        [params.type]: {
          link: params.mediaUrl,
          ...(params.caption && { caption: params.caption }),
          ...(params.fileName && { filename: params.fileName }),
        },
      };
      const result = await MetaAPI.sendWhatsAppMessage(
        this.phoneNumberId, this.accessToken, payload as any
      );
      return { success: true, externalId: result.messages?.[0]?.id, raw: result as Record<string, unknown> };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async sendButton(params: SendButtonParams): Promise<ProviderMessageResult> {
    try {
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: params.text },
          action: {
            buttons: params.buttons.map((b, i) => ({
              type: 'reply',
              reply: { id: b.id, title: b.text.substring(0, 20) },
            })),
          },
        },
      };
      const result = await MetaAPI.sendWhatsAppMessage(
        this.phoneNumberId, this.accessToken, payload as any
      );
      return { success: true, externalId: result.messages?.[0]?.id, raw: result as Record<string, unknown> };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async sendList(params: SendListParams): Promise<ProviderMessageResult> {
    try {
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: params.description },
          ...(params.title && { header: { type: 'text', text: params.title } }),
          action: {
            button: params.buttonText || 'Ver opções',
            sections: params.sections.map(s => ({
              title: s.title,
              rows: s.rows.map(r => ({
                id: r.id,
                title: r.title.substring(0, 24),
                ...(r.description && { description: r.description.substring(0, 72) }),
              })),
            })),
          },
        },
      };
      const result = await MetaAPI.sendWhatsAppMessage(
        this.phoneNumberId, this.accessToken, payload as any
      );
      return { success: true, externalId: result.messages?.[0]?.id, raw: result as Record<string, unknown> };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
