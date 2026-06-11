import { client } from './client.js';
import type { TestResult } from './types.js';

export async function testConnection(apiKey?: string): Promise<TestResult> {
  const start = Date.now();
  try {
    if (apiKey) {
      await client.connect({ apiKey });
    }
    const latency = Date.now() - start;
    return {
      success: true,
      message: 'Conexão realizada com sucesso',
      latency,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Falha na conexão',
      latency: Date.now() - start,
      error: error.message,
    };
  }
}
