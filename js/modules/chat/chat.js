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

// A database read must never move a marker backwards: the just-read timestamp
// lives in the cache while the request that persists it may still be in flight.
function hydrateChatReadMarker(conversationId, value) {
  if (!conversationId) return;
  const cached = chatReadMarkers[conversationId] || '';
  if (!value) {
    if (!cached) chatReadMarkers[conversationId] = '';
    return;
  }
  if (!cached || new Date(value).getTime() > new Date(cached).getTime()) {
    chatReadMarkers[conversationId] = value;
  }
}

function getTeacherUnreadChatCount() {
  return typeof lastTeacherUnreadMessageCount === 'number' ? lastTeacherUnreadMessageCount : 0;
}
window.getTeacherUnreadChatCount = getTeacherUnreadChatCount;

async function refreshTeacherUnreadMessageCount() {
  const badge = document.getElementById('teacherUnreadMessageCount');
  if (!badge || !CURRENT_PROFILE || !db) return;
  if (CURRENT_PROFILE.is_demo) return;
  const { data: rows, error } = await db.from('conversation_participants')
    .select('conversation_id, last_read_at').eq('user_id', CURRENT_PROFILE.id);
  if (error) { console.error('Could not load unread chat count:', error.message); return; }
  (rows || []).forEach(r => hydrateChatReadMarker(r.conversation_id, r.last_read_at || ''));
  const conversationIds = [...new Set((rows || []).map(row => row.conversation_id).filter(Boolean))];
  if (!conversationIds.length) { badge.textContent = '0'; lastTeacherUnreadMessageCount = 0; return; }
  const { data: messages, error: messageError } = await db.from('messages')
    .select('conversation_id,sender_id,created_at,body').in('conversation_id', conversationIds);
  if (messageError) { console.error('Could not load unread chat messages:', messageError.message); return; }
  const unreadCount = (messages || []).filter(message => {
    if (String(message.sender_id) === String(CURRENT_PROFILE.id)) return false;
    if (parseChatEvent(message.body)) return false;
    const marker = getChatReadMarker(message.conversation_id);
    return !marker || new Date(message.created_at).getTime() > new Date(marker).getTime();
  }).length;
  // Remember the count so dashboard re-renders can show it synchronously
  // instead of flashing the placeholder '0' while the async recount runs.
  lastTeacherUnreadMessageCount = unreadCount;
  if (badge.isConnected) badge.textContent = String(unreadCount);
}

function refreshTeacherUnreadOnPageChange() {
  if (typeof ROLE === 'undefined' || ROLE !== 'teacher') return;
  if (typeof currentPage !== 'undefined' && currentPage === 'dashboard') {
    refreshTeacherUnreadMessageCount();
  }
}
window.refreshTeacherUnreadOnPageChange = refreshTeacherUnreadOnPageChange;

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
  // Mute state lives in the database. Re-sync it on every visit instead of
  // clearing it locally, otherwise a mute looks gone right after re-login.
  if (CURRENT_PROFILE) {
    try {
      await refreshOwnMuteStatus();
    } catch (_) {}
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
  (partRows || []).forEach(r => hydrateChatReadMarker(r.conversation_id, r.last_read_at || ''));

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
    if (parseChatEvent(m.body)) return;
    const marker = getChatReadMarker(m.conversation_id);
    if (!marker || new Date(m.created_at).getTime() > new Date(marker).getTime()) {
      unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] || 0) + 1;
    }
  });

  const msgsByConv = {};
  (lastMsgs || []).forEach(m => {
    (msgsByConv[m.conversation_id] = msgsByConv[m.conversation_id] || []).push(m);
  });

  chatConversations = validPartRows.map(r => {
    const conv = Array.isArray(r.conversations) ? r.conversations[0] : r.conversations;
    if (!conv) return null;
    const convMsgs = msgsByConv[conv.id] || [];
    const groupMeta = conv.is_group ? computeGroupMeta(conv, convMsgs) : null;

    // A member removed through the three-dots menu keeps their history but is
    // routed into Archived GCs until an add_members event brings them back.
    if (groupMeta) {
      const archivedAt = getGroupArchivedAt(conv.id);
      const removedIsCurrent = groupMeta.removedMeAt &&
        (!groupMeta.addedMeAt || new Date(groupMeta.removedMeAt).getTime() > new Date(groupMeta.addedMeAt).getTime());
      if (removedIsCurrent && (!archivedAt || new Date(groupMeta.removedMeAt).getTime() >= new Date(archivedAt).getTime())) {
        setGroupArchivedAt(conv.id, groupMeta.removedMeAt);
      } else if (archivedAt && groupMeta.addedMeAt && new Date(groupMeta.addedMeAt).getTime() > new Date(archivedAt).getTime()) {
        clearGroupArchivedAt(conv.id);
      }
    }

    const participants = (allParts || []).filter(p => p.conversation_id === conv.id && !(groupMeta && groupMeta.removed[String(p.user_id)]));
    if (groupMeta) {
      Object.values(groupMeta.members).forEach(member => {
        if (groupMeta.removed[member.user_id]) return;
        if (!participants.some(p => String(p.user_id) === String(member.user_id))) {
          participants.push(member);
        }
      });
    }

    const archivedAt = conv.is_group ? getGroupArchivedAt(conv.id) : '';
    let last = lastByConv[conv.id];
    if (archivedAt) {
      // Archived chats must not leak messages sent after the archive point.
      const cutoff = new Date(archivedAt).getTime();
      last = convMsgs
        .filter(m => new Date(m.created_at).getTime() <= cutoff)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
    }
    return {
      id: conv.id,
      isGroup: Boolean(conv.is_group),
      title: (groupMeta && groupMeta.title) || conv.title,
      photoUrl: (groupMeta && groupMeta.photoUrl) || '',
      groupMeta,
      createdBy: conv.created_by,
      participants,
      lastMessage: last ? last.body : '',
      lastMessageAt: last ? last.created_at : conv.created_at,
      archivedAt,
      unread: (conv.id === activeConversationId || archivedAt) ? 0 : (unreadByConv[conv.id] || 0)
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

/* ── GROUP CHAT EVENTS ──
   Group metadata (name, photo, membership, permissions) is stored as
   group_event messages because the client cannot update conversations rows
   under RLS. Events replay chronologically into a per-conversation meta object. */
function parseChatEvent(body) {
  if (typeof body !== 'string') return null;
  const trimmed = body.trim();
  if (!trimmed.startsWith('{"type":"group_event"')) return null;
  try {
    const data = JSON.parse(trimmed);
    return data && data.type === 'group_event' ? data : null;
  } catch (e) { return null; }
}

function getArchivedGroupsStore() {
  try {
    const raw = localStorage.getItem('scholaria_archived_groups_v1');
    const map = raw ? JSON.parse(raw) : {};
    return map && typeof map === 'object' ? map : {};
  } catch (e) { return {}; }
}

function getMyArchivedGroups() {
  const store = getArchivedGroupsStore();
  const uid = String(CURRENT_PROFILE?.id || 'guest');
  return (store[uid] && typeof store[uid] === 'object') ? store[uid] : {};
}

function getGroupArchivedAt(convId) {
  return getMyArchivedGroups()[convId] || '';
}

function setGroupArchivedAt(convId, iso) {
  if (!convId) return;
  const store = getArchivedGroupsStore();
  const uid = String(CURRENT_PROFILE?.id || 'guest');
  store[uid] = store[uid] || {};
  store[uid][convId] = iso || new Date().toISOString();
  try { localStorage.setItem('scholaria_archived_groups_v1', JSON.stringify(store)); } catch (e) {}
}

function clearGroupArchivedAt(convId) {
  const store = getArchivedGroupsStore();
  const uid = String(CURRENT_PROFILE?.id || 'guest');
  if (!store[uid] || !store[uid][convId]) return;
  delete store[uid][convId];
  try { localStorage.setItem('scholaria_archived_groups_v1', JSON.stringify(store)); } catch (e) {}
}

function isGroupChatArchived(conv) {
  return Boolean(conv && conv.isGroup && getGroupArchivedAt(conv.id));
}

function applyGroupEventToMeta(meta, ev, msg) {
  if (!meta || !ev) return;
  const at = msg?.created_at || ev.at || new Date().toISOString();
  switch (ev.action) {
    case 'rename':
      if (ev.title) meta.title = String(ev.title).slice(0, 120);
      break;
    case 'photo':
      meta.photoUrl = ev.url || '';
      break;
    case 'add_members':
      (ev.members || []).forEach(member => {
        const uid = String(member?.user_id || '');
        if (!uid) return;
        delete meta.removed[uid];
        meta.members[uid] = {
          user_id: uid,
          full_name: member.full_name || 'Member',
          role: member.role || 'student'
        };
        if (uid === String(CURRENT_PROFILE?.id || '')) meta.addedMeAt = at;
      });
      break;
    case 'remove_member': {
      const uid = String(ev.user_id || '');
      if (!uid) break;
      meta.removed[uid] = true;
      delete meta.managers[uid];
      if (uid === String(CURRENT_PROFILE?.id || '')) meta.removedMeAt = at;
      break;
    }
    case 'permission': {
      const uid = String(ev.user_id || '');
      if (!uid) break;
      if (ev.canManage) meta.managers[uid] = true;
      else delete meta.managers[uid];
      break;
    }
  }
}

function computeGroupMeta(conv, msgs) {
  const meta = {
    title: conv.title || '',
    photoUrl: '',
    managers: {},
    removed: {},
    members: {},
    addedMeAt: '',
    removedMeAt: ''
  };
  if (conv.created_by) meta.managers[String(conv.created_by)] = true;
  [...(msgs || [])]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach(m => {
      const ev = parseChatEvent(m.body);
      if (ev) applyGroupEventToMeta(meta, ev, m);
    });
  return meta;
}

function ensureGroupMeta(conv) {
  if (!conv || !conv.isGroup) return null;
  if (!conv.groupMeta) {
    conv.groupMeta = {
      title: conv.title || '',
      photoUrl: conv.photoUrl || '',
      managers: {},
      removed: {},
      members: {},
      addedMeAt: '',
      removedMeAt: ''
    };
    if (conv.created_by) conv.groupMeta.managers[String(conv.created_by)] = true;
  }
  return conv.groupMeta;
}

function applyLiveGroupEvent(conv, ev, msg) {
  const meta = ensureGroupMeta(conv);
  if (!meta) return;
  applyGroupEventToMeta(meta, ev, msg);
  if (meta.title) conv.title = meta.title;
  conv.photoUrl = meta.photoUrl || '';
}

function isGroupManager(conv) {
  if (!conv || !conv.isGroup) return false;
  const me = String(CURRENT_PROFILE?.id || '');
  return String(conv.created_by || '') === me || Boolean(conv.groupMeta?.managers?.[me]);
}

function isConversationReadOnly(conv) {
  if (!conv || !conv.isGroup) return false;
  if (isGroupChatArchived(conv)) return true;
  return Boolean(conv.groupMeta?.removed?.[String(CURRENT_PROFILE?.id || '')]);
}

function chatEventSummary(ev, senderName) {
  const who = senderName || 'Someone';
  switch (ev.action) {
    case 'rename': return `${who} renamed the group to “${ev.title || 'Untitled'}”`;
    case 'photo': return `${who} changed the group photo`;
    case 'add_members': return `${who} added ${(ev.members || []).map(m => m.full_name || 'a member').join(', ')}`;
    case 'remove_member': return `${who} removed ${ev.full_name || 'a member'}`;
    case 'permission': return `${who} ${ev.canManage ? 'granted' : 'revoked'} group-management permission ${ev.canManage ? 'to' : 'from'} ${ev.full_name || 'a member'}`;
    default: return `${who} updated the group`;
  }
}

function conversationPreview(c) {
  if (!c || !c.lastMessage) return 'No messages yet';
  const event = parseChatEvent(c.lastMessage);
  if (event) return '📣 Group update';
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
  const me = String(CURRENT_PROFILE?.id || '');
  const query = chatListState.search.trim().toLowerCase();
  const archivedMap = getMyArchivedGroups();
  const filtered = chatConversations.filter(c => {
    const archivedAt = c.isGroup ? (archivedMap[c.id] || '') : '';
    if (chatListState.role === 'archived') {
      if (!archivedAt) return false;
    } else if (archivedAt) {
      return false;
    } else if (chatListState.role === 'group') {
      if (!c.isGroup) return false;
    } else if (chatListState.role !== 'all') {
      if (c.isGroup) return false;
      if (!c.participants.some(p => String(p.user_id) !== me && p.role === chatListState.role)) return false;
    }
    if (!query) return true;
    return conversationLabel(c).toLowerCase().includes(query) || conversationPreview(c).toLowerCase().includes(query);
  });
  if (!filtered.length) {
    const emptyMsg = chatListState.role === 'archived'
      ? 'No archived group chats.'
      : (chatListState.role === 'group' ? 'No group chats yet. Tap + to start one.' : 'No matching conversations.');
    box.innerHTML = `<div class="contact-empty">${emptyMsg}</div>`;
    return;
  }
  box.innerHTML = filtered.map(c => {
    const archivedAt = c.isGroup ? (archivedMap[c.id] || '') : '';
    const avatarInner = (c.isGroup && c.photoUrl)
      ? `<img src="${escHtml(c.photoUrl)}" alt="Group photo" onerror="this.style.display='none';this.parentElement.textContent='👥';"/>`
      : conversationInitials(c);
    return `
    <div class="contact-row ${c.id === activeConversationId ? 'active-contact' : ''} ${archivedAt ? 'contact-row-archived' : ''}" data-conv="${c.id}" onclick="openConversation('${c.id}')">
      <div class="contact-avatar ${c.isGroup ? 'group-avatar' : ''} ${c.photoUrl ? 'has-photo' : ''}">${avatarInner}</div>
      <div class="contact-info">
        <h4>${escHtml(conversationLabel(c))}${archivedAt ? '<span class="contact-archived-tag">Archived</span>' : ''}</h4>
        <span>${escHtml(conversationPreview(c))}</span>
      </div>
      <div class="contact-meta">
        <span class="contact-time">${formatMsgTime(c.lastMessageAt, true)}</span>
        ${c.unread > 0 ? `<span class="contact-unread">${c.unread > 9 ? '9+' : c.unread}</span>` : ''}
      </div>
    </div>`;
  }).join('');
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
  const archivedAt = conv.isGroup ? getGroupArchivedAt(conv.id) : '';

  if (avatar) {
    avatar.className = 'contact-avatar' + (conv.isGroup ? ' group-avatar' : '') + (conv.photoUrl ? ' has-photo' : '');
    if (conv.isGroup && conv.photoUrl) {
      avatar.innerHTML = `<img src="${escHtml(conv.photoUrl)}" alt="Group photo" onerror="this.style.display='none';this.parentElement.textContent='👥';"/>`;
    } else {
      avatar.textContent = conversationInitials(conv);
    }
  }
  if (name) name.textContent = conversationLabel(conv);
  if (role) role.textContent = conversationSub(conv);
  updateGroupChatHeaderControls(conv);
  renderInputArea();
  if (msgsBox) msgsBox.innerHTML = '<div class="cw-loading">Loading messages…</div>';

  const { data, error } = await db.from('messages')
    .select('*').eq('conversation_id', id).order('created_at', { ascending: true });
  if (error) { console.error('Failed to load messages:', error.message); return; }
  let visibleMsgs = data || [];
  if (archivedAt) {
    const cutoff = new Date(archivedAt).getTime();
    visibleMsgs = visibleMsgs.filter(m => new Date(m.created_at).getTime() <= cutoff);
  }
  visibleMsgs.forEach(m => seenMessageIds.add(m.id));
  const latestIncoming = visibleMsgs.filter(m => String(m.sender_id) !== String(CURRENT_PROFILE?.id)).at(-1);
  if (latestIncoming && !archivedAt) setChatReadMarker(id, latestIncoming.created_at);
  conv.unread = 0;
  if (currentPage === 'dashboard' && ROLE === 'teacher') refreshTeacherUnreadMessageCount();
  renderMessages(conv, visibleMsgs, prevReadMarker);

  const lastMsg = visibleMsgs.length ? visibleMsgs[visibleMsgs.length - 1] : null;
  if (!archivedAt) markConversationSeen(id, lastMsg?.id, lastMsg?.created_at);
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
  updateGroupChatHeaderControls(null);
  renderContactsList();
}

function updateGroupChatHeaderControls(conv) {
  const menuBtn = document.getElementById('cwGroupMenuBtn');
  const pill = document.getElementById('cwArchivedPill');
  if (menuBtn) menuBtn.style.display = (conv && conv.isGroup) ? 'inline-flex' : 'none';
  if (pill) pill.style.display = (conv && conv.isGroup && getGroupArchivedAt(conv.id)) ? 'inline-flex' : 'none';
  const menu = document.getElementById('cwGroupMenu');
  if (menu) { menu.style.display = 'none'; menu.innerHTML = ''; }
}

function chatArchiveNoticeHtml(conv) {
  if (!conv || !conv.isGroup) return '';
  const me = String(CURRENT_PROFILE?.id || '');
  if (conv.groupMeta?.removed?.[me]) {
    return `<div class="cw-archive-notice is-removed">🚫 <span>You are no longer a member of this group. Your history stays viewable up to your removal; new messages are hidden until someone adds you back.</span></div>`;
  }
  const archivedAt = getGroupArchivedAt(conv.id);
  if (!archivedAt) return '';
  const when = new Date(archivedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return `<div class="cw-archive-notice">📦 <span>Archived ${escHtml(when)}. History is frozen here and new messages stay hidden.</span><button type="button" onclick="unarchiveActiveGroupChat()">Unarchive</button></div>`;
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
    box.innerHTML = '<div class="cw-empty">No messages yet — say hi!</div>' + chatArchiveNoticeHtml(conv);
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

  box.innerHTML = parts.join('') + chatArchiveNoticeHtml(conv);
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
  const groupEvent = parseChatEvent(m.body);
  if (groupEvent) {
    return `<div class="msg-group-event" data-mid="${m.id}"><span class="msg-group-event-icon">📣</span><span>${escHtml(chatEventSummary(groupEvent, m.sender_name || 'Someone'))}</span><span class="msg-group-event-time">${formatMsgTime(m.created_at)}</span></div>`;
  }
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

  const activeConv = chatConversations.find(c => c.id === activeConversationId);
  if (activeConv && activeConv.isGroup && isConversationReadOnly(activeConv)) {
    const me = String(CURRENT_PROFILE?.id || '');
    const removed = Boolean(activeConv.groupMeta?.removed?.[me]);
    area.innerHTML = removed
      ? `<div class="cw-readonly-notice is-removed">🚫 You were removed from this group. History stays viewable, but new messages are hidden until a manager adds you back.</div>`
      : `<div class="cw-readonly-notice">📦 This group chat is archived. History is frozen and new messages stay hidden.<button type="button" onclick="unarchiveActiveGroupChat()">Unarchive</button></div>`;
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
  if (!rawText || typeof rawText !== 'string' || rawText.trim().startsWith('{"type":"attachment"') || rawText.trim().startsWith('{"type":"group_event"')) return rawText;
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

/* ── GROUP CHAT MANAGEMENT (THREE-DOTS MENU) ── */
function handleIncomingGroupEvent(msg, ev) {
  const conv = chatConversations.find(c => c.id === msg.conversation_id);
  if (!conv) {
    loadConversationsFromDB().then(() => renderContactsList());
    return;
  }

  const meId = String(CURRENT_PROFILE?.id || '');
  const wasArchived = isGroupChatArchived(conv);
  const addedMe = ev.action === 'add_members' && (ev.members || []).some(member => String(member.user_id) === meId);
  const removedMe = ev.action === 'remove_member' && String(ev.user_id) === meId;

  applyLiveGroupEvent(conv, ev, msg);

  if (wasArchived && addedMe) {
    clearGroupArchivedAt(conv.id);
    conv.archivedAt = '';
    if (typeof showToast === 'function') showToast(`You were added back to ${conversationLabel(conv)}.`, 'success');
    loadConversationsFromDB().then(() => {
      renderContactsList();
      if (activeConversationId === conv.id) openConversation(conv.id);
    });
    return;
  }

  if (removedMe) {
    setGroupArchivedAt(conv.id, new Date().toISOString());
    conv.archivedAt = getGroupArchivedAt(conv.id);
    if (typeof showToast === 'function') showToast('You were removed from this group. It now lives in Archived GCs.', 'info');
    if (activeConversationId === conv.id) openConversation(conv.id);
    renderContactsList();
    return;
  }

  if (isGroupChatArchived(conv)) {
    renderContactsList();
    return;
  }

  conv.lastMessage = msg.body;
  conv.lastMessageAt = msg.created_at;

  const isOpen = currentPage === 'chats' && activeConversationId === conv.id;
  if (isOpen) {
    const box = document.getElementById('cwMessages');
    if (box) {
      const empty = box.querySelector('.cw-empty');
      if (empty) empty.remove();
      if (!box.querySelector(`[data-mid="${msg.id}"]`)) {
        box.insertAdjacentHTML('beforeend', messageBubbleHtml(conv, msg));
      }
      box.scrollTop = box.scrollHeight;
    }
    refreshGroupChatUI(conv);
  }

  chatConversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  if (currentPage === 'chats') renderContactsList();
}

function refreshGroupChatUI(conv) {
  if (!conv) return;
  if (activeConversationId === conv.id) {
    const name = document.getElementById('cwName');
    const role = document.getElementById('cwRole');
    const avatar = document.getElementById('cwAvatar');
    if (name) name.textContent = conversationLabel(conv);
    if (role) role.textContent = conversationSub(conv);
    if (avatar) {
      avatar.className = 'contact-avatar' + (conv.isGroup ? ' group-avatar' : '') + (conv.photoUrl ? ' has-photo' : '');
      if (conv.isGroup && conv.photoUrl) {
        avatar.innerHTML = `<img src="${escHtml(conv.photoUrl)}" alt="Group photo" onerror="this.style.display='none';this.parentElement.textContent='👥';"/>`;
      } else {
        avatar.textContent = conversationInitials(conv);
      }
    }
    updateGroupChatHeaderControls(conv);
    renderInputArea();
  }
  if (currentPage === 'chats') renderContactsList();
}

function toggleGroupChatMenu(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const conv = chatConversations.find(c => c.id === activeConversationId);
  const menu = document.getElementById('cwGroupMenu');
  if (!conv || !conv.isGroup || !menu) return;
  if (menu.style.display === 'block') {
    menu.style.display = 'none';
    return;
  }

  const me = String(CURRENT_PROFILE?.id || '');
  const manager = isGroupManager(conv);
  const archived = Boolean(getGroupArchivedAt(conv.id));
  const removed = Boolean(conv.groupMeta?.removed?.[me]);

  const manageItems = manager ? `
    <button type="button" onclick="gcOpenRenameModal()"><span>✏️</span> Change group name</button>
    <button type="button" onclick="gcOpenPhotoModal()"><span>🖼️</span> Change group photo</button>
    <button type="button" onclick="gcOpenAddMembersModal()"><span>➕</span> Add users</button>
    <button type="button" onclick="gcOpenMembersModal()"><span>🛡️</span> Members &amp; permissions</button>
  ` : `
    <button type="button" onclick="gcOpenMembersModal()"><span>👥</span> View members</button>
  `;

  menu.innerHTML = `${manageItems}
    ${archived
      ? `<button type="button" class="gc-menu-primary" onclick="unarchiveActiveGroupChat()"><span>📤</span> Unarchive group chat</button>`
      : (removed ? '' : `<button type="button" class="gc-menu-danger" onclick="gcArchiveActiveGroupChat()"><span>📦</span> Archive group chat</button>`)}
  `;
  menu.style.display = 'block';
}

function gcOpenModal(title, bodyHtml, footHtml, variant = '') {
  const groupMenu = document.getElementById('cwGroupMenu');
  if (groupMenu) groupMenu.style.display = 'none';
  let overlay = document.getElementById('gcModalOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'gcModalOverlay';
    overlay.className = 'gc-modal-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div class="gc-modal-card ${variant}" role="dialog" aria-modal="true" aria-label="${escHtml(title)}">
    <header class="gc-modal-head"><h3>${escHtml(title)}</h3><button type="button" class="gc-modal-close" aria-label="Close" onclick="closeGroupChatModal()">&times;</button></header>
    <div class="gc-modal-body">${bodyHtml}</div>
    <footer class="gc-modal-foot">${footHtml || ''}</footer>
  </div>`;
  overlay.classList.add('active');
}

function closeGroupChatModal() {
  const overlay = document.getElementById('gcModalOverlay');
  if (!overlay) return;
  const previewUrl = overlay.querySelector('.gc-photo-preview')?.dataset.previewUrl;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  overlay.classList.remove('active');
  overlay.innerHTML = '';
}

function gcCurrentGroup() {
  const conv = chatConversations.find(c => c.id === activeConversationId);
  if (!conv || !conv.isGroup) {
    if (typeof showToast === 'function') showToast('Open a group chat first.', 'info');
    return null;
  }
  if (!isGroupManager(conv)) {
    if (typeof showToast === 'function') showToast('Only group managers can do that.', 'warning');
    return null;
  }
  return conv;
}

async function sendGroupEvent(event) {
  const conv = chatConversations.find(c => c.id === activeConversationId);
  if (!conv || !conv.isGroup) return false;
  const payload = {
    type: 'group_event',
    ...event,
    actor_id: CURRENT_PROFILE.id,
    actor_name: CURRENT_PROFILE.full_name,
    at: new Date().toISOString()
  };
  applyLiveGroupEvent(conv, payload, { sender_id: CURRENT_PROFILE.id, sender_name: CURRENT_PROFILE.full_name, created_at: payload.at });
  conv.lastMessage = JSON.stringify(payload);
  conv.lastMessageAt = payload.at;
  await sendChatRawMessage(JSON.stringify(payload));
  refreshGroupChatUI(conv);
  return true;
}

function gcOpenRenameModal() {
  const conv = gcCurrentGroup();
  if (!conv) return;
  gcOpenModal('Change group name',
    `<label class="gc-label" for="gcRenameInput">Group name</label>
     <input type="text" id="gcRenameInput" class="gc-input" maxlength="120" value="${escHtml(conv.title || '')}" placeholder="e.g. Grade 12 STEM Study Group">`,
    `<button type="button" class="gc-btn ghost" onclick="closeGroupChatModal()">Cancel</button>
     <button type="button" class="gc-btn primary" onclick="gcSaveRename()">Save name</button>`);
  setTimeout(() => document.getElementById('gcRenameInput')?.focus(), 60);
}

async function gcSaveRename() {
  const conv = gcCurrentGroup();
  const input = document.getElementById('gcRenameInput');
  const title = (input?.value || '').trim();
  if (!conv || !title) {
    if (!title && typeof showToast === 'function') showToast('Enter a group name.', 'warning');
    return;
  }
  closeGroupChatModal();
  conv.title = title;
  refreshGroupChatUI(conv);
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.access_token) {
      await fetch(`${window.API_BASE || ''}/api/chat/group-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ conversationId: conv.id, title })
      });
    }
  } catch (_) {}
  await sendGroupEvent({ action: 'rename', title });
  if (typeof showToast === 'function') showToast('Group name updated.', 'success');
}

/* ── ADD MEMBERS ── */
let gcAddState = { selected: new Set(), search: '' };

async function gcEnsureDirectory() {
  if (!newChatState.loaded || !newChatState.directory.length) {
    try {
      const { data, error } = await db.rpc('list_contacts');
      if (!error) {
        newChatState.directory = (data || []).filter(u => String(u.id) !== String(CURRENT_PROFILE?.id) && u.is_active !== false && u.isActive !== false);
        newChatState.loaded = true;
      }
    } catch (_) {}
  }
  return newChatState.directory;
}

async function gcOpenAddMembersModal() {
  const conv = gcCurrentGroup();
  if (!conv) return;
  gcAddState = { selected: new Set(), search: '' };
  gcOpenModal('Add users to group',
    `<div id="gcAddMembersWrap"><div class="gc-empty-note">Loading contacts…</div></div>`,
    `<button type="button" class="gc-btn ghost" onclick="closeGroupChatModal()">Cancel</button>
     <button type="button" class="gc-btn primary" id="gcAddMembersBtn" onclick="gcConfirmAddMembers()" disabled>Add selected</button>`);
  await gcEnsureDirectory();
  gcRenderAddMembersList();
}

function gcRenderAddMembersList() {
  const wrap = document.getElementById('gcAddMembersWrap');
  const conv = chatConversations.find(c => c.id === activeConversationId);
  if (!wrap || !conv) return;
  const isStudent = typeof ROLE !== 'undefined' && ROLE === 'student';
  const existingIds = new Set((conv.participants || []).map(p => String(p.user_id)));
  const members = Object.entries(conv.groupMeta?.members || {}).filter(([uid]) => !conv.groupMeta?.removed?.[uid]).map(([, m]) => m);
  members.forEach(m => existingIds.add(String(m.user_id)));

  const q = gcAddState.search.trim().toLowerCase();
  const candidates = newChatState.directory.filter(c => {
    if (existingIds.has(String(c.id))) return false;
    if (isStudent && String(c.role || '').toLowerCase() !== 'student') return false;
    return !q || c.full_name.toLowerCase().includes(q) || String(c.role || '').toLowerCase().includes(q);
  });

  const rowsHtml = candidates.length ? candidates.map(c => {
    const id = String(c.id);
    const picked = gcAddState.selected.has(id);
    return `<label class="gc-member-row ${picked ? 'picked' : ''}" data-gc-add="${escHtml(id)}">
      <input type="checkbox" ${picked ? 'checked' : ''} onchange="gcToggleAddMember('${id}')">
      <div class="contact-avatar" style="width:32px;height:32px;font-size:11px;">${initialsFor(c.full_name)}</div>
      <div class="contact-info"><h4>${escHtml(c.full_name)}</h4><span>${escHtml(String(c.role || '').charAt(0).toUpperCase() + String(c.role || '').slice(1))}${c.school_id ? ' · ' + escHtml(c.school_id) : ''}</span></div>
    </label>`;
  }).join('') : '<div class="gc-empty-note">No eligible people to add.</div>';

  wrap.innerHTML = `
    <input type="search" class="gc-input" placeholder="Search people…" value="${escHtml(gcAddState.search)}" oninput="gcFilterAddMembers(this.value)">
    <div class="gc-member-list">${rowsHtml}</div>
    ${isStudent ? '<p class="gc-empty-note">Students can only add fellow students to group chats.</p>' : ''}`;

  const btn = document.getElementById('gcAddMembersBtn');
  if (btn) {
    btn.disabled = gcAddState.selected.size === 0;
    btn.textContent = gcAddState.selected.size ? `Add ${gcAddState.selected.size} selected` : 'Add selected';
  }
}

function gcToggleAddMember(id) {
  if (gcAddState.selected.has(id)) gcAddState.selected.delete(id);
  else gcAddState.selected.add(id);
  gcRenderAddMembersList();
}

function gcFilterAddMembers(value) {
  gcAddState.search = value;
  gcRenderAddMembersList();
  const input = document.querySelector('#gcAddMembersWrap input[type="search"]');
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

async function gcConfirmAddMembers() {
  const conv = gcCurrentGroup();
  if (!conv || !gcAddState.selected.size) return;
  const members = newChatState.directory
    .filter(c => gcAddState.selected.has(String(c.id)))
    .map(c => ({ user_id: String(c.id), full_name: c.full_name, role: String(c.role || 'student') }));
  if (!members.length) return;

  try {
    const { data: { session } } = await db.auth.getSession();
    let serverAdded = false;
    if (session?.access_token) {
      const res = await fetch(`${window.API_BASE || ''}/api/chat/group-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ conversationId: conv.id, members })
      });
      serverAdded = res.ok;
    }
    if (!serverAdded) {
      await db.from('conversation_participants').insert(
        members.map(member => ({ conversation_id: conv.id, user_id: member.user_id, full_name: member.full_name, role: member.role }))
      );
    }
  } catch (_) {
    try {
      await db.from('conversation_participants').insert(
        members.map(member => ({ conversation_id: conv.id, user_id: member.user_id, full_name: member.full_name, role: member.role }))
      );
    } catch (_) {}
  }

  closeGroupChatModal();
  await sendGroupEvent({ action: 'add_members', members });
  await loadConversationsFromDB();
  const updated = chatConversations.find(c => c.id === conv.id);
  if (updated) refreshGroupChatUI(updated);
  if (typeof showToast === 'function') showToast(`${members.length} member${members.length > 1 ? 's' : ''} added.`, 'success');
}

/* ── MEMBERS & PERMISSIONS ── */
function gcOpenMembersModal() {
  const conv = chatConversations.find(c => c.id === activeConversationId);
  if (!conv || !conv.isGroup) return;
  gcRenderMembersModal(conv);
}

function gcRenderMembersModal(conv) {
  const me = String(CURRENT_PROFILE?.id || '');
  const manager = isGroupManager(conv);
  const meta = conv.groupMeta || {};
  const seen = new Set();
  const rows = [];

  (conv.participants || []).forEach(p => {
    const uid = String(p.user_id);
    if (seen.has(uid) || meta.removed?.[uid]) return;
    seen.add(uid);
    rows.push({ user_id: uid, full_name: p.full_name || 'Member', role: p.role || 'student' });
  });
  Object.entries(meta.members || {}).forEach(([uid, member]) => {
    if (seen.has(uid) || meta.removed?.[uid]) return;
    seen.add(uid);
    rows.push({ user_id: uid, full_name: member.full_name || 'Member', role: member.role || 'student' });
  });

  const rowsHtml = rows.map(row => {
    const isMe = row.user_id === me;
    const isManager = Boolean(meta.managers?.[row.user_id]) || String(conv.createdBy || '') === row.user_id;
    const actions = (manager && !isMe) ? `
      <div class="gc-member-actions">
        <button type="button" class="gc-mini-btn" onclick="gcTogglePermission('${row.user_id}', ${!isManager})">${isManager ? 'Revoke manage' : 'Make manager'}</button>
        <button type="button" class="gc-mini-btn danger" onclick="gcRemoveMember('${row.user_id}')">Remove</button>
      </div>` : '';
    return `<div class="gc-member-row">
      <div class="contact-avatar" style="width:34px;height:34px;font-size:12px;">${initialsFor(row.full_name)}</div>
      <div class="contact-info"><h4>${escHtml(row.full_name)}${isMe ? ' <span class="gc-you-tag">you</span>' : ''}</h4><span>${escHtml(String(row.role || '').charAt(0).toUpperCase() + String(row.role || '').slice(1))}${isManager ? ' · Manager' : ''}</span></div>
      ${actions}
    </div>`;
  }).join('');

  gcOpenModal('Group members',
    `<div class="gc-members-banner"><span class="gc-members-icon">♟</span><div><h3>Group members</h3><p>Manage the members of this group.</p></div></div>
     <div class="gc-member-list">${rowsHtml || '<div class="gc-empty-note">No members found.</div>'}</div>
     ${manager ? '<p class="gc-members-note">ⓘ &nbsp; Managers can rename the group, change its photo, and add or remove members.</p>' : ''}`,
    `<button type="button" class="gc-btn primary" onclick="closeGroupChatModal()">Close</button>`, 'gc-members-modal');
}

function gcMemberDisplayName(conv, userId) {
  const uid = String(userId);
  const fromParts = (conv?.participants || []).find(p => String(p.user_id) === uid);
  if (fromParts?.full_name) return fromParts.full_name;
  return conv?.groupMeta?.members?.[uid]?.full_name || 'Member';
}

async function gcTogglePermission(userId, canManage) {
  const conv = gcCurrentGroup();
  if (!conv) return;
  const fullName = gcMemberDisplayName(conv, userId);
  closeGroupChatModal();
  await sendGroupEvent({ action: 'permission', user_id: String(userId), full_name: fullName, canManage: Boolean(canManage) });
  gcOpenMembersModal();
  if (typeof showToast === 'function') showToast(canManage ? `${fullName} can now manage the group.` : `${fullName} is no longer a group manager.`, 'success');
}

async function gcRemoveMember(userId) {
  const conv = gcCurrentGroup();
  if (!conv) return;
  const fullName = gcMemberDisplayName(conv, userId);
  closeGroupChatModal();
  await sendGroupEvent({ action: 'remove_member', user_id: String(userId), full_name: fullName });
  gcOpenMembersModal();
  if (typeof showToast === 'function') showToast(`${fullName} was removed from the group.`, 'info');
}

/* ── GROUP PHOTO ── */
function gcOpenPhotoModal() {
  const conv = gcCurrentGroup();
  if (!conv) return;
  gcOpenModal('Change group photo',
    `<div class="gc-photo-title"><span>♧</span><div><h3>Change group photo</h3><p>Update the group photo for this conversation.</p></div></div>
     <div class="gc-photo-preview">${conv.photoUrl ? `<img src="${escHtml(conv.photoUrl)}" alt="Current group photo">` : '👥'}</div>
     <label class="gc-photo-upload" id="gcPhotoDrop" for="gcPhotoInput" ondragover="event.preventDefault();this.classList.add('dragging')" ondragleave="this.classList.remove('dragging')" ondrop="gcDropPhoto(event)">
       <span class="gc-photo-cloud">⇧</span><strong>Upload a photo</strong><span>Drag and drop your photo here, or</span><span class="gc-choose-photo">▧ &nbsp; Choose Image</span><small id="gcPhotoFilename">PNG, JPG or JPEG &nbsp;•&nbsp; Max 5MB</small>
     </label><input type="file" id="gcPhotoInput" class="gc-file-hidden" accept="image/png,image/jpeg" onchange="gcUploadPhoto(event)"><div id="gcPhotoStatus" class="gc-empty-note"></div>`,
    `<button type="button" class="gc-btn ghost" onclick="closeGroupChatModal()">Cancel</button><button type="button" id="gcPhotoUpdate" class="gc-btn primary" disabled onclick="gcSubmitPhoto()">✓ &nbsp; Update Photo</button>`, 'gc-photo-modal');
}

function gcUploadPhoto(event) {
  const file = event.target.files && event.target.files[0];
  gcSelectPhoto(file);
}

function gcDropPhoto(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('dragging');
  const input = document.getElementById('gcPhotoInput');
  if (input && event.dataTransfer.files?.length) input.files = event.dataTransfer.files;
  gcSelectPhoto(event.dataTransfer.files && event.dataTransfer.files[0]);
}

function gcSelectPhoto(file) {
  if (!file) return;
  const status = document.getElementById('gcPhotoStatus');
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    if (status) status.textContent = 'Please choose a PNG or JPG image.';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    if (typeof showToast === 'function') showToast('Group photo must be under 5MB.', 'error');
    return;
  }
  const label = document.getElementById('gcPhotoFilename');
  const button = document.getElementById('gcPhotoUpdate');
  const preview = document.querySelector('#gcModalOverlay .gc-photo-preview');
  if (preview) {
    const previousUrl = preview.dataset.previewUrl;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    const previewUrl = URL.createObjectURL(file);
    preview.dataset.previewUrl = previewUrl;
    preview.innerHTML = `<img src="${previewUrl}" alt="Selected group photo preview">`;
  }
  if (label) label.textContent = file.name;
  if (button) button.disabled = false;
  if (status) status.textContent = '';
}

async function gcSubmitPhoto() {
  const input = document.getElementById('gcPhotoInput');
  const file = input?.files?.[0];
  const conv = gcCurrentGroup();
  if (!file || !conv) return;
  if (file.size > 5 * 1024 * 1024) {
    if (typeof showToast === 'function') showToast('Group photo must be under 5MB.', 'error');
    input.value = '';
    return;
  }
  const status = document.getElementById('gcPhotoStatus');
  if (status) status.textContent = 'Uploading photo…';
  let url = '';
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.access_token) {
      const formData = new FormData();
      formData.append('file', file);
      const upRes = await fetch(`${window.API_BASE || ''}/api/chat/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData
      });
      if (upRes.ok) {
        const upData = await upRes.json();
        url = upData.storageUrl || upData.url || '';
      }
    }
  } catch (_) {}
  if (!url && window.db?.storage) {
    try {
      const cleanName = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await window.db.storage.from('chat-attachments').upload(cleanName, file, { contentType: file.type || 'image/png', upsert: true });
      if (!error) url = `https://qxpsbewbgdwkermxeeso.supabase.co/storage/v1/object/public/chat-attachments/${encodeURIComponent(cleanName)}`;
    } catch (_) {}
  }
  if (!url) {
    if (status) status.textContent = 'Upload failed. Please try again.';
    input.value = '';
    return;
  }
  closeGroupChatModal();
  conv.photoUrl = url;
  refreshGroupChatUI(conv);
  await sendGroupEvent({ action: 'photo', url, name: file.name });
  if (typeof showToast === 'function') showToast('Group photo updated.', 'success');
}

/* ── ARCHIVE / UNARCHIVE ── */
function gcArchiveActiveGroupChat() {
  const conv = chatConversations.find(c => c.id === activeConversationId);
  if (!conv || !conv.isGroup) return;
  gcOpenModal('Archive group chat',
    `<p>Archive <strong>${escHtml(conversationLabel(conv))}</strong>?</p>
     <p class="gc-empty-note">You'll keep the history up to this point in Archived GCs. New messages stay hidden until someone adds you back, or until you unarchive it yourself.</p>`,
    `<button type="button" class="gc-btn ghost" onclick="closeGroupChatModal()">Cancel</button>
     <button type="button" class="gc-btn danger" onclick="gcConfirmArchive()">Archive group chat</button>`);
}

function gcConfirmArchive() {
  const conv = chatConversations.find(c => c.id === activeConversationId);
  closeGroupChatModal();
  if (!conv) return;
  setGroupArchivedAt(conv.id, new Date().toISOString());
  conv.archivedAt = getGroupArchivedAt(conv.id);
  if (typeof showToast === 'function') showToast('Group chat archived. Find it under Archived GCs.', 'info');
  chatListState.role = 'archived';
  setChatFilter('archived');
  closeConversation();
}

function unarchiveActiveGroupChat() {
  const convId = activeConversationId;
  if (!convId) return;
  const conv = chatConversations.find(c => c.id === convId);
  const me = String(CURRENT_PROFILE?.id || '');
  if (conv?.groupMeta?.removed?.[me]) {
    if (typeof showToast === 'function') showToast('You were removed from this group. A manager must add you back.', 'warning');
    return;
  }
  clearGroupArchivedAt(convId);
  if (conv) conv.archivedAt = '';
  if (typeof showToast === 'function') showToast('Group chat unarchived — you can continue messaging.', 'success');
  chatListState.role = 'group';
  setChatFilter('group');
  if (conv) openConversation(conv.id);
}

document.addEventListener('click', e => {
  const menu = document.getElementById('cwGroupMenu');
  const btn = document.getElementById('cwGroupMenuBtn');
  if (menu && menu.style.display === 'block' && !menu.contains(e.target) && !(btn && btn.contains(e.target))) {
    menu.style.display = 'none';
  }
});

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

  const incomingEvent = parseChatEvent(msg.body);
  if (incomingEvent) {
    handleIncomingGroupEvent(msg, incomingEvent);
    return;
  }

  const conv = chatConversations.find(c => c.id === msg.conversation_id);
  if (!conv) {
    loadConversationsFromDB().then(() => {
      renderContactsList();
      if (ROLE === 'teacher' && currentPage === 'dashboard') refreshTeacherUnreadMessageCount();
    });
    return;
  }

  if (conv.isGroup && isConversationReadOnly(conv)) return;

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
        syncNewChatModalSelection();
        return;
      }
      if (hasStudents && targetRole !== 'student') {
        showToast('Students can only create group chats with other students.', 'warning');
        syncNewChatModalSelection();
        return;
      }
      if (targetRole !== 'student' && newChatState.selected.size >= 1) {
        showToast('Students can only create group chats with other students.', 'warning');
        syncNewChatModalSelection();
        return;
      }
    }
    newChatState.selected.add(id);
  }
  syncNewChatModalSelection();
}

// Update the open New Chat modal in place so picking people never re-renders
// the list (which used to reset the scroll position on every click).
function syncNewChatModalSelection() {
  const body = document.getElementById('newChatModalBody');
  const isStudent = typeof ROLE !== 'undefined' && ROLE === 'student';
  const selectedList = newChatState.directory.filter(c => newChatState.selected.has(c.id));
  const hasFacultySelected = selectedList.some(c => String(c.role || '').toLowerCase() !== 'student');
  const hasStudentSelected = selectedList.some(c => String(c.role || '').toLowerCase() === 'student');

  if (body) {
    body.querySelectorAll('.nc-contact-row[data-contact-id]').forEach(row => {
      const contact = newChatState.directory.find(c => String(c.id) === row.dataset.contactId);
      if (!contact) return;
      const isContactStudent = String(contact.role || '').toLowerCase() === 'student';
      const isSelected = newChatState.selected.has(contact.id);
      const isDisabled = isStudent && !isSelected && (hasFacultySelected || (hasStudentSelected && !isContactStudent));

      row.classList.toggle('picked', isSelected);
      row.style.opacity = isDisabled ? '0.45' : '';
      row.style.cursor = isDisabled ? 'not-allowed' : '';
      row.title = isDisabled ? (hasFacultySelected ? 'Direct messaging with faculty is 1-on-1 only' : 'Students can only create group chats with other students') : '';
      const cb = row.querySelector('input[type="checkbox"]');
      if (cb) { cb.checked = isSelected; cb.disabled = isDisabled; }

      let note = row.querySelector('.nc-rule-note');
      if (isDisabled) {
        if (!note) {
          note = document.createElement('span');
          note.className = 'nc-rule-note';
          row.appendChild(note);
        }
        note.textContent = hasFacultySelected ? '1-on-1 only' : 'Students only';
      } else if (note) {
        note.remove();
      }
    });

    const list = body.querySelector('.nc-contact-list');
    const groupField = body.querySelector('#ncGroupNameField');
    if (newChatState.selected.size > 1) {
      if (!groupField && list) {
        const wrap = document.createElement('div');
        wrap.className = 'gen-field';
        wrap.id = 'ncGroupNameField';
        wrap.innerHTML = `<label>Group name (optional)</label><input type="text" class="nc-group-name" id="ncGroupName" placeholder="e.g. Grade 12 STEM — Study Group">`;
        list.insertAdjacentElement('afterend', wrap);
      }
    } else if (groupField) {
      groupField.remove();
    }
  }

  const foot = document.getElementById('newChatModalFoot');
  if (foot) {
    const n = newChatState.selected.size;
    const countEl = foot.querySelector('.nc-picked-count');
    if (countEl) countEl.textContent = `${n} selected`;
    const createBtn = foot.querySelector('.nc-create-btn');
    if (createBtn) {
      createBtn.disabled = n === 0;
      createBtn.innerHTML = `${iconPlus()} ${n > 1 ? 'Start Group Chat' : 'Start Chat'}`;
    }
  }
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
    <label class="nc-contact-row ${isSelected ? 'picked' : ''}" data-contact-id="${escHtml(String(c.id))}" style="${isDisabled ? 'opacity:0.45;cursor:not-allowed;' : ''}" title="${rowTitle}">
      <input type="checkbox" ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''} onchange="ncToggleContact('${c.id}')">
      <div class="contact-avatar" style="width:32px;height:32px;font-size:11px;">${initialsFor(c.full_name)}</div>
      <div class="contact-info">
        <h4>${escHtml(c.full_name)}</h4>
        <span>${escHtml(c.role.charAt(0).toUpperCase() + c.role.slice(1))}${c.school_id ? ' · ' + escHtml(c.school_id) : ''}</span>
      </div>
      ${isDisabled ? `<span class="nc-rule-note" style="font-size:11px;color:#94a3b8;margin-left:auto;padding-right:6px;">${hasFacultySelected ? '1-on-1 only' : 'Students only'}</span>` : ''}
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
      <div class="gen-field" id="ncGroupNameField"><label>Group name (optional)</label>
        <input type="text" class="nc-group-name" id="ncGroupName" placeholder="e.g. Grade 12 STEM — Study Group">
      </div>` : ''}`;

  const n = newChatState.selected.size;
  document.getElementById('newChatModalFoot').innerHTML = `
    <span class="nc-picked-count">${n} selected</span>
    <div style="display:flex;gap:10px;">
      <button class="foot-btn-secondary" onclick="closeNewChatModal()">Cancel</button>
      <button class="foot-btn-secondary nc-create-btn" style="border-color:var(--blue);color:var(--blue);" ${n === 0 ? 'disabled' : ''} onclick="ncCreateConversation()">${iconPlus()} ${n > 1 ? 'Start Group Chat' : 'Start Chat'}</button>
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
