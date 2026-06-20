import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { getSupabase } from '../db/supabase.js';
import { sendByProvider } from '../services/providers/index.js';
import type { ProviderMessageResult } from '../services/providers/types.js';

const router = Router();

router.post('/send', async (req: Request, res: Response) => {
  try {
    const { conversationId, type, text, templateName, templateLanguage = 'pt_BR', templateParams, mediaUrl, mediaType, caption, fileName } = req.body;
    if (!conversationId || !type) {
      return res.status(400).json({ error: 'conversationId and type are required' });
    }
    const sb = getSupabase();
    const { data: conversation, error: convErr } = await sb.from('conversations').select('*, contacts(*)').eq('id', conversationId).single();
    if (convErr || !conversation) return res.status(404).json({ error: 'Conversation not found' });

    const msgId = crypto.randomUUID();
    const content = type === 'text' ? text : JSON.stringify({ template: templateName, mediaUrl, caption });
    const { error: msgErr } = await sb.from('messages').insert({
      id: msgId,
      conversation_id: conversationId,
      tenant_id: conversation.tenant_id,
      direction: 'outbound',
      type: type || 'text',
      content,
      status: 'pending',
      sent_at: new Date().toISOString(),
    });
    if (msgErr) console.warn('Message insert warning:', msgErr.message);

    const to = conversation.contacts?.phone || conversation.wa_id || conversation.phone;
    let providerResult: ProviderMessageResult = { success: false, error: 'No recipient number' };

    if (to) {
      switch (type) {
        case 'text':
          providerResult = await sendByProvider(conversation.tenant_id, p => p.sendText({ to, text }));
          break;
        case 'template':
          providerResult = await sendByProvider(conversation.tenant_id, p => p.sendTemplate({
            to, templateName, langCode: templateLanguage, params: templateParams,
          }));
          break;
        case 'image':
        case 'audio':
        case 'document':
          providerResult = await sendByProvider(conversation.tenant_id, p => p.sendMedia({
            to, type, mediaUrl, caption, fileName,
          }));
          break;
        default:
          providerResult = { success: false, error: `Unsupported message type: ${type}` };
      }
    }

    await sb.from('messages').update({
      status: providerResult.success ? 'sent' : 'failed',
      external_id: providerResult.externalId || null,
    }).eq('id', msgId);

    await sb.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);

    res.json({
      success: providerResult.success,
      messageId: msgId,
      providerError: providerResult.error,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const sb = getSupabase();
    const { data: msgs, error } = await sb.from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json({ messages: (msgs || []).reverse() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/conversations/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const status = (req.query.status as string) || 'open';
    const sb = getSupabase();
    const { data: convs, error } = await sb.from('conversations')
      .select('*, contacts(*)')
      .eq('tenant_id', tenantId)
      .eq('status', status)
      .order('last_message_at', { ascending: false });
    if (error) throw error;
    res.json({ conversations: convs || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/conversations/:id/close', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    await sb.from('conversations').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
