// @ts-nocheck
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { contacts, conversations, messages } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

// ============================================================
// GET /api/contacts/:tenantId
// ============================================================
router.get('/:tenantId', (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const allContacts = db.select().from(contacts)
      .where(eq(contacts.tenantId, tenantId))
      .orderBy(desc(contacts.lastMessageAt))
      .limit(limit)
      .all()
      .map(c => ({
        ...c,
        tags: JSON.parse(c.tags || '[]'),
        customFields: JSON.parse(c.customFields || '{}'),
      }));

    res.json({ contacts: allContacts, total: allContacts.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/contacts/:tenantId/:id
// ============================================================
router.get('/:tenantId/:id', (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;

    const contact = db.select().from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.id, id)))
      .get();

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contactConversations = db.select().from(conversations)
      .where(eq(conversations.contactId, id))
      .orderBy(desc(conversations.lastMessageAt))
      .all();

    res.json({
      contact: { ...contact, tags: JSON.parse(contact.tags || '[]') },
      conversations: contactConversations,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/contacts/:tenantId
// ============================================================
const createContactSchema = z.object({
  waId: z.string(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  tags: z.array(z.string()).optional(),
  leadSource: z.string().optional(),
  leadStatus: z.string().optional(),
});

router.post('/:tenantId', (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const data = createContactSchema.parse(req.body);

    const id = crypto.randomUUID();
    db.insert(contacts).values({
      id,
      tenantId,
      waId: data.waId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      tags: JSON.stringify(data.tags || []),
      leadSource: data.leadSource || 'manual',
      leadStatus: data.leadStatus || 'new',
    }).run();

    const newContact = db.select().from(contacts).where(eq(contacts.id, id)).get();
    res.json({ contact: newContact });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PUT /api/contacts/:tenantId/:id
// ============================================================
router.put('/:tenantId/:id', (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const data = req.body;

    db.update(contacts)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.id, id)))
      .run();

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/contacts/:tenantId/:id/tags
// ============================================================
router.post('/:tenantId/:id/tags', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    const contact = db.select().from(contacts).where(eq(contacts.id, id)).get();
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const existingTags = JSON.parse(contact.tags || '[]');
    const newTags = [...new Set([...existingTags, ...tags])];

    db.update(contacts)
      .set({ tags: JSON.stringify(newTags), updatedAt: new Date().toISOString() })
      .where(eq(contacts.id, id))
      .run();

    res.json({ tags: newTags });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PUT /api/contacts/:tenantId/:id/status
// ============================================================
router.put('/:tenantId/:id/status', (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { status } = req.body;

    db.update(contacts)
      .set({ leadStatus: status, updatedAt: new Date().toISOString() })
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.id, id)))
      .run();

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
