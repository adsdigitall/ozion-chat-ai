// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

router.get('/customers', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('customers').select('*').eq('tenant_id', tid);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/customers', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, tenant_id: tid, ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await sb.from('customers').insert(row);
    if (error) throw error;
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/workspaces', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('workspaces').select('*').eq('tenant_id', tid);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/users', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('users').select('*').eq('tenant_id', tid);
    if (error) throw error;
    res.json((data || []).map((u: any) => ({ ...u, password_hash: undefined })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    
    const [customers, contacts, conversations, flows, agents, sales] = await Promise.all([
      sb.from('customers').select('id').eq('tenant_id', tid),
      sb.from('contacts').select('id').eq('tenant_id', tid),
      sb.from('conversations').select('id').eq('tenant_id', tid),
      sb.from('flows').select('id').eq('tenant_id', tid),
      sb.from('agents').select('id').eq('tenant_id', tid),
      sb.from('sales').select('amount, status').eq('tenant_id', tid),
    ]);
    
    const allSales = sales.data || [];
    const revenue = allSales.filter((s: any) => s.status === 'approved').reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
    
    res.json({
      customers: (customers.data || []).length,
      contacts: (contacts.data || []).length,
      conversations: (conversations.data || []).length,
      flows: (flows.data || []).length,
      agents: (agents.data || []).length,
      sales: allSales.length,
      revenue,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
