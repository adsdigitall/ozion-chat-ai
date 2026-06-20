import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { getSupabase } from '../db/supabase.js';
import { sendByProvider } from '../services/providers/index.js';

const router = Router();

// GET /api/inbox/conversations
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenant_id;
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const sb = getSupabase();

    let query = sb.from('conversations')
      .select('*, contacts(*)', { count: 'exact' })
      .eq('tenant_id', tenantId);

    if (search) {
      const { data: matchingContacts } = await sb.from('contacts')
        .select('id')
        .eq('tenant_id', tenantId)
        .or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

      const contactIds = (matchingContacts || []).map((c: any) => c.id);
      if (contactIds.length === 0) {
        return res.json({ conversations: [], pagination: { page, limit, total: 0 } });
      }
      query = query.in('contact_id', contactIds);
    }

    const { data: conversations, error, count } = await query
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const convIds = (conversations || []).map((c: any) => c.id);
    const lastMessageMap: Record<string, string | null> = {};

    if (convIds.length > 0) {
      const { data: latestMessages } = await sb.from('messages')
        .select('conversation_id, content')
        .in('conversation_id', convIds)
        .order('sent_at', { ascending: false });

      if (latestMessages) {
        const seen = new Set<string>();
        for (const msg of latestMessages) {
          if (!seen.has(msg.conversation_id)) {
            seen.add(msg.conversation_id);
            lastMessageMap[msg.conversation_id] = msg.content;
          }
        }
      }
    }

    const result = (conversations || []).map((c: any) => ({
      id: c.id,
      contact_id: c.contact_id,
      contact_name: c.contacts?.name || null,
      contact_phone: c.contacts?.phone || null,
      contact_avatar: c.contacts?.avatar_url || null,
      last_message_preview: lastMessageMap[c.id] || null,
      last_message_at: c.last_message_at,
      status: c.status,
      provider: c.provider,
    }));

    res.json({
      conversations: result,
      pagination: { page, limit, total: count || 0 },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/inbox/conversations/:conversationId/messages
router.get('/conversations/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenant_id;
    const { conversationId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const sb = getSupabase();

    const { data: conversation, error: convErr } = await sb.from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (convErr || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: messages, error: msgErr, count } = await sb.from('messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (msgErr) throw msgErr;

    const msgIds = (messages || []).map((m: any) => m.id);
    const mediaMap: Record<string, any> = {};

    if (msgIds.length > 0) {
      const { data: mediaFiles } = await sb.from('media_files')
        .select('*')
        .in('message_id', msgIds);

      if (mediaFiles) {
        for (const media of mediaFiles) {
          mediaMap[media.message_id] = {
            id: media.id,
            media_type: media.media_type,
            mime_type: media.mime_type,
            file_name: media.file_name,
            caption: media.caption,
            download_status: media.download_status,
          };
        }
      }
    }

    const result = (messages || []).map((m: any) => ({
      id: m.id,
      direction: m.direction,
      type: m.type,
      content: m.content,
      status: m.status,
      created_at: m.created_at,
      sent_at: m.sent_at,
      delivered_at: m.delivered_at,
      read_at: m.read_at,
      failed_at: m.failed_at,
      error_message: m.error_message,
      external_id: m.external_id,
      media: mediaMap[m.id] || null,
    }));

    res.json({
      messages: result,
      pagination: { page, limit, total: count || 0 },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/inbox/contacts/:contactId
router.get('/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenant_id;
    const { contactId } = req.params;

    const sb = getSupabase();

    const { data: contact, error: contErr } = await sb.from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (contErr || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const { data: recentEvents } = await sb.from('contact_events')
      .select('event_type, source, payload, occurred_at')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .order('occurred_at', { ascending: false })
      .limit(5);

    const { data: recentMedia } = await sb.from('media_files')
      .select('media_type, file_name, created_at')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { count: totalConversations } = await sb.from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId);

    const { count: openCount } = await sb.from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .eq('status', 'open');

    res.json({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      tags: contact.tags,
      avatar_url: contact.avatar_url,
      lead_status: contact.lead_status,
      lead_source: contact.lead_source,
      assigned_to: contact.assigned_to,
      created_at: contact.created_at,
      recent_events: (recentEvents || []).map((e: any) => ({
        event_type: e.event_type,
        source: e.source,
        payload: e.payload,
        occurred_at: e.occurred_at,
      })),
      recent_media: (recentMedia || []).map((m: any) => ({
        media_type: m.media_type,
        file_name: m.file_name,
        created_at: m.created_at,
      })),
      conversation_summary: {
        total: totalConversations || 0,
        open_count: openCount || 0,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/inbox/conversations/:conversationId/send
router.post('/conversations/:conversationId/send', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenant_id;
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required and cannot be empty' });
    }

    const sb = getSupabase();

    const { data: conversation, error: convErr } = await sb.from('conversations')
      .select('*, contacts(*)')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (convErr || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const msgId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error: msgErr } = await sb.from('messages').insert({
      id: msgId,
      conversation_id: conversationId,
      direction: 'outbound',
      type: 'text',
      content: text,
      status: 'pending',
      sent_at: now,
    });

    if (msgErr) throw msgErr;

    const to = conversation.contacts?.wa_id || conversation.contacts?.phone || conversation.contact_wa_id;
    let sendResult: any;

    if (to) {
      sendResult = await sendByProvider(tenantId, async (provider) =>
        provider.sendText({ to, text })
      );
    } else {
      sendResult = { success: false, error: 'No recipient number available' };
    }

    if (sendResult.success) {
      await sb.from('messages').update({ status: 'sent' }).eq('id', msgId);
    } else {
      await sb.from('messages').update({
        status: 'failed',
        error_message: sendResult.error || 'Unknown error',
      }).eq('id', msgId);
    }

    await sb.from('conversations').update({ last_message_at: now }).eq('id', conversationId);

    res.json({
      message: {
        id: msgId,
        conversation_id: conversationId,
        direction: 'outbound',
        type: 'text',
        content: text,
        status: sendResult.success ? 'sent' : 'failed',
        sent_at: now,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
