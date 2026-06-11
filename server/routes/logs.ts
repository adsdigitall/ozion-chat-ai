import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, like, and, desc } from 'drizzle-orm';

const router = Router();

router.get('/', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    let rows = db.select().from(schema.logs).where(eq(schema.logs.tenantId, tid)).all();
    const { category, status, provider, search, dateFrom, dateTo } = req.query;
    if (category) rows = rows.filter((r: any) => r.category === category);
    if (status) rows = rows.filter((r: any) => r.status === status);
    if (provider) rows = rows.filter((r: any) => r.provider === provider);
    if (search) rows = rows.filter((r: any) => (r.action || '').toLowerCase().includes((search as string).toLowerCase()) || (r.requestData || '').toLowerCase().includes((search as string).toLowerCase()));
    if (dateFrom) rows = rows.filter((r: any) => r.createdAt >= dateFrom);
    if (dateTo) rows = rows.filter((r: any) => r.createdAt <= dateTo);
    rows.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const limit = parseInt(req.query.limit as string) || 100;
    res.json(rows.slice(0, limit));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/categories', (req, res) => {
  try {
    res.json(['auth', 'message', 'flow', 'integration', 'webhook', 'api', 'ai', 'voice', 'sale', 'ctwa', 'error', 'system']);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/clear', (req, res) => {
  try {
    db.delete(schema.logs).run();
    res.json({ ok: true, message: 'Logs limpos' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
