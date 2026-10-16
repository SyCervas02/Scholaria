const DEFAULT_SEED_USERS = [];
const DEFAULT_SEED_ADMINS = [];

const CREDENTIAL_SLIP_STORAGE_KEY = 'scholaria_credential_slip_records';
const ADMIN_HANDOUTS_STORAGE_KEY = 'scholaria_admin_handout_records';
const ORIGINS_STORAGE_KEY = 'scholaria_account_origins_v1';

function getLocalOriginRecords() {
  try {
    const raw = localStorage.getItem(ORIGINS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function saveLocalOriginRecord(rec) {
  try {
    const all = getLocalOriginRecords();
    const key = rec.school_id || rec.user_id;
    if (key) {
      all[key] = {
        ...(all[key] || {}),
        ...rec,
        cached_at: new Date().toISOString()
      };
      localStorage.setItem(ORIGINS_STORAGE_KEY, JSON.stringify(all));
    }
  } catch (_) {}
}

function getCredentialSlipRecords() {
  try {
    const raw = localStorage.getItem(CREDENTIAL_SLIP_STORAGE_KEY);
    const legacy = localStorage.getItem(ADMIN_HANDOUTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const parsedLegacy = legacy ? JSON.parse(legacy) : {};
    return { ...parsedLegacy, ...parsed };
  } catch (_) {
    return {};
  }
}

function saveCredentialSlipRecord(rec) {
  try {
    const all = getCredentialSlipRecords();
    const key = rec.school_id || rec.user_id;
    if (key) {
      all[key] = {
        ...(all[key] || {}),
        ...rec,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(CREDENTIAL_SLIP_STORAGE_KEY, JSON.stringify(all));
      localStorage.setItem(ADMIN_HANDOUTS_STORAGE_KEY, JSON.stringify(all));
    }
  } catch (_) {}
}

function getCredentialSlipRecord(schoolId) {
  const all = getCredentialSlipRecords();
  return all[schoolId] || null;
}

// Backwards compatibility aliases:
function getAdminHandoutRecords() { return getCredentialSlipRecords(); }
function saveAdminHandoutRecord(rec) { return saveCredentialSlipRecord(rec); }
function getAdminHandoutRecord(schoolId) { return getCredentialSlipRecord(schoolId); }

function generateComplexPasswordClient(length = 14) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*()-_=+';
  const all = upper + lower + digits + symbols;

  const getRandomChar = str => str[Math.floor(Math.random() * str.length)];

  let pw = [
    getRandomChar(upper),
    getRandomChar(lower),
    getRandomChar(digits),
    getRandomChar(symbols)
  ];

  for (let i = 4; i < length; i++) {
    pw.push(getRandomChar(all));
  }

  for (let i = pw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }

  return pw.join('');
}

function copyTextToClipboard(text, successMsg = 'Copied to clipboard!') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof showToast === 'function') showToast(successMsg, 'success');
    }).catch(() => {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
}

function fallbackCopyText(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (typeof showToast === 'function') showToast(successMsg, 'success');
  } catch (_) {
    if (typeof showToast === 'function') showToast('Failed to copy', 'error');
  }
  document.body.removeChild(ta);
}

let registeredUsers = [...DEFAULT_SEED_USERS, ...DEFAULT_SEED_ADMINS];
let isFetchingUsers = false;
let adminUserTab = 'students'; // 'students' | 'teachers' | 'admins'
let sectionSearchQuery = '';
let sectionGradeFilter = '';
let sectionStrandFilter = '';

function setAdminUserTab(tab) {
  adminUserTab = tab;
  const wrap = document.getElementById('userManagementContentWrap');
  if (wrap) {
    wrap.innerHTML = renderUserManagementContent();
  }
}
if (typeof window !== 'undefined') {
  window.setAdminUserTab = setAdminUserTab;
}

function formatExactDateTime(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' · ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '—';
  }
}

function formatDateCreated(ts) {
  return formatExactDateTime(ts);
}

function formatDateWithOriginHtml(u) {
  const dateStr = formatExactDateTime(u.createdAt);
  let originLabel = '';
  if (u.origin && u.origin.name) {
    originLabel = `<div style="font-size:11px;color:#2563eb;font-weight:600;display:inline-flex;align-items:center;gap:3px;margin-top:2px;white-space:nowrap;" title="Created by ${escHtml(u.origin.name)} (${escHtml(u.origin.school_id || u.origin.role || 'Admin')})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:11px;height:11px;flex-shrink:0;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
      <span>by <strong>${escHtml(u.origin.name)}</strong></span>
    </div>`;
  } else {
    originLabel = `<div style="font-size:10.5px;color:#94a3b8;font-style:italic;margin-top:2px;white-space:nowrap;">Institutional Initial</div>`;
  }

  return `<div style="white-space:nowrap;">
    <div style="font-size:12px;color:var(--text-primary);font-weight:600;white-space:nowrap;">${dateStr}</div>
    ${originLabel}
  </div>`;
}

function formatLastActiveHtml(lastActive, createdAt) {
  const ts = lastActive || createdAt;
  if (!ts) {
    return `<span style="color:#94a3b8;font-size:12px;font-style:italic;white-space:nowrap;">No recorded session</span>`;
  }

  const formatted = formatExactDateTime(ts);
  let statusBadge = '';
  try {
    const diffMs = Date.now() - new Date(ts).getTime();
    if (!isNaN(diffMs)) {
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 15) {
        statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#059669;font-weight:600;white-space:nowrap;"><span style="width:6px;height:6px;background:#10b981;border-radius:50%;box-shadow:0 0 6px #10b981;"></span> Online Now</span>`;
      } else if (diffHours < 1) {
        statusBadge = `<span style="font-size:11px;color:#64748b;white-space:nowrap;">${Math.max(1, diffMins)}m ago</span>`;
      } else if (diffHours < 24) {
        statusBadge = `<span style="font-size:11px;color:#64748b;white-space:nowrap;">${diffHours}h ago</span>`;
      } else if (diffDays < 7) {
        statusBadge = `<span style="font-size:11px;color:#64748b;white-space:nowrap;">${diffDays}d ago</span>`;
      }
    }
  } catch (_) {}

  return `<div style="white-space:nowrap;">
    <div style="font-size:12px;color:var(--text-primary);font-weight:600;white-space:nowrap;">${formatted}</div>
    ${statusBadge ? `<div style="margin-top:2px;white-space:nowrap;">${statusBadge}</div>` : ''}
  </div>`;
}

function formatAccountStatusBadge(u) {
  const active = u.isActive !== false;
  if (active) {
    return `<span class="sec-badge" style="background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;">
      <span style="width:6px;height:6px;background:#10b981;border-radius:50%;box-shadow:0 0 6px #10b981;"></span> Active
    </span>`;
  }
  return `<span class="sec-badge" style="background:#fef2f2;color:#991b1b;border:1px solid #fecaca;font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;" title="Permissions revoked by administration">
    <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2" style="width:11px;height:11px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Deactivated
  </span>`;
}

function renderUserDeactivationAction(u) {
  const isSelf = (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE && (CURRENT_PROFILE.id === u.dbId || CURRENT_PROFILE.school_id === u.id));
  if (isSelf) {
    return `<span style="color:#94a3b8;font-size:11.5px;font-style:italic;" title="You cannot deactivate your own active session">You (Active)</span>`;
  }

  const active = u.isActive !== false;
  const targetId = u.dbId || u.id;
  if (active) {
    return `<span class="action-link" style="color:#dc2626;font-weight:600;cursor:pointer;white-space:nowrap;" onclick="adminToggleUserStatus('${escHtml(targetId)}', false, '${escHtml(u.name)}')">Deactivate</span>`;
  } else {
    return `<span class="action-link" style="color:#059669;font-weight:600;cursor:pointer;white-space:nowrap;" onclick="adminToggleUserStatus('${escHtml(targetId)}', true, '${escHtml(u.name)}')">Reactivate</span>`;
  }
}

async function adminToggleUserStatus(userId, shouldActivate, name) {
  const actionWord = shouldActivate ? 'reactivate' : 'deactivate';
  const confirmMsg = shouldActivate
    ? `Reactivate account for "${name}"?\n\nThis will restore login privileges and all associated system permissions.`
    : `Deactivate account for "${name}"?\n\n⚠️ Deactivation will immediately revoke all system permissions, terminate active sessions, and block future logins. (Accounts are preserved for administrative and academic audit integrity).`;

  if (!confirm(confirmMsg)) return;

  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    if (typeof showToast === 'function') showToast('Your session has expired — please sign in again', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/toggle-user-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        user_id: userId,
        is_active: shouldActivate
      })
    });

    const data = await res.json();
    if (!res.ok) {
      if (typeof showToast === 'function') showToast(data.error || `Failed to ${actionWord} account`, 'error');
      return;
    }

    if (typeof showToast === 'function') {
      showToast(data.message || `Account successfully ${shouldActivate ? 'reactivated' : 'deactivated'}`, shouldActivate ? 'success' : 'info');
    }

    // Update locally in registeredUsers
    registeredUsers = registeredUsers.map(u => {
      if (u.dbId === userId || u.id === userId) {
        return { ...u, isActive: shouldActivate };
      }
      return u;
    });

    const wrap = document.getElementById('userManagementContentWrap');
    if (wrap) {
      wrap.innerHTML = renderUserManagementContent();
    }
    filterUserTable();
  } catch (err) {
    if (typeof showToast === 'function') showToast(`Could not reach the server to ${actionWord} user`, 'error');
  }
}

function renderStudentRow(u) {
  const isAdmin = (typeof ROLE !== 'undefined' && ROLE === 'admin') || (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE?.role === 'admin');
  const isMuted = u.permanentlyMuted || (u.mutedUntil && new Date(u.mutedUntil) > new Date()) || (u.strikes && u.strikes > 0);
  const isUnassigned = !u.section || u.section === 'Unassigned' || u.section === 'None' || u.section === '—';
  const targetId = u.dbId || u.id;
  const actionBtn = isMuted
    ? `<span class="action-link" style="color:#2563eb;font-weight:600;" onclick="adminUnmuteUser('${escHtml(targetId)}')">Unmute</span>`
    : `<span class="action-link" style="color:#d97706;font-weight:600;" onclick="adminMuteUser('${escHtml(targetId)}')">Mute</span>`;
  return `<tr>
    <td style="white-space:nowrap;"><strong style="white-space:nowrap;">${escHtml(u.name)}</strong></td>
    <td style="white-space:nowrap;"><code style="font-size:12px;background:#f0f6ff;padding:3px 8px;border-radius:4px;color:var(--blue);font-family:'JetBrains Mono',monospace;white-space:nowrap;display:inline-block;">${escHtml(u.id)}</code></td>
    <td style="white-space:nowrap;"><span class="au-grade-pill on" style="padding:2px 8px;font-size:11px;white-space:nowrap;display:inline-block;">${escHtml(u.gradeLevel || 'Grade 11')}</span></td>
    <td style="white-space:nowrap;"><span class="role-tag student" style="white-space:nowrap;display:inline-block;">${escHtml(u.strand || 'N/A')}</span></td>
    <td style="white-space:nowrap;">${isUnassigned ? '<span style="color:#d97706;font-weight:600;font-size:12px;background:#fef3c7;padding:2px 8px;border-radius:4px;white-space:nowrap;display:inline-block;">Unassigned</span>' : `<span class="sec-badge grade" style="white-space:nowrap;display:inline-flex;align-items:center;">${escHtml(u.section)}</span>`}</td>
    <td class="date-val" style="white-space:nowrap;">${formatDateWithOriginHtml(u)}</td>
    <td style="white-space:nowrap;">${formatAccountStatusBadge(u)}</td>
    <td style="white-space:nowrap;">${chatStatusHtml(u)}</td>
    <td style="white-space:nowrap;">
      <div style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;">
        <span class="action-link" style="color:#2563eb;font-weight:600;white-space:nowrap;" onclick="viewUserCredentialSlip('${escHtml(u.id)}')">View Slip</span>
        <span class="action-link" style="white-space:nowrap;" onclick="openMassAssignForSingleStudent('${escHtml(targetId)}')">Assign</span>
        ${isAdmin ? actionBtn : ''}
        ${isAdmin ? renderUserDeactivationAction(u) : ''}
      </div>
    </td>
  </tr>`;
}

function renderTeacherRow(u) {
  const isAdmin = (typeof ROLE !== 'undefined' && ROLE === 'admin') || (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE?.role === 'admin');
  const isMuted = u.permanentlyMuted || (u.mutedUntil && new Date(u.mutedUntil) > new Date()) || (u.strikes && u.strikes > 0);
  const targetId = u.dbId || u.id;
  const actionBtn = isMuted
    ? `<span class="action-link" style="color:#2563eb;font-weight:600;white-space:nowrap;" onclick="adminUnmuteUser('${escHtml(targetId)}')">Unmute</span>`
    : `<span class="action-link" style="color:#d97706;font-weight:600;white-space:nowrap;" onclick="adminMuteUser('${escHtml(targetId)}')">Mute</span>`;
  const secHtml = u.section
    ? `<span class="sec-badge grade" style="cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;" onclick="openAssignTeacherSectionsModal('${escHtml(targetId)}')" title="Click to reassign handled section(s)">
        ${escHtml(u.section)}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:11px;height:11px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </span>`
    : `<button type="button" class="action-link" style="color:#d97706;background:none;border:none;cursor:pointer;font-size:12px;font-weight:600;padding:0;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;" onclick="openAssignTeacherSectionsModal('${escHtml(targetId)}')">
        <span>+ Assign Section</span>
      </button>`;

  return `<tr>
    <td style="white-space:nowrap;"><strong style="white-space:nowrap;">${escHtml(u.name)}</strong></td>
    <td style="white-space:nowrap;"><code style="font-size:12px;background:#fffbeb;padding:3px 8px;border-radius:4px;color:#d97706;font-family:'JetBrains Mono',monospace;white-space:nowrap;display:inline-block;">${escHtml(u.id)}</code></td>
    <td style="white-space:nowrap;"><span class="role-tag teacher" style="white-space:nowrap;display:inline-block;">${escHtml(u.subjects || u.strand || 'General')}</span></td>
    <td style="white-space:nowrap;"><span style="font-size:12px;font-weight:600;color:var(--text-secondary);white-space:nowrap;">Grade 11 & 12</span></td>
    <td style="white-space:nowrap;">${secHtml}</td>
    <td class="date-val" style="white-space:nowrap;">${formatDateWithOriginHtml(u)}</td>
    <td style="white-space:nowrap;">${formatAccountStatusBadge(u)}</td>
    <td style="white-space:nowrap;">${chatStatusHtml(u)}</td>
    <td style="white-space:nowrap;">
      <div style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;">
        <span class="action-link" style="color:#2563eb;font-weight:600;white-space:nowrap;" onclick="viewUserCredentialSlip('${escHtml(u.id)}')">View Slip</span>
        <span class="action-link" style="color:#0284c7;font-weight:600;white-space:nowrap;cursor:pointer;" onclick="openAssignTeacherSectionsModal('${escHtml(targetId)}')">Assign Section</span>
        ${isAdmin ? actionBtn : ''}
        ${isAdmin ? renderUserDeactivationAction(u) : ''}
      </div>
    </td>
  </tr>`;
}

function renderDeactivatedRow(u) {
  const isAdmin = (typeof ROLE !== 'undefined' && ROLE === 'admin') || (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE?.role === 'admin');
  const targetId = u.dbId || u.id;

  let roleBadge = '';
  if (u.role === 'admin') {
    roleBadge = `<span class="role-tag" style="background:#fef3c7;color:#b45309;font-weight:700;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Admin
    </span>`;
  } else if (u.role === 'teacher') {
    roleBadge = `<span class="role-tag teacher" style="display:inline-flex;align-items:center;gap:4px;white-space:nowrap;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Teacher
    </span>`;
  } else {
    roleBadge = `<span class="role-tag student" style="display:inline-flex;align-items:center;gap:4px;white-space:nowrap;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> Student
    </span>`;
  }

  let strandDeptHtml = '';
  if (u.role === 'admin') {
    strandDeptHtml = `<span style="color:#64748b;font-size:12px;font-style:italic;white-space:nowrap;">Department Administration</span>`;
  } else if (u.role === 'teacher') {
    strandDeptHtml = `<span class="role-tag teacher" style="white-space:nowrap;display:inline-block;">${escHtml(u.subjects || u.strand || 'General')}</span>`;
  } else {
    strandDeptHtml = `<span class="role-tag student" style="white-space:nowrap;display:inline-block;">${escHtml(u.strand || 'N/A')}</span> ${u.gradeLevel ? `<span style="font-size:11px;color:#64748b;margin-left:4px;white-space:nowrap;">${escHtml(u.gradeLevel)}</span>` : ''}`;
  }

  let secHtml = '';
  if (u.role === 'admin') {
    secHtml = `<span style="color:#94a3b8;font-style:italic;font-size:12px;">—</span>`;
  } else if (u.role === 'teacher') {
    secHtml = u.section ? `<span class="sec-badge grade" style="white-space:nowrap;">${escHtml(u.section)}</span>` : `<span style="color:#94a3b8;font-style:italic;font-size:12px;">All / None</span>`;
  } else {
    const isUnassigned = !u.section || u.section === 'Unassigned' || u.section === 'None' || u.section === '—';
    secHtml = isUnassigned
      ? `<span style="color:#94a3b8;font-style:italic;font-size:12px;">Unassigned</span>`
      : `<span class="sec-badge grade" style="white-space:nowrap;">${escHtml(u.section)}</span>`;
  }

  return `<tr style="background:#fffafa;">
    <td style="white-space:nowrap;">
      <strong style="color:var(--text-primary);white-space:nowrap;">${escHtml(u.name)}</strong>
      ${u.email ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;white-space:nowrap;">${escHtml(u.email)}</div>` : ''}
    </td>
    <td style="white-space:nowrap;">${roleBadge}</td>
    <td style="white-space:nowrap;"><code style="font-size:12px;background:#fef2f2;border:1px solid #fee2e2;padding:3px 8px;border-radius:4px;color:#b91c1c;font-family:'JetBrains Mono',monospace;white-space:nowrap;display:inline-block;">${escHtml(u.id)}</code></td>
    <td style="white-space:nowrap;">${strandDeptHtml}</td>
    <td style="white-space:nowrap;">${secHtml}</td>
    <td class="date-val" style="white-space:nowrap;">${formatDateWithOriginHtml(u)}</td>
    <td style="white-space:nowrap;">${formatAccountStatusBadge(u)}</td>
    <td style="white-space:nowrap;">
      <div style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;">
        <span class="action-link" style="color:#2563eb;font-weight:600;white-space:nowrap;" onclick="viewUserCredentialSlip('${escHtml(u.id)}')">View Slip</span>
        ${isAdmin ? `<span class="action-link" style="color:#059669;font-weight:700;white-space:nowrap;cursor:pointer;" onclick="adminToggleUserStatus('${escHtml(targetId)}', true, '${escHtml(u.name)}')">Reactivate</span>` : ''}
      </div>
    </td>
  </tr>`;
}

function renderAdminRow(u) {
  const initials = (u.name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AD';

  const isInstitutionalEmail = !u.email || u.email.endsWith('@admin.hwa.edu.ph');

  return `<tr>
    <td style="white-space:nowrap;">
      <div style="display:inline-flex;align-items:center;gap:12px;white-space:nowrap;">
        <div style="width:36px;height:36px;border-radius:10px;background:#0f172a;color:#f59e0b;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;border:1.5px solid #d97706;box-shadow:0 2px 8px rgba(0,0,0,0.12);flex-shrink:0;">
          ${initials}
        </div>
        <div style="white-space:nowrap;">
          <strong style="color:var(--text-primary);font-size:13.5px;white-space:nowrap;">${escHtml(u.name)}</strong>
          <div style="font-size:11.5px;color:#64748b;display:flex;align-items:center;gap:4px;margin-top:2px;white-space:nowrap;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" style="width:12px;height:12px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Department Administrator
          </div>
        </div>
      </div>
    </td>
    <td style="white-space:nowrap;">
      <span style="font-size:13px;color:#ea580c;font-weight:700;letter-spacing:0.4px;font-family:'JetBrains Mono',monospace;white-space:nowrap;">${escHtml(u.id)}</span>
    </td>
    <td style="white-space:nowrap;">
      ${!isInstitutionalEmail
        ? `<div style="font-size:12.5px;color:var(--text-primary);display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" style="width:13px;height:13px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            ${escHtml(u.email)}
           </div>`
        : `<span style="color:#94a3b8;font-size:12px;font-style:italic;white-space:nowrap;">None provided (Optional)</span>`
      }
    </td>
    <td class="date-val" style="white-space:nowrap;">${formatDateWithOriginHtml(u)}</td>
    <td style="white-space:nowrap;">
      ${formatLastActiveHtml(u.lastActive, u.createdAt)}
    </td>
    <td style="white-space:nowrap;">
      ${formatAccountStatusBadge(u)}
    </td>
    <td style="white-space:nowrap;">
      <div style="display:inline-flex;align-items:center;gap:12px;white-space:nowrap;">
        <span class="action-link" style="color:#ea580c;font-weight:600;white-space:nowrap;" onclick="viewUserCredentialSlip('${escHtml(u.id)}')">View Slip</span>
        <span class="action-link" style="color:#2563eb;font-weight:600;white-space:nowrap;" onclick="openAdminResetPasswordPrompt('${escHtml(u.dbId || u.id)}', '${escHtml(u.name)}')">Reset Password</span>
        ${renderUserDeactivationAction(u)}
      </div>
    </td>
  </tr>`;
}

function viewAdminHandoutModal(schoolId) {
  viewUserCredentialSlip(schoolId);
}

async function openAdminResetPasswordPrompt(userId, name) {
  if (!confirm(`Issue a new temporary strong password for "${name}"?\n\nThe employee's current password will be invalidated, and they will be required to change this new password upon login.`)) {
    return;
  }

  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    if (typeof showToast === 'function') showToast('Your session has expired — please sign in again', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/reset-user-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ user_id: userId })
    });
    const data = await res.json();
    if (!res.ok) {
      if (typeof showToast === 'function') showToast(data.error || 'Password reset failed', 'error');
      return;
    }

    const adminSlip = {
      school_id: data.school_id,
      name: data.name || name,
      role: 'admin',
      temp_password: data.temp_password,
      created_at: new Date().toISOString(),
      created_by: {
        id: CURRENT_PROFILE?.id,
        name: CURRENT_PROFILE?.full_name || 'Administrator',
        school_id: CURRENT_PROFILE?.school_id || 'ADMIN',
        role: 'admin'
      }
    };
    saveCredentialSlipRecord(adminSlip);

    if (typeof showToast === 'function') showToast(`New password generated for ${name}!`, 'success');
    showOfficialCredentialSlipModal([adminSlip]);
  } catch (err) {
    if (typeof showToast === 'function') showToast('Could not reach the server to reset password', 'error');
  }
}

function renderUserManagementContent() {
  const students = registeredUsers.filter(u => u.role === 'student' && u.isActive !== false);
  const teachers = registeredUsers.filter(u => u.role === 'teacher' && u.isActive !== false);
  const admins = registeredUsers.filter(u => u.role === 'admin' && u.isActive !== false);
  const deactivated = registeredUsers.filter(u => u.isActive === false);
  const isStudentTab = adminUserTab === 'students';
  const isTeacherTab = adminUserTab === 'teachers';
  const isAdminTab = adminUserTab === 'admins';
  const isDeactivatedTab = adminUserTab === 'deactivated';

  const rolePriority = { admin: 1, teacher: 2, student: 3 };
  const sortedDeactivated = [...deactivated].sort((a, b) => {
    const pA = rolePriority[a.role] || 99;
    const pB = rolePriority[b.role] || 99;
    if (pA !== pB) return pA - pB;
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return `
    <div class="um-tabs">
      <button class="um-tab ${isStudentTab ? 'active' : ''}" onclick="setAdminUserTab('students')">
        ${iconProfile()} Students <span class="um-badge">${students.length}</span>
      </button>
      <button class="um-tab teacher-tab ${isTeacherTab ? 'active' : ''}" onclick="setAdminUserTab('teachers')">
        ${iconUsers()} Teachers <span class="um-badge">${teachers.length}</span>
      </button>
      <button class="um-tab admin-tab ${isAdminTab ? 'active' : ''}" onclick="setAdminUserTab('admins')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Administrators <span class="um-badge">${admins.length}</span>
      </button>
      <button class="um-tab deactivated-tab ${isDeactivatedTab ? 'active' : ''}" style="${isDeactivatedTab ? 'background:#fef2f2;border-color:#fecaca;color:#991b1b;font-weight:700;' : 'color:#b91c1c;'}" onclick="setAdminUserTab('deactivated')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Deactivated Accounts <span class="um-badge" style="background:#fee2e2;color:#991b1b;border:1px solid #fecaca;">${deactivated.length}</span>
      </button>
    </div>

    <div class="user-search-row">
      <div class="user-search-wrap">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="userSearchInput" placeholder="${isAdminTab ? 'Search admins by name, ID, or email…' : isDeactivatedTab ? 'Search deactivated accounts by name, ID, role, or strand…' : 'Search by name, ID, or strand…'}" oninput="filterUserTable()">
      </div>

      ${isDeactivatedTab ? `
        <select class="user-filter-select" id="deactivatedRoleFilter" onchange="filterUserTable()">
          <option value="">All Roles (Admin → Teacher → Student)</option>
          <option value="admin">Administrators</option>
          <option value="teacher">Teachers</option>
          <option value="student">Students</option>
        </select>
      ` : ''}

      ${isStudentTab ? `
        <select class="user-filter-select" id="userGradeFilter" onchange="filterUserTable()">
          <option value="">All Grade Levels</option>
          <option value="Grade 11">Grade 11</option>
          <option value="Grade 12">Grade 12</option>
        </select>
      ` : ''}

      ${!isAdminTab ? `
        <select class="user-filter-select" id="userStrandFilter" onchange="filterUserTable()">
          <option value="">All Strands</option>
          <option value="STEM">STEM</option>
          <option value="HUMSS">HUMSS</option>
          <option value="ABM">ABM</option>
          <option value="TVL">TVL</option>
        </select>
      ` : ''}

      ${isStudentTab ? `
        <select class="user-filter-select" id="userSectionFilter" onchange="filterUserTable()">
          <option value="">All Sections</option>
          <option value="Unassigned">Unassigned Only</option>
          ${managedSections.map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)}</option>`).join('')}
        </select>
      ` : ''}

      <select class="user-filter-select" id="userDateSort" onchange="filterUserTable()">
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
      </select>
    </div>

    <div class="user-table" id="userTableWrap">
      <table>
        <thead>
          ${isDeactivatedTab ? `
            <tr>
              <th>Account Name</th>
              <th>Role</th>
              <th>School / Employee ID</th>
              <th>Department / Handled Strand</th>
              <th>Assigned Section</th>
              <th>Date & Origin</th>
              <th>Account Status</th>
              <th>Actions</th>
            </tr>
          ` : isStudentTab ? `
            <tr>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Grade Level</th>
              <th>Strand</th>
              <th>Section</th>
              <th>Date & Origin</th>
              <th>Account Status</th>
              <th>Chat Access</th>
              <th>Actions</th>
            </tr>
          ` : isTeacherTab ? `
            <tr>
              <th>Teacher Name</th>
              <th>Teacher ID</th>
              <th>Strands Handled</th>
              <th>Grade Level</th>
              <th>Section Handled</th>
              <th>Date & Origin</th>
              <th>Account Status</th>
              <th>Chat Access</th>
              <th>Actions</th>
            </tr>
          ` : `
            <tr>
              <th>Administrator</th>
              <th>Admin ID</th>
              <th>Recovery Email</th>
              <th>Date & Origin</th>
              <th>Latest Activity</th>
              <th>Account Status</th>
              <th>Actions</th>
            </tr>
          `}
        </thead>
        <tbody id="userTableBody">
          ${isDeactivatedTab
            ? sortedDeactivated.map(u => renderDeactivatedRow(u)).join('')
            : isStudentTab
              ? students.map(u => renderStudentRow(u)).join('')
              : isTeacherTab
                ? teachers.map(u => renderTeacherRow(u)).join('')
                : admins.map(u => renderAdminRow(u)).join('')
          }
        </tbody>
      </table>
      <div id="userNoResults" style="${(isDeactivatedTab ? deactivated.length : isStudentTab ? students.length : isTeacherTab ? teachers.length : admins.length) === 0 ? '' : 'display:none;'}padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">
        No ${isDeactivatedTab ? 'deactivated accounts' : isStudentTab ? 'students' : isTeacherTab ? 'teachers' : 'administrators'} found matching the filter criteria.
      </div>
    </div>
  `;
}

async function loadUsersFromDB() {
  if (isFetchingUsers) return;
  isFetchingUsers = true;
  try {
    let auditMap = {};
    try {
      const { data: { session } } = await db.auth.getSession();
      if (session) {
        const auditRes = await fetch(`${API_BASE}/api/admin/account-audit`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (auditRes.ok) {
          const auditJson = await auditRes.json();
          auditMap = auditJson.records || {};
        }
      }
    } catch (_) {}
    const localAudits = getLocalOriginRecords();

    const { data, error } = await db.from('users').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Failed to load users:', error.message); return; }
    const fetchedUsers = (data || []).map(u => {
      const auditInfo = auditMap[u.school_id] || auditMap[u.id] || localAudits[u.school_id] || localAudits[u.id] || null;
      const origin = auditInfo?.created_by || null;

      return {
        name: u.full_name,
        id: u.school_id,
        role: u.role,
        detail: u.role === 'student'
          ? `${u.strand || ''} — ${u.grade_level || ''}`
          : (u.role === 'teacher' ? (u.section ? `${u.subjects || u.strand || ''} (${u.section})` : (u.subjects || u.strand || '')) : 'School Administrator'),
        strand: u.strand || '',
        gradeLevel: u.grade_level || '',
        section: u.section || '',
        subjects: u.subjects || '',
        email: u.email || '',
        recoveryEmail: u.email || '',
        createdAt: u.created_at || null,
        lastActive: u.last_active_at || u.created_at || null,
        dbId: u.id,
        isActive: u.is_active !== false,
        origin: origin,
        statusHistory: auditInfo?.status_history || [],
        permanentlyMuted: !!u.permanently_muted,
        mutedUntil: u.muted_until || null,
        strikes: u.profanity_strikes || 0
      };
    });

    const existingNames = new Set(fetchedUsers.map(u => u.name.toLowerCase()));
    const missingSeeds = DEFAULT_SEED_USERS.filter(su => !existingNames.has(su.name.toLowerCase()));
    const hasAdminInDB = fetchedUsers.some(u => u.role === 'admin');
    const missingAdmins = hasAdminInDB ? [] : DEFAULT_SEED_ADMINS.filter(su => !existingNames.has(su.name.toLowerCase()));
    registeredUsers = [...fetchedUsers, ...missingSeeds, ...missingAdmins];

    if (typeof currentPage !== 'undefined' && currentPage === 'users') {
      const wrap = document.getElementById('userManagementContentWrap');
      if (wrap) wrap.innerHTML = renderUserManagementContent();
    } else if (typeof currentPage !== 'undefined' && (currentPage === 'dashboard' || currentPage === 'classrec')) {
      const mainContent = document.getElementById('mainContent');
      if (mainContent && typeof getPageContent === 'function') {
        mainContent.innerHTML = getPageContent(ROLE, currentPage);
      }
    }
  } finally {
    isFetchingUsers = false;
  }
}

function chatStatusHtml(u) {
  const stillMuted = u.mutedUntil && new Date(u.mutedUntil) > new Date();
  if (u.permanentlyMuted) return `<span style="color:#dc2626;font-weight:600;">Muted (${u.strikes} strikes)</span>`;
  if (stillMuted) return `<span style="color:#b45309;">Muted until ${new Date(u.mutedUntil).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>`;
  if (u.strikes > 0) return `<span style="color:var(--text-muted);">${u.strikes} strike${u.strikes > 1 ? 's' : ''}</span>`;
  return `<span style="color:var(--text-muted);">Clean</span>`;
}

async function adminUnmuteUser(userId) {
  const userObj = registeredUsers.find(x => x.dbId === userId || x.id === userId);
  const targetId = userObj?.dbId || userId;

  let success = false;

  if (typeof db !== 'undefined' && db && typeof db.rpc === 'function') {
    try {
      const { error: rpcErr } = await db.rpc('admin_unmute_user', { p_user_id: targetId });
      if (!rpcErr) success = true;
    } catch (_) {}
  }

  if (!success && typeof db !== 'undefined' && db && typeof db.from === 'function') {
    try {
      const { error: updateErr } = await db.from('users').update({
        permanently_muted: false,
        muted_until: null,
        profanity_strikes: 0
      }).eq('id', targetId);
      if (!updateErr) success = true;
    } catch (e) {
      console.warn('Direct update failed:', e);
    }
  }

  if (userObj) {
    userObj.permanentlyMuted = false;
    userObj.mutedUntil = null;
    userObj.strikes = 0;
    success = true;
  }

  if (success) {
    if (typeof showToast === 'function') showToast('User unmuted successfully', 'success');
    if (typeof filterUserTable === 'function') {
      filterUserTable();
    } else if (typeof loadUsersFromDB === 'function') {
      loadUsersFromDB();
    }
  } else {
    if (typeof showToast === 'function') showToast('Could not unmute user', 'error');
  }
}

async function adminMuteUser(userId) {
  const userObj = registeredUsers.find(x => x.dbId === userId || x.id === userId);
  const targetId = userObj?.dbId || userId;

  let success = false;

  if (typeof db !== 'undefined' && db && typeof db.from === 'function') {
    try {
      const { error: updateErr } = await db.from('users').update({
        permanently_muted: true,
        profanity_strikes: 1
      }).eq('id', targetId);
      if (!updateErr) success = true;
    } catch (e) {
      console.warn('Direct update failed:', e);
    }
  }

  if (userObj) {
    userObj.permanentlyMuted = true;
    userObj.strikes = 1;
    success = true;
  }

  if (success) {
    if (typeof showToast === 'function') showToast('User muted from chat', 'info');
    if (typeof filterUserTable === 'function') {
      filterUserTable();
    } else if (typeof loadUsersFromDB === 'function') {
      loadUsersFromDB();
    }
  } else {
    if (typeof showToast === 'function') showToast('Could not mute user', 'error');
  }
}

function filterUserTable() {
  const q = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
  const grade = document.getElementById('userGradeFilter')?.value || '';
  const strand = document.getElementById('userStrandFilter')?.value || '';
  const dateSort = document.getElementById('userDateSort')?.value || 'newest';
  const deactivatedRole = document.getElementById('deactivatedRoleFilter')?.value || '';

  const isStudentTab = adminUserTab === 'students';
  const isTeacherTab = adminUserTab === 'teachers';
  const isAdminTab = adminUserTab === 'admins';
  const isDeactivatedTab = adminUserTab === 'deactivated';

  let list = [];

  if (isDeactivatedTab) {
    list = registeredUsers.filter(u => u.isActive === false);
    if (deactivatedRole) {
      list = list.filter(u => u.role === deactivatedRole);
    }
    if (strand) {
      list = list.filter(u => (u.strand && u.strand.includes(strand)) || (u.subjects && u.subjects.includes(strand)));
    }
    if (q) {
      list = list.filter(u => (u.name + ' ' + u.id + ' ' + (u.subjects || '') + ' ' + (u.strand || '') + ' ' + (u.email || '') + ' ' + (u.role || '')).toLowerCase().includes(q));
    }

    // Strict hierarchy: Admin first, Teacher second, Student last
    const rolePriority = { admin: 1, teacher: 2, student: 3 };
    list.sort((a, b) => {
      const pA = rolePriority[a.role] || 99;
      const pB = rolePriority[b.role] || 99;
      if (pA !== pB) return pA - pB;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateSort === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  } else {
    list = registeredUsers.filter(u => {
      if (u.isActive === false) return false;
      if (isStudentTab) return u.role === 'student';
      if (isTeacherTab) return u.role === 'teacher';
      return u.role === 'admin';
    });

    list = list.filter(u => {
      const matchSearch = !q || (u.name + ' ' + u.id + ' ' + (u.subjects || '') + ' ' + (u.strand || '') + ' ' + (u.email || '')).toLowerCase().includes(q);
      if (isAdminTab) return matchSearch;

      const matchGrade = !grade || u.gradeLevel === grade;
      const matchStrand = !strand || (u.strand && u.strand.includes(strand)) || (u.subjects && u.subjects.includes(strand));
      const secFilter = document.getElementById('userSectionFilter')?.value || '';
      const matchSection = !secFilter ? true :
        secFilter === 'Unassigned' ? (!u.section || u.section === 'Unassigned' || u.section === 'None' || u.section === '—') :
        (u.section || '').trim().toLowerCase() === secFilter.trim().toLowerCase();
      return matchSearch && matchGrade && matchStrand && matchSection;
    });

    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateSort === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }

  const tbody = document.getElementById('userTableBody');
  const noRes = document.getElementById('userNoResults');
  const table = document.querySelector('#userTableWrap table');

  if (tbody) {
    tbody.innerHTML = list.map(u => {
      if (isDeactivatedTab) return renderDeactivatedRow(u);
      if (isStudentTab) return renderStudentRow(u);
      if (isTeacherTab) return renderTeacherRow(u);
      return renderAdminRow(u);
    }).join('');
  }

  if (noRes) noRes.style.display = list.length === 0 ? 'block' : 'none';
  if (table) table.style.display = list.length === 0 ? 'none' : '';
}

/* ═══════════════════════════════════════════════════════════════
   SECTION MANAGEMENT & ROSTER BUILDER ENGINE
   ═══════════════════════════════════════════════════════════════ */

let activeRosterSection = null;
let massAssignTargetSection = '';
let massAssignSelectedIds = new Set();
let massAssignFilterMode = 'unassigned'; // 'unassigned' | 'all'
let massAssignSearchQuery = '';
let massAssignGradeFilter = '';
let massAssignStrandFilter = '';
let sectionViewTab = 'active'; // 'active' | 'archived'

function setSectionViewTab(tab) {
  sectionViewTab = tab;
  filterSectionsView();
}

function renderSectionsTabContent() {
  const unassignedStudents = registeredUsers.filter(u => u.role === 'student' && (!u.section || u.section === 'Unassigned' || u.section === 'None' || u.section === '—'));
  const targetDefaultSection = managedSections.find(s => !s.isArchived)?.name || managedSections[0]?.name || 'Section A';
  const activeCount = managedSections.filter(s => !s.isArchived).length;
  const archivedCount = managedSections.filter(s => s.isArchived).length;

  return `
    <!-- ── ACTIVE VS ARCHIVED SECTION TABS ── -->
    <div style="display:flex;align-items:center;margin-bottom:16px;">
      <div style="display:inline-flex;background:#f1f5f9;padding:4px;border-radius:12px;gap:6px;border:1px solid #e2e8f0;">
        <button type="button" class="anc-archive-tab ${sectionViewTab === 'active' ? 'active' : ''}" style="padding:7px 16px;font-size:13px;font-weight:700;border-radius:8px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;" onclick="setSectionViewTab('active')">
          🏫 Active Sections (${activeCount})
        </button>
        <button type="button" class="anc-archive-tab ${sectionViewTab === 'archived' ? 'active' : ''}" style="padding:7px 16px;font-size:13px;font-weight:700;border-radius:8px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;" onclick="setSectionViewTab('archived')">
          📦 Archived Sections (${archivedCount})
        </button>
      </div>
    </div>

    ${unassignedStudents.length > 0 ? `
      <div class="sec-unassigned-banner">
        <div class="sec-unassigned-info">
          <div class="sec-unassigned-icon">${iconAlert()}</div>
          <div>
            <h4>${unassignedStudents.length} Unassigned Student${unassignedStudents.length !== 1 ? 's' : ''} Ready for Sectioning</h4>
            <p>These students currently have no assigned class section and can be mass-enrolled into a section at any time.</p>
          </div>
        </div>
        <button class="sec-unassigned-btn" onclick="openMassAssignModal('${escHtml(targetDefaultSection)}')">
          ${iconUsers()} Mass Assign Now
        </button>
      </div>
    ` : ''}

    <div class="user-search-row">
      <div class="user-search-wrap">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="sectionSearchInput" placeholder="Search by section name only…" value="${escHtml(sectionSearchQuery)}" oninput="filterSectionsView()">
      </div>

      <select class="user-filter-select" id="sectionGradeFilterSelect" onchange="filterSectionsView()">
        <option value="" ${!sectionGradeFilter ? 'selected' : ''}>All Grade Levels</option>
        <option value="Grade 11" ${sectionGradeFilter === 'Grade 11' ? 'selected' : ''}>Grade 11</option>
        <option value="Grade 12" ${sectionGradeFilter === 'Grade 12' ? 'selected' : ''}>Grade 12</option>
      </select>

      <select class="user-filter-select" id="sectionStrandFilterSelect" onchange="filterSectionsView()">
        <option value="" ${!sectionStrandFilter ? 'selected' : ''}>All Strands</option>
        <option value="STEM" ${sectionStrandFilter === 'STEM' ? 'selected' : ''}>STEM</option>
        <option value="HUMSS" ${sectionStrandFilter === 'HUMSS' ? 'selected' : ''}>HUMSS</option>
        <option value="ABM" ${sectionStrandFilter === 'ABM' ? 'selected' : ''}>ABM</option>
        <option value="TVL" ${sectionStrandFilter === 'TVL' ? 'selected' : ''}>TVL</option>
      </select>
    </div>

    <div class="sections-grid" id="sectionsGridWrap">
      ${renderSectionCards()}
    </div>
  `;
}

function filterSectionsView() {
  sectionSearchQuery = document.getElementById('sectionSearchInput')?.value || '';
  sectionGradeFilter = document.getElementById('sectionGradeFilterSelect')?.value || '';
  sectionStrandFilter = document.getElementById('sectionStrandFilterSelect')?.value || '';

  const wrap = document.getElementById('sectionsGridWrap');
  if (wrap) wrap.innerHTML = renderSectionCards();
}

function renderSectionCards() {
  const isArchivedTab = sectionViewTab === 'archived';
  let list = managedSections.filter(s => isArchivedTab ? Boolean(s.isArchived) : !s.isArchived);
  const q = sectionSearchQuery.toLowerCase().trim();

  // Search strictly works ONLY for the name of the section - no other factors play in!
  if (q) {
    list = list.filter(s => (s.name || '').toLowerCase().includes(q));
  }
  if (sectionGradeFilter) {
    list = list.filter(s => s.gradeLevel === sectionGradeFilter);
  }
  if (sectionStrandFilter) {
    list = list.filter(s => s.strand === sectionStrandFilter);
  }

  if (!list.length) {
    return `
      <div style="grid-column:1/-1;background:#fff;border:1.5px dashed var(--blue-light);border-radius:16px;padding:36px;text-align:center;color:var(--text-muted);">
        <div style="width:44px;height:44px;margin:0 auto 12px;color:var(--blue-mid);">${isArchivedTab ? iconArchive() : iconFolder()}</div>
        <h4 style="font-size:15px;color:var(--text-primary);margin-bottom:4px;">${isArchivedTab ? 'No Archived Sections' : 'No Sections Found'}</h4>
        <p style="font-size:13px;margin-bottom:16px;">${isArchivedTab ? 'There are currently no archived sections.' : (q ? `No section matches "${escHtml(q)}".` : 'No sections match your filter settings.')}</p>
        ${!isArchivedTab ? `<button class="foot-btn-secondary" onclick="openCreateSectionModal()">${iconPlus()} Create New Section</button>` : ''}
      </div>
    `;
  }

  return list.map(s => {
    const enrolledStudents = registeredUsers.filter(u =>
      u.role === 'student' &&
      (u.section || '').trim().toLowerCase() === (s.name || '').trim().toLowerCase()
    );

    const assignedTeachers = registeredUsers.filter(u =>
      u.role === 'teacher' &&
      u.isActive !== false &&
      isTeacherAssignedToSection(u, s.name)
    );

    const isArchived = Boolean(s.isArchived);

    return `
      <div class="section-card" style="${isArchived ? 'opacity:0.92;border-color:#fde68a;background:#fffdfa;' : ''}">
        <div>
          <div class="sec-card-head">
            <div>
              <div class="sec-card-title" style="display:flex;align-items:center;gap:8px;">
                ${escHtml(s.name)}
                ${isArchived ? `<span class="sec-badge" style="background:#fef3c7;color:#b45309;font-size:11px;padding:2px 8px;font-weight:700;">📦 Archived</span>` : ''}
              </div>
            </div>
            <span class="sec-badge count">${enrolledStudents.length} Student${enrolledStudents.length !== 1 ? 's' : ''}</span>
          </div>

          <div class="sec-meta-badges">
            <span class="sec-badge grade">${escHtml(s.gradeLevel || 'Grade 11')}</span>
            <span class="sec-badge strand">${escHtml(s.strand || 'General')}</span>
          </div>

          <div class="sec-card-details">
            <div><strong>Adviser:</strong> ${escHtml(s.adviser || 'Not Assigned')}</div>
            <div><strong>Room / Location:</strong> ${escHtml(s.room || 'TBD')}</div>
            <div><strong>Assigned Teachers:</strong> ${assignedTeachers.length > 0 ? assignedTeachers.map(t => escHtml(t.name)).join(', ') : '<span style="color:#94a3b8;font-style:italic;">None assigned</span>'}</div>
            ${isArchived && s.archivedAt ? `<div style="color:#b45309;font-size:11.5px;margin-top:4px;">Archived on ${new Date(s.archivedAt).toLocaleDateString()}</div>` : ''}
          </div>
        </div>

        <div class="sec-card-actions">
          <button class="sec-btn-roster" onclick="openManageSectionModal('${escHtml(s.name)}')">
            ${iconUsers()} ${isArchived ? 'View Roster' : 'Manage Section'}
          </button>
          ${isArchived ? `
            <button class="sec-btn-icon" style="color:#16a34a;" title="Unarchive Section" aria-label="Unarchive Section" onclick="unarchiveSectionPrompt('${escHtml(s.id)}')">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
          ` : `
            <button class="sec-btn-icon" style="color:#ea580c;" title="Archive Section" aria-label="Archive Section" onclick="archiveSectionPrompt('${escHtml(s.id)}')">
              ${iconArchive()}
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

/* ── Section Modal (Create / Edit) ── */
let currentEditingSectionId = null;

function openCreateSectionModal() {
  currentEditingSectionId = null;
  document.getElementById('sectionModalTitle').textContent = 'Create New Section';
  document.getElementById('sectionModalSubtitle').textContent = 'Set up a new class section for student enrollment';
  renderSectionModalForm({
    name: '',
    gradeLevel: 'Grade 11',
    strand: 'STEM',
    adviser: '',
    room: ''
  });
  document.getElementById('sectionModal').classList.add('active');
}

function openEditSectionModal(secId) {
  currentEditingSectionId = secId;
  const sec = managedSections.find(s => s.id === secId);
  if (!sec) return;

  document.getElementById('sectionModalTitle').textContent = 'Edit Section';
  document.getElementById('sectionModalSubtitle').textContent = `Update details for ${sec.name}`;
  renderSectionModalForm(sec);
  document.getElementById('sectionModal').classList.add('active');
}

function closeSectionModal() {
  document.getElementById('sectionModal').classList.remove('active');
}

function renderSectionModalForm(sec) {
  const body = document.getElementById('sectionModalBody');
  const foot = document.getElementById('sectionModalFoot');

  body.innerHTML = `
    <div class="gen-field">
      <label>Section Name *</label>
      <input type="text" id="secFormName" placeholder="e.g. Section E, 11-STEM-Curie" value="${escHtml(sec.name || '')}">
    </div>

    <div class="gen-row">
      <div class="gen-field">
        <label>Grade Level</label>
        <select id="secFormGrade" class="user-filter-select" style="width:100%;">
          ${GRADE_LEVELS.map(g => `<option value="${g}" ${sec.gradeLevel === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
      </div>
      <div class="gen-field">
        <label>Strand</label>
        <select id="secFormStrand" class="user-filter-select" style="width:100%;">
          ${STRANDS.map(st => `<option value="${st}" ${sec.strand === st ? 'selected' : ''}>${st}</option>`).join('')}
          <option value="General" ${sec.strand === 'General' ? 'selected' : ''}>General</option>
        </select>
      </div>
    </div>

    <div class="gen-row">
      <div class="gen-field">
        <label>Class Adviser</label>
        <select id="secFormAdviser" class="user-filter-select" style="width:100%;">
          <option value="">Select a Teacher as Adviser (Optional)</option>
          ${registeredUsers.filter(u => u.role === 'teacher').map(t => `<option value="${escHtml(t.name)}" ${sec.adviser === t.name ? 'selected' : ''}>${escHtml(t.name)} (${escHtml(t.strand || t.subjects || 'General')})</option>`).join('')}
        </select>
        <div style="margin-top:5px;">
          <input type="text" id="secFormAdviserCustom" placeholder="Or type unlisted adviser name…" value="${registeredUsers.some(u => u.role === 'teacher' && u.name === sec.adviser) ? '' : escHtml(sec.adviser || '')}" style="width:100%;font-size:12px;padding:6px 10px;border:1px solid var(--blue-light);border-radius:6px;">
        </div>
      </div>
      <div class="gen-field">
        <label>Room / Location (Optional)</label>
        <input type="text" id="secFormRoom" placeholder="e.g. Room 304, Science Wing" value="${escHtml(sec.room || '')}">
      </div>
    </div>
  `;

  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="closeSectionModal()">Cancel</button>
    <button class="gen-btn" onclick="saveSectionForm()">${iconCheck()} Save Section</button>
  `;
}

function saveSectionForm() {
  const name = (document.getElementById('secFormName')?.value || '').trim();
  const gradeLevel = document.getElementById('secFormGrade')?.value || 'Grade 11';
  const strand = document.getElementById('secFormStrand')?.value || 'STEM';
  const adviserSelect = document.getElementById('secFormAdviser')?.value || '';
  const adviserCustom = (document.getElementById('secFormAdviserCustom')?.value || '').trim();
  const adviser = adviserCustom || adviserSelect;
  const room = (document.getElementById('secFormRoom')?.value || '').trim();

  if (!name) {
    showToast('Please enter a Section Name', 'error');
    return;
  }

  // Check name uniqueness if new or renamed
  const existingWithSameName = managedSections.find(s =>
    s.name.toLowerCase() === name.toLowerCase() && s.id !== currentEditingSectionId
  );
  if (existingWithSameName) {
    showToast(`A section named "${name}" already exists`, 'error');
    return;
  }

  if (currentEditingSectionId) {
    const idx = managedSections.findIndex(s => s.id === currentEditingSectionId);
    if (idx !== -1) {
      const oldName = managedSections[idx].name;
      managedSections[idx] = {
        ...managedSections[idx],
        name, gradeLevel, strand, adviser, room
      };
      // If name changed, update students assigned to oldName
      if (oldName !== name) {
        registeredUsers.forEach(u => {
          if ((u.section || '').trim().toLowerCase() === oldName.trim().toLowerCase()) {
            u.section = name;
          }
        });
      }
    }
  } else {
    managedSections.push({
      id: 'sec-' + Date.now(),
      name,
      gradeLevel,
      strand,
      adviser,
      room,
      createdAt: new Date().toISOString()
    });
  }

  saveManagedSections();
  closeSectionModal();
  showToast(`Section "${name}" saved successfully!`, 'success');

  refreshSectionAndUserViews();
}

function refreshSectionAndUserViews() {
  const secWrap = document.getElementById('sectionManagementContentWrap');
  if (secWrap) secWrap.innerHTML = renderSectionsTabContent();

  const userWrap = document.getElementById('userManagementContentWrap');
  if (userWrap) userWrap.innerHTML = renderUserManagementContent();
}

function archiveSectionPrompt(secId) {
  const sec = managedSections.find(s => s.id === secId);
  if (!sec) return;

  const enrolled = registeredUsers.filter(u =>
    u.role === 'student' &&
    (u.section || '').trim().toLowerCase() === sec.name.trim().toLowerCase()
  );

  const confirmMsg = enrolled.length > 0
    ? `Archive section "${sec.name}"?\n\nThis section currently has ${enrolled.length} enrolled student(s). Archiving will safely preserve all academic history, student records, and class rosters while moving the section to the archive view. You can unarchive it at any time.`
    : `Archive section "${sec.name}"?\n\nThe section will be archived. Academic records are preserved and you can unarchive it at any time.`;

  if (!confirm(confirmMsg)) return;

  sec.isArchived = true;
  sec.archivedAt = new Date().toISOString();
  saveManagedSections();
  showToast(`Section "${sec.name}" archived successfully.`, 'info');

  refreshSectionAndUserViews();
}

function unarchiveSectionPrompt(secId) {
  const sec = managedSections.find(s => s.id === secId);
  if (!sec) return;

  sec.isArchived = false;
  sec.unarchivedAt = new Date().toISOString();
  saveManagedSections();
  showToast(`Section "${sec.name}" unarchived and active!`, 'success');

  refreshSectionAndUserViews();
}

function deleteSectionPrompt(secId) {
  // Sections are strictly archived to preserve historical records, never permanently destroyed
  archiveSectionPrompt(secId);
}

/* ═══════════════════════════════════════════════════════════════
   TEACHER SECTION ASSIGNMENT & STRAND COMPATIBILITY ENGINE
   ═══════════════════════════════════════════════════════════════ */

let currentEditingTeacherKey = null;

function getTeacherHandledStrands(teacher) {
  if (!teacher) return ['General'];
  const raw = `${teacher.subjects || ''} ${teacher.strand || ''}`.toUpperCase();
  const known = ['STEM', 'HUMSS', 'ABM', 'TVL'];
  const matched = known.filter(k => raw.includes(k));
  return matched.length === 0 ? ['General'] : matched;
}

function isTeacherCompatibleWithSection(teacher, section) {
  if (!teacher || !section) return false;
  const teacherStrands = getTeacherHandledStrands(teacher);
  if (teacherStrands.includes('General')) return true;

  const secStrand = (section.strand || '').toUpperCase().trim();
  if (!secStrand || secStrand === 'GENERAL') return true;

  return teacherStrands.includes(secStrand);
}

function isTeacherAssignedToSection(teacher, secName) {
  if (!teacher || !teacher.section || !secName) return false;
  const parts = teacher.section.split(',').map(s => s.trim().toLowerCase());
  return parts.includes(secName.trim().toLowerCase());
}

/* ── Modal: Assign Sections to a Specific Teacher ── */
function openAssignTeacherSectionsModal(teacherKey) {
  currentEditingTeacherKey = teacherKey;
  const teacher = registeredUsers.find(u => u.dbId === teacherKey || u.id === teacherKey);
  if (!teacher) {
    if (typeof showToast === 'function') showToast('Teacher record not found', 'error');
    return;
  }

  const modal = document.getElementById('teacherSectionModal');
  if (!modal) return;

  const teacherStrands = getTeacherHandledStrands(teacher);
  const activeSections = managedSections.filter(s => !s.isArchived);

  document.getElementById('teacherSectionModalTitle').textContent = `Reassign Sections — ${teacher.name}`;
  document.getElementById('teacherSectionModalSubtitle').textContent = `Employee ID: ${teacher.id} · Curriculum Specialization: ${teacherStrands.join(', ')}`;

  const body = document.getElementById('teacherSectionModalBody');
  const foot = document.getElementById('teacherSectionModalFoot');

  const curAssigned = (teacher.section || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  body.innerHTML = `
    <!-- TEACHER SPECIALIZATION STRIP -->
    <div style="background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:12px;padding:12px 16px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div>
          <span style="font-size:11px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;">Curriculum Specialization</span>
          <div style="font-size:14px;font-weight:700;color:#0c4a6e;display:flex;align-items:center;gap:8px;margin-top:2px;">
            ${teacherStrands.map(st => `<span class="role-tag teacher" style="font-size:12px;padding:3px 10px;">${escHtml(st)}</span>`).join('')}
          </div>
        </div>
        <div style="font-size:12px;color:#0369a1;text-align:right;">
          <strong>Currently Assigned:</strong> ${curAssigned.length > 0 ? curAssigned.map(s => `<span class="sec-badge grade" style="font-size:11px;margin-left:4px;">${escHtml(s)}</span>`).join('') : '<span style="font-style:italic;color:#64748b;">None (All / Unassigned)</span>'}
        </div>
      </div>
      <div style="font-size:12px;color:#075985;margin-top:8px;line-height:1.4;">
        ℹ️ To uphold academic standards, faculty can only be assigned to class sections matching their handled strand(s) (<strong>${teacherStrands.join(', ')}</strong>). Sections of differing strands are restricted.
      </div>
    </div>

    <!-- SECTIONS LIST -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <h5 style="margin:0;font-size:13px;font-weight:700;color:var(--text-primary);">Available Class Sections</h5>
      <span style="font-size:11.5px;color:var(--text-muted);">${activeSections.length} Active Sections</span>
    </div>

    <div style="max-height:280px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
      ${activeSections.length > 0 ? activeSections.map(s => {
        const isCompatible = isTeacherCompatibleWithSection(teacher, s);
        const isChecked = isTeacherAssignedToSection(teacher, s.name);
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f1f5f9;${!isCompatible ? 'background:#f8fafc;opacity:0.65;' : 'cursor:pointer;'}"
               ${isCompatible ? `onclick="document.getElementById('ts_sec_${escHtml(s.id)}').click()"` : ''}>
            <div style="display:flex;align-items:center;gap:12px;">
              <input type="checkbox" id="ts_sec_${escHtml(s.id)}" value="${escHtml(s.name)}"
                     ${isChecked ? 'checked' : ''}
                     ${!isCompatible ? 'disabled' : ''}
                     onclick="event.stopPropagation()">
              <div>
                <div style="font-size:13.5px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                  ${escHtml(s.name)}
                  <span class="sec-badge grade" style="font-size:10.5px;">${escHtml(s.gradeLevel || 'Grade 11')}</span>
                  <span class="sec-badge strand" style="font-size:10.5px;">${escHtml(s.strand || 'General')}</span>
                </div>
                <div style="font-size:11.5px;color:#64748b;margin-top:2px;">
                  Adviser: ${escHtml(s.adviser || 'None')} · Room: ${escHtml(s.room || 'TBD')}
                </div>
              </div>
            </div>
            <div>
              ${isCompatible ? (
                isChecked
                  ? `<span class="sec-badge" style="background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;font-size:11px;font-weight:600;">✓ Assigned</span>`
                  : `<span style="font-size:11px;color:#0284c7;font-weight:600;">Eligible</span>`
              ) : `
                <span class="sec-badge" style="background:#fef2f2;color:#991b1b;border:1px solid #fecaca;font-size:10.5px;font-weight:700;" title="Section strand (${s.strand}) differs from teacher specialization (${teacherStrands.join(', ')})">
                  Strand Mismatch (${escHtml(s.strand || 'General')})
                </span>
              `}
            </div>
          </div>
        `;
      }).join('') : `
        <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">
          No active sections found. Create a section first.
        </div>
      `}
    </div>
  `;

  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="closeTeacherSectionModal()">Cancel</button>
    <button type="button" class="foot-btn-secondary" style="color:#dc2626;border-color:#fecaca;" onclick="clearAllTeacherSections('${escHtml(teacherKey)}')">Clear All (Unassign)</button>
    <button class="gen-btn" onclick="saveTeacherSectionAssignments('${escHtml(teacherKey)}')">
      Save Section Assignments
    </button>
  `;

  modal.classList.add('active');
}

function closeTeacherSectionModal() {
  const modal = document.getElementById('teacherSectionModal');
  if (modal) modal.classList.remove('active');
  currentEditingTeacherKey = null;
}

async function clearAllTeacherSections(teacherKey) {
  const teacher = registeredUsers.find(u => u.dbId === teacherKey || u.id === teacherKey);
  if (!teacher) return;
  teacher.section = null;
  if (teacher.dbId && typeof db !== 'undefined' && db?.from) {
    try {
      await db.from('users').update({ section: null }).eq('id', teacher.dbId);
    } catch (e) {
      console.warn('DB update failed:', e);
    }
  }
  if (typeof showToast === 'function') showToast(`Unassigned all sections for ${teacher.name}`, 'info');
  closeTeacherSectionModal();
  refreshSectionAndUserViews();
}

async function saveTeacherSectionAssignments(teacherKey) {
  const teacher = registeredUsers.find(u => u.dbId === teacherKey || u.id === teacherKey);
  if (!teacher) return;

  const modal = document.getElementById('teacherSectionModal');
  if (!modal) return;

  const checkedBoxes = modal.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)');
  const selectedSections = Array.from(checkedBoxes).map(cb => cb.value.trim()).filter(Boolean);

  const newSectionStr = selectedSections.length > 0 ? selectedSections.join(', ') : null;
  teacher.section = newSectionStr;

  if (teacher.dbId && typeof db !== 'undefined' && db?.from) {
    try {
      const { error } = await db.from('users').update({ section: newSectionStr }).eq('id', teacher.dbId);
      if (error) {
        console.warn('Failed to update teacher sections in database:', error.message);
      }
    } catch (e) {
      console.warn('DB update error:', e);
    }
  }

  if (typeof showToast === 'function') {
    showToast(`Updated sections for ${teacher.name}: ${newSectionStr || 'None (Unassigned)'}`, 'success');
  }

  closeTeacherSectionModal();
  refreshSectionAndUserViews();
}

/* ── Modal: Assign Subject Teachers to a Section ── */
function openAssignTeachersToSectionModal(secName) {
  const sec = managedSections.find(s => s.name === secName) || { name: secName, gradeLevel: 'Grade 11', strand: 'General' };
  const modal = document.getElementById('assignTeachersToSectionModal');
  if (!modal) return;

  document.getElementById('assignTeachersToSectionTitle').textContent = `Assign Faculty — ${sec.name}`;
  document.getElementById('assignTeachersToSectionSubtitle').textContent = `${sec.gradeLevel || 'Grade 11'} · ${sec.strand || 'General'} Curriculum`;

  const body = document.getElementById('assignTeachersToSectionBody');
  const foot = document.getElementById('assignTeachersToSectionFoot');

  const activeTeachers = registeredUsers.filter(u => u.role === 'teacher' && u.isActive !== false);

  body.innerHTML = `
    <!-- CURRICULUM GUARD BANNER -->
    <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:12px 16px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div>
          <span style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;">Curriculum Strand Filter</span>
          <div style="font-size:14px;font-weight:700;color:#166534;display:flex;align-items:center;gap:8px;margin-top:2px;">
            Required Specialization: <span class="sec-badge strand" style="font-size:12px;padding:3px 10px;">${escHtml(sec.strand || 'General')}</span>
          </div>
        </div>
      </div>
      <div style="font-size:12px;color:#166534;margin-top:6px;line-height:1.4;">
        🛡️ Faculty members must handle <strong>${escHtml(sec.strand || 'General')}</strong> subjects to be assigned to this section. Incompatible faculty are restricted to preserve senior high academic specialization.
      </div>
    </div>

    <!-- TEACHERS LIST -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <h5 style="margin:0;font-size:13px;font-weight:700;color:var(--text-primary);">Faculty Roster</h5>
      <span style="font-size:11.5px;color:var(--text-muted);">${activeTeachers.length} Total Faculty</span>
    </div>

    <div style="max-height:280px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
      ${activeTeachers.length > 0 ? activeTeachers.map(t => {
        const isCompatible = isTeacherCompatibleWithSection(t, sec);
        const isAssigned = isTeacherAssignedToSection(t, sec.name);
        const tStrands = getTeacherHandledStrands(t);
        const curSections = (t.section || '').split(',').map(s => s.trim()).filter(Boolean);

        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f1f5f9;${!isCompatible ? 'background:#f8fafc;opacity:0.6;' : 'cursor:pointer;'}"
               ${isCompatible ? `onclick="document.getElementById('att_cb_${escHtml(t.dbId || t.id)}').click()"` : ''}>
            <div style="display:flex;align-items:center;gap:12px;">
              <input type="checkbox" id="att_cb_${escHtml(t.dbId || t.id)}"
                     value="${escHtml(t.dbId || t.id)}"
                     ${isAssigned ? 'checked' : ''}
                     ${!isCompatible ? 'disabled' : ''}
                     onclick="event.stopPropagation()">
              <div>
                <div style="font-size:13.5px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                  ${escHtml(t.name)}
                  <code style="font-size:11px;background:#fffbeb;padding:2px 5px;border-radius:3px;color:#d97706;">${escHtml(t.id)}</code>
                  <span class="role-tag teacher" style="font-size:10.5px;">${escHtml(tStrands.join(', '))}</span>
                </div>
                <div style="font-size:11.5px;color:#64748b;margin-top:2px;">
                  Handled Sections: ${curSections.length > 0 ? curSections.join(', ') : 'None'}
                </div>
              </div>
            </div>
            <div>
              ${isCompatible ? (
                isAssigned
                  ? `<span class="sec-badge" style="background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;font-size:11px;font-weight:600;">✓ Assigned</span>`
                  : `<span style="font-size:11px;color:#16a34a;font-weight:600;">Compatible</span>`
              ) : `
                <span class="sec-badge" style="background:#fef2f2;color:#991b1b;border:1px solid #fecaca;font-size:10.5px;font-weight:700;" title="Teacher handles ${tStrands.join(', ')}, but this section is ${sec.strand || 'General'}">
                  Strand Mismatch
                </span>
              `}
            </div>
          </div>
        `;
      }).join('') : `
        <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">
          No active teachers found in the system.
        </div>
      `}
    </div>
  `;

  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="closeAssignTeachersToSectionModal()">Cancel</button>
    <button class="gen-btn" onclick="saveSectionTeacherAssignments('${escHtml(sec.name)}')">
      Save Assigned Teachers
    </button>
  `;

  modal.classList.add('active');
}

function closeAssignTeachersToSectionModal() {
  const modal = document.getElementById('assignTeachersToSectionModal');
  if (modal) modal.classList.remove('active');
}

async function saveSectionTeacherAssignments(secName) {
  const modal = document.getElementById('assignTeachersToSectionModal');
  if (!modal) return;

  const sec = managedSections.find(s => s.name === secName);
  if (!sec) return;

  const activeTeachers = registeredUsers.filter(u => u.role === 'teacher' && u.isActive !== false);

  for (const t of activeTeachers) {
    if (!isTeacherCompatibleWithSection(t, sec)) continue;
    const key = t.dbId || t.id;
    const cb = modal.querySelector(`input[value="${key}"]`);
    if (!cb) continue;

    const curSections = (t.section || '').split(',').map(s => s.trim()).filter(Boolean);
    const hasSec = curSections.some(s => s.toLowerCase() === secName.toLowerCase());

    let updated = false;
    if (cb.checked && !hasSec) {
      curSections.push(secName);
      updated = true;
    } else if (!cb.checked && hasSec) {
      const idx = curSections.findIndex(s => s.toLowerCase() === secName.toLowerCase());
      if (idx !== -1) curSections.splice(idx, 1);
      updated = true;
    }

    if (updated) {
      t.section = curSections.length > 0 ? curSections.join(', ') : null;
      if (t.dbId && typeof db !== 'undefined' && db?.from) {
        try {
          await db.from('users').update({ section: t.section }).eq('id', t.dbId);
        } catch (e) {
          console.warn('DB update failed for teacher section:', e);
        }
      }
    }
  }

  if (typeof showToast === 'function') {
    showToast(`Updated assigned faculty for ${secName}`, 'success');
  }

  closeAssignTeachersToSectionModal();
  openManageSectionModal(secName);
  refreshSectionAndUserViews();
}

async function removeTeacherFromSection(teacherKey, secName) {
  const teacher = registeredUsers.find(u => u.dbId === teacherKey || u.id === teacherKey);
  if (!teacher) return;

  const curSections = (teacher.section || '').split(',').map(s => s.trim()).filter(Boolean);
  const filtered = curSections.filter(s => s.toLowerCase() !== secName.toLowerCase());
  teacher.section = filtered.length > 0 ? filtered.join(', ') : null;

  if (teacher.dbId && typeof db !== 'undefined' && db?.from) {
    try {
      await db.from('users').update({ section: teacher.section }).eq('id', teacher.dbId);
    } catch (e) {
      console.warn('DB update failed:', e);
    }
  }

  if (typeof showToast === 'function') {
    showToast(`${teacher.name} unassigned from ${secName}`, 'info');
  }

  openManageSectionModal(secName);
  refreshSectionAndUserViews();
}

/* ── Section Roster Modal ── */
function openManageSectionModal(secName) {
  activeRosterSection = secName;
  const sec = managedSections.find(s => s.name === secName) || { name: secName, gradeLevel: 'Grade 11', strand: 'General', adviser: '', room: '' };
  const enrolled = registeredUsers.filter(u =>
    u.role === 'student' &&
    (u.section || '').trim().toLowerCase() === secName.trim().toLowerCase()
  );

  const assignedTeachers = registeredUsers.filter(u =>
    u.role === 'teacher' &&
    u.isActive !== false &&
    isTeacherAssignedToSection(u, secName)
  );

  document.getElementById('sectionRosterTitle').textContent = `Manage Section — ${sec.name}`;
  document.getElementById('sectionRosterSubtitle').textContent = `${sec.gradeLevel || 'Grade 11'} · ${sec.strand || 'General'}${sec.adviser ? ` · Adviser: ${sec.adviser}` : ' · No Adviser Assigned'}`;

  const body = document.getElementById('sectionRosterBody');
  const foot = document.getElementById('sectionRosterFoot');

  body.innerHTML = `
    <!-- SECTION DETAILS & ADVISER STRIP -->
    <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div>
        <div style="display:flex;align-items:center;gap:8px;">
          <h4 style="font-size:15px;font-weight:700;color:var(--text-primary);margin:0;">${escHtml(sec.name)}</h4>
          <span class="sec-badge grade">${escHtml(sec.gradeLevel || 'Grade 11')}</span>
          <span class="sec-badge strand">${escHtml(sec.strand || 'General')}</span>
        </div>
        <div style="font-size:12.5px;color:var(--text-secondary);margin-top:4px;">
          <strong>Class Adviser:</strong> ${escHtml(sec.adviser || 'Not Assigned')} &nbsp;·&nbsp; <strong>Room:</strong> ${escHtml(sec.room || 'TBD')}
        </div>
      </div>
      <button type="button" class="sec-edit-shortcut-btn" onclick="closeSectionRosterModal(); openEditSectionModal('${escHtml(sec.id)}')">
        ${iconDoc()} Edit Details & Adviser
      </button>
    </div>

    <!-- ASSIGNED SUBJECT TEACHERS -->
    <div class="roster-header-bar" style="margin-bottom:8px;">
      <div class="roster-sec-info">
        <h4>${assignedTeachers.length} Assigned Subject Teacher${assignedTeachers.length !== 1 ? 's' : ''}</h4>
        <span>Faculty handling subjects for this section (${sec.strand || 'General'} specialization)</span>
      </div>
      <button class="add-btn" style="margin:0;padding:6px 14px;font-size:12px;height:32px;background:#0284c7;" onclick="openAssignTeachersToSectionModal('${escHtml(sec.name)}')">
        ${iconUsers()} Assign / Reassign Teachers
      </button>
    </div>

    <div class="roster-table-wrap" style="margin-bottom:20px;">
      <table class="roster-table">
        <thead>
          <tr>
            <th>Teacher Name</th>
            <th>Teacher ID</th>
            <th>Specialized Strands</th>
            <th>All Handled Sections</th>
            <th style="text-align:right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${assignedTeachers.length > 0 ? assignedTeachers.map(t => `
            <tr>
              <td><strong>${escHtml(t.name)}</strong></td>
              <td><code style="font-size:12px;background:#fffbeb;padding:2px 6px;border-radius:4px;color:#d97706;">${escHtml(t.id)}</code></td>
              <td><span class="role-tag teacher">${escHtml(t.subjects || t.strand || 'General')}</span></td>
              <td><span class="sec-badge grade" style="font-size:11px;">${escHtml(t.section || secName)}</span></td>
              <td style="text-align:right;">
                <button class="action-link" style="color:#dc2626;background:none;border:none;cursor:pointer;font-family:inherit;font-weight:600;" onclick="removeTeacherFromSection('${t.dbId || t.id}', '${escHtml(secName)}')">
                  Remove
                </button>
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="5" style="text-align:center;padding:18px;color:var(--text-muted);font-size:13px;">
                No subject teachers assigned to this section yet.<br>
                <button class="foot-btn-secondary" style="margin-top:8px;" onclick="openAssignTeachersToSectionModal('${escHtml(sec.name)}')">
                  ${iconPlus()} Assign Teachers Now
                </button>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>

    <!-- ENROLLED STUDENTS LIST -->
    <div class="roster-header-bar">
      <div class="roster-sec-info">
        <h4>${enrolled.length} Enrolled Student${enrolled.length !== 1 ? 's' : ''}</h4>
        <span>Students assigned to this section</span>
      </div>
      <button class="add-btn" style="margin:0;padding:6px 14px;font-size:12px;height:32px;" onclick="openMassAssignModal('${escHtml(sec.name)}')">
        ${iconPlus()} Add Students to Section
      </button>
    </div>

    <div class="roster-table-wrap">
      <table class="roster-table">
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Student ID</th>
            <th>Grade Level</th>
            <th>Strand</th>
            <th style="text-align:right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${enrolled.length > 0 ? enrolled.map(u => `
            <tr>
              <td><strong>${escHtml(u.name)}</strong></td>
              <td><code style="font-size:12px;background:#f0f6ff;padding:2px 6px;border-radius:4px;color:var(--blue);">${escHtml(u.id)}</code></td>
              <td>${escHtml(u.gradeLevel || 'Grade 11')}</td>
              <td><span class="role-tag student">${escHtml(u.strand || 'N/A')}</span></td>
              <td style="text-align:right;">
                <button class="action-link" style="color:#dc2626;background:none;border:none;cursor:pointer;font-family:inherit;" onclick="removeStudentFromSection('${u.dbId || u.id}', '${escHtml(secName)}')">
                  Remove
                </button>
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="5" style="text-align:center;padding:28px;color:var(--text-muted);font-size:13px;">
                No students enrolled in this section yet.<br>
                <button class="foot-btn-secondary" style="margin-top:10px;" onclick="openMassAssignModal('${escHtml(sec.name)}')">
                  ${iconPlus()} Add Students to Section Now
                </button>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="closeSectionRosterModal()">Done</button>
    <button class="gen-btn" onclick="openMassAssignModal('${escHtml(sec.name)}')">${iconPlus()} Add Students to Section</button>
  `;

  document.getElementById('sectionRosterModal').classList.add('active');
}

function openSectionRosterModal(secName) {
  openManageSectionModal(secName);
}

function closeSectionRosterModal() {
  document.getElementById('sectionRosterModal').classList.remove('active');
}

async function removeStudentFromSection(studentKey, secName) {
  const student = registeredUsers.find(u => (u.dbId === studentKey || u.id === studentKey));
  if (!student) return;

  student.section = null;

  if (student.dbId && typeof db !== 'undefined' && db?.from) {
    await db.from('users').update({ section: null }).eq('id', student.dbId);
  }

  showToast(`${student.name} removed from ${secName} (now Unassigned)`, 'info');

  openSectionRosterModal(secName);
  refreshSectionAndUserViews();
}

/* ── Mass Assign Modal ── */
function openMassAssignForSingleStudent(studentKey) {
  const student = registeredUsers.find(u => (u.dbId === studentKey || u.id === studentKey));
  massAssignSelectedIds.clear();
  if (student) massAssignSelectedIds.add(student.dbId || student.id);
  openMassAssignModal(managedSections[0]?.name || 'Section A');
}

function openMassAssignModal(targetSectionName) {
  massAssignTargetSection = targetSectionName || (managedSections[0]?.name || 'Section A');
  massAssignFilterMode = 'unassigned';
  massAssignSearchQuery = '';
  massAssignGradeFilter = '';
  massAssignStrandFilter = '';

  document.getElementById('massAssignTitle').textContent = `Mass Enroll Students`;
  document.getElementById('massAssignSubtitle').textContent = `Select students from the roster to assign into a section`;

  renderMassAssignContent();
  document.getElementById('massAssignModal').classList.add('active');
}

function closeMassAssignModal() {
  document.getElementById('massAssignModal').classList.remove('active');
}

function setMassAssignFilterMode(mode) {
  massAssignFilterMode = mode;
  renderMassAssignContent();
}

function filterMassAssignList() {
  massAssignSearchQuery = document.getElementById('massSearchInput')?.value || '';
  massAssignGradeFilter = document.getElementById('massGradeFilter')?.value || '';
  massAssignStrandFilter = document.getElementById('massStrandFilter')?.value || '';
  massAssignTargetSection = document.getElementById('massTargetSectionSelect')?.value || massAssignTargetSection;
  renderMassAssignContent(true); // partial render
}

function getFilteredMassStudents() {
  let list = registeredUsers.filter(u => u.role === 'student');

  if (massAssignFilterMode === 'unassigned') {
    list = list.filter(u => !u.section || u.section === 'Unassigned' || u.section === 'None' || u.section === '—');
  } else {
    // Show all students not currently in the target section
    list = list.filter(u => (u.section || '').trim().toLowerCase() !== massAssignTargetSection.trim().toLowerCase());
  }

  const q = massAssignSearchQuery.toLowerCase().trim();
  if (q) {
    list = list.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q) ||
      (u.strand || '').toLowerCase().includes(q)
    );
  }
  if (massAssignGradeFilter) {
    list = list.filter(u => u.gradeLevel === massAssignGradeFilter);
  }
  if (massAssignStrandFilter) {
    list = list.filter(u => (u.strand || '').includes(massAssignStrandFilter));
  }

  return list;
}

function toggleStudentAssignSelection(studentKey) {
  if (massAssignSelectedIds.has(studentKey)) {
    massAssignSelectedIds.delete(studentKey);
  } else {
    massAssignSelectedIds.add(studentKey);
  }
  renderMassAssignContent(true);
}

function toggleSelectAllMassAssign(masterCb) {
  const currentList = getFilteredMassStudents();
  if (masterCb.checked) {
    currentList.forEach(u => massAssignSelectedIds.add(u.dbId || u.id));
  } else {
    currentList.forEach(u => massAssignSelectedIds.delete(u.dbId || u.id));
  }
  renderMassAssignContent(true);
}

function renderMassAssignContent(isPartial = false) {
  const body = document.getElementById('massAssignBody');
  const foot = document.getElementById('massAssignFoot');
  if (!body) return;

  const currentList = getFilteredMassStudents();
  const unassignedCount = registeredUsers.filter(u => u.role === 'student' && (!u.section || u.section === 'Unassigned' || u.section === 'None' || u.section === '—')).length;
  const allEligibleCount = registeredUsers.filter(u => u.role === 'student' && (u.section || '').trim().toLowerCase() !== massAssignTargetSection.trim().toLowerCase()).length;

  const allSelectedInView = currentList.length > 0 && currentList.every(u => massAssignSelectedIds.has(u.dbId || u.id));

  body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:#f8fbff;border:1.5px solid var(--blue-light);border-radius:12px;padding:12px 16px;margin-bottom:14px;">
      <div style="flex:1;">
        <label style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;display:block;margin-bottom:4px;">Target Destination Section</label>
        <select id="massTargetSectionSelect" class="user-filter-select" style="width:100%;font-size:14px;font-weight:600;color:var(--blue);" onchange="massAssignTargetSection = this.value; renderMassAssignContent(true);">
          ${managedSections.map(s => `<option value="${escHtml(s.name)}" ${massAssignTargetSection === s.name ? 'selected' : ''}>${escHtml(s.name)} (${escHtml(s.gradeLevel || 'Grade 11')} · ${escHtml(s.strand || 'General')})</option>`).join('')}
        </select>
      </div>
      <div class="mass-selection-count">
        ${iconCheck()} ${massAssignSelectedIds.size} Selected
      </div>
    </div>

    <div class="um-tabs" style="margin-bottom:12px;">
      <button class="um-tab ${massAssignFilterMode === 'unassigned' ? 'active' : ''}" style="font-size:13px;padding:8px 14px;" onclick="setMassAssignFilterMode('unassigned')">
        Unassigned Pool <span class="um-badge">${unassignedCount}</span>
      </button>
      <button class="um-tab ${massAssignFilterMode === 'all' ? 'active' : ''}" style="font-size:13px;padding:8px 14px;" onclick="setMassAssignFilterMode('all')">
        All / Transfer Other Sections <span class="um-badge">${allEligibleCount}</span>
      </button>
    </div>

    <div class="mass-assign-controls">
      <div class="user-search-wrap" style="flex:1;">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="massSearchInput" placeholder="Search students by name or ID…" value="${escHtml(massAssignSearchQuery)}" oninput="filterMassAssignList()">
      </div>

      <select class="user-filter-select" id="massGradeFilter" onchange="filterMassAssignList()">
        <option value="" ${!massAssignGradeFilter ? 'selected' : ''}>All Grades</option>
        <option value="Grade 11" ${massAssignGradeFilter === 'Grade 11' ? 'selected' : ''}>Grade 11</option>
        <option value="Grade 12" ${massAssignGradeFilter === 'Grade 12' ? 'selected' : ''}>Grade 12</option>
      </select>

      <select class="user-filter-select" id="massStrandFilter" onchange="filterMassAssignList()">
        <option value="" ${!massAssignStrandFilter ? 'selected' : ''}>All Strands</option>
        <option value="STEM" ${massAssignStrandFilter === 'STEM' ? 'selected' : ''}>STEM</option>
        <option value="HUMSS" ${massAssignStrandFilter === 'HUMSS' ? 'selected' : ''}>HUMSS</option>
        <option value="ABM" ${massAssignStrandFilter === 'ABM' ? 'selected' : ''}>ABM</option>
        <option value="TVL" ${massAssignStrandFilter === 'TVL' ? 'selected' : ''}>TVL</option>
      </select>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fbff;border:1px solid var(--blue-light);border-radius:8px 8px 0 0;font-size:12px;font-weight:700;color:var(--text-secondary);">
      <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;user-select:none;">
        <input type="checkbox" ${allSelectedInView ? 'checked' : ''} onchange="toggleSelectAllMassAssign(this)">
        <span>Select All (${currentList.length} students)</span>
      </label>
      <span>Current Section</span>
    </div>

    <div style="max-height:240px;overflow-y:auto;border:1px solid var(--blue-light);border-top:none;border-radius:0 0 10px 10px;background:#fff;">
      ${currentList.length > 0 ? currentList.map(u => {
        const key = u.dbId || u.id;
        const isChecked = massAssignSelectedIds.has(key);
        const curSec = u.section || 'Unassigned';
        return `
          <div class="mass-student-item ${isChecked ? 'selected' : ''}" onclick="toggleStudentAssignSelection('${key}')">
            <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); toggleStudentAssignSelection('${key}')">
            <div class="mass-student-info">
              <h5>${escHtml(u.name)}</h5>
              <span>${escHtml(u.id)} · ${escHtml(u.gradeLevel || 'Grade 11')} · ${escHtml(u.strand || 'General')}</span>
            </div>
            <div>
              <span class="sec-badge ${curSec === 'Unassigned' ? 'strand' : 'grade'}" style="font-size:11px;">
                ${escHtml(curSec)}
              </span>
            </div>
          </div>
        `;
      }).join('') : `
        <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">
          No students found matching your filters.
        </div>
      `}
    </div>
  `;

  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="closeMassAssignModal()">Cancel</button>
    <button class="gen-btn" ${massAssignSelectedIds.size === 0 ? 'disabled' : ''} onclick="executeMassAssignment()">
      ${iconCheck()} Enroll ${massAssignSelectedIds.size} Student${massAssignSelectedIds.size !== 1 ? 's' : ''} to ${escHtml(massAssignTargetSection)}
    </button>
  `;
}

async function executeMassAssignment() {
  if (massAssignSelectedIds.size === 0) return;

  const targetSection = massAssignTargetSection || managedSections[0]?.name;
  if (!targetSection) {
    showToast('Please select a target section', 'error');
    return;
  }

  const selectedKeys = Array.from(massAssignSelectedIds);
  let updatedCount = 0;
  const dbIdsToUpdate = [];

  registeredUsers.forEach(u => {
    if (selectedKeys.includes(u.dbId) || selectedKeys.includes(u.id)) {
      u.section = targetSection;
      updatedCount++;
      if (u.dbId) dbIdsToUpdate.push(u.dbId);
    }
  });

  if (dbIdsToUpdate.length > 0 && typeof db !== 'undefined' && db?.from) {
    try {
      await db.from('users').update({ section: targetSection }).in('id', dbIdsToUpdate);
    } catch (e) {
      console.warn('Could not sync mass section update to DB:', e);
    }
  }

  showToast(`Successfully enrolled ${updatedCount} student${updatedCount !== 1 ? 's' : ''} into ${targetSection}!`, 'success');

  massAssignSelectedIds.clear();
  closeMassAssignModal();

  // If roster modal was open, refresh it
  if (activeRosterSection && document.getElementById('sectionRosterModal')?.classList.contains('active')) {
    openSectionRosterModal(activeRosterSection);
  }

  // Refresh user management tab
  refreshSectionAndUserViews();
}


const addUser = {
  step: 'type',
  userType: 'student',
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  contactNumber: '',
  address: '',
  name: '',
  email: '',
  password: '',
  grade: 'Grade 11',
  section: null,
  strands: new Set(['STEM']),
  bulkFile: null,
  bulkMapped: [],
  pendingUsers: [],
  generatedAdminPassword: ''
};

function auAssembleFullName() {
  const fn = (addUser.firstName || '').trim();
  const mn = (addUser.middleName || '').trim();
  const ln = (addUser.lastName || '').trim();
  const sf = (addUser.suffix || '').trim();
  if (!fn && !ln) return '';
  const parts = [];
  if (fn) parts.push(fn);
  if (mn) parts.push(mn.length === 1 ? `${mn}.` : mn);
  if (ln) parts.push(ln);
  if (sf) parts.push(sf);
  return parts.join(' ');
}

function openAddUserModal(initialType) {
  const chosenType = initialType || (adminUserTab === 'admins' ? 'admin' : (adminUserTab === 'teachers' ? 'teacher' : 'student'));
  Object.assign(addUser, {
    step: 'type',
    userType: chosenType,
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    contactNumber: '',
    address: '',
    name: '',
    email: '',
    password: '',
    grade: 'Grade 11',
    section: null,
    strands: new Set(['STEM']),
    bulkFile: null,
    bulkMapped: [],
    pendingUsers: [],
    generatedAdminPassword: generateComplexPasswordClient(14)
  });
  document.getElementById('addUserModal').classList.add('active');
  renderAddUserModal();
}
function closeAddUserModal() {
  const modal = document.getElementById('addUserModal');
  if (modal) {
    modal.classList.remove('active');
    modal.classList.remove('credential-slip-modal');
  }
}

function auSelectType(t) {
  addUser.userType = t;
  addUser.section = null;
  if (t === 'student') {
    if (addUser.strands.size > 1) {
      addUser.strands = new Set([Array.from(addUser.strands)[0] || 'STEM']);
    }
  }
  if (t === 'admin' && !addUser.generatedAdminPassword) {
    addUser.generatedAdminPassword = generateComplexPasswordClient(14);
  }
  if (addUser.bulkFile) { addUser.bulkFile = null; addUser.bulkMapped = []; }
  renderAddUserModal();
}

function auRegenerateAdminPassword() {
  addUser.generatedAdminPassword = generateComplexPasswordClient(14);
  const disp = document.getElementById('adminGeneratedPwDisplay');
  if (disp) disp.textContent = addUser.generatedAdminPassword;
}
function auSetGrade(g)   { addUser.grade = g; renderAddUserModal(); }
function auSetSection(s) { addUser.section = s; renderAddUserModal(); }
function auToggleStrand(s) {
  if (addUser.userType === 'student') {
    // A student is strictly enrolled in ONE strand only
    addUser.strands = new Set([s]);
  } else {
    // Teachers can handle multiple strands
    if (addUser.strands.has(s)) {
      if (addUser.strands.size > 1) addUser.strands.delete(s);
    } else {
      addUser.strands.add(s);
    }
  }
  renderAddUserModal();
}
function auRefreshSaveButton() {
  const btn = document.getElementById('auSaveBtn');
  if (!btn) return;
  const isAdm = addUser.userType === 'admin';
  if (isAdm) {
    const hasName = !!(addUser.firstName || '').trim() && !!(addUser.lastName || '').trim();
    btn.disabled = !hasName;
  } else {
    const queuedCount = addUser.pendingUsers.length + (addUser.bulkFile ? resolveBulkRows().rows.length : 0);
    const hasSingle = !!(addUser.firstName || '').trim() && !!(addUser.lastName || '').trim();
    const saveCount = queuedCount || (hasSingle ? 1 : 0);
    btn.disabled = saveCount === 0;
    btn.innerHTML = `${iconUsers()} Save ${saveCount > 0 ? `(${saveCount} user${saveCount !== 1 ? 's' : ''})` : 'Users'}`;
  }
}

function auUpdateFirstName(v)     { addUser.firstName = v; addUser.name = auAssembleFullName(); auRefreshSaveButton(); }
function auUpdateMiddleName(v)    { addUser.middleName = v; addUser.name = auAssembleFullName(); }
function auUpdateLastName(v)     { addUser.lastName = v; addUser.name = auAssembleFullName(); auRefreshSaveButton(); }
function auUpdateSuffix(v)       { addUser.suffix = v; addUser.name = auAssembleFullName(); }
function auUpdateContactNumber(v){ addUser.contactNumber = v; }
function auUpdateAddress(v)      { addUser.address = v; }
function auUpdateName(v)         { addUser.name = v; auRefreshSaveButton(); }
function auUpdateEmail(v)        { addUser.email = v; }
function auUpdatePassword(v)     { addUser.password = v; }

const BULK_HEADER_ALIASES = {
  name: ['name', 'full name', 'full_name', 'fullname'],
  first_name: ['first name', 'first_name', 'firstname'],
  middle_name: ['middle name', 'middle_name', 'middlename'],
  last_name: ['last name', 'last_name', 'lastname', 'surname'],
  suffix: ['suffix'],
  contact_number: ['phone', 'contact', 'contact number', 'contact_number', 'phone number', 'phone_number', 'mobile'],
  address: ['address', 'residence', 'home address', 'residential address'],
  email: ['email', 'e-mail', 'email address'],
  strand: ['strand'],
  grade_level: ['grade level', 'grade_level', 'grade'],
  section: ['section'],
  subjects: ['subjects', 'subjects handled', 'strands handled', 'strands']
};

function normalizeBulkHeader(h) {
  const clean = String(h || '').trim().toLowerCase();
  for (const [field, aliases] of Object.entries(BULK_HEADER_ALIASES)) {
    if (aliases.includes(clean)) return field;
  }
  return null;
}

function mapBulkHeaders(rawRows) {
  return rawRows.map(raw => {
    const mapped = {};
    for (const key of Object.keys(raw)) {
      const field = normalizeBulkHeader(key);
      if (field) mapped[field] = String(raw[key] ?? '').trim();
    }
    return mapped;
  });
}

function resolveBulkRows() {
  const isStudent = addUser.userType === 'student';
  const fallbackStrand = Array.from(addUser.strands)[0] || 'STEM';
  const rows = [];
  const errors = [];

  addUser.bulkMapped.forEach((mapped, i) => {
    const rowNum = i + 2;
    let name = mapped.name || '';
    if (!name && (mapped.first_name || mapped.last_name)) {
      const parts = [mapped.first_name, mapped.middle_name, mapped.last_name, mapped.suffix].filter(Boolean);
      name = parts.join(' ');
    }
    const email = mapped.email || '';
    if (!name) { errors.push(`Row ${rowNum}: Missing name (First Name & Last Name are required)`); return; }
    if (/\d/.test(name)) { errors.push(`Row ${rowNum} (${name}): Name cannot contain numbers`); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errors.push(`Row ${rowNum} (${name || 'unnamed'}): Invalid or missing email`); return; }

    const strand = (mapped.strand || fallbackStrand || '').trim();
    if (isStudent) {
      if (!strand) { errors.push(`Row ${rowNum} (${name}): Strand is required`); return; }
      if (strand.includes(',') || strand.includes('/') || strand.includes(';') || strand.includes('&')) {
        errors.push(`Row ${rowNum} (${name}): A student can only be enrolled in exactly 1 strand (STEM, HUMSS, or ABM)`);
        return;
      }
    }

    const gradeLevel = isStudent ? (mapped.grade_level || addUser.grade || '').trim() : null;
    if (isStudent && !gradeLevel) {
      errors.push(`Row ${rowNum} (${name}): Grade Level is strictly required (not optional)`);
      return;
    }

    const targetSection = (mapped.section || addUser.section || '').trim() || null;

    rows.push({
      name, email,
      contact_number: mapped.contact_number || '',
      address: mapped.address || '',
      role: addUser.userType,
      strand: strand || fallbackStrand,
      grade_level: gradeLevel,
      section: targetSection,
      subjects: !isStudent ? (mapped.subjects || Array.from(addUser.strands).join(', ')) : null,
      detail: isStudent
        ? `${strand || fallbackStrand} — ${gradeLevel}${targetSection ? ` (${targetSection})` : ' (Unassigned)'}`
        : (targetSection 
            ? `${mapped.subjects || Array.from(addUser.strands).join(', ')} (${targetSection})`
            : (mapped.subjects || Array.from(addUser.strands).join(', ')))
    });
  });

  return { rows, errors };
}

function parseCsvText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(',').map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cells[i] || '');
    return obj;
  });
}

function auHandleBulkFile(input) {
  const file = input.files[0] || null;
  if (!file) return;
  if (file.size > 50 * 1024 * 1024) {
    showToast('File is too large — maximum file size is 50MB only', 'error');
    input.value = '';
    return;
  }
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    showToast('Please upload an Excel (.xlsx/.xls) or CSV file', 'error'); return;
  }
  addUser.bulkFile = file;
  addUser.bulkMapped = [];

  const reader = new FileReader();

  if (ext === 'csv') {
    reader.onload = () => {
      addUser.bulkMapped = mapBulkHeaders(parseCsvText(reader.result));
      renderAddUserModal();
    };
    reader.readAsText(file);
  } else {
    reader.onload = () => {
      const wb = XLSX.read(reader.result, { type: 'array' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
      addUser.bulkMapped = mapBulkHeaders(rawRows);
      renderAddUserModal();
    };
    reader.readAsArrayBuffer(file);
  }
}

function auRemoveBulk() {
  addUser.bulkFile = null;
  addUser.bulkMapped = [];
  renderAddUserModal();
}

function auToggleFormatExample() {
  const wrap = document.getElementById('auFormatExampleWrap');
  const btn = document.getElementById('auFormatExampleBtn');
  const label = document.getElementById('auFormatExampleLabel');
  if (!wrap || !btn || !label) return;
  const isOpen = wrap.style.display !== 'none';
  wrap.style.display = isOpen ? 'none' : 'block';
  btn.classList.toggle('open', !isOpen);
  label.textContent = (isOpen ? 'See' : 'Hide') + ' example spreadsheet format';
}

function downloadBulkUserTemplate() {
  const isStudent = addUser.userType === 'student';
  const roleName = isStudent ? 'Student' : 'Teacher';
  const fileName = `Scholaria_${roleName}_Bulk_Template.xlsx`;

  const headers = isStudent
    ? ['First Name', 'Middle Name', 'Last Name', 'Suffix', 'Email', 'Strand', 'Grade Level', 'Section', 'Contact Number', 'Address']
    : ['First Name', 'Middle Name', 'Last Name', 'Suffix', 'Email', 'Subjects', 'Section', 'Contact Number', 'Address'];

  const sampleRows = isStudent
    ? [
        ['Juan', 'Mercado', 'Dela Cruz', 'Jr.', 'juan.delacruz@sample.edu.ph', 'STEM', 'Grade 11', 'Section A', '09171234567', '123 Rizal St., Pasig City'],
        ['Ana Marie', 'Tan', 'Reyes', '', 'ana.reyes@sample.edu.ph', 'ABM', 'Grade 12', '', '09189876543', '456 Ortigas Ave., Pasig City'],
        ['Pedro', 'Lim', 'Santos', '', 'pedro.santos@sample.edu.ph', 'HUMSS', 'Grade 11', '', '09205556677', '789 San Antonio, Pasig City']
      ]
    : [
        ['Ramon', 'Cruz', 'Garcia', '', 'ramon.garcia@sample.edu.ph', 'General Mathematics, Pre-Calculus', 'Section A', '09172223344', 'Quezon City'],
        ['Liza', 'Morales', 'Torres', '', 'liza.torres@sample.edu.ph', 'Practical Research 1, Statistics', 'Section B', '09183334455', 'Mandaluyong City'],
        ['Paul', 'Bautista', 'Fernandez', '', 'paul.fernandez@sample.edu.ph', 'Empowerment Technologies', '', '', '']
      ];

  if (typeof XLSX !== 'undefined') {
    try {
      const wsData = [headers, ...sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Auto-fit column widths
      ws['!cols'] = headers.map((h, i) => {
        const maxLen = Math.max(h.length, ...sampleRows.map(r => String(r[i] || '').length));
        return { wch: Math.max(maxLen + 4, 16) };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isStudent ? 'Students' : 'Teachers');
      XLSX.writeFile(wb, fileName);
      if (typeof showToast === 'function') {
        showToast(`Downloaded editable template: ${fileName}`, 'success');
      }
      return;
    } catch (e) {
      console.warn('XLSX export failed, using CSV fallback:', e);
    }
  }

  // Fallback to downloadable CSV if XLSX isn't loaded
  const csvLines = [
    headers.join(','),
    ...sampleRows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))
  ];
  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace('.xlsx', '.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (typeof showToast === 'function') {
    showToast(`Downloaded editable template: ${fileName.replace('.xlsx', '.csv')}`, 'success');
  }
}
window.downloadBulkUserTemplate = downloadBulkUserTemplate;

function renderFormatExampleTable() {
  const isStudent = addUser.userType === 'student';
  const columns = isStudent
    ? [
        { header: 'First Name',     required: true },
        { header: 'Middle Name',    required: false },
        { header: 'Last Name',      required: true },
        { header: 'Suffix',         required: false },
        { header: 'Email',          required: true },
        { header: 'Strand',         required: true },
        { header: 'Grade Level',    required: true },
        { header: 'Section',        required: false },
        { header: 'Contact Number', required: false },
        { header: 'Address',        required: false }
      ]
    : [
        { header: 'First Name',     required: true },
        { header: 'Middle Name',    required: false },
        { header: 'Last Name',      required: true },
        { header: 'Suffix',         required: false },
        { header: 'Email',          required: true },
        { header: 'Subjects',       required: false },
        { header: 'Section',        required: false },
        { header: 'Contact Number', required: false },
        { header: 'Address',        required: false }
      ];

  const sampleRows = isStudent
    ? [
        ['Juan', 'Mercado', 'Dela Cruz', 'Jr.', 'juan.delacruz@sample.edu.ph', 'STEM', 'Grade 11', 'Section A', '09171234567', '123 Rizal St., Pasig City'],
        ['Ana Marie', 'Tan', 'Reyes', '', 'ana.reyes@sample.edu.ph', 'ABM', 'Grade 12', '', '09189876543', '456 Ortigas Ave., Pasig City'],
        ['Pedro', 'Lim', 'Santos', '', 'pedro.santos@sample.edu.ph', 'HUMSS', 'Grade 11', '', '09205556677', '789 San Antonio, Pasig City']
      ]
    : [
        ['Ramon', 'Cruz', 'Garcia', '', 'ramon.garcia@sample.edu.ph', 'General Mathematics, Pre-Calculus', 'Section A', '09172223344', 'Quezon City'],
        ['Liza', 'Morales', 'Torres', '', 'liza.torres@sample.edu.ph', 'Practical Research 1, Statistics', 'Section B', '09183334455', 'Mandaluyong City'],
        ['Paul', 'Bautista', 'Fernandez', '', 'paul.fernandez@sample.edu.ph', 'Empowerment Technologies', '', '', '']
      ];

  return `
    <div class="au-format-wrap">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 14px;border-radius:10px;">
        <div style="font-size:12px;color:#166534;font-weight:600;display:flex;align-items:center;gap:7px;">
          <span>📊</span>
          <span>Download this official spreadsheet template, fill in your roster, and upload it back.</span>
        </div>
        <button type="button" class="sw-btn" onclick="downloadBulkUserTemplate()" style="background:#16a34a;color:#ffffff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;box-shadow:0 2px 6px rgba(22,163,74,0.25);white-space:nowrap;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Editable Excel (.xlsx)
        </button>
      </div>
      <div class="au-format-note" style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:12px 14px;color:#1e40af;line-height:1.6;margin-bottom:12px;">
        <div style="font-weight:700;font-size:12.5px;margin-bottom:4px;color:#1d4ed8;">Institutional Roster Requirements:</div>
        <ul style="margin:4px 0 0 18px;padding:0;font-size:12px;">
          <li>${isStudent ? '<strong>GRADE LEVEL is STRICTLY REQUIRED</strong>. <strong>Section is OPTIONAL</strong> (can be left empty and assigned later in the Sections &amp; Rosters tab).' : 'Faculty assignments require Name and Email. Subjects and Section are optional.'}</li>
          <li>${isStudent ? 'Students must be enrolled in <strong>EXACTLY ONE STRAND</strong> (e.g. STEM, HUMSS, or ABM) — multiple strands are not permitted.' : 'Teachers can handle multiple strands/subjects separated by comma.'}</li>
          <li><strong>No digits or numbers are allowed</strong> in First Name, Middle Name, Last Name, or Suffix fields.</li>
          <li>Section, Contact Number, and Residential Address are optional.</li>
        </ul>
      </div>
      <div class="au-format-table-scroll">
        <table class="au-format-table">
          <thead>
            <tr>${columns.map(c => `<th class="${c.required ? 'req' : 'opt'}">${c.header}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${sampleRows.map(row => `
              <tr>
                ${row.map((val, i) => `<td class="${columns[i].required ? 'req-cell' : ''}">${escHtml(val) || '<span style="opacity:.4">—</span>'}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="au-format-legend" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <span><i class="sw-req"></i> Required (Grade Level is Mandatory)</span>
          <span><i class="sw-opt"></i> Optional (Section can be left empty)</span>
        </div>
        <a href="javascript:void(0)" onclick="downloadBulkUserTemplate()" style="color:#0284c7;font-size:11.5px;font-weight:700;text-decoration:none;">Download .xlsx template &rarr;</a>
      </div>
    </div>
  `;
}

function auBuildSingleFromForm() {
  const fn = (addUser.firstName || '').trim();
  const mn = (addUser.middleName || '').trim();
  const ln = (addUser.lastName || '').trim();
  const sf = (addUser.suffix || '').trim();
  const phone = (addUser.contactNumber || '').trim();
  const addr = (addUser.address || '').trim();

  if (!fn) return { error: 'Please enter a First Name' };
  if (!ln) return { error: 'Please enter a Last Name' };

  // Explicit check for numbers in all name fields
  if (/\d/.test(fn)) return { error: 'First Name cannot contain numbers' };
  if (/\d/.test(mn)) return { error: 'Middle Name cannot contain numbers' };
  if (/\d/.test(ln)) return { error: 'Last Name cannot contain numbers' };
  if (/\d/.test(sf)) return { error: 'Suffix cannot contain numbers' };

  const nameRegex = /^[a-zA-Z\s\u00C0-\u024FñÑ\-.]+$/;
  if (!nameRegex.test(fn)) return { error: 'First Name must contain letters only (no numbers or special characters)' };
  if (mn && !nameRegex.test(mn)) return { error: 'Middle Name must contain letters only (no numbers or special characters)' };
  if (!nameRegex.test(ln)) return { error: 'Last Name must contain letters only (no numbers or special characters)' };
  if (sf && !nameRegex.test(sf)) return { error: 'Suffix must contain letters only (no numbers or special characters)' };

  if (fn.length > 50 || ln.length > 50) return { error: 'Name fields cannot exceed 50 characters' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addUser.email.trim())) return { error: 'Please enter a valid email' };

  const fullName = auAssembleFullName();
  const isStudent = addUser.userType === 'student';
  const targetSection = addUser.section || null;

  if (isStudent) {
    if (!addUser.grade) return { error: 'Please select a Grade Level (Required)' };
    if (!addUser.strands || addUser.strands.size !== 1) return { error: 'Student must be enrolled in exactly one strand' };
  }

  const user = {
    name: fullName,
    firstName: fn,
    middleName: mn,
    lastName: ln,
    suffix: sf,
    contact_number: phone,
    address: addr,
    email: addUser.email.trim(),
    role: addUser.userType,
    grade_level: isStudent ? addUser.grade : null,
    section: targetSection,
    strand: Array.from(addUser.strands)[0] || null,
    subjects: !isStudent ? Array.from(addUser.strands).join(', ') : null,
    detail: isStudent
      ? `${Array.from(addUser.strands)[0]} — ${addUser.grade}${targetSection ? ` (${targetSection})` : ' (Unassigned)'}`
      : (targetSection ? `${Array.from(addUser.strands).join(', ')} (${targetSection})` : Array.from(addUser.strands).join(', '))
  };
  return { user };
}

function auAddSingle() {
  const { user, error } = auBuildSingleFromForm();
  if (error) { showToast(error, 'error'); return; }
  addUser.pendingUsers.push(user);
  addUser.firstName = '';
  addUser.middleName = '';
  addUser.lastName = '';
  addUser.suffix = '';
  addUser.contactNumber = '';
  addUser.address = '';
  addUser.name = '';
  addUser.email = '';
  renderAddUserModal();
}

function auRemovePending(i) { addUser.pendingUsers.splice(i, 1); renderAddUserModal(); }

async function auSaveUsers() {
  const { rows: bulkRows, errors: bulkErrors } = addUser.bulkFile
    ? resolveBulkRows()
    : { rows: [], errors: [] };

  const toAdd = [...addUser.pendingUsers, ...bulkRows];

  const hasSingle = !!(addUser.firstName || '').trim() && !!(addUser.lastName || '').trim();
  if (toAdd.length === 0 && hasSingle) {
    const { user, error } = auBuildSingleFromForm();
    if (error) { showToast(error, 'error'); return; }
    toAdd.push(user);
  }

  if (toAdd.length === 0) {
    showToast(bulkErrors.length ? 'Every row in the file had a problem — see below' : 'Nothing to save — enter user details or upload a file', 'error');
    return;
  }

  const { data: { session } } = await db.auth.getSession();
  if (!session) { showToast('Your session expired — please log in again', 'error'); return; }

  const results = [];
  const failures = [...bulkErrors];

  for (const u of toAdd) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/create-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          full_name: u.name,
          first_name: u.firstName || undefined,
          middle_name: u.middleName || undefined,
          last_name: u.lastName || undefined,
          suffix: u.suffix || undefined,
          role: u.role,
          email: u.email,
          strand: u.strand,
          grade_level: u.grade_level,
          section: u.section,
          subjects: u.subjects,
          contact_number: u.contact_number || undefined,
          address: u.address || undefined
        })
      });
      const body = await res.json();
      if (!res.ok) { failures.push(`${u.name}: ${body.error || 'failed'}`); continue; }
      const itemRecord = {
        name: u.name,
        firstName: u.firstName || body.first_name || '',
        middleName: u.middleName || body.middle_name || '',
        lastName: u.lastName || body.last_name || '',
        suffix: u.suffix || body.suffix || '',
        first_name: u.firstName || body.first_name || '',
        middle_name: u.middleName || body.middle_name || '',
        last_name: u.lastName || body.last_name || '',
        role: u.role,
        strand: u.strand,
        grade_level: u.grade_level,
        section: u.section,
        subjects: u.subjects,
        contact_number: u.contact_number || '',
        address: u.address || '',
        ...body
      };
      saveCredentialSlipRecord(itemRecord);
      saveLocalOriginRecord({
        school_id: body.school_id,
        user_id: body.school_id,
        name: u.name,
        role: u.role,
        created_at: body.created_at,
        created_by: body.created_by
      });
      results.push(itemRecord);
    } catch {
      failures.push(`${u.name}: could not reach the server`);
    }
  }

  if (failures.length) showToast(failures.join(' · '), 'error');

  if (results.length) {
    closeAddUserModal();
    showOfficialCredentialSlipModal(results);
    await loadUsersFromDB();
  }
}

async function auSaveAdminAccount() {
  const fn = (addUser.firstName || '').trim();
  const mn = (addUser.middleName || '').trim();
  const ln = (addUser.lastName || '').trim();
  const sf = (addUser.suffix || '').trim();
  const phone = (addUser.contactNumber || '').trim();
  const addr = (addUser.address || '').trim();

  if (!fn) {
    if (typeof showToast === 'function') showToast('Administrator First Name is required', 'error');
    return;
  }
  if (!ln) {
    if (typeof showToast === 'function') showToast('Administrator Last Name is required', 'error');
    return;
  }

  // Explicit check for numbers in all name fields
  if (/\d/.test(fn)) { if (typeof showToast === 'function') showToast('First Name cannot contain numbers', 'error'); return; }
  if (/\d/.test(mn)) { if (typeof showToast === 'function') showToast('Middle Name cannot contain numbers', 'error'); return; }
  if (/\d/.test(ln)) { if (typeof showToast === 'function') showToast('Last Name cannot contain numbers', 'error'); return; }
  if (/\d/.test(sf)) { if (typeof showToast === 'function') showToast('Suffix cannot contain numbers', 'error'); return; }

  const nameRegex = /^[a-zA-Z\s\u00C0-\u024FñÑ\-.]+$/;
  if (!nameRegex.test(fn)) { if (typeof showToast === 'function') showToast('First Name must contain letters only', 'error'); return; }
  if (mn && !nameRegex.test(mn)) { if (typeof showToast === 'function') showToast('Middle Name must contain letters only', 'error'); return; }
  if (!nameRegex.test(ln)) { if (typeof showToast === 'function') showToast('Last Name must contain letters only', 'error'); return; }
  if (sf && !nameRegex.test(sf)) { if (typeof showToast === 'function') showToast('Suffix must contain letters only', 'error'); return; }

  const name = auAssembleFullName();
  addUser.name = name;
  const email = addUser.email.trim();
  const password = addUser.generatedAdminPassword || generateComplexPasswordClient(14);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (typeof showToast === 'function') showToast('Please enter a valid recovery email format, or leave empty', 'error');
    return;
  }

  const btn = document.getElementById('auSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating administrator...'; }

  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    if (typeof showToast === 'function') showToast('Your session has expired — please sign in again', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Create Administrator Account'; }
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/create-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        full_name: name,
        first_name: fn,
        middle_name: mn || undefined,
        last_name: ln,
        suffix: sf || undefined,
        role: 'admin',
        email: email || undefined,
        custom_password: password,
        contact_number: phone || undefined,
        address: addr || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      if (typeof showToast === 'function') showToast(data.error || 'Failed to create administrator account', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Create Administrator Account'; }
      return;
    }

    const adminSlip = {
      school_id: data.school_id,
      name: data.name || name,
      firstName: fn,
      middleName: mn,
      lastName: ln,
      suffix: sf,
      first_name: fn,
      middle_name: mn,
      last_name: ln,
      role: 'admin',
      temp_password: data.temp_password || password,
      recovery_email: data.recovery_email || email || null,
      email: data.email || email,
      contact_number: data.contact_number || phone || null,
      address: data.address || addr || null,
      created_at: data.created_at || new Date().toISOString(),
      created_by: data.created_by || {
        id: CURRENT_PROFILE?.id,
        name: CURRENT_PROFILE?.full_name || 'Administrator',
        school_id: CURRENT_PROFILE?.school_id || 'ADMIN',
        role: 'admin'
      }
    };

    saveCredentialSlipRecord(adminSlip);
    saveLocalOriginRecord({
      school_id: data.school_id,
      name: data.name || name,
      role: 'admin',
      created_at: adminSlip.created_at,
      created_by: adminSlip.created_by
    });

    closeAddUserModal();
    showOfficialCredentialSlipModal([adminSlip]);
    await loadUsersFromDB();
  } catch (err) {
    if (typeof showToast === 'function') showToast('Could not reach the server to create account', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Create Administrator Account'; }
  }
}

function buildCredentialSlipCardHtml(slip, index = 0) {
  const cardId = `credentialSlipCard_${index}_${(slip.school_id || 'user').replace(/[^a-zA-Z0-9]/g, '_')}`;
  const roleTitle = slip.role === 'admin'
    ? 'Department Administrator'
    : slip.role === 'teacher'
      ? 'Senior High Faculty'
      : 'Senior High Student';

  const portalUrl = slip.role === 'admin'
    ? `${window.location.origin}/admin-login.html`
    : `${window.location.origin}/login.html`;

  const createdTimeStr = formatExactDateTime(slip.created_at || slip.createdAt || Date.now());
  const creatorName = slip.created_by?.name || (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE?.full_name) || 'Institutional Administration';
  const creatorId = slip.created_by?.school_id || (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE?.school_id) || 'ADMIN';
  const refCode = `HWA-SLIP-${slip.school_id || 'GEN'}`;

  const academicInfo = slip.role === 'admin'
    ? 'Institutional Systems & Department Administration'
    : [slip.strand || slip.subjects, slip.grade_level || slip.gradeLevel, slip.section].filter(Boolean).join(' · ') || 'Senior High School Academic Department';

  const emailDisplay = slip.recovery_email || slip.email || (slip.role === 'admin' ? `${(slip.school_id || '').toLowerCase()}@admin.hwa.edu.ph` : 'None on file');
  const pwDisplay = slip.temp_password || slip.tempPassword || '[Security Key Issued / User Established]';

  return `
    <div class="credential-slip-card" id="${cardId}"
         data-school-id="${escHtml(slip.school_id || slip.id || '')}"
         data-name="${escHtml(slip.name || slip.full_name || 'Authorized User')}"
         data-role="${escHtml(roleTitle)}"
         data-temp-pw="${escHtml(pwDisplay)}"
         data-created-at="${escHtml(createdTimeStr)}"
         data-created-by="${escHtml(creatorName)}"
         data-origin-id="${escHtml(creatorId)}"
         data-academic="${escHtml(academicInfo)}"
         data-email="${escHtml(emailDisplay)}"
         data-portal="${escHtml(portalUrl)}">
      <div class="credential-slip-watermark">HAVEN OF WISDOM</div>

      <div class="credential-slip-head">
        <div class="slip-school-brand">
          <div class="slip-school-logo" style="width:50px;height:50px;display:flex;align-items:center;justify-content:center;background:#1e3a8a;border-radius:12px;border:2px solid #d97706;box-shadow:0 2px 8px rgba(30,58,138,0.25);flex-shrink:0;">
            <svg viewBox="0 0 40 40" style="width:34px;height:34px;" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="2,2"/>
              <path d="M20 9 L31 15 L20 21 L9 15 Z" fill="#fbbf24"/>
              <path d="M14 17.5 V23.5 C14 27.5 20 30.5 20 30.5 C20 30.5 26 27.5 26 23.5 V17.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
              <path d="M31 15 V22.5" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="31" cy="24" r="1.2" fill="#fbbf24"/>
            </svg>
          </div>
          <div class="slip-school-info">
            <h2>Haven of Wisdom Academy</h2>
            <p>Senior High School Department · Scholaria Academic Management Portal</p>
          </div>
        </div>
        <div class="slip-doc-badge">
          <div class="slip-badge-title">Official Credential Slip</div>
          <div class="slip-badge-ref">REF: ${escHtml(refCode)}</div>
        </div>
      </div>

      <div class="slip-provenance-bar">
        <div class="slip-provenance-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" style="width:13px;height:13px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Created: <strong>${createdTimeStr}</strong></span>
        </div>
        <div class="slip-provenance-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" style="width:13px;height:13px;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg>
          <span>Originator: <strong>${escHtml(creatorName)}</strong> (${escHtml(creatorId)})</span>
        </div>
        <div class="slip-provenance-item">
          <span class="sec-badge" style="background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:12px;">
            ${slip.isActive === false ? 'STATUS: DEACTIVATED' : 'STATUS: ACTIVE'}
          </span>
        </div>
      </div>

      <div class="slip-info-grid">
        <div class="slip-info-cell">
          <div class="slip-info-label">Account Holder Name</div>
          <div class="slip-info-value">${escHtml(slip.name || slip.full_name || 'Authorized User')}</div>
        </div>
        <div class="slip-info-cell">
          <div class="slip-info-label">Official Institutional School ID</div>
          <div class="slip-info-value school-id-val">${escHtml(slip.school_id || slip.id)}</div>
        </div>
        <div class="slip-info-cell">
          <div class="slip-info-label">Account Classification / Role</div>
          <div class="slip-info-value" style="color:#d97706;">${escHtml(roleTitle)}</div>
        </div>
        <div class="slip-info-cell">
          <div class="slip-info-label">Academic Assignment / Division</div>
          <div class="slip-info-value" style="font-size:12.5px;">${escHtml(academicInfo)}</div>
        </div>
        ${slip.contact_number ? `
        <div class="slip-info-cell">
          <div class="slip-info-label">Contact / Phone</div>
          <div class="slip-info-value" style="font-size:12.5px;">${escHtml(slip.contact_number)}</div>
        </div>` : ''}
        ${slip.address ? `
        <div class="slip-info-cell">
          <div class="slip-info-label">Residential Address</div>
          <div class="slip-info-value" style="font-size:12.5px;">${escHtml(slip.address)}</div>
        </div>` : ''}
      </div>

      <div class="slip-creds-box">
        <div class="slip-creds-title">
          <span>Official Portal Login Credentials</span>
          <span class="tag">Confidential Security Slip</span>
        </div>
        <div class="slip-pw-display">
          <div>
            <div style="font-size:10.5px;color:#94a3b8;font-weight:600;margin-bottom:2px;">TEMPORARY SYSTEM PASSWORD</div>
            <div class="slip-pw-code">${escHtml(pwDisplay)}</div>
          </div>
          <button type="button" class="admin-pw-btn" onclick="copyTextToClipboard('${escHtml(pwDisplay)}', 'Temporary password copied!')" title="Copy Password">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy Key
          </button>
        </div>
        <div class="slip-portal-url">
          <span>Official Login Portal URL:</span>
          <strong>${portalUrl}</strong>
        </div>
      </div>

      <div class="slip-instructions">
        <strong>First-Time Login Security Directives:</strong>
        <ol>
          <li>Open your web browser and navigate directly to the official login portal URL specified above.</li>
          <li>Enter your <strong>Institutional School ID</strong> (or registered email: <em>${escHtml(emailDisplay)}</em>) and this temporary password.</li>
          <li>For institutional integrity, the system will prompt you to replace this temporary password with your permanent confidential password immediately.</li>
          <li>Never share this slip or disclose your security credentials to any other individual.</li>
        </ol>
      </div>

      <div class="slip-signatures-row">
        <div class="slip-sig-box">
          <div class="slip-sig-line"></div>
          <div class="slip-sig-role">${escHtml(creatorName)}</div>
          <div class="slip-sig-sub">Issuing Administrator / School Registrar</div>
        </div>
        <div class="slip-sig-box">
          <div class="slip-sig-line"></div>
          <div class="slip-sig-role">${escHtml(slip.name || 'Account Holder')}</div>
          <div class="slip-sig-sub">Account Holder Signature & Date Received</div>
        </div>
      </div>

      <div class="slip-legal-notice">
        Haven of Wisdom Academy · Republic Act 10173 (Philippine Data Privacy Act of 2012) Compliance Notice.<br>
        This official credential document is strictly confidential. Unauthorized duplication, scanning, or distribution is prohibited.
      </div>
    </div>
  `;
}

function buildDirectSlipPdfString(data) {
  const sanitize = s => String(s || '').replace(/[\(\)\\\r\n]/g, ' ');
  const title = 'HAVEN OF WISDOM ACADEMY - CREDENTIAL ISSUANCE SLIP';
  const ref = 'REF CODE: HWA-SLIP-' + sanitize(data.school_id);
  const name = 'Account Holder: ' + sanitize(data.name);
  const id = 'Institutional School ID: ' + sanitize(data.school_id);
  const role = 'Classification: ' + sanitize(data.role);
  const academic = 'Assignment: ' + sanitize(data.academic);
  const created = 'Creation Timestamp: ' + sanitize(data.created_at);
  const creator = 'Originator / Creator: ' + sanitize(data.creator_name || 'Administrator') + ' (' + sanitize(data.creator_id || 'ADMIN') + ')';
  const portal = 'Official Portal URL: ' + sanitize(data.portal || '/login.html');
  const pw = 'TEMPORARY PASSWORD: ' + sanitize(data.temp_password);
  const note1 = 'SECURITY DIRECTIVE: You must change this temporary password upon first login.';
  const note2 = 'Republic Act 10173 (Data Privacy Act of 2012) - Confidential Issuance Slip.';

  const streamLines = [
    'BT',
    '/F1 16 Tf',
    '50 740 Td (' + sanitize(title) + ') Tj',
    '/F1 10 Tf',
    '0 -18 Td (' + sanitize(ref) + ') Tj',
    '/F1 12 Tf',
    '0 -35 Td (' + sanitize(name) + ') Tj',
    '0 -20 Td (' + sanitize(id) + ') Tj',
    '0 -20 Td (' + sanitize(role) + ') Tj',
    '0 -20 Td (' + sanitize(academic) + ') Tj',
    '0 -20 Td (' + sanitize(created) + ') Tj',
    '0 -20 Td (' + sanitize(creator) + ') Tj',
    '0 -20 Td (' + sanitize(portal) + ') Tj',
    '/F1 14 Tf',
    '0 -40 Td (' + sanitize(pw) + ') Tj',
    '/F1 10 Tf',
    '0 -35 Td (' + sanitize(note1) + ') Tj',
    '0 -20 Td (' + sanitize(note2) + ') Tj',
    'ET'
  ];

  const streamContent = streamLines.join('\n');
  const streamLen = streamContent.length;

  let body = '%PDF-1.4\n';
  const offsets = [];

  function addObj(num, content) {
    offsets[num] = body.length;
    body += num + ' 0 obj\n' + content + '\nendobj\n';
  }

  addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  addObj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  addObj(4, '<< /Length ' + streamLen + ' >>\nstream\n' + streamContent + '\nendstream');
  addObj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  const startxref = body.length;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  xref += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + startxref + '\n%%EOF';

  return body + xref;
}

function fallbackDownloadDirectSlipPdf(el, filename) {
  try {
    const schoolId = el.getAttribute('data-school-id') || 'USER';
    const name = el.getAttribute('data-name') || el.querySelector('.slip-info-value')?.innerText || 'Authorized User';
    const role = el.getAttribute('data-role') || 'User';
    const tempPw = el.getAttribute('data-temp-pw') || el.querySelector('.slip-pw-code')?.innerText || '';
    const createdAt = el.getAttribute('data-created-at') || '';
    const creatorName = el.getAttribute('data-created-by') || 'Institutional Administration';
    const creatorId = el.getAttribute('data-origin-id') || 'ADMIN';
    const academic = el.getAttribute('data-academic') || 'Senior High School';
    const portal = el.getAttribute('data-portal') || `${window.location.origin}/login.html`;

    const pdfStr = buildDirectSlipPdfString({
      school_id: schoolId,
      name: name,
      role: role,
      temp_password: tempPw,
      created_at: createdAt,
      creator_name: creatorName,
      creator_id: creatorId,
      academic: academic,
      portal: portal
    });

    const blob = new Blob([pdfStr], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `HWA_Credential_Slip_${schoolId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (typeof showToast === 'function') showToast('Official PDF slip downloaded successfully!', 'success');
  } catch (err) {
    console.error('Fallback PDF download failed:', err);
    if (typeof showToast === 'function') showToast('Could not initiate file download', 'error');
  }
}

function downloadCredentialSlipPdf(cardId, filename) {
  const el = document.getElementById(cardId);
  if (!el) {
    if (typeof showToast === 'function') showToast('Slip element not found', 'error');
    return;
  }

  const safeFilename = filename || 'HWA_Credential_Slip.pdf';
  if (typeof showToast === 'function') showToast('Generating official PDF credential slip...', 'info');

  if (typeof html2pdf !== 'undefined') {
    try {
      const opt = {
        margin: [6, 6, 6, 6],
        filename: safeFilename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(el).save().then(() => {
        if (typeof showToast === 'function') showToast('Credential slip PDF downloaded successfully!', 'success');
      }).catch(err => {
        console.warn('html2pdf render failed, falling back to direct PDF download:', err);
        fallbackDownloadDirectSlipPdf(el, safeFilename);
      });
      return;
    } catch (err) {
      console.warn('html2pdf invocation error:', err);
    }
  }

  fallbackDownloadDirectSlipPdf(el, safeFilename);
}

function downloadAllCredentialSlipsPdf(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const filename = `HWA_Credential_Slips_Batch_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (typeof showToast === 'function') showToast('Generating comprehensive PDF bundle...', 'info');

  if (typeof html2pdf !== 'undefined') {
    try {
      const opt = {
        margin: [6, 6, 6, 6],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(el).save().then(() => {
        if (typeof showToast === 'function') showToast('Batch PDF credential slips downloaded!', 'success');
      }).catch(err => {
        console.warn('Batch html2pdf failed, falling back to direct PDF downloads:', err);
        const cards = el.querySelectorAll('.credential-slip-card');
        cards.forEach((card, idx) => {
          setTimeout(() => {
            const sid = card.getAttribute('data-school-id') || `slip_${idx+1}`;
            fallbackDownloadDirectSlipPdf(card, `HWA_Credential_Slip_${sid}.pdf`);
          }, idx * 250);
        });
      });
      return;
    } catch (err) {
      console.warn('Batch html2pdf invocation error:', err);
    }
  }

  const cards = el.querySelectorAll('.credential-slip-card');
  cards.forEach((card, idx) => {
    setTimeout(() => {
      const sid = card.getAttribute('data-school-id') || `slip_${idx+1}`;
      fallbackDownloadDirectSlipPdf(card, `HWA_Credential_Slip_${sid}.pdf`);
    }, idx * 250);
  });
}

function showOfficialCredentialSlipModal(slips) {
  const list = Array.isArray(slips) ? slips : [slips];
  if (!list.length) return;

  const modal = document.getElementById('addUserModal');
  const body = document.getElementById('addUserModalBody');
  const foot = document.getElementById('addUserModalFoot');
  if (!modal || !body || !foot) return;

  modal.classList.add('credential-slip-modal');

  const isMulti = list.length > 1;
  const containerId = 'credentialSlipsBundleContainer';

  body.innerHTML = `
    <div style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:10px;">
      <div>
        <h4 style="font-family:'Poppins',sans-serif;font-size:16px;font-weight:700;color:#1e3a8a;margin:0 0 2px 0;">Official Credential Issuance ${isMulti ? 'Slips' : 'Slip'}</h4>
        <span style="font-size:12px;color:#64748b;">${isMulti ? `${list.length} accounts created. Download or print individual slips below.` : 'Confidential credentials ready for safe issuance to account holder.'}</span>
      </div>
      <span class="sec-badge" style="background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;font-size:11.5px;font-weight:700;">
        ${list.length} ${list.length === 1 ? 'Credential Slip' : 'Credential Slips'}
      </span>
    </div>

    <div class="credential-slip-wrapper" id="${containerId}">
      ${list.map((slip, i) => `
        <div>
          ${buildCredentialSlipCardHtml(slip, i)}
          ${isMulti ? `
            <div style="margin-top:8px;text-align:right;">
              <button type="button" class="gen-btn" onclick="downloadCredentialSlipPdf('credentialSlipCard_${i}_${(slip.school_id || 'user').replace(/[^a-zA-Z0-9]/g, '_')}', 'HWA_Credential_Slip_${escHtml(slip.school_id || 'user')}.pdf')" style="background:#1e3a8a;color:#fff;font-size:12px;padding:6px 14px;border-radius:8px;display:inline-flex;align-items:center;gap:6px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Slip (${escHtml(slip.school_id || slip.name)}) PDF
              </button>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;

  const singleCardId = `credentialSlipCard_0_${(list[0].school_id || 'user').replace(/[^a-zA-Z0-9]/g, '_')}`;
  const singleFilename = `HWA_Credential_Slip_${list[0].school_id || 'user'}.pdf`;

  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="closeAddUserModal()">Done / Close</button>
    <button class="gen-btn" onclick="window.print()" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;display:inline-flex;align-items:center;gap:6px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Print Slip
    </button>
    ${isMulti ? `
      <button class="gen-btn" onclick="downloadAllCredentialSlipsPdf('${containerId}')" style="background:#1e3a8a;color:#fff;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(30,58,138,0.25);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download All Slips (PDF)
      </button>
    ` : `
      <button class="gen-btn" onclick="downloadCredentialSlipPdf('${singleCardId}', '${singleFilename}')" style="background:#1e3a8a;color:#fff;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(30,58,138,0.25);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download Official PDF Slip
      </button>
    `}
  `;

  modal.classList.add('active');
}

function viewUserCredentialSlip(schoolId) {
  const savedSlip = getCredentialSlipRecord(schoolId);
  const user = registeredUsers.find(u => u.id === schoolId || u.dbId === schoolId);

  const slipData = {
    school_id: schoolId,
    name: savedSlip?.name || user?.name || 'Account Holder',
    role: savedSlip?.role || user?.role || 'student',
    strand: savedSlip?.strand || user?.strand || '',
    grade_level: savedSlip?.grade_level || user?.gradeLevel || '',
    section: savedSlip?.section || user?.section || '',
    email: savedSlip?.email || savedSlip?.recovery_email || user?.email || '',
    recovery_email: savedSlip?.recovery_email || user?.recoveryEmail || user?.email || '',
    temp_password: savedSlip?.temp_password || savedSlip?.tempPassword || '',
    created_at: savedSlip?.created_at || savedSlip?.savedAt || user?.createdAt || new Date().toISOString(),
    created_by: savedSlip?.created_by || user?.origin || {
      name: 'School Administration / Registrar',
      school_id: 'HWA-ADMIN',
      role: 'admin'
    },
    isActive: user?.isActive !== false
  };

  showOfficialCredentialSlipModal([slipData]);
}

function showAdminHandoutModal(adminData) {
  showOfficialCredentialSlipModal([adminData]);
}

function showCredentialsModal(results) {
  showOfficialCredentialSlipModal(results);
}

function renderAddUserModal() {
  const body = document.getElementById('addUserModalBody');
  const foot = document.getElementById('addUserModalFoot');
  const isStudent = addUser.userType === 'student';
  const isTeacher = addUser.userType === 'teacher';
  const isAdmin = addUser.userType === 'admin';

  if (isAdmin && !addUser.generatedAdminPassword) {
    addUser.generatedAdminPassword = generateComplexPasswordClient(14);
  }

  body.innerHTML = `
    <div class="au-type-select">
      <div class="au-type-card ${isStudent ? 'active' : ''}" onclick="auSelectType('student')">
        <div class="tc-icon">${iconProfile()}</div>
        <h4>Student</h4>
        <p>Enroll a student, set strand & grade level</p>
      </div>
      <div class="au-type-card teacher-type ${isTeacher ? 'active' : ''}" onclick="auSelectType('teacher')">
        <div class="tc-icon">${iconUsers()}</div>
        <h4>Teacher</h4>
        <p>Register a teacher and assign strands</p>
      </div>
      <div class="au-type-card admin-type ${isAdmin ? 'active' : ''}" onclick="auSelectType('admin')">
        <div class="tc-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h4>Administrator</h4>
        <p>Institutional admin with auto-generated strong password</p>
      </div>
    </div>

    ${isAdmin ? `
      <div style="margin-top:16px;">
        <div class="au-name-grid" style="margin-bottom:12px;">
          <div class="gen-field">
            <label>First Name <span style="color:#ef4444;">*</span></label>
            <input type="text" placeholder="e.g. Eleanor" maxlength="50" value="${escHtml(addUser.firstName || '')}" onkeydown="allowLettersOnly(event)" oninput="sanitizeNameInput(this); auUpdateFirstName(this.value);">
          </div>
          <div class="gen-field">
            <label>Middle Name <span style="text-transform:none;font-weight:400;color:var(--text-muted);">(Opt)</span></label>
            <input type="text" placeholder="e.g. Vance" maxlength="50" value="${escHtml(addUser.middleName || '')}" onkeydown="allowLettersOnly(event)" oninput="sanitizeNameInput(this); auUpdateMiddleName(this.value);">
          </div>
          <div class="gen-field">
            <label>Last Name <span style="color:#ef4444;">*</span></label>
            <input type="text" placeholder="e.g. Sterling" maxlength="50" value="${escHtml(addUser.lastName || '')}" onkeydown="allowLettersOnly(event)" oninput="sanitizeNameInput(this); auUpdateLastName(this.value);">
          </div>
          <div class="gen-field">
            <label>Suffix <span style="text-transform:none;font-weight:400;color:var(--text-muted);">(Opt)</span></label>
            <input type="text" placeholder="e.g. III" maxlength="15" value="${escHtml(addUser.suffix || '')}" onkeydown="allowLettersOnly(event)" oninput="sanitizeNameInput(this); auUpdateSuffix(this.value);">
          </div>
        </div>

        <div class="gen-row" style="margin-bottom:12px;">
          <div class="gen-field">
            <label>Recovery Gmail / Official Email <span style="text-transform:none;font-weight:400;color:var(--text-muted);">(Optional)</span></label>
            <input type="email" placeholder="e.g. eleanor.vance@gmail.com" value="${escHtml(addUser.email)}" oninput="auUpdateEmail(this.value)">
          </div>
          <div class="gen-field">
            <label>Phone / Emergency Contact <span style="text-transform:none;font-weight:400;color:var(--text-muted);">(Optional)</span></label>
            <input type="tel" placeholder="e.g. 09171234567" maxlength="15" value="${escHtml(addUser.contactNumber || '')}" onkeydown="allowDigitsOnly(event)" oninput="sanitizePhoneInput(this); auUpdateContactNumber(this.value)">
          </div>
        </div>

        <div class="gen-field" style="margin-bottom:12px;">
          <label>Residential / Home Address <span style="text-transform:none;font-weight:400;color:var(--text-muted);">(Optional)</span></label>
          <input type="text" placeholder="e.g. 456 Meralco Ave., Pasig City" maxlength="150" value="${escHtml(addUser.address || '')}" oninput="auUpdateAddress(this.value)">
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:14px;">
          Note: If recovery email is omitted, the administrator logs in using their assigned School Admin ID.
        </div>

        <div class="gen-field" style="margin-top:14px;">
          <label style="display:flex;align-items:center;justify-content:space-between;">
            <span>Auto-Generated Strong Password</span>
            <span style="font-size:11px;font-weight:700;color:#059669;text-transform:none;">High Complexity · 14 Chars</span>
          </label>
          <div class="admin-pw-generator-box">
            <div class="admin-pw-code" id="adminGeneratedPwDisplay">${escHtml(addUser.generatedAdminPassword)}</div>
            <div class="admin-pw-actions">
              <button type="button" class="admin-pw-btn" onclick="auRegenerateAdminPassword()" title="Generate another strong password">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Regenerate
              </button>
              <button type="button" class="admin-pw-btn" onclick="copyTextToClipboard('${escHtml(addUser.generatedAdminPassword)}', 'Password copied!')" title="Copy password">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy
              </button>
            </div>
          </div>
        </div>

        <div style="margin-top:14px;background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" style="width:18px;height:18px;flex-shrink:0;margin-top:2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div style="font-size:12px;color:#92400e;line-height:1.5;">
            <strong>First-Login Password Reset Enforced:</strong> This strong password will be provided in a handout card for you to give to the employee. The employee is required to change it to their own permanent password upon their initial login.
          </div>
        </div>
      </div>
    ` : `
      <div class="gen-field">
        <label>${isStudent ? 'Strand <span style="color:#ef4444;">*</span> <span style="font-size:11px;color:var(--text-muted);font-weight:500;text-transform:none;">(Single selection only — select 1 strand)</span>' : 'Strands Handled <span style="font-size:11px;color:var(--text-muted);font-weight:500;text-transform:none;">(Select all handled strands)</span>'}</label>
        <div class="au-strand-grid">
          ${STRANDS.map(s => `<div class="au-strand-chip ${addUser.strands.has(s) ? 'on' : ''}" onclick="auToggleStrand('${s}')">${s}</div>`).join('')}
        </div>
        ${!isStudent ? `<div style="font-size:11px;color:var(--text-muted);margin-top:5px;">Select all strands this teacher is capable of handling</div>` : ''}
      </div>

      <div class="gen-row">
        ${isStudent ? `
        <div class="gen-field">
          <label>Grade Level <span style="color:#ef4444;">*</span> <span style="font-size:11px;font-weight:700;color:#dc2626;text-transform:none;">(Required)</span></label>
          <div class="au-grade-pills">
            ${GRADE_LEVELS.map(g => `<div class="au-grade-pill ${addUser.grade === g ? 'on' : ''}" onclick="auSetGrade('${g}')">${g}</div>`).join('')}
          </div>
        </div>` : ''}
        <div class="gen-field">
          <label>Section <span style="text-transform:none;font-weight:500;color:var(--text-muted);">${isStudent ? '(Optional — can assign later in Sections tab)' : '(Optional)'}</span></label>
          <div class="au-grade-pills">
            <div class="au-grade-pill ${!addUser.section ? 'on' : ''}" onclick="auSetSection(null)">
              ${isStudent ? 'Unassigned (Default)' : 'None (All)'}
            </div>
            ${SECTIONS.map(s => {
              const isSelected = addUser.section === s;
              return `<div class="au-grade-pill ${isSelected ? 'on' : ''}" onclick="auSetSection('${s}')">${s}</div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="au-divider">Import in bulk (recommended)</div>

      ${addUser.bulkFile ? `
        <div class="au-bulk-result">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>
          ${escHtml(addUser.bulkFile.name)} selected — ${addUser.bulkMapped.length} row${addUser.bulkMapped.length !== 1 ? 's' : ''} read
          <button class="qr-remove" onclick="auRemoveBulk()" style="margin-left:auto">${iconClose()}</button>
        </div>
        ${(() => {
          const { rows, errors } = resolveBulkRows();
          return `
          ${rows.length > 0 ? `
            <div class="added-user-list" style="max-height:180px;overflow-y:auto;">
              ${rows.map(u => `
                <div class="added-user-row ${u.role === 'teacher' ? 'teacher-row' : ''}">
                  <div class="au-avatar">${u.name.split(',')[0].trim().slice(0,2).toUpperCase()}</div>
                  <div class="au-info"><h5>${escHtml(u.name)}</h5><span>${escHtml(u.email)} · ${escHtml(u.detail)}</span></div>
                </div>`).join('')}
            </div>` : ''}
          ${errors.length > 0 ? `
            <div style="font-size:11.5px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;line-height:1.7;margin-top:${rows.length ? '10px' : '0'};">
              ${errors.map(e => escHtml(e)).join('<br>')}
            </div>` : ''}
          `;
        })()}` : `
      <label class="au-bulk-zone" for="auBulkInput">
        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="12"/><line x1="15" y1="15" x2="12" y2="12"/></svg>
        <div class="dz-title">Import from Excel or CSV</div>
        <div class="dz-sub">Columns: First Name, Last Name, Email, Strand, Grade Level (Required) · Section, Phone, Address (Optional) — Max 50MB only</div>
      </label>
      <input type="file" id="auBulkInput" accept=".xlsx,.xls,.csv" style="display:none" onchange="auHandleBulkFile(this)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;gap:8px;flex-wrap:wrap;">
        <button type="button" class="au-format-toggle" id="auFormatExampleBtn" onclick="auToggleFormatExample()" style="margin:0;">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          <span id="auFormatExampleLabel">See example spreadsheet format</span>
        </button>
        <button type="button" onclick="downloadBulkUserTemplate()" style="background:#f0fdf4;color:#15803d;border:1.5px solid #bbf7d0;padding:6px 14px;border-radius:10px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all 0.15s ease;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Editable Excel (.xlsx)
        </button>
      </div>
      <div id="auFormatExampleWrap" style="display:none">${renderFormatExampleTable()}</div>
      `}

      <div class="au-divider">Or add individually</div>

      <div class="au-name-grid" style="margin-bottom:12px;">
        <div class="gen-field">
          <label>First Name <span style="color:#ef4444;">*</span></label>
          <input type="text" placeholder="e.g. Maria" maxlength="50" value="${escHtml(addUser.firstName || '')}" onkeydown="allowLettersOnly(event)" oninput="sanitizeNameInput(this); auUpdateFirstName(this.value);">
        </div>
        <div class="gen-field">
          <label>Middle Name <span style="text-transform:none;font-weight:400;color:var(--text-muted);">(Opt)</span></label>
          <input type="text" placeholder="e.g. Lopez" maxlength="50" value="${escHtml(addUser.middleName || '')}" onkeydown="allowLettersOnly(event)" oninput="sanitizeNameInput(this); auUpdateMiddleName(this.value);">
        </div>
        <div class="gen-field">
          <label>Last Name <span style="color:#ef4444;">*</span></label>
          <input type="text" placeholder="e.g. Santos" maxlength="50" value="${escHtml(addUser.lastName || '')}" onkeydown="allowLettersOnly(event)" oninput="sanitizeNameInput(this); auUpdateLastName(this.value);">
        </div>
        <div class="gen-field">
          <label>Suffix <span style="text-transform:none;font-weight:400;color:var(--text-muted);">(Opt)</span></label>
          <input type="text" placeholder="e.g. Jr." maxlength="15" value="${escHtml(addUser.suffix || '')}" onkeydown="allowLettersOnly(event)" oninput="sanitizeNameInput(this); auUpdateSuffix(this.value);">
        </div>
      </div>

      <div class="gen-row" style="margin-bottom:12px;">
        <div class="gen-field">
          <label>${isStudent ? 'Official School Email' : 'Email Address'} <span style="color:#ef4444;">*</span></label>
          <input type="email" placeholder="${isStudent ? 'e.g. student@hwa.edu.ph' : 'e.g. teacher@hwa.edu.ph'}" maxlength="100" value="${escHtml(addUser.email)}" oninput="auUpdateEmail(this.value)">
        </div>
        <div class="gen-field">
          <label>Phone / Emergency Contact <span style="text-transform:none;font-weight:400;color:var(--text-muted);">(Optional)</span></label>
          <input type="tel" placeholder="e.g. 09171234567" maxlength="15" value="${escHtml(addUser.contactNumber || '')}" onkeydown="allowDigitsOnly(event)" oninput="sanitizePhoneInput(this); auUpdateContactNumber(this.value)">
        </div>
      </div>

      <div class="gen-field" style="margin-bottom:12px;">
        <label>Residential / Home Address <span style="text-transform:none;font-weight:400;color:var(--text-muted);">(Optional)</span></label>
        <input type="text" placeholder="e.g. 123 Rizal St., Brgy. San Antonio, Pasig City" maxlength="150" value="${escHtml(addUser.address || '')}" oninput="auUpdateAddress(this.value)">
      </div>

      ${addUser.pendingUsers.length > 0 ? `
        <div class="added-user-list">
          ${addUser.pendingUsers.map((u, i) => `
            <div class="added-user-row ${u.role === 'teacher' ? 'teacher-row' : ''}">
              <div class="au-avatar">${u.name.split(',')[0].trim().slice(0,2).toUpperCase()}</div>
              <div class="au-info"><h5>${escHtml(u.name)}</h5><span>${escHtml(u.email)} · ${escHtml(u.detail)}</span></div>
              <button class="qr-remove" onclick="auRemovePending(${i})">${iconTrash()}</button>
            </div>`).join('')}
        </div>` : ''}
    `}
  `;

  if (isAdmin) {
    const hasName = !!(addUser.firstName || '').trim() && !!(addUser.lastName || '').trim();
    foot.innerHTML = `
      <button class="foot-btn-secondary" onclick="closeAddUserModal()">Cancel</button>
      <button class="gen-btn" id="auSaveBtn" ${!hasName ? 'disabled' : ''} onclick="auSaveAdminAccount()" style="background:#0f172a;color:#f59e0b;border:1.5px solid #d97706;padding:8px 18px;font-size:13px;font-weight:700;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;margin-right:6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Create Administrator Account
      </button>`;
  } else {
    const bulkRowCount = addUser.bulkFile ? resolveBulkRows().rows.length : 0;
    const queuedCount = addUser.pendingUsers.length + bulkRowCount;
    const hasSingle = !!(addUser.firstName || '').trim() && !!(addUser.lastName || '').trim();
    const saveCount = queuedCount || (hasSingle ? 1 : 0);
    foot.innerHTML = `
      <button class="foot-btn-secondary" onclick="closeAddUserModal()">Cancel</button>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="foot-btn-secondary" onclick="auAddSingle()" style="border:1.5px solid var(--blue);color:var(--blue);padding:7px 14px;font-size:13px;height:36px;">${iconPlus()} Add to List</button>
        <button class="gen-btn" id="auSaveBtn" ${saveCount === 0 ? 'disabled' : ''} onclick="auSaveUsers()" style="background:${isStudent?'var(--blue)':'#d97706'};padding:7px 16px;font-size:13px;height:36px;">
          ${iconUsers()} Save ${saveCount > 0 ? `(${saveCount} user${saveCount !== 1 ? 's' : ''})` : 'Users'}
        </button>
      </div>`;
  }
}

if (typeof window !== 'undefined') {
  window.openAssignTeacherSectionsModal = openAssignTeacherSectionsModal;
  window.closeTeacherSectionModal = closeTeacherSectionModal;
  window.clearAllTeacherSections = clearAllTeacherSections;
  window.saveTeacherSectionAssignments = saveTeacherSectionAssignments;
  window.openAssignTeachersToSectionModal = openAssignTeachersToSectionModal;
  window.closeAssignTeachersToSectionModal = closeAssignTeachersToSectionModal;
  window.saveSectionTeacherAssignments = saveSectionTeacherAssignments;
  window.removeTeacherFromSection = removeTeacherFromSection;
  window.isTeacherAssignedToSection = isTeacherAssignedToSection;
  window.isTeacherCompatibleWithSection = isTeacherCompatibleWithSection;
}
