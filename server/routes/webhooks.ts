// @ts-nocheck
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getSupabase } from '../db/supabase.js';
import { processIncomingMessage, processStatusUpdate } from '../services/webhook-handler.js';

const router = Router();

const FLOWISE_URL = process.env.FLOWISE_URL || '';
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY || '';
const FLOWISE_CHATFLOW_ID = process.env.FLOWISE_CHATFLOW_ID || '';

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
                const result = await processIncomingMessage(tenantId, metadata, message, contact);
                console.log(`📨 Message from ${message.from}`);

                // Process with Flowise if configured
                if (FLOWISE_URL && FLOWISE_CHATFLOW_ID && message.text?.body) {
                  try {
                    const flowiseResponse = await callFlowise(message.text.body, message.from, tenantId);
                    if (flowiseResponse) {
                      await sendWhatsAppMessage(metadata.phone_number_id, message.from, flowiseResponse);
                      console.log(`🤖 Flowise response sent to ${message.from}`);
                    }
                  } catch (flowiseError) {
                    console.error('Flowise error:', flowiseError);
                  }
                }
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

// Call Flowise prediction API
async function callFlowise(question: string, sessionId: string, tenantId: string): Promise<string | null> {
  if (!FLOWISE_URL || !FLOWISE_CHATFLOW_ID) return null;

  const headers: any = { 'Content-Type': 'application/json' };
  if (FLOWISE_API_KEY) headers['Authorization'] = `Bearer ${FLOWISE_API_KEY}`;

  const response = await fetch(`${FLOWISE_URL}/api/v1/prediction/${FLOWISE_CHATFLOW_ID}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question,
      streaming: false,
      overrideConfig: {
        sessionId: `whatsapp_${tenantId}_${sessionId}`,
      },
    }),
  });

  const data = await response.json();
  return data.text || data.answer || null;
}

// Send WhatsApp message via Meta API
async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('No WhatsApp access token configured');
    return;
  }

  await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
}

export default router;
