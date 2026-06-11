export interface ConnectionStatus {
  connected: boolean;
  version: string;
  lastChecked: string;
  error?: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  latency: number;
  error?: string;
}

export interface LogEntry {
  timestamp: string;
  action: string;
  status: 'success' | 'error' | 'warning';
  request?: any;
  response?: any;
  error?: string;
}

export type ProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  version?: string;
  settings?: Record<string, any>;
};
