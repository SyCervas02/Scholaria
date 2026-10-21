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
    { page: 'rooms',      label: 'Rooms',            icon: iconRooms() },
    { page: 'reports',    label: 'Reports',          icon: iconChart() },
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
    a.setAttribute('onclick', `event.preventDefault(); if('${item.page}'==='materials' && typeof setActiveSubjectMaterials==='function') { setActiveSubjectMaterials(null, null, false); } renderPage('${item.page}');`);
    a.innerHTML = item.icon + `<span>${item.label}</span>` + (item.badge ? `<span class="menu-badge">${item.badge}</span>` : '');
    sidebarMenu.appendChild(a);
  });

  const urlParams = (typeof window !== 'undefined' && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
  const requestedPage = urlParams ? urlParams.get('page') : null;
  const initialPage = (requestedPage && typeof getPageContent === 'function' && getPageContent(ROLE, requestedPage))
    ? requestedPage
    : 'dashboard';

  renderPage(initialPage);
  refreshNotificationsUI();
  if (typeof renderEmergencyTopBanner === 'function') renderEmergencyTopBanner();
  if (typeof showNewsAlertIfNeeded === 'function') showNewsAlertIfNeeded();
  if (typeof resetChatState === 'function') resetChatState();
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

    // 3. Query per quiz ID for customQuizzes
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

    // 4. Query backend API endpoint if authenticated session is available
    try {
      if (typeof API_BASE !== 'undefined' && typeof db !== 'undefined' && db.auth) {
        const { data: { session } } = await db.auth.getSession().catch(() => ({ data: {} }));
        if (session && session.access_token) {
          const apiRes = await fetch(`${API_BASE}/api/class-records`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            if (apiJson && Array.isArray(apiJson.records)) {
              apiJson.records.forEach(rec => {
                if (!isArtificialSeedAttempt(rec) && !crData.some(existing => existing.id === rec.id)) {
                  crData.push(rec);
                }
              });
            }
          }
        }
      }
    } catch (_) {}

    // 5. Purge artificial seeds from local storage & merge authentic submissions
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
      const existingIdx = combined.findIndex(existing =>
        (existing.id && item.id && existing.id === item.id) ||
        (String(existing.quiz_id || '').toLowerCase() === String(item.quiz_id || '').toLowerCase() &&
         String(existing.student_id || '').toLowerCase() === String(item.student_id || '').toLowerCase() &&
         String(existing.submitted_at || '') === String(item.submitted_at || ''))
      );
      if (existingIdx === -1) {
        combined.push(item);
      } else {
        const existing = combined[existingIdx];
        if ((!existing.answers || !existing.answers.length) && (item.answers && item.answers.length)) {
          combined[existingIdx] = Object.assign({}, existing, item);
        }
        if (!existing.section && item.section) existing.section = item.section;
        if (!existing.student_name && item.student_name) existing.student_name = item.student_name;
      }
    });

    classRecAttemptsCache = combined;
  } catch(e) {
    console.error('Error loading class record attempts:', e);
  } finally {
    isFetchingClassRecAttempts = false;
    if (typeof currentPage !== 'undefined' && (currentPage === 'classrec' || currentPage === 'analysis')) {
      const mainContent = document.getElementById('mainContent');
      if (mainContent && typeof getPageContent === 'function') {
        mainContent.innerHTML = getPageContent(ROLE, currentPage);
      }
    }
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

function getTeacherHandledSections(teacherProfile) {
  const prof = teacherProfile || (typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE : null);
  if (!prof) return [];

  if (typeof ROLE !== 'undefined' && ROLE === 'admin') {
    if (typeof managedSections !== 'undefined' && Array.isArray(managedSections) && managedSections.length) {
      return managedSections.filter(s => !s.isArchived).map(s => s.name);
    }
    return (typeof SECTIONS !== 'undefined' && Array.isArray(SECTIONS) && SECTIONS.length)
      ? [...SECTIONS]
      : ['Section A', 'Section B', 'Section C', 'Section D'];
  }

  const teacherName = (prof.full_name || prof.name || '').trim().toLowerCase();
  const teacherId = String(prof.id || prof.school_id || prof.dbId || '').trim();

  // Find in registeredUsers
  const regUser = (typeof registeredUsers !== 'undefined' && Array.isArray(registeredUsers))
    ? registeredUsers.find(u =>
        u.role === 'teacher' && (
          (teacherId && (u.id === teacherId || u.dbId === teacherId || u.school_id === teacherId)) ||
          (teacherName && (u.name || '').trim().toLowerCase() === teacherName)
        )
      )
    : null;

  const rawSection = (regUser && regUser.section) || prof.section ||
    (typeof getUserSectionsMap === 'function' ? (getUserSectionsMap()[teacherId] || getUserSectionsMap()[prof.school_id]) : null) || '';

  const handled = new Set();

  if (rawSection && typeof rawSection === 'string') {
    rawSection.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
      if (s.toLowerCase() !== 'unassigned' && s.toLowerCase() !== 'all') {
        handled.add(s);
      }
    });
  }

  // Check managedSections for appointed adviser
  if (typeof managedSections !== 'undefined' && Array.isArray(managedSections)) {
    managedSections.forEach(sec => {
      if (sec.isArchived) return;
      if (sec.adviser && teacherName && sec.adviser.trim().toLowerCase() === teacherName) {
        handled.add(sec.name);
      }
    });
  }

  // Also check localStorage directly as fallback
  try {
    const rawLocal = localStorage.getItem('scholaria_managed_sections');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        parsed.forEach(sec => {
          if (sec.isArchived) return;
          if (sec.adviser && teacherName && sec.adviser.trim().toLowerCase() === teacherName) {
            handled.add(sec.name);
          }
        });
      }
    }
  } catch (_) {}

  return Array.from(handled);
}
window.getTeacherHandledSections = getTeacherHandledSections;

function isStudentHandledByTeacher(student, teacherProfile) {
  if (typeof ROLE !== 'undefined' && ROLE === 'admin') return true;
  const prof = teacherProfile || (typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE : null);
  if (!prof) return false;

  const handled = getTeacherHandledSections(prof);
  if (!handled.length) return false;

  const sec = (student.section && student.section !== 'Unassigned')
    ? student.section
    : (typeof getUserSectionsMap === 'function' ? (getUserSectionsMap()[student.school_id || student.id || student.dbId]) : null) || '';

  if (!sec || sec.toLowerCase() === 'unassigned') return false;
  return handled.some(h => h.trim().toLowerCase() === sec.trim().toLowerCase());
}
window.isStudentHandledByTeacher = isStudentHandledByTeacher;

function deduplicateQuizAttempts(attemptsList) {
  const result = [];
  (attemptsList || []).forEach(item => {
    if (!item || isArtificialSeedAttempt(item)) return;

    const qKey = String(item.quiz_id || item.quiz_title || '').toLowerCase().trim();
    const sKey = String(item.student_id || item.student_name || '').toLowerCase().trim();
    const scoreVal = Number(item.score !== undefined ? item.score : item.score_percentage || 0);

    const existingIdx = result.findIndex(existing => {
      if (existing.id && item.id && existing.id === item.id) return true;

      const exQKey = String(existing.quiz_id || existing.quiz_title || '').toLowerCase().trim();
      const exSKey = String(existing.student_id || existing.student_name || '').toLowerCase().trim();
      const exScore = Number(existing.score !== undefined ? existing.score : existing.score_percentage || 0);

      if (qKey && exQKey && qKey === exQKey && sKey && exSKey && sKey === exSKey && scoreVal === exScore) {
        return true;
      }
      return false;
    });

    if (existingIdx === -1) {
      result.push(item);
    } else {
      const existing = result[existingIdx];
      if ((!existing.answers || !existing.answers.length) && (item.answers && item.answers.length)) {
        result[existingIdx] = Object.assign({}, existing, item);
      } else if (!existing.section && item.section) {
        existing.section = item.section;
      }
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

  try {
    const rawCR = localStorage.getItem('scholaria_class_records_v2');
    if (rawCR) {
      const localCR = JSON.parse(rawCR);
      localCR.forEach(a => pool.push(a));
    }
  } catch(e) {}

  return deduplicateQuizAttempts(pool);
}

function isAttemptBelongingToStudent(a, u) {
  if (!a || !u) return false;
  const sid = String(a.student_id || a.studentId || a.user_id || '').toLowerCase().trim();
  const sSchoolId = String(a.student_school_id || a.school_id || '').toLowerCase().trim();
  const sname = String(a.student_name || a.studentName || '').toLowerCase().trim();

  const uDbId = String(u.dbId || '').toLowerCase().trim();
  const uId = String(u.id || '').toLowerCase().trim();
  const uSchoolId = String(u.school_id || '').toLowerCase().trim();
  const uName = String(u.name || u.full_name || '').toLowerCase().trim();

  if (uDbId && (sid === uDbId || sSchoolId === uDbId)) return true;
  if (uId && (sid === uId || sSchoolId === uId)) return true;
  if (uSchoolId && (sid === uSchoolId || sSchoolId === uSchoolId)) return true;

  if (uName && (sid === uName || sname === uName)) return true;
  if (uName && sname && (uName.includes(sname) || sname.includes(uName))) return true;

  const matchInRegistered = registeredUsers.find(ru =>
    (ru.dbId && (String(ru.dbId).toLowerCase().trim() === sid || String(ru.dbId).toLowerCase().trim() === sSchoolId)) ||
    (ru.id && (String(ru.id).toLowerCase().trim() === sid || String(ru.id).toLowerCase().trim() === sSchoolId)) ||
    (ru.school_id && (String(ru.school_id).toLowerCase().trim() === sid || String(ru.school_id).toLowerCase().trim() === sSchoolId)) ||
    (ru.name && String(ru.name).toLowerCase().trim() === sname)
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

  return false;
}

function getClassRecordQuizzes() {
  const pool = typeof customQuizzes !== 'undefined' ? [...customQuizzes] : [];
  const teacherQuizzes = (ROLE === 'teacher' && CURRENT_PROFILE)
    ? pool.filter(q => {
        if (!q) return false;
        if (q.isDemo) return true;
        const qCreator = String(q.createdBy || q.created_by || '').toLowerCase().trim();
        const pId = String(CURRENT_PROFILE.id || '').toLowerCase().trim();
        const pDbId = String(CURRENT_PROFILE.dbId || '').toLowerCase().trim();
        const pSchoolId = String(CURRENT_PROFILE.school_id || '').toLowerCase().trim();
        const pName = String(CURRENT_PROFILE.full_name || CURRENT_PROFILE.name || '').toLowerCase().trim();

        if (qCreator && (qCreator === pId || qCreator === pDbId || qCreator === pSchoolId || qCreator === pName || pName.includes(qCreator))) return true;

        if (CURRENT_PROFILE.subjects && q.subject) {
          const subs = CURRENT_PROFILE.subjects.split(',').map(sub => sub.trim().toLowerCase());
          if (subs.some(sub => sub && (q.subject || '').toLowerCase().includes(sub))) return true;
        }
        if (CURRENT_PROFILE.strand && q.strand) {
          const sts = CURRENT_PROFILE.strand.split(',').map(st => st.trim().toLowerCase());
          if (sts.some(st => st && (q.strand || '').toLowerCase().includes(st))) return true;
        }
        return !qCreator;
      })
    : pool;

  const finalQuizzes = teacherQuizzes.length ? teacherQuizzes : pool;
  return finalQuizzes.map(q => ({
    id: q.id,
    title: q.title || 'Assessment',
    subject: q.subject || '',
    strand: q.strand || ''
  }));
}

function openAddClassRecordModal() {
  const modal = document.getElementById('classRecModal');
  if (!modal) return;
  const select = document.getElementById('crStudentSelect');
  if (select) {
    const students = registeredUsers.filter(u => u.role === 'student' && u.isActive !== false);
    select.innerHTML = students.map(u => `<option value="${u.dbId || u.id || u.name}">${escHtml(u.name)} (${escHtml(u.strand || 'General')} · ${escHtml(u.section || 'Unassigned')})</option>`).join('');
  }
  const quizSelect = document.getElementById('crQuizSelect');
  if (quizSelect) {
    const quizzes = getClassRecordQuizzes();
    quizSelect.innerHTML = quizzes.length ? quizzes.map(q => `<option value="${q.id}">${escHtml(q.title)}</option>`).join('') : '<option value="manual_eval">Standard Evaluation</option>';
  }
  const subjWrap = document.getElementById('crSubjPickerWrap');
  if (subjWrap && typeof renderSearchableSubjectPicker === 'function') {
    subjWrap.innerHTML = renderSearchableSubjectPicker({
      id: 'crSubjPicker',
      inputId: 'crSubjInput',
      value: (ROLE === 'teacher' && CURRENT_PROFILE?.subjects) ? CURRENT_PROFILE.subjects.split(',')[0].trim() : 'General Class',
      options: (typeof getCurriculumSubjectsList === 'function') ? getCurriculumSubjectsList() : ['Pre-Calculus', 'Basic Calculus', 'General Biology 1', 'General Biology 2'],
      placeholder: 'Select from dropdown or search subject...'
    });
  }
  modal.classList.add('active');
}

function closeAddClassRecordModal() {
  const modal = document.getElementById('classRecModal');
  if (modal) modal.classList.remove('active');
}

function submitAddClassRecord() {
  const studentKey = document.getElementById('crStudentSelect')?.value;
  const quizId = document.getElementById('crQuizSelect')?.value || 'manual_eval';
  const rawScore = Number(document.getElementById('crScoreInput')?.value || 85);
  const score = Math.min(100, Math.max(0, isNaN(rawScore) ? 0 : rawScore));
  const subj = document.getElementById('crSubjInput')?.value || 'General Class';

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

  let students = registeredUsers.filter(u => u.role === 'student' && u.isActive !== false);

  // For teachers, strictly scope to students belonging to handled sections
  if (typeof ROLE !== 'undefined' && ROLE === 'teacher') {
    const teacherHandled = getTeacherHandledSections(CURRENT_PROFILE);
    students = students.filter(u => {
      const sec = (u.section && u.section !== 'Unassigned')
        ? u.section
        : (typeof getUserSectionsMap === 'function' ? (getUserSectionsMap()[u.school_id || u.id || u.dbId]) : null) || '';
      if (!sec || sec.toLowerCase() === 'unassigned') return false;
      return teacherHandled.some(h => h.trim().toLowerCase() === sec.trim().toLowerCase());
    });
  }

  const custom = getCustomClassRecEntries();
  const quizzes = getClassRecordQuizzes();
  const allAttempts = getAllRecordedAttempts();

  return students.map(u => {
    const key = u.dbId || u.id || u.name;
    const customData = custom[key] || {};

    const studAttempts = deduplicateQuizAttempts(allAttempts.filter(a => isAttemptBelongingToStudent(a, u)));

    // Resolve accurate student section from user record, saved map, or recorded attempts (Never force to Section A!)
    const resolvedSection = (u.section && u.section !== 'Unassigned' ? u.section : null) ||
      (typeof getUserSectionsMap === 'function' ? (getUserSectionsMap()[u.school_id] || getUserSectionsMap()[u.id] || getUserSectionsMap()[u.dbId]) : null) ||
      (studAttempts[0]?.section && studAttempts[0]?.section !== 'Unassigned' ? studAttempts[0]?.section : '') ||
      'Unassigned';

    const quizScores = {};
    let validScoresSum = 0;
    let validScoresCount = 0;
    let hasRealData = false;

    quizzes.forEach(q => {
      let scorePct = null;
      let isLive = false;

      // Find attempts matching this quiz
      const matchedAttempts = studAttempts.filter(a => {
        const aQId = String(a.quiz_id || a.quizId || '').toLowerCase().trim();
        const qId = String(q.id || '').toLowerCase().trim();
        if (aQId && qId && aQId === qId) return true;

        const aTitle = String(a.quiz_title || a.quizTitle || '').toLowerCase().trim();
        const qTitle = String(q.title || '').toLowerCase().trim();
        if (aTitle && qTitle) {
          if (aTitle === qTitle) return true;
          const aClean = aTitle.replace(/\s*\(demo\)$/i, '').trim();
          const qClean = qTitle.replace(/\s*\(demo\)$/i, '').trim();
          if (aClean === qClean) return true;
          if (aClean.includes(qClean) || qClean.includes(aClean)) return true;
        }
        return false;
      });

      if (matchedAttempts.length > 0) {
        let bestPct = -1;
        matchedAttempts.forEach(att => {
          let p = null;
          if (att.score_percentage !== undefined && att.score_percentage !== null) {
            p = Number(att.score_percentage);
          } else if (att.score !== undefined && att.total_items) {
            p = (Number(att.score) / Number(att.total_items)) * 100;
          } else if (att.score !== undefined) {
            p = Number(att.score);
          }
          if (p !== null && !isNaN(p) && isFinite(p)) {
            p = Math.min(100, Math.max(0, Math.round(p)));
            if (p > bestPct) bestPct = p;
          }
        });
        if (bestPct >= 0) {
          scorePct = bestPct;
          isLive = true;
          hasRealData = true;
        }
      } else if (customData[q.id] !== undefined) {
        const parsed = Number(customData[q.id]);
        if (!isNaN(parsed) && isFinite(parsed)) {
          scorePct = Math.min(100, Math.max(0, Math.round(parsed)));
          hasRealData = true;
        }
      }

      if (scorePct !== null) {
        validScoresSum += scorePct;
        validScoresCount++;
      }

      quizScores[q.id] = { scorePct, isLive };
    });

    const avg = validScoresCount > 0
      ? Math.min(100, Math.max(0, Number((validScoresSum / validScoresCount).toFixed(2))))
      : null;

    return {
      key,
      name: u.name,
      schoolId: u.school_id || u.id || '—',
      section: resolvedSection,
      strand: u.strand || 'General',
      subject: customData.subject || (ROLE === 'teacher' ? (CURRENT_PROFILE?.subjects || 'STEM, HUMSS') : 'STEM, HUMSS'),
      quizScores,
      quizzesTakenCount: validScoresCount,
      avg,
      hasRealData
    };
  }).filter(st => {
    if (classRecSectionFilter && st.section.toLowerCase().trim() !== classRecSectionFilter.toLowerCase().trim()) return false;
    if (classRecStudentFilter && st.key !== classRecStudentFilter) return false;
    return true;
  });
}

function buildSectionSummaryEntries() {
  const allStudentEntries = buildRealClassRecordEntries();
  const sectionMap = new Map();

  // If teacher, pre-populate all handled sections so their assigned sections appear even if student count is 0
  if (typeof ROLE !== 'undefined' && ROLE === 'teacher') {
    const teacherHandled = getTeacherHandledSections(CURRENT_PROFILE);
    teacherHandled.forEach(secName => {
      if (!secName || secName === 'Unassigned') return;
      sectionMap.set(secName, {
        section: secName,
        subject: (CURRENT_PROFILE?.subjects || 'General Curriculum'),
        studentsCount: 0,
        scoresSum: 0,
        scoresCount: 0,
        passingCount: 0
      });
    });
  }

  allStudentEntries.forEach(st => {
    const sec = st.section;
    if (!sec || sec === 'Unassigned') return;

    if (typeof ROLE !== 'undefined' && ROLE === 'teacher') {
      const teacherHandled = getTeacherHandledSections(CURRENT_PROFILE);
      if (!teacherHandled.some(h => h.trim().toLowerCase() === sec.trim().toLowerCase())) {
        return;
      }
    }

    if (!sectionMap.has(sec)) {
      sectionMap.set(sec, {
        section: sec,
        subject: st.subject || 'Earth and Life Science',
        studentsCount: 0,
        scoresSum: 0,
        scoresCount: 0,
        passingCount: 0
      });
    }
    const secData = sectionMap.get(sec);
    secData.studentsCount++;
    if (st.avg !== null && !isNaN(st.avg) && isFinite(st.avg)) {
      const numAvg = Math.min(100, Math.max(0, Number(st.avg)));
      secData.scoresSum += numAvg;
      secData.scoresCount++;
      if (numAvg >= 75) secData.passingCount++;
    }
  });

  // Fallback: If sectionMap is empty because user records are still loading, extract from recorded attempts
  if (!sectionMap.size) {
    const attempts = getAllRecordedAttempts();
    if (attempts && attempts.length) {
      const teacherHandled = (typeof ROLE !== 'undefined' && ROLE === 'teacher')
        ? getTeacherHandledSections(CURRENT_PROFILE)
        : null;

      attempts.forEach(a => {
        const sec = a.section;
        if (!sec || sec === 'Unassigned') return;
        if (teacherHandled && !teacherHandled.some(h => h.trim().toLowerCase() === sec.trim().toLowerCase())) return;

        if (!sectionMap.has(sec)) {
          sectionMap.set(sec, {
            section: sec,
            subject: a.subject || 'Earth and Life Science',
            studentsCount: 0,
            scoresSum: 0,
            scoresCount: 0,
            passingCount: 0
          });
        }
        const secData = sectionMap.get(sec);
        secData.studentsCount++;
        const p = a.score_percentage != null ? Number(a.score_percentage) : (a.total_items ? (a.score / a.total_items) * 100 : 0);
        secData.scoresSum += p;
        secData.scoresCount++;
        if (p >= 75) secData.passingCount++;
      });
    }
  }

  const summaries = Array.from(sectionMap.values()).map(sec => {
    const classAvg = sec.scoresCount > 0 ? Math.min(100, Math.max(0, Number((sec.scoresSum / sec.scoresCount).toFixed(2)))) : null;
    const passRate = sec.scoresCount > 0 ? Math.min(100, Math.max(0, Math.round((sec.passingCount / sec.scoresCount) * 100))) : null;
    return {
      ...sec,
      classAvg,
      passRate
    };
  });

  if (typeof ROLE !== 'undefined' && ROLE === 'teacher') {
    const teacherHandled = getTeacherHandledSections(CURRENT_PROFILE);
    return summaries.filter(s => teacherHandled.some(h => h.trim().toLowerCase() === s.section.trim().toLowerCase()));
  }
  return summaries;
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

function updateProfileNamePreview() {
  const f = document.getElementById('pfFirstName')?.value || '';
  const m = document.getElementById('pfMiddleName')?.value || '';
  const l = document.getElementById('pfLastName')?.value || '';
  const s = document.getElementById('pfSuffix')?.value || '';
  const preview = document.getElementById('pfFullNamePreview');
  const heroName = document.getElementById('pfHeroNameTitle');
  const assembled = typeof assembleFullName === 'function' ? assembleFullName(f, m, l, s) : [f, m, l, s].filter(Boolean).join(' ');
  if (preview) preview.textContent = assembled || 'Your Full Name';
  if (heroName) heroName.textContent = assembled || 'Your Full Name';
}

async function saveUserProfile() {
  const saveBtn = document.getElementById('pfSaveBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `Saving...`;
  }

  try {
    // 1. Official Identity Details (Vital Information: Name is locked to official registered record)
    const firstName = CURRENT_PROFILE.first_name || (document.getElementById('pfFirstName')?.value || '').trim();
    const middleName = CURRENT_PROFILE.middle_name || (document.getElementById('pfMiddleName')?.value || '').trim();
    const lastName = CURRENT_PROFILE.last_name || (document.getElementById('pfLastName')?.value || '').trim();
    const suffix = CURRENT_PROFILE.suffix || (document.getElementById('pfSuffix')?.value || '').trim();
    const middleInitial = CURRENT_PROFILE.middle_initial || (middleName ? middleName.replace('.', '')[0]?.toUpperCase() : '') || (document.getElementById('pfMiddleInitial')?.value || '').trim();
    const fullName = CURRENT_PROFILE.full_name || (typeof assembleFullName === 'function' 
      ? assembleFullName(firstName, middleName, lastName, suffix) 
      : [firstName, middleName, lastName, suffix].filter(Boolean).join(' ') || 'Scholaria User');

    const contactNumber = (document.getElementById('pfContact')?.value || '').trim();
    const email = (document.getElementById('pfEmail')?.value || '').trim();
    const emergencyName = (document.getElementById('pfEmergencyName')?.value || '').trim();
    const emergencyRelation = (document.getElementById('pfEmergencyRelation')?.value || '').trim();
    const emergencyPhone = (document.getElementById('pfEmergencyPhone')?.value || '').trim();
    const address = (document.getElementById('pfAddress')?.value || '').trim();
    const birthdate = document.getElementById('pfBirthDate')?.value || '';
    const gender = document.getElementById('pfGender')?.value || '';
    const bio = (document.getElementById('pfBio')?.value || '').trim();
    const onlineStatus = document.getElementById('pfOnlineStatus')?.value || 'online';
    const statusMessage = (document.getElementById('pfStatusMsg')?.value || '').trim();
    const avatarUrl = document.getElementById('pfAvatarDataUrl')?.value || CURRENT_PROFILE.avatar_url || null;
    const newPassword = document.getElementById('pfNewPassword')?.value;

    // 2. Strict Philippine Mobile Validation (Exactly 11 digits starting with 09)
    if (contactNumber) {
      if (typeof isValidPhilippineMobile === 'function' && !isValidPhilippineMobile(contactNumber)) {
        showToast('Phone number must be exactly 11 digits starting with 09 (e.g. 09123456789)', 'error');
        document.getElementById('pfContact')?.focus();
        if (typeof validatePhoneField === 'function') validatePhoneField(document.getElementById('pfContact'), 'pfContactErr');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = 'Save Changes'; }
        return;
      }
    }

    // 3. Strict Emergency Contact Validation
    if (emergencyName && !/^[a-zA-Z\sñÑ\-.]+$/.test(emergencyName)) {
      showToast('Emergency contact name must only contain letters', 'error');
      document.getElementById('pfEmergencyName')?.focus();
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = 'Save Changes'; }
      return;
    }

    if (emergencyPhone) {
      if (typeof isValidPhilippineMobile === 'function' && !isValidPhilippineMobile(emergencyPhone)) {
        showToast('Emergency contact number must be exactly 11 digits starting with 09', 'error');
        document.getElementById('pfEmergencyPhone')?.focus();
        if (typeof validatePhoneField === 'function') validatePhoneField(document.getElementById('pfEmergencyPhone'), 'pfEmergencyPhoneErr');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = 'Save Changes'; }
        return;
      }
    }

    // 4. Update Password if specified
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

    // 5. Build comprehensive profile update payload
    const updatePayload = {
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      middle_initial: middleInitial,
      email: email || CURRENT_PROFILE.email,
      contact_number: contactNumber,
      emergency_contact_name: emergencyName,
      emergency_contact_relation: emergencyRelation,
      emergency_contact_phone: emergencyPhone,
      address: address,
      birthdate: birthdate,
      gender: gender,
      bio: bio,
      online_status: onlineStatus,
      status_message: statusMessage,
      avatar_url: avatarUrl,
      last_active_at: new Date().toISOString()
    };

    // 6. Attempt DB update with fallback for missing schema columns
    try {
      const { error } = await db
        .from('users')
        .update(updatePayload)
        .eq('id', CURRENT_PROFILE.id);

      if (error) {
        console.warn('Full profile update had error, attempting minimal fallback:', error);
        await db
          .from('users')
          .update({
            full_name: fullName,
            email: email || CURRENT_PROFILE.email,
            contact_number: contactNumber,
            bio: bio,
            online_status: onlineStatus,
            status_message: statusMessage,
            avatar_url: avatarUrl
          })
          .eq('id', CURRENT_PROFILE.id);
      }
    } catch (err) {
      console.warn('DB update failed, saving locally:', err);
    }

    // 7. Persist in Supabase Auth user metadata
    try {
      await db.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          middle_initial: middleInitial,
          full_name: fullName,
          contact_number: contactNumber,
          emergency_contact_name: emergencyName,
          emergency_contact_relation: emergencyRelation,
          emergency_contact_phone: emergencyPhone,
          address: address,
          birthdate: birthdate,
          gender: gender
        }
      });
    } catch (_) {}

    // 8. Update local CURRENT_PROFILE and localStorage
    Object.assign(CURRENT_PROFILE, updatePayload);
    try {
      localStorage.setItem('scholaria_cached_profile', JSON.stringify(CURRENT_PROFILE));
    } catch(e) {}

    // 9. Update header user name and avatar UI
    const navName = document.getElementById('userName');
    if (navName) navName.textContent = CURRENT_PROFILE.full_name;
    updateNavAvatarUI();

    // 10. Refresh profile page to reflect newly saved data
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
  const idLabel = role === 'student' ? 'Student ID / LRN' : role === 'teacher' ? 'Faculty Teacher ID' : 'Institutional Admin ID';
  const schoolIdVal = p.school_id || (p.id ? p.id.slice(0, 8).toUpperCase() : 'HWA-2026');
  const joinDateFormatted = formatJoinDate(p.created_at);

  // Parse separated name components matching User Management structure (First Name, Middle Name, Last Name, Suffix)
  let slipRec = null;
  if (typeof getCredentialSlipRecord === 'function' && schoolIdVal) {
    slipRec = getCredentialSlipRecord(schoolIdVal);
  }

  const nameParts = typeof parseFullNameParts === 'function'
    ? parseFullNameParts(p.full_name || '')
    : { firstName: '', middleName: '', lastName: '', suffix: '', middleInitial: '' };

  const firstNameVal = p.first_name || slipRec?.firstName || slipRec?.first_name || nameParts.firstName || '';
  const middleNameVal = p.middle_name || slipRec?.middleName || slipRec?.middle_name || nameParts.middleName || '';
  const lastNameVal = p.last_name || slipRec?.lastName || slipRec?.last_name || nameParts.lastName || '';
  const suffixVal = p.suffix || slipRec?.suffix || nameParts.suffix || '';
  const middleInitialVal = p.middle_initial || (middleNameVal ? middleNameVal.replace('.', '')[0]?.toUpperCase() : '') || nameParts.middleInitial || '';
  const currentFullName = p.full_name || (typeof assembleFullName === 'function'
    ? assembleFullName(firstNameVal, middleNameVal, lastNameVal, suffixVal)
    : [firstNameVal, middleNameVal, lastNameVal, suffixVal].filter(Boolean).join(' ')) || 'User';

  return `
  <div style="display:flex;flex-direction:column;gap:20px;width:100%;">
    <!-- PROFILE HERO BANNER -->
    <div class="profile-hero-card">
      <div class="profile-hero-avatar-wrap">
        <div class="profile-hero-avatar" id="pfHeroAvatarContainer">
          <img id="pfHeroAvatarImg" src="${p.avatar_url || ''}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:${p.avatar_url ? 'block' : 'none'};" onerror="this.style.display='none';document.getElementById('pfHeroAvatarInitials').style.display='flex';" />
          <div id="pfHeroAvatarInitials" style="width:100%;height:100%;display:${p.avatar_url ? 'none' : 'flex'};align-items:center;justify-content:center;font-size:32px;font-weight:800;color:#fff;">
            ${initialsFor(currentFullName)}
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
          <h1 class="profile-hero-name" id="pfHeroNameTitle" style="margin:0;">${escHtml(currentFullName)}</h1>
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
      <!-- LEFT COLUMN: PERSONAL DETAILS, NAME BREAKDOWN & EMERGENCY CONTACT -->
      <div style="display:flex;flex-direction:column;gap:20px;">
        <!-- CARD 1: IDENTITY & NAME BREAKDOWN -->
        <div class="profile-card">
          <div class="profile-card-hdr">
            <h3>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--blue)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Personal Identity & Name
            </h3>
            <span style="font-size:11.5px;color:var(--text-muted);display:inline-flex;align-items:center;gap:4px;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Official Record &middot; Locked
            </span>
          </div>

          <!-- SEPARATED FULL NAME FIELDS MATCHING USER MANAGEMENT STRUCTURE (READONLY OFFICIAL RECORD) -->
          <div class="pf-name-grid" style="display:grid;grid-template-columns:1.2fr 1fr 1.2fr 85px;gap:12px;">
            <div class="pf-field">
              <label>First Name <span style="font-size:10.5px;color:var(--text-muted);font-weight:400;">(Official)</span></label>
              <input type="text" id="pfFirstName" value="${escHtml(firstNameVal)}" readonly title="Official School Record — Cannot be modified here" style="background:#f8fafc;color:#475569;cursor:not-allowed;border-color:#e2e8f0;" />
            </div>

            <div class="pf-field">
              <label>Middle Name <span style="font-size:10.5px;color:var(--text-muted);font-weight:400;">(Official)</span></label>
              <input type="text" id="pfMiddleName" value="${escHtml(middleNameVal)}" readonly title="Official School Record — Cannot be modified here" style="background:#f8fafc;color:#475569;cursor:not-allowed;border-color:#e2e8f0;" />
            </div>

            <div class="pf-field">
              <label>Last Name <span style="font-size:10.5px;color:var(--text-muted);font-weight:400;">(Official)</span></label>
              <input type="text" id="pfLastName" value="${escHtml(lastNameVal)}" readonly title="Official School Record — Cannot be modified here" style="background:#f8fafc;color:#475569;cursor:not-allowed;border-color:#e2e8f0;" />
            </div>

            <div class="pf-field">
              <label>Suffix <span style="font-size:10.5px;color:var(--text-muted);font-weight:400;">(Opt)</span></label>
              <input type="text" id="pfSuffix" value="${escHtml(suffixVal)}" readonly title="Official School Record — Cannot be modified here" style="text-align:center;background:#f8fafc;color:#475569;cursor:not-allowed;border-color:#e2e8f0;" />
              <input type="hidden" id="pfMiddleInitial" value="${escHtml(middleInitialVal)}" />
            </div>
          </div>

          <div style="background:#f8fafc;padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;font-size:12.5px;">
            <span style="color:var(--text-muted);display:inline-flex;align-items:center;gap:6px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--blue)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Official Registered Name:
            </span>
            <strong id="pfFullNamePreview" style="color:var(--blue);font-weight:700;">${escHtml(currentFullName)}</strong>
          </div>

          <div style="font-size:11.5px;color:#d97706;background:#fffbeb;padding:8px 12px;border-radius:8px;border:1px solid #fde68a;display:flex;align-items:center;gap:6px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#d97706" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Names are strictly verified against school enrollment records and locked against unauthorized edits. Contact the registrar for legal name modifications.</span>
          </div>

          <div class="pf-field">
            <label>About Me / Bio</label>
            <textarea id="pfBio" placeholder="Share a few words about your academic goals, interests, or teaching focus...">${escHtml(p.bio || '')}</textarea>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px;">
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
        </div>

        <!-- CARD 2: CONTACT DETAILS & MOBILE NUMBERS -->
        <div class="profile-card">
          <div class="profile-card-hdr">
            <h3>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--blue)" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Contact & Phone Details
            </h3>
            <span style="font-size:11.5px;color:var(--text-muted);">Strict Philippines 11-digit mobile format</span>
          </div>

          <div class="pf-field">
            <label>Student / User Phone Number *</label>
            <div style="position:relative;">
              <input type="tel" id="pfContact" value="${escHtml(p.contact_number || '')}" placeholder="09XXXXXXXXX" maxlength="11" onkeydown="allowDigitsOnly(event)" oninput="sanitizePhoneInput(this); validatePhoneField(this, 'pfContactErr');" onblur="validatePhoneField(this, 'pfContactErr')" />
            </div>
            <div class="pf-error-hint" id="pfContactErr" style="display:none;color:#dc2626;font-size:11.5px;font-weight:600;margin-top:3px;"></div>
            <span style="font-size:11px;color:var(--text-muted);">Philippines Mobile Format: Exactly 11 digits starting with <strong>09</strong> (Numbers only)</span>
          </div>

          <div class="pf-field">
            <label>Gmail / Official Email Address *</label>
            <input type="email" id="pfEmail" maxlength="100" value="${escHtml(p.email || '')}" placeholder="your.name@gmail.com" />
          </div>

          <div class="pf-field">
            <label>Complete Residential / Home Address</label>
            <input type="text" id="pfAddress" maxlength="150" value="${escHtml(p.address || '')}" placeholder="House No., Street, Barangay, City, Province" />
          </div>
        </div>

        <!-- CARD 3: EMERGENCY CONTACT (ESSENTIAL SCHOOL PROFILE) -->
        <div class="profile-card">
          <div class="profile-card-hdr">
            <h3>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#d97706" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Emergency Contact Information
            </h3>
            <span style="font-size:11.5px;color:#d97706;font-weight:600;">For institutional safety & school records</span>
          </div>

          <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:12px;">
            <div class="pf-field">
              <label>Emergency Contact Name</label>
              <input type="text" id="pfEmergencyName" maxlength="60" value="${escHtml(p.emergency_contact_name || '')}" placeholder="e.g. Juanita Santos" onkeydown="allowLettersOnly(event)" oninput="sanitizeNameInput(this)" />
            </div>

            <div class="pf-field">
              <label>Relationship</label>
              <select id="pfEmergencyRelation">
                <option value="Parent" ${p.emergency_contact_relation === 'Parent' ? 'selected' : ''}>Parent</option>
                <option value="Guardian" ${p.emergency_contact_relation === 'Guardian' ? 'selected' : ''}>Guardian</option>
                <option value="Sibling" ${p.emergency_contact_relation === 'Sibling' ? 'selected' : ''}>Sibling</option>
                <option value="Spouse" ${p.emergency_contact_relation === 'Spouse' ? 'selected' : ''}>Spouse</option>
                <option value="Relative" ${p.emergency_contact_relation === 'Relative' ? 'selected' : ''}>Relative</option>
              </select>
            </div>
          </div>

          <div class="pf-field">
            <label>Emergency Contact Mobile Number</label>
            <input type="tel" id="pfEmergencyPhone" maxlength="11" value="${escHtml(p.emergency_contact_phone || '')}" placeholder="09XXXXXXXXX" onkeydown="allowDigitsOnly(event)" oninput="sanitizePhoneInput(this); validatePhoneField(this, 'pfEmergencyPhoneErr');" onblur="validatePhoneField(this, 'pfEmergencyPhoneErr')" />
            <div class="pf-error-hint" id="pfEmergencyPhoneErr" style="display:none;color:#dc2626;font-size:11.5px;font-weight:600;margin-top:3px;"></div>
            <span style="font-size:11px;color:var(--text-muted);">Format: Exactly 11 digits starting with <strong>09</strong></span>
          </div>

          <div style="margin-top:10px;display:flex;justify-content:flex-end;">
            <button type="button" class="add-btn" id="pfSaveBtn" style="padding:10px 24px;font-size:14px;border-radius:10px;font-weight:700;" onclick="saveUserProfile()">
              <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: ACADEMIC DETAILS, ESSENTIAL SCHOOL FIELDS & SECURITY -->
      <div style="display:flex;flex-direction:column;gap:20px;">
        <!-- ESSENTIAL SCHOOL DEMOGRAPHICS CARD -->
        <div class="profile-card">
          <div class="profile-card-hdr">
            <h3>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--blue)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              School Profile Demographics
            </h3>
            <span style="font-size:11.5px;color:var(--text-muted);">DepEd Learner Record</span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="pf-field">
              <label>Date of Birth</label>
              <input type="date" id="pfBirthDate" value="${escHtml(p.birthdate || '')}" />
            </div>

            <div class="pf-field">
              <label>Gender / Sex</label>
              <select id="pfGender">
                <option value="Male" ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Prefer not to say" ${p.gender === 'Prefer not to say' ? 'selected' : ''}>Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

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
            <span class="pf-meta-val" style="color:var(--blue);font-weight:700;">${escHtml(p.strand)}</span>
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

/* ── STUDENT QUIZZES SORT & FILTER STATE ── */
let studentQuizSortBy = 'pending'; // 'pending' | 'subject' | 'deadline' | 'newest' | 'title'
let studentQuizFilterSubject = '';
let studentQuizFilterStatus = ''; // '' | 'pending' | 'completed' | 'expired'
let studentQuizSearchQuery = '';

function setStudentQuizSort(sortBy) {
  studentQuizSortBy = sortBy;
  if (typeof renderPage === 'function') renderPage('quizzes');
}

function setStudentQuizFilterSubject(subj) {
  studentQuizFilterSubject = subj;
  if (typeof renderPage === 'function') renderPage('quizzes');
}

function setStudentQuizFilterStatus(st) {
  studentQuizFilterStatus = st;
  if (typeof renderPage === 'function') renderPage('quizzes');
}

function setStudentQuizSearchQuery(q) {
  studentQuizSearchQuery = (q || '').trim().toLowerCase();
  if (typeof renderPage === 'function') renderPage('quizzes');
}

function resetStudentQuizFilters() {
  studentQuizSortBy = 'pending';
  studentQuizFilterSubject = '';
  studentQuizFilterStatus = '';
  studentQuizSearchQuery = '';
  if (typeof renderPage === 'function') renderPage('quizzes');
}

/* ── STUDENT MY PROGRESS ENGINE ── */
let studentProgressTab = 'all'; // 'all' | 'completed' | 'pending' | 'overdue'
let studentProgressSubject = 'all'; // 'all' | '<Subject Name>'
let studentProgressSearch = '';
let studentProgressSort = 'default'; // 'default' | 'deadline_asc' | 'deadline_desc' | 'score_desc' | 'score_asc' | 'title_asc'

function setStudentProgressTab(tab) {
  studentProgressTab = tab;
  if (typeof renderPage === 'function') renderPage('progress');
}

function setStudentProgressSubject(subj) {
  if (!subj || (subj || '').toLowerCase().trim() === 'all') {
    studentProgressSubject = 'all';
  } else if (studentProgressSubject.toLowerCase().trim() === (subj || '').toLowerCase().trim()) {
    studentProgressSubject = 'all';
  } else {
    studentProgressSubject = subj;
  }
  if (typeof renderPage === 'function') renderPage('progress');
}

function setStudentProgressSort(sort) {
  studentProgressSort = sort;
  if (typeof renderPage === 'function') renderPage('progress');
}

function handleStudentProgressSearch(val) {
  studentProgressSearch = (val || '').toLowerCase().trim();
  const rows = document.querySelectorAll('.student-progress-table tbody tr[data-quiz-title]');
  let visibleCount = 0;
  rows.forEach(r => {
    const title = (r.getAttribute('data-quiz-title') || '').toLowerCase();
    const subject = (r.getAttribute('data-quiz-subject') || '').toLowerCase();
    const match = !studentProgressSearch || title.includes(studentProgressSearch) || subject.includes(studentProgressSearch);
    r.style.display = match ? '' : 'none';
    if (match) visibleCount++;
  });
  const emptyRow = document.getElementById('studentProgressEmptyRow');
  if (emptyRow) {
    emptyRow.style.display = (visibleCount === 0 && rows.length > 0) ? '' : 'none';
  }
}

function clearStudentProgressSearch() {
  studentProgressSearch = '';
  const input = document.getElementById('studentProgressSearchInput');
  if (input) input.value = '';
  handleStudentProgressSearch('');
}

function resetStudentProgressFilters() {
  studentProgressTab = 'all';
  studentProgressSubject = 'all';
  studentProgressSearch = '';
  studentProgressSort = 'default';
  if (typeof renderPage === 'function') renderPage('progress');
}

/* ── STUDENT TASK & QUIZ DEADLINES STREAM ENGINE (NEWS DEADLINES) ── */
let studentDeadlineTab = 'all'; // 'pending' | 'archive' | 'all' | 'overdue' | 'done' | 'completed'
let studentDeadlineSubjectFilter = 'all';
let studentDeadlineTypeFilter = 'all'; // 'all' | 'interactive' | 'normal'
let studentDeadlineStatusFilter = 'all'; // 'all' | 'pending' | 'completed'
let studentDeadlineMonthFilter = 'all';
let studentDeadlineSort = 'deadline_desc'; // 'deadline_desc' | 'type_interactive' | 'type_standard'

function setStudentDeadlineTab(tab) {
  studentDeadlineTab = tab;
  if (tab === 'pending') {
    studentDeadlineStatusFilter = 'pending';
  } else if (tab === 'all') {
    studentDeadlineStatusFilter = 'all';
  }
  updateStudentDeadlinesWidget();
}

function setStudentDeadlineSubject(sub) {
  studentDeadlineSubjectFilter = sub;
  updateStudentDeadlinesWidget();
}

function setStudentDeadlineType(type) {
  studentDeadlineTypeFilter = type;
  updateStudentDeadlinesWidget();
}

function setStudentDeadlineStatus(status) {
  studentDeadlineStatusFilter = status;
  if (status === 'pending') {
    studentDeadlineTab = 'pending';
  } else if (status === 'all') {
    studentDeadlineTab = 'all';
  } else {
    studentDeadlineTab = status;
  }
  updateStudentDeadlinesWidget();
}

function setStudentDeadlineMonth(m) {
  studentDeadlineMonthFilter = m;
  updateStudentDeadlinesWidget();
}

function setStudentDeadlineSort(s) {
  studentDeadlineSort = s;
  updateStudentDeadlinesWidget();
}

function updateStudentDeadlinesWidget() {
  const container = document.getElementById('studentDeadlinesWidgetContainer');
  if (container) {
    container.innerHTML = renderStudentDeadlinesWidgetHTML();
  }
}

window.setStudentDeadlineTab = setStudentDeadlineTab;
window.setStudentDeadlineSubject = setStudentDeadlineSubject;
window.setStudentDeadlineType = setStudentDeadlineType;
window.setStudentDeadlineStatus = setStudentDeadlineStatus;
window.setStudentDeadlineMonth = setStudentDeadlineMonth;
window.setStudentDeadlineSort = setStudentDeadlineSort;
window.updateStudentDeadlinesWidget = updateStudentDeadlinesWidget;

// Presentation helpers: all dashboard links use the existing role navigation.
function dashboardIcon(name) {
  const paths = {
    book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
    quiz: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 10l2 2 4-4M9 16h6"/>',
    news: '<path d="m3 10 14-6v16L3 14v-4ZM7 15l2 7h3l-2-6M21 8v8"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18M7 14h1m4 0h1m4 0h1M7 18h1m4 0h1"/>',
    shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z M12 5v14M6 8h12"/>',
    sum: '<path d="M18 4H6l8 8-8 8h12"/>',
    leaf: '<path d="M19 3C6 2 2 9 6 16s15 0 13-13ZM4 21 16 7"/>',
    chart: '<path d="M3 20h18M5 16l5-6 4 3 6-9"/>',
    chat: '<path d="M21 11a9 9 0 0 1-13 8l-5 2 1-5a9 9 0 1 1 17-5Z"/>',
    atom: '<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1"/>',
    links: '<rect x="3" y="3" width="15" height="13" rx="3"/><path d="M7 20h14V8M7 7h7M7 11h4"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
}

function dashboardSubjectIcon(subject) {
  const value = String(subject).toLowerCase();
  const name = value.includes('cyber') ? 'shield' : value.includes('math') ? 'sum' : value.includes('bio') ? 'leaf' : value.includes('calc') ? 'chart' : value.includes('oral') ? 'chat' : value.includes('stem') ? 'atom' : 'book';
  return dashboardIcon(name);
}

function dashboardDeadlineLabel(deadline) {
  const parts = String(deadline).match(/^(.*?)\s+(\d{1,2}:\d{2}\s*[AP]M)$/i);
  return `<span class="dashboard-date">${dashboardIcon('calendar')}<span>${escHtml(parts ? parts[1] : deadline)}${parts ? `<small>${escHtml(parts[2])}</small>` : ''}</span></span>`;
}

function renderDashboardQuickLinks(role) {
  const pages = role === 'teacher' ? ['materials', 'quiz', 'classrec', 'chats'] : ['materials', 'quizzes', 'progress', 'chats'];
  return `<section class="dashboard-quick-links"><h3><span>${dashboardIcon('links')}</span>Quick Links</h3><div class="dashboard-shortcut-grid">${pages.map(page => {
    const item = SIDEBAR[role].find(entry => entry.page === page);
    return `<button type="button" class="dashboard-shortcut" onclick="${page === 'materials' ? "if(typeof setActiveSubjectMaterials==='function') setActiveSubjectMaterials(null); " : ''}renderPage('${page}')"><span class="dashboard-shortcut-icon">${item.icon}</span><span>${item.label}</span></button>`;
  }).join('')}</div></section>`;
}

let studentSubjectShelfTab = 'enrolled';

function getStudentDashboardSubjects(tab = 'enrolled') {
  if (typeof COURSES_DATABASE === 'undefined' || typeof isCourseOpenForStudent !== 'function') return [];
  const gradeNumber = value => Number(String(value || '').match(/\d+/)?.[0]) || null;
  const grade = gradeNumber(CURRENT_PROFILE?.grade_level || CURRENT_PROFILE?.gradeLevel);
  return COURSES_DATABASE.filter(course => {
    if (!isCourseOpenForStudent(course)) return false;
    const courseGrade = gradeNumber(course.gradeLevel);
    const completed = course.status === 'completed' || (grade && courseGrade && courseGrade < grade);
    if (tab === 'completed') return Boolean(completed);
    return !completed && (!grade || !courseGrade || courseGrade === grade);
  });
}

function setStudentSubjectShelfTab(tab) {
  if (!['enrolled', 'completed'].includes(tab)) return;
  studentSubjectShelfTab = tab;
  const shelf = document.querySelector('.dashboard-subject-shelf');
  if (!shelf) return;
  shelf.outerHTML = renderStudentSubjectShelf();
  document.querySelector('.subject-shelf-tabs [aria-pressed="true"]')?.focus({ preventScroll: true });
}

function renderStudentSubjectShelf() {
  const courses = getStudentDashboardSubjects(studentSubjectShelfTab);
  const completed = studentSubjectShelfTab === 'completed';
  return `<section class="dashboard-subject-shelf" aria-labelledby="studentSubjectsTitle">
    <header><div><h3 id="studentSubjectsTitle">${completed ? 'Completed Subjects' : 'My Enrolled Subjects'}</h3><p>${completed ? 'Previous-grade subjects and completed courses.' : 'Browse subjects for your current grade level.'}</p></div>
      <div class="subject-shelf-controls"><button type="button" aria-label="Previous subjects" onclick="scrollStudentSubjectShelf(-1)">&#8592;</button><button type="button" aria-label="Next subjects" onclick="scrollStudentSubjectShelf(1)">&#8594;</button></div>
    </header>
    <div class="subject-shelf-tabs" role="group" aria-label="Subject status">
      <button type="button" aria-pressed="${!completed}" onclick="setStudentSubjectShelfTab('enrolled')">Enrolled <span>${getStudentDashboardSubjects('enrolled').length}</span></button>
      <button type="button" aria-pressed="${completed}" onclick="setStudentSubjectShelfTab('completed')">Completed <span>${getStudentDashboardSubjects('completed').length}</span></button>
    </div>
    <div class="subject-shelf-track" id="studentSubjectShelf" tabindex="0" role="region" aria-label="${completed ? 'Completed' : 'Enrolled'} subjects, scroll horizontally">
      ${courses.length ? courses.map(course => `<button type="button" class="subject-shelf-card" onclick="handleCourseClick(${escHtml(JSON.stringify(course.id))})">
        <img class="subject-shelf-cover" src="${escHtml(course.cover || 'assets/slide1.jpg')}" alt="" loading="lazy" onerror="this.onerror=null;this.src='assets/slide1.jpg'">
        <span class="subject-shelf-top"><span class="subject-shelf-icon">${dashboardSubjectIcon(course.title)}</span><span>${escHtml(course.code || course.track || 'Subject')}</span></span>
        <strong title="${escHtml(course.title)}">${escHtml(course.title)}</strong><span class="subject-shelf-meta">${escHtml(course.gradeLevel || '')}${course.semester ? ' · ' + escHtml(course.semester) : ''}</span>
        <span class="subject-shelf-foot"><span>${escHtml(course.instructor || 'Faculty')}</span><span>Open subject &#8594;</span></span>
      </button>`).join('') : `<p class="dashboard-widget-empty">${completed ? 'No previous-grade or completed subjects available yet.' : 'No enrolled subjects available for your grade level yet.'}</p>`}
    </div>
  </section>`;
}

function scrollStudentSubjectShelf(direction) {
  const track = document.getElementById('studentSubjectShelf');
  if (!track) return;
  track.scrollBy({ left: direction * 272, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function renderStudentEssentials() {
  const attempted = new Set(myQuizAttempts.map(attempt => String(attempt.quiz_id)));
  const upcoming = customQuizzes.filter(quiz => isQuizTargetedForStudent(quiz, CURRENT_PROFILE) && !attempted.has(String(quiz.id)) && new Date(quiz.dueDate || quiz.due_date).getTime() >= Date.now())
    .sort((a,b) => new Date(a.dueDate || a.due_date) - new Date(b.dueDate || b.due_date));
  const next = upcoming[0];
  const profile = CURRENT_PROFILE || {};
  return `<section class="dashboard-essentials"><header><h3>${dashboardIcon('book')} Student Essentials</h3></header>
    <div class="student-academic-details"><h4>Academic Details</h4><dl>
      <div><dt>Strand</dt><dd>${escHtml(profile.strand || 'Not assigned')}</dd></div>
      <div><dt>Grade level</dt><dd>${escHtml(profile.grade_level || profile.gradeLevel || 'Not assigned')}</dd></div>
      <div><dt>Section</dt><dd>${escHtml(profile.section || 'Not assigned')}</dd></div>
    </dl><button type="button" class="dashboard-text-link" onclick="renderPage('profile')">View my profile &#8594;</button></div>
    <div class="student-next-deadline"><h4>Next Deadline</h4>${next ? `<strong>${escHtml(next.title || 'Quiz')}</strong><p>${escHtml(next.subject || 'Assessment')}</p><time datetime="${escHtml(next.dueDate || next.due_date)}">${escHtml(new Date(next.dueDate || next.due_date).toLocaleString('en-US', {month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}))}</time>` : '<p>No upcoming quiz deadlines. Check your materials for other class tasks.</p>'}
      <button type="button" class="dashboard-text-link" onclick="renderPage('quizzes')">View assessments &#8594;</button></div>
  </section>`;
}

function renderStudentAssessmentOverview() {
  const attempts = myQuizAttempts.slice().sort((a,b) => (Date.parse(b.submitted_at) || 0) - (Date.parse(a.submitted_at) || 0));
  const completed = new Set(attempts.map(attempt => String(attempt.quiz_id)));
  const now = Date.now();
  const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
  const dueSoon = customQuizzes.filter(quiz => {
    const due = new Date(quiz.dueDate || quiz.due_date).getTime();
    return isQuizTargetedForStudent(quiz, CURRENT_PROFILE) && !completed.has(String(quiz.id)) && due >= now && due <= weekEnd;
  }).length;
  return `<section class="dashboard-assessment-overview" aria-labelledby="assessmentOverviewTitle">
    <header><h3 id="assessmentOverviewTitle">${dashboardIcon('chart')} Assessment Overview</h3><p>A quick look at your assessment activity.</p></header>
    <dl class="assessment-overview-stats"><div><dt>Completed quizzes</dt><dd>${completed.size}</dd></div><div><dt>Due in the next 7 days</dt><dd>${dueSoon}</dd></div></dl>
    <h4>Recent Results</h4><div class="assessment-recent-results">${attempts.length ? attempts.slice(0,3).map(attempt => {
      const quiz = customQuizzes.find(item => String(item.id) === String(attempt.quiz_id));
      const score = Number(attempt.score);
      const total = Number(attempt.total_items);
      const result = attempt.score != null && Number.isFinite(score) && Number.isFinite(total) && total > 0 ? Math.round(score / total * 100) + '%' : 'Submitted';
      const submitted = new Date(attempt.submitted_at || '');
      return `<div class="assessment-result-row"><div><strong>${escHtml(quiz?.title || 'Completed assessment')}</strong><span>${escHtml(quiz?.subject || 'Assessment')}${Number.isNaN(submitted.getTime()) ? '' : ' ? ' + escHtml(submitted.toLocaleDateString('en-US',{month:'short',day:'numeric'}))}</span></div><span class="assessment-result-score">${result}</span></div>`;
    }).join('') : '<p class="dashboard-widget-empty">Your results will appear here after you submit an assessment.</p>'}</div>
    <button type="button" class="assessment-progress-link" onclick="renderPage('progress')">View my progress <span aria-hidden="true">&#8594;</span></button>
  </section>`;
}

function renderStudentDashboardActivity() {
  const activity = typeof getNotificationsForCurrentUser === 'function' ? getNotificationsForCurrentUser().slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0,3) : [];
  return `<section class="dashboard-recent-activity"><header><h4>Recent Activity</h4><button type="button" class="dashboard-text-link" onclick="renderPage('notifications')">View all &#8594;</button></header>${activity.length ? activity.map(item => `<button type="button" class="dashboard-activity-item" onclick="handleNotifItemClick(${escHtml(JSON.stringify(String(item.id)))})"><strong>${escHtml(item.title || 'Notification')}</strong><span>${escHtml(item.message || '')}</span></button>`).join('') : '<p class="dashboard-widget-empty">No recent activity yet.</p>'}</section>`;
}

function renderStudentDeadlinesWidgetHTML() {
  const allQuizzes = (typeof customQuizzes !== 'undefined' ? customQuizzes : []);
  const visibleQuizzes = allQuizzes.filter(q =>
    (q.status === 'active' || q.status === 'approved' || q.status === 'closed' || q.isDemo) &&
    (typeof isQuizTargetedForStudent === 'function' ? isQuizTargetedForStudent(q, CURRENT_PROFILE) : true)
  );

  const attemptsByQuiz = new Map(
    (typeof myQuizAttempts !== 'undefined' ? myQuizAttempts : []).map(a => [String(a.quiz_id), a])
  );

  const now = Date.now();
  const items = visibleQuizzes.map((q, idx) => {
    let rawDue = q.dueDate || q.due_date;
    let dateObj = rawDue ? new Date(rawDue) : null;
    if (!dateObj || isNaN(dateObj.getTime())) {
      // Deterministic fallback based on created date or ID
      const base = q.createdAt ? new Date(q.createdAt).getTime() : (q.created_at ? new Date(q.created_at).getTime() : (now - 86400000 * 2));
      dateObj = new Date(base + ((idx % 7) * 2 + 1) * 86400000);
      dateObj.setHours(19, 0, 0, 0);
    }

    const dueMs = dateObj.getTime();
    const isAttempted = attemptsByQuiz.has(String(q.id));
    const attempt = attemptsByQuiz.get(String(q.id));
    const isOverdue = !isAttempted && (now > dueMs);
    const isDueSoon = !isAttempted && !isOverdue;

    // Time ago since the teacher posted it (for pending quizzes)
    const createdAtRaw = q.createdAt || q.created_at;
    let postTimeAgo = '';
    if (createdAtRaw) {
      const createdMs = new Date(createdAtRaw).getTime();
      if (!isNaN(createdMs)) {
        const diffMs = Math.max(0, now - createdMs);
        const mins = Math.floor(diffMs / 60000);
        const hrs = Math.floor(diffMs / 3600000);
        const days = Math.floor(diffMs / 86400000);
        if (days > 0) postTimeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
        else if (hrs > 0) postTimeAgo = `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
        else if (mins > 0) postTimeAgo = `${mins} min${mins > 1 ? 's' : ''} ago`;
        else postTimeAgo = 'Just now';
      }
    }
    if (!postTimeAgo) {
      const pseudoHours = ((idx % 8) * 3 + 2);
      postTimeAgo = pseudoHours >= 24 ? `${Math.floor(pseudoHours / 24)} days ago` : `${pseudoHours} hours ago`;
    }

    const dayNum = dateObj.getDate();
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
    const monthLong = dateObj.toLocaleDateString('en-US', { month: 'long' });
    const monthNum = dateObj.getMonth() + 1;
    const time24 = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const time12 = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const status = isAttempted ? 'done' : (isOverdue ? 'overdue' : 'due');
    const isInter = q.type === 'interactive' || q.quiz_type === 'interactive';
    const pct = attempt && attempt.total_items ? Math.round((attempt.score / attempt.total_items) * 100) : null;

    return {
      quiz: q,
      id: q.id,
      title: q.title || 'Academic Assessment',
      subject: q.subject || 'General Academic',
      lesson: q.lesson || '',
      itemCount: (q.questions || []).length || 10,
      isInter,
      dueMs,
      dateObj,
      dayNum,
      dayName,
      monthShort,
      monthLong,
      monthNum,
      time24,
      time12,
      dueTag: `(due ${dayNum} ${monthShort}, ${time24})`,
      fullDateStr: `${dayName}, ${monthShort} ${dayNum} · ${time12}`,
      postTimeAgo,
      status,
      isAttempted,
      isOverdue,
      isDueSoon,
      pct,
      attempt
    };
  });

  // Live quiz tasks from visible teacher quizzes
  const liveQuizTasks = items.map(i => {
    let icon = '📝';
    let iconBg = '#2563eb';
    const sLower = (i.subject || '').toLowerCase();
    if (sLower.includes('bio')) { icon = '🌿'; iconBg = '#16a34a'; }
    else if (sLower.includes('math') || sLower.includes('calc')) { icon = '∑'; iconBg = '#7c3aed'; }
    else if (sLower.includes('phys')) { icon = '⚡'; iconBg = '#ea580c'; }
    else if (sLower.includes('chem')) { icon = '🧪'; iconBg = '#16a34a'; }
    else if (sLower.includes('tech') || sLower.includes('ict')) { icon = '💻'; iconBg = '#db2777'; }
    else if (sLower.includes('earth')) { icon = '🌍'; iconBg = '#0284c7'; }

    return {
      id: `quiz-${i.id}`,
      subject: i.subject,
      icon,
      iconBg,
      title: i.title,
      type: i.isInter ? 'Interactive Quiz' : 'Quiz',
      typeClass: i.isInter ? 'interactive' : 'quiz',
      isInter: i.isInter,
      deadline: `${i.monthShort} ${i.dayNum}, 2025 ${i.time12}`,
      status: i.isAttempted ? 'Completed' : 'Pending',
      quizId: i.id,
      isCompleted: i.isAttempted,
      pct: i.pct,
      monthNum: i.monthNum,
      monthShort: i.monthShort,
      monthLong: i.monthLong,
      dueMs: i.dueMs
    };
  });

  // Academic fallback items matching ELMS dashboard design
  const defaultTasks = [
    {
      id: 'task-cyber',
      subject: 'Cyber security',
      icon: '🛡️',
      iconBg: '#2563eb',
      title: 'Quiz 1 - Module 3',
      type: 'Quiz',
      typeClass: 'quiz',
      isInter: false,
      deadline: 'Sep 5, 2025 10:00 AM',
      monthNum: 9,
      monthShort: 'Sep',
      monthLong: 'September',
      dueMs: new Date('2025-09-05T10:00:00').getTime(),
      status: 'Pending',
      quizId: allQuizzes.find(q => (q.subject || '').toLowerCase().includes('cyber'))?.id || (allQuizzes[0]?.id || null)
    },
    {
      id: 'task-math',
      subject: 'General Mathematics',
      icon: '∑',
      iconBg: '#7c3aed',
      title: 'Activity 2 - Problem Set',
      type: 'Assignment',
      typeClass: 'assignment',
      isInter: false,
      deadline: 'Sep 6, 2025 11:59 PM',
      monthNum: 9,
      monthShort: 'Sep',
      monthLong: 'September',
      dueMs: new Date('2025-09-06T23:59:00').getTime(),
      status: 'Pending',
      quizId: allQuizzes.find(q => (q.subject || '').toLowerCase().includes('math'))?.id || null
    },
    {
      id: 'task-bio',
      subject: 'General Biology 1',
      icon: '🌿',
      iconBg: '#16a34a',
      title: 'Quiz 1 - Cell Structure',
      type: 'Quiz',
      typeClass: 'quiz',
      isInter: false,
      deadline: 'Sep 8, 2025 09:00 AM',
      monthNum: 9,
      monthShort: 'Sep',
      monthLong: 'September',
      dueMs: new Date('2025-09-08T09:00:00').getTime(),
      status: 'Pending',
      quizId: allQuizzes.find(q => (q.subject || '').toLowerCase().includes('bio'))?.id || null
    },
    {
      id: 'task-precalc',
      subject: 'Pre-Calculus',
      icon: '📈',
      iconBg: '#0284c7',
      title: 'Performance Task',
      type: 'Performance Task',
      typeClass: 'performance',
      isInter: false,
      deadline: 'Sep 10, 2025 11:59 PM',
      monthNum: 9,
      monthShort: 'Sep',
      monthLong: 'September',
      dueMs: new Date('2025-09-10T23:59:00').getTime(),
      status: 'Pending',
      quizId: allQuizzes.find(q => (q.subject || '').toLowerCase().includes('calc'))?.id || null
    },
    {
      id: 'task-oral',
      subject: 'Oral Communication',
      icon: '💬',
      iconBg: '#0284c7',
      title: 'Quiz 2 - Speech Analysis',
      type: 'Interactive Quiz',
      typeClass: 'interactive',
      isInter: true,
      deadline: 'Sep 12, 2025 10:00 AM',
      monthNum: 9,
      monthShort: 'Sep',
      monthLong: 'September',
      dueMs: new Date('2025-09-12T10:00:00').getTime(),
      status: 'Pending',
      quizId: allQuizzes.find(q => (q.subject || '').toLowerCase().includes('oral') || (q.subject || '').toLowerCase().includes('comm'))?.id || null
    },
    {
      id: 'task-reading',
      subject: 'Reading and Writing Skills',
      icon: '📖',
      iconBg: '#9333ea',
      title: 'Activity 1 - Essay',
      type: 'Assignment',
      typeClass: 'assignment',
      isInter: false,
      deadline: 'Sep 15, 2025 11:59 PM',
      monthNum: 9,
      monthShort: 'Sep',
      monthLong: 'September',
      dueMs: new Date('2025-09-15T23:59:00').getTime(),
      status: 'Pending',
      quizId: allQuizzes.find(q => (q.subject || '').toLowerCase().includes('reading') || (q.subject || '').toLowerCase().includes('writing'))?.id || null
    },
    {
      id: 'task-stem',
      subject: 'STEM',
      icon: '⚛️',
      iconBg: '#06b6d4',
      title: 'Project Submission',
      type: 'Project',
      typeClass: 'project',
      isInter: false,
      deadline: 'Sep 18, 2025 11:59 PM',
      monthNum: 9,
      monthShort: 'Sep',
      monthLong: 'September',
      dueMs: new Date('2025-09-18T23:59:00').getTime(),
      status: 'Completed',
      isCompleted: true,
      quizId: allQuizzes.find(q => (q.strand || '').toLowerCase().includes('stem'))?.id || null
    }
  ];

  // Update default tasks if user has taken any linked quiz
  defaultTasks.forEach(dt => {
    if (dt.quizId && attemptsByQuiz.has(String(dt.quizId))) {
      dt.status = 'Completed';
      dt.isCompleted = true;
    }
  });

  // All combined tasks
  const allCombinedTasks = [...liveQuizTasks, ...defaultTasks];
  const pendingTasksCount = allCombinedTasks.filter(t => (t.status || '').toLowerCase() === 'pending').length;
  const totalTasksCount = allCombinedTasks.length;

  let displayTasks = allCombinedTasks;

  // 1. Subject filter
  if (studentDeadlineSubjectFilter && studentDeadlineSubjectFilter !== 'all') {
    displayTasks = displayTasks.filter(t => (t.subject || '').trim().toLowerCase() === studentDeadlineSubjectFilter.trim().toLowerCase());
  }

  // 2. Types of Quiz filter (Interactive or Normal Quiz)
  if (studentDeadlineTypeFilter && studentDeadlineTypeFilter !== 'all') {
    if (studentDeadlineTypeFilter === 'interactive') {
      displayTasks = displayTasks.filter(t => t.isInter === true || (t.type && t.type.toLowerCase().includes('interactive')));
    } else if (studentDeadlineTypeFilter === 'normal') {
      displayTasks = displayTasks.filter(t => !t.isInter && (t.type && (t.type.toLowerCase() === 'quiz' || t.type.toLowerCase().includes('normal') || t.type.toLowerCase().includes('standard'))));
    }
  }

  // 3. Status filter (Pending or Completed)
  if (studentDeadlineStatusFilter && studentDeadlineStatusFilter !== 'all') {
    if (studentDeadlineStatusFilter.toLowerCase() === 'pending') {
      displayTasks = displayTasks.filter(t => (t.status || '').toLowerCase() === 'pending');
    } else if (studentDeadlineStatusFilter.toLowerCase() === 'completed') {
      displayTasks = displayTasks.filter(t => (t.status || '').toLowerCase() === 'completed' || t.isCompleted === true);
    }
  } else if (studentDeadlineTab === 'pending') {
    displayTasks = displayTasks.filter(t => (t.status || '').toLowerCase() === 'pending');
  }

  // 4. Date / Month filter
  if (studentDeadlineMonthFilter && studentDeadlineMonthFilter !== 'all') {
    const filterMonth = String(studentDeadlineMonthFilter).toLowerCase();
    displayTasks = displayTasks.filter(t => {
      const mNum = t.monthNum != null ? String(t.monthNum) : (t.dateObj ? String(t.dateObj.getMonth() + 1) : null);
      if (mNum && mNum === filterMonth) return true;
      if (t.monthShort && t.monthShort.toLowerCase() === filterMonth) return true;
      if (t.monthLong && t.monthLong.toLowerCase() === filterMonth) return true;
      return false;
    });
  }

  // Sort display tasks chronologically
  displayTasks.sort((a, b) => {
    const aMs = a.dueMs || (a.dateObj ? a.dateObj.getTime() : 0);
    const bMs = b.dueMs || (b.dateObj ? b.dateObj.getTime() : 0);
    return aMs - bMs;
  });

  // Unique Subject options
  const subjectOptions = [
    'Cyber security',
    'General Mathematics',
    'General Biology 1',
    'Pre-Calculus',
    'General Physics 1',
    'General Chemistry 1',
    'Empowerment Technologies (ICT)',
    'Earth and Life Science',
    'Oral Communication',
    'Reading and Writing Skills',
    'STEM'
  ];
  allCombinedTasks.forEach(t => {
    if (t.subject && !subjectOptions.some(s => s.toLowerCase() === t.subject.toLowerCase())) {
      subjectOptions.push(t.subject);
    }
  });

  // Month options
  const monthOptions = [
    { val: '9', label: 'September 2025' },
    { val: '10', label: 'October 2025' },
    { val: '11', label: 'November 2025' },
    { val: '12', label: 'December 2025' }
  ];
  allCombinedTasks.forEach(t => {
    if (t.monthNum && !monthOptions.some(m => m.val === String(t.monthNum))) {
      monthOptions.push({
        val: String(t.monthNum),
        label: `${t.monthLong || t.monthShort} ${t.dateObj ? t.dateObj.getFullYear() : '2025'}`
      });
    }
  });

  return `
  <div class="student-deadlines-container">
    <!-- Header -->
    <div class="student-deadlines-header">
      <div class="deadlines-title-wrap">
        <h3>
          <span class="dashboard-heading-icon">${dashboardIcon('calendar')}</span> Your Tasks &amp; Quizzes
          ${pendingTasksCount > 0 ? `
          <span class="badge" style="background:#2563eb;color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;margin-left:6px;">
            ${pendingTasksCount} Active Due
          </span>` : ''}
        </h3>
        <p>Track upcoming quiz schedules, day/time deadlines, and types for every subject you take.</p>
      </div>

      <!-- Top Pills -->
      <div class="deadlines-top-pills">
        <button class="top-pill-btn ${studentDeadlineStatusFilter === 'pending' || (studentDeadlineStatusFilter === 'all' && studentDeadlineTab === 'pending') ? 'active' : ''}" onclick="setStudentDeadlineTab('pending')">
          Pending Quizzes <span style="font-weight:800;margin-left:2px;">${pendingTasksCount}</span>
        </button>
        <button class="top-pill-btn ${studentDeadlineStatusFilter === 'all' && studentDeadlineTab !== 'pending' ? 'active' : ''}" onclick="setStudentDeadlineTab('all')">
          All Tasks <span style="font-weight:800;margin-left:2px;">${totalTasksCount}</span>
        </button>
      </div>
    </div>

    <!-- Filter Dropdowns Row -->
    <div class="deadlines-filters-row">
      <!-- 1. Subject Filter -->
      <select class="deadline-filter-select" onchange="setStudentDeadlineSubject(this.value)" title="Filter by Subject">
        <option value="all" ${studentDeadlineSubjectFilter === 'all' ? 'selected' : ''}>📚 All Subjects (${subjectOptions.length})</option>
        ${subjectOptions.map(s => `
          <option value="${escHtml(s)}" ${studentDeadlineSubjectFilter === s ? 'selected' : ''}>${escHtml(s)}</option>
        `).join('')}
      </select>

      <!-- 2. Types of Quiz Filter -->
      <select class="deadline-filter-select" onchange="setStudentDeadlineType(this.value)" title="Filter by Quiz Type">
        <option value="all" ${studentDeadlineTypeFilter === 'all' ? 'selected' : ''}>📝 All Quiz Types</option>
        <option value="interactive" ${studentDeadlineTypeFilter === 'interactive' ? 'selected' : ''}>🎮 Interactive Quiz</option>
        <option value="normal" ${studentDeadlineTypeFilter === 'normal' ? 'selected' : ''}>📋 Normal Quiz</option>
      </select>

      <!-- 3. Status Filter -->
      <select class="deadline-filter-select" onchange="setStudentDeadlineStatus(this.value)" title="Filter by Status">
        <option value="all" ${studentDeadlineStatusFilter === 'all' ? 'selected' : ''}>⚡ All Status</option>
        <option value="pending" ${studentDeadlineStatusFilter === 'pending' ? 'selected' : ''}>⏳ Pending</option>
        <option value="completed" ${studentDeadlineStatusFilter === 'completed' ? 'selected' : ''}>✅ Completed</option>
      </select>

      <!-- 4. Month Filter -->
      <select class="deadline-filter-select" onchange="setStudentDeadlineMonth(this.value)" title="Filter by Month/Date">
        <option value="all" ${studentDeadlineMonthFilter === 'all' ? 'selected' : ''}>📅 All Months</option>
        ${monthOptions.map(m => `
          <option value="${escHtml(m.val)}" ${String(studentDeadlineMonthFilter) === String(m.val) ? 'selected' : ''}>${escHtml(m.label)}</option>
        `).join('')}
      </select>
    </div>

    <!-- Deadlines Table (Image 1) -->
    <div class="student-deadlines-table-wrap">
      <table class="student-deadlines-table">
        <thead>
          <tr>
            <th style="width:26%;">Subject</th>
            <th style="width:25%;">Task / Quiz</th>
            <th style="width:16%;">Type</th>
            <th style="width:18%;">Deadline</th>
            <th style="width:15%;min-width:85px;text-align:right;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${displayTasks.length === 0 ? `
            <tr>
              <td colspan="5" style="text-align:center;padding:32px 16px;color:#64748b;font-size:13px;font-weight:600;">
                No tasks or quizzes found matching your filters.
              </td>
            </tr>
          ` : displayTasks.slice(0, 10).map(t => {
            const clickHandler = t.quizId
              ? (t.isCompleted ? `openReviewAttempt('${t.quizId}')` : `openTakeQuizModal('${t.quizId}')`)
              : `showToast('Assessment details for ${escHtml(t.title)}', 'info')`;

            return `
            <tr onclick="${clickHandler}" style="cursor:pointer;" title="Click to view ${escHtml(t.title)}">
              <!-- Subject -->
              <td>
                <div class="subject-badge-cell">
                  <div class="subj-icon-box" style="background:${t.iconBg};">
                    ${dashboardSubjectIcon(t.subject)}
                  </div>
                  <span style="font-weight:700;color:#0f172a;font-size:13px;">${escHtml(t.subject)}</span>
                </div>
              </td>

              <!-- Task / Quiz -->
              <td>
                <span style="font-weight:600;color:#334155;font-size:13px;">${escHtml(t.title)}</span>
              </td>

              <!-- Type -->
              <td>
                <span class="type-pill ${t.typeClass || 'quiz'}">
                  ${escHtml(t.type)}
                </span>
              </td>

              <!-- Deadline -->
              <td>
                ${dashboardDeadlineLabel(t.deadline)}
              </td>

              <!-- Status -->
              <td style="text-align:right;">
                <span class="${t.status === 'Completed' ? 'type-pill performance' : 'status-pill-amber'}">
                  ${escHtml(t.status)}
                </span>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Footer View All Link -->
    <div style="margin-top:14px;padding-top:10px;border-top:1px solid #f1f5f9;">
      <a href="javascript:void(0)" onclick="renderPage('quizzes')" class="view-all-link" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;">
        View All Tasks &amp; Quizzes →
      </a>
    </div>
  </div>`;
}

/* ── STUDENT PAGES ── */
function studentPage(page) {
  switch(page) {
    case 'dashboard': {
      const mySubjects = [...new Set(materialsData.map(m => m.subject).filter(Boolean))];
      const attemptedQuizIds = new Set(myQuizAttempts.map(a => a.quiz_id));
      const availableQuizzes = customQuizzes.filter(q =>
        !attemptedQuizIds.has(q.id) && (typeof isQuizTargetedForStudent === 'function' ? isQuizTargetedForStudent(q, CURRENT_PROFILE) : true)
      );
      const latestAttempt = myQuizAttempts[0] || null;
      const latestQuizTitle = latestAttempt ? (customQuizzes.find(q => q.id === latestAttempt.quiz_id)?.title || 'Quiz') : null;
      const latestScorePct = latestAttempt && latestAttempt.total_items ? Math.round((latestAttempt.score / latestAttempt.total_items) * 100) : 63;

      const enrolledCoursesCount = typeof isCourseOpenForStudent === 'function' 
        ? getStudentDashboardSubjects('enrolled').length
        : 14;

      const completedQuizzesCount = myQuizAttempts.length || 7;
      const pendingQuizzesCount = availableQuizzes.length || 9;
      const totalQuizzesTracked = completedQuizzesCount + pendingQuizzesCount;
      const progressPct = totalQuizzesTracked > 0 ? Math.round((completedQuizzesCount / totalQuizzesTracked) * 100) : 44;
      const C = 238.76;
      const qCompLen = totalQuizzesTracked > 0 ? (completedQuizzesCount / totalQuizzesTracked) * C : 0;
      const qPendLen = totalQuizzesTracked > 0 ? (pendingQuizzesCount / totalQuizzesTracked) * C : 0;
      const qPendOffset = -qCompLen;

      const allAnc = typeof getStoredAnnouncements === 'function' ? getStoredAnnouncements() : [];
      const readAnc = typeof getReadAnnouncementIds === 'function' ? getReadAnnouncementIds() : new Set();
      const unreadCount = Math.max(3, allAnc.filter(a => !a.isArchived && a.status !== 'draft' && !a.isDraft).length - readAnc.size);

      const studentName = (CURRENT_PROFILE?.full_name || CURRENT_PROFILE?.name || 'Michael').trim();
      const firstName = studentName.split(/\s+/)[0] || 'Michael';

      // Greeting based on time of day
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'morning' : (hour < 18 ? 'afternoon' : 'evening');

      return `
      <!-- 1. HERO BANNER -->
      <div class="student-hero-banner">
        <div class="student-hero-left">
          <div class="student-hero-icon-badge">🎓</div>
          <div class="student-hero-text">
            <h1>Good ${greeting}, ${escHtml(firstName)}!</h1>
            <h2>Welcome back to Scholaria!</h2>
            <p>Stay on track with your studies — check your deadlines, complete quizzes &amp; view announcements.</p>
          </div>
        </div>
        <div class="student-hero-right">
          <div class="student-hero-quote">
            "Small steps every day lead to big results."
          </div>
          <div class="student-hero-art">
            <svg width="84" height="68" viewBox="0 0 100 80" fill="none">
              <path d="M15 55L45 70L85 50L55 35L15 55Z" fill="#1e40af"/>
              <path d="M15 55L15 62L45 77L45 70L15 55Z" fill="#1d4ed8"/>
              <path d="M45 70L45 77L85 57L85 50L45 70Z" fill="#3b82f6"/>
              <path d="M20 42L50 57L88 38L58 23L20 42Z" fill="#d97706"/>
              <path d="M20 42L20 49L50 64L50 57L20 42Z" fill="#b45309"/>
              <path d="M50 57L50 64L88 45L88 38L50 57Z" fill="#f59e0b"/>
              <path d="M25 28L55 43L92 25L62 10L25 28Z" fill="#2563eb"/>
              <path d="M25 28L25 35L55 50L55 43L25 28Z" fill="#1d4ed8"/>
              <path d="M55 43L55 50L92 32L92 25L55 43Z" fill="#60a5fa"/>
              <path d="M30 31L53 42L85 27L62 15L30 31Z" fill="#93c5fd" opacity="0.4"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- 2. 4 STAT CARDS ROW (INTERACTIVE & POLISHED) -->
      <div class="student-stat-cards-grid">
        <div class="student-stat-card" onclick="if(typeof setActiveSubjectMaterials==='function') setActiveSubjectMaterials(null); renderPage('materials');" style="cursor:pointer;" title="View all enrolled subjects">
          <div class="stat-card-icon blue">
            ${dashboardIcon('book')}
          </div>
          <div class="stat-card-info">
            <div class="stat-card-label">Enrolled Subjects</div>
            <div class="stat-card-num blue">${enrolledCoursesCount || 14}</div>
            <div class="stat-card-desc">Across all your courses</div>
          </div>
          <span class="stat-card-arrow">›</span>
        </div>

        <div class="student-stat-card" onclick="renderPage('quizzes')" style="cursor:pointer;" title="View available quizzes">
          <div class="stat-card-icon orange">
            ${dashboardIcon('quiz')}
          </div>
          <div class="stat-card-info">
            <div class="stat-card-label">Available Quizzes</div>
            <div class="stat-card-num orange">${availableQuizzes.length || 9}</div>
            <div class="stat-card-desc">New test material waiting</div>
          </div>
          <span class="stat-card-arrow">›</span>
        </div>

        <div class="student-stat-card" onclick="renderPage('progress')" style="cursor:pointer;" title="View academic performance">
          <div class="stat-card-icon green">
            ${iconProgress()}
          </div>
          <div class="stat-card-info">
            <div class="stat-card-label">Latest Score</div>
            <div class="stat-card-num green">${latestScorePct}%</div>
            <div class="stat-card-desc">Your current average</div>
          </div>
          <span class="stat-card-arrow">›</span>
        </div>

        <div class="student-stat-card" onclick="renderPage('announcements')" style="cursor:pointer;" title="View school bulletins">
          <div class="stat-card-icon pink">
            ${dashboardIcon('news')}
          </div>
          <div class="stat-card-info">
            <div class="stat-card-label">Unread News</div>
            <div class="stat-card-num pink">${unreadCount}</div>
            <div class="stat-card-desc">School announcements &amp; events</div>
          </div>
          <span class="stat-card-arrow">›</span>
        </div>
      </div>

      <!-- 3. SPLIT 2-COLUMN MAIN CONTENT -->
      <div class="student-dashboard-split">
        <!-- LEFT COLUMN: YOUR TASKS & QUIZZES -->
        <div class="student-main-left">
          ${renderStudentSubjectShelf()}
          <div id="studentDeadlinesWidgetContainer">
            ${renderStudentDeadlinesWidgetHTML()}
          </div>
        </div>

        <!-- RIGHT COLUMN: NEWS & BULLETINS + MY PROGRESS WIDGET -->
        <div class="student-main-right">
          <!-- WIDGET 1: RECENT NEWS & BULLETINS -->
          <div class="news-bulletin-container">
            <div class="news-bulletin-header">
              <h3>
                <span class="dashboard-heading-icon">${dashboardIcon('news')}</span> Recent News &amp; Activity
              </h3>
              <a href="javascript:void(0)" onclick="renderPage('announcements')" class="view-all-link">
                View All →
              </a>
            </div>

            <div class="news-bulletin-list">
              ${(() => {
                const activeNews = allAnc
                  .filter(a => !a.isArchived && a.status !== 'draft' && !a.isDraft && !(a.expiresAt && new Date(a.expiresAt).getTime() <= Date.now()))
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .slice(0, 3);

                if (!activeNews.length) {
                  return `
                    <div class="news-bulletin-item" onclick="renderPage('announcements')">
                      <span class="dashboard-news-icon academic">${dashboardIcon('book')}</span>
                      <div class="news-item-top">
                        <span class="news-tag academic">ACADEMIC</span>
                        <span class="news-time">Today</span>
                      </div>
                      <div class="news-item-title">Welcome to Scholaria Portal</div>
                      <div class="news-item-snippet">Check back here for official school announcements, typhoon class suspensions, and department bulletins.</div>
                    </div>
                  `;
                }

                return activeNews.map(anc => {
                  const isUnread = !readAnc.has(String(anc.id));
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(anc.timestamp).getTime();
                    const mins = Math.floor(diff / 60000);
                    const hrs  = Math.floor(diff / 3600000);
                    const days = Math.floor(diff / 86400000);
                    if (days > 0) return `${days}d ago`;
                    if (hrs > 0)  return `${hrs}h ago`;
                    if (mins > 0) return `${mins}m ago`;
                    return 'Just now';
                  })();

                  const tagClass = anc.category === 'emergency' ? 'emergency' : anc.category === 'academic' ? 'academic' : 'event';
                  const tagLabel = anc.category === 'emergency' ? 'SUSPENSION / EMERGENCY' : anc.category === 'academic' ? 'ACADEMIC' : anc.category === 'event' ? 'SCHOOL EVENTS' : 'ANNOUNCEMENT';

                  return `
                    <div class="news-bulletin-item" onclick="openAnnouncementDetailModal('${anc.id}')" style="cursor:pointer;" title="Click to read announcement">
                      <span class="dashboard-news-icon ${tagClass}">${dashboardIcon(anc.category === 'academic' ? 'book' : 'news')}</span>
                      <div class="news-item-top">
                        <span class="news-tag ${tagClass}">${tagLabel}</span>
                        ${isUnread ? '<span class="news-tag-new">NEW</span>' : ''}
                        <span class="news-time">${timeAgo}</span>
                      </div>
                      <div class="news-item-title">${escHtml(anc.title)}</div>
                      <div class="news-item-snippet">${escHtml((anc.message || '').replace(/\n/g, ' '))}</div>
                    </div>
                  `;
                }).join('');
              })()}
            </div>
            ${renderStudentDashboardActivity()}
          </div>

          ${renderStudentEssentials()}
          ${renderStudentAssessmentOverview()}
        </div>
      </div>
          <!-- WIDGET 2: MY PROGRESS SUMMARY WIDGET -->
          <div class="student-progress-card dashboard-progress-detail">
            <div class="student-progress-card-header">
              <h3>
                <span style="color:#0284c7;">📊</span> My Progress
              </h3>
              <a href="javascript:void(0)" onclick="renderPage('progress')" class="view-all-link">
                View All →
              </a>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;gap:18px;">
              <!-- Gauge on Left (Functional Multi-Colored Donut Chart) -->
              <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
                <div class="sw-gauge-wrap" style="position:relative;width:96px;height:96px;margin:0 auto;">
                  <svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(-90deg);">
                    <!-- Base track -->
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" stroke-width="9"/>
                    <!-- Completed Quizzes (Green) -->
                    ${qCompLen > 0 ? `<circle cx="50" cy="50" r="38" fill="none" stroke="#16a34a" stroke-width="9" stroke-linecap="round" stroke-dasharray="${qCompLen.toFixed(2)} ${C}" stroke-dashoffset="0"/>` : ''}
                    <!-- Pending Assessments (Orange) -->
                    ${qPendLen > 0 ? `<circle cx="50" cy="50" r="38" fill="none" stroke="#ea580c" stroke-width="9" stroke-linecap="round" stroke-dasharray="${qPendLen.toFixed(2)} ${C}" stroke-dashoffset="${qPendOffset.toFixed(2)}"/>` : ''}
                  </svg>
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                    <span style="font-size:22px;font-weight:800;color:#0f172a;line-height:1;">${progressPct}%</span>
                  </div>
                </div>
              </div>

              <!-- Metrics Breakdown on Right -->
              <div class="progress-breakdown-list" style="flex:1;">
                <div class="progress-breakdown-item">
                  <span class="pbi-label"><span class="pbi-dot green"></span> Completed Quizzes</span>
                  <strong>${completedQuizzesCount}</strong>
                </div>
                <div class="progress-breakdown-item">
                  <span class="pbi-label"><span class="pbi-dot orange"></span> Pending Assessments</span>
                  <strong>${pendingQuizzesCount}</strong>
                </div>
                <div class="progress-breakdown-item">
                  <span class="pbi-label"><span class="pbi-dot blue"></span> Enrolled Subjects</span>
                  <strong>${enrolledCoursesCount}</strong>
                </div>
                <div class="progress-breakdown-item total">
                  <span class="pbi-label"><span class="pbi-dot purple"></span> Current Average</span>
                  <strong style="color:#7c3aed;">${latestScorePct}%</strong>
                </div>
              </div>
            </div>
          </div>

      `;
    }

    case 'materials': return `
      <div id="materialsListWrap">${renderMaterialsList('student')}</div>`;

    case 'quizzes': {
      const attemptsByQuiz = new Map(myQuizAttempts.map(a => [a.quiz_id, a]));
      const visibleQuizzes = customQuizzes.filter(q =>
        q.status === 'closed' || isQuizTargetedForStudent(q, CURRENT_PROFILE)
      );
      const nowMs = Date.now();

      // Extract unique subjects across all visible quizzes
      const availableSubjects = [...new Set(visibleQuizzes.map(q => q.subject).filter(Boolean))].sort();

      // Calculate total metrics across all assigned quizzes
      const totalCount = visibleQuizzes.length;
      let completedCount = 0;
      let pendingCount = 0;
      let expiredCount = 0;

      visibleQuizzes.forEach(q => {
        const attempt = attemptsByQuiz.get(q.id);
        const dueMs = (q.dueDate || q.due_date) ? new Date(q.dueDate || q.due_date).getTime() : null;
        const isExpired = !attempt && dueMs && nowMs > dueMs;
        if (attempt) completedCount++;
        else if (isExpired) expiredCount++;
        else pendingCount++;
      });

      // Filter quizzes
      let filtered = visibleQuizzes.slice();

      // 1. Search Query filter
      if (studentQuizSearchQuery) {
        filtered = filtered.filter(q => {
          const t = (q.title || '').toLowerCase();
          const s = (q.subject || '').toLowerCase();
          const l = (q.lesson || '').toLowerCase();
          return t.includes(studentQuizSearchQuery) || s.includes(studentQuizSearchQuery) || l.includes(studentQuizSearchQuery);
        });
      }

      // 2. Subject filter
      if (studentQuizFilterSubject) {
        filtered = filtered.filter(q => String(q.subject || '').toLowerCase() === studentQuizFilterSubject.toLowerCase());
      }

      // 3. Status filter
      if (studentQuizFilterStatus) {
        filtered = filtered.filter(q => {
          const attempt = attemptsByQuiz.get(q.id);
          const dueMs = (q.dueDate || q.due_date) ? new Date(q.dueDate || q.due_date).getTime() : null;
          const isExpired = !attempt && dueMs && nowMs > dueMs;
          if (studentQuizFilterStatus === 'completed') return !!attempt;
          if (studentQuizFilterStatus === 'pending') return !attempt && !isExpired;
          if (studentQuizFilterStatus === 'expired') return isExpired;
          return true;
        });
      }

      // 4. Sort quizzes
      filtered.sort((a, b) => {
        const attemptA = attemptsByQuiz.get(a.id);
        const attemptB = attemptsByQuiz.get(b.id);
        const dueMsA = (a.dueDate || a.due_date) ? new Date(a.dueDate || a.due_date).getTime() : null;
        const dueMsB = (b.dueDate || b.due_date) ? new Date(b.dueDate || b.due_date).getTime() : null;
        const isExpiredA = !attemptA && dueMsA && nowMs > dueMsA;
        const isExpiredB = !attemptB && dueMsB && nowMs > dueMsB;

        if (studentQuizSortBy === 'subject') {
          const subjA = (a.subject || 'General Academic').toLowerCase();
          const subjB = (b.subject || 'General Academic').toLowerCase();
          const subjCmp = subjA.localeCompare(subjB);
          if (subjCmp !== 0) return subjCmp;
          return (a.title || '').localeCompare(b.title || '');
        }

        if (studentQuizSortBy === 'deadline') {
          if (!dueMsA && !dueMsB) return 0;
          if (!dueMsA) return 1;
          if (!dueMsB) return -1;
          return dueMsA - dueMsB;
        }

        if (studentQuizSortBy === 'pending') {
          const rankA = !attemptA ? (isExpiredA ? 2 : 1) : 3;
          const rankB = !attemptB ? (isExpiredB ? 2 : 1) : 3;
          if (rankA !== rankB) return rankA - rankB;
          if (dueMsA && dueMsB) return dueMsA - dueMsB;
          return 0;
        }

        if (studentQuizSortBy === 'newest') {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }

        if (studentQuizSortBy === 'title') {
          return (a.title || '').localeCompare(b.title || '');
        }

        return 0;
      });

      const hasActiveFilters = Boolean(studentQuizSearchQuery || studentQuizFilterSubject || studentQuizFilterStatus || studentQuizSortBy !== 'pending');

      return `
      <div class="student-quizzes-container" style="max-width:1160px;width:100%;display:flex;flex-direction:column;gap:12px;">
        <div class="section-hdr" style="margin-bottom:0;">
          <div>
            <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 2px 0;">Quizzes</h2>
            <span style="font-size:12px;color:var(--text-muted);">View, filter, sort, and complete your assigned subject assessments</span>
          </div>
        </div>

        <!-- METRIC HIGHLIGHT CARDS -->
        <div class="card-grid" style="gap:12px;margin-bottom:0;">
          <div class="stat-filter-card ${studentQuizFilterStatus === '' ? 'active' : ''}" onclick="setStudentQuizFilterStatus('')" title="Click to view all assigned quizzes">
            <div class="ic-icon">${iconQuiz()}</div>
            <div class="ic-content">
              <div class="ic-sub">Assigned Quizzes</div>
              <div class="ic-num">${totalCount}</div>
              <p>Total assessments for your grade & strand</p>
            </div>
          </div>
          <div class="stat-filter-card ${studentQuizFilterStatus === 'pending' ? 'active' : ''}" onclick="setStudentQuizFilterStatus('pending')" title="Click to filter quizzes pending to take">
            <div class="ic-icon gold">${iconClock()}</div>
            <div class="ic-content">
              <div class="ic-sub">Pending to Take</div>
              <div class="ic-num gold">${pendingCount}</div>
              <p>${pendingCount > 0 ? `${pendingCount} quiz${pendingCount === 1 ? '' : 'zes'} awaiting your submission` : 'All caught up! 🎉'}</p>
            </div>
          </div>
          <div class="stat-filter-card ${studentQuizFilterStatus === 'completed' ? 'active' : ''}" onclick="setStudentQuizFilterStatus('completed')" title="Click to filter completed quizzes">
            <div class="ic-icon green">${iconCheck()}</div>
            <div class="ic-content">
              <div class="ic-sub">Completed</div>
              <div class="ic-num green">${completedCount}</div>
              <p>${totalCount > 0 ? `${Math.round((completedCount / totalCount) * 100)}% completion rate` : 'No quizzes yet'}</p>
            </div>
          </div>
        </div>

        <!-- SEARCH, SORT & FILTER TOOLBAR -->
        <div style="background:#f8fafc;padding:10px 14px;border-radius:12px;border:1.5px solid #e2e8f0;display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;">
          <div style="display:flex;gap:8px;flex:1;min-width:min(100%,220px);max-width:380px;align-items:center;">
            <input type="text" placeholder="Search quiz title, subject, or lesson..." style="width:100%;border:1.5px solid var(--blue-light);border-radius:9px;padding:7px 12px;font-size:12.5px;background:#fff;" value="${escHtml(studentQuizSearchQuery)}" oninput="setStudentQuizSearchQuery(this.value)"/>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <!-- SORT SELECT -->
            <div style="display:flex;align-items:center;gap:5px;">
              <label style="font-size:11.5px;font-weight:700;color:#64748b;margin:0;">Sort:</label>
              <select class="user-filter-select" style="font-weight:600;padding:6px 10px;font-size:12px;border-radius:8px;" onchange="setStudentQuizSort(this.value)">
                <option value="pending" ${studentQuizSortBy === 'pending' ? 'selected' : ''}>⚡ Pending to Take First</option>
                <option value="subject" ${studentQuizSortBy === 'subject' ? 'selected' : ''}>📚 Subject (A – Z)</option>
                <option value="deadline" ${studentQuizSortBy === 'deadline' ? 'selected' : ''}>⏰ Due Date (Earliest First)</option>
                <option value="newest" ${studentQuizSortBy === 'newest' ? 'selected' : ''}>🆕 Newest Added</option>
                <option value="title" ${studentQuizSortBy === 'title' ? 'selected' : ''}>🔤 Title (A – Z)</option>
              </select>
            </div>

            <!-- SUBJECT FILTER -->
            <div style="display:flex;align-items:center;gap:5px;">
              <label style="font-size:11.5px;font-weight:700;color:#64748b;margin:0;">Subject:</label>
              <select class="user-filter-select" style="font-weight:600;padding:6px 10px;font-size:12px;border-radius:8px;" onchange="setStudentQuizFilterSubject(this.value)">
                <option value="">All Subjects</option>
                ${availableSubjects.map(s => `<option value="${escHtml(s)}" ${studentQuizFilterSubject.toLowerCase() === s.toLowerCase() ? 'selected' : ''}>${escHtml(s)}</option>`).join('')}
              </select>
            </div>

            <!-- STATUS FILTER -->
            <div style="display:flex;align-items:center;gap:5px;">
              <label style="font-size:11.5px;font-weight:700;color:#64748b;margin:0;">Status:</label>
              <select class="user-filter-select" style="font-weight:600;padding:6px 10px;font-size:12px;border-radius:8px;" onchange="setStudentQuizFilterStatus(this.value)">
                <option value="">All Statuses</option>
                <option value="pending" ${studentQuizFilterStatus === 'pending' ? 'selected' : ''}>Pending (To Take)</option>
                <option value="completed" ${studentQuizFilterStatus === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="expired" ${studentQuizFilterStatus === 'expired' ? 'selected' : ''}>Expired</option>
              </select>
            </div>

            ${hasActiveFilters ? `
              <button onclick="resetStudentQuizFilters()" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:6px 10px;border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all 0.15s ease;" title="Reset all sorting and filtering">
                ✕ Clear
              </button>
            ` : ''}
          </div>
        </div>

        <!-- QUIZ LIST -->
        <div class="quiz-list" style="display:flex;flex-direction:column;gap:8px;">
          ${filtered.length ? filtered.map(q => {
            const attempt = attemptsByQuiz.get(q.id);
            const pct = attempt && attempt.total_items ? Math.round((attempt.score / attempt.total_items) * 100) : null;
            const dueMs = (q.dueDate || q.due_date) ? new Date(q.dueDate || q.due_date).getTime() : null;
            const isExpired = !attempt && dueMs && nowMs > dueMs;
            const dueFormatted = dueMs ? new Date(dueMs).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
            const isInter = q.type === 'interactive' || q.quiz_type === 'interactive';
            const itemsCount = (q.questions || []).length;
            const isUrgent = !attempt && dueMs && (dueMs - nowMs < 86400000) && (dueMs > nowMs); // Due within 24h

            return `<div class="quiz-row" style="${isExpired ? 'opacity:0.75;background:#fcfcfc;' : ''}display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;margin:0;gap:14px;flex-wrap:wrap;transition:all 0.2s ease;">
              <div class="qz-info" style="flex:1;min-width:min(100%,220px);">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;">
                  <span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#eff6ff;color:#2563eb;font-size:11px;font-weight:700;">📚 ${escHtml(q.subject || 'General Academic')}</span>
                  ${isInter ? '<span style="display:inline-block;padding:2px 7px;border-radius:50px;background:#e0f2fe;color:#0284c7;font-size:10px;font-weight:700;">🎮 Interactive</span>' : '<span style="display:inline-block;padding:2px 7px;border-radius:50px;background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;">📝 Standard</span>'}
                  ${isUrgent ? '<span style="display:inline-block;padding:2px 7px;border-radius:50px;background:#fef2f2;color:#dc2626;font-size:10px;font-weight:700;">⚠️ Due Soon</span>' : ''}
                </div>
                <h4 style="font-size:14.5px;font-weight:700;color:#0f172a;margin:1px 0 4px;">${escHtml(q.title)}</h4>
                <div style="font-size:12px;color:var(--text-muted);display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                  <span>📋 ${itemsCount} Question${itemsCount === 1 ? '' : 's'}</span>
                  ${attempt ? `<span style="font-weight:700;color:${pct >= 75 ? '#166534' : '#991b1b'};">🎯 Score: ${attempt.score}/${attempt.total_items} (${pct}%)</span>` : ''}
                  ${dueFormatted ? `<span style="${isUrgent ? 'color:#dc2626;font-weight:700;' : ''}">🕒 Due: ${escHtml(dueFormatted)}</span>` : '<span style="color:#94a3b8;">📅 No Due Date</span>'}
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <span class="status-pill ${attempt ? 'done' : isExpired ? 'low' : 'pending'}" style="${isExpired ? 'background:#fee2e2;color:#991b1b;' : ''}">${attempt ? 'Completed' : isExpired ? 'Expired' : 'Pending'}</span>
                ${attempt ? `
                  <button class="sw-btn outline" onclick="openReviewAttempt('${q.id}')" style="padding:6px 14px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:6px;border-radius:8px;border:1.5px solid #0284c7;color:#0284c7;background:#fff;cursor:pointer;">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Review
                  </button>
                ` : isExpired ? `
                  <button class="take-btn" disabled style="background:#94a3b8;cursor:not-allowed;opacity:0.65;padding:6px 14px;font-size:12px;">Expired</button>
                ` : isInter ? `
                  <button class="sw-btn" onclick="openInteractiveQuiz('${q.id}')" style="background:linear-gradient(135deg,#0284c7,#8b5cf6);color:#fff;border:none;padding:6px 14px;font-size:12px;display:inline-flex;align-items:center;gap:5px;border-radius:8px;font-weight:600;cursor:pointer;">🎮 Play Quiz</button>
                ` : `
                  <button class="take-btn" onclick="openTakeQuizModal('${q.id}')" style="padding:6px 14px;font-size:12px;">Take Quiz</button>
                `}
              </div>
            </div>`;
          }).join('')
            : `
            <div style="text-align:center;padding:32px 16px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1;">
              <div style="font-size:32px;margin-bottom:8px;">🔍</div>
              <h3 style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;">No Quizzes Found</h3>
              <p style="color:var(--text-muted);font-size:12.5px;max-width:380px;margin:0 auto 12px;">
                ${hasActiveFilters ? 'No quizzes match your active filters or search keyword. Try clearing filters.' : 'You have no quizzes assigned to your strand and section at this time.'}
              </p>
              ${hasActiveFilters ? `<button onclick="resetStudentQuizFilters()" class="add-btn" style="margin:0 auto;">Clear All Filters</button>` : ''}
            </div>
            `}
        </div>
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

      const now = Date.now();
      let completedCount = 0;
      let pendingCount = 0;
      let overdueCount = 0;
      let scoreSum = 0;
      let scoreCount = 0;

      const allRows = quizList.map(q => {
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

        const rawDue = q.dueDate || q.due_date;
        const dueMs = rawDue ? new Date(rawDue).getTime() : null;
        const hasDue = dueMs && !isNaN(dueMs);
        const isPastDeadline = !attempt && hasDue && (now > dueMs);
        const deadlineDate = hasDue
          ? new Date(dueMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + new Date(dueMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : 'No Due Date';

        const hasTaken = !!attempt;

        let statusText = 'Not Taken';
        let statusClass = 'not-taken';

        if (hasTaken) {
          statusText = 'Completed';
          statusClass = 'done';
        } else if (isPastDeadline) {
          statusText = 'Expired';
          statusClass = 'not-taken';
          overdueCount++;
        } else {
          statusText = 'Pending';
          statusClass = 'pending';
          pendingCount++;
        }

        return {
          quiz: q,
          attempt,
          score,
          totalItems,
          pct,
          deadlineDate,
          deadlineDateObj: hasDue ? new Date(dueMs) : null,
          isPastDeadline,
          hasTaken,
          statusText,
          statusClass
        };
      });

      const overallAvg = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(2) : null;
      const uniqueSubjects = [...new Set(quizList.map(q => q.subject || 'General').filter(Boolean))].sort();

      // Filter rows
      let filteredRows = allRows.slice();

      if (studentProgressTab === 'completed') {
        filteredRows = filteredRows.filter(r => r.hasTaken);
      } else if (studentProgressTab === 'pending') {
        filteredRows = filteredRows.filter(r => !r.hasTaken && !r.isPastDeadline);
      } else if (studentProgressTab === 'overdue') {
        filteredRows = filteredRows.filter(r => !r.hasTaken && r.isPastDeadline);
      }

      if (studentProgressSubject !== 'all') {
        filteredRows = filteredRows.filter(r => (r.quiz.subject || 'General').toLowerCase().trim() === studentProgressSubject.toLowerCase().trim());
      }

      if (studentProgressSearch) {
        filteredRows = filteredRows.filter(r => {
          const t = (r.quiz.title || '').toLowerCase();
          const s = (r.quiz.subject || 'General').toLowerCase();
          return t.includes(studentProgressSearch) || s.includes(studentProgressSearch);
        });
      }

      // Sort rows
      if (studentProgressSort === 'deadline_asc') {
        filteredRows.sort((a, b) => {
          if (!a.deadlineDateObj && !b.deadlineDateObj) return 0;
          if (!a.deadlineDateObj) return 1;
          if (!b.deadlineDateObj) return -1;
          return a.deadlineDateObj.getTime() - b.deadlineDateObj.getTime();
        });
      } else if (studentProgressSort === 'deadline_desc') {
        filteredRows.sort((a, b) => {
          if (!a.deadlineDateObj && !b.deadlineDateObj) return 0;
          if (!a.deadlineDateObj) return 1;
          if (!b.deadlineDateObj) return -1;
          return b.deadlineDateObj.getTime() - a.deadlineDateObj.getTime();
        });
      } else if (studentProgressSort === 'score_desc') {
        filteredRows.sort((a, b) => (b.pct !== null ? b.pct : -1) - (a.pct !== null ? a.pct : -1));
      } else if (studentProgressSort === 'score_asc') {
        filteredRows.sort((a, b) => (a.pct !== null ? a.pct : 999) - (b.pct !== null ? b.pct : 999));
      } else if (studentProgressSort === 'title_asc') {
        filteredRows.sort((a, b) => (a.quiz.title || '').localeCompare(b.quiz.title || ''));
      }

      const hasActiveFilters = studentProgressTab !== 'all' || studentProgressSubject !== 'all' || studentProgressSearch || studentProgressSort !== 'default';

      return `
      <div class="section-hdr">
        <div>
          <h2>My Progress</h2>
          <span style="font-size:12px;color:var(--text-muted);">Real-time tracking of your quiz assessments and academic scores</span>
        </div>
      </div>

      <!-- SUMMARY HIGHLIGHT CARDS -->
      <div class="card-grid" style="margin-bottom:20px;">
        <div class="stat-filter-card ${studentProgressTab === 'all' ? 'active' : ''}" onclick="setStudentProgressTab('all')">
          <div class="ic-icon">${iconQuiz()}</div>
          <div class="ic-content">
            <div class="ic-sub">Assigned Quizzes</div>
            <div class="ic-num">${quizList.length}</div>
            <p>Total quizzes for your strand</p>
          </div>
        </div>
        <div class="stat-filter-card ${studentProgressTab === 'completed' ? 'active' : ''}" onclick="setStudentProgressTab('completed')">
          <div class="ic-icon gold">${typeof iconApproval === 'function' ? iconApproval() : iconProgress()}</div>
          <div class="ic-content">
            <div class="ic-sub">Completed</div>
            <div class="ic-num gold">${completedCount}</div>
            <p>${quizList.length ? `${Math.round((completedCount / quizList.length) * 100)}% completion rate` : 'No quizzes assigned'}</p>
          </div>
        </div>
        <div class="info-card horizontal-card">
          <div class="ic-icon green">${iconProgress()}</div>
          <div class="ic-content">
            <div class="ic-sub">Overall Average</div>
            <div class="ic-num green">${overallAvg !== null ? overallAvg + '%' : '—'}</div>
            <p>${overallAvg !== null ? (overallAvg >= 75 ? 'Passing Standing' : 'Needs Improvement') : 'Take quizzes to view average'}</p>
          </div>
        </div>
        ${(() => {
          if (studentProgressSubject !== 'all') {
            const subName = studentProgressSubject;
            const subQuizzes = allRows.filter(r => (r.quiz.subject || 'General').toLowerCase().trim() === subName.toLowerCase().trim());
            const subTotal = subQuizzes.length;
            const subDoneQuizzes = subQuizzes.filter(r => r.hasTaken);
            const subCompleted = subDoneQuizzes.length;
            let subScoreSum = 0;
            let subScoreCount = 0;
            subDoneQuizzes.forEach(r => {
              if (r.pct !== null && !isNaN(r.pct)) {
                subScoreSum += r.pct;
                subScoreCount++;
              }
            });
            const subAvg = subScoreCount > 0 ? (subScoreSum / subScoreCount).toFixed(2) : null;

            return `
            <div class="info-card horizontal-card" style="border: 1.5px solid #818cf8; background: linear-gradient(180deg, #ffffff 0%, #f5f7ff 100%);">
              <div class="ic-icon" style="background:#e0e7ff;color:#4338ca;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <div class="ic-content" style="min-width:0;flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div class="ic-sub" style="color:#4338ca;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(subName)}">${escHtml(subName.toUpperCase())} AVG</div>
                  <button type="button" onclick="event.stopPropagation();setStudentProgressSubject('all');" style="background:#e0e7ff;border:none;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;color:#3730a3;cursor:pointer;transition:0.2s;" onmouseover="this.style.background='#c7d2fe'" onmouseout="this.style.background='#e0e7ff'" title="Return to all subjects">✕ All</button>
                </div>
                <div class="ic-num" style="color:#3730a3;">${subAvg !== null ? subAvg + '%' : '—'}</div>
                <p>${subCompleted}/${subTotal} completed</p>
              </div>
            </div>`;
          } else {
            return `
            <div class="stat-filter-card ${studentProgressTab === 'pending' ? 'active' : ''}" onclick="setStudentProgressTab('${pendingCount > 0 ? 'pending' : 'all'}')">
              <div class="ic-icon" style="background:#fef3c7;color:#d97706;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div class="ic-content">
                <div class="ic-sub">Pending Quizzes</div>
                <div class="ic-num" style="color:#d97706;">${pendingCount}</div>
                <p>${pendingCount > 0 ? `${pendingCount} awaiting completion` : 'All assigned quizzes done! 🎉'}</p>
              </div>
            </div>`;
          }
        })()}
      </div>

      <!-- FILTER & SEARCH TOOLBAR -->
      <div class="progress-toolbar">
        <div class="progress-tabs-wrap">
          <button class="progress-tab-btn ${studentProgressTab === 'all' ? 'active' : ''}" onclick="setStudentProgressTab('all')">
            All <span class="tab-badge">${quizList.length}</span>
          </button>
          <button class="progress-tab-btn ${studentProgressTab === 'completed' ? 'active' : ''}" onclick="setStudentProgressTab('completed')">
            Completed <span class="tab-badge">${completedCount}</span>
          </button>
          <button class="progress-tab-btn ${studentProgressTab === 'pending' ? 'active' : ''}" onclick="setStudentProgressTab('pending')">
            Pending <span class="tab-badge" style="background:#fef3c7;color:#b45309;">${pendingCount}</span>
          </button>
          <button class="progress-tab-btn ${studentProgressTab === 'overdue' ? 'active' : ''}" onclick="setStudentProgressTab('overdue')">
            Expired <span class="tab-badge" style="background:#fee2e2;color:#b91c1c;">${overdueCount}</span>
          </button>
        </div>

        <div class="progress-controls-wrap">
          <div class="progress-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;color:var(--text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="studentProgressSearchInput" placeholder="Search assessments..." value="${escHtml(studentProgressSearch)}" oninput="handleStudentProgressSearch(this.value)">
            ${studentProgressSearch ? `<button class="search-clear-btn" onclick="clearStudentProgressSearch()" title="Clear search">✕</button>` : ''}
          </div>

          <select class="progress-select-pill" onchange="setStudentProgressSubject(this.value)">
            <option value="all" ${studentProgressSubject === 'all' ? 'selected' : ''}>📚 All Subjects (${uniqueSubjects.length})</option>
            ${uniqueSubjects.map(s => `
              <option value="${escHtml(s)}" ${studentProgressSubject.toLowerCase().trim() === s.toLowerCase().trim() ? 'selected' : ''}>${escHtml(s)}</option>
            `).join('')}
          </select>

          <select class="progress-select-pill" onchange="setStudentProgressSort(this.value)">
            <option value="default" ${studentProgressSort === 'default' ? 'selected' : ''}>Sort: Default</option>
            <option value="deadline_asc" ${studentProgressSort === 'deadline_asc' ? 'selected' : ''}>⏰ Deadline (Soonest)</option>
            <option value="deadline_desc" ${studentProgressSort === 'deadline_desc' ? 'selected' : ''}>⏰ Deadline (Latest)</option>
            <option value="score_desc" ${studentProgressSort === 'score_desc' ? 'selected' : ''}>🏆 Score (Highest)</option>
            <option value="score_asc" ${studentProgressSort === 'score_asc' ? 'selected' : ''}>📉 Score (Lowest)</option>
            <option value="title_asc" ${studentProgressSort === 'title_asc' ? 'selected' : ''}>🔤 Title (A–Z)</option>
          </select>

          ${hasActiveFilters ? `
            <button class="progress-reset-btn" onclick="resetStudentProgressFilters()" title="Reset all filters">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>
          ` : ''}
        </div>
      </div>

      <!-- QUIZ PROGRESS TABLE -->
      <div class="score-table student-progress-table">
        <table aria-label="Quiz assessment progress">
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
            ${filteredRows.length ? filteredRows.map(r => {
              const q = r.quiz;
              const hasTaken = r.hasTaken;
              const isPastDeadline = r.isPastDeadline;
              const scoreClass = r.pct !== null ? (r.pct >= 75 ? 'good' : 'low') : '';
              const subj = q.subject || 'General';
              const isCurrentSubj = studentProgressSubject.toLowerCase().trim() === subj.toLowerCase().trim();

              let actionHtml = '';
              if (hasTaken) {
                actionHtml = `
                  <button class="table-act-btn review" onclick="openReviewAttempt('${q.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Review
                  </button>`;
              } else if (isPastDeadline) {
                actionHtml = `
                  <button class="table-act-btn closed" disabled style="opacity:0.6;cursor:not-allowed;" title="Deadline has passed. This assessment is closed for submissions.">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;margin-right:2px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Closed
                  </button>`;
              } else {
                const clickHandler = (q.type === 'interactive' || q.quiz_type === 'interactive')
                  ? `openInteractiveQuiz('${q.id}')`
                  : `openTakeQuizModal('${q.id}')`;
                const label = (q.type === 'interactive' || q.quiz_type === 'interactive') ? 'Play Quiz' : 'Take Quiz';
                actionHtml = `
                  <button class="table-act-btn take" onclick="${clickHandler}">
                    <svg viewBox="0 0 24 24"><polygon points="6 4 18 12 6 20 6 4"/></svg>
                    ${label}
                  </button>`;
              }

              return `
              <tr data-quiz-title="${escHtml(q.title || 'Quiz')}" data-quiz-subject="${escHtml(subj)}">
                <td data-label="Subject"><div class="progress-cell-value">
                  <button type="button" class="progress-subject-btn ${isCurrentSubj ? 'active' : ''}" onclick="setStudentProgressSubject('${escHtml(subj)}')" title="Click to filter by ${escHtml(subj)} and view subject average">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;flex-shrink:0;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    <strong>${escHtml(subj)}</strong>
                  </button>
                </div></td>
                <td data-label="Assessment"><div class="progress-cell-value">
                  ${escHtml(q.title || 'Quiz')}
                  ${(q.type === 'interactive' || q.quiz_type === 'interactive') ? '<span class="status-pill" style="margin-left:6px;font-size:10px;padding:2px 6px;background:#ede9fe;color:#7c3aed;font-weight:700;">🎮 Interactive</span>' : ''}
                </div></td>
                <td style="color:var(--text-secondary);font-size:12.5px;white-space:nowrap;" data-label="Deadline"><div class="progress-cell-value">
                  <span style="display:inline-flex;align-items:center;gap:6px;${(!hasTaken && isPastDeadline) ? 'color:#dc2626;font-weight:600;' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;color:${(!hasTaken && isPastDeadline) ? '#dc2626' : 'var(--text-muted)'};flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${escHtml(r.deadlineDate)}
                  </span>
                </div></td>
                <td data-label="Total Items"><div class="progress-cell-value">${r.totalItems ? `${r.totalItems} item${r.totalItems === 1 ? '' : 's'}` : '—'}</div></td>
                <td data-label="Status"><div class="progress-cell-value">
                  <span class="status-pill ${r.statusClass}">${r.statusText}</span>
                </div></td>
                <td class="score-val ${scoreClass}" data-label="Score"><div class="progress-cell-value">
                  ${hasTaken
                    ? `<strong>${r.score} / ${r.totalItems}</strong> <span style="font-size:11px;font-weight:700;margin-left:4px;">(${r.pct !== null ? r.pct + '%' : ''})</span>`
                    : '<span style="color:var(--text-muted);">—</span>'}
                </div></td>
                <td data-label="Action"><div class="progress-cell-value">
                  ${actionHtml}
                </div></td>
              </tr>`;
            }).join('')
            : `<tr id="studentProgressEmptyRow"><td colspan="7" style="text-align:center;color:var(--text-muted);padding:36px 16px;">
                <div style="font-size:28px;margin-bottom:6px;">📋</div>
                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">No assessments match your filters</div>
                <p style="font-size:12.5px;color:#64748b;margin:0 0 12px;">Try switching tabs, clearing the search query, or resetting filters.</p>
                <button type="button" class="progress-reset-btn" onclick="resetStudentProgressFilters()" style="margin:0 auto;display:inline-flex;">
                  Reset Filters
                </button>
              </td></tr>`}
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

      const allAnc = typeof getStoredAnnouncements === 'function' ? getStoredAnnouncements() : [];
      const unreadCount = Math.max(0, allAnc.filter(a => !a.isArchived && a.status !== 'draft' && !a.isDraft).length - (typeof getReadAnnouncementIds === 'function' ? getReadAnnouncementIds().size : 0));

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
        <div class="stat-filter-card" onclick="renderPage('classrec')" style="cursor:pointer;">
          <div class="ic-icon">${iconUsers()}</div>
          <div class="ic-content">
            <div class="ic-sub">My Classes</div>
            <div class="ic-num">${myStrands.length || 3}</div>
            <p>${myStrands.length ? escHtml(myStrands.join(', ')) : 'ICT, CS, TVL — Grade 11 & 12'}</p>
          </div>
        </div>
        <div class="stat-filter-card" onclick="renderPage('materials')" style="cursor:pointer;">
          <div class="ic-icon gold">${iconFolder()}</div>
          <div class="ic-content">
            <div class="ic-sub">Materials Uploaded</div>
            <div class="ic-num gold">${myMaterials.length || 12}</div>
            <p>${myPendingMaterials || 0} pending admin approval</p>
          </div>
        </div>
        <div class="stat-filter-card" onclick="renderPage('quiz')" style="cursor:pointer;">
          <div class="ic-icon green">${iconQuiz()}</div>
          <div class="ic-content">
            <div class="ic-sub">Active Quizzes</div>
            <div class="ic-num green">${myActiveQuizzes.length}</div>
            <p>${myQuizzes.length} total across all handled subjects</p>
          </div>
        </div>
        <div class="stat-filter-card" onclick="renderPage('announcements')" style="cursor:pointer;border-color:${unreadCount > 0 ? '#fca5a5' : '#e2e8f0'};">
          <div class="ic-icon" style="background:#fee2e2;color:#dc2626;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg></div>
          <div class="ic-content">
            <div class="ic-sub">Unread News</div>
            <div class="ic-num" style="color:#dc2626;">${unreadCount}</div>
            <p>School announcements & events</p>
          </div>
        </div>
      </div>
      <div class="teacher-dashboard-split">
      <div class="teacher-dashboard-main">
      <div id="coursesWidgetContainer">
        ${typeof renderCoursesWidgetHTML === 'function' ? renderCoursesWidgetHTML() : ''}
      </div>
      <div class="dashboard-assessments-panel">
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
                <button class="foot-btn-secondary" style="padding:6px 12px;font-size:12px;border-color:#f59e0b;color:#d97706;background:#fef3c7;font-weight:700;" onclick="openClassLeaderboardModalById('${q.id}')" title="View Student Ranking & Completion Times">🏆 Leaderboard</button>
              </div>
            </div>`;
          }).join('')
            : `<p style="padding:20px;color:var(--text-muted);font-size:13px;">No active quizzes right now. Create a new quiz in Quiz Manager to assign to your students.</p>`}
        </div>
      </div>
      </div>
      <aside class="teacher-dashboard-side">${renderDashboardQuickLinks('teacher')}</aside>
      </div>`;
    }

    case 'materials': return `
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
      if (typeof quizManagerFilterType !== 'undefined' && quizManagerFilterType) {
        if (quizManagerFilterType === 'interactive') {
          filtered = filtered.filter(q => q.type === 'interactive' || q.quiz_type === 'interactive');
        } else if (quizManagerFilterType === 'standard') {
          filtered = filtered.filter(q => q.type !== 'interactive' && q.quiz_type !== 'interactive');
        }
      }
      if (typeof quizManagerFilterSubject !== 'undefined' && quizManagerFilterSubject) {
        filtered = filtered.filter(q => String(q.subject || '').toLowerCase() === quizManagerFilterSubject.toLowerCase());
      }
      if (typeof quizManagerFilterReview !== 'undefined' && quizManagerFilterReview) {
        if (quizManagerFilterReview === 'visible') {
          filtered = filtered.filter(q => q.allowReviewAnswers !== false);
        } else if (quizManagerFilterReview === 'hidden') {
          filtered = filtered.filter(q => q.allowReviewAnswers === false);
        }
      }

      return `
      <div class="teacher-quizzes-container" style="width:100%;display:flex;flex-direction:column;gap:12px;">
        <div class="section-hdr" style="margin-bottom:0;">
          <div>
            <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 2px 0;">Quiz Manager</h2>
            <span style="font-size:12px;color:var(--text-muted);">Create, organize, test, and distribute assessments & interactive games</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="add-btn" style="background:var(--blue-light);color:var(--blue);padding:6px 12px;font-size:12px;" onclick="loadQuizzesFromDB()">${iconRefresh()} Refresh</button>
            <button class="add-btn" style="padding:6px 12px;font-size:12px;" onclick="openQuizModal()">${iconPlus()} Create Quiz</button>
          </div>
        </div>

        <!-- METRIC CARDS -->
        <div class="card-grid" style="gap:12px;margin-bottom:0;">
          <div class="stat-filter-card ${!quizManagerFilterStatus && !quizManagerFilterType ? 'active' : ''}" onclick="setQuizManagerFilterStatus(''); setQuizManagerFilterType('');">
            <div class="ic-icon">${iconQuiz()}</div>
            <div class="ic-content">
              <div class="ic-sub">Total Quizzes</div>
              <div class="ic-num">${totalCount}</div>
              <p>Assigned to SHS students</p>
            </div>
          </div>
          <div class="stat-filter-card ${quizManagerFilterStatus === 'active' && !quizManagerFilterType ? 'active' : ''}" onclick="setQuizManagerFilterStatus('active'); setQuizManagerFilterType('');">
            <div class="ic-icon green">${iconCheck()}</div>
            <div class="ic-content">
              <div class="ic-sub">Active / Ongoing</div>
              <div class="ic-num green">${activeCount}</div>
              <p>Accepting student submissions</p>
            </div>
          </div>
          <div class="stat-filter-card ${quizManagerFilterStatus === 'pending' && !quizManagerFilterType ? 'active' : ''}" onclick="setQuizManagerFilterStatus('pending'); setQuizManagerFilterType('');">
            <div class="ic-icon gold">${iconClock()}</div>
            <div class="ic-content">
              <div class="ic-sub">Pending Approval</div>
              <div class="ic-num gold">${pendingCount}</div>
              <p>Awaiting Admin content review</p>
            </div>
          </div>
          <div class="stat-filter-card ${quizManagerFilterType === 'interactive' ? 'active' : ''}" onclick="setQuizManagerFilterStatus(''); setQuizManagerFilterType('interactive');">
            <div class="ic-icon" style="background:#e0f2fe;color:#0284c7;">${iconGamepad()}</div>
            <div class="ic-content">
              <div class="ic-sub">Interactive Games</div>
              <div class="ic-num" style="color:#0284c7;">${interactiveCount}</div>
              <p>Gamified student quizzes</p>
            </div>
          </div>
        </div>

        <!-- SEARCH & FILTER TOOLBAR -->
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;background:#f8fafc;padding:10px 14px;border-radius:12px;border:1px solid #e2e8f0;">
          <div style="display:flex;gap:8px;flex:1;min-width:min(100%,220px);max-width:360px;align-items:center;">
            <input type="text" placeholder="Search quiz title, subject, or lesson..." style="width:100%;border:1.5px solid var(--blue-light);border-radius:8px;padding:7px 12px;font-size:12.5px;background:#fff;" value="${escHtml(typeof quizManagerSearchQuery !== 'undefined' ? quizManagerSearchQuery : '')}" oninput="setQuizManagerSearchQuery(this.value)"/>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <select class="user-filter-select" style="font-size:12px;padding:6px 10px;" onchange="setQuizManagerFilterStrand(this.value)">
              <option value="">All Strands</option>
              ${STRANDS.map(s => `<option value="${s}" ${typeof quizManagerFilterStrand !== 'undefined' && quizManagerFilterStrand === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <select class="user-filter-select" style="font-size:12px;padding:6px 10px;" onchange="setQuizManagerFilterStatus(this.value)">
              <option value="">All Statuses</option>
              <option value="active" ${typeof quizManagerFilterStatus !== 'undefined' && quizManagerFilterStatus === 'active' ? 'selected' : ''}>Active</option>
              <option value="pending" ${typeof quizManagerFilterStatus !== 'undefined' && quizManagerFilterStatus === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="closed" ${typeof quizManagerFilterStatus !== 'undefined' && quizManagerFilterStatus === 'closed' ? 'selected' : ''}>Closed</option>
            </select>
            <select class="user-filter-select" style="font-size:12px;padding:6px 10px;" onchange="setQuizManagerFilterReview(this.value)">
              <option value="">All Review Modes</option>
              <option value="visible" ${typeof quizManagerFilterReview !== 'undefined' && quizManagerFilterReview === 'visible' ? 'selected' : ''}>👁️ Answers Visible (Checked)</option>
              <option value="hidden" ${typeof quizManagerFilterReview !== 'undefined' && quizManagerFilterReview === 'hidden' ? 'selected' : ''}>🔒 Answers Hidden (Unchecked)</option>
            </select>
            ${availableSubjects.length ? `
            <select class="user-filter-select" style="font-size:12px;padding:6px 10px;" onchange="setQuizManagerFilterSubject(this.value)">
              <option value="">All Subjects</option>
              ${availableSubjects.map(subj => `<option value="${escHtml(subj)}" ${typeof quizManagerFilterSubject !== 'undefined' && quizManagerFilterSubject === subj ? 'selected' : ''}>${escHtml(subj)}</option>`).join('')}
            </select>` : ''}
          </div>
        </div>

        <!-- QUIZ LIST -->
        <div class="quiz-list" style="display:flex;flex-direction:column;gap:8px;">
        ${filtered.length ? filtered.map(q => {
          const isInter = q.type === 'interactive' || q.quiz_type === 'interactive';
          const itemsCount = (q.questions || []).length;
          const statusClass = q.isDemo ? 'demo' : q.status === 'active' ? 'ongoing' : q.status === 'closed' ? 'done' : 'pending';
          const statusLabel = q.isDemo ? 'Demo' : (q.status || 'Active').charAt(0).toUpperCase() + (q.status || 'Active').slice(1);
          const timeText = isInter
            ? (q.timerPerQuestion ? `⏱️ ${q.timerPerQuestion}s/item` : 'Untimed')
            : (q.timeLimitMinutes ? `⏱️ ${q.timeLimitMinutes} mins` : 'Untimed');
          const dueText = q.dueDate ? `📅 Due: ${new Date(q.dueDate).toLocaleDateString()}` : '📅 No Expiration';
          const isReviewAllowed = q.allowReviewAnswers !== false && q.allow_review_answers !== false;

          return `
          <div class="quiz-row" style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;gap:16px;flex-wrap:wrap;">
            <div class="qz-info" style="min-width:min(100%,240px);flex:1;">
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

            <!-- ACTION BUTTONS & REVIEW CHECKBOX -->
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <!-- REVIEW ANSWERS CHECKBOX -->
              <label style="display:inline-flex;align-items:center;gap:7px;cursor:pointer;background:${isReviewAllowed ? '#eff6ff' : '#f8fafc'};border:1.5px solid ${isReviewAllowed ? '#bfdbfe' : '#cbd5e1'};padding:6px 12px;border-radius:10px;font-size:12px;font-weight:700;color:${isReviewAllowed ? '#1d4ed8' : '#64748b'};transition:all 0.15s ease;" title="Check to allow students to see correct answers when reviewing; uncheck to hide answers">
                <input type="checkbox" ${isReviewAllowed ? 'checked' : ''} onchange="toggleQuizReviewAnswers('${q.id}', this.checked)" style="width:16px;height:16px;accent-color:#2563eb;cursor:pointer;">
                <span>${isReviewAllowed ? '👁️ Show Answers on Review' : '🔒 Answers Hidden'}</span>
              </label>

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
              <button class="table-act-btn" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a;font-weight:700;" onclick="openClassLeaderboardModalById('${q.id}')" title="View Student Ranking & Completion Times">
                🏆 Leaderboard
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
        </div>
      </div>`;
    }

    case 'analysis': {
      let myQuizzesForAnalysis = customQuizzes.slice();
      if (ROLE === 'teacher') {
        const myQuizzes = customQuizzes.filter(q => {
          if (!q) return false;
          if (q.isDemo) return true;
          const qCreator = String(q.createdBy || q.created_by || '').toLowerCase().trim();
          const pId = String(CURRENT_PROFILE?.id || '').toLowerCase().trim();
          const pDbId = String(CURRENT_PROFILE?.dbId || '').toLowerCase().trim();
          const pSchoolId = String(CURRENT_PROFILE?.school_id || '').toLowerCase().trim();
          const pName = String(CURRENT_PROFILE?.full_name || CURRENT_PROFILE?.name || '').toLowerCase().trim();

          if (qCreator && (qCreator === pId || qCreator === pDbId || qCreator === pSchoolId || qCreator === pName || pName.includes(qCreator))) return true;

          if (CURRENT_PROFILE?.subjects && q.subject) {
            const subs = CURRENT_PROFILE.subjects.split(',').map(sub => sub.trim().toLowerCase());
            if (subs.some(sub => sub && (q.subject || '').toLowerCase().includes(sub))) return true;
          }
          if (CURRENT_PROFILE?.strand && q.strand) {
            const sts = CURRENT_PROFILE.strand.split(',').map(st => st.trim().toLowerCase());
            if (sts.some(st => st && (q.strand || '').toLowerCase().includes(st))) return true;
          }
          return !qCreator;
        });
        myQuizzesForAnalysis = myQuizzes.length ? myQuizzes : customQuizzes;
      }
      const displayQuizzes = myQuizzesForAnalysis.length ? myQuizzesForAnalysis : customQuizzes;

      if (!displayQuizzes.length) {
        return `
        <div class="analysis-header-card">
          <div>
            <h2>Item Analysis Report</h2>
            <div class="analysis-subtitle">Question-level psychometrics and difficulty metrics</div>
          </div>
          <button class="add-btn" onclick="openQuizModal()">${iconPlus()} Create Quiz</button>
        </div>
        <div class="announcement-card">
          <h3>No Quizzes Found</h3>
          <p style="color:var(--text-muted);font-size:13px;margin-top:6px;">You haven't created any quizzes yet — create one in Quiz Manager first to view student performance and question difficulty metrics.</p>
        </div>`;
      }

      if (!analysisSelectedQuizId || !displayQuizzes.some(q => String(q.id) === String(analysisSelectedQuizId))) {
        // Automatically default to teacher's newly created / active quiz first
        const teacherActiveQuiz = displayQuizzes.find(q => !q.isDemo && q.createdBy && (
          q.createdBy === CURRENT_PROFILE?.id ||
          q.createdBy === CURRENT_PROFILE?.dbId ||
          q.createdBy === CURRENT_PROFILE?.school_id
        ));
        analysisSelectedQuizId = (teacherActiveQuiz || displayQuizzes[0]).id;
      }
      const selectedQuiz = displayQuizzes.find(q => String(q.id) === String(analysisSelectedQuizId)) || displayQuizzes[0];
      if (!selectedQuiz) {
        return `<div class="analysis-header-card"><h2>Item Analysis Report</h2></div><p style="padding:20px;">No quiz selected.</p>`;
      }

      // Fetch attempts if not cached yet
      if (!(analysisSelectedQuizId in analysisAttemptsCache)) {
        loadAttemptsForAnalysis(analysisSelectedQuizId);
      }

      const allQuizAttempts = (typeof getAttemptsForAnalysis === 'function')
        ? getAttemptsForAnalysis(analysisSelectedQuizId, analysisSectionFilter, '', 'all')
        : (analysisAttemptsCache[analysisSelectedQuizId] || []);

      const studentFilteredAttempts = (typeof getAttemptsForAnalysis === 'function')
        ? getAttemptsForAnalysis(analysisSelectedQuizId, analysisSectionFilter, analysisStudentSearchQuery, analysisScoreFilter)
        : allQuizAttempts;

      const rows = buildAnalysisRows(selectedQuiz, allQuizAttempts);
      const attemptCount = allQuizAttempts.length;
      const validScores = allQuizAttempts.map(a => a.total_items ? (a.score / a.total_items) * 100 : (a.score_percentage || 0));
      const avgScore = validScores.length
        ? Math.round(validScores.reduce((sum, v) => sum + v, 0) / validScores.length)
        : null;
      const highestScore = validScores.length ? Math.round(Math.max(...validScores)) : null;
      const lowestScore = validScores.length ? Math.round(Math.min(...validScores)) : null;
      const passingCount = validScores.filter(s => s >= 75).length;
      const passRate = validScores.length ? Math.round((passingCount / validScores.length) * 100) : null;

      let displayRows = rows;
      if (analysisQuestionSearchQuery) {
        displayRows = rows.filter(r => (r.label || '').toLowerCase().includes(analysisQuestionSearchQuery) || (r.correctAnswer || '').toLowerCase().includes(analysisQuestionSearchQuery));
      }

      return `
      <!-- HEADER CARD -->
      <div class="analysis-header-card">
        <div>
          <h2>Item Analysis Report</h2>
          <div class="analysis-subtitle">Question-by-question psychometric discrimination, student accuracy, and distractor evaluation</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <div class="analysis-tab-bar">
            <button type="button" class="analysis-tab-btn ${analysisActiveTab === 'questions' ? 'active' : ''}" onclick="setAnalysisTab('questions')">
              📑 Question Psychometrics (${rows.length})
            </button>
            <button type="button" class="analysis-tab-btn ${analysisActiveTab === 'students' ? 'active' : ''}" onclick="setAnalysisTab('students')">
              👨‍🎓 Student Submissions (${allQuizAttempts.length})
            </button>
          </div>

          <select class="analysis-select" onchange="setAnalysisSectionFilter(this.value)" title="Filter by Section">
            <option value="">All Handled Sections</option>
            ${SECTIONS.map(sec => `<option value="${sec}" ${analysisSectionFilter === sec ? 'selected' : ''}>${sec}</option>`).join('')}
          </select>

          <select class="analysis-select" onchange="setAnalysisQuiz(this.value)" title="Select Quiz Assessment">
            ${displayQuizzes.map(q => `<option value="${q.id}" ${String(q.id) === String(analysisSelectedQuizId) ? 'selected' : ''}>${escHtml(q.title)}</option>`).join('')}
          </select>

          <button type="button" class="analysis-refresh-btn" onclick="loadAttemptsForAnalysis('${selectedQuiz.id}')">
            ${iconRefresh()} Refresh
          </button>
        </div>
      </div>

      <!-- PERFORMANCE STAT CARDS -->
      <div class="card-grid" style="margin-bottom:20px;">
        <div class="info-card horizontal-card">
          <div class="ic-icon">${iconUsers()}</div>
          <div class="ic-content">
            <div class="ic-sub">Submissions Recorded</div>
            <div class="ic-num">${attemptCount}</div>
            <p>${analysisSectionFilter ? `Filtered for ${escHtml(analysisSectionFilter)}` : 'Across all class sections'}</p>
          </div>
        </div>
        <div class="info-card horizontal-card">
          <div class="ic-icon green">${iconProgress()}</div>
          <div class="ic-content">
            <div class="ic-sub">Class Average</div>
            <div class="ic-num green">${avgScore !== null ? avgScore + '%' : '—'}</div>
            <p>${passRate !== null ? `${passRate}% passing rate (≥ 75%)` : 'No attempts recorded'}</p>
          </div>
        </div>
        <div class="info-card horizontal-card">
          <div class="ic-icon gold">${iconChart()}</div>
          <div class="ic-content">
            <div class="ic-sub">Score Range</div>
            <div class="ic-num gold compact">${highestScore !== null ? `${highestScore}% / ${lowestScore}%` : '—'}</div>
            <p>Highest vs lowest student score</p>
          </div>
        </div>
        <div class="info-card horizontal-card">
          <div class="ic-icon">${iconQuiz()}</div>
          <div class="ic-content">
            <div class="ic-sub">Total Questions</div>
            <div class="ic-num">${rows.length}</div>
            <p>${escHtml(selectedQuiz.subject || 'General')} · ${escHtml(selectedQuiz.strand || 'STEM')}</p>
          </div>
        </div>
      </div>

      <!-- QUIZ OVERVIEW STRIP -->
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 18px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;background:#f1f5f9;padding:3px 8px;border-radius:6px;">Current Quiz</span>
          <strong style="color:#0f172a;font-size:15px;">${escHtml(selectedQuiz.title)}</strong>
          <span style="color:#94a3b8;">·</span>
          <span style="font-size:13px;color:#475569;">Subject: <strong>${escHtml(selectedQuiz.subject || 'General')}</strong></span>
          <span style="color:#94a3b8;">·</span>
          <span style="font-size:13px;color:#475569;">Strand: <strong>${escHtml(selectedQuiz.strand || 'STEM')}</strong></span>
        </div>
        <span class="status-pill done" style="font-weight:700;text-transform:uppercase;font-size:11px;">Active</span>
      </div>

      ${analysisActiveTab === 'questions' ? `
        <!-- QUESTION PSYCHOMETRICS VIEW -->
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:14px 18px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div style="font-weight:700;font-size:14px;color:#0f172a;">
            Question Psychometrics Table <span style="font-size:12px;color:var(--text-muted);font-weight:500;">(${displayRows.length} items shown)</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text"
              id="analysisQuestionSearchInput"
              class="analysis-search-input"
              style="width:260px;"
              placeholder="🔍 Filter questions by keyword..."
              value="${escHtml(analysisQuestionSearchQuery)}"
              oninput="setAnalysisQuestionSearch(this.value)"
            />
          </div>
        </div>

        <div class="score-table scholaria-custom-scroll" style="max-height:520px;overflow:auto;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <table style="width:100%;border-collapse:collapse;min-width:760px;">
            <thead>
              <tr style="position:sticky;top:0;z-index:3;background:var(--blue);color:#ffffff;">
                <th style="width:40px;">#</th>
                <th>Question &amp; Type</th>
                <th style="width:90px;text-align:center;">Correct</th>
                <th style="width:90px;text-align:center;">Incorrect</th>
                <th style="width:170px;">Accuracy Rate</th>
                <th style="width:110px;text-align:center;">Difficulty</th>
                <th>Key / Answer</th>
                <th style="width:140px;text-align:center;">Student List</th>
              </tr>
            </thead>
            <tbody>
              ${displayRows.length ? displayRows.map((r, i) => `
                <tr>
                  <td style="font-weight:700;color:var(--blue);">${i + 1}</td>
                  <td>
                    <div style="font-weight:600;color:#0f172a;margin-bottom:2px;line-height:1.4;">${escHtml(r.label)}</div>
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
                  <td style="text-align:center;">
                    <button type="button" class="table-act-btn take" onclick="viewQuestionStudentsBreakdown('${r.itemId}')" title="Inspect students who got this item right vs wrong">
                      Roster (${r.correct + r.incorrect})
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </td>
                </tr>`).join('')
                : `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px;">No question items match the filter criteria.</td></tr>`}
            </tbody>
          </table>
        </div>
      ` : `
        <!-- STUDENT SUBMISSIONS & BREAKDOWN VIEW -->
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:14px 18px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div style="font-weight:700;font-size:14px;color:#0f172a;">
            Student Performance Roster <span style="font-size:12px;color:var(--text-muted);font-weight:500;">(${studentFilteredAttempts.length} of ${allQuizAttempts.length} submissions)</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <input type="text"
              id="analysisStudentSearchInput"
              class="analysis-search-input"
              style="width:260px;"
              placeholder="🔍 Find student by name or ID..."
              value="${escHtml(analysisStudentSearchQuery)}"
              oninput="setAnalysisStudentSearch(this.value)"
            />

            <select class="analysis-select" onchange="setAnalysisScoreFilter(this.value)" style="width:180px;">
              <option value="all" ${analysisScoreFilter === 'all' ? 'selected' : ''}>All Scores</option>
              <option value="passed" ${analysisScoreFilter === 'passed' ? 'selected' : ''}>Passing Only (≥ 75%)</option>
              <option value="failed" ${analysisScoreFilter === 'failed' ? 'selected' : ''}>Needs Improvement (&lt; 75%)</option>
            </select>
          </div>
        </div>

        <div class="score-table scholaria-custom-scroll" style="max-height:520px;overflow:auto;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <table style="width:100%;border-collapse:collapse;min-width:760px;">
            <thead>
              <tr style="position:sticky;top:0;z-index:3;background:var(--blue);color:#ffffff;">
                <th style="width:40px;">#</th>
                <th>Student Name &amp; School ID</th>
                <th style="width:110px;">Section</th>
                <th style="width:90px;">Strand</th>
                <th style="width:90px;text-align:center;">Score</th>
                <th style="width:100px;text-align:center;">Percentage</th>
                <th style="width:130px;text-align:center;">Status</th>
                <th style="width:150px;">Submitted At</th>
                <th style="width:140px;text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${studentFilteredAttempts.length ? studentFilteredAttempts.map((a, i) => {
                const pct = a.score_percentage != null ? Math.min(100, Math.max(0, a.score_percentage)) : 0;
                const isPassed = pct >= 75;
                const subDate = a.submitted_at
                  ? new Date(a.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Recent';
                return `
                  <tr>
                    <td style="font-weight:700;color:var(--blue);">${i + 1}</td>
                    <td>
                      <div style="font-weight:700;color:#0f172a;">${escHtml(a.student_name)}</div>
                      <span style="font-size:11px;color:var(--text-muted);font-weight:600;">ID: ${escHtml(a.student_school_id || a.student_id || '—')}</span>
                    </td>
                    <td>
                      <span class="user-role-badge student" style="font-size:12px;padding:3px 8px;">${escHtml(a.section)}</span>
                    </td>
                    <td style="font-weight:600;font-size:12px;color:#475569;">${escHtml(a.strand)}</td>
                    <td style="text-align:center;font-weight:800;color:#0f172a;">
                      ${a.score != null ? a.score : '—'} / ${a.total_items || (a.answers?.length || '—')}
                    </td>
                    <td style="text-align:center;font-weight:800;color:${isPassed ? '#059669' : '#dc2626'};">
                      ${pct}%
                    </td>
                    <td style="text-align:center;">
                      <span class="status-pill ${isPassed ? 'done' : 'low'}" style="font-weight:700;">
                        ${isPassed ? 'PASSED' : 'NEEDS IMP.'}
                      </span>
                    </td>
                    <td style="font-size:12px;color:var(--text-secondary);font-weight:600;">${escHtml(subDate)}</td>
                    <td style="text-align:center;">
                      <button type="button" class="table-act-btn take" onclick="inspectStudentAttempt('${escHtml(a.id || a.student_id)}')" title="Inspect individual question answers and items">
                        Inspect Answers
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:30px;">No student submissions match the search and filter criteria.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      `}
      `;
    }

    case 'classrec': {
      if (!classRecAttemptsCache.length) loadClassRecAttempts(true);
      if (!registeredUsers.length && typeof loadUsersFromDB === 'function') loadUsersFromDB();
      const teacherHandledSecs = (typeof ROLE !== 'undefined' && ROLE === 'teacher')
        ? getTeacherHandledSections(CURRENT_PROFILE)
        : (typeof SECTIONS !== 'undefined' ? SECTIONS : []);
      const handledSecs = (ROLE === 'teacher') ? teacherHandledSecs : SECTIONS;

      const quizzes = getClassRecordQuizzes();
      const filteredEntries = buildRealClassRecordEntries();
      const sectionSummaries = buildSectionSummaryEntries();
      let allHandledStudents = registeredUsers.filter(u => u.role === 'student' && u.isActive !== false && isStudentHandledByTeacher(u, CURRENT_PROFILE));

      if (!allHandledStudents.length && filteredEntries.length) {
        allHandledStudents = filteredEntries.map(fe => ({ name: fe.name, section: fe.section, strand: fe.strand, dbId: fe.key, id: fe.schoolId }));
      }

      const totalStudentsCount = allHandledStudents.length || filteredEntries.length || sectionSummaries.reduce((sum, s) => sum + (s.studentsCount || 0), 0);
      const quizzesCount = quizzes.length;
      const validStudentAvgs = filteredEntries.map(e => (e.avg !== null && !isNaN(e.avg)) ? Math.min(100, Math.max(0, Number(e.avg))) : null).filter(a => a !== null);
      const overallAvg = validStudentAvgs.length ? Math.min(100, Math.max(0, Number((validStudentAvgs.reduce((a, b) => Number(a) + Number(b), 0) / validStudentAvgs.length).toFixed(2)))) : null;
      const passingStudentsCount = validStudentAvgs.filter(a => a >= 75).length;
      const overallPassingRate = validStudentAvgs.length ? Math.min(100, Math.max(0, Math.round((passingStudentsCount / validStudentAvgs.length) * 100))) : null;

      // If teacher has no assigned sections at all, show clear guidance
      if (ROLE === 'teacher' && handledSecs.length === 0) {
        return `
          <div class="section-hdr">
            <div>
              <h2>Class Record Portal</h2>
              <span style="font-size:12px;color:var(--text-muted);">Overview of handled class sections and student grade performance</span>
            </div>
          </div>
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:40px 24px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.03);margin-top:20px;">
            <div style="width:52px;height:52px;border-radius:50%;background:#f1f5f9;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;color:#64748b;">
              ${typeof iconFolder === 'function' ? iconFolder() : '📁'}
            </div>
            <h3 style="font-size:17px;color:#0f172a;margin-bottom:6px;font-weight:700;">No Handled Sections Assigned</h3>
            <p style="font-size:13.5px;color:#64748b;max-width:500px;margin:0 auto 16px;line-height:1.5;">
              You do not have any assigned class sections or advisory appointments yet. In Scholaria, teachers can only view records and grades for the sections they are assigned to.
            </p>
            <span style="font-size:12px;color:#94a3b8;">Please contact a School Administrator to assign your class sections in User Management.</span>
          </div>
        `;
      }

      // MODE 1: MAIN CLASS RECORD PAGE (SECTIONS ONLY)
      if (!classRecExpandedSection) {
        const targetPrintSec = classRecSectionFilter || (handledSecs[0] || 'Section B');
        return `
        <div class="section-hdr">
          <div>
            <h2>Class Record Portal</h2>
            <span style="font-size:12px;color:var(--text-muted);">Overview of handled class sections and combined section grade performance</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <select class="user-filter-select" onchange="setClassRecSectionFilter(this.value)">
              <option value="">All Handled Sections</option>
              ${handledSecs.map(sec => `<option value="${sec}" ${classRecSectionFilter === sec ? 'selected' : ''}>${sec}</option>`).join('')}
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
          <div class="info-card horizontal-card">
            <div class="ic-icon">${iconUsers()}</div>
            <div class="ic-content">
              <div class="ic-sub">Handled Sections</div>
              <div class="ic-num">${sectionSummaries.length}</div>
              <p>Active class sections</p>
            </div>
          </div>
          <div class="info-card horizontal-card">
            <div class="ic-icon gold">${iconQuiz()}</div>
            <div class="ic-content">
              <div class="ic-sub">Total Students</div>
              <div class="ic-num gold">${totalStudentsCount}</div>
              <p>Enrolled student roster</p>
            </div>
          </div>
          <div class="info-card horizontal-card">
            <div class="ic-icon green">${iconProgress()}</div>
            <div class="ic-content">
              <div class="ic-sub">Combined Class Average</div>
              <div class="ic-num green">${overallAvg !== null ? overallAvg.toFixed(2) + '%' : '—'}</div>
              <p>${overallPassingRate !== null ? overallPassingRate + '% passing rate' : 'No attempt scores recorded yet'}</p>
            </div>
          </div>
        </div>

        <!-- SECTION LEVEL MAIN TABLE -->
        <div class="score-table scholaria-custom-scroll" style="max-height:520px;overflow:auto;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <table style="width:100%;border-collapse:collapse;min-width:760px;">
            <thead>
              <tr style="position:sticky;top:0;z-index:3;background:var(--blue);color:#ffffff;">
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
                      <button type="button" class="table-act-btn take" onclick="event.stopPropagation(); openExpandedSectionView('${escHtml(s.section)}')">
                        Expand Record
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;margin-left:4px;pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      <button type="button" class="table-act-btn review" title="Print Master Sheet" onclick="event.stopPropagation(); openSectionReportModal('${escHtml(s.section)}')">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none;"><polyline points="6 18 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
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
          <button type="button" class="add-btn" style="background:#1e293b;color:#ffffff;padding:8px 16px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:8px;border-radius:10px;cursor:pointer;" onclick="closeExpandedSectionView()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back to All Sections
          </button>
          <div>
            <h2 style="margin:0;font-size:20px;color:#0f172a;">Class Record — ${escHtml(classRecExpandedSection)}</h2>
            <span style="font-size:12px;color:var(--text-muted);">${escHtml(currentSecData.subject)} · ${filteredEntries.length} Enrolled Students</span>
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <div style="display:inline-flex;background:#e2e8f0;padding:3px;border-radius:10px;">
            <button type="button" class="anc-archive-tab ${classRecSubView === 'combined' ? 'active' : ''}" style="padding:6px 12px;font-size:12px;cursor:pointer;" onclick="setClassRecSubView('combined')">📋 Combined Grade</button>
            <button type="button" class="anc-archive-tab ${classRecSubView === 'matrix' ? 'active' : ''}" style="padding:6px 12px;font-size:12px;cursor:pointer;" onclick="setClassRecSubView('matrix')">📑 Quiz Matrix Columns</button>
          </div>

          <button type="button" class="add-btn" style="background:#1e293b;color:#fff;cursor:pointer;" onclick="openSectionReportModal('${escHtml(classRecExpandedSection)}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none;"><polyline points="6 18 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Master Sheet
          </button>

          <button type="button" class="foot-btn-secondary" style="display:inline-flex;align-items:center;gap:6px;padding:7px 12px;font-size:12.5px;cursor:pointer;" onclick="exportSectionGradeCSV('${escHtml(classRecExpandedSection)}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>

          ${(() => {
            const secStudents = allHandledStudents.filter(u => (u.section || '').trim().toLowerCase() === classRecExpandedSection.trim().toLowerCase());
            return `<select class="user-filter-select" onchange="setClassRecStudentFilter(this.value)">
            <option value="">Specify Student: (All)</option>
            ${secStudents.map(u => {
              const uKey = u.dbId || u.id || u.name;
              return `<option value="${uKey}" ${classRecStudentFilter === uKey ? 'selected' : ''}>${escHtml(u.name)} (${escHtml(u.section || 'Unassigned')})</option>`;
            }).join('')}
          </select>`;
          })()}

          <button type="button" class="add-btn" style="cursor:pointer;" onclick="openAddClassRecordModal()">${typeof iconPlus === 'function' ? iconPlus() : ''} Add / Edit Entry</button>
        </div>
      </div>

      <!-- SECTION ROSTER CARDS -->
      <div class="card-grid" style="margin-bottom:20px;">
        <div class="info-card horizontal-card">
          <div class="ic-icon">${iconUsers()}</div>
          <div class="ic-content">
            <div class="ic-sub">Section Roster</div>
            <div class="ic-num">${filteredEntries.length}</div>
            <p>Students in ${escHtml(classRecExpandedSection)}</p>
          </div>
        </div>
        <div class="info-card horizontal-card">
          <div class="ic-icon gold">${iconQuiz()}</div>
          <div class="ic-content">
            <div class="ic-sub">Quizzes Evaluated</div>
            <div class="ic-num gold">${quizzes.length}</div>
            <p>Active quiz assessments</p>
          </div>
        </div>
        <div class="info-card horizontal-card">
          <div class="ic-icon green">${iconProgress()}</div>
          <div class="ic-content">
            <div class="ic-sub">Section Average</div>
            <div class="ic-num green">${currentSecData.classAvg !== null && currentSecData.classAvg !== undefined ? Number(currentSecData.classAvg).toFixed(2) + '%' : (overallAvg !== null ? Number(overallAvg).toFixed(2) + '%' : '—')}</div>
            <p>Combined section performance</p>
          </div>
        </div>
      </div>

      ${classRecSubView === 'combined' ? `
        <!-- COMBINED SINGLE OVERALL PERCENTAGE GRADE VIEW -->
        <div class="score-table scholaria-custom-scroll" style="max-height:520px;overflow:auto;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <table style="width:100%;border-collapse:collapse;min-width:760px;">
            <thead>
              <tr style="position:sticky;top:0;z-index:3;background:var(--blue);color:#ffffff;">
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
                  <td><strong>${e.quizzesTakenCount}</strong> quiz${e.quizzesTakenCount === 1 ? '' : 'zes'} evaluated</td>
                  <td class="score-val ${e.avg !== null && e.avg >= 85 ? 'good' : e.avg !== null && e.avg < 75 ? 'low' : ''}">
                    ${e.avg !== null ? `<strong>${e.avg.toFixed(2)}%</strong> <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${e.avg >= 75 ? '#dcfce7' : '#fee2e2'};color:${e.avg >= 75 ? '#15803d' : '#991b1b'};font-weight:700;">${e.avg >= 75 ? 'PASSING' : 'NEEDS IMP.'}</span>` : '<span style="color:var(--text-muted);">—</span>'}
                  </td>
                  <td>
                    <div style="display:flex;gap:6px;align-items:center;">
                      <button type="button" class="table-act-btn take" onclick="openStudentGradePanel('${e.key}')">
                        Grade Details
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;margin-left:4px;pointer-events:none;"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      <button type="button" class="table-act-btn review" title="Print Student Grade Slip" onclick="openStudentReportModal('${e.key}')">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none;"><polyline points="6 18 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
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
        <div class="score-table scholaria-custom-scroll" style="max-height:520px;overflow:auto;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <table style="width:100%;border-collapse:collapse;min-width:760px;">
            <thead>
              <tr style="position:sticky;top:0;z-index:3;background:var(--blue);color:#ffffff;">
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
let adminReportsTab = 'census'; // 'census' | 'grades'
function setAdminReportsTab(tab) {
  adminReportsTab = tab;
  if (typeof renderPage === 'function') renderPage('reports');
}

function adminPage(page) {
  switch(page) {
    case 'dashboard': {
      const allUsers = typeof registeredUsers !== 'undefined' ? registeredUsers : [];
      const students = allUsers.filter(u => u.role === 'student');
      const teachers = allUsers.filter(u => u.role === 'teacher');
      const admins = allUsers.filter(u => u.role === 'admin');

      // Active status tracking
      const activeStudents = students.filter(u => u.isActive !== false);
      const activeTeachers = teachers.filter(u => u.isActive !== false);
      const activeAdmins = admins.filter(u => u.isActive !== false);

      function isUserOnline(u) {
        if (u.online_status === 'online' || u.onlineStatus === 'online') return true;
        const ts = u.lastActive || u.last_active_at;
        if (!ts) return false;
        const diffMins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
        return diffMins <= 15;
      }

      const onlineStudents = students.filter(isUserOnline).length;
      const onlineTeachers = teachers.filter(isUserOnline).length;
      const onlineAdmins = admins.filter(isUserOnline).length;

      // Pending items needing approval
      const allApprovalEntries = typeof approvalEntries === 'function' ? approvalEntries() : [];
      const pendingApprovalList = allApprovalEntries.filter(e => e.status === 'pending');
      const pendingMaterials = materialsData.filter(m => m.status === 'pending');
      const pendingQuizzes = customQuizzes.filter(q => q.status === 'pending');
      const totalPending = pendingApprovalList.length || (pendingMaterials.length + pendingQuizzes.length);

      // Student to Teacher Ratio
      const ratio = teachers.length > 0 ? `1 : ${Math.max(1, Math.round(students.length / teachers.length))}` : '1 : 23';

      // Announcements for Admin Widget
      const allAnc = typeof getStoredAnnouncements === 'function' ? getStoredAnnouncements() : [];
      const activeAnnouncements = allAnc.filter(a => !a.isArchived && a.status !== 'draft');
      const emergencyAnnouncements = allAnc.filter(a => a.category === 'emergency' && !a.isArchived);
      const draftAnnouncements = allAnc.filter(a => a.status === 'draft' || a.isDraft);
      const recentAnnouncements = allAnc.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 3);

      function formatTimeAgo(ts) {
        if (!ts) return '';
        const diffMins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
      }

      function formatAudienceSummary(aud) {
        if (!aud || !aud.length) return 'All School';
        if (Array.isArray(aud)) {
          if (aud.includes('All Students') && aud.includes('All Teachers')) return 'All Students & Faculty';
          if (aud.includes('All Students')) return 'All Students';
          if (aud.includes('All Teachers')) return 'Faculty Only';
          return aud[0];
        }
        return String(aud);
      }

      if (typeof window.openApprovedQuizzesApprovalView !== 'function') {
        window.openApprovedQuizzesApprovalView = function() {
          if (typeof setApprovalView === 'function') {
            setApprovalView('tab', 'approved');
            setApprovalView('type', 'Quiz');
            setApprovalView('search', '');
            setApprovalView('subject', '');
          } else if (typeof approvalView !== 'undefined') {
            approvalView.tab = 'approved';
            approvalView.type = 'Quiz';
            approvalView.search = '';
            approvalView.subject = '';
            approvalView.page = 1;
          }
          if (typeof renderPage === 'function') {
            renderPage('approval');
          }
        };
      }
      if (typeof window.navigateToUploadedMaterial !== 'function') {
        window.navigateToUploadedMaterial = function(courseId, subject, section, materialId) {
          let targetCourse = null;
          if (typeof COURSES_DATABASE !== 'undefined' && Array.isArray(COURSES_DATABASE)) {
            if (courseId) {
              targetCourse = COURSES_DATABASE.find(c => c.id === courseId);
            }
            if (!targetCourse && subject) {
              const sLow = String(subject).toLowerCase().trim();
              targetCourse = COURSES_DATABASE.find(c => (c.title || '').toLowerCase().trim() === sLow || (c.code || '').toLowerCase().trim() === sLow);
            }
          }
          const cId = targetCourse ? targetCourse.id : (courseId || (typeof COURSES_DATABASE !== 'undefined' && COURSES_DATABASE[0] ? COURSES_DATABASE[0].id : null));
          const sec = section && section !== 'All' ? section : 'Section A';

          if (cId && typeof setActiveSubjectMaterials === 'function') {
            setActiveSubjectMaterials(cId, sec, false);
          }
          if (typeof setSubjectSubTab === 'function') {
            setSubjectSubTab('uploads');
          }
          if (typeof renderPage === 'function') {
            renderPage('materials');
          }
          if (typeof showToast === 'function') {
            showToast(`Redirected to ${targetCourse ? targetCourse.title : (subject || 'Subject')} (${sec}) — Uploads tab`, 'info');
          }
        };
      }

      const recentUploadedMaterials = (typeof materialsData !== 'undefined' ? materialsData : [])
        .filter(m => m && (m.title || m.fileName))
        .slice()
        .sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0))
        .slice(0, 6);

      const inactiveStudents = students.filter(u => u.isActive === false);
      const sectionsList = typeof managedSections !== 'undefined' && Array.isArray(managedSections) ? managedSections : [];
      const activeSections = sectionsList.filter(s => !s.isArchived);
      const allMaterials = typeof materialsData !== 'undefined' && Array.isArray(materialsData) ? materialsData : [];
      const publishedMaterials = allMaterials.filter(m => m.status === 'approved');
      const allQuizzes = typeof customQuizzes !== 'undefined' && Array.isArray(customQuizzes) ? customQuizzes : [];
      const activeQuizzes = allQuizzes.filter(q => q.status === 'approved' || q.status === 'active');
      const advisers = teachers.filter(u => u.isAdviser || u.section || u.assigned_section);
      const adviserCount = advisers.length || (activeSections.filter(s => s.adviser).length || 5);
      const sevenDaysAgo = Date.now() - 7 * 24 * 3600000;
      const announcementsThisWeek = allAnc.filter(a => new Date(a.timestamp || a.created_at || Date.now()).getTime() >= sevenDaysAgo);
      const newUsersThisWeek = allUsers.filter(u => new Date(u.created_at || u.createdAt || Date.now()).getTime() >= sevenDaysAgo);
      const pendingIssuesCount = allUsers.filter(u => u.permanently_muted || (u.muted_until && new Date(u.muted_until) > new Date()) || u.isActive === false).length;
      const deactivatedCount = inactiveStudents.length + teachers.filter(u => u.isActive === false).length;

      const strandCounts = { STEM: 0, ABM: 0, HUMSS: 0, GAS: 0, TVL: 0 };
      students.forEach(st => {
        const str = (st.strand || '').toUpperCase().trim();
        if (str.includes('STEM')) strandCounts.STEM++;
        else if (str.includes('ABM')) strandCounts.ABM++;
        else if (str.includes('HUMSS') || str.includes('HUMS')) strandCounts.HUMSS++;
        else if (str.includes('GAS')) strandCounts.GAS++;
        else if (str.includes('TVL') || str.includes('TECH') || str.includes('ICT')) strandCounts.TVL++;
        else strandCounts.STEM++;
      });
      const totalCountedStrands = Math.max(1, students.length);

      const materialsActivityList = allMaterials.slice(0, 5).map(m => {
        const uploader = m.uploaded_by_name || m.uploader_name || 'Faculty';
        const isApp = m.status === 'approved';
        return {
          id: m.id,
          subject: m.subject || m.course_name || 'General Subject',
          uploader: uploader,
          type: (m.content_type && m.content_type.toLowerCase().includes('quiz') ? 'QUIZ' : (m.file_type && m.file_type.includes('quiz') ? 'QUIZ' : 'MATERIAL')),
          time: formatTimeAgo(m.created_at) || 'Recent',
          status: isApp ? 'Approved' : 'Pending',
          statusBg: isApp ? '#dcfce7' : '#fef3c7',
          statusCol: isApp ? '#15803d' : '#d97706'
        };
      });

      const adminActivityLogs = [];
      publishedMaterials.slice(0, 3).forEach(m => {
        adminActivityLogs.push({
          icon: '✅',
          iconBg: '#dcfce7',
          iconColor: '#15803d',
          title: 'Admin approved ' + (m.title || m.fileName || 'Material'),
          meta: 'Instructional content verified and published',
          time: formatTimeAgo(m.updated_at || m.created_at) || '12m ago',
          timestamp: new Date(m.updated_at || m.created_at || Date.now()).getTime()
        });
      });
      teachers.slice(0, 2).forEach(t => {
        adminActivityLogs.push({
          icon: '👤',
          iconBg: '#e0f2fe',
          iconColor: '#0284c7',
          title: 'Teacher account active: ' + (t.name || t.full_name || 'Faculty'),
          meta: 'Profile information & access rights verified',
          time: formatTimeAgo(t.created_at) || '28m ago',
          timestamp: new Date(t.created_at || Date.now()).getTime()
        });
      });
      recentAnnouncements.slice(0, 1).forEach(a => {
        adminActivityLogs.push({
          icon: '📢',
          iconBg: '#fee2e2',
          iconColor: '#dc2626',
          title: 'Announcement posted: ' + (a.title || 'Bulletin'),
          meta: 'Broadcast sent to senior high school users',
          time: formatTimeAgo(a.timestamp) || '1h ago',
          timestamp: new Date(a.timestamp || Date.now()).getTime()
        });
      });
      activeSections.slice(0, 1).forEach(s => {
        adminActivityLogs.push({
          icon: '🏫',
          iconBg: '#ede9fe',
          iconColor: '#7c3aed',
          title: 'Section ' + (s.name || 'Section') + ' roster active',
          meta: (s.strand || 'SHS') + ' &middot; ' + (s.gradeLevel || 'Grade 11'),
          time: '2h ago',
          timestamp: Date.now() - 2 * 3600000
        });
      });
      pendingQuizzes.slice(0, 1).forEach(q => {
        adminActivityLogs.push({
          icon: '📝',
          iconBg: '#fef3c7',
          iconColor: '#d97706',
          title: 'Quiz submitted for approval: ' + (q.title || 'Quiz'),
          meta: 'Awaiting administrative sign-off',
          time: formatTimeAgo(q.created_at || q.createdAt) || '3h ago',
          timestamp: new Date(q.created_at || q.createdAt || Date.now()).getTime()
        });
      });
      adminActivityLogs.sort((a, b) => b.timestamp - a.timestamp);

      const upcomingDeadlines = [
        { label: 'Learning materials review', date: 'Feb 12', icon: '📄', color: '#0284c7' },
        { label: 'Quiz submissions & approval', date: 'Feb 14', icon: '📝', color: '#dc2626' },
        { label: 'Midterm grade reporting', date: 'Feb 20', icon: '📊', color: '#059669' }
      ];

      // Dashboard Approval Queue Pagination state
      if (typeof window.dashApprovalPage === 'undefined') {
        window.dashApprovalPage = 1;
      }
      const queuePageSize = 3;
      const totalQueuePages = Math.max(1, Math.ceil(pendingApprovalList.length / queuePageSize));
      if (window.dashApprovalPage > totalQueuePages) window.dashApprovalPage = totalQueuePages;
      if (window.dashApprovalPage < 1) window.dashApprovalPage = 1;
      const currentQueuePage = window.dashApprovalPage;
      const queueOffset = (currentQueuePage - 1) * queuePageSize;
      const pagedPendingList = pendingApprovalList.slice(queueOffset, queueOffset + queuePageSize);


      // Dashboard Announcement Single-Item Pagination state
      if (typeof window.dashAnnouncementPage === 'undefined') {
        window.dashAnnouncementPage = 1;
      }
      const totalAncPages = Math.max(1, activeAnnouncements.length);
      if (window.dashAnnouncementPage > totalAncPages) window.dashAnnouncementPage = totalAncPages;
      if (window.dashAnnouncementPage < 1) window.dashAnnouncementPage = 1;
      const currentAncPage = window.dashAnnouncementPage;
      const featuredAnc = (activeAnnouncements.length ? activeAnnouncements[currentAncPage - 1] : null) || (allAnc.length ? allAnc[0] : null);

      if (typeof window.setDashAnnouncementPage !== 'function') {
        window.setDashAnnouncementPage = function(delta) {
          const ancList = (typeof getStoredAnnouncements === 'function' ? getStoredAnnouncements() : []).filter(a => !a.isArchived && a.status !== 'draft');
          const total = Math.max(1, ancList.length);
          let nextP = (window.dashAnnouncementPage || 1) + delta;
          if (nextP < 1) nextP = 1;
          if (nextP > total) nextP = total;
          window.dashAnnouncementPage = nextP;
          if (typeof renderPage === 'function') {
            renderPage('dashboard');
          }
        };
      }
      if (typeof window.setDashApprovalPage !== 'function') {
        window.setDashApprovalPage = function(delta) {
          const allEntries = typeof approvalEntries === 'function' ? approvalEntries() : [];
          const pending = allEntries.filter(e => e.status === 'pending');
          const totalPages = Math.max(1, Math.ceil(pending.length / 3));
          let nextP = (window.dashApprovalPage || 1) + delta;
          if (nextP < 1) nextP = 1;
          if (nextP > totalPages) nextP = totalPages;
          window.dashApprovalPage = nextP;
          if (typeof renderPage === 'function') {
            renderPage('dashboard');
          }
        };
      }

      const recentApproved = [
        ...materialsData.filter(m => m.status === 'approved').map(m => ({
          id: m.id, kind: 'material', title: m.title || m.fileName, type: m.content_type || 'Material', by: m.uploaded_by_name || 'Faculty', at: m.created_at
        })),
        ...customQuizzes.filter(q => q.status === 'approved' || q.status === 'active').map(q => ({
          id: q.id, kind: 'quiz', title: q.title, type: 'Quiz', by: allUsers.find(u => u.dbId === q.createdBy)?.name || 'Faculty', at: q.createdAt || q.created_at
        }))
      ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 4);

      return `
      <!-- 1. EXECUTIVE WELCOME BANNER -->
      <div class="welcome-banner" style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0284c7 100%);">
        <div class="banner-content">
          <div class="welcome-text-box">
            <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.12);padding:4px 12px;border-radius:20px;font-size:11.5px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#38bdf8;margin-bottom:8px;backdrop-filter:blur(6px);">
              <span>🛡️</span> ADMINISTRATIVE CONTROL CENTER &middot; HAVEN OF WISDOM ACADEMY
            </div>
            <h1>ADMIN OPERATIONS DASHBOARD</h1>
            <h2>Senior High School Department &middot; Institutional Overview</h2>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button class="add-btn" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.25);backdrop-filter:blur(6px);padding:8px 16px;font-size:13px;display:inline-flex;align-items:center;gap:7px;cursor:pointer;" onclick="openCreateAnnouncementModal()">
              <span>📢</span> Post Notice
            </button>
            <button class="add-btn" style="background:#0284c7;color:#fff;border:none;box-shadow:0 4px 14px rgba(2,132,199,0.4);padding:8px 16px;font-size:13px;display:inline-flex;align-items:center;gap:7px;cursor:pointer;" onclick="renderPage('approval')">
              <span>🚨</span> Approvals (${totalPending})
            </button>
          </div>
        </div>
      </div>

      <!-- 2. HIGH-IMPACT METRICS CARDS ROW (8 CARDS) -->
      <div class="admin-metric-grid-8">
        <!-- 1. Pending Approvals -->
        <div class="admin-metric-card" onclick="renderPage('approval')" title="Click to view approval queue">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;font-weight:700;color:var(--text-muted);">Pending Approvals</span>
            <div style="width:32px;height:32px;border-radius:8px;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:14px;">🚨</div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#d97706;line-height:1.1;">${totalPending}</div>
          <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${pendingMaterials.length} handout${pendingMaterials.length !== 1 ? 's' : ''} &middot; ${pendingQuizzes.length} quiz${pendingQuizzes.length !== 1 ? 'zes' : ''} awaiting review
          </div>
        </div>

        <!-- 2. Total Students -->
        <div class="admin-metric-card" onclick="if(typeof setAdminUserTab==='function') setAdminUserTab('students'); renderPage('users');" title="Click to manage student accounts">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;font-weight:700;color:var(--text-muted);">Total Students</span>
            <div style="width:32px;height:32px;border-radius:8px;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;font-size:14px;">👥</div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#0284c7;line-height:1.1;">${students.length}</div>
          <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            <strong style="color:#059669;">${activeStudents.length}</strong> active &middot; <span style="color:#dc2626;">${inactiveStudents.length}</span> inactive
          </div>
        </div>

        <!-- 3. Number of Teachers -->
        <div class="admin-metric-card" onclick="if(typeof setAdminUserTab==='function') setAdminUserTab('teachers'); renderPage('users');" title="Click to manage teacher accounts">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;font-weight:700;color:var(--text-muted);">Number of Teachers</span>
            <div style="width:32px;height:32px;border-radius:8px;background:#dcfce7;color:#15803d;display:flex;align-items:center;justify-content:center;font-size:14px;">🧑‍🏫</div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#15803d;line-height:1.1;">${teachers.length}</div>
          <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            <strong style="color:#059669;">${activeTeachers.length}</strong> active faculty members
          </div>
        </div>

        <!-- 4. System Admins -->
        <div class="admin-metric-card" onclick="if(typeof setAdminUserTab==='function') setAdminUserTab('admins'); renderPage('users');" title="Click to view admin accounts">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;font-weight:700;color:var(--text-muted);">System Admins</span>
            <div style="width:32px;height:32px;border-radius:8px;background:#ede9fe;color:#7c3aed;display:flex;align-items:center;justify-content:center;font-size:14px;">🛡️</div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#7c3aed;line-height:1.1;">${admins.length}</div>
          <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            <strong style="color:#7c3aed;">${activeAdmins.length}</strong> active admin accounts
          </div>
        </div>

        <!-- 5. Active Sections -->
        <div class="admin-metric-card" onclick="renderPage('sections')" title="Click to manage sections">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;font-weight:700;color:var(--text-muted);">Active Sections</span>
            <div style="width:32px;height:32px;border-radius:8px;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;font-size:14px;">🏫</div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#dc2626;line-height:1.1;">${activeSections.length || 5}</div>
          <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            Across Grade 11 &amp; 12
          </div>
        </div>

        <!-- 6. Published Materials -->
        <div class="admin-metric-card" onclick="renderPage('materials')" title="Click to open Materials Hub">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;font-weight:700;color:var(--text-muted);">Published Materials</span>
            <div style="width:32px;height:32px;border-radius:8px;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;font-size:14px;">📚</div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#0284c7;line-height:1.1;">${publishedMaterials.length}</div>
          <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            All approved resources
          </div>
        </div>

        <!-- 7. Active Quizzes -->
        <div class="admin-metric-card" onclick="openApprovedQuizzesApprovalView()" title="Click to view approved quizzes in Content Approval" style="cursor:pointer;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;font-weight:700;color:var(--text-muted);">Active Quizzes</span>
            <div style="width:32px;height:32px;border-radius:8px;background:#fef3c7;color:#b45309;display:flex;align-items:center;justify-content:center;font-size:14px;">📝</div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#b45309;line-height:1.1;">${activeQuizzes.length}</div>
          <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            Running across subjects
          </div>
        </div>

        <!-- 8. Announcements This Week -->
        <div class="admin-metric-card" onclick="renderPage('announcements')" title="Click to view announcements">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;font-weight:700;color:var(--text-muted);">Announcements This Week</span>
            <div style="width:32px;height:32px;border-radius:8px;background:#f3e8ff;color:#9333ea;display:flex;align-items:center;justify-content:center;font-size:14px;">📢</div>
          </div>
          <div style="font-size:26px;font-weight:800;color:#9333ea;line-height:1.1;">${announcementsThisWeek.length || activeAnnouncements.length}</div>
          <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            School-wide updates posted
          </div>
        </div>
      </div>

      <!-- 3. ROW 2: SPLIT 2-COLUMN (APPROVALS QUEUE & INSTITUTIONAL BULLETINS HUB) -->
      <div class="admin-dashboard-split" style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:18px;align-items:stretch;margin-bottom:22px;">
        
        <!-- PENDING APPROVAL QUEUE CARD -->
        <div style="background:#ffffff;border:1.5px solid var(--blue-light);border-radius:18px;padding:22px;box-shadow:var(--shadow);display:flex;flex-direction:column;justify-content:space-between;height:100%;">
          <div style="display:flex;flex-direction:column;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;border-radius:10px;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
                  🚨
                </div>
                <div>
                  <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0;">Pending Approval Queue</h3>
                  <span style="font-size:11.5px;color:var(--text-muted);display:block;">${totalPending} items awaiting administrative review</span>
                </div>
              </div>
              <div style="display:inline-flex;align-items:center;gap:10px;flex-shrink:0;">
                ${totalQueuePages > 1 ? `
                  <div style="display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;padding:3px 8px;border-radius:20px;border:1px solid #e2e8f0;">
                    <button type="button" class="dash-circle-arrow" onclick="setDashApprovalPage(-1)" ${currentQueuePage <= 1 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : 'style="cursor:pointer;"'} aria-label="Previous page">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <span style="font-size:11px;font-weight:700;color:#334155;min-width:30px;text-align:center;">${currentQueuePage}/${totalQueuePages}</span>
                    <button type="button" class="dash-circle-arrow" onclick="setDashApprovalPage(1)" ${currentQueuePage >= totalQueuePages ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : 'style="cursor:pointer;"'} aria-label="Next page">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                ` : ''}
                <a href="javascript:void(0)" onclick="renderPage('approval')" style="font-size:12.5px;font-weight:700;color:var(--blue);text-decoration:none;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;">
                  Open Queue (${totalPending}) &rarr;
                </a>
              </div>
            </div>

            ${pagedPendingList.length ? `
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${pagedPendingList.map(item => {
                  const itemKind = item.kind || 'material';
                  const isQuiz = itemKind === 'quiz';
                  const args = escHtml(JSON.stringify(itemKind) + ',' + JSON.stringify(String(item.id)));
                  return `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;gap:12px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
                      <div style="width:36px;height:36px;border-radius:8px;background:${isQuiz ? '#ede9fe' : '#eff6ff'};color:${isQuiz ? '#7c3aed' : 'var(--blue)'};display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;">
                        ${isQuiz ? '📝' : '📄'}
                      </div>
                      <div style="min-width:0;">
                        <h4 style="font-size:13.5px;font-weight:700;color:#0f172a;margin:0 0 2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                          ${escHtml(item.title)}
                        </h4>
                        <div style="font-size:11.5px;color:var(--text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                          <span style="background:${isQuiz ? '#ede9fe' : '#e0f2fe'};color:${isQuiz ? '#6d28d9' : '#0369a1'};padding:1px 6px;border-radius:4px;font-weight:700;font-size:10.5px;">${isQuiz ? 'Quiz' : 'Material'}</span>
                          <span>&middot;</span>
                          <span>By <strong>${escHtml(item.name || 'Haven Faculty')}</strong></span>
                          <span>&middot;</span>
                          <span>${item.date ? new Date(item.date).toLocaleDateString() : 'Recent'}</span>
                        </div>
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                      <button class="table-act-btn take" style="padding:5px 10px;font-size:11.5px;white-space:nowrap;" onclick="reviewApprovalEntry(${args})">
                        Review
                      </button>
                      <button class="table-act-btn" style="background:#059669;color:#fff;border:none;padding:5px 10px;font-size:11.5px;font-weight:700;white-space:nowrap;" onclick="runApprovalAction(${args}, true); renderPage('dashboard');">
                        Approve
                      </button>
                      <button class="table-act-btn" style="background:#fee2e2;color:#dc2626;border:none;padding:5px 10px;font-size:11.5px;font-weight:700;white-space:nowrap;" onclick="runApprovalAction(${args}, false); renderPage('dashboard');">
                        Reject
                      </button>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            ` : `
              <div style="text-align:center;padding:20px 16px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;">
                <span style="font-size:26px;display:block;margin-bottom:4px;">✅</span>
                <strong style="font-size:13px;color:#0f172a;display:block;margin-bottom:2px;">Approval Queue is Clear</strong>
                <p style="font-size:11.5px;color:var(--text-muted);margin:0;">No instructional materials or quizzes currently awaiting administrative review.</p>
              </div>
            `}

            ${pagedPendingList.length < 3 && recentApproved.length ? `
              <div style="margin-top:14px;padding-top:12px;border-top:1px dashed #cbd5e1;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                  <span style="font-size:11.5px;font-weight:700;color:var(--text-muted);display:inline-flex;align-items:center;gap:6px;">
                    <span>📋</span> Recently Approved &middot; Live in Portal
                  </span>
                  <a href="javascript:void(0)" onclick="setApprovalView('tab','approved'); renderPage('approval');" style="font-size:11px;font-weight:700;color:var(--blue);text-decoration:none;">View All &rarr;</a>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${recentApproved.slice(0, Math.max(1, 3 - pagedPendingList.length)).map(item => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;gap:8px;">
                      <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                        <span style="font-size:14px;flex-shrink:0;">${item.kind === 'quiz' ? '📝' : '📄'}</span>
                        <div style="min-width:0;">
                          <div style="font-size:12.5px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escHtml(item.title)}
                          </div>
                          <div style="font-size:11px;color:#64748b;">
                            <strong style="color:${item.kind === 'quiz' ? '#6d28d9' : '#0369a1'};">${item.kind === 'quiz' ? 'Quiz' : 'Material'}</strong> &middot; By ${escHtml(item.by || 'Teacher')}
                          </div>
                        </div>
                      </div>
                      <span style="font-size:10px;font-weight:800;background:#dcfce7;color:#15803d;padding:2px 7px;border-radius:5px;border:1px solid #86efac;white-space:nowrap;">
                        Approved
                      </span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- INSTITUTIONAL BULLETINS HUB -->
        <div style="background:#ffffff;border:1.5px solid var(--blue-light);border-radius:18px;padding:22px;box-shadow:var(--shadow);display:flex;flex-direction:column;justify-content:space-between;height:100%;">
          <div style="display:flex;flex-direction:column;">
            <!-- HEADER -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:10px;">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                <div style="width:34px;height:34px;border-radius:10px;background:#eff6ff;color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
                  📢
                </div>
                <div style="min-width:0;">
                  <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Institutional Bulletins Hub</h3>
                  <span style="font-size:11.5px;color:var(--text-muted);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Admin announcements and broadcast center</span>
                </div>
              </div>
              <button class="add-btn" style="padding:6px 14px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap;flex-shrink:0;border-radius:8px;" onclick="openCreateAnnouncementModal()">
                <span style="font-size:13px;line-height:1;font-weight:800;">+</span> Post Notice
              </button>
            </div>

            <!-- ADMIN STATS MINI BAR -->
            <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin-bottom:12px;background:#f8fafc;padding:9px 10px;border-radius:12px;border:1px solid #e2e8f0;text-align:center;">
              <div>
                <div style="font-size:16px;font-weight:800;color:#0284c7;line-height:1.2;">${activeAnnouncements.length}</div>
                <div style="font-size:10.5px;color:var(--text-muted);text-transform:uppercase;font-weight:700;letter-spacing:0.02em;">Broadcasts</div>
              </div>
              <div>
                <div style="font-size:16px;font-weight:800;color:${emergencyAnnouncements.length > 0 ? '#dc2626' : '#64748b'};line-height:1.2;">${emergencyAnnouncements.length}</div>
                <div style="font-size:10.5px;color:var(--text-muted);text-transform:uppercase;font-weight:700;letter-spacing:0.02em;">Emergency</div>
              </div>
              <div>
                <div style="font-size:16px;font-weight:800;color:#f59e0b;line-height:1.2;">${draftAnnouncements.length}</div>
                <div style="font-size:10.5px;color:var(--text-muted);text-transform:uppercase;font-weight:700;letter-spacing:0.02em;">Drafts</div>
              </div>
            </div>

            <!-- FEATURED SINGLE ANNOUNCEMENT -->
            ${featuredAnc ? (() => {
              const isEmergency = featuredAnc.category === 'emergency';
              const tagColor = isEmergency ? '#dc2626' : featuredAnc.category === 'academic' ? '#0284c7' : featuredAnc.category === 'event' ? '#059669' : '#d97706';
              const tagBg = isEmergency ? '#fee2e2' : featuredAnc.category === 'academic' ? '#e0f2fe' : featuredAnc.category === 'event' ? '#dcfce7' : '#fef3c7';
              return `
              <div style="padding:13px 15px;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:12px;cursor:pointer;transition:border-color 0.15s, box-shadow 0.15s;" onmouseover="this.style.borderColor='var(--blue)';this.style.boxShadow='0 3px 10px rgba(0,0,0,0.05)';" onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='';" onclick="openAnnouncementDetailModal('${featuredAnc.id}')">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:6px;flex-wrap:wrap;">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-size:10px;font-weight:700;text-transform:uppercase;background:${tagBg};color:${tagColor};padding:2px 7px;border-radius:4px;letter-spacing:0.04em;">
                      ${escHtml(featuredAnc.category || 'NOTICE')}
                    </span>
                    <span style="font-size:10.5px;color:var(--text-muted);background:#f1f5f9;padding:1px 6px;border-radius:4px;">
                      ${escHtml(formatAudienceSummary(featuredAnc.audience))}
                    </span>
                  </div>
                  <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${formatTimeAgo(featuredAnc.timestamp)}</span>
                </div>
                <h4 style="font-size:13.5px;font-weight:700;color:#0f172a;margin:0 0 4px 0;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${escHtml(featuredAnc.title)}
                </h4>
                <p style="font-size:12px;color:var(--text-secondary);margin:0;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                  ${escHtml(featuredAnc.message || '')}
                </p>
              </div>`;
            })() : `
              <div style="text-align:center;padding:20px 16px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;">
                <span style="font-size:24px;display:block;margin-bottom:4px;">📢</span>
                <strong style="font-size:13px;color:#0f172a;display:block;margin-bottom:2px;">No Announcements Posted</strong>
                <p style="font-size:11.5px;color:var(--text-muted);margin:0;">No active announcements currently broadcasted.</p>
              </div>
            `}
          </div>

          <!-- FOOTER -->
          <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f1f5f9;padding-top:12px;margin-top:12px;gap:10px;">
            <div style="display:inline-flex;align-items:center;gap:8px;">
              ${totalAncPages > 1 ? `
                <div style="display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;padding:2px 7px;border-radius:18px;border:1px solid #e2e8f0;">
                  <button type="button" class="dash-circle-arrow" onclick="event.stopPropagation(); setDashAnnouncementPage(-1)" ${currentAncPage <= 1 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : 'style="cursor:pointer;"'} aria-label="Previous announcement">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span style="font-size:10.5px;font-weight:700;color:#334155;min-width:28px;text-align:center;">${currentAncPage}/${totalAncPages}</span>
                  <button type="button" class="dash-circle-arrow" onclick="event.stopPropagation(); setDashAnnouncementPage(1)" ${currentAncPage >= totalAncPages ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : 'style="cursor:pointer;"'} aria-label="Next announcement">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              ` : ''}
              <a href="javascript:void(0)" onclick="renderPage('announcements')" style="font-size:11.5px;color:var(--text-muted);text-decoration:none;">
                View all ${totalAncPages > 1 ? `(${totalAncPages})` : ''}
              </a>
            </div>
            <a href="javascript:void(0)" onclick="renderPage('announcements')" style="font-size:12.5px;font-weight:700;color:var(--blue);text-decoration:none;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;">
              Broadcast Center &rarr;
            </a>
          </div>
        </div>

      </div>

      <!-- 4. ROW 3: 3-COLUMN (USER SNAPSHOT, MATERIALS ACTIVITY TABLE, SHORTCUTS) -->
      <div class="admin-dashboard-row-3">
        <!-- COL 1: User Management Snapshot -->
        <div class="admin-dash-panel">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="width:32px;height:32px;border-radius:8px;background:#eff6ff;color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:15px;">👥</div>
            <div>
              <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);margin:0;">User Management Snapshot</h3>
              <span style="font-size:11px;color:var(--text-muted);">View and manage accounts across the institution</span>
            </div>
          </div>
          <!-- 4 Main Counters -->
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;margin-bottom:12px;background:#f8fafc;padding:10px 8px;border-radius:10px;border:1px solid #e2e8f0;text-align:center;">
            <div>
              <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:3px;">👤 <span>Students</span></div>
              <div style="font-size:16px;font-weight:800;color:#0284c7;margin-top:2px;">${students.length}</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:3px;">🧑‍🏫 <span>Teachers</span></div>
              <div style="font-size:16px;font-weight:800;color:#059669;margin-top:2px;">${teachers.length}</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:3px;">🛡️ <span>Admins</span></div>
              <div style="font-size:16px;font-weight:800;color:#7c3aed;margin-top:2px;">${admins.length}</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:3px;">⭐ <span>Advisers</span></div>
              <div style="font-size:16px;font-weight:800;color:#d97706;margin-top:2px;">${adviserCount}</div>
            </div>
          </div>
          <!-- Sub-stats Strip -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;font-size:11px;color:var(--text-muted);margin-bottom:14px;flex-wrap:wrap;gap:6px;">
            <div>New this week: <strong style="color:#059669;">${newUsersThisWeek.length || 0}</strong></div>
            <div>Pending issues: <strong style="color:#d97706;">${pendingIssuesCount}</strong></div>
            <div>Deactivated: <strong style="color:#dc2626;">${deactivatedCount}</strong></div>
          </div>
          <!-- Buttons -->
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin-top:auto;">
            <button type="button" class="add-btn" style="padding:7px 10px;font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:4px;" onclick="openAddUserModal()">+ Create User</button>
            <button type="button" class="foot-btn-secondary" style="padding:7px 10px;font-size:12px;border-radius:8px;font-weight:600;" onclick="renderPage('users')">Reset Access</button>
            <button type="button" class="foot-btn-secondary" style="padding:7px 10px;font-size:12px;border-radius:8px;font-weight:600;" onclick="renderPage('users')">Manage Roles</button>
          </div>
        </div>

        <!-- COL 2: Courses / Materials Activity -->
        <div class="admin-dash-panel">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;border-radius:8px;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:15px;">📁</div>
              <div>
                <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);margin:0;">Courses / Materials Activity</h3>
                <span style="font-size:11px;color:var(--text-muted);">Recently uploaded and published instructional materials</span>
              </div>
            </div>
            <a href="javascript:void(0)" onclick="renderPage('materials')" style="font-size:12px;font-weight:700;color:var(--blue);text-decoration:none;">Materials Hub &rarr;</a>
          </div>
          <!-- Table -->
          <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:10px;">
            <table style="width:100%;border-collapse:collapse;font-size:11.5px;text-align:left;min-width:380px;">
              <thead>
                <tr style="border-bottom:1.5px solid #e2e8f0;color:var(--text-muted);">
                  <th style="padding:6px 8px;font-weight:700;">Subject</th>
                  <th style="padding:6px 8px;font-weight:700;">Uploaded By</th>
                  <th style="padding:6px 8px;font-weight:700;">Type</th>
                  <th style="padding:6px 8px;font-weight:700;">Timestamp</th>
                  <th style="padding:6px 8px;font-weight:700;text-align:right;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${materialsActivityList.map(item => `
                  <tr style="border-bottom:1px solid #f1f5f9;transition:background 0.1s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                    <td style="padding:8px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;" title="${escHtml(item.subject)}">${escHtml(item.subject)}</td>
                    <td style="padding:8px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;">${escHtml(item.uploader)}</td>
                    <td style="padding:8px;"><span style="font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:4px;background:#e0f2fe;color:#0284c7;">${escHtml(item.type)}</span></td>
                    <td style="padding:8px;color:#64748b;white-space:nowrap;">${escHtml(item.time)}</td>
                    <td style="padding:8px;text-align:right;"><span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:${item.statusBg};color:${item.statusCol};">${item.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- COL 3: Administrative Shortcuts -->
        <div class="admin-dash-panel">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="width:32px;height:32px;border-radius:8px;background:#f3e8ff;color:#9333ea;display:flex;align-items:center;justify-content:center;font-size:15px;">⚡</div>
            <div>
              <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);margin:0;">Administrative Shortcuts</h3>
              <span style="font-size:11px;color:var(--text-muted);">Quick access to common administrative tasks</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:auto;">
            <button class="foot-btn-secondary" style="padding:11px 12px;font-size:12px;display:flex;align-items:center;justify-content:space-between;border-radius:10px;text-align:left;cursor:pointer;" onclick="openAddUserModal()">
              <span>👤 Create User</span>
              <span style="color:#94a3b8;">&rsaquo;</span>
            </button>
            <button class="foot-btn-secondary" style="padding:11px 12px;font-size:12px;display:flex;align-items:center;justify-content:space-between;border-radius:10px;text-align:left;cursor:pointer;" onclick="renderPage('sections')">
              <span>🏫 Manage Sections</span>
              <span style="color:#94a3b8;">&rsaquo;</span>
            </button>
            <button class="foot-btn-secondary" style="padding:11px 12px;font-size:12px;display:flex;align-items:center;justify-content:space-between;border-radius:10px;text-align:left;cursor:pointer;" onclick="setAdminReportsTab('census'); renderPage('reports');">
              <span>🏛️ School Census</span>
              <span style="color:#94a3b8;">&rsaquo;</span>
            </button>
            <button class="foot-btn-secondary" style="padding:11px 12px;font-size:12px;display:flex;align-items:center;justify-content:space-between;border-radius:10px;text-align:left;cursor:pointer;" onclick="setAdminReportsTab('grades'); renderPage('reports');">
              <span>📋 Grade Reports</span>
              <span style="color:#94a3b8;">&rsaquo;</span>
            </button>
            <button class="foot-btn-secondary" style="padding:11px 12px;font-size:12px;display:flex;align-items:center;justify-content:space-between;border-radius:10px;text-align:left;cursor:pointer;" onclick="renderPage('rooms')">
              <span>🚪 Manage Rooms</span>
              <span style="color:#94a3b8;">&rsaquo;</span>
            </button>
            <button class="foot-btn-secondary" style="padding:11px 12px;font-size:12px;display:flex;align-items:center;justify-content:space-between;border-radius:10px;text-align:left;cursor:pointer;" onclick="setAdminReportsTab('census'); renderPage('reports');">
              <span>📜 Open Audit Logs</span>
              <span style="color:#94a3b8;">&rsaquo;</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 5. ROW 4: 3-COLUMN (STRANDS PROGRESS BARS, RECENT ACTIVITY TIMELINE, DEADLINES & SUMMARY) -->
      <div class="admin-dashboard-row-4">
        <!-- COL 1: Students per Strand -->
        <div class="admin-dash-panel">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="width:32px;height:32px;border-radius:8px;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;font-size:15px;">📊</div>
            <div>
              <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);margin:0;">Students per Strand</h3>
              <span style="font-size:11px;color:var(--text-muted);">Student distribution across SHS strands</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:auto;">
            ${['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL'].map(st => {
              const cnt = strandCounts[st] || 0;
              const pct = Math.min(100, Math.round((cnt / totalCountedStrands) * 100));
              return `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                  <span style="font-weight:700;color:#1e293b;">${st}</span>
                  <span style="font-weight:800;color:#0284c7;">${cnt}</span>
                </div>
                <div style="height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
                  <div style="height:100%;width:${Math.max(4, pct)}%;background:linear-gradient(90deg,#0284c7,#38bdf8);border-radius:4px;"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- COL 2: Recent Administrative Activity -->
        <div class="admin-dash-panel">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;border-radius:8px;background:#ede9fe;color:#7c3aed;display:flex;align-items:center;justify-content:center;font-size:15px;">🕒</div>
              <div>
                <h3 style="font-size:15px;font-weight:700;color:var(--text-primary);margin:0;">Recent Administrative Activity</h3>
                <span style="font-size:11px;color:var(--text-muted);">System audit trail &amp; verified event logs</span>
              </div>
            </div>
            <a href="javascript:void(0)" onclick="setAdminReportsTab('census'); renderPage('reports');" style="font-size:12px;font-weight:700;color:var(--blue);text-decoration:none;">View All Logs &rarr;</a>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:auto;">
            ${adminActivityLogs.slice(0, 5).map(act => `
              <div style="display:flex;align-items:flex-start;gap:10px;">
                <div style="width:26px;height:26px;border-radius:50%;background:${act.iconBg};color:${act.iconColor};display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;margin-top:2px;">
                  ${act.icon}
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:12px;font-weight:700;color:#0f172a;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${act.title}">${act.title}</div>
                  <div style="font-size:11px;color:#64748b;line-height:1.2;margin-top:1px;">${act.meta}</div>
                </div>
                <div style="font-size:10.5px;color:#94a3b8;white-space:nowrap;margin-top:2px;">${act.time}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- COL 3: Upcoming Deadlines & Account Summary -->
        <div style="display:flex;flex-direction:column;gap:14px;">
          <!-- Top Card: Upcoming Deadlines -->
          <div class="admin-dash-panel" style="padding:16px 18px;flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <span style="font-size:15px;">🗓️</span>
              <div>
                <h4 style="font-size:13.5px;font-weight:700;color:#0f172a;margin:0;">Upcoming Deadlines</h4>
                <span style="font-size:10.5px;color:var(--text-muted);">Important school submissions</span>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${upcomingDeadlines.map(d => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11.5px;">
                  <span style="color:#1e293b;font-weight:600;display:flex;align-items:center;gap:6px;"><span>${d.icon}</span> ${d.label}</span>
                  <span style="font-weight:800;color:${d.color};background:#fff;padding:2px 7px;border-radius:6px;border:1px solid #e2e8f0;">${d.date}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Bottom Card: Account Summary -->
          <div class="admin-dash-panel" style="padding:16px 18px;flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <span style="font-size:15px;">📊</span>
              <div>
                <h4 style="font-size:13.5px;font-weight:700;color:#0f172a;margin:0;">Account Summary</h4>
                <span style="font-size:10.5px;color:var(--text-muted);">Student account status</span>
              </div>
            </div>
            <div style="display:flex;gap:10px;">
              <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 10px;text-align:center;">
                <div style="font-size:18px;font-weight:800;color:#15803d;">${activeStudents.length}</div>
                <div style="font-size:10.5px;font-weight:700;color:#166534;margin-top:2px;">Active</div>
              </div>
              <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 10px;text-align:center;">
                <div style="font-size:18px;font-weight:800;color:#dc2626;">${inactiveStudents.length}</div>
                <div style="font-size:10.5px;font-weight:700;color:#991b1b;margin-top:2px;">Inactive</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      `;
    }

        case 'materials': return `
      <div id="materialsListWrap">${renderMaterialsList('admin')}</div>`;

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

    case 'rooms': return `
      <div class="section-hdr">
        <div>
          <h2>Room Management & Scheduling</h2>
          <span style="font-size:12px;color:var(--text-muted);">Manage campus classrooms, assign section time slots, and prevent schedule conflicts</span>
        </div>
        <button class="add-btn" onclick="openCreateRoomModal()">${iconPlus()} Add New Room</button>
      </div>
      <div id="roomsManagementContentWrap">
        ${typeof renderRoomsTabContent === 'function' ? renderRoomsTabContent() : ''}
      </div>`;

    case 'reports': {
      return `
      <!-- ADMIN REPORTS & CENSUS TOP NAVIGATION TABS -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div style="display:inline-flex;background:#f1f5f9;padding:4px;border-radius:12px;gap:6px;border:1px solid #e2e8f0;">
          <button type="button" class="anc-archive-tab ${adminReportsTab === 'census' ? 'active' : ''}" style="padding:8px 18px;font-size:13px;font-weight:700;border-radius:8px;display:inline-flex;align-items:center;gap:7px;cursor:pointer;" onclick="setAdminReportsTab('census')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z"/></svg>
            Institutional Census
          </button>
          <button type="button" class="anc-archive-tab ${adminReportsTab === 'grades' ? 'active' : ''}" style="padding:8px 18px;font-size:13px;font-weight:700;border-radius:8px;display:inline-flex;align-items:center;gap:7px;cursor:pointer;" onclick="setAdminReportsTab('grades')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Academic Grade Reports
          </button>
        </div>
        <span style="font-size:12px;color:var(--text-muted);display:inline-flex;align-items:center;gap:6px;background:#f8fafc;padding:6px 14px;border-radius:8px;border:1px solid #e2e8f0;font-weight:600;">
          🔒 Strictly Restricted to Administrators
        </span>
      </div>

      ${adminReportsTab === 'census' ? renderAdminClassRecordCensus() : renderAdminAcademicReportsContent()}
      `;
    }

    case 'chats': return buildChatPage('admin');

    case 'profile': return buildProfilePage('admin');

    case 'classrec': return renderAdminClassRecordCensus();

    case 'quiz': return teacherPage('quiz');
    case 'quizzes': return teacherPage('quiz');
    case 'analysis': return teacherPage('analysis');

    default: return '<p>Page not found.</p>';
  }
}

function renderAdminAcademicReportsContent() {
  const allEntries = typeof buildRealClassRecordEntries === 'function' ? buildRealClassRecordEntries() : [];
  const students = registeredUsers.filter(u => u.role === 'student' && u.isActive !== false);
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
  <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 340px), 1fr));gap:18px;margin-bottom:28px;">
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
    <div class="score-table score-table-responsive" style="overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%;">
      <table style="min-width:850px;width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="white-space:nowrap;">Section Name</th>
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

/* ── ADMIN INSTITUTIONAL CENSUS & CLASS RECORD ENGINE ── */

function exportAdminCensusCSV() {
  const allUsers = typeof registeredUsers !== 'undefined' ? registeredUsers : [];
  const activeStudents = allUsers.filter(u => u.role === 'student');
  const activeTeachers = allUsers.filter(u => u.role === 'teacher');
  const totalStudents = activeStudents.length;
  const totalTeachers = activeTeachers.length;
  const ratio = totalTeachers > 0 ? `1:${Math.round(totalStudents / totalTeachers)}` : '1:24';

  const stemCount = activeStudents.filter(s => (s.strand || '').toUpperCase().includes('STEM')).length;
  const humssCount = activeStudents.filter(s => (s.strand || '').toUpperCase().includes('HUMSS')).length;
  const abmCount = activeStudents.filter(s => (s.strand || '').toUpperCase().includes('ABM')).length;
  const tvlCount = activeStudents.filter(s => (s.strand || '').toUpperCase().includes('TVL') || (s.strand || '').toUpperCase().includes('ICT')).length;
  const secCount = typeof managedSections !== 'undefined' ? managedSections.length : 12;

  let csv = 'HAVEN OF WISDOM ACADEMY - INSTITUTIONAL CENSUS & CLASS RECORD DASHBOARD\n';
  csv += 'Generated Date: ' + new Date().toLocaleString() + '\n';
  csv += 'Current Academic Year: S.Y. 2026-2027\n\n';

  csv += '--- LONGITUDINAL ENROLMENT & FACULTY COMPARATIVE CENSUS ---\n';
  csv += 'Academic Year,Status,Total Students,Active Teachers,Student-Teacher Ratio,Sections,STEM,HUMSS,ABM,TVL/ICT,Passing Rate,YoY Growth\n';
  let savedHistoricalArchives = [];
  try {
    const raw = localStorage.getItem('scholaria_historical_census_archives');
    if (raw) savedHistoricalArchives = JSON.parse(raw);
  } catch (_) {}
  savedHistoricalArchives.forEach(h => {
    csv += `"${h.year}","${h.status || 'Finalized'}",${h.students},${h.teachers},"${h.ratio}",${h.sections},${h.stem},${h.humss},${h.abm},${h.tvl},"${h.passingRate}","${h.growth}"\n`;
  });
  csv += `S.Y. 2026-2027 (Current),Active Current,${totalStudents},${totalTeachers},${ratio},${secCount},${stemCount},${humssCount},${abmCount},${tvlCount},${typeof overallPassingRate !== 'undefined' ? overallPassingRate : 'N/A'},Active\n\n`;

  csv += '--- CURRENT ACADEMIC YEAR SECTION ROSTER CENSUS ---\n';
  csv += 'Section Name,Grade Level,Strand,Class Adviser,Enrolled Students,Capacity Limit,Utilization\n';
  (typeof managedSections !== 'undefined' ? managedSections : []).forEach(sec => {
    const enrolled = activeStudents.filter(s => (s.section || '').trim().toLowerCase() === sec.name.trim().toLowerCase()).length;
    csv += `"${sec.name}","${sec.gradeLevel || 'Grade 11'}","${sec.strand || 'STEM'}","${sec.adviser || 'Department Faculty'}",${enrolled},45,${Math.round((enrolled / 45) * 100)}%\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Scholaria_Admin_Census_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast('Institutional Census exported to CSV', 'success');
}

function printAdminCensus() {
  const prevTitle = document.title;
  document.title = 'Haven_of_Wisdom_Academy_Official_Census_SY2026_2027';
  window.print();
  setTimeout(() => { document.title = prevTitle; }, 1200);
}

function renderAdminClassRecordCensus() {
  if (typeof ROLE !== 'undefined' && ROLE !== 'admin') {
    return `
      <div style="padding:60px 20px;text-align:center;">
        <div style="width:58px;height:58px;border-radius:14px;background:#fee2e2;color:#dc2626;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 style="font-size:18px;font-weight:700;color:#1e293b;">Access Restricted</h3>
        <p style="font-size:13.5px;color:#64748b;max-width:440px;margin:8px auto 0;">The Institutional Census is restricted strictly to Administrators.</p>
      </div>
    `;
  }

  const allUsers = typeof registeredUsers !== 'undefined' ? registeredUsers : [];
  const activeStudents = allUsers.filter(u => u.role === 'student');
  const activeTeachers = allUsers.filter(u => u.role === 'teacher');
  const activeAdmins = allUsers.filter(u => u.role === 'admin');

  const currentYearTotalStudents = activeStudents.length;
  const currentYearTotalTeachers = activeTeachers.length;
  const currentYearRatio = currentYearTotalTeachers > 0
    ? `1 : ${Math.max(1, Math.round(currentYearTotalStudents / currentYearTotalTeachers))}`
    : '—';

  // Strand breakdown for current year
  const strandCounts = { STEM: 0, HUMSS: 0, ABM: 0, TVL: 0, GAS: 0 };
  activeStudents.forEach(s => {
    const raw = (s.strand || '').toUpperCase();
    if (raw.includes('STEM')) strandCounts.STEM++;
    else if (raw.includes('HUMSS')) strandCounts.HUMSS++;
    else if (raw.includes('ABM')) strandCounts.ABM++;
    else if (raw.includes('TVL') || raw.includes('ICT')) strandCounts.TVL++;
    else strandCounts.GAS++;
  });

  // Grade level breakdown
  const gr11Count = activeStudents.filter(s => (s.grade_level || s.grade || '').includes('11')).length;
  const gr12Count = activeStudents.filter(s => (s.grade_level || s.grade || '').includes('12')).length;
  const otherGradeCount = Math.max(0, activeStudents.length - (gr11Count + gr12Count));

  // Real Passing Rate calculated from student performance
  const allEntries = typeof buildRealClassRecordEntries === 'function' ? buildRealClassRecordEntries() : [];
  const validAvgs = allEntries.map(e => e.avg).filter(a => a !== null && !isNaN(a));
  const passingStudentsCount = validAvgs.filter(a => a >= 75).length;
  const overallPassingRate = validAvgs.length ? `${Math.round((passingStudentsCount / validAvgs.length) * 100)}%` : '—';

  // Real Archived Historical Census (if previously archived in the system)
  let savedHistoricalArchives = [];
  try {
    const raw = localStorage.getItem('scholaria_historical_census_archives');
    if (raw) savedHistoricalArchives = JSON.parse(raw);
  } catch (_) {}

  const currentYearEntry = {
    year: 'S.Y. 2026–2027',
    isCurrent: true,
    students: currentYearTotalStudents,
    teachers: currentYearTotalTeachers,
    ratio: currentYearRatio,
    sections: (typeof managedSections !== 'undefined' ? managedSections.length : 0),
    stem: strandCounts.STEM,
    humss: strandCounts.HUMSS,
    abm: strandCounts.ABM,
    tvl: strandCounts.TVL,
    passingRate: overallPassingRate,
    growth: 'Active S.Y.',
    growthClass: 'high',
    status: 'Current Active'
  };

  const historicalCensus = [...savedHistoricalArchives, currentYearEntry];
  const maxYearStudents = Math.max(...historicalCensus.map(h => h.students), 10);

  // Section summary metrics
  const sectionsList = typeof managedSections !== 'undefined' ? managedSections : [];
  const secCensusRows = sectionsList.map(sec => {
    const enrolled = activeStudents.filter(s => (s.section || '').trim().toLowerCase() === sec.name.trim().toLowerCase()).length;
    const capacity = 45;
    const utilPct = Math.min(100, Math.round((enrolled / capacity) * 100));
    return {
      name: sec.name,
      gradeLevel: sec.gradeLevel || 'Grade 11',
      strand: sec.strand || 'STEM',
      adviser: sec.adviser || 'Department Adviser',
      enrolled,
      capacity,
      utilPct
    };
  });

  return `
    <div class="admin-census-page" style="display:flex;flex-direction:column;gap:22px;">
      <!-- EXECUTIVE HEADER & ACTION BAR -->
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 65%,#0284c7 100%);padding:26px 30px;border-radius:20px;color:#ffffff;box-shadow:0 8px 30px rgba(15,23,42,0.18);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:18px;">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span style="background:rgba(217,119,6,0.22);color:#fbbf24;border:1px solid rgba(245,158,11,0.4);padding:3px 10px;border-radius:50px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">
              ADMIN RESTRICTED · INSTITUTIONAL CENSUS
            </span>
            <span style="background:rgba(16,185,129,0.22);color:#34d399;border:1px solid rgba(16,185,129,0.35);padding:3px 10px;border-radius:50px;font-size:11px;font-weight:700;">
              S.Y. 2026–2027 Active
            </span>
          </div>
          <h2 style="font-size:24px;font-weight:800;margin:0 0 4px 0;letter-spacing:-0.02em;color:#ffffff;">
            Overall Institutional Census
          </h2>
          <p style="font-size:13px;color:#94a3b8;margin:0;max-width:620px;line-height:1.5;">
            Official senior high school institutional census, longitudinal student enrolment trends across all academic years, active faculty counts, and section allocations.
          </p>
        </div>

        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <button type="button" class="foot-btn-secondary" style="background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.2);display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:10px;font-weight:600;font-size:13px;backdrop-filter:blur(6px);" onclick="exportAdminCensusCSV()">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Census CSV
          </button>
          <button type="button" class="add-btn" style="background:#0284c7;color:#fff;border:none;display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;font-weight:700;font-size:13px;box-shadow:0 4px 14px rgba(2,132,199,0.35);" onclick="printAdminCensus()">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Institutional Census
          </button>
        </div>
      </div>

      <!-- CURRENT ACADEMIC YEAR (S.Y. 2026-2027) KEY METRIC TILES -->
      <div class="card-grid">
        <div class="info-card">
          <div class="ic-head">
            <div class="ic-icon" style="background:#0284c7;">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div>
              <div class="ic-sub">Current S.Y. Students</div>
              <div class="ic-num" style="color:#0284c7;">${currentYearTotalStudents}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:2px;">
            <span style="color:var(--text-muted);">S.Y. 2026–2027 Enrolled</span>
            <span style="color:#059669;background:#dcfce7;font-weight:700;padding:2px 7px;border-radius:6px;font-size:11px;">Active Headcount</span>
          </div>
        </div>

        <div class="info-card">
          <div class="ic-head">
            <div class="ic-icon gold">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <div>
              <div class="ic-sub">Active Faculty Members</div>
              <div class="ic-num gold">${currentYearTotalTeachers}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:2px;">
            <span style="color:var(--text-muted);">Senior High Instructors</span>
            <span style="color:#b45309;background:#fef3c7;font-weight:700;padding:2px 7px;border-radius:6px;font-size:11px;">Ratio ${currentYearRatio}</span>
          </div>
        </div>

        <div class="info-card">
          <div class="ic-head">
            <div class="ic-icon green">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <div>
              <div class="ic-sub">Active Class Sections</div>
              <div class="ic-num green">${sectionsList.length}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:2px;">
            <span style="color:var(--text-muted);">Grade 11 & Grade 12</span>
            <span style="color:#047857;background:#ecfdf5;font-weight:700;padding:2px 7px;border-radius:6px;font-size:11px;">100% Assigned</span>
          </div>
        </div>

        <div class="info-card">
          <div class="ic-head">
            <div class="ic-icon purple">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <div class="ic-sub">Passing & Retention</div>
              <div class="ic-num" style="color:#7c3aed;">${overallPassingRate}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-top:2px;">
            <span style="color:var(--text-muted);">Academic Performance</span>
            <span style="color:#6d28d9;background:#f5f3ff;font-weight:700;padding:2px 7px;border-radius:6px;font-size:11px;">DepEd Standard</span>
          </div>
        </div>
      </div>

      <!-- LONGITUDINAL COMPARATIVE BREAKDOWN OF PREVIOUS YEARS -->
      <div style="background:#ffffff;border:1.5px solid var(--blue-light);border-radius:18px;padding:24px;box-shadow:var(--shadow);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:#0284c7;font-size:18px;">📈</span>
              <h3 style="font-size:17px;font-weight:800;color:var(--text-primary);margin:0;">
                Comparative Longitudinal Enrolment Breakdown
              </h3>
            </div>
            <p style="font-size:12.5px;color:var(--text-secondary);margin:4px 0 0 0;">
              Longitudinal institutional audit comparing enrolment records, faculty counts, and academic metrics across academic years.
            </p>
          </div>
          <span style="font-size:12px;color:var(--text-muted);font-weight:600;background:#f8fafc;padding:5px 12px;border-radius:8px;border:1px solid #e2e8f0;">
            ${savedHistoricalArchives.length > 0 ? `${historicalCensus.length}-Year Comparative Range` : 'Current Academic Year'}
          </span>
        </div>

        ${savedHistoricalArchives.length === 0 ? `
          <div style="background:#f8fafc;border-radius:14px;padding:22px;border:1.5px dashed #cbd5e1;margin-bottom:20px;text-align:center;color:var(--text-muted);">
            <div style="font-size:24px;margin-bottom:6px;">📊</div>
            <strong style="font-size:13.5px;color:var(--text-primary);display:block;margin-bottom:4px;">Current Academic Year (S.Y. 2026–2027) Active</strong>
            <p style="font-size:12px;max-width:540px;margin:0 auto;">Longitudinal year-over-year comparisons will automatically generate as each subsequent academic year concludes and is archived.</p>
          </div>
        ` : `
          <!-- VISUAL GROWTH BAR PROGRESSION -->
          <div style="background:#f8fafc;border-radius:14px;padding:16px 20px;border:1px solid #e2e8f0;margin-bottom:20px;display:flex;flex-direction:column;gap:12px;">
            ${historicalCensus.map(h => {
              const pct = Math.round((h.students / maxYearStudents) * 100);
              return `
                <div>
                  <div style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;margin-bottom:5px;">
                    <span style="font-weight:700;color:${h.isCurrent ? '#0284c7' : '#1e293b'};display:inline-flex;align-items:center;gap:6px;">
                      ${escHtml(h.year)}
                      ${h.isCurrent ? '<span style="font-size:10px;background:#0284c7;color:#fff;padding:1px 6px;border-radius:4px;font-weight:700;">CURRENT</span>' : ''}
                    </span>
                    <span style="font-weight:700;color:#0f172a;">
                      ${h.students} Students <span style="font-weight:500;color:var(--text-muted);">(${h.growth})</span>
                    </span>
                  </div>
                  <div style="height:10px;background:#e2e8f0;border-radius:6px;overflow:hidden;position:relative;">
                    <div style="height:100%;width:${pct}%;background:${h.isCurrent ? 'linear-gradient(90deg,#0284c7,#38bdf8)' : '#94a3b8'};border-radius:6px;transition:width 0.4s ease;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        <!-- FULL COMPARATIVE AUDIT TABLE -->
        <div class="score-table score-table-responsive" style="box-shadow:none;border-radius:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%;">
          <table style="min-width:1180px;width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="white-space:nowrap;">Academic Year</th>
                <th style="white-space:nowrap;">Total Enrolment</th>
                <th style="white-space:nowrap;">YoY Trend</th>
                <th style="white-space:nowrap;">Faculty</th>
                <th style="white-space:nowrap;">Student-Teacher Ratio</th>
                <th style="white-space:nowrap;">Sections</th>
                <th style="white-space:nowrap;">STEM</th>
                <th style="white-space:nowrap;">HUMSS</th>
                <th style="white-space:nowrap;">ABM</th>
                <th style="white-space:nowrap;">TVL/ICT</th>
                <th style="white-space:nowrap;">Passing Rate</th>
                <th style="white-space:nowrap;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${historicalCensus.map(h => `
                <tr style="${h.isCurrent ? 'background:#f0f9ff;font-weight:600;' : ''}">
                  <td style="white-space:nowrap;">
                    <strong style="color:${h.isCurrent ? '#0284c7' : '#0f172a'};">${escHtml(h.year)}</strong>
                    ${h.isCurrent ? ' <span style="font-size:10.5px;color:#0284c7;font-weight:700;">(Active)</span>' : ''}
                  </td>
                  <td style="white-space:nowrap;"><strong style="font-size:14px;color:#0f172a;">${h.students}</strong></td>
                  <td style="white-space:nowrap;">
                    <span style="font-size:11.5px;font-weight:700;color:${h.isCurrent || h.growth.startsWith('+') ? '#059669' : '#64748b'};background:${h.isCurrent || h.growth.startsWith('+') ? '#dcfce7' : '#f1f5f9'};padding:2px 7px;border-radius:6px;white-space:nowrap;">
                      ${h.growth}
                    </span>
                  </td>
                  <td style="white-space:nowrap;"><strong>${h.teachers}</strong> faculty</td>
                  <td style="white-space:nowrap;">${h.ratio}</td>
                  <td style="white-space:nowrap;"><strong>${h.sections}</strong></td>
                  <td style="white-space:nowrap;">${h.stem}</td>
                  <td style="white-space:nowrap;">${h.humss}</td>
                  <td style="white-space:nowrap;">${h.abm}</td>
                  <td style="white-space:nowrap;">${h.tvl}</td>
                  <td class="score-val good" style="white-space:nowrap;">${h.passingRate}</td>
                  <td style="white-space:nowrap;">
                    <span class="status-pill ${h.isCurrent ? 'active' : 'done'}" style="font-size:11px;white-space:nowrap;">
                      ${escHtml(h.status)}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- TWO-COLUMN INSTITUTIONAL DEMOGRAPHICS & CENSUS BREAKDOWN -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <!-- CARD 1: CENSUS BY ACADEMIC STRAND -->
        <div style="background:#ffffff;border:1.5px solid var(--blue-light);border-radius:18px;padding:22px;box-shadow:var(--shadow);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:#d97706;font-size:18px;">🏛️</span>
              <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0;">Current Census by Academic Strand</h3>
            </div>
            <span style="font-size:11.5px;color:var(--text-muted);font-weight:600;">S.Y. 2026–2027</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:14px;">
            ${[
              { name: 'STEM', label: 'Science, Technology, Engineering & Math', count: strandCounts.STEM, color: '#0284c7' },
              { name: 'HUMSS', label: 'Humanities & Social Sciences', count: strandCounts.HUMSS, color: '#8b5cf6' },
              { name: 'ABM', label: 'Accountancy, Business & Management', count: strandCounts.ABM, color: '#f59e0b' },
              { name: 'TVL/ICT', label: 'Technical-Vocational-Livelihood (ICT)', count: strandCounts.TVL, color: '#10b981' },
              { name: 'GAS', label: 'General Academic Strand / Other', count: strandCounts.GAS, color: '#64748b' }
            ].map(st => {
              const pct = currentYearTotalStudents > 0 ? Math.round((st.count / currentYearTotalStudents) * 100) : 0;
              return `
                <div>
                  <div style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;margin-bottom:4px;">
                    <div>
                      <strong style="color:#0f172a;">${escHtml(st.name)}</strong>
                      <span style="color:var(--text-muted);font-size:11.5px;margin-left:6px;">${escHtml(st.label)}</span>
                    </div>
                    <span style="font-weight:700;color:${st.color};">${st.count} students (${pct}%)</span>
                  </div>
                  <div style="height:8px;background:#f1f5f9;border-radius:6px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${st.color};border-radius:6px;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- CARD 2: GRADE LEVEL & FACULTY DISTRIBUTION -->
        <div style="background:#ffffff;border:1.5px solid var(--blue-light);border-radius:18px;padding:22px;box-shadow:var(--shadow);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:#059669;font-size:18px;">🎓</span>
              <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0;">Grade Level Headcount & Faculty Density</h3>
            </div>
            <span style="font-size:11.5px;color:var(--text-muted);font-weight:600;">DepEd SHS Division</span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div style="background:#f8fafc;padding:14px;border-radius:12px;border:1px solid #e2e8f0;text-align:center;">
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Grade 11 Enrolment</div>
              <div style="font-size:24px;font-weight:800;color:#0284c7;margin:4px 0;">${gr11Count}</div>
              <span style="font-size:11px;color:var(--text-muted);">${currentYearTotalStudents > 0 ? Math.round((gr11Count / currentYearTotalStudents) * 100) : 0}% of institutional total</span>
            </div>

            <div style="background:#f8fafc;padding:14px;border-radius:12px;border:1px solid #e2e8f0;text-align:center;">
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Grade 12 Enrolment</div>
              <div style="font-size:24px;font-weight:800;color:#059669;margin:4px 0;">${gr12Count}</div>
              <span style="font-size:11px;color:var(--text-muted);">${currentYearTotalStudents > 0 ? Math.round((gr12Count / currentYearTotalStudents) * 100) : 0}% of institutional total</span>
            </div>
          </div>

          <div style="border-top:1px solid #f1f5f9;padding-top:14px;">
            <h4 style="font-size:13px;font-weight:700;color:var(--text-primary);margin:0 0 8px 0;">Active Teaching Faculty Deployment:</h4>
            <div style="display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--text-secondary);">
              <div style="display:flex;justify-content:space-between;">
                <span>Total Active Teachers:</span>
                <strong style="color:#0f172a;">${currentYearTotalTeachers} Full-time Faculty</strong>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span>Institutional Student-to-Teacher Ratio:</span>
                <strong style="color:#0284c7;">${currentYearRatio}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span>System Administrators:</span>
                <strong style="color:#b45309;">${activeAdmins.length} Super Admins</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CLASS SECTION CENSUS & CAPACITY UTILIZATION TABLE -->
      <div style="background:#ffffff;border:1.5px solid var(--blue-light);border-radius:18px;padding:24px;box-shadow:var(--shadow);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <h3 style="font-size:16.5px;font-weight:800;color:var(--text-primary);margin:0 0 2px 0;">
              Class Section Enrolment & Capacity Census
            </h3>
            <span style="font-size:12px;color:var(--text-muted);">
              Official distribution of learners per section against DepEd maximum capacity of 45 students
            </span>
          </div>
        </div>

        <div class="score-table score-table-responsive" style="box-shadow:none;border-radius:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%;">
          <table style="min-width:920px;width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="white-space:nowrap;">Section</th>
                <th style="white-space:nowrap;">Grade Level & Strand</th>
                <th style="white-space:nowrap;">Class Adviser</th>
                <th style="white-space:nowrap;">Enrolled Headcount</th>
                <th style="white-space:nowrap;">Capacity Utilization (Max: 45)</th>
                <th style="white-space:nowrap;">Official Master Sheet</th>
              </tr>
            </thead>
            <tbody>
              ${secCensusRows.length ? secCensusRows.map(s => `
                <tr>
                  <td style="white-space:nowrap;">
                    <strong><span class="user-role-badge student" style="font-size:12.5px;padding:3px 9px;white-space:nowrap;">${escHtml(s.name)}</span></strong>
                  </td>
                  <td style="white-space:nowrap;">${escHtml(s.gradeLevel)} · <span class="role-tag student" style="white-space:nowrap;">${escHtml(s.strand)}</span></td>
                  <td style="white-space:nowrap;">${escHtml(s.adviser)}</td>
                  <td style="white-space:nowrap;"><strong>${s.enrolled}</strong> students</td>
                  <td style="white-space:nowrap;">
                    <div style="display:flex;align-items:center;gap:8px;white-space:nowrap;">
                      <div style="flex:1;height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden;min-width:80px;max-width:140px;">
                        <div style="height:100%;width:${s.utilPct}%;background:${s.utilPct > 90 ? '#dc2626' : s.utilPct > 75 ? '#0284c7' : '#059669'};border-radius:4px;"></div>
                      </div>
                      <span style="font-size:11.5px;font-weight:700;color:${s.utilPct > 90 ? '#dc2626' : '#475569'};white-space:nowrap;">${s.utilPct}% (${s.enrolled}/45)</span>
                    </div>
                  </td>
                  <td style="white-space:nowrap;">
                    <button class="table-act-btn take" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;font-size:12px;white-space:nowrap;" onclick="openSectionReportModal('${escHtml(s.name)}')">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      Print Master Sheet
                    </button>
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);white-space:nowrap;">No sections configured in the census yet.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
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
          <button class="cw-back-btn" id="cwBackBtn" title="Back to conversations" aria-label="Back to conversations" onclick="closeConversation()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
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
window.currentPage = 'dashboard';
let materialsPollTimer = null;

function renderPage(page) {
  currentPage = page;
  window.currentPage = page;
  if (page === 'materials') {
    if (typeof setActiveSubjectMaterials === 'function') {
      setActiveSubjectMaterials(null, null, false);
    } else {
      window.activeSubjectFilter = null;
      window.activeSubjectSection = null;
    }
  }
  document.querySelectorAll('.menu-item').forEach(i => {
    if (i.dataset.page === page) i.classList.add('active');
    else i.classList.remove('active');
  });
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;
  mainContent.dataset.page = page;
  mainContent.innerHTML = getPageContent(ROLE, page);
  if (page === 'dashboard') mainContent.insertAdjacentHTML('beforeend', renderDashboardCalendarBanner());
  const fab = document.getElementById('chatFab');
  if (fab) fab.style.display = (page === 'chats') ? 'none' : 'flex';

  if (page === 'users' || page === 'classrec') loadUsersFromDB();
  if (page === 'classrec') loadClassRecAttempts();
  if (page === 'quiz') loadQuizzesFromDB();
  if (page === 'quizzes' || page === 'progress') { loadQuizzesFromDB(); loadMyAttemptsFromDB(); }
  if (page === 'analysis') loadQuizzesFromDB();
  if (page === 'chats') loadChatsPage();
  if (page === 'dashboard') {
    if (ROLE === 'teacher' || ROLE === 'admin') {
      loadMaterialsFromDB();
      loadQuizzesFromDB();
      if (ROLE === 'teacher' && typeof loadClassRecAttempts === 'function') loadClassRecAttempts();
    }
    if (typeof loadUsersFromDB === 'function') loadUsersFromDB();
    if (ROLE === 'student') { loadMaterialsFromDB(); loadQuizzesFromDB(); loadMyAttemptsFromDB(); }
  }

  clearInterval(materialsPollTimer);
  materialsPollTimer = null;
  if (page === 'materials' || page === 'approval') {
    loadMaterialsFromDB();
    if (page === 'approval') {
      if (typeof loadQuizzesFromDB === 'function') loadQuizzesFromDB();
      if (typeof loadUsersFromDB === 'function') loadUsersFromDB();
    }
    materialsPollTimer = setInterval(() => {
      loadMaterialsFromDB();
      if (currentPage === 'approval' && typeof loadQuizzesFromDB === 'function') {
        loadQuizzesFromDB();
      }
    }, 15000);
  }
}

/* ── NAVIGATION LISTENERS ── */
document.addEventListener('DOMContentLoaded', () => {
  // Wrapped banner text must reserve its actual height above the navigation.
  const bannerSelectors = ['.demo-mode-banner', '.emergency-top-banner'];
  const bannerProperties = ['--banner-h', '--anc-banner-h'];
  const observedBanners = new Set();
  const bannerResizeObserver = new ResizeObserver(syncBannerHeights);
  function syncBannerHeights() {
    const banners = bannerSelectors.map(selector => document.querySelector(selector));
    for (const banner of observedBanners) {
      if (!banners.includes(banner)) {
        bannerResizeObserver.unobserve(banner);
        observedBanners.delete(banner);
      }
    }
    banners.forEach((banner, index) => {
      if (banner && !observedBanners.has(banner)) {
        bannerResizeObserver.observe(banner);
        observedBanners.add(banner);
      }
      const height = banner ? Math.ceil(banner.getBoundingClientRect().height) : 0;
      document.body.style.setProperty(bannerProperties[index], `${height}px`);
    });
  }
  const bannerMutationObserver = new MutationObserver(syncBannerHeights);
  bannerMutationObserver.observe(document.body, { childList: true });
  const bannerContainer = document.getElementById('emergencyBannerContainer');
  if (bannerContainer) bannerMutationObserver.observe(bannerContainer, { childList: true, subtree: true });
  syncBannerHeights();

  const sidebarMenu = document.getElementById('sidebarMenu');
  const toggleBtn = document.getElementById('hamburger-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  function openMobileSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
    document.body.classList.add('mobile-menu-open');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('mobile-menu-open');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(window.innerWidth > 900 && !sidebar?.classList.contains('closed')));
  }

  const mobileLayout = window.matchMedia('(max-width: 900px)');
  mobileLayout.addEventListener('change', closeMobileSidebar);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar?.classList.contains('open')) {
      closeMobileSidebar();
      toggleBtn?.focus();
    }
  });
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-controls', 'sidebar');
    toggleBtn.setAttribute('aria-expanded', String(window.innerWidth > 900 && !sidebar?.classList.contains('closed')));
    toggleBtn.setAttribute('aria-label', 'Toggle navigation');
  }

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.innerWidth <= 900) {
        if (sidebar.classList.contains('open')) {
          closeMobileSidebar();
        } else {
          openMobileSidebar();
        }
      } else {
        sidebar.classList.toggle('closed');
        toggleBtn.setAttribute('aria-expanded', String(!sidebar.classList.contains('closed')));
      }
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeMobileSidebar);
  }

  if (sidebarMenu) {
    sidebarMenu.addEventListener('click', e => {
      const item = e.target.closest('.menu-item[data-page]');
      if (!item) return;
      e.preventDefault();
      document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      if (item.dataset.page === 'materials') {
        if (typeof setActiveSubjectMaterials === 'function') {
          setActiveSubjectMaterials(null, null, false);
        } else {
          window.activeSubjectFilter = null;
          window.activeSubjectSection = null;
        }
      }
      renderPage(item.dataset.page);
      if (window.innerWidth <= 900) {
        closeMobileSidebar();
      }
    });
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

