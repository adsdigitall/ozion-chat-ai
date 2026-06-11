import { initDatabase } from './server/db/index.js';
import { db } from './server/db/index.js';
import * as schema from './server/db/schema.js';
import crypto from 'crypto';

initDatabase();

const TENANT_ID = 'default';
const now = new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

// Plans
const plans = [
  { id: 'plan-start', name: 'Start', slug: 'start', description: 'Para quem está começando', price: 97, maxContacts: 1000, maxFlows: 5, maxWorkspaces: 1, maxPhoneNumbers: 1, maxAgents: 1, maxVoices: 1, maxExecutions: 5000, maxTokens: 100000, maxUsers: 1, maxIntegrations: 2, features: JSON.stringify(['WhatsApp', 'CRM', '1 Agente IA', '5 Fluxos', 'Analytics básico']) },
  { id: 'plan-pro', name: 'Pro', slug: 'pro', description: 'Para negócios em crescimento', price: 297, maxContacts: 10000, maxFlows: 50, maxWorkspaces: 3, maxPhoneNumbers: 5, maxAgents: 10, maxVoices: 10, maxExecutions: 50000, maxTokens: 1000000, maxUsers: 5, maxIntegrations: 10, features: JSON.stringify(['Tudo do Start', '50 Fluxos', '10 Agentes IA', 'Voice Studio', 'CTWA', 'Analytics avançado', 'Vendas']) },
  { id: 'plan-scale', name: 'Scale', slug: 'scale', description: 'Para operações grandes', price: 797, maxContacts: 100000, maxFlows: 999, maxWorkspaces: 10, maxPhoneNumbers: 20, maxAgents: 50, maxVoices: 50, maxExecutions: 500000, maxTokens: 10000000, maxUsers: 20, maxIntegrations: 30, features: JSON.stringify(['Tudo do Pro', 'Ilimitado', 'White-label', 'API completa', 'Suporte prioritário']) },
  { id: 'plan-enterprise', name: 'Enterprise', slug: 'enterprise', description: 'Sob medida para empresas', price: 2997, maxContacts: 999999, maxFlows: 999, maxWorkspaces: 999, maxPhoneNumbers: 999, maxAgents: 999, maxVoices: 999, maxExecutions: 999999, maxTokens: 999999999, maxUsers: 999, maxIntegrations: 999, features: JSON.stringify(['Tudo', 'Dedicado', 'SLA 99.9%', 'Infra dedicada']) },
];

// Tags
const tagData = [
  { id: 'tag-novo', name: 'Novo Lead', color: '#3b82f6', isSystem: true },
  { id: 'tag-interessado', name: 'Interessado', color: '#f59e0b', isSystem: true },
  { id: 'tag-qualificado', name: 'Qualificado', color: '#10b981', isSystem: true },
  { id: 'tag-pix', name: 'Pix Enviado', color: '#8b5cf6', isSystem: true },
  { id: 'tag-aguardando', name: 'Aguardando Pagamento', color: '#f97316', isSystem: true },
  { id: 'tag-pagou', name: 'Pagou', color: '#22c55e', isSystem: true },
  { id: 'tag-perdido', name: 'Perdido', color: '#ef4444', isSystem: true },
  { id: 'tag-risco', name: 'Risco', color: '#dc2626', isSystem: true },
];

// Risk words
const riskWords = ['golpe', 'fraude', 'denúncia', 'processo', 'reclame aqui', 'spam', 'abuso', 'problema'];

// System health
const healthComponents = [
  { component: 'meta-cloud-api', status: 'online' },
  { component: 'webhooks-whatsapp', status: 'online' },
  { component: 'openai', status: 'online' },
  { component: 'elevenlabs', status: 'online' },
  { component: 'utmify', status: 'online' },
  { component: 'kiwify', status: 'online' },
  { component: 'hotmart', status: 'online' },
  { component: 'asaas', status: 'online' },
  { component: 'mercadopago', status: 'online' },
  { component: 'stripe', status: 'online' },
  { component: 'database', status: 'online' },
  { component: 'storage', status: 'online' },
  { component: 'queues', status: 'online' },
  { component: 'auth', status: 'online' },
  { component: 'webhooks', status: 'online' },
];

// Contacts
const contactData = [
  { id: 'c-001', name: 'Ana Silva', phone: '5511999991111', email: 'ana@email.com', tags: '["lead-quente","interessado"]', leadSource: 'ctwa', leadStatus: 'qualified', leadScore: 85, leadTemperature: 'quente' },
  { id: 'c-002', name: 'Carlos Oliveira', phone: '5511999992222', email: 'carlos@email.com', tags: '["lead-frio"]', leadSource: 'ctwa', leadStatus: 'new', leadScore: 30, leadTemperature: 'frio' },
  { id: 'c-003', name: 'Beatriz Costa', phone: '5511999995555', email: 'beatriz@email.com', tags: '["lead-quente","qualificado"]', leadSource: 'ctwa', leadStatus: 'qualified', leadScore: 92, leadTemperature: 'quente' },
  { id: 'c-004', name: 'Maria Santos', phone: '5511999993333', email: 'maria@email.com', tags: '["cliente","recorrente"]', leadSource: 'whatsapp', leadStatus: 'customer', leadScore: 98, leadTemperature: 'quente' },
  { id: 'c-005', name: 'João Pereira', phone: '5511999994444', email: 'joao@email.com', tags: '["lead-morno"]', leadSource: 'organic', leadStatus: 'contacted', leadScore: 55, leadTemperature: 'morno' },
  { id: 'c-006', name: 'Fernanda Lima', phone: '5511999996666', email: 'fernanda@email.com', tags: '["lead-quente"]', leadSource: 'ctwa', leadStatus: 'new', leadScore: 78, leadTemperature: 'quente' },
  { id: 'c-007', name: 'Pedro Santos', phone: '5511999997777', email: 'pedro@email.com', tags: '["lead-frio","novo"]', leadSource: 'whatsapp', leadStatus: 'new', leadScore: 15, leadTemperature: 'frio' },
  { id: 'c-008', name: 'Juliana Costa', phone: '5511999998888', email: 'juliana@email.com', tags: '["lead-morno"]', leadSource: 'organic', leadStatus: 'contacted', leadScore: 45, leadTemperature: 'morno' },
  { id: 'c-009', name: 'Roberto Almeida', phone: '5511999999999', email: 'roberto@email.com', tags: '["cliente","vip"]', leadSource: 'ctwa', leadStatus: 'customer', leadScore: 99, leadTemperature: 'quente' },
  { id: 'c-010', name: 'Lucia Ferreira', phone: '5511888887777', email: 'lucia@email.com', tags: '["lead-quente","urgente"]', leadSource: 'ctwa', leadStatus: 'qualified', leadScore: 88, leadTemperature: 'quente' },
];

// Conversations
const convData = [
  { id: 'conv-001', contactId: 'c-001', status: 'open', isCtwa: true, ctwaClid: 'CTWA_CLICK_ABC123', adId: 'AD_123456', campaignId: 'CAMP_001', isAiActive: true, lastMessageAt: hoursAgo(0.5) },
  { id: 'conv-002', contactId: 'c-002', status: 'open', isCtwa: true, ctwaClid: 'CTWA_CLICK_DEF456', adId: 'AD_789012', campaignId: 'CAMP_002', isAiActive: false, lastMessageAt: hoursAgo(2) },
  { id: 'conv-003', contactId: 'c-003', status: 'open', isCtwa: true, ctwaClid: 'CTWA_CLICK_GHI789', adId: 'AD_345678', campaignId: 'CAMP_001', isAiActive: true, lastMessageAt: hoursAgo(1) },
  { id: 'conv-004', contactId: 'c-004', status: 'closed', isCtwa: false, isAiActive: false, lastMessageAt: daysAgo(1) },
  { id: 'conv-005', contactId: 'c-005', status: 'open', isCtwa: false, isAiActive: true, lastMessageAt: hoursAgo(4) },
  { id: 'conv-006', contactId: 'c-006', status: 'open', isCtwa: true, ctwaClid: 'CTWA_CLICK_JKL012', adId: 'AD_345678', campaignId: 'CAMP_001', isAiActive: false, lastMessageAt: hoursAgo(0.2) },
  { id: 'conv-007', contactId: 'c-009', status: 'open', isCtwa: true, ctwaClid: 'CTWA_CLICK_MNO345', adId: 'AD_123456', campaignId: 'CAMP_001', isAiActive: true, lastMessageAt: hoursAgo(0.1) },
];

// Messages
const msgData = [
  { id: 'msg-001', conversationId: 'conv-001', direction: 'inbound', type: 'text', content: 'Olá! Vi o anúncio e quero saber mais sobre o produto', status: 'delivered', sentAt: hoursAgo(1) },
  { id: 'msg-002', conversationId: 'conv-001', direction: 'outbound', type: 'text', content: 'Olá Ana! 😊 Que ótimo! Vou te ajudar. Sobre qual produto você quer saber?', status: 'read', sentAt: hoursAgo(0.9) },
  { id: 'msg-003', conversationId: 'conv-001', direction: 'inbound', type: 'text', content: 'Sobre o plano Pro. Qual o valor?', status: 'delivered', sentAt: hoursAgo(0.7) },
  { id: 'msg-004', conversationId: 'conv-001', direction: 'outbound', type: 'text', content: 'O plano Pro custa R$297/mês e inclui: 10.000 contatos, 50 fluxos, 10 agentes IA, Voice Studio e muito mais! Quer que eu te mostre como funciona?', status: 'read', sentAt: hoursAgo(0.5) },
  { id: 'msg-005', conversationId: 'conv-002', direction: 'inbound', type: 'text', content: 'Oi, estou com uma dúvida sobre o cadastro', status: 'delivered', sentAt: hoursAgo(2) },
  { id: 'msg-006', conversationId: 'conv-003', direction: 'inbound', type: 'text', content: 'Bom dia! Preciso de ajuda', status: 'delivered', sentAt: hoursAgo(1) },
  { id: 'msg-007', conversationId: 'conv-003', direction: 'outbound', type: 'text', content: 'Bom dia Beatriz! Como posso te ajudar hoje? 😊', status: 'read', sentAt: hoursAgo(0.95) },
  { id: 'msg-008', conversationId: 'conv-004', direction: 'inbound', type: 'text', content: 'Obrigada pela ajuda!', status: 'read', sentAt: daysAgo(1) },
  { id: 'msg-009', conversationId: 'conv-005', direction: 'inbound', type: 'text', content: 'Quero cancelar minha assinatura', status: 'delivered', sentAt: hoursAgo(4) },
  { id: 'msg-010', conversationId: 'conv-005', direction: 'outbound', type: 'text', content: 'João, sinto muito que queira cancelar. Pode me contar o motivo? Talvez eu possa ajudar!', status: 'read', sentAt: hoursAgo(3.9) },
  { id: 'msg-011', conversationId: 'conv-006', direction: 'inbound', type: 'text', content: 'Oiii, vi seus stories e amei!', status: 'delivered', sentAt: hoursAgo(0.2) },
  { id: 'msg-012', conversationId: 'conv-007', direction: 'inbound', type: 'text', content: 'Quero fazer um pedido urgente!', status: 'delivered', sentAt: hoursAgo(0.1) },
  { id: 'msg-013', conversationId: 'conv-007', direction: 'outbound', type: 'text', content: 'Roberto! Claro, vou te ajudar agora! Qual produto você deseja?', status: 'read', sentAt: hoursAgo(0.05) },
];

// CTWA Attributions
const ctwaData = [
  { id: 'ctwa-001', contactId: 'c-001', conversationId: 'conv-001', ctwaClid: 'CTWA_CLICK_ABC123', adId: 'AD_123456', adsetId: 'ADSET_001', campaignId: 'CAMP_001', headline: 'Comece agora com IA', body: 'Automatize suas vendas no WhatsApp', firstMessageAt: hoursAgo(1), leadQualifiedAt: hoursAgo(0.5), conversionSentToMeta: true, conversionEventName: 'Lead', conversionEventTime: hoursAgo(0.5) },
  { id: 'ctwa-002', contactId: 'c-002', conversationId: 'conv-002', ctwaClid: 'CTWA_CLICK_DEF456', adId: 'AD_789012', adsetId: 'ADSET_002', campaignId: 'CAMP_002', headline: 'CRM Inteligente', body: 'Gerencie seus clientes com IA', firstMessageAt: hoursAgo(2), conversionSentToMeta: false },
  { id: 'ctwa-003', contactId: 'c-003', conversationId: 'conv-003', ctwaClid: 'CTWA_CLICK_GHI789', adId: 'AD_345678', adsetId: 'ADSET_001', campaignId: 'CAMP_001', headline: 'Comece agora com IA', body: 'Automatize suas vendas no WhatsApp', firstMessageAt: hoursAgo(1), leadQualifiedAt: hoursAgo(0.8), conversionSentToMeta: false },
  { id: 'ctwa-004', contactId: 'c-006', conversationId: 'conv-006', ctwaClid: 'CTWA_CLICK_JKL012', adId: 'AD_345678', adsetId: 'ADSET_001', campaignId: 'CAMP_001', headline: 'Comece agora com IA', body: 'Automatize suas vendas no WhatsApp', firstMessageAt: hoursAgo(0.2), conversionSentToMeta: false },
  { id: 'ctwa-005', contactId: 'c-009', conversationId: 'conv-007', ctwaClid: 'CTWA_CLICK_MNO345', adId: 'AD_123456', adsetId: 'ADSET_001', campaignId: 'CAMP_001', headline: 'Comece agora com IA', body: 'Automatize suas vendas no WhatsApp', firstMessageAt: hoursAgo(0.1), purchaseAt: daysAgo(-1), conversionSentToMeta: true, conversionEventName: 'Purchase', conversionEventTime: daysAgo(-1) },
];

// Flows
const flowData = [
  { id: 'flow-001', name: 'Vendas WhatsApp', description: 'Fluxo de vendas automatizado via WhatsApp', status: 'active', category: 'vendas', isActive: true },
  { id: 'flow-002', name: 'Suporte ao Cliente', description: 'Fluxo de suporte e atendimento', status: 'active', category: 'suporte', isActive: true },
  { id: 'flow-003', name: 'Captação de Leads', description: 'Fluxo de captação via CTWA', status: 'draft', category: 'marketing', isActive: false },
];

const blockData = [
  // Flow 001
  { id: 'block-001', flowId: 'flow-001', type: 'content', label: 'Boas-vindas', positionX: 100, positionY: 100, config: JSON.stringify({ text: 'Olá! Bem-vindo ao Ozion Chat AI! Como posso te ajudar?' }) },
  { id: 'block-002', flowId: 'flow-001', type: 'menu', label: 'Menu Principal', positionX: 400, positionY: 100, config: JSON.stringify({ options: ['1 - Produtos', '2 - Preços', '3 - Suporte'] }) },
  { id: 'block-003', flowId: 'flow-001', type: 'gpt', label: 'IA Resposta', positionX: 700, positionY: 100, config: JSON.stringify({ provider: 'openai', model: 'gpt-4', prompt: 'Responda sobre os produtos do Ozion Chat AI' }) },
  { id: 'block-004', flowId: 'flow-001', type: 'action', label: 'Salvar Lead', positionX: 700, positionY: 300, config: JSON.stringify({ action: 'update_field', field: 'leadStatus', value: 'qualified' }) },
  { id: 'block-005', flowId: 'flow-001', type: 'condition', label: 'Temperatura?', positionX: 400, positionY: 300, config: JSON.stringify({ field: 'leadTemperature', conditions: [{ value: 'quente', path: 'block-003' }, { value: 'frio', path: 'block-006' }] }) },
  { id: 'block-006', flowId: 'flow-001', type: 'delay', label: 'Aguardar 24h', positionX: 700, positionY: 500, config: JSON.stringify({ delayType: 'hours', amount: 24 }) },
  // Flow 002
  { id: 'block-007', flowId: 'flow-002', type: 'content', label: 'Boas-vindas Suporte', positionX: 100, positionY: 100, config: JSON.stringify({ text: 'Olá! Sou o assistente de suporte. Como posso te ajudar?' }) },
  { id: 'block-008', flowId: 'flow-002', type: 'agent', label: 'Agente Suporte', positionX: 400, positionY: 100, config: JSON.stringify({ agentId: 'agent-001', fallback: 'transferir' }) },
  { id: 'block-009', flowId: 'flow-002', type: 'transfer', label: 'Transferir Humano', positionX: 700, positionY: 100, config: JSON.stringify({ department: 'suporte', message: 'Transferindo para atendente...' }) },
];

const edgeData = [
  { id: 'edge-001', flowId: 'flow-001', sourceBlockId: 'block-001', targetBlockId: 'block-002' },
  { id: 'edge-002', flowId: 'flow-001', sourceBlockId: 'block-002', targetBlockId: 'block-005' },
  { id: 'edge-003', flowId: 'flow-001', sourceBlockId: 'block-005', targetBlockId: 'block-003', label: 'quente' },
  { id: 'edge-004', flowId: 'flow-001', sourceBlockId: 'block-005', targetBlockId: 'block-006', label: 'frio' },
  { id: 'edge-005', flowId: 'flow-001', sourceBlockId: 'block-003', targetBlockId: 'block-004' },
  { id: 'edge-006', flowId: 'flow-002', sourceBlockId: 'block-007', targetBlockId: 'block-008' },
  { id: 'edge-007', flowId: 'flow-002', sourceBlockId: 'block-008', targetBlockId: 'block-009' },
];

// Agents
const agentData = [
  { id: 'agent-001', name: 'Vendedor IA', description: 'Agente de vendas automatizado', identity: 'Você é um vendedor profissional e simpático', objective: 'Qualificar leads e fechar vendas', communication: 'Tom amigável e profissional, usar emojis com moderação', instructions: 'Sempre cumprimentar pelo nome. Oferecer ajuda. Identificar necessidades.', restrictions: 'Não fazer promessas falsas. Não informar preços sem autorização.', provider: 'openai', model: 'gpt-4', temperature: 0.7, maxTokens: 1024, isActive: true },
  { id: 'agent-002', name: 'Suporte IA', description: 'Agente de suporte técnico', identity: 'Você é um especialista em suporte técnico', objective: 'Resolver dúvidas e problemas dos clientes', communication: 'Claro, direto e técnico quando necessário', instructions: 'Primeiro entender o problema. Depois oferecer solução. Escalar se necessário.', restrictions: 'Não acessar dados sensíveis. Não modificar contas sem autorização.', provider: 'openai', model: 'gpt-4', temperature: 0.5, maxTokens: 2048, isActive: true },
  { id: 'agent-003', name: 'Recepção IA', description: 'Agente de recepção e triagem', identity: 'Você é um recepcionista virtual atencioso', objective: 'Receber leads e direcionar para o departamento correto', communication: 'Cordial e eficiente', instructions: 'Perguntar como pode ajudar. Identificar o departamento. Transferir se necessário.', restrictions: 'Não responder assuntos fora do escopo.', provider: 'openai', model: 'gpt-4o', temperature: 0.3, maxTokens: 512, isActive: true },
];

// Voices
const voiceData = [
  { id: 'voice-001', provider: 'elevenlabs', name: 'Maria - Português BR', voiceId: 'elevenlabs_maria_br', settings: JSON.stringify({ stability: 0.7, similarityBoost: 0.8, style: 0.6 }), isActive: true },
  { id: 'voice-002', provider: 'elevenlabs', name: 'João - Português BR', voiceId: 'elevenlabs_joao_br', settings: JSON.stringify({ stability: 0.8, similarityBoost: 0.7, style: 0.5 }), isActive: true },
  { id: 'voice-003', provider: 'openai-tts', name: 'Nova - PT', voiceId: 'nova', settings: JSON.stringify({ speed: 1.0, pitch: 1.0 }), isActive: false },
];

// Sales
const saleData = [
  { id: 'sale-001', contactId: 'c-004', product: 'Plano Pro', amount: 297, status: 'approved', provider: 'kiwify', campaignId: 'CAMP_001', isCtwa: true, soldAt: daysAgo(2) },
  { id: 'sale-002', contactId: 'c-009', product: 'Plano Scale', amount: 797, status: 'approved', provider: 'hotmart', campaignId: 'CAMP_001', isCtwa: true, soldAt: daysAgo(1) },
  { id: 'sale-003', contactId: 'c-001', product: 'Plano Pro', amount: 297, status: 'pending', provider: 'kiwify', campaignId: 'CAMP_001', isCtwa: true, soldAt: hoursAgo(3) },
  { id: 'sale-004', contactId: 'c-003', product: 'Plano Start', amount: 97, status: 'approved', provider: 'asaas', campaignId: 'CAMP_002', isCtwa: false, soldAt: daysAgo(3) },
  { id: 'sale-005', contactId: 'c-006', product: 'Plano Pro', amount: 297, status: 'cancelled', provider: 'mercadopago', campaignId: 'CAMP_001', isCtwa: true, soldAt: daysAgo(4) },
  { id: 'sale-006', contactId: 'c-010', product: 'Plano Scale', amount: 797, status: 'approved', provider: 'stripe', campaignId: 'CAMP_001', isCtwa: true, soldAt: hoursAgo(6) },
];

// Logs
const logData = [
  { category: 'message', action: 'WhatsApp message sent', status: 'success', provider: 'meta', createdAt: hoursAgo(0.5) },
  { category: 'message', action: 'WhatsApp message received', status: 'success', provider: 'meta', createdAt: hoursAgo(0.3) },
  { category: 'ai', action: 'GPT response generated', status: 'success', provider: 'openai', createdAt: hoursAgo(0.4) },
  { category: 'ctwa', action: 'CTWA attribution tracked', status: 'success', provider: 'meta', createdAt: hoursAgo(0.6) },
  { category: 'integration', action: 'Webhook received from Hotmart', status: 'success', provider: 'hotmart', createdAt: hoursAgo(1) },
  { category: 'sale', action: 'Sale processed', status: 'success', provider: 'kiwify', createdAt: hoursAgo(2) },
  { category: 'auth', action: 'User login', status: 'success', provider: 'auth', createdAt: hoursAgo(3) },
  { category: 'voice', action: 'Audio generated via ElevenLabs', status: 'success', provider: 'elevenlabs', createdAt: hoursAgo(4) },
  { category: 'flow', action: 'Flow "Vendas WhatsApp" published', status: 'success', provider: 'system', createdAt: daysAgo(1) },
  { category: 'error', action: 'Webhook delivery failed', status: 'error', provider: 'webhook', createdAt: daysAgo(2), errorData: 'Timeout exceeded' },
];

console.log('🌱 Seeding database...');

// Clear existing data
const tables = ['logs', 'sales', 'ctwa_attributions', 'messages', 'conversations', 'contacts', 'flow_edges', 'flow_blocks', 'flows', 'agents', 'voices', 'risk_words', 'system_health', 'provider_versions', 'integrations', 'whatsapp_credentials', 'custom_fields', 'tags', 'subscriptions', 'customers', 'workspaces', 'users', 'plans', 'tenants', 'analytics_events', 'webhooks'];
for (const table of tables) { try { db.run(`DELETE FROM ${table}`); } catch {} }

// Insert tenant
db.insert(schema.tenants).values({ id: TENANT_ID, name: 'Ozion Chat AI', slug: 'ozion', isMaster: true, createdAt: now, updatedAt: now }).run();

// Insert admin user
db.insert(schema.users).values({ id: 'admin-001', tenantId: TENANT_ID, email: 'admin@ozion.com', name: 'Admin Master', role: 'admin', createdAt: now, updatedAt: now }).run();

// Insert plans
for (const p of plans) { db.insert(schema.plans).values(p as any).run(); }

// Insert tags
for (const t of tagData) { db.insert(schema.tags).values({ ...t, tenantId: TENANT_ID, createdAt: now } as any).run(); }

// Insert risk words
for (const w of riskWords) { db.insert(schema.riskWords).values({ id: crypto.randomUUID(), tenantId: TENANT_ID, word: w, isActive: true, createdAt: now }).run(); }

// Insert system health
for (const h of healthComponents) { db.insert(schema.systemHealth).values({ id: crypto.randomUUID(), ...h, lastCheckedAt: now, updatedAt: now } as any).run(); }

// Insert customers
const customerNames = ['Loja Virtual ABC', 'Digital Marketing Pro', 'E-commerce Total', 'Academia Força'];
for (let i = 0; i < customerNames.length; i++) {
  db.insert(schema.customers).values({ id: `cust-${i+1}`, tenantId: TENANT_ID, name: customerNames[i], email: `contato@${customerNames[i].toLowerCase().replace(/\s/g,'')}.com.br`, status: 'active', planId: plans[i % plans.length].id, maxContacts: 10000, maxFlows: 50, createdAt: now, updatedAt: now } as any).run();
}

// Insert workspaces
for (let i = 0; i < customerNames.length; i++) {
  db.insert(schema.workspaces).values({ id: `ws-${i+1}`, tenantId: TENANT_ID, customerId: `cust-${i+1}`, name: customerNames[i], slug: `ws-${i+1}`, createdAt: now, updatedAt: now } as any).run();
}

// Insert contacts
for (const c of contactData) {
  db.insert(schema.contacts).values({ ...c, tenantId: TENANT_ID, createdAt: now, updatedAt: now } as any).run();
}

// Insert conversations
for (const c of convData) {
  const contact = contactData.find((ct: any) => ct.id === c.contactId);
  db.insert(schema.conversations).values({ ...c, tenantId: TENANT_ID, phoneNumberId: 'PHONE_ID', contactWaId: contact?.phone || '', createdAt: now, updatedAt: now } as any).run();
}

// Insert messages
for (const m of msgData) { db.insert(schema.messages).values(m as any).run(); }

// Insert CTWA attributions
for (const c of ctwaData) { db.insert(schema.ctwaAttributions).values({ ...c, tenantId: TENANT_ID, createdAt: now } as any).run(); }

// Insert flows
for (const f of flowData) { db.insert(schema.flows).values({ ...f, tenantId: TENANT_ID, createdAt: now, updatedAt: now } as any).run(); }

// Insert flow blocks
for (const b of blockData) { db.insert(schema.flowBlocks).values({ ...b, createdAt: now, updatedAt: now } as any).run(); }

// Insert flow edges
for (const e of edgeData) { db.insert(schema.flowEdges).values({ ...e, createdAt: now } as any).run(); }

// Insert agents
for (const a of agentData) { db.insert(schema.agents).values({ ...a, tenantId: TENANT_ID, createdAt: now, updatedAt: now } as any).run(); }

// Insert voices
for (const v of voiceData) { db.insert(schema.voices).values({ ...v, tenantId: TENANT_ID, createdAt: now } as any).run(); }

// Insert sales
for (const s of saleData) { db.insert(schema.sales).values({ ...s, tenantId: TENANT_ID, createdAt: now, updatedAt: now } as any).run(); }

// Insert logs
for (const l of logData) { db.insert(schema.logs).values({ ...l, tenantId: TENANT_ID, createdAt: l.createdAt || now } as any).run(); }

// ─── Deploy System Seed ────────────────────────────────────────
import * as deploySchema from './server/db/schema-deploy.js';

// Modules
const moduleData = [
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
for (const m of moduleData) {
  db.insert(deploySchema.modules).values({ ...m, createdAt: now, updatedAt: now } as any).run();
}

// Changelog entries
const changelogData = [
  { id: crypto.randomUUID(), version: '1.0.0', title: 'Lançamento da plataforma Ozion Chat AI', description: 'Versão inicial com todas as funcionalidades core: CRM, Chat, Flow Builder, Agentes IA, Voice Studio, CTWA, Vendas, Analytics e Integrações.', type: 'feature', module: 'core', author: 'Ozion Team', environment: 'production', isPublished: true, publishedAt: now, createdAt: now },
  { id: crypto.randomUUID(), version: '1.0.0', title: 'Sistema de deploy e versionamento', description: 'CI/CD com GitHub Actions, deploy automático para Vercel, backups, changelog e centro de atualizações.', type: 'feature', module: 'integrations', author: 'Ozion Team', environment: 'production', isPublished: true, publishedAt: now, createdAt: now },
  { id: crypto.randomUUID(), version: '1.1.0', title: 'Melhoria no Flow Builder', description: 'Novos blocos de automação e conexões condicionais.', type: 'improvement', module: 'flows', author: 'Ozion Team', environment: 'development', isPublished: false, createdAt: now },
];
for (const c of changelogData) {
  db.insert(deploySchema.changelogs).values(c as any).run();
}

// Initial deployment
db.insert(deploySchema.deployments).values({
  id: crypto.randomUUID(), version: '1.0.0', environment: 'production', status: 'completed',
  branch: 'main', commitHash: 'initial', commitMessage: 'Initial release v1.0.0',
  deployedBy: 'system', startedAt: now, completedAt: now, createdAt: now,
} as any).run();

console.log('✅ Seed complete!');
console.log('📊 Data: 1 tenant, 1 admin, 4 plans, 8 tags, 10 contacts, 7 conversations, 13 messages, 5 CTWA, 3 flows, 9 blocks, 7 edges, 3 agents, 3 voices, 6 sales, 10 logs, 15 health checks, 4 customers, 4 workspaces, 9 modules, 3 changelogs, 1 deployment');
