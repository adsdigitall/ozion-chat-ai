// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';

const router = Router();

// ─── List flows ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    let query = sb.from('flows').select('*').eq('tenant_id', tid);

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.folder_id) query = query.eq('folder_id', req.query.folder_id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── List folders ────────────────────────────────────────────
router.get('/folders', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data, error } = await sb.from('flow_folders').select('*').eq('tenant_id', tid).order('name');
    if (error) {
      if (error.message.includes('does not exist')) return res.json([]);
      throw error;
    }
    res.json(data || []);
  } catch (e: any) { res.json([]); }
});

// ─── Create folder ───────────────────────────────────────────
router.post('/folders', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = { id, tenant_id: tid, name: req.body.name, parent_id: req.body.parent_id || null, created_at: new Date().toISOString() };
    const { error } = await sb.from('flow_folders').insert(row);
    if (error) throw error;
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Delete folder ───────────────────────────────────────────
router.delete('/folders/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('flow_folders').delete().eq('id', req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Create flow ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const row = {
      id, tenant_id: tid,
      name: req.body.name,
      description: req.body.description || '',
      category: req.body.category || 'general',
      trigger: req.body.trigger || 'message_received',
      connection: req.body.connection || 'whatsapp_business',
      status: req.body.status || 'draft',
      is_active: req.body.is_active ?? false,
      folder_id: req.body.folder_id || null,
      keywords: req.body.keywords || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('flows').insert(row);
    if (error) throw error;
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Update flow ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const updates: any = { updated_at: new Date().toISOString() };
    const allowed = ['name', 'description', 'category', 'trigger', 'connection', 'status', 'is_active', 'folder_id', 'keywords'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const { error } = await sb.from('flows').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Delete flow ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('flow_edges').delete().eq('flow_id', req.params.id);
    await sb.from('flow_blocks').delete().eq('flow_id', req.params.id);
    await sb.from('flows').delete().eq('id', req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Toggle flow active/inactive ─────────────────────────────
router.post('/:id/toggle', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: flow } = await sb.from('flows').select('is_active').eq('id', req.params.id).single();
    const newState = !(flow?.is_active ?? false);
    const { error } = await sb.from('flows').update({ is_active: newState, updated_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true, is_active: newState });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Duplicate flow ──────────────────────────────────────────
router.post('/:id/duplicate', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { data: original } = await sb.from('flows').select('*').eq('id', req.params.id).single();
    if (!original) return res.status(404).json({ error: 'Flow not found' });

    const newId = crypto.randomUUID();
    const duplicate = {
      id: newId, tenant_id: tid,
      name: `${original.name} (Cópia)`,
      description: original.description,
      category: original.category,
      trigger: original.trigger,
      connection: original.connection,
      status: 'draft',
      is_active: false,
      folder_id: original.folder_id,
      keywords: original.keywords,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('flows').insert(duplicate);
    if (error) throw error;
    res.json(duplicate);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Export flow as JSON ─────────────────────────────────────
router.get('/:id/export', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: flow } = await sb.from('flows').select('*').eq('id', req.params.id).single();
    if (!flow) return res.status(404).json({ error: 'Flow not found' });

    const { data: blocks } = await sb.from('flow_blocks').select('*').eq('flow_id', req.params.id);
    const { data: edges } = await sb.from('flow_edges').select('*').eq('flow_id', req.params.id);

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      flow: { name: flow.name, description: flow.description, trigger: flow.trigger, connection: flow.connection, category: flow.category },
      blocks: (blocks || []).map(b => ({ ...b, config: JSON.parse(b.config || '{}') })),
      edges: edges || []
    };

    res.setHeader('Content-Disposition', `attachment; filename="${flow.name || 'flow'}.json"`);
    res.json(exportData);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Import flow from JSON ───────────────────────────────────
router.post('/import', async (req, res) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const sb = getSupabase();
    const { flow: flowData, blocks, edges } = req.body;

    const id = crypto.randomUUID();
    const row = {
      id, tenant_id: tid,
      name: flowData?.name || 'Fluxo Importado',
      description: flowData?.description || '',
      category: flowData?.category || 'general',
      trigger: flowData?.trigger || 'message_received',
      connection: flowData?.connection || 'whatsapp_business',
      status: 'draft',
      is_active: false,
      folder_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('flows').insert(row);
    if (error) throw error;

    if (blocks?.length) {
      const blocksInsert = blocks.map((b: any) => ({
        id: crypto.randomUUID(), flow_id: id,
        type: b.type, label: b.label,
        position_x: b.position_x || 0, position_y: b.position_y || 0,
        config: JSON.stringify(b.config || {}),
        created_at: new Date().toISOString()
      }));
      await sb.from('flow_blocks').insert(blocksInsert);
    }

    if (edges?.length) {
      const edgesInsert = edges.map((e: any) => ({
        id: crypto.randomUUID(), flow_id: id,
        source_block: e.source_block, target_block: e.target_block,
        label: e.label || ''
      }));
      await sb.from('flow_edges').insert(edgesInsert);
    }

    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Bulk operations ─────────────────────────────────────────
router.post('/bulk', async (req, res) => {
  try {
    const sb = getSupabase();
    const { action, ids, folder_id } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'No IDs provided' });

    switch (action) {
      case 'activate':
        await sb.from('flows').update({ is_active: true, updated_at: new Date().toISOString() }).in('id', ids);
        break;
      case 'deactivate':
        await sb.from('flows').update({ is_active: false, updated_at: new Date().toISOString() }).in('id', ids);
        break;
      case 'delete':
        for (const id of ids) {
          await sb.from('flow_edges').delete().eq('flow_id', id);
          await sb.from('flow_blocks').delete().eq('flow_id', id);
        }
        await sb.from('flows').delete().in('id', ids);
        break;
      case 'move':
        await sb.from('flows').update({ folder_id: folder_id || null, updated_at: new Date().toISOString() }).in('id', ids);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    res.json({ ok: true, affected: ids.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Get flow blocks ─────────────────────────────────────────
router.get('/:id/blocks', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('flow_blocks').select('*').eq('flow_id', req.params.id);
    if (error) throw error;
    res.json((data || []).map((b: any) => ({ ...b, config: JSON.parse(b.config || '{}') })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Add block ───────────────────────────────────────────────
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

// ─── Get flow edges ──────────────────────────────────────────
router.get('/:id/edges', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('flow_edges').select('*').eq('flow_id', req.params.id);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
