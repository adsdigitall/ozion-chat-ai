import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/:tenantId/dashboard', (req, res) => {
  try {
    const tid = req.params.tenantId || 'default';
    const contacts = db.select().from(schema.contacts).where(eq(schema.contacts.tenantId, tid)).all();
    const conversations = db.select().from(schema.conversations).where(eq(schema.conversations.tenantId, tid)).all();
    const messages = db.select().from(schema.messages).all();
    const sales = db.select().from(schema.sales).where(eq(schema.sales.tenantId, tid)).all();
    const ctwa = db.select().from(schema.ctwaAttributions).where(eq(schema.ctwaAttributions.tenantId, tid)).all();
    const ctwaClicks = ctwa.length;
    const ctwaLeads = ctwa.filter((c: any) => c.leadQualifiedAt).length;
    const ctwaPurchases = ctwa.filter((c: any) => c.purchaseAt).length;
    const totalRevenue = sales.filter((s: any) => s.status === 'approved').reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
    const recentConversations = conversations.slice(0, 5).map((c: any) => {
      const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, c.contactId)).get() as any;
      return { ...c, contact: contact ? { ...contact, tags: JSON.parse(contact.tags || '[]'), customFields: JSON.parse(contact.customFields || '{}') } : null };
    });
    res.json({ contacts: { total: contacts.length, new: contacts.filter((c: any) => c.leadStatus === 'new').length, qualified: contacts.filter((c: any) => c.leadStatus === 'qualified').length, customer: contacts.filter((c: any) => c.leadStatus === 'customer').length }, conversations: { total: conversations.length, open: conversations.filter((c: any) => c.status === 'open').length, closed: conversations.filter((c: any) => c.status === 'closed').length }, messages: { total: messages.length, inbound: messages.filter((m: any) => m.direction === 'inbound').length, outbound: messages.filter((m: any) => m.direction === 'outbound').length }, sales: { total: sales.length, revenue: totalRevenue, approved: sales.filter((s: any) => s.status === 'approved').length, pending: sales.filter((s: any) => s.status === 'pending').length }, ctwa: { clicks: ctwaClicks, leads: ctwaLeads, purchases: ctwaPurchases }, recentConversations });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/:tenantId/funnel', (req, res) => {
  try {
    const tid = req.params.tenantId || 'default';
    const flows = db.select().from(schema.flows).where(eq(schema.flows.tenantId, tid)).all();
    const funnelData = flows.map((f: any) => {
      const events = db.select().from(schema.analyticsEvents).where(eq(schema.analyticsEvents.flowId, f.id)).all();
      const blocks = db.select().from(schema.flowBlocks).where(eq(schema.flowBlocks.flowId, f.id)).all();
      const blockAnalytics = blocks.map((b: any) => {
        const be = events.filter((e: any) => e.blockId === b.id);
        return { blockId: b.id, label: b.label, type: b.type, entries: be.filter((e: any) => e.event === 'entry').length, exits: be.filter((e: any) => e.event === 'exit').length, dropoffs: be.filter((e: any) => e.event === 'dropoff').length };
      });
      return { flowId: f.id, name: f.name, status: f.status, blocks: blockAnalytics };
    });
    res.json(funnelData);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/:tenantId/timeline', (req, res) => {
  try {
    const messages = db.select().from(schema.messages).all();
    const timeline: Record<string, number> = {};
    messages.forEach((m: any) => { const day = (m.sentAt || '').substring(0, 10); timeline[day] = (timeline[day] || 0) + 1; });
    res.json(Object.entries(timeline).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
