/* ── PERSISTENT ROLE-AWARE NOTIFICATIONS MODULE ── */

const NOTIF_STORAGE_KEY = 'scholaria_notifications_v1';
let pendingNotificationDelete = null;

const DEFAULT_SEED_NOTIFICATIONS = [];

function getStoredNotifications() {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(n => !(n.id && n.id.startsWith('notif_seed_')));
    }
  } catch (e) {
    return [];
  }
  return [];
}

function saveNotifications(list) {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

function seedLocalNotificationTestSamples() {
  if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return;
  const seedKey = 'scholaria_local_notification_samples_v1';
  if (localStorage.getItem(seedKey) || !CURRENT_PROFILE) return;

  const now = Date.now();
  const sampleItems = [
    ['Sample: New announcement', 'A new school announcement is available. Open this notification to review its full details.'],
    ['Sample: Quiz reminder', 'Reminder: your assigned quiz is available in the Quizzes section. Please review the instructions before starting.'],
    ['Sample: Materials update', 'A new learning material has been added for your subject. Visit My Materials to read it.'],
    ['Sample: Schedule update', 'There has been an update to an upcoming academic schedule. Check the announcement details for more information.'],
    ['Sample: Important school notice', 'This is a longer sample announcement to test how full notification details appear in the expanded popup. It includes extra context and a reminder to check the appropriate section for any related materials or actions.']
  ];
  const samples = sampleItems.map(([title, message], index) => ({
    id: `notif_sample_${now}_${index + 1}`,
    targetRole: null,
    targetUserId: CURRENT_PROFILE.id || null,
    title,
    message,
    senderName: 'Sample Notification',
    senderAvatar: 'SN',
    timestamp: new Date(now - index * 60 * 60 * 1000).toISOString(),
    readBy: [],
    type: index === 1 ? 'quiz' : 'announcement',
    isLocalTestSample: true
  }));

  saveNotifications([...samples, ...getStoredNotifications()]);
  localStorage.setItem(seedKey, 'true');
}

/**
 * Dispatch a new notification to a specific role or user
 */
function addNotification({ targetRole, targetUserId, title, message, type = 'info', senderName = 'System', senderAvatar = 'SYS' }) {
  const list = getStoredNotifications();
  const newNotif = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    targetRole: targetRole || null,
    targetUserId: targetUserId || null,
    title: title || 'Notification',
    message: message || '',
    senderName: senderName,
    senderAvatar: senderAvatar,
    timestamp: new Date().toISOString(),
    readBy: [],
    type: type // 'approval' | 'material' | 'quiz' | 'info'
  };
  list.unshift(newNotif);
  saveNotifications(list);
  refreshNotificationsUI();
}

/**
 * Get filtered notifications for current profile/role
 */
function getNotificationsForCurrentUser() {
  const all = getStoredNotifications();
  const myId = typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE?.id : '';
  const myRole = typeof ROLE !== 'undefined' ? ROLE : (typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE?.role : '');

  return all.filter(n => {
    if (n.targetUserId && n.targetUserId === myId) return true;
    if (n.targetUserId && n.targetUserId !== myId) return false;
    if (n.targetRole === myRole || n.targetRole === 'all' || !n.targetRole) return true;
    return false;
  });
}

function getUnreadNotificationsCount() {
  const myNotifs = getNotificationsForCurrentUser();
  const myId = typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE?.id : '';
  return myNotifs.filter(n => !(n.readBy || []).includes(myId)).length;
}

/**
 * Re-render notification dropdown & update unread badge counter
 */
function refreshNotificationsUI() {
  const badge = document.getElementById('notifBadge');
  const notifList = document.getElementById('notifList');

  const myNotifs = getNotificationsForCurrentUser();
  const myId = typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE?.id : '';
  const unreadCount = myNotifs.filter(n => !(n.readBy || []).includes(myId)).length;

  if (badge) {
    if (unreadCount > 0) {
      badge.style.display = 'flex';
      badge.textContent = unreadCount;
    } else {
      badge.style.display = 'none';
    }
  }

  // Also update sidebar menu badge if present
  const sidebarNotifBadge = document.querySelector('.menu-item[data-page="notifications"] .menu-badge');
  if (sidebarNotifBadge) {
    if (unreadCount > 0) {
      sidebarNotifBadge.style.display = 'inline-block';
      sidebarNotifBadge.textContent = unreadCount;
    } else {
      sidebarNotifBadge.style.display = 'none';
    }
  }

  if (!notifList) return;

  if (myNotifs.length === 0) {
    notifList.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No notifications right now.</div>`;
    return;
  }

  notifList.innerHTML = myNotifs.slice(0, 15).map(n => {
    const isUnread = !(n.readBy || []).includes(myId);
    const timeAgo = formatTimeAgo(n.timestamp);
    const iconStr = n.type === 'approval' ? '📌' : n.type === 'material' ? '📄' : n.type === 'quiz' ? '🎉' : '📢';
    return `
      <div class="notif-item ${isUnread ? 'unread' : ''}" onclick="handleNotifItemClick('${n.id}')">
        <div class="notif-dot"></div>
        <div class="notif-body">
          <p class="notif-msg">${iconStr} <strong>${escHtml(n.title)}</strong>: ${escHtml(n.message)}</p>
          <span class="notif-time">${timeAgo}</span>
        </div>
      </div>`;
  }).join('');
}

function handleNotifItemClick(id) {
  closeNotif();
  openNotificationDetailModal(id);
}

function ensureNotificationDetailModal() {
  let modal = document.getElementById('notificationDetailModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'notificationDetailModal';
  modal.className = 'notification-detail-overlay';
  modal.setAttribute('role', 'presentation');
  modal.innerHTML = `
    <section class="notification-detail-card" role="dialog" aria-modal="true" aria-labelledby="notifDetailTitle">
      <button type="button" class="notification-detail-close" aria-label="Close notification details" onclick="closeNotificationDetailModal()">&times;</button>
      <div class="notification-detail-kicker"><span class="notif-detail-badge" id="notifDetailTypeBadge"></span><span id="notifDetailStatusBadge"></span></div>
      <h2 id="notifDetailTitle"></h2>
      <div class="notification-detail-meta">
        <span id="notifDetailSender"></span>
        <span id="notifDetailDate"></span>
      </div>
      <div class="notification-detail-message" id="notifDetailMsg"></div>
      <footer class="notification-detail-actions" id="notifDetailActionBtnWrap"></footer>
    </section>`;
  modal.addEventListener('click', event => {
    if (event.target === modal) closeNotificationDetailModal();
  });
  document.body.appendChild(modal);
  return modal;
}

function openNotificationDetailModal(id) {
  const all = getStoredNotifications();
  const myId = typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE?.id : '';
  const item = all.find(n => n.id === id);
  if (!item) return;

  // Mark as read
  if (!item.readBy) item.readBy = [];
  if (!item.readBy.includes(myId)) {
    item.readBy.push(myId);
    saveNotifications(all);
    refreshNotificationsUI();
    if (isNotificationsPageActive() && typeof renderPage === 'function') {
      renderPage('notifications');
    }
  }

  const modal = ensureNotificationDetailModal();

  const typeEl = document.getElementById('notifDetailTypeBadge');
  const statusEl = document.getElementById('notifDetailStatusBadge');
  const titleEl = document.getElementById('notifDetailTitle');
  const senderEl = document.getElementById('notifDetailSender');
  const dateEl = document.getElementById('notifDetailDate');
  const msgEl = document.getElementById('notifDetailMsg');
  const actionWrap = document.getElementById('notifDetailActionBtnWrap');

  const typeConfig = {
    approval: { label: '📌 Approval Queue', bg: '#ffedd5', color: '#c2410c', page: 'approval', btnLabel: 'Open Approvals' },
    material: { label: '📄 Learning Material', bg: '#e0f2fe', color: '#0369a1', page: 'materials', btnLabel: 'View in Materials' },
    quiz: { label: '🎉 Quiz & Assessment', bg: '#fef3c7', color: '#b45309', page: 'quiz', btnLabel: 'Open Quizzes' },
    announcement: { label: '📢 School Announcement', bg: '#f3e8ff', color: '#7e22ce', page: 'announcements', btnLabel: 'Go to Announcements' },
    info: { label: 'ℹ️ System Notice', bg: '#f1f5f9', color: '#475569' }
  };
  const cfg = typeConfig[item.type] || typeConfig.info;

  if (typeEl) {
    typeEl.textContent = cfg.label;
    typeEl.style.background = cfg.bg;
    typeEl.style.color = cfg.color;
  }
  if (statusEl) {
    statusEl.innerHTML = `<span style="font-size:11px;font-weight:700;color:#059669;background:#dcfce7;padding:3px 9px;border-radius:12px;">✔ Read</span>`;
  }
  if (titleEl) titleEl.textContent = item.title || 'Notification';
  if (senderEl) {
    const sName = item.senderName || 'Academic Instructor';
    senderEl.textContent = `👤 From: ${sName}`;
  }
  if (dateEl) {
    dateEl.textContent = `📅 ${formatSentDate(item.timestamp)} (${formatTimeAgo(item.timestamp)})`;
  }
  if (msgEl) {
    msgEl.textContent = item.message || '';
  }

  if (actionWrap) {
    let actionBtnHtml = '';
    if (cfg.page && typeof renderPage === 'function') {
      actionBtnHtml += `
        <button type="button" class="gen-btn" style="background:#2563eb;color:#fff;padding:7px 14px;font-size:12px;font-weight:700;border-radius:8px;border:none;cursor:pointer;" onclick="closeNotificationDetailModal(); renderPage('${cfg.page}');">
          ${cfg.btnLabel || 'View Details'} &rarr;
        </button>
      `;
    }
    actionBtnHtml += `
      <button type="button" class="notif-act-btn danger" style="padding:7px 12px;font-size:12px;cursor:pointer;" onclick="requestNotificationDelete('single', '${item.id}')">
        Delete
      </button>
    `;
    actionWrap.innerHTML = actionBtnHtml;
  }

  modal.classList.add('active');
  modal.querySelector('.notification-detail-close')?.focus();
}

function closeNotificationDetailModal() {
  const modal = document.getElementById('notificationDetailModal');
  if (modal) modal.classList.remove('active');
}

function isNotificationsPageActive() {
  return (typeof window !== 'undefined' && window.currentPage === 'notifications') ||
         (typeof currentPage !== 'undefined' && currentPage === 'notifications') ||
         !!document.querySelector('.notif-page-wrap');
}

function formatTimeAgo(isoString) {
  if (!isoString) return 'Just now';
  const diffSec = Math.floor((new Date() - new Date(isoString)) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  return `${Math.floor(diffSec / 86400)} days ago`;
}

function formatSentDate(isoString) {
  if (!isoString) return 'N/A';
  const d = new Date(isoString);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${month} ${day}, ${time}`;
}

function toggleNotif() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) {
    const isOpen = dropdown.classList.toggle('open');
    document.getElementById('notifBtn')?.setAttribute('aria-expanded', String(isOpen));
    refreshNotificationsUI();
  }
}

function closeNotif() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) dropdown.classList.remove('open');
  document.getElementById('notifBtn')?.setAttribute('aria-expanded', 'false');
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeNotif();
    closeNotificationDetailModal();
  }
});

document.addEventListener('click', e => {
  const wrap = document.getElementById('notifWrap');
  if (wrap && !wrap.contains(e.target)) closeNotif();
});

/* ── NOTIFICATIONS PAGE MODULE (FULL TABLE & SELECTION ACTIONS) ── */
let notifTabFilter = 'all'; // 'all' | 'unread'
let selectedNotifIds = new Set();

function setNotifTabFilter(tab) {
  notifTabFilter = tab;
  if (isNotificationsPageActive() && typeof renderPage === 'function') renderPage('notifications');
}

function toggleNotifSelection(id) {
  if (selectedNotifIds.has(id)) {
    selectedNotifIds.delete(id);
  } else {
    selectedNotifIds.add(id);
  }
  if (isNotificationsPageActive() && typeof renderPage === 'function') renderPage('notifications');
}

function toggleSelectAllNotifs(checked) {
  const myNotifs = getNotificationsForCurrentUser();
  const filtered = notifTabFilter === 'unread' 
    ? myNotifs.filter(n => !(n.readBy || []).includes(CURRENT_PROFILE?.id))
    : myNotifs;
    
  if (checked) {
    filtered.forEach(n => selectedNotifIds.add(n.id));
  } else {
    selectedNotifIds.clear();
  }
  if (isNotificationsPageActive() && typeof renderPage === 'function') renderPage('notifications');
}

function markAllRead() {
  const all = getStoredNotifications();
  const myId = typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE?.id : '';
  all.forEach(n => {
    if (!n.readBy) n.readBy = [];
    if (!n.readBy.includes(myId)) n.readBy.push(myId);
  });
  saveNotifications(all);
  refreshNotificationsUI();
  if (typeof showToast === 'function') showToast('All notifications marked as read', 'success');
  if (isNotificationsPageActive() && typeof renderPage === 'function') {
    renderPage('notifications');
  }
}

function markSelectedNotifsRead() {
  if (selectedNotifIds.size === 0) {
    if (typeof showToast === 'function') showToast('No notifications selected', 'error');
    return;
  }
  const all = getStoredNotifications();
  const myId = typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE?.id : '';
  all.forEach(n => {
    if (selectedNotifIds.has(n.id)) {
      if (!n.readBy) n.readBy = [];
      if (!n.readBy.includes(myId)) n.readBy.push(myId);
    }
  });
  saveNotifications(all);
  selectedNotifIds.clear();
  refreshNotificationsUI();
  if (typeof showToast === 'function') showToast('Selected notifications marked as read', 'success');
  if (isNotificationsPageActive() && typeof renderPage === 'function') renderPage('notifications');
}

function requestNotificationDelete(action, id = null) {
  const visibleIds = new Set(getNotificationsForCurrentUser().map(item => String(item.id)));
  if (action === 'selected') {
    const selectedVisible = [...selectedNotifIds].filter(selectedId => visibleIds.has(String(selectedId)));
    if (!selectedVisible.length) {
      if (typeof showToast === 'function') showToast('No notifications selected', 'error');
      return;
    }
    pendingNotificationDelete = { action, ids: selectedVisible };
  } else if (action === 'all') {
    const ids = [...visibleIds];
    if (!ids.length) {
      if (typeof showToast === 'function') showToast('There are no notifications to delete', 'info');
      return;
    }
    pendingNotificationDelete = { action, ids };
  } else if (action === 'single' && id != null && visibleIds.has(String(id))) {
    pendingNotificationDelete = { action, id: String(id) };
  } else {
    return;
  }

  let confirmModal = document.getElementById('notificationDeleteConfirm');
  if (!confirmModal) {
    confirmModal = document.createElement('div');
    confirmModal.id = 'notificationDeleteConfirm';
    confirmModal.className = 'notification-detail-overlay notification-delete-confirm';
    confirmModal.innerHTML = `
      <section class="notification-detail-card notification-delete-card" role="alertdialog" aria-modal="true" aria-labelledby="notificationDeleteTitle" aria-describedby="notificationDeleteMessage">
        <div class="notification-delete-icon" aria-hidden="true">!</div>
        <h2 id="notificationDeleteTitle">Delete notification?</h2>
        <p id="notificationDeleteMessage"></p>
        <footer class="notification-detail-actions">
          <button type="button" class="notif-act-btn" onclick="cancelNotificationDelete()">No, keep it</button>
          <button type="button" class="notif-act-btn danger" onclick="confirmNotificationDelete()">Yes, delete</button>
        </footer>
      </section>`;
    confirmModal.addEventListener('click', event => {
      if (event.target === confirmModal) cancelNotificationDelete();
    });
    document.body.appendChild(confirmModal);
  }
  const isSingle = pendingNotificationDelete.action === 'single';
  const count = pendingNotificationDelete.ids?.length || 1;
  confirmModal.querySelector('#notificationDeleteTitle').textContent = isSingle ? 'Delete notification?' : `Delete ${pendingNotificationDelete.action === 'all' ? 'all' : 'selected'} notifications?`;
  confirmModal.querySelector('#notificationDeleteMessage').textContent = isSingle
    ? 'Are you sure you want to delete this notification? This action cannot be undone.'
    : `Are you sure you want to delete ${count} ${count === 1 ? 'notification' : 'notifications'}? This action cannot be undone.`;
  confirmModal.classList.add('active');
  confirmModal.querySelector('.notification-delete-card .notif-act-btn.danger')?.focus();
}

function cancelNotificationDelete() {
  pendingNotificationDelete = null;
  document.getElementById('notificationDeleteConfirm')?.classList.remove('active');
}

function confirmNotificationDelete() {
  if (!pendingNotificationDelete) return;
  const { action, id, ids = [] } = pendingNotificationDelete;
  const deleteIds = new Set(action === 'single' ? [id] : ids.map(String));
  const all = getStoredNotifications();
  saveNotifications(all.filter(item => !deleteIds.has(String(item.id))));
  deleteIds.forEach(deleteId => selectedNotifIds.delete(deleteId));
  pendingNotificationDelete = null;
  document.getElementById('notificationDeleteConfirm')?.classList.remove('active');
  closeNotificationDetailModal();
  refreshNotificationsUI();
  if (typeof showToast === 'function') showToast(`${deleteIds.size === 1 ? 'Notification' : 'Notifications'} deleted`, 'success');
  if (isNotificationsPageActive() && typeof renderPage === 'function') renderPage('notifications');
}

function deleteSelectedNotifs() {
  requestNotificationDelete('selected');
}

function deleteSingleNotif(id) {
  requestNotificationDelete('single', id);
}

function clearAllNotifs() {
  requestNotificationDelete('all');
}

function buildNotificationsPage() {
  const myNotifs = getNotificationsForCurrentUser();
  const myId = typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE?.id : '';
  
  const unreadList = myNotifs.filter(n => !(n.readBy || []).includes(myId));
  const filteredList = notifTabFilter === 'unread' ? unreadList : myNotifs;
  
  const allSelected = filteredList.length > 0 && filteredList.every(n => selectedNotifIds.has(n.id));

  return `
  <div class="notif-page-wrap">
    <div class="section-hdr">
      <div>
        <h2>Notifications & Activity Log</h2>
        <span style="font-size:12.5px;color:var(--text-muted);">Compile, track, and manage all your academic updates, grade releases, and announcements</span>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="notif-action-bar">
      <div class="notif-tab-group">
        <button class="notif-tab-btn ${notifTabFilter === 'all' ? 'active' : ''}" onclick="setNotifTabFilter('all')">
          List <span class="notif-btn-count">${myNotifs.length}</span>
        </button>
        <button class="notif-tab-btn ${notifTabFilter === 'unread' ? 'active' : ''}" onclick="setNotifTabFilter('unread')">
          Unread <span class="notif-btn-count">${unreadList.length}</span>
        </button>
      </div>

      <div class="notif-actions-right">
        ${selectedNotifIds.size > 0 ? `
          <span class="notif-selected-badge">${selectedNotifIds.size} selected</span>
        ` : ''}
        <button class="notif-act-btn" onclick="markSelectedNotifsRead()" title="Mark selected as read">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Mark as read
        </button>
        <button class="notif-act-btn" onclick="markAllRead()" title="Mark all notifications as read">
          <svg viewBox="0 0 24 24"><path d="M18 6L7 17l-5-5"/><path d="M22 10l-7.5 7.5L13 16"/></svg>
          Mark all read
        </button>
        <button class="notif-act-btn danger" onclick="deleteSelectedNotifs()" title="Delete selected notifications">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Delete
        </button>
        <button class="notif-act-btn danger-outline" onclick="clearAllNotifs()" title="Delete all notifications">
          Delete all
        </button>
      </div>
    </div>

    <!-- Table Card -->
    <div class="notif-table-card">
      ${filteredList.length ? `
        <label class="notif-select-all"><input type="checkbox" ${allSelected ? 'checked' : ''} onchange="toggleSelectAllNotifs(this.checked)"/> Select all notifications in this view</label>
        <div class="notif-table-responsive">
          <table class="notif-table" aria-label="Notifications and activity">
            <thead>
              <tr>
                <th style="width:70px;text-align:center;white-space:nowrap;">Select</th>
                <th style="width:40px;text-align:center;white-space:nowrap;">#</th>
                <th style="width:170px;white-space:nowrap;">From</th>
                <th style="white-space:nowrap;">Subject / Activity</th>
                <th style="width:140px;white-space:nowrap;">Sent</th>
                <th style="width:95px;text-align:center;white-space:nowrap;">Read?</th>
                <th style="width:75px;text-align:center;white-space:nowrap;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${filteredList.map((n, idx) => {
                const isUnread = !(n.readBy || []).includes(myId);
                const isSelected = selectedNotifIds.has(n.id);
                const iconStr = n.type === 'approval' ? '📌' : n.type === 'material' ? '📄' : n.type === 'quiz' ? '🎉' : '📢';
                const senderAvatar = n.senderAvatar || (n.senderName ? n.senderName.split(' ').map(w => w[0]).join('').slice(0,2) : 'SY');
                const senderName = n.senderName || 'Academic Instructor';

                return `
                  <tr class="${isUnread ? 'unread-row' : ''}" onclick="openNotificationDetailModal('${n.id}')" style="cursor:pointer;">
                    <td class="notif-cell-select" style="text-align:center;" onclick="event.stopPropagation();">
                      <input type="checkbox" aria-label="Select notification ${idx + 1}" ${isSelected ? 'checked' : ''} onchange="toggleNotifSelection('${n.id}')"/>
                    </td>
                    <td class="notif-cell-number"><strong>${idx + 1}</strong></td>
                    <td class="notif-cell-sender">
                      <div class="notif-sender-cell">
                        <div class="notif-sender-avatar">${senderAvatar}</div>
                        <span class="notif-sender-name">${escHtml(senderName)}</span>
                      </div>
                    </td>
                    <td class="notif-cell-subject">
                      <div class="notif-subject-cell">
                        <span class="notif-subject-title">${iconStr} ${escHtml(n.title)}</span>
                        <span class="notif-subject-msg">${escHtml(n.message)}</span>
                      </div>
                    </td>
                    <td class="notif-cell-sent">
                      <span class="notif-sent-time">${formatSentDate(n.timestamp)}</span>
                    </td>
                    <td class="notif-cell-status" style="text-align:center;">
                      ${isUnread 
                        ? '<span class="notif-status-badge unread">❌ Unread</span>' 
                        : '<span class="notif-status-badge read">✔ Read</span>'}
                    </td>
                    <td class="notif-cell-action" style="text-align:center;" onclick="event.stopPropagation();">
                      <button class="notif-del-row-btn" onclick="deleteSingleNotif('${n.id}')" title="Delete notification">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13.5px;">
          No notifications found in this view.
        </div>
      `}
    </div>
  </div>
  `;
}

// Ensure global accessibility
window.openNotificationDetailModal = openNotificationDetailModal;
window.closeNotificationDetailModal = closeNotificationDetailModal;
window.deleteSingleNotif = deleteSingleNotif;
window.toggleNotifSelection = toggleNotifSelection;
window.toggleSelectAllNotifs = toggleSelectAllNotifs;
window.setNotifTabFilter = setNotifTabFilter;
window.markSelectedNotifsRead = markSelectedNotifsRead;
window.deleteSelectedNotifs = deleteSelectedNotifs;
window.clearAllNotifs = clearAllNotifs;
window.markAllRead = markAllRead;
window.handleNotifItemClick = handleNotifItemClick;
window.requestNotificationDelete = requestNotificationDelete;
window.cancelNotificationDelete = cancelNotificationDelete;
window.confirmNotificationDelete = confirmNotificationDelete;
