import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

router.get('/', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.agents).where(eq(schema.agents.tenantId, tid)).all();
    res.json(rows.map((a: any) => ({ ...a, faq: JSON.parse(a.faq || '[]'), knowledgeBase: JSON.parse(a.knowledgeBase || '[]'), objections: JSON.parse(a.objections || '[]'), offers: JSON.parse(a.offers || '[]'), memory: JSON.parse(a.memory || '{}') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const row = { id, tenantId: tid, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.insert(schema.agents).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', (req, res) => {
  try {
    db.update(schema.agents).set({ ...req.body, updatedAt: new Date().toISOString() }).where(eq(schema.agents.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    db.delete(schema.agents).where(eq(schema.agents.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/test', (req, res) => {
  try {
    const agent = db.select().from(schema.agents).where(eq(schema.agents.id, req.params.id)).get() as any;
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const message = req.body.message || 'Olá, tudo bem?';
    const mockResponse = `Olá! Sou ${agent.name}. ${agent.identity || ''} Como posso te ajudar?`;
    res.json({ agent: agent.name, provider: agent.provider, model: agent.model, request: message, response: mockResponse, latency: Math.floor(Math.random() * 500) + 200 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
