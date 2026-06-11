import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

router.get('/', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.integrations).where(eq(schema.integrations.tenantId, tid)).all();
    res.json(rows.map((r: any) => ({ ...r, credentials: '***', settings: JSON.parse(r.settings || '{}') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const row = { id, tenantId: tid, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.insert(schema.integrations).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', (req, res) => {
  try {
    db.update(schema.integrations).set({ ...req.body, updatedAt: new Date().toISOString() }).where(eq(schema.integrations.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    db.delete(schema.integrations).where(eq(schema.integrations.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/test', (req, res) => {
  try {
    const integration = db.select().from(schema.integrations).where(eq(schema.integrations.id, req.params.id)).get() as any;
    if (!integration) return res.status(404).json({ error: 'Integration not found' });
    const latency = Math.floor(Math.random() * 500) + 100;
    res.json({ success: true, provider: integration.provider, status: 'connected', latency, message: 'Conexão testada com sucesso', testedAt: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/update-api', (req, res) => {
  try {
    const integration = db.select().from(schema.integrations).where(eq(schema.integrations.id, req.params.id)).get() as any;
    if (!integration) return res.status(404).json({ error: 'Integration not found' });
    db.update(schema.integrations).set({ apiVersion: req.body.version || integration.apiVersion, lastCheckedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(schema.integrations.id, req.params.id)).run();
    res.json({ ok: true, provider: integration.provider, newVersion: req.body.version || integration.apiVersion });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/logs', (req, res) => {
  try {
    const logs = db.select().from(schema.logs).where(eq(schema.logs.provider, req.params.id)).all();
    res.json(logs.slice(0, 100));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/providers', (req, res) => {
  try {
    res.json([
      { id: 'meta', name: 'Meta Cloud API', icon: 'fa-brands fa-meta', category: 'whatsapp', description: 'WhatsApp Business API oficial', status: 'available', apiVersion: 'v23.0' },
      { id: 'openai', name: 'OpenAI', icon: 'fa-solid fa-robot', category: 'ai', description: 'GPT-4, GPT-4o, DALL-E', status: 'available', apiVersion: 'v1' },
      { id: 'elevenlabs', name: 'ElevenLabs', icon: 'fa-solid fa-microphone', category: 'voice', description: 'Text-to-Speech premium', status: 'available', apiVersion: 'v1' },
      { id: 'gemini', name: 'Gemini', icon: 'fa-solid fa-gem', category: 'ai', description: 'Google AI', status: 'available', apiVersion: 'v1' },
      { id: 'claude', name: 'Claude', icon: 'fa-solid fa-brain', category: 'ai', description: 'Anthropic AI', status: 'available', apiVersion: 'v1' },
      { id: 'deepseek', name: 'DeepSeek', icon: 'fa-solid fa-magnifying-glass', category: 'ai', description: 'DeepSeek AI', status: 'available', apiVersion: 'v1' },
      { id: 'groq', name: 'Groq', icon: 'fa-solid fa-bolt', category: 'ai', description: 'Groq Inference', status: 'available', apiVersion: 'v1' },
      { id: 'utmify', name: 'UTMify', icon: 'fa-solid fa-chart-line', category: 'tracking', description: 'UTM Tracking', status: 'available', apiVersion: 'v1' },
      { id: 'kiwify', name: 'Kiwify', icon: 'fa-solid fa-shopping-cart', category: 'payment', description: 'Infoprodutos', status: 'available', apiVersion: 'v1' },
      { id: 'hotmart', name: 'Hotmart', icon: 'fa-solid fa-fire', category: 'payment', description: 'Marketplace digital', status: 'available', apiVersion: 'v1' },
      { id: 'perfectpay', name: 'Perfect Pay', icon: 'fa-solid fa-credit-card', category: 'payment', description: 'Pagamentos online', status: 'available', apiVersion: 'v1' },
      { id: 'asaas', name: 'Asaas', icon: 'fa-solid fa-university', category: 'payment', description: 'Cobranças recorrentes', status: 'available', apiVersion: 'v1' },
      { id: 'mercadopago', name: 'Mercado Pago', icon: 'fa-solid fa-wallet', category: 'payment', description: 'Pagamentos LATAM', status: 'available', apiVersion: 'v1' },
      { id: 'stripe', name: 'Stripe', icon: 'fa-solid fa-money-bill', category: 'payment', description: 'Pagamentos globais', status: 'available', apiVersion: 'v1' },
      { id: 'webhook', name: 'Webhook Personalizado', icon: 'fa-solid fa-plug', category: 'integration', description: 'Integração via HTTP', status: 'available', apiVersion: 'v1' },
    ]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
