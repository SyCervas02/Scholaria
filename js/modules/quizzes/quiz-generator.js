/* ── SYSTEM QUIZ GENERATOR & MANAGEMENT MODULE ── */

const QUIZ_API_ENDPOINT = typeof API_BASE !== 'undefined' ? `${API_BASE}/api/quiz/generate` : 'http://localhost:3001/api/quiz/generate';
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

let customQuizzes = [];
let isFetchingQuizzes = false;
let currentQuizGenToken = 0;
let isSavingQuiz = false;

async function loadQuizzesFromDB() {
  if (isFetchingQuizzes) return;
  isFetchingQuizzes = true;
  try {
    const { data, error } = await db.from('quizzes').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Failed to load quizzes:', error.message); return; }
    customQuizzes = (data || []).map(q => {
      const firstQ = (q.questions && q.questions[0]) || {};
      const qMeta = firstQ._meta || {};
      const quizType = q.quiz_type || q.type || firstQ._quizType || qMeta.quizType || 'standard';
      const timerPerQuestion = q.timer_per_question || firstQ._timerPerQuestion || qMeta.timerPerQuestion || 0;
      const timeLimitMinutes = q.time_limit_minutes || firstQ._timeLimitMinutes || qMeta.timeLimitMinutes || 0;
      return {
        id: q.id,
        createdBy: q.created_by,
        subject: q.subject,
        strand: q.strand,
        sections: q.sections || qMeta.sections || null,
        lesson: q.lesson || qMeta.lesson || '',
        dueDate: q.due_date || qMeta.dueDate || null,
        due_date: q.due_date || qMeta.dueDate || null,
        gradeLevel: q.grade_level,
        grade_level: q.grade_level,
        createdAt: q.created_at,
        title: q.title + (q.is_demo ? ' (Demo)' : ''),
        type: quizType,
        quiz_type: quizType,
        timerPerQuestion: timerPerQuestion,
        timeLimitMinutes: timeLimitMinutes,
        meta: q.is_demo
          ? `${q.subject || 'General'} · ${(q.questions||[]).length} items · Sample data`
          : `${[q.subject || 'General', q.strand].filter(Boolean).join(' · ')} · ${(q.questions||[]).length} items · ${quizType === 'interactive' ? '🎮 Interactive · ' : (timeLimitMinutes > 0 ? `⏱️ ${timeLimitMinutes}m · ` : '')}${q.status || 'active'}`,
        isDemo: q.is_demo,
        status: q.status || 'active',
        questions: q.questions || []
      };
    });
  } finally {
    isFetchingQuizzes = false;
  }
  if (typeof currentPage !== 'undefined' && (currentPage === 'dashboard' || currentPage === 'quizzes' || currentPage === 'progress' || currentPage === 'quiz' || currentPage === 'analysis' || currentPage === 'approval')) {
    const mainContent = document.getElementById('mainContent');
    if (mainContent && typeof getPageContent === 'function') {
      mainContent.innerHTML = getPageContent(ROLE, currentPage);
    }
  }
  if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
  if (typeof renderMaterialsContainer === 'function') renderMaterialsContainer();
}

const quizGen = {
  wizardStep: 1,
  step: 'setup', type: 'standard', 
  file: null, 
  files: [], 
  totalSizeBytes: 0,
  fileText: '',
  title: '', subject: '', 
  formats: new Set(['mc', 'id']),
  optionsCount: 4, // 2 to 6 choices for MC
  count: 'auto',
  customCount: '',
  distributionMode: 'balanced', // 'balanced' or 'custom'
  formatCounts: { mc: 5, tf: 5, id: 5, match: 2 },
  strands: new Set(), 
  sections: new Set(),
  gradeLevel: 'Grade 11',
  lesson: '',
  dueDate: '',
  timerPerQuestion: 30, // 0 = untimed, or 15, 30, 45, 60
  timeLimitMinutes: 15, // 0 = untimed, or 5, 10, 15, 20, 30, 45, 60
  questions: [], 
  editingId: null,
  errorMsg: ''
};

function nextQuizStep() {
  if (validateQuizStep(quizGen.wizardStep)) {
    if (quizGen.wizardStep === 4 && (!quizGen.questions || quizGen.questions.length === 0)) {
      generateQuiz();
      return;
    }
    quizGen.wizardStep = Math.min(5, quizGen.wizardStep + 1);
    renderQuizModal();
  }
}

function prevQuizStep() {
  quizGen.wizardStep = Math.max(1, quizGen.wizardStep - 1);
  renderQuizModal();
}

function goToQuizStep(targetStep) {
  if (targetStep === quizGen.wizardStep) return;
  if (targetStep < quizGen.wizardStep) {
    quizGen.wizardStep = targetStep;
    renderQuizModal();
    return;
  }
  for (let s = quizGen.wizardStep; s < targetStep; s++) {
    if (!validateQuizStep(s)) {
      quizGen.wizardStep = s;
      renderQuizModal();
      return;
    }
  }
  quizGen.wizardStep = targetStep;
  renderQuizModal();
}

function validateQuizStep(step) {
  if (step === 1) {
    if (!quizGen.type) {
      quizGen.type = 'standard';
    }
    return true;
  }
  if (step === 2) {
    if (!quizGen.title || !quizGen.title.trim()) {
      showToast('Please enter a Quiz Title to proceed', 'warning');
      const el = document.getElementById('quizGenTitleInput');
      if (el) el.focus();
      return false;
    }
    if (!quizGen.subject) {
      showToast('Please select a Subject to proceed', 'warning');
      const el = document.getElementById('quizGenSubjectSelect');
      if (el) el.focus();
      return false;
    }
    return true;
  }
  if (step === 3) {
    if (!quizGen.formats || quizGen.formats.size === 0) {
      showToast('Please select at least one question format', 'warning');
      return false;
    }
    if (quizGen.distributionMode === 'custom') {
      let sum = 0;
      quizGen.formats.forEach(f => { sum += (quizGen.formatCounts[f] || 0); });
      if (sum <= 0) {
        showToast('Please set at least 1 question item count for your custom distribution', 'warning');
        return false;
      }
    }
    return true;
  }
  if (step === 4) {
    if ((!quizGen.files || quizGen.files.length === 0) && !quizGen.file) {
      showToast('Please upload at least one material file first', 'error');
      return false;
    }
    if (!quizGen.questions || quizGen.questions.length === 0) {
      showToast('Please click Generate Questions first to preview questions', 'warning');
      return false;
    }
    return true;
  }
  return true;
}

function setStandardTimeLimit(mins) {
  quizGen.timeLimitMinutes = mins;
  renderQuizModal();
}

function adjustStandardTimeLimit(delta) {
  const cur = parseInt(quizGen.timeLimitMinutes) || 0;
  quizGen.timeLimitMinutes = Math.max(0, Math.min(180, cur + delta));
  renderQuizModal();
}

function updateStandardTimeLimitInput(val) {
  if (val === '') {
    quizGen.timeLimitMinutes = 0;
  } else {
    quizGen.timeLimitMinutes = Math.max(0, Math.min(180, parseInt(val) || 0));
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getQuizDueDateParts() {
  const now = new Date();
  const currentYear = now.getFullYear();
  let selectedYear = currentYear;
  let selectedMonth = now.getMonth(); // 0-11
  let selectedDay = now.getDate();
  let selectedTime = '23:59';

  if (quizGen.dueDate) {
    const d = new Date(quizGen.dueDate);
    if (!isNaN(d.getTime())) {
      selectedYear = d.getFullYear();
      selectedMonth = d.getMonth();
      selectedDay = d.getDate();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      selectedTime = `${hh}:${mm}`;
    }
  }

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  if (selectedDay > daysInMonth) selectedDay = daysInMonth;

  return { currentYear, selectedYear, selectedMonth, selectedDay, selectedTime, daysInMonth };
}

function setDeadlinePreset(type) {
  if (type === 'none') {
    quizGen.dueDate = '';
    renderQuizModal();
    return;
  }
  const now = new Date();
  let target = new Date();
  if (type === 'today') {
    target.setHours(23, 59, 0, 0);
  } else if (type === 'tomorrow') {
    target.setDate(target.getDate() + 1);
    target.setHours(23, 59, 0, 0);
  } else if (type === '3days') {
    target.setDate(target.getDate() + 3);
    target.setHours(23, 59, 0, 0);
  } else if (type === '1week') {
    target.setDate(target.getDate() + 7);
    target.setHours(23, 59, 0, 0);
  }

  const currentYear = now.getFullYear();
  if (target.getFullYear() > currentYear) {
    target = new Date(currentYear, 11, 31, 23, 59, 0);
  }

  const tzOffset = target.getTimezoneOffset() * 60000;
  quizGen.dueDate = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16);
  renderQuizModal();
}

function updateQuizMonthPart(mIdx) {
  const m = parseInt(mIdx, 10);
  const { selectedYear, selectedDay, selectedTime } = getQuizDueDateParts();
  const daysInMonth = new Date(selectedYear, m + 1, 0).getDate();
  const safeDay = Math.min(selectedDay, daysInMonth);
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(safeDay).padStart(2, '0');
  updateQuizDueDate(`${selectedYear}-${mm}-${dd}T${selectedTime}`);
}

function updateQuizDayPart(dNum) {
  const d = parseInt(dNum, 10);
  const { selectedYear, selectedMonth, selectedTime } = getQuizDueDateParts();
  const mm = String(selectedMonth + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  updateQuizDueDate(`${selectedYear}-${mm}-${dd}T${selectedTime}`);
}

function updateQuizYearPart(yNum) {
  const y = parseInt(yNum, 10);
  const { selectedMonth, selectedDay, selectedTime } = getQuizDueDateParts();
  const mm = String(selectedMonth + 1).padStart(2, '0');
  const dd = String(selectedDay).padStart(2, '0');
  updateQuizDueDate(`${y}-${mm}-${dd}T${selectedTime}`);
}

function updateQuizTimePart(timeVal) {
  if (!timeVal) timeVal = '23:59';
  const { selectedYear, selectedMonth, selectedDay } = getQuizDueDateParts();
  const mm = String(selectedMonth + 1).padStart(2, '0');
  const dd = String(selectedDay).padStart(2, '0');
  updateQuizDueDate(`${selectedYear}-${mm}-${dd}T${timeVal}`);
}

function updateQuizDueDate(val) {
  if (!val) {
    quizGen.dueDate = '';
    renderQuizModal();
    return;
  }
  const selectedDate = new Date(val);
  const now = new Date();
  const currentYear = now.getFullYear();

  if (selectedDate < now) {
    showToast('Past dates or hours cannot be selected for quiz expiration', 'error');
    quizGen.dueDate = '';
    renderQuizModal();
    return;
  }
  if (selectedDate.getFullYear() > currentYear) {
    showToast(`Quiz deadline is restricted up to the current year (${currentYear}) only`, 'error');
    quizGen.dueDate = '';
    renderQuizModal();
    return;
  }
  quizGen.dueDate = val;
  renderQuizModal();
}

function getTeacherAllowedStrands() {
  const isTeacher = CURRENT_PROFILE && (CURRENT_PROFILE.role === 'teacher' || (typeof ROLE !== 'undefined' && ROLE === 'teacher'));
  if (isTeacher && CURRENT_PROFILE.strand) {
    const strands = CURRENT_PROFILE.strand.split(',').map(s => s.trim()).filter(Boolean);
    if (strands.length > 0) return strands;
  }
  return typeof STRANDS !== 'undefined' ? STRANDS : ['STEM', 'HUMSS', 'ABM', 'TVL'];
}

function getTeacherAllowedGradeLevels() {
  const isTeacher = CURRENT_PROFILE && (CURRENT_PROFILE.role === 'teacher' || (typeof ROLE !== 'undefined' && ROLE === 'teacher'));
  if (isTeacher && (CURRENT_PROFILE.grade_level || CURRENT_PROFILE.gradeLevel)) {
    const grades = (CURRENT_PROFILE.grade_level || CURRENT_PROFILE.gradeLevel).split(',').map(g => g.trim()).filter(Boolean);
    if (grades.length > 0) return grades;
  }
  return typeof GRADE_LEVELS !== 'undefined' ? GRADE_LEVELS : ['Grade 11', 'Grade 12'];
}

function getTeacherAllowedSections() {
  const isTeacher = CURRENT_PROFILE && (CURRENT_PROFILE.role === 'teacher' || (typeof ROLE !== 'undefined' && ROLE === 'teacher'));
  if (isTeacher && CURRENT_PROFILE.section) {
    const sections = CURRENT_PROFILE.section.split(',').map(s => s.trim()).filter(Boolean);
    if (sections.length > 0) return sections;
  }
  return typeof SECTIONS !== 'undefined' ? SECTIONS : ['Section A', 'Section B', 'Section C', 'Section D'];
}

function openQuizModal() {
  const container = document.getElementById('quizMakerContainer');
  const modal = document.getElementById('quizModal');
  
  if (!container && !modal) {
    window.location.href = 'quiz-maker.html';
    return;
  }

  const isTeacher = CURRENT_PROFILE && (CURRENT_PROFILE.role === 'teacher' || (typeof ROLE !== 'undefined' && ROLE === 'teacher'));
  const allowedStrands = getTeacherAllowedStrands();
  const allowedGrades = getTeacherAllowedGradeLevels();
  const allowedSections = getTeacherAllowedSections();

  const defaultSections = (isTeacher && CURRENT_PROFILE && CURRENT_PROFILE.section) 
    ? new Set(allowedSections) 
    : new Set();

  const defaultStrands = (isTeacher && CURRENT_PROFILE && CURRENT_PROFILE.strand)
    ? new Set(allowedStrands)
    : new Set();

  const defaultGrade = (isTeacher && allowedGrades.length) ? allowedGrades[0] : 'Grade 11';

  Object.assign(quizGen, {
    wizardStep: 1,
    step: 'setup', type: 'standard', 
    file: null, 
    files: [], 
    totalSizeBytes: 0,
    fileText: '',
    title: '', subject: '', 
    formats: new Set(['mc', 'id']),
    optionsCount: 4,
    count: 'auto',
    customCount: '',
    distributionMode: 'balanced',
    formatCounts: { mc: 5, tf: 5, id: 5, match: 2 },
    strands: defaultStrands, 
    sections: defaultSections,
    gradeLevel: defaultGrade,
    lesson: '',
    dueDate: '',
    timerPerQuestion: 30,
    timeLimitMinutes: 15,
    questions: [], 
    editingId: null,
    errorMsg: ''
  });

  if (modal) modal.classList.add('active');
  renderQuizModal();
}

function quizModalClose() {
  if (quizGen.step === 'loading') {
    quizGen.step = 'setup';
    quizGen.wizardStep = 4;
    renderQuizModal();
    return;
  }
  closeQuizModal();
}

function closeQuizModal() {
  const modal = document.getElementById('quizModal');
  if (modal) modal.classList.remove('active');
}

if (typeof SUBJECTS_BY_STRAND === 'undefined') {
  window.SUBJECTS_BY_STRAND = {
    STEM: [
      'Pre-Calculus', 'Basic Calculus', 'General Biology 1', 'General Biology 2',
      'General Physics 1', 'General Physics 2', 'General Chemistry 1', 'General Chemistry 2',
      'Empowerment Technologies (ICT)', 'Earth and Life Science', 'Oral Communication in Context',
      'Media & Information Literacy', 'Practical Research 1', 'Practical Research 2',
      'Reading and Writing', 'Statistics and Probability', 'Physical Science'
    ],
    HUMSS: [
      'Creative Writing', 'Creative Nonfiction', 'Philippine Politics and Governance',
      'Disciplines and Ideas in the Social Sciences', 'Disciplines and Ideas in the Applied Social Sciences',
      'Introduction to World Religions and Belief Systems', 'Trends, Networks & Critical Thinking',
      'Community Engagement, Solidarity & Citizenship', 'Oral Communication in Context',
      'Reading and Writing', 'Practical Research 1', 'Practical Research 2',
      'Media & Information Literacy', 'Empowerment Technologies (ICT)', 'Statistics and Probability'
    ],
    ABM: [
      'Business Math', 'Organization and Management',
      'Fundamentals of Accountancy, Business & Management 1', 'Fundamentals of Accountancy, Business & Management 2',
      'Business Finance', 'Applied Economics', 'Principles of Marketing', 'Business Ethics and Social Responsibility',
      'Oral Communication in Context', 'Reading and Writing', 'Practical Research 1', 'Practical Research 2',
      'Media & Information Literacy', 'Empowerment Technologies (ICT)', 'Statistics and Probability'
    ],
    TVL: [
      'Computer Programming', 'Web Systems', 'Computer Systems Servicing', 'Animation',
      'Technical Drafting', 'Food and Beverage Services', 'Bread and Pastry Production',
      'Electrical Installation & Maintenance', 'Shielded Metal Arc Welding',
      'Oral Communication in Context', 'Reading and Writing', 'Practical Research 1', 'Practical Research 2',
      'Media & Information Literacy', 'Empowerment Technologies (ICT)', 'Statistics and Probability'
    ]
  };
}

function selectQuizType(type) {
  quizGen.type = type;
  renderQuizModal();
}

function setOptionsCount(cnt) {
  quizGen.optionsCount = Math.max(2, Math.min(8, parseInt(cnt, 10) || 4));
  renderQuizModal();
}

function adjustOptionsCount(delta) {
  const cur = parseInt(quizGen.optionsCount, 10) || 4;
  quizGen.optionsCount = Math.max(2, Math.min(8, cur + delta));
  renderQuizModal();
}

function updateCustomOptionsCountInput(val) {
  if (val === '') {
    quizGen.optionsCount = 4;
  } else {
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      quizGen.optionsCount = Math.max(2, Math.min(8, num));
    }
  }
}

function toggleFormat(key) {
  if (quizGen.formats.has(key)) {
    if (quizGen.formats.size <= 1) {
      showToast('Please keep at least one question format selected', 'warning');
      return;
    }
    quizGen.formats.delete(key);
  } else {
    quizGen.formats.add(key);
    if (!quizGen.formatCounts[key] || quizGen.formatCounts[key] <= 0) {
      quizGen.formatCounts[key] = key === 'match' ? 2 : 5;
    }
  }

  if (quizGen.formats.size <= 1) {
    quizGen.distributionMode = 'balanced';
  }

  if (quizGen.distributionMode === 'custom') {
    recalcTotalFromFormatCounts();
  }

  renderQuizModal();
}

function setAllFormats() {
  quizGen.formats = new Set(['mc', 'tf', 'id', 'match']);
  if (!quizGen.formatCounts.mc) quizGen.formatCounts.mc = 5;
  if (!quizGen.formatCounts.tf) quizGen.formatCounts.tf = 5;
  if (!quizGen.formatCounts.id) quizGen.formatCounts.id = 5;
  if (!quizGen.formatCounts.match) quizGen.formatCounts.match = 2;
  if (quizGen.distributionMode === 'custom') recalcTotalFromFormatCounts();
  renderQuizModal();
}

function setDistributionMode(mode) {
  quizGen.distributionMode = mode;
  if (mode === 'custom') {
    if (typeof quizGen.count === 'number' && quizGen.count > 0) {
      distributeCountToFormats(quizGen.count);
    } else {
      quizGen.formats.forEach(f => {
        if (!quizGen.formatCounts[f] || quizGen.formatCounts[f] <= 0) {
          quizGen.formatCounts[f] = f === 'match' ? 2 : 5;
        }
      });
      recalcTotalFromFormatCounts();
    }
  }
  renderQuizModal();
}

function selectCount(c) {
  quizGen.count = c;
  quizGen.customCount = (typeof c === 'number') ? String(c) : '';
  if (quizGen.distributionMode === 'custom' && typeof c === 'number') {
    distributeCountToFormats(c);
  }
  renderQuizModal();
}

function updateCustomCountInput(val) {
  quizGen.customCount = val;
  const num = parseInt(val, 10);
  if (!isNaN(num) && num > 0 && num <= 60) {
    quizGen.count = num;
    if (quizGen.distributionMode === 'custom') {
      distributeCountToFormats(num);
    }
  } else if (val === '') {
    quizGen.count = 'auto';
  }
  renderQuizModal();
}

function updateFormatCount(fmt, val) {
  const num = Math.max(0, Math.min(60, parseInt(val, 10) || 0));
  quizGen.formatCounts[fmt] = num;
  recalcTotalFromFormatCounts();
  renderQuizModal();
}

function recalcTotalFromFormatCounts() {
  let sum = 0;
  quizGen.formats.forEach(f => {
    sum += (quizGen.formatCounts[f] || 0);
  });
  if (sum > 0) {
    quizGen.count = sum;
    quizGen.customCount = String(sum);
  } else {
    quizGen.count = 'auto';
    quizGen.customCount = '';
  }
}

function distributeCountToFormats(total) {
  const active = Array.from(quizGen.formats);
  if (active.length === 0) return;
  const base = Math.floor(total / active.length);
  const remainder = total % active.length;
  active.forEach((f, idx) => {
    quizGen.formatCounts[f] = base + (idx < remainder ? 1 : 0);
  });
}

function getAvailableSubjectsForQuizGen() {
  const selectedStrands = Array.from(quizGen.strands);
  const subjectsSet = new Set();

  // If teacher has assigned subjects in their profile, include them
  if (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE && CURRENT_PROFILE.subjects) {
    CURRENT_PROFILE.subjects.split(',').map(s => s.trim()).filter(Boolean).forEach(sub => subjectsSet.add(sub));
  }

  // If COURSES_DATABASE exists, pull from courses database
  if (typeof COURSES_DATABASE !== 'undefined' && Array.isArray(COURSES_DATABASE)) {
    COURSES_DATABASE.forEach(c => {
      if (selectedStrands.length === 0 || selectedStrands.includes(c.strand) || c.track === 'Core' || c.track === 'Applied') {
        if (c.title) subjectsSet.add(c.title);
      }
    });
  }

  // Include mapped subjects by strand
  if (selectedStrands.length === 0) {
    Object.values(SUBJECTS_BY_STRAND).forEach(list => list.forEach(s => subjectsSet.add(s)));
  } else {
    selectedStrands.forEach(st => {
      (SUBJECTS_BY_STRAND[st] || []).forEach(s => subjectsSet.add(s));
    });
  }

  return Array.from(subjectsSet).sort();
}

function toggleQuizStrand(s) {
  const isTeacher = CURRENT_PROFILE && (CURRENT_PROFILE.role === 'teacher' || (typeof ROLE !== 'undefined' && ROLE === 'teacher'));
  const allowedStrands = getTeacherAllowedStrands();
  if (isTeacher && !allowedStrands.includes(s)) {
    showToast(`You are not assigned to the ${s} strand`, 'warning');
    return;
  }
  if (isTeacher && allowedStrands.length === 1 && quizGen.strands.has(s)) {
    showToast(`You are locked to your assigned strand: ${allowedStrands[0]}`, 'info');
    return;
  }

  if (quizGen.strands.has(s)) quizGen.strands.delete(s);
  else quizGen.strands.add(s);
  const availableSubjects = getAvailableSubjectsForQuizGen();
  if (quizGen.subject && availableSubjects.length > 0 && !availableSubjects.includes(quizGen.subject)) {
    quizGen.subject = '';
  }
  renderQuizModal();
}

function toggleQuizSection(s) {
  const isTeacher = CURRENT_PROFILE && (CURRENT_PROFILE.role === 'teacher' || (typeof ROLE !== 'undefined' && ROLE === 'teacher'));
  const allowedSections = getTeacherAllowedSections();
  if (isTeacher && !allowedSections.includes(s)) {
    showToast(`You are not assigned to ${s}`, 'warning');
    return;
  }
  if (isTeacher && allowedSections.length === 1 && quizGen.sections.has(s)) {
    showToast(`You are connected only to ${allowedSections[0]}`, 'info');
    return;
  }
  if (quizGen.sections.has(s)) quizGen.sections.delete(s);
  else quizGen.sections.add(s);
  renderQuizModal();
}

function updateTitle(v)  { quizGen.title = v; }
function updateSubject(v){ quizGen.subject = v; }

function handleFileInput(input) {
  const selectedFiles = Array.from(input.files || []);
  if (!selectedFiles.length) return;

  const validExts = ['.pdf', '.docx', '.txt'];
  let currentFiles = [...(quizGen.files || [])];

  for (const file of selectedFiles) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExts.includes(ext)) {
      showToast(`Skipped "${file.name}" — only PDF, DOCX, and TXT files are supported`, 'warning');
      continue;
    }
    // Prevent duplicate files
    if (currentFiles.some(f => f.name === file.name && f.size === file.size)) {
      continue;
    }
    currentFiles.push(file);
  }

  const totalBytes = currentFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  if (totalBytes > MAX_UPLOAD_BYTES) {
    showToast(`Total files size (${(totalBytes / 1024 / 1024).toFixed(1)}MB) exceeds the 50MB limit only`, 'error');
    return;
  }

  quizGen.files = currentFiles;
  quizGen.file = currentFiles[0] || null;
  quizGen.totalSizeBytes = totalBytes;

  if (!quizGen.title && quizGen.file) {
    quizGen.title = quizGen.file.name.replace(/\.[^.]+$/, '');
  }
  const availSubs = getAvailableSubjectsForQuizGen();
  if (quizGen.file && !quizGen.subject) {
    const matchedSub = availSubs.find(s => s.toLowerCase() === quizGen.file.name.replace(/\.[^.]+$/, '').toLowerCase());
    if (matchedSub) quizGen.subject = matchedSub;
  }

  renderQuizModal();
  extractAllFilesText();
}

async function extractAllFilesText() {
  if (!quizGen.files || quizGen.files.length === 0) {
    quizGen.fileText = '';
    renderQuizModal();
    return;
  }
  const fileCount = quizGen.files.length;
  // Fair allocation of character budget across all files so no handout is left out
  const budgetPerFile = Math.max(8000, Math.floor(40000 / fileCount));
  let combined = '';
  for (const file of quizGen.files) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    try {
      const text = await extractSingleFileText(file, ext, budgetPerFile);
      if (text) {
        combined += text + '\n\n';
      }
    } catch (e) {
      console.warn(`Extraction warning for ${file.name}:`, e);
    }
  }
  quizGen.fileText = combined.slice(0, 45000);
  renderQuizModal();
}

function extractSingleFileText(file, ext, maxChars = 20000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    if (ext === '.txt') {
      reader.onload = () => resolve(`[Document: ${file.name} | Page: 1]\n${String(reader.result).slice(0, maxChars)}`);
      reader.onerror = reject;
      reader.readAsText(file);
    } else if (ext === '.pdf') {
      reader.onload = async () => {
        try {
          if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(reader.result) }).promise;
            let text = '';
            const maxPages = Math.min(pdf.numPages, 25);
            for (let i = 1; i <= maxPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const pageStr = content.items.map(it => it.str).join(' ');
              text += `[Document: ${file.name} | Page: ${i}]\n${pageStr}\n\n`;
              if (text.length > maxChars) break;
            }
            resolve(text);
          } else {
            resolve(`[Document: ${file.name} | Page: 1]\n${file.name}`);
          }
        } catch (e) { reject(e); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    } else if (ext === '.docx') {
      reader.onload = async () => {
        try {
          if (typeof mammoth !== 'undefined') {
            const result = await mammoth.extractRawText({ arrayBuffer: reader.result });
            resolve(`[Document: ${file.name} | Page: 1]\n${(result.value || '').slice(0, maxChars)}`);
          } else {
            resolve(`[Document: ${file.name} | Page: 1]\n${file.name}`);
          }
        } catch (e) { reject(e); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    } else {
      resolve('');
    }
  });
}

function removeFile(fileName) {
  quizGen.files = (quizGen.files || []).filter(f => f.name !== fileName);
  quizGen.file = quizGen.files[0] || null;
  quizGen.totalSizeBytes = (quizGen.files || []).reduce((sum, f) => sum + (f.size || 0), 0);
  extractAllFilesText();
}

function removeAllFiles() {
  quizGen.files = [];
  quizGen.file = null;
  quizGen.totalSizeBytes = 0;
  quizGen.fileText = '';
  quizGen.isExtracting = false;
  quizGen.questions = [];
  renderQuizModal();
}

function isForbiddenQuizLabel(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (/^(figure|fig|table|tbl|diagram|chart|graph|image|photo|illustration|page|pg|chapter|ch|section|sec|module|mod|part|lesson|appendix|step|box|item|no|num)\b[\s.:–-]*\d+/i.test(clean)) return true;
  if (/^(figure|table|diagram|chart|graph|image|photo|illustration|page|chapter|appendix|section|module|lesson|handout|reference|notes|summary)$/i.test(clean)) return true;
  return false;
}

function isValidQuizTerm(term) {
  if (!term || typeof term !== 'string') return false;
  let clean = term.trim().replace(/^["'`“‘(]+|[)"'`”’:,;.]+$/g, '').trim();
  clean = clean.replace(/^(the|a|an)\s+/i, '').trim();
  if (clean.length < 2 || clean.length > 45) return false;

  // Reject figure, table, diagram, page labels
  if (isForbiddenQuizLabel(clean)) return false;

  // Reject sentence fragments containing copula/linking verbs
  if (/\b(is|are|was|were|has|have|can|will|should|represents|defined)\b/i.test(clean)) return false;

  // Reject terms ending with conjunctions, prepositions, or articles
  if (/\b(and|or|but|with|to|for|of|in|on|at|by|as|from|which|that|the|a|an)$/i.test(clean)) return false;

  const words = clean.split(/\s+/);
  if (words.length < 1 || words.length > 5) return false;
  if (/^(one|a|an|the|this|that|these|those|there|here|some|many|most|all|any|another|other|each|every|such|few|several|what|which|who|whom|whose|when|where|why|how|it|its|their|they|we|you|he|she|in|on|at|by|for|with|about|as|if|because|due|since|according|furthermore|moreover|however|therefore|additionally|first|second|third|finally|also)\b/i.test(clean)) return false;
  if (/^[0-9\W]+$/.test(clean)) return false;

  return true;
}

function cleanQuizTerm(term) {
  if (!term || typeof term !== 'string') return '';
  let str = term.trim().replace(/^["'`“‘]+|[)"'`”’:,;.]+$/g, '').trim();
  // Strip trailing conjunctions, prepositions, or copulas (e.g. "and", "or", "is", "which")
  str = str.replace(/\s+(and|or|but|with|to|for|of|in|on|at|by|is|are|was|were|which|that|the|a|an)$/i, '').trim();
  // If answer starts with "The ... is ... and" or "X is a ...", extract the subject X
  const clauseMatch = str.match(/^(?:the|a|an)?\s*([A-Za-z0-9\s_-]{2,35})\s+(?:is|are)\s+(?:a|an|the|defined|used|special)/i);
  if (clauseMatch && clauseMatch[1] && clauseMatch[1].trim().length >= 2) {
    str = clauseMatch[1].trim();
  }
  return str;
}

function extractQuestionsFromTextClient(params) {
  const { title = 'Quiz', fileName = '', formats = ['mc'], count = 10, formatCounts, distributionMode = 'even', sourceText = '' } = params;
  let targetCount = typeof count === 'number' && count > 0 ? count : (typeof count === 'string' && /^\d+$/.test(count) ? parseInt(count, 10) : 10);
  if (count === 'auto') targetCount = 10;

  const rawClean = (sourceText || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  const sentences = rawClean.split(/(?<=[.!?\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 240 && !s.startsWith('%') && !s.startsWith('#') && !s.includes('---'));

  const pairs = [];
  const extractedTerms = [];

  sentences.forEach(s => {
    // Non-greedily find definition verbs
    const verbMatch = s.match(/\b(is\s+defined\s+as|is\s+described\s+as|refers\s+to|means|represents|is\s+(?:a|an|the))\b/i);
    if (verbMatch && verbMatch.index > 0) {
      let rawTerm = s.slice(0, verbMatch.index).trim().replace(/^[•\-*]\s*/, '').replace(/^(the|a|an)\s+/i, '').trim();
      let rawDef = s.slice(verbMatch.index + verbMatch[0].length).trim().replace(/[.;]+$/, '');
      rawTerm = cleanQuizTerm(rawTerm);
      if (isValidQuizTerm(rawTerm) && rawDef.length > 8 && !isForbiddenQuizLabel(rawTerm)) {
        if (!extractedTerms.some(t => t.toLowerCase() === rawTerm.toLowerCase())) {
          pairs.push({ term: rawTerm, def: rawDef });
          extractedTerms.push(rawTerm);
        }
      }
    }
  });

  const colonLines = rawClean.split('\n').map(l => l.trim()).filter(l => l.length > 15);
  const colonRegex = /^([A-Z][A-Za-z0-9\s-]{2,35})\s*[:–—]\s*(.{15,200})$/;
  colonLines.forEach(l => {
    const m = l.match(colonRegex);
    if (m && m[1] && m[2]) {
      let term = cleanQuizTerm(m[1]);
      let def = m[2].trim().replace(/[.;]+$/, '');
      if (isValidQuizTerm(term) && def.length > 10 && !isForbiddenQuizLabel(term)) {
        if (!extractedTerms.some(t => t.toLowerCase() === term.toLowerCase())) {
          pairs.push({ term, def });
          extractedTerms.push(term);
        }
      }
    }
  });

  const defaultDistractors = [
    'System Architecture', 'Information Protocol', 'Network Topology', 'Data Encryption',
    'Algorithm Design', 'Structured Process', 'Relational Model', 'Interface Standard',
    'Functional Component', 'Operating Environment', 'Security Parameter', 'Transmission Channel'
  ];

  const questions = [];
  let formatSequence = [];
  const fmtList = Array.isArray(formats) && formats.length > 0 ? formats : ['mc'];

  if (distributionMode === 'custom' && formatCounts && Object.keys(formatCounts).length > 0) {
    fmtList.forEach(f => {
      const cnt = formatCounts[f] || 0;
      for (let c = 0; c < cnt; c++) formatSequence.push(f);
    });
  }
  if (!formatSequence.length) {
    for (let i = 0; i < targetCount; i++) {
      formatSequence.push(fmtList[i % fmtList.length]);
    }
  }

  let pairIdx = 0;
  for (let i = 0; i < formatSequence.length; i++) {
    const fmt = formatSequence[i];
    const isMc = fmt === 'mc' || fmt === 'multiple_choice';
    const isId = fmt === 'id' || fmt === 'identification';
    const isMatch = fmt === 'match' || fmt === 'matching';
    const sentence = sentences[i % Math.max(1, sentences.length)] || `Key fundamental principle in ${title || 'this module'}`;
    const pair = pairs[pairIdx % Math.max(1, pairs.length)];
    pairIdx++;

    if (isMc) {
      let qText = '';
      let correct = '';
      if (pair) {
        qText = `Which concept is described as: "${pair.def}"?`;
        correct = cleanQuizTerm(pair.term);
      } else {
        qText = `Based on the learning material for ${title || fileName}, which concept corresponds to: "${sentence.slice(0, 95)}..."?`;
        correct = cleanQuizTerm(extractedTerms[i % Math.max(1, extractedTerms.length)]) || `${title} Principle`;
      }
      const otherTerms = extractedTerms.filter(t => t.toLowerCase() !== correct.toLowerCase());
      const distractors = [...otherTerms, ...defaultDistractors].filter(t => t.toLowerCase() !== correct.toLowerCase() && !isForbiddenQuizLabel(t)).slice(0, 3);
      while (distractors.length < 3) {
        distractors.push(`Concept Option ${distractors.length + 1}`);
      }
      const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
      questions.push({
        _id: 'q_' + i + '_' + Date.now(),
        type: 'multiple_choice',
        question: qText,
        options: options,
        answer: correct,
        _answerIdx: Math.max(0, options.indexOf(correct))
      });
    } else if (isId) {
      if (pair) {
        let cleanDef = pair.def.trim();
        cleanDef = cleanDef.replace(/^["']+|["']+$/g, '');
        const qText = cleanDef.toLowerCase().startsWith('the ') || cleanDef.toLowerCase().startsWith('a ')
          ? `Which concept is described as: "${cleanDef}"?`
          : `Identify the term: "${cleanDef}".`;
        questions.push({
          _id: 'q_' + i + '_' + Date.now(),
          type: 'identification',
          question: qText,
          answer: cleanQuizTerm(pair.term)
        });
      } else {
        const candidateTerm = cleanQuizTerm(extractedTerms[i % Math.max(1, extractedTerms.length)]) || `${title.split(' ')[0] || 'Core'} Principle`;
        questions.push({
          _id: 'q_' + i + '_' + Date.now(),
          type: 'identification',
          question: `State the key concept highlighted in: "${sentence.slice(0, 95)}...".`,
          answer: candidateTerm
        });
      }
    } else if (isMatch) {
      const validPairs = pairs.filter(p => !isForbiddenQuizLabel(p.term) && !isForbiddenQuizLabel(p.def));
      const pCount = Math.min(Math.max(3, validPairs.length), 5);
      const mPairs = validPairs.slice(0, pCount).map(p => ({ left: cleanQuizTerm(p.term), right: p.def }));
      if (mPairs.length < 2) {
        mPairs.push({ left: `${title} - Principle A`, right: 'Core operational principle and guideline' });
        mPairs.push({ left: `${title} - Principle B`, right: 'Foundational framework and implementation' });
      }
      questions.push({
        _id: 'q_' + i + '_' + Date.now(),
        type: 'matching',
        instructions: `Match each concept or term with its correct description from the learning material.`,
        pairs: mPairs
      });
    }
  }

  return questions;
}

async function generateQuiz() {
  if ((!quizGen.files || quizGen.files.length === 0) && !quizGen.file) {
    showToast('Please upload at least one material file first', 'error');
    return;
  }
  quizGen.step = 'loading';
  const genToken = ++currentQuizGenToken;
  renderQuizModal();

  let waited = 0;
  while (quizGen.isExtracting && waited < 6000) {
    if (quizGen.step !== 'loading' || genToken !== currentQuizGenToken) return;
    await new Promise(r => setTimeout(r, 300));
    waited += 300;
  }
  if (quizGen.step !== 'loading' || genToken !== currentQuizGenToken) return;

  const cleanCount = typeof quizGen.count === 'number' ? quizGen.count : (typeof quizGen.count === 'string' && /^\d+$/.test(quizGen.count) ? parseInt(quizGen.count, 10) : quizGen.count);
  const fileNames = (quizGen.files && quizGen.files.length) ? quizGen.files.map(f => f.name) : (quizGen.file ? [quizGen.file.name] : []);

  const payload = {
    title: quizGen.title || quizGen.subject || 'Untitled Quiz',
    subject: quizGen.subject || '',
    fileName: fileNames.join(', '),
    files: fileNames,
    formats: Array.from(quizGen.formats),
    optionsCount: quizGen.optionsCount || 4,
    count: cleanCount,
    distributionMode: quizGen.distributionMode,
    formatCounts: quizGen.distributionMode === 'custom' ? quizGen.formatCounts : undefined,
    sourceText: (quizGen.fileText || '').slice(0, 35000)
  };

  // Diagnostic toast: show what we're sending
  const textLen = (payload.sourceText || '').length;
  showToast(`📡 Sending to server: ${fileNames.length} file(s), ${textLen} chars of text, ${payload.count || 'auto'} questions requested`, 'info');

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000); // 75 seconds leeway for AI models
    const response = await fetch(QUIZ_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (quizGen.step !== 'loading' || genToken !== currentQuizGenToken) return;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      showToast(`❌ Server error (${response.status}) after ${elapsed}s: ${errData.error || 'Unknown error'}`, 'error');
      throw new Error(errData.error || ('Backend returned ' + response.status));
    }
    const data = await response.json();
    if (quizGen.step !== 'loading' || genToken !== currentQuizGenToken) return;

    if (Array.isArray(data.questions) && data.questions.length > 0) {
      const source = data._source || 'unknown';
      const qCount = data.questions.length;
      let sourceLabel = source;
      if (source.startsWith('gemini:')) sourceLabel = '🤖 Gemini AI (' + source.split(':')[1] + ')';
      else if (source.startsWith('openai:')) sourceLabel = '🤖 OpenAI (' + source.split(':')[1] + ')';
      else if (source === 'offline-fallback') sourceLabel = '⚠️ Offline Fallback (no AI — API keys missing/exhausted)';

      showToast(`✅ Generated ${qCount} questions in ${elapsed}s via ${sourceLabel}`, source === 'offline-fallback' ? 'warning' : 'success');
      applyGeneratedQuestions(data.questions, false);
    } else {
      throw new Error('No questions returned from API');
    }
  } catch (err) {
    console.warn('Quiz backend unavailable or timed out, generating directly from material:', err.message);
    const primaryFile = quizGen.file ? quizGen.file.name : (fileNames[0] || 'Handout');
    const extracted = typeof extractQuestionsFromTextClient === 'function' ? extractQuestionsFromTextClient({
      title: quizGen.title || quizGen.subject || 'Untitled Quiz',
      subject: quizGen.subject || '',
      fileName: primaryFile,
      formats: Array.from(quizGen.formats),
      count: cleanCount,
      distributionMode: quizGen.distributionMode,
      formatCounts: quizGen.distributionMode === 'custom' ? quizGen.formatCounts : undefined,
      sourceText: quizGen.fileText || ''
    }) : null;
    if (quizGen.step !== 'loading' || genToken !== currentQuizGenToken) return;
    const finalQuestions = (extracted && extracted.length > 0) ? extracted : buildDemoQuestions();
    applyGeneratedQuestions(finalQuestions, false);
    showToast(`${quizGen.type === 'interactive' ? '🎮 Interactive Arena' : '📝 Standard Quiz'} questions generated!`, 'success');
  }
  renderQuizModal();
}

function formatPageCitation(pageVal) {
  if (pageVal === null || pageVal === undefined || pageVal === '') return '';
  const clean = String(pageVal).replace(/^(page\s*)+/i, '').trim();
  return clean ? `Page ${clean}` : '';
}

function applyGeneratedQuestions(list, isDemo) {
  const validFiles = (quizGen.files && quizGen.files.length) ? quizGen.files.map(f => f.name) : (quizGen.file ? [quizGen.file.name] : []);
  const defaultFileName = validFiles[0] || 'Handout Material';
  const lesson = quizGen.lesson || '';
  quizGen.questions = (list || []).map((q, i) => {
    let cleanPage = q.source_page;
    if (cleanPage) {
      const match = String(cleanPage).match(/\d+/);
      cleanPage = match ? parseInt(match[0], 10) : String(cleanPage).replace(/^(page\s*)+/i, '').trim();
    } else {
      cleanPage = 1 + Math.floor(i / 2);
    }

    let sourceFile = (q.source_file || '').trim();
    if (sourceFile.includes(',') && validFiles.length > 0) {
      const match = validFiles.find(f => sourceFile.includes(f));
      sourceFile = match || validFiles[i % validFiles.length];
    } else if (!sourceFile || sourceFile === 'Handout Material') {
      sourceFile = validFiles.length > 0 ? validFiles[i % validFiles.length] : defaultFileName;
    }

    const obj = Object.assign({
      _id: 'q' + i,
      _demo: !!isDemo,
      _quiz_type: quizGen.type || 'standard',
      source_file: sourceFile,
      source_page: cleanPage,
      sourceMaterial: sourceFile,
      source_material: sourceFile,
      lesson: lesson
    }, q);
    obj.source_file = sourceFile;
    obj.source_page = cleanPage;
    obj.sourceMaterial = sourceFile;
    obj.source_material = sourceFile;

    if (obj.type === 'matching' && !obj.instructions) {
      obj.instructions = obj.question || 'Match the items on the left with the correct matches on the right.';
    }
    if (obj.type === 'multiple_choice') {
      obj._answerIdx = Math.max(0, (obj.options || []).indexOf(obj.answer));
    }
    if (obj.type === 'true_false') {
      if (!Array.isArray(obj.options) || obj.options.length === 0) obj.options = ['True', 'False'];
      if (!obj.answer) obj.answer = 'True';
    }
    return obj;
  });

  if (quizGen.questions.length === 0) {
    quizGen.step = 'error';
    quizGen.errorMsg = 'No questions were returned. Please try again.';
  } else {
    quizGen.step = 'setup';
    quizGen.wizardStep = 5;
    quizGen.editingId = null;
  }
}

function addNewManualQuestion() {
  const newId = 'q_' + Date.now();
  const format = quizGen.formats.has('mc') ? 'multiple_choice' : quizGen.formats.has('tf') ? 'true_false' : quizGen.formats.has('id') ? 'identification' : 'matching';
  const defaultFile = (quizGen.files && quizGen.files.length) ? quizGen.files[0].name : (quizGen.file ? quizGen.file.name : (quizGen.subject ? quizGen.subject + ' Handout' : 'Handout'));

  if (format === 'multiple_choice') {
    const count = quizGen.optionsCount || 4;
    const opts = Array.from({ length: count }, (_, idx) => `Option ${String.fromCharCode(65 + idx)}`);
    quizGen.questions.push({
      _id: newId,
      type: 'multiple_choice',
      question: `Question ${quizGen.questions.length + 1} (Multiple Choice)`,
      options: opts,
      answer: opts[0],
      _answerIdx: 0,
      source_file: defaultFile,
      source_page: 1
    });
  } else if (format === 'true_false') {
    quizGen.questions.push({
      _id: newId,
      type: 'true_false',
      question: `Statement ${quizGen.questions.length + 1} (True or False)`,
      options: ['True', 'False'],
      answer: 'True',
      source_file: defaultFile,
      source_page: 1
    });
  } else if (format === 'identification') {
    quizGen.questions.push({
      _id: newId,
      type: 'identification',
      question: `Question ${quizGen.questions.length + 1} (Identification)`,
      answer: 'Correct Answer',
      source_file: defaultFile,
      source_page: 1
    });
  } else {
    quizGen.questions.push({
      _id: newId,
      type: 'matching',
      instructions: 'Match the prompts on the left with the correct answers on the right.',
      pairs: [
        { left: 'Prompt 1', right: 'Match A' },
        { left: 'Prompt 2', right: 'Match B' }
      ],
      source_file: defaultFile,
      source_page: 1
    });
  }
  quizGen.editingId = newId;
  renderQuizModal();
  showToast('New question item added to preview', 'success');
}

function buildDemoQuestions() {
  const validFiles = (quizGen.files && quizGen.files.length) ? quizGen.files.map(f => f.name) : (quizGen.file ? [quizGen.file.name] : ['your handout']);
  const getFileForIndex = (idx) => validFiles[idx % validFiles.length];
  const selectedFormats = Array.from(quizGen.formats);
  if (selectedFormats.length === 0) selectedFormats.push('mc', 'id');

  const demo = [];
  const samplePool = {
    mc: (i) => {
      const optsCount = quizGen.optionsCount || 4;
      const opts = Array.from({ length: optsCount }, (_, oIdx) => `Sample option ${String.fromCharCode(65 + oIdx)}`);
      const fileForQ = getFileForIndex(i);
      return {
        type: 'multiple_choice',
        question: `Question ${i + 1} (Multiple Choice) — sample generated item from "${fileForQ}".`,
        options: opts,
        answer: opts[0],
        source_file: fileForQ,
        source_page: 1 + Math.floor(i / 2)
      };
    },
    tf: (i) => {
      const fileForQ = getFileForIndex(i);
      return {
        type: 'true_false',
        question: `Statement ${i + 1} (True or False) — sample statement derived from "${fileForQ}".`,
        options: ['True', 'False'],
        answer: i % 2 === 0 ? 'True' : 'False',
        source_file: fileForQ,
        source_page: 1 + Math.floor(i / 2)
      };
    },
    id: (i) => {
      const fileForQ = getFileForIndex(i);
      return {
        type: 'identification',
        question: `Question ${i + 1} (Identification) — sample generated prompt from "${fileForQ}".`,
        answer: 'Sample answer',
        source_file: fileForQ,
        source_page: 1 + Math.floor(i / 2)
      };
    },
    match: (i) => {
      const fileForQ = getFileForIndex(i);
      return {
        type: 'matching',
        instructions: `Question ${i + 1} (Matching Type) — sample matching set from "${fileForQ}".`,
        pairs: [
          { left: `Term ${i + 1}A`, right: `Definition ${i + 1}A` },
          { left: `Term ${i + 1}B`, right: `Definition ${i + 1}B` },
          { left: `Term ${i + 1}C`, right: `Definition ${i + 1}C` }
        ],
        source_file: fileForQ,
        source_page: 1 + Math.floor(i / 2)
      };
    }
  };

  if (quizGen.distributionMode === 'custom') {
    let qIndex = 0;
    selectedFormats.forEach(fmt => {
      const countForFmt = quizGen.formatCounts[fmt] || 0;
      for (let i = 0; i < countForFmt; i++) {
        if (samplePool[fmt]) demo.push(samplePool[fmt](qIndex++));
      }
    });
  } else {
    const targetCount = (typeof quizGen.count === 'number' && quizGen.count > 0) ? quizGen.count : (selectedFormats.length * 5);
    const perFormat = Math.floor(targetCount / selectedFormats.length);
    const rem = targetCount % selectedFormats.length;
    let qIndex = 0;
    selectedFormats.forEach((fmt, fIdx) => {
      const numToGen = perFormat + (fIdx < rem ? 1 : 0);
      for (let i = 0; i < numToGen; i++) {
        if (samplePool[fmt]) demo.push(samplePool[fmt](qIndex++));
      }
    });
  }

  if (demo.length === 0) {
    demo.push(samplePool['mc'](0));
  }

  return demo;
}

function removeQuestion(id) { 
  quizGen.questions = quizGen.questions.filter(q => q._id !== id);
  if (quizGen.editingId === id) quizGen.editingId = null;
  renderQuizModal(); 
}

function toggleEditQuestion(id, optIdx) {
  if (quizGen.editingId === id && optIdx === undefined) {
    quizGen.editingId = null;
  } else {
    quizGen.editingId = id;
  }
  renderQuizModal();
  if (quizGen.editingId === id) {
    setTimeout(() => {
      const card = document.getElementById(`qcard-${id}`);
      if (card) {
        if (typeof optIdx === 'number') {
          const optInput = card.querySelector(`[data-field="opt-${optIdx}"]`);
          if (optInput) {
            optInput.focus();
            optInput.select();
            return;
          }
        }
        const promptInput = card.querySelector(`[data-field="question"]`) || card.querySelector('textarea, input[type="text"]');
        if (promptInput) {
          promptInput.focus();
        }
      }
    }, 60);
  }
}

function editQuestion(id, field, value) { 
  const q = quizGen.questions.find(q => q._id === id); 
  if (q) q[field] = value; 
}

function editOption(id, idx, value) {
  const q = quizGen.questions.find(q => q._id === id);
  if (!q || !q.options) return;
  q.options[idx] = value;
  if (q._answerIdx === idx) q.answer = value;
}

function setAnswerIndex(id, idx) {
  const q = quizGen.questions.find(q => q._id === id);
  if (q && q.options) { 
    q._answerIdx = idx; 
    q.answer = q.options[idx]; 
    renderQuizModal();
  }
}

function setTfAnswer(id, val) {
  const q = quizGen.questions.find(q => q._id === id);
  if (q) {
    q.answer = val;
    q.options = ['True', 'False'];
    renderQuizModal();
  }
}

function addOption(qId) {
  const q = quizGen.questions.find(item => item._id === qId);
  if (!q || q.type !== 'multiple_choice') return;
  if (!q.options) q.options = [];
  if (q.options.length >= 8) { showToast('Maximum 8 options per question', 'info'); return; }
  q.options.push(`Option ${String.fromCharCode(65 + q.options.length)}`);
  renderQuizModal();
}

function removeOption(qId, optIdx) {
  const q = quizGen.questions.find(item => item._id === qId);
  if (!q || q.type !== 'multiple_choice') return;
  if (q.options.length <= 2) { showToast('Multiple choice items require at least 2 options', 'warning'); return; }
  q.options.splice(optIdx, 1);
  if (q._answerIdx === optIdx) {
    q._answerIdx = 0;
    q.answer = q.options[0];
  } else if (q._answerIdx > optIdx) {
    q._answerIdx--;
  }
  renderQuizModal();
}

function editPair(id, idx, side, value) {
  const q = quizGen.questions.find(q => q._id === id);
  if (q && q.pairs && q.pairs[idx]) q.pairs[idx][side] = value;
}

function updateSourceFile(id, val) {
  const q = quizGen.questions.find(q => q._id === id);
  if (q) {
    q.source_file = val;
    q.sourceMaterial = val;
    q.source_material = val;
  }
}

function updateSourcePage(id, val) {
  const q = quizGen.questions.find(q => q._id === id);
  if (q) {
    if (!val) {
      q.source_page = null;
    } else {
      const match = String(val).match(/\d+/);
      q.source_page = match ? parseInt(match[0], 10) : String(val).replace(/^(page\s*)+/i, '').trim();
    }
  }
}

function validateAllQuizQuestionsBeforeSave() {
  if (!quizGen.title || !quizGen.title.trim()) {
    showToast('Quiz Title is required before saving', 'warning');
    quizGen.wizardStep = 2;
    renderQuizModal();
    const el = document.getElementById('quizGenTitleInput');
    if (el) el.focus();
    return false;
  }
  if (!quizGen.subject) {
    showToast('Subject is required before saving', 'warning');
    quizGen.wizardStep = 2;
    renderQuizModal();
    const el = document.getElementById('quizGenSubjectSelect');
    if (el) el.focus();
    return false;
  }

  if (!quizGen.questions || quizGen.questions.length === 0) {
    showToast('No questions found in this quiz to save', 'error');
    return false;
  }

  for (let i = 0; i < quizGen.questions.length; i++) {
    const q = quizGen.questions[i];
    const qNum = i + 1;

    if (q.type === 'multiple_choice') {
      if (!q.question || !q.question.trim()) {
        showToast(`Question #${qNum} (Multiple Choice) is missing the question prompt`, 'warning');
        highlightInvalidQuestionCard(q._id, 'question');
        return false;
      }
      if (!q.options || q.options.length < 2) {
        showToast(`Question #${qNum} (Multiple Choice) needs at least 2 choices`, 'warning');
        highlightInvalidQuestionCard(q._id, 'options');
        return false;
      }
      for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
        if (!q.options[oIdx] || !q.options[oIdx].trim()) {
          const optLetter = String.fromCharCode(65 + oIdx);
          showToast(`Question #${qNum} (Multiple Choice) Choice ${optLetter} is empty`, 'warning');
          highlightInvalidQuestionCard(q._id, `opt-${oIdx}`);
          return false;
        }
      }
      if (!q.answer) {
        q._answerIdx = 0;
        q.answer = q.options[0];
      }
    } else if (q.type === 'true_false') {
      if (!q.question || !q.question.trim()) {
        showToast(`Question #${qNum} (True/False) is missing the question prompt`, 'warning');
        highlightInvalidQuestionCard(q._id, 'question');
        return false;
      }
      if (!q.answer) {
        q.answer = 'True';
      }
    } else if (q.type === 'identification') {
      if (!q.question || !q.question.trim()) {
        showToast(`Question #${qNum} (Identification) is missing the question prompt`, 'warning');
        highlightInvalidQuestionCard(q._id, 'question');
        return false;
      }
      if (!q.answer || !q.answer.trim()) {
        showToast(`Question #${qNum} (Identification) is missing the correct answer`, 'warning');
        highlightInvalidQuestionCard(q._id, 'answer');
        return false;
      }
    } else if (q.type === 'matching') {
      if (!q.instructions || !q.instructions.trim()) {
        showToast(`Question #${qNum} (Matching Type) is missing instructions`, 'warning');
        highlightInvalidQuestionCard(q._id, 'instructions');
        return false;
      }
      if (!q.pairs || q.pairs.length === 0) {
        showToast(`Question #${qNum} (Matching Type) has no pairs defined`, 'warning');
        highlightInvalidQuestionCard(q._id, 'pairs');
        return false;
      }
      for (let pIdx = 0; pIdx < q.pairs.length; pIdx++) {
        const pair = q.pairs[pIdx];
        if (!pair.left || !pair.left.trim() || !pair.right || !pair.right.trim()) {
          showToast(`Question #${qNum} (Matching Type) Item ${pIdx + 1} has an empty prompt or match`, 'warning');
          highlightInvalidQuestionCard(q._id, `pair-${pIdx}`);
          return false;
        }
      }
    }
  }

  return true;
}

function highlightInvalidQuestionCard(qId, fieldKey) {
  if (quizGen.wizardStep !== 5) {
    quizGen.wizardStep = 5;
    renderQuizModal();
  }
  setTimeout(() => {
    const card = document.getElementById(`qcard-${qId}`);
    if (card) {
      card.classList.add('input-missing');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        card.classList.remove('input-missing');
      }, 3000);

      const input = card.querySelector(`[data-field="${fieldKey}"]`) || card.querySelector('textarea, input[type="text"]');
      if (input) {
        input.focus();
        input.style.borderColor = '#ef4444';
        setTimeout(() => { input.style.borderColor = ''; }, 3000);
      }
    }
  }, 100);
}

async function saveQuiz() {
  if (isSavingQuiz) return;
  if (!validateAllQuizQuestionsBeforeSave()) return;

  isSavingQuiz = true;

  const saveBtn = document.querySelector('#quizModalFoot .gen-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span>⏳</span> Saving Quiz…`;
  }

  try {
    const isDemo = quizGen.questions.some(q => q._demo);
    const title = quizGen.title || (quizGen.subject ? quizGen.subject + ' – System Generated Quiz' : 'System Generated Quiz');
    const { data: sessionData } = await db.auth.getSession().catch(() => ({ data: {} }));
    const userId = sessionData?.session?.user?.id || (typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE?.id : null);

    const isAdmin = typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE && CURRENT_PROFILE.role === 'admin';
    const quizStatus = isAdmin ? 'active' : 'pending';
    const targetSectionsStr = quizGen.sections.size ? Array.from(quizGen.sections).join(', ') : null;

    const fileNames = (quizGen.files && quizGen.files.length) 
      ? quizGen.files.map(f => f.name).join(', ')
      : (quizGen.file ? quizGen.file.name : (quizGen.subject ? quizGen.subject + ' Handout' : ''));
    const lessonName = quizGen.lesson || '';

    // Attach metadata to questions so interactive type, timer, sections, and source material are preserved inside questions JSONB
    const questionsToSave = (quizGen.questions || []).map((q, idx) => ({
      ...q,
      source_file: q.source_file || fileNames,
      source_page: q.source_page || null,
      sourceMaterial: q.source_file || q.sourceMaterial || fileNames,
      source_material: q.source_file || q.sourceMaterial || fileNames,
      lesson: q.lesson || lessonName,
      sections: targetSectionsStr,
      dueDate: quizGen.dueDate || null,
      _quizType: quizGen.type || 'standard',
      _timerPerQuestion: quizGen.timerPerQuestion || 0,
      _timeLimitMinutes: quizGen.timeLimitMinutes || 0,
      ...(idx === 0 ? {
        _meta: {
          quizType: quizGen.type || 'standard',
          timerPerQuestion: quizGen.timerPerQuestion || 0,
          timeLimitMinutes: quizGen.timeLimitMinutes || 0,
          sourceMaterial: fileNames,
          lesson: lessonName,
          sections: targetSectionsStr,
          dueDate: quizGen.dueDate || null
        }
      } : {})
    }));

    const quizRow = {
      title: title,
      subject: quizGen.subject || null,
      strand: quizGen.strands.size ? Array.from(quizGen.strands).join(', ') : null,
      grade_level: quizGen.gradeLevel || null,
      created_by: userId,
      questions: questionsToSave,
      status: quizStatus,
      is_demo: isDemo,
      sections: targetSectionsStr,
      lesson: lessonName
    };

    let { error } = await db.from('quizzes').insert(quizRow);
    if (error && error.message && error.message.includes('time_limit_minutes')) {
      delete quizRow.time_limit_minutes;
      const retry = await db.from('quizzes').insert(quizRow);
      error = retry.error;
    }
    if (error && error.message && error.message.includes('due_date')) {
      delete quizRow.due_date;
      const retry = await db.from('quizzes').insert(quizRow);
      error = retry.error;
    }
    if (error && error.message && error.message.includes('sections')) {
      delete quizRow.sections;
      const retry = await db.from('quizzes').insert(quizRow);
      error = retry.error;
    }
    if (error && error.message && error.message.includes('lesson')) {
      delete quizRow.lesson;
      const retry = await db.from('quizzes').insert(quizRow);
      error = retry.error;
    }

    if (error) {
      console.warn('Database insert failed, saving locally to custom quizzes list:', error.message);
      // Local fallback so user is never blocked
      customQuizzes.unshift({
        id: 'quiz_' + Date.now(),
        createdBy: userId,
        subject: quizGen.subject,
        strand: Array.from(quizGen.strands).join(', '),
        sections: targetSectionsStr,
        lesson: lessonName,
        dueDate: quizGen.dueDate || null,
        due_date: quizGen.dueDate || null,
        gradeLevel: quizGen.gradeLevel,
        grade_level: quizGen.gradeLevel,
        createdAt: new Date().toISOString(),
        title: title + (isDemo ? ' (Demo)' : ''),
        type: quizGen.type || 'standard',
        quiz_type: quizGen.type || 'standard',
        timerPerQuestion: quizGen.timerPerQuestion || 0,
        timeLimitMinutes: quizGen.timeLimitMinutes || 0,
        meta: `${quizGen.subject || 'General'} · ${questionsToSave.length} items · ${quizStatus}`,
        isDemo: isDemo,
        status: quizStatus,
        questions: questionsToSave
      });
    }

    closeQuizModal();
    await loadQuizzesFromDB();
    if (typeof updateApprovalBadge === 'function') updateApprovalBadge();

    const isStandalone = !!document.getElementById('quizMakerContainer');

    if (isAdmin) {
      if (typeof addNotification === 'function') {
        addNotification({
          targetRole: 'student',
          title: 'New Quiz Available',
          message: `New quiz "${title}" (${quizGen.subject || 'General'}) is now available under Quizzes.`,
          type: 'quiz'
        });
      }
      showToast('Quiz published and assigned to students successfully!', 'success');
    } else {
      if (typeof addNotification === 'function') {
        addNotification({
          targetRole: 'admin',
          title: 'Quiz Awaiting Approval',
          message: `Teacher ${CURRENT_PROFILE?.full_name || 'Faculty'} submitted quiz "${title}" (${quizGen.subject || 'General'}) for content approval.`,
          type: 'quiz'
        });
        addNotification({
          targetUserId: userId,
          targetRole: 'teacher',
          title: 'Quiz Submitted',
          message: `Your quiz "${title}" (${quizGen.subject || 'General'}) was submitted and is waiting for Admin approval.`,
          type: 'quiz'
        });
      }
      showToast('Quiz submitted for Admin approval! Waiting for content review.', 'success');
    }

    if (isStandalone) {
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1200);
    }
  } catch (err) {
    console.error('Quiz save unexpected error:', err);
    showToast('Failed to save quiz: ' + err.message, 'error');
  } finally {
    isSavingQuiz = false;
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `${iconChip()} Save Quiz (${quizGen.questions.length} items)`;
    }
  }
}

async function approveQuiz(id) {
  const quiz = customQuizzes.find(q => q.id === id);
  const { error } = await db.from('quizzes').update({ status: 'active' }).eq('id', id);
  if (error) { showToast('Failed to approve quiz: ' + error.message, 'error'); return; }
  showToast('Quiz approved', 'success');
  if (quiz && typeof addNotification === 'function') {
    addNotification({
      targetUserId: quiz.createdBy,
      targetRole: 'teacher',
      title: 'Quiz Approved',
      message: `Your quiz "${quiz.title}" has been approved by the Admin and is now live.`,
      type: 'quiz'
    });
    addNotification({
      targetRole: 'student',
      title: 'New Quiz Available',
      message: `New quiz "${quiz.title}" (${quiz.subject || 'General'}) is now available under Quizzes.`,
      type: 'quiz'
    });
  }
  await loadQuizzesFromDB();
  if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
  if (typeof renderMaterialsContainer === 'function') renderMaterialsContainer();
}

async function rejectQuiz(id) {
  if (!confirm('Deny this quiz? It will be permanently deleted from the approval queue.')) return;
  const { data: { session } } = await db.auth.getSession().catch(() => ({ data: {} }));
  let deletedSuccess = false;

  customQuizzes = customQuizzes.filter(q => String(q.id) !== String(id));
  if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
  if (typeof renderMaterialsContainer === 'function') renderMaterialsContainer();

  if (session && typeof API_BASE !== 'undefined') {
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) deletedSuccess = true;
    } catch (e) {
      console.warn('Backend quiz rejection failed, falling back to direct Supabase:', e);
    }
  }

  if (typeof db !== 'undefined' && db) {
    await db.from('quizzes').update({ status: 'rejected' }).eq('id', id).catch(() => {});
    await db.from('quiz_attempts').delete().eq('quiz_id', id).catch(() => {});
    await db.from('quizzes').delete().eq('id', id).catch(() => {});
  }

  showToast('Quiz denied and removed', 'success');
  await loadQuizzesFromDB();
  if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
  if (typeof renderMaterialsContainer === 'function') renderMaterialsContainer();
}

async function toggleQuizStatus(id, newStatus) {
  const quiz = customQuizzes.find(q => q.id === id);
  if (!quiz) return;
  try {
    if (typeof db !== 'undefined' && db) {
      const { error } = await db.from('quizzes').update({ status: newStatus }).eq('id', id);
      if (error) {
        showToast('Failed to update quiz status: ' + error.message, 'error');
        return;
      }
    }
    quiz.status = newStatus;
    showToast(`Quiz "${quiz.title}" is now ${newStatus.toUpperCase()}`, 'success');
    await loadQuizzesFromDB();
  } catch (err) {
    showToast('Failed to update quiz: ' + err.message, 'error');
  }
}

async function deleteQuiz(id) {
  const quiz = customQuizzes.find(q => q.id === id);
  const quizTitle = quiz ? quiz.title : 'this quiz';
  if (!confirm(`Are you sure you want to permanently delete "${quizTitle}"? This will remove all associated questions.`)) return;

  const { data: { session } } = await db.auth.getSession().catch(() => ({ data: {} }));
  let deletedSuccess = false;

  customQuizzes = customQuizzes.filter(q => String(q.id) !== String(id));
  if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
  if (typeof renderMaterialsContainer === 'function') renderMaterialsContainer();

  if (session && typeof API_BASE !== 'undefined') {
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (res.ok) deletedSuccess = true;
    } catch (e) {
      console.warn('Backend quiz delete failed, falling back to direct Supabase:', e);
    }
  }

  if (typeof db !== 'undefined' && db) {
    await db.from('quizzes').update({ status: 'rejected' }).eq('id', id).catch(() => {});
    await db.from('quiz_attempts').delete().eq('quiz_id', id).catch(() => {});
    await db.from('quizzes').delete().eq('id', id).catch(() => {});
  }

  showToast(`Quiz "${quizTitle}" deleted successfully`, 'success');
  await loadQuizzesFromDB();
  if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
  if (typeof renderPage === 'function' && typeof currentPage !== 'undefined') renderPage(currentPage);
}

let quizManagerFilterStrand = '';
let quizManagerFilterStatus = '';
let quizManagerFilterSubject = '';
let quizManagerSearchQuery = '';

function setQuizManagerFilterStrand(s) {
  quizManagerFilterStrand = s;
  if (typeof renderPage === 'function') renderPage('quiz');
}

function setQuizManagerFilterStatus(st) {
  quizManagerFilterStatus = st;
  if (typeof renderPage === 'function') renderPage('quiz');
}

function setQuizManagerFilterSubject(subj) {
  quizManagerFilterSubject = subj;
  if (typeof renderPage === 'function') renderPage('quiz');
}

function setQuizManagerSearchQuery(q) {
  quizManagerSearchQuery = (q || '').toLowerCase().trim();
  if (typeof renderPage === 'function') renderPage('quiz');
}


function renderQuizStepper() {
  const steps = [
    { num: 1, label: 'Type' },
    { num: 2, label: 'Description' },
    { num: 3, label: 'Distribution' },
    { num: 4, label: 'Upload' },
    { num: 5, label: 'Preview' }
  ];

  return `
    <div class="qz-stepper-wrap">
      <div class="qz-stepper">
        ${steps.map((st, idx) => {
          const isActive = quizGen.wizardStep === st.num;
          const isDone = quizGen.wizardStep > st.num;
          const statusClass = isActive ? 'active' : isDone ? 'completed' : 'upcoming';
          const isClickable = isDone || isActive;
          return `
            <div class="qz-step-node ${statusClass} ${isClickable ? 'clickable' : ''}" onclick="goToQuizStep(${st.num})">
              <div class="qz-step-circle">
                ${isDone ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : st.num}
              </div>
              <div class="qz-step-meta">
                <span class="qz-step-num">Step ${st.num}</span>
                <span class="qz-step-title">${st.label}</span>
              </div>
            </div>
            ${idx < steps.length - 1 ? `<div class="qz-step-line ${isDone ? 'done' : ''}"></div>` : ''}
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function getQuizConfigSummary() {
  const formatNames = { mc: 'Multiple Choice', tf: 'True / False', id: 'Identification', match: 'Matching Type' };
  const selectedFmtList = Array.from(quizGen.formats).map(f => formatNames[f] || f).join(', ') || 'None';
  const targetSections = quizGen.sections.size > 0 ? Array.from(quizGen.sections).join(', ') : 'All Sections';
  
  let itemCountText = '';
  if (quizGen.distributionMode === 'custom') {
    let sum = 0;
    quizGen.formats.forEach(f => { sum += (quizGen.formatCounts[f] || 0); });
    itemCountText = `${sum} Items (Custom Breakdown)`;
  } else {
    itemCountText = quizGen.count === 'auto' ? 'Auto Balanced by System' : `${quizGen.count} Items (Balanced)`;
  }

  const timerText = quizGen.type === 'interactive'
    ? (quizGen.timerPerQuestion > 0 ? `${quizGen.timerPerQuestion}s per question` : 'Untimed')
    : (quizGen.timeLimitMinutes > 0 ? `${quizGen.timeLimitMinutes} minutes overall` : 'Untimed');

  const deadlineText = quizGen.dueDate ? new Date(quizGen.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No Expiration Set';

  const mcInfo = quizGen.formats.has('mc') ? ` · ${quizGen.optionsCount || 4} Choices/MC` : '';

  return `
    <div class="qz-summary-box">
      <div class="qz-summary-head">
        <span class="qz-summary-icon">${iconChip()}</span>
        <span>Quiz Configuration Summary</span>
      </div>
      <div class="qz-summary-grid">
        <div class="qz-summary-item">
          <span class="qz-summary-label">Format / Type</span>
          <span class="qz-summary-val">${quizGen.type === 'interactive' ? '🎮 Interactive Game' : '📝 Standard Quiz'}</span>
        </div>
        <div class="qz-summary-item">
          <span class="qz-summary-label">Title & Subject</span>
          <span class="qz-summary-val">${escHtml(quizGen.title || 'Untitled')} · ${escHtml(quizGen.subject || 'General')}</span>
        </div>
        <div class="qz-summary-item">
          <span class="qz-summary-label">Target Audience</span>
          <span class="qz-summary-val">${escHtml(quizGen.gradeLevel)} · ${escHtml(targetSections)}</span>
        </div>
        <div class="qz-summary-item">
          <span class="qz-summary-label">Items & Formats</span>
          <span class="qz-summary-val">${escHtml(itemCountText)} (${escHtml(selectedFmtList)}${mcInfo})</span>
        </div>
        <div class="qz-summary-item">
          <span class="qz-summary-label">Timer Mode</span>
          <span class="qz-summary-val">⏱️ ${escHtml(timerText)}</span>
        </div>
        <div class="qz-summary-item">
          <span class="qz-summary-label">Deadline</span>
          <span class="qz-summary-val">📅 ${escHtml(deadlineText)}</span>
        </div>
      </div>
    </div>
  `;
}

function getQuizConfirmDataCard() {
  const formatNames = { mc: 'Multiple Choice', tf: 'True / False', id: 'Identification', match: 'Matching Type' };
  const selectedFmtList = Array.from(quizGen.formats).map(f => formatNames[f] || f).join(', ') || 'None';
  const targetSections = quizGen.sections.size > 0 ? Array.from(quizGen.sections).join(', ') : 'All Sections';
  const targetStrands = quizGen.strands.size > 0 ? Array.from(quizGen.strands).join(', ') : 'All Strands';

  let itemCountText = '';
  if (quizGen.distributionMode === 'custom') {
    let sum = 0;
    quizGen.formats.forEach(f => { sum += (quizGen.formatCounts[f] || 0); });
    itemCountText = `${sum} Items (Custom: ${selectedFmtList})`;
  } else {
    itemCountText = quizGen.count === 'auto' ? 'Automatic (System Balanced)' : `${quizGen.count} Items (${selectedFmtList})`;
  }

  const timerText = quizGen.type === 'interactive'
    ? (quizGen.timerPerQuestion > 0 ? `${quizGen.timerPerQuestion}s per item` : 'Untimed')
    : (quizGen.timeLimitMinutes > 0 ? `${quizGen.timeLimitMinutes} minutes` : 'Untimed');

  const deadlineText = quizGen.dueDate ? new Date(quizGen.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No Expiration (Anytime)';

  const mcInfo = quizGen.formats.has('mc') ? ` · ${quizGen.optionsCount || 4} Choices/MC` : '';

  return `
    <div class="qz-confirm-data-box">
      <div class="qz-confirm-data-header">
        <div class="qz-cd-title">
          <span class="qz-summary-icon">${iconChip()}</span>
          <span>Confirm Quiz Data</span>
        </div>
        <span class="qz-cd-status-pill">✓ Confirmed & Verified</span>
      </div>
      <div class="qz-confirm-data-grid">
        <div class="qz-cd-item">
          <span class="qz-cd-label">Quiz Title & Subject</span>
          <span class="qz-cd-val">${escHtml(quizGen.title || 'Untitled Quiz')} · <strong style="color:var(--blue);">${escHtml(quizGen.subject || 'General')}</strong></span>
        </div>
        <div class="qz-cd-item">
          <span class="qz-cd-label">Target Audience</span>
          <span class="qz-cd-val">${escHtml(quizGen.gradeLevel)} · ${escHtml(targetSections)} (${escHtml(targetStrands)})</span>
        </div>
        <div class="qz-cd-item">
          <span class="qz-cd-label">Mode & Timer</span>
          <span class="qz-cd-val">${quizGen.type === 'interactive' ? '🎮 Interactive' : '📝 Standard'} · ⏱️ ${escHtml(timerText)}</span>
        </div>
        <div class="qz-cd-item">
          <span class="qz-cd-label">Items & Expiration</span>
          <span class="qz-cd-val">${escHtml(itemCountText)}${mcInfo} · 📅 ${escHtml(deadlineText)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderQuizModal() {
  const body = document.getElementById('quizModalBody');
  const foot = document.getElementById('quizModalFoot');
  if (body) body.scrollTop = 0;

  if (quizGen.step === 'loading') {
    const numFiles = (quizGen.files && quizGen.files.length > 1) ? quizGen.files.length : (quizGen.file ? 1 : 1);
    const fileCountText = numFiles > 1 ? `Analyzing ${numFiles} uploaded handouts` : 'Analyzing your uploaded handout';
    body.innerHTML = `
      <div class="gen-loading">
        <div class="gl-ring"></div>
        <p style="font-weight:700;font-size:15px;color:#0f172a;margin-top:14px;">${fileCountText} with Gemini AI…</p>
        <span class="gl-sub" style="max-width:440px;line-height:1.5;margin-top:4px;">Drafting questions, citations, and answers. For multi-page or multiple handouts, processing takes about 1–2 minutes during peak hours.</span>
      </div>`;
    foot.innerHTML = '';
    return;
  }
  if (quizGen.step === 'error') {
    body.innerHTML = `<div class="gen-error">${escHtml(quizGen.errorMsg)}</div>`;
    foot.innerHTML = `<button class="foot-btn-secondary" onclick="closeQuizModal()">Cancel</button><button class="gen-btn" onclick="generateQuiz()">Try Again</button>`;
    return;
  }
  if (quizGen.step === 'results') {
    const isDemo = quizGen.questions.some(q => q._demo);
    body.innerHTML = `
      ${isDemo ? `<div class="demo-banner">${iconChip()} <div><strong>Preview Mode</strong> — The system API is currently not working or temporarily busy. Showing sample generated questions. You may try generating again shortly.</div></div>` : ''}
      <div class="qresult-list">${quizGen.questions.map((q, idx) => renderQuestionCard(q, idx)).join('')}</div>`;
    foot.innerHTML = `<button class="foot-btn-secondary" onclick="quizGen.step='setup';quizGen.wizardStep=4;renderQuizModal();">Back</button><button class="gen-btn" onclick="saveQuiz()">${iconChip()} Save Quiz (${quizGen.questions.length} items)</button>`;
    return;
  }

  const isTeacherLocked = CURRENT_PROFILE && CURRENT_PROFILE.role === 'teacher' && CURRENT_PROFILE.section;
  const teacherStrands = (CURRENT_PROFILE && CURRENT_PROFILE.strand)
    ? CURRENT_PROFILE.strand.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const isTeacher = CURRENT_PROFILE && CURRENT_PROFILE.role === 'teacher';

  const formatNames = { mc: 'Multiple Choice', tf: 'True / False', id: 'Identification', match: 'Matching Type' };
  const selectedFmtList = Array.from(quizGen.formats);
  const isMultiFormat = selectedFmtList.length > 1;

  const { currentYear, selectedYear, selectedMonth, selectedDay, selectedTime, daysInMonth } = getQuizDueDateParts();

  // Calculate live breakdown percentages
  let totalCalculatedCount = 0;
  selectedFmtList.forEach(f => { totalCalculatedCount += (quizGen.formatCounts[f] || 0); });
  const isCustomMode = quizGen.distributionMode === 'custom';

  const stepperHtml = renderQuizStepper();

  if (quizGen.wizardStep === 1) {
    // ── STEP 1: TYPE OF QUIZ ──
    body.innerHTML = `
      ${stepperHtml}
      <div class="qz-step-pane">
        <div class="qz-step-banner">
          <div class="qz-step-banner-title">
            <span>1. Select Quiz Type</span>
          </div>
          <span class="qz-step-banner-tag">Step 1 of 5</span>
        </div>
        <div class="type-select">
          <div class="type-card ${quizGen.type === 'standard' ? 'active' : ''} standard-quiz-card" onclick="selectQuizType('standard')">
            <div class="tc-icon">${iconQuiz()}</div>
            <h4>Standard Quiz</h4>
            <p>System-generated multiple choice, true/false, identification, and matching questions</p>
          </div>
          <div class="type-card ${quizGen.type === 'interactive' ? 'active' : ''}" onclick="selectQuizType('interactive')">
            <span class="soon-tag" style="background:#e0f2fe;color:#0284c7;">🎮 Game</span>
            <div class="tc-icon" style="${quizGen.type === 'interactive' ? 'background:linear-gradient(135deg, #0284c7, #8b5cf6);' : ''}">${iconGamepad()}</div>
            <h4>Interactive Game</h4>
            <p>Animated gamified cards, drag & drop matching, and question timer</p>
          </div>
        </div>
        ${quizGen.type === 'interactive' ? `
        <div class="gen-field" style="background:#f0f7ff;border:1.5px solid #bae6fd;border-radius:14px;padding:14px;margin-top:4px;">
          <label style="color:#0284c7;display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <span>⏱️</span> Question Timer (Per Item)
          </label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${[
              { val: 0, label: 'Untimed' },
              { val: 15, label: '15s' },
              { val: 30, label: '30s' },
              { val: 45, label: '45s' },
              { val: 60, label: '60s' }
            ].map(t => `
              <div class="format-chip ${quizGen.timerPerQuestion === t.val ? 'on' : ''}" 
                   style="border-radius:10px;padding:6px 14px;font-size:12px;"
                   onclick="quizGen.timerPerQuestion = ${t.val}; renderQuizModal();">
                ${t.label}
              </div>
            `).join('')}
          </div>
          <span style="font-size:11.5px;color:#64748b;margin-top:6px;display:block;">
            Students will see an animated timer countdown on each question in the arena.
          </span>
        </div>
        ` : `
        <div class="gen-field" style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;padding:12px 14px;margin-top:4px;">
          <span style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
            <span>ℹ️</span> <strong>Standard assessment mode</strong> — Questions are answered sequentially with optional overall time limit.
          </span>
        </div>
        `}
      </div>
    `;

    foot.innerHTML = `
      <button class="foot-btn-secondary" onclick="closeQuizModal()">Cancel</button>
      <button class="gen-btn" onclick="nextQuizStep()">Next: Quiz Description &rarr;</button>
    `;
    return;
  }

  if (quizGen.wizardStep === 2) {
    // ── STEP 2: DESCRIPTION OF QUIZ ──
    const allowedStrands = getTeacherAllowedStrands();
    const allowedGrades = getTeacherAllowedGradeLevels();
    const allowedSections = getTeacherAllowedSections();

    body.innerHTML = `
      ${stepperHtml}
      <div class="qz-step-pane">
        <div class="qz-step-banner">
          <div class="qz-step-banner-title">
            <span>2. Quiz Description & Target Audience</span>
          </div>
          <span class="qz-step-banner-tag">Step 2 of 5</span>
        </div>

        <div class="gen-field">
          <label>Target Strands ${isTeacher && allowedStrands.length < STRANDS.length ? '<span style="color:#0284c7;font-size:11.5px;font-weight:600;">(Your Assigned Strand' + (allowedStrands.length > 1 ? 's' : '') + ')</span>' : '<span style="text-transform:none;font-weight:500;color:var(--text-muted);">(select strand to filter subject list)</span>'}</label>
          <div class="format-grid">
            ${allowedStrands.map(s => {
              const isSelected = quizGen.strands.has(s);
              const isLocked = isTeacher && allowedStrands.length === 1;
              return `<div class="format-chip ${isSelected ? 'on' : ''}" onclick="toggleQuizStrand('${s}')">${s}${isLocked ? ' 🔒' : ''}</div>`;
            }).join('')}
          </div>
        </div>

        <div class="gen-row">
          <div class="gen-field">
            <label>Quiz Title <span style="color:#ef4444;">*</span></label>
            <input type="text" id="quizGenTitleInput" placeholder="e.g. Cybersecurity – Quiz 4" value="${escHtml(quizGen.title)}" oninput="updateTitle(this.value)">
          </div>
          <div class="gen-field">
            <label>Subject <span style="color:#ef4444;">*</span></label>
            <select id="quizGenSubjectSelect" onchange="updateSubject(this.value)">
              <option value="" disabled ${!quizGen.subject ? 'selected' : ''}>${quizGen.strands.size > 0 ? 'Select subject' : 'Select subject (All Strands)'}</option>
              ${getAvailableSubjectsForQuizGen().map(sub => `<option value="${escHtml(sub)}" ${quizGen.subject === sub ? 'selected' : ''}>${escHtml(sub)}</option>`).join('')}
              ${(quizGen.subject && !getAvailableSubjectsForQuizGen().includes(quizGen.subject)) ? `<option value="${escHtml(quizGen.subject)}" selected>${escHtml(quizGen.subject)}</option>` : ''}
            </select>
          </div>
        </div>

        <div class="gen-row">
          <div class="gen-field">
            <label>Grade Level ${isTeacher && allowedGrades.length < GRADE_LEVELS.length ? '<span style="color:#0284c7;font-size:11px;font-weight:600;">(Assigned)</span>' : ''}</label>
            <select onchange="quizGen.gradeLevel = this.value; renderQuizModal();" ${isTeacher && allowedGrades.length === 1 ? 'disabled style="background:#f8fafc;cursor:not-allowed;"' : ''}>
              ${allowedGrades.map(g => `<option value="${g}" ${quizGen.gradeLevel === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          </div>
          <div class="gen-field"><label>Lesson</label><input type="text" placeholder="e.g. Lesson 3" value="${escHtml(quizGen.lesson)}" oninput="quizGen.lesson = this.value;"></div>
        </div>

        <div class="gen-field">
          <label>Target Sections ${isTeacher && allowedSections.length < SECTIONS.length ? '<span style="color:#0284c7;font-size:11.5px;font-weight:600;">(Your Assigned Section' + (allowedSections.length > 1 ? 's' : '') + ')</span>' : '<span style="text-transform:none;font-weight:500;color:var(--text-muted);">(select multiple or leave blank for all)</span>'}</label>
          <div class="format-grid">
            ${allowedSections.map(s => {
              const isSelected = quizGen.sections.has(s);
              const isLocked = isTeacher && allowedSections.length === 1;
              return `<div class="format-chip ${isSelected ? 'on' : ''}" onclick="toggleQuizSection('${s}')">${s}${isLocked ? ' 🔒' : ''}</div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    foot.innerHTML = `
      <button class="foot-btn-secondary" onclick="prevQuizStep()">&larr; Back</button>
      <button class="gen-btn" onclick="nextQuizStep()">Next: Deadline & Distribution &rarr;</button>
    `;
    return;
  }

  if (quizGen.wizardStep === 3) {
    // ── STEP 3: DEADLINE, TIMER & DISTRIBUTION ──
    const formattedDeadline = quizGen.dueDate 
      ? new Date(quizGen.dueDate).toLocaleString([], { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';

    const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1)
      .map(d => `<option value="${d}" ${selectedDay === d ? 'selected' : ''}>${d}</option>`)
      .join('');

    body.innerHTML = `
      ${stepperHtml}
      <div class="qz-step-pane">
        <div class="qz-step-banner">
          <div class="qz-step-banner-title">
            <span>3. Deadline, Timer &amp; Question Distribution</span>
          </div>
          <span class="qz-step-banner-tag">Step 3 of 5</span>
        </div>

        <!-- ── DEADLINE CARD ── -->
        <div class="gen-field qz-card-field">
          <div class="qz-card-header">
            <label><span>📅</span> Quiz Expiration / Due Date &amp; Time</label>
            <span class="qz-card-sublabel">${quizGen.dueDate ? 'Deadline Active' : 'Optional · No Expiration'}</span>
          </div>

          <div class="count-pills" style="margin-bottom:6px;">
            <div class="count-pill ${!quizGen.dueDate ? 'on' : ''}" onclick="setDeadlinePreset('none')">No Deadline</div>
            <div class="count-pill" onclick="setDeadlinePreset('today')">Today 11:59 PM</div>
            <div class="count-pill" onclick="setDeadlinePreset('tomorrow')">Tomorrow 11:59 PM</div>
            <div class="count-pill" onclick="setDeadlinePreset('3days')">In 3 Days</div>
            <div class="count-pill" onclick="setDeadlinePreset('1week')">In 1 Week</div>
          </div>

          <div class="qz-datetime-grid-4">
            <div class="qz-dt-item">
              <span class="qz-dt-label">Month</span>
              <select class="qz-dt-select" onchange="updateQuizMonthPart(this.value)">
                ${MONTH_NAMES.map((mn, idx) => `<option value="${idx}" ${selectedMonth === idx ? 'selected' : ''}>${mn}</option>`).join('')}
              </select>
            </div>
            <div class="qz-dt-item">
              <span class="qz-dt-label">Day</span>
              <select class="qz-dt-select" onchange="updateQuizDayPart(this.value)">
                ${dayOptions}
              </select>
            </div>
            <div class="qz-dt-item">
              <span class="qz-dt-label">Year</span>
              <select class="qz-dt-select" onchange="updateQuizYearPart(this.value)">
                <option value="${currentYear}" ${selectedYear === currentYear ? 'selected' : ''}>${currentYear}</option>
              </select>
            </div>
            <div class="qz-dt-item">
              <span class="qz-dt-label">Time</span>
              <input type="time" class="qz-dt-select" value="${selectedTime}" onchange="updateQuizTimePart(this.value)">
            </div>
          </div>

          ${quizGen.dueDate ? `
          <div class="qz-deadline-active-badge">
            <div class="qz-dab-text">
              <span>⏰</span>
              <span><strong>Deadline Set:</strong> ${formattedDeadline}</span>
            </div>
            <button type="button" class="qz-dab-clear" onclick="setDeadlinePreset('none')" title="Remove deadline">&times; Clear</button>
          </div>
          ` : `
          <span style="font-size:11.5px;color:var(--text-muted);margin-top:2px;display:block;">
            🕒 Select month by name · Hour &amp; minute selectable · Restricted up to <strong>${currentYear}</strong> only · Past dates blocked.
          </span>
          `}
        </div>

        <!-- ── TIMER CARD ── -->
        ${quizGen.type === 'standard' ? `
        <div class="gen-field standard-timer-field">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <label style="color:#1e40af;display:flex;align-items:center;gap:6px;margin-bottom:0;font-weight:700;font-size:13px;">
              <span>⏱️</span> Quiz Time Limit (Minutes)
            </label>
            <span style="font-size:11.5px;color:var(--text-muted);font-weight:600;">
              ${quizGen.timeLimitMinutes > 0 ? `<strong style="color:var(--blue);">${quizGen.timeLimitMinutes} minute${quizGen.timeLimitMinutes === 1 ? '' : 's'}</strong> countdown` : 'Untimed (No time limit)'}
            </span>
          </div>

          <div class="count-pills" style="margin-bottom:10px;">
            ${[
              { val: 0, label: 'Untimed' },
              { val: 5, label: '5m' },
              { val: 10, label: '10m' },
              { val: 15, label: '15m' },
              { val: 20, label: '20m' },
              { val: 30, label: '30m' },
              { val: 45, label: '45m' },
              { val: 60, label: '60m' }
            ].map(t => `
              <div class="count-pill ${quizGen.timeLimitMinutes === t.val ? 'on' : ''}"
                   style="border-radius:8px;padding:6px 13px;font-size:12px;font-weight:600;"
                   onclick="setStandardTimeLimit(${t.val})">
                ${t.label}
              </div>
            `).join('')}
          </div>

          <div class="custom-count-row" style="margin-top:2px;">
            <span class="cc-label">Adjust custom minutes:</span>
            <div style="display:inline-flex;align-items:center;gap:3px;background:#fff;border:1.5px solid var(--blue-light);border-radius:8px;padding:2px 6px;">
              <button type="button" class="sq-step-btn" onclick="adjustStandardTimeLimit(-1)" title="Decrease 1 minute">−</button>
              <input type="number" min="0" max="180" class="custom-count-input" style="width:65px !important;text-align:center;padding:3px 4px !important;border:none !important;font-weight:700;color:var(--blue);" value="${quizGen.timeLimitMinutes || ''}" placeholder="0" oninput="updateStandardTimeLimitInput(this.value)">
              <button type="button" class="sq-step-btn" onclick="adjustStandardTimeLimit(1)" title="Increase 1 minute">+</button>
            </div>
            <span class="cc-hint">minutes (0 = untimed · auto-submits when time expires)</span>
          </div>
        </div>
        ` : ''}

        <!-- ── QUESTION FORMATS SELECTION ── -->
        <div class="gen-field">
          <label>Question Formats</label>
          <div class="format-grid">
            <div class="format-chip ${quizGen.formats.has('mc') ? 'on' : ''}" onclick="toggleFormat('mc')">Multiple Choice</div>
            <div class="format-chip ${quizGen.formats.has('tf') ? 'on' : ''}" onclick="toggleFormat('tf')">True or False</div>
            <div class="format-chip ${quizGen.formats.has('id') ? 'on' : ''}" onclick="toggleFormat('id')">Identification</div>
            <div class="format-chip ${quizGen.formats.has('match') ? 'on' : ''}" onclick="toggleFormat('match')">Matching Type</div>
            <div class="format-chip ${quizGen.formats.size === 4 ? 'on' : ''}" onclick="setAllFormats()">All Formats</div>
          </div>
        </div>

        <!-- ── OPTIONS COUNT SELECTOR (IF MULTIPLE CHOICE SELECTED) ── -->
        ${quizGen.formats.has('mc') ? `
        <div class="gen-field" style="background:#f8fbff;border:1.5px solid #dbeafe;border-radius:12px;padding:12px 16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
            <div>
              <label style="margin-bottom:2px;color:#1e40af;font-weight:700;">Choices per Multiple Choice Question</label>
              <span style="font-size:11.5px;color:#64748b;">Choose presets or specify custom amount (2 to 8 choices)</span>
            </div>
            <div class="count-pills">
              ${[2, 3, 4, 5, 6].map(num => `
                <div class="count-pill ${(quizGen.optionsCount || 4) === num ? 'on' : ''}"
                     style="padding:5px 12px;font-size:12px;font-weight:700;"
                     onclick="setOptionsCount(${num})">
                  ${num} Choices
                </div>
              `).join('')}
            </div>
          </div>
          <div class="custom-count-row" style="margin-top:4px;">
            <span class="cc-label">Or custom choice amount:</span>
            <div style="display:inline-flex;align-items:center;gap:3px;background:#fff;border:1.5px solid var(--blue-light);border-radius:8px;padding:2px 6px;">
              <button type="button" class="sq-step-btn" onclick="adjustOptionsCount(-1)" title="Decrease choices">−</button>
              <input type="number" min="2" max="8" class="custom-count-input" style="width:55px !important;text-align:center;padding:3px 4px !important;border:none !important;font-weight:700;color:var(--blue);" value="${quizGen.optionsCount || 4}" oninput="updateCustomOptionsCountInput(this.value)">
              <button type="button" class="sq-step-btn" onclick="adjustOptionsCount(1)" title="Increase choices">+</button>
            </div>
            <span class="cc-hint">choices (2 to 8 supported · Options A through ${String.fromCharCode(64 + Math.min(8, Math.max(2, quizGen.optionsCount || 4)))})</span>
          </div>
        </div>
        ` : ''}

        <!-- ── DISTRIBUTION STYLE ── -->
        ${isMultiFormat ? `
        <div class="gen-field">
          <label>Question Distribution Style</label>
          <div class="dist-mode-pills">
            <div class="dist-mode-pill ${quizGen.distributionMode === 'balanced' ? 'on' : ''}" onclick="setDistributionMode('balanced')">
              <div class="dmp-title">⚖️ Balanced Distribution</div>
              <div class="dmp-desc">Evenly balances amounts across selected styles (${selectedFmtList.map(f => formatNames[f]).join(' & ')})</div>
            </div>
            <div class="dist-mode-pill ${quizGen.distributionMode === 'custom' ? 'on' : ''}" onclick="setDistributionMode('custom')">
              <div class="dmp-title">🎯 Custom Amount per Type</div>
              <div class="dmp-desc">Set specific numbers for each question style (e.g. 5 Multiple Choice + 5 True/False)</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${isCustomMode ? `
        <div class="gen-field custom-dist-section">
          <label>Set Question Count for Each Format</label>
          <div class="dist-inputs-grid">
            ${selectedFmtList.map(fmt => {
              const val = quizGen.formatCounts[fmt] || 0;
              const pct = totalCalculatedCount > 0 ? Math.round((val / totalCalculatedCount) * 100) : 0;
              return `
              <div class="dist-item-card">
                <div class="dic-label">${formatNames[fmt]}</div>
                <div class="dic-input-wrap">
                  <input type="number" min="0" max="60" value="${val}" onchange="updateFormatCount('${fmt}', this.value)">
                  <span class="dic-unit">items (${pct}%)</span>
                </div>
              </div>`;
            }).join('')}
          </div>
          <div class="dist-summary-banner">
            <span>Total Quiz Items: <strong>${totalCalculatedCount}</strong></span>
            <div class="dist-pct-chips">
              ${selectedFmtList.map(fmt => {
                const val = quizGen.formatCounts[fmt] || 0;
                const pct = totalCalculatedCount > 0 ? Math.round((val / totalCalculatedCount) * 100) : 0;
                return `<span class="dist-pct-chip">${formatNames[fmt]}: <strong>${val}</strong> (${pct}%)</span>`;
              }).join('')}
            </div>
          </div>
        </div>
        ` : `
        <div class="gen-field">
          <label>Total Number of Questions</label>
          <div class="count-pills">
            <div class="count-pill ${quizGen.count === 'auto' ? 'on' : ''}" onclick="selectCount('auto')">Automatic</div>
            <div class="count-pill ${quizGen.count === 5 ? 'on' : ''}" onclick="selectCount(5)">5</div>
            <div class="count-pill ${quizGen.count === 10 ? 'on' : ''}" onclick="selectCount(10)">10</div>
            <div class="count-pill ${quizGen.count === 15 ? 'on' : ''}" onclick="selectCount(15)">15</div>
            <div class="count-pill ${quizGen.count === 20 ? 'on' : ''}" onclick="selectCount(20)">20</div>
            <div class="count-pill ${quizGen.count === 25 ? 'on' : ''}" onclick="selectCount(25)">25</div>
          </div>
          <div class="custom-count-row">
            <span class="cc-label">Or type custom amount:</span>
            <input type="number" min="1" max="60" placeholder="e.g. 7 or 9" class="custom-count-input" value="${quizGen.customCount}" oninput="updateCustomCountInput(this.value)">
            <span class="cc-hint">${typeof quizGen.count === 'number' ? `(${quizGen.count} questions total${isMultiFormat ? ' · evenly balanced' : ''})` : '(System will choose optimal balanced count)'}</span>
          </div>
        </div>
        `}

        <!-- ── CONFIRM DATA REVIEW BOX ── -->
        ${getQuizConfirmDataCard()}
      </div>
    `;

    foot.innerHTML = `
      <button class="foot-btn-secondary" onclick="prevQuizStep()">&larr; Back</button>
      <button class="gen-btn" onclick="nextQuizStep()">Confirm Data & Upload &rarr;</button>
    `;
    return;
  }

  // ── STEP 4: MULTI-HANDOUT UPLOAD & GENERATE ──
  if (quizGen.wizardStep === 4) {
    const totalFiles = (quizGen.files || []).length;
    const totalBytes = quizGen.totalSizeBytes || 0;
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
    const capacityPct = Math.min(100, Math.round((totalBytes / MAX_UPLOAD_BYTES) * 100));

    body.innerHTML = `
      ${stepperHtml}
      <div class="qz-step-pane">
        <div class="qz-step-banner">
          <div class="qz-step-banner-title">
            <span>4. Upload Handouts &amp; Generate Questions</span>
          </div>
          <span class="qz-step-banner-tag">Step 4 of 5</span>
        </div>

        <div class="gen-field">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">
            <label style="margin-bottom:0;">Source Handouts / Modules <span style="color:#ef4444;">*</span></label>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted);">PDF, DOCX, TXT · Multiple files supported · Max 50MB total</span>
          </div>

          <label class="dropzone" for="quizFileInput">
            ${iconUpload()}
            <div class="dz-title">Click to upload or drag &amp; drop handouts &amp; modules</div>
            <div class="dz-sub">Select multiple files at once (PDF, DOCX, TXT · Combined limit 50MB only)</div>
          </label>
          <input type="file" id="quizFileInput" multiple accept=".pdf,.docx,.txt" style="display:none" onchange="handleFileInput(this)">

          <!-- Live Capacity Tracker -->
          <div class="qz-upload-capacity-tracker">
            <span>Combined Upload Size: <strong>${totalMb} MB / 50 MB</strong> (${totalFiles} file${totalFiles === 1 ? '' : 's'})</span>
            <span>${capacityPct}% Used</span>
          </div>
          <div class="qz-capacity-meter">
            <div class="qz-capacity-fill ${capacityPct > 80 ? 'warning' : ''} ${capacityPct >= 100 ? 'danger' : ''}" style="width: ${capacityPct}%;"></div>
          </div>

          <!-- Multi-File List -->
          ${totalFiles > 0 ? `
          <div class="qz-multi-file-list" style="margin-top:12px;">
            ${quizGen.files.map(f => {
              const fMb = (f.size / (1024 * 1024)).toFixed(1);
              return `
              <div class="qz-file-item">
                <div class="qz-file-info">
                  <div class="qz-file-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div class="qz-file-details">
                    <h5>${escHtml(f.name)}</h5>
                    <span>${fMb} MB · Handout ready for citation</span>
                  </div>
                </div>
                <button type="button" class="fc-remove" onclick="removeFile('${escHtml(f.name).replace(/'/g, "\\'")}')" title="Remove this handout">
                  ${iconClose()}
                </button>
              </div>`;
            }).join('')}
          </div>
          ` : ''}
        </div>

        ${getQuizConfigSummary()}

        ${totalFiles > 0 ? `
        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
          <span style="font-size:22px;">✨</span>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:2px;">${totalFiles} Handout${totalFiles > 1 ? 's' : ''} Ready to Generate!</div>
            <div style="font-size:11.5px;color:#64748b;">The AI engine will read across all uploaded materials, track document citations and page numbers, and draft structured questions.</div>
          </div>
        </div>
        ` : ''}
      </div>
    `;

    foot.innerHTML = `
      <button class="foot-btn-secondary" onclick="prevQuizStep()">&larr; Back</button>
      <button class="gen-btn" ${totalFiles === 0 ? 'disabled' : ''} onclick="generateQuiz()">${iconChip()} Generate Questions &rarr;</button>
    `;
    return;
  }

  // ── STEP 5: PREVIEW, HOVER PENCIL EDIT & SAVE ──
  const hasQuestions = quizGen.questions && quizGen.questions.length > 0;
  const isDemo = hasQuestions && quizGen.questions.some(q => q._demo);
  const isInter = quizGen.type === 'interactive';

  body.innerHTML = `
    ${stepperHtml}
    <div class="qz-step-pane">
      <div class="qz-step-banner">
        <div class="qz-step-banner-title">
          <span>5. Preview, Edit &amp; Double Check</span>
          ${isInter ? '<span style="margin-left:8px;padding:3px 10px;background:#e0f2fe;color:#0284c7;border-radius:50px;font-size:11px;font-weight:800;">🎮 Interactive Arena</span>' : '<span style="margin-left:8px;padding:3px 10px;background:#f1f5f9;color:#475569;border-radius:50px;font-size:11px;font-weight:600;">📝 Standard Quiz</span>'}
        </div>
        <span class="qz-step-banner-tag">Step 5 of 5</span>
      </div>

      ${hasQuestions ? `
      <div class="qz-questions-preview-section">
        <div class="qz-preview-header">
          <div class="qz-preview-title">
            <span class="qz-preview-icon">${isInter ? '🎮' : '📝'}</span>
              <h4>${isInter ? 'Interactive Game Items' : 'Question Items Preview'} (${quizGen.questions.length} items)</h4>
              <span>${isInter ? `Interactive cards with animated countdown (${quizGen.timerPerQuestion > 0 ? `⏱️ ${quizGen.timerPerQuestion}s per item` : 'Untimed'})` : 'Hover on any question to edit choices, prompts, and answers with the pencil'}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            ${isInter ? `
            <button type="button" class="foot-btn-secondary" onclick="previewGeneratedInteractiveQuiz()" style="font-size:11.5px;padding:5px 12px;border-radius:8px;font-weight:700;background:#e0f2fe;border-color:#bae6fd;color:#0284c7;">
              🎮 Test Game Arena
            </button>` : ''}
            <button type="button" class="foot-btn-secondary" onclick="addNewManualQuestion()" style="font-size:11.5px;padding:6px 14px;border-radius:8px;font-weight:700;">
              + Add Question
            </button>
          </div>
        </div>

        ${isDemo ? `
        <div class="demo-banner">
          <span class="qz-summary-icon" style="display:inline-flex;">${iconChip()}</span>
          <div><strong>Preview Mode</strong> — Sample generated questions. You may edit them below before saving.</div>
        </div>` : ''}

        <div class="qresult-list">
          ${quizGen.questions.map((q, idx) => renderQuestionCard(q, idx)).join('')}
        </div>
      </div>
      ` : `
      <div style="background:#fef9c3;border:1.5px solid #fde68a;border-radius:12px;padding:16px;text-align:center;color:#92400e;">
        <div style="font-size:20px;margin-bottom:6px;">⚠️</div>
        <strong>No questions yet.</strong><br>
        <span style="font-size:12px;">Go back to Step 4 and generate questions first.</span>
      </div>
      `}
    </div>
  `;

  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="prevQuizStep()">&larr; Back</button>
    <div class="qz-foot-actions">
      <button class="foot-btn-secondary" onclick="quizGen.wizardStep=4;generateQuiz();" title="Re-generate questions using system">🔄 Re-generate</button>
      ${isInter ? `
      <button class="foot-btn-secondary" onclick="previewGeneratedInteractiveQuiz()" style="background:#e0f2fe;border-color:#bae6fd;color:#0284c7;font-weight:700;">🎮 Test Arena</button>
      ` : ''}
      <button class="gen-btn" ${!hasQuestions ? 'disabled' : ''} style="${isInter ? 'background:linear-gradient(135deg,#0284c7,#8b5cf6);' : ''}" onclick="saveQuiz()">${iconChip()} Save ${isInter ? 'Interactive ' : ''}Quiz${hasQuestions ? ` (${quizGen.questions.length} items)` : ''}</button>
    </div>
  `;
}

function renderQuestionCard(q, idx) {
  const qNum = typeof idx === 'number' ? (idx + 1) : '';
  const isEditing = quizGen.editingId === q._id;

  const tagClass = q.type === 'multiple_choice' ? 'mc' : q.type === 'true_false' ? 'tf' : q.type === 'identification' ? 'id' : 'match';
  const tagLabel = q.type === 'multiple_choice' ? 'Multiple Choice' : q.type === 'true_false' ? 'True / False' : q.type === 'identification' ? 'Identification' : 'Matching Type';

  const cardLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const cardColors = ['#22c55e', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#3b82f6', '#14b8a6', '#6366f1'];

  const sourceName = q.source_file || q.sourceMaterial || (quizGen.files && quizGen.files[0] ? quizGen.files[0].name : 'Handout');
  const sourcePage = q.source_page || null;

  let body = '';

  if (isEditing) {
    // ── INLINE ACTIVE EDITOR MODE ──
    if (q.type === 'multiple_choice') {
      const opts = q.options || [];
      body = `
        <div class="qz-inline-editor">
          <label class="qr-label">Question Prompt</label>
          <textarea rows="2" data-field="question" oninput="editQuestion('${q._id}','question',this.value)">${escHtml(q.question || '')}</textarea>
          
          <label class="qr-label" style="margin-top:8px;">Choices &amp; Correct Answer (select radio to mark correct)</label>
          <div class="qr-options">
            ${opts.map((opt, i) => `
              <div class="qz-choice-edit-row">
                <input type="radio" name="ans-${q._id}" ${i === q._answerIdx ? 'checked' : ''} onchange="setAnswerIndex('${q._id}', ${i})" title="Mark as correct answer">
                <span class="qz-choice-letter" style="background:${cardColors[i] || '#64748b'};">${cardLetters[i] || String.fromCharCode(65 + i)}</span>
                <input type="text" data-field="opt-${i}" value="${escHtml(opt)}" oninput="editOption('${q._id}', ${i}, this.value)" placeholder="Choice ${cardLetters[i] || (i + 1)}">
                ${opts.length > 2 ? `<button type="button" class="qr-opt-del-btn" title="Remove choice" onclick="removeOption('${q._id}', ${i})">&times;</button>` : ''}
              </div>
            `).join('')}
          </div>
          ${opts.length < 8 ? `
          <div style="margin-top:8px;">
            <button type="button" class="qz-add-choice-btn" onclick="addOption('${q._id}')">+ Add Choice</button>
          </div>
          ` : ''}

          <!-- Handout Citation Editor -->
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-top:10px;padding-top:8px;border-top:1px dashed #cbd5e1;">
            <div>
              <label class="qr-label" style="font-size:10.5px;">Source Handout / Document</label>
              <input type="text" value="${escHtml(sourceName)}" oninput="updateSourceFile('${q._id}', this.value)" placeholder="e.g. Chapter1.pdf">
            </div>
            <div>
              <label class="qr-label" style="font-size:10.5px;">Page Number</label>
              <input type="number" min="1" value="${escHtml(String(sourcePage || ''))}" oninput="updateSourcePage('${q._id}', this.value)" placeholder="e.g. 4">
            </div>
          </div>

          <div style="margin-top:10px;display:flex;justify-content:flex-end;">
            <button type="button" class="gen-btn" style="padding:6px 14px;font-size:12px;" onclick="toggleEditQuestion('${q._id}')">✓ Done Editing</button>
          </div>
        </div>
      `;
    } else if (q.type === 'true_false') {
      const isTrue = String(q.answer).toLowerCase() === 'true';
      body = `
        <div class="qz-inline-editor">
          <label class="qr-label">Statement Prompt</label>
          <textarea rows="2" data-field="question" oninput="editQuestion('${q._id}','question',this.value)">${escHtml(q.question || '')}</textarea>
          
          <label class="qr-label" style="margin-top:8px;">Correct Answer</label>
          <div style="display:flex;gap:10px;">
            <button type="button" class="qz-tf-btn ${isTrue ? 'active' : ''}" onclick="setTfAnswer('${q._id}', 'True')">✓ True</button>
            <button type="button" class="qz-tf-btn ${!isTrue ? 'active' : ''}" onclick="setTfAnswer('${q._id}', 'False')">✗ False</button>
          </div>

          <!-- Handout Citation Editor -->
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-top:10px;padding-top:8px;border-top:1px dashed #cbd5e1;">
            <div>
              <label class="qr-label" style="font-size:10.5px;">Source Handout / Document</label>
              <input type="text" value="${escHtml(sourceName)}" oninput="updateSourceFile('${q._id}', this.value)" placeholder="e.g. Chapter1.pdf">
            </div>
            <div>
              <label class="qr-label" style="font-size:10.5px;">Page Number</label>
              <input type="number" min="1" value="${escHtml(String(sourcePage || ''))}" oninput="updateSourcePage('${q._id}', this.value)" placeholder="e.g. 4">
            </div>
          </div>

          <div style="margin-top:10px;display:flex;justify-content:flex-end;">
            <button type="button" class="gen-btn" style="padding:6px 14px;font-size:12px;" onclick="toggleEditQuestion('${q._id}')">✓ Done Editing</button>
          </div>
        </div>
      `;
    } else if (q.type === 'identification') {
      body = `
        <div class="qz-inline-editor">
          <label class="qr-label">Question Prompt</label>
          <textarea rows="2" data-field="question" oninput="editQuestion('${q._id}','question',this.value)">${escHtml(q.question || '')}</textarea>
          
          <label class="qr-label" style="margin-top:8px;">Correct Answer</label>
          <input type="text" data-field="answer" value="${escHtml(q.answer || '')}" oninput="editQuestion('${q._id}','answer',this.value)">

          <!-- Handout Citation Editor -->
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-top:10px;padding-top:8px;border-top:1px dashed #cbd5e1;">
            <div>
              <label class="qr-label" style="font-size:10.5px;">Source Handout / Document</label>
              <input type="text" value="${escHtml(sourceName)}" oninput="updateSourceFile('${q._id}', this.value)" placeholder="e.g. Chapter1.pdf">
            </div>
            <div>
              <label class="qr-label" style="font-size:10.5px;">Page Number</label>
              <input type="number" min="1" value="${escHtml(String(sourcePage || ''))}" oninput="updateSourcePage('${q._id}', this.value)" placeholder="e.g. 4">
            </div>
          </div>

          <div style="margin-top:10px;display:flex;justify-content:flex-end;">
            <button type="button" class="gen-btn" style="padding:6px 14px;font-size:12px;" onclick="toggleEditQuestion('${q._id}')">✓ Done Editing</button>
          </div>
        </div>
      `;
    } else {
      // matching
      body = `
        <div class="qz-inline-editor">
          <label class="qr-label">Instructions</label>
          <input type="text" data-field="instructions" value="${escHtml(q.instructions || '')}" oninput="editQuestion('${q._id}','instructions',this.value)">
          
          <label class="qr-label" style="margin-top:8px;">Matching Pairs</label>
          <div class="qr-pairs">
            ${(q.pairs || []).map((p, i) => `
              <div class="qr-pair-row">
                <span class="qz-choice-letter" style="background:#0284c7;">${i + 1}</span>
                <input type="text" data-field="pair-${i}" value="${escHtml(p.left)}" oninput="editPair('${q._id}', ${i}, 'left', this.value)" placeholder="Prompt ${i + 1}">
                <span>&harr;</span>
                <span class="qz-choice-letter" style="background:#8b5cf6;">${cardLetters[i] || String.fromCharCode(65 + i)}</span>
                <input type="text" value="${escHtml(p.right)}" oninput="editPair('${q._id}', ${i}, 'right', this.value)" placeholder="Match ${cardLetters[i] || String.fromCharCode(65 + i)}">
              </div>
            `).join('')}
          </div>

          <!-- Handout Citation Editor -->
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-top:10px;padding-top:8px;border-top:1px dashed #cbd5e1;">
            <div>
              <label class="qr-label" style="font-size:10.5px;">Source Handout / Document</label>
              <input type="text" value="${escHtml(sourceName)}" oninput="updateSourceFile('${q._id}', this.value)" placeholder="e.g. Chapter1.pdf">
            </div>
            <div>
              <label class="qr-label" style="font-size:10.5px;">Page Number</label>
              <input type="number" min="1" value="${escHtml(String(sourcePage || ''))}" oninput="updateSourcePage('${q._id}', this.value)" placeholder="e.g. 4">
            </div>
          </div>

          <div style="margin-top:10px;display:flex;justify-content:flex-end;">
            <button type="button" class="gen-btn" style="padding:6px 14px;font-size:12px;" onclick="toggleEditQuestion('${q._id}')">✓ Done Editing</button>
          </div>
        </div>
      `;
    }
  } else {
    // ── CLEAN DISPLAY VIEW WITH HOVER ELEVATION & CHOICE-LEVEL EDIT PENCIL ──
    if (q.type === 'multiple_choice') {
      const opts = q.options || [];
      body = `
        <div class="qz-prompt-preview-row" onclick="toggleEditQuestion('${q._id}')" title="Click to edit question prompt">
          <span style="font-size:13.5px;font-weight:700;color:var(--text-primary);line-height:1.45;">${escHtml(q.question || 'Multiple Choice Question')}</span>
          <span class="qz-prompt-hover-pencil" title="Edit prompt">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </span>
        </div>
        <div class="qz-choices-display-list">
          ${opts.map((opt, i) => {
            const isCorrect = (i === q._answerIdx) || (String(opt).trim().toLowerCase() === String(q.answer || '').trim().toLowerCase());
            return `
              <div class="qz-choice-preview-row ${isCorrect ? 'is-correct' : ''}" onclick="toggleEditQuestion('${q._id}', ${i})" title="Hover to view · Click or use pencil on right to edit this choice">
                <span class="qz-choice-letter" style="background:${cardColors[i] || '#64748b'};">${cardLetters[i] || String.fromCharCode(65 + i)}</span>
                <span class="qz-choice-text">${escHtml(opt)}</span>
                ${isCorrect ? `<span class="qz-choice-correct-badge">✓ Correct</span>` : ''}
                <button type="button" class="qz-choice-hover-edit-btn" onclick="event.stopPropagation(); toggleEditQuestion('${q._id}', ${i});" title="Edit this choice">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (q.type === 'true_false') {
      const isTrue = String(q.answer).toLowerCase() === 'true';
      body = `
        <div class="qz-prompt-preview-row" onclick="toggleEditQuestion('${q._id}')" title="Click to edit statement">
          <span style="font-size:13.5px;font-weight:700;color:var(--text-primary);line-height:1.45;">${escHtml(q.question || 'True or False Statement')}</span>
          <span class="qz-prompt-hover-pencil" title="Edit statement">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </span>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          <div class="qz-statement-preview-row" onclick="toggleEditQuestion('${q._id}')" style="flex:1;padding:8px 14px;border-radius:8px;text-align:center;font-weight:700;font-size:13px;background:${isTrue ? '#ecfdf5' : '#ffffff'};border:1.5px solid ${isTrue ? '#10b981' : '#e2e8f0'};color:${isTrue ? '#047857' : '#64748b'};">
            ✓ True ${isTrue ? ' (Correct Answer)' : ''}
          </div>
          <div class="qz-statement-preview-row" onclick="toggleEditQuestion('${q._id}')" style="flex:1;padding:8px 14px;border-radius:8px;text-align:center;font-weight:700;font-size:13px;background:${!isTrue ? '#ecfdf5' : '#ffffff'};border:1.5px solid ${!isTrue ? '#10b981' : '#e2e8f0'};color:${!isTrue ? '#047857' : '#64748b'};">
            ✗ False ${!isTrue ? ' (Correct Answer)' : ''}
          </div>
        </div>
      `;
    } else if (q.type === 'identification') {
      body = `
        <div class="qz-prompt-preview-row" onclick="toggleEditQuestion('${q._id}')" title="Click to edit question prompt">
          <span style="font-size:13.5px;font-weight:700;color:var(--text-primary);line-height:1.45;">${escHtml(q.question || 'Identification Question')}</span>
          <span class="qz-prompt-hover-pencil" title="Edit prompt">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </span>
        </div>
        <div class="qz-id-preview-row" onclick="toggleEditQuestion('${q._id}')" style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:6px 12px;font-size:12.5px;color:#065f46;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
          <span><strong>Answer:</strong> ${escHtml(q.answer || '—')}</span>
          <span class="qz-choice-hover-edit-btn" style="opacity:1;">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </span>
        </div>
      `;
    } else {
      // matching
      body = `
        <div class="qz-prompt-preview-row" onclick="toggleEditQuestion('${q._id}')" title="Click to edit instructions">
          <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">${escHtml(q.instructions || 'Match the items on the left with the correct answers on the right.')}</span>
          <span class="qz-prompt-hover-pencil" title="Edit instructions">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
          ${(q.pairs || []).map((p, i) => `
            <div class="qz-match-pair-row" onclick="toggleEditQuestion('${q._id}')" style="display:flex;align-items:center;gap:8px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px;font-size:12px;">
              <span class="qz-choice-letter" style="background:#0284c7;">${i + 1}</span>
              <span style="font-weight:600;color:var(--text-primary);">${escHtml(p.left)}</span>
              <span style="color:#94a3b8;font-weight:700;">&rarr;</span>
              <span class="qz-choice-letter" style="background:#8b5cf6;">${cardLetters[i] || String.fromCharCode(65 + i)}</span>
              <span style="font-weight:600;color:#047857;flex:1;">${escHtml(p.right)}</span>
              <span class="qz-choice-hover-edit-btn">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Source Citation Badge
    const pageBadgeText = formatPageCitation(sourcePage);
    body += `
      <div class="qz-source-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>Handout:</span>
        <strong>${escHtml(sourceName)}</strong>
        ${pageBadgeText ? `· <span>${escHtml(pageBadgeText)}</span>` : ''}
      </div>
    `;
  }

  return `
    <div class="qresult-card qz-review-qcard" id="qcard-${q._id}">
      <div class="qr-top">
        <div style="display:flex;align-items:center;gap:8px;">
          ${qNum ? `<span style="font-size:12px;font-weight:800;color:var(--text-primary);">#${qNum}</span>` : ''}
          <span class="qr-type-tag ${tagClass}">${tagLabel}</span>
        </div>
        <div class="qz-card-header-actions">
          <button type="button" class="qz-card-action-btn edit-btn ${isEditing ? 'active' : ''}" onclick="toggleEditQuestion('${q._id}')" title="Edit Question Prompt & Details">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>${isEditing ? 'Done' : 'Edit Question'}</span>
          </button>
          <button type="button" class="qz-card-action-btn delete-btn" onclick="removeQuestion('${q._id}')" title="Delete this question">
            ${iconTrash()}
          </button>
        </div>
      </div>
      ${body}
    </div>
  `;
}


function previewGeneratedInteractiveQuiz() {
  if (!quizGen.questions || !quizGen.questions.length) {
    showToast('No questions to preview yet', 'error');
    return;
  }
  const previewQuiz = {
    id: 'preview-' + Date.now(),
    title: quizGen.title || 'Interactive Quiz Preview',
    subject: quizGen.subject || 'General Academic',
    type: 'interactive',
    quiz_type: 'interactive',
    timerPerQuestion: typeof quizGen.timerPerQuestion === 'number' ? quizGen.timerPerQuestion : 30,
    questions: quizGen.questions.map(q => Object.assign({}, q, { _quiz_type: 'interactive' })),
    is_demo: false,
    isPreview: true
  };
  if (typeof openInteractiveQuiz === 'function') {
    openInteractiveQuiz(previewQuiz);
  } else if (typeof openTakeQuizModal === 'function') {
    openTakeQuizModal(previewQuiz);
  } else {
    showToast('Take quiz module is not loaded', 'error');
  }
}
