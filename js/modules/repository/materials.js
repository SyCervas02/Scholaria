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
  if (container) {
    if (ROLE === 'admin') {
      container.innerHTML = renderMaterialsManagerPage('admin');
    } else {
      container.innerHTML = renderMaterialsList(ROLE);
    }
  }
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
    console.warn('Backend API server offline, querying Supabase directly:', err.message);
    try {
      let query = db.from('materials').select('*').order('created_at', { ascending: false });
      if (ROLE === 'student' && CURRENT_PROFILE.strand) {
        query = query.or(`strand.eq.${CURRENT_PROFILE.strand},strand.is.null`);
      } else if (materialsStrandFilter) {
        query = query.eq('strand', materialsStrandFilter);
      }
      const { data, error } = await query;
      if (!error && data) {
        materialsData = data;
      }
    } catch (e) {
      console.error('Supabase direct query failed:', e.message);
    }
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
  let enrolledCourses = (typeof COURSES_DATABASE !== 'undefined')
    ? (role === 'teacher' ? COURSES_DATABASE.slice() : COURSES_DATABASE.filter(c => typeof isCourseOpenForStudent === 'function' ? isCourseOpenForStudent(c) : true))
    : [];

  if (role === 'teacher' && typeof materialsStrandFilter !== 'undefined' && materialsStrandFilter) {
    enrolledCourses = enrolledCourses.filter(c => c.strand === materialsStrandFilter);
  }

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
                                <button class="sw-btn quiz" onclick="${(linkedQuiz.type === 'interactive' || linkedQuiz.quiz_type === 'interactive') ? `openInteractiveQuiz('${linkedQuiz.id}')` : `openTakeQuizModal('${linkedQuiz.id}')`}">${(linkedQuiz.type === 'interactive' || linkedQuiz.quiz_type === 'interactive') ? 'Play Quiz' : 'Take Quiz'}</button>
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
                          <button class="take-btn" ${attempt ? 'style="background:#059669;"' : (q.type === 'interactive' || q.quiz_type === 'interactive') ? 'style="background:linear-gradient(135deg,#0284c7,#8b5cf6);"' : ''} onclick="${attempt ? `openReviewAttempt('${q.id}')` : (q.type === 'interactive' || q.quiz_type === 'interactive') ? `openInteractiveQuiz('${q.id}')` : `openTakeQuizModal('${q.id}')`}">${attempt ? 'Review' : (q.type === 'interactive' || q.quiz_type === 'interactive') ? 'Play Quiz' : 'Take Quiz'}</button>
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
                  <div class="sw-todo-item" onclick="${(q.type === 'interactive' || q.quiz_type === 'interactive') ? `openInteractiveQuiz('${q.id}')` : `openTakeQuizModal('${q.id}')`}">
                    <span class="sw-todo-icon">${(q.type === 'interactive' || q.quiz_type === 'interactive') ? '🎮' : '📝'}</span>
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

  if (role === 'admin') {
    return renderMaterialsManagerPage('admin');
  }

  // ── ALL SUBJECTS OVERVIEW / FILTER TABS ──
  let list = materialsData;
  if (role === 'teacher') {
    list = materialsData.filter(m => m.status === 'approved' || m.uploaded_by === CURRENT_PROFILE.id);
  }

  // Student / Teacher View: Show Subject Cards with individual PDF folders
  return `
    <div class="subjects-materials-wrapper">
      <div class="subject-chips-bar">
        <button class="subject-chip ${!activeSubjectFilter ? 'active' : ''}" onclick="setActiveSubjectMaterials(null)">All ${role === 'teacher' ? 'Handled' : 'Enrolled'} Subjects</button>
        ${enrolledCourses.map(c => `
          <button class="subject-chip" onclick="setActiveSubjectMaterials('${c.id}')">
            ${escHtml(c.title)} <span class="sc-badge">${c.documents ? c.documents.length : (c.modules || 0)}</span>
          </button>
        `).join('')}
      </div>

      <div class="subjects-folder-grid">
        ${enrolledCourses.map(course => {
          const docs = course.documents || [];
          return `
            <div class="subject-folder-card" onclick="setActiveSubjectMaterials('${course.id}')">
              <div class="sfc-thumb" style="background-image:url('${course.cover}');">
                <span class="sfc-code">${escHtml(course.code)}</span>
                <span class="sfc-strand">${escHtml(course.strand)}</span>
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
    </div>
  `;
}

// ── MATERIALS MANAGER STATE & DEMO DATA ──
let materialsSearchQuery = '';
let materialsContentTypeFilter = ''; // '' | 'quiz' | 'material'
let materialsGradeFilter = '';
let materialsSubjectFilter = '';
let materialsStatusFilter = '';
let materialsActiveTab = 'all'; // 'all' | 'pending' | 'teacher' | 'student'
let materialsViewMode = 'list'; // 'list' | 'grid'
let materialsCurrentPage = 1;
const MATERIALS_PAGE_SIZE = 6;
let activeMaterialActionMenuId = null;

// Comprehensive default dataset matching the exact design and counts (128 total items: 87 Teacher, 41 Student, 12 Pending)
const SEED_MATERIALS = [
  {
    id: 'mat_1',
    title: 'Cyber.pdf',
    fileName: 'Cyber.pdf',
    subject: 'Oral Communication',
    strand: 'HUMSS',
    grade_level: 'Grade 11',
    uploader_name: 'Benedict Callanta',
    uploaded_by_name: 'Benedict Callanta',
    uploader_role: 'Teacher',
    file_type: 'application/pdf',
    type: 'PDF',
    status: 'pending',
    created_at: '2026-09-21T10:24:00Z',
    date_formatted: 'Sep 21, 2026',
    time_formatted: '10:24 AM',
    size: '4.2 MB'
  },
  {
    id: 'mat_2',
    title: 'Chapter 2.docx',
    fileName: 'Chapter 2.docx',
    subject: 'General Mathematics',
    strand: 'STEM',
    grade_level: 'Grade 11',
    uploader_name: 'Maria Santos',
    uploaded_by_name: 'Maria Santos',
    uploader_role: 'Teacher',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    type: 'DOCX',
    status: 'approved',
    created_at: '2026-09-20T14:16:00Z',
    date_formatted: 'Sep 20, 2026',
    time_formatted: '02:16 PM',
    size: '1.8 MB'
  },
  {
    id: 'mat_3',
    title: 'Research.pptx',
    fileName: 'Research.pptx',
    subject: 'Practical Research',
    strand: 'STEM',
    grade_level: 'Grade 12',
    uploader_name: 'Juan Dela Cruz',
    uploaded_by_name: 'Juan Dela Cruz',
    uploader_role: 'Student',
    file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    type: 'PPTX',
    status: 'approved',
    created_at: '2026-09-19T14:36:00Z',
    date_formatted: 'Sep 19, 2026',
    time_formatted: '02:36 PM',
    size: '8.5 MB'
  },
  {
    id: 'mat_4',
    title: 'Data.xlsx',
    fileName: 'Data.xlsx',
    subject: 'Business Math',
    strand: 'ABM',
    grade_level: 'Grade 11',
    uploader_name: 'Anna Lopez',
    uploaded_by_name: 'Anna Lopez',
    uploader_role: 'Student',
    file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    type: 'XLSX',
    status: 'approved',
    created_at: '2026-09-18T11:20:00Z',
    date_formatted: 'Sep 18, 2026',
    time_formatted: '11:20 AM',
    size: '950 KB'
  },
  {
    id: 'mat_5',
    title: 'GroupProject.jpg',
    fileName: 'GroupProject.jpg',
    subject: 'Empowerment Technologies',
    strand: 'TVL',
    grade_level: 'Grade 12',
    uploader_name: 'Mark Santos',
    uploaded_by_name: 'Mark Santos',
    uploader_role: 'Student',
    file_type: 'image/jpeg',
    type: 'Image',
    status: 'rejected',
    created_at: '2026-09-17T09:15:00Z',
    date_formatted: 'Sep 17, 2026',
    time_formatted: '09:15 AM',
    size: '3.1 MB'
  },
  {
    id: 'mat_6',
    title: 'Resources.zip',
    fileName: 'Resources.zip',
    subject: 'Physical Science',
    strand: 'HUMSS',
    grade_level: 'Grade 11',
    uploader_name: 'Liza Martinez',
    uploaded_by_name: 'Liza Martinez',
    uploader_role: 'Teacher',
    file_type: 'application/zip',
    type: 'ZIP',
    status: 'approved',
    created_at: '2026-09-16T15:42:00Z',
    date_formatted: 'Sep 16, 2026',
    time_formatted: '03:42 PM',
    size: '24.6 MB'
  }
];

// Generate synthetic items to populate the remaining of the 128 total items
(function initSeedMaterials() {
  const subjectsPool = [
    'Oral Communication', 'General Mathematics', 'Practical Research', 'Business Math',
    'Empowerment Technologies', 'Physical Science', 'Earth Science', 'Basic Calculus',
    'Media and Information Literacy', '21st Century Literature', 'Disaster Readiness', 'Philippine Politics'
  ];
  const teacherNames = ['Benedict Callanta', 'Maria Santos', 'Liza Martinez', 'Dr. Roberto Cruz', 'Prof. Elena Diaz', 'Engr. David Reyes'];
  const studentNames = ['Juan Dela Cruz', 'Anna Lopez', 'Mark Santos', 'Patricia Garcia', 'Kevin Tan', 'Bea Ramos', 'John Doe'];
  const fileExts = [
    { ext: 'pdf', type: 'PDF', mime: 'application/pdf' },
    { ext: 'docx', type: 'DOCX', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { ext: 'pptx', type: 'PPTX', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    { ext: 'xlsx', type: 'XLSX', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { ext: 'jpg', type: 'Image', mime: 'image/jpeg' },
    { ext: 'zip', type: 'ZIP', mime: 'application/zip' }
  ];
  const strandsPool = ['STEM', 'HUMSS', 'ABM', 'TVL', 'GAS'];

  // Current count is 6. We generate up to 128 items so that:
  // Total = 128, Teacher = 87, Student = 41, Pending = 12
  let currentTeacher = 3;
  let currentStudent = 3;
  let currentPending = 1;

  for (let i = 7; i <= 128; i++) {
    const isTeacher = currentTeacher < 87 ? (currentStudent >= 41 || Math.random() < 0.68) : false;
    if (isTeacher) currentTeacher++; else currentStudent++;

    const isPending = currentPending < 12 && (128 - i <= 12 - currentPending || Math.random() < 0.12);
    if (isPending) currentPending++;

    const status = isPending ? 'pending' : (Math.random() < 0.9 ? 'approved' : 'rejected');
    const uploader = isTeacher ? teacherNames[(i - 1) % teacherNames.length] : studentNames[(i - 1) % studentNames.length];
    const sub = subjectsPool[(i - 1) % subjectsPool.length];
    const fmt = fileExts[(i - 1) % fileExts.length];
    const strand = strandsPool[(i - 1) % strandsPool.length];
    const grade = (i % 2 === 0) ? 'Grade 11' : 'Grade 12';
    const dayOffset = Math.floor((i - 1) / 3);
    const dateObj = new Date(2026, 8, Math.max(1, 21 - dayOffset), 8 + (i % 9), 10 + (i % 45));

    SEED_MATERIALS.push({
      id: `mat_${i}`,
      title: `${sub.replace(/[^a-zA-Z0-9]/g, '')}_Module_${i}.${fmt.ext}`,
      fileName: `${sub.replace(/[^a-zA-Z0-9]/g, '')}_Module_${i}.${fmt.ext}`,
      subject: sub,
      strand: strand,
      grade_level: grade,
      uploader_name: uploader,
      uploaded_by_name: uploader,
      uploader_role: isTeacher ? 'Teacher' : 'Student',
      file_type: fmt.mime,
      type: fmt.type,
      status: status,
      created_at: dateObj.toISOString(),
      date_formatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time_formatted: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      size: `${(1.2 + (i * 0.3) % 15).toFixed(1)} MB`
    });
  }
})();

function getUnifiedMaterialsList() {
  const customList = Array.isArray(materialsData) ? materialsData : [];
  const quizzesList = Array.isArray(customQuizzes) ? customQuizzes : [];

  // Format quizzes so they integrate seamlessly into Materials Manager
  const formattedQuizzes = quizzesList.map(q => {
    const d = q.createdAt ? new Date(q.createdAt) : new Date();
    const isInteractive = q.quiz_type === 'interactive' || q.type === 'interactive';
    const qCount = Array.isArray(q.questions) ? q.questions.length : (q.question_count || 10);
    return {
      id: q.id,
      title: q.title || 'Untitled Quiz',
      fileName: `${q.title || 'Quiz'}.quiz`,
      subject: q.subject || 'General',
      strand: q.strand || 'General',
      grade_level: q.grade_level || 'Grade 11',
      uploader_name: q.createdByName || q.author || 'Teacher',
      uploaded_by_name: q.createdByName || q.author || 'Teacher',
      uploader_role: 'Teacher',
      file_type: isInteractive ? 'application/quiz-interactive' : 'application/quiz',
      type: isInteractive ? 'INTERACTIVE' : 'QUIZ',
      status: q.status || 'approved',
      created_at: q.createdAt || d.toISOString(),
      date_formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time_formatted: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      size: `${qCount} Questions`,
      contentType: 'quiz',
      quiz_type: isInteractive ? 'interactive' : 'standard'
    };
  });

  // Format real materials
  const formattedDb = customList.map(m => {
    const ext = (m.file_type || m.title || '').toLowerCase();
    let type = 'PDF';
    if (ext.includes('presentation') || ext.includes('powerpoint') || ext.includes('pptx')) type = 'PPTX';
    else if (ext.includes('word') || ext.includes('document') || ext.includes('docx')) type = 'DOCX';
    else if (ext.includes('sheet') || ext.includes('excel') || ext.includes('xlsx')) type = 'XLSX';
    else if (ext.includes('image') || ext.includes('jpg') || ext.includes('png')) type = 'Image';
    else if (ext.includes('zip') || ext.includes('rar') || ext.includes('archive')) type = 'ZIP';

    const uRole = m.uploader_role || (m.uploaded_by_role ? (m.uploaded_by_role.charAt(0).toUpperCase() + m.uploaded_by_role.slice(1)) : 'Teacher');
    const d = m.created_at ? new Date(m.created_at) : new Date();

    return {
      id: m.id,
      title: m.title || 'Untitled Material',
      fileName: m.title || 'Document.pdf',
      subject: m.subject || 'General',
      strand: m.strand || 'General',
      grade_level: m.grade_level || 'Grade 11',
      uploader_name: m.uploaded_by_name || m.uploader_name || 'Faculty Member',
      uploaded_by_name: m.uploaded_by_name || m.uploader_name || 'Faculty Member',
      uploader_role: uRole,
      file_type: m.file_type || 'application/pdf',
      type: type,
      status: m.status || 'approved',
      created_at: m.created_at || d.toISOString(),
      date_formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time_formatted: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      size: m.size || '2.4 MB',
      contentType: 'material'
    };
  });

  const formattedSeeds = SEED_MATERIALS.map(s => ({
    ...s,
    contentType: s.contentType || 'material'
  }));

  // Combine real uploads & quizzes at top, followed by seed demo materials
  const combinedReal = [...formattedQuizzes, ...formattedDb];
  if (combinedReal.length === 0) {
    return formattedSeeds;
  }
  return [...combinedReal, ...formattedSeeds.slice(combinedReal.length)];
}

// ── FILTER & INTERACTIVE HANDLERS ──
function setMaterialsContentTypeFilter(type) {
  materialsContentTypeFilter = type || '';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsSearch(query) {
  materialsSearchQuery = (query || '').trim();
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsStrandFilter(strand) {
  materialsStrandFilter = strand || '';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsGradeFilter(grade) {
  materialsGradeFilter = grade || '';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsSubjectFilter(sub) {
  materialsSubjectFilter = sub || '';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsStatusFilter(st) {
  materialsStatusFilter = st || '';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsActiveTab(tab) {
  materialsActiveTab = tab || 'all';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsViewMode(mode) {
  materialsViewMode = mode || 'list';
  renderMaterialsContainer();
}

function setMaterialsPage(page) {
  materialsCurrentPage = Math.max(1, page);
  renderMaterialsContainer();
  const el = document.querySelector('.mm-table-card');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleMaterialActionMenu(event, id) {
  event.stopPropagation();
  if (activeMaterialActionMenuId === id) {
    activeMaterialActionMenuId = null;
  } else {
    activeMaterialActionMenuId = id;
  }
  renderMaterialsContainer();
}

// Global click to dismiss action menu
if (typeof window !== 'undefined') {
  window.addEventListener('click', () => {
    if (activeMaterialActionMenuId !== null) {
      activeMaterialActionMenuId = null;
      renderMaterialsContainer();
    }
  });
}

function previewOrDownloadMaterial(id) {
  const all = getUnifiedMaterialsList();
  const m = all.find(item => item.id === id);
  if (!m) return;
  if (m.contentType === 'quiz') {
    showToast(`Launching quiz "${m.title}"…`, 'info');
    if (m.quiz_type === 'interactive' && typeof openInteractiveQuiz === 'function') {
      openInteractiveQuiz(m.id);
    } else if (typeof openTakeQuizModal === 'function') {
      openTakeQuizModal(m.id);
    } else {
      showToast('Quiz launcher ready', 'success');
    }
    return;
  }
  showToast(`Opening preview for "${m.title}"…`, 'success');
  previewSubjectPdf('mat-preview', m.id);
}

function getFileTypeSvg(type) {
  const t = (type || '').toUpperCase();
  if (t === 'QUIZ') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 12l2 2 4-4"/></svg>`;
  }
  if (t === 'INTERACTIVE') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="6"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><line x1="8" y1="9.5" x2="8" y2="14.5"/><line x1="5.5" y1="12" x2="10.5" y2="12"/></svg>`;
  }
  if (t === 'PDF') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`;
  }
  if (t === 'DOCX') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="12" x2="10" y2="17"/><line x1="10" y1="17" x2="12" y2="12"/><line x1="12" y1="12" x2="14" y2="17"/><line x1="14" y1="17" x2="16" y2="12"/></svg>`;
  }
  if (t === 'PPTX') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 17V12h3a2 2 0 0 1 0 4H9"/></svg>`;
  }
  if (t === 'XLSX') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="17"/><line x1="15" y1="13" x2="9" y2="17"/></svg>`;
  }
  if (t === 'IMAGE') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`;
}

// ── MAIN MATERIALS MANAGER RENDERER ──
function renderMaterialsManagerPage(role) {
  const allMaterials = getUnifiedMaterialsList();

  // 1. Calculate Stat Cards
  const totalMaterialsCount = allMaterials.length;
  const pendingReviewCount = allMaterials.filter(m => m.status === 'pending').length;
  const teacherFilesCount = allMaterials.filter(m => (m.uploader_role || '').toLowerCase() === 'teacher').length;
  const studentFilesCount = allMaterials.filter(m => (m.uploader_role || '').toLowerCase() === 'student').length;

  // 2. Filter by Active Tab
  let filtered = allMaterials;
  if (materialsActiveTab === 'pending') {
    filtered = filtered.filter(m => m.status === 'pending');
  } else if (materialsActiveTab === 'teacher') {
    filtered = filtered.filter(m => (m.uploader_role || '').toLowerCase() === 'teacher');
  } else if (materialsActiveTab === 'student') {
    filtered = filtered.filter(m => (m.uploader_role || '').toLowerCase() === 'student');
  }

  // Content Type Filter (All content types, Quiz, Material)
  if (materialsContentTypeFilter === 'quiz') {
    filtered = filtered.filter(m => m.contentType === 'quiz');
  } else if (materialsContentTypeFilter === 'material') {
    filtered = filtered.filter(m => m.contentType !== 'quiz');
  }

  // 3. Filter by Search Query
  if (materialsSearchQuery) {
    const q = materialsSearchQuery.toLowerCase();
    filtered = filtered.filter(m => 
      (m.title && m.title.toLowerCase().includes(q)) ||
      (m.subject && m.subject.toLowerCase().includes(q)) ||
      (m.uploader_name && m.uploader_name.toLowerCase().includes(q)) ||
      (m.strand && m.strand.toLowerCase().includes(q))
    );
  }

  // 4. Filter by Strand Dropdown
  if (materialsStrandFilter) {
    filtered = filtered.filter(m => m.strand === materialsStrandFilter);
  }

  // 5. Filter by Grade Level Dropdown
  if (materialsGradeFilter) {
    filtered = filtered.filter(m => m.grade_level === materialsGradeFilter);
  }

  // 6. Filter by Subject Dropdown
  if (materialsSubjectFilter) {
    filtered = filtered.filter(m => m.subject === materialsSubjectFilter);
  }

  // 7. Filter by Status Dropdown
  if (materialsStatusFilter) {
    filtered = filtered.filter(m => m.status === materialsStatusFilter);
  }

  // Collect unique subjects for dropdown
  const uniqueSubjects = Array.from(new Set(allMaterials.map(m => m.subject).filter(Boolean))).sort();

  // 8. Pagination Calculations
  const totalFilteredCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / MATERIALS_PAGE_SIZE));
  const currentPage = Math.min(materialsCurrentPage, totalPages);
  const startIdx = (currentPage - 1) * MATERIALS_PAGE_SIZE;
  const paginatedItems = filtered.slice(startIdx, startIdx + MATERIALS_PAGE_SIZE);
  const endIdx = Math.min(startIdx + MATERIALS_PAGE_SIZE, totalFilteredCount);

  // Generate pagination buttons
  const renderPaginationBtns = () => {
    if (totalPages <= 1) return '';
    let pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages = [1, 2, 3, 4, 5, '...', totalPages];
      } else if (currentPage >= totalPages - 3) {
        pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }

    return `
      <button class="mm-pag-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="setMaterialsPage(${currentPage - 1})" title="Previous Page">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      ${pages.map(p => {
        if (p === '...') return `<span class="mm-pag-dots">…</span>`;
        const isActive = p === currentPage;
        return `<button class="mm-pag-btn ${isActive ? 'active' : ''}" onclick="setMaterialsPage(${p})">${p}</button>`;
      }).join('')}
      <button class="mm-pag-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="setMaterialsPage(${currentPage + 1})" title="Next Page">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    `;
  };

  return `
    <div class="mm-manager-wrap">
      <!-- ── TOP HEADER ── -->
      <div class="mm-header-row">
        <div class="mm-header-info">
          <h1 class="mm-page-title">Materials Manager</h1>
          <p class="mm-page-subtitle">Manage and review learning materials uploaded by teachers and students.</p>
        </div>
        <button class="mm-upload-btn" onclick="openMaterialModal()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload Material
        </button>
      </div>

      <!-- ── STATS METRIC CARDS ── -->
      <div class="mm-stats-grid">
        <!-- 1. Total Materials -->
        <div class="mm-stat-card" onclick="setMaterialsActiveTab('all')">
          <div class="mm-stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div class="mm-stat-content">
            <span class="mm-stat-label">Total Materials</span>
            <span class="mm-stat-val blue">${totalMaterialsCount}</span>
          </div>
        </div>

        <!-- 2. Pending Review -->
        <div class="mm-stat-card" onclick="setMaterialsActiveTab('pending')">
          <div class="mm-stat-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="mm-stat-content">
            <span class="mm-stat-label">Pending Review</span>
            <span class="mm-stat-val amber">${pendingReviewCount}</span>
          </div>
        </div>

        <!-- 3. Teacher Files -->
        <div class="mm-stat-card" onclick="setMaterialsActiveTab('teacher')">
          <div class="mm-stat-icon blue-user">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="mm-stat-content">
            <span class="mm-stat-label">Teacher Files</span>
            <span class="mm-stat-val blue">${teacherFilesCount}</span>
          </div>
        </div>

        <!-- 4. Student Files -->
        <div class="mm-stat-card" onclick="setMaterialsActiveTab('student')">
          <div class="mm-stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="12" y1="11" x2="12" y2="17"/></svg>
          </div>
          <div class="mm-stat-content">
            <span class="mm-stat-label">Student Files</span>
            <span class="mm-stat-val purple">${studentFilesCount}</span>
          </div>
        </div>
      </div>

      <!-- ── CONTROLS: SEARCH + DROPDOWN FILTERS + VIEW TOGGLE ── -->
      <div class="mm-controls-bar">
        <!-- Search input -->
        <div class="mm-search-wrap">
          <svg viewBox="0 0 24 24" class="mm-search-icon" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="mm-search-input" placeholder="Search by file name, subject, or uploader..." value="${escHtml(materialsSearchQuery)}" oninput="setMaterialsSearch(this.value)" />
          ${materialsSearchQuery ? `<button class="mm-search-clear" onclick="setMaterialsSearch('')" title="Clear search">&times;</button>` : ''}
        </div>

        <!-- Dropdown Filters -->
        <div class="mm-filters-group">
          <!-- Content Type (All content types, Quiz, Material) -->
          <select class="mm-filter-select" onchange="setMaterialsContentTypeFilter(this.value)">
            <option value="" ${!materialsContentTypeFilter ? 'selected' : ''}>All content types</option>
            <option value="quiz" ${materialsContentTypeFilter === 'quiz' ? 'selected' : ''}>Quiz</option>
            <option value="material" ${materialsContentTypeFilter === 'material' ? 'selected' : ''}>Material</option>
          </select>

          <!-- Strands -->
          <select class="mm-filter-select" onchange="setMaterialsStrandFilter(this.value)">
            <option value="">All Strands</option>
            ${STRANDS.map(s => `<option value="${s}" ${materialsStrandFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>

          <!-- Grades -->
          <select class="mm-filter-select" onchange="setMaterialsGradeFilter(this.value)">
            <option value="">All Grades</option>
            <option value="Grade 11" ${materialsGradeFilter === 'Grade 11' ? 'selected' : ''}>Grade 11</option>
            <option value="Grade 12" ${materialsGradeFilter === 'Grade 12' ? 'selected' : ''}>Grade 12</option>
          </select>

          <!-- Subjects -->
          <select class="mm-filter-select" onchange="setMaterialsSubjectFilter(this.value)">
            <option value="">All Subjects</option>
            ${uniqueSubjects.map(sub => `<option value="${escHtml(sub)}" ${materialsSubjectFilter === sub ? 'selected' : ''}>${escHtml(sub)}</option>`).join('')}
          </select>

          <!-- Status -->
          <select class="mm-filter-select" onchange="setMaterialsStatusFilter(this.value)">
            <option value="">All Status</option>
            <option value="pending" ${materialsStatusFilter === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="approved" ${materialsStatusFilter === 'approved' ? 'selected' : ''}>Approved</option>
            <option value="rejected" ${materialsStatusFilter === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>

        <!-- View Mode Toggle -->
        <div class="mm-view-toggle">
          <button class="mm-view-btn ${materialsViewMode === 'list' ? 'active' : ''}" onclick="setMaterialsViewMode('list')" title="List View">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button class="mm-view-btn ${materialsViewMode === 'grid' ? 'active' : ''}" onclick="setMaterialsViewMode('grid')" title="Grid View">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </button>
        </div>
      </div>

      <!-- ── TABS BAR ── -->
      <div class="mm-tabs-bar">
        <button class="mm-tab-item ${materialsActiveTab === 'all' ? 'active' : ''}" onclick="setMaterialsActiveTab('all')">
          All Materials <span class="mm-tab-count">${totalMaterialsCount}</span>
        </button>
        <button class="mm-tab-item ${materialsActiveTab === 'pending' ? 'active' : ''}" onclick="setMaterialsActiveTab('pending')">
          Pending Review <span class="mm-tab-count">${pendingReviewCount}</span>
        </button>
        <button class="mm-tab-item ${materialsActiveTab === 'teacher' ? 'active' : ''}" onclick="setMaterialsActiveTab('teacher')">
          Teacher Files <span class="mm-tab-count">${teacherFilesCount}</span>
        </button>
        <button class="mm-tab-item ${materialsActiveTab === 'student' ? 'active' : ''}" onclick="setMaterialsActiveTab('student')">
          Student Files <span class="mm-tab-count">${studentFilesCount}</span>
        </button>
      </div>

      <!-- ── MAIN CONTENT (TABLE OR GRID) ── -->
      <div class="mm-content-card">
        ${materialsViewMode === 'list' ? `
          <!-- ── DATA TABLE ── -->
          <div class="mm-table-responsive">
            <table class="mm-table">
              <thead>
                <tr>
                  <th style="width:28%;">File Name</th>
                  <th style="width:18%;">Uploader</th>
                  <th style="width:18%;">Subject</th>
                  <th style="width:10%;">Type</th>
                  <th style="width:10%;">Status</th>
                  <th style="width:10%;">Date Uploaded</th>
                  <th style="width:6%;text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${paginatedItems.length ? paginatedItems.map(m => {
                  const typeClass = (m.type || 'PDF').toLowerCase();
                  const roleClass = (m.uploader_role || 'Teacher').toLowerCase();
                  const statusClass = (m.status || 'approved').toLowerCase();
                  const isMenuOpen = activeMaterialActionMenuId === m.id;

                  return `
                    <tr class="mm-table-row">
                      <!-- 1. File Name -->
                      <td>
                        <div class="mm-file-cell">
                          <div class="mm-file-box ${typeClass}">
                            ${typeClass === 'docx' ? '<span class="mm-doc-letter">W</span>' :
                              typeClass === 'pptx' ? '<span class="mm-doc-letter">P</span>' :
                              typeClass === 'xlsx' ? '<span class="mm-doc-letter">X</span>' :
                              typeClass === 'quiz' ? getFileTypeSvg('QUIZ') :
                              typeClass === 'interactive' ? getFileTypeSvg('INTERACTIVE') :
                              typeClass === 'image' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' :
                              typeClass === 'zip' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>' :
                              getFileTypeSvg('PDF')}
                          </div>
                          <div class="mm-file-meta">
                            <span class="mm-file-name" title="${escHtml(m.title)}">${escHtml(m.title)}</span>
                            <span class="mm-file-subject">${escHtml(m.subject || 'General Subject')}</span>
                          </div>
                        </div>
                      </td>

                      <!-- 2. Uploader -->
                      <td>
                        <div class="mm-uploader-cell">
                          <span class="mm-uploader-name">${escHtml(m.uploader_name || 'Faculty Member')}</span>
                          <span class="mm-role-badge ${roleClass}">${escHtml(m.uploader_role || 'Teacher')}</span>
                        </div>
                      </td>

                      <!-- 3. Subject -->
                      <td>
                        <span class="mm-subject-text">${escHtml(m.subject || 'General')}</span>
                      </td>

                      <!-- 4. Type -->
                      <td>
                        <div class="mm-type-pill ${typeClass}">
                          <span class="mm-type-dot ${typeClass}"></span>
                          <span>${escHtml(m.type || 'PDF')}</span>
                        </div>
                      </td>

                      <!-- 5. Status -->
                      <td>
                        <span class="mm-status-pill ${statusClass}">
                          ${m.status === 'approved' ? 'Approved' : m.status === 'pending' ? 'Pending' : 'Rejected'}
                        </span>
                      </td>

                      <!-- 6. Date Uploaded -->
                      <td>
                        <div class="mm-date-cell">
                          <span class="mm-date-main">${escHtml(m.date_formatted || 'Sep 21, 2026')}</span>
                          <span class="mm-date-sub">${escHtml(m.time_formatted || '10:24 AM')}</span>
                        </div>
                      </td>

                      <!-- 7. Actions -->
                      <td style="text-align:right;">
                        <div class="mm-actions-cell">
                          <button class="mm-action-btn view-btn" onclick="previewOrDownloadMaterial('${m.id}')" title="Preview Material">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          
                          <div class="mm-action-menu-wrap">
                            <button class="mm-action-btn more-btn" onclick="toggleMaterialActionMenu(event, '${m.id}')" title="More Actions">
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                            </button>

                            ${isMenuOpen ? `
                              <div class="mm-action-dropdown">
                                <div class="mm-ad-item" onclick="previewOrDownloadMaterial('${m.id}')">
                                  <span>👁️</span> ${m.contentType === 'quiz' ? 'Take Quiz' : 'Preview'}
                                </div>
                                ${m.contentType !== 'quiz' ? `
                                  <div class="mm-ad-item" onclick="downloadSubjectPdf('mat', '${m.id}')">
                                    <span>⬇️</span> Download (${m.size || 'PDF'})
                                  </div>
                                ` : ''}
                                ${role === 'admin' && m.status === 'pending' ? `
                                  <div class="mm-ad-item" onclick="approveMaterial('${m.id}')">
                                    <span>✓</span> Approve
                                  </div>
                                  <div class="mm-ad-item reject" onclick="rejectMaterial('${m.id}')">
                                    <span>✕</span> Reject
                                  </div>
                                ` : ''}
                                ${(role === 'admin' || (CURRENT_PROFILE && m.uploaded_by === CURRENT_PROFILE.id)) ? `
                                  <div class="mm-ad-item delete" onclick="deleteMaterial('${m.id}')">
                                    <span>🗑️</span> Delete
                                  </div>
                                ` : ''}
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="7" class="mm-empty-state">
                      <div class="mm-empty-inner">
                        <span class="mm-empty-icon">📂</span>
                        <h4>No materials found</h4>
                        <p>No learning materials match your active search or filter criteria.</p>
                      </div>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        ` : `
          <!-- ── GRID VIEW CARDS ── -->
          <div class="mm-cards-grid">
            ${paginatedItems.map(m => {
              const typeClass = (m.type || 'PDF').toLowerCase();
              const roleClass = (m.uploader_role || 'Teacher').toLowerCase();
              const statusClass = (m.status || 'approved').toLowerCase();
              return `
                <div class="mm-card-item">
                  <div class="mm-card-head">
                    <div class="mm-file-box ${typeClass}">
                      ${typeClass === 'docx' ? '<span class="mm-doc-letter">W</span>' :
                        typeClass === 'pptx' ? '<span class="mm-doc-letter">P</span>' :
                        typeClass === 'xlsx' ? '<span class="mm-doc-letter">X</span>' :
                        getFileTypeSvg(m.type)}
                    </div>
                    <span class="mm-status-pill ${statusClass}">${m.status === 'approved' ? 'Approved' : m.status === 'pending' ? 'Pending' : 'Rejected'}</span>
                  </div>
                  <h4 class="mm-card-title">${escHtml(m.title)}</h4>
                  <p class="mm-card-subject">${escHtml(m.subject)} · ${escHtml(m.strand)}</p>
                  <div class="mm-card-meta">
                    <div class="mm-card-uploader">
                      <span>${escHtml(m.uploader_name)}</span>
                      <span class="mm-role-badge ${roleClass}">${escHtml(m.uploader_role)}</span>
                    </div>
                    <span class="mm-card-date">${escHtml(m.date_formatted)}</span>
                  </div>
                  <div class="mm-card-foot">
                    <button class="sw-btn outline full" onclick="previewOrDownloadMaterial('${m.id}')">${m.contentType === 'quiz' ? 'Take Quiz' : 'Preview File'}</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        <!-- ── PAGINATION BAR ── -->
        <div class="mm-pagination-row">
          <span class="mm-pagination-info">
            Showing <strong>${totalFilteredCount === 0 ? 0 : startIdx + 1}–${endIdx}</strong> of <strong>${totalFilteredCount}</strong> materials
          </span>
          <div class="mm-pagination-controls">
            ${renderPaginationBtns()}
          </div>
        </div>
      </div>
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

// Content Approval presentation state; approval and denial use the existing handlers.
const approvalView = { tab: 'pending', search: '', type: '', subject: '', page: 1 };
const APPROVAL_ARCHIVE_KEY = 'scholaria_archived_approvals';
const APPROVAL_UNARCHIVE_KEY = 'scholaria_unarchived_approvals';

function getArchivedApprovalIds() {
  try {
    return JSON.parse(localStorage.getItem(APPROVAL_ARCHIVE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function getUnarchivedApprovalIds() {
  try {
    return JSON.parse(localStorage.getItem(APPROVAL_UNARCHIVE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function isEntryArchived(kind, id, dbStatus) {
  const key = `${kind}:${id}`;
  const unarchived = getUnarchivedApprovalIds();
  if (unarchived.includes(key)) return false;
  const archived = getArchivedApprovalIds();
  if (archived.includes(key)) return true;
  return dbStatus === 'archived';
}

function toggleArchiveApprovalEntry(kind, id) {
  const key = `${kind}:${id}`;
  let archived = getArchivedApprovalIds();
  let unarchived = getUnarchivedApprovalIds();
  
  const strId = String(id);
  const isCurrentlyArchived = approvalView.tab === 'archived' || isEntryArchived(kind, id);
  
  if (isCurrentlyArchived) {
    archived = archived.filter(k => k !== key && k !== strId && !k.endsWith(`:${strId}`));
    if (!unarchived.includes(key)) unarchived.push(key);
    if (!unarchived.includes(strId)) unarchived.push(strId);
    localStorage.setItem(APPROVAL_ARCHIVE_KEY, JSON.stringify(archived));
    localStorage.setItem(APPROVAL_UNARCHIVE_KEY, JSON.stringify(unarchived));
    showToast('Item unarchived', 'success');
  } else {
    unarchived = unarchived.filter(k => k !== key && k !== strId && !k.endsWith(`:${strId}`));
    if (!archived.includes(key)) archived.push(key);
    localStorage.setItem(APPROVAL_ARCHIVE_KEY, JSON.stringify(archived));
    localStorage.setItem(APPROVAL_UNARCHIVE_KEY, JSON.stringify(unarchived));
    showToast('Item moved to Archive', 'success');
  }
  
  document.querySelectorAll('.ca-more-menu.show').forEach(m => m.classList.remove('show'));

  const wrap = document.getElementById('approvalListWrap');
  if (wrap) wrap.innerHTML = renderApprovalMaterialRows();
}

function toggleApprovalMenu(event) {
  event.stopPropagation();
  const btn = event.currentTarget || (event.target && event.target.closest('.ca-more-btn'));
  const wrap = btn ? btn.closest('.ca-more-wrap') : null;
  const menu = wrap ? wrap.querySelector('.ca-more-menu') : null;
  const isOpen = menu?.classList.contains('show');
  document.querySelectorAll('.ca-more-menu.show').forEach(m => m.classList.remove('show'));
  if (menu && !isOpen) {
    menu.classList.add('show');
  }
}

if (typeof window !== 'undefined' && !window._caMenuListenerAdded) {
  window._caMenuListenerAdded = true;
  document.addEventListener('click', () => {
    document.querySelectorAll('.ca-more-menu.show').forEach(m => m.classList.remove('show'));
  });
}

function approvalIcon(name) {
  const paths = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l5 3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    file: '<path d="M14 2H5v20h14V7z"/><path d="M14 2v6h5M8 12h8M8 16h8M8 19h5"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    dots: '<circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
    archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
}

function approvalEntries() {
  const quizzes = typeof customQuizzes !== 'undefined' ? customQuizzes : [];
  const users = typeof registeredUsers !== 'undefined' ? registeredUsers : [];
  return [
    ...materialsData.map(m => {
      const isArchived = isEntryArchived('material', m.id, m.status);
      let status = isArchived ? 'archived' : m.status;
      if (!isArchived && ['rejected', 'revision', 'needs_revision'].includes(status)) status = 'revision';
      return { id: m.id, kind: 'material', title: m.title, type: m.content_type || 'Material', subject: m.subject || 'General', name: m.uploaded_by_name || 'Unknown', date: m.created_at, status, isArchived };
    }),
    ...quizzes.map(q => {
      const isArchived = isEntryArchived('quiz', q.id, q.status);
      let status = isArchived ? 'archived' : (q.status === 'active' ? 'approved' : q.status);
      if (!isArchived && ['rejected', 'revision', 'needs_revision'].includes(status)) status = 'revision';
      return { id: q.id, kind: 'quiz', title: q.title, type: 'Quiz', subject: q.subject || 'General', name: users.find(u => u.dbId === q.createdBy)?.name || 'Unknown', date: q.createdAt, status, isArchived };
    })
  ];
}

function setApprovalView(key, value) {
  approvalView[key] = value;
  if (key !== 'page') approvalView.page = 1;
  const wrap = document.getElementById('approvalListWrap');
  if (!wrap) return;
  const position = key === 'search' ? document.getElementById('caSearch')?.selectionStart : null;
  wrap.innerHTML = renderApprovalMaterialRows();
  if (key === 'search') {
    const input = document.getElementById('caSearch');
    input.focus();
    if (position != null) input.setSelectionRange(position, position);
  }
}

async function refreshApprovalView() {
  await Promise.all([loadMaterialsFromDB(), typeof loadQuizzesFromDB === 'function' ? loadQuizzesFromDB() : Promise.resolve()]);
  const wrap = document.getElementById('approvalListWrap');
  if (wrap) wrap.innerHTML = renderApprovalMaterialRows();
  updateApprovalBadge();
}

function renderApprovalMaterialRows() {
  const entries = approvalEntries();
  const counts = status => entries.filter(e => e.status === status).length;
  const query = approvalView.search.trim().toLowerCase();
  const filtered = entries.filter(e => e.status === approvalView.tab && (!approvalView.type || e.type === approvalView.type) && (!approvalView.subject || e.subject === approvalView.subject) && (!query || `${e.title} ${e.name} ${e.subject}`.toLowerCase().includes(query)));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  approvalView.page = Math.min(pages, Math.max(1, approvalView.page));
  const offset = (approvalView.page - 1) * 5;
  const options = key => [...new Set(entries.map(e => e[key]))].filter(value => value && (key !== 'subject' || (!value.toLowerCase().includes('handout') && !value.toLowerCase().startsWith('01_')))).sort().map(value => `<option value="${escHtml(value)}" ${approvalView[key] === value ? 'selected' : ''}>${escHtml(value)}</option>`).join('');
  const rows = filtered.slice(offset, offset + 5).map(e => {
    const args = escHtml(JSON.stringify(e.kind) + ',' + JSON.stringify(String(e.id)));
    const date = new Date(e.date);
    const isItemArchived = e.status === 'archived' || e.isArchived || approvalView.tab === 'archived';
    const archiveLabel = isItemArchived ? 'Unarchive' : 'Archive';
    return `<tr>
      <td><div class="ca-content"><span class="ca-file ${e.kind}">${approvalIcon('file')}</span><div><strong>${escHtml(e.title)}</strong><small>${escHtml(e.type)} &middot; ${escHtml(e.subject)}</small></div></div></td>
      <td><div class="ca-person"><span class="ca-avatar">${escHtml(initialsFor(e.name))}</span><div>${escHtml(e.name)}<small>Teacher</small></div></div></td>
      <td class="ca-date">${Number.isNaN(date.getTime()) ? '?' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
      <td>
        <div class="ca-actions">
          <button class="ca-review" onclick="reviewApprovalEntry(${args})">${approvalIcon('eye')} Review</button>
          ${e.status === 'pending' ? `<button class="ca-approve" title="Approve" aria-label="Approve ${escHtml(e.title)}" onclick="runApprovalAction(${args},true)">${approvalIcon('check')}</button><button class="ca-reject" title="Deny" aria-label="Deny ${escHtml(e.title)}" onclick="runApprovalAction(${args},false)">${approvalIcon('close')}</button>` : ''}
          ${(e.status === 'archived' || approvalView.tab === 'archived') ? `<button class="ca-unarchive-btn" title="Unarchive" aria-label="Unarchive ${escHtml(e.title)}" onclick="toggleArchiveApprovalEntry('${e.kind}', '${escHtml(String(e.id))}')">${approvalIcon('archive')} Unarchive</button>` : ''}
          <div class="ca-more-wrap">
            <button class="ca-more-btn" title="More options" aria-label="More options" onclick="toggleApprovalMenu(event)">${approvalIcon('dots')}</button>
            <div class="ca-more-menu">
              <button class="ca-menu-item" onclick="toggleArchiveApprovalEntry('${e.kind}', '${escHtml(String(e.id))}')">${approvalIcon('archive')} ${archiveLabel}</button>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');
  return `<div class="ca-heading"><h2>Content Approval</h2><div class="ca-heading-actions"><button class="ca-button ca-primary" onclick="refreshApprovalView()">${iconRefresh()} Refresh</button></div></div>
    <div class="ca-banner"><h3>Approval Queue</h3><p>All materials and quizzes submitted by teachers require your approval before they become visible to students.</p></div>
    <div class="ca-stats">${[['pending','Pending review','clock'],['approved','Approved','check'],['revision','Needs revision','file']].map(([status,label,icon]) => `<div class="ca-stat ${status}"><div class="ca-stat-icon">${approvalIcon(icon)}</div><div><span>${label}</span><strong>${counts(status)}</strong></div></div>`).join('')}</div>
    <div class="ca-panel"><div class="ca-tabs" aria-label="Submission status">${[['pending',`Pending (${counts('pending')})`],['approved','Approved'],['revision','Needs revision'],['archived',`Archive (${counts('archived')})`]].map(([status,label]) => `<button aria-pressed="${approvalView.tab === status}" class="${approvalView.tab === status ? 'active' : ''}" onclick="setApprovalView('tab','${status}')">${label}</button>`).join('')}</div>
    <div class="ca-filters"><label class="ca-search">${approvalIcon('search')}<input id="caSearch" aria-label="Search submissions" placeholder="Search submissions..." value="${escHtml(approvalView.search)}" oninput="setApprovalView('search',this.value)"></label><select aria-label="Content type" onchange="setApprovalView('type',this.value)"><option value="">All content types</option>${options('type')}</select><select aria-label="Subject" onchange="setApprovalView('subject',this.value)"><option value="">All subjects</option>${options('subject')}</select></div>
    <div class="ca-table-wrap"><table class="ca-table"><thead><tr><th scope="col">Content</th><th scope="col">Submitted by</th><th scope="col">Date submitted</th><th scope="col">Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="ca-empty">No submissions found.</td></tr>'}</tbody></table></div>
    <div class="ca-footer"><span>Showing ${Math.min(5, filtered.length - offset)} of ${filtered.length} submissions</span><nav class="ca-pagination" aria-label="Submission pages">${approvalView.page > 1 ? `<button aria-label="Previous page" onclick="setApprovalView('page',${approvalView.page - 1})">&#8249;</button>` : ''}${Array.from({ length: Math.min(3, pages) }, (_, i) => Math.max(1, Math.min(approvalView.page - 1, pages - 2)) + i).map(page => `<button aria-label="Page ${page}" ${page === approvalView.page ? 'aria-current="page"' : ''} class="${page === approvalView.page ? 'active' : ''}" onclick="setApprovalView('page',${page})">${page}</button>`).join('')}<button aria-label="Next page" ${approvalView.page === pages ? 'disabled' : ''} onclick="setApprovalView('page',${approvalView.page + 1})">&#8250;</button></nav></div></div>`;
}

function runApprovalAction(kind, id, approve) {
  return kind === 'quiz' ? (approve ? approveQuiz(id) : rejectQuiz(id)) : (approve ? approveMaterial(id) : rejectMaterial(id));
}

async function reviewApprovalEntry(kind, id) {
  if (kind === 'material') {
    const material = materialsData.find(m => String(m.id) === id);
    if (!material) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'ca-review-dialog';
    dialog.setAttribute('aria-labelledby', 'caReviewTitle');
    dialog.innerHTML = `<form method="dialog"><button class="ca-dialog-close" aria-label="Close review">&times;</button></form><h2 id="caReviewTitle">${escHtml(material.title)}</h2><p>${escHtml(material.subject || 'General')}</p><p class="ca-file-preview" aria-live="polite">Loading file...</p>`;
    dialog.addEventListener('close', () => dialog.remove());
    document.body.appendChild(dialog);
    dialog.showModal();
    const preview = dialog.querySelector('.ca-file-preview');
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) throw new Error('Please sign in to review this file.');
      const response = await fetch(`${API_BASE}/api/materials/${encodeURIComponent(id)}/download`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to open material.');
      const url = new URL(data.url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid file URL.');
      preview.innerHTML = `<a href="${escHtml(url.href)}" target="_blank" rel="noopener noreferrer">Open submitted file</a>`;
    } catch (error) { preview.textContent = error.message; }
    return;
  }
  const quiz = customQuizzes.find(q => String(q.id) === id);
  if (!quiz) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'ca-review-dialog';
  dialog.setAttribute('aria-labelledby', 'caReviewTitle');
  dialog.innerHTML = `<form method="dialog"><button class="ca-dialog-close" aria-label="Close review">&times;</button></form><h2 id="caReviewTitle">${escHtml(quiz.title)}</h2><p>${escHtml(quiz.subject || 'General')}</p>${(quiz.questions || []).map((q, i) => `<section><h3>${i + 1}. ${escHtml(q.question || q.text || q.prompt || 'Question')}</h3>${Array.isArray(q.options) ? `<ul>${q.options.map(option => `<li>${escHtml(typeof option === 'object' && option ? option.text || option.label : option)}</li>`).join('')}</ul>` : ''}<p>Answer: ${escHtml(q.answer ?? q.correctAnswer ?? q.correct_answer ?? 'Not provided')}</p></section>`).join('') || '<p>No questions available.</p>'}`;
  dialog.addEventListener('close', () => dialog.remove());
  document.body.appendChild(dialog);
  dialog.showModal();
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
  if (file && file.size > 50 * 1024 * 1024) {
    showToast('File is too large — maximum file size is 50MB only', 'error');
    input.value = '';
    return;
  }
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
          <div class="dz-sub">PDF, DOCX, or PPTX — maximum file size: 50MB only</div>
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
