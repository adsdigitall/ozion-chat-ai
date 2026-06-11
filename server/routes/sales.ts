import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

router.get('/', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.sales).where(eq(schema.sales.tenantId, tid)).all();
    res.json(rows.map((s: any) => ({ ...s, metadata: JSON.parse(s.metadata || '{}') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const all = db.select().from(schema.sales).where(eq(schema.sales.tenantId, tid)).all();
    const approved = all.filter((s: any) => s.status === 'approved');
    const pending = all.filter((s: any) => s.status === 'pending');
    const cancelled = all.filter((s: any) => s.status === 'cancelled');
    const totalRevenue = approved.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
    const avgTicket = approved.length > 0 ? totalRevenue / approved.length : 0;
    res.json({ totalSales: all.length, approved: approved.length, pending: pending.length, cancelled: cancelled.length, totalRevenue, avgTicket: Math.round(avgTicket * 100) / 100 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/by-campaign', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const all = db.select().from(schema.sales).where(eq(schema.sales.tenantId, tid)).all();
    const byCampaign: Record<string, number> = {};
    all.forEach((s: any) => { if (s.campaignId) byCampaign[s.campaignId] = (byCampaign[s.campaignId] || 0) + (s.amount || 0); });
    res.json(Object.entries(byCampaign).map(([campaign, revenue]) => ({ campaign, revenue })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/by-product', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const all = db.select().from(schema.sales).where(eq(schema.sales.tenantId, tid)).all();
    const byProduct: Record<string, number> = {};
    all.forEach((s: any) => { if (s.product) byProduct[s.product] = (byProduct[s.product] || 0) + (s.amount || 0); });
    res.json(Object.entries(byProduct).map(([product, revenue]) => ({ product, revenue })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const row = { id, tenantId: tid, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.insert(schema.sales).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', (req, res) => {
  try {
    db.update(schema.sales).set({ ...req.body, updatedAt: new Date().toISOString() }).where(eq(schema.sales.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
