/* ── PERSISTENT ROLE-AWARE NOTIFICATIONS MODULE ── */

const NOTIF_STORAGE_KEY = 'scholaria_notifications_v1';

function getStoredNotifications() {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
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
function addNotification({ targetRole, targetUserId, title, message, type = 'info' }) {
  const list = getStoredNotifications();
  const newNotif = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    targetRole: targetRole || null,
    targetUserId: targetUserId || null,
    title: title || 'Notification',
    message: message || '',
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
    if (n.targetRole === myRole || n.targetRole === 'all') return true;
    return false;
  });
}

/**
 * Re-render notification dropdown & update unread badge counter
 */
function refreshNotificationsUI() {
  const badge = document.getElementById('notifBadge');
  const notifList = document.getElementById('notifList');
  if (!notifList) return;

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

  if (myNotifs.length === 0) {
    notifList.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No notifications right now.</div>`;
    return;
  }

  notifList.innerHTML = myNotifs.slice(0, 15).map(n => {
    const isUnread = !(n.readBy || []).includes(myId);
    const timeAgo = formatTimeAgo(n.timestamp);
    const iconStr = n.type === 'approval' ? '📌' : n.type === 'material' ? '📄' : n.type === 'quiz' ? '🎉' : '📢';
    return `
      <div class="notif-item ${isUnread ? 'unread' : ''}">
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

function markAllRead() {
  const all = getStoredNotifications();
  const myId = typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE?.id : '';
  all.forEach(n => {
    if (!n.readBy) n.readBy = [];
    if (!n.readBy.includes(myId)) n.readBy.push(myId);
  });
  saveNotifications(all);
  refreshNotificationsUI();
  showToast('All notifications marked as read', 'success');
}
