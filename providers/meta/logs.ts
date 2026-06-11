import type { LogEntry } from './types.js';

class ProviderLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  log(entry: Omit<LogEntry, 'timestamp'>) {
    this.logs.unshift({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  getLogs(filters?: { action?: string; status?: string; limit?: number }): LogEntry[] {
    let filtered = this.logs;
    if (filters?.action) filtered = filtered.filter(l => l.action.includes(filters.action!));
    if (filters?.status) filtered = filtered.filter(l => l.status === filters.status);
    if (filters?.limit) filtered = filtered.slice(0, filters.limit);
    return filtered;
  }

  clear() {
    this.logs = [];
  }
}

export const logger = new ProviderLogger();
export default logger;
