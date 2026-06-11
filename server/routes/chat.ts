// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

router.get('/conversations', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    
    let query = sb.from('conversations').select('*, contacts(*)').eq('tenant_id', tid);
    const { data: rows, error } = await query;
    if (error) throw error;
    
    let enriched = (rows || []).map((c: any) => ({
      ...c,
      contact: c.contacts ? { ...c.contacts, tags: JSON.parse(c.contacts.tags || '[]') } : null,
    }));
    
    const { status, search, assigned } = req.query;
    if (status) enriched = enriched.filter((c: any) => c.status === status);
    if (assigned) enriched = enriched.filter((c: any) => c.assigned_to === assigned);
    if (search) enriched = enriched.filter((c: any) => c.contact?.name?.toLowerCase().includes((search as string).toLowerCase()));
    
    res.json({ conversations: enriched, total: enriched.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: conv, error: e1 } = await sb.from('conversations').select('*, contacts(*)').eq('id', req.params.id).single();
    if (e1 || !conv) return res.status(404).json({ error: 'Conversation not found' });
    
    const { data: msgs } = await sb.from('messages').select('*').eq('conversation_id', req.params.id).order('sent_at', { ascending: false });
    
    res.json({
      ...conv,
      contact: conv.contacts ? { ...conv.contacts, tags: JSON.parse(conv.contacts.tags || '[]') } : null,
      messages: msgs || [],
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/messages', async (req, res) => {
  try {
    const { conversationId, content, type } = req.body;
    if (!conversationId || !content) return res.status(400).json({ error: 'conversationId and content required' });

    const sb = getSupabase();

    // Risk word check
    const { data: riskWords } = await sb.from('risk_words').select('*').eq('is_active', true);
    const lowerContent = content.toLowerCase();
    for (const rw of (riskWords || [])) {
      if (lowerContent.includes(rw.word.toLowerCase())) {
        await sb.from('conversations').update({ is_ai_active: false, assigned_to: 'human', updated_at: new Date().toISOString() }).eq('id', conversationId);
        return res.status(403).json({ error: 'Mensagem bloqueada', riskWord: rw.word, action: 'transferred_to_human' });
      }
    }

    const id = crypto.randomUUID();
    const row = { id, conversation_id: conversationId, direction: 'outbound', type: type || 'text', content, status: 'sent', sent_at: new Date().toISOString() };
    const { error } = await sb.from('messages').insert(row);
    if (error) throw error;
    
    await sb.from('conversations').update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', conversationId);
    
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/conversations/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'closed') updates.closed_at = new Date().toISOString();
    const sb = getSupabase();
    await sb.from('conversations').update(updates).eq('id', req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/conversations/:id/ai-toggle', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: conv } = await sb.from('conversations').select('is_ai_active').eq('id', req.params.id).single();
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    
    const newState = !conv.is_ai_active;
    await sb.from('conversations').update({ is_ai_active: newState, updated_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ ok: true, isAiActive: newState });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: all } = await sb.from('conversations').select('status, is_ai_active').eq('tenant_id', tid);
    
    const inbox = (all || []).filter((c: any) => c.status === 'open' && !c.is_ai_active).length;
    const waiting = (all || []).filter((c: any) => c.status === 'open' && c.is_ai_active).length;
    const finished = (all || []).filter((c: any) => c.status === 'closed').length;
    
    res.json({ inbox, waiting, finished, total: (all || []).length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/risk-words', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('risk_words').select('*').eq('tenant_id', tid);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/risk-words', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, tenant_id: tid, word: req.body.word, is_active: true, created_at: new Date().toISOString() };
    const { error } = await sb.from('risk_words').insert(row);
    if (error) throw error;
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
