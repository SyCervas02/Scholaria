/* ── REAL-TIME CHAT MODULE ── */

let chatConversations = [];
let activeConversationId = null;
let seenMessageIds = new Set();
let chatRealtimeChannel = null;
const newChatState = { selected: new Set(), search: '', loaded: false, directory: [] };
const chatListState = { search: '', role: 'all' };

function chatReadMarkerKey(conversationId) {
  return `scholaria_chat_read_${CURRENT_PROFILE?.id || 'guest'}_${conversationId}`;
}

function getChatReadMarker(conversationId) {
  try { return localStorage.getItem(chatReadMarkerKey(conversationId)) || ''; } catch (e) { return ''; }
}

function setChatReadMarker(conversationId, timestamp) {
  if (!conversationId || !timestamp) return;
  try { localStorage.setItem(chatReadMarkerKey(conversationId), timestamp); } catch (e) {}
}

async function refreshTeacherUnreadMessageCount() {
  const badge = document.getElementById('teacherUnreadMessageCount');
  if (!badge || !CURRENT_PROFILE || !db) return;
  if (CURRENT_PROFILE.is_demo) return;
  const { data: rows, error } = await db.from('conversation_participants')
    .select('conversation_id').eq('user_id', CURRENT_PROFILE.id);
  if (error) { console.error('Could not load unread chat count:', error.message); return; }
  const conversationIds = [...new Set((rows || []).map(row => row.conversation_id).filter(Boolean))];
  if (!conversationIds.length) { badge.textContent = '0'; return; }
  const { data: messages, error: messageError } = await db.from('messages')
    .select('conversation_id,sender_id,created_at').in('conversation_id', conversationIds);
  if (messageError) { console.error('Could not load unread chat messages:', messageError.message); return; }
  const unreadCount = (messages || []).filter(message => {
    if (String(message.sender_id) === String(CURRENT_PROFILE.id)) return false;
    const marker = getChatReadMarker(message.conversation_id);
    return !marker || new Date(message.created_at).getTime() > new Date(marker).getTime();
  }).length;
  if (badge.isConnected) badge.textContent = String(unreadCount);
}

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

function renderContactsList() {
  const box = document.getElementById('chatContactList');
  if (!box) return;
  if (chatConversations.length === 0) {
    box.innerHTML = `<div class="contact-empty chat-list-empty">${chatEmptyIllustration()}<h3>No conversations yet</h3><p>Tap the + button to message a teacher,<br>student, or start a group.</p><button class="chat-primary-btn" onclick="openNewChatModal()">${iconPlus()} New conversation</button></div>`;
    return;
  }
  const query = chatListState.search.trim().toLowerCase();
  const filtered = chatConversations.filter(c =>
    (!query || conversationLabel(c).toLowerCase().includes(query) || c.lastMessage.toLowerCase().includes(query)) &&
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
        <span>${escHtml(c.lastMessage || 'No messages yet')}</span>
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
  const latestIncoming = (data || []).filter(m => String(m.sender_id) !== String(CURRENT_PROFILE?.id)).at(-1);
  if (latestIncoming) setChatReadMarker(id, latestIncoming.created_at);
  conv.unread = 0;
  if (currentPage === 'dashboard' && ROLE === 'teacher') refreshTeacherUnreadMessageCount();
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

function messageBubbleHtml(conv, m) {
  const mine = String(m.sender_id) === String(CURRENT_PROFILE?.id);
  const showName = (conv.isGroup || !mine) && m.sender_name && !mine;
  return `<div class="msg-bubble ${mine ? 'me' : 'them'}" data-mid="${m.id}">
    ${showName ? `<div class="msg-sender">${escHtml(m.sender_name)}</div>` : ''}
    <div class="msg-text">${escHtml(m.body)}</div>
    <div class="msg-time">${formatMsgTime(m.created_at)}</div>
  </div>`;
}

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
    <button class="cw-attachment-btn" title="Attachments are not available" aria-label="Attachments are not available" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 11-8 8a6 6 0 0 1-8.5-8.5l8-8a4 4 0 0 1 5.7 5.7l-8 8a2 2 0 0 1-2.8-2.8L15 6"/></svg></button>
    <button class="cw-emoji-btn" id="cwEmojiBtn" title="Emoji" aria-label="Choose emoji" onclick="toggleEmojiPicker(event)" ${activeConversationId ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3M8 8h.01M16 8h.01"/></svg></button>
    <div class="emoji-picker" id="cwEmojiPicker"></div>
    <input type="text" id="cwInput" aria-label="Message" placeholder="${activeConversationId ? 'Type a message…' : 'Select a conversation to start messaging'}" onkeypress="if(event.key==='Enter')sendChatMsg()" ${activeConversationId ? '' : 'disabled'}>
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

async function sendChatMsg() {
  const input = document.getElementById('cwInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !activeConversationId) return;
  if (CURRENT_PROFILE.permanently_muted || (CURRENT_PROFILE.muted_until && new Date(CURRENT_PROFILE.muted_until) > new Date())) {
    renderInputArea();
    return;
  }
  const conv = chatConversations.find(c => c.id === activeConversationId);
  if (!conv) return;
  input.value = '';

  const box = document.getElementById('cwMessages');
  const empty = box.querySelector('.cw-empty');
  if (empty) empty.remove();
  const tempId = 'temp-' + Date.now();
  const optimistic = { id: tempId, sender_id: CURRENT_PROFILE.id, sender_name: CURRENT_PROFILE.full_name, body: text, created_at: new Date().toISOString() };
  box.insertAdjacentHTML('beforeend', messageBubbleHtml(conv, optimistic));
  box.scrollTop = box.scrollHeight;

  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    const failedBubble = box.querySelector(`[data-mid="${tempId}"]`);
    if (failedBubble) failedBubble.remove();
    showToast('Your session expired — please log in again', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ conversationId: activeConversationId, text })
    });
    const data = await res.json();

    if (!res.ok) {
      const failedBubble = box.querySelector(`[data-mid="${tempId}"]`);
      if (failedBubble) failedBubble.remove();
      showToast(
        data.error === 'CHAT_MUTED_PERMANENT'
          ? "You're muted from chat — visit or message Guidance to be unmuted."
          : data.error === 'CHAT_MUTED_UNTIL'
            ? "You're temporarily muted for inappropriate language."
            : (data.error || 'Message failed to send'),
        'error'
      );
      await refreshOwnMuteStatus();
      return;
    }

    seenMessageIds.add(data.id);
    const sentBubble = box.querySelector(`[data-mid="${tempId}"]`);
    if (sentBubble) {
      sentBubble.dataset.mid = data.id;
      const textEl = sentBubble.querySelector('.msg-text');
      if (textEl) textEl.textContent = data.body;
    }
    if (data.warning) showToast(data.warning, 'error');

    conv.lastMessage = data.body;
    conv.lastMessageAt = data.created_at;
    chatConversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    if (currentPage === 'chats') renderContactsList();
    await refreshOwnMuteStatus();
  } catch (err) {
    const failedBubble = box.querySelector(`[data-mid="${tempId}"]`);
    if (failedBubble) failedBubble.remove();
    console.error('Failed to send message:', err.message);
    showToast('Message failed to send', 'error');
  }
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
    loadConversationsFromDB().then(() => {
      renderContactsList();
      if (ROLE === 'teacher' && currentPage === 'dashboard') refreshTeacherUnreadMessageCount();
    });
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

  if (!isMine && isOpen) setChatReadMarker(conv.id, msg.created_at);
  if (ROLE === 'teacher' && currentPage === 'dashboard') refreshTeacherUnreadMessageCount();

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
    newChatState.directory = (data || []).filter(u => String(u.id) !== String(CURRENT_PROFILE?.id));
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
