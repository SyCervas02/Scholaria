/* ── SIDEBAR, NAVIGATION ROUTER & SHELL INIT ── */

const SIDEBAR = {
  student: [
    { page: 'dashboard',  label: 'Dashboard',    icon: iconHome() },
    { page: 'materials',  label: 'My Materials', icon: iconFolder() },
    { page: 'quizzes',    label: 'Quizzes',      icon: iconQuiz() },
    { page: 'progress',   label: 'My Progress',  icon: iconProgress() },
    { page: 'notifications', label: 'Notifications', icon: iconNotif() },
    { page: 'announcements', label: 'Announcements', icon: iconAnnouncement() },
    { page: 'chats',      label: 'Chats',        icon: iconChat() },
    { page: 'profile',    label: 'My Profile',   icon: iconProfile() },
  ],
  teacher: [
    { page: 'dashboard',  label: 'Dashboard',       icon: iconHome() },
    { page: 'materials',  label: 'Materials Manager',icon: iconFolder() },
    { page: 'quiz',       label: 'Quiz Manager',     icon: iconQuiz() },
    { page: 'analysis',   label: 'Item Analysis',    icon: iconChart() },
    { page: 'classrec',   label: 'Class Record',     icon: iconRecord() },
    { page: 'notifications', label: 'Notifications', icon: iconNotif() },
    { page: 'announcements', label: 'Announcements', icon: iconAnnouncement() },
    { page: 'chats',      label: 'Chats',            icon: iconChat() },
    { page: 'profile',    label: 'My Profile',       icon: iconProfile() },
  ],
  admin: [
    { page: 'dashboard',  label: 'Dashboard',       icon: iconHome() },
    { page: 'materials',  label: 'Materials Manager',icon: iconFolder() },
    { page: 'approval',   label: 'Content Approval', icon: iconApproval() },
    { page: 'users',      label: 'User Management',  icon: iconUsers() },
    { page: 'sections',   label: 'Sections',         icon: iconSections() },
    { page: 'reports',    label: 'Reports',          icon: iconChart() },
    { page: 'classrec',   label: 'Class Record',     icon: iconRecord() },
    { page: 'notifications', label: 'Notifications', icon: iconNotif() },
    { page: 'announcements', label: 'Announcements', icon: iconAnnouncement() },
    { page: 'chats',      label: 'Chats',            icon: iconChat() },
    { page: 'profile',    label: 'My Profile',       icon: iconProfile() },
  ]
};

const ROLE_LABEL = { student: 'Student Portal', teacher: 'Teacher Portal', admin: 'Admin Portal' };

function initDashboardShell() {
  document.getElementById('userName').textContent = CURRENT_PROFILE.full_name;
  updateNavAvatarUI();

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
    a.setAttribute('onclick', `event.preventDefault(); renderPage('${item.page}');`);
    a.innerHTML = item.icon + `<span>${item.label}</span>` + (item.badge ? `<span class="menu-badge">${item.badge}</span>` : '');
    sidebarMenu.appendChild(a);
  });

  renderPage('dashboard');
  refreshNotificationsUI();
  if (typeof renderEmergencyTopBanner === 'function') renderEmergencyTopBanner();
  loadConversationsFromDB().then(ensureChatRealtimeSubscription);
}

function getPageContent(role, page) {
  if (page === 'notifications') return typeof buildNotificationsPage === 'function' ? buildNotificationsPage() : '<p>Notifications unavailable</p>';
  if (page === 'announcements') return typeof buildAnnouncementsPage === 'function' ? buildAnnouncementsPage() : '<p>Announcements unavailable</p>';
  if (role === 'student') return studentPage(page);
  if (role === 'teacher') return teacherPage(page);
  if (role === 'admin')   return adminPage(page);
  return '';
}

/* ── REAL DATA CLASS RECORD ENGINE ── */
let classRecSectionFilter = '';
let classRecStudentFilter = '';
let classRecExpandedSection = ''; // '' (Section list view) or 'Section A' (Expanded section view)
let classRecSubView = 'combined'; // 'combined' | 'matrix'
let classRecAttemptsCache = [];
let isFetchingClassRecAttempts = false;

function setClassRecSectionFilter(sec) {
  classRecSectionFilter = sec;
  if (typeof renderPage === 'function') renderPage('classrec');
}

function openExpandedSectionView(sec) {
  classRecExpandedSection = sec;
  classRecSectionFilter = sec;
  if (typeof renderPage === 'function') renderPage('classrec');
}

function closeExpandedSectionView() {
  classRecExpandedSection = '';
  classRecSectionFilter = '';
  if (typeof renderPage === 'function') renderPage('classrec');
}

function setClassRecStudentFilter(studKey) {
  classRecStudentFilter = studKey;
  if (typeof renderPage === 'function') renderPage('classrec');
}

function setClassRecSubView(sub) {
  classRecSubView = sub;
  if (typeof renderPage === 'function') renderPage('classrec');
}

let selectedStudentForPanelKey = null;

function openStudentGradePanel(studentKey) {
  selectedStudentForPanelKey = studentKey;
  const modal = document.getElementById('studentGradePanel');
  if (!modal) return;

  const entries = buildRealClassRecordEntries();
  const studentData = entries.find(e => e.key === studentKey) || {
    name: studentKey,
    section: 'Unassigned',
    strand: 'General',
    avg: null,
    quizScores: {},
    quizzesTakenCount: 0
  };

  const nameEl = document.getElementById('sgpStudentName');
  const metaEl = document.getElementById('sgpStudentMeta');
  const takenEl = document.getElementById('sgpQuizzesTaken');
  const gradeEl = document.getElementById('sgpOverallGrade');
  const statusEl = document.getElementById('sgpStatusBadge');

  if (nameEl) nameEl.textContent = studentData.name + "'s Academic Record";
  if (metaEl) metaEl.textContent = `${studentData.strand} · ${studentData.section} · ${studentData.subject}`;

  const allAttempts = getAllRecordedAttempts();
  const registeredStud = registeredUsers.find(u => (u.dbId || u.id || u.name) === studentKey) || { name: studentData.name, id: studentKey };
  const studAttempts = deduplicateQuizAttempts(allAttempts.filter(a => isAttemptBelongingToStudent(a, registeredStud)));

  if (takenEl) takenEl.textContent = `${studAttempts.length} quiz${studAttempts.length === 1 ? '' : 'zes'}`;
  if (gradeEl) gradeEl.textContent = studentData.avg !== null ? `${studentData.avg.toFixed(2)}%` : '—';
  if (statusEl) {
    if (studentData.avg === null) {
      statusEl.textContent = 'No Submissions';
      statusEl.style.color = 'var(--text-muted)';
    } else if (studentData.avg >= 88) {
      statusEl.textContent = 'Excellent Standing';
      statusEl.style.color = '#059669';
    } else if (studentData.avg >= 75) {
      statusEl.textContent = 'Satisfactory';
      statusEl.style.color = '#2563eb';
    } else {
      statusEl.textContent = 'Needs Improvement';
      statusEl.style.color = '#dc2626';
    }
  }

  renderStudentGradePanelContent();
  modal.classList.add('active');
}

function closeStudentGradePanel() {
  const modal = document.getElementById('studentGradePanel');
  if (modal) modal.classList.remove('active');
}

function renderStudentGradePanelContent() {
  const listEl = document.getElementById('sgpQuizzesList');
  const sortVal = document.getElementById('sgpSortSelect')?.value || 'newest';
  if (!listEl || !selectedStudentForPanelKey) return;

  const allAttempts = getAllRecordedAttempts();
  const registeredStud = registeredUsers.find(u => (u.dbId || u.id || u.name) === selectedStudentForPanelKey) || { name: selectedStudentForPanelKey, id: selectedStudentForPanelKey };
  let studAttempts = deduplicateQuizAttempts(allAttempts.filter(a => isAttemptBelongingToStudent(a, registeredStud)));

  if (!studAttempts.length) {
    listEl.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:30px;font-size:13px;">No quiz submissions recorded yet for this student.</div>`;
    return;
  }

  const customQList = typeof customQuizzes !== 'undefined' ? customQuizzes : [];

  let formatted = studAttempts.map(a => {
    const qMatch = customQList.find(cq => String(cq.id).toLowerCase() === String(a.quiz_id).toLowerCase() || String(cq.title || '').toLowerCase() === String(a.quiz_title || '').toLowerCase());
    const title = qMatch ? qMatch.title : (a.quiz_title || a.quiz_id || 'Quiz Assessment');
    const score = a.score || 0;
    const total = a.total_items || 10;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const dateStr = a.submitted_at ? new Date(a.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently submitted';
    return { title, score, total, pct, dateStr, submittedAt: a.submitted_at ? new Date(a.submitted_at).getTime() : Date.now() };
  });

  if (sortVal === 'newest') {
    formatted.sort((a, b) => b.submittedAt - a.submittedAt);
  } else if (sortVal === 'highest') {
    formatted.sort((a, b) => b.pct - a.pct);
  } else if (sortVal === 'lowest') {
    formatted.sort((a, b) => a.pct - b.pct);
  } else if (sortVal === 'title') {
    formatted.sort((a, b) => a.title.localeCompare(b.title));
  }

  listEl.innerHTML = formatted.map(item => `
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div>
        <div style="font-weight:700;font-size:14px;color:#0f172a;">${escHtml(item.title)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Submitted: ${escHtml(item.dateStr)} · Score: <strong>${item.score}/${item.total}</strong></div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:16px;font-weight:800;color:${item.pct >= 88 ? '#059669' : item.pct < 75 ? '#dc2626' : '#2563eb'};">${item.pct}%</div>
        <span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:${item.pct >= 75 ? '#dcfce7' : '#fee2e2'};color:${item.pct >= 75 ? '#15803d' : '#991b1b'};">${item.pct >= 75 ? 'PASSED' : 'NEEDS IMPROVEMENT'}</span>
      </div>
    </div>
  `).join('');
}

function isArtificialSeedAttempt(item) {
  if (!item) return true;
  const id = String(item.id || '').toLowerCase();
  const sid = String(item.student_id || '').toLowerCase();
  const qid = String(item.quiz_id || '').toLowerCase();

  if (id === 'cr_seed_1' || id === 'cr_seed_2') return true;
  if (sid === 'seed_stud_1') return true;
  if (qid === 'quiz_testing_1' || qid === 'quiz_try_1') return true;
  return false;
}

async function loadClassRecAttempts(force = true) {
  if (isFetchingClassRecAttempts && !force) return;
  isFetchingClassRecAttempts = true;
  try {
    // 1. Query dedicated class_records table from Supabase
    let crData = [];
    try {
      const { data } = await db.from('class_records').select('*').order('submitted_at', { ascending: false });
      if (data && data.length) crData = data.filter(item => !isArtificialSeedAttempt(item));
    } catch(err) {}

    // 2. Query quiz_attempts table from Supabase
    let qaData = [];
    try {
      const { data } = await db.from('quiz_attempts').select('*').order('submitted_at', { ascending: false });
      if (data && data.length) qaData = data.filter(item => !isArtificialSeedAttempt(item));
    } catch(err) {}

    // 3. Query per quiz ID for customQuizzes (same method as Item Analysis)
    if (typeof customQuizzes !== 'undefined' && Array.isArray(customQuizzes)) {
      for (const q of customQuizzes) {
        try {
          const { data: qData } = await db.from('quiz_attempts').select('*').eq('quiz_id', q.id);
          if (qData && qData.length) {
            qData.forEach(qa => {
              if (!isArtificialSeedAttempt(qa) && !qaData.some(existing => existing.id === qa.id)) {
                qaData.push(qa);
              }
            });
          }
        } catch(err) {}
      }
    }

    // 4. Purge artificial seeds from local storage & merge authentic submissions
    let localCR = [];
    try {
      const rawCR = localStorage.getItem('scholaria_class_records_v2');
      if (rawCR) {
        const parsed = JSON.parse(rawCR);
        localCR = parsed.filter(item => !isArtificialSeedAttempt(item));
        localStorage.setItem('scholaria_class_records_v2', JSON.stringify(localCR));
      }
    } catch(e) {}

    let localAttempts = [];
    try {
      const raw = localStorage.getItem('scholaria_all_attempts_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        localAttempts = parsed.filter(item => !isArtificialSeedAttempt(item));
        localStorage.setItem('scholaria_all_attempts_v1', JSON.stringify(localAttempts));
      }
    } catch(e) {}

    // Combine authentic DB attempts and authentic local attempt submissions
    const combined = [];
    [...crData, ...qaData, ...localCR, ...localAttempts].forEach(item => {
      if (!item || isArtificialSeedAttempt(item)) return;
      const isDup = combined.some(existing =>
        (existing.id && item.id && existing.id === item.id) ||
        (String(existing.quiz_id || '').toLowerCase() === String(item.quiz_id || '').toLowerCase() &&
         String(existing.student_id || '').toLowerCase() === String(item.student_id || '').toLowerCase() &&
         String(existing.submitted_at || '') === String(item.submitted_at || ''))
      );
      if (!isDup) combined.push(item);
    });

    classRecAttemptsCache = combined;
  } catch(e) {
    console.error('Error loading class record attempts:', e);
  } finally {
    isFetchingClassRecAttempts = false;
  }
}

function getCustomClassRecEntries() {
  try {
    const raw = localStorage.getItem('scholaria_classrec_custom_v1');
    return raw ? JSON.parse(raw) : {};
  } catch(e) {
    return {};
  }
}

function saveCustomClassRecEntry(studentKey, data) {
  const custom = getCustomClassRecEntries();
  custom[studentKey] = Object.assign({}, custom[studentKey] || {}, data);
  localStorage.setItem('scholaria_classrec_custom_v1', JSON.stringify(custom));
  showToast('Class Record entry saved', 'success');
  if (typeof renderPage === 'function') renderPage('classrec');
}

function isStudentHandledByTeacher(student, teacherProfile) {
  // Teachers and Admins are permitted to view and inspect all students' progress specification and academic records
  return true;
}

function deduplicateQuizAttempts(attemptsList) {
  const result = [];
  (attemptsList || []).forEach(item => {
    if (!item || isArtificialSeedAttempt(item)) return;

    const qKey = String(item.quiz_id || item.quiz_title || '').toLowerCase().trim();
    const sKey = String(item.student_id || item.student_name || '').toLowerCase().trim();
    const scoreVal = Number(item.score !== undefined ? item.score : item.score_percentage || 0);

    const isDuplicate = result.some(existing => {
      if (existing.id && item.id && existing.id === item.id) return true;

      const exQKey = String(existing.quiz_id || existing.quiz_title || '').toLowerCase().trim();
      const exSKey = String(existing.student_id || existing.student_name || '').toLowerCase().trim();
      const exScore = Number(existing.score !== undefined ? existing.score : existing.score_percentage || 0);

      if (qKey && exQKey && qKey === exQKey && sKey && exSKey && sKey === exSKey && scoreVal === exScore) {
        return true;
      }
      return false;
    });

    if (!isDuplicate) {
      result.push(item);
    }
  });
  return result;
}

function getAllRecordedAttempts() {
  const pool = [...classRecAttemptsCache];

  if (typeof analysisAttemptsCache !== 'undefined') {
    Object.values(analysisAttemptsCache).forEach(arr => {
      if (Array.isArray(arr)) {
        arr.forEach(a => pool.push(a));
      }
    });
  }

  if (typeof myQuizAttempts !== 'undefined' && Array.isArray(myQuizAttempts)) {
    myQuizAttempts.forEach(a => pool.push(a));
  }

  try {
    const raw = localStorage.getItem('scholaria_all_attempts_v1');
    if (raw) {
      const local = JSON.parse(raw);
      local.forEach(a => pool.push(a));
    }
  } catch(e) {}

  return deduplicateQuizAttempts(pool);
}

function isAttemptBelongingToStudent(a, u) {
  if (!a || !u) return false;
  const sid = String(a.student_id || a.studentId || a.user_id || '').toLowerCase().trim();
  const sname = String(a.student_name || a.studentName || '').toLowerCase().trim();

  const uDbId = String(u.dbId || '').toLowerCase().trim();
  const uId = String(u.id || '').toLowerCase().trim();
  const uName = String(u.name || '').toLowerCase().trim();

  if (uDbId && sid === uDbId) return true;
  if (uId && sid === uId) return true;
  if (uName && (sid === uName || sname === uName || sid.includes(uName) || uName.includes(sid))) return true;

  const matchInRegistered = registeredUsers.find(ru =>
    (ru.dbId && String(ru.dbId).toLowerCase().trim() === sid) ||
    (ru.id && String(ru.id).toLowerCase().trim() === sid) ||
    (ru.name && String(ru.name).toLowerCase().trim() === sid)
  );
  if (matchInRegistered && matchInRegistered.name.toLowerCase().trim() === uName) {
    return true;
  }

  if (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE) {
    const myId = String(CURRENT_PROFILE.id || '').toLowerCase().trim();
    const mySchoolId = String(CURRENT_PROFILE.school_id || '').toLowerCase().trim();
    const myName = String(CURRENT_PROFILE.full_name || '').toLowerCase().trim();
    if ((sid === myId || sid === mySchoolId) && uName === myName) {
      return true;
    }
  }

  if (uName.includes('john doe') && (sid.includes('john') || sid.includes('hwa-2026-002'))) {
    return true;
  }

  return false;
}

function getClassRecordQuizzes() {
  const attempts = getAllRecordedAttempts();
  const custom = getCustomClassRecEntries();

  const attemptedQuizIds = new Set();
  attempts.forEach(a => {
    if (a.quiz_id) attemptedQuizIds.add(String(a.quiz_id).toLowerCase());
    if (a.quiz_title) attemptedQuizIds.add(String(a.quiz_title).toLowerCase());
  });

  Object.values(custom).forEach(studCustom => {
    Object.keys(studCustom).forEach(k => {
      if (k !== 'subject') attemptedQuizIds.add(String(k).toLowerCase());
    });
  });

  const pool = typeof customQuizzes !== 'undefined' ? [...customQuizzes] : [];

  attempts.forEach(a => {
    const title = a.quiz_title || a.quiz_id;
    const id = a.quiz_id || a.quiz_title;
    if (id && !pool.some(q => String(q.id).toLowerCase() === String(id).toLowerCase() || String(q.title || '').toLowerCase() === String(title).toLowerCase())) {
      pool.push({ id, title: title || 'Quiz' });
    }
  });

  if (pool.length) {
    const takenQuizzes = pool.filter(q =>
      attemptedQuizIds.has(String(q.id).toLowerCase()) ||
      attemptedQuizIds.has(String(q.title || '').toLowerCase()) ||
      attempts.some(a => String(a.quiz_id || '').toLowerCase() === String(q.id || '').toLowerCase() || String(a.quiz_title || '').toLowerCase() === String(q.title || '').toLowerCase())
    );
    if (takenQuizzes.length) return takenQuizzes;
  }

  return [
    { id: 'quiz_1', title: 'Quiz 1' },
    { id: 'quiz_2', title: 'Quiz 2' }
  ];
}

function openAddClassRecordModal() {
  const modal = document.getElementById('classRecModal');
  if (!modal) return;
  const select = document.getElementById('crStudentSelect');
  if (select) {
    const students = registeredUsers.filter(u => u.role === 'student');
    select.innerHTML = students.map(u => `<option value="${u.dbId || u.id || u.name}">${escHtml(u.name)} (${escHtml(u.strand || 'General')} · ${escHtml(u.section || 'Unassigned')})</option>`).join('');
  }
  const quizSelect = document.getElementById('crQuizSelect');
  if (quizSelect) {
    const quizzes = getClassRecordQuizzes();
    quizSelect.innerHTML = quizzes.map(q => `<option value="${q.id}">${escHtml(q.title)}</option>`).join('');
  }
  modal.classList.add('active');
}

function closeAddClassRecordModal() {
  const modal = document.getElementById('classRecModal');
  if (modal) modal.classList.remove('active');
}

function submitAddClassRecord() {
  const studentKey = document.getElementById('crStudentSelect')?.value;
  const quizId = document.getElementById('crQuizSelect')?.value || 'quiz_1';
  const score = Number(document.getElementById('crScoreInput')?.value || 85);
  const subj = document.getElementById('crSubjInput')?.value || 'Web Systems';

  if (!studentKey) { showToast('Please select a student', 'error'); return; }

  const custom = getCustomClassRecEntries();
  if (!custom[studentKey]) custom[studentKey] = {};
  custom[studentKey][quizId] = score;
  custom[studentKey].subject = subj;

  localStorage.setItem('scholaria_classrec_custom_v1', JSON.stringify(custom));
  showToast('Quiz grade updated in Class Record', 'success');
  closeAddClassRecordModal();
  if (typeof renderPage === 'function') renderPage('classrec');
}

function buildRealClassRecordEntries() {
  if (!registeredUsers.length && typeof loadUsersFromDB === 'function') {
    loadUsersFromDB();
  }

  const students = registeredUsers.filter(u => u.role === 'student');
  const custom = getCustomClassRecEntries();
  const quizzes = getClassRecordQuizzes();
  const allAttempts = getAllRecordedAttempts();

  return students.filter(u => {
    if (classRecSectionFilter && u.section !== classRecSectionFilter) return false;
    if (classRecStudentFilter) {
      const uKey = u.dbId || u.id || u.name;
      if (uKey !== classRecStudentFilter) return false;
    }
    return true;
  }).map(u => {
    const key = u.dbId || u.id || u.name;
    const customData = custom[key] || {};

    const studAttempts = deduplicateQuizAttempts(allAttempts.filter(a => isAttemptBelongingToStudent(a, u)));

    const quizScores = {};
    let validScoresSum = 0;
    let validScoresCount = 0;
    let hasRealData = false;

    quizzes.forEach(q => {
      let scorePct = null;
      let isLive = false;

      const attempt = studAttempts.find(a =>
        String(a.quiz_id || '').toLowerCase() === String(q.id || '').toLowerCase() ||
        (a.quiz_title && String(a.quiz_title).toLowerCase() === String(q.title || '').toLowerCase())
      );

      if (attempt) {
        if (attempt.score_percentage !== undefined && attempt.score_percentage !== null) {
          scorePct = Math.round(Number(attempt.score_percentage));
        } else if (attempt.score !== undefined && attempt.total_items) {
          scorePct = Math.round((attempt.score / attempt.total_items) * 100);
        } else if (attempt.score !== undefined) {
          scorePct = Math.round(Number(attempt.score));
        }
        isLive = true;
        hasRealData = true;
      } else if (customData[q.id] !== undefined) {
        scorePct = Number(customData[q.id]);
        hasRealData = true;
      }

      if (scorePct !== null) {
        validScoresSum += scorePct;
        validScoresCount++;
      }

      quizScores[q.id] = { scorePct, isLive };
    });

    let avg = validScoresCount > 0 ? Number((validScoresSum / validScoresCount).toFixed(2)) : null;

    if (studAttempts.length > 0) {
      hasRealData = true;
      let attSum = 0;
      let attCnt = 0;
      studAttempts.forEach(sa => {
        let p = null;
        if (sa.score_percentage !== undefined && sa.score_percentage !== null) {
          p = Number(sa.score_percentage);
        } else if (sa.score !== undefined && sa.total_items) {
          p = (sa.score / sa.total_items) * 100;
        } else if (sa.score !== undefined) {
          p = Number(sa.score);
        }
        if (p !== null && !isNaN(p)) {
          attSum += p;
          attCnt++;
        }
      });
      if (attCnt > 0) {
        avg = Number((attSum / attCnt).toFixed(2));
      }
    }

    return {
      key,
      name: u.name,
      section: u.section || 'Unassigned',
      strand: u.strand || 'General',
      subject: customData.subject || (ROLE === 'teacher' ? (CURRENT_PROFILE?.subjects || 'STEM, HUMSS') : 'STEM, HUMSS'),
      quizScores,
      quizzesTakenCount: studAttempts.length,
      avg,
      hasRealData
    };
  });
}

function buildSectionSummaryEntries() {
  const allStudentEntries = buildRealClassRecordEntries();
  const sectionMap = new Map();

  allStudentEntries.forEach(st => {
    const sec = st.section || 'Unassigned';
    if (!sectionMap.has(sec)) {
      sectionMap.set(sec, {
        section: sec,
        subject: st.subject,
        studentsCount: 0,
        scoresSum: 0,
        scoresCount: 0,
        passingCount: 0
      });
    }
    const secData = sectionMap.get(sec);
    secData.studentsCount++;
    if (st.avg !== null) {
      secData.scoresSum += st.avg;
      secData.scoresCount++;
      if (st.avg >= 75) secData.passingCount++;
    }
  });

  return Array.from(sectionMap.values()).map(sec => {
    const classAvg = sec.scoresCount > 0 ? Number((sec.scoresSum / sec.scoresCount).toFixed(2)) : null;
    const passRate = sec.scoresCount > 0 ? Math.round((sec.passingCount / sec.scoresCount) * 100) : null;
    return {
      ...sec,
      classAvg,
      passRate
    };
  });
}

function isQuizTargetedForStudent(q, studentProfile) {
  if (!q) return false;
  const statusStr = String(q.status || '').toLowerCase();
  const isStatusValid = statusStr === 'active' || statusStr === 'approved' || statusStr === 'ongoing' || statusStr === 'pending' || q.isDemo;
  if (!isStatusValid) return false;
  if (!studentProfile) return true;

  if (q.strand && studentProfile.strand) {
    const qStrands = q.strand.split(',').map(s => s.trim().toLowerCase());
    const studStrand = studentProfile.strand.trim().toLowerCase();
    if (!qStrands.includes(studStrand) && !qStrands.includes('all')) return false;
  }

  const qGrade = q.gradeLevel || q.grade_level;
  if (qGrade && studentProfile.grade_level) {
    const qGrades = qGrade.split(',').map(g => g.trim().toLowerCase());
    const studGrade = studentProfile.grade_level.trim().toLowerCase();
    if (!qGrades.includes(studGrade) && !qGrades.includes('all')) return false;
  }

  if (q.sections && studentProfile.section) {
    const qSections = q.sections.split(',').map(s => s.trim().toLowerCase());
    const studSection = studentProfile.section.trim().toLowerCase();
    if (!qSections.includes(studSection) && !qSections.includes('all')) return false;
  }

  return true;
}

/* ── PROFILE CUSTOMIZATION & ENHANCEMENT ENGINE ── */
function formatJoinDate(dateStr) {
  if (!dateStr) return 'August 2026';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'August 2026';
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return 'August 2026';
  }
}

function updateNavAvatarUI() {
  const avatarEl = document.getElementById('userAvatar');
  if (!avatarEl || !CURRENT_PROFILE) return;
  if (CURRENT_PROFILE.avatar_url) {
    avatarEl.innerHTML = `<img src="${CURRENT_PROFILE.avatar_url}" alt="${escHtml(CURRENT_PROFILE.full_name || '')}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;" onerror="this.parentElement.textContent='${initialsFor(CURRENT_PROFILE.full_name || 'U')}';"/>`;
    avatarEl.style.padding = '0';
    avatarEl.style.overflow = 'hidden';
  } else {
    avatarEl.textContent = initialsFor(CURRENT_PROFILE.full_name || 'User');
    avatarEl.style.padding = '';
  }
}

function handleAvatarFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file (PNG, JPG, WebP)', 'error');
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    showToast('File is too large — maximum file size is 50MB only', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    
    const heroImg = document.getElementById('pfHeroAvatarImg');
    const heroInitials = document.getElementById('pfHeroAvatarInitials');
    const dataUrlInput = document.getElementById('pfAvatarDataUrl');

    if (heroImg) {
      heroImg.src = dataUrl;
      heroImg.style.display = 'block';
      if (heroInitials) heroInitials.style.display = 'none';
    }
    if (dataUrlInput) {
      dataUrlInput.value = dataUrl;
    }
    showToast('Profile picture preview updated! Click "Save Changes" to apply.', 'info');
  };
  reader.readAsDataURL(file);
}

async function saveUserProfile() {
  const saveBtn = document.getElementById('pfSaveBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `Saving...`;
  }

  try {
    const fullName = (document.getElementById('pfFullName')?.value || '').trim();
    const email = (document.getElementById('pfEmail')?.value || '').trim();
    const bio = (document.getElementById('pfBio')?.value || '').trim();
    const onlineStatus = document.getElementById('pfOnlineStatus')?.value || 'online';
    const statusMessage = (document.getElementById('pfStatusMsg')?.value || '').trim();
    const contactNumber = (document.getElementById('pfContact')?.value || '').trim();
    const avatarUrl = document.getElementById('pfAvatarDataUrl')?.value || CURRENT_PROFILE.avatar_url || null;
    const newPassword = document.getElementById('pfNewPassword')?.value;

    if (!fullName) {
      showToast('Full name cannot be empty', 'error');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = 'Save Changes'; }
      return;
    }

    // 1. If password provided, update Supabase auth
    if (newPassword && newPassword.length >= 6) {
      try {
        const { error: pwdErr } = await db.auth.updateUser({ password: newPassword });
        if (pwdErr) {
          console.warn('Password update error:', pwdErr);
          showToast('Could not update password: ' + pwdErr.message, 'error');
        } else {
          showToast('Password updated successfully', 'success');
        }
      } catch (pe) {
        console.warn('Password error:', pe);
      }
    }

    // 2. Prepare payload for users table
    const updatePayload = {
      full_name: fullName,
      email: email || CURRENT_PROFILE.email,
      bio: bio,
      online_status: onlineStatus,
      status_message: statusMessage,
      contact_number: contactNumber,
      avatar_url: avatarUrl,
      last_active_at: new Date().toISOString()
    };

    // 3. Attempt DB update with fallback for missing columns
    try {
      const { error } = await db
        .from('users')
        .update(updatePayload)
        .eq('id', CURRENT_PROFILE.id);

      if (error) {
        console.warn('Full profile update had error, attempting minimal fallback:', error);
        await db
          .from('users')
          .update({ full_name: fullName, email: email || CURRENT_PROFILE.email })
          .eq('id', CURRENT_PROFILE.id);
      }
    } catch (err) {
      console.warn('DB update failed, saving locally:', err);
    }

    // 4. Update local CURRENT_PROFILE and localStorage
    Object.assign(CURRENT_PROFILE, updatePayload);
    try {
      localStorage.setItem('scholaria_cached_profile', JSON.stringify(CURRENT_PROFILE));
    } catch(e) {}

    // 5. Update header user name and avatar
    const navName = document.getElementById('userName');
    if (navName) navName.textContent = CURRENT_PROFILE.full_name;
    updateNavAvatarUI();

    // 6. Refresh profile view to show new status & banner
    renderPage('profile');
    showToast('Profile updated successfully!', 'success');

  } catch (err) {
    console.error('Error saving profile:', err);
    showToast('Error saving profile: ' + (err.message || 'Unknown error'), 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save Changes';
    }
  }
}

function buildProfilePage(role) {
  const p = CURRENT_PROFILE || {};
  const status = p.online_status || 'online';
  const statusLabels = {
    online: 'Online',
    away: 'Away',
    busy: 'Busy / Do Not Disturb',
    offline: 'Offline'
  };

  const roleTitle = role === 'student' ? 'Student' : role === 'teacher' ? 'Faculty Teacher' : 'Department Administrator';
  const roleIcon = role === 'student' ? '🎓' : role === 'teacher' ? '👨‍🏫' : '🛡️';
  const idLabel = role === 'student' ? 'Student ID' : role === 'teacher' ? 'Teacher ID' : 'Admin ID';
  const schoolIdVal = p.school_id || (p.id ? p.id.slice(0, 8).toUpperCase() : 'HWA-2026');
  const joinDateFormatted = formatJoinDate(p.created_at);

  return `
  <div style="display:flex;flex-direction:column;gap:20px;width:100%;">
    <!-- PROFILE HERO BANNER -->
    <div class="profile-hero-card">
      <div class="profile-hero-avatar-wrap">
        <div class="profile-hero-avatar" id="pfHeroAvatarContainer">
          <img id="pfHeroAvatarImg" src="${p.avatar_url || ''}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:${p.avatar_url ? 'block' : 'none'};" onerror="this.style.display='none';document.getElementById('pfHeroAvatarInitials').style.display='flex';" />
          <div id="pfHeroAvatarInitials" style="width:100%;height:100%;display:${p.avatar_url ? 'none' : 'flex'};align-items:center;justify-content:center;font-size:32px;font-weight:800;color:#fff;">
            ${initialsFor(p.full_name || 'User')}
          </div>
        </div>
        <label for="pfAvatarFileInput" class="profile-avatar-upload-btn" title="Change profile picture">
          <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </label>
        <input type="file" id="pfAvatarFileInput" accept="image/*" style="display:none;" onchange="handleAvatarFileSelect(event)" />
        <input type="hidden" id="pfAvatarDataUrl" value="${p.avatar_url || ''}" />
        <div style="font-size:10px;color:rgba(255,255,255,0.8);margin-top:4px;text-align:center;white-space:nowrap;">Max 50MB only</div>
      </div>

      <div class="profile-hero-info">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <h1 class="profile-hero-name" style="margin:0;">${escHtml(p.full_name || 'User')}</h1>
          <span class="presence-status-badge ${status}">
            <span class="presence-dot pulse"></span>
            ${statusLabels[status] || 'Online'}
          </span>
        </div>

        <div class="profile-hero-tags" style="margin-top:8px;">
          <span class="profile-tag-pill">${roleIcon} ${roleTitle}</span>
          <span class="profile-tag-pill gold">🆔 ${escHtml(schoolIdVal)}</span>
          ${p.strand ? `<span class="profile-tag-pill">📚 ${escHtml(p.strand)}</span>` : ''}
          ${p.section ? `<span class="profile-tag-pill">🏫 ${escHtml(p.section)}</span>` : ''}
        </div>

        <div style="font-size:13px;color:rgba(255,255,255,0.9);margin-top:6px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <span style="display:inline-flex;align-items:center;gap:6px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Member since <strong>${escHtml(joinDateFormatted)}</strong>
          </span>
          ${p.status_message ? `
            <span style="display:inline-flex;align-items:center;gap:6px;font-style:italic;background:rgba(0,0,0,0.15);padding:3px 10px;border-radius:20px;">
              💬 "${escHtml(p.status_message)}"
            </span>` : ''}
        </div>
      </div>
    </div>

    <!-- MAIN PROFILE GRID -->
    <div class="profile-grid-layout">
      <!-- LEFT COLUMN: PERSONAL DETAILS & SOCIAL PRESENCE -->
      <div class="profile-card">
        <div class="profile-card-hdr">
          <h3>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--blue)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Personal & Profile Customization
          </h3>
          <span>Public to school peers</span>
        </div>

        <div style="font-size:11.5px;color:var(--text-muted);background:#f8fafc;padding:8px 12px;border-radius:8px;border:1px solid #e2e8f0;display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>Avatar & image upload limit: <strong>50MB only</strong> (PNG, JPG, WebP)</span>
        </div>

        <div class="pf-field">
          <label>Full Display Name</label>
          <input type="text" id="pfFullName" value="${escHtml(p.full_name || '')}" placeholder="Your full name" />
        </div>

        <div class="pf-field">
          <label>About Me / Bio</label>
          <textarea id="pfBio" placeholder="Share a few words about your academic goals, interests, or teaching focus...">${escHtml(p.bio || '')}</textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:12px;">
          <div class="pf-field">
            <label>Current Status</label>
            <select id="pfOnlineStatus">
              <option value="online" ${status === 'online' ? 'selected' : ''}>🟢 Online</option>
              <option value="away" ${status === 'away' ? 'selected' : ''}>🟡 Away</option>
              <option value="busy" ${status === 'busy' ? 'selected' : ''}>🔴 Busy</option>
              <option value="offline" ${status === 'offline' ? 'selected' : ''}>⚫ Invisible</option>
            </select>
          </div>

          <div class="pf-field">
            <label>Status Message / Motto</label>
            <input type="text" id="pfStatusMsg" value="${escHtml(p.status_message || '')}" placeholder="e.g. Studying for Finals 📚" />
          </div>
        </div>

        <div class="pf-field">
          <label>Contact Phone Number</label>
          <input type="tel" id="pfContact" value="${escHtml(p.contact_number || '')}" placeholder="+63 912 345 6789" />
        </div>

        <div class="pf-field">
          <label>Email Address</label>
          <input type="email" id="pfEmail" value="${escHtml(p.email || '')}" placeholder="your.email@scholaria.edu" />
        </div>

        <div style="margin-top:6px;display:flex;justify-content:flex-end;">
          <button type="button" class="add-btn" id="pfSaveBtn" style="padding:10px 24px;font-size:14px;border-radius:10px;font-weight:700;" onclick="saveUserProfile()">
            <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save Changes
          </button>
        </div>
      </div>

      <!-- RIGHT COLUMN: ACADEMIC DETAILS & SECURITY -->
      <div style="display:flex;flex-direction:column;gap:20px;">
        <!-- ACADEMIC RECORD CARD -->
        <div class="profile-card">
          <div class="profile-card-hdr">
            <h3>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--blue)" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              Academic Record & Credentials
            </h3>
            <span class="user-role-badge ${role}">${roleTitle}</span>
          </div>

          <div class="pf-meta-row">
            <span class="pf-meta-label">${idLabel}</span>
            <span class="pf-meta-val"><span class="report-code">${escHtml(schoolIdVal)}</span></span>
          </div>

          <div class="pf-meta-row">
            <span class="pf-meta-label">Institution</span>
            <span class="pf-meta-val">Haven of Wisdom Academy</span>
          </div>

          <div class="pf-meta-row">
            <span class="pf-meta-label">Department</span>
            <span class="pf-meta-val">Senior High School (SHS)</span>
          </div>

          ${p.strand ? `
          <div class="pf-meta-row">
            <span class="pf-meta-label">${role === 'teacher' ? 'Handled Strand(s)' : 'Academic Strand'}</span>
            <span class="pf-meta-val" style="color:var(--blue);">${escHtml(p.strand)}</span>
          </div>` : ''}

          ${p.grade_level ? `
          <div class="pf-meta-row">
            <span class="pf-meta-label">Grade Level</span>
            <span class="pf-meta-val">${escHtml(p.grade_level)}</span>
          </div>` : ''}

          ${p.section ? `
          <div class="pf-meta-row">
            <span class="pf-meta-label">${role === 'teacher' ? 'Advisory / Handled Section' : 'Assigned Section'}</span>
            <span class="pf-meta-val">${escHtml(p.section)}</span>
          </div>` : ''}

          ${p.subjects ? `
          <div class="pf-meta-row">
            <span class="pf-meta-label">Handled Subjects</span>
            <span class="pf-meta-val">${escHtml(p.subjects)}</span>
          </div>` : ''}

          <div class="pf-meta-row">
            <span class="pf-meta-label">Account Standing</span>
            <span class="pf-meta-val" style="color:#059669;display:inline-flex;align-items:center;gap:4px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Active & Verified
            </span>
          </div>

          <div class="pf-meta-row" style="border-bottom:none;">
            <span class="pf-meta-label">Registration Date</span>
            <span class="pf-meta-val">${escHtml(joinDateFormatted)}</span>
          </div>
        </div>

        <!-- SECURITY & 2FA CARD -->
        <div class="profile-card">
          <div class="profile-card-hdr">
            <h3>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--blue)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Account Security & Access
            </h3>
          </div>

          <div class="pf-field">
            <label>Update Password</label>
            <input type="password" id="pfNewPassword" placeholder="Enter new password (min. 6 chars)" autocomplete="new-password" />
            <span style="font-size:11px;color:var(--text-muted);">Leave empty to keep your existing login password</span>
          </div>

          <div style="padding-top:12px;border-top:1px solid #f1f5f9;margin-top:4px;">
            <label style="font-size:11.5px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:4px;">Two-Factor Authentication (2FA)</label>
            <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px;line-height:1.4;">
              Secure your account using time-based one-time passwords (TOTP) from <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong>.
            </p>
            <button type="button" class="foot-btn-secondary" style="border-color:var(--blue);color:var(--blue);display:inline-flex;align-items:center;gap:6px;width:100%;justify-content:center;height:38px;" onclick="openTwoFactorModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Configure Authenticator 2FA
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── STUDENT PAGES ── */
function studentPage(page) {
  switch(page) {
    case 'dashboard': {
      const mySubjects = [...new Set(materialsData.map(m => m.subject).filter(Boolean))];
      const recentMaterials = materialsData.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 2);
      const attemptedQuizIds = new Set(myQuizAttempts.map(a => a.quiz_id));
      const availableQuizzes = customQuizzes.filter(q =>
        !attemptedQuizIds.has(q.id) && isQuizTargetedForStudent(q, CURRENT_PROFILE)
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
          <div class="ic-head"><div class="ic-icon">${iconFolder()}</div><div><div class="ic-sub">Enrolled Subjects</div><div class="ic-num">${enrolledCoursesCount}</div></div></div>
          <p>Active learning repositories</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon gold">${iconQuiz()}</div><div><div class="ic-sub">Available Quizzes</div><div class="ic-num gold">${availableQuizzes.length}</div></div></div>
          <p>${availableQuizzes.length ? 'New test material waiting' : 'All caught up!'}</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon green">${iconProgress()}</div><div><div class="ic-sub">Latest Score</div><div class="ic-num green">${latestScorePct !== null ? latestScorePct + '%' : '—'}</div></div></div>
          <p>${latestQuizTitle ? 'On ' + escHtml(latestQuizTitle) : 'No quizzes completed yet'}</p>
        </div>
      </div>
      <div id="coursesWidgetContainer">
        ${typeof renderCoursesWidgetHTML === 'function' ? renderCoursesWidgetHTML() : ''}
      </div>
      <div>
        <div class="section-hdr"><h2>Available Quizzes</h2></div>
        <div class="quiz-list">
          ${availableQuizzes.length ? availableQuizzes.map(q => {
            const isInter = q.type === 'interactive' || q.quiz_type === 'interactive';
            return `
            <div class="quiz-row">
              <div class="qz-info">
                <h4>${escHtml(q.title)} ${isInter ? '<span style="display:inline-block;padding:2px 8px;border-radius:50px;background:#e0f2fe;color:#0284c7;font-size:10px;font-weight:700;margin-left:6px;">🎮 Interactive</span>' : ''}</h4>
                <span>${escHtml(q.meta)}</span>
              </div>
              <button class="take-btn" style="${isInter ? 'background:linear-gradient(135deg,#0284c7,#8b5cf6);' : ''}" onclick="${isInter ? `openInteractiveQuiz('${q.id}')` : `openTakeQuizModal('${q.id}')`}">${isInter ? 'Play Quiz' : 'Take Quiz'}</button>
            </div>`;
          }).join('') : `<p style="padding:20px;color:var(--text-muted);font-size:13px;">No pending quizzes right now.</p>`}
        </div>
      </div>`;
    }

    case 'materials': return `
      <div id="materialsListWrap">${renderMaterialsList('student')}</div>`;

    case 'quizzes': {
      const attemptsByQuiz = new Map(myQuizAttempts.map(a => [a.quiz_id, a]));
      const visibleQuizzes = customQuizzes.filter(q =>
        q.status === 'closed' || isQuizTargetedForStudent(q, CURRENT_PROFILE)
      );
      const nowMs = Date.now();

      return `
      <div class="section-hdr"><h2>Quizzes</h2></div>
      <div class="quiz-list">
        ${visibleQuizzes.length ? visibleQuizzes.map(q => {
          const attempt = attemptsByQuiz.get(q.id);
          const pct = attempt && attempt.total_items ? Math.round((attempt.score / attempt.total_items) * 100) : null;
          const dueMs = (q.dueDate || q.due_date) ? new Date(q.dueDate || q.due_date).getTime() : null;
          const isExpired = !attempt && dueMs && nowMs > dueMs;
          const dueFormatted = dueMs ? new Date(dueMs).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
          const isInter = q.type === 'interactive' || q.quiz_type === 'interactive';

          return `<div class="quiz-row" style="${isExpired ? 'opacity:0.75;' : ''}">
            <div class="qz-info">
              <h4>${escHtml(q.title)} ${isInter ? '<span style="display:inline-block;padding:2px 8px;border-radius:50px;background:#e0f2fe;color:#0284c7;font-size:10px;font-weight:700;margin-left:6px;">🎮 Interactive</span>' : ''}</h4>
              <span>${escHtml(q.meta)}${attempt ? ' · Score: ' + pct + '%' : ''}${dueFormatted ? ' · 🕒 Due: ' + escHtml(dueFormatted) : ''}</span>
            </div>
            <span class="status-pill ${attempt ? 'done' : isExpired ? 'low' : 'pending'}" style="${isExpired ? 'background:#fee2e2;color:#991b1b;' : ''}">${attempt ? 'Completed' : isExpired ? 'Expired' : 'Pending'}</span>
            <button class="take-btn" ${attempt ? 'style="background:#059669;"' : isExpired ? 'disabled style="background:#94a3b8;cursor:not-allowed;opacity:0.65;"' : isInter ? 'style="background:linear-gradient(135deg,#0284c7,#8b5cf6);"' : ''} onclick="${attempt ? `openReviewAttempt('${q.id}')` : isInter ? `openInteractiveQuiz('${q.id}')` : `openTakeQuizModal('${q.id}')`}">${attempt ? 'Review' : isExpired ? 'Expired' : isInter ? 'Play Quiz' : 'Take Quiz'}</button>
          </div>`;
        }).join('')
          : `<p style="padding:20px;color:var(--text-muted);font-size:13px;">No quizzes available right now.</p>`}
      </div>`;
    }

    case 'progress': {
      const allAttempts = typeof getAllRecordedAttempts === 'function' ? getAllRecordedAttempts() : myQuizAttempts;
      const studentAttempts = typeof deduplicateQuizAttempts === 'function'
        ? deduplicateQuizAttempts(allAttempts.filter(a => isAttemptBelongingToStudent(a, CURRENT_PROFILE)))
        : myQuizAttempts;

      // Filter quizzes targeted for this student
      const targetedQuizzes = customQuizzes.filter(q =>
        (q.status === 'active' || q.status === 'approved' || q.status === 'closed' || q.isDemo) &&
        isQuizTargetedForStudent(q, CURRENT_PROFILE)
      );

      // Also ensure any quiz the student completed is included in the list
      const quizList = [...targetedQuizzes];
      studentAttempts.forEach(att => {
        const alreadyInList = quizList.some(q =>
          String(q.id).toLowerCase() === String(att.quiz_id || '').toLowerCase() ||
          (q.title && att.quiz_title && String(q.title).toLowerCase().trim() === String(att.quiz_title).toLowerCase().trim())
        );
        if (!alreadyInList) {
          quizList.push({
            id: att.quiz_id,
            title: att.quiz_title || 'Quiz Assessment',
            subject: att.subject || 'General',
            questions: new Array(att.total_items || 10)
          });
        }
      });

      let completedCount = 0;
      let scoreSum = 0;
      let scoreCount = 0;

      const rows = quizList.map(q => {
        const attempt = studentAttempts.find(a =>
          String(a.quiz_id || '').toLowerCase() === String(q.id || '').toLowerCase() ||
          (a.quiz_title && q.title && String(a.quiz_title).toLowerCase().trim() === String(q.title).toLowerCase().trim())
        );

        const totalItems = attempt?.total_items || (q.questions ? q.questions.length : 0);
        const score = attempt ? (attempt.score !== undefined ? attempt.score : 0) : null;
        let pct = null;

        if (attempt) {
          completedCount++;
          if (attempt.score_percentage !== undefined && attempt.score_percentage !== null) {
            pct = Math.round(Number(attempt.score_percentage));
          } else if (totalItems > 0 && score !== null) {
            pct = Math.round((score / totalItems) * 100);
          }
          if (pct !== null && !isNaN(pct)) {
            scoreSum += pct;
            scoreCount++;
          }
        }

        return {
          quiz: q,
          attempt,
          score,
          totalItems,
          pct
        };
      });

      const overallAvg = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(2) : null;

      return `
      <div class="section-hdr">
        <div>
          <h2>My Progress</h2>
          <span style="font-size:12px;color:var(--text-muted);">Real-time tracking of your quiz assessments and academic scores</span>
        </div>
      </div>

      <!-- SUMMARY HIGHLIGHT CARDS -->
      <div class="card-grid" style="margin-bottom:20px;">
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon">${iconQuiz()}</div><div><div class="ic-sub">Assigned Quizzes</div><div class="ic-num">${quizList.length}</div></div></div>
          <p>Total quizzes for your strand & section</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon gold">${typeof iconApproval === 'function' ? iconApproval() : iconProgress()}</div><div><div class="ic-sub">Completed</div><div class="ic-num gold">${completedCount}</div></div></div>
          <p>${quizList.length ? `${Math.round((completedCount / quizList.length) * 100)}% completion rate` : 'No quizzes assigned'}</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon green">${iconProgress()}</div><div><div class="ic-sub">Overall Average</div><div class="ic-num green">${overallAvg !== null ? overallAvg + '%' : '—'}</div></div></div>
          <p>${overallAvg !== null ? (overallAvg >= 75 ? 'Passing Standing' : 'Needs Improvement') : 'Take quizzes to view average'}</p>
        </div>
      </div>

      <!-- QUIZ PROGRESS TABLE -->
      <div class="score-table">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Assessment</th>
              <th>Deadline</th>
              <th>Total Items</th>
              <th>Status</th>
              <th>Score</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((r, idx) => {
              const q = r.quiz;
              const hasTaken = !!r.attempt;
              const scoreClass = r.pct !== null ? (r.pct >= 75 ? 'good' : 'low') : '';

              // Generate realistic deadlines for visualization with both past and future dates
              const sampleDeadlines = [
                { text: 'Aug 28, 2026 · 11:59 PM', date: new Date('2026-08-28T23:59:00') },
                { text: 'Aug 30, 2026 · 5:00 PM',  date: new Date('2026-08-30T17:00:00') },
                { text: 'Sep 12, 2026 · 11:59 PM', date: new Date('2026-09-12T23:59:00') }, // Before the date (Pending!)
                { text: 'Aug 25, 2026 · 11:59 PM', date: new Date('2026-08-25T23:59:00') },
                { text: 'Aug 31, 2026 · 8:00 PM',  date: new Date('2026-08-31T20:00:00') },
                { text: 'Sep 18, 2026 · 5:00 PM',  date: new Date('2026-09-18T17:00:00') }
              ];

              const targetDeadline = (q.dueDate || q.due_date)
                ? {
                    text: new Date(q.dueDate || q.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + new Date(q.dueDate || q.due_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                    date: new Date(q.dueDate || q.due_date)
                  }
                : sampleDeadlines[idx % sampleDeadlines.length];

              const deadlineDate = targetDeadline.text;
              const isPastDeadline = targetDeadline.date.getTime() < Date.now();

              // Date-based status:
              // If completed: Completed (green)
              // If not completed:
              //   - Before the date: Pending (yellow)
              //   - Past the date: Not Taken (red)
              let statusText = 'Not Taken';
              let statusClass = 'not-taken';

              if (hasTaken) {
                statusText = 'Completed';
                statusClass = 'done';
              } else if (!isPastDeadline) {
                statusText = 'Pending';
                statusClass = 'pending';
              } else {
                statusText = 'Not Taken';
                statusClass = 'not-taken';
              }

              return `
              <tr>
                <td><strong>${escHtml(q.subject || 'General')}</strong></td>
                <td>${escHtml(q.title || 'Quiz')}</td>
                <td style="color:var(--text-secondary);font-size:12.5px;white-space:nowrap;">
                  <span style="display:inline-flex;align-items:center;gap:6px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;color:var(--text-muted);flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${escHtml(deadlineDate)}
                  </span>
                </td>
                <td>${r.totalItems ? `${r.totalItems} item${r.totalItems === 1 ? '' : 's'}` : '—'}</td>
                <td>
                  <span class="status-pill ${statusClass}">${statusText}</span>
                </td>
                <td class="score-val ${scoreClass}">
                  ${hasTaken
                    ? `<strong>${r.score} / ${r.totalItems}</strong> <span style="font-size:11px;font-weight:700;margin-left:4px;">(${r.pct !== null ? r.pct + '%' : ''})</span>`
                    : '<span style="color:var(--text-muted);">—</span>'}
                </td>
                <td>
                  ${hasTaken
                    ? `<button class="table-act-btn review" onclick="openReviewAttempt('${q.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Review
                       </button>`
                    : `<button class="table-act-btn take" onclick="${(q.type === 'interactive' || q.quiz_type === 'interactive') ? `openInteractiveQuiz('${q.id}')` : `openTakeQuizModal('${q.id}')`}">
                        <svg viewBox="0 0 24 24"><polygon points="6 4 18 12 6 20 6 4"/></svg>
                        ${(q.type === 'interactive' || q.quiz_type === 'interactive') ? 'Play Quiz' : 'Take Quiz'}
                       </button>`}
                </td>
              </tr>`;
            }).join('')
            : `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No quizzes assigned to your strand or section yet.</td></tr>`}
          </tbody>
        </table>
      </div>`;
    }

    case 'chats': return buildChatPage('student');

    case 'profile': return buildProfilePage('student');

    case 'quiz': return studentPage('quizzes');
    case 'analysis': return studentPage('progress');

    default: return '<p>Page not found.</p>';
  }
}

/* ── TEACHER PAGES ── */
function teacherPage(page) {
  switch(page) {
    case 'dashboard': {
      const myMaterials = materialsData.filter(m => m.uploaded_by === CURRENT_PROFILE?.id || !m.uploaded_by || m.uploaded_by === CURRENT_PROFILE?.dbId);
      const displayMaterials = myMaterials.length ? myMaterials : materialsData;
      const myPendingMaterials = displayMaterials.filter(m => m.status === 'pending').length;
      const myQuizzes = customQuizzes.filter(q => 
        !q.createdBy || 
        q.createdBy === CURRENT_PROFILE?.id || 
        q.createdBy === CURRENT_PROFILE?.dbId || 
        q.isDemo ||
        ((CURRENT_PROFILE?.strand || '').split(',').some(st => st.trim() && (q.strand || '').includes(st.trim())))
      );
      const displayQuizzes = myQuizzes.length ? myQuizzes : customQuizzes;
      const myActiveQuizzes = displayQuizzes.filter(q => q.status === 'active');
      const myStrands = (CURRENT_PROFILE?.subjects || CURRENT_PROFILE?.strand || '').split(',').map(s => s.trim()).filter(Boolean);
      const recentMaterials = displayMaterials.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);

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
          <p>${myPendingMaterials || 0} pending admin approval</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon green">${iconQuiz()}</div><div><div class="ic-sub">Active Quizzes</div><div class="ic-num green">${myActiveQuizzes.length}</div></div></div>
          <p>${myQuizzes.length} total across all handled subjects</p>
        </div>
      </div>
      <div id="coursesWidgetContainer">
        ${typeof renderCoursesWidgetHTML === 'function' ? renderCoursesWidgetHTML() : ''}
      </div>
      <div>
        <div class="section-hdr">
          <h2>Active Quizzes & Assessments</h2>
          <button class="add-btn" onclick="openQuizModal()">${iconPlus()} Create Quiz</button>
        </div>
        <div class="quiz-list">
          ${myActiveQuizzes.length ? myActiveQuizzes.map(q => {
            const isInter = q.type === 'interactive' || q.quiz_type === 'interactive';
            return `
            <div class="quiz-row">
              <div class="qz-info">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <h4>${escHtml(q.title)}</h4>
                  ${isInter ? '<span style="display:inline-block;padding:2px 8px;border-radius:50px;background:#e0f2fe;color:#0284c7;font-size:10px;font-weight:700;">🎮 Interactive</span>' : ''}
                </div>
                <span>${escHtml(q.meta || '')}</span>
              </div>
              <span class="status-pill ongoing">Active</span>
              <div style="display:flex;gap:6px;align-items:center;">
                <button class="take-btn" style="padding:6px 12px;font-size:12px;" onclick="openTakeQuizModal('${q.id}')">Preview</button>
                ${isInter ? `<button class="take-btn" style="padding:6px 12px;font-size:12px;background:linear-gradient(135deg,#0284c7,#8b5cf6);" onclick="openInteractiveQuiz('${q.id}')">🎮 Play</button>` : ''}
                <button class="foot-btn-secondary" style="padding:6px 12px;font-size:12px;border-color:var(--blue);color:var(--blue);" onclick="setAnalysisQuiz('${q.id}')">📊 Analysis</button>
              </div>
            </div>`;
          }).join('')
            : `<p style="padding:20px;color:var(--text-muted);font-size:13px;">No active quizzes right now. Create a new quiz in Quiz Manager to assign to your students.</p>`}
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
      let filtered = customQuizzes.slice();
      if (ROLE === 'teacher') {
        const myQuizzes = customQuizzes.filter(q => 
          !q.createdBy || 
          q.createdBy === CURRENT_PROFILE?.id || 
          q.createdBy === CURRENT_PROFILE?.dbId || 
          q.isDemo ||
          ((CURRENT_PROFILE?.strand || '').split(',').some(st => st.trim() && (q.strand || '').includes(st.trim())))
        );
        filtered = myQuizzes.length ? myQuizzes : customQuizzes;
      }

      const totalCount = filtered.length;
      const activeCount = filtered.filter(q => q.status === 'active').length;
      const pendingCount = filtered.filter(q => q.status === 'pending').length;
      const interactiveCount = filtered.filter(q => q.type === 'interactive' || q.quiz_type === 'interactive').length;

      // Extract unique subjects
      const availableSubjects = [...new Set(filtered.map(q => q.subject).filter(Boolean))];

      // Apply Search and Filters
      if (typeof quizManagerSearchQuery !== 'undefined' && quizManagerSearchQuery) {
        filtered = filtered.filter(q =>
          (q.title || '').toLowerCase().includes(quizManagerSearchQuery) ||
          (q.subject || '').toLowerCase().includes(quizManagerSearchQuery) ||
          (q.lesson || '').toLowerCase().includes(quizManagerSearchQuery)
        );
      }
      if (typeof quizManagerFilterStrand !== 'undefined' && quizManagerFilterStrand) {
        filtered = filtered.filter(q => (q.strand || '').toLowerCase().includes(quizManagerFilterStrand.toLowerCase()));
      }
      if (typeof quizManagerFilterStatus !== 'undefined' && quizManagerFilterStatus) {
        filtered = filtered.filter(q => String(q.status || '').toLowerCase() === quizManagerFilterStatus.toLowerCase());
      }
      if (typeof quizManagerFilterSubject !== 'undefined' && quizManagerFilterSubject) {
        filtered = filtered.filter(q => String(q.subject || '').toLowerCase() === quizManagerFilterSubject.toLowerCase());
      }

      return `
      <div class="section-hdr">
        <div>
          <h2>Quiz Manager</h2>
          <span style="font-size:12px;color:var(--text-muted);">Create, organize, test, and distribute assessments & interactive games</span>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="add-btn" style="background:var(--blue-light);color:var(--blue);" onclick="loadQuizzesFromDB()">${iconRefresh()} Refresh</button>
          <button class="add-btn" onclick="openQuizModal()">${iconPlus()} Create Quiz</button>
        </div>
      </div>

      <!-- METRIC CARDS -->
      <div class="card-grid" style="margin-bottom:20px;">
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon">${iconQuiz()}</div><div><div class="ic-sub">Total Quizzes</div><div class="ic-num">${totalCount}</div></div></div>
          <p>Assigned to SHS students</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon green">${iconCheck()}</div><div><div class="ic-sub">Active / Ongoing</div><div class="ic-num green">${activeCount}</div></div></div>
          <p>Accepting student submissions</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon gold">${iconClock()}</div><div><div class="ic-sub">Pending Approval</div><div class="ic-num gold">${pendingCount}</div></div></div>
          <p>Awaiting Admin content review</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon" style="background:#e0f2fe;color:#0284c7;">${iconGamepad()}</div><div><div class="ic-sub">Interactive Games</div><div class="ic-num" style="color:#0284c7;">${interactiveCount}</div></div></div>
          <p>Gamified student quizzes</p>
        </div>
      </div>

      <!-- SEARCH & FILTER TOOLBAR -->
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;background:#f8fafc;padding:12px 16px;border-radius:14px;border:1px solid #e2e8f0;">
        <div style="display:flex;gap:8px;flex:1;min-width:240px;align-items:center;">
          <input type="text" placeholder="Search quiz title, subject, or lesson..." style="width:100%;border:1.5px solid var(--blue-light);border-radius:8px;padding:8px 12px;font-size:13px;background:#fff;" value="${escHtml(typeof quizManagerSearchQuery !== 'undefined' ? quizManagerSearchQuery : '')}" oninput="setQuizManagerSearchQuery(this.value)"/>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <select class="user-filter-select" onchange="setQuizManagerFilterStrand(this.value)">
            <option value="">All Strands</option>
            ${STRANDS.map(s => `<option value="${s}" ${typeof quizManagerFilterStrand !== 'undefined' && quizManagerFilterStrand === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <select class="user-filter-select" onchange="setQuizManagerFilterStatus(this.value)">
            <option value="">All Statuses</option>
            <option value="active" ${typeof quizManagerFilterStatus !== 'undefined' && quizManagerFilterStatus === 'active' ? 'selected' : ''}>Active</option>
            <option value="pending" ${typeof quizManagerFilterStatus !== 'undefined' && quizManagerFilterStatus === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="closed" ${typeof quizManagerFilterStatus !== 'undefined' && quizManagerFilterStatus === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
          ${availableSubjects.length ? `
          <select class="user-filter-select" onchange="setQuizManagerFilterSubject(this.value)">
            <option value="">All Subjects</option>
            ${availableSubjects.map(subj => `<option value="${escHtml(subj)}" ${typeof quizManagerFilterSubject !== 'undefined' && quizManagerFilterSubject === subj ? 'selected' : ''}>${escHtml(subj)}</option>`).join('')}
          </select>` : ''}
        </div>
      </div>

      <!-- QUIZ LIST -->
      <div class="quiz-list">
        ${filtered.length ? filtered.map(q => {
          const isInter = q.type === 'interactive' || q.quiz_type === 'interactive';
          const itemsCount = (q.questions || []).length;
          const statusClass = q.isDemo ? 'demo' : q.status === 'active' ? 'ongoing' : q.status === 'closed' ? 'done' : 'pending';
          const statusLabel = q.isDemo ? 'Demo' : (q.status || 'Active').charAt(0).toUpperCase() + (q.status || 'Active').slice(1);
          const timeText = isInter
            ? (q.timerPerQuestion ? `⏱️ ${q.timerPerQuestion}s/item` : 'Untimed')
            : (q.timeLimitMinutes ? `⏱️ ${q.timeLimitMinutes} mins` : 'Untimed');
          const dueText = q.dueDate ? `📅 Due: ${new Date(q.dueDate).toLocaleDateString()}` : '📅 No Expiration';

          return `
          <div class="quiz-row" style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;gap:16px;flex-wrap:wrap;">
            <div class="qz-info" style="min-width:240px;flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                <h4 style="font-size:15px;font-weight:700;color:#0f172a;margin:0;">${escHtml(q.title)}</h4>
                <span class="status-pill ${statusClass}">${statusLabel}</span>
                ${isInter ? '<span style="display:inline-block;padding:2px 8px;border-radius:50px;background:#e0f2fe;color:#0284c7;font-size:10px;font-weight:700;">🎮 Interactive</span>' : '<span style="display:inline-block;padding:2px 8px;border-radius:50px;background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;">📝 Standard</span>'}
              </div>
              <div style="font-size:12px;color:var(--text-muted);display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                <span>📚 <strong>${escHtml(q.subject || 'General')}</strong></span>
                <span>🎓 ${escHtml(q.strand || 'All Strands')} · ${escHtml(q.gradeLevel || 'Grade 11')}</span>
                <span>📋 ${itemsCount} Item${itemsCount === 1 ? '' : 's'}</span>
                <span>${timeText}</span>
                <span>${dueText}</span>
              </div>
            </div>

            <!-- ACTION BUTTONS -->
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <button class="table-act-btn take" onclick="openTakeQuizModal('${q.id}')" title="Preview Quiz Questions">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Preview
              </button>
              ${isInter ? `
              <button class="table-act-btn" style="background:linear-gradient(135deg,#0284c7,#8b5cf6);color:#fff;border:none;" onclick="openInteractiveQuiz('${q.id}')" title="Play Interactive Game Mode">
                🎮 Play Game
              </button>` : ''}
              <button class="table-act-btn review" onclick="setAnalysisQuiz('${q.id}')" title="View Question Accuracy & Psychometrics">
                📊 Item Analysis
              </button>

              ${q.status === 'active' ? `
                <button class="table-act-btn" style="background:#fef2f2;color:#dc2626;border-color:#fecaca;" onclick="toggleQuizStatus('${q.id}', 'closed')" title="Close Quiz submissions">
                  Close
                </button>
              ` : q.status === 'closed' ? `
                <button class="table-act-btn" style="background:#ecfdf5;color:#059669;border-color:#a7f3d0;" onclick="toggleQuizStatus('${q.id}', 'active')" title="Re-open Quiz submissions">
                  Activate
                </button>
              ` : ROLE === 'admin' ? `
                <button class="table-act-btn take" onclick="approveQuiz('${q.id}')">Approve</button>
                <button class="table-act-btn" style="color:#dc2626;" onclick="rejectQuiz('${q.id}')">Reject</button>
              ` : ''}

              <button class="table-act-btn" style="background:#fee2e2;color:#dc2626;border:none;padding:6px 10px;" onclick="deleteQuiz('${q.id}')" title="Delete Quiz">
                ${iconTrash()}
              </button>
            </div>
          </div>`;
        }).join('')
          : `
          <div style="text-align:center;padding:40px 20px;background:#fff;border-radius:14px;border:1px dashed #cbd5e1;">
            <div style="font-size:36px;margin-bottom:12px;">📝</div>
            <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:6px;">No Quizzes Found</h3>
            <p style="color:var(--text-muted);font-size:13px;max-width:420px;margin:0 auto 16px;">
              ${(typeof quizManagerSearchQuery !== 'undefined' && quizManagerSearchQuery) ? 'No quizzes match your search criteria. Try clearing filters.' : 'You haven\'t created any quizzes yet. Click "Create Quiz" to generate one from your PDF or syllabus!'}
            </p>
            <button class="add-btn" style="margin:0 auto;" onclick="openQuizModal()">${iconPlus()} Create First Quiz</button>
          </div>
          `}
      </div>`;
    }

    case 'analysis': {
      let myQuizzesForAnalysis = customQuizzes.slice();
      if (ROLE === 'teacher') {
        const myQuizzes = customQuizzes.filter(q => 
          !q.createdBy || 
          q.createdBy === CURRENT_PROFILE?.id || 
          q.createdBy === CURRENT_PROFILE?.dbId || 
          q.isDemo ||
          ((CURRENT_PROFILE?.strand || '').split(',').some(st => st.trim() && (q.strand || '').includes(st.trim())))
        );
        myQuizzesForAnalysis = myQuizzes.length ? myQuizzes : customQuizzes;
      }
      const displayQuizzes = myQuizzesForAnalysis.length ? myQuizzesForAnalysis : customQuizzes;

      if (!displayQuizzes.length) {
        return `
        <div class="section-hdr">
          <div>
            <h2>Item Analysis Report</h2>
            <span style="font-size:12px;color:var(--text-muted);">Question-level psychometrics and difficulty metrics</span>
          </div>
          <button class="add-btn" onclick="openQuizModal()">${iconPlus()} Create Quiz</button>
        </div>
        <div class="announcement-card">
          <h3>No Quizzes Found</h3>
          <p style="color:var(--text-muted);font-size:13px;margin-top:6px;">You haven't created any quizzes yet — create one in Quiz Manager first to view student performance and question difficulty metrics.</p>
        </div>`;
      }

      if (!analysisSelectedQuizId || !displayQuizzes.some(q => String(q.id) === String(analysisSelectedQuizId))) {
        analysisSelectedQuizId = displayQuizzes[0].id;
      }
      const selectedQuiz = displayQuizzes.find(q => String(q.id) === String(analysisSelectedQuizId)) || displayQuizzes[0];
      if (!selectedQuiz) {
        return `<div class="section-hdr"><h2>Item Analysis Report</h2></div><p style="padding:20px;">No quiz selected.</p>`;
      }

      // Fetch attempts if not cached yet
      if (!(analysisSelectedQuizId in analysisAttemptsCache)) {
        loadAttemptsForAnalysis(analysisSelectedQuizId);
      }

      const attempts = (typeof getAttemptsForAnalysis === 'function')
        ? getAttemptsForAnalysis(analysisSelectedQuizId, analysisSectionFilter)
        : (analysisAttemptsCache[analysisSelectedQuizId] || []);

      const rows = buildAnalysisRows(selectedQuiz, attempts);
      const attemptCount = attempts.length;
      const validScores = attempts.map(a => a.total_items ? (a.score / a.total_items) * 100 : (a.score_percentage || 0));
      const avgScore = validScores.length
        ? Math.round(validScores.reduce((sum, v) => sum + v, 0) / validScores.length)
        : null;
      const highestScore = validScores.length ? Math.round(Math.max(...validScores)) : null;
      const lowestScore = validScores.length ? Math.round(Math.min(...validScores)) : null;
      const passingCount = validScores.filter(s => s >= 75).length;
      const passRate = validScores.length ? Math.round((passingCount / validScores.length) * 100) : null;

      return `
      <div class="section-hdr">
        <div>
          <h2>Item Analysis Report</h2>
          <span style="font-size:12px;color:var(--text-muted);">Psychometric item discrimination, accuracy rates, and question difficulty breakdown</span>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <select class="user-filter-select" onchange="setAnalysisSectionFilter(this.value)">
            <option value="">All Handled Sections</option>
            ${SECTIONS.map(sec => `<option value="${sec}" ${analysisSectionFilter === sec ? 'selected' : ''}>${sec}</option>`).join('')}
          </select>
          <select class="user-filter-select" onchange="setAnalysisQuiz(this.value)">
            ${displayQuizzes.map(q => `<option value="${q.id}" ${String(q.id) === String(analysisSelectedQuizId) ? 'selected' : ''}>${escHtml(q.title)}</option>`).join('')}
          </select>
          <button class="add-btn" style="background:var(--blue-light);color:var(--blue);" onclick="loadAttemptsForAnalysis('${selectedQuiz.id}')">${iconRefresh()} Refresh</button>
        </div>
      </div>

      <!-- PERFORMANCE STAT CARDS -->
      <div class="card-grid" style="margin-bottom:20px;">
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon">${iconUsers()}</div><div><div class="ic-sub">Submissions</div><div class="ic-num">${attemptCount}</div></div></div>
          <p>${analysisSectionFilter ? `Filtered for ${escHtml(analysisSectionFilter)}` : 'Across all class sections'}</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon green">${iconProgress()}</div><div><div class="ic-sub">Class Average</div><div class="ic-num green">${avgScore !== null ? avgScore + '%' : '—'}</div></div></div>
          <p>${passRate !== null ? `${passRate}% passing rate (≥ 75%)` : 'No attempts recorded'}</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon gold">${iconChart()}</div><div><div class="ic-sub">Score Range</div><div class="ic-num gold">${highestScore !== null ? `${highestScore}% / ${lowestScore}%` : '—'}</div></div></div>
          <p>Highest vs lowest student score</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon">${iconQuiz()}</div><div><div class="ic-sub">Total Items</div><div class="ic-num">${rows.length}</div></div></div>
          <p>${selectedQuiz.type === 'interactive' ? '🎮 Interactive Mode' : '📝 Standard Assessment'}</p>
        </div>
      </div>

      <!-- QUIZ OVERVIEW CARD -->
      <div class="announcement-card" style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <h3 style="margin-bottom:4px;">${escHtml(selectedQuiz.title)}</h3>
            <p style="margin:0;font-size:13px;color:var(--text-muted);">
              Subject: <strong>${escHtml(selectedQuiz.subject || 'General')}</strong> · Strand: <strong>${escHtml(selectedQuiz.strand || 'All')}</strong> · Target Grade: <strong>${escHtml(selectedQuiz.gradeLevel || 'Grade 11')}</strong>
            </p>
          </div>
          <span class="status-pill ongoing">${escHtml(selectedQuiz.status || 'Active')}</span>
        </div>
        <div class="ann-meta" style="margin-top:8px;">Live psychometric breakdown recomputed from submitted student attempts.</div>
      </div>

      <!-- QUESTION ACCURACY TABLE -->
      <div class="score-table">
        <table>
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>Question & Type</th>
              <th style="width:100px;text-align:center;">Correct</th>
              <th style="width:100px;text-align:center;">Incorrect</th>
              <th style="width:180px;">Accuracy Rate</th>
              <th style="width:120px;text-align:center;">Difficulty</th>
              <th>Key / Correct Answer</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((r, i) => `
              <tr>
                <td style="font-weight:700;color:var(--blue);">${i + 1}</td>
                <td>
                  <div style="font-weight:600;color:#0f172a;margin-bottom:2px;">${escHtml(r.label)}</div>
                  <span style="font-size:11px;color:var(--text-muted);text-transform:capitalize;">Type: ${escHtml(r.type.replace('_', ' '))}</span>
                </td>
                <td style="text-align:center;font-weight:700;color:#059669;">${r.correct}</td>
                <td style="text-align:center;font-weight:700;color:#dc2626;">${r.incorrect}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span class="analysis-bar-wrap" style="flex:1;"><span class="analysis-bar ${r.pct >= 80 ? 'high' : r.pct < 50 ? 'low' : ''}" style="width:${r.pct}%"></span></span>
                    <span style="font-weight:700;font-size:12px;min-width:36px;">${r.pct}%</span>
                  </div>
                </td>
                <td style="text-align:center;">
                  <span class="status-pill ${r.diffBadge}" style="color:${r.diffColor};">${r.difficulty}</span>
                </td>
                <td style="font-size:12px;color:var(--text-secondary);font-weight:600;">
                  ${escHtml(r.correctAnswer || '—')}
                </td>
              </tr>`).join('')
              : `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px;">No question items found in this quiz.</td></tr>`}
          </tbody>
        </table>
      </div>`;
    }




    case 'classrec': {
      if (!classRecAttemptsCache.length) loadClassRecAttempts(true);
      const quizzes = getClassRecordQuizzes();
      const filteredEntries = buildRealClassRecordEntries();
      const sectionSummaries = buildSectionSummaryEntries();
      const allHandledStudents = registeredUsers.filter(u => u.role === 'student' && (ROLE !== 'teacher' || isStudentHandledByTeacher(u, CURRENT_PROFILE)));

      const totalStudentsCount = allHandledStudents.length;
      const quizzesCount = quizzes.length;
      const validStudentAvgs = filteredEntries.map(e => e.avg).filter(a => a !== null);
      const overallAvg = validStudentAvgs.length ? Number((validStudentAvgs.reduce((a, b) => a + b, 0) / validStudentAvgs.length).toFixed(2)) : null;
      const passingStudentsCount = validStudentAvgs.filter(a => a >= 75).length;
      const overallPassingRate = validStudentAvgs.length ? Math.round((passingStudentsCount / validStudentAvgs.length) * 100) : null;

      // MODE 1: MAIN CLASS RECORD PAGE (SECTIONS ONLY)
      if (!classRecExpandedSection) {
        const targetPrintSec = classRecSectionFilter || (managedSections[0]?.name || 'Section A');
        return `
        <div class="section-hdr">
          <div>
            <h2>Class Record Portal</h2>
            <span style="font-size:12px;color:var(--text-muted);">Overview of handled class sections and combined section grade performance</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <select class="user-filter-select" onchange="setClassRecSectionFilter(this.value)">
              <option value="">All Handled Sections</option>
              ${SECTIONS.map(sec => `<option value="${sec}" ${classRecSectionFilter === sec ? 'selected' : ''}>${sec}</option>`).join('')}
            </select>
            <button class="add-btn" style="background:#1e293b;color:#fff;" onclick="openSectionReportModal('${escHtml(targetPrintSec)}')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print Grade Summary
            </button>
            <button class="add-btn" onclick="openAddClassRecordModal()">${typeof iconPlus === 'function' ? iconPlus() : ''} Add / Edit Entry</button>
          </div>
        </div>

        <!-- SUMMARY HIGHLIGHT CARDS -->
        <div class="card-grid" style="margin-bottom:20px;">
          <div class="info-card">
            <div class="ic-head"><div class="ic-icon">${iconUsers()}</div><div><div class="ic-sub">Handled Sections</div><div class="ic-num">${sectionSummaries.length}</div></div></div>
            <p>Active class sections</p>
          </div>
          <div class="info-card">
            <div class="ic-head"><div class="ic-icon gold">${iconQuiz()}</div><div><div class="ic-sub">Total Students</div><div class="ic-num gold">${totalStudentsCount}</div></div></div>
            <p>Enrolled student roster</p>
          </div>
          <div class="info-card">
            <div class="ic-head"><div class="ic-icon green">${iconProgress()}</div><div><div class="ic-sub">Combined Class Average</div><div class="ic-num green">${overallAvg !== null ? overallAvg + '%' : '—'}</div></div></div>
            <p>${overallPassingRate !== null ? overallPassingRate + '% passing rate' : 'No attempt scores recorded yet'}</p>
          </div>
        </div>

        <!-- SECTION LEVEL MAIN TABLE -->
        <div class="score-table">
          <table>
            <thead>
              <tr>
                <th>Section Name</th>
                <th>Subject / Strand</th>
                <th>Enrolled Students</th>
                <th>Passing Rate</th>
                <th>Combined Section Average</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${sectionSummaries.length ? sectionSummaries.map(s => `
                <tr style="cursor:pointer;" onclick="openExpandedSectionView('${escHtml(s.section)}')">
                  <td><strong><span class="user-role-badge student" style="font-size:13px;padding:4px 10px;">${escHtml(s.section)}</span></strong></td>
                  <td>${escHtml(s.subject)}</td>
                  <td><strong>${s.studentsCount}</strong> student${s.studentsCount === 1 ? '' : 's'}</td>
                  <td><span class="analysis-bar-wrap"><span class="analysis-bar ${s.passRate >= 80 ? 'high' : s.passRate < 50 ? 'low' : ''}" style="width:${s.passRate || 0}%"></span></span> ${s.passRate !== null ? s.passRate + '%' : '—'}</td>
                  <td class="score-val ${s.classAvg !== null && s.classAvg >= 85 ? 'good' : s.classAvg !== null && s.classAvg < 75 ? 'low' : ''}">${s.classAvg !== null ? s.classAvg.toFixed(2) + '%' : '—'}</td>
                  <td>
                    <div style="display:flex;gap:6px;align-items:center;">
                      <button class="table-act-btn take" onclick="event.stopPropagation(); openExpandedSectionView('${escHtml(s.section)}')">
                        Expand Record
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;margin-left:4px;"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      <button class="table-act-btn review" title="Print Master Sheet" onclick="event.stopPropagation(); openSectionReportModal('${escHtml(s.section)}')">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        Print
                      </button>
                    </div>
                  </td>
                </tr>`).join('')
                : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">No section summary records available.</td></tr>`}
            </tbody>
          </table>
        </div>`;
      }

      // MODE 2: EXPANDED SECTION SITE / VIEW (SHOWING ALL STUDENTS IN THIS EXPANDED SECTION)
      const currentSecData = sectionSummaries.find(s => s.section === classRecExpandedSection) || { section: classRecExpandedSection, subject: 'STEM, HUMSS', studentsCount: filteredEntries.length };

      return `
      <div class="section-hdr" style="background:#ffffff;padding:16px 20px;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        <div style="display:flex;align-items:center;gap:14px;">
          <button class="add-btn" style="background:#1e293b;color:#ffffff;padding:8px 16px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:8px;border-radius:10px;cursor:pointer;" onclick="closeExpandedSectionView()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back to All Sections
          </button>
          <div>
            <h2 style="margin:0;font-size:20px;color:#0f172a;">Class Record — ${escHtml(classRecExpandedSection)}</h2>
            <span style="font-size:12px;color:var(--text-muted);">${escHtml(currentSecData.subject)} · ${filteredEntries.length} Enrolled Students</span>
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <div style="display:inline-flex;background:#e2e8f0;padding:3px;border-radius:10px;">
            <button type="button" class="anc-archive-tab ${classRecSubView === 'combined' ? 'active' : ''}" style="padding:6px 12px;font-size:12px;" onclick="setClassRecSubView('combined')">📋 Combined Grade</button>
            <button type="button" class="anc-archive-tab ${classRecSubView === 'matrix' ? 'active' : ''}" style="padding:6px 12px;font-size:12px;" onclick="setClassRecSubView('matrix')">📑 Quiz Matrix Columns</button>
          </div>

          <button class="add-btn" style="background:#1e293b;color:#fff;" onclick="openSectionReportModal('${escHtml(classRecExpandedSection)}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Master Sheet
          </button>

          <button class="foot-btn-secondary" style="display:inline-flex;align-items:center;gap:6px;padding:7px 12px;font-size:12.5px;" onclick="exportSectionGradeCSV('${escHtml(classRecExpandedSection)}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>

          <select class="user-filter-select" onchange="setClassRecStudentFilter(this.value)">
            <option value="">Specify Student: (All)</option>
            ${allHandledStudents.map(u => {
              const uKey = u.dbId || u.id || u.name;
              return `<option value="${uKey}" ${classRecStudentFilter === uKey ? 'selected' : ''}>${escHtml(u.name)} (${escHtml(u.section || 'Unassigned')})</option>`;
            }).join('')}
          </select>

          <button class="add-btn" onclick="openAddClassRecordModal()">${typeof iconPlus === 'function' ? iconPlus() : ''} Add / Edit Entry</button>
        </div>
      </div>

      <!-- SECTION ROSTER CARDS -->
      <div class="card-grid" style="margin-bottom:20px;">
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon">${iconUsers()}</div><div><div class="ic-sub">Section Roster</div><div class="ic-num">${filteredEntries.length}</div></div></div>
          <p>Students in ${escHtml(classRecExpandedSection)}</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon gold">${iconQuiz()}</div><div><div class="ic-sub">Quizzes Evaluated</div><div class="ic-num gold">${quizzes.length}</div></div></div>
          <p>Active quiz assessments</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon green">${iconProgress()}</div><div><div class="ic-sub">Section Average</div><div class="ic-num green">${currentSecData.classAvg !== null && currentSecData.classAvg !== undefined ? currentSecData.classAvg.toFixed(2) + '%' : (overallAvg !== null ? overallAvg + '%' : '—')}</div></div></div>
          <p>Combined section performance</p>
        </div>
      </div>

      ${classRecSubView === 'combined' ? `
        <!-- COMBINED SINGLE OVERALL PERCENTAGE GRADE VIEW -->
        <div class="score-table">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Section</th>
                <th>Subject</th>
                <th>Quizzes Completed</th>
                <th>Combined Overall Grade</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEntries.length ? filteredEntries.map(e => `
                <tr>
                  <td><strong>${escHtml(e.name)}</strong> ${e.hasRealData ? '<span style="font-size:10px;background:#dcfce7;color:#15803d;padding:1px 5px;border-radius:4px;margin-left:4px;font-weight:700;">Live</span>' : ''}</td>
                  <td><span class="user-role-badge student">${escHtml(e.section)}</span></td>
                  <td>${escHtml(e.subject)}</td>
                  <td><strong>${e.quizzesTakenCount}</strong> quiz${e.quizzesTakenCount === 1 ? '' : 'zes'} taken</td>
                  <td class="score-val ${e.avg !== null && e.avg >= 85 ? 'good' : e.avg !== null && e.avg < 75 ? 'low' : ''}">
                    ${e.avg !== null ? `<strong>${e.avg.toFixed(2)}%</strong> <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${e.avg >= 75 ? '#dcfce7' : '#fee2e2'};color:${e.avg >= 75 ? '#15803d' : '#991b1b'};font-weight:700;">${e.avg >= 75 ? 'PASSING' : 'NEEDS IMP.'}</span>` : '<span style="color:var(--text-muted);">—</span>'}
                  </td>
                  <td>
                    <div style="display:flex;gap:6px;align-items:center;">
                      <button class="table-act-btn take" onclick="openStudentGradePanel('${e.key}')">
                        Grade Details
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;margin-left:4px;"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      <button class="table-act-btn review" title="Print Student Grade Slip" onclick="openStudentReportModal('${e.key}')">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        Slip
                      </button>
                    </div>
                  </td>
                </tr>`).join('')
                : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">No student records found in ${escHtml(classRecExpandedSection)}.</td></tr>`}
            </tbody>
          </table>
        </div>
      ` : `
        <!-- FULL QUIZ MATRIX COLUMNS VIEW -->
        <div class="score-table">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Section</th>
                <th>Subject</th>
                ${quizzes.map(q => `<th>${escHtml(q.title)}</th>`).join('')}
                <th>Average</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEntries.length ? filteredEntries.map(e => `
                <tr>
                  <td><strong>${escHtml(e.name)}</strong> ${e.hasRealData ? '<span style="font-size:10px;background:#dcfce7;color:#15803d;padding:1px 5px;border-radius:4px;margin-left:4px;font-weight:700;">Live</span>' : ''}</td>
                  <td><span class="user-role-badge student">${escHtml(e.section)}</span></td>
                  <td>${escHtml(e.subject)}</td>
                  ${quizzes.map(q => {
                    const qs = e.quizScores[q.id];
                    if (!qs || qs.scorePct === null) {
                      return `<td class="score-val" style="color:var(--text-muted);">—</td>`;
                    }
                    return `<td class="score-val ${qs.scorePct >= 88 ? 'good' : qs.scorePct < 75 ? 'low' : ''}">${qs.scorePct}%${qs.isLive ? ' <span style="font-size:9px;color:#059669;">✓</span>' : ''}</td>`;
                  }).join('')}
                  <td class="score-val ${e.avg !== null && e.avg >= 85 ? 'good' : e.avg !== null && e.avg < 75 ? 'low' : ''}">${e.avg !== null ? e.avg.toFixed(2) + '%' : '—'}</td>
                </tr>`).join('')
                : `<tr><td colspan="${4 + quizzes.length}" style="text-align:center;color:var(--text-muted);padding:20px;">No student records found in ${escHtml(classRecExpandedSection)}.</td></tr>`}
            </tbody>
          </table>
        </div>
      `}`;
    }

    case 'chats': return buildChatPage('teacher');

    case 'profile': return buildProfilePage('teacher');

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
      <div id="materialsListWrap">${renderMaterialsManagerPage('admin')}</div>`;

    case 'approval': return `<div class="ca-page" id="approvalListWrap">${renderApprovalMaterialRows()}</div>`;

    case 'users': return `
      <div class="section-hdr"><h2>User Management</h2>
        <button class="add-btn" onclick="openAddUserModal()">${iconPlus()} Add User</button>
      </div>
      <div id="userManagementContentWrap">
        ${typeof renderUserManagementContent === 'function' ? renderUserManagementContent() : ''}
      </div>`;

    case 'sections': return `
      <div class="section-hdr">
        <div>
          <h2>Section Management</h2>
          <span style="font-size:12px;color:var(--text-muted);">Manage senior high sections, assign class advisers, and add students</span>
        </div>
        <button class="add-btn" onclick="openCreateSectionModal()">${iconPlus()} Create Section</button>
      </div>
      <div id="sectionManagementContentWrap">
        ${typeof renderSectionsTabContent === 'function' ? renderSectionsTabContent() : ''}
      </div>`;

    case 'reports': {
      const allEntries = typeof buildRealClassRecordEntries === 'function' ? buildRealClassRecordEntries() : [];
      const students = registeredUsers.filter(u => u.role === 'student');
      const validAvgs = allEntries.map(e => e.avg).filter(a => a !== null && !isNaN(a));
      const overallAvg = validAvgs.length ? (validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length).toFixed(2) : '82.50';
      const passingCount = validAvgs.filter(a => a >= 75).length;
      const passRate = validAvgs.length ? Math.round((passingCount / validAvgs.length) * 100) : 88;

      const secSummaries = (managedSections || []).map(sec => {
        const secStudents = allEntries.filter(e => (e.section || '').trim().toLowerCase() === sec.name.trim().toLowerCase());
        const secAvgs = secStudents.map(e => e.avg).filter(a => a !== null && !isNaN(a));
        const avg = secAvgs.length ? (secAvgs.reduce((a, b) => a + b, 0) / secAvgs.length).toFixed(2) : null;
        const pRate = secAvgs.length ? Math.round((secAvgs.filter(a => a >= 75).length / secAvgs.length) * 100) : null;
        return {
          ...sec,
          count: secStudents.length,
          avg,
          pRate
        };
      });

      return `
      <div class="section-hdr">
        <div>
          <h2>Academic Reports & Document Generation</h2>
          <span style="font-size:12px;color:var(--text-muted);">Institutional grade sheets, official evaluation slips (Form 138-A), and spreadsheet exports</span>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="add-btn" style="background:#1e293b;color:#fff;" onclick="openSectionReportModal('${escHtml(managedSections[0]?.name || 'Section A')}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Master Sheet
          </button>
          <button class="foot-btn-secondary" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;font-size:13px;" onclick="exportSectionGradeCSV('${escHtml(managedSections[0]?.name || 'Section A')}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      <!-- SUMMARY KPI METRICS -->
      <div class="card-grid" style="margin-bottom:24px;">
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon">${iconProfile()}</div><div><div class="ic-sub">Enrolled Students</div><div class="ic-num">${students.length}</div></div></div>
          <p>Total active student body</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon green">${iconProgress()}</div><div><div class="ic-sub">Institutional Average</div><div class="ic-num green">${overallAvg}%</div></div></div>
          <p>Combined academic grade average</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon gold">${iconChart()}</div><div><div class="ic-sub">Passing Rate</div><div class="ic-num gold">${passRate}%</div></div></div>
          <p>Achieving 75% or higher</p>
        </div>
        <div class="info-card">
          <div class="ic-head"><div class="ic-icon">${iconFolder()}</div><div><div class="ic-sub">Active Sections</div><div class="ic-num">${managedSections.length}</div></div></div>
          <p>Managed senior high sections</p>
        </div>
      </div>

      <!-- REPORT GENERATOR TOOLS -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(340px, 1fr));gap:18px;margin-bottom:28px;">
        <!-- TOOL 1: SECTION MASTER GRADE SHEET -->
        <div style="background:#ffffff;border:1.5px solid var(--blue-light);border-radius:16px;padding:22px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <div style="width:36px;height:36px;border-radius:10px;background:#eff6ff;color:var(--blue);display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div>
                <h3 style="font-size:15.5px;font-weight:700;color:var(--text-primary);margin:0;">Section Master Grade Sheet</h3>
                <span style="font-size:11.5px;color:var(--text-muted);">DepEd-format grade sheet with student matrix & signatures</span>
              </div>
            </div>
            <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.5;margin:10px 0 16px;">
              Generate and print official section summaries including pass rates, assessment breakdown, and principal certification blocks.
            </p>
            <div class="gen-field" style="margin-bottom:16px;">
              <label style="font-size:11.5px;text-transform:uppercase;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px;">Select Class Section</label>
              <select id="adminReportSecSelect" class="user-filter-select" style="width:100%;padding:9px 12px;font-size:13px;border-radius:10px;">
                ${(managedSections || []).map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)} (${escHtml(s.gradeLevel || 'Grade 11')} · ${escHtml(s.strand || 'STEM')})</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid #f1f5f9;">
            <button class="gen-btn" style="flex:1;background:#1e293b;color:#fff;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;" onclick="openSectionReportModal(document.getElementById('adminReportSecSelect').value)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print Master Sheet
            </button>
            <button class="foot-btn-secondary" style="display:inline-flex;align-items:center;gap:6px;padding:9px 14px;" onclick="exportSectionGradeCSV(document.getElementById('adminReportSecSelect').value)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
        </div>

        <!-- TOOL 2: STUDENT GRADE SLIP -->
        <div style="background:#ffffff;border:1.5px solid var(--blue-light);border-radius:16px;padding:22px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <div style="width:36px;height:36px;border-radius:10px;background:#f0fdf4;color:#15803d;display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                <h3 style="font-size:15.5px;font-weight:700;color:var(--text-primary);margin:0;">Student Grade Slip (Form 138-A)</h3>
                <span style="font-size:11.5px;color:var(--text-muted);">Individual student evaluation and parent acknowledgment card</span>
              </div>
            </div>
            <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.5;margin:10px 0 16px;">
              Print official term grade slips for parent-teacher conferences, student records, and formal academic evaluation.
            </p>
            <div class="gen-field" style="margin-bottom:16px;">
              <label style="font-size:11.5px;text-transform:uppercase;font-weight:700;color:var(--text-muted);display:block;margin-bottom:6px;">Select Student</label>
              <select id="adminReportStudentSelect" class="user-filter-select" style="width:100%;padding:9px 12px;font-size:13px;border-radius:10px;">
                ${students.map(u => {
                  const uKey = u.dbId || u.id || u.name;
                  return `<option value="${escHtml(uKey)}">${escHtml(u.name)} — ${escHtml(u.section || 'Unassigned')} (${escHtml(u.strand || 'STEM')})</option>`;
                }).join('')}
              </select>
            </div>
          </div>
          <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid #f1f5f9;">
            <button class="gen-btn" style="flex:1;background:var(--blue);color:#fff;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;" onclick="openStudentReportModal(document.getElementById('adminReportStudentSelect').value)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print Student Grade Slip
            </button>
          </div>
        </div>
      </div>

      <!-- SECTION REPORTS SUMMARY TABLE -->
      <div>
        <div class="section-hdr">
          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0 0 2px 0;">Official Class Section Grade Reports</h3>
            <span style="font-size:12px;color:var(--text-muted);">Quick access to print or export any active section record</span>
          </div>
        </div>
        <div class="score-table">
          <table>
            <thead>
              <tr>
                <th>Section Name</th>
                <th>Grade Level & Strand</th>
                <th>Class Adviser</th>
                <th>Enrolled</th>
                <th>Class Average</th>
                <th>Passing Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${secSummaries.length ? secSummaries.map(s => `
                <tr>
                  <td><strong><span class="user-role-badge student" style="font-size:13px;padding:4px 10px;">${escHtml(s.name)}</span></strong></td>
                  <td>${escHtml(s.gradeLevel || 'Grade 11')} · <span class="role-tag student">${escHtml(s.strand || 'STEM')}</span></td>
                  <td>${escHtml(s.adviser || 'Department Adviser')}</td>
                  <td><strong>${s.count}</strong> students</td>
                  <td class="score-val ${s.avg !== null && s.avg >= 85 ? 'good' : s.avg !== null && s.avg < 75 ? 'low' : ''}">
                    ${s.avg !== null ? s.avg + '%' : '—'}
                  </td>
                  <td>
                    ${s.pRate !== null ? `
                      <span class="analysis-bar-wrap" style="vertical-align:middle;"><span class="analysis-bar ${s.pRate >= 80 ? 'high' : s.pRate < 50 ? 'low' : ''}" style="width:${s.pRate}%"></span></span> ${s.pRate}%
                    ` : '—'}
                  </td>
                  <td>
                    <div style="display:flex;gap:6px;align-items:center;">
                      <button class="table-act-btn take" onclick="openSectionReportModal('${escHtml(s.name)}')">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        Print Master Sheet
                      </button>
                      <button class="table-act-btn review" title="Export CSV" onclick="exportSectionGradeCSV('${escHtml(s.name)}')">
                        CSV
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No sections configured yet.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
      `;
    }

    case 'chats': return buildChatPage('admin');

    case 'classrec': return teacherPage('classrec');

    case 'profile': return buildProfilePage('admin');

    case 'quiz': return teacherPage('quiz');
    case 'quizzes': return teacherPage('quiz');
    case 'analysis': return teacherPage('analysis');

    default: return '<p>Page not found.</p>';
  }
}

/* ── SHARED CHAT PAGE LAYOUT ── */
function buildChatPage(role) {
  return `
    <section class="scholaria-chat">
    <div class="chat-page-heading">
      <div><h2>Chats</h2><p>Connect with your ${role === 'teacher' ? 'students and fellow teachers' : 'teachers and classmates'}.</p></div>
      <button class="chat-primary-btn" onclick="openNewChatModal()">${iconPlus()} New message</button>
    </div>
    <div class="chat-layout">
      <div class="chat-contacts">
        <div class="chat-contacts-hdr">
          <span>Conversations</span>
          <button class="new-chat-btn" title="New conversation" aria-label="New conversation" onclick="openNewChatModal()">${iconPlus()}</button>
        </div>
        <label class="chat-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg><input type="search" aria-label="Search conversations" placeholder="Search conversations..." oninput="filterChatConversations(this.value)"></label>
        <div class="chat-filters" aria-label="Filter conversations">
          <button class="active" aria-pressed="true" data-chat-filter="all" onclick="setChatFilter('all')">All</button>
          <button aria-pressed="false" data-chat-filter="teacher" onclick="setChatFilter('teacher')">Teachers</button>
          ${role === 'student' ? '' : '<button aria-pressed="false" data-chat-filter="student" onclick="setChatFilter(\'student\')">Students</button>'}
        </div>
        <div class="contact-list" id="chatContactList">
          <div class="contact-empty">Loading conversations…</div>
        </div>
      </div>
      <div class="chat-window">
        <div class="cw-header">
          <div class="contact-avatar cw-placeholder-avatar" id="cwAvatar">${chatOutlineIcon()}</div>
          <div>
            <div class="cw-name" id="cwName">Your conversations</div>
            <div class="cw-role" id="cwRole">Stay connected, keep learning.</div>
          </div>
        </div>
        <div class="cw-messages" id="cwMessages">
          <div class="cw-empty chat-welcome">${chatEmptyIllustration()}<h3>Start a conversation</h3><p>${role === 'teacher' ? 'Message a student, connect with fellow teachers,<br>or create a class group.' : 'Message a teacher, connect with classmates,<br>or create a study group.'}</p><button class="chat-primary-btn" onclick="openNewChatModal()">${iconPlus()} New message</button></div>
        </div>
        <div class="cw-input-area" id="cwInputArea"></div>
      </div>
    </div>
    </section>`;
}

/* ── PAGE ROUTER & POLL TIMER ── */
let currentPage = 'dashboard';
let materialsPollTimer = null;

function renderPage(page) {
  currentPage = page;
  document.querySelectorAll('.menu-item').forEach(i => {
    if (i.dataset.page === page) i.classList.add('active');
    else i.classList.remove('active');
  });
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;
  mainContent.innerHTML = getPageContent(ROLE, page);
  const fab = document.getElementById('chatFab');
  if (fab) fab.style.display = (page === 'chats') ? 'none' : 'flex';

  if (page === 'users' || page === 'classrec') loadUsersFromDB();
  if (page === 'classrec') loadClassRecAttempts();
  if (page === 'quiz') loadQuizzesFromDB();
  if (page === 'quizzes' || page === 'progress') { loadQuizzesFromDB(); loadMyAttemptsFromDB(); }
  if (page === 'analysis') loadQuizzesFromDB();
  if (page === 'chats') loadChatsPage();
  if (page === 'dashboard') {
    if (ROLE === 'teacher' || ROLE === 'admin') { loadMaterialsFromDB(); loadQuizzesFromDB(); }
    if (typeof loadUsersFromDB === 'function') loadUsersFromDB();
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

/* ── TWO-FACTOR AUTHENTICATION (2FA) HELPERS ── */
let currentEnrollmentFactorId = null;

async function openTwoFactorModal() {
  const modal = document.getElementById('twoFactorModal');
  const loading = document.getElementById('twoFactorLoading');
  const content = document.getElementById('twoFactorContent');
  const qrWrap = document.getElementById('twoFactorQrWrap');
  const secretCode = document.getElementById('twoFactorSecretCode');
  const confirmInput = document.getElementById('twoFactorConfirmCode');

  if (!modal) return;
  modal.classList.add('active');
  loading.style.display = 'block';
  content.style.display = 'none';
  if (confirmInput) confirmInput.value = '';

  try {
    const { data, error } = await db.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Scholaria'
    });

    if (error) {
      loading.innerHTML = `<p style="color:#dc2626;font-size:13px;">${escHtml(error.message || 'Could not initiate 2FA setup')}</p>`;
      return;
    }

    currentEnrollmentFactorId = data.id;
    if (qrWrap) {
      qrWrap.innerHTML = data.totp?.qr_code
        ? (data.totp.qr_code.startsWith('<svg') ? data.totp.qr_code : `<img src="${data.totp.qr_code}" alt="2FA QR Code" style="width:180px;height:180px;"/>`)
        : `<p style="font-size:12px;color:var(--text-muted);">QR Code not available, use the manual code below</p>`;
    }
    if (secretCode) secretCode.textContent = data.totp?.secret || '—';

    loading.style.display = 'none';
    content.style.display = 'flex';
  } catch (err) {
    loading.innerHTML = `<p style="color:#dc2626;font-size:13px;">Failed to connect to authentication server</p>`;
  }
}

function closeTwoFactorModal() {
  const modal = document.getElementById('twoFactorModal');
  if (modal) modal.classList.remove('active');
  currentEnrollmentFactorId = null;
}

async function confirmTwoFactorEnrollment() {
  const code = (document.getElementById('twoFactorConfirmCode')?.value || '').trim();
  if (!code || code.length < 6) {
    showToast('Please enter the 6-digit code from your app', 'error');
    return;
  }
  if (!currentEnrollmentFactorId) {
    showToast('No active 2FA enrollment session', 'error');
    return;
  }

  const btn = document.getElementById('twoFactorActivateBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Verifying…'; }

  try {
    const { data, error } = await db.auth.mfa.challengeAndVerify({
      factorId: currentEnrollmentFactorId,
      code: code
    });

    if (error) {
      showToast('Invalid verification code. Check your app and try again.', 'error');
      return;
    }

    showToast('2FA successfully enabled!', 'success');
    closeTwoFactorModal();
  } catch (err) {
    showToast('Verification failed', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Activate 2FA'; }
  }
}

