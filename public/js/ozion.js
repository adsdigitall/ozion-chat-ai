const API = '';
const TENANT = 'default';
const HEADERS = { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT };
const FLOWISE_URL = ''; // Configure sua URL do Flowise aqui (ex: https://flowise.up.railway.app)

let currentPage = 'dashboard';
let conversations = [];
let selectedConv = null;
let chatMessages = [];
let allContacts = [];
let allFlows = [];
let allAgents = [];
let allSales = [];
let allIntegrations = [];
let allPlans = [];
let allCustomers = [];
let allWorkspaces = [];
let allUsers = [];
let allVoices = [];
let allCampaigns = [];
let dashboardStats = null;
let convStats = {};
let salesStats = {};
let ctwaAnalytics = {};
let selectedFlowFolder = null;
let contactFilter = { tag: null, search: '' };
let bulkSelected = [];

async function api(path, opts = {}) {
  try {
    const res = await fetch(API + path, { headers: HEADERS, ...opts });
    return await res.json();
  } catch (e) { console.error('API Error:', e); return null; }
}

// ─── Navigation (Lailla.io exact structure) ──────────────────────
const NAV = [
  { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
  { id: 'chat', icon: 'fa-comments', label: 'Chat ao vivo' },
  { id: 'contacts', icon: 'fa-address-book', label: 'Contatos' },
  { id: 'flows', icon: 'fa-diagram-project', label: 'Fluxos' },
  { id: 'voice', icon: 'fa-microphone', label: 'Voice Studio' },
  { id: 'agents', icon: 'fa-robot', label: 'Agente IA' },
  { id: 'campaigns', icon: 'fa-bullhorn', label: 'Campanhas' },
  { id: 'analytics', icon: 'fa-chart-bar', label: 'Análises', children: [
    { id: 'ctwa', icon: 'fa-bullseye', label: 'CTWA' },
    { id: 'sales', icon: 'fa-dollar-sign', label: 'Vendas' },
  ]},
  { id: 'integrations', icon: 'fa-plug', label: 'Integrações' },
  { id: 'settings', icon: 'fa-cog', label: 'Configurações' },
  { id: 'flowise', icon: 'fa-cogs', label: 'Flowise' },
];

function render() {
  if (!localStorage.getItem('ozion_logged')) { document.getElementById('app').innerHTML = loginHTML(); return; }
  document.getElementById('app').innerHTML = appHTML();
  loadPage(currentPage);
}

function loginHTML() {
  return `<div class="login-screen"><div class="login-box">
    <div style="text-align:center;margin-bottom:24px">
      <div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#7c3aed,#3b82f6);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:28px">🤖</div>
      <h1 style="margin:0;font-size:22px">Ozion Chat AI</h1>
      <p style="color:var(--text-muted);margin-top:4px;font-size:13px">Assistente de fluxos de conversa</p>
    </div>
    <div class="form-group"><label>Email</label><input type="email" id="login-email" value="admin@ozion.com"></div>
    <div class="form-group"><label>Senha</label><input type="password" id="login-pass" value="admin123"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="doLogin()"><i class="fa-solid fa-arrow-right"></i> Entrar</button>
    <p style="text-align:center;margin-top:16px;font-size:11px;color:var(--text-muted)">Em 11 minutos seu IA está no ar</p>
  </div></div>`;
}

function appHTML() {
  const expandedAnalytics = ['ctwa','sales','analytics'].includes(currentPage);
  return `<div class="app-layout">
    <div class="sidebar">
      <div class="sidebar-logo" style="cursor:pointer;padding:16px" onclick="navigate('dashboard')">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:16px;color:white;font-weight:700">O</div>
          <div><h2 style="font-size:15px;margin:0;font-weight:700">Ozion</h2><span style="font-size:9px;color:var(--text-muted)">Atendente IA WhatsApp</span></div>
        </div>
      </div>
      <div class="workspace-selector" style="padding:6px 16px;border-bottom:1px solid var(--border)">
        <select id="workspace-select" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text-primary);font-size:11px;cursor:pointer" onchange="switchWorkspace(this.value)">
          <option value="default">🏠 Workspace Principal</option>
        </select>
      </div>
      <nav class="sidebar-nav" style="padding:8px 0">
        ${NAV.map(item => {
          if (item.children) {
            const isActive = item.children.some(c => c.id === currentPage);
            return `<div class="nav-item${isActive?' active':''}" onclick="toggleSubmenu('${item.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;font-size:13px;${isActive?'color:var(--accent);background:var(--accent-light);border-right:3px solid var(--accent)':''}">
              <i class="fa-solid ${item.icon}" style="width:20px;text-align:center"></i>${item.label}
              <i class="fa-solid fa-chevron-${expandedAnalytics?'down':'right'}" style="margin-left:auto;font-size:10px;transition:transform .2s"></i>
            </div>
            <div class="submenu" style="display:${expandedAnalytics?'block':'none'};padding-left:20px">
              ${item.children.map(c => `<div class="nav-item${currentPage===c.id?' active':''}" onclick="navigate('${c.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer;font-size:12px;${currentPage===c.id?'color:var(--accent);background:var(--accent-light);border-right:3px solid var(--accent)':''}">
                <i class="fa-solid ${c.icon}" style="width:16px;text-align:center"></i>${c.label}
              </div>`).join('')}
            </div>`;
          }
          return `<div class="nav-item${currentPage===item.id?' active':''}" onclick="navigate('${item.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;font-size:13px;${currentPage===item.id?'color:var(--accent);background:var(--accent-light);border-right:3px solid var(--accent)':''}">
            <i class="fa-solid ${item.icon}" style="width:20px;text-align:center"></i>${item.label}
          </div>`;
        }).join('')}
      </nav>
      <div style="margin-top:auto;border-top:1px solid var(--border);padding:12px 16px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Tokens GPT</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span id="gpt-tokens">0 / 5M</span></div>
        <div style="height:4px;background:var(--border);border-radius:2px;margin-bottom:10px"><div style="height:100%;width:0%;background:linear-gradient(90deg,#3b82f6,#7c3aed);border-radius:2px" id="gpt-bar"></div></div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Tokens Voz</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span id="voice-tokens">0 / 400K</span></div>
        <div style="height:4px;background:var(--border);border-radius:2px"><div style="height:100%;width:0%;background:linear-gradient(90deg,#25D366,#128C7E);border-radius:2px" id="voice-bar"></div></div>
      </div>
      <div style="border-top:1px solid var(--border);padding:10px 16px;display:flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:11px;color:white">A</div>
        <div style="flex:1"><div style="font-weight:500;font-size:12px">Admin</div><div style="font-size:9px;color:var(--text-muted)">Plano Essencials</div></div>
        <button onclick="logout()" style="background:none;border:none;color:var(--text-muted);cursor:pointer"><i class="fa-solid fa-right-from-bracket"></i></button>
      </div>
    </div>
    <div class="main-content">
      <div class="topbar"><div class="topbar-title" id="topbar-title">Dashboard</div></div>
      <div class="content" id="content"></div>
    </div>
  </div>`;
}

function navigate(page) { currentPage = page; selectedConv = null; render(); }
function toggleSubmenu(id) { render(); }
function doLogin() { localStorage.setItem('ozion_logged', '1'); render(); }
function logout() { localStorage.removeItem('ozion_logged'); render(); }
function switchWorkspace(id) { localStorage.setItem('ozion_workspace', id); showToast('Workspace alterado', 'success'); }

async function loadPage(page) {
  const el = document.getElementById('content');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px"></i><p style="margin-top:8px">Carregando...</p></div>';
  const pages = { dashboard:loadDashboard, chat:loadChat, contacts:loadContacts, flows:loadFlows, voice:loadVoice, agents:loadAgents, campaigns:loadCampaigns, ctwa:loadCTWA, sales:loadSales, integrations:loadIntegrations, settings:loadSettings, flowise:showFlowiseConfig };
  if (pages[page]) await pages[page](el);
  else el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-construction"></i><h3>Em construção</h3></div>';
}

// ─── Dashboard (Lailla.io exact) ─────────────────────────────────
async function loadDashboard(el) {
  const [stats, convData, salesData, ctwaData] = await Promise.all([
    api('/api/analytics/default/dashboard'), api('/api/chat/stats'), api('/api/sales/stats'), api('/api/ctwa/analytics')
  ]);
  dashboardStats = stats; convStats = convData || {}; salesStats = salesData || {}; ctwaAnalytics = ctwaData?.summary || {};
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div><h2 style="margin:0;font-size:20px">Dashboard</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">Dashboard principal</p></div>
    </div>

    <!-- Token Usage Cards (Lailla.io style) -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><i class="fa-solid fa-microphone" style="color:var(--accent)"></i><span style="font-size:12px;font-weight:600">Tokens VoiceStudio</span></div>
        <div style="font-size:18px;font-weight:700">50.000 / 50.000</div>
        <div style="font-size:10px;color:var(--text-muted)">+ 41.981 de adicionais</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><i class="fa-solid fa-brain" style="color:#3b82f6"></i><span style="font-size:12px;font-weight:600">Tokens GPT</span></div>
        <div style="font-size:18px;font-weight:700">4.586.332 / 5.000.000</div>
        <div style="font-size:10px;color:var(--text-muted)">+ 50.000.000 de adicionais</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><i class="fa-solid fa-diagram-project" style="color:#25D366"></i><span style="font-size:12px;font-weight:600">Fluxos executados WA Business</span></div>
        <div style="font-size:18px;font-weight:700">0 / 1.000</div>
        <div style="font-size:10px;color:var(--text-muted)">fluxos</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><i class="fa-solid fa-bolt" style="color:#f59e0b"></i><span style="font-size:12px;font-weight:600">Fluxos executados Api Oficial</span></div>
        <div style="font-size:18px;font-weight:700">856 / 1.000</div>
        <div style="font-size:10px;color:var(--text-muted)">fluxos</div>
      </div>
    </div>

    <!-- Info banner -->
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:var(--text-muted)">
      Os tokens serão consumidos quando um áudio for gerado pelo Voice Studio, ou quando um texto for gerado pelo Módulo de GPT. E os tokens adicionais são consumidos depois dos tokens do plano.
      <div style="margin-top:8px"><button class="btn btn-sm btn-primary" onclick="showToast('Adicionar tokens','info')"><i class="fa-solid fa-plus"></i> Adicionar Tokens</button></div>
    </div>

    <!-- Dashboard Tabs (Lailla.io style) -->
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <div style="display:flex;border-bottom:1px solid var(--border)">
        <button class="dash-tab active" onclick="switchDashTab(this,0)" style="flex:1;padding:12px;border:none;background:none;color:var(--text-primary);cursor:pointer;font-size:12px;font-weight:500">📢 Um olá da Ozion</button>
        <button class="dash-tab" onclick="switchDashTab(this,1)" style="flex:1;padding:12px;border:none;background:none;color:var(--text-muted);cursor:pointer;font-size:12px">📊 Minha semana (Fluxos)</button>
        <button class="dash-tab" onclick="switchDashTab(this,2)" style="flex:1;padding:12px;border:none;background:none;color:var(--text-muted);cursor:pointer;font-size:12px">📋 Resumo dos Fluxos</button>
        <button class="dash-tab" onclick="switchDashTab(this,3)" style="flex:1;padding:12px;border:none;background:none;color:var(--text-muted);cursor:pointer;font-size:12px">👤 Novos Contatos</button>
        <button class="dash-tab" onclick="switchDashTab(this,4)" style="flex:1;padding:12px;border:none;background:none;color:var(--text-muted);cursor:pointer;font-size:12px">🗺️ Contatos p/estado</button>
      </div>
      <div id="dash-tab-content" style="padding:16px">
        <div style="display:flex;flex-direction:column;gap:10px">
          ${[
            { title: 'Suporte a números internacionais na plataforma', desc: 'Agora é possível criar contatos e conectar dispositivos de outros países.' },
            { title: 'Gerencie seus fluxos de forma mais fácil', desc: 'Agora é possível filtrar e gerenciar múltiplos fluxos de uma vez.' },
            { title: 'Nova opção para respostas no Menu', desc: 'O bloco de Menu aceita respostas inesperadas com uma nova saída.' },
            { title: 'Novos Botões Interativos no Menu', desc: 'Agora você pode usar botões clicáveis no menu.' },
            { title: 'Novas Configurações de Expediente', desc: 'Defina um expediente padrão no workspace para toda a plataforma!' },
            { title: 'Leitura de arquivos PDF agora disponível!', desc: 'A Ozion agora lê arquivos PDF, facilitando sua interação com documentos!' },
            { title: 'Nova função para encerrar chats automaticamente', desc: 'Finalizar conversas abertas automaticamente ao usar Webhook.' },
            { title: 'Agende disparos em massa com facilidade', desc: 'Programar seus disparos para o futuro, garantindo envio na hora certa.' },
          ].map(n => `<div style="display:flex;gap:12px;padding:12px;background:var(--bg-secondary);border-radius:8px;cursor:pointer" class="news-item">
            <div style="width:40px;height:40px;border-radius:8px;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🤖</div>
            <div><div style="font-weight:600;font-size:13px">${n.title}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">${n.desc}</div><div style="font-size:10px;color:var(--accent);margin-top:4px;cursor:pointer">Saiba mais...</div></div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Stats bottom row (Lailla.io style) -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:20px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:32px;font-weight:800;color:var(--primary)">${convStats.waiting||76}</div>
        <div style="font-size:12px;color:var(--text-muted)">Aguardando atendimento</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:32px;font-weight:800;color:#25D366">${convStats.inbox||11}</div>
        <div style="font-size:12px;color:var(--text-muted)">Em atendimento</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:32px;font-weight:800;color:var(--accent)">${convStats.today||18}</div>
        <div style="font-size:12px;color:var(--text-muted)">Fluxos executados hoje</div>
        <button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="navigate('chat')">Visitar chat ao vivo</button>
      </div>
    </div>

    <!-- Upgrade Banner -->
    <div style="background:linear-gradient(135deg,#7c3aed,#3b82f6);border-radius:10px;padding:16px;margin-top:20px;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-weight:700;font-size:14px;color:white">Plano Essencials</div><div style="font-size:12px;color:rgba(255,255,255,0.8)">Quer mais liberdade com seus tokens?</div></div>
      <button class="btn btn-sm" style="background:white;color:var(--accent);font-weight:600" onclick="navigate('settings')">Vamos fazer um upgrade</button>
    </div>`;
}

function switchDashTab(btn, idx) {
  document.querySelectorAll('.dash-tab').forEach(t => { t.classList.remove('active'); t.style.color = 'var(--text-muted)'; });
  btn.classList.add('active'); btn.style.color = 'var(--text-primary)';
}

// ─── Chat ao Vivo (Lailla.io exact) ──────────────────────────────
async function loadChat(el) {
  const [convData, statsData] = await Promise.all([api('/api/chat/conversations'), api('/api/chat/stats')]);
  conversations = convData?.conversations || []; convStats = statsData || {};
  
  el.innerHTML = `<div style="display:flex;height:calc(100vh - 120px)">
    <!-- Chat List Sidebar -->
    <div style="width:320px;border-right:1px solid var(--border);display:flex;flex-direction:column">
      <div style="padding:12px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h3 style="margin:0;font-size:15px">Chat ao vivo</h3></div>
        <div style="display:flex;gap:4px;margin-bottom:8px">
          <button class="chat-tab active" onclick="filterConvs(this,'all')" style="flex:1;padding:6px;border-radius:6px;border:none;cursor:pointer;font-size:11px;background:var(--bg-secondary);color:var(--text-primary)">Todos <span style="background:var(--accent);color:white;padding:1px 6px;border-radius:10px;font-size:10px;margin-left:4px">${conversations.length}</span></button>
          <button class="chat-tab" onclick="filterConvs(this,'ai')" style="flex:1;padding:6px;border-radius:6px;border:none;cursor:pointer;font-size:11px;background:none;color:var(--text-muted)">IA</button>
          <button class="chat-tab" onclick="filterConvs(this,'closed')" style="flex:1;padding:6px;border-radius:6px;border:none;cursor:pointer;font-size:11px;background:none;color:var(--text-muted)">Fechados</button>
        </div>
        <div style="display:flex;gap:6px">
          <input type="text" placeholder="Procurar contato" style="flex:1;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--text-primary);font-size:11px">
          <button style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px;color:var(--text-muted);cursor:pointer"><i class="fa-solid fa-filter" style="font-size:11px"></i></button>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto" id="chat-list">
        ${conversations.length===0?'<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:12px"><i class="fa-solid fa-comments" style="font-size:28px;margin-bottom:8px;opacity:0.3"></i><p>Nenhuma conversa</p></div>':
          conversations.map(c => renderConvItem(c)).join('')}
      </div>
    </div>
    <!-- Chat Main -->
    <div style="flex:1;display:flex;flex-direction:column" id="chat-main">
      <div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted)"><div style="text-align:center"><i class="fa-solid fa-comments" style="font-size:48px;margin-bottom:12px;opacity:0.3"></i><h3>Selecione uma conversa</h3></div></div>
    </div>
  </div>`;
}

function renderConvItem(c) {
  const name = c.contact?.name || 'Desconhecido';
  return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);${selectedConv?.id===c.id?'background:var(--accent-light)':''}" onclick="selectConv('${c.id}')">
    <div style="width:36px;height:36px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;font-size:13px;color:white;flex-shrink:0">${name[0]}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;justify-content:space-between"><span style="font-weight:500;font-size:13px">${name}</span><span style="font-size:10px;color:var(--text-muted)">${c.lastMessageAt?timeAgo(c.lastMessageAt):''}</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:2px"><span style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.contact?.phone||''}</span>${c.isAiActive?'<span style="font-size:9px;background:var(--accent);color:white;padding:1px 6px;border-radius:8px">🤖 IA</span>':''}</div>
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
    <!-- Chat Header -->
    <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;font-size:12px;color:white">${(selectedConv.contact?.name||'?')[0]}</div>
        <div>
          <h3 style="font-size:14px;margin:0">${selectedConv.contact?.name||'Desconhecido'}</h3>
          <span style="font-size:10px;color:var(--text-muted)">Conversando com: ${selectedConv.contact?.phone||''}</span>
          <div style="display:flex;gap:8px;margin-top:2px">
            <span style="font-size:9px;color:#25D366">Janela (24h) ativa</span>
            <span style="font-size:9px;color:var(--accent)">Janela (72h) ativa</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-${selectedConv.isAiActive?'warning':'success'}" onclick="toggleAI('${id}')" style="font-size:11px"><i class="fa-solid fa-robot"></i> ${selectedConv.isAiActive?'Pausar IA':'Ativar IA'}</button>
        <button class="btn btn-sm btn-secondary" onclick="closeConv('${id}')"><i class="fa-solid fa-check"></i></button>
      </div>
    </div>
    <!-- Messages -->
    <div style="flex:1;overflow-y:auto;padding:16px" id="chat-messages">
      ${chatMessages.length===0?'<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">Nenhuma mensagem</div>':
        chatMessages.map(m => `<div style="display:flex;gap:8px;margin-bottom:12px;${m.direction==='outbound'?'flex-direction:row-reverse':''}">
          <div style="width:28px;height:28px;border-radius:50%;background:${m.direction==='inbound'?'#25D366':'var(--accent)'};display:flex;align-items:center;justify-content:center;font-size:10px;color:white;flex-shrink:0">${m.direction==='inbound'?(selectedConv.contact?.name||'?')[0]:'🤖'}</div>
          <div style="max-width:65%">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">${m.direction==='inbound'?(selectedConv.contact?.name||'Contato'):'Ozion IA'} ${m.isFlow?'<span style="background:var(--accent);color:white;padding:1px 4px;border-radius:4px;font-size:8px">VIA FLUXO</span>':''}</div>
            <div style="padding:8px 12px;border-radius:12px;font-size:13px;${m.direction==='inbound'?'background:var(--bg-secondary);border-bottom-left-radius:4px':'background:linear-gradient(135deg,#7c3aed,#3b82f6);color:white;border-bottom-right-radius:4px'}">${m.content}</div>
            <div style="font-size:9px;color:var(--text-muted);margin-top:2px;${m.direction==='outbound'?'text-align:right':''}">${formatTime(m.sentAt)}</div>
          </div>
        </div>`).join('')}
    </div>
    <!-- Input Area with formatting toolbar -->
    <div style="border-top:1px solid var(--border);padding:8px 16px">
      <div style="display:flex;gap:4px;margin-bottom:6px">
        <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;font-weight:700" title="Negrito">B</button>
        <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;font-style:italic" title="Itálico">I</button>
        <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;text-decoration:line-through" title="Tachado">S</button>
        <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;font-family:monospace" title="Monospace">M</button>
      </div>
      <div style="display:flex;gap:8px">
        <button style="background:none;border:none;color:var(--text-muted);cursor:pointer"><i class="fa-solid fa-paperclip"></i></button>
        <input type="text" id="chat-input-text" placeholder="Shift + enter para nova linha." onkeypress="if(event.key==='Enter')sendMsg('${id}')" style="flex:1;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text-primary);font-size:13px">
        <button style="background:none;border:none;color:var(--text-muted);cursor:pointer"><i class="fa-solid fa-microphone"></i></button>
        <button class="btn btn-sm btn-primary" onclick="sendMsg('${id}')"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="btn btn-sm btn-success" onclick="aiRespond('${id}')" style="font-size:10px"><i class="fa-solid fa-robot"></i> Responder com IA</button>
        <button class="btn btn-sm btn-secondary" onclick="sendTemplate('${id}')" style="font-size:10px"><i class="fa-solid fa-file-alt"></i> Enviar template</button>
      </div>
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
async function aiRespond(convId) { showToast('IA gerando resposta...', 'info'); }
function sendTemplate(convId) { showToast('Templates em breve', 'info'); }
function filterConvs(el, filter) { document.querySelectorAll('.chat-tab').forEach(t => { t.classList.remove('active'); t.style.background = 'none'; t.style.color = 'var(--text-muted)'; }); el.classList.add('active'); el.style.background = 'var(--bg-secondary)'; el.style.color = 'var(--text-primary)'; }

// ─── Contatos (Lailla.io exact) ──────────────────────────────────
async function loadContacts(el) {
  const data = await api('/api/crm/contacts'); allContacts = data?.contacts || [];
  const tags = [...new Set(allContacts.map(c => c.tag).filter(Boolean))];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div><h2 style="margin:0;font-size:20px">Contatos</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">${allContacts.length} contato(s) workspace</p></div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-secondary" title="Importar"><i class="fa-solid fa-file-import"></i></button>
        <button class="btn btn-sm btn-secondary" title="Exportar"><i class="fa-solid fa-file-export"></i></button>
        <button class="btn btn-sm btn-secondary" title="Ações em massa"><i class="fa-solid fa-check-double"></i></button>
        <button class="btn btn-sm btn-primary" onclick="showCreateContact()"><i class="fa-solid fa-plus"></i> Novo</button>
      </div>
    </div>

    <!-- Search + Tags Filter (Lailla.io style) -->
    <div style="display:flex;gap:12px;margin-bottom:16px;align-items:center">
      <input type="text" placeholder="Buscar por nome" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--text-primary);font-size:12px;width:200px">
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--text-muted);line-height:26px">Etiquetas (${tags.length}):</span>
        ${tags.map(t => `<span onclick="filterByTag('${t}')" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:10px;cursor:pointer;background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary)"><i class="fa-solid fa-circle" style="font-size:6px;color:var(--accent)"></i>${t}</span>`).join('')}
      </div>
    </div>

    <!-- Origin Filter -->
    <div style="display:flex;gap:6px;margin-bottom:12px">
      <span style="font-size:11px;color:var(--text-muted);line-height:26px">Origem:</span>
      ${['WhatsApp Business','API Oficial','CTWA','Manual'].map(o => `<span style="padding:3px 8px;border-radius:12px;font-size:10px;cursor:pointer;background:var(--bg-secondary);border:1px solid var(--border)">${o}</span>`).join('')}
    </div>

    <!-- Create Form -->
    <div id="contact-form" style="display:none" class="card" style="margin-bottom:16px">
      <div class="card-header"><h3>👤 Novo Contato</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>Nome</label><input type="text" id="contact-name" placeholder="Nome completo"></div>
          <div class="form-group"><label>Telefone</label><input type="text" id="contact-phone" placeholder="+5511999999999"></div>
          <div class="form-group"><label>Email</label><input type="email" id="contact-email" placeholder="email@exemplo.com"></div>
          <div class="form-group"><label>Tag</label><select id="contact-tag"><option value="lead">Lead</option><option value="cliente">Cliente</option><option value="vip">VIP</option><option value="pendente">Pendente</option><option value="entregue">Entregue</option></select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-primary btn-sm" onclick="createContact()"><i class="fa-solid fa-save"></i> Salvar</button><button class="btn btn-secondary btn-sm" onclick="document.getElementById('contact-form').style.display='none'">Cancelar</button></div>
      </div>
    </div>

    <!-- Contacts Table (Lailla.io exact) -->
    <div class="card"><div class="card-body" style="padding:0">
      <table><thead><tr>
        <th style="width:30px"><input type="checkbox" onchange="toggleAllContacts(this)"></th>
        <th style="width:40px"></th>
        <th>Nome Completo</th>
        <th>Telefone</th>
        <th>Etiquetas</th>
        <th style="width:40px"></th>
      </tr></thead><tbody>
        ${allContacts.length===0?'<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px">Nenhum contato</td></tr>':
          allContacts.map(c => `<tr>
            <td><input type="checkbox" value="${c.id}"></td>
            <td><div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:10px;color:white">${(c.name||'?').substring(0,2).toUpperCase()}</div></td>
            <td style="font-size:12px">${c.name||'N/A'}</td>
            <td style="font-size:12px">${c.phone||'-'}</td>
            <td><div style="display:flex;gap:4px;flex-wrap:wrap">${(c.tag||'lead').split(',').map(t => `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:10px;background:var(--bg-secondary);border:1px solid var(--border)"><i class="fa-solid fa-circle" style="font-size:5px;color:var(--accent)"></i>${t.trim()}</span>`).join('')}</div></td>
            <td><button class="btn btn-sm btn-secondary" onclick="editContact('${c.id}')" style="padding:3px 6px"><i class="fa-solid fa-ellipsis"></i></button></td>
          </tr>`).join('')}
      </tbody></table>
    </div></div>`;
}

function showCreateContact() { document.getElementById('contact-form').style.display = 'block'; }
function filterByTag(tag) { showToast(`Filtrando por: ${tag}`, 'info'); }
function toggleAllContacts(cb) { document.querySelectorAll('tbody input[type=checkbox]').forEach(c => c.checked = cb.checked); }
async function createContact() {
  const data = { name: document.getElementById('contact-name').value, phone: document.getElementById('contact-phone').value, email: document.getElementById('contact-email').value, tag: document.getElementById('contact-tag').value };
  await api('/api/crm/contacts', { method: 'POST', body: JSON.stringify(data) }); showToast('Contato criado!', 'success'); loadContacts(document.getElementById('content'));
}
function editContact(id) { showToast('Edição em breve', 'info'); }

// ─── Fluxos (Lailla.io FULL) ─────────────────────────────────
let flowFolders = [];
let flowFilter = { search: '', status: '', connection: '', trigger: '' };
let flowBulkSelected = [];
let flowCurrentFolder = null;

const TRIGGER_LABELS = {
  'message_received': 'Mensagem recebida',
  'keyword': 'Palavra-chave',
  'campaign': 'Disparo',
  'kiwify': 'Kiwify',
  'hotmart': 'Hotmart',
  'perfectpay': 'Perfect Pay',
  'asaas': 'Asaas',
  'stripe': 'Stripe',
  'mercadopago': 'MercadoPago',
  'webhook': 'Webhook'
};

const CONNECTION_LABELS = {
  'whatsapp_business': 'WhatsApp Business',
  'api_oficial': 'API Oficial',
  'ctwa': 'CTWA'
};

async function loadFlows(el) {
  const [flowsData, foldersData] = await Promise.all([
    api('/api/flows'), api('/api/flows/folders')
  ]);
  allFlows = flowsData || [];
  flowFolders = foldersData || [];
  flowBulkSelected = [];

  const filteredFlows = filterFlows();
  const folderFlows = flowCurrentFolder ? filteredFlows.filter(f => f.folder_id === flowCurrentFolder) : filteredFlows.filter(f => !f.folder_id);
  const activeFlows = allFlows.filter(f => f.is_active).length;

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <h2 style="margin:0;font-size:20px">Fluxos de conversa</h2>
        <p style="color:var(--text-muted);margin-top:2px;font-size:12px">${allFlows.length} fluxos (${activeFlows} ativos)</p>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-secondary" onclick="showCreateFolderModal()"><i class="fa-solid fa-folder-plus"></i> Nova Pasta</button>
        <button class="btn btn-sm btn-secondary" onclick="importFlowFile()"><i class="fa-solid fa-file-import"></i> Importar</button>
        <button class="btn btn-sm btn-primary" onclick="showCreateFlowModal()"><i class="fa-solid fa-plus"></i> Novo fluxo</button>
      </div>
    </div>

    <!-- Search + Filters -->
    <div style="display:flex;gap:8px;margin-bottom:16px;align-items:center;flex-wrap:wrap">
      <input type="text" id="flow-search" placeholder="Pesquisar..." value="${flowFilter.search}" oninput="flowFilter.search=this.value;renderFlowList()" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--text-primary);font-size:11px;width:160px">
      <select id="flow-filter-status" onchange="flowFilter.status=this.value;renderFlowList()" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text-primary);font-size:11px">
        <option value="">Status: todos</option>
        <option value="active" ${flowFilter.status==='active'?'selected':''}>Ativos</option>
        <option value="draft" ${flowFilter.status==='draft'?'selected':''}>Rascunho</option>
        <option value="inactive" ${flowFilter.status==='inactive'?'selected':''}>Inativos</option>
      </select>
      <select id="flow-filter-connection" onchange="flowFilter.connection=this.value;renderFlowList()" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text-primary);font-size:11px">
        <option value="">Conexão: todas</option>
        <option value="whatsapp_business">WhatsApp Business</option>
        <option value="api_oficial">API Oficial</option>
      </select>
      <select id="flow-filter-trigger" onchange="flowFilter.trigger=this.value;renderFlowList()" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text-primary);font-size:11px">
        <option value="">Gatilhos: todos</option>
        ${Object.entries(TRIGGER_LABELS).map(([k,v]) => `<option value="${k}" ${flowFilter.trigger===k?'selected':''}>${v}</option>`).join('')}
      </select>
    </div>

    <!-- Bulk Actions Bar -->
    <div id="flow-bulk-bar" style="display:none;align-items:center;gap:8px;margin-bottom:12px;padding:10px 16px;background:var(--accent-light);border:1px solid var(--accent);border-radius:8px;font-size:12px">
      <span id="flow-bulk-count" style="color:var(--accent);font-weight:600"></span>
      <button class="btn btn-sm btn-success" onclick="bulkFlowAction('activate')"><i class="fa-solid fa-check"></i> Ativar</button>
      <button class="btn btn-sm btn-secondary" onclick="bulkFlowAction('deactivate')"><i class="fa-solid fa-pause"></i> Desativar</button>
      <button class="btn btn-sm btn-secondary" onclick="showBulkMoveModal()"><i class="fa-solid fa-folder-open"></i> Mover</button>
      <button class="btn btn-sm btn-danger" onclick="bulkFlowAction('delete')"><i class="fa-solid fa-trash"></i> Excluir</button>
      <button class="btn btn-sm btn-secondary" onclick="bulkExportFlows()" style="margin-left:auto"><i class="fa-solid fa-download"></i> Exportar</button>
    </div>

    <!-- Folder Breadcrumb -->
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;display:flex;align-items:center;gap:6px">
      <i class="fa-solid fa-folder"></i>
      <span style="cursor:pointer;color:${!flowCurrentFolder?'var(--accent)':'var(--text-muted)'};font-weight:${!flowCurrentFolder?'600':'400'}" onclick="flowCurrentFolder=null;renderFlowList()">Minhas pastas</span>
      ${flowCurrentFolder ? (() => {
        const folder = flowFolders.find(f => f.id === flowCurrentFolder);
        return folder ? `<i class="fa-solid fa-chevron-right" style="font-size:8px"></i><span style="color:var(--accent);font-weight:600">${folder.name}</span>` : '';
      })() : ''}
    </div>

    <!-- Folder Grid -->
    ${flowFolders.length > 0 ? `
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      ${flowFolders.map(f => {
        const count = allFlows.filter(fl => fl.folder_id === f.id).length;
        return `<div onclick="flowCurrentFolder='${f.id}';renderFlowList()" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          <i class="fa-solid fa-folder" style="color:#f59e0b;font-size:18px"></i>
          <div><div style="font-weight:500;font-size:12px">${f.name}</div><div style="font-size:10px;color:var(--text-muted)">${count} fluxos</div></div>
          <button onclick="event.stopPropagation();deleteFolder('${f.id}')" style="margin-left:auto;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:10px" title="Excluir pasta"><i class="fa-solid fa-trash"></i></button>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- Flow List -->
    <div class="card"><div class="card-body" style="padding:0">
      <div id="flow-list-items">
        ${renderFlowListItems(folderFlows)}
      </div>
    </div></div>

    <!-- Hidden file input for import -->
    <input type="file" id="flow-import-input" accept=".json" style="display:none" onchange="handleFlowImport(event)">
  `;
}

function renderFlowList() {
  const filteredFlows = filterFlows();
  const folderFlows = flowCurrentFolder ? filteredFlows.filter(f => f.folder_id === flowCurrentFolder) : filteredFlows.filter(f => !f.folder_id);
  const container = document.getElementById('flow-list-items');
  if (container) container.innerHTML = renderFlowListItems(folderFlows);
  updateBulkBar();
}

function filterFlows() {
  return allFlows.filter(f => {
    if (flowFilter.search && !(f.name||'').toLowerCase().includes(flowFilter.search.toLowerCase()) && !(f.description||'').toLowerCase().includes(flowFilter.search.toLowerCase())) return false;
    if (flowFilter.status) {
      if (flowFilter.status === 'active' && !f.is_active) return false;
      if (flowFilter.status === 'draft' && f.status !== 'draft') return false;
      if (flowFilter.status === 'inactive' && f.is_active) return false;
    }
    if (flowFilter.connection && f.connection !== flowFilter.connection) return false;
    if (flowFilter.trigger && f.trigger !== flowFilter.trigger) return false;
    return true;
  });
}

function renderFlowListItems(flows) {
  if (flows.length === 0) {
    return `<div style="text-align:center;padding:40px;color:var(--text-muted)">
      <i class="fa-solid fa-diagram-project" style="font-size:48px;margin-bottom:12px;opacity:0.3"></i>
      <p>${allFlows.length === 0 ? 'Nenhum fluxo criado' : 'Nenhum fluxo encontrado com esses filtros'}</p>
      ${allFlows.length === 0 ? '<button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="showCreateFlowModal()">Criar Primeiro Fluxo</button>' : ''}
    </div>`;
  }

  return flows.map(f => {
    const triggerLabel = TRIGGER_LABELS[f.trigger] || f.trigger || 'Ao receber qualquer mensagem';
    const connLabel = CONNECTION_LABELS[f.connection] || f.connection || 'WhatsApp Business';
    const isSelected = flowBulkSelected.includes(f.id);
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);${isSelected?'background:var(--accent-light)':''};transition:background .15s" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='${isSelected?'var(--accent-light)':''}'">
      <input type="checkbox" ${isSelected?'checked':''} onchange="toggleFlowSelect('${f.id}')" style="cursor:pointer;accent-color:var(--accent)">
      <div onclick="editFlow('${f.id}')" style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;cursor:pointer">⚡</div>
      <div style="flex:1;min-width:0;cursor:pointer" onclick="editFlow('${f.id}')">
        <div style="font-weight:500;font-size:13px">${f.name||'Fluxo sem nome'}</div>
        <div style="font-size:11px;color:var(--text-muted);display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px">
          <span><i class="fa-solid fa-bolt" style="font-size:9px"></i> ${triggerLabel}</span>
          <span><i class="fa-solid fa-link" style="font-size:9px"></i> ${connLabel}</span>
          ${f.keywords ? `<span style="font-size:10px;color:var(--accent)"><i class="fa-solid fa-key" style="font-size:8px"></i> ${f.keywords.split(',').slice(0,2).join(', ')}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:10px;color:var(--text-muted)">${f.updated_at ? timeAgo(f.updated_at) : '---'}</span>
        <div class="flow-toggle" onclick="toggleFlow('${f.id}')" style="position:relative;width:36px;height:20px;cursor:pointer">
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:${f.is_active?'var(--accent)':'var(--border)'};border-radius:20px;transition:all .3s"></div>
          <div style="position:absolute;top:2px;${f.is_active?'left:18px':'left:2px'};width:16px;height:16px;border-radius:50%;background:white;transition:all .3s;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>
        </div>
        <div style="position:relative">
          <button onclick="toggleFlowMenu('${f.id}')" class="btn btn-sm btn-secondary" style="padding:4px 8px"><i class="fa-solid fa-ellipsis"></i></button>
          <div id="flow-menu-${f.id}" style="display:none;position:absolute;right:0;top:100%;z-index:100;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.2);min-width:180px;padding:4px">
            <div onclick="editFlow('${f.id}')" style="padding:8px 12px;font-size:12px;cursor:pointer;border-radius:4px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'"><i class="fa-solid fa-pen" style="width:16px;color:var(--accent)"></i> Editar</div>
            <div onclick="duplicateFlow('${f.id}')" style="padding:8px 12px;font-size:12px;cursor:pointer;border-radius:4px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'"><i class="fa-solid fa-copy" style="width:16px;color:#3b82f6"></i> Duplicar</div>
            <div onclick="exportFlow('${f.id}')" style="padding:8px 12px;font-size:12px;cursor:pointer;border-radius:4px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'"><i class="fa-solid fa-download" style="width:16px;color:#22c55e"></i> Exportar JSON</div>
            <div onclick="showMoveFlowModal('${f.id}')" style="padding:8px 12px;font-size:12px;cursor:pointer;border-radius:4px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'"><i class="fa-solid fa-folder-open" style="width:16px;color:#f59e0b"></i> Mover para pasta</div>
            <div style="height:1px;background:var(--border);margin:4px 0"></div>
            <div onclick="deleteFlow('${f.id}')" style="padding:8px 12px;font-size:12px;cursor:pointer;border-radius:4px;color:#ef4444;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'"><i class="fa-solid fa-trash" style="width:16px"></i> Excluir</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── Flow Toggle ─────────────────────────────────────────────
async function toggleFlow(id) {
  const result = await api(`/api/flows/${id}/toggle`, { method: 'POST' });
  if (result?.is_active !== undefined) {
    const flow = allFlows.find(f => f.id === id);
    if (flow) flow.is_active = result.is_active;
    renderFlowList();
    showToast(result.is_active ? 'Fluxo ativado!' : 'Fluxo desativado', 'success');
  }
}

// ─── Flow Menu ───────────────────────────────────────────────
let openFlowMenu = null;
function toggleFlowMenu(id) {
  if (openFlowMenu) { const el = document.getElementById('flow-menu-'+openFlowMenu); if (el) el.style.display = 'none'; }
  const menu = document.getElementById('flow-menu-'+id);
  if (menu) { menu.style.display = menu.style.display === 'block' ? 'none' : 'block'; openFlowMenu = id; }
}
document.addEventListener('click', (e) => {
  if (openFlowMenu && !e.target.closest(`#flow-menu-${openFlowMenu}`) && !e.target.closest('.flow-toggle')) {
    const el = document.getElementById('flow-menu-'+openFlowMenu); if (el) el.style.display = 'none'; openFlowMenu = null;
  }
});

// ─── Flow Selection / Bulk ───────────────────────────────────
function toggleFlowSelect(id) {
  const idx = flowBulkSelected.indexOf(id);
  if (idx >= 0) flowBulkSelected.splice(idx, 1); else flowBulkSelected.push(id);
  updateBulkBar();
  renderFlowList();
}

function updateBulkBar() {
  const bar = document.getElementById('flow-bulk-bar');
  const count = document.getElementById('flow-bulk-count');
  if (bar && count) {
    if (flowBulkSelected.length > 0) {
      bar.style.display = 'flex';
      count.textContent = `${flowBulkSelected.length} selecionado(s)`;
    } else {
      bar.style.display = 'none';
    }
  }
}

async function bulkFlowAction(action) {
  if (!flowBulkSelected.length) return;
  if (action === 'delete' && !confirm(`Excluir ${flowBulkSelected.length} fluxo(s)?`)) return;
  await api('/api/flows/bulk', { method: 'POST', body: JSON.stringify({ action, ids: flowBulkSelected }) });
  showToast(`${flowBulkSelected.length} fluxo(s) processado(s)`, 'success');
  loadFlows(document.getElementById('content'));
}

async function bulkExportFlows() {
  if (!flowBulkSelected.length) return;
  for (const id of flowBulkSelected) { await exportFlow(id); }
  showToast(`${flowBulkSelected.length} fluxo(s) exportado(s)`, 'success');
}

// ─── Create Flow Modal ───────────────────────────────────────
function showCreateFlowModal(folderId) {
  const modal = document.getElementById('modal-overlay');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:500px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:16px">Criar Novo Fluxo</h3>
        <button onclick="closeModal()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px"><i class="fa-solid fa-times"></i></button>
      </div>
      <div style="display:grid;gap:12px">
        <div class="form-group"><label style="font-size:12px;font-weight:500">Nome *</label><input type="text" id="cf-name" placeholder="Ex: Atendimento pós-venda" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text-primary);font-size:13px"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:500">Descrição</label><textarea id="cf-desc" rows="2" placeholder="Descreva o que este fluxo faz" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text-primary);font-size:13px;resize:vertical"></textarea></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label style="font-size:12px;font-weight:500">Gatilho</label><select id="cf-trigger" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text-primary);font-size:12px">${Object.entries(TRIGGER_LABELS).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="form-group"><label style="font-size:12px;font-weight:500">Conexão</label><select id="cf-connection" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text-primary);font-size:12px">${Object.entries(CONNECTION_LABELS).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label style="font-size:12px;font-weight:500">Palavras-chave (separar por vírgula)</label><input type="text" id="cf-keywords" placeholder="ex: preço, valor, comprar" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text-primary);font-size:13px"></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="btn btn-sm btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-sm btn-primary" onclick="submitCreateFlow(${folderId||'null'})"><i class="fa-solid fa-plus"></i> Criar</button>
      </div>
    </div>`;
  openModal();
}

async function submitCreateFlow(folderId) {
  const name = document.getElementById('cf-name').value.trim();
  if (!name) { showToast('Digite o nome do fluxo', 'error'); return; }
  const data = {
    name,
    description: document.getElementById('cf-desc').value,
    trigger: document.getElementById('cf-trigger').value,
    connection: document.getElementById('cf-connection').value,
    keywords: document.getElementById('cf-keywords').value,
    folder_id: folderId || null
  };
  await api('/api/flows', { method: 'POST', body: JSON.stringify(data) });
  closeModal();
  showToast('Fluxo criado!', 'success');
  loadFlows(document.getElementById('content'));
}

// ─── Edit Flow Modal ─────────────────────────────────────────
async function editFlow(id) {
  const flow = allFlows.find(f => f.id === id);
  if (!flow) return showFlowEditor(id);

  const modal = document.getElementById('modal-overlay');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:16px">Editar Fluxo</h3>
        <button onclick="closeModal()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px"><i class="fa-solid fa-times"></i></button>
      </div>
      <div style="display:grid;gap:12px">
        <div class="form-group"><label style="font-size:12px;font-weight:500">Nome *</label><input type="text" id="ef-name" value="${flow.name||''}" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text-primary);font-size:13px"></div>
        <div class="form-group"><label style="font-size:12px;font-weight:500">Descrição</label><textarea id="ef-desc" rows="2" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text-primary);font-size:13px;resize:vertical">${flow.description||''}</textarea></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label style="font-size:12px;font-weight:500">Gatilho</label><select id="ef-trigger" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text-primary);font-size:12px">${Object.entries(TRIGGER_LABELS).map(([k,v]) => `<option value="${k}" ${flow.trigger===k?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="form-group"><label style="font-size:12px;font-weight:500">Conexão</label><select id="ef-connection" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text-primary);font-size:12px">${Object.entries(CONNECTION_LABELS).map(([k,v]) => `<option value="${k}" ${flow.connection===k?'selected':''}>${v}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label style="font-size:12px;font-weight:500">Palavras-chave</label><input type="text" id="ef-keywords" value="${flow.keywords||''}" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text-primary);font-size:13px"></div>
        <div style="display:flex;gap:8px">
          <label style="font-size:12px;font-weight:500;display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="ef-active" ${flow.is_active?'checked':''} style="accent-color:var(--accent)"> Ativo
          </label>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:16px">
        <button class="btn btn-sm btn-primary" onclick="openFlowEditor('${id}')"><i class="fa-solid fa-diagram-project"></i> Abrir Editor Visual</button>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-secondary" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-sm btn-primary" onclick="submitEditFlow('${id}')"><i class="fa-solid fa-save"></i> Salvar</button>
        </div>
      </div>
    </div>`;
  openModal();
}

async function submitEditFlow(id) {
  const data = {
    name: document.getElementById('ef-name').value.trim(),
    description: document.getElementById('ef-desc').value,
    trigger: document.getElementById('ef-trigger').value,
    connection: document.getElementById('ef-connection').value,
    keywords: document.getElementById('ef-keywords').value,
    is_active: document.getElementById('ef-active').checked
  };
  if (!data.name) { showToast('Nome é obrigatório', 'error'); return; }
  await api(`/api/flows/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  closeModal();
  showToast('Fluxo atualizado!', 'success');
  loadFlows(document.getElementById('content'));
}

// ─── Flow Actions ────────────────────────────────────────────
async function duplicateFlow(id) {
  await api(`/api/flows/${id}/duplicate`, { method: 'POST' });
  showToast('Fluxo duplicado!', 'success');
  loadFlows(document.getElementById('content'));
}

async function deleteFlow(id) {
  if (!confirm('Excluir este fluxo permanentemente?')) return;
  await api(`/api/flows/${id}`, { method: 'DELETE' });
  showToast('Fluxo excluído', 'success');
  loadFlows(document.getElementById('content'));
}

async function exportFlow(id) {
  const data = await api(`/api/flows/${id}/export`);
  if (!data) { showToast('Erro ao exportar', 'error'); return; }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${data.flow?.name || 'flow'}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Flow exportado!', 'success');
}

function importFlowFile() { document.getElementById('flow-import-input')?.click(); }
async function handleFlowImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    await api('/api/flows/import', { method: 'POST', body: JSON.stringify(data) });
    showToast('Flow importado!', 'success');
    loadFlows(document.getElementById('content'));
  } catch { showToast('Arquivo JSON inválido', 'error'); }
  event.target.value = '';
}

// ─── Folder Operations ───────────────────────────────────────
function showCreateFolderModal() {
  const modal = document.getElementById('modal-overlay');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:16px">Nova Pasta</h3>
        <button onclick="closeModal()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px"><i class="fa-solid fa-times"></i></button>
      </div>
      <div class="form-group"><label style="font-size:12px;font-weight:500">Nome da pasta *</label><input type="text" id="cfolder-name" placeholder="Ex: Atendimento" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text-primary);font-size:13px"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="btn btn-sm btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-sm btn-primary" onclick="submitCreateFolder()"><i class="fa-solid fa-plus"></i> Criar</button>
      </div>
    </div>`;
  openModal();
  setTimeout(() => document.getElementById('cfolder-name')?.focus(), 100);
}

async function submitCreateFolder() {
  const name = document.getElementById('cfolder-name').value.trim();
  if (!name) { showToast('Digite o nome da pasta', 'error'); return; }
  await api('/api/flows/folders', { method: 'POST', body: JSON.stringify({ name }) });
  closeModal();
  showToast('Pasta criada!', 'success');
  loadFlows(document.getElementById('content'));
}

async function deleteFolder(id) {
  if (!confirm('Excluir esta pasta? Os fluxos dentro dela não serão excluídos.')) return;
  await api(`/api/flows/folders/${id}`, { method: 'DELETE' });
  if (flowCurrentFolder === id) flowCurrentFolder = null;
  showToast('Pasta excluída', 'success');
  loadFlows(document.getElementById('content'));
}

function showMoveFlowModal(flowId) {
  const modal = document.getElementById('modal-overlay');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:16px">Mover para pasta</h3>
        <button onclick="closeModal()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px"><i class="fa-solid fa-times"></i></button>
      </div>
      <div style="display:grid;gap:6px">
        <div onclick="moveFlow('${flowId}',null)" style="padding:10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:8px" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'"><i class="fa-solid fa-inbox" style="color:var(--accent)"></i> Sem pasta (raiz)</div>
        ${flowFolders.map(f => `<div onclick="moveFlow('${flowId}','${f.id}')" style="padding:10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:8px" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'"><i class="fa-solid fa-folder" style="color:#f59e0b"></i> ${f.name}</div>`).join('')}
      </div>
    </div>`;
  openModal();
}

async function moveFlow(flowId, folderId) {
  await api(`/api/flows/${flowId}`, { method: 'PUT', body: JSON.stringify({ folder_id: folderId }) });
  closeModal();
  showToast('Fluxo movido!', 'success');
  loadFlows(document.getElementById('content'));
}

async function showBulkMoveModal() {
  if (!flowBulkSelected.length) return;
  const modal = document.getElementById('modal-overlay');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:16px">Mover ${flowBulkSelected.length} fluxo(s)</h3>
        <button onclick="closeModal()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px"><i class="fa-solid fa-times"></i></button>
      </div>
      <div style="display:grid;gap:6px">
        <div onclick="bulkMoveFlows(null)" style="padding:10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:8px" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'"><i class="fa-solid fa-inbox" style="color:var(--accent)"></i> Sem pasta (raiz)</div>
        ${flowFolders.map(f => `<div onclick="bulkMoveFlows('${f.id}')" style="padding:10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:8px" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'"><i class="fa-solid fa-folder" style="color:#f59e0b"></i> ${f.name}</div>`).join('')}
      </div>
    </div>`;
  openModal();
}

async function bulkMoveFlows(folderId) {
  await api('/api/flows/bulk', { method: 'POST', body: JSON.stringify({ action: 'move', ids: flowBulkSelected, folder_id: folderId }) });
  closeModal();
  showToast(`${flowBulkSelected.length} fluxo(s) movido(s)`, 'success');
  loadFlows(document.getElementById('content'));
}

// ─── Flowise Editor ──────────────────────────────────────────
function openFlowEditor(flowId) {
  closeModal();
  showFlowEditor(flowId);
}

function showFlowEditor(flowId) {
  const flowiseUrl = FLOWISE_URL || 'https://flowise-production-233b.up.railway.app';
  const flow = allFlows.find(f => f.id === flowId);
  const el = document.getElementById('content');
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:calc(100vh - 120px)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-sm btn-secondary" onclick="loadFlows(document.getElementById('content'))"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
          <div>
            <h3 style="margin:0;font-size:15px">${flow?.name || 'Editor de Fluxos'}</h3>
            <span style="font-size:10px;color:var(--text-muted)">ID: ${flowId}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span id="flowise-status" style="font-size:11px;color:var(--text-muted)">Verificando...</span>
          <button class="btn btn-sm btn-secondary" onclick="showFlowiseConfig()"><i class="fa-solid fa-cog"></i></button>
        </div>
      </div>
      <div style="flex:1;border-radius:10px;overflow:hidden;border:1px solid var(--border)">
        <iframe id="flowise-iframe" src="${flowiseUrl}/chatflow/${flowId}" style="width:100%;height:100%;border:none;background:var(--bg-secondary)" onload="checkFlowiseConnection()" onerror="handleFlowiseError()"></iframe>
      </div>
    </div>`;
  checkFlowiseConnection();
}

async function checkFlowiseConnection() {
  const statusEl = document.getElementById('flowise-status');
  if (!statusEl) return;
  try {
    const status = await api('/api/flowise/status');
    statusEl.innerHTML = status?.connected
      ? '<span style="color:#22c55e"><i class="fa-solid fa-check-circle"></i> Flowise conectado</span>'
      : '<span style="color:#ef4444"><i class="fa-solid fa-times-circle"></i> Não conectado</span>';
  } catch { statusEl.innerHTML = '<span style="color:#ef4444"><i class="fa-solid fa-times-circle"></i> Erro</span>'; }
}

function handleFlowiseError() {
  const statusEl = document.getElementById('flowise-status');
  if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444"><i class="fa-solid fa-exclamation-triangle"></i> Erro ao carregar</span>';
}

// ─── Flowise Config ──────────────────────────────────────────
function showFlowiseConfig() {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div style="max-width:600px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <button class="btn btn-sm btn-secondary" onclick="loadFlows(document.getElementById('content'))"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
        <h2 style="margin:0;font-size:18px">Configurar Flowise</h2>
      </div>
      <div class="card"><div class="card-header"><h3>Conexão Flowise</h3></div><div class="card-body">
        <div class="form-group"><label style="font-size:12px">URL do Flowise</label><input type="url" id="flowise-url" value="${FLOWISE_URL||'https://flowise-production-233b.up.railway.app'}" placeholder="https://flowise.up.railway.app" style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text-primary);font-size:13px"></div>
        <button class="btn btn-sm btn-primary" onclick="testFlowiseConnectionFromConfig()"><i class="fa-solid fa-plug"></i> Testar Conexão</button>
      </div></div>
    </div>`;
}

async function testFlowiseConnectionFromConfig() {
  showToast('Testando conexão...', 'info');
  const status = await api('/api/flowise/status');
  showToast(status?.connected ? 'Conexão OK!' : 'Erro ao conectar', status?.connected ? 'success' : 'error');
}

function closeModal() { const m = document.getElementById('modal-overlay'); if (m) { m.style.display = 'none'; m.classList.remove('show'); } }
function openModal() { const m = document.getElementById('modal-overlay'); if (m) { m.style.display = 'flex'; m.classList.add('show'); } }

// ─── Voice Studio (Lailla.io exact) ──────────────────────────────
async function loadVoice(el) {
  allVoices = await api('/api/voice') || [];
  const presetVoices = ['Julieta','Marcos Vinicius','Carla','João Pedro','Maria Eduarda','Otavio Luiz','Bia','Samuel'];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div><h2 style="margin:0;font-size:20px">Voice Studio</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">Gerenciar vozes e gerar áudios com IA</p></div>
      <div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;color:var(--text-muted)">Usados 50.000 de 50.000 tokens</span><button class="btn btn-sm btn-primary"><i class="fa-solid fa-plus"></i></button></div>
    </div>

    <!-- Clone limit warning -->
    <div style="background:var(--danger-bg);border:1px solid var(--danger);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:var(--danger)">
      <i class="fa-solid fa-exclamation-triangle"></i> Máximo de vozes clonadas do plano atingido, clique para atualizar.
    </div>

    <div class="grid-2">
      <!-- TTS Generator -->
      <div class="card"><div class="card-header"><h3>🎤 Gerar áudio</h3></div><div class="card-body">
        <textarea id="voice-text" rows="4" placeholder="Digite aqui o texto desejado para virar um áudio." style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text-primary);font-size:13px;resize:vertical;margin-bottom:12px"></textarea>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div><label style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between"><span>Estabilidade</span><span id="stability-val">0,5</span></label><input type="range" id="stability" min="0" max="1" step="0.1" value="0.5" style="width:100%" oninput="document.getElementById('stability-val').textContent=this.value.replace('.',',')"></div>
          <div><label style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between"><span>Similaridade</span><span id="similarity-val">0,7</span></label><input type="range" id="similarity" min="0" max="1" step="0.1" value="0.7" style="width:100%" oninput="document.getElementById('similarity-val').textContent=this.value.replace('.',',')"></div>
          <div><label style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between"><span>Sotaque</span><span id="accent-val">0,5</span></label><input type="range" id="accent" min="0" max="1" step="0.1" value="0.5" style="width:100%" oninput="document.getElementById('accent-val').textContent=this.value.replace('.',',')"></div>
          <div><label style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between"><span>Velocidade</span><span id="speed-val">1,0</span></label><input type="range" id="speed" min="0.5" max="2" step="0.1" value="1" style="width:100%" oninput="document.getElementById('speed-val').textContent=this.value.replace('.',',')"></div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:11px;color:var(--text-muted)"><span>Modelo: eleven_v3</span><span>Custo: 0 tokens</span></div>

        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
          <button style="width:36px;height:36px;border-radius:50%;background:var(--accent);border:none;color:white;cursor:pointer;font-size:14px"><i class="fa-solid fa-play"></i></button>
          <div style="flex:1;height:4px;background:var(--border);border-radius:2px"><div style="height:100%;width:0%;background:var(--accent);border-radius:2px"></div></div>
          <span style="font-size:11px;color:var(--text-muted)">0:00</span>
        </div>

        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-primary" onclick="generateVoice()"><i class="fa-solid fa-play"></i> Gerar e reproduzir</button>
          <button class="btn btn-sm btn-secondary" onclick="generateVoice()"><i class="fa-solid fa-download"></i> Gerar áudio</button>
        </div>
      </div></div>

      <!-- Voice List -->
      <div class="card"><div class="card-header"><h3>🔊 Vozes</h3></div><div class="card-body">
        <p style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Vozes personalizadas</p>
        ${allVoices.length===0?'<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:11px;border:1px dashed var(--border);border-radius:8px"><i class="fa-solid fa-microphone" style="font-size:20px;margin-bottom:6px;opacity:0.3"></i><p>Nenhuma voz clonada</p></div>':
          allVoices.map(v => `<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-secondary);border-radius:8px;margin-bottom:6px">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:14px">🎤</div>
            <div style="flex:1"><div style="font-weight:500;font-size:12px">${v.name}</div><div style="font-size:10px;color:var(--text-muted)">Clonada • ${v.provider||'ElevenLabs'}</div></div>
            <button style="background:none;border:none;color:var(--text-muted);cursor:pointer"><i class="fa-solid fa-trash"></i></button>
          </div>`).join('')}
        
        <p style="font-size:11px;color:var(--text-muted);margin:12px 0 10px">Modelos pré aprovados</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${presetVoices.map(v => `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-secondary);border-radius:8px;cursor:pointer" onclick="selectPresetVoice('${v}')">
            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:12px">🎤</div>
            <div style="flex:1"><div style="font-size:11px;font-weight:500">${v}</div><div style="font-size:9px;color:var(--text-muted)">Pré Configurada</div></div>
            <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:10px"><i class="fa-solid fa-play"></i></button>
          </div>`).join('')}
        </div>
      </div></div>
    </div>`;
}

function selectPresetVoice(name) { showToast(`Voz selecionada: ${name}`, 'success'); }
async function generateVoice() { showToast('Gerando áudio...', 'info'); }

// ─── Agente IA (Lailla.io exact) ─────────────────────────────────
async function loadAgents(el) {
  allAgents = await api('/api/agents') || [];
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div><h2 style="margin:0;font-size:20px">Agente IA</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">Crie agentes de IA para suas automações • Disponíveis: ${allAgents.length}/5</p></div>
      <button class="btn btn-primary btn-sm" onclick="showCreateAgent()"><i class="fa-solid fa-plus"></i> Novo Agente</button>
    </div>

    ${allAgents.length>=5?'<div style="background:var(--accent-light);border:1px solid var(--accent);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;display:flex;justify-content:space-between;align-items:center"><span>Limite de criação de agentes atingido (${allAgents.length}/5)</span><button class="btn btn-sm btn-primary">Comprar novo agente</button></div>':''}

    <!-- Agent Form -->
    <div id="agent-form" style="display:none" class="card" style="margin-bottom:16px">
      <div class="card-header"><h3>🤖 Criar Agente IA</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>Nome do Agente</label><input type="text" id="agent-name" placeholder="Ex: Safira Astral"></div>
          <div class="form-group"><label>Provider</label><select id="agent-provider"><option value="groq">Groq (Grátis - Llama 3.3)</option><option value="deepseek">DeepSeek</option><option value="openai">OpenAI (GPT-4o)</option></select></div>
          <div class="form-group" style="grid-column:span 2"><label>Identidade</label><textarea id="agent-identity" rows="2" placeholder="Você é a Safira, uma atendente virtual profissional..."></textarea></div>
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

    <!-- Agent Cards -->
    <div class="grid-2">${allAgents.length===0?'<div style="grid-column:span 2;text-align:center;padding:40px;color:var(--text-muted)"><i class="fa-solid fa-robot" style="font-size:48px;margin-bottom:12px;opacity:0.3"></i><p>Nenhum agente criado</p><button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="showCreateAgent()">Criar Primeiro Agente</button></div>':
      allAgents.map(a => `<div class="card" style="margin-bottom:12px">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:16px">🤖</div>
            <h3 style="margin:0;font-size:14px">${a.name}</h3>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-secondary" style="padding:3px 6px"><i class="fa-solid fa-chart-bar"></i></button>
            <button class="btn btn-sm btn-secondary" style="padding:3px 6px"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteAgent('${a.id}')" style="padding:3px 6px"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="card-body">
          <p style="color:var(--text-muted);font-size:12px;margin-bottom:10px">${a.description||a.identity||''}</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><span class="badge badge-blue">${a.provider||'groq'}</span><span class="badge badge-purple">${a.model||'llama-3.3-70b'}</span><span class="badge badge-yellow">temp: ${a.temperature||0.7}</span></div>
          <button class="btn btn-sm btn-primary" onclick="manageAgent('${a.id}')" style="width:100%"><i class="fa-solid fa-cog"></i> Gerenciar</button>
        </div>
      </div>`).join('')}
    </div>`;
}

function showCreateAgent() { document.getElementById('agent-form').style.display = 'block'; }
function hideAgentForm() { document.getElementById('agent-form').style.display = 'none'; }
async function createAgent() {
  const data = { name: document.getElementById('agent-name').value, identity: document.getElementById('agent-identity').value, objective: document.getElementById('agent-objective').value, communication: document.getElementById('agent-communication').value, instructions: document.getElementById('agent-instructions').value, restrictions: document.getElementById('agent-restrictions').value, provider: document.getElementById('agent-provider').value, temperature: parseFloat(document.getElementById('agent-temperature').value), voice_id: document.getElementById('agent-voice').value || null };
  await api('/api/agents', { method: 'POST', body: JSON.stringify(data) }); showToast('Agente criado!', 'success'); loadAgents(document.getElementById('content'));
}
function manageAgent(id) { showToast('Gerenciar agente em breve', 'info'); }
async function deleteAgent(id) { if (!confirm('Excluir?')) return; await api(`/api/agents/${id}`, { method: 'DELETE' }); showToast('Excluído', 'success'); loadAgents(document.getElementById('content')); }

// ─── Campanhas Kanban (Lailla.io exact) ──────────────────────────
async function loadCampaigns(el) {
  const data = await api('/api/crm/contacts'); allContacts = data?.contacts || [];
  const tags = [...new Set(allContacts.map(c => c.tag).filter(Boolean))];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div><h2 style="margin:0;font-size:20px">Campanhas</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">Disparo em massa por etiquetas</p></div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-secondary"><i class="fa-solid fa-sync"></i></button>
        <button class="btn btn-sm btn-primary" onclick="createCampaign()"><i class="fa-solid fa-plus"></i></button>
      </div>
    </div>

    <!-- Tabs (Lailla.io style) -->
    <div style="display:flex;gap:4px;margin-bottom:20px">
      <button class="btn btn-sm btn-primary" style="flex:1"><i class="fa-solid fa-tags"></i> Etiquetas</button>
      <button class="btn btn-sm btn-secondary" style="flex:1"><i class="fa-solid fa-bolt"></i> Em andamento</button>
      <button class="btn btn-sm btn-secondary" style="flex:1"><i class="fa-solid fa-clock"></i> Histórico</button>
    </div>

    <!-- Kanban by Tags -->
    <div style="display:flex;gap:14px;overflow-x:auto;padding-bottom:16px">
      ${tags.length===0?'<div style="text-align:center;padding:40px;color:var(--text-muted);width:100%"><i class="fa-solid fa-tags" style="font-size:48px;margin-bottom:12px;opacity:0.3"></i><p>Nenhuma etiqueta encontrada</p></div>':
        tags.map(t => {
          const contacts = allContacts.filter(c => c.tag === t);
          return `<div style="min-width:260px;flex-shrink:0;background:var(--bg-secondary);border-radius:12px;padding:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div style="display:flex;align-items:center;gap:6px">
                <div style="width:8px;height:8px;border-radius:50%;background:var(--accent)"></div>
                <h4 style="margin:0;font-size:12px;font-weight:600">${t}</h4>
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="background:var(--bg-primary);padding:2px 8px;border-radius:10px;font-size:10px;color:var(--text-muted)">${contacts.length}</span>
                <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:10px"><i class="fa-solid fa-play"></i></button>
                <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:10px"><i class="fa-solid fa-cog"></i></button>
              </div>
            </div>
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:8px">Faturamento: R$ 0,00</div>
            ${contacts.slice(0,5).map(c => `<div style="background:var(--bg-primary);border-radius:8px;padding:8px;margin-bottom:6px;border:1px solid var(--border)">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:500;font-size:11px">${c.name||'N/A'}</span>
                <span style="font-size:9px;color:var(--accent);background:var(--accent-light);padding:1px 4px;border-radius:4px">R$ 0,00</span>
              </div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">Telefone: ${c.phone||''}</div>
              <div style="font-size:9px;color:var(--text-muted);margin-top:2px">📅 ${c.createdAt?formatDate(c.createdAt):'N/A'} • 📱 Whatsapp_business_api</div>
            </div>`).join('')}
            ${contacts.length>5?`<div style="text-align:center;font-size:10px;color:var(--text-muted);padding:4px;cursor:pointer">+${contacts.length-5} mais</div>`:''}
          </div>`;
        }).join('')}
    </div>`;
}

async function createCampaign() { showToast('Criar campanha em breve', 'info'); }

// ─── CTWA (Lailla.io exact) ──────────────────────────────────────
async function loadCTWA(el) {
  const [analytics, campaigns] = await Promise.all([api('/api/ctwa/analytics'), api('/api/ctwa/campaigns')]);
  ctwaAnalytics = analytics?.summary || {};
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div><h2 style="margin:0;font-size:20px">CTWA - Click to WhatsApp Ads</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">Desempenho de anúncios com objetivo de mensagens para whatsapp</p></div>
    </div>

    <div style="background:var(--info-bg);border:1px solid var(--info);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:var(--info)">
      <i class="fa-solid fa-info-circle"></i> CTWA avisa à Meta quando seus anúncios geram conversas no WhatsApp
    </div>

    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-comments"></i></div><div class="stat-value">${ctwaAnalytics.totalClicks||490}</div><div class="stat-label">Conversas iniciadas</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-shopping-cart"></i></div><div class="stat-value">${ctwaAnalytics.purchases||29}</div><div class="stat-label">Compras concluídas</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-chart-line"></i></div><div class="stat-value">5,92%</div><div class="stat-label">Conversão de compras</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(ctwaAnalytics.revenue||1105).toLocaleString()}</div><div class="stat-label">Total compras</div></div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px">
      <input type="text" placeholder="Buscar anúncio..." style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--text-primary);font-size:12px;width:200px">
      <select style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text-primary);font-size:11px"><option>Selecione o período</option><option>Hoje</option><option>Últimos 7 dias</option><option>Últimos 30 dias</option></select>
    </div>

    <div class="card"><div class="card-body" style="padding:0">
      <table><thead><tr><th>Anúncio</th><th>Conversas</th><th>Compras</th><th>Conversão</th><th>Total</th></tr></thead><tbody>
        ${[
          {name:'Converse conosco',conv:24,buy:3,rate:'12.50%',total:'R$ 450'},
          {name:'Converse conosco',conv:9,buy:5,rate:'55.56%',total:'R$ 225'},
          {name:'Converse conosco',conv:15,buy:2,rate:'13.33%',total:'R$ 150'},
          {name:'Converse conosco',conv:8,buy:1,rate:'12.50%',total:'R$ 75'},
          {name:'Guiadaluz',conv:12,buy:4,rate:'33.33%',total:'R$ 200'},
        ].map(a => `<tr><td style="font-size:12px">${a.name}</td><td style="font-size:12px">${a.conv}</td><td style="font-size:12px">${a.buy}</td><td style="font-size:12px;color:${parseFloat(a.rate)>20?'#22c55e':'var(--text-muted)'}">${a.rate}</td><td style="font-size:12px">${a.total}</td></tr>`).join('')}
      </tbody></table>
    </div></div>`;
}

// ─── Vendas (Lailla.io exact) ────────────────────────────────────
async function loadSales(el) {
  const [sales, stats] = await Promise.all([api('/api/sales'), api('/api/sales/stats')]);
  allSales = sales || []; salesStats = stats || {};
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div><h2 style="margin:0;font-size:20px">Painel de vendas</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">Vendas geradas após marcação e contato inicial pela Ozion.</p></div>
    </div>

    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-chart-line"></i></div><div class="stat-value">R$ ${(salesStats.totalRevenue||0).toLocaleString()}</div><div class="stat-label">Previsão de Faturamento</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-check-circle"></i></div><div class="stat-value">R$ ${(salesStats.approved||0).toLocaleString()}</div><div class="stat-label">Vendas Aprovadas</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-clock"></i></div><div class="stat-value">R$ ${(salesStats.pending||0).toLocaleString()}</div><div class="stat-label">Vendas Pendentes</div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-times-circle"></i></div><div class="stat-value">R$ 0,00</div><div class="stat-label">Vendas Canceladas</div></div>
    </div>

    <!-- Filters -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <input type="text" placeholder="Descrição, id, contato" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--text-primary);font-size:12px;width:200px">
      <select style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text-primary);font-size:11px"><option>Selecione um status</option><option>Aprovado</option><option>Pendente</option><option>Cancelado</option></select>
      <select style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text-primary);font-size:11px"><option>Selecione um período</option><option>Hoje</option><option>Últimos 7 dias</option><option>Últimos 30 dias</option></select>
      <div style="display:flex;gap:4px">
        ${['Kiwify','Hotmart','Perfect Pay','Asaas','Stripe'].map(i => `<span style="padding:3px 8px;border-radius:12px;font-size:10px;cursor:pointer;background:var(--bg-secondary);border:1px solid var(--border)">${i}</span>`).join('')}
      </div>
    </div>

    <div class="card"><div class="card-body" style="padding:0">
      ${allSales.length===0?'<div style="text-align:center;padding:30px;color:var(--text-muted)">Nenhum resultado encontrado</div>':
        `<table><thead><tr><th>Data</th><th>Contato</th><th>Descrição</th><th>Valor</th><th>Status</th></tr></thead><tbody>
        ${allSales.map(s => `<tr><td style="font-size:12px">${formatDate(s.createdAt)}</td><td style="font-size:12px">${s.contact||'N/A'}</td><td style="font-size:12px">${s.product||'N/A'}</td><td style="font-size:12px">R$ ${(s.amount||0).toFixed(2)}</td><td><span class="badge badge-${s.status==='approved'?'green':s.status==='pending'?'yellow':'red'}">${s.status}</span></td></tr>`).join('')}
        </tbody></table>`}
    </div></div>`;
}

// ─── Integrações (Lailla.io exact) ───────────────────────────────
async function loadIntegrations(el) {
  allIntegrations = await api('/api/integrations') || [];
  const providers = [
    { id: 'kiwify', name: 'Kiwify', desc: 'Gateway de pagamentos online', type: 'Integração Nativa' },
    { id: 'perfectpay', name: 'Perfect Pay', desc: 'Gateway de pagamentos online', type: 'Integração Nativa' },
    { id: 'hotmart', name: 'Hotmart', desc: 'Gateway de pagamentos online', type: 'Integração Nativa' },
    { id: 'braip', name: 'Braip', desc: 'Gateway de pagamentos online', type: 'Integração Nativa' },
    { id: 'asaas', name: 'Asaas', desc: 'Gateway de pagamentos online', type: 'Integração Nativa' },
    { id: 'stripe', name: 'Stripe', desc: 'Gateway de pagamentos online', type: 'Integração Nativa' },
    { id: 'mercadopago', name: 'MercadoPago', desc: 'Gateway de pagamentos online', type: 'Integração Nativa' },
    { id: 'groq', name: 'Groq AI', desc: 'Llama 3.3 (Grátis)', type: 'Integração IA' },
    { id: 'deepseek', name: 'DeepSeek', desc: 'DeepSeek Chat', type: 'Integração IA' },
    { id: 'openai', name: 'OpenAI', desc: 'GPT-4o / Whisper', type: 'Integração IA' },
    { id: 'elevenlabs', name: 'ElevenLabs', desc: 'Voice Cloning', type: 'Integração Voz' },
    { id: 'meta', name: 'Meta WhatsApp', desc: 'WhatsApp Cloud API', type: 'Integração WhatsApp' },
  ];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div><h2 style="margin:0;font-size:20px">Integrações</h2><p style="color:var(--text-muted);margin-top:2px;font-size:12px">Gerencie suas integrações nativas e webhooks</p></div>
    </div>

    <!-- Webhooks Section -->
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:20px">
      <h3 style="font-size:14px;margin-bottom:4px">Webhooks</h3>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Crie webhooks customizados para suas automações</p>
      <button class="btn btn-sm btn-primary"><i class="fa-solid fa-plug"></i> Acessar Webhooks</button>
    </div>

    <!-- Integrations Grid -->
    <h3 style="font-size:14px;margin-bottom:12px">Integrações Nativas</h3>
    <div class="grid-3">${providers.map(p => {
      const connected = allIntegrations.find(i => i.provider === p.id);
      return `<div class="card"><div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
          <h3 style="margin:0;font-size:14px">${p.name}</h3>
          <span class="badge badge-blue" style="font-size:9px">${p.type}</span>
        </div>
        <p style="font-size:11px;color:var(--text-muted);margin-bottom:10px">${p.desc}</p>
        <button class="btn btn-sm btn-${connected?'secondary':'primary'}" onclick="connectIntegration('${p.id}')"><i class="fa-solid fa-${connected?'cog':'plug'}"></i> ${connected?'Gerenciar':'Conectar'}</button>
      </div></div>`;
    }).join('')}</div>`;
}

async function connectIntegration(provider) { showToast(`Conectando ${provider}...`, 'info'); }

// ─── Configurações (Lailla.io style) ─────────────────────────────
async function loadSettings(el) {
  el.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px">Configurações</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;font-size:12px">Configurações do workspace</p>

    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>🏢 Dados do Workspace</h3></div><div class="card-body">
        <div class="form-group"><label>Nome do Workspace</label><input type="text" value="Workspace Principal"></div>
        <div class="form-group"><label>Email</label><input type="email" value="admin@ozion.com"></div>
        <div class="form-group"><label>Telefone</label><input type="text" value="+5511999999999"></div>
        <button class="btn btn-primary btn-sm"><i class="fa-solid fa-save"></i> Salvar</button>
      </div></div>
      <div class="card"><div class="card-header"><h3>🕐 Expediente</h3></div><div class="card-body">
        <div class="form-group"><label>Dias de atendimento</label>
          <div style="display:flex;gap:4px;flex-wrap:wrap">${['Seg','Ter','Qua','Qui','Sex','Sab','Dom'].map(d => `<span style="padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;background:var(--bg-secondary);border:1px solid var(--border)">${d}</span>`).join('')}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>Início</label><input type="time" value="09:00"></div>
          <div class="form-group"><label>Fim</label><input type="time" value="18:00"></div>
        </div>
        <div class="form-group"><label>Fora do expediente</label><textarea rows="2" placeholder="Mensagem automática fora do horário..."></textarea></div>
        <button class="btn btn-primary btn-sm"><i class="fa-solid fa-save"></i> Salvar</button>
      </div></div>
      <div class="card"><div class="card-header"><h3>🤖 Agente IA Padrão</h3></div><div class="card-body">
        <div class="form-group"><label>Agente padrão</label><select><option>Nenhum</option></select></div>
        <div class="form-group"><label>Horário de funcionamento da IA</label>
          <div style="display:flex;gap:4px;flex-wrap:wrap">${['Seg','Ter','Qua','Qui','Sex','Sab','Dom'].map(d => `<span style="padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;background:var(--accent-light);border:1px solid var(--accent);color:var(--accent)">${d}</span>`).join('')}</div>
        </div>
        <button class="btn btn-primary btn-sm"><i class="fa-solid fa-save"></i> Salvar</button>
      </div></div>
      <div class="card"><div class="card-header"><h3>📱 WhatsApp</h3></div><div class="card-body">
        <div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted)">Status</label><div><span class="badge badge-red">Desconectado</span></div></div>
        <div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted)">Número</label><div style="font-weight:500;font-size:13px">Não conectado</div></div>
        <button class="btn btn-primary btn-sm" onclick="navigate('whatsapp')"><i class="fa-solid fa-qrcode"></i> Conectar WhatsApp</button>
      </div></div>
    </div>

    <!-- Planos -->
    <div style="margin-top:24px">
      <h3 style="font-size:14px;margin-bottom:12px">Planos</h3>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        ${[
          {name:'Gratuito',price:0,features:['1 agente IA','1.000 tokens GPT','100 tokens voz']},
          {name:'Essencials',price:97,features:['1 agente IA','5M tokens GPT','400K tokens voz','WhatsApp Business']},
          {name:'Profissional',price:197,features:['3 agentes IA','15M tokens GPT','1M tokens voz','API Oficial']},
          {name:'Enterprise',price:497,features:['Ilimitado','50M tokens GPT','5M tokens voz','White label']},
        ].map(p => `<div class="card" style="border-top:3px solid var(--primary)"><div class="card-body" style="text-align:center">
          <h3 style="margin:0;font-size:15px">${p.name}</h3>
          <div style="font-size:26px;font-weight:700;margin:10px 0">R$ ${p.price}<span style="font-size:11px;font-weight:400">/mês</span></div>
          <ul style="text-align:left;font-size:11px;margin:10px 0;padding:0;list-style:none">${p.features.map(f => `<li style="padding:3px 0"><i class="fa-solid fa-check" style="color:#22c55e;margin-right:4px;font-size:10px"></i>${f}</li>`).join('')}</ul>
          <button class="btn btn-primary btn-sm" style="width:100%">Escolher</button>
        </div></div>`).join('')}
      </div>
    </div>`;
}

// ─── Helpers ─────────────────────────────────────────────────────
function timeAgo(date) { const s = Math.floor((Date.now() - new Date(date)) / 1000); if (s < 60) return 'agora'; if (s < 3600) return Math.floor(s/60) + 'min'; if (s < 86400) return Math.floor(s/3600) + 'h'; return Math.floor(s/86400) + 'd'; }
function formatTime(date) { if (!date) return ''; return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function formatDate(date) { if (!date) return ''; return new Date(date).toLocaleDateString('pt-BR'); }
function showToast(msg, type = 'info') { const t = document.createElement('div'); t.className = `toast toast-${type}`; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }

render();
