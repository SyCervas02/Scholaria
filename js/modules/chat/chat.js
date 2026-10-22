/* ── REAL-TIME CHAT MODULE ── */

let chatConversations = [];
let activeConversationId = null;
let seenMessageIds = new Set();
let chatRealtimeChannel = null;
const newChatState = { selected: new Set(), search: '', loaded: false, directory: [] };
const chatListState = { search: '', role: 'all' };

function resetChatState() {
  chatConversations = [];
  activeConversationId = null;
  seenMessageIds = new Set();
  newChatState.selected = new Set();
  newChatState.search = '';
  newChatState.loaded = false;
  newChatState.directory = [];
  chatListState.search = '';
  chatListState.role = 'all';
  if (chatRealtimeChannel) {
    try { db.removeChannel(chatRealtimeChannel); } catch (e) {}
    chatRealtimeChannel = null;
  }
}

function chatOutlineIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3a8.5 8.5 0 0 1 8.5 8.5Z"/></svg>';
}

function chatEmptyIllustration() {
  return `<svg class="chat-empty-art" viewBox="0 0 240 200" fill="none" aria-hidden="true">
    <circle cx="119" cy="100" r="88" fill="#eef3ff"/>
    <circle cx="19" cy="73" r="6" fill="#b8c8ff"/><circle cx="217" cy="158" r="6" fill="#b8c8ff"/>
    <path d="M140 84h24c23 0 39 12 39 33 0 12-5 22-14 28l3 17-21-10h-25c-23 0-36-13-36-33" fill="#e8eeff" stroke="#a9baff" stroke-width="3" stroke-linejoin="round"/>
    <path d="M97 58c-27 0-44 13-44 35 0 13 5 23 14 29l-5 19 22-10h19c26 0 41-13 41-37 0-23-17-36-41-36Z" fill="#e2ebff" stroke="#1c5cff" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="m202 55 7-12m6 26 12-5" stroke="#1c5cff" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}

function filterChatConversations(value) {
  chatListState.search = value;
  renderContactsList();
}

function setChatFilter(role) {
  chatListState.role = role;
  document.querySelectorAll('[data-chat-filter]').forEach(button => {
    const selected = button.dataset.chatFilter === role;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderContactsList();
}

async function loadChatsPage() {
  chatListState.search = '';
  if (CURRENT_PROFILE) {
    CURRENT_PROFILE.permanently_muted = false;
    CURRENT_PROFILE.muted_until = null;
    CURRENT_PROFILE.profanity_strikes = 0;
  }
  chatListState.role = 'all';
  activeConversationId = null;
  const chatContainer = document.querySelector('.scholaria-chat');
  if (chatContainer) chatContainer.classList.remove('has-active-chat');
  await loadConversationsFromDB();
  renderContactsList();
  renderInputArea();
  ensureChatRealtimeSubscription();
}

async function loadConversationsFromDB() {
  if (!CURRENT_PROFILE) { chatConversations = []; return; }
  const { data: partRows, error } = await db
    .from('conversation_participants')
    .select('conversation_id, conversations(id, is_group, title, created_by, created_at)')
    .eq('user_id', CURRENT_PROFILE.id);
  if (error) {
    console.error('Failed to load conversations:', error.message);
    chatConversations = [];
    return;
  }

  const prevUnread = {};
  chatConversations.forEach(c => { prevUnread[c.id] = c.unread; });

  const validPartRows = (partRows || []).filter(r => r && r.conversation_id && r.conversations);
  const convIds = validPartRows.map(r => r.conversation_id);
  if (convIds.length === 0) { chatConversations = []; return; }

  const { data: allParts } = await db
    .from('conversation_participants')
    .select('conversation_id, user_id, full_name, role')
    .in('conversation_id', convIds);

  const { data: lastMsgs } = await db
    .from('messages')
    .select('id, conversation_id, body, sender_id, sender_name, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false });

  const lastByConv = {};
  (lastMsgs || []).forEach(m => { if (!lastByConv[m.conversation_id]) lastByConv[m.conversation_id] = m; });

  chatConversations = validPartRows.map(r => {
    const conv = Array.isArray(r.conversations) ? r.conversations[0] : r.conversations;
    if (!conv) return null;
    const participants = (allParts || []).filter(p => p.conversation_id === conv.id);
    const last = lastByConv[conv.id];
    return {
      id: conv.id,
      isGroup: Boolean(conv.is_group),
      title: conv.title,
      participants,
      lastMessage: last ? last.body : '',
      lastMessageAt: last ? last.created_at : conv.created_at,
      unread: prevUnread[conv.id] || 0
    };
  }).filter(Boolean).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
}

function conversationOther(conv) {
  if (!conv || !Array.isArray(conv.participants)) return null;
  return conv.participants.find(p => String(p.user_id) !== String(CURRENT_PROFILE?.id));
}
function conversationLabel(conv) {
  if (!conv) return 'Conversation';
  if (conv.isGroup) return conv.title || (conv.participants || []).map(p => (p.full_name || '').split(',')[0]).filter(Boolean).join(', ') || 'Group Chat';
  const other = conversationOther(conv);
  return other ? other.full_name : (conv.title || 'Conversation');
}
function conversationSub(conv) {
  if (!conv) return '';
  if (conv.isGroup) return `${(conv.participants || []).length} members`;
  const other = conversationOther(conv);
  return other && other.role ? other.role.charAt(0).toUpperCase() + other.role.slice(1) : '';
}
function conversationInitials(conv) {
  if (!conv) return '?';
  if (conv.isGroup) return '👥';
  const other = conversationOther(conv);
  return other ? initialsFor(other.full_name) : '?';
}
function formatMsgTime(iso, shortForList) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (shortForList) {
    return sameDay
      ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatChatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function parseChatAttachment(body) {
  if (typeof body !== 'string' || !body.trim().startsWith('{"type":"attachment"')) return null;
  try {
    const data = JSON.parse(body);
    if (data && data.type === 'attachment') return data;
  } catch (e) {}
  return null;
}

function conversationPreview(c) {
  if (!c || !c.lastMessage) return 'No messages yet';
  const attach = parseChatAttachment(c.lastMessage);
  if (attach) return `📎 Attachment: ${attach.name || 'File'}`;
  return c.lastMessage;
}

function renderContactsList() {
  const box = document.getElementById('chatContactList');
  if (!box) return;
  if (chatConversations.length === 0) {
    box.innerHTML = `<div class="contact-empty chat-list-empty">${chatEmptyIllustration()}<h3>No conversations yet</h3><p>Tap the + button to message a teacher,<br>student, or start a group.</p><button class="chat-primary-btn" onclick="openNewChatModal()">${iconPlus()} New conversation</button></div>`;
    return;
  }
  const query = chatListState.search.trim().toLowerCase();
  const filtered = chatConversations.filter(c =>
    (!query || conversationLabel(c).toLowerCase().includes(query) || conversationPreview(c).toLowerCase().includes(query)) &&
    (chatListState.role === 'all' || c.participants.some(p => p.user_id !== CURRENT_PROFILE.id && p.role === chatListState.role)));
  if (!filtered.length) {
    box.innerHTML = '<div class="contact-empty">No matching conversations.</div>';
    return;
  }
  box.innerHTML = filtered.map(c => `
    <div class="contact-row ${c.id === activeConversationId ? 'active-contact' : ''}" data-conv="${c.id}" onclick="openConversation('${c.id}')">
      <div class="contact-avatar ${c.isGroup ? 'group-avatar' : ''}">${conversationInitials(c)}</div>
      <div class="contact-info">
        <h4>${escHtml(conversationLabel(c))}</h4>
        <span>${escHtml(conversationPreview(c))}</span>
      </div>
      <div class="contact-meta">
        <span class="contact-time">${formatMsgTime(c.lastMessageAt, true)}</span>
        ${c.unread > 0 ? `<span class="contact-unread">${c.unread > 9 ? '9+' : c.unread}</span>` : ''}
      </div>
    </div>`).join('');
}

async function openConversation(id) {
  activeConversationId = id;
  const chatContainer = document.querySelector('.scholaria-chat');
  if (chatContainer) chatContainer.classList.add('has-active-chat');

  const conv = chatConversations.find(c => c.id === id);
  if (!conv) return;
  conv.unread = 0;
  renderContactsList();

  const avatar = document.getElementById('cwAvatar');
  const name = document.getElementById('cwName');
  const role = document.getElementById('cwRole');
  const msgsBox = document.getElementById('cwMessages');

  if (avatar) {
    avatar.className = 'contact-avatar' + (conv.isGroup ? ' group-avatar' : '');
    avatar.textContent = conversationInitials(conv);
  }
  if (name) name.textContent = conversationLabel(conv);
  if (role) role.textContent = conversationSub(conv);
  renderInputArea();
  if (msgsBox) msgsBox.innerHTML = '<div class="cw-loading">Loading messages…</div>';

  const { data, error } = await db.from('messages')
    .select('*').eq('conversation_id', id).order('created_at', { ascending: true });
  if (error) { console.error('Failed to load messages:', error.message); return; }
  (data || []).forEach(m => seenMessageIds.add(m.id));
  renderMessages(conv, data || []);
}

function closeConversation() {
  activeConversationId = null;
  const chatContainer = document.querySelector('.scholaria-chat');
  if (chatContainer) chatContainer.classList.remove('has-active-chat');

  const avatar = document.getElementById('cwAvatar');
  const name = document.getElementById('cwName');
  const role = document.getElementById('cwRole');
  const msgsBox = document.getElementById('cwMessages');

  if (avatar) {
    avatar.className = 'contact-avatar cw-placeholder-avatar';
    avatar.innerHTML = chatOutlineIcon();
  }
  if (name) name.textContent = 'Your conversations';
  if (role) role.textContent = 'Stay connected, keep learning.';
  if (msgsBox) {
    const isTeacher = (typeof ROLE !== 'undefined' && ROLE === 'teacher');
    msgsBox.innerHTML = `<div class="cw-empty chat-welcome">${chatEmptyIllustration()}<h3>Start a conversation</h3><p>${isTeacher ? 'Message a student, connect with fellow teachers,<br>or create a class group.' : 'Message a teacher, connect with classmates,<br>or create a study group.'}</p><button class="chat-primary-btn" onclick="openNewChatModal()">${iconPlus()} New message</button></div>`;
  }
  renderInputArea();
  renderContactsList();
}

function renderMessages(conv, msgs) {
  const box = document.getElementById('cwMessages');
  if (!box) return;
  box.innerHTML = msgs.length
    ? msgs.map(m => messageBubbleHtml(conv, m)).join('')
    : '<div class="cw-empty">No messages yet — say hi!</div>';
  box.scrollTop = box.scrollHeight;
}

window._chatAttachmentMap = window._chatAttachmentMap || {};

function messageBubbleHtml(conv, m) {
  const mine = String(m.sender_id) === String(CURRENT_PROFILE?.id);
  const showName = (conv.isGroup || !mine) && m.sender_name && !mine;
  const attach = parseChatAttachment(m.body);

  let bodyHtml = '';
  if (attach) {
    window._chatAttachmentMap[m.id] = {
      attach,
      sender_name: m.sender_name || (mine ? (CURRENT_PROFILE?.full_name || 'You') : 'Participant'),
      created_at: m.created_at
    };
    const isImg = (attach.mime || '').startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)$/i.test(attach.name);
    const serverBase = window.API_BASE || (window.location.origin.includes(':5500') ? 'http://localhost:3001' : window.location.origin);
    const fileUrl = attach.url ? (attach.url.startsWith('http') ? attach.url : `${serverBase}${attach.url}`) : attach.data;

    bodyHtml = `
      <div class="chat-attachment-card" style="display:flex;flex-direction:column;gap:8px;padding:4px 0;">
        ${isImg ? `
          <img src="${fileUrl}" alt="${escHtml(attach.name)}" style="max-width:260px;max-height:220px;border-radius:10px;object-fit:cover;cursor:pointer;border:1px solid rgba(0,0,0,0.08);transition:transform 0.15s ease;" onclick="openChatAttachmentOverview('${m.id}')" title="Click to view overview" onmouseover="this.style.opacity='0.92'" onmouseout="this.style.opacity='1'"/>
        ` : ''}
        <div style="display:flex;align-items:center;gap:10px;background:rgba(${mine ? '255,255,255,0.18' : '0,0,0,0.06'});padding:8px 12px;border-radius:10px;min-width:210px;">
          <span style="font-size:22px;cursor:pointer;" onclick="openChatAttachmentOverview('${m.id}')" title="View overview">${isImg ? '🖼️' : '📄'}</span>
          <div style="min-width:0;flex:1;cursor:pointer;" onclick="openChatAttachmentOverview('${m.id}')">
            <div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${mine ? '#ffffff' : '#0f172a'};" title="${escHtml(attach.name)}">${escHtml(attach.name)}</div>
            <div style="font-size:11px;opacity:0.85;color:${mine ? '#e0f2fe' : '#64748b'};">${formatChatFileSize(attach.size)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <button type="button" class="chat-overview-btn" onclick="openChatAttachmentOverview('${m.id}')" style="display:inline-flex;align-items:center;gap:4px;padding:5px 9px;border-radius:8px;background:${mine ? 'rgba(255,255,255,0.22)' : '#e2e8f0'};color:${mine ? '#ffffff' : '#1e293b'};border:none;font-size:11.5px;font-weight:700;cursor:pointer;transition:all 0.15s ease;" title="Overview attachment">
              <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.5;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Overview
            </button>
            <a href="${fileUrl}" download="${escHtml(attach.name)}" style="display:inline-flex;align-items:center;gap:4px;padding:5px 9px;border-radius:8px;background:${mine ? '#ffffff' : 'var(--blue, #2563eb)'};color:${mine ? '#2563eb' : '#ffffff'};font-size:11.5px;font-weight:700;text-decoration:none;" title="Download file">
              <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.5;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </a>
          </div>
        </div>
      </div>
    `;
  } else {
    bodyHtml = `<div class="msg-text">${escHtml(m.body)}</div>`;
  }

  return `<div class="msg-bubble ${mine ? 'me' : 'them'}" data-mid="${m.id}">
    ${showName ? `<div class="msg-sender">${escHtml(m.sender_name)}</div>` : ''}
    ${bodyHtml}
    <div class="msg-time">${formatMsgTime(m.created_at)}</div>
  </div>`;
}

function openChatAttachmentOverview(msgId) {
  const modal = document.getElementById('docPreviewModal');
  const titleEl = document.getElementById('docPreviewTitle');
  const subEl = document.getElementById('docPreviewSubtitle');
  const bodyEl = document.getElementById('docPreviewBody');
  const dlBtn = document.getElementById('docPreviewDlBtn');
  if (!modal || !bodyEl) return;

  let attach = null;
  let senderName = 'Chat Attachment';
  let createdAt = new Date().toISOString();

  if (window._chatAttachmentMap && window._chatAttachmentMap[msgId]) {
    attach = window._chatAttachmentMap[msgId].attach;
    senderName = window._chatAttachmentMap[msgId].sender_name;
    createdAt = window._chatAttachmentMap[msgId].created_at;
  }

  if (!attach) {
    const bubble = document.querySelector(`.msg-bubble[data-mid="${msgId}"]`);
    const card = bubble?.querySelector('.chat-attachment-card');
    const dlLink = card?.querySelector('a[download]');
    const img = card?.querySelector('img');
    const nameEl = card?.querySelector('[title]');
    if (dlLink && dlLink.href) {
      attach = {
        name: dlLink.getAttribute('download') || nameEl?.textContent || 'Attachment',
        data: dlLink.href,
        mime: img ? 'image/png' : 'application/pdf',
        size: 0
      };
    }
  }

  if (!attach) {
    if (typeof showToast === 'function') showToast('Attachment could not be loaded', 'error');
    return;
  }

  if (titleEl) titleEl.textContent = attach.name || 'Attachment Overview';
  if (subEl) subEl.textContent = `Shared by ${senderName} · ${formatChatFileSize(attach.size)} · ${formatMsgTime(createdAt)}`;

  const serverBase = window.API_BASE || (window.location.origin.includes(':5500') ? 'http://localhost:3001' : window.location.origin);
  const fileUrl = attach.url ? (attach.url.startsWith('http') ? attach.url : `${serverBase}${attach.url}`) : attach.data;

  if (dlBtn) {
    dlBtn.innerHTML = `
      <svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:#fff;fill:none;stroke-width:2.5;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Download ${attach.name.split('.').pop()?.toUpperCase() || 'File'}
    `;
    dlBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = attach.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
  }

  const isImg = (attach.mime || '').startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)$/i.test(attach.name);
  const isPdf = (attach.mime || '').includes('pdf') || /\.pdf$/i.test(attach.name);

  let previewContent = '';
  if (isImg) {
    previewContent = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:0 4px;">
        <span style="font-size:12.5px;color:#64748b;font-weight:600;">Image Preview</span>
        <button type="button" class="sw-btn outline" onclick="window.open('${fileUrl}', '_blank')" style="font-size:11.5px;padding:4px 10px;border-radius:6px;cursor:pointer;background:#fff;border:1px solid #cbd5e1;font-weight:600;">
          Open full size ↗
        </button>
      </div>
      <div style="display:flex;justify-content:center;align-items:center;min-height:460px;max-height:72vh;background:#0f172a;border-radius:12px;padding:16px;overflow:auto;">
        <img src="${fileUrl}" alt="${escHtml(attach.name)}" style="max-width:100%;max-height:68vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.5);"/>
      </div>
    `;
  } else if (isPdf) {
    previewContent = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:0 4px;">
        <span style="font-size:12.5px;color:#64748b;font-weight:600;">Document Viewer</span>
        <a href="${fileUrl}" target="_blank" download="${escHtml(attach.name)}" class="sw-btn outline" style="font-size:11.5px;padding:4px 10px;border-radius:6px;text-decoration:none;color:#334155;background:#fff;border:1px solid #cbd5e1;font-weight:600;">
          Open in new tab ↗
        </a>
      </div>
      <iframe src="${fileUrl}#toolbar=1" style="width:100%;height:70vh;border:none;border-radius:12px;background:#fff;" title="${escHtml(attach.name)}"></iframe>
    `;
  } else {
    previewContent = `
      <div style="padding:40px 20px;text-align:center;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
        <div style="font-size:48px;margin-bottom:12px;">📄</div>
        <h4 style="margin:0 0 8px;font-size:16px;color:#0f172a;">${escHtml(attach.name)}</h4>
        <p style="margin:0 0 16px;font-size:13px;color:#64748b;">${formatChatFileSize(attach.size)} · File format: ${attach.name.split('.').pop()?.toUpperCase() || 'Document'}</p>
        <a href="${fileUrl}" download="${escHtml(attach.name)}" class="sw-btn primary" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:8px;text-decoration:none;font-weight:700;">
          Download File
        </a>
      </div>
    `;
  }

  bodyEl.innerHTML = previewContent;
  modal.classList.add('active');
}
window.openChatAttachmentOverview = openChatAttachmentOverview;

function renderInputArea() {
  const area = document.getElementById('cwInputArea');
  if (!area) return;
  const warnIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  if (CURRENT_PROFILE.permanently_muted) {
    area.innerHTML = `<div class="cw-mute-banner permanent">${warnIcon}<span>You've been muted from chat for repeated inappropriate language. Please visit or message the Guidance Office to be unmuted.</span></div>`;
    return;
  }
  if (CURRENT_PROFILE.muted_until && new Date(CURRENT_PROFILE.muted_until) > new Date()) {
    const untilDate = new Date(CURRENT_PROFILE.muted_until);
    const sameDay = untilDate.toDateString() === new Date().toDateString();
    const until = sameDay
      ? untilDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : untilDate.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    area.innerHTML = `<div class="cw-mute-banner">${warnIcon}<span>You're temporarily muted for inappropriate language. You can chat again after ${until}.</span></div>`;
    return;
  }

  area.innerHTML = `
    <button class="cw-attachment-btn" id="cwAttachmentBtn" title="Attach file (max 5MB)" aria-label="Attach file" onclick="triggerChatAttachment()" ${activeConversationId ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 11-8 8a6 6 0 0 1-8.5-8.5l8-8a4 4 0 0 1 5.7 5.7l-8 8a2 2 0 0 1-2.8-2.8L15 6"/></svg></button>
    <input type="file" id="cwFileInput" style="display:none;" onchange="handleChatFileUpload(event)" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt">
    <button class="cw-emoji-btn" id="cwEmojiBtn" title="Emoji" aria-label="Choose emoji" onclick="toggleEmojiPicker(event)" ${activeConversationId ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3M8 8h.01M16 8h.01"/></svg></button>
    <div class="emoji-picker" id="cwEmojiPicker"></div>
    <input type="text" id="cwInput" aria-label="Message" placeholder="${activeConversationId ? 'Type a message…' : 'Select a conversation to start messaging'}" onkeydown="if(event.key==='Enter'){event.preventDefault();sendChatMsg();}" ${activeConversationId ? '' : 'disabled'}>
    <button class="cw-send" aria-label="Send message" onclick="sendChatMsg()" ${activeConversationId ? '' : 'disabled'}>${iconSend()}</button>`;
}

async function refreshOwnMuteStatus() {
  const { data, error } = await db.from('users')
    .select('profanity_strikes, muted_until, permanently_muted')
    .eq('id', CURRENT_PROFILE.id).single();
  if (error || !data) return;
  Object.assign(CURRENT_PROFILE, data);
  if (currentPage === 'chats') renderInputArea();
}

function triggerChatAttachment() {
  if (!activeConversationId) {
    showToast('Please select a conversation first', 'info');
    return;
  }
  const fileInput = document.getElementById('cwFileInput');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

async function handleChatFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file || !activeConversationId) return;

  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB limit
  if (file.size > MAX_SIZE) {
    showToast(`Attachment exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select a file under 5MB.`, 'error');
    event.target.value = '';
    return;
  }

  showToast(`Uploading ${file.name}…`, 'info');

  const { data: { session } } = await db.auth.getSession();
  const serverBase = window.API_BASE || (window.location.origin.includes(':5500') ? 'http://localhost:3001' : window.location.origin);

  let attachmentPayload = null;

  if (session && session.access_token) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const upRes = await fetch(`${serverBase}/api/chat/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (upRes.ok) {
        const upData = await upRes.json();
        attachmentPayload = JSON.stringify({
          type: 'attachment',
          name: upData.name || file.name,
          size: upData.size || file.size,
          mime: upData.mime || file.type || 'application/octet-stream',
          url: upData.url
        });
      } else {
        const errJson = await upRes.json().catch(() => ({}));
        console.warn('Chat upload failed:', upRes.status, errJson);
      }
    } catch (upErr) {
      console.warn('Chat upload network error:', upErr);
    }
  }

  if (!attachmentPayload) {
    // If backend upload failed, fallback to inline base64 ONLY if small enough for messages_body_check (<= 4000 chars)
    if (file.size > 2500) {
      showToast('Could not upload attachment. Please ensure Scholaria backend server is running.', 'error');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async function(e) {
      const dataUrl = e.target.result;
      const payload = JSON.stringify({
        type: 'attachment',
        name: file.name,
        size: file.size,
        mime: file.type || 'application/octet-stream',
        data: dataUrl
      });
      await sendChatRawMessage(payload);
    };
    reader.onerror = function() {
      showToast('Failed to read file', 'error');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
    return;
  }

  event.target.value = '';
  await sendChatRawMessage(attachmentPayload);
}

async function sendChatRawMessage(text) {
  if (!text || !activeConversationId) return;
  if (CURRENT_PROFILE.permanently_muted || (CURRENT_PROFILE.muted_until && new Date(CURRENT_PROFILE.muted_until) > new Date())) {
    renderInputArea();
    return;
  }
  const conv = chatConversations.find(c => c.id === activeConversationId);
  if (!conv) return;

  const box = document.getElementById('cwMessages');
  if (box) {
    const empty = box.querySelector('.cw-empty');
    if (empty) empty.remove();
  }
  const tempId = 'temp-' + Date.now();
  const optimistic = { id: tempId, sender_id: CURRENT_PROFILE.id, sender_name: CURRENT_PROFILE.full_name, body: text, created_at: new Date().toISOString() };
  if (box) {
    box.insertAdjacentHTML('beforeend', messageBubbleHtml(conv, optimistic));
    box.scrollTop = box.scrollHeight;
  }

  const { data: { session } } = await db.auth.getSession();
  const serverBase = window.API_BASE || (window.location.origin.includes(':5500') ? 'http://localhost:3001' : window.location.origin);

  let sentData = null;
  // 1. Try sending through API route
  if (session && session.access_token) {
    try {
      const res = await fetch(`${serverBase}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ conversationId: activeConversationId, text })
      });
      if (res.ok) {
        sentData = await res.json();
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'CHAT_MUTED_PERMANENT' || errData.error === 'CHAT_MUTED_UNTIL') {
          if (box) {
            const failedBubble = box.querySelector(`[data-mid="${tempId}"]`);
            if (failedBubble) failedBubble.remove();
          }
          showToast(errData.error === 'CHAT_MUTED_PERMANENT' ? "You're muted from chat — visit or message Guidance to be unmuted." : "You're temporarily muted for inappropriate language.", 'error');
          await refreshOwnMuteStatus();
          return;
        }
      }
    } catch (err) {
      console.warn('API send error, attempting direct insert:', err.message);
    }
  }

  // 2. Direct database insert fallback
  if (!sentData) {
    const { data: directMsg, error: directErr } = await db
      .from('messages')
      .insert({
        conversation_id: activeConversationId,
        sender_id: CURRENT_PROFILE.id,
        sender_name: CURRENT_PROFILE.full_name,
        body: text
      })
      .select().single();

    if (directErr || !directMsg) {
      if (box) {
        const failedBubble = box.querySelector(`[data-mid="${tempId}"]`);
        if (failedBubble) failedBubble.remove();
      }
      showToast('Message failed to send. Please check your connection.', 'error');
      return;
    }
    sentData = directMsg;
  }

  seenMessageIds.add(sentData.id);
  if (box) {
    const sentBubble = box.querySelector(`[data-mid="${tempId}"]`);
    if (sentBubble) {
      sentBubble.dataset.mid = sentData.id;
    }
  }
  if (sentData.warning) showToast(sentData.warning, 'error');

  conv.lastMessage = sentData.body;
  conv.lastMessageAt = sentData.created_at;
  chatConversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  if (currentPage === 'chats') renderContactsList();
  await refreshOwnMuteStatus();
}

async function sendChatMsg() {
  const input = document.getElementById('cwInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await sendChatRawMessage(text);
}

function ensureChatRealtimeSubscription() {
  if (chatRealtimeChannel) return;
  chatRealtimeChannel = db.channel('messages-listener')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      handleIncomingMessage(payload.new);
    })
    .subscribe();
}

function handleIncomingMessage(msg) {
  if (!msg || !CURRENT_PROFILE) return;
  if (seenMessageIds.has(msg.id)) return;
  seenMessageIds.add(msg.id);

  const conv = chatConversations.find(c => c.id === msg.conversation_id);
  if (!conv) {
    loadConversationsFromDB().then(renderContactsList);
    return;
  }

  conv.lastMessage = msg.body;
  conv.lastMessageAt = msg.created_at;

  const isMine = String(msg.sender_id) === String(CURRENT_PROFILE.id);
  const isOpen = currentPage === 'chats' && activeConversationId === conv.id;

  if (isOpen) {
    const box = document.getElementById('cwMessages');
    if (box) {
      const empty = box.querySelector('.cw-empty');
      if (empty) empty.remove();
      box.insertAdjacentHTML('beforeend', messageBubbleHtml(conv, msg));
      box.scrollTop = box.scrollHeight;
    }
  } else if (!isMine) {
    conv.unread = (conv.unread || 0) + 1;
  }

  chatConversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  if (currentPage === 'chats') renderContactsList();
}

async function openNewChatModal() {
  newChatState.selected = new Set();
  newChatState.search = '';
  document.getElementById('newChatModal').classList.add('active');
  document.getElementById('newChatModalBody').innerHTML = '<div class="nc-empty">Loading people…</div>';
  document.getElementById('newChatModalFoot').innerHTML = '';
  if (!newChatState.loaded || !newChatState.directory.length) {
    const { data, error } = await db.rpc('list_contacts');
    if (error) { showToast('Could not load contact list', 'error'); console.error(error.message); return; }
    newChatState.directory = (data || []).filter(u => String(u.id) !== String(CURRENT_PROFILE?.id) && u.is_active !== false && u.isActive !== false);
    newChatState.loaded = true;
  }
  renderNewChatModal();
}
function closeNewChatModal() {
  document.getElementById('newChatModal').classList.remove('active');
}
function ncToggleContact(id) {
  if (newChatState.selected.has(id)) newChatState.selected.delete(id);
  else newChatState.selected.add(id);
  renderNewChatModal();
}
function ncFilterContacts(v) {
  newChatState.search = v;
  renderNewChatModal();
}
function renderNewChatModal() {
  const body = document.getElementById('newChatModalBody');
  const q = newChatState.search.trim().toLowerCase();
  const filtered = newChatState.directory.filter(c =>
    !q || c.full_name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q));
  const rowsHtml = filtered.length ? filtered.map(c => `
    <label class="nc-contact-row ${newChatState.selected.has(c.id) ? 'picked' : ''}">
      <input type="checkbox" ${newChatState.selected.has(c.id) ? 'checked' : ''} onchange="ncToggleContact('${c.id}')">
      <div class="contact-avatar" style="width:32px;height:32px;font-size:11px;">${initialsFor(c.full_name)}</div>
      <div class="contact-info"><h4>${escHtml(c.full_name)}</h4><span>${escHtml(c.role.charAt(0).toUpperCase() + c.role.slice(1))}${c.school_id ? ' · ' + escHtml(c.school_id) : ''}</span></div>
    </label>`).join('') : `<div class="nc-empty">No matching people found.</div>`;

  body.innerHTML = `
    <input type="text" class="nc-search" placeholder="Search by name or role…" value="${escHtml(newChatState.search)}" oninput="ncFilterContacts(this.value)">
    <div class="nc-contact-list">${rowsHtml}</div>
    ${newChatState.selected.size > 1 ? `
      <div class="gen-field"><label>Group name (optional)</label>
        <input type="text" class="nc-group-name" id="ncGroupName" placeholder="e.g. Grade 12 STEM — Section A">
      </div>` : ''}`;

  const n = newChatState.selected.size;
  document.getElementById('newChatModalFoot').innerHTML = `
    <span class="nc-picked-count">${n} selected</span>
    <div style="display:flex;gap:10px;">
      <button class="foot-btn-secondary" onclick="closeNewChatModal()">Cancel</button>
      <button class="foot-btn-secondary" style="border-color:var(--blue);color:var(--blue);" ${n === 0 ? 'disabled' : ''} onclick="ncCreateConversation()">${iconPlus()} ${n > 1 ? 'Start Group Chat' : 'Start Chat'}</button>
    </div>`;
}

async function ncCreateConversation() {
  const ids = Array.from(newChatState.selected);
  if (ids.length === 0) return;
  const isGroup = ids.length > 1;

  if (!isGroup) {
    const targetId = ids[0];
    const existing = chatConversations.find(c =>
      !c.isGroup && c.participants.some(p => p.user_id === targetId));
    if (existing) {
      closeNewChatModal();
      openConversation(existing.id);
      return;
    }
  }

  const picked = newChatState.directory.filter(c => newChatState.selected.has(c.id));
  const groupNameInput = document.getElementById('ncGroupName');
  const title = isGroup
    ? ((groupNameInput && groupNameInput.value.trim()) || picked.map(p => p.full_name.split(',')[0]).join(', '))
    : null;

  const { data: conv, error: convErr } = await db.from('conversations')
    .insert({ is_group: isGroup, title, created_by: CURRENT_PROFILE.id })
    .select().single();
  if (convErr) { showToast('Could not start conversation', 'error'); console.error(convErr.message); return; }

  const participantRows = [
    { conversation_id: conv.id, user_id: CURRENT_PROFILE.id, full_name: CURRENT_PROFILE.full_name, role: ROLE },
    ...picked.map(p => ({ conversation_id: conv.id, user_id: p.id, full_name: p.full_name, role: p.role }))
  ];
  const { error: partErr } = await db.from('conversation_participants').insert(participantRows);
  if (partErr) { showToast('Could not add participants', 'error'); console.error(partErr.message); return; }

  closeNewChatModal();
  await loadConversationsFromDB();
  renderContactsList();
  openConversation(conv.id);
}

const EMOJI_LIST = [
  '😀','😁','😂','🤣','😊','😍','😘','😜','🤔','😎','😴','😭','😡','🥳','😇','🙃',
  '👍','👎','👏','🙌','🙏','💪','✌️','🤝','👋','❤️','💙','💛','💚','🔥','⭐','✅',
  '📚','✏️','📌','📎','⏰','🎉','🏫','💡','❓','❗','😅','😢','🥰','🤗','😬','🙄'
];
function toggleEmojiPicker(e) {
  e.stopPropagation();
  const picker = document.getElementById('cwEmojiPicker');
  if (!picker) return;
  if (picker.classList.contains('open')) { picker.classList.remove('open'); return; }
  if (!picker.innerHTML) {
    picker.innerHTML = EMOJI_LIST.map(em => `<button type="button" onclick="insertEmoji('${em}')">${em}</button>`).join('');
  }
  picker.classList.add('open');
}
function insertEmoji(emoji) {
  const input = document.getElementById('cwInput');
  if (!input) return;
  const start = input.selectionStart != null ? input.selectionStart : input.value.length;
  const end = input.selectionEnd != null ? input.selectionEnd : input.value.length;
  input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
  input.focus();
  input.selectionStart = input.selectionEnd = start + emoji.length;
}
document.addEventListener('click', e => {
  const picker = document.getElementById('cwEmojiPicker');
  const btn = document.getElementById('cwEmojiBtn');
  if (picker && picker.classList.contains('open') && !picker.contains(e.target) && e.target !== btn) {
    picker.classList.remove('open');
  }
});
