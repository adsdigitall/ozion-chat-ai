import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

router.get('/', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.voices).where(eq(schema.voices.tenantId, tid)).all();
    res.json(rows.map((v: any) => ({ ...v, settings: JSON.parse(v.settings || '{}') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const row = { id, tenantId: tid, ...req.body, createdAt: new Date().toISOString() };
    db.insert(schema.voices).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', (req, res) => {
  try {
    db.update(schema.voices).set(req.body).where(eq(schema.voices.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    db.delete(schema.voices).where(eq(schema.voices.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/test', (req, res) => {
  try {
    const { provider, voiceId, text } = req.body;
    res.json({ success: true, message: `Áudio gerado via ${provider || 'ElevenLabs'}`, voiceId: voiceId || 'default', textPreview: (text || 'Texto de teste').substring(0, 50), duration: Math.floor(Math.random() * 10) + 2, latency: Math.floor(Math.random() * 2000) + 500, audioUrl: '/mock-audio.mp3' });
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
