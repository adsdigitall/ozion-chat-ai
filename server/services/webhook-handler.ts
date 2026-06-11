// @ts-nocheck
import { db } from '../db/index.js';
import { contacts, conversations, messages, ctwaAttributions, whatsappCredentials } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { sendConversionEvent } from './meta-api.js';

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: any;
  interactive?: any;
  context?: {
    ad?: {
      id?: string;
      title?: string;
      body?: string;
      ctwa?: string;
      source?: { id?: string };
    };
  };
  referral?: {
    ctwa_clid?: string;
    source_id?: string;
    headline?: string;
    body?: string;
    source_app?: string;
    media_type?: string;
  };
}

export async function processIncomingMessage(
  tenantId: string,
  metadata: { phone_number_id: string },
  message: WebhookMessage,
  contact: { profile: { name: string }; wa_id: string }
) {
  const { wa_id } = contact;
  const contactName = contact.profile?.name;

  // 1. Upsert contact
  let existingContact = db.select().from(contacts)
    .where(and(eq(contacts.tenantId, tenantId), eq(contacts.waId, wa_id)))
    .get();

  if (!existingContact) {
    const id = crypto.randomUUID();
    db.insert(contacts).values({
      id,
      tenantId,
      waId: wa_id,
      name: contactName,
      phone: wa_id,
      leadSource: 'whatsapp',
    }).run();
    existingContact = db.select().from(contacts).where(eq(contacts.id, id)).get();
  }

  // 2. Extract CTWA data
  let ctwaData: any = null;
  if (message.context?.ad?.ctwa) {
    ctwaData = {
      ctwaClid: message.context.ad.ctwa,
      adId: message.context.ad.source?.id,
      headline: message.context.ad.title,
      body: message.context.ad.body,
    };
  } else if (message.referral?.ctwa_clid) {
    ctwaData = {
      ctwaClid: message.referral.ctwa_clid,
      adId: message.referral.source_id,
      headline: message.referral.headline,
      body: message.referral.body,
      sourceApp: message.referral.source_app,
    };
  }

  // 3. Upsert conversation
  let conversation = db.select().from(conversations)
    .where(and(
      eq(conversations.tenantId, tenantId),
      eq(conversations.contactId, existingContact!.id),
      eq(conversations.status, 'open')
    ))
    .get();

  if (!conversation) {
    const id = crypto.randomUUID();
    db.insert(conversations).values({
      id,
      tenantId,
      contactId: existingContact!.id,
      phoneNumberId: metadata.phone_number_id,
      contactWaId: wa_id,
      status: 'open',
      isCtwa: !!ctwaData,
      ctwaClid: ctwaData?.ctwaClid,
      adId: ctwaData?.adId,
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
    }).run();
    conversation = db.select().from(conversations).where(eq(conversations.id, id)).get();

    // Save CTWA attribution
    if (ctwaData?.ctwaClid) {
      try {
        db.insert(ctwaAttributions).values({
          id: crypto.randomUUID(),
          tenantId,
          contactId: existingContact!.id,
          conversationId: conversation!.id,
          ctwaClid: ctwaData.ctwaClid,
          adId: ctwaData.adId,
          headline: ctwaData.headline,
          body: ctwaData.body,
          sourceApp: ctwaData.sourceApp,
          firstMessageAt: new Date().toISOString(),
        }).run();
      } catch (e) {
        // Ignore duplicate ctwa_clid
      }
    }
  } else {
    db.update(conversations)
      .set({ lastMessageAt: new Date().toISOString() })
      .where(eq(conversations.id, conversation.id))
      .run();
  }

  // 4. Save message
  const msgId = crypto.randomUUID();
  db.insert(messages).values({
    id: msgId,
    conversationId: conversation!.id,
    externalId: message.id,
    direction: 'inbound',
    type: message.type,
    content: JSON.stringify(message.text || message.image || message.interactive || {}),
    status: 'received',
    sentAt: new Date(parseInt(message.timestamp) * 1000).toISOString(),
  }).run();

  return { contact: existingContact, conversation, ctwaData };
}

export async function processStatusUpdate(
  tenantId: string,
  metadata: { phone_number_id: string },
  status: { id: string; status: string; timestamp: string }
) {
  const existingMessage = db.select().from(messages)
    .where(eq(messages.externalId, status.id))
    .get();

  if (!existingMessage) return;

  const updateData: any = {};
  if (status.status === 'delivered') {
    updateData.status = 'delivered';
    updateData.deliveredAt = new Date(parseInt(status.timestamp) * 1000).toISOString();
  } else if (status.status === 'read') {
    updateData.status = 'read';
    updateData.readAt = new Date(parseInt(status.timestamp) * 1000).toISOString();
  }

  if (Object.keys(updateData).length > 0) {
    db.update(messages).set(updateData).where(eq(messages.id, existingMessage.id)).run();
  }
}

export async function sendCtwaConversion(
  tenantId: string,
  ctwaClid: string,
  eventName: string,
  datasetId: string,
  cApiAccessToken: string,
  additionalData?: { currency?: string; value?: number }
) {
  const attribution = db.select().from(ctwaAttributions)
    .where(eq(ctwaAttributions.ctwaClid, ctwaClid))
    .get();

  if (!attribution) throw new Error('CTWA attribution not found');

  const cred = db.select().from(whatsappCredentials)
    .where(eq(whatsappCredentials.tenantId, tenantId))
    .get();

  if (!cred) throw new Error('WhatsApp credentials not found');

  await sendConversionEvent(datasetId, cApiAccessToken, {
    eventName,
    eventTime: Math.floor(Date.now() / 1000),
    ctwaClid,
    wabaId: cred.wabaId || '',
    eventId: `${ctwaClid}-${eventName}-${Date.now()}`,
    ...additionalData,
  });

  db.update(ctwaAttributions)
    .set({
      conversionSentToMeta: true,
      conversionEventName: eventName,
      conversionEventTime: new Date().toISOString(),
    })
    .where(eq(ctwaAttributions.ctwaClid, ctwaClid))
    .run();

  return { success: true };
}
