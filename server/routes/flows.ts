// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('flows').select('*').eq('tenant_id', tid);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, tenant_id: tid, name: req.body.name, description: req.body.description, category: req.body.category, status: req.body.status || 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await sb.from('flows').insert(row);
    if (error) throw error;
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const updates: any = { updated_at: new Date().toISOString() };
    if (req.body.name) updates.name = req.body.name;
    if (req.body.description) updates.description = req.body.description;
    if (req.body.status) updates.status = req.body.status;
    
    const { error } = await sb.from('flows').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('flow_edges').delete().eq('flow_id', req.params.id);
    await sb.from('flow_blocks').delete().eq('flow_id', req.params.id);
    await sb.from('flows').delete().eq('id', req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/blocks', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('flow_blocks').select('*').eq('flow_id', req.params.id);
    if (error) throw error;
    res.json((data || []).map((b: any) => ({ ...b, config: JSON.parse(b.config || '{}') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/blocks', async (req, res) => {
  try {
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, flow_id: req.params.id, type: req.body.type, label: req.body.label, position_x: req.body.positionX || 0, position_y: req.body.positionY || 0, config: JSON.stringify(req.body.config || {}), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await sb.from('flow_blocks').insert(row);
    if (error) throw error;
    res.json({ ...row, config: req.body.config || {} });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/edges', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('flow_edges').select('*').eq('flow_id', req.params.id);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
