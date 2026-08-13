/* ── USER MANAGEMENT MODULE (ADMIN) ── */



let registeredUsers = [];
let isFetchingUsers = false;

function renderUserTableRows() {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;
  tbody.innerHTML = registeredUsers.map(u => renderUserRow(u)).join('');
  filterUserTable();
}

async function loadUsersFromDB() {
  if (isFetchingUsers) return;
  isFetchingUsers = true;
  try {
    const { data, error } = await db.from('users').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Failed to load users:', error.message); return; }
    registeredUsers = (data || []).map(u => ({
      name: u.full_name,
      id: u.school_id,
      role: u.role,
      detail: u.role === 'student'
        ? `${u.strand || ''} — ${u.grade_level || ''}`
        : (u.subjects || u.strand || ''),
      strand: u.strand || '',
      dbId: u.id,
      permanentlyMuted: !!u.permanently_muted,
      mutedUntil: u.muted_until || null,
      strikes: u.profanity_strikes || 0
    }));
    if (typeof currentPage !== 'undefined' && currentPage === 'users') {
      renderUserTableRows();
    } else if (typeof currentPage !== 'undefined' && currentPage === 'dashboard') {
      const mainContent = document.getElementById('mainContent');
      if (mainContent && typeof getPageContent === 'function') {
        mainContent.innerHTML = getPageContent(ROLE, 'dashboard');
      }
    }
  } finally {
    isFetchingUsers = false;
  }
}

function chatStatusHtml(u) {
  const stillMuted = u.mutedUntil && new Date(u.mutedUntil) > new Date();
  if (u.permanentlyMuted) return `<span style="color:#dc2626;font-weight:600;">Muted (${u.strikes} strikes) — needs admin unmute</span>`;
  if (stillMuted) return `<span style="color:#b45309;">Muted until ${new Date(u.mutedUntil).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>`;
  if (u.strikes > 0) return `<span style="color:var(--text-muted);">${u.strikes} strike${u.strikes > 1 ? 's' : ''}</span>`;
  return `<span style="color:var(--text-muted);">Clean</span>`;
}

function renderUserRow(u) {
  const canUnmute = ROLE === 'admin' && (u.permanentlyMuted || (u.mutedUntil && new Date(u.mutedUntil) > new Date()));
  return `<tr data-role="${u.role}" data-strand="${u.strand}" data-search="${(u.name + u.id + u.detail).toLowerCase()}">
    <td>${escHtml(u.name)}</td>
    <td>${escHtml(u.id)}</td>
    <td><span class="role-tag ${u.role}">${u.role === 'student' ? 'Student' : 'Teacher'}</span></td>
    <td>${escHtml(u.detail)}</td>
    <td>${chatStatusHtml(u)}</td>
    <td><span class="action-link">Edit</span> &nbsp; <span class="action-link" style="color:#dc2626">Deactivate</span>${canUnmute ? ` &nbsp; <span class="action-link" style="color:#2563eb" onclick="adminUnmuteUser('${u.dbId}')">Unmute</span>` : ''}</td>
  </tr>`;
}

async function adminUnmuteUser(userId) {
  const { error } = await db.rpc('admin_unmute_user', { p_user_id: userId });
  if (error) { showToast('Could not unmute user', 'error'); console.error(error.message); return; }
  showToast('User unmuted', 'success');
  loadUsersFromDB();
}

function filterUserTable() {
  const q = (document.getElementById('userSearchInput')?.value || '').toLowerCase();
  const role = document.getElementById('userRoleFilter')?.value || '';
  const strand = document.getElementById('userStrandFilter')?.value || '';
  const rows = document.querySelectorAll('#userTableBody tr');
  let visible = 0;
  rows.forEach(r => {
    const matchSearch = !q || r.dataset.search.includes(q);
    const matchRole   = !role || r.dataset.role === role;
    const matchStrand = !strand || r.dataset.strand === strand;
    const show = matchSearch && matchRole && matchStrand;
    r.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  const noRes = document.getElementById('userNoResults');
  if (noRes) noRes.style.display = visible === 0 ? 'block' : 'none';
  const table = document.querySelector('#userTableWrap table');
  if (table) table.style.display = visible === 0 ? 'none' : '';
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
      section: isStudent ? (mapped.section || addUser.section) : null,
      subjects: !isStudent ? (mapped.subjects || Array.from(addUser.strands).join(', ')) : null,
      detail: isStudent
        ? `${mapped.strand || fallbackStrand} — ${mapped.grade_level || addUser.grade}`
        : (mapped.subjects || Array.from(addUser.strands).join(', '))
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
  const file = input.files[0];
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
        { header: 'Subjects', required: false }
      ];

  const sampleRows = isStudent
    ? [
        ['Dela Cruz, Juan P.',   'juan.delacruz@sample.edu.ph', STRANDS[0], GRADE_LEVELS[1], SECTIONS[0]],
        ['Reyes, Ana Marie T.',  'ana.reyes@sample.edu.ph', STRANDS[2], GRADE_LEVELS[0], SECTIONS[1]],
        ['Santos, Pedro L.',     'pedro.santos@sample.edu.ph', '', '', '']
      ]
    : [
        ['Garcia, Ramon C.',  'ramon.garcia@sample.edu.ph', 'Web Systems, Programming'],
        ['Torres, Liza M.',   'liza.torres@sample.edu.ph', 'Research, Statistics'],
        ['Fernandez, Paul B.', 'paul.fernandez@sample.edu.ph', '']
      ];

  return `
    <div class="au-format-wrap">
      <div class="au-format-note">
        Upload a spreadsheet with these column headers in row 1 (naming is flexible — "Grade", "Grade Level", and "grade_level" all work the same). Only <b>Name</b> and <b>Email</b> are required; blank cells for anything else fall back to whichever ${isStudent ? 'Strand/Grade/Section' : 'Strand'} chips are selected above.
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
    section: isStudent ? addUser.section : null,
    strand: Array.from(addUser.strands)[0] || null,
    subjects: !isStudent ? Array.from(addUser.strands).join(', ') : null,
    detail: isStudent
      ? `${Array.from(addUser.strands)[0]} — ${addUser.grade}`
      : Array.from(addUser.strands).join(', ')
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

    ${isStudent ? `
    <div class="gen-row">
      <div class="gen-field">
        <label>Grade Level</label>
        <div class="au-grade-pills">
          ${GRADE_LEVELS.map(g => `<div class="au-grade-pill ${addUser.grade === g ? 'on' : ''}" onclick="auSetGrade('${g}')">${g}</div>`).join('')}
        </div>
      </div>
      <div class="gen-field">
        <label>Section</label>
        <div class="au-grade-pills">
          ${SECTIONS.map(s => `<div class="au-grade-pill ${addUser.section === s ? 'on' : ''}" onclick="auSetSection('${s}')">${s}</div>`).join('')}
        </div>
      </div>
    </div>` : ''}

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
      <div class="dz-sub">Columns: Name, Email, Strand, Grade Level (students) or Strands (teachers)</div>
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
