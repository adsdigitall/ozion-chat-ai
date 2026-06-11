import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

router.get('/', (req, res) => {
  try {
    const rows = db.select().from(schema.plans).all();
    res.json(rows.map((p: any) => ({ ...p, features: JSON.parse(p.features || '[]') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const id = crypto.randomUUID();
    const row = { id, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.insert(schema.plans).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', (req, res) => {
  try {
    db.update(schema.plans).set({ ...req.body, updatedAt: new Date().toISOString() }).where(eq(schema.plans.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    db.delete(schema.plans).where(eq(schema.plans.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/subscriptions', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.subscriptions).where(eq(schema.subscriptions.tenantId, tid)).all();
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/subscriptions', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const row = { id, tenantId: tid, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.insert(schema.subscriptions).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/subscriptions/:id', (req, res) => {
  try {
    db.update(schema.subscriptions).set({ ...req.body, updatedAt: new Date().toISOString() }).where(eq(schema.subscriptions.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
