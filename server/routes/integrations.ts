// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('integrations').select('*').eq('tenant_id', tid);
    if (error) throw error;
    res.json((data || []).map((r: any) => ({ ...r, credentials: '***', settings: JSON.parse(r.settings || '{}') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, tenant_id: tid, provider: req.body.provider, name: req.body.name, credentials: req.body.credentials, settings: JSON.stringify(req.body.settings || {}), status: req.body.status || 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await sb.from('integrations').insert(row);
    if (error) throw error;
    res.json({ ...row, settings: req.body.settings || {} });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const updates: any = { updated_at: new Date().toISOString() };
    if (req.body.name) updates.name = req.body.name;
    if (req.body.credentials) updates.credentials = req.body.credentials;
    if (req.body.settings) updates.settings = JSON.stringify(req.body.settings);
    if (req.body.status) updates.status = req.body.status;
    
    const { error } = await sb.from('integrations').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('integrations').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/providers', (req, res) => {
  try {
    res.json([
      { id: 'meta', name: 'Meta Cloud API', icon: 'fa-brands fa-meta', category: 'whatsapp', description: 'WhatsApp Business API oficial', status: 'available', apiVersion: 'v23.0' },
      { id: 'openai', name: 'OpenAI', icon: 'fa-solid fa-robot', category: 'ai', description: 'GPT-4, GPT-4o, DALL-E', status: 'available', apiVersion: 'v1' },
      { id: 'elevenlabs', name: 'ElevenLabs', icon: 'fa-solid fa-microphone', category: 'voice', description: 'Text-to-Speech premium', status: 'available', apiVersion: 'v1' },
      { id: 'groq', name: 'Groq', icon: 'fa-solid fa-bolt', category: 'ai', description: 'Groq Inference (grátis)', status: 'available', apiVersion: 'v1' },
      { id: 'deepseek', name: 'DeepSeek', icon: 'fa-solid fa-magnifying-glass', category: 'ai', description: 'DeepSeek AI (barato)', status: 'available', apiVersion: 'v1' },
    ]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
