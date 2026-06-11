// @ts-nocheck
import { Router, Request, Response } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

router.get('/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const sb = getSupabase();
    
    const { data: rows, error } = await sb.from('contacts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    
    res.json({ contacts: (rows || []).map((c: any) => ({ ...c, tags: JSON.parse(c.tags || '[]'), customFields: JSON.parse(c.custom_fields || '{}') })), total: (rows || []).length });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/:tenantId/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const sb = getSupabase();
    
    const { data: contact } = await sb.from('contacts').select('*').eq('tenant_id', tenantId).eq('id', id).single();
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    
    const { data: conversations } = await sb.from('conversations').select('*').eq('contact_id', id).order('last_message_at', { ascending: false });
    
    res.json({ contact: { ...contact, tags: JSON.parse(contact.tags || '[]') }, conversations: conversations || [] });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, tenant_id: tenantId, wa_id: req.body.waId, name: req.body.name, phone: req.body.phone, email: req.body.email, tags: JSON.stringify(req.body.tags || []), lead_source: req.body.leadSource || 'manual', lead_status: req.body.leadStatus || 'new', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await sb.from('contacts').insert(row);
    if (error) throw error;
    res.json({ contact: { ...row, tags: req.body.tags || [] } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.put('/:tenantId/:id', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const updates: any = { updated_at: new Date().toISOString() };
    if (req.body.name) updates.name = req.body.name;
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.tags) updates.tags = JSON.stringify(req.body.tags);
    if (req.body.leadStatus) updates.lead_status = req.body.leadStatus;
    
    const { error } = await sb.from('contacts').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export default router;
