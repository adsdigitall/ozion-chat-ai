import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import whatsappRoutes from './routes/whatsapp.js';
import webhookRoutes from './routes/webhooks.js';
import messageRoutes from './routes/messages.js';
import ctwaRoutes from './routes/ctwa.js';
import analyticsRoutes from './routes/analytics.js';
import contactRoutes from './routes/contacts.js';
import adminRoutes from './routes/admin.js';
import crmRoutes from './routes/crm.js';
import flowsRoutes from './routes/flows.js';
import agentsRoutes from './routes/agents.js';
import chatRoutes from './routes/chat.js';
import voiceRoutes from './routes/voice.js';
import salesRoutes from './routes/sales.js';
import integrationsRoutes from './routes/integrations.js';
import healthRoutes from './routes/health.js';
import updatesRoutes from './routes/updates.js';
import logsRoutes from './routes/logs.js';
import plansRoutes from './routes/plans.js';
import deployRoutes from './routes/deploy.js';
import { testConnection } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ctwa', ctwaRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/flows', flowsRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/updates', updatesRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/deploy', deployRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  const dbOk = await testConnection();
  if (!dbOk) { console.error('❌ Cannot start without database'); process.exit(1); }
  app.listen(PORT, () => {
    console.log(`🚀 Ozion Chat AI: http://localhost:${PORT}`);
  });
}

start();
