import { Router, Request, Response } from 'express';
import { getSupabase } from '../db/supabase.js';

const router = Router();

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || 'YOUR_APP_ID';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'YOUR_APP_SECRET';
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/api/whatsapp/oauth/callback';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'ozion-verify-token-123';

router.post('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });
    res.json({ success: true, businesses: [], shortLivedToken: code });
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { tenantId, businessId, businessName, wabaId, wabaName, phoneNumberId, shortLivedToken } = req.body;
    if (!phoneNumberId) return res.status(400).json({ error: 'phoneNumberId is required' });

    const sb = getSupabase();
    const tid = tenantId || 'default';

    const { data: existing } = await sb.from('whatsapp_credentials').select('id').eq('tenant_id', tid).single();

    const credentialData = {
      tenant_id: tid,
      business_id: businessId || '',
      business_name: businessName || '',
      waba_id: wabaId || '',
      waba_name: wabaName || '',
      phone_number_id: phoneNumberId,
      access_token_encrypted: shortLivedToken || '',
      app_id: FACEBOOK_APP_ID,
      phone_number_verified: false,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await sb.from('whatsapp_credentials').update(credentialData).eq('id', existing.id);
    } else {
      await sb.from('whatsapp_credentials').insert({ id: crypto.randomUUID(), ...credentialData });
    }

    res.json({ success: true, tenantId: tid, phoneNumber: phoneNumberId });
  } catch (error: any) {
    console.error('Connect error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/status/:tenantId', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { data: cred } = await sb.from('whatsapp_credentials').select('*').eq('tenant_id', req.params.tenantId).single();
    if (!cred) return res.json({ connected: false, message: 'WhatsApp not connected' });
    res.json({ connected: true, phoneNumber: cred.phone_number_id, businessName: cred.business_name, connectedAt: cred.connected_at });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/status', async (req: Request, res: Response) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: cred } = await sb.from('whatsapp_credentials').select('*').eq('tenant_id', tid).single();
    if (!cred) return res.json({ connected: false });
    res.json({ connected: true, phoneNumber: cred.phone_number_id, businessName: cred.business_name, connectedAt: cred.connected_at });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    await sb.from('whatsapp_credentials').delete().eq('tenant_id', tid);
    res.json({ ok: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export default router;
