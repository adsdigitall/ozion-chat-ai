// @ts-nocheck
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getSupabase } from '../db/supabase.js';
import { processIncomingMessage, processStatusUpdate } from '../services/webhook-handler.js';

const router = Router();

// GET /api/webhooks/whatsapp - Webhook verification
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

// POST /api/webhooks/whatsapp - Receive events
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const sb = getSupabase();

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          const value = change.value;
          const metadata = value.metadata;

          // Find tenant by phone_number_id
          const { data: creds } = await sb.from('whatsapp_credentials')
            .select('*')
            .eq('phone_number_id', metadata.phone_number_id)
            .limit(1);

          const cred = creds?.[0];
          if (!cred) {
            console.warn(`No credentials for phone: ${metadata.phone_number_id}`);
            continue;
          }

          const tenantId = cred.tenant_id;

          // Process incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              const contact = value.contacts?.[0];
              if (contact) {
                await processIncomingMessage(tenantId, metadata, message, contact);
                console.log(`📨 Message from ${message.from}`);
              }
            }
          }

          // Process status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              await processStatusUpdate(tenantId, metadata, status);
              console.log(`📊 Status: ${status.id} → ${status.status}`);
            }
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.sendStatus(200);
  }
});

export default router;
