// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

router.get('/system', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('system_health').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/check', async (req, res) => {
  try {
    const sb = getSupabase();
    const components = ['meta-cloud-api', 'webhooks-whatsapp', 'database', 'storage', 'auth', 'webhooks'];
    
    for (const comp of components) {
      const { data: existing } = await sb.from('system_health').select('*').eq('component', comp).single();
      
      if (existing) {
        await sb.from('system_health').update({ lastCheckedAt: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await sb.from('system_health').insert({ id: crypto.randomUUID(), component: comp, status: 'online', lastCheckedAt: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
    }
    
    const { data: rows } = await sb.from('system_health').select('*');
    res.json({ checked: true, components: rows || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
