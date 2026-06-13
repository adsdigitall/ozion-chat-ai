import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import whatsappRoutes from './routes/whatsapp.js';
import webhookRoutes from './routes/webhooks.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import crmRoutes from './routes/crm.js';
import agentsRoutes from './routes/agents.js';
import chatRoutes from './routes/chat.js';
import voiceRoutes from './routes/voice.js';
import salesRoutes from './routes/sales.js';
import healthRoutes from './routes/health.js';
import tagsRoutes from './routes/tags.js';
import plansRoutes from './routes/plans.js';
import integrationsRoutes from './routes/integrations.js';
import ctwaRoutes from './routes/ctwa.js';
import analyticsRoutes from './routes/analytics.js';
import contactRoutes from './routes/contacts.js';
import flowsRoutes from './routes/flows.js';
import deployRoutes from './routes/deploy.js';
import flowiseRoutes from './routes/flowise.js';
import updatesRoutes from './routes/updates.js';
import logsRoutes from './routes/logs.js';
import { getSupabase } from './db/supabase.js';
import { authMiddleware } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// Public
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);

// Protected
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

// Ping
app.get('/api/ping', (_req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('tenants').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connected');
  } catch (error: any) {
    console.error('⚠️ Supabase:', error.message);
  }
  app.listen(PORT, () => {
    console.log(`🚀 Ozion: http://localhost:${PORT}`);
  });
}

start();
