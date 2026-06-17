export const APP_NAME = 'Ozion Chat AI';
export const APP_DESCRIPTION = 'WhatsApp + CRM + IA - Plataforma completa para automatizar vendas e atendimento';

export const PLANS = {
  free: { name: 'Free', price: 0, contacts: 100, conversations: 50, flows: 1, agents: 1, numbers: 1 },
  starter: { name: 'Starter', price: 197, contacts: 1000, conversations: 500, flows: 5, agents: 3, numbers: 2 },
  pro: { name: 'Pro', price: 497, contacts: 10000, conversations: 5000, flows: -1, agents: 10, numbers: 5 },
  enterprise: { name: 'Enterprise', price: 997, contacts: -1, conversations: -1, flows: -1, agents: -1, numbers: -1 },
} as const;

export const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'gemini', name: 'Gemini', models: ['gemini-2.0-flash', 'gemini-1.5-pro'] },
  { id: 'claude', name: 'Claude', models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'] },
  { id: 'groq', name: 'Groq', models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'] },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
] as const;

export const VOICE_PROVIDERS = [
  { id: 'elevenlabs', name: 'ElevenLabs' },
  { id: 'openai', name: 'OpenAI Voice' },
  { id: 'cartesia', name: 'Cartesia' },
] as const;

export const INTEGRATION_TYPES = [
  { id: 'openai', name: 'OpenAI', category: 'ai', icon: 'Bot' },
  { id: 'gemini', name: 'Gemini', category: 'ai', icon: 'Bot' },
  { id: 'claude', name: 'Claude', category: 'ai', icon: 'Bot' },
  { id: 'deepseek', name: 'DeepSeek', category: 'ai', icon: 'Bot' },
  { id: 'groq', name: 'Groq', category: 'ai', icon: 'Bot' },
  { id: 'dify', name: 'Dify', category: 'ai', icon: 'Bot' },
  { id: 'elevenlabs', name: 'ElevenLabs', category: 'voice', icon: 'Mic' },
  { id: 'utmify', name: 'UTMify', category: 'automation', icon: 'Zap' },
  { id: 'kiwify', name: 'Kiwify', category: 'payment', icon: 'DollarSign' },
  { id: 'hotmart', name: 'Hotmart', category: 'payment', icon: 'DollarSign' },
  { id: 'perfectpay', name: 'Perfect Pay', category: 'payment', icon: 'DollarSign' },
  { id: 'asaas', name: 'Asaas', category: 'payment', icon: 'DollarSign' },
  { id: 'stripe', name: 'Stripe', category: 'payment', icon: 'DollarSign' },
  { id: 'mercadopago', name: 'Mercado Pago', category: 'payment', icon: 'DollarSign' },
  { id: 'make', name: 'Make', category: 'automation', icon: 'Zap' },
  { id: 'zapier', name: 'Zapier', category: 'automation', icon: 'Zap' },
  { id: 'n8n', name: 'N8N', category: 'automation', icon: 'Zap' },
] as const;
