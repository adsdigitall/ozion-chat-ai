// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { createInstance, getInstanceState, getQRCode, deleteInstance } from '../services/evolution-api.js';
import crypto from 'crypto';

const router = Router();

// GET /api/conexoes - List all connections for tenant
router.get('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('whatsapp_credentials').select('*').eq('tenant_id', tid).order('created_at', { ascending: false });
    if (error) throw error;

    const connections = (data || []).map(c => ({
      id: c.id,
      name: c.instance_name || c.business_name || 'Sem nome',
      phone_number: c.display_phone_number || c.phone_number_id || '',
      provider: c.provider || 'meta',
      status: c.provider === 'evolution' ? (c.instance_name ? 'pending' : 'disconnected') : (c.phone_number_id ? 'connected' : 'disconnected'),
      instance_name: c.instance_name || '',
      business_name: c.business_name || '',
      waba_id: c.waba_id || '',
      created_at: c.created_at,
      connected_at: c.connected_at,
    }));

    res.json(connections);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/conexoes - Create new connection
router.post('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const { name, provider } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome da conexão é obrigatório' });

    const sb = getSupabase();
    const id = crypto.randomUUID();
    const instanceName = `ozion_${tid}_${Date.now()}`;

    const connection = {
      id,
      tenant_id: tid,
      instance_name: instanceName,
      provider: provider || 'evolution',
      business_name: name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Create instance on Evolution API if evolution provider
    if (connection.provider === 'evolution') {
      const result = await createInstance(instanceName, '');
      if (result.error && !result.instance) {
        // Still create local record even if Evolution fails
        console.warn('Evolution API createInstance warning:', result.error);
      }
    }

    const { data, error } = await sb.from('whatsapp_credentials').insert(connection).select().single();
    if (error) throw error;

    res.json({
      id: data.id,
      name: data.instance_name || data.business_name,
      provider: data.provider,
      status: 'pending',
      instance_name: data.instance_name,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/conexoes/:id - Get connection details
router.get('/:id', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('whatsapp_credentials').select('*').eq('id', req.params.id).eq('tenant_id', tid).single();
    if (error) return res.status(404).json({ error: 'Conexão não encontrada' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/conexoes/:id - Update connection
router.put('/:id', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const { name } = req.body;
    const sb = getSupabase();
    const { data, error } = await sb.from('whatsapp_credentials').update({
      business_name: name,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id).eq('tenant_id', tid).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/conexoes/:id - Delete connection
router.delete('/:id', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();

    const { data: cred } = await sb.from('whatsapp_credentials').select('*').eq('id', req.params.id).eq('tenant_id', tid).single();
    if (!cred) return res.status(404).json({ error: 'Conexão não encontrada' });

    // Delete Evolution instance if evolution provider
    if (cred.provider === 'evolution' && cred.instance_name) {
      await deleteInstance(cred.instance_name).catch(e => console.warn('Evolution delete warning:', e));
    }

    const { error } = await sb.from('whatsapp_credentials').delete().eq('id', req.params.id).eq('tenant_id', tid);
    if (error) throw error;

    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/conexoes/:id/connect - Get QR code for connection
router.post('/:id/connect', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: cred } = await sb.from('whatsapp_credentials').select('*').eq('id', req.params.id).eq('tenant_id', tid).single();
    if (!cred) return res.status(404).json({ error: 'Conexão não encontrada' });

    if (cred.provider !== 'evolution') {
      return res.status(400).json({ error: 'Apenas conexões Evolution suportam QR Code' });
    }

    const qrResult = await getQRCode(cred.instance_name);
    if (qrResult.error) throw new Error(qrResult.error);

    res.json({ qrcode: qrResult.qrcode || qrResult.base64 || '', pair_code: qrResult.code || '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/conexoes/:id/disconnect - Disconnect connection
router.post('/:id/disconnect', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: cred } = await sb.from('whatsapp_credentials').select('*').eq('id', req.params.id).eq('tenant_id', tid).single();
    if (!cred) return res.status(404).json({ error: 'Conexão não encontrada' });

    if (cred.provider === 'evolution' && cred.instance_name) {
      await deleteInstance(cred.instance_name);
      // Re-create empty instance for future reconnection
      await createInstance(cred.instance_name, '').catch(e => console.warn(e));
    }

    await sb.from('whatsapp_credentials').update({
      connected_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/conexoes/:id/restart - Restart connection
router.post('/:id/restart', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: cred } = await sb.from('whatsapp_credentials').select('*').eq('id', req.params.id).eq('tenant_id', tid).single();
    if (!cred) return res.status(404).json({ error: 'Conexão não encontrada' });

    if (cred.provider === 'evolution' && cred.instance_name) {
      await deleteInstance(cred.instance_name);
      const result = await createInstance(cred.instance_name, '');
      if (result.error) throw new Error(result.error);
    }

    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/conexoes/:id/credentials - Get connection credentials
router.get('/:id/credentials', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: cred } = await sb.from('whatsapp_credentials').select('*').eq('id', req.params.id).eq('tenant_id', tid).single();
    if (!cred) return res.status(404).json({ error: 'Conexão não encontrada' });

    const evolutionApiUrl = process.env.EVOLUTION_API_URL || '';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY || '';

    res.json({
      provider: cred.provider,
      instance_name: cred.instance_name,
      api_url: cred.provider === 'evolution' ? `${evolutionApiUrl}/instance/${cred.instance_name}` : '',
      api_token: cred.provider === 'evolution' ? evolutionApiKey : cred.access_token_encrypted || '',
      waba_id: cred.waba_id || '',
      phone_number_id: cred.phone_number_id || '',
      business_name: cred.business_name || '',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/conexoes/:id/check-status - Check live connection status
router.post('/:id/check-status', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: cred } = await sb.from('whatsapp_credentials').select('*').eq('id', req.params.id).eq('tenant_id', tid).single();
    if (!cred) return res.status(404).json({ error: 'Conexão não encontrada' });

    let status = 'disconnected';
    let state = '';

    if (cred.provider === 'evolution' && cred.instance_name) {
      const result = await getInstanceState(cred.instance_name);
      state = result?.state?.state || result?.instance?.state || '';
      status = state === 'open' ? 'connected' : 'disconnected';

      if (status === 'connected' && !cred.connected_at) {
        await sb.from('whatsapp_credentials').update({
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', req.params.id);
      }
    } else if (cred.phone_number_id) {
      status = 'connected';
    }

    res.json({ status, state, provider: cred.provider });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
