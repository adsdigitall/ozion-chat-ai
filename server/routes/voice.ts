// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('voices').select('*').eq('tenant_id', tid);
    if (error) throw error;
    res.json((data || []).map((v: any) => ({ ...v, settings: JSON.parse(v.settings || '{}') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, tenant_id: tid, name: req.body.name, provider: req.body.provider || 'elevenlabs', voice_id: req.body.voiceId, settings: JSON.stringify(req.body.settings || {}), created_at: new Date().toISOString() };
    const { error } = await sb.from('voices').insert(row);
    if (error) throw error;
    res.json({ ...row, settings: req.body.settings || {} });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const updates: any = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.provider) updates.provider = req.body.provider;
    if (req.body.voiceId) updates.voice_id = req.body.voiceId;
    if (req.body.settings) updates.settings = JSON.stringify(req.body.settings);
    
    const { error } = await sb.from('voices').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('voices').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/providers', (req, res) => {
  try {
    res.json([
      { id: 'elevenlabs', name: 'ElevenLabs', status: 'available', versions: ['v1', 'v2'], description: 'Vozes ultrarrealistas com clonagem de voz' },
      { id: 'openai-tts', name: 'OpenAI TTS', status: 'available', versions: ['v1'], description: 'Text-to-Speech da OpenAI' },
      { id: 'cartesia', name: 'Cartesia', status: 'available', versions: ['v1'], description: 'Vozes neurais de alta qualidade' },
    ]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
