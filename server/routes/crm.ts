import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, like, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

router.get('/contacts', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    let rows = db.select().from(schema.contacts).where(eq(schema.contacts.tenantId, tid)).all();
    const { search, tag, status, source, campaign } = req.query;
    if (search) rows = rows.filter((c: any) => (c.name || '').toLowerCase().includes((search as string).toLowerCase()) || (c.phone || '').includes(search as string) || (c.email || '').toLowerCase().includes((search as string).toLowerCase()));
    if (tag) rows = rows.filter((c: any) => JSON.parse(c.tags || '[]').includes(tag));
    if (status) rows = rows.filter((c: any) => c.leadStatus === status);
    if (source) rows = rows.filter((c: any) => c.leadSource === source);
    if (campaign) rows = rows.filter((c: any) => c.campaignId === campaign);
    res.json({ contacts: rows.map((c: any) => ({ ...c, tags: JSON.parse(c.tags || '[]'), customFields: JSON.parse(c.customFields || '{}') })), total: rows.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/contacts', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const tags = req.body.tags ? (Array.isArray(req.body.tags) ? JSON.stringify(req.body.tags) : '[]') : '[]';
    const customFields = req.body.customFields ? JSON.stringify(req.body.customFields) : '{}';
    const row = { id, tenantId: tid, ...req.body, tags, customFields, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.insert(schema.contacts).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/contacts/:id', (req, res) => {
  try {
    const body = { ...req.body, updatedAt: new Date().toISOString() };
    if (body.tags && Array.isArray(body.tags)) body.tags = JSON.stringify(body.tags);
    if (body.customFields && typeof body.customFields === 'object') body.customFields = JSON.stringify(body.customFields);
    db.update(schema.contacts).set(body).where(eq(schema.contacts.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/contacts/:id', (req, res) => {
  try {
    db.delete(schema.contacts).where(eq(schema.contacts.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/contacts/:id/tags', (req, res) => {
  try {
    const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, req.params.id)).get() as any;
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    const tags = JSON.parse(contact.tags || '[]');
    if (!tags.includes(req.body.tag)) tags.push(req.body.tag);
    db.update(schema.contacts).set({ tags: JSON.stringify(tags), updatedAt: new Date().toISOString() }).where(eq(schema.contacts.id, req.params.id)).run();
    res.json({ ok: true, tags });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/contacts/:id/tags/:tag', (req, res) => {
  try {
    const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, req.params.id)).get() as any;
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    const tags = JSON.parse(contact.tags || '[]').filter((t: string) => t !== req.params.tag);
    db.update(schema.contacts).set({ tags: JSON.stringify(tags), updatedAt: new Date().toISOString() }).where(eq(schema.contacts.id, req.params.id)).run();
    res.json({ ok: true, tags });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/tags', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.tags).where(eq(schema.tags.tenantId, tid)).all();
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/tags', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const row = { id, tenantId: tid, ...req.body, createdAt: new Date().toISOString() };
    db.insert(schema.tags).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/tags/:id', (req, res) => {
  try {
    db.update(schema.tags).set(req.body).where(eq(schema.tags.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/tags/:id', (req, res) => {
  try {
    db.delete(schema.tags).where(eq(schema.tags.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/export', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.contacts).where(eq(schema.contacts.tenantId, tid)).all();
    const csv = 'id,name,phone,email,lead_status,lead_source,tags,created_at\n' + rows.map((r: any) => `${r.id},${r.name || ''},${r.phone || ''},${r.email || ''},${r.leadStatus || ''},${r.leadSource || ''},${r.tags || '[]'},${r.createdAt}`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
