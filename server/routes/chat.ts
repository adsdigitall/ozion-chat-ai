// @ts-nocheck
import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

router.get('/conversations', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const { status, search, tag, assigned, source, campaign, phoneNumber } = req.query;
    let rows = db.select().from(schema.conversations).where(eq(schema.conversations.tenantId, tid)).all();
    if (status) rows = rows.filter((c: any) => c.status === status);
    if (assigned) rows = rows.filter((c: any) => c.assignedTo === assigned);
    if (campaign) rows = rows.filter((c: any) => c.campaignId === campaign);
    const enriched = rows.map((c: any) => {
      const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, c.contactId)).get() as any;
      return { ...c, contact: contact ? { ...contact, tags: JSON.parse(contact.tags || '[]'), customFields: JSON.parse(contact.customFields || '{}') } : null };
    }).filter((c: any) => {
      if (search && c.contact && !(c.contact.name || '').toLowerCase().includes((search as string).toLowerCase()) && !(c.contact.phone || '').includes(search as string)) return false;
      if (tag && c.contact && !JSON.parse(c.contact.tags || '[]').includes(tag)) return false;
      return true;
    });
    res.json({ conversations: enriched, total: enriched.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/conversations/:id', (req, res) => {
  try {
    const conv = db.select().from(schema.conversations).where(eq(schema.conversations.id, req.params.id)).get() as any;
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, conv.contactId)).get() as any;
    const msgs = db.select().from(schema.messages).where(eq(schema.messages.conversationId, req.params.id)).all();
    res.json({ ...conv, contact: contact ? { ...contact, tags: JSON.parse(contact.tags || '[]'), customFields: JSON.parse(contact.customFields || '{}') } : null, messages: msgs });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/messages', (req, res) => {
  try {
    const { conversationId, content, type } = req.body;
    if (!conversationId || !content) return res.status(400).json({ error: 'conversationId and content required' });

    // Risk word check
    const riskWords = db.select().from(schema.riskWords).where(eq(schema.riskWords.isActive, true)).all();
    const lowerContent = content.toLowerCase();
    for (const rw of riskWords) {
      if (lowerContent.includes((rw as any).word.toLowerCase())) {
        db.update(schema.conversations).set({ isAiActive: false, assignedTo: 'human', updatedAt: new Date().toISOString() }).where(eq(schema.conversations.id, conversationId)).run();
        return res.status(403).json({ error: 'Mensagem bloqueada - palavra de risco detectada', riskWord: (rw as any).word, action: 'transferred_to_human' });
      }
    }

    const id = crypto.randomUUID();
    const row = { id, conversationId, direction: 'outbound', type: type || 'text', content, status: 'sent', sentAt: new Date().toISOString() };
    db.insert(schema.messages).values(row).run();
    db.update(schema.conversations).set({ lastMessageAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(schema.conversations.id, conversationId)).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/conversations/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const updates: any = { status, updatedAt: new Date().toISOString() };
    if (status === 'closed') updates.closedAt = new Date().toISOString();
    db.update(schema.conversations).set(updates).where(eq(schema.conversations.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/conversations/:id/assign', (req, res) => {
  try {
    db.update(schema.conversations).set({ assignedTo: req.body.userId, updatedAt: new Date().toISOString() }).where(eq(schema.conversations.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/conversations/:id/ai-toggle', (req, res) => {
  try {
    const conv = db.select().from(schema.conversations).where(eq(schema.conversations.id, req.params.id)).get() as any;
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    const newAiState = !conv.isAiActive;
    db.update(schema.conversations).set({ isAiActive: newAiState, updatedAt: new Date().toISOString() }).where(eq(schema.conversations.id, req.params.id)).run();
    res.json({ ok: true, isAiActive: newAiState });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const all = db.select().from(schema.conversations).where(eq(schema.conversations.tenantId, tid)).all();
    const inbox = all.filter((c: any) => c.status === 'open' && !c.isAiActive).length;
    const waiting = all.filter((c: any) => c.status === 'open' && c.isAiActive).length;
    const finished = all.filter((c: any) => c.status === 'closed').length;
    res.json({ inbox, waiting, finished, total: all.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/risk-words', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const rows = db.select().from(schema.riskWords).where(eq(schema.riskWords.tenantId, tid)).all();
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/risk-words', (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const id = crypto.randomUUID();
    const row = { id, tenantId: tid, word: req.body.word, isActive: true, createdAt: new Date().toISOString() };
    db.insert(schema.riskWords).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/risk-words/:id', (req, res) => {
  try {
    db.delete(schema.riskWords).where(eq(schema.riskWords.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
