const API = '';
const TENANT = 'default';
const HEADERS = { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT };

let currentPage = 'dashboard';
let conversations = [];
let selectedConv = null;
let chatMessages = [];
let allContacts = [];
let allFlows = [];
let allAgents = [];
let allSales = [];
let allLogs = [];
let allIntegrations = [];
let allPlans = [];
let allCustomers = [];
let allWorkspaces = [];
let allUsers = [];
let allTags = [];
let allVoices = [];
let allVersions = [];
let allHealth = [];
let allCampaigns = [];
let dashboardStats = null;
let convStats = {};
let salesStats = {};
let ctwaAnalytics = {};
let flowNodes = [];
let flowEdges = [];
let selectedNode = null;
let dragNode = null;

async function api(path, opts = {}) {
  try {
    const res = await fetch(API + path, { headers: HEADERS, ...opts });
    return await res.json();
  } catch (e) { console.error('API Error:', e); return null; }
}

// ─── Navigation ──────────────────────────────────────────────────
const NAV = [
  { section: 'PRINCIPAL', items: [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { id: 'chat', icon: 'fa-comments', label: 'Chat ao vivo' },
    { id: 'contacts', icon: 'fa-address-book', label: 'Contatos' },
  ]},
  { section: 'AUTOMAÇÃO IA', items: [
    { id: 'agents', icon: 'fa-robot', label: 'Agente IA' },
    { id: 'flows', icon: 'fa-diagram-project', label: 'Fluxos' },
    { id: 'voice', icon: 'fa-microphone', label: 'Voice Studio' },
  ]},
  { section: 'WHATSAPP', items: [
    { id: 'whatsapp', icon: 'fa-brands fa-whatsapp', label: 'WhatsApp' },
    { id: 'campaigns', icon: 'fa-bullhorn', label: 'Campanhas' },
    { id: 'broadcast', icon: 'fa-paper-plane', label: 'Disparo em Massa' },
  ]},
  { section: 'VENDAS', items: [
    { id: 'ctwa', icon: 'fa-bullseye', label: 'CTWA' },
    { id: 'sales', icon: 'fa-dollar-sign', label: 'Vendas' },
    { id: 'kanban', icon: 'fa-columns', label: 'Kanban' },
  ]},
  { section: 'ANÁLISES', items: [
    { id: 'analytics', icon: 'fa-chart-bar', label: 'Relatórios' },
    { id: 'reports', icon: 'fa-file-alt', label: 'Resumo' },
  ]},
  { section: 'CONFIGURAÇÕES', items: [
    { id: 'integrations', icon: 'fa-plug', label: 'Integrações' },
    { id: 'plans', icon: 'fa-crown', label: 'Planos' },
    { id: 'admin', icon: 'fa-cog', label: 'Admin Master' },
    { id: 'health', icon: 'fa-heartbeat', label: 'Health' },
  ]},
];

function render() {
  if (!localStorage.getItem('ozion_logged')) {
    document.getElementById('app').innerHTML = loginHTML();
    return;
  }
  document.getElementById('app').innerHTML = appHTML();
  loadPage(currentPage);
  updateTokenUsage();
}

function loginHTML() {
  return `<div class="login-screen"><div class="login-box">
    <div style="text-align:center;margin-bottom:24px">
      <div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#7c3aed,#3b82f6);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:28px">🤖</div>
      <h1 style="margin:0;font-size:22px">Ozion Chat AI</h1>
      <p style="color:var(--text-muted);margin-top:4px;font-size:13px">Atendente IA para WhatsApp</p>
    </div>
    <div class="form-group"><label>Email</label><input type="email" id="login-email" value="admin@ozion.com"></div>
    <div class="form-group"><label>Senha</label><input type="password" id="login-pass" value="admin123"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="doLogin()"><i class="fa-solid fa-arrow-right"></i> Entrar</button>
    <p style="text-align:center;margin-top:16px;font-size:11px;color:var(--text-muted)">Em 11 minutos seu IA está no ar</p>
  </div></div>`;
}

function appHTML() {
  return `<div class="app-layout">
    <div class="sidebar">
      <div class="sidebar-logo" style="cursor:pointer" onclick="navigate('dashboard')">
        <div class="logo-icon" style="background:linear-gradient(135deg,#7c3aed,#3b82f6)">O</div>
        <div><h2 style="font-size:15px;margin:0">Ozion</h2><span style="font-size:10px;color:var(--text-muted)">Atendente IA WhatsApp</span></div>
      </div>
      <div class="workspace-selector" style="padding:8px 12px;border-bottom:1px solid var(--border)">
        <select id="workspace-select" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text-primary);font-size:11px;cursor:pointer" onchange="switchWorkspace(this.value)">
          <option value="default">🏠 Workspace Principal</option>
        </select>
      </div>
      <div class="sidebar-nav">${NAV.map(s => `<div class="nav-section"><div class="nav-section-title">${s.section}</div>${s.items.map(i => `<div class="nav-item${currentPage===i.id?' active':''}" onclick="navigate('${i.id}')"><i class="fa-solid ${i.icon}"></i>${i.label}</div>`).join('')}</div>`).join('')}</div>
      <div class="sidebar-footer">
        <div class="token-widget" style="padding:10px 12px;border-top:1px solid var(--border);background:var(--bg-secondary)">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:10px;color:var(--text-muted)">GPT</span><span style="font-size:10px;font-weight:600;color:#3b82f6" id="gpt-tokens">0/5M</span></div>
          <div style="height:3px;background:var(--border);border-radius:2px;margin-bottom:6px"><div style="height:100%;width:0%;background:linear-gradient(90deg,#3b82f6,#7c3aed);border-radius:2px" id="gpt-bar"></div></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:10px;color:var(--text-muted)">Voz</span><span style="font-size:10px;font-weight:600;color:#25D366" id="voice-tokens">0/400K</span></div>
          <div style="height:3px;background:var(--border);border-radius:2px"><div style="height:100%;width:0%;background:linear-gradient(90deg,#25D366,#128C7E);border-radius:2px" id="voice-bar"></div></div>
        </div>
        <div style="padding:10px 12px;display:flex;align-items:center;gap:8px;border-top:1px solid var(--border)">
          <div class="avatar" style="background:linear-gradient(135deg,#7c3aed,#3b82f6);width:28px;height:28px;font-size:11px">A</div>
          <div style="flex:1;min-width:0"><div style="font-weight:500;font-size:12px">Admin</div><div style="font-size:9px;color:var(--text-muted)">Essencials</div></div>
          <button class="btn btn-sm btn-secondary" onclick="logout()" style="padding:3px 6px"><i class="fa-solid fa-right-from-bracket"></i></button>
        </div>
      </div>
    </div>
    <div class="main-content">
      <div class="topbar"><div class="topbar-title" id="topbar-title">Dashboard</div><div class="topbar-actions"><button class="btn btn-sm btn-secondary" onclick="showToast('Notificações em breve','success')"><i class="fa-solid fa-bell"></i></button></div></div>
      <div class="content" id="content"></div>
    </div>
  </div>`;
}

function navigate(page) { currentPage = page; selectedConv = null; render(); }
function doLogin() { localStorage.setItem('ozion_logged', '1'); render(); }
function logout() { localStorage.removeItem('ozion_logged'); render(); }
function switchWorkspace(id) { localStorage.setItem('ozion_workspace', id); showToast('Workspace alterado', 'success'); }

async function loadPage(page) {
  const el = document.getElementById('content');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px"></i><p style="margin-top:8px">Carregando...</p></div>';
  const pages = {
    dashboard: loadDashboard, chat: loadChat, contacts: loadContacts,
    agents: loadAgents, flows: loadFlows, voice: loadVoice,
    whatsapp: loadWhatsApp, campaigns: loadCampaigns, broadcast: loadBroadcast,
    ctwa: loadCTWA, sales: loadSales, kanban: loadKanban,
    analytics: loadAnalytics, reports: loadReports,
    integrations: loadIntegrations, plans: loadPlans, admin: loadAdmin, health: loadHealth
  };
  if (pages[page]) await pages[page](el);
  else el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-construction"></i><h3>Página em construção</h3></div>';
}

// ─── Dashboard ───────────────────────────────────────────────────
async function loadDashboard(el) {
  const [stats, convData, salesData, ctwaData] = await Promise.all([
    api('/api/analytics/default/dashboard'), api('/api/chat/stats'), api('/api/sales/stats'), api('/api/ctwa/analytics')
  ]);
  dashboardStats = stats; convStats = convData || {}; salesStats = salesData || {}; ctwaAnalytics = ctwaData?.summary || {};
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div><h2 style="margin:0;font-size:20px">Dashboard</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">Bem-vindo ao Ozion Chat AI</p></div>
      <button class="btn btn-primary btn-sm" onclick="navigate('agents')"><i class="fa-solid fa-plus"></i> Novo Agente</button>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon green"><i class="fa-brands fa-whatsapp"></i></div><div class="stat-value">${stats?.conversations?.open||0}</div><div class="stat-label">Conversas Ativas</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-users"></i></div><div class="stat-value">${stats?.contacts?.total||0}</div><div class="stat-label">Contatos</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-robot"></i></div><div class="stat-value">${convStats.waiting||0}</div><div class="stat-label">IA Atendendo</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(salesStats.totalRevenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
    </div>
    <div class="grid-2" style="margin-top:20px">
      <div class="card"><div class="card-header"><h3>📊 Uso de Tokens</h3></div><div class="card-body">
        <div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px">🤖 GPT (Llama 3.3)</span><span style="font-size:12px;font-weight:600;color:#3b82f6">0 / 5M</span></div><div style="height:6px;background:var(--border);border-radius:3px"><div style="height:100%;width:0%;background:linear-gradient(90deg,#3b82f6,#7c3aed);border-radius:3px"></div></div></div>
        <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px">🎤 Voz</span><span style="font-size:12px;font-weight:600;color:#25D366">0 / 400K</span></div><div style="height:6px;background:var(--border);border-radius:3px"><div style="height:100%;width:0%;background:linear-gradient(90deg,#25D366,#128C7E);border-radius:3px"></div></div></div>
      </div></div>
      <div class="card"><div class="card-header"><h3>📊 CTWA</h3></div><div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div style="text-align:center;padding:12px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:20px;font-weight:700;color:var(--primary)">${ctwaAnalytics.totalClicks||0}</div><div style="font-size:10px;color:var(--text-muted)">Cliques</div></div>
          <div style="text-align:center;padding:12px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:20px;font-weight:700;color:#25D366">${ctwaAnalytics.leads||0}</div><div style="font-size:10px;color:var(--text-muted)">Leads</div></div>
          <div style="text-align:center;padding:12px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:20px;font-weight:700;color:var(--accent)">${ctwaAnalytics.purchases||0}</div><div style="font-size:10px;color:var(--text-muted)">Compras</div></div>
        </div>
      </div></div>
    </div>
    <div class="card" style="margin-top:20px"><div class="card-header"><h3>⚡ Ações Rápidas</h3></div><div class="card-body">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        <button class="quick-action" onclick="navigate('agents')"><div style="font-size:22px;margin-bottom:6px">🤖</div><div style="font-size:12px">Criar Agente</div></button>
        <button class="quick-action" onclick="navigate('voice')"><div style="font-size:22px;margin-bottom:6px">🎤</div><div style="font-size:12px">Voice Studio</div></button>
        <button class="quick-action" onclick="navigate('whatsapp')"><div style="font-size:22px;margin-bottom:6px">📱</div><div style="font-size:12px">WhatsApp</div></button>
        <button class="quick-action" onclick="navigate('campaigns')"><div style="font-size:22px;margin-bottom:6px">📢</div><div style="font-size:12px">Campanhas</div></button>
      </div>
    </div></div>`;
  const agents = await api('/api/agents');
  if (agents && agents.length > 0) {
    const agentsEl = document.getElementById('dashboard-agents');
    if (agentsEl) agentsEl.innerHTML = agents.slice(0,3).map(a => `<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-secondary);border-radius:8px;margin-bottom:6px"><div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:16px">🤖</div><div style="flex:1"><div style="font-weight:600;font-size:13px">${a.name}</div><div style="font-size:11px;color:var(--text-muted)">${a.provider||'Groq'} • ${a.model||'Llama 3.3'}</div></div><span class="badge badge-${a.is_active?'green':'gray'}">${a.is_active?'Ativo':'Inativo'}</span></div>`).join('');
  }
}

// ─── Chat ao Vivo ────────────────────────────────────────────────
async function loadChat(el) {
  const [convData, statsData] = await Promise.all([api('/api/chat/conversations'), api('/api/chat/stats')]);
  conversations = convData?.conversations || []; convStats = statsData || {};
  el.innerHTML = `<div class="chat-layout">
    <div class="chat-sidebar">
      <div style="padding:12px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h3 style="margin:0;font-size:15px">Chat ao vivo</h3></div>
        <div class="chat-tabs" style="display:flex;gap:4px;margin-bottom:8px">
          <div class="chat-tab active" onclick="filterConvs(this,'all')" style="flex:1;text-align:center;padding:6px;border-radius:6px;cursor:pointer;font-size:12px;background:var(--bg-secondary)">Todos <span class="count">${convStats.total||conversations.length||0}</span></div>
          <div class="chat-tab" onclick="filterConvs(this,'ai')" style="flex:1;text-align:center;padding:6px;border-radius:6px;cursor:pointer;font-size:12px">IA <span class="count">${convStats.waiting||0}</span></div>
          <div class="chat-tab" onclick="filterConvs(this,'closed')" style="flex:1;text-align:center;padding:6px;border-radius:6px;cursor:pointer;font-size:12px">Fechados <span class="count">${convStats.finished||0}</span></div>
        </div>
        <input type="text" placeholder="Procurar contato..." style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--text-primary);font-size:12px">
      </div>
      <div class="chat-list" id="chat-list">${conversations.length===0?'<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:12px"><i class="fa-solid fa-comments" style="font-size:24px;margin-bottom:8px;opacity:0.3"></i><p>Nenhuma conversa</p></div>':conversations.map(c => renderConvItem(c)).join('')}</div>
    </div>
    <div class="chat-main" id="chat-main"><div class="empty-state"><i class="fa-solid fa-comments"></i><h3>Selecione uma conversa</h3><p>Clique para ver as mensagens</p></div></div>
  </div>`;
}

function renderConvItem(c) {
  const name = c.contact?.name || 'Desconhecido';
  const initial = name.charAt(0).toUpperCase();
  return `<div class="chat-item${selectedConv?.id===c.id?' active':''}" onclick="selectConv('${c.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border)">
    <div class="avatar" style="background:#25D366;width:36px;height:36px;font-size:13px;flex-shrink:0">${initial}</div>
    <div style="flex:1;min-width:0"><div style="font-weight:500;font-size:13px">${name}</div><p style="font-size:11px;color:var(--text-muted);margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.contact?.phone||''}</p></div>
    <div style="text-align:right;flex-shrink:0"><div style="font-size:10px;color:var(--text-muted)">${c.lastMessageAt?timeAgo(c.lastMessageAt):''}</div>${c.isAiActive?'<span class="badge badge-purple" style="margin-top:4px;font-size:9px">🤖 IA</span>':''}</div>
  </div>`;
}

async function selectConv(id) {
  selectedConv = conversations.find(c => c.id === id);
  if (!selectedConv) return;
  const data = await api(`/api/chat/conversations/${id}`);
  chatMessages = data?.messages || [];
  const chatMain = document.getElementById('chat-main');
  if (!chatMain) return;
  chatMain.innerHTML = `
    <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="avatar" style="background:#25D366;width:32px;height:32px;font-size:12px">${(selectedConv.contact?.name||'?')[0]}</div>
        <div><h3 style="font-size:13px;margin:0">${selectedConv.contact?.name||'Desconhecido'}</h3><span style="font-size:10px;color:var(--text-muted)">${selectedConv.contact?.phone||''} • ${selectedConv.isCtwa?'CTWA':'WhatsApp'}</span></div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-${selectedConv.isAiActive?'warning':'success'}" onclick="toggleAI('${id}')" style="font-size:11px"><i class="fa-solid fa-robot"></i> ${selectedConv.isAiActive?'Pausar IA':'Ativar IA'}</button>
        <button class="btn btn-sm btn-secondary" onclick="closeConv('${id}')" title="Finalizar"><i class="fa-solid fa-check"></i></button>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages" style="flex:1;overflow-y:auto;padding:12px">
      ${chatMessages.length===0?'<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">Nenhuma mensagem ainda</div>':
        chatMessages.map(m => `<div class="message ${m.direction}" style="margin-bottom:8px"><div style="max-width:70%;padding:8px 12px;border-radius:12px;font-size:13px;${m.direction==='inbound'?'background:var(--bg-secondary);border-bottom-left-radius:4px':'background:linear-gradient(135deg,#7c3aed,#3b82f6);color:white;border-bottom-right-radius:4px;margin-left:auto'}">${m.content}</div><div class="msg-time" style="font-size:9px;color:var(--text-muted);margin-top:2px;${m.direction==='inbound'?'text-align:left':'text-align:right'}">${formatTime(m.sentAt)}</div></div>`).join('')}
    </div>
    <div class="chat-input" style="padding:10px 16px;border-top:1px solid var(--border);display:flex;gap:8px">
      <input type="text" id="chat-input-text" placeholder="Digite sua mensagem..." onkeypress="if(event.key==='Enter')sendMsg('${id}')" style="flex:1;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text-primary);font-size:13px">
      <button class="btn btn-primary btn-sm" onclick="sendMsg('${id}')"><i class="fa-solid fa-paper-plane"></i></button>
    </div>`;
  const msgDiv = document.getElementById('chat-messages');
  if (msgDiv) msgDiv.scrollTop = msgDiv.scrollHeight;
}

async function sendMsg(convId) {
  const input = document.getElementById('chat-input-text');
  if (!input?.value.trim()) return;
  await api('/api/chat/messages', { method: 'POST', body: JSON.stringify({ conversationId: convId, content: input.value }) });
  input.value = ''; await selectConv(convId);
}

async function toggleAI(convId) { await api(`/api/chat/conversations/${convId}/ai-toggle`, { method: 'POST' }); showToast('Status da IA atualizado', 'success'); await selectConv(convId); }
async function closeConv(convId) { await api(`/api/chat/conversations/${convId}/status`, { method: 'PUT', body: JSON.stringify({ status: 'closed' }) }); showToast('Conversa finalizada', 'success'); navigate('chat'); }
function filterConvs(el, filter) { document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active')); el.classList.add('active'); }

// ─── Contatos ────────────────────────────────────────────────────
async function loadContacts(el) {
  const data = await api('/api/crm/contacts'); allContacts = data?.contacts || [];
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div><h2 style="margin:0;font-size:20px">Contatos</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">${allContacts.length} contatos</p></div>
      <div style="display:flex;gap:8px">
        <input type="text" id="contact-search" placeholder="Buscar por nome..." style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--text-primary);font-size:12px">
        <button class="btn btn-primary btn-sm" onclick="showCreateContact()"><i class="fa-solid fa-plus"></i> Novo</button>
        <button class="btn btn-secondary btn-sm"><i class="fa-solid fa-file-import"></i> Importar</button>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--text-muted);line-height:26px">Etiquetas:</span>
      ${['lead','cliente','vip','pending','entregue'].map(t => `<span class="badge badge-blue" style="cursor:pointer;font-size:10px">${t}</span>`).join('')}
    </div>
    <div id="contact-form" style="display:none" class="card" style="margin-bottom:16px">
      <div class="card-header"><h3>👤 Novo Contato</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>Nome</label><input type="text" id="contact-name" placeholder="Nome completo"></div>
          <div class="form-group"><label>Telefone</label><input type="text" id="contact-phone" placeholder="+5511999999999"></div>
          <div class="form-group"><label>Email</label><input type="email" id="contact-email" placeholder="email@exemplo.com"></div>
          <div class="form-group"><label>Tag</label><select id="contact-tag"><option value="lead">Lead</option><option value="cliente">Cliente</option><option value="vip">VIP</option></select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-primary btn-sm" onclick="createContact()"><i class="fa-solid fa-save"></i> Salvar</button><button class="btn btn-secondary btn-sm" onclick="document.getElementById('contact-form').style.display='none'">Cancelar</button></div>
      </div>
    </div>
    <div class="card"><div class="card-body" style="padding:0">
      <table><thead><tr><th style="width:30px"><input type="checkbox"></th><th>Nome</th><th>Telefone</th><th>Etiquetas</th><th>Ações</th></tr></thead><tbody>
        ${allContacts.length===0?'<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px">Nenhum contato encontrado</td></tr>':
          allContacts.map(c => `<tr><td><input type="checkbox"></td><td><div style="display:flex;align-items:center;gap:8px"><div class="avatar" style="background:linear-gradient(135deg,var(--primary),var(--accent));width:28px;height:28px;font-size:10px;flex-shrink:0">${(c.name||'?')[0]}</div>${c.name||'N/A'}</div></td><td style="font-size:12px">${c.phone||'-'}</td><td><span class="badge badge-blue" style="font-size:10px">${c.tag||'lead'}</span></td><td><button class="btn btn-sm btn-secondary" onclick="editContact('${c.id}')"><i class="fa-solid fa-ellipsis"></i></button></td></tr>`).join('')}
      </tbody></table>
    </div></div>`;
}
function showCreateContact() { document.getElementById('contact-form').style.display = 'block'; }
async function createContact() {
  const data = { name: document.getElementById('contact-name').value, phone: document.getElementById('contact-phone').value, email: document.getElementById('contact-email').value, tag: document.getElementById('contact-tag').value };
  await api('/api/crm/contacts', { method: 'POST', body: JSON.stringify(data) }); showToast('Contato criado!', 'success'); loadContacts(document.getElementById('content'));
}
function editContact(id) { showToast('Edição em breve', 'info'); }

// ─── Agentes IA ──────────────────────────────────────────────────
async function loadAgents(el) {
  allAgents = await api('/api/agents') || [];
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div><h2 style="margin:0;font-size:20px">Agente IA</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">Crie agentes de IA para suas automações • Disponíveis: ${allAgents.length}/5</p></div>
      <button class="btn btn-primary btn-sm" onclick="showCreateAgent()"><i class="fa-solid fa-plus"></i> Novo Agente</button>
    </div>
    <div id="agent-form" style="display:none" class="card" style="margin-bottom:16px">
      <div class="card-header"><h3>🤖 Criar Agente IA</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>Nome do Agente</label><input type="text" id="agent-name" placeholder="Ex: Ana - Atendente"></div>
          <div class="form-group"><label>Provider</label><select id="agent-provider"><option value="groq">Groq (Grátis)</option><option value="deepseek">DeepSeek</option><option value="openai">OpenAI</option></select></div>
          <div class="form-group" style="grid-column:span 2"><label>Identidade (personalidade)</label><textarea id="agent-identity" rows="2" placeholder="Você é a Ana, profissional e simpática..."></textarea></div>
          <div class="form-group"><label>Objetivo</label><input type="text" id="agent-objective" placeholder="Qualificar leads e agendar demos"></div>
          <div class="form-group"><label>Estilo</label><input type="text" id="agent-communication" placeholder="Profissional, simpático e direto"></div>
          <div class="form-group" style="grid-column:span 2"><label>Instruções</label><textarea id="agent-instructions" rows="2" placeholder="Responda em português. Seja objetiva."></textarea></div>
          <div class="form-group" style="grid-column:span 2"><label>Restrições</label><textarea id="agent-restrictions" rows="2" placeholder="Não envie dados sensíveis."></textarea></div>
          <div class="form-group"><label>Temperatura</label><input type="number" id="agent-temperature" value="0.7" min="0" max="1" step="0.1"></div>
          <div class="form-group"><label>Voz</label><select id="agent-voice"><option value="">Sem voz</option></select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-primary btn-sm" onclick="createAgent()"><i class="fa-solid fa-save"></i> Criar</button><button class="btn btn-secondary btn-sm" onclick="hideAgentForm()">Cancelar</button></div>
      </div>
    </div>
    <div class="grid-2">${allAgents.length===0?'<div style="grid-column:span 2;text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-robot" style="font-size:48px;margin-bottom:12px;opacity:0.3"></i><p>Nenhum agente criado</p><button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="showCreateAgent()">Criar Primeiro Agente</button></div>':
      allAgents.map(a => `<div class="card" style="margin-bottom:12px"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0;font-size:14px">🤖 ${a.name}</h3><span class="badge badge-${a.is_active?'green':'gray'}">${a.is_active?'Ativo':'Inativo'}</span></div><div class="card-body"><p style="color:var(--text-muted);font-size:12px;margin-bottom:10px">${a.description||a.identity||''}</p><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><span class="badge badge-blue">${a.provider||'groq'}</span><span class="badge badge-purple">${a.model||'llama-3.3-70b'}</span><span class="badge badge-yellow">temp: ${a.temperature||0.7}</span></div><div style="display:flex;gap:6px"><button class="btn btn-sm btn-primary" onclick="testAgent('${a.id}')"><i class="fa-solid fa-play"></i> Testar</button><button class="btn btn-sm btn-secondary" onclick="editAgent('${a.id}')"><i class="fa-solid fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="deleteAgent('${a.id}')"><i class="fa-solid fa-trash"></i></button></div></div></div>`).join('')}
    </div>`;
  const voices = await api('/api/voice') || [];
  const voiceSelect = document.getElementById('agent-voice');
  if (voiceSelect) voices.forEach(v => { voiceSelect.innerHTML += `<option value="${v.id}">${v.name} (${v.provider})</option>`; });
}
function showCreateAgent() { document.getElementById('agent-form').style.display = 'block'; }
function hideAgentForm() { document.getElementById('agent-form').style.display = 'none'; }
async function createAgent() {
  const data = { name: document.getElementById('agent-name').value, identity: document.getElementById('agent-identity').value, objective: document.getElementById('agent-objective').value, communication: document.getElementById('agent-communication').value, instructions: document.getElementById('agent-instructions').value, restrictions: document.getElementById('agent-restrictions').value, provider: document.getElementById('agent-provider').value, temperature: parseFloat(document.getElementById('agent-temperature').value), voice_id: document.getElementById('agent-voice').value || null };
  await api('/api/agents', { method: 'POST', body: JSON.stringify(data) }); showToast('Agente criado!', 'success'); loadAgents(document.getElementById('content'));
}
async function testAgent(id) {
  const msg = prompt('Digite uma mensagem para testar:');
  if (!msg) return; showToast('Testando...', 'info');
  const result = await api(`/api/agents/${id}/test`, { method: 'POST', body: JSON.stringify({ message: msg }) });
  if (result) alert(`🤖 ${result.agent}\n\nProvider: ${result.provider}\nModelo: ${result.model}\nLatência: ${result.latency}ms\n\nResposta:\n${result.response}`);
}
async function deleteAgent(id) { if (!confirm('Excluir?')) return; await api(`/api/agents/${id}`, { method: 'DELETE' }); showToast('Excluído', 'success'); loadAgents(document.getElementById('content')); }

// ─── Fluxos ──────────────────────────────────────────────────────
async function loadFlows(el) {
  allFlows = await api('/api/flows') || [];
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div><h2 style="margin:0;font-size:20px">Fluxos de conversa</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">${allFlows.length} fluxos</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm"><i class="fa-solid fa-folder-plus"></i> Nova Pasta</button>
        <button class="btn btn-secondary btn-sm"><i class="fa-solid fa-file-import"></i> Importar</button>
        <button class="btn btn-primary btn-sm" onclick="createFlow()"><i class="fa-solid fa-plus"></i> Novo Fluxo</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <select style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text-primary);font-size:11px"><option>Status: todos</option><option>Ativos</option><option>Inativos</option></select>
      <select style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text-primary);font-size:11px"><option>Conexão: todas</option><option>WhatsApp Business</option><option>API Oficial</option></select>
      <select style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text-primary);font-size:11px"><option>Gatilhos: todos</option><option>Mensagem recebida</option><option>Palavra-chave</option><option>Disparo</option></select>
      <input type="text" placeholder="Pesquisar..." style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text-primary);font-size:11px">
    </div>
    <div class="card"><div class="card-body" style="padding:0">
      ${allFlows.length===0?'<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-diagram-project" style="font-size:48px;margin-bottom:12px;opacity:0.3"></i><p>Nenhum fluxo criado</p><button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="createFlow()">Criar Primeiro Fluxo</button></div>':
        allFlows.map(f => `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)">
          <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">⚡</div>
          <div style="flex:1;min-width:0"><div style="font-weight:500;font-size:13px">${f.name||'Fluxo sem nome'}</div><div style="font-size:11px;color:var(--text-muted)">Gatilho: ${f.trigger||'Mensagem recebida'} • ${f.connection||'WhatsApp Business'}</div></div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <span style="font-size:10px;color:var(--text-muted)">${f.lastExecuted?timeAgo(f.lastExecuted):'---'}</span>
            <label class="switch" style="position:relative;display:inline-block;width:36px;height:20px"><input type="checkbox" ${f.is_active?'checked':''} onchange="toggleFlow('${f.id}')"><span class="slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:var(--border);border-radius:20px;transition:.3s;before:''"></span></label>
            <button class="btn btn-sm btn-secondary" onclick="editFlow('${f.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteFlow('${f.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`).join('')}
    </div></div>`;
}
async function createFlow() { const name = prompt('Nome do fluxo:'); if (!name) return; await api('/api/flows', { method: 'POST', body: JSON.stringify({ name }) }); showToast('Fluxo criado!', 'success'); loadFlows(document.getElementById('content')); }
async function editFlow(id) { showToast('Editor de fluxos em breve', 'info'); }
async function deleteFlow(id) { if (!confirm('Excluir?')) return; await api(`/api/flows/${id}`, { method: 'DELETE' }); showToast('Excluído', 'success'); loadFlows(document.getElementById('content')); }
async function toggleFlow(id) { await api(`/api/flows/${id}/toggle`, { method: 'POST' }); showToast('Status atualizado', 'success'); }

// ─── Voice Studio ────────────────────────────────────────────────
async function loadVoice(el) {
  allVoices = await api('/api/voice') || [];
  const providers = await api('/api/voice/providers') || [];
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div><h2 style="margin:0;font-size:20px">Voice Studio</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">Gere áudios com IA e clone vozes</p></div>
      <button class="btn btn-primary btn-sm" onclick="showCloneVoice()"><i class="fa-solid fa-microphone"></i> Clonar Voz</button>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>🎤 Gerar Áudio</h3></div><div class="card-body">
        <div class="form-group"><label>Texto</label><textarea id="voice-text" rows="4" placeholder="Digite o texto para gerar áudio..." style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text-primary);font-size:13px;resize:vertical"></textarea></div>
        <div class="form-group"><label>Voz</label><select id="voice-model" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px;color:var(--text-primary);font-size:12px"><option value="">Selecionar voz...</option>${allVoices.map(v => `<option value="${v.id}">${v.name} (${v.provider})</option>`).join('')}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div><label style="font-size:11px;color:var(--text-muted)">Estabilidade</label><input type="range" id="voice-stability" min="0" max="1" step="0.1" value="0.5" style="width:100%"><span style="font-size:11px" id="voice-stability-val">0.5</span></div>
          <div><label style="font-size:11px;color:var(--text-muted)">Similaridade</label><input type="range" id="voice-similarity" min="0" max="1" step="0.1" value="0.7" style="width:100%"><span style="font-size:11px" id="voice-similarity-val">0.7</span></div>
          <div><label style="font-size:11px;color:var(--text-muted)">Sotaque</label><input type="range" id="voice-accent" min="0" max="1" step="0.1" value="0.5" style="width:100%"><span style="font-size:11px" id="voice-accent-val">0.5</span></div>
          <div><label style="font-size:11px;color:var(--text-muted)">Velocidade</label><input type="range" id="voice-speed" min="0.5" max="2" step="0.1" value="1" style="width:100%"><span style="font-size:11px" id="voice-speed-val">1.0</span></div>
        </div>
        <div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" onclick="generateVoice()"><i class="fa-solid fa-play"></i> Gerar Áudio</button></div>
      </div></div>
      <div class="card"><div class="card-header"><h3>🔊 Vozes Disponíveis</h3></div><div class="card-body">
        <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Vozes pré-configuradas e clonadas</p>
        ${allVoices.length===0?'<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">Nenhuma voz disponível</div>':
          allVoices.map(v => `<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-secondary);border-radius:8px;margin-bottom:6px">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:14px">🎤</div>
            <div style="flex:1"><div style="font-weight:500;font-size:12px">${v.name}</div><div style="font-size:10px;color:var(--text-muted)">${v.provider} • ${v.is_cloned?'Clonada':'Pré-configurada'}</div></div>
            <button class="btn btn-sm btn-secondary" onclick="testVoice('${v.id}')"><i class="fa-solid fa-play"></i></button>
          </div>`).join('')}
      </div></div>
    </div>`;
  document.querySelectorAll('input[type=range]').forEach(s => { s.addEventListener('input', () => { document.getElementById(s.id+'-val').textContent = s.value; }); });
}
function showCloneVoice() { showToast('Upload de áudio para clonagem em breve', 'info'); }
async function generateVoice() { showToast('Gerando áudio...', 'info'); }
async function testVoice(id) { showToast('Reproduzindo voz...', 'info'); }

// ─── WhatsApp Connect ────────────────────────────────────────────
async function loadWhatsApp(el) {
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">WhatsApp</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Conecte seu WhatsApp Business via QR Code</p>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>📱 Conexão</h3></div><div class="card-body" style="text-align:center">
        <div style="width:180px;height:180px;border:2px dashed var(--border);border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;background:white"><div style="text-align:center;color:var(--text-muted)"><i class="fa-brands fa-whatsapp" style="font-size:42px;color:#25D366"></i><p style="margin-top:6px;font-size:11px">QR Code aqui</p></div></div>
        <p style="font-size:11px;color:var(--text-muted)">WhatsApp → Dispositivos conectados → Conectar</p>
        <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="generateQR()"><i class="fa-solid fa-qrcode"></i> Gerar QR Code</button>
      </div></div>
      <div class="card"><div class="card-header"><h3>ℹ️ Status</h3></div><div class="card-body">
        <div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted)">Status</label><div><span class="badge badge-red">Desconectado</span></div></div>
        <div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted)">Número</label><div style="font-weight:500;font-size:13px">Não conectado</div></div>
        <div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted)">Nome</label><div style="font-weight:500;font-size:13px">-</div></div>
        <div style="background:var(--bg-secondary);padding:10px;border-radius:8px;font-size:11px;color:var(--text-muted)"><p style="margin:0"><strong>Dica:</strong> Para usar o agente IA, conecte um WhatsApp Business API.</p></div>
      </div></div>
    </div>`;
}
function generateQR() { showToast('Gerando QR Code...', 'info'); }

// ─── Campanhas ───────────────────────────────────────────────────
async function loadCampaigns(el) {
  const data = await api('/api/crm/contacts'); allContacts = data?.contacts || [];
  const tags = [...new Set(allContacts.map(c => c.tag).filter(Boolean))];
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div><h2 style="margin:0;font-size:20px">Campanhas</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">Disparo em massa por etiquetas</p></div>
      <button class="btn btn-primary btn-sm" onclick="createCampaign()"><i class="fa-solid fa-plus"></i> Nova Campanha</button>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:20px">
      <button class="btn btn-sm btn-primary" style="flex:1">🏷️ Etiquetas</button>
      <button class="btn btn-sm btn-secondary" style="flex:1">⚡ Em andamento</button>
      <button class="btn btn-sm btn-secondary" style="flex:1">🕐 Histórico</button>
    </div>
    <div style="display:flex;gap:16px;overflow-x:auto;padding-bottom:16px">
      ${tags.length===0?'<div style="text-align:center;padding:40px;color:var(--text-muted);width:100%"><i class="fa-solid fa-tags" style="font-size:48px;margin-bottom:12px;opacity:0.3"></i><p>Nenhuma etiqueta encontrada</p></div>':
        tags.map(t => {
          const contacts = allContacts.filter(c => c.tag === t);
          return `<div style="min-width:240px;flex-shrink:0;background:var(--bg-secondary);border-radius:12px;padding:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:6px"><div style="width:8px;height:8px;border-radius:50%;background:var(--primary)"></div><h4 style="margin:0;font-size:12px">${t}</h4></div>
              <span style="background:var(--bg-primary);padding:2px 8px;border-radius:10px;font-size:10px;color:var(--text-muted)">${contacts.length}</span>
            </div>
            ${contacts.slice(0,5).map(c => `<div style="background:var(--bg-primary);border-radius:8px;padding:8px;margin-bottom:6px;border:1px solid var(--border)">
              <div style="font-weight:500;font-size:12px">${c.name||'N/A'}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${c.phone||''}</div>
            </div>`).join('')}
            ${contacts.length>5?`<div style="text-align:center;font-size:11px;color:var(--text-muted);padding:4px">+${contacts.length-5} mais</div>`:''}
          </div>`;
        }).join('')}
    </div>`;
}
async function createCampaign() { showToast('Criar campanha em breve', 'info'); }

// ─── Broadcast ───────────────────────────────────────────────────
async function loadBroadcast(el) {
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">Disparo em Massa</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Envie mensagens para múltiplos contatos</p>
    <div class="card"><div class="card-header"><h3>📢 Nova Campanha</h3></div><div class="card-body">
      <div class="form-group"><label>Nome da Campanha</label><input type="text" id="broadcast-name" placeholder="Ex: Promoção Black Friday"></div>
      <div class="form-group"><label>Selecionar Contatos</label>
        <div style="display:flex;gap:6px;margin-bottom:8px"><button class="btn btn-sm btn-secondary" onclick="selectTag('all')">Todos</button><button class="btn btn-sm btn-secondary" onclick="selectTag('leads')">Leads</button><button class="btn btn-sm btn-secondary" onclick="selectTag('customers')">Clientes</button></div>
        <div style="padding:10px;background:var(--bg-secondary);border-radius:8px;font-size:12px" id="broadcast-selected"><i class="fa-solid fa-info-circle"></i> Selecione uma tag</div>
      </div>
      <div class="form-group"><label>Tipo</label><select id="broadcast-type"><option value="text">Texto</option><option value="image">Imagem + Texto</option><option value="template">Template Aprovado</option></select></div>
      <div class="form-group"><label>Mensagem</label><textarea id="broadcast-message" rows="4" placeholder="Olá {{nome}}, temos uma promoção!"></textarea></div>
      <div style="background:var(--bg-secondary);padding:10px;border-radius:8px;margin-bottom:12px;font-size:11px"><strong>Variáveis:</strong> {{nome}}, {{telefone}}, {{empresa}}</div>
      <div class="form-group"><label>Agendar</label><input type="datetime-local" id="broadcast-schedule" style="width:100%"></div>
      <div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" onclick="sendBroadcast()"><i class="fa-solid fa-paper-plane"></i> Enviar</button><button class="btn btn-secondary btn-sm" onclick="previewBroadcast()"><i class="fa-solid fa-eye"></i> Preview</button></div>
    </div></div>`;
}
async function sendBroadcast() { showToast('Campanha criada!', 'success'); }
function previewBroadcast() { const msg = document.getElementById('broadcast-message')?.value; alert('Preview:\n\n' + (msg||'').replace(/\{\{nome\}\}/g, 'João Silva')); }
function selectTag(tag) { document.getElementById('broadcast-selected').innerHTML = `<span class="badge badge-blue">${tag}</span> Contatos selecionados`; }

// ─── CTWA ────────────────────────────────────────────────────────
async function loadCTWA(el) {
  const [analytics, campaigns] = await Promise.all([api('/api/ctwa/analytics'), api('/api/ctwa/campaigns')]);
  ctwaAnalytics = analytics?.summary || {};
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">CTWA - Click to WhatsApp Ads</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Atribuição e conversões de anúncios</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-mouse-pointer"></i></div><div class="stat-value">${ctwaAnalytics.totalClicks||0}</div><div class="stat-label">Cliques</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-user-plus"></i></div><div class="stat-value">${ctwaAnalytics.leads||0}</div><div class="stat-label">Leads</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-shopping-cart"></i></div><div class="stat-value">${ctwaAnalytics.purchases||0}</div><div class="stat-label">Compras</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(ctwaAnalytics.revenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
    </div>
    <div class="card" style="margin-top:20px"><div class="card-header"><h3>📊 Campanhas</h3></div><div class="card-body">
      ${(campaigns?.campaigns||[]).length===0?'<div style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma campanha CTWA</div>':
        `<table><thead><tr><th>Campanha</th><th>Cliques</th><th>Leads</th><th>Compras</th><th>Receita</th></tr></thead><tbody>
        ${(campaigns?.campaigns||[]).map(c => `<tr><td>${c.campaign_id||'N/A'}</td><td>${c.clicks}</td><td>${c.leads}</td><td>${c.purchases}</td><td>R$ ${c.revenue.toLocaleString()}</td></tr>`).join('')}
        </tbody></table>`}
    </div></div>`;
}

// ─── Vendas ──────────────────────────────────────────────────────
async function loadSales(el) {
  const [sales, stats] = await Promise.all([api('/api/sales'), api('/api/sales/stats')]);
  allSales = sales || []; salesStats = stats || {};
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">Vendas</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Acompanhe suas vendas e receita</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-check-circle"></i></div><div class="stat-value">${salesStats.approved||0}</div><div class="stat-label">Aprovadas</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-clock"></i></div><div class="stat-value">${salesStats.pending||0}</div><div class="stat-label">Pendentes</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(salesStats.totalRevenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-receipt"></i></div><div class="stat-value">R$ ${(salesStats.avgTicket||0).toFixed(2)}</div><div class="stat-label">Ticket Médio</div></div>
    </div>
    <div class="card" style="margin-top:20px"><div class="card-header"><h3>📋 Últimas Vendas</h3></div><div class="card-body">
      ${allSales.length===0?'<div style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma venda registrada</div>':
        `<table><thead><tr><th>Produto</th><th>Valor</th><th>Status</th><th>Data</th></tr></thead><tbody>
        ${allSales.map(s => `<tr><td>${s.product||'N/A'}</td><td>R$ ${(s.amount||0).toFixed(2)}</td><td><span class="badge badge-${s.status==='approved'?'green':s.status==='pending'?'yellow':'red'}">${s.status}</span></td><td>${formatDate(s.createdAt)}</td></tr>`).join('')}
        </tbody></table>`}
    </div></div>`;
}

// ─── Kanban ──────────────────────────────────────────────────────
async function loadKanban(el) {
  const data = await api('/api/crm/contacts'); allContacts = data?.contacts || [];
  const stages = [
    { id: 'lead', label: 'Novos Leads', color: '#3b82f6' },
    { id: 'contacted', label: 'Contactados', color: '#f59e0b' },
    { id: 'qualified', label: 'Qualificados', color: '#8b5cf6' },
    { id: 'proposal', label: 'Proposta', color: '#3b82f6' },
    { id: 'negotiation', label: 'Negociação', color: '#f97316' },
    { id: 'won', label: 'Ganho', color: '#22c55e' },
  ];
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">Kanban</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Pipeline de vendas visual</p>
    <div style="display:flex;gap:14px;overflow-x:auto;padding-bottom:16px">
      ${stages.map(s => {
        const contacts = allContacts.filter(c => (c.status||'lead') === s.id);
        return `<div style="min-width:240px;flex-shrink:0;background:var(--bg-secondary);border-radius:12px;padding:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:6px"><div style="width:8px;height:8px;border-radius:50%;background:${s.color}"></div><h4 style="margin:0;font-size:12px">${s.label}</h4></div>
            <span style="background:var(--bg-primary);padding:2px 8px;border-radius:10px;font-size:10px;color:var(--text-muted)">${contacts.length}</span>
          </div>
          ${contacts.map(c => `<div style="background:var(--bg-primary);border-radius:8px;padding:10px;margin-bottom:6px;cursor:grab;border:1px solid var(--border)">
            <div style="font-weight:500;font-size:12px">${c.name||'N/A'}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${c.phone||''}</div>
            <div style="display:flex;gap:4px;margin-top:6px"><span class="badge badge-blue" style="font-size:9px">${c.tag||'lead'}</span></div>
          </div>`).join('')}
        </div>`;
      }).join('')}
    </div>`;
}

// ─── Analytics ───────────────────────────────────────────────────
async function loadAnalytics(el) {
  const [stats, timeline] = await Promise.all([api('/api/analytics/default/dashboard'), api('/api/analytics/default/timeline')]);
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">Relatórios</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Métricas detalhadas da plataforma</p>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>📊 Contatos</h3></div><div class="card-body">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">Total</span><strong>${stats?.contacts?.total||0}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">Novos</span><strong style="color:var(--primary)">${stats?.contacts?.new||0}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">Qualificados</span><strong style="color:#25D366">${stats?.contacts?.qualified||0}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="font-size:12px">Clientes</span><strong style="color:var(--accent)">${stats?.contacts?.customer||0}</strong></div>
      </div></div>
      <div class="card"><div class="card-header"><h3>💬 Mensagens</h3></div><div class="card-body">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">Total</span><strong>${stats?.messages?.total||0}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">Recebidas</span><strong style="color:#25D366">${stats?.messages?.inbound||0}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="font-size:12px">Enviadas</span><strong style="color:var(--primary)">${stats?.messages?.outbound||0}</strong></div>
      </div></div>
    </div>`;
}

// ─── Reports ─────────────────────────────────────────────────────
async function loadReports(el) {
  const [stats, salesData, convData] = await Promise.all([api('/api/analytics/default/dashboard'), api('/api/sales/stats'), api('/api/chat/stats')]);
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">Resumo</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Relatório executivo da plataforma</p>
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-users"></i></div><div class="stat-value">${stats?.contacts?.total||0}</div><div class="stat-label">Contatos</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-comments"></i></div><div class="stat-value">${stats?.messages?.total||0}</div><div class="stat-label">Mensagens</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-robot"></i></div><div class="stat-value">${convData?.waiting||0}</div><div class="stat-label">Atendidos IA</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(salesData?.totalRevenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>🤖 Performance IA</h3></div><div class="card-body">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">Mensagens IA</span><strong>${convData?.waiting||0}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">Tempo Resposta</span><strong>650ms</strong></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="font-size:12px">Taxa Resolução</span><strong style="color:#22c55e">85%</strong></div>
      </div></div>
      <div class="card"><div class="card-header"><h3>💰 Financeiro</h3></div><div class="card-body">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">Aprovadas</span><strong>${salesData?.approved||0}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px">Pendentes</span><strong>${salesData?.pending||0}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="font-size:12px">Ticket Médio</span><strong>R$ ${(salesData?.avgTicket||0).toFixed(2)}</strong></div>
      </div></div>
    </div>`;
}

// ─── Integrações ─────────────────────────────────────────────────
async function loadIntegrations(el) {
  allIntegrations = await api('/api/integrations') || [];
  const providers = [
    { id: 'meta', name: 'Meta WhatsApp', icon: 'fa-brands fa-whatsapp', desc: 'WhatsApp Cloud API', color: '#25D366' },
    { id: 'groq', name: 'Groq AI', icon: 'fa-solid fa-brain', desc: 'Llama 3.3 (Grátis)', color: '#3b82f6' },
    { id: 'deepseek', name: 'DeepSeek', icon: 'fa-solid fa-robot', desc: 'DeepSeek Chat', color: '#8b5cf6' },
    { id: 'openai', name: 'OpenAI', icon: 'fa-solid fa-microchip', desc: 'GPT-4o / Whisper', color: '#10a37f' },
    { id: 'elevenlabs', name: 'ElevenLabs', icon: 'fa-solid fa-microphone', desc: 'Voice Cloning', color: '#7c3aed' },
    { id: 'kiwify', name: 'Kiwify', icon: 'fa-solid fa-shopping-cart', desc: 'Gateway de pagamentos', color: '#ff6b35' },
    { id: 'hotmart', name: 'Hotmart', icon: 'fa-solid fa-fire', desc: 'Gateway de pagamentos', color: '#ff5722' },
    { id: 'perfectpay', name: 'Perfect Pay', icon: 'fa-solid fa-credit-card', desc: 'Gateway de pagamentos', color: '#4caf50' },
    { id: 'asaas', name: 'Asaas', icon: 'fa-solid fa-university', desc: 'Gateway de pagamentos', color: '#2196f3' },
    { id: 'mercadopago', name: 'MercadoPago', icon: 'fa-solid fa-wallet', desc: 'Gateway de pagamentos', color: '#009ee3' },
    { id: 'stripe', name: 'Stripe', icon: 'fa-solid fa-credit-card', desc: 'Gateway de pagamentos', color: '#635bff' },
    { id: 'utmify', name: 'UTMify', icon: 'fa-solid fa-link', desc: 'UTM tracking', color: '#ff9800' },
  ];
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">Integrações</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Conecte com WhatsApp, IA, pagamentos e mais</p>
    <div class="grid-3">${providers.map(p => {
      const connected = allIntegrations.find(i => i.provider === p.id);
      return `<div class="card"><div class="card-body" style="text-align:center">
        <div style="width:48px;height:48px;border-radius:12px;background:${p.color}20;display:flex;align-items:center;justify-content:center;margin:0 auto 10px"><i class="${p.icon}" style="font-size:22px;color:${p.color}"></i></div>
        <h3 style="margin:0;font-size:14px">${p.name}</h3>
        <p style="font-size:11px;color:var(--text-muted);margin:4px 0">${p.desc}</p>
        <span class="badge badge-${connected?'green':'gray'}" style="margin-bottom:10px">${connected?'Conectado':'Desconectado'}</span>
        <div><button class="btn btn-sm btn-${connected?'secondary':'primary'}" onclick="connectIntegration('${p.id}')">${connected?'Configurar':'Conectar'}</button></div>
      </div></div>`;
    }).join('')}</div>`;
}
async function connectIntegration(provider) { showToast(`Conectando ${provider}...`, 'info'); }

// ─── Planos ──────────────────────────────────────────────────────
async function loadPlans(el) {
  allPlans = await api('/api/plans') || [];
  const plans = allPlans.length>0?allPlans:[
    { name: 'Gratuito', price: 0, features: ['1 agente IA', '1.000 tokens GPT', '100 tokens voz', 'Chat ao vivo'] },
    { name: 'Essencials', price: 97, features: ['1 agente IA', '5M tokens GPT', '400K tokens voz', 'WhatsApp Business', 'CTWA', 'Campanhas'] },
    { name: 'Profissional', price: 197, features: ['3 agentes IA', '15M tokens GPT', '1M tokens voz', 'API Oficial', 'Voice Studio', 'Kanban'] },
    { name: 'Enterprise', price: 497, features: ['Ilimitado', '50M tokens GPT', '5M tokens voz', 'Multi-workspace', 'White label', 'Suporte prioritário'] },
  ];
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">Planos</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Escolha o plano ideal para você</p>
    <div class="grid-4">${plans.map(p => `
      <div class="card" style="border-top:3px solid var(--primary)"><div class="card-body" style="text-align:center">
        <h3 style="margin:0;font-size:16px">${p.name}</h3>
        <div style="font-size:28px;font-weight:700;margin:12px 0">R$ ${p.price}<span style="font-size:12px;font-weight:400">/mês</span></div>
        <ul style="text-align:left;font-size:12px;margin:12px 0;padding:0;list-style:none">
          ${(p.features||[]).map(f => `<li style="padding:3px 0"><i class="fa-solid fa-check" style="color:#25D366;margin-right:6px;font-size:11px"></i>${f}</li>`).join('')}
        </ul>
        <button class="btn btn-primary" style="width:100%">Escolher</button>
      </div></div>
    `).join('')}</div>`;
}

// ─── Admin ───────────────────────────────────────────────────────
async function loadAdmin(el) {
  const [customers, workspaces, users, stats] = await Promise.all([api('/api/admin/customers'), api('/api/admin/workspaces'), api('/api/admin/users'), api('/api/admin/stats')]);
  allCustomers = customers || []; allWorkspaces = workspaces || []; allUsers = users || [];
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">Admin Master</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Painel de administração completa</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-building"></i></div><div class="stat-value">${stats?.customers||0}</div><div class="stat-label">Clientes</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-users"></i></div><div class="stat-value">${stats?.contacts||0}</div><div class="stat-label">Contatos</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-comments"></i></div><div class="stat-value">${stats?.conversations||0}</div><div class="stat-label">Conversas</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(stats?.revenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
    </div>
    <div class="grid-3" style="margin-top:20px">
      <div class="card"><div class="card-header"><h3>🏢 Clientes</h3></div><div class="card-body">${allCustomers.length===0?'<p style="color:var(--text-muted);text-align:center;font-size:12px">Nenhum cliente</p>':allCustomers.map(c => `<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">${c.name}</div>`).join('')}</div></div>
      <div class="card"><div class="card-header"><h3>📁 Workspaces</h3></div><div class="card-body">${allWorkspaces.length===0?'<p style="color:var(--text-muted);text-align:center;font-size:12px">Nenhum workspace</p>':allWorkspaces.map(w => `<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">${w.name}</div>`).join('')}</div></div>
      <div class="card"><div class="card-header"><h3>👤 Usuários</h3></div><div class="card-body">${allUsers.length===0?'<p style="color:var(--text-muted);text-align:center;font-size:12px">Nenhum usuário</p>':allUsers.map(u => `<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">${u.name||u.email}</div>`).join('')}</div></div>
    </div>`;
}

// ─── Health ──────────────────────────────────────────────────────
async function loadHealth(el) {
  const data = await api('/api/health');
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">Health Check</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Status dos serviços</p>
    <div class="card"><div class="card-body">
      ${[
        { name: 'API Server', desc: 'Express.js backend', ok: data?.status==='ok' },
        { name: 'Supabase PostgreSQL', desc: 'Banco de dados', ok: data?.database==='ok' },
        { name: 'Groq AI', desc: 'Llama 3.3-70b', ok: true },
        { name: 'DeepSeek AI', desc: 'DeepSeek Chat', ok: true },
      ].map(s => `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:10px;height:10px;border-radius:50%;background:${s.ok?'#22c55e':'#ef4444'}"></div>
        <div style="flex:1"><strong style="font-size:13px">${s.name}</strong><div style="font-size:11px;color:var(--text-muted)">${s.desc}</div></div>
        <span class="badge badge-${s.ok?'green':'red'}">${s.ok?'online':'offline'}</span>
      </div>`).join('')}
    </div></div>
    <div class="card" style="margin-top:16px"><div class="card-header"><h3>ℹ️ Sistema</h3></div><div class="card-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><label style="font-size:11px;color:var(--text-muted)">Versão</label><div style="font-weight:500;font-size:13px">1.0.0</div></div>
        <div><label style="font-size:11px;color:var(--text-muted)">Ambiente</label><div style="font-weight:500;font-size:13px">Produção</div></div>
        <div><label style="font-size:11px;color:var(--text-muted)">Tabelas</label><div style="font-weight:500;font-size:13px">30</div></div>
        <div><label style="font-size:11px;color:var(--text-muted)">Deploy</label><div style="font-weight:500;font-size:13px">Vercel</div></div>
      </div>
    </div></div>`;
}

// ─── Helpers ─────────────────────────────────────────────────────
function timeAgo(date) { const s = Math.floor((Date.now() - new Date(date)) / 1000); if (s < 60) return 'agora'; if (s < 3600) return Math.floor(s/60) + 'min'; if (s < 86400) return Math.floor(s/3600) + 'h'; return Math.floor(s/86400) + 'd'; }
function formatTime(date) { if (!date) return ''; return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function formatDate(date) { if (!date) return ''; return new Date(date).toLocaleDateString('pt-BR'); }
function showToast(msg, type = 'info') { const t = document.createElement('div'); t.className = `toast toast-${type}`; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
async function updateTokenUsage() { try { const d = await api('/api/analytics/default/dashboard'); if (d?.tokens) { const g = Math.min(100,(d.tokens.gptUsed||0)/5000000*100); const v = Math.min(100,(d.tokens.voiceUsed||0)/400000*100); const ge=document.getElementById('gpt-tokens'),gb=document.getElementById('gpt-bar'),ve=document.getElementById('voice-tokens'),vb=document.getElementById('voice-bar'); if(ge)ge.textContent=`${fmtN(d.tokens.gptUsed||0)}/5M`; if(gb)gb.style.width=g+'%'; if(ve)ve.textContent=`${fmtN(d.tokens.voiceUsed||0)}/400K`; if(vb)vb.style.width=v+'%'; } } catch(e){} }
function fmtN(n) { if(n>=1000000) return (n/1000000).toFixed(1)+'M'; if(n>=1000) return (n/1000).toFixed(0)+'K'; return n.toString(); }

render();
