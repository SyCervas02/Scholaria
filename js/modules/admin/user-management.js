const DEFAULT_SEED_USERS = [
  { name: 'Student John Doe', id: 'HWA-2026-002', dbId: 'seed_stud_1', role: 'student', gradeLevel: 'Grade 11', strand: 'STEM', section: 'Section A', createdAt: '2026-08-19' },
  { name: 'Esguerra, Michael N.', id: 'HWA-2026-001', dbId: 'seed_stud_2', role: 'student', gradeLevel: 'Grade 11', strand: 'STEM', section: 'Section A', createdAt: '2026-07-21' },
  { name: 'Joseph Andrew Asis', id: 'HWA-DEMO-001', dbId: 'seed_stud_3', role: 'student', gradeLevel: 'Grade 12', strand: 'STEM', section: 'Section A', createdAt: '2026-07-04' },
  { name: 'Cervas, Symon Pete T.', id: 'HWA-2024-002', dbId: 'seed_stud_4', role: 'student', gradeLevel: 'Grade 12', strand: 'HUMSS', section: 'Section A', createdAt: '2026-06-29' }
];

const DEFAULT_SEED_ADMINS = [
  { name: 'Senior High School Head Administrator', id: 'HWA-A-2026-001', dbId: 'seed_admin_1', role: 'admin', email: 'admin@hwa.edu.ph', createdAt: '2026-01-10T08:00:00Z', lastActive: new Date().toISOString() }
];

const ADMIN_HANDOUTS_STORAGE_KEY = 'scholaria_admin_handout_records';

function getAdminHandoutRecords() {
  try {
    const raw = localStorage.getItem(ADMIN_HANDOUTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function saveAdminHandoutRecord(rec) {
  try {
    const all = getAdminHandoutRecords();
    all[rec.school_id] = {
      ...rec,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(ADMIN_HANDOUTS_STORAGE_KEY, JSON.stringify(all));
  } catch (_) {}
}

function getAdminHandoutRecord(schoolId) {
  const all = getAdminHandoutRecords();
  return all[schoolId] || null;
}

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

function formatDateCreated(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function formatLastActiveHtml(lastActive, createdAt) {
  if (!lastActive) {
    return `<span style="color:#d97706;font-size:12px;font-weight:600;background:#fef3c7;padding:2px 8px;border-radius:4px;">Pending first login</span>`;
  }
  const date = new Date(lastActive);
  if (isNaN(date.getTime())) {
    return `<span style="color:#94a3b8;font-size:12px;">—</span>`;
  }
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 5) {
    return `<span style="color:#10b981;font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:5px;"><span style="width:7px;height:7px;background:#10b981;border-radius:50%;display:inline-block;box-shadow:0 0 6px #10b981;"></span> Online now</span>`;
  }
  if (diffHours < 1) {
    return `<span style="color:#475569;font-size:12px;">Active ${diffMins}m ago</span>`;
  }
  if (diffHours < 24) {
    return `<span style="color:#475569;font-size:12px;">Active ${diffHours}h ago</span>`;
  }
  return `<span style="color:#64748b;font-size:12px;">${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>`;
}

function renderStudentRow(u) {
  const canUnmute = ROLE === 'admin' && (u.permanentlyMuted || (u.mutedUntil && new Date(u.mutedUntil) > new Date()));
  const isUnassigned = !u.section || u.section === 'Unassigned' || u.section === 'None' || u.section === '—';
  return `<tr>
    <td><strong>${escHtml(u.name)}</strong></td>
    <td><code style="font-size:12px;background:#f0f6ff;padding:2px 6px;border-radius:4px;color:var(--blue);">${escHtml(u.id)}</code></td>
    <td><span class="au-grade-pill on" style="padding:2px 8px;font-size:11px;">${escHtml(u.gradeLevel || 'Grade 11')}</span></td>
    <td><span class="role-tag student">${escHtml(u.strand || 'N/A')}</span></td>
    <td>${isUnassigned ? '<span style="color:#d97706;font-weight:600;font-size:12px;background:#fef3c7;padding:2px 8px;border-radius:4px;">Unassigned</span>' : `<span class="sec-badge grade">${escHtml(u.section)}</span>`}</td>
    <td class="date-val">${formatDateCreated(u.createdAt)}</td>
    <td>${chatStatusHtml(u)}</td>
    <td><span class="action-link" onclick="openMassAssignForSingleStudent('${u.dbId || u.id}')">Assign Section</span>${canUnmute ? ` &nbsp; <span class="action-link" style="color:#2563eb" onclick="adminUnmuteUser('${u.dbId}')">Unmute</span>` : ''}</td>
  </tr>`;
}

function renderTeacherRow(u) {
  const canUnmute = ROLE === 'admin' && (u.permanentlyMuted || (u.mutedUntil && new Date(u.mutedUntil) > new Date()));
  return `<tr>
    <td><strong>${escHtml(u.name)}</strong></td>
    <td><code style="font-size:12px;background:#fffbeb;padding:2px 6px;border-radius:4px;color:#d97706;">${escHtml(u.id)}</code></td>
    <td><span class="role-tag teacher">${escHtml(u.subjects || u.strand || 'General')}</span></td>
    <td><span style="font-size:12px;font-weight:600;color:var(--text-secondary);">Grade 11 & 12</span></td>
    <td>${escHtml(u.section || 'All / None')}</td>
    <td class="date-val">${formatDateCreated(u.createdAt)}</td>
    <td>${chatStatusHtml(u)}</td>
    <td><span class="action-link">Edit</span> &nbsp; <span class="action-link" style="color:#dc2626">Deactivate</span>${canUnmute ? ` &nbsp; <span class="action-link" style="color:#2563eb" onclick="adminUnmuteUser('${u.dbId}')">Unmute</span>` : ''}</td>
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

  const handout = getAdminHandoutRecord(u.id);
  const isInstitutionalEmail = !u.email || u.email.endsWith('@admin.hwa.edu.ph');

  return `<tr>
    <td>
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;border-radius:10px;background:#0f172a;color:#f59e0b;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;border:1.5px solid #d97706;box-shadow:0 2px 8px rgba(0,0,0,0.12);flex-shrink:0;">
          ${initials}
        </div>
        <div>
          <strong style="color:var(--text-primary);font-size:13.5px;">${escHtml(u.name)}</strong>
          <div style="font-size:11.5px;color:#64748b;display:flex;align-items:center;gap:4px;margin-top:2px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" style="width:12px;height:12px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Department Administrator
          </div>
        </div>
      </div>
    </td>
    <td>
      <span style="font-size:13px;color:#ea580c;font-weight:700;letter-spacing:0.4px;">${escHtml(u.id)}</span>
    </td>
    <td>
      ${!isInstitutionalEmail
        ? `<div style="font-size:12.5px;color:var(--text-primary);display:inline-flex;align-items:center;gap:6px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" style="width:13px;height:13px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            ${escHtml(u.email)}
           </div>`
        : `<span style="color:#94a3b8;font-size:12px;font-style:italic;">None provided (Optional)</span>`
      }
    </td>
    <td class="date-val">${formatDateCreated(u.createdAt)}</td>
    <td>
      ${formatLastActiveHtml(u.lastActive, u.createdAt)}
    </td>
    <td>
      <span class="sec-badge" style="background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;">
        <span style="width:6px;height:6px;background:#10b981;border-radius:50%;"></span> Active
      </span>
    </td>
    <td>
      <div style="display:flex;align-items:center;gap:12px;">
        ${handout ? `<span class="action-link" style="color:#ea580c;font-weight:600;white-space:nowrap;" onclick="viewAdminHandoutModal('${escHtml(u.id)}')">View Handout</span>` : ''}
        <span class="action-link" style="color:#2563eb;font-weight:600;white-space:nowrap;" onclick="openAdminResetPasswordPrompt('${escHtml(u.dbId || u.id)}', '${escHtml(u.name)}')">Reset Password</span>
      </div>
    </td>
  </tr>`;
}

function viewAdminHandoutModal(schoolId) {
  const handout = getAdminHandoutRecord(schoolId);
  if (!handout) {
    if (typeof showToast === 'function') showToast('No saved handout card found for this admin ID', 'info');
    return;
  }
  showAdminHandoutModal({
    school_id: handout.school_id,
    name: handout.name,
    temp_password: handout.temp_password,
    recovery_email: handout.recovery_email,
    email: handout.recovery_email
  });
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

    saveAdminHandoutRecord({
      school_id: data.school_id,
      name: data.name || name,
      temp_password: data.temp_password,
      created_at: new Date().toISOString()
    });

    if (typeof showToast === 'function') showToast(`New password generated for ${name}!`, 'success');
    showAdminHandoutModal(data);
  } catch (err) {
    if (typeof showToast === 'function') showToast('Could not reach the server to reset password', 'error');
  }
}

function renderUserManagementContent() {
  const students = registeredUsers.filter(u => u.role === 'student');
  const teachers = registeredUsers.filter(u => u.role === 'teacher');
  const admins = registeredUsers.filter(u => u.role === 'admin');
  const isStudentTab = adminUserTab === 'students';
  const isTeacherTab = adminUserTab === 'teachers';
  const isAdminTab = adminUserTab === 'admins';

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
    </div>

    <div class="user-search-row">
      <div class="user-search-wrap">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="userSearchInput" placeholder="${isAdminTab ? 'Search admins by name, ID, or email…' : 'Search by name, ID, or strand…'}" oninput="filterUserTable()">
      </div>

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
          ${isStudentTab ? `
            <tr>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Grade Level</th>
              <th>Strand</th>
              <th>Section</th>
              <th>Date Registered</th>
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
              <th>Date Registered</th>
              <th>Chat Access</th>
              <th>Actions</th>
            </tr>
          ` : `
            <tr>
              <th>Administrator</th>
              <th>Admin ID</th>
              <th>Recovery Email</th>
              <th>Date Created</th>
              <th>Latest Activity</th>
              <th>Account Status</th>
              <th>Actions</th>
            </tr>
          `}
        </thead>
        <tbody id="userTableBody">
          ${isStudentTab
            ? students.map(u => renderStudentRow(u)).join('')
            : isTeacherTab
              ? teachers.map(u => renderTeacherRow(u)).join('')
              : admins.map(u => renderAdminRow(u)).join('')
          }
        </tbody>
      </table>
      <div id="userNoResults" style="${(isStudentTab ? students.length : isTeacherTab ? teachers.length : admins.length) === 0 ? '' : 'display:none;'}padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">
        No ${isStudentTab ? 'students' : isTeacherTab ? 'teachers' : 'administrators'} found matching the filter criteria.
      </div>
    </div>
  `;
}

async function loadUsersFromDB() {
  if (isFetchingUsers) return;
  isFetchingUsers = true;
  try {
    const { data, error } = await db.from('users').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Failed to load users:', error.message); return; }
    const fetchedUsers = (data || []).map(u => ({
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
      permanentlyMuted: !!u.permanently_muted,
      mutedUntil: u.muted_until || null,
      strikes: u.profanity_strikes || 0
    }));

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
  const { error } = await db.rpc('admin_unmute_user', { p_user_id: userId });
  if (error) { showToast('Could not unmute user', 'error'); console.error(error.message); return; }
  showToast('User unmuted', 'success');
  loadUsersFromDB();
}

function filterUserTable() {
  const q = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
  const grade = document.getElementById('userGradeFilter')?.value || '';
  const strand = document.getElementById('userStrandFilter')?.value || '';
  const dateSort = document.getElementById('userDateSort')?.value || 'newest';

  const isStudentTab = adminUserTab === 'students';
  const isTeacherTab = adminUserTab === 'teachers';
  const isAdminTab = adminUserTab === 'admins';

  let list = registeredUsers.filter(u => {
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

  const tbody = document.getElementById('userTableBody');
  const noRes = document.getElementById('userNoResults');
  const table = document.querySelector('#userTableWrap table');

  if (tbody) {
    tbody.innerHTML = list.map(u => {
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

function renderSectionsTabContent() {
  const unassignedStudents = registeredUsers.filter(u => u.role === 'student' && (!u.section || u.section === 'Unassigned' || u.section === 'None' || u.section === '—'));
  const targetDefaultSection = managedSections[0]?.name || 'Section A';

  return `
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
        <input type="text" id="sectionSearchInput" placeholder="Search section by name, adviser, or room…" value="${escHtml(sectionSearchQuery)}" oninput="filterSectionsView()">
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
  let list = [...managedSections];
  const q = sectionSearchQuery.toLowerCase().trim();

  if (q) {
    list = list.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.adviser || '').toLowerCase().includes(q) ||
      (s.room || '').toLowerCase().includes(q) ||
      (s.strand || '').toLowerCase().includes(q)
    );
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
        <div style="width:44px;height:44px;margin:0 auto 12px;color:var(--blue-mid);">${iconFolder()}</div>
        <h4 style="font-size:15px;color:var(--text-primary);margin-bottom:4px;">No Sections Found</h4>
        <p style="font-size:13px;margin-bottom:16px;">No sections match your search or filter settings.</p>
        <button class="foot-btn-secondary" onclick="openCreateSectionModal()">${iconPlus()} Create New Section</button>
      </div>
    `;
  }

  return list.map(s => {
    const enrolledStudents = registeredUsers.filter(u =>
      u.role === 'student' &&
      (u.section || '').trim().toLowerCase() === (s.name || '').trim().toLowerCase()
    );

    return `
      <div class="section-card">
        <div>
          <div class="sec-card-head">
            <div>
              <div class="sec-card-title">${escHtml(s.name)}</div>
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
          </div>
        </div>

        <div class="sec-card-actions">
          <button class="sec-btn-roster" onclick="openManageSectionModal('${escHtml(s.name)}')">
            ${iconUsers()} Manage Section
          </button>
          <button class="sec-btn-icon delete" title="Delete Section" onclick="deleteSectionPrompt('${escHtml(s.id)}')">
            ${iconTrash()}
          </button>
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

function deleteSectionPrompt(secId) {
  const sec = managedSections.find(s => s.id === secId);
  if (!sec) return;

  const enrolled = registeredUsers.filter(u =>
    u.role === 'student' &&
    (u.section || '').trim().toLowerCase() === sec.name.trim().toLowerCase()
  );

  const confirmMsg = enrolled.length > 0
    ? `Delete section "${sec.name}"? ${enrolled.length} enrolled student(s) will be unassigned.`
    : `Delete section "${sec.name}"?`;

  if (!confirm(confirmMsg)) return;

  // Unassign students
  enrolled.forEach(u => {
    u.section = null;
    if (u.dbId && typeof db !== 'undefined' && db?.from) {
      db.from('users').update({ section: null }).eq('id', u.dbId).then(() => {});
    }
  });

  managedSections = managedSections.filter(s => s.id !== secId);
  saveManagedSections();
  showToast(`Section "${sec.name}" deleted.`, 'info');

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
  name: '', email: '', password: '',
  grade: 'Grade 11', section: null,
  strands: new Set(['STEM']),
  bulkFile: null, bulkMapped: [],
  pendingUsers: [],
  generatedAdminPassword: ''
};

function openAddUserModal(initialType) {
  const chosenType = initialType || (adminUserTab === 'admins' ? 'admin' : (adminUserTab === 'teachers' ? 'teacher' : 'student'));
  Object.assign(addUser, {
    step: 'type', userType: chosenType,
    name: '', email: '', password: '',
    grade: 'Grade 11', section: null,
    strands: new Set(['STEM']),
    bulkFile: null, bulkMapped: [], pendingUsers: [],
    generatedAdminPassword: generateComplexPasswordClient(14)
  });
  document.getElementById('addUserModal').classList.add('active');
  renderAddUserModal();
}
function closeAddUserModal() {
  document.getElementById('addUserModal').classList.remove('active');
}

function auSelectType(t) {
  addUser.userType = t;
  addUser.section = null;
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
  if (addUser.strands.has(s)) { if (addUser.strands.size > 1) addUser.strands.delete(s); }
  else addUser.strands.add(s);
  renderAddUserModal();
}
function auRefreshSaveButton() {
  const btn = document.getElementById('auSaveBtn');
  if (!btn) return;
  const queuedCount = addUser.pendingUsers.length + (addUser.bulkFile ? resolveBulkRows().rows.length : 0);
  const saveCount = queuedCount || (addUser.name.trim() ? 1 : 0);
  btn.disabled = saveCount === 0;
  btn.innerHTML = `${iconUsers()} Save ${saveCount > 0 ? `(${saveCount} user${saveCount !== 1 ? 's' : ''})` : 'Users'}`;
}

function auUpdateName(v)     { addUser.name = v; auRefreshSaveButton(); }
function auUpdateEmail(v)    { addUser.email = v; }
function auUpdatePassword(v) { addUser.password = v; }

const BULK_HEADER_ALIASES = {
  name: ['name', 'full name', 'full_name', 'fullname'],
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
  const fallbackStrand = Array.from(addUser.strands)[0] || null;
  const rows = [];
  const errors = [];

  addUser.bulkMapped.forEach((mapped, i) => {
    const rowNum = i + 2;
    const name = mapped.name || '';
    const email = mapped.email || '';
    if (!name) { errors.push(`Row ${rowNum}: missing name`); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errors.push(`Row ${rowNum} (${name || 'unnamed'}): invalid or missing email`); return; }

    const targetSection = mapped.section || addUser.section || null;

    rows.push({
      name, email,
      role: addUser.userType,
      strand: mapped.strand || fallbackStrand,
      grade_level: isStudent ? (mapped.grade_level || addUser.grade) : null,
      section: targetSection,
      subjects: !isStudent ? (mapped.subjects || Array.from(addUser.strands).join(', ')) : null,
      detail: isStudent
        ? `${mapped.strand || fallbackStrand} — ${mapped.grade_level || addUser.grade}${targetSection ? ` (${targetSection})` : ' (Unassigned)'}`
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

function renderFormatExampleTable() {
  const isStudent = addUser.userType === 'student';
  const columns = isStudent
    ? [
        { header: 'Name',        required: true },
        { header: 'Email',       required: true },
        { header: 'Strand',      required: false },
        { header: 'Grade Level', required: false },
        { header: 'Section',     required: false }
      ]
    : [
        { header: 'Name',     required: true },
        { header: 'Email',    required: true },
        { header: 'Subjects', required: false },
        { header: 'Section',  required: false }
      ];

  const sampleRows = isStudent
    ? [
        ['Dela Cruz, Juan P.',   'juan.delacruz@sample.edu.ph', STRANDS[0], GRADE_LEVELS[1], ''],
        ['Reyes, Ana Marie T.',  'ana.reyes@sample.edu.ph', STRANDS[2], GRADE_LEVELS[0], ''],
        ['Santos, Pedro L.',     'pedro.santos@sample.edu.ph', '', '', '']
      ]
    : [
        ['Garcia, Ramon C.',  'ramon.garcia@sample.edu.ph', 'Web Systems, Programming', 'Section A'],
        ['Torres, Liza M.',   'liza.torres@sample.edu.ph', 'Research, Statistics', ''],
        ['Fernandez, Paul B.', 'paul.fernandez@sample.edu.ph', '', '']
      ];

  return `
    <div class="au-format-wrap">
      <div class="au-format-note">
        Upload a spreadsheet with these column headers in row 1. Only <b>Name</b> and <b>Email</b> are required; <b>Section is optional</b> and students can be mass-assigned to sections anytime in the <b>Sections & Rosters</b> tab.
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
      <div class="au-format-legend">
        <span><i class="sw-req"></i> Required</span>
        <span><i class="sw-opt"></i> Optional — falls back to Unassigned or chips above</span>
      </div>
    </div>
  `;
}

function auBuildSingleFromForm() {
  if (!addUser.name.trim()) return { error: 'Please enter a name' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addUser.email.trim())) return { error: 'Please enter a valid email' };
  const isStudent = addUser.userType === 'student';
  const targetSection = addUser.section || null;
  const user = {
    name: addUser.name.trim(),
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

  if (toAdd.length === 0 && addUser.name.trim()) {
    const { user, error } = auBuildSingleFromForm();
    if (error) { showToast(error, 'error'); return; }
    toAdd.push(user);
  }

  if (toAdd.length === 0) {
    showToast(bulkErrors.length ? 'Every row in the file had a problem — see below' : 'Nothing to save — add at least one user', 'error');
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
          role: u.role,
          email: u.email,
          strand: u.strand,
          grade_level: u.grade_level,
          section: u.section,
          subjects: u.subjects
        })
      });
      const body = await res.json();
      if (!res.ok) { failures.push(`${u.name}: ${body.error || 'failed'}`); continue; }
      results.push({ name: u.name, ...body });
    } catch {
      failures.push(`${u.name}: could not reach the server`);
    }
  }

  if (failures.length) showToast(failures.join(' · '), 'error');

  if (results.length) {
    closeAddUserModal();
    showCredentialsModal(results);
    await loadUsersFromDB();
  }
}

async function auSaveAdminAccount() {
  const name = addUser.name.trim();
  const email = addUser.email.trim();
  const password = addUser.generatedAdminPassword || generateComplexPasswordClient(14);

  if (!name) {
    if (typeof showToast === 'function') showToast('Administrator full name is required', 'error');
    return;
  }
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
        role: 'admin',
        email: email || undefined,
        custom_password: password
      })
    });

    const data = await res.json();
    if (!res.ok) {
      if (typeof showToast === 'function') showToast(data.error || 'Failed to create administrator account', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Create Administrator Account'; }
      return;
    }

    saveAdminHandoutRecord({
      school_id: data.school_id,
      name: data.name || name,
      temp_password: data.temp_password || password,
      recovery_email: data.recovery_email || email || null,
      created_at: new Date().toISOString()
    });

    closeAddUserModal();
    showAdminHandoutModal(data);
    await loadUsersFromDB();
  } catch (err) {
    if (typeof showToast === 'function') showToast('Could not reach the server to create account', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Create Administrator Account'; }
  }
}

function showAdminHandoutModal(adminData) {
  const modal = document.getElementById('addUserModal');
  const body = document.getElementById('addUserModalBody');
  const foot = document.getElementById('addUserModalFoot');
  if (!modal || !body || !foot) return;

  const schoolId = adminData.school_id;
  const name = adminData.name || adminData.full_name || 'Administrator';
  const tempPw = adminData.temp_password || '';
  const email = adminData.recovery_email || adminData.email || 'None provided (Log in with Admin ID)';

  const handoutSummary = `HAVEN OF WISDOM ACADEMY - SCHOLARIA PORTAL
ADMINISTRATOR CREDENTIAL HANDOUT
========================================
Employee Name: ${name}
Admin ID: ${schoolId}
Temporary Password: ${tempPw}
Recovery Email: ${email}
Portal Login URL: ${window.location.origin}/admin-login.html
Security Requirement: You must change your temporary password immediately upon your first sign-in.
========================================`;

  body.innerHTML = `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="width:48px;height:48px;background:#0f172a;color:#f59e0b;border:2px solid #d97706;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px;box-shadow:0 4px 14px rgba(15,23,42,0.25);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <h3 style="font-size:17px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">Administrator Account Ready</h3>
      <p style="font-size:12.5px;color:var(--text-muted);max-width:380px;margin:0 auto;">
        Hand this temporary credential card to the employee in person or via private channel.
      </p>
    </div>

    <div class="admin-handout-box">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:10px;">
        <div>
          <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Employee</span>
          <h4 style="font-size:15px;color:#0f172a;margin:2px 0 0 0;">${escHtml(name)}</h4>
        </div>
        <span class="sec-badge" style="background:#0f172a;color:#f59e0b;border:1px solid #d97706;font-size:11px;font-weight:700;">Administrator</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div style="background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;">
          <div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:3px;">Admin School ID</div>
          <div style="font-family:monospace;font-size:13.5px;font-weight:700;color:#0f172a;">${escHtml(schoolId)}</div>
        </div>
        <div style="background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;">
          <div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:3px;">Recovery Email</div>
          <div style="font-size:12px;font-weight:600;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(email)}</div>
        </div>
      </div>

      <div style="background:#0f172a;border-radius:10px;padding:12px 14px;border:1.5px solid #334155;">
        <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;">
          <span>TEMPORARY SECURE PASSWORD</span>
          <span style="color:#f59e0b;font-size:10.5px;">Auto-Generated</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <code style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:#f59e0b;letter-spacing:1px;word-break:break-all;">${escHtml(tempPw)}</code>
          <button type="button" class="admin-pw-btn" onclick="copyTextToClipboard('${escHtml(tempPw)}', 'Password copied!')" style="background:#1e293b;border-color:#475569;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
        </div>
      </div>

      <div style="margin-top:12px;display:flex;align-items:center;gap:8px;font-size:11.5px;color:#b45309;background:#fef3c7;padding:8px 12px;border-radius:8px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>The employee will be forced to change this password immediately on their first login.</span>
      </div>
    </div>
  `;

  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="closeAddUserModal()">Done</button>
    <button class="gen-btn" onclick="copyTextToClipboard(\`${handoutSummary.replace(/`/g, '\\`')}\`, 'Complete handout card copied!')" style="background:#0f172a;color:#f59e0b;border:1.5px solid #d97706;display:inline-flex;align-items:center;gap:6px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      Copy Complete Handout Card
    </button>
  `;

  modal.classList.add('active');
}

function showCredentialsModal(results) {
  const rows = results.map(r => `
    <div class="added-user-row">
      <div class="au-info">
        <h5>${escHtml(r.name)}</h5>
        <span>${escHtml(r.school_id)} · ${escHtml(r.email)}</span>
        <div style="margin-top:4px;font-family:monospace;font-size:12.5px;background:#f8fbff;border:1px solid var(--blue-light);border-radius:6px;padding:6px 10px;display:inline-block;">
          ${escHtml(r.temp_password)}
        </div>
      </div>
    </div>`).join('');

  document.getElementById('addUserModalBody').innerHTML = '';
  document.getElementById('addUserModal').classList.add('active');
  document.getElementById('addUserModalBody').innerHTML = `
    <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">
      Account${results.length !== 1 ? 's' : ''} created. Copy each temporary password now —
      it will not be shown again. Share it out of band (in person, or to the
      email on file), not over chat or in a screenshot you keep around.
    </p>
    ${rows}`;
  document.getElementById('addUserModalFoot').innerHTML =
    `<button class="foot-btn-secondary" onclick="closeAddUserModal()">Done</button>`;
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
        <div class="gen-field">
          <label>Administrator Full Name *</label>
          <input type="text" placeholder="e.g. Dr. Eleanor Vance or Juan Santos" value="${escHtml(addUser.name)}" oninput="auUpdateName(this.value)">
        </div>

        <div class="gen-field" style="margin-top:12px;">
          <label>Recovery Gmail / Official Email <span style="text-transform:none;font-weight:400;color:var(--text-muted);">(Optional)</span></label>
          <input type="email" placeholder="e.g. eleanor.vance@gmail.com (Optional)" value="${escHtml(addUser.email)}" oninput="auUpdateEmail(this.value)">
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px;">
            Optional: Used for account recovery & notifications. If omitted, the administrator logs in using their assigned School Admin ID.
          </div>
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
        <label>${isStudent ? 'Strand' : 'Strands Handled'}</label>
        <div class="au-strand-grid">
          ${STRANDS.map(s => `<div class="au-strand-chip ${addUser.strands.has(s) ? 'on' : ''}" onclick="auToggleStrand('${s}')">${s}</div>`).join('')}
        </div>
        ${!isStudent ? `<div style="font-size:11px;color:var(--text-muted);margin-top:5px;">Select all strands this teacher is capable of handling</div>` : ''}
      </div>

      <div class="gen-row">
        ${isStudent ? `
        <div class="gen-field">
          <label>Grade Level</label>
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
        <div class="dz-sub">Columns: Name, Email (Required) · Strand, Grade Level, Section (Optional) — Max 50MB only</div>
      </label>
      <input type="file" id="auBulkInput" accept=".xlsx,.xls,.csv" style="display:none" onchange="auHandleBulkFile(this)">
      <button type="button" class="au-format-toggle" id="auFormatExampleBtn" onclick="auToggleFormatExample()">
        <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        <span id="auFormatExampleLabel">See example spreadsheet format</span>
      </button>
      <div id="auFormatExampleWrap" style="display:none">${renderFormatExampleTable()}</div>
      `}

      <div class="au-divider">Or add individually</div>

      <div class="gen-row">
        <div class="gen-field"><label>Full Name</label><input type="text" placeholder="e.g. Santos, Maria L." value="${escHtml(addUser.name)}" oninput="auUpdateName(this.value)"></div>
        <div class="gen-field"><label>Email</label><input type="text" placeholder="e.g. student@hwa.edu.ph" value="${escHtml(addUser.email)}" oninput="auUpdateEmail(this.value)"></div>
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
    const hasName = !!addUser.name.trim();
    foot.innerHTML = `
      <button class="foot-btn-secondary" onclick="closeAddUserModal()">Cancel</button>
      <button class="gen-btn" id="auSaveBtn" ${!hasName ? 'disabled' : ''} onclick="auSaveAdminAccount()" style="background:#0f172a;color:#f59e0b;border:1.5px solid #d97706;padding:8px 18px;font-size:13px;font-weight:700;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;margin-right:6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Create Administrator Account
      </button>`;
  } else {
    const bulkRowCount = addUser.bulkFile ? resolveBulkRows().rows.length : 0;
    const queuedCount = addUser.pendingUsers.length + bulkRowCount;
    const saveCount = queuedCount || (addUser.name.trim() ? 1 : 0);
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
