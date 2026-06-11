import type { LogEntry } from './types.js';

class ProviderWebhooks {
  private handlers: Map<string, (payload: any) => Promise<void>> = new Map();
  private logs: LogEntry[] = [];

  on(event: string, handler: (payload: any) => Promise<void>) {
    this.handlers.set(event, handler);
  }

  async handle(event: string, payload: any): Promise<void> {
    const handler = this.handlers.get(event);
    if (handler) {
      try {
        await handler(payload);
        this.logs.push({
          timestamp: new Date().toISOString(),
          action: `webhook:${event}`,
          status: 'success',
          request: payload,
        });
      } catch (error: any) {
        this.logs.push({
          timestamp: new Date().toISOString(),
          action: `webhook:${event}`,
          status: 'error',
          request: payload,
          error: error.message,
        });
      }
    }
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }
}

export const webhooks = new ProviderWebhooks();
export default webhooks;
