import Groq from 'groq';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

let client: Groq;

export function getGroqClient(): Groq {
  if (!client) {
    client = new Groq({ apiKey: GROQ_API_KEY });
  }
  return client;
}

export async function chatCompletion(messages: any[], options: any = {}) {
  const groq = getGroqClient();
  return groq.chat.completions.create({
    model: options.model || 'llama-3.3-70b-versatile',
    messages,
    temperature: options.temperature || 0.7,
    max_tokens: options.max_tokens || 1024,
  });
}

export async function testConnection() {
  try {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10,
    });
    return { success: true, model: response.model };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
