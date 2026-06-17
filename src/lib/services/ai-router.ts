import { OpenAIService } from './openai';

export type AIMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type AIChatParams = {
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
  system?: string;
  model?: string;
};

export interface AIProvider {
  chat(params: AIChatParams): Promise<{ content: string; usage?: unknown; model: string }>;

  healthCheck(): Promise<{ status: string; latency: number }>;
}

export class GeminiService implements AIProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async chat(params: AIChatParams) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: params.messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          systemInstruction: params.system ? { parts: [{ text: params.system }] } : undefined,
          generationConfig: {
            temperature: params.temperature ?? 0.7,
            maxOutputTokens: params.max_tokens ?? 4096,
          },
        }),
      }
    );
    const data = await response.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      model: 'gemini-2.0-flash',
    };
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
      return { status: r.ok ? 'online' : 'error', latency: Date.now() - start };
    } catch { return { status: 'error', latency: Date.now() - start }; }
  }
}

export class ClaudeService implements AIProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async chat(params: AIChatParams) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: params.max_tokens ?? 4096,
        system: params.system,
        messages: params.messages.filter(m => m.role !== 'system'),
        temperature: params.temperature ?? 0.7,
      }),
    });
    const data = await response.json();
    return {
      content: data.content?.[0]?.text || '',
      model: data.model,
    };
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
      });
      return { status: r.ok || r.status === 400 ? 'online' : 'error', latency: Date.now() - start };
    } catch { return { status: 'error', latency: Date.now() - start }; }
  }
}

export class GroqService implements AIProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async chat(params: AIChatParams) {
    const messages = params.system
      ? [{ role: 'system', content: params.system }, ...params.messages]
      : params.messages;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: params.model || 'llama-3.3-70b-versatile', messages, temperature: params.temperature ?? 0.7, max_tokens: params.max_tokens ?? 4096 }),
    });
    const data = await response.json();
    return { content: data.choices?.[0]?.message?.content || '', model: data.model };
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
      return { status: r.ok ? 'online' : 'error', latency: Date.now() - start };
    } catch { return { status: 'error', latency: Date.now() - start }; }
  }
}

export class DeepSeekService implements AIProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async chat(params: AIChatParams) {
    const messages = params.system
      ? [{ role: 'system', content: params.system }, ...params.messages]
      : params.messages;
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: params.model || 'deepseek-chat', messages, temperature: params.temperature ?? 0.7, max_tokens: params.max_tokens ?? 4096 }),
    });
    const data = await response.json();
    return { content: data.choices?.[0]?.message?.content || '', model: data.model };
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const r = await fetch('https://api.deepseek.com/models', { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
      return { status: r.ok ? 'online' : 'error', latency: Date.now() - start };
    } catch { return { status: 'error', latency: Date.now() - start }; }
  }
}

export class DifyService implements AIProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async chat(params: AIChatParams) {
    const query = params.messages.at(-1)?.content || '';
    const response = await fetch('https://api.dify.ai/v1/chat-messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: 'blocking',
        conversation_id: '',
        user: 'ozion-chat-ai',
        files: [],
      }),
    });
    const data = await response.json();
    return {
      content: data.answer || data.message || '',
      model: 'dify',
    };
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const r = await fetch('https://api.dify.ai/v1/datasets', { headers: { Authorization: `Bearer ${this.apiKey}` } });
      return { status: r.ok ? 'online' : 'error', latency: Date.now() - start };
    } catch {
      return { status: 'error', latency: Date.now() - start };
    }
  }
}

export class OpenRouterService implements AIProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async chat(params: AIChatParams) {
    const messages = params.system
      ? [{ role: 'system', content: params.system }, ...params.messages]
      : params.messages;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://ozion.ai',
        'X-Title': 'Ozion IA',
      },
      body: JSON.stringify({
        model: params.model || 'deepseek/deepseek-chat-v3-0324',
        messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens ?? 4096,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `OpenRouter API Error: ${response.status}`);
    }
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage,
      model: data.model || params.model || 'openrouter',
    };
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return { status: r.ok ? 'online' : 'error', latency: Date.now() - start };
    } catch {
      return { status: 'error', latency: Date.now() - start };
    }
  }
}

export function createAIProvider(provider: string, apiKey: string): AIProvider {
  switch (provider) {
    case 'openai': return new OpenAIService(apiKey);
    case 'openrouter': return new OpenRouterService(apiKey);
    case 'gemini': return new GeminiService(apiKey);
    case 'claude': return new ClaudeService(apiKey);
    case 'groq': return new GroqService(apiKey);
    case 'deepseek': return new DeepSeekService(apiKey);
    case 'dify': return new DifyService(apiKey);
    default: throw new Error(`Unknown AI provider: ${provider}`);
  }
}
