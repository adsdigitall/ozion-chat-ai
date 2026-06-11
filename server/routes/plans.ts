// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('plans').select('*');
    if (error) throw error;
    res.json((data || []).map((p: any) => ({ ...p, features: JSON.parse(p.features || '[]') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, name: req.body.name, price: req.body.price, features: JSON.stringify(req.body.features || []), limits: JSON.stringify(req.body.limits || {}), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await sb.from('plans').insert(row);
    if (error) throw error;
    res.json({ ...row, features: req.body.features || [], limits: req.body.limits || {} });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const updates: any = { updated_at: new Date().toISOString() };
    if (req.body.name) updates.name = req.body.name;
    if (req.body.price) updates.price = req.body.price;
    if (req.body.features) updates.features = JSON.stringify(req.body.features);
    if (req.body.limits) updates.limits = JSON.stringify(req.body.limits);
    
    const { error } = await sb.from('plans').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('plans').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/subscriptions', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('subscriptions').select('*').eq('tenant_id', tid);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
