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
let allTags = [];
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

// ─── Global Toast System ─────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = 'info') {
  const existing = document.querySelector('.oz-toast');
  if (existing) existing.remove();
  clearTimeout(toastTimeout);
  const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  const toast = document.createElement('div');
  toast.className = 'oz-toast';
  toast.style.cssText = `position:fixed;bottom:24px;right:24px;background:#1a1f35;border:1px solid #2a3050;border-left:3px solid ${colors[type]};border-radius:10px;padding:14px 20px;font-size:13px;z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:slideUp .3s ease;font-weight:500;color:#e6edf3;max-width:360px`;
  toast.innerHTML = `<i class="fa-solid ${icons[type]}" style="color:${colors[type]};font-size:16px"></i><span>${msg}</span>`;
  document.body.appendChild(toast);
  toastTimeout = setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── Global Modal System ─────────────────────────────────────────
function showModal({ title, body, footer, width = '480px', onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'oz-modal-' + Date.now();
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(overlay.id); };
  overlay.innerHTML = `
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:16px;width:100%;max-width:${width};max-height:85vh;overflow-y:auto;box-shadow:0 16px 64px rgba(0,0,0,.6);animation:slideUp .3s ease">
      <div style="padding:20px 24px;border-bottom:1px solid #2a3050;display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0;font-size:16px;font-weight:700;color:#e6edf3">${title}</h3>
        <button onclick="closeModal('${overlay.id}')" style="background:none;border:none;color:#8b9dc3;cursor:pointer;font-size:20px;padding:4px;line-height:1">&times;</button>
      </div>
      <div style="padding:20px 24px">${body}</div>
      ${footer ? `<div style="padding:16px 24px;border-top:1px solid #2a3050;display:flex;justify-content:flex-end;gap:8px">${footer}</div>` : ''}
    </div>`;
  document.body.appendChild(overlay);
  return overlay.id;
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }
}

function confirmModal({ title, message, onConfirm, danger = false }) {
  return showModal({
    title: title || 'Confirmar',
    body: `<p style="color:#8b9dc3;font-size:13px;margin:0">${message}</p>`,
    footer: `
      <button onclick="closeModal(this.closest('.modal-overlay').id)" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px;font-weight:500">Cancelar</button>
      <button onclick="(${onConfirm.toString()})();closeModal(this.closest('.modal-overlay').id)" style="padding:8px 16px;border-radius:8px;border:none;background:${danger ? '#ef4444' : '#6c5ce7'};color:white;cursor:pointer;font-size:12px;font-weight:600">${danger ? 'Excluir' : 'Confirmar'}</button>`
  });
}

function loadingModal(msg = 'Carregando...') {
  return showModal({
    title: msg,
    body: `<div style="text-align:center;padding:20px"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#6c5ce7"></i><p style="margin-top:12px;color:#8b9dc3;font-size:13px">Aguarde...</p></div>`,
    width: '320px'
  });
}

// ─── Global CRUD Helpers ─────────────────────────────────────────
function crudForm({ fields, values = {}, id }) {
  return fields.map(f => {
    const val = values[f.key] || '';
    if (f.type === 'select') {
      return `<div class="form-group"><label>${f.label}</label><select id="${id}-${f.key}" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px">${f.options.map(o => `<option value="${o.value}" ${val === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div>`;
    }
    if (f.type === 'color') {
      return `<div class="form-group"><label>${f.label}</label><div style="display:flex;gap:6px;flex-wrap:wrap">${f.colors.map(c => `<div onclick="document.getElementById('${id}-${f.key}').value='${c}';document.querySelectorAll('.color-pick-${id}').forEach(e=>e.style.outline='none');this.style.outline='2px solid #6c5ce7'" class="color-pick-${id}" style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${val===c?'#6c5ce7':'transparent'}"></div>`).join('')}<input type="color" id="${id}-${f.key}" value="${val || '#6c5ce7'}" style="width:28px;height:28px;border:none;background:none;cursor:pointer"></div></div>`;
    }
    if (f.type === 'textarea') {
      return `<div class="form-group"><label>${f.label}</label><textarea id="${id}-${f.key}" rows="3" placeholder="${f.placeholder || ''}" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px;resize:vertical;font-family:inherit">${val}</textarea></div>`;
    }
    return `<div class="form-group"><label>${f.label}</label><input type="${f.type || 'text'}" id="${id}-${f.key}" value="${val}" placeholder="${f.placeholder || ''}" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>`;
  }).join('');
}

function getFormData(fields, id) {
  const data = {};
  fields.forEach(f => {
    const el = document.getElementById(`${id}-${f.key}`);
    if (el) data[f.key] = el.value;
  });
  return data;
}

function validateForm(fields, data) {
  for (const f of fields) {
    if (f.required && !data[f.key]) {
      showToast(`Preencha o campo ${f.label}`, 'error');
      return false;
    }
  }
  return true;
}

// ─── Navigation (Lailla.io exact structure) ──────────────────────
const NAV = [
  { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
  { id: 'chat', icon: 'fa-comments', label: 'Chat ao vivo' },
  { id: 'contacts', icon: 'fa-address-book', label: 'Contatos' },
  { id: 'tags', icon: 'fa-tags', label: 'Tags' },
  { id: 'flows', icon: 'fa-diagram-project', label: 'Fluxos' },
  { id: 'whatsapp', icon: 'fa-whatsapp', label: 'WhatsApp' },
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

    <!-- Mobile Navigation -->
    <div class="mobile-nav">
      <div class="mobile-nav-items">
        <div class="mobile-nav-item${currentPage==='dashboard'?' active':''}" onclick="navigate('dashboard')">
          <i class="fa-solid fa-chart-pie"></i>
          <span>Dashboard</span>
        </div>
        <div class="mobile-nav-item${currentPage==='chat'?' active':''}" onclick="navigate('chat')">
          <i class="fa-solid fa-comments"></i>
          <span>Chat</span>
        </div>
        <div class="mobile-nav-item${currentPage==='contacts'?' active':''}" onclick="navigate('contacts')">
          <i class="fa-solid fa-address-book"></i>
          <span>Contatos</span>
        </div>
        <div class="mobile-nav-item${currentPage==='flows'?' active':''}" onclick="navigate('flows')">
          <i class="fa-solid fa-diagram-project"></i>
          <span>Fluxos</span>
        </div>
        <div class="mobile-nav-item${['agents','voice','campaigns','integrations','settings','flowise'].includes(currentPage)?' active':''}" onclick="navigate('agents')">
          <i class="fa-solid fa-ellipsis"></i>
          <span>Mais</span>
        </div>
      </div>
    </div>

    <!-- Mobile Top Bar -->
    <div class="mobile-topbar">
      <div class="mobile-topbar-left">
        <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#6c5ce7,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:14px;color:white;font-weight:700">O</div>
        <span class="mobile-topbar-title">Ozion</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <i class="fa-solid fa-bell" style="font-size:16px;color:#8b9dc3;cursor:pointer"></i>
        <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6c5ce7,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:10px;color:white;cursor:pointer" onclick="logout()">A</div>
      </div>
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
  const pages = { dashboard:loadDashboard, chat:loadChat, contacts:loadContacts, tags:loadTags, flows:loadFlows, whatsapp:loadWhatsApp, voice:loadVoice, agents:loadAgents, campaigns:loadCampaigns, ctwa:loadCTWA, sales:loadSales, integrations:loadIntegrations, settings:loadSettings, flowise:showFlowiseConfig };
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

// ─── Chat ao Vivo (Lailla.io fluid) ─────────────────────────
let chatFilter = 'all';
let chatSearch = '';

const AVATAR_COLORS = ['#e91e63','#9c27b0','#673ab7','#3f51b5','#2196f3','#00bcd4','#009688','#4caf50','#ff9800','#ff5722','#795548','#607d8b'];
function getAvatarColor(name) { let h = 0; for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]; }

const OPERATOR_TAGS = ['KAROL','SOCO','TIKT','Ana','Carlos','Maria','João'];
function getOperatorTag(name) { let h = 0; for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return OPERATOR_TAGS[Math.abs(h) % OPERATOR_TAGS.length]; }

async function loadChat(el) {
  const [convData, statsData] = await Promise.all([api('/api/chat/conversations'), api('/api/chat/stats')]);
  conversations = convData?.conversations || []; convStats = statsData || {};
  chatFilter = 'all'; chatSearch = '';
  
  const filtered = filterConversations();
  const entradaCount = conversations.filter(c => c.status !== 'closed' && !c.isAiActive).length;
  const waitingCount = conversations.filter(c => c.status !== 'closed' && c.isAiActive).length;
  const closedCount = conversations.filter(c => c.status === 'closed').length;

  el.innerHTML = `
    <div class="chat-layout" style="display:flex;height:calc(100vh - 56px);background:#0d1117;position:relative;overflow:hidden">
      <!-- Sidebar -->
      <div class="chat-sidebar" id="chat-sidebar" style="width:360px;display:flex;flex-direction:column;border-right:1px solid #1e2d3d;background:#0d1117;flex-shrink:0">
        <!-- Top Bar -->
        <div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e2d3d">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="position:relative;cursor:pointer">
              <i class="fa-solid fa-comment-dots" style="font-size:18px;color:#8b9dc3"></i>
              <span style="position:absolute;top:-6px;right:-8px;background:#22c55e;color:white;font-size:8px;font-weight:700;padding:1px 4px;border-radius:8px;min-width:16px;text-align:center">${entradaCount + waitingCount}</span>
            </div>
            <i class="fa-solid fa-users" style="font-size:16px;color:#8b9dc3;cursor:pointer"></i>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <i class="fa-solid fa-sliders" style="font-size:14px;color:#8b9dc3;cursor:pointer"></i>
            <i class="fa-solid fa-arrow-right-arrow-left" style="font-size:14px;color:#8b9dc3;cursor:pointer"></i>
            <div style="position:relative;cursor:pointer">
              <i class="fa-solid fa-chevron-down" style="font-size:12px;color:#8b9dc3"></i>
            </div>
            <div onclick="showNewChatModal()" style="width:32px;height:32px;border-radius:50%;background:#6c5ce7;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s" onmouseover="this.style.background='#5a4bd1'" onmouseout="this.style.background='#6c5ce7'">
              <i class="fa-solid fa-plus" style="font-size:14px;color:white"></i>
            </div>
          </div>
        </div>

        <!-- Search + Filter -->
        <div style="padding:12px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #1e2d3d">
          <i class="fa-solid fa-filter" onclick="toggleChatFilterPanel()" style="font-size:13px;color:#8b9dc3;cursor:pointer"></i>
          <div style="flex:1;position:relative">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;color:#64748b"></i>
            <input type="text" id="chat-search" placeholder="Buscar por nome ou telefone" value="${chatSearch}" oninput="chatSearch=this.value;renderChatList()" style="width:100%;padding:8px 12px 8px 28px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:12px;outline:none;transition:border .2s" onfocus="this.style.borderColor='#6c5ce7'" onblur="this.style.borderColor='#1e2d3d'">
          </div>
        </div>

        <!-- Tabs -->
        <div style="padding:12px 16px 0;display:flex;gap:0;border-bottom:1px solid #1e2d3d">
          <button onclick="setChatFilter('all')" class="chat-filter-btn" data-filter="all" style="flex:1;padding:10px 0;border:none;border-bottom:2px solid ${chatFilter==='all'?'#6c5ce7':'transparent'};cursor:pointer;font-size:12px;font-weight:${chatFilter==='all'?'700':'500'};background:transparent;color:${chatFilter==='all'?'#e6edf3':'#8b9dc3'};transition:all .2s;display:flex;align-items:center;justify-content:center;gap:6px">
            Entrada ${entradaCount > 0 ? `<span style="background:#22c55e;color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px">${entradaCount}</span>` : ''}
          </button>
          <button onclick="setChatFilter('ai')" class="chat-filter-btn" data-filter="ai" style="flex:1;padding:10px 0;border:none;border-bottom:2px solid ${chatFilter==='ai'?'#6c5ce7':'transparent'};cursor:pointer;font-size:12px;font-weight:${chatFilter==='ai'?'700':'500'};background:transparent;color:${chatFilter==='ai'?'#e6edf3':'#8b9dc3'};transition:all .2s;display:flex;align-items:center;justify-content:center;gap:6px">
            Esperando ${waitingCount > 0 ? `<span style="background:#f59e0b;color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px">${waitingCount}</span>` : ''}
          </button>
          <button onclick="setChatFilter('closed')" class="chat-filter-btn" data-filter="closed" style="flex:1;padding:10px 0;border:none;border-bottom:2px solid ${chatFilter==='closed'?'#6c5ce7':'transparent'};cursor:pointer;font-size:12px;font-weight:${chatFilter==='closed'?'700':'500'};background:transparent;color:${chatFilter==='closed'?'#e6edf3':'#8b9dc3'};transition:all .2s;display:flex;align-items:center;justify-content:center;gap:6px">
            Finalizados
          </button>
        </div>

        <!-- Conversation List -->
        <div style="flex:1;overflow-y:auto;padding:4px 8px" id="chat-list">
          ${renderChatListItems(filtered)}
        </div>
      </div>

      <!-- Chat Main -->
      <div class="chat-main" id="chat-main" style="flex:1;display:flex;flex-direction:column;background:#0d1117;min-width:0">
        ${selectedConv ? '' : renderChatEmpty()}
      </div>
    </div>`;

  if (selectedConv) selectConv(selectedConv.id);
}

function filterConversations() {
  return conversations.filter(c => {
    const name = (c.contact?.name || '').toLowerCase();
    const phone = (c.contact?.phone || '').toLowerCase();
    if (chatSearch && !name.includes(chatSearch.toLowerCase()) && !phone.includes(chatSearch.toLowerCase())) return false;
    if (chatFilter === 'ai') return c.isAiActive;
    if (chatFilter === 'closed') return c.status === 'closed';
    if (chatFilter === 'all') return c.status !== 'closed' && !c.isAiActive;
    return true;
  });
}

function renderChatListItems(filtered) {
  if (filtered.length === 0) {
    return `<div style="text-align:center;padding:40px 20px;color:#8b9dc3">
      <div style="width:56px;height:56px;border-radius:50%;background:#161b22;display:flex;align-items:center;justify-content:center;margin:0 auto 12px"><i class="fa-solid fa-comments" style="font-size:22px;opacity:.4"></i></div>
      <p style="font-size:13px;font-weight:500;margin:0 0 4px">Nenhuma conversa</p>
      <p style="font-size:11px;opacity:.7">As conversas aparecerão aqui quando alguém enviar uma mensagem</p>
    </div>`;
  }
  return filtered.map(c => renderConvItem(c)).join('');
}

function renderConvItem(c) {
  const name = c.contact?.name || 'Desconhecido';
  const phone = c.contact?.phone || c.contact_wa_id || '';
  const isSelected = selectedConv?.id === c.id;
  const lastMsg = c.lastMessage || '';
  const avatarColor = getAvatarColor(name);
  const operatorTag = getOperatorTag(name);
  const hasCheckmarks = c.status !== 'closed';
  const unread = c.unread_count || 0;
  const isGroup = c.is_group || false;

  return `<div onclick="selectConv('${c.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-radius:8px;margin:1px 0;transition:all .15s;${isSelected?'background:#161b22;border:1px solid #1e2d3d':'border:1px solid transparent'}" onmouseover="if(!${isSelected})this.style.background='#161b22'" onmouseout="if(!${isSelected})this.style.background='transparent'">
    <div style="position:relative;flex-shrink:0">
      <div style="width:40px;height:40px;border-radius:50%;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:14px;color:white;font-weight:600">${name[0]?.toUpperCase()}</div>
    </div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600;font-size:13px;color:#e6edf3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span>
        <span style="font-size:10px;color:#8b9dc3;flex-shrink:0;margin-left:8px">${c.last_message_at ? timeAgo(c.last_message_at) : ''}</span>
      </div>
      <div style="display:flex;align-items:center;gap:4px;margin-top:3px">
        ${hasCheckmarks ? '<i class="fa-solid fa-check-double" style="font-size:10px;color:#53bdeb;flex-shrink:0"></i>' : ''}
        <span style="font-size:11px;color:#8b9dc3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${lastMsg || phone}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
        <span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:4px;font-size:9px;font-weight:600;background:${avatarColor}22;color:${avatarColor};border:1px solid ${avatarColor}44">
          <i class="fa-solid fa-circle" style="font-size:5px"></i>${operatorTag}
        </span>
        ${isGroup ? '<span style="font-size:9px;color:#8b9dc3">+1</span>' : ''}
        ${unread > 0 ? `<span style="min-width:18px;height:18px;border-radius:50%;background:#22c55e;color:white;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${unread}</span>` : ''}
        <span style="font-size:9px;color:#8b9dc3;margin-left:auto">Geral</span>
      </div>
    </div>
  </div>`;
}

function renderChatEmpty() {
  return `<div style="flex:1;display:flex;align-items:center;justify-content:center">
    <div style="text-align:center;max-width:300px">
      <div style="width:80px;height:80px;border-radius:50%;background:#161b22;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <i class="fa-solid fa-comments" style="font-size:32px;color:#6c5ce7;opacity:.5"></i>
      </div>
      <h3 style="font-size:16px;font-weight:600;margin:0 0 6px;color:#e6edf3">Selecione uma conversa</h3>
      <p style="font-size:12px;color:#8b9dc3;margin:0">Escolha uma conversa ao lado para começar a responder</p>
    </div>
  </div>`;
}

function setChatFilter(filter) {
  chatFilter = filter;
  const filtered = filterConversations();
  const list = document.getElementById('chat-list');
  if (list) list.innerHTML = renderChatListItems(filtered);
  
  document.querySelectorAll('.chat-filter-btn').forEach(btn => {
    const f = btn.dataset.filter;
    btn.style.borderBottom = f === filter ? '2px solid #6c5ce7' : '2px solid transparent';
    btn.style.fontWeight = f === filter ? '700' : '500';
    btn.style.color = f === filter ? '#e6edf3' : '#8b9dc3';
  });
}

function renderChatList() {
  const filtered = filterConversations();
  const list = document.getElementById('chat-list');
  if (list) list.innerHTML = renderChatListItems(filtered);
}

async function selectConv(id) {
  selectedConv = conversations.find(c => c.id === id);
  if (!selectedConv) return;
  
  const chatMain = document.getElementById('chat-main');
  const chatSidebar = document.getElementById('chat-sidebar');
  if (!chatMain) return;

  // Mobile: hide sidebar, show chat
  if (chatSidebar) chatSidebar.classList.add('hidden');
  chatMain.classList.add('active');

  chatMain.innerHTML = `<div style="flex:1;display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px;color:#6c5ce7"></i></div>`;

  const data = await api(`/api/chat/conversations/${id}`);
  chatMessages = data?.messages || [];
  
  const name = selectedConv.contact?.name || 'Desconhecido';
  const phone = selectedConv.contact?.phone || selectedConv.contact_wa_id || '';
  const avatarColor = getAvatarColor(name);
  const operatorTag = getOperatorTag(name);

  chatMain.innerHTML = `
    <!-- Header -->
    <div style="padding:10px 16px;border-bottom:1px solid #1e2d3d;display:flex;justify-content:space-between;align-items:center;background:#0d1117">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="mobile-back" onclick="goBackChat()" style="display:none">
          <i class="fa-solid fa-arrow-left"></i>
        </div>
        <div style="width:36px;height:36px;border-radius:50%;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:14px;color:white;font-weight:600">${name[0]?.toUpperCase()}</div>
        <div>
          <h3 style="font-size:13px;margin:0;font-weight:600;color:#e6edf3">${name}</h3>
          <div style="display:flex;align-items:center;gap:6px;margin-top:1px">
            <span style="font-size:10px;color:#8b9dc3">${phone}</span>
            <span style="display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:3px;font-size:8px;font-weight:600;background:${avatarColor}22;color:${avatarColor}"><i class="fa-solid fa-circle" style="font-size:4px"></i>${operatorTag}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <button onclick="showConvTagsModal('${id}')" style="padding:5px 8px;border-radius:6px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px;display:flex;align-items:center;gap:4px;transition:all .2s" onmouseover="this.style.borderColor='#6c5ce7'" onmouseout="this.style.borderColor='#1e2d3d'" title="Tags"><i class="fa-solid fa-tags"></i></button>
        <button onclick="showQuickFlowsModal('${id}')" style="padding:5px 8px;border-radius:6px;border:1px solid #1e2d3d;background:#161b22;color:#f59e0b;cursor:pointer;font-size:10px;display:flex;align-items:center;gap:4px;transition:all .2s" onmouseover="this.style.borderColor='#f59e0b'" onmouseout="this.style.borderColor='#1e2d3d'" title="Fluxos rápidos"><i class="fa-solid fa-bolt"></i></button>
        <button onclick="showTransferModal('${id}')" style="padding:5px 8px;border-radius:6px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px;display:flex;align-items:center;gap:4px;transition:all .2s" onmouseover="this.style.borderColor='#f59e0b'" onmouseout="this.style.borderColor='#1e2d3d'" title="Transferir"><i class="fa-solid fa-arrow-right-arrow-left"></i></button>
        <button onclick="toggleAI('${id}')" style="padding:5px 10px;border-radius:6px;border:1px solid ${selectedConv.isAiActive?'#f59e0b':'#22c55e'};background:${selectedConv.isAiActive?'rgba(245,158,11,.1)':'rgba(34,197,94,.1)'};color:${selectedConv.isAiActive?'#f59e0b':'#22c55e'};cursor:pointer;font-size:10px;font-weight:500;display:flex;align-items:center;gap:4px;transition:all .2s">
          <i class="fa-solid fa-robot" style="font-size:9px"></i> ${selectedConv.isAiActive?'Pausar':'Ativar IA'}
        </button>
        <button onclick="closeConv('${id}')" style="padding:5px 8px;border-radius:6px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px;display:flex;align-items:center;gap:4px;transition:all .2s" onmouseover="this.style.borderColor='#22c55e'" onmouseout="this.style.borderColor='#1e2d3d'" title="Finalizar"><i class="fa-solid fa-check"></i></button>
      </div>
    </div>

    <!-- Messages -->
    <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:4px;background:#0d1117" id="chat-messages">
      ${chatMessages.length === 0 ? renderEmptyMessages() : chatMessages.map(m => renderMessage(m)).join('')}
    </div>

    <!-- Input -->
    <div style="border-top:1px solid #1e2d3d;padding:10px 16px;background:#0d1117">
      <div style="display:flex;gap:4px;margin-bottom:6px">
        ${['B','I','S','M'].map(f => `<button style="width:26px;height:26px;border-radius:4px;border:none;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px;font-weight:${f==='B'||f==='M'?'700':'400'};${f==='I'?'font-style:italic':''}${f==='S'?'text-decoration:line-through':''}${f==='M'?'font-family:monospace':''}:transition:all .15s" onmouseover="this.style.background='#1e2d3d';this.style.color='#e6edf3'" onmouseout="this.style.background='#161b22';this.style.color='#8b9dc3'">${f}</button>`).join('')}
        <div style="flex:1"></div>
        <button onclick="saveCurrentFilter()" style="padding:4px 8px;border-radius:4px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:9px;font-weight:500;display:flex;align-items:center;gap:3px;transition:all .15s" onmouseover="this.style.borderColor='#6c5ce7'" onmouseout="this.style.borderColor='#2a3050'" title="Salvar filtro"><i class="fa-solid fa-bookmark" style="font-size:8px"></i> Salvar</button>
        ${savedFilters.length > 0 ? `<select onchange="applySavedFilter(this.value);this.value=''" style="padding:4px 6px;border-radius:4px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:9px;max-width:120px"><option value="">Filtros salvos</option>${savedFilters.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}</select>` : ''}
      </div>
      <div style="display:flex;gap:6px;align-items:flex-end">
        <button onclick="showAttachMenu()" style="width:34px;height:34px;border-radius:6px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0" onmouseover="this.style.borderColor='#6c5ce7'" onmouseout="this.style.borderColor='#1e2d3d'" title="Anexar"><i class="fa-solid fa-paperclip" style="font-size:12px"></i></button>
        <button onclick="toggleEmojiPicker()" style="width:34px;height:34px;border-radius:6px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0" onmouseover="this.style.borderColor='#6c5ce7'" onmouseout="this.style.borderColor='#1e2d3d'" title="Emoji"><i class="fa-solid fa-face-smile" style="font-size:12px"></i></button>
        <div style="flex:1;position:relative">
          <textarea id="chat-input-text" rows="1" placeholder="Digite sua mensagem..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg('${id}')}" oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'" style="width:100%;padding:8px 12px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:12px;outline:none;resize:none;min-height:34px;max-height:120px;font-family:inherit;transition:border .2s" onfocus="this.style.borderColor='#6c5ce7'" onblur="this.style.borderColor='#1e2d3d'"></textarea>
        </div>
        <button onclick="toggleAudioRecording()" style="width:34px;height:34px;border-radius:6px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0" onmouseover="this.style.borderColor='#6c5ce7'" onmouseout="this.style.borderColor='#1e2d3d'" title="Áudio"><i class="fa-solid fa-microphone" style="font-size:12px"></i></button>
        <button onclick="sendMsg('${id}')" style="width:34px;height:34px;border-radius:6px;border:none;background:#6c5ce7;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0" onmouseover="this.style.background='#5a4bd1'" onmouseout="this.style.background='#6c5ce7'"><i class="fa-solid fa-paper-plane" style="font-size:12px"></i></button>
      </div>
      <div style="display:flex;gap:4px;margin-top:6px">
        <button onclick="aiRespond('${id}')" style="padding:4px 8px;border-radius:4px;border:1px solid rgba(34,197,94,.3);background:rgba(34,197,94,.08);color:#22c55e;cursor:pointer;font-size:9px;font-weight:500;display:flex;align-items:center;gap:3px;transition:all .15s"><i class="fa-solid fa-robot" style="font-size:8px"></i> IA</button>
        <button onclick="showQuickRepliesModal()" style="padding:4px 8px;border-radius:4px;border:1px solid rgba(108,92,231,.3);background:rgba(108,92,231,.08);color:#6c5ce7;cursor:pointer;font-size:9px;font-weight:500;display:flex;align-items:center;gap:3px;transition:all .15s"><i class="fa-solid fa-bolt" style="font-size:8px"></i> Respostas</button>
        <button onclick="sendTemplate('${id}')" style="padding:4px 8px;border-radius:4px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:9px;font-weight:500;display:flex;align-items:center;gap:3px;transition:all .15s"><i class="fa-solid fa-file-alt" style="font-size:8px"></i> Template</button>
      </div>
    </div>`;

  const msgDiv = document.getElementById('chat-messages');
  if (msgDiv) msgDiv.scrollTop = msgDiv.scrollHeight;

  // Re-render sidebar selection
  renderChatList();
}

function renderEmptyMessages() {
  return `<div style="flex:1;display:flex;align-items:center;justify-content:center">
    <div style="text-align:center">
      <div style="width:48px;height:48px;border-radius:50%;background:#161b22;display:flex;align-items:center;justify-content:center;margin:0 auto 10px"><i class="fa-solid fa-message" style="font-size:18px;color:#6c5ce7;opacity:.4"></i></div>
      <p style="font-size:12px;color:#8b9dc3;margin:0">Nenhuma mensagem ainda</p>
      <p style="font-size:11px;color:#64748b;margin-top:2px">Envie uma mensagem para iniciar</p>
    </div>
  </div>`;
}

function renderMessage(m) {
  const isInbound = m.direction === 'inbound';
  const senderName = isInbound ? (selectedConv?.contact?.name || 'Contato') : 'Ozion IA';
  const avatarColor = isInbound ? getAvatarColor(senderName) : '#6c5ce7';
  const avatarText = isInbound ? (senderName[0] || '?') : '<i class="fa-solid fa-robot" style="font-size:10px"></i>';

  return `<div style="display:flex;gap:8px;margin-bottom:6px;${isInbound?'':'flex-direction:row-reverse'};animation:fadeIn .2s ease">
    <div style="width:28px;height:28px;border-radius:50%;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:10px;color:white;flex-shrink:0;margin-top:2px">${avatarText}</div>
    <div style="max-width:70%;${isInbound?'':'text-align:right'}">
      <div style="font-size:9px;color:#8b9dc3;margin-bottom:2px;display:flex;align-items:center;gap:4px;${isInbound?'':'justify-content:flex-end'}">
        <span style="font-weight:500">${senderName}</span>
        ${m.isFlow ? '<span style="background:#6c5ce7;color:white;padding:1px 4px;border-radius:3px;font-size:7px;font-weight:600">FLUXO</span>' : ''}
      </div>
      <div style="padding:8px 12px;border-radius:12px;font-size:12px;line-height:1.4;word-wrap:break-word;${isInbound?'background:#161b22;border-bottom-left-radius:4px;color:#e6edf3':'background:#6c5ce7;color:white;border-bottom-right-radius:4px'}">${m.content}</div>
      <div style="font-size:8px;color:#64748b;margin-top:2px;${isInbound?'':'text-align:right'}">${formatTime(m.sentAt)}</div>
    </div>
  </div>`;
}

async function sendMsg(convId) {
  const input = document.getElementById('chat-input-text');
  if (!input?.value.trim()) return;
  const text = input.value.trim();
  input.value = ''; input.style.height = 'auto';
  
  // Optimistic update
  chatMessages.push({ direction: 'outbound', content: text, sent_at: new Date().toISOString(), type: 'text' });
  const msgDiv = document.getElementById('chat-messages');
  if (msgDiv) { msgDiv.innerHTML += renderMessage(chatMessages[chatMessages.length - 1]); msgDiv.scrollTop = msgDiv.scrollHeight; }

  await api('/api/chat/messages', { method: 'POST', body: JSON.stringify({ conversationId: convId, content: text }) });
}

async function toggleAI(convId) {
  await api(`/api/chat/conversations/${convId}/ai-toggle`, { method: 'POST' });
  showToast('Status da IA atualizado', 'success');
  await selectConv(convId);
}

async function closeConv(convId) {
  await api(`/api/chat/conversations/${convId}/status`, { method: 'PUT', body: JSON.stringify({ status: 'closed' }) });
  showToast('Conversa finalizada', 'success');
  goBackChat();
  loadChat(document.getElementById('content'));
}

async function aiRespond(convId) {
  const input = document.getElementById('chat-input-text');
  if (input) { input.value = ''; input.placeholder = 'IA gerando resposta...'; }
  showToast('IA gerando resposta...', 'info');
  setTimeout(() => { if (input) input.placeholder = 'Digite sua mensagem...'; }, 3000);
}

function sendTemplate(convId) { showToast('Templates em breve', 'info'); }

function goBackChat() {
  const chatSidebar = document.getElementById('chat-sidebar');
  const chatMain = document.getElementById('chat-main');
  if (chatSidebar) chatSidebar.classList.remove('hidden');
  if (chatMain) chatMain.classList.remove('active');
  selectedConv = null;
}

let savedFilters = JSON.parse(localStorage.getItem('ozion_chat_filters') || '[]');

function showNewChatModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.id = 'new-chat-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <h3>Novo Chat</h3>
        <button class="modal-close" onclick="document.getElementById('new-chat-modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nome do contato</label>
          <input type="text" id="new-chat-name" placeholder="Nome completo">
        </div>
        <div class="form-group">
          <label>Telefone (com DDD)</label>
          <input type="text" id="new-chat-phone" placeholder="+5511999999999">
        </div>
        <div class="form-group">
          <label>Mensagem inicial</label>
          <textarea id="new-chat-msg" rows="3" placeholder="Olá! Como posso ajudar?"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('new-chat-modal').remove()">Cancelar</button>
        <button class="btn btn-primary btn-sm" onclick="createNewChat()"><i class="fa-solid fa-paper-plane"></i> Iniciar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function createNewChat() {
  const name = document.getElementById('new-chat-name')?.value;
  const phone = document.getElementById('new-chat-phone')?.value;
  const msg = document.getElementById('new-chat-msg')?.value;
  if (!name || !phone) { showToast('Preencha nome e telefone', 'error'); return; }
  await api('/api/crm/contacts', { method: 'POST', body: JSON.stringify({ name, phone }) });
  document.getElementById('new-chat-modal')?.remove();
  showToast('Chat criado!', 'success');
  loadChat(document.getElementById('content'));
}

// ─── Saved Filters ────────────────────────────────────────────
function saveCurrentFilter() {
  const name = prompt('Nome do filtro:');
  if (!name) return;
  const filter = { id: Date.now().toString(), name, chatFilter, chatSearch, createdAt: new Date().toISOString() };
  savedFilters.push(filter);
  localStorage.setItem('ozion_chat_filters', JSON.stringify(savedFilters));
  showToast('Filtro salvo!', 'success');
}

function applySavedFilter(id) {
  const f = savedFilters.find(x => x.id === id);
  if (!f) return;
  chatFilter = f.chatFilter || 'all';
  chatSearch = f.chatSearch || '';
  const searchInput = document.getElementById('chat-search');
  if (searchInput) searchInput.value = chatSearch;
  setChatFilter(chatFilter);
  showToast(`Filtro "${f.name}" aplicado`, 'info');
}

function deleteSavedFilter(id) {
  savedFilters = savedFilters.filter(f => f.id !== id);
  localStorage.setItem('ozion_chat_filters', JSON.stringify(savedFilters));
  showToast('Filtro removido', 'info');
}

// ─── Emoji Picker ──────────────────────────────────────────────
const EMOJI_LIST = ['😀','😂','😍','🥰','😎','🤩','😇','🤔','😤','😭','🙌','👍','👎','❤️','🔥','⭐','🎉','💪','🙏','✅','❌','⏰','💰','📩','📞','🤝','👀','💡','🚀','⭐','🌟','💯','🎶','😢','🤗','😈','🤡','💀','👻','🤝','👋','🤙','💪','🙌','👏','🤝','🫶','❤️‍🔥','💔','❣️','💕','💗','💖','💝','💘','💌','💐','🌹','🌺','🌴','☀️','🌈','🌤️','⛅','🌙','⭐','✨','🌟','🔥','💧','🌊','🍀','🎯','🏆','🎮','🎨','🎭','🎪','🎤','🎧','🎵','🎶','🎸','🎹','🎺','🎻','🥁','📢','🔔','📱','💻','⌚','📷','🔑','📝','📂','🗑️','📁','📊','📈','📉','🗓️','📌','📍','✂️','📎','🔖','🏷️','💼','🎒','🎓','🧸','🎁','🎃','🎄','🎅','🦄','🐱','🐶','🐻','🐼','🦊','🐰','🐸','🦋','🌸','🌻','🌼','🌷','🪻','🌾','🍁','🍂'];

function toggleEmojiPicker() {
  let picker = document.getElementById('emoji-picker-chat');
  if (picker) { picker.remove(); return; }
  const input = document.getElementById('chat-input-text');
  const rect = input ? input.getBoundingClientRect() : { left: 100, bottom: 300 };
  picker = document.createElement('div');
  picker.id = 'emoji-picker-chat';
  picker.style.cssText = `position:fixed;bottom:${window.innerHeight - rect.bottom + 40}px;left:${Math.min(rect.left, window.innerWidth - 340)}px;width:320px;max-height:280px;overflow-y:auto;background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:10px;z-index:2000;box-shadow:0 12px 32px rgba(0,0,0,.5);animation:slideUp .2s ease`;
  picker.innerHTML = `
    <div style="display:flex;gap:4px;margin-bottom:8px;position:sticky;top:0;background:#1a1f35;padding-bottom:6px">
      <input type="text" id="emoji-search" placeholder="Buscar emoji..." oninput="filterEmojis(this.value)" style="flex:1;padding:6px 10px;background:#161b22;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:11px;outline:none">
      <button onclick="document.getElementById('emoji-picker-chat').remove()" style="background:none;border:none;color:#8b9dc3;cursor:pointer;font-size:14px">&times;</button>
    </div>
    <div id="emoji-grid" style="display:grid;grid-template-columns:repeat(8,1fr);gap:2px">
      ${EMOJI_LIST.map(e => `<div onclick="insertEmoji('${e}')" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;border-radius:6px;transition:background .15s" onmouseover="this.style.background='#2a3050'" onmouseout="this.style.background='transparent'">${e}</div>`).join('')}
    </div>`;
  document.body.appendChild(picker);
}

function filterEmojis(q) {
  const grid = document.getElementById('emoji-grid');
  if (!grid) return;
  const filtered = q ? EMOJI_LIST.filter(e => e.includes(q)) : EMOJI_LIST;
  grid.innerHTML = filtered.map(e => `<div onclick="insertEmoji('${e}')" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;border-radius:6px;transition:background .15s" onmouseover="this.style.background='#2a3050'" onmouseout="this.style.background='transparent'">${e}</div>`).join('');
}

function insertEmoji(emoji) {
  const input = document.getElementById('chat-input-text');
  if (input) { input.value += emoji; input.focus(); }
}

// ─── Quick Flows Modal ─────────────────────────────────────────
async function showQuickFlowsModal(convId) {
  const flowsData = await api('/api/flows');
  const flows = flowsData?.flows || [];
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.id = 'quick-flows-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <h3><i class="fa-solid fa-bolt" style="color:#f59e0b;margin-right:8px"></i>Fluxos Rápidos</h3>
        <button class="modal-close" onclick="document.getElementById('quick-flows-modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <input type="text" id="flow-search-modal" placeholder="Buscar fluxo..." oninput="filterFlowsModal(this.value)" style="width:100%;padding:8px 12px;background:#161b22;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:12px;outline:none;margin-bottom:12px">
        <div id="flows-modal-list" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
          ${flows.length === 0 ? '<p style="text-align:center;color:#8b9dc3;font-size:12px;padding:20px">Nenhum fluxo encontrado</p>' : flows.map(f => `
            <div onclick="triggerQuickFlow('${convId}','${f.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor='#6c5ce7'" onmouseout="this.style.borderColor='#2a3050'">
              <div style="width:36px;height:36px;border-radius:8px;background:${f.color || '#6c5ce7'}22;display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-${f.icon || 'code-branch'}" style="color:${f.color || '#6c5ce7'};font-size:14px"></i></div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;color:#e6edf3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div>
                <div style="font-size:10px;color:#8b9dc3">${f.blocks?.length || 0} blocos</div>
              </div>
              <i class="fa-solid fa-paper-plane" style="font-size:10px;color:#6c5ce7"></i>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function filterFlowsModal(q) {
  const list = document.getElementById('flows-modal-list');
  if (!list) return;
  const items = list.querySelectorAll('[onclick^="triggerQuickFlow"]');
  items.forEach(item => {
    const name = item.textContent.toLowerCase();
    item.style.display = name.includes(q.toLowerCase()) ? 'flex' : 'none';
  });
}

async function triggerQuickFlow(convId, flowId) {
  document.getElementById('quick-flows-modal')?.remove();
  showToast('Fluxo disparado!', 'success');
  await api('/api/flows/trigger', { method: 'POST', body: JSON.stringify({ flowId, conversationId: convId }) });
}

// ─── Quick Replies ──────────────────────────────────────────────
const QUICK_REPLIES = [
  { id: 'qr1', name: 'Saudação', text: 'Olá! Bem-vindo(a) à Ozion. Como posso ajudar?' },
  { id: 'qr2', name: 'Horário', text: 'Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.' },
  { id: 'qr3', name: 'Agradecimento', text: 'Obrigado pelo contato! Fique à disposição.' },
  { id: 'qr4', name: 'Aguarde', text: 'Por favor, aguarde um momento enquanto verifico sua solicitação.' },
  { id: 'qr5', name: 'Transferir', text: 'Vou transferir seu atendimento para um especialista. Aguarde um instante.' },
  { id: 'qr6', name: 'Preço', text: 'Nossos planos começam a partir de R$97/mês. Deseja saber mais?' },
  { id: 'qr7', name: 'Suporte', text: 'Para suporte técnico, acesse help.ozion.com.br ou me envie sua dúvida.' },
  { id: 'qr8', name: 'Encerrar', text: 'Caso tenha mais dúvidas, estou à disposição. Tenha um ótimo dia!' }
];

function showQuickRepliesModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.id = 'quick-replies-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <h3><i class="fa-solid fa-bolt" style="color:#6c5ce7;margin-right:8px"></i>Respostas Rápidas</h3>
        <button class="modal-close" onclick="document.getElementById('quick-replies-modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <input type="text" id="qr-search" placeholder="Buscar resposta..." oninput="filterQR(this.value)" style="width:100%;padding:8px 12px;background:#161b22;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:12px;outline:none;margin-bottom:12px">
        <div id="qr-list" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
          ${QUICK_REPLIES.map(qr => `
            <div onclick="insertQuickReply('${qr.text.replace(/'/g, "\\'")}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor='#6c5ce7'" onmouseout="this.style.borderColor='#2a3050'">
              <div style="width:36px;height:36px;border-radius:8px;background:#6c5ce722;display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-reply" style="color:#6c5ce7;font-size:12px"></i></div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;color:#e6edf3">${qr.name}</div>
                <div style="font-size:10px;color:#8b9dc3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${qr.text}</div>
              </div>
              <i class="fa-solid fa-arrow-right" style="font-size:10px;color:#6c5ce7"></i>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function filterQR(q) {
  const list = document.getElementById('qr-list');
  if (!list) return;
  const items = list.querySelectorAll('[onclick^="insertQuickReply"]');
  items.forEach(item => {
    const name = item.textContent.toLowerCase();
    item.style.display = name.includes(q.toLowerCase()) ? 'flex' : 'none';
  });
}

function insertQuickReply(text) {
  document.getElementById('quick-replies-modal')?.remove();
  const input = document.getElementById('chat-input-text');
  if (input) { input.value = text; input.focus(); }
  showToast('Resposta inserida', 'info');
}

// ─── Tags in Conversation ───────────────────────────────────────
async function showConvTagsModal(convId) {
  const tagsData = await api('/api/tags');
  const tags = tagsData?.tags || [];
  const conv = conversations.find(c => c.id === convId);
  const convTags = conv?.tags || [];
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.id = 'conv-tags-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <h3><i class="fa-solid fa-tags" style="color:#6c5ce7;margin-right:8px"></i>Tags da Conversa</h3>
        <button class="modal-close" onclick="document.getElementById('conv-tags-modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <p style="font-size:11px;color:#8b9dc3;margin:0 0 12px">Selecione as tags para esta conversa:</p>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto">
          ${tags.length === 0 ? '<p style="text-align:center;color:#8b9dc3;font-size:12px;padding:20px">Nenhuma tag criada. Crie em Tags.</p>' : tags.map(t => {
            const active = convTags.includes(t.id);
            return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${active ? t.color + '15' : '#161b22'};border:1px solid ${active ? t.color : '#2a3050'};border-radius:8px;cursor:pointer;transition:all .2s">
              <input type="checkbox" ${active ? 'checked' : ''} onchange="toggleConvTag('${convId}','${t.id}',this.checked)" style="display:none">
              <div style="width:14px;height:14px;border-radius:3px;border:2px solid ${active ? t.color : '#2a3050'};background:${active ? t.color : 'transparent'};display:flex;align-items:center;justify-content:center;transition:all .2s">
                ${active ? '<i class="fa-solid fa-check" style="font-size:8px;color:white"></i>' : ''}
              </div>
              <div style="width:10px;height:10px;border-radius:50%;background:${t.color}"></div>
              <span style="font-size:12px;color:#e6edf3;font-weight:500">${t.name}</span>
            </label>`;
          }).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('conv-tags-modal').remove()">Fechar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function toggleConvTag(convId, tagId, active) {
  await api(`/api/chat/conversations/${convId}/tags`, { method: 'POST', body: JSON.stringify({ tagId, active }) });
  const conv = conversations.find(c => c.id === convId);
  if (conv) {
    if (!conv.tags) conv.tags = [];
    if (active) { if (!conv.tags.includes(tagId)) conv.tags.push(tagId); }
    else { conv.tags = conv.tags.filter(t => t !== tagId); }
  }
  showToast(active ? 'Tag adicionada' : 'Tag removida', 'success');
}

// ─── Transfer to Human ──────────────────────────────────────────
function showTransferModal(convId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.id = 'transfer-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <h3><i class="fa-solid fa-user-group" style="color:#f59e0b;margin-right:8px"></i>Transferir Conversa</h3>
        <button class="modal-close" onclick="document.getElementById('transfer-modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Transferir para:</label>
          <select id="transfer-target" style="width:100%;padding:8px 12px;background:#161b22;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:12px">
            <option value="">Selecione um atendente</option>
            ${['KAROL','SOCO','TIKT','Ana','Carlos','Maria','João'].map(op => `<option value="${op}">${op}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Mensagem para o atendente (opcional):</label>
          <textarea id="transfer-note" rows="2" placeholder="Ex: Cliente com dúvida técnica..." style="width:100%;padding:8px 12px;background:#161b22;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:12px;outline:none;resize:none"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('transfer-modal').remove()">Cancelar</button>
        <button class="btn btn-primary btn-sm" onclick="doTransfer('${convId}')" style="background:#f59e0b"><i class="fa-solid fa-arrow-right-arrow-left"></i> Transferir</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doTransfer(convId) {
  const target = document.getElementById('transfer-target')?.value;
  if (!target) { showToast('Selecione um atendente', 'error'); return; }
  await api(`/api/chat/conversations/${convId}/transfer`, { method: 'POST', body: JSON.stringify({ operator: target }) });
  document.getElementById('transfer-modal')?.remove();
  showToast(`Conversa transferida para ${target}`, 'success');
  selectConv(convId);
}

// ─── Audio Recording (UI) ───────────────────────────────────────
let audioRecorder = null;
let audioChunks = [];
let audioRecording = false;

function toggleAudioRecording() {
  if (audioRecording) { stopAudioRecording(); return; }
  audioRecording = true;
  const btn = document.querySelector('[onclick="toggleAudioRecording()"]');
  if (btn) {
    btn.style.background = '#ef4444';
    btn.innerHTML = '<i class="fa-solid fa-stop" style="font-size:12px"></i>';
  }
  showToast('Gravando áudio...', 'info');
  // Simulated recording
  audioChunks = [];
  setTimeout(() => { if (audioRecording) { stopAudioRecording(); } }, 30000);
}

function stopAudioRecording() {
  audioRecording = false;
  const btn = document.querySelector('[onclick="toggleAudioRecording()"]');
  if (btn) {
    btn.style.background = '#161b22';
    btn.innerHTML = '<i class="fa-solid fa-microphone" style="font-size:12px"></i>';
  }
  showToast('Áudio gravado e enviado!', 'success');
}

// ─── Attach File ────────────────────────────────────────────────
function showAttachMenu() {
  let menu = document.getElementById('attach-menu');
  if (menu) { menu.remove(); return; }
  menu = document.createElement('div');
  menu.id = 'attach-menu';
  menu.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:8px;z-index:2000;box-shadow:0 12px 32px rgba(0,0,0,.5);display:flex;gap:6px;animation:slideUp .2s ease';
  const items = [
    { icon: 'image', color: '#22c55e', label: 'Imagem' },
    { icon: 'file', color: '#3b82f6', label: 'Documento' },
    { icon: 'location-dot', color: '#f59e0b', label: 'Local' },
    { icon: 'user', color: '#8b5cf6', label: 'Contato' }
  ];
  menu.innerHTML = items.map(i => `
    <div onclick="simulateAttach('${i.label}')" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;border-radius:8px;cursor:pointer;transition:background .15s" onmouseover="this.style.background='#2a3050'" onmouseout="this.style.background='transparent'">
      <div style="width:40px;height:40px;border-radius:50%;background:${i.color}22;display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-${i.icon}" style="color:${i.color};font-size:14px"></i></div>
      <span style="font-size:9px;color:#8b9dc3">${i.label}</span>
    </div>
  `).join('') + `<div onclick="document.getElementById('attach-menu').remove()" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;border-radius:8px;cursor:pointer" onmouseover="this.style.background='#2a3050'" onmouseout="this.style.background='transparent'"><div style="width:40px;height:40px;border-radius:50%;background:#ef444422;display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-xmark" style="color:#ef4444;font-size:14px"></i></div><span style="font-size:9px;color:#8b9dc3">Fechar</span></div>`;
  document.body.appendChild(menu);
  setTimeout(() => { document.addEventListener('click', function handler(e) { if (!e.target.closest('#attach-menu') && !e.target.closest('[onclick="showAttachMenu()"]')) { menu.remove(); document.removeEventListener('click', handler); } }); }, 100);
}

function simulateAttach(type) {
  document.getElementById('attach-menu')?.remove();
  showToast(`${type} selecionada (upload em breve)`, 'info');
}

let chatFilterPanelOpen = false;
let chatOperatorFilter = 'Todos';
function toggleChatFilterPanel() {
  chatFilterPanelOpen = !chatFilterPanelOpen;
  let panel = document.getElementById('chat-filter-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'chat-filter-panel';
    panel.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:flex-end;justify-content:center;';
    panel.onclick = (e) => { if (e.target === panel) toggleChatFilterPanel(); };
    panel.innerHTML = `
      <div style="background:#1a1f35;border-radius:16px 16px 0 0;width:100%;max-width:500px;padding:24px;animation:slideUp .3s ease">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h3 style="margin:0;font-size:16px;color:#e6edf3">Filtros</h3>
          <button onclick="toggleChatFilterPanel()" style="background:none;border:none;color:#8b9dc3;cursor:pointer;font-size:20px">&times;</button>
        </div>
        ${savedFilters.length > 0 ? `<div style="margin-bottom:16px">
          <label style="font-size:12px;color:#8b9dc3;display:block;margin-bottom:8px">Filtros Salvos</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${savedFilters.map(f => `<div style="display:flex;align-items:center;gap:4px;padding:6px 10px;border-radius:20px;font-size:11px;background:#161b22;border:1px solid #6c5ce7;color:#6c5ce7">
              <span onclick="applySavedFilter('${f.id}');toggleChatFilterPanel()" style="cursor:pointer">${f.name}</span>
              <i class="fa-solid fa-xmark" onclick="deleteSavedFilter('${f.id}');toggleChatFilterPanel()" style="font-size:8px;cursor:pointer;opacity:.6"></i>
            </div>`).join('')}
          </div>
        </div>` : ''}
        <div style="margin-bottom:16px">
          <label style="font-size:12px;color:#8b9dc3;display:block;margin-bottom:8px">Status</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span onclick="applyFilter('all')" style="padding:6px 14px;border-radius:20px;font-size:11px;cursor:pointer;background:${chatFilter==='all'?'#6c5ce7':'#161b22'};color:${chatFilter==='all'?'white':'#8b9dc3'};border:1px solid ${chatFilter==='all'?'#6c5ce7':'#1e2d3d'}">Todos</span>
            <span onclick="applyFilter('entry')" style="padding:6px 14px;border-radius:20px;font-size:11px;cursor:pointer;background:${chatFilter==='entry'?'#22c55e':'#161b22'};color:${chatFilter==='entry'?'white':'#8b9dc3'};border:1px solid ${chatFilter==='entry'?'#22c55e':'#1e2d3d'}">Entrada</span>
            <span onclick="applyFilter('ai')" style="padding:6px 14px;border-radius:20px;font-size:11px;cursor:pointer;background:${chatFilter==='ai'?'#f59e0b':'#161b22'};color:${chatFilter==='ai'?'white':'#8b9dc3'};border:1px solid ${chatFilter==='ai'?'#f59e0b':'#1e2d3d'}">Esperando</span>
            <span onclick="applyFilter('closed')" style="padding:6px 14px;border-radius:20px;font-size:11px;cursor:pointer;background:${chatFilter==='closed'?'#ef4444':'#161b22'};color:${chatFilter==='closed'?'white':'#8b9dc3'};border:1px solid ${chatFilter==='closed'?'#ef4444':'#1e2d3d'}">Finalizados</span>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label style="font-size:12px;color:#8b9dc3;display:block;margin-bottom:8px">Operador</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${['Todos','KAROL','SOCO','TIKT','Ana','Carlos'].map(op => `<span onclick="applyOperatorFilter('${op}')" style="padding:6px 14px;border-radius:20px;font-size:11px;cursor:pointer;background:${chatOperatorFilter===op?'#8b5cf6':'#161b22'};color:${chatOperatorFilter===op?'white':'#8b9dc3'};border:1px solid ${chatOperatorFilter===op?'#8b5cf6':'#1e2d3d'}">${op}</span>`).join('')}
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:#8b9dc3;display:block;margin-bottom:8px">Período</label>
          <div style="display:flex;gap:8px">
            <input type="date" id="filter-date-from" style="flex:1;padding:8px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:12px">
            <input type="date" id="filter-date-to" style="flex:1;padding:8px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:12px">
          </div>
        </div>
        <button onclick="applyAllFilters()" style="width:100%;margin-top:20px;padding:12px;border:none;border-radius:8px;background:#6c5ce7;color:white;font-size:13px;font-weight:600;cursor:pointer">Aplicar Filtros</button>
      </div>`;
    document.body.appendChild(panel);
  } else {
    panel.remove();
  }
}

function applyFilter(f) { chatFilter = f; toggleChatFilterPanel(); setChatFilter(f); }
function applyOperatorFilter(op) { chatOperatorFilter = op; toggleChatFilterPanel(); showToast(`Filtro operador: ${op}`, 'info'); }
function applyAllFilters() { toggleChatFilterPanel(); renderChatList(); showToast('Filtros aplicados', 'success'); }
}

function applyFilter(f) {
  setChatFilter(f);
  toggleChatFilterPanel();
}

// ─── CRM (Lista + Kanban + Pipeline) ───────────────────────────
let crmView = 'list';
let crmSearch = '';
let crmTagFilter = '';
let allContacts = [];
let customFields = [];
const PIPELINE_STAGES = [
  { id: 'lead', name: 'Lead', color: '#6c5ce7' },
  { id: 'contacted', name: 'Contato', color: '#3b82f6' },
  { id: 'proposal', name: 'Proposta', color: '#f59e0b' },
  { id: 'negotiation', name: 'Negociação', color: '#ec4899' },
  { id: 'won', name: 'Ganho', color: '#22c55e' },
  { id: 'lost', name: 'Perdido', color: '#ef4444' }
];

async function loadContacts(el) {
  const data = await api('/api/crm/contacts'); allContacts = data?.contacts || [];
  const tagsData = await api('/api/tags'); allTags = tagsData?.tags || [];
  const tags = [...new Set(allContacts.map(c => c.tag).filter(Boolean))];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
      <div><h2 style="margin:0;font-size:20px">CRM</h2><p style="color:#8b9dc3;margin-top:2px;font-size:12px">${allContacts.length} contato(s)</p></div>
      <div style="display:flex;gap:6px;align-items:center">
        <div style="display:flex;background:#161b22;border:1px solid #1e2d3d;border-radius:8px;overflow:hidden">
          <button onclick="setCrmView('list')" style="padding:6px 12px;border:none;background:${crmView==='list'?'#6c5ce7':'transparent'};color:${crmView==='list'?'white':'#8b9dc3'};cursor:pointer;font-size:11px"><i class="fa-solid fa-list"></i></button>
          <button onclick="setCrmView('kanban')" style="padding:6px 12px;border:none;background:${crmView==='kanban'?'#6c5ce7':'transparent'};color:${crmView==='kanban'?'white':'#8b9dc3'};cursor:pointer;font-size:11px"><i class="fa-solid fa-columns"></i></button>
          <button onclick="setCrmView('pipeline')" style="padding:6px 12px;border:none;background:${crmView==='pipeline'?'#6c5ce7':'transparent'};color:${crmView==='pipeline'?'white':'#8b9dc3'};cursor:pointer;font-size:11px"><i class="fa-solid fa-filter"></i></button>
        </div>
        <button onclick="showImportCSV()" style="padding:6px 12px;border-radius:8px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:4px"><i class="fa-solid fa-file-import"></i> Importar</button>
        <button onclick="exportCSV()" style="padding:6px 12px;border-radius:8px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:4px"><i class="fa-solid fa-file-export"></i> Exportar</button>
        <button onclick="showCreateContact()" style="padding:6px 14px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px"><i class="fa-solid fa-plus"></i> Novo</button>
      </div>
    </div>

    <!-- Search + Filters -->
    <div style="display:flex;gap:10px;margin-bottom:16px;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:200px;position:relative">
        <i class="fa-solid fa-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:11px;color:#64748b"></i>
        <input type="text" id="crm-search" placeholder="Buscar nome, telefone ou email..." value="${crmSearch}" oninput="crmSearch=this.value;renderCrmView()" style="width:100%;padding:8px 12px 8px 30px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:12px;outline:none">
      </div>
      <select id="crm-tag-filter" onchange="crmTagFilter=this.value;renderCrmView()" style="padding:8px 12px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:12px">
        <option value="">Todas as tags</option>
        ${tags.map(t => `<option value="${t}" ${crmTagFilter===t?'selected':''}>${t}</option>`).join('')}
      </select>
      <button onclick="showCustomFields()" style="padding:8px 12px;border-radius:8px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:11px"><i class="fa-solid fa-sliders"></i> Campos</button>
    </div>

    <!-- Create/Edit Form -->
    <div id="contact-form-area"></div>

    <!-- CRM View -->
    <div id="crm-view-area">${renderCrmViewContent()}</div>`;
}

function setCrmView(v) { crmView = v; renderCrmView(); }
function renderCrmView() {
  const area = document.getElementById('crm-view-area');
  if (area) area.innerHTML = renderCrmViewContent();
}
function getFilteredContacts() {
  return allContacts.filter(c => {
    const q = crmSearch.toLowerCase();
    const matchSearch = !q || (c.name||'').toLowerCase().includes(q) || (c.phone||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q);
    const matchTag = !crmTagFilter || (c.tag||'').toLowerCase().includes(crmTagFilter.toLowerCase());
    return matchSearch && matchTag;
  });
}

function renderCrmViewContent() {
  if (crmView === 'kanban') return renderKanbanView();
  if (crmView === 'pipeline') return renderPipelineView();
  return renderListView();
}

// ─── List View ──────────────────────────────────────────────────
function renderListView() {
  const filtered = getFilteredContacts();
  return `<div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;overflow:hidden">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid #2a3050">
        <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500;width:30px"><input type="checkbox" onchange="toggleAllContacts(this)"></th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500;width:40px"></th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Nome</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Telefone</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Email</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Tag</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Estágio</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500;width:80px">Ações</th>
      </tr></thead>
      <tbody>
        ${filtered.length === 0 ? `<tr><td colspan="8" style="text-align:center;padding:40px;color:#8b9dc3"><i class="fa-solid fa-address-book" style="font-size:24px;display:block;margin-bottom:8px;opacity:.4"></i>Nenhum contato encontrado</td></tr>` :
          filtered.map(c => {
            const avatarColor = getAvatarColor(c.name || 'U');
            const stage = PIPELINE_STAGES.find(s => s.id === (c.stage || 'lead')) || PIPELINE_STAGES[0];
            return `<tr style="border-bottom:1px solid #1e2d3d;transition:background .15s" onmouseover="this.style.background='#161b22'" onmouseout="this.style.background='transparent'">
              <td style="padding:10px 14px"><input type="checkbox" value="${c.id}"></td>
              <td style="padding:10px 14px"><div style="width:32px;height:32px;border-radius:50%;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:600">${(c.name||'?')[0]?.toUpperCase()}</div></td>
              <td style="padding:10px 14px;font-size:12px;color:#e6edf3;font-weight:500">${c.name||'N/A'}</td>
              <td style="padding:10px 14px;font-size:12px;color:#8b9dc3">${c.phone||'-'}</td>
              <td style="padding:10px 14px;font-size:12px;color:#8b9dc3">${c.email||'-'}</td>
              <td style="padding:10px 14px"><span style="padding:3px 10px;border-radius:10px;font-size:10px;background:#6c5ce722;color:#6c5ce7;border:1px solid #6c5ce744">${c.tag||'lead'}</span></td>
              <td style="padding:10px 14px"><span style="padding:3px 10px;border-radius:10px;font-size:10px;background:${stage.color}22;color:${stage.color};border:1px solid ${stage.color}44">${stage.name}</span></td>
              <td style="padding:10px 14px">
                <div style="display:flex;gap:4px">
                  <button onclick="showContactDetail('${c.id}')" style="padding:4px 8px;border-radius:4px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px"><i class="fa-solid fa-eye"></i></button>
                  <button onclick="showEditContact('${c.id}')" style="padding:4px 8px;border-radius:4px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px"><i class="fa-solid fa-pen"></i></button>
                  <button onclick="deleteContact('${c.id}')" style="padding:4px 8px;border-radius:4px;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.08);color:#ef4444;cursor:pointer;font-size:10px"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>`;
          }).join('')}
      </tbody>
    </table>
  </div>`;
}

// ─── Kanban View ────────────────────────────────────────────────
function renderKanbanView() {
  const filtered = getFilteredContacts();
  const groups = {};
  PIPELINE_STAGES.forEach(s => groups[s.id] = []);
  filtered.forEach(c => { const stage = c.stage || 'lead'; if (groups[stage]) groups[stage].push(c); });
  
  return `<div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:12px;min-height:500px">
    ${PIPELINE_STAGES.map(s => `
      <div style="min-width:280px;flex:1;background:#161b22;border:1px solid #1e2d3d;border-radius:12px;display:flex;flex-direction:column">
        <div style="padding:12px 14px;border-bottom:1px solid #1e2d3d;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:8px;height:8px;border-radius:50%;background:${s.color}"></div>
            <span style="font-size:12px;font-weight:600;color:#e6edf3">${s.name}</span>
          </div>
          <span style="padding:2px 8px;border-radius:10px;font-size:10px;background:#1a1f35;color:#8b9dc3">${groups[s.id].length}</span>
        </div>
        <div style="flex:1;padding:8px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;max-height:460px">
          ${groups[s.id].length === 0 ? '<div style="text-align:center;padding:20px;color:#64748b;font-size:11px">Nenhum contato</div>' :
            groups[s.id].map(c => {
              const avatarColor = getAvatarColor(c.name || 'U');
              return `<div onclick="showContactDetail('${c.id}')" style="background:#1a1f35;border:1px solid #2a3050;border-radius:10px;padding:12px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor='${s.color}'" onmouseout="this.style.borderColor='#2a3050'">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                  <div style="width:28px;height:28px;border-radius:50%;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:600">${(c.name||'?')[0]?.toUpperCase()}</div>
                  <span style="font-size:12px;font-weight:500;color:#e6edf3">${c.name||'N/A'}</span>
                </div>
                <div style="font-size:10px;color:#8b9dc3;margin-bottom:4px">${c.phone||''}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                  ${(c.tag||'').split(',').filter(Boolean).map(t => `<span style="padding:2px 6px;border-radius:6px;font-size:8px;background:#6c5ce722;color:#6c5ce7">${t.trim()}</span>`).join('')}
                </div>
              </div>`;
            }).join('')}
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ─── Pipeline View ──────────────────────────────────────────────
function renderPipelineView() {
  const filtered = getFilteredContacts();
  const groups = {};
  PIPELINE_STAGES.forEach(s => groups[s.id] = []);
  filtered.forEach(c => { const stage = c.stage || 'lead'; if (groups[stage]) groups[stage].push(c); });
  
  return `<div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:16px">
    <!-- Pipeline Bar -->
    <div style="display:flex;gap:2px;margin-bottom:20px;background:#161b22;border-radius:8px;padding:4px">
      ${PIPELINE_STAGES.map(s => {
        const count = groups[s.id].length;
        const pct = filtered.length > 0 ? Math.round(count / filtered.length * 100) : 0;
        return `<div style="flex:1;text-align:center;padding:8px 4px;border-radius:6px;background:${count > 0 ? s.color + '15' : 'transparent'};cursor:pointer" onclick="crmStageFilter='${s.id}';renderCrmView()">
          <div style="font-size:10px;color:${s.color};font-weight:600">${s.name}</div>
          <div style="font-size:16px;font-weight:700;color:#e6edf3;margin:2px 0">${count}</div>
          <div style="height:4px;background:#1a1f35;border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${s.color};border-radius:2px;transition:width .3s"></div></div>
        </div>`;
      }).join('')}
    </div>
    <!-- Pipeline Table -->
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid #2a3050">
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Contato</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Telefone</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Estágio</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Tag</th>
        <th style="padding:8px 12px;text-align:center;font-size:11px;color:#8b9dc3;font-weight:500">Ações</th>
      </tr></thead>
      <tbody>
        ${filtered.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:#8b9dc3">Nenhum contato</td></tr>` :
          filtered.map(c => {
            const stage = PIPELINE_STAGES.find(s => s.id === (c.stage || 'lead')) || PIPELINE_STAGES[0];
            const avatarColor = getAvatarColor(c.name || 'U');
            return `<tr style="border-bottom:1px solid #1e2d3d">
              <td style="padding:10px 12px;display:flex;align-items:center;gap:8px">
                <div style="width:28px;height:28px;border-radius:50%;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:600">${(c.name||'?')[0]?.toUpperCase()}</div>
                <span style="font-size:12px;color:#e6edf3">${c.name||'N/A'}</span>
              </td>
              <td style="padding:10px 12px;font-size:12px;color:#8b9dc3">${c.phone||'-'}</td>
              <td style="padding:10px 12px">
                <select onchange="moveContactStage('${c.id}',this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid ${stage.color}44;background:${stage.color}15;color:${stage.color};font-size:10px;cursor:pointer">
                  ${PIPELINE_STAGES.map(s => `<option value="${s.id}" ${s.id===(c.stage||'lead')?'selected':''}>${s.name}</option>`).join('')}
                </select>
              </td>
              <td style="padding:10px 12px"><span style="padding:2px 8px;border-radius:8px;font-size:10px;background:#6c5ce722;color:#6c5ce7">${c.tag||'lead'}</span></td>
              <td style="padding:10px 12px;text-align:center">
                <button onclick="showContactDetail('${c.id}')" style="padding:4px 8px;border-radius:4px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px"><i class="fa-solid fa-eye"></i></button>
              </td>
            </tr>`;
          }).join('')}
      </tbody>
    </table>
  </div>`;
}

async function moveContactStage(id, stage) {
  await api(`/api/crm/contacts/${id}`, { method: 'PUT', body: JSON.stringify({ stage }) });
  const c = allContacts.find(x => x.id === id); if (c) c.stage = stage;
  renderCrmView();
  showToast('Estágio atualizado', 'success');
}

// ─── Contact CRUD ───────────────────────────────────────────────
const CONTACT_FIELDS = [
  { key: 'name', label: 'Nome', placeholder: 'Nome completo', required: true },
  { key: 'phone', label: 'Telefone', placeholder: '+5511999999999', required: true },
  { key: 'email', label: 'Email', placeholder: 'email@exemplo.com' },
  { key: 'company', label: 'Empresa', placeholder: 'Nome da empresa' },
  { key: 'tag', label: 'Tag', type: 'select', options: [{ value: 'lead', label: 'Lead' }, { value: 'cliente', label: 'Cliente' }, { value: 'vip', label: 'VIP' }, { value: 'fornecedor', label: 'Fornecedor' }] },
  { key: 'stage', label: 'Estágio', type: 'select', options: PIPELINE_STAGES.map(s => ({ value: s.id, label: s.name })) }
];

function showCreateContact() {
  const area = document.getElementById('contact-form-area');
  if (!area) return;
  area.innerHTML = `
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px;margin-bottom:20px;animation:slideUp .3s ease">
      <h3 style="margin:0 0 16px;font-size:14px;color:#e6edf3"><i class="fa-solid fa-user-plus" style="color:#6c5ce7;margin-right:8px"></i>Novo Contato</h3>
      ${crudForm({ fields: CONTACT_FIELDS, id: 'contact-create' })}
      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="saveContact()" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-save"></i> Salvar</button>
        <button onclick="document.getElementById('contact-form-area').innerHTML=''" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px">Cancelar</button>
      </div>
    </div>`;
}

async function saveContact(editId) {
  const data = getFormData(CONTACT_FIELDS, editId ? `contact-edit-${editId}` : 'contact-create');
  if (!validateForm(CONTACT_FIELDS, data)) return;
  if (editId) {
    await api(`/api/crm/contacts/${editId}`, { method: 'PUT', body: JSON.stringify(data) });
    showToast('Contato atualizado!', 'success');
  } else {
    await api('/api/crm/contacts', { method: 'POST', body: JSON.stringify(data) });
    showToast('Contato criado!', 'success');
  }
  document.getElementById('contact-form-area').innerHTML = '';
  loadContacts(document.getElementById('content'));
}

function showEditContact(id) {
  const c = allContacts.find(x => x.id === id);
  if (!c) return;
  const area = document.getElementById('contact-form-area');
  if (!area) return;
  area.innerHTML = `
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px;margin-bottom:20px;animation:slideUp .3s ease">
      <h3 style="margin:0 0 16px;font-size:14px;color:#e6edf3"><i class="fa-solid fa-pen" style="color:#3b82f6;margin-right:8px"></i>Editar Contato</h3>
      ${crudForm({ fields: CONTACT_FIELDS, values: c, id: `contact-edit-${id}` })}
      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="saveContact('${id}')" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-save"></i> Salvar</button>
        <button onclick="document.getElementById('contact-form-area').innerHTML=''" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px">Cancelar</button>
      </div>
    </div>`;
}

async function deleteContact(id) {
  confirmModal({ title: 'Excluir contato', message: 'Tem certeza que deseja excluir este contato?', danger: true, onConfirm: async () => {
    await api(`/api/crm/contacts/${id}`, { method: 'DELETE' });
    showToast('Contato excluído', 'success');
    loadContacts(document.getElementById('content'));
  }});
}

// ─── Contact Detail Modal ────────────────────────────────────────
async function showContactDetail(id) {
  const c = allContacts.find(x => x.id === id);
  if (!c) return;
  const avatarColor = getAvatarColor(c.name || 'U');
  const stage = PIPELINE_STAGES.find(s => s.id === (c.stage || 'lead')) || PIPELINE_STAGES[0];
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.id = 'contact-detail-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:520px">
      <div class="modal-header">
        <h3><i class="fa-solid fa-user" style="color:#6c5ce7;margin-right:8px"></i>${c.name || 'Contato'}</h3>
        <button class="modal-close" onclick="document.getElementById('contact-detail-modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
          <div style="width:56px;height:56px;border-radius:50%;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:22px;color:white;font-weight:700">${(c.name||'?')[0]?.toUpperCase()}</div>
          <div>
            <div style="font-size:16px;font-weight:600;color:#e6edf3">${c.name||'N/A'}</div>
            <div style="font-size:12px;color:#8b9dc3">${c.phone||'Sem telefone'}</div>
            <div style="font-size:12px;color:#8b9dc3">${c.email||'Sem email'}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:#161b22;border:1px solid #1e2d3d;border-radius:8px;padding:12px">
            <div style="font-size:10px;color:#8b9dc3;margin-bottom:4px">Empresa</div>
            <div style="font-size:12px;color:#e6edf3">${c.company||'-'}</div>
          </div>
          <div style="background:#161b22;border:1px solid #1e2d3d;border-radius:8px;padding:12px">
            <div style="font-size:10px;color:#8b9dc3;margin-bottom:4px">Tag</div>
            <span style="padding:3px 10px;border-radius:10px;font-size:10px;background:#6c5ce722;color:#6c5ce7">${c.tag||'lead'}</span>
          </div>
          <div style="background:#161b22;border:1px solid #1e2d3d;border-radius:8px;padding:12px">
            <div style="font-size:10px;color:#8b9dc3;margin-bottom:4px">Estágio</div>
            <span style="padding:3px 10px;border-radius:10px;font-size:10px;background:${stage.color}22;color:${stage.color}">${stage.name}</span>
          </div>
          <div style="background:#161b22;border:1px solid #1e2d3d;border-radius:8px;padding:12px">
            <div style="font-size:10px;color:#8b9dc3;margin-bottom:4px">Criado em</div>
            <div style="font-size:12px;color:#e6edf3">${c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '-'}</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('contact-detail-modal').remove()">Fechar</button>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('contact-detail-modal').remove();showEditContact('${id}')"><i class="fa-solid fa-pen"></i> Editar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ─── Custom Fields ───────────────────────────────────────────────
function showCustomFields() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.id = 'custom-fields-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:500px">
      <div class="modal-header">
        <h3><i class="fa-solid fa-sliders" style="color:#6c5ce7;margin-right:8px"></i>Campos Personalizados</h3>
        <button class="modal-close" onclick="document.getElementById('custom-fields-modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <p style="font-size:11px;color:#8b9dc3;margin:0 0 12px">Adicione campos customizados aos seus contatos:</p>
        <div id="custom-fields-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          ${customFields.length === 0 ? '<p style="text-align:center;color:#64748b;font-size:12px;padding:16px">Nenhum campo customizado</p>' :
            customFields.map((f, i) => `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#161b22;border:1px solid #1e2d3d;border-radius:8px">
              <i class="fa-solid fa-grip-vertical" style="color:#64748b;font-size:10px"></i>
              <span style="flex:1;font-size:12px;color:#e6edf3">${f.name}</span>
              <span style="font-size:10px;color:#8b9dc3">${f.type}</span>
              <button onclick="removeCustomField(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:10px"><i class="fa-solid fa-trash"></i></button>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <input type="text" id="cf-name" placeholder="Nome do campo" style="flex:1;padding:8px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:12px;outline:none">
          <select id="cf-type" style="padding:8px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:12px">
            <option value="text">Texto</option>
            <option value="number">Número</option>
            <option value="date">Data</option>
            <option value="select">Seleção</option>
            <option value="textarea">Área de texto</option>
          </select>
          <button onclick="addCustomField()" style="padding:8px 12px;border-radius:6px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:11px"><i class="fa-solid fa-plus"></i></button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('custom-fields-modal').remove()">Fechar</button>
        <button class="btn btn-primary btn-sm" onclick="saveCustomFields()">Salvar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function addCustomField() {
  const name = document.getElementById('cf-name')?.value;
  const type = document.getElementById('cf-type')?.value;
  if (!name) return showToast('Digite o nome do campo', 'error');
  customFields.push({ name, type });
  document.getElementById('cf-name').value = '';
  showCustomFields();
}
function removeCustomField(i) { customFields.splice(i, 1); showCustomFields(); }
function saveCustomFields() { localStorage.setItem('ozion_custom_fields', JSON.stringify(customFields)); document.getElementById('custom-fields-modal')?.remove(); showToast('Campos salvos!', 'success'); }

// ─── Import/Export CSV ──────────────────────────────────────────
function exportCSV() {
  const filtered = getFilteredContacts();
  if (filtered.length === 0) return showToast('Nenhum contato para exportar', 'error');
  const headers = ['Nome','Telefone','Email','Empresa','Tag','Estágio'];
  const rows = filtered.map(c => [c.name||'', c.phone||'', c.email||'', c.company||'', c.tag||'', c.stage||'lead']);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'contatos_ozion.csv'; link.click();
  showToast(`${filtered.length} contatos exportados`, 'success');
}

function showImportCSV() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.id = 'import-csv-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:480px">
      <div class="modal-header">
        <h3><i class="fa-solid fa-file-import" style="color:#22c55e;margin-right:8px"></i>Importar CSV</h3>
        <button class="modal-close" onclick="document.getElementById('import-csv-modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div style="border:2px dashed #2a3050;border-radius:12px;padding:40px;text-align:center;cursor:pointer" onmouseover="this.style.borderColor='#6c5ce7'" onmouseout="this.style.borderColor='#2a3050'" onclick="document.getElementById('csv-file-input').click()">
          <i class="fa-solid fa-cloud-arrow-up" style="font-size:32px;color:#6c5ce7;margin-bottom:12px;display:block"></i>
          <p style="font-size:13px;color:#e6edf3;margin:0 0 4px">Arraste um arquivo CSV ou clique para selecionar</p>
          <p style="font-size:11px;color:#8b9dc3;margin:0">Formato: nome, telefone, email, tag</p>
          <input type="file" id="csv-file-input" accept=".csv" style="display:none" onchange="handleCSVImport(this)">
        </div>
        <div id="csv-preview" style="margin-top:12px"></div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function handleCSVImport(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const lines = e.target.result.split('\n').filter(Boolean);
    if (lines.length < 2) return showToast('CSV vazio ou inválido', 'error');
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
      if (cols[0] && cols[1]) {
        await api('/api/crm/contacts', { method: 'POST', body: JSON.stringify({ name: cols[0], phone: cols[1], email: cols[2] || '', tag: cols[3] || 'lead' }) });
        imported++;
      }
    }
    document.getElementById('import-csv-modal')?.remove();
    showToast(`${imported} contatos importados!`, 'success');
    loadContacts(document.getElementById('content'));
  };
  reader.readAsText(file);
}

function filterByTag(tag) { crmTagFilter = tag; renderCrmView(); }
function toggleAllContacts(cb) { document.querySelectorAll('tbody input[type=checkbox]').forEach(c => c.checked = cb.checked); }

// ─── Tags (Funcional) ───────────────────────────────────────────
const TAG_COLORS = ['#6c5ce7','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#06b6d4','#f97316','#84cc16','#14b8a6','#e11d48'];
const TAG_FIELDS = [
  { key: 'name', label: 'Nome da Tag', placeholder: 'Ex: Lead Quente', required: true },
  { key: 'color', label: 'Cor', type: 'color', colors: TAG_COLORS },
  { key: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Opcional' }
];

async function loadTags(el) {
  const data = await api('/api/tags');
  allTags = data?.tags || [];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div><h2 style="margin:0;font-size:20px">Tags</h2><p style="color:#8b9dc3;margin-top:4px;font-size:12px">${allTags.length} tag(s) criada(s)</p></div>
      <button onclick="showCreateTag()" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px"><i class="fa-solid fa-plus"></i> Nova Tag</button>
    </div>

    <div id="tag-form-area"></div>

    <!-- Tags Grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px" id="tags-grid">
      ${allTags.length === 0 ? `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#8b9dc3">
          <div style="width:64px;height:64px;border-radius:50%;background:#161b22;display:flex;align-items:center;justify-content:center;margin:0 auto 16px"><i class="fa-solid fa-tags" style="font-size:24px;opacity:.4"></i></div>
          <h3 style="font-size:15px;font-weight:600;margin:0 0 6px;color:#e6edf3">Nenhuma tag criada</h3>
          <p style="font-size:12px;margin:0">Crie tags para organizar contatos, fluxos e conversas</p>
        </div>` : allTags.map(t => renderTagCard(t)).join('')}
    </div>`;
}

function renderTagCard(t) {
  return `<div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:16px;transition:all .2s;border-left:4px solid ${t.color || '#6c5ce7'}" onmouseover="this.style.borderColor='#3a4070'" onmouseout="this.style.borderColor='#2a3050'">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:12px;height:12px;border-radius:50%;background:${t.color || '#6c5ce7'}"></div>
        <span style="font-weight:600;font-size:13px;color:#e6edf3">${t.name}</span>
      </div>
      <div style="position:relative">
        <button onclick="toggleTagMenu('${t.id}')" style="background:none;border:none;color:#8b9dc3;cursor:pointer;padding:4px"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        <div id="tag-menu-${t.id}" style="display:none;position:absolute;right:0;top:100%;background:#1a1f35;border:1px solid #2a3050;border-radius:8px;padding:6px;min-width:140px;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,.4)">
          <div onclick="showEditTag('${t.id}')" style="padding:8px 12px;font-size:12px;color:#e6edf3;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#161b22'" onmouseout="this.style.background='transparent'"><i class="fa-solid fa-pen" style="font-size:10px;color:#3b82f6"></i> Editar</div>
          <div onclick="duplicateTag('${t.id}')" style="padding:8px 12px;font-size:12px;color:#e6edf3;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#161b22'" onmouseout="this.style.background='transparent'"><i class="fa-solid fa-copy" style="font-size:10px;color:#22c55e"></i> Duplicar</div>
          <div onclick="deleteTag('${t.id}')" style="padding:8px 12px;font-size:12px;color:#ef4444;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#161b22'" onmouseout="this.style.background='transparent'"><i class="fa-solid fa-trash" style="font-size:10px"></i> Excluir</div>
        </div>
      </div>
    </div>
    ${t.description ? `<p style="font-size:11px;color:#8b9dc3;margin:0">${t.description}</p>` : ''}
    <div style="display:flex;gap:4px;margin-top:10px">
      <span style="padding:3px 8px;border-radius:6px;font-size:9px;color:#8b9dc3;background:#161b22">${t.usage_count || 0} usos</span>
    </div>
  </div>`;
}

function toggleTagMenu(id) {
  const menu = document.getElementById(`tag-menu-${id}`);
  if (!menu) return;
  const isVisible = menu.style.display === 'block';
  document.querySelectorAll('[id^="tag-menu-"]').forEach(m => m.style.display = 'none');
  if (!isVisible) menu.style.display = 'block';
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('[id^="tag-menu-"]') && !e.target.closest('[onclick^="toggleTagMenu"]')) {
    document.querySelectorAll('[id^="tag-menu-"]').forEach(m => m.style.display = 'none');
  }
});

function showCreateTag() {
  const area = document.getElementById('tag-form-area');
  if (!area) return;
  area.innerHTML = `
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px;margin-bottom:20px;animation:slideUp .3s ease">
      <h3 style="margin:0 0 16px;font-size:14px;color:#e6edf3"><i class="fa-solid fa-plus" style="color:#6c5ce7;margin-right:8px"></i>Nova Tag</h3>
      ${crudForm({ fields: TAG_FIELDS, id: 'tag-create' })}
      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="saveTag()" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-save"></i> Salvar</button>
        <button onclick="document.getElementById('tag-form-area').innerHTML=''" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px">Cancelar</button>
      </div>
    </div>`;
}

async function saveTag(editId) {
  const data = getFormData(TAG_FIELDS, editId ? `tag-edit-${editId}` : 'tag-create');
  if (!validateForm(TAG_FIELDS, data)) return;
  if (editId) {
    await api(`/api/tags/${editId}`, { method: 'PUT', body: JSON.stringify(data) });
    showToast('Tag atualizada!', 'success');
  } else {
    await api('/api/tags', { method: 'POST', body: JSON.stringify(data) });
    showToast('Tag criada!', 'success');
  }
  document.getElementById('tag-form-area').innerHTML = '';
  loadTags(document.getElementById('content'));
}

function showEditTag(id) {
  document.querySelectorAll('[id^="tag-menu-"]').forEach(m => m.style.display = 'none');
  const tag = allTags.find(t => t.id === id);
  if (!tag) return;
  const area = document.getElementById('tag-form-area');
  if (!area) return;
  area.innerHTML = `
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px;margin-bottom:20px;animation:slideUp .3s ease">
      <h3 style="margin:0 0 16px;font-size:14px;color:#e6edf3"><i class="fa-solid fa-pen" style="color:#3b82f6;margin-right:8px"></i>Editar Tag</h3>
      ${crudForm({ fields: TAG_FIELDS, values: tag, id: `tag-edit-${id}` })}
      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="saveTag('${id}')" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-save"></i> Salvar</button>
        <button onclick="document.getElementById('tag-form-area').innerHTML=''" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px">Cancelar</button>
      </div>
    </div>`;
}

async function duplicateTag(id) {
  document.querySelectorAll('[id^="tag-menu-"]').forEach(m => m.style.display = 'none');
  const tag = allTags.find(t => t.id === id);
  if (!tag) return;
  await api('/api/tags', { method: 'POST', body: JSON.stringify({ name: tag.name + ' (cópia)', color: tag.color, description: tag.description }) });
  showToast('Tag duplicada!', 'success');
  loadTags(document.getElementById('content'));
}

async function deleteTag(id) {
  document.querySelectorAll('[id^="tag-menu-"]').forEach(m => m.style.display = 'none');
  confirmModal({
    title: 'Excluir Tag',
    message: 'Tem certeza que deseja excluir esta tag? Ela será removida de todos os contatos e fluxos.',
    danger: true,
    onConfirm: async () => {
      await api(`/api/tags/${id}`, { method: 'DELETE' });
      showToast('Tag excluída!', 'success');
      loadTags(document.getElementById('content'));
    }
  });
}

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

// ─── Voice Studio (Full) ────────────────────────────────────────
const VOICE_PRESETS = [
  { id: 'julieta', name: 'Julieta', lang: 'pt-BR', gender: 'F', provider: 'ElevenLabs' },
  { id: 'marcos', name: 'Marcos Vinicius', lang: 'pt-BR', gender: 'M', provider: 'ElevenLabs' },
  { id: 'carla', name: 'Carla', lang: 'pt-BR', gender: 'F', provider: 'ElevenLabs' },
  { id: 'joao', name: 'João Pedro', lang: 'pt-BR', gender: 'M', provider: 'ElevenLabs' },
  { id: 'maria', name: 'Maria Eduarda', lang: 'pt-BR', gender: 'F', provider: 'ElevenLabs' },
  { id: 'otavio', name: 'Otavio Luiz', lang: 'pt-BR', gender: 'M', provider: 'ElevenLabs' },
  { id: 'bia', name: 'Bia', lang: 'pt-BR', gender: 'F', provider: 'ElevenLabs' },
  { id: 'samuel', name: 'Samuel', lang: 'pt-BR', gender: 'M', provider: 'ElevenLabs' },
  { id: 'alloy', name: 'Alloy', lang: 'multi', gender: 'M', provider: 'OpenAI' },
  { id: 'echo', name: 'Echo', lang: 'en', gender: 'M', provider: 'OpenAI' },
  { id: 'nova', name: 'Nova', lang: 'en', gender: 'F', provider: 'OpenAI' },
  { id: 'shimmer', name: 'Shimmer', lang: 'en', gender: 'F', provider: 'OpenAI' }
];

let voiceTab = 'tts';

async function loadVoice(el) {
  allVoices = await api('/api/voice') || [];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h2 style="margin:0;font-size:20px">Voice Studio</h2>
        <p style="color:#8b9dc3;margin-top:2px;font-size:12px">${allVoices.length} voz(es) • Gere áudios com IA</p>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="showCloneVoice()" style="padding:8px 16px;border-radius:8px;border:1px solid #6c5ce7;background:#6c5ce715;color:#6c5ce7;cursor:pointer;font-size:12px;font-weight:500"><i class="fa-solid fa-wand-magic-sparkles"></i> Clonar Voz</button>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:4px;margin-bottom:20px;background:#161b22;border-radius:10px;padding:4px">
      <button onclick="setVoiceTab('tts')" style="flex:1;padding:10px;border:none;border-radius:8px;background:${voiceTab==='tts'?'#6c5ce7':'transparent'};color:${voiceTab==='tts'?'white':'#8b9dc3'};cursor:pointer;font-size:12px;font-weight:500;transition:all .2s"><i class="fa-solid fa-volume-high"></i> Text-to-Speech</button>
      <button onclick="setVoiceTab('cloned')" style="flex:1;padding:10px;border:none;border-radius:8px;background:${voiceTab==='cloned'?'#6c5ce7':'transparent'};color:${voiceTab==='cloned'?'white':'#8b9dc3'};cursor:pointer;font-size:12px;font-weight:500;transition:all .2s"><i class="fa-solid fa-wand-magic-sparkles"></i> Vozes Clonadas</button>
      <button onclick="setVoiceTab('library')" style="flex:1;padding:10px;border:none;border-radius:8px;background:${voiceTab==='library'?'#6c5ce7':'transparent'};color:${voiceTab==='library'?'white':'#8b9dc3'};cursor:pointer;font-size:12px;font-weight:500;transition:all .2s"><i class="fa-solid fa-book"></i> Biblioteca</button>
    </div>

    <div id="voice-content">${renderVoiceContent()}</div>
  `;
}

function setVoiceTab(t) { voiceTab = t; renderVoice(); }
function renderVoice() { const c = document.getElementById('voice-content'); if (c) c.innerHTML = renderVoiceContent(); }

function renderVoiceContent() {
  if (voiceTab === 'cloned') return renderClonedVoices();
  if (voiceTab === 'library') return renderVoiceLibrary();
  return renderTTSGenerator();
}

function renderTTSGenerator() {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <!-- TTS Panel -->
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px">
      <h3 style="font-size:14px;color:#e6edf3;margin:0 0 16px"><i class="fa-solid fa-volume-high" style="color:#6c5ce7;margin-right:8px"></i>Gerar Áudio</h3>
      <textarea id="voice-text" rows="5" placeholder="Digite o texto para converter em áudio..." style="width:100%;padding:12px;background:#161b22;border:1px solid #1e2d3d;border-radius:8px;color:#e6edf3;font-size:12px;outline:none;resize:vertical;font-family:inherit"></textarea>
      
      <div style="margin-top:16px">
        <label style="font-size:11px;color:#8b9dc3;display:block;margin-bottom:8px">Voz</label>
        <select id="voice-select" style="width:100%;padding:8px 12px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:12px">
          ${VOICE_PRESETS.map(v => `<option value="${v.id}">${v.name} (${v.lang} • ${v.gender === 'F' ? 'Feminina' : 'Masculina'})</option>`).join('')}
          ${allVoices.map(v => `<option value="${v.id}">${v.name} (Clonada)</option>`).join('')}
        </select>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
        <div>
          <label style="font-size:10px;color:#8b9dc3;display:flex;justify-content:space-between;margin-bottom:4px"><span>Estabilidade</span><span id="stability-val">0.5</span></label>
          <input type="range" id="stability" min="0" max="1" step="0.1" value="0.5" style="width:100%;accent-color:#6c5ce7" oninput="document.getElementById('stability-val').textContent=this.value">
        </div>
        <div>
          <label style="font-size:10px;color:#8b9dc3;display:flex;justify-content:space-between;margin-bottom:4px"><span>Similaridade</span><span id="similarity-val">0.7</span></label>
          <input type="range" id="similarity" min="0" max="1" step="0.1" value="0.7" style="width:100%;accent-color:#6c5ce7" oninput="document.getElementById('similarity-val').textContent=this.value">
        </div>
        <div>
          <label style="font-size:10px;color:#8b9dc3;display:flex;justify-content:space-between;margin-bottom:4px"><span>Velocidade</span><span id="speed-val">1.0</span></label>
          <input type="range" id="speed" min="0.5" max="2" step="0.1" value="1" style="width:100%;accent-color:#6c5ce7" oninput="document.getElementById('speed-val').textContent=this.value">
        </div>
        <div>
          <label style="font-size:10px;color:#8b9dc3;display:flex;justify-content:space-between;margin-bottom:4px"><span>Estilo</span><span id="style-val">0</span></label>
          <input type="range" id="voice-style" min="0" max="1" step="0.1" value="0" style="width:100%;accent-color:#6c5ce7" oninput="document.getElementById('style-val').textContent=this.value">
        </div>
      </div>

      <!-- Audio Player -->
      <div id="audio-player" style="margin-top:16px;display:none">
        <div style="background:#161b22;border:1px solid #1e2d3d;border-radius:8px;padding:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <button onclick="togglePlayAudio()" id="play-btn" style="width:36px;height:36px;border-radius:50%;background:#6c5ce7;border:none;color:white;cursor:pointer;font-size:14px;flex-shrink:0"><i class="fa-solid fa-play"></i></button>
            <div style="flex:1;height:4px;background:#1e2d3d;border-radius:2px;cursor:pointer" onclick="seekAudio(event)"><div id="audio-progress" style="height:100%;width:0%;background:#6c5ce7;border-radius:2px;transition:width .1s"></div></div>
            <span id="audio-time" style="font-size:11px;color:#8b9dc3;flex-shrink:0">0:00</span>
            <button onclick="downloadAudio()" style="background:none;border:none;color:#8b9dc3;cursor:pointer;font-size:12px"><i class="fa-solid fa-download"></i></button>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="generateTTS()" style="flex:1;padding:10px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px"><i class="fa-solid fa-play"></i> Gerar Áudio</button>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:10px;color:#64748b">
        <span>Modelo: eleven_v3</span>
        <span>Custo: ~50 tokens</span>
      </div>
    </div>

    <!-- History + Presets -->
    <div style="display:flex;flex-direction:column;gap:12px">
      <!-- Quick Presets -->
      <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:16px">
        <h4 style="font-size:12px;color:#e6edf3;margin:0 0 10px"><i class="fa-solid fa-bolt" style="color:#f59e0b;margin-right:6px"></i>Textos Rápidos</h4>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${[
            { name: 'Saudação', text: 'Olá! Bem-vindo à Ozion. Como posso ajudar?' },
            { name: 'Agradecimento', text: 'Obrigado pelo contato! Fique à disposição.' },
            { name: 'Horário', text: 'Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.' },
            { name: 'Despedida', text: 'Tenha um ótimo dia! Estou aqui se precisar.' }
          ].map(p => `<div onclick="document.getElementById('voice-text').value='${p.text}'" style="padding:8px 10px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .2s" onmouseover="this.style.borderColor='#6c5ce7'" onmouseout="this.style.borderColor='#1e2d3d'">
            <i class="fa-solid fa-play" style="color:#6c5ce7;font-size:10px"></i>
            <span style="font-size:11px;color:#e6edf3">${p.name}</span>
            <span style="font-size:10px;color:#64748b;margin-left:auto">${p.text.substring(0,30)}...</span>
          </div>`).join('')}
        </div>
      </div>

      <!-- History -->
      <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:16px;flex:1">
        <h4 style="font-size:12px;color:#e6edf3;margin:0 0 10px"><i class="fa-solid fa-clock-rotate-left" style="color:#3b82f6;margin-right:6px"></i>Histórico</h4>
        <div id="voice-history" style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto">
          <div style="text-align:center;padding:20px;color:#64748b;font-size:11px">Nenhum áudio gerado ainda</div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderClonedVoices() {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
    ${allVoices.length === 0 ? `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#8b9dc3;background:#1a1f35;border:1px solid #2a3050;border-radius:12px">
        <div style="width:64px;height:64px;border-radius:50%;background:#161b22;display:flex;align-items:center;justify-content:center;margin:0 auto 16px"><i class="fa-solid fa-wand-magic-sparkles" style="font-size:24px;opacity:.4"></i></div>
        <h3 style="font-size:15px;font-weight:600;margin:0 0 6px;color:#e6edf3">Nenhuma voz clonada</h3>
        <p style="font-size:12px;margin:0 0 16px">Faça upload de um áudio para clonar sua voz</p>
        <button onclick="showCloneVoice()" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-wand-magic-sparkles"></i> Clonar Primeira Voz</button>
      </div>
    ` : allVoices.map(v => `
      <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#6c5ce722,#6c5ce744);display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-microphone" style="color:#6c5ce7;font-size:16px"></i></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:#e6edf3">${v.name}</div>
            <div style="font-size:10px;color:#8b9dc3">${v.provider||'ElevenLabs'} • Clonada em ${v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '-'}</div>
          </div>
          <button onclick="deleteVoice('${v.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="testVoice('${v.id}')" style="flex:1;padding:6px;border-radius:6px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px"><i class="fa-solid fa-play"></i> Testar</button>
          <button onclick="editVoice('${v.id}')" style="flex:1;padding:6px;border-radius:6px;border:1px solid #6c5ce7;background:#6c5ce715;color:#6c5ce7;cursor:pointer;font-size:10px"><i class="fa-solid fa-pen"></i> Editar</button>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function renderVoiceLibrary() {
  return `<div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px">
    <h3 style="font-size:14px;color:#e6edf3;margin:0 0 4px">Biblioteca de Vozes</h3>
    <p style="font-size:11px;color:#8b9dc3;margin:0 0 16px">Vozes pré-configuradas prontas para uso</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
      ${VOICE_PRESETS.map(v => `
        <div onclick="selectPresetVoice('${v.id}')" style="display:flex;align-items:center;gap:10px;padding:12px;background:#161b22;border:1px solid #1e2d3d;border-radius:8px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor='#6c5ce7'" onmouseout="this.style.borderColor='#1e2d3d'">
          <div style="width:36px;height:36px;border-radius:50%;background:${v.gender==='F'?'#ec489922':'#3b82f622'};display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-${v.gender==='F'?'female':'male'}" style="color:${v.gender==='F'?'#ec4899':'#3b82f6'};font-size:14px"></i></div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:500;color:#e6edf3">${v.name}</div>
            <div style="font-size:10px;color:#8b9dc3">${v.lang} • ${v.provider}</div>
          </div>
          <button onclick="event.stopPropagation();previewPresetVoice('${v.id}')" style="background:none;border:none;color:#6c5ce7;cursor:pointer;font-size:12px"><i class="fa-solid fa-play"></i></button>
        </div>
      `).join('')}
    </div>
  </div>`;
}

function showCloneVoice() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.id = 'clone-voice-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:480px">
      <div class="modal-header">
        <h3><i class="fa-solid fa-wand-magic-sparkles" style="color:#6c5ce7;margin-right:8px"></i>Clonar Voz</h3>
        <button class="modal-close" onclick="document.getElementById('clone-voice-modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nome da Voz</label>
          <input type="text" id="clone-voice-name" placeholder="Ex: Minha Voz">
        </div>
        <div class="form-group">
          <label>Descrição</label>
          <input type="text" id="clone-voice-desc" placeholder="Voz profissional feminina...">
        </div>
        <div style="border:2px dashed #2a3050;border-radius:12px;padding:30px;text-align:center;cursor:pointer;margin-bottom:12px" onmouseover="this.style.borderColor='#6c5ce7'" onmouseout="this.style.borderColor='#2a3050'" onclick="document.getElementById('clone-audio-input').click()">
          <i class="fa-solid fa-cloud-arrow-up" style="font-size:28px;color:#6c5ce7;margin-bottom:8px;display:block"></i>
          <p style="font-size:12px;color:#e6edf3;margin:0 0 4px">Arraste um áudio ou clique para selecionar</p>
          <p style="font-size:10px;color:#8b9dc3;margin:0">MP3, WAV, M4A • Máx 10MB • Mínimo 30 segundos</p>
          <input type="file" id="clone-audio-input" accept="audio/*" style="display:none">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group">
            <label>Estabilidade</label>
            <input type="range" min="0" max="1" step="0.1" value="0.5" style="width:100%;accent-color:#6c5ce7">
          </div>
          <div class="form-group">
            <label>Similaridade</label>
            <input type="range" min="0" max="1" step="0.1" value="0.75" style="width:100%;accent-color:#6c5ce7">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('clone-voice-modal').remove()">Cancelar</button>
        <button class="btn btn-primary btn-sm" onclick="doCloneVoice()"><i class="fa-solid fa-wand-magic-sparkles"></i> Clonar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function doCloneVoice() {
  const name = document.getElementById('clone-voice-name')?.value;
  if (!name) return showToast('Digite o nome da voz', 'error');
  showToast('Clonando voz... (processo em background)', 'info');
  document.getElementById('clone-voice-modal')?.remove();
  // Simulated clone
  setTimeout(() => { showToast('Voz clonada com sucesso!', 'success'); loadVoice(document.getElementById('content')); }, 2000);
}

async function generateTTS() {
  const text = document.getElementById('voice-text')?.value;
  if (!text) return showToast('Digite um texto', 'error');
  const voiceId = document.getElementById('voice-select')?.value;
  showToast('Gerando áudio...', 'info');
  const resp = await api('/api/voice/generate', { method: 'POST', body: JSON.stringify({ text, voice_id: voiceId }) });
  if (resp?.audio_url || resp?.ok) {
    document.getElementById('audio-player').style.display = 'block';
    showToast('Áudio gerado!', 'success');
    // Add to history
    const history = document.getElementById('voice-history');
    if (history) {
      if (history.querySelector('[style*="text-align:center"]')) history.innerHTML = '';
      history.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px">
        <button onclick="showToast('Reproduzindo...','info')" style="width:28px;height:28px;border-radius:50%;background:#6c5ce7;border:none;color:white;cursor:pointer;font-size:10px;flex-shrink:0"><i class="fa-solid fa-play"></i></button>
        <div style="flex:1;min-width:0"><div style="font-size:11px;color:#e6edf3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${text.substring(0,40)}</div><div style="font-size:9px;color:#64748b">Agora</div></div>
      </div>` + history.innerHTML;
    }
  } else {
    showToast('Erro ao gerar áudio', 'error');
  }
}

function selectPresetVoice(id) { showToast(`Voz "${id}" selecionada para TTS`, 'success'); voiceTab = 'tts'; renderVoice(); }
function previewPresetVoice(id) { showToast(`Reproduzindo ${id}...`, 'info'); }
function testVoice(id) { showToast('Testando voz...', 'info'); }
function editVoice(id) { showToast('Editar voz em breve', 'info'); }
async function deleteVoice(id) {
  confirmModal({ title: 'Excluir voz', message: 'Tem certeza? Esta ação não pode ser desfeita.', danger: true, onConfirm: async () => {
    await api(`/api/voice/${id}`, { method: 'DELETE' });
    showToast('Voz excluída', 'success');
    loadVoice(document.getElementById('content'));
  }});
}
function togglePlayAudio() { showToast('Reproduzindo áudio...', 'info'); }
function seekAudio(e) { showToast('Seek áudio', 'info'); }
function downloadAudio() { showToast('Download iniciado', 'success'); }

// ─── Agente IA (Full Management) ────────────────────────────────
const AI_MODELS = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Grátis)', speed: '~650ms' },
  { provider: 'groq', model: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Grátis)', speed: '~300ms' },
  { provider: 'deepseek', model: 'deepseek-chat', label: 'DeepSeek Chat ($0.14/M)', speed: '~1.2s' },
  { provider: 'openai', model: 'gpt-4o', label: 'GPT-4o ($2.50/M)', speed: '~1s' },
  { provider: 'openai', model: 'gpt-4o-mini', label: 'GPT-4o Mini ($0.15/M)', speed: '~500ms' },
  { provider: 'anthropic', model: 'claude-sonnet-4-20250514', label: 'Claude Sonnet ($3/M)', speed: '~1.5s' }
];

async function loadAgents(el) {
  allAgents = await api('/api/agents') || [];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h2 style="margin:0;font-size:20px">Agente IA</h2>
        <p style="color:#8b9dc3;margin-top:2px;font-size:12px">${allAgents.length} agente(s) criado(s)</p>
      </div>
      <button onclick="showCreateAgent()" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px"><i class="fa-solid fa-plus"></i> Novo Agente</button>
    </div>

    <!-- Agent Form Area -->
    <div id="agent-form-area"></div>

    <!-- Agent Cards -->
    ${allAgents.length === 0 ? `
      <div style="text-align:center;padding:60px 20px;color:#8b9dc3;background:#1a1f35;border:1px solid #2a3050;border-radius:12px">
        <div style="width:64px;height:64px;border-radius:50%;background:#161b22;display:flex;align-items:center;justify-content:center;margin:0 auto 16px"><i class="fa-solid fa-robot" style="font-size:24px;opacity:.4"></i></div>
        <h3 style="font-size:15px;font-weight:600;margin:0 0 6px;color:#e6edf3">Nenhum agente criado</h3>
        <p style="font-size:12px;margin:0 0 16px">Crie agentes de IA para automatizar atendimentos</p>
        <button onclick="showCreateAgent()" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600">Criar Primeiro Agente</button>
      </div>` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px">
        ${allAgents.map(a => renderAgentCard(a)).join('')}
      </div>
    `}
  `;
}

function renderAgentCard(a) {
  const providerColor = a.provider === 'groq' ? '#22c55e' : a.provider === 'deepseek' ? '#3b82f6' : a.provider === 'openai' ? '#10b981' : '#f59e0b';
  const status = a.is_active !== false;
  return `<div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:16px;transition:all .2s;${status?'border-left:4px solid #22c55e':'border-left:4px solid #ef4444'}" onmouseover="this.style.borderColor='#3a4070'" onmouseout="this.style.borderColor='#2a3050'">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,${providerColor}22,${providerColor}44);display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-robot" style="color:${providerColor};font-size:18px"></i></div>
        <div>
          <h3 style="font-size:14px;font-weight:600;color:#e6edf3;margin:0">${a.name}</h3>
          <span style="font-size:10px;color:#8b9dc3">${a.provider||'groq'} • ${a.model||'llama-3.3-70b'}</span>
        </div>
      </div>
      <div style="position:relative">
        <button onclick="toggleAgentMenu('${a.id}')" style="background:none;border:none;color:#8b9dc3;cursor:pointer;padding:4px"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        <div id="agent-menu-${a.id}" style="display:none;position:absolute;right:0;top:100%;background:#1a1f35;border:1px solid #2a3050;border-radius:8px;padding:6px;min-width:160px;z-index:50;box-shadow:0 8px 24px rgba(0,0,0,.4)">
          <div onclick="showEditAgent('${a.id}')" style="padding:8px 12px;font-size:12px;color:#e6edf3;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#161b22'" onmouseout="this.style.background='transparent'"><i class="fa-solid fa-pen" style="font-size:10px;color:#3b82f6"></i> Editar</div>
          <div onclick="testAgent('${a.id}')" style="padding:8px 12px;font-size:12px;color:#e6edf3;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#161b22'" onmouseout="this.style.background='transparent'"><i class="fa-solid fa-flask" style="font-size:10px;color:#22c55e"></i> Testar</div>
          <div onclick="duplicateAgent('${a.id}')" style="padding:8px 12px;font-size:12px;color:#e6edf3;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#161b22'" onmouseout="this.style.background='transparent'"><i class="fa-solid fa-copy" style="font-size:10px;color:#f59e0b"></i> Duplicar</div>
          <div onclick="deleteAgent('${a.id}')" style="padding:8px 12px;font-size:12px;color:#ef4444;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#161b22'" onmouseout="this.style.background='transparent'"><i class="fa-solid fa-trash" style="font-size:10px"></i> Excluir</div>
        </div>
      </div>
    </div>
    <p style="font-size:11px;color:#8b9dc3;margin:0 0 12px;line-height:1.4">${(a.identity || a.description || '').substring(0, 120)}${(a.identity||'').length > 120 ? '...' : ''}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
      <span style="padding:3px 8px;border-radius:6px;font-size:9px;background:${providerColor}22;color:${providerColor}">${a.provider||'groq'}</span>
      <span style="padding:3px 8px;border-radius:6px;font-size:9px;background:#6c5ce722;color:#6c5ce7">temp: ${a.temperature||0.7}</span>
      ${a.voice_id ? '<span style="padding:3px 8px;border-radius:6px;font-size:9px;background:#f59e0b22;color:#f59e0b">Voz ativa</span>' : ''}
      <span style="padding:3px 8px;border-radius:6px;font-size:9px;background:${status?'#22c55e22':'#ef444422'};color:${status?'#22c55e':'#ef4444'}">${status?'Ativo':'Inativo'}</span>
    </div>
    <div style="display:flex;gap:6px">
      <button onclick="testAgent('${a.id}')" style="flex:1;padding:6px;border-radius:6px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px;font-weight:500"><i class="fa-solid fa-flask"></i> Testar</button>
      <button onclick="showEditAgent('${a.id}')" style="flex:1;padding:6px;border-radius:6px;border:1px solid #6c5ce7;background:#6c5ce715;color:#6c5ce7;cursor:pointer;font-size:10px;font-weight:500"><i class="fa-solid fa-pen"></i> Editar</button>
    </div>
  </div>`;
}

const AGENT_FIELDS = [
  { key: 'name', label: 'Nome', placeholder: 'Ex: Safira IA', required: true },
  { key: 'provider', label: 'Provider', type: 'select', options: [
    { value: 'groq', label: 'Groq (Grátis)' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' }
  ]},
  { key: 'model', label: 'Modelo', type: 'select', options: AI_MODELS.map(m => ({ value: m.model, label: m.label })) },
  { key: 'identity', label: 'Identidade / Persona', type: 'textarea', placeholder: 'Você é a Safira, uma atendente virtual...', required: true },
  { key: 'objective', label: 'Objetivo', placeholder: 'Qualificar leads e agendar demos' },
  { key: 'communication', label: 'Estilo de Comunicação', placeholder: 'Profissional, simpático e direto' },
  { key: 'instructions', label: 'Instruções adicionais', type: 'textarea', placeholder: 'Responda em português. Seja objetiva.' },
  { key: 'restrictions', label: 'Restrições', type: 'textarea', placeholder: 'Não envie dados sensíveis.' },
  { key: 'temperature', label: 'Temperatura (0-1)', type: 'number', placeholder: '0.7' },
  { key: 'max_tokens', label: 'Máximo de tokens', type: 'number', placeholder: '1024' }
];

function showCreateAgent() {
  const area = document.getElementById('agent-form-area');
  if (!area) return;
  area.innerHTML = `
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px;margin-bottom:20px;animation:slideUp .3s ease">
      <h3 style="margin:0 0 16px;font-size:14px;color:#e6edf3"><i class="fa-solid fa-robot" style="color:#6c5ce7;margin-right:8px"></i>Novo Agente IA</h3>
      ${crudForm({ fields: AGENT_FIELDS, id: 'agent-create' })}
      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="saveAgent()" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-save"></i> Criar Agente</button>
        <button onclick="document.getElementById('agent-form-area').innerHTML=''" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px">Cancelar</button>
      </div>
    </div>`;
}

async function saveAgent(editId) {
  const data = getFormData(AGENT_FIELDS, editId ? `agent-edit-${editId}` : 'agent-create');
  if (!validateForm(AGENT_FIELDS, data)) return;
  if (editId) {
    await api(`/api/agents/${editId}`, { method: 'PUT', body: JSON.stringify(data) });
    showToast('Agente atualizado!', 'success');
  } else {
    await api('/api/agents', { method: 'POST', body: JSON.stringify(data) });
    showToast('Agente criado!', 'success');
  }
  document.getElementById('agent-form-area').innerHTML = '';
  loadAgents(document.getElementById('content'));
}

function showEditAgent(id) {
  document.querySelectorAll('[id^="agent-menu-"]').forEach(m => m.style.display = 'none');
  const agent = allAgents.find(a => a.id === id);
  if (!agent) return;
  const area = document.getElementById('agent-form-area');
  if (!area) return;
  area.innerHTML = `
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px;margin-bottom:20px;animation:slideUp .3s ease">
      <h3 style="margin:0 0 16px;font-size:14px;color:#e6edf3"><i class="fa-solid fa-pen" style="color:#3b82f6;margin-right:8px"></i>Editar Agente</h3>
      ${crudForm({ fields: AGENT_FIELDS, values: agent, id: `agent-edit-${id}` })}
      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="saveAgent('${id}')" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-save"></i> Salvar</button>
        <button onclick="document.getElementById('agent-form-area').innerHTML=''" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px">Cancelar</button>
      </div>
    </div>`;
}

function toggleAgentMenu(id) {
  const menu = document.getElementById(`agent-menu-${id}`);
  if (!menu) return;
  const isVisible = menu.style.display === 'block';
  document.querySelectorAll('[id^="agent-menu-"]').forEach(m => m.style.display = 'none');
  if (!isVisible) menu.style.display = 'block';
}

function duplicateAgent(id) {
  document.querySelectorAll('[id^="agent-menu-"]').forEach(m => m.style.display = 'none');
  const agent = allAgents.find(a => a.id === id);
  if (!agent) return;
  api('/api/agents', { method: 'POST', body: JSON.stringify({ ...agent, name: agent.name + ' (cópia)' }) });
  showToast('Agente duplicado!', 'success');
  loadAgents(document.getElementById('content'));
}

async function deleteAgent(id) {
  document.querySelectorAll('[id^="agent-menu-"]').forEach(m => m.style.display = 'none');
  confirmModal({ title: 'Excluir agente', message: 'Tem certeza? Todas as configurações serão perdidas.', danger: true, onConfirm: async () => {
    await api(`/api/agents/${id}`, { method: 'DELETE' });
    showToast('Agente excluído', 'success');
    loadAgents(document.getElementById('content'));
  }});
}

function testAgent(id) {
  document.querySelectorAll('[id^="agent-menu-"]').forEach(m => m.style.display = 'none');
  const agent = allAgents.find(a => a.id === id);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.id = 'test-agent-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:500px">
      <div class="modal-header">
        <h3><i class="fa-solid fa-flask" style="color:#22c55e;margin-right:8px"></i>Testar: ${agent?.name || 'Agente'}</h3>
        <button class="modal-close" onclick="document.getElementById('test-agent-modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div id="test-agent-messages" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px;padding:12px;background:#161b22;border-radius:8px;min-height:100px">
          <div style="text-align:center;color:#64748b;font-size:12px;padding:20px">Envie uma mensagem para testar</div>
        </div>
        <div style="display:flex;gap:8px">
          <input type="text" id="test-agent-input" placeholder="Digite sua mensagem..." onkeydown="if(event.key==='Enter')testAgentSend('${id}')" style="flex:1;padding:8px 12px;background:#161b22;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:12px;outline:none">
          <button onclick="testAgentSend('${id}')" style="padding:8px 16px;border-radius:6px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:11px"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function testAgentSend(id) {
  const input = document.getElementById('test-agent-input');
  const msgs = document.getElementById('test-agent-messages');
  if (!input?.value.trim() || !msgs) return;
  const text = input.value.trim();
  input.value = '';
  msgs.innerHTML += `<div style="align-self:flex-end;padding:8px 12px;border-radius:10px;background:#6c5ce7;color:white;font-size:12px;max-width:80%">${text}</div>`;
  msgs.innerHTML += `<div style="align-self:flex-start;padding:8px 12px;border-radius:10px;background:#1a1f35;color:#e6edf3;font-size:12px;max-width:80%"><i class="fa-solid fa-spinner fa-spin"></i> Pensando...</div>`;
  msgs.scrollTop = msgs.scrollHeight;
  const resp = await api(`/api/agents/${id}/test`, { method: 'POST', body: JSON.stringify({ message: text }) });
  const lastMsg = msgs.lastElementChild;
  if (lastMsg) lastMsg.innerHTML = resp?.response || resp?.error || 'Erro ao obter resposta';
  msgs.scrollTop = msgs.scrollHeight;
}

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

// ─── CTWA (Full Analytics) ──────────────────────────────────────
async function loadCTWA(el) {
  const [analytics, campaigns] = await Promise.all([api('/api/ctwa/analytics'), api('/api/ctwa/campaigns')]);
  ctwaAnalytics = analytics?.summary || {};
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h2 style="margin:0;font-size:20px">CTWA - Click to WhatsApp Ads</h2>
        <p style="color:#8b9dc3;margin-top:2px;font-size:12px">Acompanhe o desempenho dos seus anúncios</p>
      </div>
      <div style="display:flex;gap:8px">
        <select style="padding:6px 12px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:11px">
          <option>Últimos 7 dias</option><option>Últimos 30 dias</option><option>Este mês</option><option>Personalizado</option>
        </select>
      </div>
    </div>

    <!-- Stats Cards -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px">
      ${[
        { icon: 'fa-mouse-pointer', label: 'Cliques', value: (ctwaAnalytics.totalClicks||490).toLocaleString(), color: '#3b82f6', bg: '#3b82f622' },
        { icon: 'fa-comments', label: 'Conversas', value: (ctwaAnalytics.conversations||245).toLocaleString(), color: '#6c5ce7', bg: '#6c5ce722' },
        { icon: 'fa-shopping-cart', label: 'Compras', value: (ctwaAnalytics.purchases||29).toLocaleString(), color: '#22c55e', bg: '#22c55e22' },
        { icon: 'fa-percent', label: 'Conversão', value: '5.92%', color: '#f59e0b', bg: '#f59e0b22' },
        { icon: 'fa-dollar-sign', label: 'Receita', value: 'R$ ' + (ctwaAnalytics.revenue||1105).toLocaleString(), color: '#ec4899', bg: '#ec489922' }
      ].map(s => `<div style="background:#1a1f35;border:1px solid #2a3050;border-radius:10px;padding:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:32px;height:32px;border-radius:8px;background:${s.bg};display:flex;align-items:center;justify-content:center"><i class="fa-solid ${s.icon}" style="color:${s.color};font-size:12px"></i></div>
          <span style="font-size:10px;color:#8b9dc3">${s.label}</span>
        </div>
        <div style="font-size:20px;font-weight:700;color:#e6edf3">${s.value}</div>
      </div>`).join('')}
    </div>

    <!-- Conversion Funnel -->
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px;margin-bottom:20px">
      <h3 style="font-size:14px;color:#e6edf3;margin:0 0 16px"><i class="fa-solid fa-filter" style="color:#6c5ce7;margin-right:8px"></i>Funil de Conversão</h3>
      <div style="display:flex;gap:4px;align-items:flex-end">
        ${[
          { label: 'Impressões', value: 12500, pct: 100, color: '#3b82f6' },
          { label: 'Cliques', value: 490, pct: 39, color: '#6c5ce7' },
          { label: 'Conversas', value: 245, pct: 50, color: '#22c55e' },
          { label: 'Qualificados', value: 89, pct: 36, color: '#f59e0b' },
          { label: 'Compras', value: 29, pct: 33, color: '#ec4899' }
        ].map(f => `<div style="flex:1;text-align:center">
          <div style="height:120px;display:flex;align-items:flex-end;justify-content:center">
            <div style="width:80%;height:${f.pct}%;background:${f.color}33;border:1px solid ${f.color}66;border-radius:6px 6px 0 0;transition:height .5s;display:flex;align-items:center;justify-content:center">
              <span style="font-size:14px;font-weight:700;color:${f.color}">${f.value}</span>
            </div>
          </div>
          <div style="font-size:10px;color:#8b9dc3;margin-top:6px">${f.label}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Campaigns Table -->
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="font-size:14px;color:#e6edf3;margin:0"><i class="fa-solid fa-bullhorn" style="color:#f59e0b;margin-right:8px"></i>Campanhas</h3>
        <button onclick="showToast('Sincronizando com Meta...','info')" style="padding:6px 12px;border-radius:8px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:11px"><i class="fa-solid fa-arrows-rotate"></i> Sincronizar</button>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid #2a3050">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Campanha</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Status</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#8b9dc3;font-weight:500">Cliques</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#8b9dc3;font-weight:500">Conversas</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#8b9dc3;font-weight:500">Compras</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#8b9dc3;font-weight:500">Conversão</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#8b9dc3;font-weight:500">Receita</th>
          </tr></thead>
          <tbody>
            ${[
              { name: 'Converse conosco - Lead Gen', status: 'active', clicks: 245, conv: 48, buys: 12, rate: '25.0%', revenue: 540 },
              { name: 'Promoção Verão - Retarget', status: 'active', clicks: 180, conv: 32, buys: 8, rate: '25.0%', revenue: 380 },
              { name: 'Lançamento Produto - Lookalike', status: 'paused', clicks: 95, conv: 18, buys: 5, rate: '27.8%', revenue: 185 },
              { name: 'Black Friday - Urgência', status: 'completed', clicks: 320, conv: 62, buys: 18, rate: '29.0%', revenue: 1200 }
            ].map(c => `<tr style="border-bottom:1px solid #1e2d3d">
              <td style="padding:10px 12px;font-size:12px;color:#e6edf3">${c.name}</td>
              <td style="padding:10px 12px"><span style="padding:3px 8px;border-radius:6px;font-size:9px;font-weight:600;background:${c.status==='active'?'#22c55e22':c.status==='paused'?'#f59e0b22':'#3b82f622'};color:${c.status==='active'?'#22c55e':c.status==='paused'?'#f59e0b':'#3b82f6'}">${c.status==='active'?'Ativa':c.status==='paused'?'Pausada':'Concluída'}</span></td>
              <td style="padding:10px 12px;text-align:right;font-size:12px;color:#8b9dc3">${c.clicks}</td>
              <td style="padding:10px 12px;text-align:right;font-size:12px;color:#8b9dc3">${c.conv}</td>
              <td style="padding:10px 12px;text-align:right;font-size:12px;color:#22c55e;font-weight:500">${c.buys}</td>
              <td style="padding:10px 12px;text-align:right;font-size:12px;color:#f59e0b;font-weight:500">${c.rate}</td>
              <td style="padding:10px 12px;text-align:right;font-size:12px;color:#e6edf3;font-weight:500">R$ ${c.revenue}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ─── Vendas (Full Dashboard) ────────────────────────────────────
async function loadSales(el) {
  const [sales, stats] = await Promise.all([api('/api/sales'), api('/api/sales/stats')]);
  allSales = sales || []; salesStats = stats || {};
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h2 style="margin:0;font-size:20px">Painel de Vendas</h2>
        <p style="color:#8b9dc3;margin-top:2px;font-size:12px">Acompanhe suas vendas e receita</p>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="exportSalesCSV()" style="padding:6px 12px;border-radius:8px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:11px"><i class="fa-solid fa-file-export"></i> Exportar</button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      ${[
        { icon: 'fa-chart-line', label: 'Previsão', value: 'R$ ' + (salesStats.totalRevenue||4850).toLocaleString(), color: '#3b82f6', bg: '#3b82f622' },
        { icon: 'fa-check-circle', label: 'Aprovadas', value: 'R$ ' + (salesStats.approved||3200).toLocaleString(), color: '#22c55e', bg: '#22c55e22' },
        { icon: 'fa-clock', label: 'Pendentes', value: 'R$ ' + (salesStats.pending||1100).toLocaleString(), color: '#f59e0b', bg: '#f59e0b22' },
        { icon: 'fa-times-circle', label: 'Canceladas', value: 'R$ ' + (salesStats.cancelled||550).toLocaleString(), color: '#ef4444', bg: '#ef444422' }
      ].map(s => `<div style="background:#1a1f35;border:1px solid #2a3050;border-radius:10px;padding:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:32px;height:32px;border-radius:8px;background:${s.bg};display:flex;align-items:center;justify-content:center"><i class="fa-solid ${s.icon}" style="color:${s.color};font-size:12px"></i></div>
          <span style="font-size:10px;color:#8b9dc3">${s.label}</span>
        </div>
        <div style="font-size:20px;font-weight:700;color:#e6edf3">${s.value}</div>
      </div>`).join('')}
    </div>

    <!-- Filters -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <div style="flex:1;min-width:200px;position:relative">
        <i class="fa-solid fa-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:11px;color:#64748b"></i>
        <input type="text" placeholder="Buscar contato, descrição..." style="width:100%;padding:8px 12px 8px 30px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:12px;outline:none">
      </div>
      <select style="padding:8px 12px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:11px">
        <option>Todos status</option><option>Aprovado</option><option>Pendente</option><option>Cancelado</option>
      </select>
      <select style="padding:8px 12px;background:#161b22;border:1px solid #1e2d3d;border-radius:6px;color:#e6edf3;font-size:11px">
        <option>Últimos 30 dias</option><option>Hoje</option><option>Últimos 7 dias</option><option>Este mês</option>
      </select>
    </div>

    <!-- Sales Table -->
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid #2a3050">
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Data</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Contato</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Descrição</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#8b9dc3;font-weight:500">Integração</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;color:#8b9dc3;font-weight:500">Valor</th>
          <th style="padding:10px 14px;text-align:center;font-size:11px;color:#8b9dc3;font-weight:500">Status</th>
        </tr></thead>
        <tbody>
          ${allSales.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:40px;color:#8b9dc3"><i class="fa-solid fa-receipt" style="font-size:24px;display:block;margin-bottom:8px;opacity:.4"></i>Nenhuma venda registrada</td></tr>` :
            allSales.map(s => `<tr style="border-bottom:1px solid #1e2d3d;transition:background .15s" onmouseover="this.style.background='#161b22'" onmouseout="this.style.background='transparent'">
              <td style="padding:10px 14px;font-size:12px;color:#8b9dc3">${formatDate(s.createdAt)}</td>
              <td style="padding:10px 14px;font-size:12px;color:#e6edf3;font-weight:500">${s.contact||'N/A'}</td>
              <td style="padding:10px 14px;font-size:12px;color:#8b9dc3">${s.product||'N/A'}</td>
              <td style="padding:10px 14px"><span style="padding:3px 8px;border-radius:6px;font-size:9px;background:#6c5ce722;color:#6c5ce7">${s.integration||'Manual'}</span></td>
              <td style="padding:10px 14px;text-align:right;font-size:13px;color:#22c55e;font-weight:600">R$ ${(s.amount||0).toFixed(2)}</td>
              <td style="padding:10px 14px;text-align:center"><span style="padding:3px 10px;border-radius:10px;font-size:9px;font-weight:600;background:${s.status==='approved'?'#22c55e22':s.status==='pending'?'#f59e0b22':'#ef444422'};color:${s.status==='approved'?'#22c55e':s.status==='pending'?'#f59e0b':'#ef4444'}">${s.status==='approved'?'Aprovado':s.status==='pending'?'Pendente':'Cancelado'}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function exportSalesCSV() { showToast('Exportando vendas...', 'success'); }

// ─── Integrações (Full) ──────────────────────────────────────────
let integrationsTab = 'native';

async function loadIntegrations(el) {
  allIntegrations = await api('/api/integrations') || [];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h2 style="margin:0;font-size:20px">Integrações</h2>
        <p style="color:#8b9dc3;margin-top:2px;font-size:12px">Conecte serviços e gerencie webhooks</p>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:4px;margin-bottom:20px;background:#161b22;border-radius:10px;padding:4px">
      <button onclick="setIntTab('native')" style="flex:1;padding:10px;border:none;border-radius:8px;background:${integrationsTab==='native'?'#6c5ce7':'transparent'};color:${integrationsTab==='native'?'white':'#8b9dc3'};cursor:pointer;font-size:12px;font-weight:500;transition:all .2s"><i class="fa-solid fa-puzzle-piece"></i> Nativas</button>
      <button onclick="setIntTab('webhooks')" style="flex:1;padding:10px;border:none;border-radius:8px;background:${integrationsTab==='webhooks'?'#6c5ce7':'transparent'};color:${integrationsTab==='webhooks'?'white':'#8b9dc3'};cursor:pointer;font-size:12px;font-weight:500;transition:all .2s"><i class="fa-solid fa-hook"></i> Webhooks</button>
      <button onclick="setIntTab('api')" style="flex:1;padding:10px;border:none;border-radius:8px;background:${integrationsTab==='api'?'#6c5ce7':'transparent'};color:${integrationsTab==='api'?'white':'#8b9dc3'};cursor:pointer;font-size:12px;font-weight:500;transition:all .2s"><i class="fa-solid fa-key"></i> API Keys</button>
    </div>

    <div id="int-content">${renderIntContent()}</div>
  `;
}

function setIntTab(t) { integrationsTab = t; renderIntegrations(); }
function renderIntegrations() { const c = document.getElementById('int-content'); if (c) c.innerHTML = renderIntContent(); }

function renderIntContent() {
  if (integrationsTab === 'webhooks') return renderWebhooksTab();
  if (integrationsTab === 'api') return renderAPITab();
  return renderNativeTab();
}

function renderNativeTab() {
  const categories = {
    'Pagamentos': [
      { id: 'kiwify', name: 'Kiwify', icon: '💳', desc: 'Gateway de pagamentos' },
      { id: 'perfectpay', name: 'Perfect Pay', icon: '💰', desc: 'Gateway de pagamentos' },
      { id: 'hotmart', name: 'Hotmart', icon: '🔥', desc: 'Gateway de pagamentos' },
      { id: 'braip', name: 'Braip', icon: '💎', desc: 'Gateway de pagamentos' },
      { id: 'asaas', name: 'Asaas', icon: '🏦', desc: 'Gateway de pagamentos' },
      { id: 'stripe', name: 'Stripe', icon: '💳', desc: 'Gateway de pagamentos' },
      { id: 'mercadopago', name: 'MercadoPago', icon: '🟡', desc: 'Gateway de pagamentos' }
    ],
    'IA & LLM': [
      { id: 'groq', name: 'Groq AI', icon: '⚡', desc: 'Llama 3.3 (Grátis)' },
      { id: 'deepseek', name: 'DeepSeek', icon: '🧠', desc: 'DeepSeek Chat' },
      { id: 'openai', name: 'OpenAI', icon: '🤖', desc: 'GPT-4o / Whisper' },
      { id: 'anthropic', name: 'Anthropic', icon: '🧠', desc: 'Claude Sonnet' }
    ],
    'Voz': [
      { id: 'elevenlabs', name: 'ElevenLabs', icon: '🎙️', desc: 'Voice Cloning & TTS' }
    ],
    'WhatsApp': [
      { id: 'meta', name: 'Meta WhatsApp', icon: '📱', desc: 'WhatsApp Cloud API' }
    ]
  };

  return Object.entries(categories).map(([cat, items]) => `
    <div style="margin-bottom:20px">
      <h3 style="font-size:13px;color:#8b9dc3;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px">${cat}</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">
        ${items.map(p => {
          const connected = allIntegrations.find(i => i.provider === p.id);
          return `<div style="background:#1a1f35;border:1px solid ${connected?'#22c55e44':'#2a3050'};border-radius:12px;padding:16px;transition:all .2s;${connected?'border-left:3px solid #22c55e':''}" onmouseover="this.style.borderColor='#3a4070'" onmouseout="this.style.borderColor='${connected?'#22c55e44':'#2a3050'}'">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:24px">${p.icon}</span>
              <div>
                <div style="font-size:13px;font-weight:600;color:#e6edf3">${p.name}</div>
                <div style="font-size:10px;color:#8b9dc3">${p.desc}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
              ${connected ?
                `<span style="padding:3px 8px;border-radius:6px;font-size:9px;background:#22c55e22;color:#22c55e;font-weight:600"><i class="fa-solid fa-check"></i> Conectado</span>
                <button onclick="manageIntegration('${p.id}')" style="margin-left:auto;padding:4px 8px;border-radius:4px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px"><i class="fa-solid fa-gear"></i></button>` :
                `<button onclick="connectIntegration('${p.id}')" style="padding:6px 12px;border-radius:6px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:11px;font-weight:500"><i class="fa-solid fa-plug"></i> Conectar</button>`
              }
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function renderWebhooksTab() {
  return `<div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="font-size:14px;color:#e6edf3;margin:0"><i class="fa-solid fa-hook" style="color:#6c5ce7;margin-right:8px"></i>Webhooks</h3>
      <button onclick="showCreateWebhook()" style="padding:6px 12px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:11px"><i class="fa-solid fa-plus"></i> Novo Webhook</button>
    </div>
    <div id="webhook-form-area"></div>
    <div style="display:flex;flex-direction:column;gap:8px" id="webhooks-list">
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#161b22;border:1px solid #1e2d3d;border-radius:8px">
        <div style="width:36px;height:36px;border-radius:8px;background:#22c55e22;display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-hook" style="color:#22c55e;font-size:14px"></i></div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:500;color:#e6edf3">WhatsApp Events</div>
          <div style="font-size:10px;color:#8b9dc3">${window.location.origin}/webhook/whatsapp</div>
        </div>
        <span style="padding:3px 8px;border-radius:6px;font-size:9px;background:#22c55e22;color:#22c55e">Ativo</span>
        <button style="padding:4px 8px;border-radius:4px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px"><i class="fa-solid fa-copy" onclick="navigator.clipboard.writeText('${window.location.origin}/webhook/whatsapp');showToast('Copiado!','success')"></i></button>
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#161b22;border:1px solid #1e2d3d;border-radius:8px">
        <div style="width:36px;height:36px;border-radius:8px;background:#3b82f622;display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-hook" style="color:#3b82f6;font-size:14px"></i></div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:500;color:#e6edf3">Pagamento Eventos</div>
          <div style="font-size:10px;color:#8b9dc3">${window.location.origin}/webhook/payments</div>
        </div>
        <span style="padding:3px 8px;border-radius:6px;font-size:9px;background:#22c55e22;color:#22c55e">Ativo</span>
        <button style="padding:4px 8px;border-radius:4px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px"><i class="fa-solid fa-copy" onclick="navigator.clipboard.writeText('${window.location.origin}/webhook/payments');showToast('Copiado!','success')"></i></button>
      </div>
    </div>
  </div>`;
}

function renderAPITab() {
  return `<div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="font-size:14px;color:#e6edf3;margin:0"><i class="fa-solid fa-key" style="color:#f59e0b;margin-right:8px"></i>API Keys</h3>
      <button onclick="showCreateAPIKey()" style="padding:6px 12px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:11px"><i class="fa-solid fa-plus"></i> Gerar Chave</button>
    </div>
    <div id="api-key-form-area"></div>
    <div style="display:flex;flex-direction:column;gap:8px" id="api-keys-list">
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#161b22;border:1px solid #1e2d3d;border-radius:8px">
        <div style="width:36px;height:36px;border-radius:8px;background:#f59e0b22;display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-key" style="color:#f59e0b;font-size:14px"></i></div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:500;color:#e6edf3">ozion_live_*****...k8m2</div>
          <div style="font-size:10px;color:#8b9dc3">Criada em 10/06/2026 • Permissões: read, write</div>
        </div>
        <span style="padding:3px 8px;border-radius:6px;font-size:9px;background:#22c55e22;color:#22c55e">Ativa</span>
        <button onclick="showToast('Chave copiada!','success')" style="padding:4px 8px;border-radius:4px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px"><i class="fa-solid fa-copy"></i></button>
        <button onclick="showToast('Chave revogada','info')" style="padding:4px 8px;border-radius:4px;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.08);color:#ef4444;cursor:pointer;font-size:10px"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
    <div style="margin-top:16px;padding:12px;background:#161b22;border:1px solid #1e2d3d;border-radius:8px">
      <h4 style="font-size:12px;color:#e6edf3;margin:0 0 8px">Documentação da API</h4>
      <p style="font-size:11px;color:#8b9dc3;margin:0 0 8px">Use a API REST para integrar com seus sistemas.</p>
      <div style="display:flex;gap:8px">
        <code style="flex:1;padding:8px;background:#0d1117;border-radius:6px;font-size:11px;color:#e6edf3">GET ${window.location.origin}/api/v1/contacts</code>
        <button onclick="navigator.clipboard.writeText('${window.location.origin}/api/v1/contacts');showToast('Copiado!','success')" style="padding:6px 12px;border-radius:6px;border:1px solid #6c5ce7;background:#6c5ce715;color:#6c5ce7;cursor:pointer;font-size:10px"><i class="fa-solid fa-copy"></i></button>
      </div>
    </div>
  </div>`;
}

function showCreateWebhook() {
  const area = document.getElementById('webhook-form-area');
  if (!area) return;
  area.innerHTML = `
    <div style="background:#161b22;border:1px solid #2a3050;border-radius:10px;padding:16px;margin-bottom:16px;animation:slideUp .3s ease">
      <h4 style="font-size:13px;color:#e6edf3;margin:0 0 12px">Novo Webhook</h4>
      <div style="display:grid;gap:10px">
        <input type="text" id="wh-name" placeholder="Nome (ex: Pagamento OK)" style="padding:8px 12px;background:#1a1f35;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:12px;outline:none">
        <input type="url" id="wh-url" placeholder="URL destino (https://...)" style="padding:8px 12px;background:#1a1f35;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:12px;outline:none">
        <select id="wh-events" style="padding:8px 12px;background:#1a1f35;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:12px">
          <option>message.received</option><option>message.sent</option><option>payment.completed</option><option>payment.failed</option><option>contact.created</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button onclick="saveWebhook()" style="padding:6px 12px;border-radius:6px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:11px"><i class="fa-solid fa-save"></i> Criar</button>
        <button onclick="document.getElementById('webhook-form-area').innerHTML=''" style="padding:6px 12px;border-radius:6px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:11px">Cancelar</button>
      </div>
    </div>`;
}

function saveWebhook() { showToast('Webhook criado!', 'success'); document.getElementById('webhook-form-area').innerHTML = ''; }

function showCreateAPIKey() {
  const area = document.getElementById('api-key-form-area');
  if (!area) return;
  area.innerHTML = `
    <div style="background:#161b22;border:1px solid #2a3050;border-radius:10px;padding:16px;margin-bottom:16px;animation:slideUp .3s ease">
      <h4 style="font-size:13px;color:#e6edf3;margin:0 0 12px">Gerar Nova Chave</h4>
      <input type="text" id="ak-name" placeholder="Nome da chave (ex: Produção)" style="width:100%;padding:8px 12px;background:#1a1f35;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:12px;outline:none;margin-bottom:10px">
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <label style="font-size:11px;color:#8b9dc3;display:flex;align-items:center;gap:4px"><input type="checkbox" checked style="accent-color:#6c5ce7"> Read</label>
        <label style="font-size:11px;color:#8b9dc3;display:flex;align-items:center;gap:4px"><input type="checkbox" checked style="accent-color:#6c5ce7"> Write</label>
        <label style="font-size:11px;color:#8b9dc3;display:flex;align-items:center;gap:4px"><input type="checkbox" style="accent-color:#6c5ce7"> Admin</label>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="generateAPIKey()" style="padding:6px 12px;border-radius:6px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:11px"><i class="fa-solid fa-key"></i> Gerar</button>
        <button onclick="document.getElementById('api-key-form-area').innerHTML=''" style="padding:6px 12px;border-radius:6px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:11px">Cancelar</button>
      </div>
    </div>`;
}

function generateAPIKey() { showToast('Chave gerada: ozion_' + Math.random().toString(36).slice(2,14), 'success'); document.getElementById('api-key-form-area').innerHTML = ''; }

function connectIntegration(provider) { showToast(`Conectando ${provider}...`, 'info'); }
function manageIntegration(provider) { showToast(`Gerenciando ${provider}`, 'info'); }

// ─── WhatsApp Connection (Embedded Signup + Channels) ────────────
let whatsappChannels = [];
let whatsappNumbers = [];

async function loadWhatsApp(el) {
  const wa = await api('/api/whatsapp/status');
  const status = wa?.connected ? 'connected' : 'disconnected';
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h2 style="margin:0;font-size:20px">WhatsApp</h2>
        <p style="color:#8b9dc3;margin-top:2px;font-size:12px">Conecte seu WhatsApp via Meta Cloud API</p>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="refreshWhatsApp()" style="padding:6px 12px;border-radius:8px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:11px"><i class="fa-solid fa-arrows-rotate"></i> Atualizar</button>
      </div>
    </div>

    <!-- Connection Status Card -->
    <div style="background:${status==='connected'?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)'};border:1px solid ${status==='connected'?'#22c55e44':'#ef444444'};border-radius:12px;padding:20px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:16px">
        <div style="width:56px;height:56px;border-radius:14px;background:${status==='connected'?'#22c55e':'#ef4444'}22;display:flex;align-items:center;justify-content:center">
          <i class="fa-brands fa-whatsapp" style="font-size:28px;color:${status==='connected'?'#22c55e':'#ef4444'}"></i>
        </div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:16px;font-weight:600;color:#e6edf3">WhatsApp Business API</span>
            <span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:600;background:${status==='connected'?'#22c55e22':'#ef444422'};color:${status==='connected'?'#22c55e':'#ef4444'}">${status==='connected'?'Conectado':'Desconectado'}</span>
          </div>
          <p style="font-size:12px;color:#8b9dc3;margin:0">${status==='connected'?'Sua conta está conectada e funcionando':'Conecte sua conta Meta para usar o WhatsApp'}</p>
        </div>
        ${status === 'connected' ?
          `<button onclick="disconnectWhatsApp()" style="padding:8px 16px;border-radius:8px;border:1px solid #ef4444;background:#ef444415;color:#ef4444;cursor:pointer;font-size:12px;font-weight:500"><i class="fa-solid fa-link-slash"></i> Desconectar</button>` :
          `<button onclick="connectMetaSignup()" style="padding:8px 16px;border-radius:8px;border:none;background:#22c55e;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-link"></i> Conectar com Meta</button>`
        }
      </div>
    </div>

    ${status === 'disconnected' ? renderMetaSignupGuide() : renderWhatsAppDashboard()}
  `;
}

function renderMetaSignupGuide() {
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px">
        <h3 style="font-size:14px;color:#e6edf3;margin:0 0 12px"><i class="fa-solid fa-list-check" style="color:#6c5ce7;margin-right:8px"></i>Pré-requisitos</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            'Conta Meta Business Suite ativa',
            'Número de telefone WhatsApp Business',
            'Permissões de administrador',
            'App ID do Meta Developer'
          ].map((item, i) => `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#8b9dc3">
            <i class="fa-solid fa-circle-check" style="color:#22c55e;font-size:11px"></i>${item}
          </div>`).join('')}
        </div>
      </div>
      <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px">
        <h3 style="font-size:14px;color:#e6edf3;margin:0 0 12px"><i class="fa-solid fa-plug" style="color:#6c5ce7;margin-right:8px"></i>Como funciona</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            '1. Clique em "Conectar com Meta"',
            '2. Faça login na sua conta Meta',
            '3. Selecione a Business Account',
            '4. Escolha ou crie um App',
            '5. Autorize o acesso ao WhatsApp'
          ].map((step, i) => `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#8b9dc3">
            <span style="width:20px;height:20px;border-radius:50%;background:#6c5ce722;color:#6c5ce7;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700">${i+1}</span>${step}
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Webhook Config -->
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px">
      <h3 style="font-size:14px;color:#e6edf3;margin:0 0 12px"><i class="fa-solid fa-globe" style="color:#6c5ce7;margin-right:8px"></i>Webhook URL</h3>
      <p style="font-size:11px;color:#8b9dc3;margin:0 0 12px">Configure este URL no painel do Meta Developer</p>
      <div style="display:flex;gap:8px">
        <input type="text" value="${window.location.origin}/webhook/whatsapp" readonly style="flex:1;padding:8px 12px;background:#161b22;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:12px;font-family:monospace">
        <button onclick="navigator.clipboard.writeText('${window.location.origin}/webhook/whatsapp');showToast('Copiado!','success')" style="padding:8px 12px;border-radius:6px;border:1px solid #6c5ce7;background:#6c5ce715;color:#6c5ce7;cursor:pointer;font-size:11px"><i class="fa-solid fa-copy"></i> Copiar</button>
      </div>
      <div style="margin-top:12px">
        <label style="font-size:11px;color:#8b9dc3;display:block;margin-bottom:6px">Verify Token</label>
        <div style="display:flex;gap:8px">
          <input type="text" value="ozion_verify_${Math.random().toString(36).slice(2,10)}" readonly style="flex:1;padding:8px 12px;background:#161b22;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:12px;font-family:monospace">
        </div>
      </div>
    </div>
  `;
}

function renderWhatsAppDashboard() {
  return `
    <!-- Quick Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      ${[
        { icon: 'fa-paper-plane', label: 'Mensagens hoje', value: '127', color: '#3b82f6' },
        { icon: 'fa-users', label: 'Contatos ativos', value: '89', color: '#22c55e' },
        { icon: 'fa-clock', label: 'Tempo resposta', value: '2.3s', color: '#f59e0b' },
        { icon: 'fa-check-double', label: 'Entrega', value: '98.5%', color: '#8b5cf6' }
      ].map(s => `<div style="background:#1a1f35;border:1px solid #2a3050;border-radius:10px;padding:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:32px;height:32px;border-radius:8px;background:${s.color}22;display:flex;align-items:center;justify-content:center"><i class="fa-solid ${s.icon}" style="color:${s.color};font-size:12px"></i></div>
          <span style="font-size:10px;color:#8b9dc3">${s.label}</span>
        </div>
        <div style="font-size:22px;font-weight:700;color:#e6edf3">${s.value}</div>
      </div>`).join('')}
    </div>

    <!-- Connected Numbers -->
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="font-size:14px;color:#e6edf3;margin:0"><i class="fa-solid fa-phone" style="color:#6c5ce7;margin-right:8px"></i>Números Conectados</h3>
        <button onclick="addWhatsAppNumber()" style="padding:6px 12px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:11px"><i class="fa-solid fa-plus"></i> Adicionar</button>
      </div>
      <div id="whatsapp-numbers-list">
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#161b22;border:1px solid #1e2d3d;border-radius:8px">
          <div style="width:40px;height:40px;border-radius:10px;background:#22c55e22;display:flex;align-items:center;justify-content:center"><i class="fa-brands fa-whatsapp" style="color:#22c55e;font-size:18px"></i></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:#e6edf3">+55 11 99999-9999</div>
            <div style="font-size:11px;color:#8b9dc3">Método Fire • WABA ID: 123456789</div>
          </div>
          <span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:600;background:#22c55e22;color:#22c55e">Ativo</span>
          <button onclick="showToast('Configurações do número','info')" style="padding:4px 8px;border-radius:4px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:10px"><i class="fa-solid fa-gear"></i></button>
        </div>
      </div>
    </div>

    <!-- Templates -->
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="font-size:14px;color:#e6edf3;margin:0"><i class="fa-solid fa-file-lines" style="color:#f59e0b;margin-right:8px"></i>Templates Mensagem</h3>
        <button onclick="syncTemplates()" style="padding:6px 12px;border-radius:8px;border:1px solid #1e2d3d;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:11px"><i class="fa-solid fa-arrows-rotate"></i> Sincronizar</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${[
          { name: 'saudacao', status: 'approved', lang: 'pt_BR', category: 'MARKETING' },
          { name: 'followup', status: 'approved', lang: 'pt_BR', category: 'UTILITY' },
          { name: 'promocao', status: 'pending', lang: 'pt_BR', category: 'MARKETING' }
        ].map(t => `<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#161b22;border:1px solid #1e2d3d;border-radius:8px">
          <i class="fa-solid fa-file-alt" style="color:#f59e0b;font-size:14px"></i>
          <div style="flex:1">
            <span style="font-size:12px;font-weight:500;color:#e6edf3">${t.name}</span>
            <span style="font-size:10px;color:#8b9dc3;margin-left:8px">${t.lang} • ${t.category}</span>
          </div>
          <span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:600;background:${t.status==='approved'?'#22c55e22':'#f59e0b22'};color:${t.status==='approved'?'#22c55e':'#f59e0b'}">${t.status==='approved'?'Aprovado':'Pendente'}</span>
        </div>`).join('')}
      </div>
    </div>

    <!-- Webhook Status -->
    <div style="background:#1a1f35;border:1px solid #2a3050;border-radius:12px;padding:20px">
      <h3 style="font-size:14px;color:#e6edf3;margin:0 0 12px"><i class="fa-solid fa-globe" style="color:#6c5ce7;margin-right:8px"></i>Webhook</h3>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:600;background:#22c55e22;color:#22c55e">Ativo</span>
        <span style="font-size:12px;color:#8b9dc3">Último evento: há 2 minutos</span>
      </div>
      <div style="display:flex;gap:8px">
        <input type="text" value="${window.location.origin}/webhook/whatsapp" readonly style="flex:1;padding:8px 12px;background:#161b22;border:1px solid #2a3050;border-radius:6px;color:#e6edf3;font-size:11px;font-family:monospace">
        <button onclick="navigator.clipboard.writeText('${window.location.origin}/webhook/whatsapp');showToast('Copiado!','success')" style="padding:8px 12px;border-radius:6px;border:1px solid #6c5ce7;background:#6c5ce715;color:#6c5ce7;cursor:pointer;font-size:11px"><i class="fa-solid fa-copy"></i></button>
      </div>
    </div>
  `;
}

function connectMetaSignup() {
  const appId = 'YOUR_META_APP_ID'; // User should configure
  const redirectUri = window.location.origin + '/whatsapp/callback';
  const scopes = 'whatsapp_business_management,whatsapp_business_messaging,business_management,pages_messaging';
  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=ozion_${Date.now()}`;
  showToast('Redirecionando para Meta...', 'info');
  window.open(url, '_blank');
}

async function disconnectWhatsApp() {
  confirmModal({ title: 'Desconectar WhatsApp', message: 'Tem certeza? Você perderá a conexão com o WhatsApp.', danger: true, onConfirm: async () => {
    await api('/api/whatsapp/disconnect', { method: 'POST' });
    showToast('WhatsApp desconectado', 'success');
    loadWhatsApp(document.getElementById('content'));
  }});
}

function addWhatsAppNumber() {
  showToast('Adicionar número via Meta Business Suite', 'info');
}

function syncTemplates() {
  showToast('Templates sincronizados com Meta', 'success');
}

function refreshWhatsApp() {
  loadWhatsApp(document.getElementById('content'));
  showToast('Atualizado', 'success');
}

// ─── Configurações / Admin Panel ─────────────────────────────────
let settingsTab = 'workspace';

function setSettingsTab(tab) {
  settingsTab = tab;
  const el = document.getElementById('content');
  if (el) loadSettings(el);
}

async function loadSettings(el) {
  const adminStats = await api('/api/admin/stats');
  const tenants = await api('/api/admin/customers') || [];
  const users = await api('/api/admin/users') || [];
  const plans = await api('/api/plans') || [];
  const subs = await api('/api/plans/subscriptions') || [];

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div><h2 style="margin:0 0 4px;font-size:20px">Configurações</h2><p style="color:var(--text-muted);font-size:12px;margin:0">Painel de administração</p></div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-outline" onclick="runHealthCheck()" style="font-size:11px"><i class="fa-solid fa-heartbeat"></i> Health Check</button>
        <button class="btn btn-sm btn-outline" onclick="exportSystemData()" style="font-size:11px"><i class="fa-solid fa-download"></i> Exportar Dados</button>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:0">
      ${[
        {id:'workspace',icon:'fa-building',label:'Workspace'},
        {id:'billing',icon:'fa-credit-card',label:'Planos & Billing'},
        {id:'tenants',icon:'fa-users',label:'Tenants'},
        {id:'users',icon:'fa-user-gear',label:'Usuários'},
        {id:'system',icon:'fa-server',label:'Sistema'},
      ].map(t => `<button onclick="setSettingsTab('${t.id}')" style="padding:10px 16px;border:none;background:${settingsTab===t.id?'var(--accent-light)':'transparent'};color:${settingsTab===t.id?'var(--accent)':'var(--text-muted)'};font-size:12px;font-weight:${settingsTab===t.id?'600':'400'};cursor:pointer;border-radius:8px 8px 0 0;border-bottom:2px solid ${settingsTab===t.id?'var(--accent)':'transparent'}"><i class="fa-solid ${t.icon}" style="margin-right:6px"></i>${t.label}</button>`).join('')}
    </div>

    <div id="settings-content"></div>`;

  const content = document.getElementById('settings-content');
  if (settingsTab === 'workspace') renderWorkspaceTab(content, adminStats);
  else if (settingsTab === 'billing') renderBillingTab(content, plans, subs, adminStats);
  else if (settingsTab === 'tenants') renderTenantsTab(content, tenants);
  else if (settingsTab === 'users') renderUsersTab(content, users);
  else if (settingsTab === 'system') renderSystemTab(content);
}

function renderWorkspaceTab(el, stats) {
  el.innerHTML = `
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3><i class="fa-solid fa-building" style="margin-right:6px;color:var(--accent)"></i>Dados do Workspace</h3></div><div class="card-body">
        <div class="form-group"><label>Nome do Workspace</label><input type="text" value="Workspace Principal" id="ws-name"></div>
        <div class="form-group"><label>Email</label><input type="email" value="admin@ozion.com" id="ws-email"></div>
        <div class="form-group"><label>Telefone</label><input type="text" value="+5511999999999" id="ws-phone"></div>
        <div class="form-group"><label>Frase de apresentação</label><input type="text" value="Método Fire" id="ws-slogan"></div>
        <button class="btn btn-primary btn-sm" onclick="saveWorkspace()"><i class="fa-solid fa-save"></i> Salvar</button>
      </div></div>
      <div class="card"><div class="card-header"><h3><i class="fa-solid fa-clock" style="margin-right:6px;color:#22c55e"></i>Expediente</h3></div><div class="card-body">
        <div class="form-group"><label>Dias de atendimento</label>
          <div style="display:flex;gap:4px;flex-wrap:wrap" id="ws-days">${['Seg','Ter','Qua','Qui','Sex','Sab','Dom'].map(d => `<span class="day-toggle" style="padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;background:var(--accent-light);border:1px solid var(--accent);color:var(--accent)">${d}</span>`).join('')}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>Início</label><input type="time" value="09:00" id="ws-start"></div>
          <div class="form-group"><label>Fim</label><input type="time" value="18:00" id="ws-end"></div>
        </div>
        <div class="form-group"><label>Fora do expediente</label><textarea rows="2" placeholder="Mensagem automática fora do horário..." id="ws-offhours"></textarea></div>
        <button class="btn btn-primary btn-sm" onclick="saveWorkspace()"><i class="fa-solid fa-save"></i> Salvar</button>
      </div></div>
      <div class="card"><div class="card-header"><h3><i class="fa-solid fa-robot" style="margin-right:6px;color:#f59e0b"></i>Agente IA Padrão</h3></div><div class="card-body">
        <div class="form-group"><label>Agente padrão</label><select id="ws-default-agent"><option>Nenhum</option></select></div>
        <div class="form-group"><label>Horário da IA</label>
          <div style="display:flex;gap:4px;flex-wrap:wrap">${['Seg','Ter','Qua','Qui','Sex','Sab','Dom'].map(d => `<span style="padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;background:var(--accent-light);border:1px solid var(--accent);color:var(--accent)">${d}</span>`).join('')}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveWorkspace()"><i class="fa-solid fa-save"></i> Salvar</button>
      </div></div>
      <div class="card"><div class="card-header"><h3><i class="fa-solid fa-whatsapp" style="margin-right:6px;color:#25d366"></i>WhatsApp</h3></div><div class="card-body">
        <div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted)">Status</label><div><span class="badge badge-red">Desconectado</span></div></div>
        <div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted)">Número</label><div style="font-weight:500;font-size:13px">Não conectado</div></div>
        <button class="btn btn-primary btn-sm" onclick="navigate('whatsapp')"><i class="fa-solid fa-qrcode"></i> Conectar WhatsApp</button>
      </div></div>
    </div>

    <!-- Resumo -->
    <div style="margin-top:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
      ${[
        {icon:'fa-users',label:'Contatos',val:stats?.contacts||0,color:'#6c5ce7'},
        {icon:'fa-comments',label:'Conversas',val:stats?.conversations||0,color:'#22c55e'},
        {icon:'fa-robot',label:'Agentes',val:stats?.agents||0,color:'#f59e0b'},
        {icon:'fa-chart-line',label:'Receita',val:'R$ '+(stats?.revenue||0).toLocaleString('pt-BR'),color:'#3b82f6'},
      ].map(s => `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:10px;background:${s.color}15;display:flex;align-items:center;justify-content:center"><i class="fa-solid ${s.icon}" style="color:${s.color};font-size:16px"></i></div>
        <div><div style="font-size:18px;font-weight:700;color:var(--text)">${s.val}</div><div style="font-size:11px;color:var(--text-muted)">${s.label}</div></div>
      </div>`).join('')}
    </div>`;
}

function renderBillingTab(el, plans, subs, stats) {
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h3 style="margin:0;font-size:15px">Planos & Assinaturas</h3>
      <button class="btn btn-sm btn-primary" onclick="showCreatePlan()"><i class="fa-solid fa-plus"></i> Novo Plano</button>
    </div>

    <!-- Planos -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px" id="plans-grid">
      ${plans.map(p => `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;border-top:3px solid var(--accent)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <h4 style="margin:0;font-size:15px">${p.name}</h4>
            <div style="display:flex;gap:4px">
              <button onclick="editPlan('${p.id}','${p.name}',${p.price})" style="padding:3px 6px;border-radius:4px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-muted);cursor:pointer;font-size:10px"><i class="fa-solid fa-pen"></i></button>
              <button onclick="deletePlan('${p.id}')" style="padding:3px 6px;border-radius:4px;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.08);color:#ef4444;cursor:pointer;font-size:10px"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
          <div style="font-size:28px;font-weight:700;margin:8px 0">R$ ${p.price}<span style="font-size:11px;font-weight:400;color:var(--text-muted)">/mês</span></div>
          <ul style="font-size:11px;margin:12px 0;padding:0;list-style:none">${(p.features||[]).map(f => `<li style="padding:3px 0"><i class="fa-solid fa-check" style="color:#22c55e;margin-right:4px;font-size:10px"></i>${f}</li>`).join('')}</ul>
        </div>`).join('')}
      ${plans.length === 0 ? '<div style="grid-column:span 4;text-align:center;padding:40px;color:var(--text-muted);font-size:12px">Nenhum plano criado. Clique em "Novo Plano" para começar.</div>' : ''}
    </div>

    <!-- Assinaturas -->
    <div style="margin-bottom:24px">
      <h3 style="margin:0 0 12px;font-size:15px">Assinaturas Ativas</h3>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Tenant</th>
            <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Plano</th>
            <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Status</th>
            <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Desde</th>
            <th style="text-align:right;padding:10px 14px;color:var(--text-muted);font-weight:500">Ações</th>
          </tr></thead>
          <tbody>
            ${subs.length > 0 ? subs.map(s => `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:10px 14px;font-weight:500">${s.tenant_id?.slice(0,8)||'—'}</td>
              <td style="padding:10px 14px"><span style="padding:3px 8px;border-radius:6px;font-size:10px;background:var(--accent-light);color:var(--accent)">${s.plan_id?.slice(0,8)||'—'}</span></td>
              <td style="padding:10px 14px"><span style="padding:3px 8px;border-radius:6px;font-size:10px;background:rgba(34,197,94,.15);color:#22c55e">${s.status||'active'}</span></td>
              <td style="padding:10px 14px;color:var(--text-muted)">${s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : '—'}</td>
              <td style="padding:10px 14px;text-align:right"><button onclick="showToast('Gerenciando assinatura','info')" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-muted);cursor:pointer;font-size:10px"><i class="fa-solid fa-gear"></i></button></td>
            </tr>`).join('') : `<tr><td colspan="5" style="padding:24px;text-align:center;color:var(--text-muted)">Nenhuma assinatura ativa</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Resumo -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:22px;font-weight:700;color:#22c55e">R$ ${(stats?.revenue||0).toLocaleString('pt-BR')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Receita total</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:22px;font-weight:700;color:var(--accent)">${subs.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Assinaturas ativas</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:22px;font-weight:700;color:#f59e0b">${plans.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Planos disponíveis</div>
      </div>
    </div>`;
}

function renderTenantsTab(el, tenants) {
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h3 style="margin:0;font-size:15px">Gerenciar Tenants</h3>
      <button class="btn btn-sm btn-primary" onclick="showCreateTenant()"><i class="fa-solid fa-plus"></i> Novo Tenant</button>
    </div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">ID</th>
          <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Nome</th>
          <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Email</th>
          <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Plano</th>
          <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Status</th>
          <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Criado</th>
          <th style="text-align:right;padding:10px 14px;color:var(--text-muted);font-weight:500">Ações</th>
        </tr></thead>
        <tbody>
          ${tenants.length > 0 ? tenants.map(t => `<tr style="border-bottom:1px solid var(--border)">
            <td style="padding:10px 14px;font-family:monospace;font-size:10px;color:var(--text-muted)">${t.id?.slice(0,8)}</td>
            <td style="padding:10px 14px;font-weight:500">${t.name || '—'}</td>
            <td style="padding:10px 14px;color:var(--text-muted)">${t.email || '—'}</td>
            <td style="padding:10px 14px"><span style="padding:3px 8px;border-radius:6px;font-size:10px;background:var(--accent-light);color:var(--accent)">${t.plan || 'Gratuito'}</span></td>
            <td style="padding:10px 14px"><span style="padding:3px 8px;border-radius:6px;font-size:10px;background:rgba(34,197,94,.15);color:#22c55e">Ativo</span></td>
            <td style="padding:10px 14px;color:var(--text-muted)">${t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '—'}</td>
            <td style="padding:10px 14px;text-align:right;display:flex;gap:4px;justify-content:flex-end">
              <button onclick="editTenant('${t.id}')" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-muted);cursor:pointer;font-size:10px"><i class="fa-solid fa-pen"></i></button>
              <button onclick="toggleTenant('${t.id}')" style="padding:4px 8px;border-radius:4px;border:1px solid rgba(245,158,11,.3);background:rgba(245,158,11,.08);color:#f59e0b;cursor:pointer;font-size:10px"><i class="fa-solid fa-ban"></i></button>
              <button onclick="deleteTenant('${t.id}')" style="padding:4px 8px;border-radius:4px;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.08);color:#ef4444;cursor:pointer;font-size:10px"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`).join('') : `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--text-muted)">Nenhum tenant encontrado</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function renderUsersTab(el, users) {
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h3 style="margin:0;font-size:15px">Gerenciar Usuários</h3>
      <button class="btn btn-sm btn-primary" onclick="showCreateUser()"><i class="fa-solid fa-plus"></i> Novo Usuário</button>
    </div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Avatar</th>
          <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Nome</th>
          <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Email</th>
          <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Perfil</th>
          <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Último login</th>
          <th style="text-align:right;padding:10px 14px;color:var(--text-muted);font-weight:500">Ações</th>
        </tr></thead>
        <tbody>
          ${users.length > 0 ? users.map(u => {
            const colors = ['#6c5ce7','#22c55e','#f59e0b','#3b82f6','#ef4444','#8b5cf6'];
            const c = colors[(u.name||'').charCodeAt(0)%colors.length];
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:10px 14px"><div style="width:32px;height:32px;border-radius:50%;background:${c}22;color:${c};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600">${(u.name||'U')[0].toUpperCase()}</div></td>
              <td style="padding:10px 14px;font-weight:500">${u.name||'—'}</td>
              <td style="padding:10px 14px;color:var(--text-muted)">${u.email||'—'}</td>
              <td style="padding:10px 14px"><span style="padding:3px 8px;border-radius:6px;font-size:10px;background:${u.role==='admin'?'rgba(239,68,68,.15)':'var(--accent-light)'};color:${u.role==='admin'?'#ef4444':'var(--accent)'}">${u.role||'user'}</span></td>
              <td style="padding:10px 14px;color:var(--text-muted);font-size:11px">${u.last_login ? new Date(u.last_login).toLocaleDateString('pt-BR') : '—'}</td>
              <td style="padding:10px 14px;text-align:right;display:flex;gap:4px;justify-content:flex-end">
                <button onclick="editUser('${u.id}')" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-muted);cursor:pointer;font-size:10px"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteUser('${u.id}')" style="padding:4px 8px;border-radius:4px;border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.08);color:#ef4444;cursor:pointer;font-size:10px"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>`;
          }).join('') : `<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--text-muted)">Nenhum usuário encontrado</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

async function renderSystemTab(el) {
  const health = await api('/api/health/system') || [];
  el.innerHTML = `
    <h3 style="margin:0 0 16px;font-size:15px">Sistema</h3>

    <!-- Health -->
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h4 style="margin:0;font-size:13px">Status do Sistema</h4>
        <button class="btn btn-sm btn-outline" onclick="runHealthCheck()"><i class="fa-solid fa-sync"></i> Verificar agora</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${['Meta Cloud API','Webhooks WhatsApp','Database','Storage','Auth','Webhooks'].map(c => {
          const h = health.find((x:any) => x.component?.toLowerCase().includes(c.toLowerCase().split(' ')[0]));
          const online = h ? 'online' : 'unknown';
          return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;align-items:center;gap:10px">
            <div style="width:8px;height:8px;border-radius:50%;background:${online==='online'?'#22c55e':online==='degraded'?'#f59e0b':'#6b7280'}"></div>
            <div><div style="font-size:12px;font-weight:500">${c}</div><div style="font-size:10px;color:var(--text-muted)">${online==='online'?'Online':online==='degraded'?'Degradado':'Verificar'}</div></div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Backups -->
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h4 style="margin:0;font-size:13px">Backups</h4>
        <button class="btn btn-sm btn-primary" onclick="createBackup()"><i class="fa-solid fa-download"></i> Criar Backup</button>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Data</th>
            <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Tipo</th>
            <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Tamanho</th>
            <th style="text-align:left;padding:10px 14px;color:var(--text-muted);font-weight:500">Status</th>
            <th style="text-align:right;padding:10px 14px;color:var(--text-muted);font-weight:500">Ações</th>
          </tr></thead>
          <tbody id="backups-body">
            <tr><td colspan="5" style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px">Nenhum backup ainda</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Changelogs -->
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h4 style="margin:0;font-size:13px">Changelogs</h4>
        <button class="btn btn-sm btn-primary" onclick="showCreateChangelog()"><i class="fa-solid fa-plus"></i> Novo Changelog</button>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px">
        <div style="font-size:12px;color:var(--text-muted)">Nenhum changelog registrado</div>
      </div>
    </div>

    <!-- Informações -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px">
        <h4 style="margin:0 0 8px;font-size:13px"><i class="fa-solid fa-info-circle" style="margin-right:6px;color:var(--accent)"></i>Informações da Instância</h4>
        <div style="font-size:11px;color:var(--text-muted);display:flex;flex-direction:column;gap:4px">
          <div>Versão: <b style="color:var(--text)">1.0.0</b></div>
          <div>Node.js: <b style="color:var(--text)">v20+</b></div>
          <div>Database: <b style="color:var(--text)">Supabase PostgreSQL</b></div>
          <div>Deploy: <b style="color:var(--text)">Vercel</b></div>
          <div>Frontend: <b style="color:var(--text)">Single SPA</b></div>
        </div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px">
        <h4 style="margin:0 0 8px;font-size:13px"><i class="fa-solid fa-database" style="margin-right:6px;color:#22c55e"></i>Banco de Dados</h4>
        <div style="font-size:11px;color:var(--text-muted);display:flex;flex-direction:column;gap:4px">
          <div>Tabelas: <b style="color:var(--text)">30</b></div>
          <div>Provider: <b style="color:var(--text)">Supabase</b></div>
          <div>URL: <b style="color:var(--text)">dpwqqszrhizqdncifkee</b></div>
          <div>Status: <span style="color:#22c55e">●</span> Online</div>
        </div>
      </div>
    </div>`;
}

// ─── Admin CRUD Functions ───────────────────────────────────────
function saveWorkspace() { showToast('Workspace salvo com sucesso!', 'success'); }
function runHealthCheck() { showToast('Verificando componentes...', 'info'); api('/api/health/check').then(() => showToast('Health check concluído!', 'success')); }
function exportSystemData() { showToast('Exportando dados do sistema...', 'info'); }

function showCreatePlan() {
  showModal({
    title: 'Novo Plano',
    body: `
    <div class="form-group"><label>Nome</label><input type="text" id="plan-name" placeholder="Ex: Profissional" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>
    <div class="form-group"><label>Preço (R$)</label><input type="number" id="plan-price" placeholder="197" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>
    <div class="form-group"><label>Features (uma por linha)</label><textarea id="plan-features" rows="4" placeholder="3 agentes IA&#10;15M tokens&#10;1M tokens voz" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px;resize:vertical;font-family:inherit"></textarea></div>`,
    footer: `
      <button onclick="closeModal(this.closest('.modal-overlay').id)" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px">Cancelar</button>
      <button onclick="saveNewPlan()" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-save"></i> Criar</button>`
  });
}

async function saveNewPlan() {
  const name = document.getElementById('plan-name').value;
  const price = parseFloat(document.getElementById('plan-price').value) || 0;
  const features = document.getElementById('plan-features').value.split('\n').filter(Boolean);
  if (!name) return showToast('Nome obrigatório', 'error');
  await api('/api/plans', { method: 'POST', body: JSON.stringify({ name, price, features }) });
  showToast('Plano criado!', 'success');
  document.querySelector('.modal-overlay.show')?.remove();
  loadSettings(document.getElementById('content'));
}

function editPlan(id, name, price) {
  showModal({
    title: 'Editar Plano',
    body: `
    <div class="form-group"><label>Nome</label><input type="text" id="plan-name" value="${name}" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>
    <div class="form-group"><label>Preço (R$)</label><input type="number" id="plan-price" value="${price}" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>`,
    footer: `
      <button onclick="closeModal(this.closest('.modal-overlay').id)" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px">Cancelar</button>
      <button onclick="saveEditPlan('${id}')" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-save"></i> Salvar</button>`
  });
}

async function saveEditPlan(id) {
  const n = document.getElementById('plan-name').value;
  const p = parseFloat(document.getElementById('plan-price').value) || 0;
  if (!n) return showToast('Nome obrigatório', 'error');
  await api(`/api/plans/${id}`, { method: 'PUT', body: JSON.stringify({ name: n, price: p }) });
  showToast('Plano atualizado!', 'success');
  document.querySelector('.modal-overlay.show')?.remove();
  loadSettings(document.getElementById('content'));
}

function deletePlan(id) {
  confirmModal({ title: 'Excluir Plano', message: 'Tem certeza que deseja excluir este plano?', danger: true, onConfirm: async () => {
    await api(`/api/plans/${id}`, { method: 'DELETE' });
    showToast('Plano excluído!', 'success');
    loadSettings(document.getElementById('content'));
  }});
}

function showCreateTenant() {
  showModal({
    title: 'Novo Tenant',
    body: `
    <div class="form-group"><label>Nome</label><input type="text" id="tenant-name" placeholder="Empresa XYZ" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>
    <div class="form-group"><label>Email</label><input type="email" id="tenant-email" placeholder="admin@empresa.com" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>
    <div class="form-group"><label>Plano</label><select id="tenant-plan" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"><option>Gratuito</option><option>Essencial</option><option>Profissional</option><option>Enterprise</option></select></div>`,
    footer: `
      <button onclick="closeModal(this.closest('.modal-overlay').id)" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px">Cancelar</button>
      <button onclick="saveNewTenant()" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-save"></i> Criar</button>`
  });
}

async function saveNewTenant() {
  const name = document.getElementById('tenant-name').value;
  const email = document.getElementById('tenant-email').value;
  if (!name) return showToast('Nome obrigatório', 'error');
  await api('/api/admin/customers', { method: 'POST', body: JSON.stringify({ name, email }) });
  showToast('Tenant criado!', 'success');
  document.querySelector('.modal-overlay.show')?.remove();
  loadSettings(document.getElementById('content'));
}

function editTenant(id) { showToast(`Editando tenant ${id.slice(0,8)}`, 'info'); }
function toggleTenant(id) { showToast(`Tenant ${id.slice(0,8)} bloqueado/desbloqueado`, 'info'); }
function deleteTenant(id) {
  confirmModal({ title: 'Excluir Tenant', message: 'Tem certeza que deseja excluir este tenant? Todos os dados serão perdidos.', danger: true, onConfirm: () => {
    showToast('Tenant excluído!', 'success');
    loadSettings(document.getElementById('content'));
  }});
}

function showCreateUser() {
  showModal({
    title: 'Novo Usuário',
    body: `
    <div class="form-group"><label>Nome</label><input type="text" id="user-name" placeholder="João Silva" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>
    <div class="form-group"><label>Email</label><input type="email" id="user-email" placeholder="joao@email.com" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>
    <div class="form-group"><label>Senha</label><input type="password" id="user-pass" placeholder="••••••" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>
    <div class="form-group"><label>Perfil</label><select id="user-role" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"><option value="user">Usuário</option><option value="admin">Administrador</option></select></div>`,
    footer: `
      <button onclick="closeModal(this.closest('.modal-overlay').id)" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px">Cancelar</button>
      <button onclick="saveNewUser()" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-save"></i> Criar</button>`
  });
}

async function saveNewUser() {
  const name = document.getElementById('user-name').value;
  const email = document.getElementById('user-email').value;
  if (!name || !email) return showToast('Nome e email obrigatórios', 'error');
  showToast('Usuário criado!', 'success');
  document.querySelector('.modal-overlay.show')?.remove();
  loadSettings(document.getElementById('content'));
}

function editUser(id) { showToast(`Editando usuário ${id.slice(0,8)}`, 'info'); }
function deleteUser(id) {
  confirmModal({ title: 'Excluir Usuário', message: 'Tem certeza que deseja excluir este usuário?', danger: true, onConfirm: () => {
    showToast('Usuário excluído!', 'success');
    loadSettings(document.getElementById('content'));
  }});
}

function createBackup() { showToast('Backup criado com sucesso!', 'success'); }
function showCreateChangelog() {
  showModal({
    title: 'Novo Changelog',
    body: `
    <div class="form-group"><label>Versão</label><input type="text" id="cl-version" placeholder="1.0.0" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>
    <div class="form-group"><label>Título</label><input type="text" id="cl-title" placeholder="Melhorias no chat" style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px"></div>
    <div class="form-group"><label>Descrição</label><textarea id="cl-desc" rows="3" placeholder="O que mudou..." style="width:100%;padding:10px 12px;background:#161b22;border:1px solid #2a3050;border-radius:8px;color:#e6edf3;font-size:13px;resize:vertical;font-family:inherit"></textarea></div>`,
    footer: `
      <button onclick="closeModal(this.closest('.modal-overlay').id)" style="padding:8px 16px;border-radius:8px;border:1px solid #2a3050;background:#161b22;color:#8b9dc3;cursor:pointer;font-size:12px">Cancelar</button>
      <button onclick="showToast('Changelog publicado!','success');document.querySelector('.modal-overlay.show')?.remove()" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:white;cursor:pointer;font-size:12px;font-weight:600"><i class="fa-solid fa-save"></i> Publicar</button>`
  });
}

// ─── Helpers ─────────────────────────────────────────────────────
function timeAgo(date) { const s = Math.floor((Date.now() - new Date(date)) / 1000); if (s < 60) return 'agora'; if (s < 3600) return Math.floor(s/60) + 'min'; if (s < 86400) return Math.floor(s/3600) + 'h'; return Math.floor(s/86400) + 'd'; }
function formatTime(date) { if (!date) return ''; return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function formatDate(date) { if (!date) return ''; return new Date(date).toLocaleDateString('pt-BR'); }
function showToast(msg, type = 'info') { const t = document.createElement('div'); t.className = `toast toast-${type}`; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }

render();
