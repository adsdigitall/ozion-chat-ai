// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

router.get('/contacts', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    let query = sb.from('contacts').select('*').eq('tenant_id', tid);
    const { data: rows, error } = await query;
    if (error) throw error;

    let enriched = (rows || []).map((c: any) => ({
      ...c,
      tags: JSON.parse(c.tags || '[]'),
      customFields: JSON.parse(c.customFields || '{}'),
    }));

    const { search, tag, status, source } = req.query;
    if (search) enriched = enriched.filter((c: any) => (c.name || '').toLowerCase().includes((search as string).toLowerCase()) || (c.phone || '').includes(search as string));
    if (tag) enriched = enriched.filter((c: any) => (JSON.parse(c.tags || '[]') || []).includes(tag));
    if (status) enriched = enriched.filter((c: any) => c.leadStatus === status);
    if (source) enriched = enriched.filter((c: any) => c.leadSource === source);

    res.json({ contacts: enriched, total: enriched.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/contacts', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const tags = req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : []) : [];
    const customFields = req.body.customFields || {};
    const row = { id, tenant_id: tid, name: req.body.name, phone: req.body.phone, email: req.body.email, lead_status: req.body.leadStatus || 'lead', lead_source: req.body.leadSource || 'organic', tags: JSON.stringify(tags), custom_fields: JSON.stringify(customFields), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await sb.from('contacts').insert(row);
    if (error) throw error;
    res.json({ ...row, tags, customFields });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/contacts/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const updates: any = { updated_at: new Date().toISOString() };
    if (req.body.name) updates.name = req.body.name;
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.leadStatus) updates.lead_status = req.body.leadStatus;
    if (req.body.leadSource) updates.lead_source = req.body.leadSource;
    if (req.body.tags) updates.tags = JSON.stringify(req.body.tags);
    if (req.body.customFields) updates.custom_fields = JSON.stringify(req.body.customFields);
    
    const { error } = await sb.from('contacts').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/contacts/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('contacts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/tags', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('tags').select('*').eq('tenant_id', tid);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/tags', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, tenant_id: tid, name: req.body.name, color: req.body.color || '#6366f1', created_at: new Date().toISOString() };
    const { error } = await sb.from('tags').insert(row);
    if (error) throw error;
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/tags/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('tags').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/export', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: rows } = await sb.from('contacts').select('*').eq('tenant_id', tid);
    const csv = 'id,name,phone,email,lead_status,lead_source,tags,created_at\n' + (rows || []).map((r: any) => `${r.id},${r.name || ''},${r.phone || ''},${r.email || ''},${r.lead_status || ''},${r.lead_source || ''},${r.tags || '[]'},${r.created_at}`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
