/* ── SIDEBAR, NAVIGATION ROUTER & SHELL INIT ── */

const SIDEBAR = {
  student: [
    { page: 'dashboard',  label: 'Dashboard',    icon: iconHome() },
    { page: 'materials',  label: 'My Materials', icon: iconFolder() },
    { page: 'quizzes',    label: 'Quizzes',      icon: iconQuiz() },
    { page: 'progress',   label: 'My Progress',  icon: iconProgress() },
    { page: 'chats',      label: 'Chats',        icon: iconChat() },
    { page: 'profile',    label: 'My Profile',   icon: iconProfile() },
  ],
  teacher: [
    { page: 'dashboard',  label: 'Dashboard',       icon: iconHome() },
    { page: 'materials',  label: 'Materials Manager',icon: iconFolder() },
    { page: 'quiz',       label: 'Quiz Manager',     icon: iconQuiz() },
    { page: 'analysis',   label: 'Item Analysis',    icon: iconChart() },
    { page: 'classrec',   label: 'Class Record',     icon: iconRecord() },
    { page: 'chats',      label: 'Chats',            icon: iconChat() },
    { page: 'profile',    label: 'My Profile',       icon: iconProfile() },
  ],
  admin: [
    { page: 'dashboard',  label: 'Dashboard',       icon: iconHome() },
    { page: 'materials',  label: 'Materials Manager',icon: iconFolder() },
    { page: 'approval',   label: 'Content Approval', icon: iconApproval() },
    { page: 'users',      label: 'User Management',  icon: iconUsers() },
    { page: 'reports',    label: 'Reports',          icon: iconChart() },
    { page: 'chats',      label: 'Chats',            icon: iconChat() },
    { page: 'profile',    label: 'My Profile',       icon: iconProfile() },
  ]
};

const ROLE_LABEL = { student: 'Student Portal', teacher: 'Teacher Portal', admin: 'Admin Portal' };

function initDashboardShell() {
  document.getElementById('userName').textContent = CURRENT_PROFILE.full_name;
  document.getElementById('userAvatar').textContent = initialsFor(CURRENT_PROFILE.full_name);

  if (CURRENT_PROFILE.is_demo) {
    document.body.classList.add('has-demo-banner');
    if (!document.querySelector('.demo-mode-banner')) {
      const banner = document.createElement('div');
      banner.className = 'demo-mode-banner';
      banner.textContent = `You're viewing a demo ${ROLE} account — sample data only, nothing here is a real student's record.`;
      document.body.prepend(banner);
    }
  } else {
    document.body.classList.remove('has-demo-banner');
    const existingBanner = document.querySelector('.demo-mode-banner');
    if (existingBanner) existingBanner.remove();
  }

  const sidebarMenu = document.getElementById('sidebarMenu');
  sidebarMenu.innerHTML = '';
  SIDEBAR[ROLE].forEach(item => {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'menu-item' + (item.page === 'dashboard' ? ' active' : '');
    a.dataset.page = item.page;
    a.innerHTML = item.icon + `<span>${item.label}</span>` + (item.badge ? `<span class="menu-badge">${item.badge}</span>` : '');
    sidebarMenu.appendChild(a);
  });

  renderPage('dashboard');
  refreshNotificationsUI();
  loadConversationsFromDB().then(ensureChatRealtimeSubscription);
}

function getPageContent(role, page) {
  if (role === 'student') return studentPage(page);
  if (role === 'teacher') return teacherPage(page);
  if (role === 'admin')   return adminPage(page);
  return '';
}

/* ── STUDENT PAGES ── */
function studentPage(page) {
  switch(page) {
    case 'dashboard': {
      const mySubjects = [...new Set(materialsData.map(m => m.subject).filter(Boolean))];
      const recentMaterials = materialsData.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 2);
      const attemptedQuizIds = new Set(myQuizAttempts.map(a => a.quiz_id));
      const availableQuizzes = customQuizzes.filter(q =>
        (q.status === 'active' || q.status === 'approved' || q.status === 'pending' || q.isDemo || q.is_demo) &&
        !attemptedQuizIds.has(q.id)
      );
      const latestAttempt = myQuizAttempts[0] || null;
      const latestQuizTitle = latestAttempt ? (customQuizzes.find(q => q.id === latestAttempt.quiz_id)?.title || 'Quiz') : null;
      const latestScorePct = latestAttempt && latestAttempt.total_items ? Math.round((latestAttempt.score / latestAttempt.total_items) * 100) : null;

      const enrolledCoursesCount = typeof isCourseOpenForStudent === 'function' 
        ? COURSES_DATABASE.filter(c => isCourseOpenForStudent(c)).length 
        : (mySubjects.length || 9);

      return `
      <div class="welcome-banner">
        <div class="banner-content">
          <div class="welcome-text-box">
            <h1>WELCOME BACK</h1>
            <h2>Haven of Wisdom Academy — Student Portal</h2>
          </div>
          <div class="rainbow-trails"><div class="trail blue-trail"></div><div class="trail yellow-trail"></div></div>
        </div>
      </div>
      <div class="card-grid">
        <div class="info-card">
          <div class="ic-head">
            <div class="ic-icon">${iconFolder()}</div>
            <div><div class="ic-sub">Enrolled Subjects</div><div class="ic-num">${enrolledCoursesCount}</div></div>
          </div>
          <p>Strand: ${escHtml(CURRENT_PROFILE.strand || 'STEM')} — ${escHtml(CURRENT_PROFILE.grade_level || 'Grade 12')}</p>
        </div>
        <div class="info-card">
          <div class="ic-head">
            <div class="ic-icon gold">${iconQuiz()}</div>
            <div><div class="ic-sub">Available Quizzes</div><div class="ic-num gold">${availableQuizzes.length}</div></div>
          </div>
          <p>Quizzes waiting to be taken</p>
        </div>
        <div class="info-card">
          <div class="ic-head">
            <div class="ic-icon green">${iconProgress()}</div>
            <div><div class="ic-sub">Latest Score</div><div class="ic-num green">${latestScorePct !== null ? latestScorePct + '%' : '—'}</div></div>
          </div>
          <p>${latestAttempt ? escHtml(latestQuizTitle) : 'No quizzes taken yet'}</p>
        </div>
      </div>
      <div id="coursesWidgetContainer">
        ${typeof renderCoursesWidgetHTML === 'function' ? renderCoursesWidgetHTML() : ''}
      </div>
      <div>
        <div class="section-hdr"><h2>Recently Uploaded Materials</h2></div>
        <div class="file-list">
          ${recentMaterials.length ? recentMaterials.map(m => `
            <div class="file-row">
              <div class="file-icon ${fileIconClass(m.file_type)}">${fileIconSvg()}</div>
              <div class="file-info"><h4>${escHtml(m.title)}</h4><span>${new Date(m.created_at).toLocaleDateString()} · ${escHtml(m.subject || 'General')}</span></div>
              <button class="dl-btn" onclick="downloadMaterial('${m.id}')">Download</button>
            </div>`).join('') : `<p style="padding:20px;color:var(--text-muted);font-size:13px;">No materials for your strand yet.</p>`}
        </div>
      </div>
      <div>
        <div class="section-hdr"><h2>Available Quizzes</h2></div>
        <div class="quiz-list">
          ${availableQuizzes.length ? availableQuizzes.map(q => {
            const isInteractive = q.type === 'interactive' || q.questions?.[0]?._quiz_type === 'interactive';
            return `<div class="quiz-row">
              <div class="qz-info"><h4>${escHtml(q.title)}</h4><span>${escHtml(q.meta)}</span></div>
              <button class="take-btn" ${isInteractive ? 'style="background:linear-gradient(135deg, #2563eb, #7c3aed);"' : ''} onclick="openTakeQuizModal('${q.id}')">${isInteractive ? '⚡ Play Interactive' : 'Take Quiz'}</button>
            </div>`;
          }).join('')
            : `<p style="padding:20px;color:var(--text-muted);font-size:13px;">No quizzes available right now.</p>`}
        </div>
      </div>`;
    }

    case 'materials': return `
      <div id="materialsListWrap">${renderMaterialsList('student')}</div>`;

    case 'quizzes': {
      const attemptsByQuiz = new Map(myQuizAttempts.map(a => [a.quiz_id, a]));
      const visibleQuizzes = customQuizzes.filter(q =>
        (q.status === 'active' || q.status === 'approved' || q.status === 'pending' || q.status === 'closed' || q.isDemo || q.is_demo)
      );
      return `
      <div class="section-hdr"><h2>Quizzes</h2></div>
      <div class="quiz-list">
        ${visibleQuizzes.length ? visibleQuizzes.map(q => {
          const attempt = attemptsByQuiz.get(q.id);
          const pct = attempt && attempt.total_items ? Math.round((attempt.score / attempt.total_items) * 100) : null;
          const isInteractive = q.type === 'interactive' || q.questions?.[0]?._quiz_type === 'interactive';
          const btnText = attempt ? 'Review' : (isInteractive ? '⚡ Play Interactive' : 'Take Quiz');
          return `<div class="quiz-row">
            <div class="qz-info"><h4>${escHtml(q.title)}</h4><span>${escHtml(q.meta)}${attempt ? ' · Score: ' + pct + '%' : ''}</span></div>
            <span class="status-pill ${attempt ? 'done' : 'pending'}">${attempt ? 'Completed' : 'Pending'}</span>
            <button class="take-btn" ${attempt ? 'style="background:#059669;"' : (isInteractive ? 'style="background:linear-gradient(135deg, #2563eb, #7c3aed);"' : '')} onclick="${attempt ? `openReviewAttempt('${q.id}')` : `openTakeQuizModal('${q.id}')`}">${btnText}</button>
          </div>`;
        }).join('')
          : `<p style="padding:20px;color:var(--text-muted);font-size:13px;">No quizzes available right now.</p>`}
      </div>`;
    }

    case 'progress': return `
      <div class="section-hdr"><h2>My Progress</h2></div>
      <div class="score-table">
        <table>
          <thead><tr><th>Subject</th><th>Assessment</th><th>Type</th><th>Quarter</th><th>Score</th></tr></thead>
          <tbody>
            <tr><td>Web Systems & Technologies</td><td>Quiz 2</td><td>Quiz</td><td>Q1</td><td class="score-val good">88 / 100</td></tr>
            <tr><td>Computer Programming</td><td>Quiz 1</td><td>Quiz</td><td>Q1</td><td class="score-val good">92 / 100</td></tr>
            <tr><td>Cybersecurity Fundamentals</td><td>Seatwork 1</td><td>Seatwork</td><td>Q1</td><td class="score-val">75 / 100</td></tr>
            <tr><td>Database Management</td><td>Performance Task 1</td><td>Performance Task</td><td>Q1</td><td class="score-val good">95 / 100</td></tr>
            <tr><td>Web Systems & Technologies</td><td>Seatwork 2</td><td>Seatwork</td><td>Q1</td><td class="score-val low">60 / 100</td></tr>
          </tbody>
        </table>
      </div>`;

    case 'chats': return buildChatPage('student');

    case 'profile': return `
      <div class="section-hdr"><h2>My Profile</h2></div>
      <div class="profile-form">
        <div class="pf-field"><label>Full Name</label><input value="${escHtml(CURRENT_PROFILE.full_name)}"/></div>
        <div class="pf-field"><label>Student ID</label><input value="${escHtml(CURRENT_PROFILE.id.slice(0,8))}" readonly/></div>
        <div class="pf-field"><label>Strand</label><input value="${escHtml(CURRENT_PROFILE.strand || 'ICT')}"/></div>
        <div class="pf-field"><label>Grade Level</label><input value="${escHtml(CURRENT_PROFILE.grade_level || 'Grade 12')}"/></div>
        <div class="pf-field"><label>Email</label><input value="${escHtml(CURRENT_PROFILE.email || '')}"/></div>
        <div class="pf-field"><label>New Password</label><input type="password" placeholder="Leave blank to keep current"/></div>
        <button class="pf-save" onclick="showToast('Profile updated', 'success')">Save Changes</button>
      </div>`;

    default: return '<p>Page not found.</p>';
  }
}

/* ── TEACHER PAGES ── */
let classRecSectionFilter = '';
function setClassRecSectionFilter(sec) {
  classRecSectionFilter = sec;
  renderPage('classrec');
}

function teacherPage(page) {
  switch(page) {
    case 'dashboard': {
      const myMaterials = materialsData.filter(m => m.uploaded_by === CURRENT_PROFILE.id);
      const myPendingMaterials = myMaterials.filter(m => m.status === 'pending').length;
      const myQuizzes = customQuizzes.filter(q => q.createdBy === CURRENT_PROFILE.id);
      const myActiveQuizzes = myQuizzes.filter(q => q.status === 'active');
      const myStrands = (CURRENT_PROFILE.subjects || CURRENT_PROFILE.strand || '').split(',').map(s => s.trim()).filter(Boolean);
      const recentMaterials = myMaterials.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);

      return `
      <div class="welcome-banner">
        <div class="banner-content">
          <div class="welcome-text-box">
            <h1>WELCOME BACK</h1>
            <h2>Haven of Wisdom Academy — Teacher Portal</h2>
          </div>
          <div class="rainbow-trails"><div class="trail blue-trail"></div><div class="trail yellow-trail"></div></div>
        </div>
      </div>
      <div class="card-grid">
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon">${iconUsers()}</div><div><div class="ic-sub">My Classes</div><div class="ic-num">${myStrands.length || 3}</div></div></div>
          <p>${myStrands.length ? escHtml(myStrands.join(', ')) : 'ICT, CS, TVL — Grade 11 & 12'}</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon gold">${iconFolder()}</div><div><div class="ic-sub">Materials Uploaded</div><div class="ic-num gold">${myMaterials.length || 12}</div></div></div>
          <p>${myPendingMaterials || 2} pending admin approval</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon green">${iconQuiz()}</div><div><div class="ic-sub">Active Quizzes</div><div class="ic-num green">${myActiveQuizzes.length || 3}</div></div></div>
          <p>${myQuizzes.length || 3} total across all handled subjects</p>
        </div>
      </div>
      <div id="coursesWidgetContainer">
        ${typeof renderCoursesWidgetHTML === 'function' ? renderCoursesWidgetHTML() : ''}
      </div>
      <div>
        <div class="section-hdr"><h2>Recent Materials</h2></div>
        <div class="file-list">
          ${recentMaterials.length ? recentMaterials.map(m => `
            <div class="file-row">
              <div class="file-icon ${fileIconClass(m.file_type)}">${fileIconSvg()}</div>
              <div class="file-info"><h4>${escHtml(m.title)}</h4><span>${escHtml(m.subject || 'General')} · Status: ${m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span></div>
              <span class="status-pill ${m.status === 'approved' ? 'done' : m.status === 'rejected' ? 'low' : 'pending'}">${m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span>
            </div>`).join('') : `<p style="padding:20px;color:var(--text-muted);font-size:13px;">You haven't uploaded any materials yet.</p>`}
        </div>
      </div>
      <div>
        <div class="section-hdr"><h2>Active Quizzes</h2></div>
        <div class="quiz-list">
          ${myActiveQuizzes.length ? myActiveQuizzes.map(q => `
            <div class="quiz-row"><div class="qz-info"><h4>${escHtml(q.title)}</h4><span>${escHtml(q.meta)}</span></div><span class="status-pill ongoing">Active</span></div>`).join('')
            : `<p style="padding:20px;color:var(--text-muted);font-size:13px;">No active quizzes right now.</p>`}
        </div>
      </div>`;
    }

    case 'materials': return `
      <div class="section-hdr"><h2>Materials Manager</h2>
        <div style="display:flex;gap:10px;align-items:center;">
          <select class="user-filter-select" onchange="setMaterialsStrandFilter(this.value)">
            <option value="">All Strands</option>
            ${STRANDS.map(s => `<option value="${s}" ${materialsStrandFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="add-btn" onclick="openMaterialModal()">${iconPlus()} Upload Material</button>
        </div>
      </div>
      <div id="materialsListWrap">${renderMaterialsList('teacher')}</div>`;

    case 'quiz': {
      const myQuizzes = customQuizzes.filter(q => q.createdBy === CURRENT_PROFILE.id);
      return `
      <div class="section-hdr"><h2>Quiz Manager</h2>
        <button class="add-btn" onclick="openQuizModal()">${iconPlus()} Create Quiz</button>
      </div>
      <div class="quiz-list">
        ${myQuizzes.length ? myQuizzes.map(q => `<div class="quiz-row"><div class="qz-info"><h4>${escHtml(q.title)}</h4><span>${escHtml(q.meta)}</span></div><span class="status-pill ${q.isDemo ? 'demo' : q.status === 'active' ? 'ongoing' : q.status === 'closed' ? 'done' : 'pending'}">${q.isDemo ? 'Demo' : q.status.charAt(0).toUpperCase() + q.status.slice(1)}</span></div>`).join('')
          : `<p style="padding:20px;color:var(--text-muted);font-size:13px;">You haven't created any quizzes yet.</p>`}
      </div>`;
    }

    case 'analysis': {
      const myQuizzesForAnalysis = customQuizzes.filter(q => q.createdBy === CURRENT_PROFILE.id);
      if (!myQuizzesForAnalysis.length) {
        return `<div class="section-hdr"><h2>Item Analysis Report</h2></div>
          <p style="padding:20px;color:var(--text-muted);font-size:13px;">You haven't created any quizzes yet — create one in Quiz Manager first.</p>`;
      }
      if (!analysisSelectedQuizId || !myQuizzesForAnalysis.some(q => q.id === analysisSelectedQuizId)) {
        analysisSelectedQuizId = myQuizzesForAnalysis[0].id;
      }
      const selectedQuiz = myQuizzesForAnalysis.find(q => q.id === analysisSelectedQuizId);
      if (!(analysisSelectedQuizId in analysisAttemptsCache)) loadAttemptsForAnalysis(analysisSelectedQuizId);

      const attempts = analysisAttemptsCache[analysisSelectedQuizId] || [];
      const rows = buildAnalysisRows(selectedQuiz, attempts);
      const attemptCount = attempts.length;
      const avgScore = attemptCount
        ? Math.round(attempts.reduce((sum, a) => sum + (a.total_items ? (a.score / a.total_items) * 100 : 0), 0) / attemptCount)
        : null;

      return `
      <div class="section-hdr"><h2>Item Analysis Report</h2>
        <div style="display:flex;gap:10px;align-items:center;">
          <select class="user-filter-select" onchange="setAnalysisSectionFilter(this.value)">
            <option value="">All Sections (Demo)</option>
            ${SECTIONS.map(sec => `<option value="${sec}" ${analysisSectionFilter === sec ? 'selected' : ''}>${sec} (Demo)</option>`).join('')}
          </select>
          <select class="user-filter-select" onchange="setAnalysisQuiz(this.value)">
            ${myQuizzesForAnalysis.map(q => `<option value="${q.id}" ${q.id === analysisSelectedQuizId ? 'selected' : ''}>${escHtml(q.title)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="announcement-card" style="margin-bottom:0;">
        <h3>${escHtml(selectedQuiz.title)}</h3>
        <p>${attemptCount} submission${attemptCount === 1 ? '' : 's'}${analysisSectionFilter ? ' · ' + escHtml(analysisSectionFilter) + ' (Demo)' : ''} · ${escHtml(selectedQuiz.status)}${attemptCount ? ' · Average Score: ' + avgScore + '%' : ''}</p>
        <div class="ann-meta">Recomputed live from actual submitted quiz attempts — refreshes each time you open this page.</div>
      </div>
      <div class="score-table">
        <table>
          <thead><tr><th>#</th><th>Question</th><th>Correct</th><th>Incorrect</th><th>% Correct</th><th>Difficulty</th></tr></thead>
          <tbody>
            ${rows.length ? rows.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${escHtml(r.label)}</td>
                <td>${r.correct}</td>
                <td>${r.incorrect}</td>
                <td><span class="analysis-bar-wrap"><span class="analysis-bar ${r.pct >= 80 ? 'high' : r.pct < 50 ? 'low' : ''}" style="width:${r.pct}%"></span></span> ${r.pct}%</td>
                <td style="color:${r.pct >= 80 ? '#059669' : r.pct < 50 ? '#dc2626' : '#2563eb'};font-weight:700;">${r.correct + r.incorrect === 0 ? '—' : r.pct >= 80 ? 'Easy' : r.pct < 50 ? 'Difficult' : 'Average'}</td>
              </tr>`).join('')
              : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">No submissions yet for this quiz.</td></tr>`}
          </tbody>
        </table>
      </div>`;
    }

    case 'classrec': {
      const allEntries = [
        { name: 'Asis, J.', section: 'Section A', subject: 'Web Systems', q1: 85, q2: 88, sw: 80, pt: 90, avg: 85.75 },
        { name: 'Callanta, B.', section: 'Section A', subject: 'Web Systems', q1: 90, q2: 92, sw: 88, pt: 95, avg: 91.25 },
        { name: 'Cervas, S.', section: 'Section B', subject: 'Web Systems', q1: 78, q2: 75, sw: 60, pt: 72, avg: 71.25 },
        { name: 'Esguerra, M.', section: 'Section C', subject: 'Web Systems', q1: 88, q2: 91, sw: 82, pt: 87, avg: 87.00 }
      ];
      const filteredEntries = classRecSectionFilter
        ? allEntries.filter(e => e.section === classRecSectionFilter)
        : allEntries;

      return `
      <div class="section-hdr"><h2>Class Record</h2>
        <div style="display:flex;gap:10px;align-items:center;">
          <select class="user-filter-select" onchange="setClassRecSectionFilter(this.value)">
            <option value="">All Sections (Demo)</option>
            ${SECTIONS.map(sec => `<option value="${sec}" ${classRecSectionFilter === sec ? 'selected' : ''}>${sec} (Demo)</option>`).join('')}
          </select>
          <button class="add-btn">${iconPlus()} Add Entry</button>
        </div>
      </div>
      <div class="score-table">
        <table>
          <thead><tr><th>Student</th><th>Section</th><th>Subject</th><th>Quiz 1</th><th>Quiz 2</th><th>Seatwork</th><th>Perf. Task</th><th>Average</th></tr></thead>
          <tbody>
            ${filteredEntries.length ? filteredEntries.map(e => `
              <tr>
                <td>${escHtml(e.name)}</td>
                <td><span class="user-role-badge student">${escHtml(e.section)}</span></td>
                <td>${escHtml(e.subject)}</td>
                <td class="score-val ${e.q1 >= 88 ? 'good' : e.q1 < 75 ? 'low' : ''}">${e.q1}</td>
                <td class="score-val ${e.q2 >= 88 ? 'good' : e.q2 < 75 ? 'low' : ''}">${e.q2}</td>
                <td class="score-val ${e.sw >= 88 ? 'good' : e.sw < 75 ? 'low' : ''}">${e.sw}</td>
                <td class="score-val ${e.pt >= 88 ? 'good' : e.pt < 75 ? 'low' : ''}">${e.pt}</td>
                <td class="score-val ${e.avg >= 85 ? 'good' : e.avg < 75 ? 'low' : ''}">${e.avg.toFixed(2)}</td>
              </tr>`).join('')
              : `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px;">No student records found for ${escHtml(classRecSectionFilter)}.</td></tr>`}
          </tbody>
        </table>
      </div>`;
    }

    case 'chats': return buildChatPage('teacher');

    case 'profile': return `
      <div class="section-hdr"><h2>My Profile</h2></div>
      <div class="profile-form">
        <div class="pf-field"><label>Full Name</label><input value="${escHtml(CURRENT_PROFILE.full_name)}"/></div>
        <div class="pf-field"><label>Teacher ID</label><input value="${escHtml(CURRENT_PROFILE.id.slice(0,8))}" readonly/></div>
        <div class="pf-field"><label>Handled Subjects</label><input value="${escHtml(CURRENT_PROFILE.subjects || 'Web Systems, Programming')}"/></div>
        <div class="pf-field"><label>Strand / Grade Level</label><input value="${escHtml(CURRENT_PROFILE.strand || 'ICT')}"/></div>
        <div class="pf-field"><label>Email</label><input value="${escHtml(CURRENT_PROFILE.email || '')}"/></div>
        <div class="pf-field"><label>New Password</label><input type="password" placeholder="Leave blank to keep current"/></div>
        <button class="pf-save" onclick="showToast('Profile updated', 'success')">Save Changes</button>
      </div>`;

    default: return '<p>Page not found.</p>';
  }
}

/* ── ADMIN PAGES ── */
function adminPage(page) {
  switch(page) {
    case 'dashboard': {
      const pendingMaterials = materialsData.filter(m => m.status === 'pending');
      const pendingQuizzes = customQuizzes.filter(q => q.status === 'pending');
      const totalStudents = registeredUsers.filter(u => u.role === 'student').length;
      const totalTeachers = registeredUsers.filter(u => u.role === 'teacher').length;
      const totalAdmins = registeredUsers.filter(u => u.role === 'admin').length;
      const activeQuizzes = customQuizzes.filter(q => q.status === 'active');

      const permMuted = registeredUsers.filter(u => u.permanentlyMuted).length;
      const tempMuted = registeredUsers.filter(u => !u.permanentlyMuted && u.mutedUntil && new Date(u.mutedUntil) > new Date()).length;
      const totalMuted = permMuted + tempMuted;

      const recentApproved = [
        ...materialsData.filter(m => m.status === 'approved').map(m => ({
          title: m.title, type: 'Material', by: m.uploaded_by_name || '', at: m.created_at
        })),
        ...customQuizzes.filter(q => q.status === 'approved' || q.status === 'active').map(q => ({
          title: q.title, type: 'Quiz', by: registeredUsers.find(u => u.dbId === q.createdBy)?.name || '', at: q.createdAt
        }))
      ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 5);

      return `
      <div class="welcome-banner">
        <div class="banner-content">
          <div class="welcome-text-box">
            <h1>ADMIN DASHBOARD</h1>
            <h2>Haven of Wisdom Academy — SHS Department</h2>
          </div>
          <div class="rainbow-trails"><div class="trail blue-trail"></div><div class="trail yellow-trail"></div></div>
        </div>
      </div>
      <div class="card-grid">
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon gold">${iconApproval()}</div><div><div class="ic-sub">Pending Approvals</div><div class="ic-num gold">${pendingMaterials.length + pendingQuizzes.length}</div></div></div>
          <p>${pendingMaterials.length} material${pendingMaterials.length !== 1 ? 's' : ''}, ${pendingQuizzes.length} quiz${pendingQuizzes.length !== 1 ? 'zes' : ''} awaiting review</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon">${iconUsers()}</div><div><div class="ic-sub">Total Users</div><div class="ic-num">${registeredUsers.length}</div></div></div>
          <p>${totalStudents} student${totalStudents !== 1 ? 's' : ''} · ${totalTeachers} teacher${totalTeachers !== 1 ? 's' : ''}${totalAdmins > 0 ? ` · ${totalAdmins} admin${totalAdmins !== 1 ? 's' : ''}` : ''}</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon green">${iconQuiz()}</div><div><div class="ic-sub">Active Quizzes</div><div class="ic-num green">${activeQuizzes.length}</div></div></div>
          <p>Across all strands and grade levels</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon red">${iconMute()}</div><div><div class="ic-sub">Muted Accounts</div><div class="ic-num red">${totalMuted}</div></div></div>
          <p>${totalMuted} temporary account${totalMuted !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div>
        <div class="section-hdr"><h2>Recently Approved Content</h2></div>
        <div class="quiz-list">
          ${recentApproved.length ? recentApproved.map(item => `
            <div class="quiz-row"><div class="qz-info"><h4>${escHtml(item.title)}</h4><span>${item.type}${item.by ? ' · Teacher: ' + escHtml(item.by) : ''} · Approved ${new Date(item.at).toLocaleDateString()}</span></div><span class="status-pill done">Approved</span></div>`).join('')
            : `<p style="padding:20px;color:var(--text-muted);font-size:13px;">Nothing approved yet.</p>`}
        </div>
      </div>`;
    }

    case 'materials': return `
      <div class="section-hdr"><h2>Materials Manager</h2>
        <div style="display:flex;gap:10px;align-items:center;">
          <select class="user-filter-select" onchange="setMaterialsStrandFilter(this.value)">
            <option value="">All Strands</option>
            ${STRANDS.map(s => `<option value="${s}" ${materialsStrandFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="add-btn" style="background:var(--blue-light);color:var(--blue);" onclick="loadMaterialsFromDB()">${iconRefresh()} Refresh</button>
          <button class="add-btn" onclick="openMaterialModal()">${iconPlus()} Upload Material</button>
        </div>
      </div>
      <div class="mm-tabs">
        <button class="mm-tab ${materialsAdminTab === 'all' ? 'active' : ''}" onclick="setMaterialsAdminTab('all')">All${materialsData.length ? ` (${materialsData.length})` : ''}</button>
        <button class="mm-tab ${materialsAdminTab === 'pending' ? 'active' : ''}" onclick="setMaterialsAdminTab('pending')">Pending${materialsData.filter(m=>m.status==='pending').length ? ` (${materialsData.filter(m=>m.status==='pending').length})` : ''}</button>
        <button class="mm-tab ${materialsAdminTab === 'approved' ? 'active' : ''}" onclick="setMaterialsAdminTab('approved')">Approved${materialsData.filter(m=>m.status==='approved').length ? ` (${materialsData.filter(m=>m.status==='approved').length})` : ''}</button>
      </div>
      <div id="materialsListWrap">${renderMaterialsList('admin')}</div>`;

    case 'approval': return `
      <div class="section-hdr"><h2>Content Approval</h2>
        <button class="add-btn" onclick="loadMaterialsFromDB()">${iconRefresh()} Refresh</button>
      </div>
      <div class="announcement-card" style="margin-bottom:4px;">
        <h3>Approval Queue</h3>
        <p>All materials and quizzes submitted by teachers require your approval before they become visible to students.</p>
      </div>
      <div id="approvalListWrap">
        ${renderApprovalMaterialRows()}
      </div>`;

    case 'users': return `
      <div class="section-hdr"><h2>User Management</h2>
        <button class="add-btn" onclick="openAddUserModal()">${iconPlus()} Add User</button>
      </div>
      <div class="user-search-row">
        <div class="user-search-wrap">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" id="userSearchInput" placeholder="Search by name, ID, or strand…" oninput="filterUserTable()">
        </div>
        <select class="user-filter-select" id="userRoleFilter" onchange="filterUserTable()">
          <option value="">All Roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
        </select>
        <select class="user-filter-select" id="userStrandFilter" onchange="filterUserTable()">
          <option value="">All Strands</option>
          <option value="STEM">STEM</option>
          <option value="HUMSS">HUMSS</option>
          <option value="ABM">ABM</option>
        </select>
      </div>
      <div class="user-table" id="userTableWrap">
        <table>
          <thead><tr><th>Name</th><th>ID</th><th>Role</th><th>Strand / Subject</th><th>Chat Status</th><th>Actions</th></tr></thead>
          <tbody id="userTableBody">
            ${registeredUsers.map(u => renderUserRow(u)).join('')}
          </tbody>
        </table>
        <div id="userNoResults" style="display:none;padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No users match your search.</div>
      </div>`;

    case 'reports': return `
      <div class="section-hdr"><h2>Academic Reports</h2></div>
      <div class="card-grid">
        <div class="info-card"><div class="ic-head"><div class="ic-icon green">${iconProgress()}</div><div><div class="ic-sub">System-Wide Average</div><div class="ic-num green">82%</div></div></div><p>Across all quizzes and assessments</p></div>
        <div class="info-card"><div class="ic-head"><div class="ic-icon">${iconQuiz()}</div><div><div class="ic-sub">Quizzes Completed</div><div class="ic-num">18</div></div></div><p>All strands and grade levels</p></div>
        <div class="info-card"><div class="ic-head"><div class="ic-icon gold">${iconChart()}</div><div><div class="ic-sub">Item Analysis Reports</div><div class="ic-num gold">6</div></div></div><p>Generated across all subjects</p></div>
      </div>
      <div>
        <div class="section-hdr"><h2>Score Summary by Strand</h2></div>
        <div class="score-table">
          <table>
            <thead><tr><th>Strand</th><th>Grade Level</th><th>Students</th><th>Avg Quiz Score</th><th>Avg Seatwork</th></tr></thead>
            <tbody>
              <tr><td>ICT</td><td>Grade 12</td><td>6</td><td class="score-val good">85.50%</td><td class="score-val good">83.00%</td></tr>
              <tr><td>ICT</td><td>Grade 11</td><td>5</td><td class="score-val">78.20%</td><td class="score-val">76.40%</td></tr>
              <tr><td>HUMSS</td><td>Grade 12</td><td>5</td><td class="score-val">80.10%</td><td class="score-val good">81.50%</td></tr>
              <tr><td>ABM</td><td>Grade 11</td><td>4</td><td class="score-val low">72.30%</td><td class="score-val">74.00%</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;

    case 'chats': return buildChatPage('admin');

    case 'profile': return `
      <div class="section-hdr"><h2>My Profile</h2></div>
      <div class="profile-form">
        <div class="pf-field"><label>Full Name</label><input value="${escHtml(CURRENT_PROFILE.full_name)}"/></div>
        <div class="pf-field"><label>Admin ID</label><input value="${escHtml(CURRENT_PROFILE.id.slice(0,8))}" readonly/></div>
        <div class="pf-field"><label>Position</label><input value="SHS Department Head" readonly/></div>
        <div class="pf-field"><label>Managed School</label><input value="Haven of Wisdom Academy, Inc." readonly/></div>
        <div class="pf-field"><label>Email</label><input value="${escHtml(CURRENT_PROFILE.email || '')}"/></div>
        <div class="pf-field"><label>New Password</label><input type="password" placeholder="Leave blank to keep current"/></div>
        <button class="pf-save" onclick="showToast('Profile updated', 'success')">Save Changes</button>
      </div>`;

    default: return '<p>Page not found.</p>';
  }
}

/* ── SHARED CHAT PAGE LAYOUT ── */
function buildChatPage(role) {
  return `
    <div class="section-hdr"><h2>Chats</h2></div>
    <div class="chat-layout">
      <div class="chat-contacts">
        <div class="chat-contacts-hdr">
          <span>Conversations</span>
          <button class="new-chat-btn" title="New chat" onclick="openNewChatModal()">${iconPlus()}</button>
        </div>
        <div class="contact-list" id="chatContactList">
          <div class="contact-empty">Loading conversations…</div>
        </div>
      </div>
      <div class="chat-window">
        <div class="cw-header">
          <div class="contact-avatar" id="cwAvatar" style="width:34px;height:34px;font-size:12px;"></div>
          <div>
            <div class="cw-name" id="cwName">Select a conversation</div>
            <div class="cw-role" id="cwRole"></div>
          </div>
        </div>
        <div class="cw-messages" id="cwMessages">
          <div class="cw-empty">Pick a conversation on the left, or start a new one.</div>
        </div>
        <div class="cw-input-area" id="cwInputArea"></div>
      </div>
    </div>`;
}

/* ── PAGE ROUTER & POLL TIMER ── */
let currentPage = 'dashboard';
let materialsPollTimer = null;

function renderPage(page) {
  currentPage = page;
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;
  mainContent.innerHTML = getPageContent(ROLE, page);
  const fab = document.getElementById('chatFab');
  if (fab) fab.style.display = (page === 'chats') ? 'none' : 'flex';

  if (page === 'users') loadUsersFromDB();
  if (page === 'quiz') loadQuizzesFromDB();
  if (page === 'quizzes') { loadQuizzesFromDB(); loadMyAttemptsFromDB(); }
  if (page === 'analysis') loadQuizzesFromDB();
  if (page === 'chats') loadChatsPage();
  if (page === 'dashboard') {
    if (ROLE === 'teacher' || ROLE === 'admin') { loadMaterialsFromDB(); loadQuizzesFromDB(); }
    if (ROLE === 'admin') loadUsersFromDB();
    if (ROLE === 'student') { loadMaterialsFromDB(); loadQuizzesFromDB(); loadMyAttemptsFromDB(); }
  }

  clearInterval(materialsPollTimer);
  materialsPollTimer = null;
  if (page === 'materials' || page === 'approval') {
    loadMaterialsFromDB();
    materialsPollTimer = setInterval(loadMaterialsFromDB, 15000);
  }
}

/* ── NAVIGATION LISTENERS ── */
document.addEventListener('DOMContentLoaded', () => {
  const sidebarMenu = document.getElementById('sidebarMenu');
  if (sidebarMenu) {
    sidebarMenu.addEventListener('click', e => {
      const item = e.target.closest('.menu-item[data-page]');
      if (!item) return;
      e.preventDefault();
      document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      renderPage(item.dataset.page);
    });
  }

  const toggleBtn = document.getElementById('hamburger-toggle');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('closed'));
  }
});

function goToChat() {
  const chatItem = document.querySelector('.menu-item[data-page="chats"]');
  if (chatItem) chatItem.click();
}

function sizeBrandUnderlines() {
  const schol = document.getElementById('wm-schol');
  const aria = document.getElementById('wm-aria');
  const ulSchol = document.getElementById('ul-schol');
  const ulAria = document.getElementById('ul-aria');
  if (!schol || !aria || !ulSchol || !ulAria) return;
  try {
    const b1 = schol.getBBox();
    const b2 = aria.getBBox();
    ulSchol.setAttribute('x', b1.x);
    ulSchol.setAttribute('width', b1.width);
    ulAria.setAttribute('x', b2.x);
    ulAria.setAttribute('width', b2.width);
  } catch(e) {}
}

window.addEventListener('load', sizeBrandUnderlines);
window.addEventListener('resize', sizeBrandUnderlines);
