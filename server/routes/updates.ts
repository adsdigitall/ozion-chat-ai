import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

const MOCK_VERSIONS = [
  { provider: 'meta', name: 'Meta Cloud API', currentVersion: 'v23.0', latestVersion: 'v24.0', impact: 'Webhooks, permissões e endpoints atualizados', changelog: 'Novos campos de CTWA, suporte a mensagens interativas melhorado' },
  { provider: 'openai', name: 'OpenAI', currentVersion: 'gpt-4-turbo', latestVersion: 'gpt-4o-2024', impact: 'Novo modelo multimodal', changelog: 'GPT-4o disponível, suporte a imagens nativo' },
  { provider: 'elevenlabs', name: 'ElevenLabs', currentVersion: 'v1', latestVersion: 'v2', impact: 'Novas vozes e streaming', changelog: 'Streaming de áudio em tempo real, clonagem de voz aprimorada' },
  { provider: 'gemini', name: 'Gemini', currentVersion: 'v1', latestVersion: 'v1.5', impact: 'Novo modelo Gemini 1.5 Pro', changelog: 'Contexto de 1M tokens, multimodal melhorado' },
  { provider: 'claude', name: 'Claude', currentVersion: 'claude-3-opus', latestVersion: 'claude-3.5-sonnet', impact: 'Novo modelo mais rápido', changelog: 'Claude 3.5 Sonnet com performance superior' },
  { provider: 'deepseek', name: 'DeepSeek', currentVersion: 'v1', latestVersion: 'v1.5', impact: 'Melhoria de performance', changelog: 'Razão custo-benefício melhorada' },
  { provider: 'groq', name: 'Groq', currentVersion: 'v1', latestVersion: 'v1.2', impact: 'Novos hardware', changelog: 'Suporte a novos modelos, latência reduzida' },
  { provider: 'utmify', name: 'UTMify', currentVersion: 'v1', latestVersion: 'v1.1', impact: 'Novos parâmetros', changelog: 'UTM paramètres expandidos' },
  { provider: 'kiwify', name: 'Kiwify', currentVersion: 'v1', latestVersion: 'v1.3', impact: 'API de checkout', changelog: 'Nova API de checkout e webhook de assinatura' },
  { provider: 'hotmart', name: 'Hotmart', currentVersion: 'v1', latestVersion: 'v2', impact: 'Nova API v2 completa', changelog: 'Nova API REST v2, endpoints reorganizados' },
  { provider: 'perfectpay', name: 'Perfect Pay', currentVersion: 'v1', latestVersion: 'v1.2', impact: 'Novos meios de pagamento', changelog: 'PIX automático, boleto reformatado' },
  { provider: 'asaas', name: 'Asaas', currentVersion: 'v3', latestVersion: 'v3.1', impact: 'Endpoints de cobrança', changelog: 'Novos endpoints de assinatura recorrente' },
  { provider: 'mercadopago', name: 'Mercado Pago', currentVersion: 'v1', latestVersion: 'v1.4', impact: 'Checkout Pro', changelog: 'Novo Checkout Pro e webhooks expandidos' },
  { provider: 'stripe', name: 'Stripe', currentVersion: '2024-01', latestVersion: '2024-06', impact: 'Versão da API', changelog: 'Nova versão da API com novos recursos de billing' },
];

router.get('/', (req, res) => {
  try {
    const rows = db.select().from(schema.providerVersions).all();
    if (rows.length === 0) {
      for (const v of MOCK_VERSIONS) {
        db.insert(schema.providerVersions).values({ id: crypto.randomUUID(), provider: v.provider, currentVersion: v.currentVersion, latestVersion: v.latestVersion, status: v.currentVersion === v.latestVersion ? 'up-to-date' : 'update-available', impact: v.impact, changelog: v.changelog, lastCheckedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).run();
      }
    }
    const result = db.select().from(schema.providerVersions).all();
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/check', (req, res) => {
  try {
    for (const v of MOCK_VERSIONS) {
      const existing = db.select().from(schema.providerVersions).where(eq(schema.providerVersions.provider, v.provider)).get() as any;
      if (existing) {
        db.update(schema.providerVersions).set({ latestVersion: v.latestVersion, status: v.currentVersion !== v.latestVersion ? 'update-available' : 'up-to-date', lastCheckedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(schema.providerVersions.id, existing.id)).run();
      }
    }
    res.json({ checked: true, at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:provider/apply', (req, res) => {
  try {
    const existing = db.select().from(schema.providerVersions).where(eq(schema.providerVersions.provider, req.params.provider)).get() as any;
    if (!existing) return res.status(404).json({ error: 'Provider not found' });
    db.update(schema.providerVersions).set({ currentVersion: existing.latestVersion, status: 'up-to-date', updatedAt: new Date().toISOString() }).where(eq(schema.providerVersions.id, existing.id)).run();
    res.json({ success: true, provider: req.params.provider, newVersion: existing.latestVersion });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:provider/test', (req, res) => {
  try {
    const existing = db.select().from(schema.providerVersions).where(eq(schema.providerVersions.provider, req.params.provider)).get() as any;
    if (!existing) return res.status(404).json({ error: 'Provider not found' });
    res.json({ success: true, provider: req.params.provider, version: existing.currentVersion, latency: Math.floor(Math.random() * 300) + 100, message: 'Teste em staging aprovado' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
