// @ts-nocheck
import { Router, Request, Response } from 'express';
import { getSupabase } from '../db/supabase.js';

const router = Router();

function tenantId(req: Request): string {
  return req.headers['x-tenant-id'] as string || 'default';
}

// GET /api/ctwa/campaigns - List CTWA campaigns with stats
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const sb = getSupabase();

    const { data: attributions } = await sb.from('ctwa_attributions')
      .select('campaign_id, adset_id, ad_id, creative_id, lead_qualified_at, purchase_at')
      .eq('tenant_id', tid);

    const { data: sales } = await sb.from('sales')
      .select('campaign_id, amount, status')
      .eq('tenant_id', tid)
      .eq('is_ctwa', true);

    // Group by campaign
    const campaignMap: Record<string, any> = {};
    (attributions || []).forEach((a: any) => {
      const key = a.campaign_id || 'unknown';
      if (!campaignMap[key]) {
        campaignMap[key] = { campaign_id: key, adset_id: a.adset_id, ad_id: a.ad_id, creative_id: a.creative_id, clicks: 0, leads: 0, purchases: 0, revenue: 0 };
      }
      campaignMap[key].clicks++;
      if (a.lead_qualified_at) campaignMap[key].leads++;
      if (a.purchase_at) campaignMap[key].purchases++;
    });

    // Add sales revenue
    (sales || []).forEach((s: any) => {
      const key = s.campaign_id || 'unknown';
      if (campaignMap[key] && s.status === 'approved') {
        campaignMap[key].revenue += s.amount || 0;
      }
    });

    const campaigns = Object.values(campaignMap).map(c => ({
      ...c,
      cpa: c.leads > 0 ? (c.revenue / c.leads) : 0,
    }));

    res.json({ campaigns });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ctwa/analytics - CTWA summary stats
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const sb = getSupabase();

    const { data: ctwa } = await sb.from('ctwa_attributions')
      .select('lead_qualified_at, purchase_at')
      .eq('tenant_id', tid);

    const { data: sales } = await sb.from('sales')
      .select('amount, status')
      .eq('tenant_id', tid)
      .eq('is_ctwa', true);

    const totalClicks = (ctwa || []).length;
    const leads = (ctwa || []).filter((c: any) => c.lead_qualified_at).length;
    const purchases = (ctwa || []).filter((c: any) => c.purchase_at).length;
    const revenue = (sales || []).filter((s: any) => s.status === 'approved').reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
    const cpa = leads > 0 ? (revenue / leads) : 0;
    const roas = cpa > 0 ? (revenue / cpa) : 0;

    res.json({
      summary: { totalClicks, leads, purchases, revenue, cpa, roas },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ctwa/attributions - List all attributions
router.get('/attributions', async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const limit = parseInt(req.query.limit as string) || 100;
    const sb = getSupabase();

    const { data, error } = await sb.from('ctwa_attributions')
      .select('*')
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ attributions: data || [], total: (data || []).length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ctwa/conversion - Send conversion event to Meta CAPI
router.post('/conversion', async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { ctwa_clid, event_name, currency, value, phone, email } = req.body;

    if (!ctwa_clid || !event_name) {
      return res.status(400).json({ error: 'ctwa_clid and event_name required' });
    }

    const sb = getSupabase();

    // Get attribution
    const { data: attribution } = await sb.from('ctwa_attributions')
      .select('*')
      .eq('ctwa_clid', ctwa_clid)
      .single();

    if (!attribution) {
      return res.status(404).json({ error: 'CTWA attribution not found' });
    }

    // Get WhatsApp credentials for waba_id
    const { data: cred } = await sb.from('whatsapp_credentials')
      .select('waba_id')
      .eq('tenant_id', tid)
      .single();

    // Get Meta CAPI config from integrations
    const { data: integration } = await sb.from('integrations')
      .select('*')
      .eq('tenant_id', tid)
      .eq('provider', 'meta')
      .single();

    if (!integration || !integration.settings) {
      return res.status(400).json({ error: 'Meta integration not configured. Set dataset_id and access_token.' });
    }

    const settings = JSON.parse(integration.settings || '{}');
    const datasetId = settings.dataset_id;
    const accessToken = settings.capi_access_token || integration.credentials;

    if (!datasetId || !accessToken) {
      return res.status(400).json({ error: 'Missing dataset_id or capi_access_token in Meta integration settings' });
    }

    // Build user_data
    const userData: any = {
      ctwa_clid: ctwa_clid,
    };
    if (cred?.waba_id) userData.whatsapp_business_account_id = cred.waba_id;
    if (phone) userData.ph = phone;
    if (email) userData.em = email;

    // Build custom_data
    const customData: any = {};
    if (currency) customData.currency = currency;
    if (value) customData.value = value;

    // Send to Meta CAPI
    const payload = {
      data: [{
        event_name: event_name,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'business_messaging',
        messaging_channel: 'whatsapp',
        event_id: `${ctwa_clid}-${event_name}-${Date.now()}`,
        user_data: userData,
        ...(Object.keys(customData).length > 0 && { custom_data: customData }),
      }],
    };

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${datasetId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta CAPI error:', result);
      return res.status(500).json({ error: 'Failed to send conversion to Meta', details: result });
    }

    // Update attribution
    await sb.from('ctwa_attributions')
      .update({
        conversion_sent_to_meta: true,
        conversion_event_name: event_name,
        conversion_event_time: new Date().toISOString(),
      })
      .eq('ctwa_clid', ctwa_clid);

    res.json({ success: true, events_received: result.events_received, messages: result.messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ctwa/conversion/batch - Send multiple conversion events
router.post('/conversion/batch', async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { events } = req.body; // Array of { ctwa_clid, event_name, currency, value }

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'events array required' });
    }

    const sb = getSupabase();

    // Get Meta CAPI config
    const { data: integration } = await sb.from('integrations')
      .select('*')
      .eq('tenant_id', tid)
      .eq('provider', 'meta')
      .single();

    if (!integration) {
      return res.status(400).json({ error: 'Meta integration not configured' });
    }

    const settings = JSON.parse(integration.settings || '{}');
    const datasetId = settings.dataset_id;
    const accessToken = settings.capi_access_token || integration.credentials;

    if (!datasetId || !accessToken) {
      return res.status(400).json({ error: 'Missing dataset_id or capi_access_token' });
    }

    // Get waba_id
    const { data: cred } = await sb.from('whatsapp_credentials')
      .select('waba_id')
      .eq('tenant_id', tid)
      .single();

    // Build events array
    const capiEvents = [];
    for (const event of events) {
      const userData: any = { ctwa_clid: event.ctwa_clid };
      if (cred?.waba_id) userData.whatsapp_business_account_id = cred.waba_id;

      const customData: any = {};
      if (event.currency) customData.currency = event.currency;
      if (event.value) customData.value = event.value;

      capiEvents.push({
        event_name: event.event_name,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'business_messaging',
        messaging_channel: 'whatsapp',
        event_id: `${event.ctwa_clid}-${event.event_name}-${Date.now()}`,
        user_data: userData,
        ...(Object.keys(customData).length > 0 && { custom_data: customData }),
      });
    }

    // Send batch to Meta CAPI
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${datasetId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: capiEvents }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'Batch CAPI failed', details: result });
    }

    // Update attributions
    for (const event of events) {
      await sb.from('ctwa_attributions')
        .update({
          conversion_sent_to_meta: true,
          conversion_event_name: event.event_name,
          conversion_event_time: new Date().toISOString(),
        })
        .eq('ctwa_clid', event.ctwa_clid);
    }

    res.json({ success: true, events_sent: events.length, events_received: result.events_received });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
