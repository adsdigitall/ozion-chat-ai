import * as EvolutionAPI from '../evolution-api.js';
import type {
  MessageProvider, SendTextParams, SendTemplateParams,
  SendMediaParams, SendButtonParams, SendListParams, ProviderMessageResult,
} from './types.js';

export class EvolutionMessageProvider implements MessageProvider {
  readonly name = 'evolution';

  private instanceName: string;

  constructor(instanceName: string) {
    this.instanceName = instanceName;
  }

  async sendText(params: SendTextParams): Promise<ProviderMessageResult> {
    try {
      const result = await EvolutionAPI.sendTextMessage(
        this.instanceName, params.to, params.text
      );
      return { success: true, raw: result as Record<string, unknown> };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async sendTemplate(_params: SendTemplateParams): Promise<ProviderMessageResult> {
    return { success: false, error: 'Templates not supported by Evolution API' };
  }

  async sendMedia(params: SendMediaParams): Promise<ProviderMessageResult> {
    try {
      let result: any;
      switch (params.type) {
        case 'audio':
          result = await EvolutionAPI.sendAudioMessage(this.instanceName, params.to, params.mediaUrl);
          break;
        case 'image':
          result = await EvolutionAPI.sendImageMessage(this.instanceName, params.to, params.mediaUrl, params.caption);
          break;
        case 'document':
          result = await EvolutionAPI.sendDocumentMessage(this.instanceName, params.to, params.mediaUrl, params.fileName || 'file');
          break;
      }
      return { success: true, raw: result as Record<string, unknown> };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async sendButton(params: SendButtonParams): Promise<ProviderMessageResult> {
    try {
      const result = await EvolutionAPI.sendButtonMessage(
        this.instanceName, params.to, params.text, params.buttons
      );
      return { success: true, raw: result as Record<string, unknown> };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async sendList(params: SendListParams): Promise<ProviderMessageResult> {
    try {
      const sections = params.sections.map(s => ({
        title: s.title,
        rows: s.rows.map(r => ({
          title: r.title,
          description: r.description || '',
          rowId: r.id,
        })),
      }));
      const result = await EvolutionAPI.sendListMessage(
        this.instanceName, params.to, params.title, params.description, sections
      );
      return { success: true, raw: result as Record<string, unknown> };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
