import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from '../server/routes/auth.js';
import whatsappRoutes from '../server/routes/whatsapp.js';
import webhookRoutes from '../server/routes/webhooks.js';
import messageRoutes from '../server/routes/messages.js';
import ctwaRoutes from '../server/routes/ctwa.js';
import analyticsRoutes from '../server/routes/analytics.js';
import contactRoutes from '../server/routes/contacts.js';
import adminRoutes from '../server/routes/admin.js';
import crmRoutes from '../server/routes/crm.js';
import flowsRoutes from '../server/routes/flows.js';
import agentsRoutes from '../server/routes/agents.js';
import chatRoutes from '../server/routes/chat.js';
import voiceRoutes from '../server/routes/voice.js';
import salesRoutes from '../server/routes/sales.js';
import integrationsRoutes from '../server/routes/integrations.js';
import healthRoutes from '../server/routes/health.js';
import updatesRoutes from '../server/routes/updates.js';
import logsRoutes from '../server/routes/logs.js';
import plansRoutes from '../server/routes/plans.js';
import deployRoutes from '../server/routes/deploy.js';
import flowiseRoutes from '../server/routes/flowise.js';
import tagsRoutes from '../server/routes/tags.js';
import { authMiddleware } from '../server/middleware/auth.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/health', authMiddleware, healthRoutes);
app.use('/api/whatsapp', authMiddleware, whatsappRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/ctwa', authMiddleware, ctwaRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/contacts', authMiddleware, contactRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/crm', authMiddleware, crmRoutes);
app.use('/api/flows', authMiddleware, flowsRoutes);
app.use('/api/agents', authMiddleware, agentsRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/voice', authMiddleware, voiceRoutes);
app.use('/api/sales', authMiddleware, salesRoutes);
app.use('/api/integrations', authMiddleware, integrationsRoutes);
app.use('/api/updates', authMiddleware, updatesRoutes);
app.use('/api/logs', authMiddleware, logsRoutes);
app.use('/api/plans', authMiddleware, plansRoutes);
app.use('/api/deploy', authMiddleware, deployRoutes);
app.use('/api/flowise', authMiddleware, flowiseRoutes);
app.use('/api/tags', authMiddleware, tagsRoutes);

app.get('/api/ping', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
