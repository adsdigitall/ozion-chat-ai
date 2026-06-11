const API = '';
const TENANT = 'default';
const HEADERS = { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT };

// ─── State ───────────────────────────────────────────────────────
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
  { section: 'AUTOMAÇÃO', items: [
    { id: 'flows', icon: 'fa-diagram-project', label: 'Flow Builder' },
    { id: 'agents', icon: 'fa-robot', label: 'Agentes IA' },
    { id: 'voice', icon: 'fa-microphone', label: 'Voice Studio' },
  ]},
  { section: 'VENDAS & MARKETING', items: [
    { id: 'ctwa', icon: 'fa-bullseye', label: 'CTWA' },
    { id: 'sales', icon: 'fa-dollar-sign', label: 'Vendas' },
    { id: 'analytics', icon: 'fa-chart-bar', label: 'Analytics' },
  ]},
  { section: 'ADMIN', items: [
    { id: 'integrations', icon: 'fa-plug', label: 'Integrações' },
    { id: 'updates', icon: 'fa-download', label: 'Atualizações' },
    { id: 'health', icon: 'fa-heartbeat', label: 'Saúde' },
    { id: 'logs', icon: 'fa-scroll', label: 'Logs' },
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
    <h1>Ozion Chat AI</h1><p>Plataforma SaaS de WhatsApp + CRM + IA</p>
    <div class="form-group"><label>Email</label><input type="email" id="login-email" value="admin@ozion.com"></div>
    <div class="form-group"><label>Senha</label><input type="password" id="login-pass" value="admin123"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="doLogin()"><i class="fa-solid fa-arrow-right"></i> Entrar</button>
    <p style="text-align:center;margin-top:16px;font-size:12px">Demo: admin@ozion.com / admin123</p>
  </div></div>`;
}

function appHTML() {
  return `<div class="app-layout">
    <div class="sidebar">
      <div class="sidebar-logo"><div class="logo-icon">O</div><div><h2>Ozion Chat AI</h2><span>Admin Master</span></div></div>
      <div class="sidebar-nav">${NAV.map(s => `<div class="nav-section"><div class="nav-section-title">${s.section}</div>${s.items.map(i => `<div class="nav-item${currentPage===i.id?' active':''}" onclick="navigate('${i.id}')"><i class="fa-solid ${i.icon}"></i>${i.label}</div>`).join('')}</div>`).join('')}</div>
      <div class="sidebar-footer"><div class="avatar">A</div><div><div style="font-weight:500">Admin Master</div><div style="font-size:11px;color:var(--text-muted)">admin@ozion.com</div></div></div>
    </div>
    <div class="main-content">
      <div class="topbar"><div class="topbar-title" id="topbar-title">Dashboard</div>
        <div class="topbar-actions"><div class="search-box"><i class="fa-solid fa-search"></i><input placeholder="Buscar..."></div>
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
    case 'ctwa': await loadCTWA(el); break;
    case 'sales': await loadSales(el); break;
    case 'analytics': await loadAnalytics(el); break;
    case 'integrations': await loadIntegrations(el); break;
    case 'updates': await loadUpdates(el); break;
    case 'health': await loadHealth(el); break;
    case 'logs': await loadLogs(el); break;
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
  ctwaAnalytics = ctwaData || {};
  
  el.innerHTML = `
    <h2 class="page-title">Dashboard</h2><p class="page-subtitle">Visão geral da plataforma Ozion Chat AI</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-users"></i></div><div class="stat-value">${stats?.contacts?.total||0}</div><div class="stat-label">Contatos</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-comments"></i></div><div class="stat-value">${stats?.conversations?.open||0}</div><div class="stat-label">Conversas Ativas</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-paper-plane"></i></div><div class="stat-value">${stats?.messages?.total||0}</div><div class="stat-label">Mensagens</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-bullseye"></i></div><div class="stat-value">${stats?.ctwa?.clicks||0}</div><div class="stat-label">CTWA Cliques</div></div>
      <div class="stat-card"><div class="stat-icon info"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(stats?.sales?.revenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-chart-line"></i></div><div class="stat-value">${stats?.sales?.approved||0}</div><div class="stat-label">Vendas Aprovadas</div></div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>Conversas Recentes</h3></div><div class="card-body no-padding">
        <table><thead><tr><th>Contato</th><th>Status</th><th>Última Mensagem</th></tr></thead><tbody>
        ${(stats?.recentConversations||[]).map(c => `<tr><td><strong>${c.contact?.name||'Desconhecido'}</strong></td><td><span class="badge badge-${c.status==='open'?'green':'gray'}">${c.status}</span></td><td>${c.isCtwa?'<span class="badge badge-blue">CTWA</span>':''}</td></tr>`).join('')}
        </tbody></table>
      </div></div>
      <div class="card"><div class="card-header"><h3>Resumo CTWA</h3></div><div class="card-body">
        <div class="stats-grid" style="grid-template-columns:1fr 1fr 1fr">
          <div class="stat-card" style="margin:0"><div class="stat-value" style="font-size:22px">${stats?.ctwa?.clicks||0}</div><div class="stat-label">Cliques</div></div>
          <div class="stat-card" style="margin:0"><div class="stat-value" style="font-size:22px">${stats?.ctwa?.leads||0}</div><div class="stat-label">Leads</div></div>
          <div class="stat-card" style="margin:0"><div class="stat-value" style="font-size:22px">${stats?.ctwa?.purchases||0}</div><div class="stat-label">Compras</div></div>
        </div>
      </div></div>
    </div>`;
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
    <h2 class="page-title">Chat ao Vivo</h2>
    <div class="chat-layout">
      <div class="chat-sidebar">
        <div class="chat-tabs">
          <div class="chat-tab active" onclick="filterConvs(this,'all')">Entrada <span class="count">${convStats.inbox||0}</span></div>
          <div class="chat-tab" onclick="filterConvs(this,'waiting')">Esperando <span class="count">${convStats.waiting||0}</span></div>
          <div class="chat-tab" onclick="filterConvs(this,'closed')">Finalizados <span class="count">${convStats.finished||0}</span></div>
        </div>
        <div class="chat-list" id="chat-list">${conversations.map(c => renderConvItem(c)).join('')}</div>
      </div>
      <div class="chat-main" id="chat-main">
        <div class="empty-state"><i class="fa-solid fa-comments"></i><h3>Selecione uma conversa</h3><p>Clique em uma conversa para ver as mensagens</p></div>
      </div>
    </div>`;
}

function renderConvItem(c) {
  const name = c.contact?.name || 'Desconhecido';
  const initial = name.charAt(0).toUpperCase();
  const lastMsg = c.lastMessageAt ? timeAgo(c.lastMessageAt) : '';
  return `<div class="chat-item${selectedConv?.id===c.id?' active':''}" onclick="selectConv('${c.id}')">
    <div class="avatar">${initial}</div>
    <div class="info"><h4>${name}</h4><p>${c.isCtwa?'CTWA - '+c.campaignId:'WhatsApp'}</p></div>
    <div class="meta"><div class="time">${lastMsg}</div>
      ${c.isAiActive?'<span class="badge badge-purple" style="margin-top:4px">IA</span>':''}
      ${c.contact?.tags?.[0]?'<span class="badge badge-blue" style="margin-top:4px">'+c.contact.tags[0]+'</span>':''}
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
      <div><h3 style="font-size:15px">${selectedConv.contact?.name||'Desconhecido'}</h3>
        <span style="font-size:12px;color:var(--text-muted)">${selectedConv.contact?.phone||selectedConv.contactWaId||''}</span>
        ${selectedConv.isCtwa?'<span class="badge badge-blue" style="margin-left:8px">CTWA</span>':''}
      </div>
      <div class="flex gap-8">
        <button class="btn btn-sm btn-secondary" onclick="toggleAI('${id}')"><i class="fa-solid fa-robot"></i> ${selectedConv.isAiActive?'Pausar IA':'Ativar IA'}</button>
        <button class="btn btn-sm btn-secondary" onclick="closeConv('${id}')"><i class="fa-solid fa-check"></i> Finalizar</button>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages">
      ${chatMessages.map(m => `<div class="message ${m.direction}"><div>${m.content}</div><div class="msg-time">${formatTime(m.sentAt)}</div></div>`).join('')}
    </div>
    <div class="chat-input">
      <input type="text" id="chat-input-text" placeholder="Digite sua mensagem..." onkeypress="if(event.key==='Enter')sendMsg('${id}')">
      <button class="btn btn-primary btn-sm" onclick="sendMsg('${id}')"><i class="fa-solid fa-paper-plane"></i></button>
    </div>`;
  
  // Update active state
  document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
  event.target.closest('.chat-item')?.classList.add('active');
  
  // Scroll to bottom
  setTimeout(() => { const mc = document.getElementById('chat-messages'); if (mc) mc.scrollTop = mc.scrollHeight; }, 100);
}

async function sendMsg(convId) {
  const input = document.getElementById('chat-input-text');
  if (!input || !input.value.trim()) return;
  const content = input.value.trim();
  input.value = '';
  
  await api('/api/chat/messages', { method: 'POST', body: JSON.stringify({ conversationId: convId, content }) });
  selectConv(convId);
}

async function toggleAI(convId) {
  await api(`/api/chat/conversations/${convId}/ai-toggle`, { method: 'POST' });
  showToast('IA alternada com sucesso');
  loadChat(document.getElementById('content'));
}

async function closeConv(convId) {
  await api(`/api/chat/conversations/${convId}/status`, { method: 'PUT', body: JSON.stringify({ status: 'closed' }) });
  showToast('Conversa finalizada');
  loadChat(document.getElementById('content'));
}

function filterConvs(tab, status) {
  document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  const list = document.getElementById('chat-list');
  if (!list) return;
  let filtered = conversations;
  if (status === 'waiting') filtered = filtered.filter(c => c.isAiActive);
  else if (status === 'closed') filtered = filtered.filter(c => c.status === 'closed');
  else filtered = filtered.filter(c => c.status === 'open' && !c.isAiActive);
  list.innerHTML = filtered.map(c => renderConvItem(c)).join('') || '<div class="empty-state"><p>Nenhuma conversa encontrada</p></div>';
}

// ─── CRM ─────────────────────────────────────────────────────────
async function loadCRM(el) {
  const [contactData, tagData] = await Promise.all([api('/api/crm/contacts'), api('/api/crm/tags')]);
  allContacts = contactData?.contacts || [];
  allTags = tagData || [];
  
  el.innerHTML = `
    <div class="flex justify-between items-center mb-24">
      <div><h2 class="page-title">CRM</h2><p class="page-subtitle">${allContacts.length} contatos cadastrados</p></div>
      <div class="flex gap-8">
        <button class="btn btn-secondary" onclick="exportCSV()"><i class="fa-solid fa-download"></i> Exportar CSV</button>
        <button class="btn btn-primary" onclick="showAddContact()"><i class="fa-solid fa-plus"></i> Novo Contato</button>
      </div>
    </div>
    <div class="filter-bar">
      <input type="text" placeholder="Buscar contato..." id="crm-search" oninput="filterCRM()">
      <select id="crm-status" onchange="filterCRM()"><option value="">Todos Status</option><option value="new">Novo</option><option value="qualified">Qualificado</option><option value="contacted">Contatado</option><option value="customer">Cliente</option></select>
      <select id="crm-source" onchange="filterCRM()"><option value="">Todas Origens</option><option value="ctwa">CTWA</option><option value="whatsapp">WhatsApp</option><option value="organic">Orgânico</option></select>
    </div>
    <div class="card"><div class="card-body no-padding">
      <div class="table-wrap"><table id="crm-table"><thead><tr>
        <th>Nome</th><th>Telefone</th><th>Email</th><th>Status</th><th>Temperatura</th><th>Score</th><th>Origem</th><th>Tags</th><th>Ações</th>
      </tr></thead><tbody id="crm-tbody">${renderCRMRows(allContacts)}</tbody></table></div>
    </div></div>`;
}

function renderCRMRows(contacts) {
  return contacts.map(c => {
    const tempColors = { quente: 'red', morno: 'yellow', frio: 'blue' };
    const statusColors = { new: 'blue', qualified: 'green', contacted: 'yellow', customer: 'purple' };
    return `<tr>
      <td><strong>${c.name||'Sem nome'}</strong></td>
      <td>${c.phone||'-'}</td>
      <td>${c.email||'-'}</td>
      <td><span class="badge badge-${statusColors[c.leadStatus]||'gray'}">${c.leadStatus||'-'}</span></td>
      <td><span class="badge badge-${tempColors[c.leadTemperature]||'gray'}">${c.leadTemperature||'-'}</span></td>
      <td><div class="progress-bar" style="width:80px"><div class="fill ${c.leadScore>70?'green':c.leadScore>40?'yellow':'red'}" style="width:${c.leadScore||0}%"></div></div><span class="text-sm">${c.leadScore||0}</span></td>
      <td><span class="badge badge-gray">${c.leadSource||'-'}</span></td>
      <td>${(c.tags||[]).slice(0,2).map(t=>`<span class="tag badge-blue">${t}</span>`).join(' ')}</td>
      <td><button class="btn btn-sm btn-secondary btn-icon" onclick="showEditContact('${c.id}')"><i class="fa-solid fa-pen"></i></button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="9" class="empty-state"><p>Nenhum contato encontrado</p></td></tr>';
}

function filterCRM() {
  const search = (document.getElementById('crm-search')?.value||'').toLowerCase();
  const status = document.getElementById('crm-status')?.value;
  const source = document.getElementById('crm-source')?.value;
  let filtered = allContacts;
  if (search) filtered = filtered.filter(c => (c.name||'').toLowerCase().includes(search) || (c.phone||'').includes(search) || (c.email||'').toLowerCase().includes(search));
  if (status) filtered = filtered.filter(c => c.leadStatus === status);
  if (source) filtered = filtered.filter(c => c.leadSource === source);
  document.getElementById('crm-tbody').innerHTML = renderCRMRows(filtered);
}

function showAddContact() {
  showModal('Novo Contato', `
    <div class="form-group"><label>Nome</label><input id="m-name" placeholder="Nome completo"></div>
    <div class="grid-2"><div class="form-group"><label>Telefone</label><input id="m-phone" placeholder="5511999999999"></div>
    <div class="form-group"><label>Email</label><input id="m-email" placeholder="email@email.com"></div></div>
    <div class="grid-2"><div class="form-group"><label>Origem</label><select id="m-source"><option value="ctwa">CTWA</option><option value="whatsapp">WhatsApp</option><option value="organic">Orgânico</option></select></div>
    <div class="form-group"><label>Status</label><select id="m-status"><option value="new">Novo</option><option value="qualified">Qualificado</option></select></div></div>
  `, async () => {
    await api('/api/crm/contacts', { method: 'POST', body: JSON.stringify({ name: document.getElementById('m-name').value, phone: document.getElementById('m-phone').value, email: document.getElementById('m-email').value, leadSource: document.getElementById('m-source').value, leadStatus: document.getElementById('m-status').value }) });
    hideModal(); loadCRM(document.getElementById('content')); showToast('Contato criado!');
  });
}

function showEditContact(id) {
  const c = allContacts.find(x => x.id === id);
  if (!c) return;
  showModal('Editar Contato', `
    <div class="form-group"><label>Nome</label><input id="m-name" value="${c.name||''}"></div>
    <div class="grid-2"><div class="form-group"><label>Telefone</label><input id="m-phone" value="${c.phone||''}"></div>
    <div class="form-group"><label>Email</label><input id="m-email" value="${c.email||''}"></div></div>
    <div class="grid-2"><div class="form-group"><label>Origem</label><select id="m-source"><option value="ctwa"${c.leadSource==='ctwa'?' selected':''}>CTWA</option><option value="whatsapp"${c.leadSource==='whatsapp'?' selected':''}>WhatsApp</option><option value="organic"${c.leadSource==='organic'?' selected':''}>Orgânico</option></select></div>
    <div class="form-group"><label>Status</label><select id="m-status"><option value="new"${c.leadStatus==='new'?' selected':''}>Novo</option><option value="qualified"${c.leadStatus==='qualified'?' selected':''}>Qualificado</option><option value="contacted"${c.leadStatus==='contacted'?' selected':''}>Contatado</option><option value="customer"${c.leadStatus==='customer'?' selected':''}>Cliente</option></select></div></div>
    <div class="form-group"><label>Temperatura</label><select id="m-temp"><option value="quente"${c.leadTemperature==='quente'?' selected':''}>Quente</option><option value="morno"${c.leadTemperature==='morno'?' selected':''}>Morno</option><option value="frio"${c.leadTemperature==='frio'?' selected':''}>Frio</option></select></div>
    <div class="form-group"><label>Score</label><input type="number" id="m-score" value="${c.leadScore||0}" min="0" max="100"></div>
  `, async () => {
    await api(`/api/crm/contacts/${id}`, { method: 'PUT', body: JSON.stringify({ name: document.getElementById('m-name').value, phone: document.getElementById('m-phone').value, email: document.getElementById('m-email').value, leadSource: document.getElementById('m-source').value, leadStatus: document.getElementById('m-status').value, leadTemperature: document.getElementById('m-temp').value, leadScore: parseInt(document.getElementById('m-score').value) }) });
    hideModal(); loadCRM(document.getElementById('content')); showToast('Contato atualizado!');
  });
}

function exportCSV() { window.open('/api/crm/export', '_blank'); }

// ─── Flows ───────────────────────────────────────────────────────
async function loadFlows(el) {
  allFlows = (await api('/api/flows')) || [];
  el.innerHTML = `
    <div class="flex justify-between items-center mb-24">
      <div><h2 class="page-title">Flow Builder</h2><p class="page-subtitle">${allFlows.length} fluxos criados</p></div>
      <button class="btn btn-primary" onclick="showAddFlow()"><i class="fa-solid fa-plus"></i> Novo Fluxo</button>
    </div>
    <div class="grid-3">${allFlows.map(f => `
      <div class="card" style="cursor:pointer" onclick="openFlowEditor('${f.id}')">
        <div class="card-body">
          <div class="flex justify-between items-center mb-8">
            <span class="badge ${f.status==='active'?'badge-green':'badge-yellow'}">${f.status}</span>
            <span class="text-sm text-muted">${f.category||'Geral'}</span>
          </div>
          <h3 style="font-size:16px;margin-bottom:4px">${f.name}</h3>
          <p class="text-sm text-muted" style="margin-bottom:12px">${f.description||'Sem descrição'}</p>
          <div class="flex gap-8">
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();publishFlow('${f.id}')"><i class="fa-solid fa-rocket"></i> Publicar</button>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();duplicateFlow('${f.id}')"><i class="fa-solid fa-copy"></i> Duplicar</button>
            <button class="btn btn-sm btn-danger btn-icon" onclick="event.stopPropagation();deleteFlow('${f.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `).join('')||'<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-diagram-project"></i><h3>Nenhum fluxo criado</h3></div>'}</div>`;
}

async function openFlowEditor(flowId) {
  const flow = allFlows.find(f => f.id === flowId);
  const blocks = (await api(`/api/flows/${flowId}/blocks`)) || [];
  const edges = (await api(`/api/flows/${flowId}/edges`)) || [];
  
  const typeIcons = { content: 'fa-comment', menu: 'fa-list', gpt: 'fa-brain', agent: 'fa-robot', condition: 'fa-code-branch', delay: 'fa-clock', action: 'fa-bolt', transfer: 'fa-share', webhook: 'fa-plug', tag: 'fa-tag' };
  
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="flex justify-between items-center mb-16">
      <div class="flex items-center gap-8">
        <button class="btn btn-sm btn-secondary" onclick="loadFlows(document.getElementById('content'))"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
        <h2>${flow?.name || 'Fluxo'}</h2>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-sm btn-success" onclick="publishFlow('${flowId}')"><i class="fa-solid fa-rocket"></i> Publicar</button>
      </div>
    </div>
    <div class="flow-canvas" id="flow-canvas">
      <div class="flow-toolbar">
        <button class="btn btn-sm btn-secondary" onclick="addFlowBlock('${flowId}','content')"><i class="fa-solid fa-plus"></i> Conteúdo</button>
        <button class="btn btn-sm btn-secondary" onclick="addFlowBlock('${flowId}','gpt')"><i class="fa-solid fa-brain"></i> GPT</button>
        <button class="btn btn-sm btn-secondary" onclick="addFlowBlock('${flowId}','menu')"><i class="fa-solid fa-list"></i> Menu</button>
        <button class="btn btn-sm btn-secondary" onclick="addFlowBlock('${flowId}','condition')"><i class="fa-solid fa-code-branch"></i> Condição</button>
        <button class="btn btn-sm btn-secondary" onclick="addFlowBlock('${flowId}','delay')"><i class="fa-solid fa-clock"></i> Delay</button>
        <button class="btn btn-sm btn-secondary" onclick="addFlowBlock('${flowId}','action')"><i class="fa-solid fa-bolt"></i> Ação</button>
        <button class="btn btn-sm btn-secondary" onclick="addFlowBlock('${flowId}','agent')"><i class="fa-solid fa-robot"></i> Agente IA</button>
        <button class="btn btn-sm btn-secondary" onclick="addFlowBlock('${flowId}','transfer')"><i class="fa-solid fa-share"></i> Transferir</button>
        <button class="btn btn-sm btn-secondary" onclick="addFlowBlock('${flowId}','webhook')"><i class="fa-solid fa-plug"></i> Webhook</button>
        <button class="btn btn-sm btn-secondary" onclick="addFlowBlock('${flowId}','tag')"><i class="fa-solid fa-tag"></i> Tag</button>
      </div>
      <svg id="flow-svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1"></svg>
      ${blocks.map(b => `<div class="flow-block type-${b.type}" style="left:${b.positionX||0}px;top:${b.positionY||0}px" id="fb-${b.id}">
        <div class="block-type"><i class="fa-solid ${typeIcons[b.type]||'fa-cube'}"></i> ${b.type}</div>
        <div class="block-label">${b.label||b.type}</div>
        <div style="position:absolute;top:4px;right:4px"><button class="btn btn-sm btn-danger btn-icon" style="width:20px;height:20px;padding:0;font-size:10px" onclick="event.stopPropagation();deleteFlowBlock('${b.id}','${flowId}')"><i class="fa-solid fa-x"></i></button></div>
      </div>`).join('')}
    </div>`;
  
  // Draw edges
  setTimeout(() => {
    const svg = document.getElementById('flow-svg');
    if (!svg || !edges.length) return;
    edges.forEach(e => {
      const src = document.getElementById('fb-'+e.sourceBlockId);
      const tgt = document.getElementById('fb-'+e.targetBlockId);
      if (!src || !tgt) return;
      const x1 = src.offsetLeft + src.offsetWidth/2;
      const y1 = src.offsetTop + src.offsetHeight;
      const x2 = tgt.offsetLeft + tgt.offsetWidth/2;
      const y2 = tgt.offsetTop;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}`);
      path.setAttribute('stroke','var(--accent)');
      path.setAttribute('stroke-width','2');
      path.setAttribute('fill','none');
      path.setAttribute('stroke-dasharray', e.label ? 'none' : '5,5');
      svg.appendChild(path);
    });
  }, 200);
}

async function addFlowBlock(flowId, type) {
  const labels = { content: 'Conteúdo', menu: 'Menu', gpt: 'GPT', agent: 'Agente IA', condition: 'Condição', delay: 'Delay', action: 'Ação', transfer: 'Transferir', webhook: 'Webhook', tag: 'Tag' };
  const x = 100 + Math.random() * 600;
  const y = 100 + Math.random() * 400;
  await api(`/api/flows/${flowId}/blocks`, { method: 'POST', body: JSON.stringify({ type, label: labels[type] || type, positionX: x, positionY: y, config: {} }) });
  openFlowEditor(flowId);
}

async function deleteFlowBlock(blockId, flowId) {
  await api(`/api/flows/blocks/${blockId}`, { method: 'DELETE' });
  openFlowEditor(flowId);
}

async function publishFlow(id) {
  await api(`/api/flows/${id}/publish`, { method: 'POST' });
  showToast('Fluxo publicado!');
  if (currentPage === 'flows') loadFlows(document.getElementById('content'));
}

async function duplicateFlow(id) {
  await api(`/api/flows/${id}/duplicate`, { method: 'POST' });
  showToast('Fluxo duplicado!');
  loadFlows(document.getElementById('content'));
}

async function deleteFlow(id) {
  if (!confirm('Excluir este fluxo?')) return;
  await api(`/api/flows/${id}`, { method: 'DELETE' });
  showToast('Fluxo excluído');
  loadFlows(document.getElementById('content'));
}

function showAddFlow() {
  showModal('Novo Fluxo', `
    <div class="form-group"><label>Nome</label><input id="m-name" placeholder="Nome do fluxo"></div>
    <div class="form-group"><label>Descrição</label><input id="m-desc" placeholder="Descrição do fluxo"></div>
    <div class="form-group"><label>Categoria</label><select id="m-cat"><option value="vendas">Vendas</option><option value="suporte">Suporte</option><option value="marketing">Marketing</option><option value="geral">Geral</option></select></div>
  `, async () => {
    await api('/api/flows', { method: 'POST', body: JSON.stringify({ name: document.getElementById('m-name').value, description: document.getElementById('m-desc').value, category: document.getElementById('m-cat').value }) });
    hideModal(); loadFlows(document.getElementById('content')); showToast('Fluxo criado!');
  });
}

// ─── Agents ──────────────────────────────────────────────────────
async function loadAgents(el) {
  allAgents = (await api('/api/agents')) || [];
  el.innerHTML = `
    <div class="flex justify-between items-center mb-24">
      <div><h2 class="page-title">Agentes IA</h2><p class="page-subtitle">${allAgents.length} agentes configurados</p></div>
      <button class="btn btn-primary" onclick="showAddAgent()"><i class="fa-solid fa-plus"></i> Novo Agente</button>
    </div>
    <div class="grid-3">${allAgents.map(a => `
      <div class="card">
        <div class="card-body">
          <div class="flex justify-between items-center mb-8">
            <span class="badge ${a.isActive?'badge-green':'badge-gray'}">${a.isActive?'Ativo':'Inativo'}</span>
            <span class="text-sm text-muted">${a.provider} / ${a.model}</span>
          </div>
          <h3 style="margin-bottom:4px">${a.name}</h3>
          <p class="text-sm text-muted mb-16">${a.description||a.identity||''}</p>
          <div class="grid-2" style="margin-bottom:12px">
            <div><span class="text-sm text-muted">Temperatura:</span> <strong>${a.temperature}</strong></div>
            <div><span class="text-sm text-muted">Max Tokens:</span> <strong>${a.maxTokens}</strong></div>
          </div>
          <div class="flex gap-8">
            <button class="btn btn-sm btn-secondary" onclick="showEditAgent('${a.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
            <button class="btn btn-sm btn-primary" onclick="testAgent('${a.id}')"><i class="fa-solid fa-play"></i> Testar</button>
            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteAgent('${a.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `).join('')||'<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-robot"></i><h3>Nenhum agente criado</h3></div>'}</div>`;
}

function showAddAgent() {
  showModal('Novo Agente IA', `
    <div class="form-group"><label>Nome</label><input id="m-name" placeholder="Nome do agente"></div>
    <div class="form-group"><label>Descrição</label><input id="m-desc" placeholder="Descrição"></div>
    <div class="form-group"><label>Identidade</label><textarea id="m-identity" rows="3" placeholder="Você é um assistente virtual..."></textarea></div>
    <div class="grid-2">
      <div class="form-group"><label>Provedor</label><select id="m-provider"><option value="openai">OpenAI</option><option value="gemini">Gemini</option><option value="claude">Claude</option><option value="deepseek">DeepSeek</option><option value="groq">Groq</option></select></div>
      <div class="form-group"><label>Modelo</label><select id="m-model"><option value="gpt-4">GPT-4</option><option value="gpt-4o">GPT-4o</option><option value="gpt-3.5-turbo">GPT-3.5 Turbo</option></select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label>Temperatura</label><input type="number" id="m-temp" value="0.7" min="0" max="2" step="0.1"></div>
      <div class="form-group"><label>Max Tokens</label><input type="number" id="m-tokens" value="1024"></div>
    </div>
  `, async () => {
    await api('/api/agents', { method: 'POST', body: JSON.stringify({ name: document.getElementById('m-name').value, description: document.getElementById('m-desc').value, identity: document.getElementById('m-identity').value, provider: document.getElementById('m-provider').value, model: document.getElementById('m-model').value, temperature: parseFloat(document.getElementById('m-temp').value), maxTokens: parseInt(document.getElementById('m-tokens').value) }) });
    hideModal(); loadAgents(document.getElementById('content')); showToast('Agente criado!');
  });
}

function showEditAgent(id) {
  const a = allAgents.find(x => x.id === id);
  if (!a) return;
  showModal('Editar Agente', `
    <div class="form-group"><label>Nome</label><input id="m-name" value="${a.name}"></div>
    <div class="form-group"><label>Descrição</label><input id="m-desc" value="${a.description||''}"></div>
    <div class="form-group"><label>Identidade</label><textarea id="m-identity" rows="3">${a.identity||''}</textarea></div>
    <div class="form-group"><label>Objetivo</label><textarea id="m-objective" rows="2">${a.objective||''}</textarea></div>
    <div class="form-group"><label>Instruções</label><textarea id="m-instructions" rows="2">${a.instructions||''}</textarea></div>
    <div class="form-group"><label>Restrições</label><textarea id="m-restrictions" rows="2">${a.restrictions||''}</textarea></div>
  `, async () => {
    await api(`/api/agents/${id}`, { method: 'PUT', body: JSON.stringify({ name: document.getElementById('m-name').value, description: document.getElementById('m-desc').value, identity: document.getElementById('m-identity').value, objective: document.getElementById('m-objective').value, instructions: document.getElementById('m-instructions').value, restrictions: document.getElementById('m-restrictions').value }) });
    hideModal(); loadAgents(document.getElementById('content')); showToast('Agente atualizado!');
  });
}

async function testAgent(id) {
  const result = await api(`/api/agents/${id}/test`, { method: 'POST', body: JSON.stringify({ message: 'Olá, tudo bem?' }) });
  if (result) {
    showModal('Teste do Agente', `
      <p><strong>Agente:</strong> ${result.agent}</p>
      <p><strong>Provider:</strong> ${result.provider}</p>
      <p><strong>Modelo:</strong> ${result.model}</p>
      <p><strong>Request:</strong> ${result.request}</p>
      <p><strong>Response:</strong> ${result.response}</p>
      <p><strong>Latência:</strong> ${result.latency}ms</p>
    `);
  }
}

async function deleteAgent(id) {
  if (!confirm('Excluir este agente?')) return;
  await api(`/api/agents/${id}`, { method: 'DELETE' });
  showToast('Agente excluído');
  loadAgents(document.getElementById('content'));
}

// ─── Voice Studio ────────────────────────────────────────────────
async function loadVoice(el) {
  const [voices, providers] = await Promise.all([api('/api/voice'), api('/api/voice/providers')]);
  allVoices = voices || [];
  el.innerHTML = `
    <div class="flex justify-between items-center mb-24">
      <div><h2 class="page-title">Voice Studio</h2><p class="page-subtitle">${allVoices.length} vozes configuradas</p></div>
      <button class="btn btn-primary" onclick="showAddVoice()"><i class="fa-solid fa-plus"></i> Nova Voz</button>
    </div>
    <div class="grid-3 mb-24">${(providers||[]).map(p => `
      <div class="integration-card">
        <div class="integration-icon"><i class="fa-solid fa-microphone"></i></div>
        <div class="integration-info"><h4>${p.name}</h4><p>${p.description}</p></div>
        <span class="badge badge-green">${p.status}</span>
      </div>
    `).join('')}</div>
    <h3 style="margin-bottom:16px">Vozes Configuradas</h3>
    <div class="grid-3">${allVoices.map(v => `
      <div class="card"><div class="card-body">
        <div class="flex justify-between items-center mb-8">
          <span class="badge ${v.isActive?'badge-green':'badge-gray'}">${v.isActive?'Ativa':'Inativa'}</span>
          <span class="text-sm text-muted">${v.provider}</span>
        </div>
        <h3>${v.name}</h3>
        <p class="text-sm text-muted mb-16">ID: ${v.voiceId}</p>
        <div class="flex gap-8">
          <button class="btn btn-sm btn-secondary" onclick="testVoice('${v.provider}','${v.voiceId}','${v.name}')"><i class="fa-solid fa-play"></i> Testar</button>
          <button class="btn btn-sm btn-danger btn-icon" onclick="deleteVoice('${v.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div></div>
    `).join('')||'<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-microphone"></i><h3>Nenhuma voz configurada</h3></div>'}</div>`;
}

function showAddVoice() {
  showModal('Nova Voz', `
    <div class="form-group"><label>Nome</label><input id="m-name" placeholder="Nome da voz"></div>
    <div class="form-group"><label>Provedor</label><select id="m-provider"><option value="elevenlabs">ElevenLabs</option><option value="openai-tts">OpenAI TTS</option><option value="cartesia">Cartesia</option></select></div>
    <div class="form-group"><label>Voice ID</label><input id="m-voiceid" placeholder="ID da voz no provedor"></div>
  `, async () => {
    await api('/api/voice', { method: 'POST', body: JSON.stringify({ name: document.getElementById('m-name').value, provider: document.getElementById('m-provider').value, voiceId: document.getElementById('m-voiceid').value }) });
    hideModal(); loadVoice(document.getElementById('content')); showToast('Voz criada!');
  });
}

async function testVoice(provider, voiceId, name) {
  const result = await api('/api/voice/test', { method: 'POST', body: JSON.stringify({ provider, voiceId, text: 'Olá! Esta é uma teste de voz do Ozion Chat AI.' }) });
  if (result) showToast(`Áudio gerado via ${result.message} (${result.latency}ms)`);
}

async function deleteVoice(id) {
  if (!confirm('Excluir esta voz?')) return;
  await api(`/api/voice/${id}`, { method: 'DELETE' });
  showToast('Voz excluída');
  loadVoice(document.getElementById('content'));
}

// ─── CTWA ────────────────────────────────────────────────────────
async function loadCTWA(el) {
  const [ctwa, analytics] = await Promise.all([api('/api/ctwa/attributions'), api('/api/ctwa/analytics')]);
  ctwaAnalytics = analytics || {};
  el.innerHTML = `
    <h2 class="page-title">CTWA - Click to WhatsApp Ads</h2><p class="page-subtitle">Rastreamento de campanhas Meta Ads</p>
    <div class="stats-grid mb-24">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-mouse-pointer"></i></div><div class="stat-value">${ctwaAnalytics.totalClicks||ctwa?.length||0}</div><div class="stat-label">Cliques</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-user-plus"></i></div><div class="stat-value">${ctwaAnalytics.totalLeads||ctwa?.filter(c=>c.leadQualifiedAt).length||0}</div><div class="stat-label">Leads Qualificados</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-shopping-cart"></i></div><div class="stat-value">${ctwaAnalytics.totalPurchases||ctwa?.filter(c=>c.purchaseAt).length||0}</div><div class="stat-label">Compras</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(ctwaAnalytics.totalRevenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Atribuições CTWA</h3></div><div class="card-body no-padding">
      <div class="table-wrap"><table><thead><tr><th>CTWA CLID</th><th>Campanha</th><th>Anúncio</th><th>Headline</th><th>1ª Mensagem</th><th>Lead Qualificado</th><th>Compra</th><th>Meta CAPI</th></tr></thead><tbody>
      ${(ctwa||[]).map(c => `<tr>
        <td><code style="font-size:11px">${c.ctwaClid}</code></td>
        <td>${c.campaignId||'-'}</td><td>${c.adId||'-'}</td>
        <td>${c.headline||'-'}</td>
        <td>${c.firstMessageAt?formatTime(c.firstMessageAt):'-'}</td>
        <td>${c.leadQualifiedAt?'<span class="badge badge-green">Sim</span>':'<span class="badge badge-gray">Não</span>'}</td>
        <td>${c.purchaseAt?'<span class="badge badge-green">Sim</span>':'<span class="badge badge-gray">Não</span>'}</td>
        <td>${c.conversionSentToMeta?'<span class="badge badge-green">Enviado</span>':'<span class="badge badge-yellow">Pendente</span>'}</td>
      </tr>`).join('')}
      </tbody></table></div>
    </div></div>`;
}

// ─── Sales ───────────────────────────────────────────────────────
async function loadSales(el) {
  const [salesData, stats, byCampaign, byProduct] = await Promise.all([
    api('/api/sales'), api('/api/sales/stats'), api('/api/sales/by-campaign'), api('/api/sales/by-product')
  ]);
  allSales = salesData || [];
  salesStats = stats || {};
  el.innerHTML = `
    <h2 class="page-title">Vendas</h2><p class="page-subtitle">Painel de vendas e receita</p>
    <div class="stats-grid mb-24">
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-check-circle"></i></div><div class="stat-value">${salesStats.approved||0}</div><div class="stat-label">Aprovadas</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-clock"></i></div><div class="stat-value">${salesStats.pending||0}</div><div class="stat-label">Pendentes</div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-times-circle"></i></div><div class="stat-value">${salesStats.cancelled||0}</div><div class="stat-label">Canceladas</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(salesStats.totalRevenue||0).toLocaleString()}</div><div class="stat-label">Receita Total</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-receipt"></i></div><div class="stat-value">R$ ${(salesStats.avgTicket||0).toFixed(2)}</div><div class="stat-label">Ticket Médio</div></div>
    </div>
    <div class="grid-2 mb-24">
      <div class="card"><div class="card-header"><h3>Receita por Campanha</h3></div><div class="card-body">
        ${(byCampaign||[]).map(c => `<div class="flex justify-between items-center mb-8"><span>${c.campaign}</span><strong>R$ ${c.revenue.toLocaleString()}</strong></div>`).join('')||'<p class="text-muted">Nenhum dado disponível</p>'}
      </div></div>
      <div class="card"><div class="card-header"><h3>Receita por Produto</h3></div><div class="card-body">
        ${(byProduct||[]).map(p => `<div class="flex justify-between items-center mb-8"><span>${p.product}</span><strong>R$ ${p.revenue.toLocaleString()}</strong></div>`).join('')||'<p class="text-muted">Nenhum dado disponível</p>'}
      </div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Todas as Vendas</h3></div><div class="card-body no-padding">
      <table><thead><tr><th>Produto</th><th>Valor</th><th>Status</th><th>Provider</th><th>CTWA</th><th>Data</th></tr></thead><tbody>
      ${allSales.map(s => `<tr><td><strong>${s.product||'-'}</strong></td><td>R$ ${(s.amount||0).toFixed(2)}</td><td><span class="badge badge-${s.status==='approved'?'green':s.status==='pending'?'yellow':'red'}">${s.status}</span></td><td>${s.provider||'-'}</td><td>${s.isCtwa?'<span class="badge badge-blue">Sim</span>':'Não'}</td><td>${formatTime(s.soldAt||s.createdAt)}</td></tr>`).join('')}
      </tbody></table>
    </div></div>`;
}

// ─── Analytics ───────────────────────────────────────────────────
async function loadAnalytics(el) {
  const [timeline, funnel] = await Promise.all([api('/api/analytics/timeline'), api('/api/analytics/funnel')]);
  el.innerHTML = `
    <h2 class="page-title">Analytics</h2><p class="page-subtitle">Métricas e performance</p>
    <div class="card mb-24"><div class="card-header"><h3>Mensagens ao Longo do Tempo</h3></div><div class="card-body">
      <div style="display:flex;align-items:flex-end;gap:4px;height:200px">
        ${(timeline||[]).slice(-30).map(d => {
          const max = Math.max(...(timeline||[]).map(t=>t.count));
          const h = max > 0 ? (d.count / max * 180) : 0;
          return `<div style="flex:1;background:var(--accent);border-radius:4px 4px 0 0;height:${h+20}px;min-width:8px;position:relative" title="${d.date}: ${d.count} msgs"><div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font-size:9px;color:var(--text-muted);white-space:nowrap">${d.date.substring(5)}</div></div>`;
        }).join('')}
      </div>
    </div></div>
    <div class="card"><div class="card-header"><h3>Analytics por Fluxo</h3></div><div class="card-body no-padding">
      ${(funnel||[]).length > 0 ? `<table><thead><tr><th>Fluxo</th><th>Status</th><th>Blocos</th><th>Total Entradas</th><th>Total Conversões</th></tr></thead><tbody>
        ${funnel.map(f => `<tr><td><strong>${f.name}</strong></td><td><span class="badge ${f.status==='active'?'badge-green':'badge-yellow'}">${f.status}</span></td><td>${f.blocks?.length||0}</td><td>${f.blocks?.reduce((acc,bl)=>acc+bl.entries,0)||0}</td><td>${f.blocks?.reduce((acc,bl)=>acc+bl.exits,0)||0}</td></tr>`).join('')}
      </tbody></table>` : '<div class="empty-state"><p>Nenhum dado de analytics disponível</p></div>'}
    </div></div>`;
}

// ─── Integrations ────────────────────────────────────────────────
async function loadIntegrations(el) {
  const [integrations, providers] = await Promise.all([api('/api/integrations'), api('/api/integrations/providers')]);
  allIntegrations = integrations || [];
  const providerList = providers || [];
  const statusMap = {};
  allIntegrations.forEach(i => statusMap[i.provider] = i);
  
  el.innerHTML = `
    <h2 class="page-title">Integrações</h2><p class="page-subtitle">Centro de integrações e provedores</p>
    <div class="grid-2">${providerList.map(p => {
      const conn = statusMap[p.id];
      return `<div class="integration-card">
        <div class="integration-icon"><i class="${p.icon}"></i></div>
        <div class="integration-info">
          <h4>${p.name}</h4>
          <p>${p.description}</p>
          <span class="text-sm text-muted">${p.category} · ${p.apiVersion}</span>
        </div>
        <div class="integration-actions">
          <span class="badge ${conn?.status==='connected'?'badge-green':'badge-gray'}">${conn?.status==='connected'?'Conectado':'Não conectado'}</span>
          <button class="btn btn-sm btn-primary" onclick="connectIntegration('${p.id}','${p.name}')"><i class="fa-solid fa-plug"></i></button>
          <button class="btn btn-sm btn-secondary" onclick="testIntegration('${conn?.id||''}','${p.name}')"><i class="fa-solid fa-play"></i></button>
        </div>
      </div>`;
    }).join('')}</div>`;
}

async function connectIntegration(provider, name) {
  showModal(`Conectar ${name}`, `
    <div class="form-group"><label>API Key</label><input id="m-apikey" placeholder="Sua API Key"></div>
    <div class="form-group"><label>Versão</label><input id="m-version" placeholder="Ex: v1"></div>
  `, async () => {
    await api('/api/integrations', { method: 'POST', body: JSON.stringify({ provider, name, status: 'connected', apiVersion: document.getElementById('m-version').value || 'v1', credentials: JSON.stringify({ apiKey: document.getElementById('m-apikey').value }), isActive: true }) });
    hideModal(); loadIntegrations(document.getElementById('content')); showToast('Integração conectada!');
  });
}

async function testIntegration(id, name) {
  if (!id) { showToast('Integração não configurada'); return; }
  const result = await api(`/api/integrations/${id}/test`, { method: 'POST' });
  if (result) showToast(`${name}: ${result.message} (${result.latency}ms)`);
}

// ─── Updates ─────────────────────────────────────────────────────
let updateTab = 'versions';
let allModules = [];
let allDeployments = [];
let allBackups = [];
let allChangelog = [];
let systemInfo = null;

async function loadUpdates(el) {
  const [versions, modules, deployments, backups, changelog, sysInfo] = await Promise.all([
    api('/api/updates'),
    api('/api/deploy/modules'),
    api('/api/deploy/deployments'),
    api('/api/deploy/backups'),
    api('/api/deploy/changelog'),
    api('/api/deploy/system'),
  ]);
  allVersions = versions || [];
  allModules = modules || [];
  allDeployments = deployments || [];
  allBackups = backups || [];
  allChangelog = changelog || [];
  systemInfo = sysInfo;
  
  el.innerHTML = `
    <div class="flex justify-between items-center mb-24">
      <div><h2 class="page-title">Centro de Atualizações</h2><p class="page-subtitle">Deploy, versões, backups e changelog</p></div>
      <div class="flex gap-8">
        <button class="btn btn-primary" onclick="triggerDeploy()"><i class="fa-solid fa-rocket"></i> Deploy Agora</button>
        <button class="btn btn-secondary" onclick="createBackup()"><i class="fa-solid fa-download"></i> Backup</button>
      </div>
    </div>
    
    <div class="stats-grid mb-24">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-code-branch"></i></div><div class="stat-value">${systemInfo?.version||'1.0.0'}</div><div class="stat-label">Versão Atual</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-server"></i></div><div class="stat-value">${systemInfo?.environment||'dev'}</div><div class="stat-label">Ambiente</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-cubes"></i></div><div class="stat-value">${allModules.length}</div><div class="stat-label">Módulos</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-clock-rotate-left"></i></div><div class="stat-value">${allBackups.length}</div><div class="stat-label">Backups</div></div>
      <div class="stat-card"><div class="stat-icon info"><i class="fa-solid fa-rocket"></i></div><div class="stat-value">${allDeployments.length}</div><div class="stat-label">Deploys</div></div>
    </div>
    
    <div class="update-tabs mb-16">
      <div class="update-tab${updateTab==='versions'?' active':''}" onclick="switchUpdateTab('versions')"><i class="fa-solid fa-code-branch"></i> Providers</div>
      <div class="update-tab${updateTab==='modules'?' active':''}" onclick="switchUpdateTab('modules')"><i class="fa-solid fa-cubes"></i> Módulos</div>
      <div class="update-tab${updateTab==='deployments'?' active':''}" onclick="switchUpdateTab('deployments')"><i class="fa-solid fa-rocket"></i> Deploys</div>
      <div class="update-tab${updateTab==='backups'?' active':''}" onclick="switchUpdateTab('backups')"><i class="fa-solid fa-database"></i> Backups</div>
      <div class="update-tab${updateTab==='changelog'?' active':''}" onclick="switchUpdateTab('changelog')"><i class="fa-solid fa-scroll"></i> Changelog</div>
      <div class="update-tab${updateTab==='system'?' active':''}" onclick="switchUpdateTab('system')"><i class="fa-solid fa-gear"></i> Sistema</div>
    </div>
    
    <div id="update-content"></div>`;
    
  renderUpdateContent();
}

function switchUpdateTab(tab) {
  updateTab = tab;
  document.querySelectorAll('.update-tab').forEach(t => t.classList.remove('active'));
  event.target.closest('.update-tab')?.classList.add('active');
  renderUpdateContent();
}

function renderUpdateContent() {
  const el = document.getElementById('update-content');
  if (!el) return;
  
  switch(updateTab) {
    case 'versions': el.innerHTML = renderVersionsTab(); break;
    case 'modules': el.innerHTML = renderModulesTab(); break;
    case 'deployments': el.innerHTML = renderDeploymentsTab(); break;
    case 'backups': el.innerHTML = renderBackupsTab(); break;
    case 'changelog': el.innerHTML = renderChangelogTab(); break;
    case 'system': el.innerHTML = renderSystemTab(); break;
  }
}

function renderVersionsTab() {
  return `<div class="card"><div class="card-header"><h3>Providers Externos</h3><button class="btn btn-sm btn-secondary" onclick="checkAllUpdates()"><i class="fa-solid fa-sync"></i> Verificar Todos</button></div>
  <div class="card-body no-padding">
    <table><thead><tr><th>Provider</th><th>Versão Atual</th><th>Nova Versão</th><th>Status</th><th>Impacto</th><th>Ações</th></tr></thead><tbody>
    ${allVersions.map(v => `<tr>
      <td><strong>${v.provider}</strong></td>
      <td><code>${v.currentVersion}</code></td>
      <td><code>${v.latestVersion||'-'}</code></td>
      <td><span class="badge ${v.status==='up-to-date'?'badge-green':'badge-yellow'}">${v.status==='up-to-date'?'Atualizado':'Disponível'}</span></td>
      <td class="text-sm">${v.impact||'-'}</td>
      <td><div class="flex gap-8">
        <button class="btn btn-sm btn-secondary" onclick="testUpdate('${v.provider}')"><i class="fa-solid fa-play"></i> Testar</button>
        ${v.status!=='up-to-date'?`<button class="btn btn-sm btn-primary" onclick="applyUpdate('${v.provider}')"><i class="fa-solid fa-download"></i> Atualizar</button>`:''}
      </div></td>
    </tr>`).join('')}
    </tbody></table></div></div>`;
}

function renderModulesTab() {
  const statusColors = { active: 'green', inactive: 'yellow', deprecated: 'red' };
  return `<div class="card"><div class="card-header"><h3>Módulos da Plataforma</h3></div>
  <div class="card-body no-padding">
    <table><thead><tr><th>Módulo</th><th>Descrição</th><th>Versão</th><th>Status</th><th>Core</th><th>Ações</th></tr></thead><tbody>
    ${allModules.map(m => `<tr>
      <td><strong>${m.displayName}</strong></td>
      <td class="text-sm">${m.description||'-'}</td>
      <td><code>${m.version}</code></td>
      <td><span class="badge badge-${statusColors[m.status]||'gray'}">${m.status}</span></td>
      <td>${m.isCore?'<i class="fa-solid fa-lock" style="color:var(--primary)"></i> Sim':'Não'}</td>
      <td><div class="flex gap-8">
        <button class="btn btn-sm btn-secondary" onclick="toggleModule('${m.name}')"><i class="fa-solid fa-${m.status==='active'?'pause':'play'}"></i> ${m.status==='active'?'Desativar':'Ativar'}</button>
      </div></td>
    </tr>`).join('')}
    </tbody></table></div></div>`;
}

function renderDeploymentsTab() {
  const statusIcons = { pending: 'fa-clock', building: 'fa-hammer', testing: 'fa-vial', deploying: 'fa-rocket', completed: 'fa-check-circle', failed: 'fa-times-circle', 'rolled-back': 'fa-undo' };
  const statusColors = { pending: 'gray', building: 'yellow', testing: 'blue', deploying: 'purple', completed: 'green', failed: 'red', 'rolled-back': 'yellow' };
  
  return `<div class="card"><div class="card-header"><h3>Histórico de Deploys</h3><button class="btn btn-sm btn-primary" onclick="triggerDeploy()"><i class="fa-solid fa-rocket"></i> Novo Deploy</button></div>
  <div class="card-body no-padding">
    ${allDeployments.length===0?'<div class="empty-state"><i class="fa-solid fa-rocket"></i><h3>Nenhum deploy realizado</h3><p>Clique em "Novo Deploy" para iniciar</p></div>':
    `<table><thead><tr><th>Versão</th><th>Ambiente</th><th>Status</th><th>Branch</th><th>Data</th><th>Ações</th></tr></thead><tbody>
    ${allDeployments.map(d => `<tr>
      <td><strong>v${d.version}</strong></td>
      <td><span class="badge badge-${d.environment==='production'?'blue':d.environment==='staging'?'yellow':'green'}">${d.environment}</span></td>
      <td><span class="badge badge-${statusColors[d.status]||'gray'}"><i class="fa-solid ${statusIcons[d.status]||'fa-circle'}"></i> ${d.status}</span></td>
      <td><code>${d.branch||'-'}</code></td>
      <td class="text-sm">${formatTime(d.createdAt)}</td>
      <td>${d.status==='completed'?'<button class="btn btn-sm btn-secondary" onclick="rollbackDeploy(\''+d.id+'\')"><i class="fa-solid fa-undo"></i> Rollback</button>':''}</td>
    </tr>`).join('')}
    </tbody></table>`}</div></div>`;
}

function renderBackupsTab() {
  return `<div class="card"><div class="card-header"><h3>Backups do Sistema</h3><button class="btn btn-sm btn-primary" onclick="createBackup()"><i class="fa-solid fa-plus"></i> Novo Backup</button></div>
  <div class="card-body no-padding">
    ${allBackups.length===0?'<div class="empty-state"><i class="fa-solid fa-database"></i><h3>Nenhum backup</h3><p>Clique em "Novo Backup" para criar</p></div>':
    `<table><thead><tr><th>Nome</th><th>Tipo</th><th>Status</th><th>Tamanho</th><th>Data</th><th>Ações</th></tr></thead><tbody>
    ${allBackups.map(b => `<tr>
      <td><strong>${b.name}</strong></td>
      <td><span class="badge badge-blue">${b.type}</span></td>
      <td><span class="badge badge-${b.status==='completed'?'green':b.status==='failed'?'red':'yellow'}">${b.status}</span></td>
      <td>${b.size?(b.size/1024/1024).toFixed(2)+'MB':'-'}</td>
      <td class="text-sm">${formatTime(b.createdAt)}</td>
      <td><div class="flex gap-8">
        ${b.status==='completed'?`<button class="btn btn-sm btn-secondary" onclick="restoreBackup('${b.id}')"><i class="fa-solid fa-undo"></i> Restaurar</button>`:''}
        <button class="btn btn-sm btn-danger" onclick="deleteBackup('${b.id}')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`).join('')}
    </tbody></table>`}</div></div>`;
}

function renderChangelogTab() {
  const typeIcons = { feature: '✨', fix: '🐛', improvement: '⚡', breaking: '💥', security: '🔒' };
  return `<div class="card"><div class="card-header"><h3>Changelog da Plataforma</h3><button class="btn btn-sm btn-primary" onclick="showAddChangelog()"><i class="fa-solid fa-plus"></i> Nova Entrada</button></div>
  <div class="card-body">
    ${allChangelog.length===0?'<div class="empty-state"><i class="fa-solid fa-scroll"></i><h3>Sem registros</h3><p>Adicione entradas de changelog</p></div>':
    allChangelog.map(c => `<div class="changelog-item${c.isPublished?' published':''}">
      <div class="changelog-header">
        <span class="changelog-version">v${c.version}</span>
        <span class="changelog-type">${typeIcons[c.type]||'📝'} ${c.type}</span>
        <span class="changelog-module"><i class="fa-solid fa-cube"></i> ${c.module}</span>
        <span class="changelog-date">${formatTime(c.createdAt)}</span>
        ${c.isPublished?'<span class="badge badge-green">Publicado</span>':'<span class="badge badge-yellow">Rascunho</span>'}
      </div>
      <h4>${c.title}</h4>
      <p>${c.description||''}</p>
      <div class="changelog-actions">
        ${!c.isPublished?`<button class="btn btn-sm btn-primary" onclick="publishChangelog('${c.id}')"><i class="fa-solid fa-globe"></i> Publicar</button>`:''}
        <button class="btn btn-sm btn-danger" onclick="deleteChangelog('${c.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('')}
  </div></div>`;
}

function renderSystemTab() {
  if (!systemInfo) return '<div class="empty-state"><p>Carregando...</p></div>';
  return `<div class="grid-2">
    <div class="card"><div class="card-header"><h3>Informações do Sistema</h3></div><div class="card-body">
      <div class="info-row"><label>Versão</label><span>${systemInfo.version}</span></div>
      <div class="info-row"><label>Ambiente</label><span>${systemInfo.environment}</span></div>
      <div class="info-row"><label>Node.js</label><span>${systemInfo.nodeVersion}</span></div>
      <div class="info-row"><label>Plataforma</label><span>${systemInfo.platform}</span></div>
      <div class="info-row"><label>Uptime</label><span>${Math.floor(systemInfo.uptime/60)}min</span></div>
    </div></div>
    <div class="card"><div class="card-header"><h3>Git</h3></div><div class="card-body">
      <div class="info-row"><label>Branch</label><span><code>${systemInfo.git?.branch||'-'}</code></span></div>
      <div class="info-row"><label>Commit</label><span><code>${systemInfo.git?.hash||'-'}</code></span></div>
      <div class="info-row"><label>Último Commit</label><span>${systemInfo.git?.lastCommit||'-'}</span></div>
      <div class="info-row"><label>Memória (RSS)</label><span>${(systemInfo.memory?.rss/1024/1024).toFixed(1)}MB</span></div>
      <div class="info-row"><label>Memória (Heap)</label><span>${(systemInfo.memory?.heapUsed/1024/1024).toFixed(1)}MB</span></div>
    </div></div>
  </div>`;
}

async function testUpdate(provider) {
  const result = await api(`/api/updates/${provider}/test`, { method: 'POST' });
  if (result) showToast(`${provider}: ${result.message}`);
}

async function applyUpdate(provider) {
  if (!confirm(`Aplicar atualização para ${provider}?`)) return;
  await api(`/api/updates/${provider}/apply`, { method: 'POST' });
  showToast('Atualização aplicada!');
  loadUpdates(document.getElementById('content'));
}

async function checkAllUpdates() {
  await api('/api/updates/check', { method: 'POST' });
  showToast('Verificação concluída!');
  loadUpdates(document.getElementById('content'));
}

async function toggleModule(name) {
  const mod = allModules.find(m => m.name === name);
  if (!mod) return;
  const newStatus = mod.status === 'active' ? 'inactive' : 'active';
  await api(`/api/deploy/modules/${name}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
  showToast(`Módulo ${name} ${newStatus==='active'?'ativado':'desativado'}`);
  loadUpdates(document.getElementById('content'));
}

async function triggerDeploy() {
  showModal('Novo Deploy', `
    <div class="form-group"><label>Ambiente</label><select id="m-env"><option value="staging">Staging</option><option value="production">Produção</option></select></div>
    <div class="form-group"><label>Versão</label><input id="m-ver" value="${systemInfo?.version||'1.0.0'}" placeholder="1.0.0"></div>
    <div class="form-group"><label>Branch</label><input id="m-branch" value="${systemInfo?.git?.branch||'main'}" placeholder="main"></div>
    <div class="form-group"><label>Mensagem</label><input id="m-msg" placeholder="Descrição do deploy"></div>
  `, async () => {
    const result = await api('/api/deploy/deploy', { method: 'POST', body: JSON.stringify({
      environment: document.getElementById('m-env').value,
      version: document.getElementById('m-ver').value,
      branch: document.getElementById('m-branch').value,
      commitMessage: document.getElementById('m-msg').value,
    })});
    if (result) { hideModal(); showToast('Deploy iniciado!'); loadUpdates(document.getElementById('content')); }
  });
}

async function rollbackDeploy(id) {
  if (!confirm('Reverter este deploy?')) return;
  await api('/api/deploy/rollback', { method: 'POST', body: JSON.stringify({ deploymentId: id }) });
  showToast('Rollback iniciado!');
  loadUpdates(document.getElementById('content'));
}

async function createBackup() {
  showModal('Novo Backup', `
    <div class="form-group"><label>Tipo</label><select id="m-type"><option value="full">Completo</option><option value="database">Banco de Dados</option><option value="flows">Fluxos</option><option value="agents">Agentes</option><option value="config">Configurações</option><option value="integrations">Integrações</option></select></div>
  `, async () => {
    const result = await api('/api/deploy/backups/create', { method: 'POST', body: JSON.stringify({ type: document.getElementById('m-type').value }) });
    if (result) { hideModal(); showToast('Backup iniciado!'); loadUpdates(document.getElementById('content')); }
  });
}

async function restoreBackup(id) {
  if (!confirm('Restaurar este backup?')) return;
  await api(`/api/deploy/backups/${id}/restore`, { method: 'POST' });
  showToast('Backup restaurado!');
  loadUpdates(document.getElementById('content'));
}

async function deleteBackup(id) {
  if (!confirm('Excluir este backup?')) return;
  await api(`/api/deploy/backups/${id}`, { method: 'DELETE' });
  showToast('Backup excluído!');
  loadUpdates(document.getElementById('content'));
}

function showAddChangelog() {
  showModal('Nova Entrada de Changelog', `
    <div class="form-group"><label>Versão</label><input id="m-ver" value="${systemInfo?.version||'1.0.0'}"></div>
    <div class="form-group"><label>Título</label><input id="m-title" placeholder="Título da mudança"></div>
    <div class="form-group"><label>Descrição</label><textarea id="m-desc" rows="3" placeholder="Descrição detalhada"></textarea></div>
    <div class="grid-2">
      <div class="form-group"><label>Tipo</label><select id="m-type"><option value="feature">Feature</option><option value="fix">Fix</option><option value="improvement">Melhoria</option><option value="breaking">Breaking Change</option><option value="security">Segurança</option></select></div>
      <div class="form-group"><label>Módulo</label><select id="m-module">${allModules.map(m=>`<option value="${m.name}">${m.displayName}</option>`).join('')}</select></div>
    </div>
  `, async () => {
    await api('/api/deploy/changelog', { method: 'POST', body: JSON.stringify({
      version: document.getElementById('m-ver').value,
      title: document.getElementById('m-title').value,
      description: document.getElementById('m-desc').value,
      type: document.getElementById('m-type').value,
      module: document.getElementById('m-module').value,
    })});
    hideModal(); showToast('Entrada criada!'); loadUpdates(document.getElementById('content'));
  });
}

async function publishChangelog(id) {
  await api(`/api/deploy/changelog/${id}/publish`, { method: 'POST' });
  showToast('Publicado!');
  loadUpdates(document.getElementById('content'));
}

async function deleteChangelog(id) {
  if (!confirm('Excluir esta entrada?')) return;
  await api(`/api/deploy/changelog/${id}`, { method: 'DELETE' });
  showToast('Excluído!');
  loadUpdates(document.getElementById('content'));
}

// ─── Health ──────────────────────────────────────────────────────
async function loadHealth(el) {
  const health = (await api('/api/health/system')) || [];
  allHealth = health;
  el.innerHTML = `
    <h2 class="page-title">Painel de Saúde do Sistema</h2><p class="page-subtitle">Status de todos os componentes</p>
    <div class="card mb-24"><div class="card-header"><h3>Status dos Componentes</h3><button class="btn btn-sm btn-secondary" onclick="runHealthCheck()"><i class="fa-solid fa-sync"></i> Verificar Agora</button></div>
    <div class="card-body no-padding">
      ${health.map((h) => `<div class="health-item">
        <div class="health-dot ${h.status}"></div>
        <div class="health-info"><h4>${h.component}</h4><p>${h.message||'Última verificação: '+(h.lastCheckedAt||'Nunca')}</p></div>
        <span class="badge badge-${h.status==='online'?'green':h.status==='error'?'red':'yellow'}">${h.status}</span>
      </div>`).join('')}
    </div></div>`;
}

async function runHealthCheck() {
  await api('/api/health/check', { method: 'POST' });
  showToast('Verificação concluída!');
  loadHealth(document.getElementById('content'));
}

// ─── Logs ────────────────────────────────────────────────────────
async function loadLogs(el) {
  const logs = (await api('/api/logs')) || [];
  allLogs = logs;
  el.innerHTML = `
    <h2 class="page-title">Logs</h2><p class="page-subtitle">${logs.length} registros</p>
    <div class="filter-bar mb-16">
      <select id="log-cat" onchange="filterLogs()"><option value="">Todas Categorias</option><option value="message">Mensagens</option><option value="ai">IA</option><option value="ctwa">CTWA</option><option value="sale">Vendas</option><option value="integration">Integrações</option><option value="voice">Voz</option><option value="flow">Fluxos</option><option value="error">Erros</option></select>
      <select id="log-status" onchange="filterLogs()"><option value="">Todos Status</option><option value="success">Sucesso</option><option value="error">Erro</option></select>
      <button class="btn btn-sm btn-danger" onclick="clearLogs()"><i class="fa-solid fa-trash"></i> Limpar</button>
    </div>
    <div class="card"><div class="card-body no-padding">
      <div class="table-wrap"><table><thead><tr><th>Data</th><th>Categoria</th><th>Ação</th><th>Provider</th><th>Status</th></tr></thead><tbody id="logs-tbody">
      ${logs.map(l => `<tr>
        <td class="text-sm">${formatTime(l.createdAt)}</td>
        <td><span class="badge badge-blue">${l.category}</span></td>
        <td>${l.action}</td>
        <td>${l.provider||'-'}</td>
        <td><span class="badge badge-${l.status==='success'?'green':'red'}">${l.status}</span></td>
      </tr>`).join('')}
      </tbody></table></div>
    </div></div>`;
}

function filterLogs() {
  const cat = document.getElementById('log-cat')?.value;
  const status = document.getElementById('log-status')?.value;
  let filtered = allLogs;
  if (cat) filtered = filtered.filter(l => l.category === cat);
  if (status) filtered = filtered.filter(l => l.status === status);
  const tbody = document.getElementById('logs-tbody');
  if (tbody) tbody.innerHTML = filtered.map(l => `<tr><td class="text-sm">${formatTime(l.createdAt)}</td><td><span class="badge badge-blue">${l.category}</span></td><td>${l.action}</td><td>${l.provider||'-'}</td><td><span class="badge badge-${l.status==='success'?'green':'red'}">${l.status}</span></td></tr>`).join('');
}

async function clearLogs() {
  if (!confirm('Limpar todos os logs?')) return;
  await api('/api/logs/clear', { method: 'DELETE' });
  showToast('Logs limpos');
  loadLogs(document.getElementById('content'));
}

// ─── Plans ───────────────────────────────────────────────────────
async function loadPlans(el) {
  allPlans = (await api('/api/plans')) || [];
  el.innerHTML = `
    <div class="flex justify-between items-center mb-24">
      <div><h2 class="page-title">Planos</h2><p class="page-subtitle">${allPlans.length} planos disponíveis</p></div>
      <button class="btn btn-primary" onclick="showAddPlan()"><i class="fa-solid fa-plus"></i> Novo Plano</button>
    </div>
    <div class="grid-4">${allPlans.map(p => `
      <div class="card">
        <div class="card-body" style="text-align:center;padding:24px">
          <h3 style="margin-bottom:4px">${p.name}</h3>
          <div style="font-size:32px;font-weight:700;margin:16px 0">R$ ${p.price}</div>
          <p class="text-sm text-muted mb-16">/mês</p>
          <div style="text-align:left;margin-bottom:16px">
            <div class="mb-8"><i class="fa-solid fa-check text-success"></i> ${p.maxContacts.toLocaleString()} contatos</div>
            <div class="mb-8"><i class="fa-solid fa-check text-success"></i> ${p.maxFlows} fluxos</div>
            <div class="mb-8"><i class="fa-solid fa-check text-success"></i> ${p.maxAgents} agentes IA</div>
            <div class="mb-8"><i class="fa-solid fa-check text-success"></i> ${p.maxPhoneNumbers} números</div>
            <div class="mb-8"><i class="fa-solid fa-check text-success"></i> ${p.maxUsers} usuários</div>
            <div class="mb-8"><i class="fa-solid fa-check text-success"></i> ${p.maxExecutions.toLocaleString()} execuções</div>
          </div>
          <button class="btn btn-sm btn-secondary" style="width:100%" onclick="showEditPlan('${p.id}')">Editar</button>
        </div>
      </div>
    `).join('')}</div>`;
}

function showAddPlan() {
  showModal('Novo Plano', `
    <div class="grid-2"><div class="form-group"><label>Nome</label><input id="m-name" placeholder="Nome do plano"></div>
    <div class="form-group"><label>Preço (R$/mês)</label><input type="number" id="m-price" value="0"></div></div>
    <div class="form-group"><label>Descrição</label><input id="m-desc" placeholder="Descrição"></div>
    <div class="grid-3">
      <div class="form-group"><label>Contatos</label><input type="number" id="m-contacts" value="1000"></div>
      <div class="form-group"><label>Fluxos</label><input type="number" id="m-flows" value="5"></div>
      <div class="form-group"><label>Agentes IA</label><input type="number" id="m-agents" value="1"></div>
    </div>
  `, async () => {
    await api('/api/plans', { method: 'POST', body: JSON.stringify({ name: document.getElementById('m-name').value, slug: document.getElementById('m-name').value.toLowerCase().replace(/\s/g,'-'), description: document.getElementById('m-desc').value, price: parseFloat(document.getElementById('m-price').value), maxContacts: parseInt(document.getElementById('m-contacts').value), maxFlows: parseInt(document.getElementById('m-flows').value), maxAgents: parseInt(document.getElementById('m-agents').value) }) });
    hideModal(); loadPlans(document.getElementById('content')); showToast('Plano criado!');
  });
}

function showEditPlan(id) {
  const p = allPlans.find(x => x.id === id);
  if (!p) return;
  showModal('Editar Plano', `
    <div class="grid-2"><div class="form-group"><label>Nome</label><input id="m-name" value="${p.name}"></div>
    <div class="form-group"><label>Preço (R$/mês)</label><input type="number" id="m-price" value="${p.price}"></div></div>
    <div class="form-group"><label>Descrição</label><input id="m-desc" value="${p.description||''}"></div>
    <div class="grid-3">
      <div class="form-group"><label>Contatos</label><input type="number" id="m-contacts" value="${p.maxContacts}"></div>
      <div class="form-group"><label>Fluxos</label><input type="number" id="m-flows" value="${p.maxFlows}"></div>
      <div class="form-group"><label>Agentes IA</label><input type="number" id="m-agents" value="${p.maxAgents}"></div>
    </div>
  `, async () => {
    await api(`/api/plans/${id}`, { method: 'PUT', body: JSON.stringify({ name: document.getElementById('m-name').value, description: document.getElementById('m-desc').value, price: parseFloat(document.getElementById('m-price').value), maxContacts: parseInt(document.getElementById('m-contacts').value), maxFlows: parseInt(document.getElementById('m-flows').value), maxAgents: parseInt(document.getElementById('m-agents').value) }) });
    hideModal(); loadPlans(document.getElementById('content')); showToast('Plano atualizado!');
  });
}

// ─── Admin Master ────────────────────────────────────────────────
async function loadAdmin(el) {
  const [customers, workspaces, users, stats] = await Promise.all([
    api('/api/admin/customers'), api('/api/admin/workspaces'), api('/api/admin/users'), api('/api/admin/stats')
  ]);
  allCustomers = customers || [];
  allWorkspaces = workspaces || [];
  allUsers = users || [];
  el.innerHTML = `
    <h2 class="page-title">Admin Master</h2><p class="page-subtitle">Painel administrativo com acesso ilimitado</p>
    <div class="stats-grid mb-24">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-building"></i></div><div class="stat-value">${allCustomers.length}</div><div class="stat-label">Clientes</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-layer-group"></i></div><div class="stat-value">${allWorkspaces.length}</div><div class="stat-label">Workspaces</div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fa-solid fa-users"></i></div><div class="stat-value">${allUsers.length}</div><div class="stat-label">Usuários</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-comments"></i></div><div class="stat-value">${stats?.messages||0}</div><div class="stat-label">Mensagens</div></div>
      <div class="stat-card"><div class="stat-icon info"><i class="fa-solid fa-dollar-sign"></i></div><div class="stat-value">R$ ${(stats?.revenue||0).toLocaleString()}</div><div class="stat-label">Receita</div></div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>Clientes</h3><button class="btn btn-sm btn-primary" onclick="showAddCustomer()"><i class="fa-solid fa-plus"></i></button></div><div class="card-body no-padding">
        <table><thead><tr><th>Nome</th><th>Email</th><th>Plano</th><th>Status</th></tr></thead><tbody>
        ${allCustomers.map(c => `<tr><td><strong>${c.name}</strong></td><td>${c.email}</td><td>${c.planId||'-'}</td><td><span class="badge badge-green">${c.status}</span></td></tr>`).join('')}
        </tbody></table>
      </div></div>
      <div class="card"><div class="card-header"><h3>Workspaces</h3><button class="btn btn-sm btn-primary" onclick="showAddWorkspace()"><i class="fa-solid fa-plus"></i></button></div><div class="card-body no-padding">
        <table><thead><tr><th>Nome</th><th>Slug</th><th>Status</th></tr></thead><tbody>
        ${allWorkspaces.map(w => `<tr><td><strong>${w.name}</strong></td><td>${w.slug}</td><td><span class="badge badge-green">${w.isActive?'Ativo':'Inativo'}</span></td></tr>`).join('')}
        </tbody></table>
      </div></div>
    </div>`;
}

function showAddCustomer() {
  showModal('Novo Cliente', `
    <div class="form-group"><label>Nome</label><input id="m-name" placeholder="Nome da empresa"></div>
    <div class="grid-2"><div class="form-group"><label>Email</label><input id="m-email" placeholder="email@email.com"></div>
    <div class="form-group"><label>Telefone</label><input id="m-phone" placeholder="11999999999"></div></div>
    <div class="form-group"><label>Plano</label><select id="m-plan">${allPlans.map(p=>`<option value="${p.id}">${p.name} - R$${p.price}</option>`).join('')}</select></div>
  `, async () => {
    await api('/api/admin/customers', { method: 'POST', body: JSON.stringify({ name: document.getElementById('m-name').value, email: document.getElementById('m-email').value, phone: document.getElementById('m-phone').value, planId: document.getElementById('m-plan').value }) });
    hideModal(); loadAdmin(document.getElementById('content')); showToast('Cliente criado!');
  });
}

function showAddWorkspace() {
  showModal('Novo Workspace', `
    <div class="form-group"><label>Nome</label><input id="m-name" placeholder="Nome do workspace"></div>
    <div class="form-group"><label>Slug</label><input id="m-slug" placeholder="meu-workspace"></div>
    <div class="form-group"><label>Cliente</label><select id="m-customer">${allCustomers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
  `, async () => {
    await api('/api/admin/workspaces', { method: 'POST', body: JSON.stringify({ name: document.getElementById('m-name').value, slug: document.getElementById('m-slug').value, customerId: document.getElementById('m-customer').value }) });
    hideModal(); loadAdmin(document.getElementById('content')); showToast('Workspace criado!');
  });
}

// ─── Helpers ─────────────────────────────────────────────────────
function showModal(title, content, onConfirm) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="hideModal()">&times;</button></div>
    <div class="modal-body">${content}</div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="hideModal()">Cancelar</button>
      ${onConfirm?'<button class="btn btn-primary" id="modal-confirm">Salvar</button>':''}
    </div>`;
  overlay.classList.add('show');
  if (onConfirm) document.getElementById('modal-confirm').onclick = onConfirm;
}

function hideModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${type==='success'?'fa-check-circle':'fa-exclamation-circle'}"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatTime(dateStr) {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleString('pt-BR'); } catch { return dateStr; }
}

// ─── Init ────────────────────────────────────────────────────────
render();
