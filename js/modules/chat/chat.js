/* ── REAL-TIME CHAT MODULE ── */

let chatConversations = [];
let activeConversationId = null;
let seenMessageIds = new Set();
let chatRealtimeChannel = null;
let pendingChatAttachment = null;
const newChatState = { selected: new Set(), search: '', loaded: false, directory: [] };
const chatListState = { search: '', role: 'all' };
// Last computed dashboard unread total, so teacher dashboard re-renders can
// paint the known value instead of the '0' placeholder while recounting.
let lastTeacherUnreadMessageCount = null;

// Read markers live in Supabase (conversation_participants.last_read_at) and are
// hydrated into this cache on load. Never localStorage: browser tracking
// prevention (Edge/Brave) blocks site storage, silently breaking unread state.
const chatReadMarkers = {};

function getChatReadMarker(conversationId) {
  return chatReadMarkers[conversationId] || '';
}

async function setChatReadMarker(conversationId, timestamp) {
  if (!conversationId || !timestamp) return;
  const prev = chatReadMarkers[conversationId] || '';
  if (prev && new Date(prev).getTime() >= new Date(timestamp).getTime()) return;
  chatReadMarkers[conversationId] = timestamp;
  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    await fetch(`${API_BASE}/api/chat/read-marker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ conversation_id: conversationId, last_read_at: timestamp })
    });
  } catch (e) {
    console.warn('Could not persist chat read marker:', e.message);
  }
}

async function refreshTeacherUnreadMessageCount() {
  const badge = document.getElementById('teacherUnreadMessageCount');
  if (!badge || !CURRENT_PROFILE || !db) return;
  if (CURRENT_PROFILE.is_demo) return;
  const { data: rows, error } = await db.from('conversation_participants')
    .select('conversation_id, last_read_at').eq('user_id', CURRENT_PROFILE.id);
  if (error) { console.error('Could not load unread chat count:', error.message); return; }
  (rows || []).forEach(r => { chatReadMarkers[r.conversation_id] = r.last_read_at || ''; });
  const conversationIds = [...new Set((rows || []).map(row => row.conversation_id).filter(Boolean))];
  if (!conversationIds.length) { badge.textContent = '0'; lastTeacherUnreadMessageCount = 0; return; }
  const { data: messages, error: messageError } = await db.from('messages')
    .select('conversation_id,sender_id,created_at').in('conversation_id', conversationIds);
  if (messageError) { console.error('Could not load unread chat messages:', messageError.message); return; }
  const unreadCount = (messages || []).filter(message => {
    if (String(message.sender_id) === String(CURRENT_PROFILE.id)) return false;
    const marker = getChatReadMarker(message.conversation_id);
    return !marker || new Date(message.created_at).getTime() > new Date(marker).getTime();
  }).length;
  // Remember the count so dashboard re-renders can show it synchronously
  // instead of flashing the placeholder '0' while the async recount runs.
  lastTeacherUnreadMessageCount = unreadCount;
  if (badge.isConnected) badge.textContent = String(unreadCount);
}

function resetChatState() {
  chatConversations = [];
  activeConversationId = null;
  pendingChatAttachment = null;
  seenMessageIds = new Set();
  lastTeacherUnreadMessageCount = null;
  Object.keys(chatReadMarkers).forEach(k => { delete chatReadMarkers[k]; });
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
    .select('conversation_id, last_read_at, conversations(id, is_group, title, created_by, created_at)')
    .eq('user_id', CURRENT_PROFILE.id);
  if (error) {
    console.error('Failed to load conversations:', error.message);
    chatConversations = [];
    return;
  }

  // Hydrate read-marker cache from Supabase before unread counts are computed.
  (partRows || []).forEach(r => { chatReadMarkers[r.conversation_id] = r.last_read_at || ''; });

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

  // Persistent unread queue: count incoming messages newer than each conversation's
  // stored read marker, so badges survive reloads (not just in-memory state).
  const unreadByConv = {};
  (lastMsgs || []).forEach(m => {
    if (String(m.sender_id) === String(CURRENT_PROFILE.id)) return;
    const marker = getChatReadMarker(m.conversation_id);
    if (!marker || new Date(m.created_at).getTime() > new Date(marker).getTime()) {
      unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] || 0) + 1;
    }
  });

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
      unread: conv.id === activeConversationId ? 0 : (unreadByConv[conv.id] || 0)
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
  const prevReadMarker = getChatReadMarker(id);
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
  renderMessages(conv, data || [], prevReadMarker);

  const lastMsg = (data && data.length) ? data[data.length - 1] : null;
  markConversationSeen(id, lastMsg?.id, lastMsg?.created_at);
  fetchChatSeenReceipts(id);
  startChatReceiptPolling(id);
}

function closeConversation() {
  stopChatReceiptPolling();
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

window._chatSeenReceipts = window._chatSeenReceipts || {};
let chatReceiptPollTimer = null;

async function fetchChatSeenReceipts(convId) {
  if (!convId) return;
  try {
    const { data: { session } } = await db.auth.getSession();
    const serverBase = window.API_BASE || 'http://localhost:3001';
    const res = await fetch(`${serverBase}/api/chat/seen-receipts?conversationId=${encodeURIComponent(convId)}`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token || ''}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      window._chatSeenReceipts[convId] = data.receipts || {};
      updateSeenReceiptsUI(convId);
    }
  } catch (err) {
    // Silent catch
  }
}

async function markConversationSeen(convId, lastMsgId, lastMsgTime) {
  if (!convId || !CURRENT_PROFILE) return;
  try {
    const { data: { session } } = await db.auth.getSession();
    const serverBase = window.API_BASE || 'http://localhost:3001';
    await fetch(`${serverBase}/api/chat/mark-seen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify({
        conversationId: convId,
        lastMessageId: lastMsgId || null,
        lastMessageTime: lastMsgTime || new Date().toISOString()
      })
    });
    fetchChatSeenReceipts(convId);
  } catch (err) {
    // Silent catch
  }
}

function startChatReceiptPolling(convId) {
  stopChatReceiptPolling();
  if (!convId) return;
  chatReceiptPollTimer = setInterval(() => {
    if (activeConversationId === convId) {
      fetchChatSeenReceipts(convId);
    }
  }, 4000);
}

function stopChatReceiptPolling() {
  if (chatReceiptPollTimer) {
    clearInterval(chatReceiptPollTimer);
    chatReceiptPollTimer = null;
  }
}

function updateSeenReceiptsUI(convId) {
  if (activeConversationId !== convId) return;
  const receipts = window._chatSeenReceipts[convId] || {};
  const myBubbles = document.querySelectorAll('#cwMessages .msg-bubble.me');
  if (!myBubbles.length) return;

  const seenIcon = '<svg viewBox="0 0 24 24" width="15" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12.5l4.5 4.5L16 7"/><path d="M11.5 16.5l1 1L22 7"/></svg>';
  const sentIcon = '<svg viewBox="0 0 24 24" width="12" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  // Determine how far each other participant has read (the latest message time they've seen).
  const otherReceipts = Object.values(receipts).filter(r => String(r.userId) !== String(CURRENT_PROFILE?.id));
  let latestOtherReadTime = 0;
  let latestOtherReceipt = null;
  otherReceipts.forEach(r => {
    const t = new Date(r.lastMessageTime || r.seenAt || 0).getTime();
    if (t >= latestOtherReadTime) { latestOtherReadTime = t; latestOtherReceipt = r; }
  });

  // Per-message read state on every sent bubble (mutual visibility for the sender).
  myBubbles.forEach(b => {
    const statusEl = b.querySelector('.msg-read-status');
    if (!statusEl) return;
    const created = new Date(b.getAttribute('data-created') || 0).getTime();
    const isSeen = Boolean(latestOtherReceipt) && created <= latestOtherReadTime;
    statusEl.classList.toggle('seen', isSeen);
    statusEl.innerHTML = isSeen ? `${seenIcon}<span>Seen</span>` : `${sentIcon}<span>Sent</span>`;
    statusEl.title = isSeen ? 'Read by the recipient' : 'Sent — not yet read';
  });

  // Summary receipt line beneath the most recent sent bubble.
  document.querySelectorAll('#cwMessages .msg-seen-receipt').forEach(el => el.remove());
  const lastBubble = myBubbles[myBubbles.length - 1];
  const lastCreated = new Date(lastBubble.getAttribute('data-created') || 0).getTime();
  const lastSeen = Boolean(latestOtherReceipt) && lastCreated <= latestOtherReadTime;
  const summary = document.createElement('div');
  if (lastSeen) {
    summary.className = 'msg-seen-receipt';
    const timeStr = formatMsgTime(latestOtherReceipt.seenAt);
    const conv = chatConversations.find(c => c.id === convId);
    const label = conv?.isGroup
      ? `Seen by ${escHtml(latestOtherReceipt.userName?.split(' ')[0] || 'Member')}`
      : 'Seen';
    summary.innerHTML = `${seenIcon} ${label} · ${timeStr}`;
  } else {
    summary.className = 'msg-seen-receipt sent';
    summary.innerHTML = `${sentIcon} Sent`;
  }
  lastBubble.insertAdjacentElement('afterend', summary);
}

function renderMessages(conv, msgs, prevReadMarker) {
  const box = document.getElementById('cwMessages');
  if (!box) return;
  if (!msgs.length) {
    box.innerHTML = '<div class="cw-empty">No messages yet — say hi!</div>';
    updateSeenReceiptsUI(conv.id);
    box.scrollTop = box.scrollHeight;
    return;
  }

  // Incoming messages newer than the reader's last read marker form the unread queue.
  const isIncoming = m => String(m.sender_id) !== String(CURRENT_PROFILE?.id);
  const markerTime = prevReadMarker ? new Date(prevReadMarker).getTime() : 0;
  const isUnread = m => isIncoming(m) && (!prevReadMarker || new Date(m.created_at).getTime() > markerTime);
  const unreadTotal = msgs.filter(isUnread).length;

  let dividerPlaced = false;
  const parts = [];
  msgs.forEach(m => {
    const unread = isUnread(m);
    if (unread && !dividerPlaced) {
      parts.push(`<div class="chat-unread-divider"><span>${unreadTotal} unread message${unreadTotal !== 1 ? 's' : ''}</span></div>`);
      dividerPlaced = true;
    }
    parts.push(messageBubbleHtml(conv, m, unread));
  });

  box.innerHTML = parts.join('');
  updateSeenReceiptsUI(conv.id);
  box.scrollTop = box.scrollHeight;
}

window._chatAttachmentMap = window._chatAttachmentMap || {};

function getChatAttachmentUrl(attach) {
  if (!attach) return '';
  // 1. Direct absolute URL (e.g. Supabase Storage CDN URL or full https://)
  if (/^https?:\/\//i.test(attach.url)) return attach.url;

  // 2. Derive filename from attach.url or attach.name
  let rawFilename = '';
  if (attach.url && typeof attach.url === 'string') {
    rawFilename = attach.url.split('/').pop() || '';
  }
  if (!rawFilename && attach.name) {
    rawFilename = attach.name;
  }

  // 3. If filename has timestamp prefix (e.g. 17942..._photo.jpg), point directly to Supabase Storage CDN!
  if (rawFilename && rawFilename.includes('-')) {
    return `https://qxpsbewbgdwkermxeeso.supabase.co/storage/v1/object/public/chat-attachments/${encodeURIComponent(rawFilename)}`;
  }

  // 4. Fallback to API_BASE or window.location.origin
  let base = window.API_BASE;
  if (!base || base === 'null' || base.startsWith('file:')) {
    base = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:'))
      ? window.location.origin
      : 'http://localhost:3001';
  } else if (typeof window !== 'undefined' && window.location) {
    if (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null') {
      base = 'http://localhost:3001';
    }
  }

  const cleanUrl = attach.url && attach.url.startsWith('/') ? attach.url : `/${attach.url || rawFilename}`;
  return `${base.replace(/\/+$/, '')}${cleanUrl}`;
}

function handleChatBubbleImgError(imgEl, msgId) {
  if (!imgEl) return;
  const entry = window._chatAttachmentMap?.[msgId];
  const attach = entry?.attach;
  if (!attach) return;

  // 1. Try server relative endpoint if current src was Supabase CDN
  if (!imgEl._triedServerFallback) {
    imgEl._triedServerFallback = true;
    let base = window.API_BASE || window.location.origin;
    const filename = attach.url ? attach.url.split('/').pop() : attach.name;
    if (filename) {
      imgEl.src = `${base.replace(/\/+$/, '')}/uploads/chat/${encodeURIComponent(filename)}`;
      return;
    }
  }

  // 2. Try Supabase Storage CDN if current src was server endpoint
  if (!imgEl._triedCdnFallback) {
    imgEl._triedCdnFallback = true;
    const filename = attach.url ? attach.url.split('/').pop() : attach.name;
    if (filename) {
      imgEl.src = `https://qxpsbewbgdwkermxeeso.supabase.co/storage/v1/object/public/chat-attachments/${encodeURIComponent(filename)}`;
      return;
    }
  }

  // 3. Fallback: hide the broken image element, but keep the nice file overview chip visible!
  const card = imgEl.closest('.chat-attachment-card');
  if (card) {
    card.classList.add('image-fallback-active');
  }
  const parent = imgEl.parentElement;
  if (parent && parent.classList.contains('chat-img-wrap')) {
    parent.style.display = 'none';
  }
}
window.handleChatBubbleImgError = handleChatBubbleImgError;

function toggleChatAttachmentMenu(msgId) {
  const menu = document.getElementById(`chatAttachmentMenu-${msgId}`);
  if (!menu) return;
  document.querySelectorAll('.chat-attachment-menu.open').forEach(el => {
    if (el !== menu) el.classList.remove('open');
  });
  menu.classList.toggle('open');
}

function downloadChatAttachment(msgId) {
  const entry = window._chatAttachmentMap?.[msgId];
  if (!entry?.attach) return;
  const a = document.createElement('a');
  a.href = getChatAttachmentUrl(entry.attach);
  a.download = entry.attach.name || 'attachment';
  document.body.appendChild(a);
  a.click();
  a.remove();
  document.getElementById(`chatAttachmentMenu-${msgId}`)?.classList.remove('open');
}
window.toggleChatAttachmentMenu = toggleChatAttachmentMenu;
window.downloadChatAttachment = downloadChatAttachment;

function messageBubbleHtml(conv, m, isUnread = false) {
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
    const fileUrl = getChatAttachmentUrl(attach);

    bodyHtml = `
      <div class="chat-attachment-card" style="position:relative;display:flex;flex-direction:column;gap:8px;padding:4px 0;">
        <div class="chat-attachment-actions">
          <button type="button" class="chat-attachment-more" onclick="event.stopPropagation();toggleChatAttachmentMenu('${m.id}')" aria-label="Attachment actions" title="Attachment actions">⋯</button>
          <div class="chat-attachment-menu" id="chatAttachmentMenu-${m.id}">
            <button type="button" onclick="event.stopPropagation();openChatAttachmentOverview('${m.id}');document.getElementById('chatAttachmentMenu-${m.id}')?.classList.remove('open')">Preview</button>
            <button type="button" onclick="event.stopPropagation();downloadChatAttachment('${m.id}')">Download</button>
          </div>
        </div>
        ${isImg ? `
          <div class="chat-img-wrap" style="position:relative;display:inline-block;max-width:280px;border-radius:10px;overflow:hidden;cursor:pointer;" onclick="openChatAttachmentOverview('${m.id}')" title="Click to view full image">
            <img src="${escHtml(fileUrl)}" alt="${escHtml(attach.name)}" onerror="handleChatBubbleImgError(this, '${m.id}')" style="max-width:280px;max-height:220px;width:auto;height:auto;object-fit:cover;border-radius:10px;display:block;border:1px solid rgba(0,0,0,0.08);cursor:pointer;transition:transform 0.15s ease;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'"/>
          </div>
        ` : ''}
        <div style="display:flex;align-items:center;gap:10px;background:rgba(${mine ? '255,255,255,0.18' : '0,0,0,0.06'});padding:8px 12px;border-radius:10px;min-width:210px;cursor:pointer;" onclick="openChatAttachmentOverview('${m.id}')">
          <span style="font-size:22px;" title="View overview">${isImg ? '🖼️' : '📄'}</span>
          <div style="min-width:0;flex:1;">
            <div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${mine ? '#ffffff' : '#0f172a'};" title="${escHtml(attach.name)}">${escHtml(attach.name)}</div>
            <div style="font-size:11px;opacity:0.85;color:${mine ? '#e0f2fe' : '#64748b'};">${formatChatFileSize(attach.size)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <button type="button" class="chat-overview-btn" onclick="event.stopPropagation();openChatAttachmentOverview('${m.id}')" style="display:inline-flex;align-items:center;gap:4px;padding:5px 9px;border-radius:8px;background:${mine ? 'rgba(255,255,255,0.22)' : '#e2e8f0'};color:${mine ? '#ffffff' : '#1e293b'};border:none;font-size:11.5px;font-weight:700;cursor:pointer;transition:all 0.15s ease;" title="Overview attachment">
              <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.5;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Overview
            </button>
            <a href="${fileUrl}" download="${escHtml(attach.name)}" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:4px;padding:5px 9px;border-radius:8px;background:${mine ? '#ffffff' : 'var(--blue, #2563eb)'};color:${mine ? '#2563eb' : '#ffffff'};font-size:11.5px;font-weight:700;text-decoration:none;" title="Download file">
              <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.5;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </a>
          </div>
        </div>
        ${attach.caption ? `<div class="msg-text" style="margin-top:6px;font-size:13px;line-height:1.45;word-break:break-word;">${escHtml(attach.caption)}</div>` : ''}
      </div>
    `;
  } else {
    bodyHtml = `<div class="msg-text">${escHtml(m.body)}</div>`;
  }

  return `<div class="msg-bubble ${mine ? 'me' : 'them'}${isUnread ? ' msg-unread' : ''}" data-mid="${m.id}" data-created="${m.created_at}">
    ${isUnread ? '<span class="msg-new-tag">New</span>' : ''}
    ${showName ? `<div class="msg-sender">${escHtml(m.sender_name)}</div>` : ''}
    ${bodyHtml}
    <div class="msg-time">${formatMsgTime(m.created_at)}${mine ? '<span class="msg-read-status"></span>' : ''}</div>
  </div>`;
}

function zoomChatLightbox(factor) {
  const img = document.getElementById('chatLightboxImg');
  const lbl = document.getElementById('lightboxZoomLevel');
  if (!img) return;
  if (factor === 0) {
    window._chatLightboxScale = 1;
  } else {
    window._chatLightboxScale = Math.max(0.4, Math.min(3.5, (window._chatLightboxScale || 1) * factor));
  }
  img.style.transform = `scale(${window._chatLightboxScale})`;
  if (lbl) lbl.textContent = `${Math.round(window._chatLightboxScale * 100)}%`;
}
window.zoomChatLightbox = zoomChatLightbox;

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

  if (msgId === 'pending' || !msgId) {
    if (pendingChatAttachment) {
      attach = {
        name: pendingChatAttachment.name,
        url: pendingChatAttachment.url,
        data: pendingChatAttachment.previewUrl || pendingChatAttachment.data,
        mime: pendingChatAttachment.mime,
        size: pendingChatAttachment.size
      };
      senderName = 'You (Attachment Preview)';
      createdAt = new Date().toISOString();
    }
  } else if (window._chatAttachmentMap && window._chatAttachmentMap[msgId]) {
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

  const fileUrl = getChatAttachmentUrl(attach);

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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:0 4px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:12.5px;color:#64748b;font-weight:600;">Image Lightbox</span>
          <span style="font-size:11px;background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:4px;font-weight:600;" id="lightboxZoomLevel">100%</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button type="button" class="sw-btn outline" onclick="zoomChatLightbox(1.2)" style="font-size:11.5px;padding:4px 8px;border-radius:6px;cursor:pointer;background:#fff;border:1px solid #cbd5e1;font-weight:700;" title="Zoom in">🔍 +</button>
          <button type="button" class="sw-btn outline" onclick="zoomChatLightbox(0.8)" style="font-size:11.5px;padding:4px 8px;border-radius:6px;cursor:pointer;background:#fff;border:1px solid #cbd5e1;font-weight:700;" title="Zoom out">🔍 -</button>
          <button type="button" class="sw-btn outline" onclick="zoomChatLightbox(0)" style="font-size:11.5px;padding:4px 8px;border-radius:6px;cursor:pointer;background:#fff;border:1px solid #cbd5e1;font-weight:600;" title="Reset zoom">Reset</button>
        </div>
      </div>
      <div id="chatLightboxStage" style="display:flex;justify-content:center;align-items:center;min-height:460px;max-height:72vh;background:#0f172a;border-radius:12px;padding:20px;overflow:auto;position:relative;">
        <img id="chatLightboxImg" src="${fileUrl}" alt="${escHtml(attach.name)}" style="max-width:100%;max-height:68vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.5);transition:transform 0.15s ease;" onerror="this.onerror=null;this.src='/uploads/chat/${encodeURIComponent(attach.name)}';"/>
      </div>
    `;
  } else if (isPdf) {
    previewContent = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:0 4px;">
        <span style="font-size:12.5px;color:#64748b;font-weight:600;">Document Viewer</span>
        <span style="font-size:11px;color:#64748b;">${escHtml(attach.name)}</span>
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
  window._chatLightboxScale = 1;
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

  const isImg = pendingChatAttachment && ((pendingChatAttachment.mime || '').startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)$/i.test(pendingChatAttachment.name));
  const previewImgSrc = pendingChatAttachment ? (pendingChatAttachment.previewUrl || getChatAttachmentUrl(pendingChatAttachment)) : '';

  const pendingAttachmentHtml = pendingChatAttachment ? `
    <div class="cw-pending-attachment-card" style="display:flex;align-items:center;gap:12px;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;padding:8px 12px;width:100%;box-shadow:0 2px 6px rgba(0,0,0,0.04);box-sizing:border-box;">
      ${isImg ? `
        <div style="position:relative;width:48px;height:48px;border-radius:8px;overflow:hidden;flex-shrink:0;cursor:pointer;border:1px solid #94a3b8;background:#0f172a;" onclick="openChatAttachmentOverview('pending')" title="Click to view full image in lightbox">
          <img src="${escHtml(previewImgSrc)}" alt="Preview" style="width:100%;height:100%;object-fit:cover;display:block;"/>
          <span style="position:absolute;bottom:2px;right:2px;background:rgba(0,0,0,0.7);color:#fff;border-radius:3px;padding:1px 3px;font-size:9px;">🔍</span>
        </div>
      ` : `
        <div style="width:40px;height:40px;border-radius:8px;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">
          📎
        </div>
      `}
      <div style="flex:1;min-width:0;">
        <div style="font-size:12.5px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(pendingChatAttachment.name)}">
          ${escHtml(pendingChatAttachment.name)}
        </div>
        <div style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:8px;margin-top:2px;">
          <span>${formatChatFileSize(pendingChatAttachment.size)}</span>
          ${isImg ? `<button type="button" onclick="openChatAttachmentOverview('pending')" style="background:none;border:none;color:#2563eb;font-weight:700;font-size:11px;cursor:pointer;padding:0;text-decoration:underline;">Click to maximize preview</button>` : ''}
        </div>
      </div>
      <button type="button" class="cw-pending-attachment-remove" onclick="clearPendingChatAttachment()" aria-label="Remove attachment" title="Remove attachment" style="width:26px;height:26px;border:none;border-radius:50%;background:#fee2e2;color:#dc2626;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0;">×</button>
    </div>` : '';

  area.innerHTML = `
    <div style="display:flex;flex-direction:column;width:100%;gap:8px;">
      ${pendingAttachmentHtml}
      <div style="display:flex;align-items:center;gap:10px;width:100%;">
        <button type="button" class="cw-attachment-btn" id="cwAttachmentBtn" title="Attach file (max 5MB)" aria-label="Attach file" onclick="event.preventDefault();event.stopPropagation();triggerChatAttachment()" ${activeConversationId ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 11-8 8a6 6 0 0 1-8.5-8.5l8-8a4 4 0 0 1 5.7 5.7l-8 8a2 2 0 0 1-2.8-2.8L15 6"/></svg></button>
        <button type="button" class="cw-emoji-btn" id="cwEmojiBtn" title="Emoji" aria-label="Choose emoji" onclick="toggleEmojiPicker(event)" ${activeConversationId ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3M8 8h.01M16 8h.01"/></svg></button>
        <div class="emoji-picker" id="cwEmojiPicker"></div>
        <input type="text" id="cwInput" aria-label="Message" placeholder="${pendingChatAttachment ? 'Add an optional caption…' : (activeConversationId ? 'Type a message…' : 'Select a conversation to start messaging')}" onkeydown="if(event.key==='Enter'){event.preventDefault();sendChatMsg();}" ${activeConversationId ? '' : 'disabled'}>
        <button class="cw-send" aria-label="Send message" onclick="sendChatMsg()" ${activeConversationId ? '' : 'disabled'}>${iconSend()}</button>
      </div>
    </div>`;
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
  let fileInput = document.getElementById('cwFilePicker');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'cwFilePicker';
    fileInput.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleChatFileUpload);
    document.body.appendChild(fileInput);
  }
  if (fileInput) {
    const returnState = JSON.stringify({ conversationId: activeConversationId, page: 'chats' });
    try {
      localStorage.setItem('scholaria_chat_attachment_return', returnState);
      sessionStorage.setItem('scholaria_chat_attachment_return', returnState);
    } catch (_) {}
    fileInput.value = '';
    fileInput.click();
  }
}

function clearChatAttachmentReturnState() {
  try {
    localStorage.removeItem('scholaria_chat_attachment_return');
    sessionStorage.removeItem('scholaria_chat_attachment_return');
  } catch (_) {}
}

function clearPendingChatAttachment() {
  pendingChatAttachment = null;
  renderInputArea();
}
window.clearPendingChatAttachment = clearPendingChatAttachment;

async function handleChatFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file || !activeConversationId) return;

  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB limit
  if (file.size > MAX_SIZE) {
    showToast(`Attachment exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select a file under 5MB.`, 'error');
    event.target.value = '';
    return;
  }

  const messageDraft = document.getElementById('cwInput')?.value || '';
  showToast(`Uploading ${file.name} to cloud storage…`, 'info');

  let localPreviewUrl = null;
  if (file.type && file.type.startsWith('image/')) {
    try {
      localPreviewUrl = URL.createObjectURL(file);
    } catch (_) {}
  }

  let serverBase = window.API_BASE;
  if (!serverBase || serverBase === 'null' || (typeof serverBase === 'string' && serverBase.startsWith('file:'))) {
    serverBase = 'http://localhost:3001';
  } else if (typeof window !== 'undefined' && window.location) {
    if (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null') {
      serverBase = 'http://localhost:3001';
    }
  }

  let session = null;
  try {
    if (window.db && window.db.auth) {
      const res = await window.db.auth.getSession();
      session = res?.data?.session;
    }
  } catch (_) {}

  let cloudUrl = '';
  let fallbackUrl = '';

  // 1. Primary: Upload via server endpoint (stores on disk & mirrors to Supabase Storage)
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
        cloudUrl = upData.url || '';
        fallbackUrl = upData.fallbackUrl || '';
      }
    } catch (upErr) {
      console.warn('Chat server upload attempt note:', upErr);
    }
  }

  // 2. Direct Supabase Storage client-side upload fallback if server upload didn't return cloudUrl
  if (!cloudUrl && window.db && window.db.storage) {
    try {
      const cleanSafeName = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { data: stData, error: stErr } = await window.db.storage
        .from('chat-attachments')
        .upload(cleanSafeName, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true
        });

      if (!stErr && stData) {
        cloudUrl = `https://qxpsbewbgdwkermxeeso.supabase.co/storage/v1/object/public/chat-attachments/${encodeURIComponent(cleanSafeName)}`;
        fallbackUrl = `/uploads/chat/${encodeURIComponent(cleanSafeName)}`;
      }
    } catch (stClientErr) {
      console.warn('Direct client Supabase Storage upload note:', stClientErr);
    }
  }

  if (!cloudUrl) {
    showToast('Failed to upload file to cloud storage. Please check your connection and try again.', 'error');
    event.target.value = '';
    return;
  }

  event.target.value = '';
  // Lightweight metadata payload — NEVER put heavy base64 strings in the database payload!
  pendingChatAttachment = {
    type: 'attachment',
    name: file.name,
    size: file.size,
    mime: file.type || 'application/octet-stream',
    url: cloudUrl,
    fallbackUrl: fallbackUrl || '',
    previewUrl: localPreviewUrl || cloudUrl // Only used in sender draft input box
  };

  renderInputArea();
  const draftInput = document.getElementById('cwInput');
  if (draftInput) draftInput.value = messageDraft;
  showToast('Image uploaded & ready to send.', 'success');
}

// Profanity & severe content sanitizer for instant optimistic client rendering
function censorProfanityText(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().startsWith('{"type":"attachment"')) return rawText;
  const badWords = [
    'fuck', 'fucking', 'fucker', 'fuckin', 'motherfucker',
    'shit', 'shitty', 'bullshit',
    'ass', 'bitch', 'asshole', 'bastard', 'dick', 'piss', 'cunt', 'whore', 'slut',
    'douchebag', 'putangina', 'tangina', 'gago', 'gaga', 'tarantado', 'ulol', 'bobo',
    'inutil', 'leche', 'peste', 'kupal', 'punyeta',
    'nigga', 'nigger', 'chink', 'spic', 'kike', 'faggot', 'tranny', 'retard'
  ];
  let censored = rawText;
  badWords.forEach(bad => {
    const reg = new RegExp(`\\b${bad}\\b|\\b${bad}s\\b`, 'gi');
    censored = censored.replace(reg, match => '*'.repeat(match.length));
  });
  return censored;
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
  // Sanitize text client-side immediately so uncensored words never persist in sender DOM
  const displayBody = censorProfanityText(text);
  const optimistic = { id: tempId, sender_id: CURRENT_PROFILE.id, sender_name: CURRENT_PROFILE.full_name, body: displayBody, created_at: new Date().toISOString() };
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
        if (box) {
          const failedBubble = box.querySelector(`[data-mid="${tempId}"]`);
          if (failedBubble) failedBubble.remove();
        }
        if (errData.error === 'CHAT_MUTED_PERMANENT' || errData.error === 'CHAT_MUTED_UNTIL') {
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
        body: displayBody
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
      // If handleIncomingMessage already added a bubble for sentData.id, remove the optimistic one to avoid duplicates!
      const alreadyRendered = box.querySelector(`[data-mid="${sentData.id}"]`);
      if (alreadyRendered && alreadyRendered !== sentBubble) {
        sentBubble.remove();
      } else {
        sentBubble.outerHTML = messageBubbleHtml(conv, sentData);
      }
    }
  }
  if (sentData.warning) showToast(sentData.warning, 'error');

  conv.lastMessage = sentData.body;
  conv.lastMessageAt = sentData.created_at;
  chatConversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  if (currentPage === 'chats') {
    renderContactsList();
    updateSeenReceiptsUI(conv.id);
  }
  await refreshOwnMuteStatus();
}

async function sendChatMsg() {
  const input = document.getElementById('cwInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text && !pendingChatAttachment) return;
  const attachment = pendingChatAttachment;
  pendingChatAttachment = null;
  input.value = '';
  if (attachment) {
    // Clean metadata payload for database storage: NO BASE64!
    const payloadToSend = {
      type: 'attachment',
      name: attachment.name,
      size: attachment.size,
      mime: attachment.mime,
      url: attachment.url,
      fallbackUrl: attachment.fallbackUrl || '',
      caption: text || ''
    };
    await sendChatRawMessage(JSON.stringify(payloadToSend));
  } else {
    await sendChatRawMessage(text);
  }
  if (currentPage === 'chats') renderInputArea();
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

      // If this is my own message that was previously rendered optimistically, replace it instead of duplicating
      const pendingOptimistic = isMine ? box.querySelector('[data-mid^="temp-"]') : null;
      if (pendingOptimistic) {
        pendingOptimistic.outerHTML = messageBubbleHtml(conv, msg);
      } else if (!box.querySelector(`[data-mid="${msg.id}"]`)) {
        box.insertAdjacentHTML('beforeend', messageBubbleHtml(conv, msg));
      }
      box.scrollTop = box.scrollHeight;
    }
    if (!isMine) {
      markConversationSeen(conv.id, msg.id, msg.created_at);
    } else {
      updateSeenReceiptsUI(conv.id);
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
    newChatState.directory = (data || []).filter(u => String(u.id) !== String(CURRENT_PROFILE?.id) && u.is_active !== false && u.isActive !== false);
    newChatState.loaded = true;
  }
  renderNewChatModal();
}
function closeNewChatModal() {
  document.getElementById('newChatModal').classList.remove('active');
}
function ncToggleContact(id) {
  const isStudent = typeof ROLE !== 'undefined' && ROLE === 'student';
  const target = newChatState.directory.find(c => c.id === id);
  const targetRole = String(target?.role || '').toLowerCase();

  if (newChatState.selected.has(id)) {
    newChatState.selected.delete(id);
  } else {
    if (isStudent) {
      const selectedContacts = newChatState.directory.filter(c => newChatState.selected.has(c.id));
      const hasFaculty = selectedContacts.some(c => String(c.role || '').toLowerCase() !== 'student');
      const hasStudents = selectedContacts.some(c => String(c.role || '').toLowerCase() === 'student');

      if (hasFaculty) {
        showToast('Direct messaging with faculty is 1-on-1 only. Unselect faculty to create a group chat with students.', 'warning');
        return;
      }
      if (hasStudents && targetRole !== 'student') {
        showToast('Students can only create group chats with other students.', 'warning');
        return;
      }
      if (targetRole !== 'student' && newChatState.selected.size >= 1) {
        showToast('Students can only create group chats with other students.', 'warning');
        return;
      }
    }
    newChatState.selected.add(id);
  }
  renderNewChatModal();
}
function ncFilterContacts(v) {
  newChatState.search = v;
  renderNewChatModal();
  const searchInput = document.querySelector('#newChatModalBody .nc-search');
  if (searchInput) {
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
  }
}
function renderNewChatModal() {
  const body = document.getElementById('newChatModalBody');
  const isStudent = typeof ROLE !== 'undefined' && ROLE === 'student';
  const q = newChatState.search.trim().toLowerCase();
  const filtered = newChatState.directory.filter(c =>
    !q || c.full_name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q));

  const selectedList = newChatState.directory.filter(c => newChatState.selected.has(c.id));
  const hasFacultySelected = selectedList.some(c => String(c.role || '').toLowerCase() !== 'student');
  const hasStudentSelected = selectedList.some(c => String(c.role || '').toLowerCase() === 'student');

  const rowsHtml = filtered.length ? filtered.map(c => {
    const isContactStudent = String(c.role || '').toLowerCase() === 'student';
    const isSelected = newChatState.selected.has(c.id);
    const isDisabled = isStudent && !isSelected && (
      hasFacultySelected || (hasStudentSelected && !isContactStudent)
    );
    const rowTitle = isDisabled
      ? (hasFacultySelected ? 'Direct messaging with faculty is 1-on-1 only' : 'Students can only create group chats with other students')
      : '';

    return `
    <label class="nc-contact-row ${isSelected ? 'picked' : ''}" style="${isDisabled ? 'opacity:0.45;cursor:not-allowed;' : ''}" title="${rowTitle}">
      <input type="checkbox" ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''} onchange="ncToggleContact('${c.id}')">
      <div class="contact-avatar" style="width:32px;height:32px;font-size:11px;">${initialsFor(c.full_name)}</div>
      <div class="contact-info">
        <h4>${escHtml(c.full_name)}</h4>
        <span>${escHtml(c.role.charAt(0).toUpperCase() + c.role.slice(1))}${c.school_id ? ' · ' + escHtml(c.school_id) : ''}</span>
      </div>
      ${isDisabled ? `<span style="font-size:11px;color:#94a3b8;margin-left:auto;padding-right:6px;">${hasFacultySelected ? '1-on-1 only' : 'Students only'}</span>` : ''}
    </label>`;
  }).join('') : `<div class="nc-empty">No matching people found.</div>`;

  const bannerHtml = isStudent ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:10px;padding:9px 13px;font-size:12px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
      <span style="font-size:15px;flex-shrink:0;">ℹ️</span>
      <span>Students can message teachers 1-on-1 for consultation, or form group chats with fellow students.</span>
    </div>` : '';

  body.innerHTML = `
    ${bannerHtml}
    <input type="text" class="nc-search" placeholder="Search by name or role…" value="${escHtml(newChatState.search)}" oninput="ncFilterContacts(this.value)">
    <div class="nc-contact-list">${rowsHtml}</div>
    ${newChatState.selected.size > 1 ? `
      <div class="gen-field"><label>Group name (optional)</label>
        <input type="text" class="nc-group-name" id="ncGroupName" placeholder="e.g. Grade 12 STEM — Study Group">
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
  const isStudent = typeof ROLE !== 'undefined' && ROLE === 'student';
  if (isGroup && isStudent) {
    const nonStudents = picked.filter(p => String(p.role || '').toLowerCase() !== 'student');
    if (nonStudents.length > 0) {
      showToast('Students can only create group chats with other students.', 'error');
      return;
    }
  }

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
