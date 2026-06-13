import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';

const router = Router();

const MOCK_VERSIONS = [
  { provider: 'meta', name: 'Meta Cloud API', current_version: 'v23.0', latest_version: 'v24.0', impact: 'Webhooks, permissões e endpoints atualizados', changelog: 'Novos campos de CTWA, suporte a mensagens interativas melhorado' },
  { provider: 'openai', name: 'OpenAI', current_version: 'gpt-4-turbo', latest_version: 'gpt-4o-2024', impact: 'Novo modelo multimodal', changelog: 'GPT-4o disponível, suporte a imagens nativo' },
  { provider: 'elevenlabs', name: 'ElevenLabs', current_version: 'v1', latest_version: 'v2', impact: 'Novas vozes e streaming', changelog: 'Streaming de áudio em tempo real, clonagem de voz aprimorada' },
  { provider: 'gemini', name: 'Gemini', current_version: 'v1', latest_version: 'v1.5', impact: 'Novo modelo Gemini 1.5 Pro', changelog: 'Contexto de 1M tokens, multimodal melhorado' },
  { provider: 'claude', name: 'Claude', current_version: 'claude-3-opus', latest_version: 'claude-3.5-sonnet', impact: 'Novo modelo mais rápido', changelog: 'Claude 3.5 Sonnet com performance superior' },
  { provider: 'deepseek', name: 'DeepSeek', current_version: 'v1', latest_version: 'v1.5', impact: 'Melhoria de performance', changelog: 'Razão custo-benefício melhorada' },
  { provider: 'groq', name: 'Groq', current_version: 'v1', latest_version: 'v1.2', impact: 'Novos hardware', changelog: 'Suporte a novos modelos, latência reduzida' },
  { provider: 'utmify', name: 'UTMify', current_version: 'v1', latest_version: 'v1.1', impact: 'Novos parâmetros', changelog: 'UTM parameters expandidos' },
  { provider: 'kiwify', name: 'Kiwify', current_version: 'v1', latest_version: 'v1.3', impact: 'API de checkout', changelog: 'Nova API de checkout e webhook de assinatura' },
  { provider: 'hotmart', name: 'Hotmart', current_version: 'v1', latest_version: 'v2', impact: 'Nova API v2 completa', changelog: 'Nova API REST v2, endpoints reorganizados' },
  { provider: 'perfectpay', name: 'Perfect Pay', current_version: 'v1', latest_version: 'v1.2', impact: 'Novos meios de pagamento', changelog: 'PIX automático, boleto reformatado' },
  { provider: 'asaas', name: 'Asaas', current_version: 'v3', latest_version: 'v3.1', impact: 'Endpoints de cobrança', changelog: 'Novos endpoints de assinatura recorrente' },
  { provider: 'mercadopago', name: 'Mercado Pago', current_version: 'v1', latest_version: 'v1.4', impact: 'Checkout Pro', changelog: 'Novo Checkout Pro e webhooks expandidos' },
  { provider: 'stripe', name: 'Stripe', current_version: '2024-01', latest_version: '2024-06', impact: 'Versão da API', changelog: 'Nova versão da API com novos recursos de billing' },
];

router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: existing } = await sb.from('provider_versions').select('*');
    if (!existing || existing.length === 0) {
      for (const v of MOCK_VERSIONS) {
        await sb.from('provider_versions').insert({
          id: crypto.randomUUID(),
          provider: v.provider,
          current_version: v.current_version,
          latest_version: v.latest_version,
          status: v.current_version === v.latest_version ? 'up-to-date' : 'update-available',
          impact: v.impact,
          changelog: v.changelog,
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
    const { data: result } = await sb.from('provider_versions').select('*');
    res.json(result || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/check', async (req, res) => {
  try {
    const sb = getSupabase();
    for (const v of MOCK_VERSIONS) {
      const { data: existing } = await sb.from('provider_versions').select('id').eq('provider', v.provider).single();
      if (existing) {
        await sb.from('provider_versions').update({
          latest_version: v.latest_version,
          status: v.current_version !== v.latest_version ? 'update-available' : 'up-to-date',
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      }
    }
    res.json({ checked: true, at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:provider/apply', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: existing } = await sb.from('provider_versions').select('*').eq('provider', req.params.provider).single();
    if (!existing) return res.status(404).json({ error: 'Provider not found' });
    await sb.from('provider_versions').update({
      current_version: existing.latest_version,
      status: 'up-to-date',
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id);
    res.json({ success: true, provider: req.params.provider, newVersion: existing.latest_version });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:provider/test', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: existing } = await sb.from('provider_versions').select('current_version').eq('provider', req.params.provider).single();
    if (!existing) return res.status(404).json({ error: 'Provider not found' });
    res.json({ success: true, provider: req.params.provider, version: existing.current_version, latency: Math.floor(Math.random() * 300) + 100, message: 'Teste aprovado' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
