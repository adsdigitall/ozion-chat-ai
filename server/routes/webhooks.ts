import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { whatsappCredentials } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { processIncomingMessage, processStatusUpdate } from '../services/webhook-handler.js';
import { decrypt } from '../lib/encryption.js';

const router = Router();

const APP_SECRET = process.env.WEBHOOK_APP_SECRET!;

// ============================================================
// GET /api/webhooks/whatsapp
// Webhook verification challenge
// ============================================================
router.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

// ============================================================
// POST /api/webhooks/whatsapp
// Receive webhook events
// ============================================================
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    // Validate signature (optional but recommended)
    const signature = req.headers['x-hub-signature-256'] as string;
    if (signature && APP_SECRET) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', APP_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('❌ Invalid webhook signature');
        return res.sendStatus(403);
      }
    }

    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    // Process entries
    for (const entry of body.entry || []) {
      const wabaId = entry.id;

      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          const value = change.value;
          const metadata = value.metadata;

          // Find tenant by phone_number_id
          const cred = await db.query.whatsappCredentials.findFirst({
            where: eq(whatsappCredentials.phoneNumberId, metadata.phone_number_id),
          });

          if (!cred) {
            console.warn(`No credentials found for phone_number_id: ${metadata.phone_number_id}`);
            continue;
          }

          const tenantId = cred.tenantId;

          // Process incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              const contact = value.contacts?.[0];
              if (contact) {
                await processIncomingMessage(tenantId, metadata, message, contact);
                console.log(`📨 Message processed from ${message.from}`);
              }
            }
          }

          // Process status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              await processStatusUpdate(tenantId, metadata, status);
              console.log(`📊 Status update: ${status.id} → ${status.status}`);
            }
          }
        }
      }
    }

    // Always respond 200 quickly
    res.sendStatus(200);
  } catch (error: any) {
    console.error('Webhook error:', error);
    // Still respond 200 to avoid retries
    res.sendStatus(200);
  }
});

export default router;
