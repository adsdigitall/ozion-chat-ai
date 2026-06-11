import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

router.get('/', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.flows).where(eq(schema.flows.tenantId, tid)).all();
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const row = { id, tenantId: tid, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.insert(schema.flows).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', (req, res) => {
  try {
    db.update(schema.flows).set({ ...req.body, updatedAt: new Date().toISOString() }).where(eq(schema.flows.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    db.delete(schema.flowEdges).where(eq(schema.flowEdges.flowId, req.params.id)).run();
    db.delete(schema.flowBlocks).where(eq(schema.flowBlocks.flowId, req.params.id)).run();
    db.delete(schema.flows).where(eq(schema.flows.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/publish', (req, res) => {
  try {
    db.update(schema.flows).set({ status: 'active', isActive: true, publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(schema.flows.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/duplicate', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const original = db.select().from(schema.flows).where(eq(schema.flows.id, req.params.id)).get() as any;
    if (!original) return res.status(404).json({ error: 'Flow not found' });
    const newId = crypto.randomUUID();
    db.insert(schema.flows).values({ id: newId, tenantId: tid, name: original.name + ' (Cópia)', description: original.description, category: original.category, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).run();
    const blocks = db.select().from(schema.flowBlocks).where(eq(schema.flowBlocks.flowId, req.params.id)).all();
    const newBlockMap: Record<string, string> = {};
    for (const b of blocks) {
      const newBlockId = crypto.randomUUID();
      newBlockMap[b.id] = newBlockId;
      db.insert(schema.flowBlocks).values({ id: newBlockId, flowId: newId, type: b.type, label: b.label, positionX: b.positionX, positionY: b.positionY, config: b.config, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).run();
    }
    const edges = db.select().from(schema.flowEdges).where(eq(schema.flowEdges.flowId, req.params.id)).all();
    for (const e of edges) {
      db.insert(schema.flowEdges).values({ id: crypto.randomUUID(), flowId: newId, sourceBlockId: newBlockMap[e.sourceBlockId] || e.sourceBlockId, targetBlockId: newBlockMap[e.targetBlockId] || e.targetBlockId, label: e.label, condition: e.condition, createdAt: new Date().toISOString() }).run();
    }
    res.json({ id: newId });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/blocks', (req, res) => {
  try {
    const rows = db.select().from(schema.flowBlocks).where(eq(schema.flowBlocks.flowId, req.params.id)).all();
    res.json(rows.map((b: any) => ({ ...b, config: JSON.parse(b.config || '{}') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/blocks', (req, res) => {
  try {
    const id = crypto.randomUUID();
    const row = { id, flowId: req.params.id, ...req.body, config: JSON.stringify(req.body.config || {}), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.insert(schema.flowBlocks).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/blocks/:id', (req, res) => {
  try {
    const body = { ...req.body, updatedAt: new Date().toISOString() };
    if (body.config) body.config = JSON.stringify(body.config);
    db.update(schema.flowBlocks).set(body).where(eq(schema.flowBlocks.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/blocks/:id', (req, res) => {
  try {
    db.delete(schema.flowEdges).where(eq(schema.flowEdges.sourceBlockId, req.params.id)).run();
    db.delete(schema.flowEdges).where(eq(schema.flowEdges.targetBlockId, req.params.id)).run();
    db.delete(schema.flowBlocks).where(eq(schema.flowBlocks.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/edges', (req, res) => {
  try {
    const rows = db.select().from(schema.flowEdges).where(eq(schema.flowEdges.flowId, req.params.id)).all();
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/edges', (req, res) => {
  try {
    db.delete(schema.flowEdges).where(eq(schema.flowEdges.flowId, req.params.id)).run();
    const edges = req.body.edges || [];
    for (const e of edges) {
      db.insert(schema.flowEdges).values({ id: crypto.randomUUID(), flowId: req.params.id, sourceBlockId: e.sourceBlockId, targetBlockId: e.targetBlockId, label: e.label, condition: e.condition, createdAt: new Date().toISOString() }).run();
    }
    res.json({ ok: true, count: edges.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/analytics', (req, res) => {
  try {
    const blocks = db.select().from(schema.flowBlocks).where(eq(schema.flowBlocks.flowId, req.params.id)).all();
    const events = db.select().from(schema.analyticsEvents).where(eq(schema.analyticsEvents.flowId, req.params.id)).all();
    const blockAnalytics = blocks.map((b: any) => {
      const blockEvents = events.filter((e: any) => e.blockId === b.id);
      const entries = blockEvents.filter((e: any) => e.event === 'entry').length;
      const exits = blockEvents.filter((e: any) => e.event === 'exit').length;
      const dropoffs = blockEvents.filter((e: any) => e.event === 'dropoff').length;
      const conversions = blockEvents.filter((e: any) => e.event === 'conversion').length;
      const revenue = blockEvents.reduce((sum: number, e: any) => sum + (e.value || 0), 0);
      return { blockId: b.id, label: b.label, type: b.type, entries, exits, dropoffs, conversions, revenue };
    });
    res.json({ blocks: blockAnalytics, totalEntries: events.filter((e: any) => e.event === 'entry').length, totalConversions: events.filter((e: any) => e.event === 'conversion').length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
