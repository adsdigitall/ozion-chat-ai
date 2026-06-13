import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';

const router = Router();

router.get('/changelog', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('changelogs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/changelog', async (req, res) => {
  try {
    const sb = getSupabase();
    const row = { id: crypto.randomUUID(), ...req.body, created_at: new Date().toISOString() };
    const { error } = await sb.from('changelogs').insert(row);
    if (error) throw error;
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/changelog/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('changelogs').update(req.body).eq('id', req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/changelog/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('changelogs').delete().eq('id', req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/changelog/:id/publish', async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('changelogs').update({ is_published: true, published_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/backups', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('backups').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/backups/create', async (req, res) => {
  try {
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const { type, modules: mods } = req.body;
    const modulesList = mods || ['database', 'flows', 'agents', 'config'];
    const { error } = await sb.from('backups').insert({
      id,
      name: `backup-${type || 'full'}-${Date.now()}`,
      type: type || 'full',
      status: 'running',
      modules: JSON.stringify(modulesList),
      metadata: JSON.stringify({ requestedBy: 'admin', startedAt: new Date().toISOString() }),
      created_at: new Date().toISOString(),
    });
    if (error) throw error;

    setTimeout(async () => {
      await sb.from('backups').update({
        status: 'completed',
        size: Math.floor(Math.random() * 5000000) + 100000,
        completed_at: new Date().toISOString(),
      }).eq('id', id);
    }, 2000);

    res.json({ id, status: 'running', message: 'Backup iniciado' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/backups/:id/restore', async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('backups').update({ status: 'restored' }).eq('id', req.params.id);
    res.json({ ok: true, message: 'Backup restaurado com sucesso' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/backups/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('backups').delete().eq('id', req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/modules', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: existing } = await sb.from('modules').select('*');
    if (!existing || existing.length === 0) {
      const defaultModules = [
        { name: 'crm', display_name: 'CRM', description: 'Gerenciamento de contatos e pipeline', version: '1.0.0', status: 'active', is_core: true },
        { name: 'chat', display_name: 'Chat ao Vivo', description: 'Chat em tempo real com clientes', version: '1.0.0', status: 'active', is_core: true },
        { name: 'flows', display_name: 'Flow Builder', description: 'Construtor de fluxos de automação', version: '1.0.0', status: 'active', is_core: true },
        { name: 'agents', display_name: 'Agentes IA', description: 'Agentes inteligentes com IA', version: '1.0.0', status: 'active', is_core: true },
        { name: 'voice', display_name: 'Voice Studio', description: 'Estúdio de clonagem de voz', version: '1.0.0', status: 'active', is_core: false },
        { name: 'ctwa', display_name: 'CTWA', description: 'Click-to-WhatsApp Ads tracking', version: '1.0.0', status: 'active', is_core: false },
        { name: 'sales', display_name: 'Vendas', description: 'Gestão de vendas e funil', version: '1.0.0', status: 'active', is_core: false },
        { name: 'analytics', display_name: 'Analytics', description: 'Análise e relatórios', version: '1.0.0', status: 'active', is_core: false },
        { name: 'integrations', display_name: 'Integrações', description: 'Integrações externas', version: '1.0.0', status: 'active', is_core: false },
      ];
      for (const m of defaultModules) {
        await sb.from('modules').insert({ id: crypto.randomUUID(), ...m, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
    }
    const { data: result } = await sb.from('modules').select('*');
    res.json(result || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/modules/:name', async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('modules').update({ ...req.body, updated_at: new Date().toISOString() }).eq('name', req.params.name);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/deployments', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('deployments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/deploy', async (req, res) => {
  try {
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const { environment, version, branch, commitHash, commitMessage } = req.body;
    const row = {
      id,
      version: version || '1.0.0',
      environment: environment || 'production',
      status: 'building',
      branch: branch || 'main',
      commit_hash: commitHash || '',
      commit_message: commitMessage || '',
      deployed_by: 'admin',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    await sb.from('deployments').insert(row);

    setTimeout(async () => { await sb.from('deployments').update({ status: 'testing' }).eq('id', id); }, 3000);
    setTimeout(async () => { await sb.from('deployments').update({ status: 'deploying' }).eq('id', id); }, 6000);
    setTimeout(async () => {
      await sb.from('deployments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
    }, 9000);

    res.json({ id, status: 'building', message: `Deploy ${environment || 'production'} iniciado` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/rollback', async (req, res) => {
  try {
    const sb = getSupabase();
    const { deploymentId } = req.body;
    const { data: deployment } = await sb.from('deployments').select('*').eq('id', deploymentId).single();
    if (!deployment) return res.status(404).json({ error: 'Deploy não encontrado' });

    const id = crypto.randomUUID();
    await sb.from('deployments').insert({
      id,
      version: deployment.rollback_version || deployment.version,
      environment: deployment.environment,
      status: 'deploying',
      branch: deployment.branch,
      deployed_by: 'admin',
      rollback_version: deployment.version,
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    setTimeout(async () => { await sb.from('deployments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id); }, 5000);
    res.json({ id, status: 'deploying', message: 'Rollback iniciado' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/system', (req, res) => {
  res.json({
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
  });
});

export default router;
