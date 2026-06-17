export class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async chat(params: {
    model?: string;
    messages: { role: "user" | "assistant" | "system"; content: string }[];
    temperature?: number;
    max_tokens?: number;
    system?: string;
  }) {
    const messages = params.system
      ? [{ role: 'system', content: params.system }, ...params.messages]
      : params.messages;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: params.model || process.env.OPENAI_MODEL || 'gpt-4o',
        messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API Error: ${error.error?.message}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      model: data.model,
    };
  }

  async generateAgentResponse(agent: {
    prompt: string;
    rules: string[];
    knowledge_base: string[];
    objective: string;
  }, conversationHistory: { role: "user" | "assistant" | "system"; content: string }[], userMessage: string) {
    const systemPrompt = [
      agent.prompt,
      agent.objective ? `Objetivo: ${agent.objective}` : '',
      agent.rules.length > 0 ? `Regras:\n${agent.rules.map(r => `- ${r}`).join('\n')}` : '',
      agent.knowledge_base.length > 0 ? `Base de Conhecimento:\n${agent.knowledge_base.join('\n')}` : '',
    ].filter(Boolean).join('\n\n');

    return this.chat({
      system: systemPrompt,
      messages: [...conversationHistory, { role: 'user', content: userMessage }],
    });
  }

  async analyzeImage(imageUrl: string, prompt: string) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async transcribeAudio(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: formData,
    });

    const data = await response.json();
    return data.text;
  }

  async generateSpeech(text: string, voice: string = 'nova') {
    const response = await fetch(`${this.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: text,
        voice,
        response_format: 'mp3',
      }),
    });

    return response.blob();
  }

  async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders(),
      });
      return { status: response.ok ? 'online' : 'error', latency: Date.now() - start };
    } catch {
      return { status: 'error', latency: Date.now() - start };
    }
  }
}
