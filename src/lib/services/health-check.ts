export interface HealthStatus {
  service: string;
  status: 'online' | 'unstable' | 'error';
  latency?: number;
  last_check: string;
  details?: Record<string, unknown>;
}

export class HealthCheckService {
  private checks: Map<string, HealthStatus> = new Map();

  async checkWhatsApp(config: { accessToken: string; phoneNumberId: string }): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}`, {
        headers: { 'Authorization': `Bearer ${config.accessToken}` },
      });
      const latency = Date.now() - start;
      const status: HealthStatus = {
        service: 'Meta WhatsApp',
        status: response.ok ? 'online' : 'error',
        latency,
        last_check: new Date().toISOString(),
      };
      this.checks.set('whatsapp', status);
      return status;
    } catch {
      const status: HealthStatus = { service: 'Meta WhatsApp', status: 'error', latency: Date.now() - start, last_check: new Date().toISOString() };
      this.checks.set('whatsapp', status);
      return status;
    }
  }

  async checkOpenAI(apiKey: string): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const latency = Date.now() - start;
      const status: HealthStatus = { service: 'OpenAI', status: response.ok ? 'online' : 'error', latency, last_check: new Date().toISOString() };
      this.checks.set('openai', status);
      return status;
    } catch {
      const status: HealthStatus = { service: 'OpenAI', status: 'error', latency: Date.now() - start, last_check: new Date().toISOString() };
      this.checks.set('openai', status);
      return status;
    }
  }

  async checkElevenLabs(apiKey: string): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey },
      });
      const latency = Date.now() - start;
      const status: HealthStatus = { service: 'ElevenLabs', status: response.ok ? 'online' : 'error', latency, last_check: new Date().toISOString() };
      this.checks.set('elevenlabs', status);
      return status;
    } catch {
      const status: HealthStatus = { service: 'ElevenLabs', status: 'error', latency: Date.now() - start, last_check: new Date().toISOString() };
      this.checks.set('elevenlabs', status);
      return status;
    }
  }

  async checkGemini(apiKey: string): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const latency = Date.now() - start;
      const status: HealthStatus = { service: 'Gemini', status: response.ok ? 'online' : 'error', latency, last_check: new Date().toISOString() };
      this.checks.set('gemini', status);
      return status;
    } catch {
      const status: HealthStatus = { service: 'Gemini', status: 'error', latency: Date.now() - start, last_check: new Date().toISOString() };
      this.checks.set('gemini', status);
      return status;
    }
  }

  async checkClaude(apiKey: string): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
      });
      const latency = Date.now() - start;
      const status: HealthStatus = { service: 'Claude', status: response.ok || response.status === 400 ? 'online' : 'error', latency, last_check: new Date().toISOString() };
      this.checks.set('claude', status);
      return status;
    } catch {
      const status: HealthStatus = { service: 'Claude', status: 'error', latency: Date.now() - start, last_check: new Date().toISOString() };
      this.checks.set('claude', status);
      return status;
    }
  }

  async checkGroq(apiKey: string): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${apiKey}` } });
      const latency = Date.now() - start;
      const status: HealthStatus = { service: 'Groq', status: response.ok ? 'online' : 'error', latency, last_check: new Date().toISOString() };
      this.checks.set('groq', status);
      return status;
    } catch {
      const status: HealthStatus = { service: 'Groq', status: 'error', latency: Date.now() - start, last_check: new Date().toISOString() };
      this.checks.set('groq', status);
      return status;
    }
  }

  async checkSupabase(url: string, key: string): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await fetch(`${url}/rest/v1/`, { headers: { 'apikey': key } });
      const latency = Date.now() - start;
      const status: HealthStatus = { service: 'Supabase', status: response.ok ? 'online' : 'error', latency, last_check: new Date().toISOString() };
      this.checks.set('supabase', status);
      return status;
    } catch {
      const status: HealthStatus = { service: 'Supabase', status: 'error', latency: Date.now() - start, last_check: new Date().toISOString() };
      this.checks.set('supabase', status);
      return status;
    }
  }

  async runAllChecks(credentials: Record<string, string>): Promise<HealthStatus[]> {
    const checks: Promise<HealthStatus>[] = [];

    if (credentials.whatsappToken && credentials.whatsappPhoneId) {
      checks.push(this.checkWhatsApp({ accessToken: credentials.whatsappToken, phoneNumberId: credentials.whatsappPhoneId }));
    }
    if (credentials.openaiKey) checks.push(this.checkOpenAI(credentials.openaiKey));
    if (credentials.elevenlabsKey) checks.push(this.checkElevenLabs(credentials.elevenlabsKey));
    if (credentials.geminiKey) checks.push(this.checkGemini(credentials.geminiKey));
    if (credentials.claudeKey) checks.push(this.checkClaude(credentials.claudeKey));
    if (credentials.groqKey) checks.push(this.checkGroq(credentials.groqKey));
    if (credentials.supabaseUrl && credentials.supabaseKey) {
      checks.push(this.checkSupabase(credentials.supabaseUrl, credentials.supabaseKey));
    }

    return Promise.all(checks);
  }

  getLatestChecks(): HealthStatus[] {
    return Array.from(this.checks.values());
  }
}
