// ─── Inbox Real MVP ─────────────────────────────────────────
let inboxConvs = [];
let inboxSelectedConv = null;
let inboxMessages = [];
let inboxContactDetail = null;
let inboxSearch = '';
let inboxPage = 1;
let inboxConvLoading = false;
let inboxMsgLoading = false;
let inboxSending = false;

async function loadInbox(el) {
  el.innerHTML = `<div class="inbox-layout"></div>`;
  await inboxLoadConversations();
  renderInbox();
}

function renderInbox() {
  const layout = document.querySelector('.inbox-layout');
  if (!layout) return;

  layout.innerHTML = `
    <div class="inbox-sidebar">
      <div class="inbox-sidebar-header">
        <i class="fa-solid fa-inbox"></i>
        <span>Inbox</span>
        <span class="inbox-count">${inboxConvs.length}</span>
      </div>
      <div class="inbox-search">
        <i class="fa-solid fa-search"></i>
        <input type="text" placeholder="Buscar conversa..." value="${h(inboxSearch)}" oninput="inboxSearchChange(this.value)">
      </div>
      <div class="inbox-conv-list">
        ${inboxConvLoading ? renderInboxLoading() : inboxConvs.length === 0 ? renderInboxEmpty() : inboxConvs.map(c => renderInboxConvItem(c)).join('')}
      </div>
    </div>
    <div class="inbox-main">
      ${inboxSelectedConv ? `
        <div class="inbox-main-header">
          <button class="inbox-back-btn" onclick="inboxSelectConv(null)"><i class="fa-solid fa-arrow-left"></i></button>
          <div class="inbox-main-avatar" style="background:${getAvatarColor(inboxSelectedConv.contact_name || '')}">${(inboxSelectedConv.contact_name || '?')[0]}</div>
          <div class="inbox-main-info">
            <div class="inbox-main-name">${h(inboxSelectedConv.contact_name || 'Desconhecido')}</div>
            <div class="inbox-main-phone">${h(inboxSelectedConv.contact_phone || '')}</div>
          </div>
          <div class="inbox-main-status-badge ${inboxSelectedConv.status}">${inboxSelectedConv.status === 'open' ? 'Aberto' : inboxSelectedConv.status === 'closed' ? 'Fechado' : inboxSelectedConv.status}</div>
        </div>
        <div class="inbox-messages-container" id="inbox-msgs">
          ${inboxMsgLoading ? renderInboxLoading() : inboxMessages.length === 0 ? '<div class="inbox-empty-msg">Nenhuma mensagem</div>' : inboxMessages.map(m => renderInboxMessage(m)).join('')}
        </div>
        <div class="inbox-input-area">
          <textarea class="inbox-input" id="inbox-input" placeholder="Digite sua mensagem..." rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();inboxSendMsg()}"></textarea>
          <button class="inbox-send-btn" onclick="inboxSendMsg()" ${inboxSending ? 'disabled' : ''}>
            ${inboxSending ? '<i class="fa-solid fa-spinner fa-spin"></i>' : '<i class="fa-solid fa-paper-plane"></i>'}
          </button>
        </div>
      ` : `
        <div class="inbox-empty-state">
          <div class="inbox-empty-icon"><i class="fa-solid fa-comments"></i></div>
          <h3>Selecione uma conversa</h3>
          <p>Escolha uma conversa da lista ao lado para visualizar as mensagens</p>
        </div>
      `}
    </div>
    <div class="inbox-detail">
      ${inboxContactDetail ? renderInboxContactDetail() : `
        <div class="inbox-detail-empty">
          <i class="fa-solid fa-user"></i>
          <p>Detalhes do contato</p>
        </div>
      `}
    </div>
  `;

  scrollInboxMessages();
}

async function inboxLoadConversations() {
  inboxConvLoading = true;
  renderInbox();
  const data = await api(`/api/inbox/conversations?page=1&limit=50${inboxSearch ? `&search=${encodeURIComponent(inboxSearch)}` : ''}`);
  inboxConvs = data?.conversations || [];
  inboxConvLoading = false;
  renderInbox();
}

function inboxSearchChange(q) {
  inboxSearch = q;
  inboxLoadConversations();
}

async function inboxSelectConv(convId) {
  if (!convId) {
    inboxSelectedConv = null;
    inboxMessages = [];
    inboxContactDetail = null;
    renderInbox();
    return;
  }

  inboxSelectedConv = inboxConvs.find(c => c.id === convId);
  inboxMsgLoading = true;
  renderInbox();

  const [msgData, contactData] = await Promise.all([
    api(`/api/inbox/conversations/${convId}/messages?page=1&limit=50`),
    inboxSelectedConv?.contact_id ? api(`/api/inbox/contacts/${inboxSelectedConv.contact_id}`) : null,
  ]);

  inboxMessages = msgData?.messages || [];
  inboxContactDetail = contactData || null;
  inboxMsgLoading = false;
  renderInbox();
  scrollInboxMessages();
}

function scrollInboxMessages() {
  setTimeout(() => {
    const container = document.getElementById('inbox-msgs');
    if (container) container.scrollTop = container.scrollHeight;
  }, 50);
}

async function inboxSendMsg() {
  const input = document.getElementById('inbox-input');
  if (!input || !input.value.trim() || inboxSending || !inboxSelectedConv) return;

  const text = input.value.trim();
  input.value = '';
  inboxSending = true;
  renderInbox();

  const data = await api(`/api/inbox/conversations/${inboxSelectedConv.id}/send`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });

  inboxSending = false;

  if (data?.message) {
    inboxMessages.push(data.message);
    inboxSelectedConv.last_message_preview = text;
    renderInbox();
    scrollInboxMessages();
  } else {
    showToast(data?.error || 'Erro ao enviar mensagem', 'error');
    inboxSending = false;
    renderInbox();
  }
}

// ─── Render helpers ─────────────────────────────────────────
function renderInboxLoading() {
  return '<div class="inbox-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Carregando...</span></div>';
}

function renderInboxEmpty() {
  return '<div class="inbox-empty-list"><i class="fa-solid fa-inbox"></i><p>Nenhuma conversa encontrada</p></div>';
}

function renderInboxConvItem(c) {
  const isActive = inboxSelectedConv?.id === c.id;
  const avatarLetter = (c.contact_name || '?')[0];
  const avatarColor = getAvatarColor(c.contact_name || '');
  const time = c.last_message_at ? timeAgo(new Date(c.last_message_at + (c.last_message_at.endsWith('Z') ? '' : 'Z'))) : '';
  return `
    <div class="inbox-conv-item ${isActive ? 'active' : ''}" onclick="inboxSelectConv('${c.id}')">
      <div class="inbox-conv-avatar" style="background:${avatarColor}">${avatarLetter}</div>
      <div class="inbox-conv-info">
        <div class="inbox-conv-name">${h(c.contact_name || 'Desconhecido')}</div>
        <div class="inbox-conv-preview">${h((c.last_message_preview || '').substring(0, 60))}</div>
      </div>
      <div class="inbox-conv-meta">
        <div class="inbox-conv-time">${time}</div>
        <div class="inbox-conv-status ${c.status}">${c.status === 'open' ? '' : '✓'}</div>
      </div>
    </div>
  `;
}

function renderInboxMessage(m) {
  const isOutbound = m.direction === 'outbound';
  const statusIcon = m.status === 'sent' ? 'fa-check' : m.status === 'delivered' ? 'fa-check-double' : m.status === 'read' ? 'fa-check-double' : m.status === 'failed' ? 'fa-times' : 'fa-clock';
  const statusColor = m.status === 'failed' ? 'var(--danger)' : m.status === 'read' ? 'var(--accent)' : 'var(--text-muted)';
  const time = m.sent_at ? timeAgo(new Date(m.sent_at + (m.sent_at.endsWith('Z') ? '' : 'Z'))) : '';
  const errorMsg = m.status === 'failed' && m.error_message ? `<div class="inbox-msg-error">${h(m.error_message)}</div>` : '';
  const mediaBlock = m.media ? `
    <div class="inbox-media-preview">
      <i class="fa-solid ${m.media.media_type === 'image' ? 'fa-image' : m.media.media_type === 'audio' ? 'fa-headphones' : 'fa-file'}"></i>
      <span>${h(m.media.file_name || m.media.media_type || 'Mídia')}</span>
      <span class="inbox-media-status">${m.media.download_status}</span>
    </div>
  ` : '';

  return `
    <div class="inbox-message ${isOutbound ? 'outbound' : 'inbound'}">
      ${mediaBlock}
      <div class="inbox-msg-content">${h(m.content || '')}</div>
      ${errorMsg}
      <div class="inbox-msg-meta">
        <span class="inbox-msg-time">${time}</span>
        ${isOutbound ? `<span class="inbox-msg-status" style="color:${statusColor}"><i class="fa-solid ${statusIcon}"></i></span>` : ''}
      </div>
    </div>
  `;
}

function renderInboxContactDetail() {
  const c = inboxContactDetail;
  if (!c) return '<div class="inbox-detail-empty"><i class="fa-solid fa-user"></i><p>Sem detalhes</p></div>';

  const events = (c.recent_events || []).map(e => `
    <div class="inbox-event-item">
      <span class="inbox-event-type">${h(e.event_type)}</span>
      <span class="inbox-event-time">${timeAgo(new Date(e.occurred_at + (e.occurred_at.endsWith('Z') ? '' : 'Z')))}</span>
    </div>
  `).join('');

  const media = (c.recent_media || []).map(m => `
    <div class="inbox-detail-media-item">
      <i class="fa-solid ${m.media_type === 'image' ? 'fa-image' : m.media_type === 'audio' ? 'fa-headphones' : 'fa-file'}"></i>
      <span>${h(m.file_name || m.media_type)}</span>
    </div>
  `).join('');

  return `
    <div class="inbox-detail-header">
      <div class="inbox-detail-avatar" style="background:${getAvatarColor(c.name || '')}">${(c.name || '?')[0]}</div>
      <div class="inbox-detail-name">${h(c.name || 'Sem nome')}</div>
      <div class="inbox-detail-phone">${h(c.phone || '')}</div>
      ${c.email ? `<div class="inbox-detail-email">${h(c.email)}</div>` : ''}
    </div>
    <div class="inbox-detail-section">
      <div class="inbox-detail-section-title">Informações</div>
      <div class="inbox-detail-row"><span>Status</span><span>${h(c.lead_status || '—')}</span></div>
      <div class="inbox-detail-row"><span>Origem</span><span>${h(c.lead_source || '—')}</span></div>
      <div class="inbox-detail-row"><span>Conversas</span><span>${c.conversation_summary?.open_count || 0} abertas / ${c.conversation_summary?.total || 0} total</span></div>
      ${c.tags ? `<div class="inbox-detail-row"><span>Tags</span><span>${h(c.tags)}</span></div>` : ''}
    </div>
    ${events ? `
      <div class="inbox-detail-section">
        <div class="inbox-detail-section-title">Eventos Recentes</div>
        ${events}
      </div>
    ` : ''}
    ${media ? `
      <div class="inbox-detail-section">
        <div class="inbox-detail-section-title">Mídias Recentes</div>
        ${media}
      </div>
    ` : ''}
  `;
}

// ─── Time helpers (same as ozion.js) ────────────────────────
function timeAgo(date) {
  if (!date || isNaN(date.getTime())) return '';
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 5) return 'agora';
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mes`;
}

function getAvatarColor(name) {
  const colors = ['#e91e63','#9c27b0','#673ab7','#3f51b5','#2196f3','#00bcd4','#009688','#4caf50','#ff9800','#ff5722','#795548','#607d8b'];
  let h = 0; for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function h(str) { return String(str).replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; }); }
