// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

// ─── List contacts ─────────────────────────────────────────────
router.get('/contacts', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: rows, error } = await sb.from('contacts').select('*').eq('tenant_id', tid);
    if (error) throw error;

    let enriched = (rows || []).map((c: any) => ({
      ...c,
      tags: JSON.parse(c.tags || '[]'),
      customFields: JSON.parse(c.customFields || '{}'),
    }));

    const { search, tag, status, source, stage } = req.query;
    if (search) enriched = enriched.filter((c: any) =>
      (c.name || '').toLowerCase().includes((search as string).toLowerCase()) ||
      (c.phone || '').includes(search as string) ||
      (c.email || '').toLowerCase().includes((search as string).toLowerCase())
    );
    if (tag) enriched = enriched.filter((c: any) => (c.tag || '').includes(tag));
    if (stage) enriched = enriched.filter((c: any) => (c.stage || 'lead') === stage);

    res.json({ contacts: enriched, total: enriched.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Create contact ────────────────────────────────────────────
router.post('/contacts', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = {
      id, tenant_id: tid,
      name: req.body.name, phone: req.body.phone, email: req.body.email || '',
      company: req.body.company || '', tag: req.body.tag || 'lead',
      stage: req.body.stage || 'lead',
      tags: JSON.stringify(req.body.tags || []),
      custom_fields: JSON.stringify(req.body.customFields || {}),
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('contacts').insert(row);
    if (error) throw error;
    res.json({ ...row, tags: row.tags, customFields: row.custom_fields });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Update contact ────────────────────────────────────────────
router.put('/contacts/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const updates: any = { updated_at: new Date().toISOString() };
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.company !== undefined) updates.company = req.body.company;
    if (req.body.tag !== undefined) updates.tag = req.body.tag;
    if (req.body.stage !== undefined) updates.stage = req.body.stage;
    if (req.body.tags !== undefined) updates.tags = JSON.stringify(req.body.tags);
    if (req.body.customFields !== undefined) updates.custom_fields = JSON.stringify(req.body.customFields);

    const { error } = await sb.from('contacts').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Delete contact ────────────────────────────────────────────
router.delete('/contacts/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('contacts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Bulk import contacts ──────────────────────────────────────
router.post('/contacts/import', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { contacts } = req.body;
    if (!contacts?.length) return res.status(400).json({ error: 'No contacts' });
    const rows = contacts.map((c: any) => ({
      id: crypto.randomUUID(), tenant_id: tid,
      name: c.name || '', phone: c.phone || '', email: c.email || '',
      company: c.company || '', tag: c.tag || 'lead', stage: 'lead',
      tags: '[]', custom_fields: '{}',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }));
    const { error } = await sb.from('contacts').insert(rows);
    if (error) throw error;
    res.json({ ok: true, imported: rows.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Export contacts ───────────────────────────────────────────
router.get('/export', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: rows } = await sb.from('contacts').select('*').eq('tenant_id', tid);
    const csv = 'id,name,phone,email,company,tag,stage,created_at\n' + (rows || []).map((r: any) =>
      `${r.id},"${(r.name||'').replace(/"/g,'""')}","${r.phone||''}","${r.email||''}","${r.company||''}","${r.tag||''}","${r.stage||''}",${r.created_at}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contatos_ozion.csv');
    res.send(csv);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
