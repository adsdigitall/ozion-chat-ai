// @ts-nocheck
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getSupabase } from '../db/supabase.js';
import { processIncomingMessage, processStatusUpdate } from '../services/webhook-handler.js';
import {
  createWebhookEvent,
  markWebhookEventProcessing,
  markWebhookEventProcessed,
  markWebhookEventFailed,
  hashRawBody,
} from '../services/webhook-events.js';

const router = Router();

const FLOWISE_URL = process.env.FLOWISE_URL || '';
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY || '';
const FLOWISE_CHATFLOW_ID = process.env.FLOWISE_CHATFLOW_ID || '';
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'ozion-verify-token-123';

// GET /api/webhooks/whatsapp - Webhook verification
router.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

// Verify Meta webhook signature
function verifyMetaSignature(rawBody: string, signatureHeader: string, appSecret: string): boolean {
  if (!signatureHeader.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const received = signatureHeader.slice(7);
  if (expected.length !== received.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

// POST /api/webhooks/whatsapp - Receive events with idempotency
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature if app secret is configured
    const appSecret = process.env.META_APP_SECRET;
    let signatureValid: boolean | undefined;
    if (appSecret) {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      signatureValid = !!(signature && verifyMetaSignature(req.rawBody, signature, appSecret));
      if (!signatureValid) {
        console.error('❌ Invalid webhook signature');
        return res.sendStatus(403);
      }
    }

    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const rawBodyHash = req.rawBody ? hashRawBody(req.rawBody) : undefined;
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

          // Process incoming messages with idempotency
          if (value.messages) {
            for (const message of value.messages) {
              const eventId = `message:${message.id}`;

              const { event, duplicate, error: eventError } = await createWebhookEvent({
                tenantId,
                provider: 'meta',
                eventId,
                eventType: 'message',
                payload: { entry_id: entry.id, change_field: change.field, message, contact: value.contacts?.[0] },
                rawBodyHash,
                signatureValid,
              });

              if (eventError) {
                console.warn(`Webhook event error: ${eventError}`);
              }
              if (duplicate) {
                console.log(`⏭️ Duplicate message ${message.id} skipped`);
                continue;
              }
              if (!event) continue;

              await markWebhookEventProcessing(event.id);

              try {
                const contact = value.contacts?.[0];
                if (contact) {
                  await processIncomingMessage(tenantId, metadata, message, contact);
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
                await markWebhookEventProcessed(event.id);
              } catch (procError: any) {
                console.error(`Process message error:`, procError);
                await markWebhookEventFailed(event.id, procError.message);
              }
            }
          }

          // Process status updates with idempotency
          if (value.statuses) {
            for (const status of value.statuses) {
              const eventId = `status:${status.id}`;

              const { event, duplicate, error: eventError } = await createWebhookEvent({
                tenantId,
                provider: 'meta',
                eventId,
                eventType: 'status',
                payload: { entry_id: entry.id, change_field: change.field, status },
                rawBodyHash,
                signatureValid,
              });

              if (eventError) {
                console.warn(`Webhook event error: ${eventError}`);
              }
              if (duplicate) {
                console.log(`⏭️ Duplicate status ${status.id} skipped`);
                continue;
              }
              if (!event) continue;

              await markWebhookEventProcessing(event.id);

              try {
                await processStatusUpdate(tenantId, metadata, status);
                console.log(`📊 Status: ${status.id} → ${status.status}`);
                await markWebhookEventProcessed(event.id);
              } catch (procError: any) {
                console.error(`Process status error:`, procError);
                await markWebhookEventFailed(event.id, procError.message);
              }
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
