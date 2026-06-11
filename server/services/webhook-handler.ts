// @ts-nocheck
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

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
  const sb = getSupabase();

  // 1. Upsert contact
  const { data: existingContacts } = await sb.from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('wa_id', wa_id)
    .limit(1);

  let existingContact = existingContacts?.[0];

  if (!existingContact) {
    const id = crypto.randomUUID();
    const { error } = await sb.from('contacts').insert({
      id,
      tenant_id: tenantId,
      wa_id: wa_id,
      name: contactName,
      phone: wa_id,
      lead_source: 'whatsapp',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) console.error('Insert contact error:', error);
    existingContact = { id, tenant_id: tenantId, wa_id, name: contactName };
  }

  // 2. Extract CTWA data from referral
  let ctwaData: any = null;
  if (message.referral?.ctwa_clid) {
    ctwaData = {
      ctwaClid: message.referral.ctwa_clid,
      adId: message.referral.source_id,
      headline: message.referral.headline,
      body: message.referral.body,
      sourceApp: message.referral.source_app,
    };
  } else if (message.context?.ad?.ctwa) {
    ctwaData = {
      ctwaClid: message.context.ad.ctwa,
      adId: message.context.ad.source?.id,
      headline: message.context.ad.title,
      body: message.context.ad.body,
    };
  }

  // 3. Upsert conversation
  const { data: existingConvs } = await sb.from('conversations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('contact_id', existingContact.id)
    .eq('status', 'open')
    .limit(1);

  let conversation = existingConvs?.[0];

  if (!conversation) {
    const id = crypto.randomUUID();
    const { error } = await sb.from('conversations').insert({
      id,
      tenant_id: tenantId,
      contact_id: existingContact.id,
      phone_number_id: metadata.phone_number_id,
      contact_wa_id: wa_id,
      status: 'open',
      is_ctwa: !!ctwaData,
      ctwa_clid: ctwaData?.ctwaClid,
      ad_id: ctwaData?.adId,
      started_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) console.error('Insert conversation error:', error);
    conversation = { id, tenant_id: tenantId, contact_id: existingContact.id };

    // Save CTWA attribution
    if (ctwaData?.ctwaClid) {
      const { error: attrError } = await sb.from('ctwa_attributions').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        contact_id: existingContact.id,
        conversation_id: conversation.id,
        ctwa_clid: ctwaData.ctwaClid,
        ad_id: ctwaData.adId,
        headline: ctwaData.headline,
        body: ctwaData.body,
        source_app: ctwaData.sourceApp,
        first_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      if (attrError && !attrError.message.includes('duplicate')) {
        console.error('Insert ctwa attribution error:', attrError);
      }
    }
  } else {
    await sb.from('conversations')
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', conversation.id);
  }

  // 4. Save message
  const msgId = crypto.randomUUID();
  const { error: msgError } = await sb.from('messages').insert({
    id: msgId,
    conversation_id: conversation.id,
    external_id: message.id,
    direction: 'inbound',
    type: message.type,
    content: JSON.stringify(message.text || message.image || message.interactive || {}),
    status: 'received',
    sent_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
  });
  if (msgError) console.error('Insert message error:', msgError);

  return { contact: existingContact, conversation, ctwaData };
}

export async function processStatusUpdate(
  tenantId: string,
  metadata: { phone_number_id: string },
  status: { id: string; status: string; timestamp: string }
) {
  const sb = getSupabase();

  const { data: existingMessages } = await sb.from('messages')
    .select('*')
    .eq('external_id', status.id)
    .limit(1);

  const existingMessage = existingMessages?.[0];
  if (!existingMessage) return;

  const updateData: any = { updated_at: new Date().toISOString() };
  if (status.status === 'delivered') {
    updateData.status = 'delivered';
    updateData.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
  } else if (status.status === 'read') {
    updateData.status = 'read';
    updateData.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
  }

  if (Object.keys(updateData).length > 1) {
    await sb.from('messages').update(updateData).eq('id', existingMessage.id);
  }
}
