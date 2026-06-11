// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

async function groqChat(messages: any[], options: any = {}) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'llama-3.3-70b-versatile',
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1024,
    }),
  });
  return response.json();
}

router.get('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('agents').select('*').eq('tenant_id', tid);
    if (error) throw error;
    res.json((data || []).map((a: any) => ({
      ...a,
      faq: JSON.parse(a.faq || '[]'),
      knowledgeBase: JSON.parse(a.knowledge_base || '[]'),
      objections: JSON.parse(a.objections || '[]'),
      offers: JSON.parse(a.offers || '[]'),
      memory: JSON.parse(a.memory || '{}'),
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, tenant_id: tid, ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await sb.from('agents').insert(row).select();
    if (error) throw error;
    res.json(data?.[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('agents').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('agents').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/test', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: agent, error: fetchError } = await sb.from('agents').select('*').eq('id', req.params.id).single();
    if (fetchError || !agent) return res.status(404).json({ error: 'Agent not found' });

    const message = req.body.message || 'Olá, tudo bem?';
    const startTime = Date.now();

    try {
      const systemPrompt = [
        agent.identity || 'Você é um assistente virtual',
        agent.objective ? `Objetivo: ${agent.objective}` : '',
        agent.communication ? `Estilo: ${agent.communication}` : '',
        agent.instructions ? `Instruções: ${agent.instructions}` : '',
        agent.restrictions ? `Restrições: ${agent.restrictions}` : '',
      ].filter(Boolean).join('\n');

      const data = await groqChat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ], {
        temperature: agent.temperature || 0.7,
        max_tokens: agent.max_tokens || 1024,
      });

      const latency = Date.now() - startTime;
      res.json({
        agent: agent.name,
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        request: message,
        response: data.choices?.[0]?.message?.content || 'Sem resposta',
        latency,
      });
    } catch (groqError: any) {
      const latency = Date.now() - startTime;
      res.json({
        agent: agent.name,
        provider: 'demo',
        model: 'mock',
        request: message,
        response: `Olá! Sou ${agent.name}. ${agent.identity || ''} Como posso te ajudar?`,
        latency,
      });
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
