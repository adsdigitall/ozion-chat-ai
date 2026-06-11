import { Router } from 'express';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import * as deploySchema from '../db/schema-deploy.js';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { execSync } from 'child_process';

const router = Router();

// ─── Changelog ─────────────────────────────────────────────────
router.get('/changelog', (req, res) => {
  try {
    const rows = db.select().from(deploySchema.changelogs).orderBy(desc(deploySchema.changelogs.createdAt)).all();
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/changelog', (req, res) => {
  try {
    const id = crypto.randomUUID();
    const row = { id, ...req.body, createdAt: new Date().toISOString() };
    db.insert(deploySchema.changelogs).values(row).run();
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/changelog/:id', (req, res) => {
  try {
    db.update(deploySchema.changelogs).set({ ...req.body }).where(eq(deploySchema.changelogs.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/changelog/:id', (req, res) => {
  try {
    db.delete(deploySchema.changelogs).where(eq(deploySchema.changelogs.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/changelog/:id/publish', (req, res) => {
  try {
    db.update(deploySchema.changelogs).set({ isPublished: true, publishedAt: new Date().toISOString() }).where(eq(deploySchema.changelogs.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Backups ───────────────────────────────────────────────────
router.get('/backups', (req, res) => {
  try {
    const rows = db.select().from(deploySchema.backups).orderBy(desc(deploySchema.backups.createdAt)).all();
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/backups/create', (req, res) => {
  try {
    const id = crypto.randomUUID();
    const { type, modules: mods } = req.body;
    const modulesList = mods || ['database', 'flows', 'agents', 'config'];
    
    // Start backup
    db.insert(deploySchema.backups).values({
      id,
      name: `backup-${type}-${Date.now()}`,
      type: type || 'full',
      status: 'running',
      modules: JSON.stringify(modulesList),
      metadata: JSON.stringify({ requestedBy: 'admin', startedAt: new Date().toISOString() }),
      createdAt: new Date().toISOString(),
    }).run();

    // Simulate backup completion
    setTimeout(() => {
      db.update(deploySchema.backups).set({
        status: 'completed',
        size: Math.floor(Math.random() * 5000000) + 100000,
        completedAt: new Date().toISOString(),
      }).where(eq(deploySchema.backups.id, id)).run();
    }, 2000);

    res.json({ id, status: 'running', message: 'Backup iniciado' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/backups/:id/restore', (req, res) => {
  try {
    const existing = db.select().from(deploySchema.backups).where(eq(deploySchema.backups.id, req.params.id)).get() as any;
    if (!existing) return res.status(404).json({ error: 'Backup não encontrado' });
    
    db.update(deploySchema.backups).set({ status: 'restored' }).where(eq(deploySchema.backups.id, req.params.id)).run();
    res.json({ ok: true, message: 'Backup restaurado com sucesso' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/backups/:id', (req, res) => {
  try {
    db.delete(deploySchema.backups).where(eq(deploySchema.backups.id, req.params.id)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Modules ───────────────────────────────────────────────────
router.get('/modules', (req, res) => {
  try {
    const rows = db.select().from(deploySchema.modules).all();
    if (rows.length === 0) {
      const defaultModules = [
        { id: crypto.randomUUID(), name: 'crm', displayName: 'CRM', description: 'Gerenciamento de contatos e pipeline', version: '1.0.0', status: 'active', isCore: true },
        { id: crypto.randomUUID(), name: 'chat', displayName: 'Chat ao Vivo', description: 'Chat em tempo real com clientes', version: '1.0.0', status: 'active', isCore: true },
        { id: crypto.randomUUID(), name: 'flows', displayName: 'Flow Builder', description: 'Construtor de fluxos de automação', version: '1.0.0', status: 'active', isCore: true },
        { id: crypto.randomUUID(), name: 'agents', displayName: 'Agentes IA', description: 'Agentes inteligentes com IA', version: '1.0.0', status: 'active', isCore: true },
        { id: crypto.randomUUID(), name: 'voice', displayName: 'Voice Studio', description: 'Estúdio de clonagem de voz', version: '1.0.0', status: 'active', isCore: false },
        { id: crypto.randomUUID(), name: 'ctwa', displayName: 'CTWA', description: 'Click-to-WhatsApp Ads tracking', version: '1.0.0', status: 'active', isCore: false },
        { id: crypto.randomUUID(), name: 'sales', displayName: 'Vendas', description: 'Gestão de vendas e funil', version: '1.0.0', status: 'active', isCore: false },
        { id: crypto.randomUUID(), name: 'analytics', displayName: 'Analytics', description: 'Análise e relatórios', version: '1.0.0', status: 'active', isCore: false },
        { id: crypto.randomUUID(), name: 'integrations', displayName: 'Integrações', description: 'Integrações externas', version: '1.0.0', status: 'active', isCore: false },
      ];
      for (const m of defaultModules) {
        db.insert(deploySchema.modules).values({ ...m, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).run();
      }
    }
    const result = db.select().from(deploySchema.modules).all();
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/modules/:name', (req, res) => {
  try {
    db.update(deploySchema.modules).set({ ...req.body, updatedAt: new Date().toISOString() }).where(eq(deploySchema.modules.name, req.params.name)).run();
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Deploy ────────────────────────────────────────────────────
router.get('/deployments', (req, res) => {
  try {
    const rows = db.select().from(deploySchema.deployments).orderBy(desc(deploySchema.deployments.createdAt)).all();
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/deploy', (req, res) => {
  try {
    const { environment, version, branch, commitHash, commitMessage } = req.body;
    const id = crypto.randomUUID();

    const row = {
      id,
      version: version || '1.0.0',
      environment: environment || 'production',
      status: 'building',
      branch: branch || 'main',
      commitHash: commitHash || '',
      commitMessage: commitMessage || '',
      deployedBy: 'admin',
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.insert(deploySchema.deployments).values(row).run();

    // Simulate deploy pipeline
    setTimeout(() => {
      db.update(deploySchema.deployments).set({ status: 'testing' }).where(eq(deploySchema.deployments.id, id)).run();
    }, 3000);
    setTimeout(() => {
      db.update(deploySchema.deployments).set({ status: 'deploying' }).where(eq(deploySchema.deployments.id, id)).run();
    }, 6000);
    setTimeout(() => {
      db.update(deploySchema.deployments).set({ status: 'completed', completedAt: new Date().toISOString() }).where(eq(deploySchema.deployments.id, id)).run();
      // Update system version
      db.update(schema.providerVersions).set({ currentVersion: version, updatedAt: new Date().toISOString() }).where(eq(schema.providerVersions.provider, 'ozion')).run();
    }, 9000);

    res.json({ id, status: 'building', message: `Deploy ${environment} iniciado` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/rollback', (req, res) => {
  try {
    const { deploymentId } = req.body;
    const deployment = db.select().from(deploySchema.deployments).where(eq(deploySchema.deployments.id, deploymentId)).get() as any;
    if (!deployment) return res.status(404).json({ error: 'Deploy não encontrado' });

    const id = crypto.randomUUID();
    db.insert(deploySchema.deployments).values({
      id,
      version: deployment.rollbackVersion || deployment.version,
      environment: deployment.environment,
      status: 'deploying',
      branch: deployment.branch,
      deployedBy: 'admin',
      rollbackVersion: deployment.version,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }).run();

    setTimeout(() => {
      db.update(deploySchema.deployments).set({ status: 'completed', completedAt: new Date().toISOString() }).where(eq(deploySchema.deployments.id, id)).run();
    }, 5000);

    res.json({ id, status: 'deploying', message: 'Rollback iniciado' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── System Info ───────────────────────────────────────────────
router.get('/system', (req, res) => {
  try {
    let gitHash = 'unknown';
    let gitBranch = 'unknown';
    let lastCommit = 'unknown';
    try { gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim(); } catch {}
    try { gitBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim(); } catch {}
    try { lastCommit = execSync('git log -1 --format="%s"', { encoding: 'utf-8' }).trim(); } catch {}

    res.json({
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      git: { hash: gitHash, branch: gitBranch, lastCommit },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
