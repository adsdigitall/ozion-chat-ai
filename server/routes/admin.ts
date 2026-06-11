import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

router.get('/customers', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.customers).where(eq(schema.customers.tenantId, tid)).all();
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/customers', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const row = { id, tenantId: tid, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.insert(schema.customers).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/customers/:id', (req, res) => {
  try {
    db.update(schema.customers).set({ ...req.body, updatedAt: new Date().toISOString() }).where(eq(schema.customers.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/customers/:id', (req, res) => {
  try {
    db.delete(schema.customers).where(eq(schema.customers.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/workspaces', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.workspaces).where(eq(schema.workspaces.tenantId, tid)).all();
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/workspaces', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const row = { id, tenantId: tid, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.insert(schema.workspaces).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/users', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.users).where(eq(schema.users.tenantId, tid)).all();
    res.json(rows.map(u => ({ ...u, passwordHash: undefined })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/users', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const row = { id, tenantId: tid, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.insert(schema.users).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', (req, res) => {
  try {
    db.update(schema.users).set({ ...req.body, updatedAt: new Date().toISOString() }).where(eq(schema.users.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const customers = db.select({ count: schema.customers.id }).from(schema.customers).where(eq(schema.customers.tenantId, tid)).all().length;
    const contacts = db.select({ count: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.tenantId, tid)).all().length;
    const messages = db.select({ count: schema.messages.id }).from(schema.messages).all().length;
    const conversations = db.select({ count: schema.conversations.id }).from(schema.conversations).where(eq(schema.conversations.tenantId, tid)).all().length;
    const flows = db.select({ count: schema.flows.id }).from(schema.flows).where(eq(schema.flows.tenantId, tid)).all().length;
    const agents = db.select({ count: schema.agents.id }).from(schema.agents).where(eq(schema.agents.tenantId, tid)).all().length;
    const sales = db.select().from(schema.sales).where(eq(schema.sales.tenantId, tid)).all();
    const revenue = sales.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
    res.json({ customers, contacts, messages, conversations, flows, agents, sales: sales.length, revenue });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
