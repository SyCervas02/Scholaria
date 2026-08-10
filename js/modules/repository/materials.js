/* ── LEARNING MATERIALS & REPOSITORY MODULE ── */

const SUBJECTS_BY_STRAND = {
  STEM: [
    'Oral Communication',
    'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
    'General Mathematics',
    'Earth Science',
    '21st Century from the Philippines and the World',
    'Physical Education and Health',
    'Empowerment Technologies',
    'Filipino sa Piling Larang',
    'Pre-Calculus',
    'General Biology 1',
    'Human Biology 1',
    'Complex Numbers',
    'Reading and Writing Skills',
    "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
    'Statistics and Probability',
    'Disaster Readiness and Risk Reduction',
    'Personal Development',
    'Practical Research 1',
    'Entrepreneurship',
    'Basic Calculus',
    'General Biology 2',
    'Human Biology 2',
    'Vectors and the Geometry of Space',
    'Introduction to the Philosophy of the Human Person',
    'Physical Science',
    'Practical Research 2',
    'General Physics 1',
    'General Chemistry 1',
    'Anatomy and Physiology',
    'Linear Algebra',
    'Inquiries, Investigations and Immersion',
    'Media and Information Literacy',
    'General Physics 2',
    'General Chemistry 2',
    'Work Immersion / Research Project'
  ],
  HUMSS: [
    'Oral Communication',
    'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
    'General Mathematics',
    'Earth and Life Science',
    '21st Century Literature from the Philippines and the World',
    'Physical Education and Health',
    'Empowerment Technologies',
    'Filipino sa Piling Larang',
    'Introduction to World Religions and Belief Systems',
    'Disciplines and Ideas in the Social Sciences',
    'Creative Writing',
    'Reading and Writing Skills',
    "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
    'Statistics and Probability',
    'Personal Development',
    'Practical Research 1',
    'Entrepreneurship',
    'Disciplines and Ideas in the Applied Social Sciences',
    'Creative Nonfiction',
    'Introduction to the Philosophy of the Human Person',
    'Physical Science',
    'Practical Research 2',
    'Philippine Politics and Governance',
    'Trends, Networks, and Critical Thinking in the 21st Century',
    'Inquiries, Investigations and Immersion',
    'Media and Information Literacy',
    'Community Engagement, Solidarity and Citizenship',
    'Work Immersion / Culminating Activity'
  ],
  ABM: [
    'Oral Communication',
    'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
    'General Mathematics',
    'Earth and Life Science',
    '21st Century Literature from the Philippines and the World',
    'Physical Education and Health',
    'Empowerment Technologies',
    'Filipino sa Piling Larang',
    'Organization and Management',
    'Fundamentals of Accountancy, Business and Management 1',
    'Business Math',
    'Reading and Writing Skills',
    "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
    'Statistics and Probability',
    'Personal Development',
    'Practical Research 1',
    'Entrepreneurship',
    'Fundamentals of Accountancy, Business and Management 2',
    'Business Finance',
    'Introduction to the Philosophy of the Human Person',
    'Physical Science',
    'Practical Research 2',
    'Principles of Marketing',
    'Business Ethics and Social Responsibility',
    'Inquiries, Investigations and Immersion',
    'Media and Information Literacy',
    'Applied Economics',
    'Work Immersion / Business Enterprise Simulation'
  ],
  TVL: [
    'Oral Communication',
    'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
    'General Mathematics',
    'Earth and Life Science',
    'Physical Education and Health',
    'Empowerment Technologies',
    'Computer Programming 1',
    'Computer Systems Servicing 1',
    'Web Systems and Technologies 1',
    'Reading and Writing Skills',
    'Statistics and Probability',
    'Practical Research 1',
    'Entrepreneurship',
    'Computer Programming 2',
    'Computer Systems Servicing 2',
    'Database Management Systems',
    'Introduction to the Philosophy of the Human Person',
    'Physical Science',
    'Practical Research 2',
    'Cybersecurity Fundamentals',
    'System Analysis and Design',
    'Inquiries, Investigations and Immersion',
    'Media and Information Literacy',
    'Work Immersion'
  ]
};

let materialsData = [];
let materialsStrandFilter = '';
let materialsAdminTab = 'pending';

function setMaterialsStrandFilter(value) {
  materialsStrandFilter = value;
  loadMaterialsFromDB();
}

function setMaterialsAdminTab(tab) {
  materialsAdminTab = tab;
  renderPage(currentPage);
}

function fileIconClass(fileType) {
  if (!fileType) return 'pdf';
  if (fileType.includes('pdf')) return 'pdf';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'pptx';
  if (fileType.includes('word') || fileType.includes('document')) return 'docx';
  return 'pdf';
}
function fileIconSvg() {
  return `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
}

async function loadMaterialsFromDB() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;
  try {
    const params = new URLSearchParams();
    if (ROLE === 'student') {
      if (CURRENT_PROFILE.strand) params.set('strand', CURRENT_PROFILE.strand);
    } else if (materialsStrandFilter) {
      params.set('strand', materialsStrandFilter);
    }
    const qs = params.toString();
    const res = await fetch(`${API_BASE}/api/materials${qs ? '?' + qs : ''}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      cache: 'no-store'
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Could not load materials', 'error'); return; }
    materialsData = data;
  } catch (err) {
    console.error('Failed to load materials:', err.message);
    showToast('Could not reach the server for materials', 'error');
    return;
  }
  updateApprovalBadge();
  if (currentPage === 'materials' || currentPage === 'approval' || currentPage === 'dashboard') {
    renderPage(currentPage);
  }
}

function updateApprovalBadge() {
  const item = document.querySelector('.menu-item[data-page="approval"]');
  if (!item) return;
  const pendingCount = materialsData.filter(m => m.status === 'pending').length;
  let badge = item.querySelector('.menu-badge');
  if (pendingCount > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'menu-badge';
      item.appendChild(badge);
    }
    badge.textContent = pendingCount;
  } else if (badge) {
    badge.remove();
  }
}

function renderMaterialsList(role) {
  let list = materialsData;
  if (role === 'teacher') {
    list = materialsData.filter(m => m.status === 'approved' || m.uploaded_by === CURRENT_PROFILE.id);
  } else if (role === 'admin') {
    list = materialsAdminTab === 'all' ? materialsData.slice() : materialsData.filter(m => m.status === materialsAdminTab);
  }
  if (!list.length) {
    return `<div class="file-list"><p style="padding:20px;color:var(--text-muted);font-size:13px;">${role === 'admin' ? `No ${materialsAdminTab === 'all' ? '' : materialsAdminTab + ' '}materials.` : 'No materials yet.'}</p></div>`;
  }

  const renderRow = (m) => {
    const metaParts = [m.subject, m.grade_level].filter(Boolean);
    const isOwner = m.uploaded_by === CURRENT_PROFILE.id;
    const statusPill = role === 'student' ? '' : `<span class="status-pill ${m.status === 'approved' ? 'done' : m.status === 'rejected' ? 'low' : 'pending'}">${m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span>`;
    const canDelete = role === 'admin' || (role === 'teacher' && isOwner);
    return `<div class="file-row">
      <div class="file-icon ${fileIconClass(m.file_type)}">${fileIconSvg()}</div>
      <div class="file-info">
        <h4>${escHtml(m.title)}</h4>
        <span>${escHtml(metaParts.join(' · ') || 'General')}${m.uploaded_by_name && role !== 'teacher' ? ' · ' + escHtml(m.uploaded_by_name) : ''} · ${new Date(m.created_at).toLocaleDateString()}</span>
      </div>
      ${statusPill}
      <button class="dl-btn" onclick="downloadMaterial('${m.id}')">Download</button>
      ${canDelete ? `<button class="dl-btn" style="background:#fef2f2;color:#b91c1c;" onclick="deleteMaterial('${m.id}')">Delete</button>` : ''}
    </div>`;
  };

  if (role === 'admin') {
    const groups = {};
    list.forEach(m => {
      const key = m.strand || 'General';
      (groups[key] = groups[key] || []).push(m);
    });
    const strandOrder = [...STRANDS, 'General'];
    const orderedKeys = Object.keys(groups).sort((a, b) => strandOrder.indexOf(a) - strandOrder.indexOf(b));
    return orderedKeys.map(key => `
      <div class="mm-strand-heading">${escHtml(key)} <span>(${groups[key].length})</span></div>
      <div class="file-list">${groups[key].map(renderRow).join('')}</div>
    `).join('');
  }

  return `<div class="file-list">${list.map(renderRow).join('')}</div>`;
}

function renderApprovalMaterialRows() {
  const pending = materialsData.filter(m => m.status === 'pending');
  if (!pending.length) {
    return `<div class="approval-row" style="justify-content:center;color:var(--text-muted);font-size:13px;padding:24px;">Nothing waiting on approval right now.</div>`;
  }
  return pending.map(m => {
    const metaParts = [m.subject, m.strand, m.grade_level].filter(Boolean);
    return `<div class="approval-row">
      <div class="file-icon ${fileIconClass(m.file_type)}" style="width:40px;height:40px;border-radius:10px;background:#dc2626;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
      <div class="ap-info"><h4>${escHtml(m.title)}</h4><span>Material · Teacher: ${escHtml(m.uploaded_by_name || 'Unknown')} · ${escHtml(metaParts.join(' ') || 'General')} · Submitted ${new Date(m.created_at).toLocaleDateString()}</span></div>
      <div class="ap-actions"><button class="ap-approve" onclick="approveMaterial('${m.id}')">Approve</button><button class="ap-reject" onclick="rejectMaterial('${m.id}')">Deny</button></div>
    </div>`;
  }).join('');
}

async function downloadMaterial(id) {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { showToast('Your session expired — please log in again', 'error'); return; }
  try {
    const res = await fetch(`${API_BASE}/api/materials/${id}/download`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Could not open this file', 'error'); return; }
    window.open(data.url, '_blank');
  } catch (err) {
    showToast('Could not reach the server', 'error');
  }
}

async function approveMaterial(id) { await setMaterialStatus(id, 'approved'); }
async function rejectMaterial(id)  { await setMaterialStatus(id, 'rejected'); }

async function setMaterialStatus(id, status) {
  if (status === 'rejected' && !confirm('Deny this material? It will be permanently deleted, not just hidden — the teacher would need to re-upload it.')) return;
  const { data: { session } } = await db.auth.getSession();
  if (!session) { showToast('Your session expired — please log in again', 'error'); return; }
  try {
    const res = await fetch(`${API_BASE}/api/materials/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Update failed', 'error'); return; }
    showToast(status === 'approved' ? 'Material approved' : 'Material denied and deleted', 'success');
    await loadMaterialsFromDB();
  } catch (err) {
    showToast('Could not reach the server', 'error');
  }
}

async function deleteMaterial(id) {
  if (!confirm('Delete this material? This cannot be undone.')) return;
  const { data: { session } } = await db.auth.getSession();
  if (!session) { showToast('Your session expired — please log in again', 'error'); return; }
  try {
    const res = await fetch(`${API_BASE}/api/materials/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Delete failed', 'error'); return; }
    showToast('Material deleted', 'success');
    await loadMaterialsFromDB();
  } catch (err) {
    showToast('Could not reach the server', 'error');
  }
}

const materialUploadState = { title: '', subject: '', strand: '', grade_level: '', file: null, submitting: false };

function openMaterialModal() {
  Object.assign(materialUploadState, { title: '', subject: '', strand: '', grade_level: '', file: null, submitting: false });
  document.getElementById('materialModal').classList.add('active');
  renderMaterialModal();
}
function closeMaterialModal() {
  document.getElementById('materialModal').classList.remove('active');
}
function muUpdateField(field, value) {
  materialUploadState[field] = value;
}
function muUpdateStrand(value) {
  materialUploadState.strand = value;
  materialUploadState.subject = '';
  renderMaterialModal();
}
function muHandleFileInput(input) {
  materialUploadState.file = input.files[0] || null;
  renderMaterialModal();
}
function muRemoveFile() {
  materialUploadState.file = null;
  renderMaterialModal();
}

function renderMaterialModal() {
  const body = document.getElementById('materialModalBody');
  const foot = document.getElementById('materialModalFoot');
  const s = materialUploadState;

  const subjectOptions = SUBJECTS_BY_STRAND[s.strand] || [];
  body.innerHTML = `
    <div class="gen-row">
      <div class="gen-field"><label>Strand</label>
        <select onchange="muUpdateStrand(this.value)">
          <option value="">Select strand</option>
          ${STRANDS.map(str => `<option value="${str}" ${s.strand === str ? 'selected' : ''}>${str}</option>`).join('')}
        </select>
      </div>
      <div class="gen-field"><label>Grade Level</label>
        <select onchange="muUpdateField('grade_level', this.value)">
          <option value="">Select grade level</option>
          ${GRADE_LEVELS.map(g => `<option value="${g}" ${s.grade_level === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="gen-row">
      <div class="gen-field"><label>Title</label><input type="text" placeholder="e.g. Q1 Lesson 3 – Web Systems" value="${escHtml(s.title)}" oninput="muUpdateField('title', this.value)"></div>
      <div class="gen-field"><label>Subject</label>
        <select onchange="muUpdateField('subject', this.value)" ${!s.strand ? 'disabled' : ''}>
          <option value="">${s.strand ? 'Select subject' : 'Select a strand first'}</option>
          ${subjectOptions.map(sub => `<option value="${escHtml(sub)}" ${s.subject === sub ? 'selected' : ''}>${escHtml(sub)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="gen-field">
      <label>File</label>
      ${s.file ? `
        <div class="file-chip">
          <div class="fc-icon">${iconDoc().replace('<svg viewBox="0 0 24 24">','<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">')}</div>
          <div class="fc-info"><h5>${escHtml(s.file.name)}</h5><span>Ready to upload</span></div>
          <button class="fc-remove" onclick="muRemoveFile()">${iconClose()}</button>
        </div>` : `
        <label class="dropzone" for="materialFileInput">
          ${iconUpload()}
          <div class="dz-title">Click to upload a handout, module, or slides</div>
          <div class="dz-sub">PDF, DOCX, or PPTX — up to 25MB</div>
        </label>
        <input type="file" id="materialFileInput" accept=".pdf,.doc,.docx,.ppt,.pptx" style="display:none" onchange="muHandleFileInput(this)">
      `}
    </div>
    ${ROLE === 'teacher' ? `<div style="font-size:11.5px;color:var(--text-muted);">Submitted materials go to the admin for approval before students can see them.</div>` : ''}`;

  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="closeMaterialModal()">Cancel</button>
    <button class="gen-btn" ${(!s.file || !s.title.trim() || !s.strand || !s.subject || s.submitting) ? 'disabled' : ''} onclick="submitMaterialUpload()">${iconUpload()} ${s.submitting ? 'Uploading…' : 'Upload'}</button>`;
}

async function submitMaterialUpload() {
  const s = materialUploadState;
  if (!s.file || !s.title.trim() || !s.strand || !s.subject) return;

  const { data: { session } } = await db.auth.getSession();
  if (!session) { showToast('Your session expired — please log in again', 'error'); return; }

  s.submitting = true;
  renderMaterialModal();

  const formData = new FormData();
  formData.append('file', s.file);
  formData.append('title', s.title.trim());
  formData.append('subject', s.subject.trim());
  formData.append('strand', s.strand.trim());
  formData.append('grade_level', s.grade_level.trim());

  try {
    const res = await fetch(`${API_BASE}/api/materials/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Upload failed', 'error');
      s.submitting = false;
      renderMaterialModal();
      return;
    }
    showToast(data.status === 'approved' ? 'Material uploaded' : 'Material submitted for admin approval', 'success');
    closeMaterialModal();
    await loadMaterialsFromDB();
  } catch (err) {
    showToast('Could not reach the server', 'error');
    s.submitting = false;
    renderMaterialModal();
  }
}
