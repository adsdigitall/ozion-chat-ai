// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';

const router = Router();

router.get('/:tenantId/dashboard', async (req, res) => {
  try {
    const tid = req.params.tenantId || 'default';
    const sb = getSupabase();
    
    const [contacts, conversations, messages, sales, ctwa] = await Promise.all([
      sb.from('contacts').select('lead_status').eq('tenant_id', tid),
      sb.from('conversations').select('status, is_ai_active').eq('tenant_id', tid),
      sb.from('messages').select('direction'),
      sb.from('sales').select('status, amount').eq('tenant_id', tid),
      sb.from('ctwa_attributions').select('*').eq('tenant_id', tid),
    ]);
    
    const allContacts = contacts.data || [];
    const allConversations = conversations.data || [];
    const allMessages = messages.data || [];
    const allSales = sales.data || [];
    const allCtwa = ctwa.data || [];
    
    const totalRevenue = allSales.filter((s: any) => s.status === 'approved').reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
    
    res.json({
      contacts: { total: allContacts.length, new: allContacts.filter((c: any) => c.lead_status === 'new').length, qualified: allContacts.filter((c: any) => c.lead_status === 'qualified').length, customer: allContacts.filter((c: any) => c.lead_status === 'customer').length },
      conversations: { total: allConversations.length, open: allConversations.filter((c: any) => c.status === 'open').length, closed: allConversations.filter((c: any) => c.status === 'closed').length },
      messages: { total: allMessages.length, inbound: allMessages.filter((m: any) => m.direction === 'inbound').length, outbound: allMessages.filter((m: any) => m.direction === 'outbound').length },
      sales: { total: allSales.length, revenue: totalRevenue, approved: allSales.filter((s: any) => s.status === 'approved').length, pending: allSales.filter((s: any) => s.status === 'pending').length },
      ctwa: { clicks: allCtwa.length, leads: allCtwa.filter((c: any) => c.lead_qualified_at).length, purchases: allCtwa.filter((c: any) => c.purchase_at).length },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/:tenantId/timeline', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: messages } = await sb.from('messages').select('sent_at');
    
    const timeline: Record<string, number> = {};
    (messages || []).forEach((m: any) => { 
      const day = (m.sent_at || '').substring(0, 10); 
      timeline[day] = (timeline[day] || 0) + 1; 
    });
    
    res.json(Object.entries(timeline).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
