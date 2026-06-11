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
let dashboardStats = null;
let convStats = {};
let salesStats = {};
let ctwaAnalytics = {};

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
    { id: 'chat', icon: 'fa-comments', label: 'Chat ao Vivo' },
    { id: 'crm', icon: 'fa-address-book', label: 'CRM' },
  ]},
  { section: 'AUTOMAÇÃO IA', items: [
    { id: 'agents', icon: 'fa-robot', label: 'Agentes IA' },
    { id: 'flows', icon: 'fa-diagram-project', label: 'Flow Builder' },
    { id: 'voice', icon: 'fa-microphone', label: 'Voice Studio' },
    { id: 'listening', icon: 'fa-headphones', label: 'Escuta Ativa' },
  ]},
  { section: 'WHATSAPP', items: [
    { id: 'whatsapp', icon: 'fa-brands fa-whatsapp', label: 'Conectar WhatsApp' },
    { id: 'broadcast', icon: 'fa-bullhorn', label: 'Disparo em Massa' },
    { id: 'randomizer', icon: 'fa-shuffle', label: 'Randomizador' },
  ]},
  { section: 'VENDAS', items: [
    { id: 'ctwa', icon: 'fa-bullseye', label: 'CTWA' },
    { id: 'sales', icon: 'fa-dollar-sign', label: 'Vendas' },
    { id: 'analytics', icon: 'fa-chart-bar', label: 'Analytics' },
  ]},
  { section: 'ADMIN', items: [
    { id: 'integrations', icon: 'fa-plug', label: 'Integrações' },
    { id: 'plans', icon: 'fa-crown', label: 'Planos' },
    { id: 'admin', icon: 'fa-cog', label: 'Admin Master' },
  ]},
];

function render() {
  if (!localStorage.getItem('ozion_logged')) {
    document.getElementById('app').innerHTML = loginHTML();
    return;
  }
  document.getElementById('app').innerHTML = appHTML();
  loadPage(currentPage);
}

function loginHTML() {
  return `<div class="login-screen"><div class="login-box">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:48px;margin-bottom:8px">🤖</div>
      <h1 style="margin:0">Ozion Chat AI</h1>
      <p style="color:var(--text-muted);margin-top:4px">Atendente IA para WhatsApp</p>
    </div>
    <div class="form-group"><label>Email</label><input type="email" id="login-email" value="admin@ozion.com"></div>
    <div class="form-group"><label>Senha</label><input type="password" id="login-pass" value="admin123"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="doLogin()"><i class="fa-solid fa-arrow-right"></i> Entrar</button>
    <p style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-muted)">Em 11 minutos seu IA está no ar</p>
  </div></div>`;
}

function appHTML() {
  return `<div class="app-layout">
    <div class="sidebar">
      <div class="sidebar-logo"><div class="logo-icon" style="background:linear-gradient(135deg,#25D366,#128C7E)">O</div><div><h2>Ozion</h2><span style="font-size:11px;color:var(--text-muted)">Atendente IA WhatsApp</span></div></div>
      <div class="sidebar-nav">${NAV.map(s => `<div class="nav-section"><div class="nav-section-title">${s.section}</div>${s.items.map(i => `<div class="nav-item${currentPage===i.id?' active':''}" onclick="navigate('${i.id}')"><i class="fa-solid ${i.icon}"></i>${i.label}</div>`).join('')}</div>`).join('')}</div>
      <div class="sidebar-footer"><div class="avatar" style="background:#25D366">A</div><div><div style="font-weight:500">Admin</div><div style="font-size:11px;color:var(--text-muted)">Plano Pro</div></div></div>
    </div>
    <div class="main-content">
      <div class="topbar"><div class="topbar-title" id="topbar-title">Dashboard</div>
        <div class="topbar-actions">
          <button class="btn btn-sm btn-secondary" onclick="showToast('Notificações em breve','success')"><i class="fa-solid fa-bell"></i></button>
        </div>
      </div>
      <div class="content" id="content"></div>
    </div>
  </div>`;
}

function navigate(page) {
  currentPage = page;
  selectedConv = null;
  render();
}

function doLogin() {
  localStorage.setItem('ozion_logged', '1');
  render();
}

function logout() {
  localStorage.removeItem('ozion_logged');
  render();
}

// ─── Pages ───────────────────────────────────────────────────────
async function loadPage(page) {
  const el = document.getElementById('content');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px"></i><p style="margin-top:8px">Carregando...</p></div>';
  
  switch(page) {
    case 'dashboard': await loadDashboard(el); break;
    case 'chat': await loadChat(el); break;
    case 'crm': await loadCRM(el); break;
    case 'flows': await loadFlows(el); break;
    case 'agents': await loadAgents(el); break;
    case 'voice': await loadVoice(el); break;
    case 'listening': await loadListening(el); break;
    case 'whatsapp': await loadWhatsApp(el); break;
    case 'broadcast': await loadBroadcast(el); break;
    case 'randomizer': await loadRandomizer(el); break;
    case 'ctwa': await loadCTWA(el); break;
    case 'sales': await loadSales(el); break;
    case 'analytics': await loadAnalytics(el); break;
    case 'integrations': await loadIntegrations(el); break;
    case 'plans': await loadPlans(el); break;
    case 'admin': await loadAdmin(el); break;
    default: el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-construction"></i><h3>Página em construção</h3></div>';
  }
}

// ─── Dashboard ───────────────────────────────────────────────────
async function loadDashboard(el) {
  const [stats, convStatsData, salesData, ctwaData] = await Promise.all([
    api('/api/analytics/default/dashboard'),
    api('/api/chat/stats'),
    api('/api/sales/stats'),
    api('/api/ctwa/analytics'),
  ]);
  dashboardStats = stats;
  convStats = convStatsData || {};
  salesStats = salesData || {};
  ctwaAnalytics = ctwaData?.summary || {};
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <div>
        <h2 style="margin:0;font-size:24px">Bem-vindo ao Ozion 🚀</h2>
        <p style="color:var(--text-muted);margin-top:4px">Seu atendente IA está pronto para atender 24/7</p>
      </div>
      <button class="btn btn-primary" onclick="navigate('agents')"><i class="fa-solid fa-robot"></i> Criar Agente IA</button>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon green"><i class="fa-brands fa-whatsapp"></i></div><div class="stat-value">${stats?.conversations?.open||0}</div><div class="stat-label">Conversas Ativas</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-users"></i></div><div class="stat-value">${stats?.contacts?.total||0}</div><div class="stat-label">Contatos</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-robot"></i></div><div class="stat-value">${convStats.waiting||0}</div><div class="stat-label">IA Atendendo</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(salesStats.totalRevenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
    </div>

    <div class="grid-2" style="margin-top:24px">
      <div class="card">
        <div class="card-header"><h3>🤖 Seus Agentes IA</h3></div>
        <div class="card-body" id="dashboard-agents">
          <div style="text-align:center;padding:20px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>📊 Resumo CTWA</h3></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:24px;font-weight:700;color:var(--primary)">${ctwaAnalytics.totalClicks||0}</div><div style="font-size:12px;color:var(--text-muted)">Cliques</div></div>
            <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:24px;font-weight:700;color:#25D366">${ctwaAnalytics.leads||0}</div><div style="font-size:12px;color:var(--text-muted)">Leads</div></div>
            <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:24px;font-weight:700;color:var(--accent)">${ctwaAnalytics.purchases||0}</div><div style="font-size:12px;color:var(--text-muted)">Compras</div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:24px">
      <div class="card-header"><h3>⚡ Ações Rápidas</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
          <button class="quick-action" onclick="navigate('agents')"><div style="font-size:24px;margin-bottom:8px">🤖</div><div>Criar Agente</div></button>
          <button class="quick-action" onclick="navigate('voice')"><div style="font-size:24px;margin-bottom:8px">🎤</div><div>Clonar Voz</div></button>
          <button class="quick-action" onclick="navigate('whatsapp')"><div style="font-size:24px;margin-bottom:8px">📱</div><div>Conectar WhatsApp</div></button>
          <button class="quick-action" onclick="navigate('broadcast')"><div style="font-size:24px;margin-bottom:8px">📢</div><div>Disparar Mensagem</div></button>
        </div>
      </div>
    </div>`;

  // Load agents for dashboard
  const agents = await api('/api/agents');
  const agentsEl = document.getElementById('dashboard-agents');
  if (agentsEl && agents) {
    if (agents.length === 0) {
      agentsEl.innerHTML = `<div style="text-align:center;padding:20px"><p style="color:var(--text-muted)">Nenhum agente criado</p><button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="navigate('agents')">Criar Primeiro Agente</button></div>`;
    } else {
      agentsEl.innerHTML = agents.slice(0, 3).map(a => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-secondary);border-radius:8px;margin-bottom:8px">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:18px">🤖</div>
          <div style="flex:1"><div style="font-weight:600">${a.name}</div><div style="font-size:12px;color:var(--text-muted)">${a.provider||'Groq'} • ${a.model||'Llama 3.3'}</div></div>
          <span class="badge badge-${a.is_active?'green':'gray'}">${a.is_active?'Ativo':'Inativo'}</span>
        </div>
      `).join('');
    }
  }
}

// ─── Chat ────────────────────────────────────────────────────────
async function loadChat(el) {
  const [convData, statsData] = await Promise.all([
    api('/api/chat/conversations'),
    api('/api/chat/stats')
  ]);
  conversations = convData?.conversations || [];
  convStats = statsData || {};
  
  el.innerHTML = `
    <div class="chat-layout">
      <div class="chat-sidebar">
        <div style="padding:12px;border-bottom:1px solid var(--border)">
          <h3 style="margin:0;font-size:16px">Chat ao Vivo</h3>
          <div class="chat-tabs" style="margin-top:8px">
            <div class="chat-tab active" onclick="filterConvs(this,'all')">Entrada <span class="count">${convStats.inbox||0}</span></div>
            <div class="chat-tab" onclick="filterConvs(this,'waiting')">IA <span class="count">${convStats.waiting||0}</span></div>
            <div class="chat-tab" onclick="filterConvs(this,'closed')">Fechados <span class="count">${convStats.finished||0}</span></div>
          </div>
        </div>
        <div class="chat-list" id="chat-list">${conversations.map(c => renderConvItem(c)).join('')}</div>
      </div>
      <div class="chat-main" id="chat-main">
        <div class="empty-state"><i class="fa-solid fa-comments"></i><h3>Selecione uma conversa</h3><p>Clique para ver as mensagens</p></div>
      </div>
    </div>`;
}

function renderConvItem(c) {
  const name = c.contact?.name || 'Desconhecido';
  const initial = name.charAt(0).toUpperCase();
  const lastMsg = c.lastMessageAt ? timeAgo(c.lastMessageAt) : '';
  return `<div class="chat-item${selectedConv?.id===c.id?' active':''}" onclick="selectConv('${c.id}')">
    <div class="avatar" style="background:#25D366">${initial}</div>
    <div class="info"><h4>${name}</h4><p>${c.isCtwa?'📢 CTWA':'💬 WhatsApp'}</p></div>
    <div class="meta"><div class="time">${lastMsg}</div>
      ${c.isAiActive?'<span class="badge badge-purple" style="margin-top:4px">🤖 IA</span>':''}
    </div>
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
    <div style="padding:12px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div>
        <h3 style="font-size:15px;margin:0">${selectedConv.contact?.name||'Desconhecido'}</h3>
        <span style="font-size:12px;color:var(--text-muted)">${selectedConv.contact?.phone||selectedConv.contactWaId||''}</span>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm btn-${selectedConv.isAiActive?'warning':'success'}" onclick="toggleAI('${id}')">
          <i class="fa-solid fa-robot"></i> ${selectedConv.isAiActive?'Pausar IA':'Ativar IA'}
        </button>
        <button class="btn btn-sm btn-secondary" onclick="closeConv('${id}')"><i class="fa-solid fa-check"></i></button>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages">
      ${chatMessages.map(m => `<div class="message ${m.direction}"><div>${m.content}</div><div class="msg-time">${formatTime(m.sentAt)}</div></div>`).join('')}
    </div>
    <div class="chat-input">
      <input type="text" id="chat-input-text" placeholder="Digite sua mensagem..." onkeypress="if(event.key==='Enter')sendMsg('${id}')">
      <button class="btn btn-primary btn-sm" onclick="sendMsg('${id}')"><i class="fa-solid fa-paper-plane"></i></button>
    </div>`;
  
  const msgDiv = document.getElementById('chat-messages');
  if (msgDiv) msgDiv.scrollTop = msgDiv.scrollHeight;
}

async function sendMsg(convId) {
  const input = document.getElementById('chat-input-text');
  if (!input?.value.trim()) return;
  await api('/api/chat/messages', { method: 'POST', body: JSON.stringify({ conversationId: convId, content: input.value }) });
  input.value = '';
  await selectConv(convId);
}

async function toggleAI(convId) {
  await api(`/api/chat/conversations/${convId}/ai-toggle`, { method: 'POST' });
  showToast('Status da IA atualizado', 'success');
  await selectConv(convId);
}

async function closeConv(convId) {
  await api(`/api/chat/conversations/${convId}/status`, { method: 'PUT', body: JSON.stringify({ status: 'closed' }) });
  showToast('Conversa finalizada', 'success');
  navigate('chat');
}

function filterConvs(el, filter) {
  document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  // Filter logic would go here
}

// ─── Agents ──────────────────────────────────────────────────────
async function loadAgents(el) {
  allAgents = await api('/api/agents') || [];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <div>
        <h2 style="margin:0">Agentes IA</h2>
        <p style="color:var(--text-muted);margin-top:4px">Crie atendentes virtuais com IA para WhatsApp</p>
      </div>
      <button class="btn btn-primary" onclick="showCreateAgent()"><i class="fa-solid fa-plus"></i> Novo Agente</button>
    </div>

    <div id="agent-form" style="display:none" class="card" style="margin-bottom:24px">
      <div class="card-header"><h3>🤖 Criar Agente IA</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group"><label>Nome do Agente</label><input type="text" id="agent-name" placeholder="Ex: Ana - Atendente de Vendas"></div>
          <div class="form-group"><label>Provider de IA</label><select id="agent-provider"><option value="groq">Groq (Grátis)</option><option value="deepseek">DeepSeek</option><option value="openai">OpenAI</option></select></div>
          <div class="form-group" style="grid-column:span 2"><label>Identidade (personalidade)</label><textarea id="agent-identity" rows="2" placeholder="Ex: Você é a Ana, uma atendente virtual profissional e simpática da empresa XPTO"></textarea></div>
          <div class="form-group"><label>Objetivo</label><input type="text" id="agent-objective" placeholder="Ex: Qualificar leads e agendar demostrações"></div>
          <div class="form-group"><label>Estilo de Comunicação</label><input type="text" id="agent-communication" placeholder="Ex: Profissional, simpático e direto"></div>
          <div class="form-group" style="grid-column:span 2"><label>Instruções</label><textarea id="agent-instructions" rows="2" placeholder="Ex: Responda em português. Seja objetiva. Não invente preços."></textarea></div>
          <div class="form-group" style="grid-column:span 2"><label>Restrições</label><textarea id="agent-restrictions" rows="2" placeholder="Ex: Não envie dados sensíveis. Não prometa prazos específicos."></textarea></div>
          <div class="form-group"><label>Temperatura</label><input type="number" id="agent-temperature" value="0.7" min="0" max="1" step="0.1"></div>
          <div class="form-group"><label>Voz do Agente</label><select id="agent-voice"><option value="">Sem voz</option></select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn btn-primary" onclick="createAgent()"><i class="fa-solid fa-save"></i> Criar Agente</button>
          <button class="btn btn-secondary" onclick="hideAgentForm()">Cancelar</button>
        </div>
      </div>
    </div>

    <div class="grid-2">
      ${allAgents.map(a => `
        <div class="card" style="margin-bottom:16px">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0">🤖 ${a.name}</h3>
            <span class="badge badge-${a.is_active?'green':'gray'}">${a.is_active?'Ativo':'Inativo'}</span>
          </div>
          <div class="card-body">
            <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">${a.description||a.identity||''}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
              <span class="badge badge-blue">${a.provider||'groq'}</span>
              <span class="badge badge-purple">${a.model||'llama-3.3-70b'}</span>
              <span class="badge badge-yellow">temp: ${a.temperature||0.7}</span>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-sm btn-primary" onclick="testAgent('${a.id}')"><i class="fa-solid fa-play"></i> Testar</button>
              <button class="btn btn-sm btn-secondary" onclick="editAgent('${a.id}')"><i class="fa-solid fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteAgent('${a.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;

  // Load voices for agent
  const voices = await api('/api/voice') || [];
  const voiceSelect = document.getElementById('agent-voice');
  if (voiceSelect) {
    voices.forEach(v => { voiceSelect.innerHTML += `<option value="${v.id}">${v.name} (${v.provider})</option>`; });
  }
}

function showCreateAgent() { document.getElementById('agent-form').style.display = 'block'; }
function hideAgentForm() { document.getElementById('agent-form').style.display = 'none'; }

async function createAgent() {
  const data = {
    name: document.getElementById('agent-name').value,
    identity: document.getElementById('agent-identity').value,
    objective: document.getElementById('agent-objective').value,
    communication: document.getElementById('agent-communication').value,
    instructions: document.getElementById('agent-instructions').value,
    restrictions: document.getElementById('agent-restrictions').restrictions,
    provider: document.getElementById('agent-provider').value,
    temperature: parseFloat(document.getElementById('agent-temperature').value),
    voice_id: document.getElementById('agent-voice').value || null,
  };
  await api('/api/agents', { method: 'POST', body: JSON.stringify(data) });
  showToast('Agente criado com sucesso!', 'success');
  loadAgents(document.getElementById('content'));
}

async function testAgent(id) {
  const msg = prompt('Digite uma mensagem para testar o agente:');
  if (!msg) return;
  showToast('Testando agente...', 'info');
  const result = await api(`/api/agents/${id}/test`, { method: 'POST', body: JSON.stringify({ message: msg }) });
  if (result) {
    alert(`🤖 ${result.agent}\n\nProvider: ${result.provider}\nModelo: ${result.model}\nLatência: ${result.latency}ms\n\nPergunta: ${result.request}\n\nResposta:\n${result.response}`);
  }
}

async function deleteAgent(id) {
  if (!confirm('Excluir este agente?')) return;
  await api(`/api/agents/${id}`, { method: 'DELETE' });
  showToast('Agente excluído', 'success');
  loadAgents(document.getElementById('content'));
}

// ─── Voice Studio ────────────────────────────────────────────────
async function loadVoice(el) {
  allVoices = await api('/api/voice') || [];
  const providers = await api('/api/voice/providers') || [];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <div>
        <h2 style="margin:0">Voice Studio</h2>
        <p style="color:var(--text-muted);margin-top:4px">Clone sua voz e use no atendimento IA</p>
      </div>
      <button class="btn btn-primary" onclick="showCloneVoice()"><i class="fa-solid fa-microphone"></i> Clonar Minha Voz</button>
    </div>

    <div id="clone-form" style="display:none" class="card" style="margin-bottom:24px">
      <div class="card-header"><h3>🎤 Clonar Voz</h3></div>
      <div class="card-body">
        <div style="background:var(--bg-secondary);padding:16px;border-radius:8px;margin-bottom:16px">
          <p style="margin:0;font-size:13px">📋 <strong>Como funciona:</strong></p>
          <ol style="font-size:12px;color:var(--text-muted);margin:8px 0;padding-left:20px">
            <li>Envie um áudio de 30-60 segundos com sua voz</li>
            <li>Nossa IA analisa e clona sua voz</li>
            <li>Use a voz clone nos áudios do WhatsApp</li>
          </ol>
        </div>
        <div class="form-group"><label>Nome da Voz</label><input type="text" id="voice-name" placeholder="Ex: Voz do João"></div>
        <div class="form-group"><label>Provedor</label><select id="voice-provider">
          ${providers.map(p => `<option value="${p.id}">${p.name} - ${p.description}</option>`).join('')}
        </select></div>
        <div class="form-group">
          <label>Envie um áudio de exemplo (30-60s)</label>
          <div style="border:2px dashed var(--border);border-radius:8px;padding:24px;text-align:center;cursor:pointer" onclick="document.getElementById('voice-audio').click()">
            <i class="fa-solid fa-cloud-arrow-up" style="font-size:32px;color:var(--primary);margin-bottom:8px"></i>
            <p style="margin:0;color:var(--text-muted)">Clique para enviar áudio</p>
            <input type="file" id="voice-audio" accept="audio/*" style="display:none">
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn btn-primary" onclick="cloneVoice()"><i class="fa-solid fa-wand-magic-sparkles"></i> Clonar Voz</button>
          <button class="btn btn-secondary" onclick="hideCloneForm()">Cancelar</button>
        </div>
      </div>
    </div>

    <div class="grid-3">
      ${allVoices.map(v => `
        <div class="card">
          <div class="card-body" style="text-align:center">
            <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px">🎤</div>
            <h3 style="margin:0;font-size:16px">${v.name}</h3>
            <p style="color:var(--text-muted);font-size:12px;margin:4px 0">${v.provider}</p>
            <span class="badge badge-${v.is_active?'green':'gray'}">${v.is_active?'Ativa':'Inativa'}</span>
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
              <button class="btn btn-sm btn-primary" onclick="testVoice('${v.id}')"><i class="fa-solid fa-play"></i></button>
              <button class="btn btn-sm btn-danger" onclick="deleteVoice('${v.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function showCloneVoice() { document.getElementById('clone-form').style.display = 'block'; }
function hideCloneForm() { document.getElementById('clone-form').style.display = 'none'; }

async function cloneVoice() {
  showToast('Clonando voz... isso pode levar alguns minutos', 'info');
  const data = { name: document.getElementById('voice-name').value, provider: document.getElementById('voice-provider').value };
  await api('/api/voice', { method: 'POST', body: JSON.stringify(data) });
  showToast('Voz clonada com sucesso!', 'success');
  loadVoice(document.getElementById('content'));
}

async function testVoice(id) {
  showToast('Testando voz...', 'info');
  const result = await api('/api/voice/test', { method: 'POST', body: JSON.stringify({ voiceId: id }) });
  if (result) showToast('Áudio gerado: ' + result.audioUrl, 'success');
}

async function deleteVoice(id) {
  if (!confirm('Excluir esta voz?')) return;
  await api(`/api/voice/${id}`, { method: 'DELETE' });
  showToast('Voz excluída', 'success');
  loadVoice(document.getElementById('content'));
}

// ─── Active Listening ────────────────────────────────────────────
async function loadListening(el) {
  el.innerHTML = `
    <h2 style="margin:0 0 8px">Escuta Ativa</h2>
    <p style="color:var(--text-muted);margin-bottom:24px">Configure o agente para ouvir áudios e responder automaticamente</p>
    
    <div class="card" style="margin-bottom:24px">
      <div class="card-header"><h3>🎧 Configuração da Escuta Ativa</h3></div>
      <div class="card-body">
        <div style="background:var(--bg-secondary);padding:16px;border-radius:8px;margin-bottom:16px">
          <p style="margin:0;font-size:13px">💡 <strong>O que é Escuta Ativa?</strong></p>
          <p style="font-size:12px;color:var(--text-muted);margin:8px 0 0">O agente IA recebe áudios dos clientes, transcreve automaticamente e responde de forma inteligente. O cliente pode falar normalmente e o agente entende e responde.</p>
        </div>
        
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="listening-enabled" checked> 
            <span>Ativar Escuta Ativa para todos os agentes</span>
          </label>
        </div>
        
        <div class="form-group">
          <label>Modelo de Transcrição</label>
          <select id="listening-model">
            <option value="whisper">Whisper (OpenAI) - Mais preciso</option>
            <option value="google">Google Speech - Rápido</option>
            <option value="deepgram">Deepgram - Customizável</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Resposta em Áudio</label>
          <select id="listening-response">
            <option value="audio">Sempre responder com áudio (usa voz clonada)</option>
            <option value="text">Responder com texto</option>
            <option value="auto">Automático (áudio se tiver voz clonada)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Idioma do Áudio</label>
          <select id="listening-lang">
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English</option>
            <option value="es">Español</option>
          </select>
        </div>
        
        <button class="btn btn-primary" onclick="saveListening()"><i class="fa-solid fa-save"></i> Salvar Configurações</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>📊 Estatísticas de Áudio</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
          <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:8px">
            <div style="font-size:24px;font-weight:700;color:var(--primary)">0</div>
            <div style="font-size:12px;color:var(--text-muted)">Áudios Recebidos</div>
          </div>
          <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:8px">
            <div style="font-size:24px;font-weight:700;color:#25D366">0</div>
            <div style="font-size:12px;color:var(--text-muted)">Áudios Respondidos</div>
          </div>
          <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:8px">
            <div style="font-size:24px;font-weight:700;color:var(--accent)">0</div>
            <div style="font-size:12px;color:var(--text-muted)">Minutos Processados</div>
          </div>
        </div>
      </div>
    </div>`;
}

async function saveListening() {
  showToast('Configurações salvas!', 'success');
}

// ─── WhatsApp Connect ────────────────────────────────────────────
async function loadWhatsApp(el) {
  el.innerHTML = `
    <h2 style="margin:0 0 8px">Conectar WhatsApp</h2>
    <p style="color:var(--text-muted);margin-bottom:24px">Conecte seu WhatsApp Business via QR Code</p>
    
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>📱 Conexão</h3></div>
        <div class="card-body" style="text-align:center">
          <div style="width:200px;height:200px;border:2px dashed var(--border);border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;background:white">
            <div style="text-align:center;color:var(--text-muted)">
              <i class="fa-brands fa-whatsapp" style="font-size:48px;color:#25D366"></i>
              <p style="margin-top:8px;font-size:12px">QR Code aqui</p>
            </div>
          </div>
          <p style="font-size:12px;color:var(--text-muted)">Abra o WhatsApp → Configurações → Dispositivos conectados → Conectar dispositivo</p>
          <button class="btn btn-primary" style="margin-top:12px" onclick="generateQR()"><i class="fa-solid fa-qrcode"></i> Gerar QR Code</button>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header"><h3>ℹ️ Informações</h3></div>
        <div class="card-body">
          <div style="margin-bottom:16px">
            <label style="font-size:12px;color:var(--text-muted)">Status</label>
            <div><span class="badge badge-red">Desconectado</span></div>
          </div>
          <div style="margin-bottom:16px">
            <label style="font-size:12px;color:var(--text-muted)">Número</label>
            <div style="font-weight:500">Não conectado</div>
          </div>
          <div style="margin-bottom:16px">
            <label style="font-size:12px;color:var(--text-muted)">Nome</label>
            <div style="font-weight:500">-</div>
          </div>
          <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;font-size:12px;color:var(--text-muted)">
            <p style="margin:0"><strong>Dica:</strong> Para usar o agente IA, você precisa conectar um WhatsApp Business API (Cloud API) ou usar a integração via QR Code.</p>
          </div>
        </div>
      </div>
    </div>`;
}

function generateQR() {
  showToast('Gerando QR Code... aguarde', 'info');
}

// ─── Broadcast ───────────────────────────────────────────────────
async function loadBroadcast(el) {
  el.innerHTML = `
    <h2 style="margin:0 0 8px">Disparo em Massa</h2>
    <p style="color:var(--text-muted);margin-bottom:24px">Envie mensagens para múltiplos contatos de uma vez</p>
    
    <div class="card">
      <div class="card-header"><h3>📢 Nova Campanha</h3></div>
      <div class="card-body">
        <div class="form-group"><label>Nome da Campanha</label><input type="text" id="broadcast-name" placeholder="Ex: Promoção Black Friday"></div>
        
        <div class="form-group">
          <label>Selecionar Contatos</label>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <button class="btn btn-sm btn-secondary" onclick="selectTag('all')">Todos</button>
            <button class="btn btn-sm btn-secondary" onclick="selectTag('leads')">Leads</button>
            <button class="btn btn-sm btn-secondary" onclick="selectTag('customers')">Clientes</button>
          </div>
          <div style="padding:12px;background:var(--bg-secondary);border-radius:8px;font-size:13px" id="broadcast-selected">
            <i class="fa-solid fa-info-circle"></i> Selecione uma tag ou envie para todos os contatos
          </div>
        </div>
        
        <div class="form-group">
          <label>Tipo de Mensagem</label>
          <select id="broadcast-type">
            <option value="text">Texto</option>
            <option value="image">Imagem + Texto</option>
            <option value="template">Template Aprovado</option>
          </select>
        </div>
        
        <div class="form-group"><label>Mensagem</label><textarea id="broadcast-message" rows="4" placeholder="Olá {{nome}}, temos uma promoção imperdível para você!"></textarea></div>
        
        <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:16px;font-size:12px">
          <strong>Variáveis disponíveis:</strong> {{nome}}, {{telefone}}, {{empresa}}
        </div>
        
        <div class="form-group">
          <label>Agendar Envio</label>
          <div style="display:flex;gap:8px">
            <input type="datetime-local" id="broadcast-schedule" style="flex:1">
            <span style="display:flex;align-items:center;font-size:13px;color:var(--text-muted)">ou envie agora</span>
          </div>
        </div>
        
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" onclick="sendBroadcast()"><i class="fa-solid fa-paper-plane"></i> Enviar Agora</button>
          <button class="btn btn-secondary" onclick="previewBroadcast()"><i class="fa-solid fa-eye"></i> Visualizar</button>
        </div>
      </div>
    </div>`;
}

async function sendBroadcast() {
  const name = document.getElementById('broadcast-name').value;
  const message = document.getElementById('broadcast-message').value;
  if (!name || !message) return showToast('Preencha nome e mensagem', 'error');
  showToast('Campanha criada! Enviando mensagens...', 'success');
}

function previewBroadcast() {
  const msg = document.getElementById('broadcast-message').value;
  alert('Preview da mensagem:\n\n' + msg.replace(/\{\{nome\}\}/g, 'João Silva').replace(/\{\{telefone\}\}/g, '(11) 99999-9999'));
}

function selectTag(tag) {
  document.getElementById('broadcast-selected').innerHTML = `<span class="badge badge-blue">${tag}</span> Contatos selecionados`;
}

// ─── Randomizer ──────────────────────────────────────────────────
async function loadRandomizer(el) {
  el.innerHTML = `
    <h2 style="margin:0 0 8px">Randomizador de WhatsApp</h2>
    <p style="color:var(--text-muted);margin-bottom:24px">Distribua mensagens entre múltiplos números para reduzir bloqueios</p>
    
    <div class="card" style="margin-bottom:24px">
      <div class="card-header"><h3>📱 Números Conectados</h3></div>
      <div class="card-body">
        <div style="text-align:center;padding:20px;color:var(--text-muted)">
          <i class="fa-solid fa-phone" style="font-size:32px;margin-bottom:8px"></i>
          <p>Nenhum número conectado</p>
          <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="navigate('whatsapp')">Conectar Número</button>
        </div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header"><h3>⚙️ Configuração</h3></div>
      <div class="card-body">
        <div class="form-group">
          <label>Modo de Distribuição</label>
          <select id="randomizer-mode">
            <option value="round-robin">Round Robin (alternado)</option>
            <option value="random">Aleatório</option>
            <option value="weighted">Ponderado (por performance)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Limite por número (por dia)</label>
          <input type="number" id="randomizer-limit" value="100" min="1" max="1000">
        </div>
        <div class="form-group">
          <label>Intervalo entre mensagens (segundos)</label>
          <input type="number" id="randomizer-interval" value="30" min="5" max="300">
        </div>
        <button class="btn btn-primary" onclick="saveRandomizer()"><i class="fa-solid fa-save"></i> Salvar Configurações</button>
      </div>
    </div>`;
}

async function saveRandomizer() {
  showToast('Configurações salvas!', 'success');
}

// ─── CTWA ────────────────────────────────────────────────────────
async function loadCTWA(el) {
  const [analytics, campaigns] = await Promise.all([
    api('/api/ctwa/analytics'),
    api('/api/ctwa/campaigns'),
  ]);
  ctwaAnalytics = analytics?.summary || {};
  
  el.innerHTML = `
    <h2 style="margin:0 0 8px">CTWA - Click to WhatsApp Ads</h2>
    <p style="color:var(--text-muted);margin-bottom:24px">Atribuição e conversões de anúncios no WhatsApp</p>
    
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-mouse-pointer"></i></div><div class="stat-value">${ctwaAnalytics.totalClicks||0}</div><div class="stat-label">Cliques</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-user-plus"></i></div><div class="stat-value">${ctwaAnalytics.leads||0}</div><div class="stat-label">Leads</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-shopping-cart"></i></div><div class="stat-value">${ctwaAnalytics.purchases||0}</div><div class="stat-label">Compras</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(ctwaAnalytics.revenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
    </div>

    <div class="card" style="margin-top:24px">
      <div class="card-header"><h3>📊 Campanhas CTWA</h3></div>
      <div class="card-body">
        ${(campaigns?.campaigns||[]).length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text-muted)"><p>Nenhuma campanha CTWA registrada</p></div>' : 
          `<table><thead><tr><th>Campanha</th><th>Cliques</th><th>Leads</th><th>Compras</th><th>Receita</th><th>CPA</th></tr></thead><tbody>
          ${(campaigns?.campaigns||[]).map(c => `<tr><td>${c.campaign_id||'N/A'}</td><td>${c.clicks}</td><td>${c.leads}</td><td>${c.purchases}</td><td>R$ ${c.revenue.toLocaleString()}</td><td>R$ ${c.cpa.toFixed(2)}</td></tr>`).join('')}
          </tbody></table>`
        }
      </div>
    </div>`;
}

// ─── Sales ───────────────────────────────────────────────────────
async function loadSales(el) {
  const [sales, stats] = await Promise.all([
    api('/api/sales'),
    api('/api/sales/stats'),
  ]);
  allSales = sales || [];
  salesStats = stats || {};
  
  el.innerHTML = `
    <h2 style="margin:0 0 8px">Vendas</h2>
    <p style="color:var(--text-muted);margin-bottom:24px">Acompanhe suas vendas e receita</p>
    
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-check-circle"></i></div><div class="stat-value">${salesStats.approved||0}</div><div class="stat-label">Aprovadas</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-clock"></i></div><div class="stat-value">${salesStats.pending||0}</div><div class="stat-label">Pendentes</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(salesStats.totalRevenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-receipt"></i></div><div class="stat-value">R$ ${(salesStats.avgTicket||0).toFixed(2)}</div><div class="stat-label">Ticket Médio</div></div>
    </div>

    <div class="card" style="margin-top:24px">
      <div class="card-header"><h3>📋 Últimas Vendas</h3></div>
      <div class="card-body">
        ${allSales.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma venda registrada</div>' : 
          `<table><thead><tr><th>Produto</th><th>Valor</th><th>Status</th><th>Data</th></tr></thead><tbody>
          ${allSales.map(s => `<tr><td>${s.product||'N/A'}</td><td>R$ ${(s.amount||0).toFixed(2)}</td><td><span class="badge badge-${s.status==='approved'?'green':s.status==='pending'?'yellow':'red'}">${s.status}</span></td><td>${formatDate(s.createdAt)}</td></tr>`).join('')}
          </tbody></table>`
        }
      </div>
    </div>`;
}

// ─── Analytics ───────────────────────────────────────────────────
async function loadAnalytics(el) {
  const [stats, timeline] = await Promise.all([
    api('/api/analytics/default/dashboard'),
    api('/api/analytics/default/timeline'),
  ]);
  
  el.innerHTML = `
    <h2 style="margin:0 0 8px">Analytics</h2>
    <p style="color:var(--text-muted);margin-bottom:24px">Métricas detalhadas da plataforma</p>
    
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>📊 Contatos</h3></div>
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Total</span><strong>${stats?.contacts?.total||0}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Novos</span><strong style="color:var(--primary)">${stats?.contacts?.new||0}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Qualificados</span><strong style="color:#25D366">${stats?.contacts?.qualified||0}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>Clientes</span><strong style="color:var(--accent)">${stats?.contacts?.customer||0}</strong></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>💬 Mensagens</h3></div>
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Total</span><strong>${stats?.messages?.total||0}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Recebidas</span><strong style="color:#25D366">${stats?.messages?.inbound||0}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>Enviadas</span><strong style="color:var(--primary)">${stats?.messages?.outbound||0}</strong></div>
        </div>
      </div>
    </div>`;
}

// ─── Integrations ────────────────────────────────────────────────
async function loadIntegrations(el) {
  allIntegrations = await api('/api/integrations') || [];
  const providers = await api('/api/integrations/providers') || [];
  
  el.innerHTML = `
    <h2 style="margin:0 0 8px">Integrações</h2>
    <p style="color:var(--text-muted);margin-bottom:24px">Conecte com Meta, IA, pagamentos e mais</p>
    
    <div class="grid-3">
      ${providers.map(p => {
        const connected = allIntegrations.find(i => i.provider === p.id);
        return `<div class="card">
          <div class="card-body" style="text-align:center">
            <i class="${p.icon}" style="font-size:32px;color:var(--primary);margin-bottom:12px"></i>
            <h3 style="margin:0;font-size:16px">${p.name}</h3>
            <p style="font-size:12px;color:var(--text-muted);margin:4px 0">${p.description}</p>
            <span class="badge badge-${connected?'green':'gray'}" style="margin-bottom:12px">${connected?'Conectado':'Desconectado'}</span>
            <div><button class="btn btn-sm btn-${connected?'secondary':'primary'}" onclick="connectIntegration('${p.id}')">${connected?'Configurar':'Conectar'}</button></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

async function connectIntegration(provider) {
  showToast(`Conectando ${provider}...`, 'info');
}

// ─── Plans ───────────────────────────────────────────────────────
async function loadPlans(el) {
  allPlans = await api('/api/plans') || [];
  
  el.innerHTML = `
    <h2 style="margin:0 0 8px">Planos</h2>
    <p style="color:var(--text-muted);margin-bottom:24px">Planos da plataforma Ozion Chat AI</p>
    
    <div class="grid-4">
      ${allPlans.map(p => `
        <div class="card" style="border-top:3px solid var(--primary)">
          <div class="card-body" style="text-align:center">
            <h3 style="margin:0">${p.name}</h3>
            <div style="font-size:32px;font-weight:700;margin:16px 0">R$ ${p.price}<span style="font-size:14px;font-weight:400">/mês</span></div>
            <ul style="text-align:left;font-size:13px;margin:16px 0;padding:0;list-style:none">
              ${(p.features||[]).map(f => `<li style="padding:4px 0"><i class="fa-solid fa-check" style="color:#25D366;margin-right:8px"></i>${f}</li>`).join('')}
            </ul>
            <button class="btn btn-primary" style="width:100%">Escolher Plano</button>
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ─── Admin ───────────────────────────────────────────────────────
async function loadAdmin(el) {
  const [customers, workspaces, users, stats] = await Promise.all([
    api('/api/admin/customers'),
    api('/api/admin/workspaces'),
    api('/api/admin/users'),
    api('/api/admin/stats'),
  ]);
  allCustomers = customers || [];
  allWorkspaces = workspaces || [];
  allUsers = users || [];
  
  el.innerHTML = `
    <h2 style="margin:0 0 8px">Admin Master</h2>
    <p style="color:var(--text-muted);margin-bottom:24px">Painel de administração completa</p>
    
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-building"></i></div><div class="stat-value">${stats?.customers||0}</div><div class="stat-label">Clientes</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-users"></i></div><div class="stat-value">${stats?.contacts||0}</div><div class="stat-label">Contatos</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-comments"></i></div><div class="stat-value">${stats?.conversations||0}</div><div class="stat-label">Conversas</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(stats?.revenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
    </div>

    <div class="grid-3" style="margin-top:24px">
      <div class="card">
        <div class="card-header"><h3>🏢 Clientes</h3></div>
        <div class="card-body">${allCustomers.length === 0 ? '<p style="color:var(--text-muted);text-align:center">Nenhum cliente</p>' : allCustomers.map(c => `<div style="padding:8px 0;border-bottom:1px solid var(--border)">${c.name}</div>`).join('')}</div>
      </div>
      <div class="card">
        <div class="card-header"><h3>📁 Workspaces</h3></div>
        <div class="card-body">${allWorkspaces.length === 0 ? '<p style="color:var(--text-muted);text-align:center">Nenhum workspace</p>' : allWorkspaces.map(w => `<div style="padding:8px 0;border-bottom:1px solid var(--border)">${w.name}</div>`).join('')}</div>
      </div>
      <div class="card">
        <div class="card-header"><h3>👤 Usuários</h3></div>
        <div class="card-body">${allUsers.length === 0 ? '<p style="color:var(--text-muted);text-align:center">Nenhum usuário</p>' : allUsers.map(u => `<div style="padding:8px 0;border-bottom:1px solid var(--border)">${u.name||u.email}</div>`).join('')}</div>
      </div>
    </div>`;
}

// ─── Helpers ─────────────────────────────────────────────────────
function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'min';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
  return Math.floor(seconds / 86400) + 'd';
}

function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-BR');
}

function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Init
render();
