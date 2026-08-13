const SUBJECTS_BY_STRAND_AND_GRADE = {
  HUMSS: {
    'Grade 11': [
      'Oral Communication',
      'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
      'General Mathematics',
      'Earth and Life Science',
      'Understanding Culture, Society, and Politics',
      'Personal Development / Pansariling Kaunlaran',
      'Physical Education and Health',
      'English for Academic and Professional Purposes',
      'Disciplines and Ideas in the Social Sciences',
      'Homeroom Guidance (HG1)',
      'Reading and Writing Skills',
      "Pagbasa at Pagsusuri ng Iba't ibang Teksto Tungo sa Pananaliksik",
      '21st Century Literature from the Philippines and the World',
      'Statistics and Probability',
      'Physical Science',
      'Research 1',
      'Disciplines and Ideas in the Applied Social Sciences',
      'Philippine Politics and Governance'
    ],
    'Grade 12': [
      'Media and Information Literacy',
      'Pagsulat sa Filipino sa Piling Larang',
      'Introduction to the Philosophy of Human Person',
      'Contemporary Philippine Arts from the Regions',
      'Physical Education and Health',
      'Empowerment Technologies (E-Tech): ICT for Professional Tracks',
      'Research in Daily Life 2',
      'Creative Writing / Malikhaing Pagsulat',
      'Introduction to World Religions and Belief Systems',
      'Entrepreneurship',
      'Research Project 3I (Inquiries, Investigation, and Immersion)',
      'Creative Nonfiction: The Literary Essay',
      'Trends, Networks and Critical Thinking in the 21st Century Culture',
      'Community Engagement, Solidarity and Citizenship',
      'Culminating Activity',
      'Homeroom Guidance (HG)'
    ]
  },
  STEM: {
    'Grade 11': [
      'Oral Communication',
      'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
      'General Mathematics',
      'Earth Science',
      '21st Century Literature from the Philippines and the World',
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
      'Vectors and the Geometry of Space'
    ],
    'Grade 12': [
      'Introduction to the Philosophy of the Human Person',
      'Contemporary Philippine Arts from the Regions',
      'Understanding Culture, Society and Politics',
      'Physical Education and Health',
      'Practical Research 2',
      'English for Academic and Special Purposes',
      'General Physics 1',
      'General Chemistry 1',
      'Human Biology 3',
      'Differential Equations',
      'Media and Information Literacy',
      'Inquiries, Investigations and Immersion',
      'General Physics 2',
      'General Chemistry 2',
      'Work Immersion / Research / Culminating Activity',
      'Biochemistry'
    ]
  },
  ABM: {
    'Grade 11': [
      'Oral Communication',
      'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
      'General Mathematics',
      'Earth and Life Science',
      '21st Century Literature from the Philippines and the World',
      'Physical Education and Health',
      'Empowerment Technologies',
      'Filipino sa Piling Larang',
      'Organization and Management',
      'Business Math',
      'Reading and Writing Skills',
      "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
      'Statistics and Probability',
      'Physical Science',
      'Personal Development',
      'Entrepreneurship',
      'Practical Research 1',
      'Fundamentals of Accountancy, Business and Management 1',
      'Principles of Marketing'
    ],
    'Grade 12': [
      'Introduction to the Philosophy of the Human Person',
      'Contemporary Philippine Arts from the Regions',
      'Understanding Culture, Society and Politics',
      'Physical Education and Health',
      'English for Academic and Professional Purposes',
      'Practical Research 2',
      'Fundamentals of Accountancy, Business and Management 2',
      'Applied Economics',
      'Media and Information Literacy',
      'Inquiries, Investigations and Immersion',
      'Business Finance',
      'Business Ethics and Social Responsibility',
      'Business Enterprise Simulation or Work Immersion'
    ]
  },
  TVL: {
    'Grade 11': [
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
      'Computer Programming 2'
    ],
    'Grade 12': [
      'Introduction to the Philosophy of the Human Person',
      'Contemporary Philippine Arts from the Regions',
      'Understanding Culture, Society and Politics',
      'Physical Education and Health',
      'Media and Information Literacy',
      'English for Academic and Professional Purposes',
      'Practical Research 2',
      'Web Systems and Technologies 2',
      'Database Management Systems',
      'Cybersecurity Fundamentals',
      'Inquiries, Investigations and Immersion',
      'Work Immersion'
    ]
  }
};

function getFilteredSubjects(strand, gradeLevel) {
  if (strand && gradeLevel) {
    return SUBJECTS_BY_STRAND_AND_GRADE[strand]?.[gradeLevel] || [];
  }
  if (strand) {
    const g11 = SUBJECTS_BY_STRAND_AND_GRADE[strand]?.['Grade 11'] || [];
    const g12 = SUBJECTS_BY_STRAND_AND_GRADE[strand]?.['Grade 12'] || [];
    return [...g11, ...g12];
  }
  if (gradeLevel) {
    const list = [];
    Object.values(SUBJECTS_BY_STRAND_AND_GRADE).forEach(grades => {
      (grades[gradeLevel] || []).forEach(sub => {
        if (!list.includes(sub)) list.push(sub);
      });
    });
    return list;
  }
  const all = [];
  Object.values(SUBJECTS_BY_STRAND_AND_GRADE).forEach(grades => {
    Object.values(grades).forEach(subList => {
      subList.forEach(sub => {
        if (!all.includes(sub)) all.push(sub);
      });
    });
  });
  return all;
}

const SUBJECTS_BY_STRAND = {
  STEM: [ ...(SUBJECTS_BY_STRAND_AND_GRADE.STEM['Grade 11'] || []), ...(SUBJECTS_BY_STRAND_AND_GRADE.STEM['Grade 12'] || []) ],
  HUMSS: [ ...(SUBJECTS_BY_STRAND_AND_GRADE.HUMSS['Grade 11'] || []), ...(SUBJECTS_BY_STRAND_AND_GRADE.HUMSS['Grade 12'] || []) ],
  ABM: [ ...(SUBJECTS_BY_STRAND_AND_GRADE.ABM['Grade 11'] || []), ...(SUBJECTS_BY_STRAND_AND_GRADE.ABM['Grade 12'] || []) ],
  TVL: [ ...(SUBJECTS_BY_STRAND_AND_GRADE.TVL['Grade 11'] || []), ...(SUBJECTS_BY_STRAND_AND_GRADE.TVL['Grade 12'] || []) ]
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

let isFetchingMaterials = false;

function renderMaterialsContainer() {
  const container = document.getElementById('materialsListWrap');
  if (container) container.innerHTML = renderMaterialsList(ROLE);
  const approvalContainer = document.getElementById('approvalListWrap');
  if (approvalContainer) approvalContainer.innerHTML = renderApprovalMaterialRows();
}

async function loadMaterialsFromDB() {
  if (isFetchingMaterials) return;
  isFetchingMaterials = true;
  const { data: { session } } = await db.auth.getSession();
  if (!session) { isFetchingMaterials = false; return; }
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
  } finally {
    isFetchingMaterials = false;
  }
  updateApprovalBadge();
  if (currentPage === 'materials' || currentPage === 'approval') {
    renderMaterialsContainer();
  } else if (currentPage === 'dashboard') {
    const mainContent = document.getElementById('mainContent');
    if (mainContent && typeof getPageContent === 'function') {
      mainContent.innerHTML = getPageContent(ROLE, 'dashboard');
    }
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
  const pendingMaterials = materialsData.filter(m => m.status === 'pending');
  const pendingQuizzes = typeof customQuizzes !== 'undefined' ? customQuizzes.filter(q => q.status === 'pending') : [];

  if (!pendingMaterials.length && !pendingQuizzes.length) {
    return `<div class="approval-row" style="justify-content:center;color:var(--text-muted);font-size:13px;padding:24px;">Nothing waiting on approval right now.</div>`;
  }

  const matRows = pendingMaterials.map(m => {
    const metaParts = [m.subject, m.strand, m.grade_level].filter(Boolean);
    return `<div class="approval-row">
      <div class="file-icon ${fileIconClass(m.file_type)}" style="width:40px;height:40px;border-radius:10px;background:#dc2626;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
      <div class="ap-info"><h4>${escHtml(m.title)}</h4><span>Material · Teacher: ${escHtml(m.uploaded_by_name || 'Unknown')} · ${escHtml(metaParts.join(' ') || 'General')} · Submitted ${new Date(m.created_at).toLocaleDateString()}</span></div>
      <div class="ap-actions"><button class="ap-approve" onclick="approveMaterial('${m.id}')">Approve</button><button class="ap-reject" onclick="rejectMaterial('${m.id}')">Deny</button></div>
    </div>`;
  });

  const quizRows = pendingQuizzes.map(q => {
    const teacherUser = typeof registeredUsers !== 'undefined' ? registeredUsers.find(u => u.dbId === q.createdBy) : null;
    const teacherName = teacherUser ? teacherUser.name : 'Teacher';
    const metaParts = [q.subject, q.strand, q.sections].filter(Boolean);
    return `<div class="approval-row">
      <div class="file-icon" style="width:40px;height:40px;border-radius:10px;background:#7c3aed;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></div>
      <div class="ap-info"><h4>${escHtml(q.title)}</h4><span>Quiz · Teacher: ${escHtml(teacherName)} · ${escHtml(metaParts.join(' · ') || 'General')} · Submitted ${q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'Recently'}</span></div>
      <div class="ap-actions"><button class="ap-approve" onclick="approveQuiz('${q.id}')">Approve</button><button class="ap-reject" onclick="rejectQuiz('${q.id}')">Deny</button></div>
    </div>`;
  });

  return [...matRows, ...quizRows].join('');
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
    const mat = materialsData.find(m => m.id === id);
    const res = await fetch(`${API_BASE}/api/materials/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Update failed', 'error'); return; }
    showToast(status === 'approved' ? 'Material approved' : 'Material denied and deleted', 'success');

    if (status === 'approved' && mat && typeof addNotification === 'function') {
      addNotification({
        targetUserId: mat.uploaded_by,
        targetRole: 'teacher',
        title: 'Material Approved',
        message: `Your material "${mat.title}" has been approved by the Admin and is now live.`,
        type: 'material'
      });
      addNotification({
        targetRole: 'student',
        title: 'New Material Available',
        message: `New material "${mat.title}" (${mat.subject || 'General'}) is now available under My Materials.`,
        type: 'material'
      });
    }

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
  muRefreshUploadButton();
}
function muRefreshUploadButton() {
  const btn = document.getElementById('muSubmitBtn');
  if (!btn) return;
  const s = materialUploadState;
  const ok = !!(s.file && s.title.trim() && s.strand && s.subject && !s.submitting);
  btn.disabled = !ok;
}

function getAllSubjects() {
  const all = [];
  Object.values(SUBJECTS_BY_STRAND).forEach(list => {
    list.forEach(sub => {
      if (!all.includes(sub)) all.push(sub);
    });
  });
  return all;
}

function muUpdateStrand(value) {
  materialUploadState.strand = value;
  const available = getFilteredSubjects(materialUploadState.strand, materialUploadState.grade_level);
  if (materialUploadState.subject && available.length > 0 && !available.includes(materialUploadState.subject)) {
    materialUploadState.subject = '';
  }
  renderMaterialModal();
}

function muUpdateGradeLevel(value) {
  materialUploadState.grade_level = value;
  const available = getFilteredSubjects(materialUploadState.strand, materialUploadState.grade_level);
  if (materialUploadState.subject && available.length > 0 && !available.includes(materialUploadState.subject)) {
    materialUploadState.subject = '';
  }
  renderMaterialModal();
}

function muUpdateSubject(value) {
  materialUploadState.subject = value;
  if (value && (!materialUploadState.strand || !materialUploadState.grade_level)) {
    for (const [str, grades] of Object.entries(SUBJECTS_BY_STRAND_AND_GRADE)) {
      for (const [gLevel, list] of Object.entries(grades)) {
        if (list.includes(value)) {
          if (!materialUploadState.strand) materialUploadState.strand = str;
          if (!materialUploadState.grade_level) materialUploadState.grade_level = gLevel;
          break;
        }
      }
    }
  }
  renderMaterialModal();
}

function muHandleFileInput(input) {
  const file = input.files[0] || null;
  materialUploadState.file = file;
  if (file) {
    const rawName = file.name.replace(/\.[^.]+$/, '');
    if (!materialUploadState.title) {
      materialUploadState.title = rawName;
    }
    if (!materialUploadState.subject) {
      for (const [str, grades] of Object.entries(SUBJECTS_BY_STRAND_AND_GRADE)) {
        for (const [gLevel, list] of Object.entries(grades)) {
          const found = list.find(sub => sub.toLowerCase() === rawName.toLowerCase());
          if (found) {
            materialUploadState.subject = found;
            if (!materialUploadState.strand) materialUploadState.strand = str;
            if (!materialUploadState.grade_level) materialUploadState.grade_level = gLevel;
            break;
          }
        }
      }
    }
  }
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

  const subjectOptions = getFilteredSubjects(s.strand, s.grade_level);
  body.innerHTML = `
    <div class="gen-row">
      <div class="gen-field"><label>Strand</label>
        <select onchange="muUpdateStrand(this.value)">
          <option value="" disabled ${!s.strand ? 'selected' : ''}>Select strand</option>
          ${STRANDS.map(str => `<option value="${str}" ${s.strand === str ? 'selected' : ''}>${str}</option>`).join('')}
        </select>
      </div>
      <div class="gen-field"><label>Grade Level</label>
        <select onchange="muUpdateGradeLevel(this.value)">
          <option value="" disabled ${!s.grade_level ? 'selected' : ''}>Select grade level</option>
          ${GRADE_LEVELS.map(g => `<option value="${g}" ${s.grade_level === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="gen-row">
      <div class="gen-field"><label>Title</label><input type="text" placeholder="e.g. Q1 Lesson 3 – Web Systems" value="${escHtml(s.title)}" oninput="muUpdateField('title', this.value)"></div>
      <div class="gen-field"><label>Subject</label>
        <select onchange="muUpdateSubject(this.value)">
          <option value="" disabled ${!s.subject ? 'selected' : ''}>${(s.strand && s.grade_level) ? `Select subject (${s.strand} · ${s.grade_level})` : s.strand ? `Select subject (${s.strand})` : s.grade_level ? `Select subject (${s.grade_level})` : 'Select subject'}</option>
          ${subjectOptions.map(sub => `<option value="${escHtml(sub)}" ${s.subject === sub ? 'selected' : ''}>${escHtml(sub)}</option>`).join('')}
          ${(s.subject && !subjectOptions.includes(s.subject)) ? `<option value="${escHtml(s.subject)}" selected>${escHtml(s.subject)}</option>` : ''}
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
    <button class="gen-btn" id="muSubmitBtn" ${(!s.file || !s.title.trim() || !s.strand || !s.subject || s.submitting) ? 'disabled' : ''} onclick="submitMaterialUpload()">${iconUpload()} ${s.submitting ? 'Uploading…' : 'Upload'}</button>`;
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
    if (data.status === 'pending' && typeof addNotification === 'function') {
      addNotification({
        targetRole: 'admin',
        title: 'New Material Pending Review',
        message: `Teacher ${CURRENT_PROFILE?.full_name || 'A teacher'} submitted "${s.title.trim()}" for approval.`,
        type: 'approval'
      });
    }
    closeMaterialModal();
    await loadMaterialsFromDB();
  } catch (err) {
    showToast('Could not reach the server', 'error');
    s.submitting = false;
    renderMaterialModal();
  }
}
