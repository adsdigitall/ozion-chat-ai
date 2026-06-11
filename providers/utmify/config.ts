export const config = {
  name: 'UTMify',
  baseUrl: 'https://api.example.com/v1',
  version: '1.0.0',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  retryAttempts: 3,
};

export function getConfig(tenantId?: string) {
  return { ...config, tenantId };
}
