// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('sales').select('*').eq('tenant_id', tid);
    if (error) throw error;
    res.json((data || []).map((s: any) => ({ ...s, metadata: JSON.parse(s.metadata || '{}') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: all } = await sb.from('sales').select('status, amount').eq('tenant_id', tid);
    
    const approved = (all || []).filter((s: any) => s.status === 'approved');
    const pending = (all || []).filter((s: any) => s.status === 'pending');
    const cancelled = (all || []).filter((s: any) => s.status === 'cancelled');
    const totalRevenue = approved.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
    const avgTicket = approved.length > 0 ? totalRevenue / approved.length : 0;
    
    res.json({ totalSales: (all || []).length, approved: approved.length, pending: pending.length, cancelled: cancelled.length, totalRevenue, avgTicket: Math.round(avgTicket * 100) / 100 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, tenant_id: tid, contact_id: req.body.contactId, amount: req.body.amount, status: req.body.status || 'pending', product: req.body.product, campaign_id: req.body.campaignId, metadata: JSON.stringify(req.body.metadata || {}), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await sb.from('sales').insert(row);
    if (error) throw error;
    res.json({ ...row, metadata: req.body.metadata || {} });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const updates: any = { updated_at: new Date().toISOString() };
    if (req.body.status) updates.status = req.body.status;
    if (req.body.amount) updates.amount = req.body.amount;
    if (req.body.product) updates.product = req.body.product;
    
    const { error } = await sb.from('sales').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
