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
let activeSubjectFilter = null; // course.id or null
let activeSubjectSubTab = 'modules'; // 'modules' | 'quizzes' | 'uploads'
let expandedModuleMap = {}; // { [docId]: boolean }

function setActiveSubjectMaterials(courseId) {
  activeSubjectFilter = courseId;
  activeSubjectSubTab = 'modules';
  renderMaterialsContainer();
}

function setSubjectSubTab(tab) {
  activeSubjectSubTab = tab;
  renderMaterialsContainer();
}

function toggleModuleAccordion(modId) {
  expandedModuleMap[modId] = !expandedModuleMap[modId];
  renderMaterialsContainer();
}

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

    if (ROLE === 'student') {
      // Client-side student filtering by strand, grade level and section
      materialsData = data.filter(m => 
        (!m.strand || m.strand === CURRENT_PROFILE.strand) &&
        (!m.grade_level || m.grade_level === CURRENT_PROFILE.grade_level) &&
        (!m.section || m.section.split(',').map(s => s.trim()).includes(CURRENT_PROFILE.section))
      );
    } else {
      materialsData = data;
    }
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
  const pendingMaterialsCount = materialsData.filter(m => m.status === 'pending').length;
  const pendingQuizzesCount = typeof customQuizzes !== 'undefined' ? customQuizzes.filter(q => q.status === 'pending').length : 0;
  const totalPending = pendingMaterialsCount + pendingQuizzesCount;

  let badge = item.querySelector('.menu-badge');
  if (totalPending > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'menu-badge';
      item.appendChild(badge);
    }
    badge.textContent = totalPending;
  } else if (badge) {
    badge.remove();
  }
}

function renderMaterialsList(role) {
  const studentStrand = CURRENT_PROFILE?.strand || 'STEM';
  const enrolledCourses = (typeof COURSES_DATABASE !== 'undefined')
    ? COURSES_DATABASE.filter(c => typeof isCourseOpenForStudent === 'function' ? isCourseOpenForStudent(c) : true)
    : [];

  // ── INDIVIDUAL SUBJECT WORKSPACE VIEW (STUDENT & TEACHER PORTAL) ──
  if (activeSubjectFilter) {
    const course = enrolledCourses.find(c => c.id === activeSubjectFilter) || COURSES_DATABASE.find(c => c.id === activeSubjectFilter);
    if (course) {
      const subjectUploads = materialsData.filter(m => {
        if (!m.subject) return false;
        const s = m.subject.toLowerCase();
        const t = course.title.toLowerCase();
        return s.includes(t) || t.includes(s);
      });

      const docs = course.documents || [];
      const subjectQuizzes = (typeof customQuizzes !== 'undefined') ? customQuizzes.filter(q => {
        if (!q.subject) return false;
        const s = q.subject.toLowerCase();
        const t = course.title.toLowerCase();
        return s.includes(t) || t.includes(s);
      }) : [];
      const attempts = (typeof myQuizAttempts !== 'undefined') ? myQuizAttempts : [];

      return `
      <div class="sw-workspace">
        <div class="sh-breadcrumb">
          <button class="sh-back-btn" onclick="setActiveSubjectMaterials(null)">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            Back to All Subjects
          </button>
          <span class="sh-bc-sep">/</span>
          <span class="sh-bc-curr">${escHtml(course.title)} (${escHtml(course.code)})</span>
        </div>

        <div class="sw-header-card">
          <div class="sw-header-tags">
            <span class="sh-tag track">${escHtml(course.track || 'Specialized Track')}</span>
            <span class="sh-tag strand">${escHtml(course.strand)} Strand</span>
            <span class="sh-tag sem">${escHtml(course.semester || '1st Semester')} · ${escHtml(course.gradeLevel || 'Grade 11')}</span>
          </div>
          <h1 class="sw-title">${escHtml(course.title)}</h1>
          <p class="sw-desc">${escHtml(course.description || 'Curriculum learning modules, lecture notes, lab guides, and problem sets.')}</p>
          
          <div class="sw-instructor-badge">
            <div class="sh-avatar">${course.instructor ? course.instructor.charAt(course.instructor.startsWith('Dr.') ? 4 : course.instructor.startsWith('Prof.') ? 6 : course.instructor.startsWith('Engr.') ? 6 : course.instructor.startsWith('Ms.') ? 4 : 0) : 'U'}</div>
            <span>Instructor: <strong>${escHtml(course.instructor)}</strong></span>
          </div>
        </div>

        <div class="sw-tabs-bar">
          <button class="sw-tab ${activeSubjectSubTab === 'modules' ? 'active' : ''}" onclick="setSubjectSubTab('modules')">
            Modules & Handouts <span class="sw-tab-badge">${docs.length}</span>
          </button>
          <button class="sw-tab ${activeSubjectSubTab === 'quizzes' ? 'active' : ''}" onclick="setSubjectSubTab('quizzes')">
            Quizzes & Assessments <span class="sw-tab-badge">${subjectQuizzes.length}</span>
          </button>
          <button class="sw-tab ${activeSubjectSubTab === 'uploads' ? 'active' : ''}" onclick="setSubjectSubTab('uploads')">
            Teacher Uploads <span class="sw-tab-badge">${subjectUploads.length}</span>
          </button>
        </div>

        <div class="sw-grid">
          <div class="sw-main-column">
            ${
              activeSubjectSubTab === 'modules' ? `
                <div class="sw-accordion-list">
                  ${docs.map((doc, idx) => {
                    const isExpanded = expandedModuleMap[doc.id] !== undefined ? expandedModuleMap[doc.id] : (idx === 0);
                    const progressPct = idx === 0 ? 100 : (idx === 1 ? 75 : 0);
                    const statusPill = progressPct === 100 
                      ? '<span class="sw-status-pill done">✓ COMPLETED 100%</span>' 
                      : (progressPct > 0 ? `<span class="sw-status-pill ongoing">⟳ ${progressPct}% RESUME</span>` : '<span class="sw-status-pill">NOT STARTED</span>');
                    const linkedQuiz = subjectQuizzes[idx] || null;

                    return `
                      <div class="sw-accordion-card ${isExpanded ? 'expanded' : ''}">
                        <div class="sw-ac-header" onclick="toggleModuleAccordion('${doc.id}')">
                          <div class="sw-ac-title-wrap">
                            <span class="sw-ac-icon">📄</span>
                            <div>
                              <h4 class="sw-ac-title">${escHtml(doc.title)}</h4>
                              <span class="sw-ac-subtitle">${doc.pages} Pages · ${doc.size}</span>
                            </div>
                          </div>
                          <div class="sw-ac-right">
                            ${statusPill}
                            <button class="sw-ac-toggle-btn" aria-label="Toggle section">
                              <svg viewBox="0 0 24 24" class="sw-chevron ${isExpanded ? 'open' : ''}"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                          </div>
                        </div>

                        ${isExpanded ? `
                          <div class="sw-ac-body">
                            <div class="sw-doc-preview-box">
                              <div class="sw-doc-thumb">
                                <svg viewBox="0 0 24 24" class="sw-pdf-big-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                <span class="sw-pdf-chip">PDF</span>
                              </div>
                              <div class="sw-doc-info">
                                <span class="sw-doc-file">${escHtml(doc.fileName)}</span>
                                <p class="sw-doc-topics"><strong>Key Topics:</strong> ${escHtml(doc.topics)}</p>
                                <div class="sw-doc-btn-row">
                                  <button class="sw-btn primary" onclick="previewSubjectPdf('${course.id}', '${doc.id}')">
                                    <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    Preview PDF
                                  </button>
                                  <button class="sw-btn outline" onclick="downloadSubjectPdf('${course.id}', '${doc.id}')">
                                    <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Download Handout
                                  </button>
                                </div>
                              </div>
                            </div>

                            ${linkedQuiz ? `
                              <div class="sw-linked-quiz-box">
                                <div class="sw-lq-info">
                                  <span class="sw-lq-badge">Linked Assessment</span>
                                  <h5 class="sw-lq-title">${escHtml(linkedQuiz.title)}</h5>
                                  <span class="sw-lq-meta">${(linkedQuiz.questions||[]).length} items</span>
                                </div>
                                <button class="sw-btn quiz" onclick="openTakeQuizModal('${linkedQuiz.id}')">Take Quiz</button>
                              </div>
                            ` : ''}
                          </div>
                        ` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : (
                activeSubjectSubTab === 'quizzes' ? `
                  <div class="sw-quizzes-list" style="display:flex;flex-direction:column;gap:10px;">
                    ${subjectQuizzes.length ? subjectQuizzes.map(q => {
                      const attempt = attempts.find(a => a.quiz_id === q.id);
                      const pct = attempt && attempt.total_items ? Math.round((attempt.score / attempt.total_items) * 100) : null;
                      return `
                        <div class="file-row">
                          <div class="file-icon" style="background:#059669;">
                            <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                          </div>
                          <div class="file-info">
                            <h4>${escHtml(q.title)}</h4>
                            <span>${(q.questions||[]).length} items${attempt ? ' · Score: ' + pct + '%' : ''}</span>
                          </div>
                          <span class="status-pill ${attempt ? 'done' : 'pending'}">${attempt ? 'Completed' : 'Pending'}</span>
                          <button class="take-btn" ${attempt ? 'style="background:#059669;"' : ''} onclick="${attempt ? `openReviewAttempt('${q.id}')` : `openTakeQuizModal('${q.id}')`}">${attempt ? 'Review' : 'Take Quiz'}</button>
                        </div>
                      `;
                    }).join('') : '<p style="padding:24px;color:var(--text-muted);font-size:13px;text-align:center;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">No quizzes assigned for this subject yet.</p>'}
                  </div>
                ` : `
                  <div class="file-list">
                    ${subjectUploads.length ? subjectUploads.map(m => `
                      <div class="file-row">
                        <div class="file-icon ${fileIconClass(m.file_type)}">${fileIconSvg()}</div>
                        <div class="file-info">
                          <h4>${escHtml(m.title)}</h4>
                          <span>${escHtml(m.uploaded_by_name || 'Teacher')}</span>
                        </div>
                        <button class="dl-btn" onclick="downloadMaterial('${m.id}')">Download</button>
                      </div>
                    `).join('') : '<p style="padding:24px;color:var(--text-muted);font-size:13px;text-align:center;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">No teacher uploads for this subject yet.</p>'}
                  </div>
                `
              )
            }
          </div>

          <div class="sw-sidebar">
            <div class="sw-widget-card">
              <h4 class="sw-widget-title">Subject Progress</h4>
              <div class="sw-gauge-wrap">
                <svg viewBox="0 0 100 100" class="sw-gauge-svg">
                  <circle cx="50" cy="50" r="40" class="sw-gauge-bg"/>
                  <circle cx="50" cy="50" r="40" class="sw-gauge-fill" stroke-dasharray="251.2" stroke-dashoffset="${251.2 - (251.2 * (course.progress || 35) / 100)}"/>
                </svg>
                <div class="sw-gauge-text">
                  <span class="sw-gt-pct">${course.progress || 35}%</span>
                  <span class="sw-gt-lbl">Course Completion</span>
                </div>
              </div>
            </div>

            <div class="sw-widget-card">
              <h4 class="sw-widget-title">Subject To-Do</h4>
              <div class="sw-todo-list">
                ${subjectQuizzes.filter(q => !attempts.some(a => a.quiz_id === q.id)).slice(0, 3).map(q => `
                  <div class="sw-todo-item" onclick="openTakeQuizModal('${q.id}')">
                    <span class="sw-todo-icon">📝</span>
                    <div class="sw-todo-info">
                      <h5>${escHtml(q.title)}</h5>
                      <span>${(q.questions||[]).length} items · Pending</span>
                    </div>
                  </div>
                `).join('') || '<p style="font-size:12px;color:var(--text-muted);">All subject quizzes completed! 🎉</p>'}
              </div>
            </div>

            <div class="sw-widget-card">
              <h4 class="sw-widget-title">Instructor Info</h4>
              <div class="sw-instructor-card">
                <div class="sw-inst-avatar">${course.instructor ? course.instructor.charAt(course.instructor.startsWith('Dr.') ? 4 : course.instructor.startsWith('Prof.') ? 6 : course.instructor.startsWith('Engr.') ? 6 : course.instructor.startsWith('Ms.') ? 4 : 0) : 'U'}</div>
                <div class="sw-inst-details">
                  <h5>${escHtml(course.instructor)}</h5>
                  <span>Academic Faculty</span>
                </div>
              </div>
              <button class="sw-btn outline full" style="margin-top:12px;width:100%;justify-content:center;" onclick="goToChat()">
                💬 Chat Instructor
              </button>
            </div>
          </div>
        </div>
      </div>`;
    }
  }

  // ── ALL SUBJECTS OVERVIEW / FILTER TABS ──
  let list = materialsData;
  if (role === 'teacher') {
    list = materialsData.filter(m => m.status === 'approved' || m.uploaded_by === CURRENT_PROFILE.id);
  } else if (role === 'admin') {
    list = materialsAdminTab === 'all' ? materialsData.slice() : materialsData.filter(m => m.status === materialsAdminTab);
  }

  const renderRow = (m) => {
    const metaParts = [m.subject].filter(Boolean);
    const uploader = m.uploaded_by_name ? escHtml(m.uploaded_by_name) : '';
    const subText = [escHtml(metaParts.join(' · ') || 'General'), uploader].filter(Boolean).join(' · ');
    const isOwner = m.uploaded_by === CURRENT_PROFILE.id;
    const statusPill = role === 'student' ? '' : `<span class="status-pill ${m.status === 'approved' ? 'done' : m.status === 'rejected' ? 'low' : 'pending'}">${m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span>`;
    const canDelete = role === 'admin' || (role === 'teacher' && isOwner);
    return `<div class="file-row">
      <div class="file-icon ${fileIconClass(m.file_type)}">${fileIconSvg()}</div>
      <div class="file-info">
        <h4>${escHtml(m.title)}</h4>
        <span>${subText}</span>
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

  // Student / Teacher View: Show Subject Cards with individual PDF folders
  return `
    <div class="subjects-materials-wrapper">
      <div class="subject-chips-bar">
        <button class="subject-chip active" onclick="setActiveSubjectMaterials(null)">All Enrolled Subjects</button>
        ${enrolledCourses.map(c => `
          <button class="subject-chip" onclick="setActiveSubjectMaterials('${c.id}')">
            ${escHtml(c.title)} <span class="sc-badge">${c.documents ? c.documents.length : c.modules}</span>
          </button>
        `).join('')}
      </div>

      <div class="subjects-folder-grid">
        ${enrolledCourses.map(course => {
          const docs = course.documents || [];
          return `
            <div class="subject-folder-card" onclick="setActiveSubjectMaterials('${course.id}')">
              <div class="sfc-thumb" style="background-image:url('${course.cover}');">
                <span class="sfc-code">${course.code}</span>
                <span class="sfc-strand">${course.strand}</span>
              </div>
              <div class="sfc-body">
                <h4 class="sfc-title">${escHtml(course.title)}</h4>
                <p class="sfc-instructor">👤 ${escHtml(course.instructor)}</p>
                <div class="sfc-foot">
                  <span class="sfc-doc-count">${docs.length} PDF ${docs.length === 1 ? 'Module' : 'Modules'}</span>
                  <span class="sfc-open-btn">View Files →</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
    </div>
  `;
}

function previewSubjectPdf(courseId, docId) {
  const course = (typeof COURSES_DATABASE !== 'undefined') ? COURSES_DATABASE.find(c => c.id === courseId) : null;
  const doc = course?.documents?.find(d => d.id === docId);
  if (!doc) return;

  const modal = document.getElementById('docPreviewModal');
  const titleEl = document.getElementById('docPreviewTitle');
  const subEl = document.getElementById('docPreviewSubtitle');
  const bodyEl = document.getElementById('docPreviewBody');
  const dlBtn = document.getElementById('docPreviewDlBtn');

  if (titleEl) titleEl.textContent = doc.title;
  if (subEl) subEl.textContent = `${course.title} (${course.code}) · ${doc.fileName} · ${doc.pages} Pages · ${doc.size}`;
  if (dlBtn) dlBtn.onclick = () => downloadSubjectPdf(courseId, docId);

  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="doc-viewer-card">
        <div class="doc-viewer-header">
          <div class="doc-vh-left">
            <span class="doc-type-badge">PDF Document</span>
            <span class="doc-topic-tag">${escHtml(course.track || 'Specialized Track')}</span>
          </div>
          <span class="doc-page-count">Page 1 of ${doc.pages}</span>
        </div>
        
        <div class="doc-content-simulator">
          <div class="doc-paper">
            <div class="doc-paper-header">
              <div class="doc-school-name">HAVEN OF WISDOM ACADEMY</div>
              <div class="doc-school-sub">Senior High School Academic Department · ${escHtml(course.strand)} Strand</div>
              <div class="doc-divider"></div>
            </div>
            
            <div class="doc-paper-title">${escHtml(doc.title)}</div>
            <div class="doc-paper-meta">Subject: <strong>${escHtml(course.title)} (${escHtml(course.code)})</strong> | Instructor: <strong>${escHtml(course.instructor)}</strong></div>
            
            <div class="doc-section-heading">I. Learning Competencies & Objectives</div>
            <p class="doc-body-p">In this module, students are expected to comprehend and demonstrate proficiency in: ${escHtml(doc.topics)}</p>
            
            <div class="doc-section-heading">II. Key Concepts & Overview</div>
            <p class="doc-body-p">This instructional resource contains formal definitions, illustrative step-by-step problem sets, and guided laboratory worksheets prepared for ${escHtml(course.gradeLevel)} students.</p>
            
            <div class="doc-highlight-box">
              <strong>Module Resource Summary:</strong><br/>
              • Document File: <code>${escHtml(doc.fileName)}</code><br/>
              • Total Length: ${doc.pages} pages with practice activities & self-check assessments.<br/>
              • Release Date: ${doc.date}
            </div>

            <div class="doc-section-heading">III. Discussion & Guided Activities</div>
            <p class="doc-body-p">Detailed diagrams, mathematical derivations, and exercise sheets follow in the complete downloadable PDF version.</p>
          </div>
        </div>
      </div>
    `;
  }

  if (modal) modal.classList.add('active');
}

function closeDocPreviewModal() {
  const modal = document.getElementById('docPreviewModal');
  if (modal) modal.classList.remove('active');
}

function downloadSubjectPdf(courseId, docId) {
  const course = (typeof COURSES_DATABASE !== 'undefined') ? COURSES_DATABASE.find(c => c.id === courseId) : null;
  const doc = course?.documents?.find(d => d.id === docId);
  if (!doc) return;

  showToast(`Downloading "${doc.fileName}"…`, 'success');

  const textContent = `%PDF-1.4\n% HAVEN OF WISDOM ACADEMY\n% Course: ${course.title} (${course.code})\n% Module: ${doc.title}\n% File: ${doc.fileName}\n% Instructor: ${course.instructor}\n% Topics: ${doc.topics}\n% Pages: ${doc.pages}\n\n==============================================\nHAVEN OF WISDOM ACADEMY - SENIOR HIGH SCHOOL\n${course.title.toUpperCase()} (${course.code})\n${doc.title}\nInstructor: ${course.instructor}\n==============================================\n\nOVERVIEW & TOPICS:\n${doc.topics}\n\nThis is the official curriculum learning material for Haven of Wisdom Academy students.\n`;
  
  const blob = new Blob([textContent], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderApprovalMaterialRows() {
  const pendingMaterials = materialsData.filter(m => m.status === 'pending');
  const pendingQuizzes = typeof customQuizzes !== 'undefined' ? customQuizzes.filter(q => q.status === 'pending') : [];

  if (!pendingMaterials.length && !pendingQuizzes.length) {
    return `<div class="approval-row" style="justify-content:center;color:var(--text-muted);font-size:13px;padding:24px;">Nothing waiting on approval right now.</div>`;
  }

  const matRows = pendingMaterials.map(m => {
    const metaParts = [m.subject, m.strand].filter(Boolean);
    return `<div class="approval-row">
      <div class="file-icon ${fileIconClass(m.file_type)}" style="width:40px;height:40px;border-radius:10px;background:#dc2626;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
      <div class="ap-info"><h4>${escHtml(m.title)}</h4><span>Material · Teacher: ${escHtml(m.uploaded_by_name || 'Unknown')} · ${escHtml(metaParts.join(' ') || 'General')} · Submitted ${new Date(m.created_at).toLocaleDateString()}</span></div>
      <div class="ap-actions"><button class="ap-approve" onclick="approveMaterial('${m.id}')">Approve</button><button class="ap-reject" onclick="rejectMaterial('${m.id}')">Deny</button></div>
    </div>`;
  });

  const qzRows = pendingQuizzes.map(q => {
    const metaParts = [q.subject, q.strand].filter(Boolean);
    return `<div class="approval-row">
      <div class="file-icon mc" style="width:40px;height:40px;border-radius:10px;background:#059669;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></div>
      <div class="ap-info"><h4>${escHtml(q.title)}</h4><span>Quiz · Teacher: ${escHtml(registeredUsers.find(u => u.dbId === q.createdBy)?.name || 'Unknown')} · ${escHtml(metaParts.join(' ') || 'General')} · Submitted ${new Date(q.createdAt).toLocaleDateString()}</span></div>
      <div class="ap-actions"><button class="ap-approve" onclick="approveQuiz('${q.id}')">Approve</button><button class="ap-reject" onclick="rejectQuiz('${q.id}')">Deny</button></div>
    </div>`;
  });

  return [...matRows, ...qzRows].join('');
}

async function approveMaterial(id) {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;
  try {
    const res = await fetch(`${API_BASE}/api/materials/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ status: 'approved' })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Approval failed', 'error'); return; }
    showToast('Material approved', 'success');

    if (data && typeof addNotification === 'function') {
      addNotification({
        targetUserId: data.uploaded_by,
        targetRole: 'teacher',
        title: 'Material Approved',
        message: `Your material "${data.title}" has been approved by the Admin.`,
        type: 'material'
      });
      addNotification({
        targetRole: 'student',
        title: 'New Material Available',
        message: `New learning material "${data.title}" (${data.subject || 'General'}) is now available.`,
        type: 'material'
      });
    }

    await loadMaterialsFromDB();
  } catch (err) {
    showToast('Could not reach the server', 'error');
  }
}

async function rejectMaterial(id) {
  if (!confirm('Deny and delete this material? It will be permanently deleted from database and storage.')) return;
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;
  try {
    const res = await fetch(`${API_BASE}/api/materials/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ status: 'rejected' })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Rejection failed', 'error'); return; }
    showToast('Material denied and deleted', 'success');
    await loadMaterialsFromDB();
  } catch (err) {
    showToast('Could not reach the server', 'error');
  }
}

async function downloadMaterial(id) {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;
  try {
    const res = await fetch(`${API_BASE}/api/materials/${id}/download`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Download failed', 'error'); return; }

    const isPdfSimulated = data.url.includes('learning-materials') || data.file_type.includes('pdf');
    if (isPdfSimulated) {
      showToast(`Downloading "${data.title}"…`, 'success');
      const textContent = `%PDF-1.4\n% HAVEN OF WISDOM ACADEMY\n% Title: ${data.title}\n% File: ${data.url}\n\n==============================================\nHAVEN OF WISDOM ACADEMY - SENIOR HIGH SCHOOL\n${data.title.toUpperCase()}\n==============================================\n\nThis is a supplementary learning material from Haven of Wisdom Academy.\n`;
      const blob = new Blob([textContent], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.title.replace(/[^\w.\-]+/g, '_') + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      window.open(data.url, '_blank');
    }
  } catch (err) {
    showToast('Could not reach the server', 'error');
  }
}

async function deleteMaterial(id) {
  if (!confirm('Are you sure you want to delete this material? This will permanently remove the file.')) return;
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;
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

const materialUploadState = { title: '', subject: '', strand: '', grade_level: '', sections: new Set(), file: null, submitting: false };

function openMaterialModal() {
  const teacherStrands = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.strand)
    ? CURRENT_PROFILE.strand.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const teacherGrades = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.grade_level)
    ? CURRENT_PROFILE.grade_level.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const teacherSections = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.section)
    ? CURRENT_PROFILE.section.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  Object.assign(materialUploadState, { 
    title: '', 
    subject: '', 
    strand: teacherStrands.length === 1 ? teacherStrands[0] : '', 
    grade_level: teacherGrades.length === 1 ? teacherGrades[0] : '', 
    sections: new Set(teacherSections),
    file: null, 
    submitting: false 
  });
  document.getElementById('materialModal').classList.add('active');
  renderMaterialModal();
}

function toggleMaterialSection(sec) {
  if (materialUploadState.sections.has(sec)) {
    materialUploadState.sections.delete(sec);
  } else {
    materialUploadState.sections.add(sec);
  }
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
  const teacherStrands = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.strand)
    ? CURRENT_PROFILE.strand.split(',').map(str => str.trim()).filter(Boolean)
    : [];
  const teacherGrades = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.grade_level)
    ? CURRENT_PROFILE.grade_level.split(',').map(g => g.trim()).filter(Boolean)
    : [];
  const teacherSections = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.section)
    ? CURRENT_PROFILE.section.split(',').map(sec => sec.trim()).filter(Boolean)
    : [];

  const availableStrands = (ROLE === 'teacher' && teacherStrands.length) ? teacherStrands : STRANDS;
  const availableGrades  = (ROLE === 'teacher' && teacherGrades.length) ? teacherGrades : GRADE_LEVELS;
  const availableSections = (ROLE === 'teacher' && teacherSections.length) ? teacherSections : SECTIONS;

  const isStrandLocked = ROLE === 'teacher' && teacherStrands.length === 1;
  const isGradeLocked  = ROLE === 'teacher' && teacherGrades.length === 1;

  body.innerHTML = `
    <div class="gen-row">
      <div class="gen-field"><label>Strand ${isStrandLocked ? '<span style="font-size:11px;color:#0284c7;font-weight:600;">(Handled Strand)</span>' : ''}</label>
        ${isStrandLocked ? `
          <select disabled style="opacity:0.85;cursor:not-allowed;background:#f8fafc;font-weight:600;">
            <option value="${teacherStrands[0]}" selected>${teacherStrands[0]} (Locked to handled strand)</option>
          </select>
        ` : `
          <select onchange="muUpdateStrand(this.value)">
            <option value="" disabled ${!s.strand ? 'selected' : ''}>Select strand</option>
            ${availableStrands.map(str => `<option value="${str}" ${s.strand === str ? 'selected' : ''}>${str}</option>`).join('')}
          </select>
        `}
      </div>
      <div class="gen-field"><label>Grade Level ${isGradeLocked ? '<span style="font-size:11px;color:#0284c7;font-weight:600;">(Handled Grade)</span>' : ''}</label>
        ${isGradeLocked ? `
          <select disabled style="opacity:0.85;cursor:not-allowed;background:#f8fafc;font-weight:600;">
            <option value="${teacherGrades[0]}" selected>${teacherGrades[0]} (Locked to handled grade)</option>
          </select>
        ` : `
          <select onchange="muUpdateGradeLevel(this.value)">
            <option value="" disabled ${!s.grade_level ? 'selected' : ''}>Select grade level</option>
            ${availableGrades.map(g => `<option value="${g}" ${s.grade_level === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        `}
      </div>
    </div>
    <div class="gen-field">
      <label>Target Sections <span style="text-transform:none;font-weight:500;color:var(--text-muted);">${ROLE === 'teacher' ? '(Limited to your handled sections)' : '(select multiple or leave blank for all sections)'}</span></label>
      <div class="format-grid">
        ${availableSections.map(sec => {
          const isSelected = s.sections.has(sec);
          return `<div class="format-chip ${isSelected ? 'on' : ''}" onclick="toggleMaterialSection('${sec}')">${sec}</div>`;
        }).join('')}
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

  const targetSection = s.sections.size ? Array.from(s.sections).join(', ') : '';

  const formData = new FormData();
  formData.append('file', s.file);
  formData.append('title', s.title.trim());
  formData.append('subject', s.subject.trim());
  formData.append('strand', s.strand.trim());
  formData.append('grade_level', s.grade_level.trim());
  formData.append('section', targetSection);

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
