import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    let query = sb.from('logs').select('*').eq('tenant_id', tid);
    const { category, status, provider, search, limit } = req.query;
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    if (provider) query = query.eq('provider', provider);
    const limitNum = parseInt(limit as string) || 100;
    query = query.order('created_at', { ascending: false }).limit(limitNum);
    const { data, error } = await query;
    if (error) throw error;
    let rows = data || [];
    if (search) {
      const q = (search as string).toLowerCase();
      rows = rows.filter((r: any) => (r.action || '').toLowerCase().includes(q) || (r.request_data || '').toLowerCase().includes(q));
    }
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/categories', (req, res) => {
  res.json(['auth', 'message', 'flow', 'integration', 'webhook', 'api', 'ai', 'voice', 'sale', 'ctwa', 'error', 'system']);
});

router.delete('/clear', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    await sb.from('logs').delete().eq('tenant_id', tid);
    res.json({ ok: true, message: 'Logs limpos' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
