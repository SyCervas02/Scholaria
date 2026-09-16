const DEFAULT_SEED_USERS = [
  { name: 'Student John Doe', id: 'HWA-2026-002', dbId: 'seed_stud_1', role: 'student', gradeLevel: 'Grade 11', strand: 'STEM', section: 'Section A', createdAt: '2026-08-19' },
  { name: 'Esguerra, Michael N.', id: 'HWA-2026-001', dbId: 'seed_stud_2', role: 'student', gradeLevel: 'Grade 11', strand: 'STEM', section: 'Section A', createdAt: '2026-07-21' },
  { name: 'Joseph Andrew Asis', id: 'HWA-DEMO-001', dbId: 'seed_stud_3', role: 'student', gradeLevel: 'Grade 12', strand: 'STEM', section: 'Section A', createdAt: '2026-07-04' },
  { name: 'Cervas, Symon Pete T.', id: 'HWA-2024-002', dbId: 'seed_stud_4', role: 'student', gradeLevel: 'Grade 12', strand: 'HUMSS', section: 'Section A', createdAt: '2026-06-29' }
];

let registeredUsers = [...DEFAULT_SEED_USERS];
let isFetchingUsers = false;
let adminUserTab = 'students'; // 'students' | 'teachers'

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

function renderStudentRow(u) {
  const canUnmute = ROLE === 'admin' && (u.permanentlyMuted || (u.mutedUntil && new Date(u.mutedUntil) > new Date()));
  return `<tr>
    <td><strong>${escHtml(u.name)}</strong></td>
    <td><code style="font-size:12px;background:#f0f6ff;padding:2px 6px;border-radius:4px;color:var(--blue);">${escHtml(u.id)}</code></td>
    <td><span class="au-grade-pill on" style="padding:2px 8px;font-size:11px;">${escHtml(u.gradeLevel || 'Grade 11')}</span></td>
    <td><span class="role-tag student">${escHtml(u.strand || 'N/A')}</span></td>
    <td>${escHtml(u.section || '—')}</td>
    <td class="date-val">${formatDateCreated(u.createdAt)}</td>
    <td>${chatStatusHtml(u)}</td>
    <td><span class="action-link">Edit</span> &nbsp; <span class="action-link" style="color:#dc2626">Deactivate</span>${canUnmute ? ` &nbsp; <span class="action-link" style="color:#2563eb" onclick="adminUnmuteUser('${u.dbId}')">Unmute</span>` : ''}</td>
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

function renderUserManagementContent() {
  const students = registeredUsers.filter(u => u.role === 'student');
  const teachers = registeredUsers.filter(u => u.role === 'teacher');
  const isStudentTab = adminUserTab === 'students';

  return `
    <div class="um-tabs">
      <button class="um-tab ${isStudentTab ? 'active' : ''}" onclick="setAdminUserTab('students')">
        ${iconProfile()} Students <span class="um-badge">${students.length}</span>
      </button>
      <button class="um-tab teacher-tab ${!isStudentTab ? 'active' : ''}" onclick="setAdminUserTab('teachers')">
        ${iconUsers()} Teachers <span class="um-badge">${teachers.length}</span>
      </button>
    </div>

    <div class="user-search-row">
      <div class="user-search-wrap">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="userSearchInput" placeholder="Search by name, ID, or strand…" oninput="filterUserTable()">
      </div>

      ${isStudentTab ? `
        <select class="user-filter-select" id="userGradeFilter" onchange="filterUserTable()">
          <option value="">All Grade Levels</option>
          <option value="Grade 11">Grade 11</option>
          <option value="Grade 12">Grade 12</option>
        </select>
      ` : ''}

      <select class="user-filter-select" id="userStrandFilter" onchange="filterUserTable()">
        <option value="">All Strands</option>
        <option value="STEM">STEM</option>
        <option value="HUMSS">HUMSS</option>
        <option value="ABM">ABM</option>
      </select>

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
              <th>Date Created</th>
              <th>Chat Status</th>
              <th>Actions</th>
            </tr>
          ` : `
            <tr>
              <th>Teacher Name</th>
              <th>Teacher ID</th>
              <th>Handled Strands / Subjects</th>
              <th>Target Levels</th>
              <th>Assigned Section</th>
              <th>Date Created</th>
              <th>Chat Status</th>
              <th>Actions</th>
            </tr>
          `}
        </thead>
        <tbody id="userTableBody">
          ${isStudentTab
            ? students.map(u => renderStudentRow(u)).join('')
            : teachers.map(u => renderTeacherRow(u)).join('')
          }
        </tbody>
      </table>
      <div id="userNoResults" style="${(isStudentTab ? students.length : teachers.length) === 0 ? '' : 'display:none;'}padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">
        No ${isStudentTab ? 'students' : 'teachers'} found matching the filter criteria.
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
        : (u.section ? `${u.subjects || u.strand || ''} (${u.section})` : (u.subjects || u.strand || '')),
      strand: u.strand || '',
      gradeLevel: u.grade_level || '',
      section: u.section || '',
      subjects: u.subjects || '',
      email: u.email || '',
      createdAt: u.created_at || null,
      dbId: u.id,
      permanentlyMuted: !!u.permanently_muted,
      mutedUntil: u.muted_until || null,
      strikes: u.profanity_strikes || 0
    }));

    const existingNames = new Set(fetchedUsers.map(u => u.name.toLowerCase()));
    const missingSeeds = DEFAULT_SEED_USERS.filter(su => !existingNames.has(su.name.toLowerCase()));
    registeredUsers = [...fetchedUsers, ...missingSeeds];

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
  const q = (document.getElementById('userSearchInput')?.value || '').toLowerCase();
  const grade = document.getElementById('userGradeFilter')?.value || '';
  const strand = document.getElementById('userStrandFilter')?.value || '';
  const dateSort = document.getElementById('userDateSort')?.value || 'newest';

  const isStudentTab = adminUserTab === 'students';
  let list = registeredUsers.filter(u => u.role === (isStudentTab ? 'student' : 'teacher'));

  list = list.filter(u => {
    const matchSearch = !q || (u.name + u.id + (u.subjects || '') + (u.strand || '')).toLowerCase().includes(q);
    const matchGrade = !grade || u.gradeLevel === grade;
    const matchStrand = !strand || (u.strand && u.strand.includes(strand)) || (u.subjects && u.subjects.includes(strand));
    return matchSearch && matchGrade && matchStrand;
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
    tbody.innerHTML = list.map(u => isStudentTab ? renderStudentRow(u) : renderTeacherRow(u)).join('');
  }

  if (noRes) noRes.style.display = list.length === 0 ? 'block' : 'none';
  if (table) table.style.display = list.length === 0 ? 'none' : '';
}


const addUser = {
  step: 'type',
  userType: 'student',
  name: '', email: '', password: '',
  grade: 'Grade 11', section: 'Section A',
  strands: new Set(['STEM']),
  bulkFile: null, bulkMapped: [],
  pendingUsers: []
};

function openAddUserModal() {
  Object.assign(addUser, {
    step: 'type', userType: 'student',
    name: '', email: '', password: '',
    grade: 'Grade 11', section: 'Section A',
    strands: new Set(['STEM']),
    bulkFile: null, bulkMapped: [], pendingUsers: []
  });
  document.getElementById('addUserModal').classList.add('active');
  renderAddUserModal();
}
function closeAddUserModal() {
  document.getElementById('addUserModal').classList.remove('active');
}

function auSelectType(t) {
  addUser.userType = t;
  // For teacher, default section to null/None
  if (t === 'teacher') {
    addUser.section = null;
  } else {
    addUser.section = 'Section A';
  }
  if (addUser.bulkFile) { addUser.bulkFile = null; addUser.bulkMapped = []; }
  renderAddUserModal();
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

    rows.push({
      name, email,
      role: addUser.userType,
      strand: mapped.strand || fallbackStrand,
      grade_level: isStudent ? (mapped.grade_level || addUser.grade) : null,
      section: mapped.section || (!isStudent ? (addUser.section || null) : addUser.section),
      subjects: !isStudent ? (mapped.subjects || Array.from(addUser.strands).join(', ')) : null,
      detail: isStudent
        ? `${mapped.strand || fallbackStrand} — ${mapped.grade_level || addUser.grade}`
        : (mapped.section || addUser.section 
            ? `${mapped.subjects || Array.from(addUser.strands).join(', ')} (${mapped.section || addUser.section})`
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
        ['Dela Cruz, Juan P.',   'juan.delacruz@sample.edu.ph', STRANDS[0], GRADE_LEVELS[1], SECTIONS[0]],
        ['Reyes, Ana Marie T.',  'ana.reyes@sample.edu.ph', STRANDS[2], GRADE_LEVELS[0], SECTIONS[1]],
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
        Upload a spreadsheet with these column headers in row 1 (naming is flexible — "Grade", "Grade Level", and "grade_level" all work the same). Only <b>Name</b> and <b>Email</b> are required; blank cells for anything else fall back to whichever ${isStudent ? 'Strand/Grade/Section' : 'Strand/Section'} chips are selected above.
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
        <span><i class="sw-opt"></i> Optional — falls back to the chips above</span>
      </div>
    </div>
  `;
}

function auBuildSingleFromForm() {
  if (!addUser.name.trim()) return { error: 'Please enter a name' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addUser.email.trim())) return { error: 'Please enter a valid email' };
  const isStudent = addUser.userType === 'student';
  const user = {
    name: addUser.name.trim(),
    email: addUser.email.trim(),
    role: addUser.userType,
    grade_level: isStudent ? addUser.grade : null,
    section: addUser.section || null,
    strand: Array.from(addUser.strands)[0] || null,
    subjects: !isStudent ? Array.from(addUser.strands).join(', ') : null,
    detail: isStudent
      ? `${Array.from(addUser.strands)[0]} — ${addUser.grade}`
      : (addUser.section ? `${Array.from(addUser.strands).join(', ')} (${addUser.section})` : Array.from(addUser.strands).join(', '))
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

  body.innerHTML = `
    <div class="au-type-select">
      <div class="au-type-card ${addUser.userType === 'student' ? 'active' : ''}" onclick="auSelectType('student')">
        <div class="tc-icon">${iconProfile()}</div>
        <h4>Student</h4>
        <p>Enroll a new student, set their strand and grade level</p>
      </div>
      <div class="au-type-card teacher-type ${addUser.userType === 'teacher' ? 'active' : ''}" onclick="auSelectType('teacher')">
        <div class="tc-icon">${iconUsers()}</div>
        <h4>Teacher</h4>
        <p>Register a teacher and assign which strands they handle</p>
      </div>
    </div>

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
        <label>Section ${!isStudent ? '<span style="text-transform:none;font-weight:500;color:var(--text-muted);">(optional)</span>' : ''}</label>
        <div class="au-grade-pills">
          ${(!isStudent ? ['None', ...SECTIONS] : SECTIONS).map(s => {
            const isSelected = (!isStudent && s === 'None') ? (!addUser.section) : (addUser.section === s);
            const label = s;
            const clickVal = s === 'None' ? null : s;
            return `<div class="au-grade-pill ${isSelected ? 'on' : ''}" onclick="auSetSection(${clickVal ? `'${clickVal}'` : 'null'})">${label}</div>`;
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
      <div class="dz-sub">Columns: Name, Email, Strand, Grade Level (students) or Strands, Section (optional for teachers)</div>
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
      </div>` : ''}`;

  const bulkRowCount = addUser.bulkFile ? resolveBulkRows().rows.length : 0;
  const queuedCount = addUser.pendingUsers.length + bulkRowCount;
  const saveCount = queuedCount || (addUser.name.trim() ? 1 : 0);
  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="closeAddUserModal()">Cancel</button>
    <div style="display:flex;gap:10px;">
      <button class="foot-btn-secondary" onclick="auAddSingle()" style="border-color:var(--blue);color:var(--blue);">${iconPlus()} Add to List</button>
      <button class="gen-btn" id="auSaveBtn" ${saveCount === 0 ? 'disabled' : ''} onclick="auSaveUsers()" style="background:${isStudent?'var(--blue)':'#d97706'}">
        ${iconUsers()} Save ${saveCount > 0 ? `(${saveCount} user${saveCount !== 1 ? 's' : ''})` : 'Users'}
      </button>
    </div>`;
}
