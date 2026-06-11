import { config, getConfig } from './config.js';
import type { ConnectionStatus, TestResult, LogEntry, ProviderConfig } from './types.js';

class ProviderClient {
  private apiKey: string | null = null;
  private config: typeof config;

  constructor() {
    this.config = getConfig();
  }

  async connect(credentials: ProviderConfig): Promise<ConnectionStatus> {
    this.apiKey = credentials.apiKey || null;
    return {
      connected: true,
      version: this.config.version,
      lastChecked: new Date().toISOString(),
    };
  }

  async disconnect(): Promise<void> {
    this.apiKey = null;
  }

  isConnected(): boolean {
    return this.apiKey !== null;
  }

  getConfig() {
    return this.config;
  }
}

export const client = new ProviderClient();
export default client;
