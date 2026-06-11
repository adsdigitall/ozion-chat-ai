import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

router.get('/system', (req, res) => {
  try {
    const rows = db.select().from(schema.systemHealth).all();
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/check', (req, res) => {
  try {
    const components = ['meta-cloud-api', 'webhooks-whatsapp', 'openai', 'elevenlabs', 'utmify', 'kiwify', 'hotmart', 'asaas', 'mercadopago', 'stripe', 'database', 'storage', 'queues', 'auth', 'webhooks'];
    for (const comp of components) {
      const existing = db.select().from(schema.systemHealth).where(eq(schema.systemHealth.component, comp)).get() as any;
      const status = existing ? existing.status : 'online';
      if (existing) {
        db.update(schema.systemHealth).set({ lastCheckedAt: new Date().toISOString() }).where(eq(schema.systemHealth.id, existing.id)).run();
      } else {
        db.insert(schema.systemHealth).values({ id: crypto.randomUUID(), component: comp, status, lastCheckedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).run();
      }
    }
    const rows = db.select().from(schema.systemHealth).all();
    res.json({ checked: true, components: rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:component', (req, res) => {
  try {
    const existing = db.select().from(schema.systemHealth).where(eq(schema.systemHealth.component, req.params.component)).get() as any;
    if (existing) {
      db.update(schema.systemHealth).set({ ...req.body, updatedAt: new Date().toISOString() }).where(eq(schema.systemHealth.id, existing.id)).run();
    } else {
      db.insert(schema.systemHealth).values({ id: crypto.randomUUID(), component: req.params.component, ...req.body, updatedAt: new Date().toISOString() }).run();
    }
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
