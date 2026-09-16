/* ── PERSISTENT ROLE-AWARE NOTIFICATIONS MODULE ── */

const NOTIF_STORAGE_KEY = 'scholaria_notifications_v1';

const DEFAULT_SEED_NOTIFICATIONS = [
  // Student Notifications
  {
    id: 'notif_seed_1',
    targetRole: 'student',
    title: 'Due Soon: Quiz 1 - Cell Biology',
    message: 'Quiz 1 in course General Biology 1 is due on Aug 30, 11:59 PM.',
    senderName: 'Prof. Maria Reyes',
    senderAvatar: 'MR',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    readBy: [],
    type: 'quiz'
  },
  {
    id: 'notif_seed_2',
    targetRole: 'student',
    title: 'New Material Uploaded',
    message: 'Pre-Calculus Module 01: Conic Sections and Circles has been published.',
    senderName: 'Dr. Eleanor Llorente',
    senderAvatar: 'EL',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    readBy: ['user_demo_student'],
    type: 'material'
  },
  {
    id: 'notif_seed_3',
    targetRole: 'student',
    title: 'Graded: Web Systems Quiz 2',
    message: 'Your score on Web Systems & Technologies Quiz 2 is released: 92%',
    senderName: 'Engr. Julian Callanta',
    senderAvatar: 'JC',
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    readBy: ['user_demo_student'],
    type: 'quiz'
  },
  {
    id: 'notif_seed_4',
    targetRole: 'student',
    title: 'Upcoming Assessment Reminder',
    message: 'Cybersecurity Midterm Examination is scheduled for next week.',
    senderName: 'Prof. Gabriel Santos',
    senderAvatar: 'GS',
    timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
    readBy: [],
    type: 'info'
  },
  // Teacher Notifications
  {
    id: 'notif_seed_teacher_1',
    targetRole: 'teacher',
    title: 'New Student Quiz Submission',
    message: 'Juan Dela Cruz completed Quiz 1 - Cell Biology with a score of 9/10 (90%).',
    senderName: 'Juan Dela Cruz',
    senderAvatar: 'JD',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    readBy: [],
    type: 'quiz'
  },
  {
    id: 'notif_seed_teacher_2',
    targetRole: 'teacher',
    title: 'Material Approved by Admin',
    message: 'Your uploaded handout "Pre-Calc Formula Sheet & Reference.pdf" has been approved.',
    senderName: 'System Administrator',
    senderAvatar: 'SA',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    readBy: [],
    type: 'approval'
  },
  {
    id: 'notif_seed_teacher_3',
    targetRole: 'teacher',
    title: 'Item Analysis Report Ready',
    message: 'Class performance metrics for Quiz 2 are ready to view under Item Analysis.',
    senderName: 'Analytics Engine',
    senderAvatar: 'AE',
    timestamp: new Date(Date.now() - 3600000 * 36).toISOString(),
    readBy: ['user_demo_teacher'],
    type: 'info'
  },
  // Admin Notifications
  {
    id: 'notif_seed_admin_1',
    targetRole: 'admin',
    title: 'Content Approval Request',
    message: 'Prof. Maria Reyes submitted 2 new PDF learning materials awaiting review.',
    senderName: 'Prof. Maria Reyes',
    senderAvatar: 'MR',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    readBy: [],
    type: 'approval'
  },
  {
    id: 'notif_seed_admin_2',
    targetRole: 'admin',
    title: 'New User Registrations',
    message: '4 new Senior High School student accounts were registered today.',
    senderName: 'User Management',
    senderAvatar: 'UM',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    readBy: [],
    type: 'info'
  },
  {
    id: 'notif_seed_admin_3',
    targetRole: 'admin',
    title: 'System Health Status',
    message: 'Database sync and file storage backup completed with 0 errors.',
    senderName: 'System Monitor',
    senderAvatar: 'SM',
    timestamp: new Date(Date.now() - 3600000 * 40).toISOString(),
    readBy: ['user_demo_admin'],
    type: 'info'
  }
];

function getStoredNotifications() {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_NOTIFICATIONS));
      return DEFAULT_SEED_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    return (parsed && parsed.length) ? parsed : DEFAULT_SEED_NOTIFICATIONS;
  } catch (e) {
    return DEFAULT_SEED_NOTIFICATIONS;
  }
}

function saveNotifications(list) {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
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
      <div class="notif-item ${isUnread ? 'unread' : ''}" onclick="renderPage('notifications');closeNotif();">
        <div class="notif-dot"></div>
        <div class="notif-body">
          <p class="notif-msg">${iconStr} <strong>${escHtml(n.title)}</strong>: ${escHtml(n.message)}</p>
          <span class="notif-time">${timeAgo}</span>
        </div>
      </div>`;
  }).join('');
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
    dropdown.classList.toggle('open');
    refreshNotificationsUI();
  }
}

function closeNotif() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) dropdown.classList.remove('open');
}

document.addEventListener('click', e => {
  const wrap = document.getElementById('notifWrap');
  if (wrap && !wrap.contains(e.target)) closeNotif();
});

/* ── NOTIFICATIONS PAGE MODULE (FULL TABLE & SELECTION ACTIONS) ── */
let notifTabFilter = 'all'; // 'all' | 'unread'
let selectedNotifIds = new Set();

function setNotifTabFilter(tab) {
  notifTabFilter = tab;
  if (typeof renderPage === 'function') renderPage('notifications');
}

function toggleNotifSelection(id) {
  if (selectedNotifIds.has(id)) {
    selectedNotifIds.delete(id);
  } else {
    selectedNotifIds.add(id);
  }
  if (typeof renderPage === 'function') renderPage('notifications');
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
  if (typeof renderPage === 'function') renderPage('notifications');
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
  if (typeof renderPage === 'function') renderPage('notifications');
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
  if (typeof renderPage === 'function') renderPage('notifications');
}

function deleteSelectedNotifs() {
  if (selectedNotifIds.size === 0) {
    if (typeof showToast === 'function') showToast('No notifications selected', 'error');
    return;
  }
  let all = getStoredNotifications();
  all = all.filter(n => !selectedNotifIds.has(n.id));
  saveNotifications(all);
  selectedNotifIds.clear();
  refreshNotificationsUI();
  if (typeof showToast === 'function') showToast('Selected notifications deleted', 'success');
  if (typeof renderPage === 'function') renderPage('notifications');
}

function deleteSingleNotif(id) {
  let all = getStoredNotifications();
  all = all.filter(n => n.id !== id);
  selectedNotifIds.delete(id);
  saveNotifications(all);
  refreshNotificationsUI();
  if (typeof showToast === 'function') showToast('Notification deleted', 'success');
  if (typeof renderPage === 'function') renderPage('notifications');
}

function clearAllNotifs() {
  saveNotifications([]);
  selectedNotifIds.clear();
  refreshNotificationsUI();
  if (typeof showToast === 'function') showToast('All notifications cleared', 'success');
  if (typeof renderPage === 'function') renderPage('notifications');
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
        <button class="notif-act-btn danger-outline" onclick="clearAllNotifs()" title="Clear all notifications">
          Clear
        </button>
      </div>
    </div>

    <!-- Table Card -->
    <div class="notif-table-card">
      ${filteredList.length ? `
        <table class="notif-table">
          <thead>
            <tr>
              <th style="width:36px;text-align:center;">
                <input type="checkbox" ${allSelected ? 'checked' : ''} onchange="toggleSelectAllNotifs(this.checked)"/>
              </th>
              <th style="width:36px;">#</th>
              <th style="width:200px;">From</th>
              <th>Subject / Activity</th>
              <th style="width:140px;">Sent</th>
              <th style="width:100px;text-align:center;">Read?</th>
              <th style="width:60px;text-align:center;">Action</th>
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
                <tr class="${isUnread ? 'unread-row' : ''}">
                  <td style="text-align:center;">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleNotifSelection('${n.id}')"/>
                  </td>
                  <td><strong>${idx + 1}</strong></td>
                  <td>
                    <div class="notif-sender-cell">
                      <div class="notif-sender-avatar">${senderAvatar}</div>
                      <span class="notif-sender-name">${escHtml(senderName)}</span>
                    </div>
                  </td>
                  <td>
                    <div class="notif-subject-cell">
                      <span class="notif-subject-title">${iconStr} ${escHtml(n.title)}</span>
                      <span class="notif-subject-msg">${escHtml(n.message)}</span>
                    </div>
                  </td>
                  <td>
                    <span class="notif-sent-time">${formatSentDate(n.timestamp)}</span>
                  </td>
                  <td style="text-align:center;">
                    ${isUnread 
                      ? '<span class="notif-status-badge unread">❌ Unread</span>' 
                      : '<span class="notif-status-badge read">✔ Read</span>'}
                  </td>
                  <td style="text-align:center;">
                    <button class="notif-del-row-btn" onclick="deleteSingleNotif('${n.id}')" title="Delete notification">
                      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : `
        <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13.5px;">
          No notifications found in this view.
        </div>
      `}
    </div>
  </div>
  `;
}
