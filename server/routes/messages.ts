// @ts-nocheck
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { whatsappCredentials, contacts, conversations, messages } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { decrypt } from '../lib/encryption.js';
import { sendTextMessage, sendTemplateMessage } from '../services/meta-api.js';

const router = Router();

// ============================================================
// POST /api/messages/send
// ============================================================
const sendSchema = z.object({
  tenantId: z.string(),
  conversationId: z.string(),
  type: z.enum(['text', 'template']),
  text: z.string().optional(),
  templateName: z.string().optional(),
  templateParams: z.array(z.string()).optional(),
  templateLanguage: z.string().default('pt_BR'),
});

router.post('/send', async (req: Request, res: Response) => {
  try {
    const data = sendSchema.parse(req.body);

    // Get conversation
    const conversation = db.select().from(conversations)
      .where(eq(conversations.id, data.conversationId))
      .get();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get credentials
    const cred = db.select().from(whatsappCredentials)
      .where(eq(whatsappCredentials.tenantId, data.tenantId))
      .get();

    if (!cred || !cred.phoneNumberVerified) {
      return res.status(400).json({ error: 'WhatsApp not connected or verified' });
    }

    const accessToken = decrypt(cred.accessTokenEncrypted || '');
    let result: any;

    if (data.type === 'text' && data.text) {
      result = await sendTextMessage(
        cred.phoneNumberId || '',
        accessToken,
        conversation.contactWaId || '',
        data.text
      );
    } else if (data.type === 'template' && data.templateName) {
      result = await sendTemplateMessage(
        cred.phoneNumberId || '',
        accessToken,
        conversation.contactWaId || '',
        data.templateName,
        data.templateLanguage,
        data.templateParams
      );
    } else {
      return res.status(400).json({ error: 'Invalid message type' });
    }

    // Save sent message
    const msgId = crypto.randomUUID();
    db.insert(messages).values({
      id: msgId,
      conversationId: data.conversationId,
      externalId: result.messages?.[0]?.id,
      direction: 'outbound',
      type: data.type,
      content: JSON.stringify(data.type === 'text' ? { body: data.text } : { template: data.templateName }),
      status: 'sent',
      sentAt: new Date().toISOString(),
    }).run();

    // Update conversation
    db.update(conversations)
      .set({ lastMessageAt: new Date().toISOString() })
      .where(eq(conversations.id, data.conversationId))
      .run();

    res.json({
      success: true,
      messageId: msgId,
      externalId: result.messages?.[0]?.id,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/messages/:conversationId
// ============================================================
router.get('/:conversationId', (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const msgs = db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.sentAt))
      .limit(limit)
      .all();

    res.json({ messages: msgs.map(m => ({ ...m, content: JSON.parse(m.content) })) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/messages/conversations/:tenantId
// ============================================================
router.get('/conversations/:tenantId', (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const status = req.query.status as string || 'open';

    const convs = db.select().from(conversations)
      .where(and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.status, status)
      ))
      .orderBy(desc(conversations.lastMessageAt))
      .all();

    // Attach contact info
    const convsWithContact = convs.map(conv => {
      const contact = db.select().from(contacts)
        .where(eq(contacts.id, conv.contactId))
        .get();
      return { ...conv, contact };
    });

    res.json({ conversations: convsWithContact });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PUT /api/messages/conversations/:id/close
// ============================================================
router.put('/conversations/:id/close', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    db.update(conversations)
      .set({ status: 'closed', closedAt: new Date().toISOString() })
      .where(eq(conversations.id, id))
      .run();

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
