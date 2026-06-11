import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { ctwaAttributions, sales } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

const router = Router();

function tenantId(req: Request): string {
  return req.headers['x-tenant-id'] as string || 'default';
}

router.get('/campaigns', (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const campaigns = db.select({
      campaignId: ctwaAttributions.campaignId,
      adsetId: ctwaAttributions.adsetId,
      adId: ctwaAttributions.adId,
      creativeId: ctwaAttributions.creativeId,
      count: sql<number>`count(*)`,
      leads: sql<number>`sum(case when lead_qualified_at is not null then 1 else 0 end)`,
    })
      .from(ctwaAttributions)
      .where(eq(ctwaAttributions.tenantId, tid))
      .groupBy(ctwaAttributions.campaignId, ctwaAttributions.adsetId, ctwaAttributions.adId, ctwaAttributions.creativeId)
      .all();

    const enriched = campaigns.map(c => {
      const campaignSales = db.select({ total: sql<number>`coalesce(sum(amount),0)` })
        .from(sales)
        .where(and(eq(sales.tenantId, tid), eq(sales.campaignId, c.campaignId)))
        .get();
      const amount = campaignSales?.total || 0;
      return {
        ...c,
        sales: amount,
        cpa: c.leads > 0 ? (amount / c.leads) : 0,
      };
    });

    res.json({ campaigns: enriched });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics', (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const stats = db.select({
      totalClicks: sql<number>`count(*)`,
      leads: sql<number>`sum(case when lead_qualified_at is not null then 1 else 0 end)`,
      purchases: sql<number>`sum(case when purchase_at is not null then 1 else 0 end)`,
    })
      .from(ctwaAttributions)
      .where(eq(ctwaAttributions.tenantId, tid))
      .get();

    const totalSales = db.select({ total: sql<number>`coalesce(sum(amount),0)` })
      .from(sales)
      .where(and(eq(sales.tenantId, tid), eq(sales.isCtwa, true)))
      .get();

    const total = stats?.totalClicks || 0;
    const totalLeads = stats?.leads || 0;
    const totalPurchases = stats?.purchases || 0;
    const revenue = totalSales?.total || 0;
    const cpa = totalLeads > 0 ? (revenue / totalLeads) : 0;
    const roi = revenue > 0 ? ((revenue - cpa * totalLeads) / (cpa * totalLeads || 1)) * 100 : 0;
    const roas = cpa > 0 ? (revenue / cpa) : 0;

    res.json({
      summary: {
        campaigns: total,
        ads: total,
        leads: totalLeads,
        sales: totalPurchases,
        revenue,
        cpa,
        roi,
        roas,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/attributions', (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const limit = parseInt(req.query.limit as string) || 100;
    const all = db.select().from(ctwaAttributions)
      .where(eq(ctwaAttributions.tenantId, tid))
      .orderBy(desc(ctwaAttributions.createdAt))
      .limit(limit)
      .all();
    res.json({ attributions: all, total: all.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
