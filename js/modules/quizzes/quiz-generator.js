/* ── SYSTEM QUIZ GENERATOR & MANAGEMENT MODULE ── */

const QUIZ_API_ENDPOINT = typeof API_BASE !== 'undefined' ? `${API_BASE}/api/quiz/generate` : 'http://localhost:3001/api/quiz/generate';
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

let customQuizzes = [];
let isFetchingQuizzes = false;

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
  if (typeof currentPage !== 'undefined' && (currentPage === 'dashboard' || currentPage === 'quizzes' || currentPage === 'progress' || currentPage === 'quiz' || currentPage === 'analysis')) {
    const mainContent = document.getElementById('mainContent');
    if (mainContent && typeof getPageContent === 'function') {
      mainContent.innerHTML = getPageContent(ROLE, currentPage);
    }
  }
}

const quizGen = {
  wizardStep: 1,
  step: 'setup', type: 'standard', file: null, fileText: '',
  title: '', subject: '', formats: new Set(['mc', 'id']),
  count: 'auto',
  customCount: '',
  distributionMode: 'balanced', // 'balanced' or 'custom'
  formatCounts: { mc: 5, id: 5, match: 0 },
  strands: new Set(), 
  sections: new Set(),
  gradeLevel: 'Grade 11',
  lesson: '',
  dueDate: '',
  timerPerQuestion: 30, // 0 = untimed, or 15, 30, 45, 60
  timeLimitMinutes: 15, // 0 = untimed, or 5, 10, 15, 20, 30, 45, 60
  questions: [], errorMsg: ''
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
    if (!quizGen.file) {
      showToast('Please upload a material file first', 'error');
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

function openQuizModal() {
  const defaultSections = (CURRENT_PROFILE && CURRENT_PROFILE.role === 'teacher' && CURRENT_PROFILE.section) 
    ? new Set([CURRENT_PROFILE.section]) 
    : new Set();

  const teacherStrands = (CURRENT_PROFILE && CURRENT_PROFILE.role === 'teacher' && CURRENT_PROFILE.strand)
    ? new Set(CURRENT_PROFILE.strand.split(',').map(s => s.trim()).filter(Boolean))
    : new Set();

  Object.assign(quizGen, {
    wizardStep: 1,
    step: 'setup', type: 'standard', file: null, fileText: '',
    title: '', subject: '', formats: new Set(['mc', 'id']),
    count: 'auto',
    customCount: '',
    distributionMode: 'balanced',
    formatCounts: { mc: 5, id: 5, match: 0 },
    strands: teacherStrands, 
    sections: defaultSections,
    gradeLevel: 'Grade 11',
    lesson: '',
    dueDate: '',
    timerPerQuestion: 30,
    timeLimitMinutes: 15,
    questions: [], errorMsg: ''
  });
  document.getElementById('quizModal').classList.add('active');
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
      quizGen.formatCounts[key] = 5;
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
  quizGen.formats = new Set(['mc', 'id', 'match']);
  if (!quizGen.formatCounts.mc) quizGen.formatCounts.mc = 5;
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
  if (CURRENT_PROFILE && CURRENT_PROFILE.role === 'teacher') {
    const teacherStrands = CURRENT_PROFILE.strand ? CURRENT_PROFILE.strand.split(',').map(st => st.trim()).filter(Boolean) : [];
    if (!teacherStrands.includes(s)) {
      showToast(`You are not assigned to the ${s} strand`, 'warning');
      return;
    }
    if (teacherStrands.length === 1) {
      showToast(`You are locked to your assigned strand: ${teacherStrands[0]}`, 'warning');
      return;
    }
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
  if (CURRENT_PROFILE && CURRENT_PROFILE.role === 'teacher' && CURRENT_PROFILE.section) {
    showToast(`You are connected only to ${CURRENT_PROFILE.section}`, 'warning');
    return;
  }
  if (quizGen.sections.has(s)) quizGen.sections.delete(s);
  else quizGen.sections.add(s);
  renderQuizModal();
}

function updateTitle(v)  { quizGen.title = v; }
function updateSubject(v){ quizGen.subject = v; }

function handleFileInput(input) {
  const file = input.files[0];
  if (!file) return;
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!['.pdf', '.docx', '.txt'].includes(ext)) {
    showToast('Please upload a PDF, DOCX, or TXT file', 'error');
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    showToast('File is too large — maximum file size is 50MB only', 'error');
    return;
  }
  quizGen.file = file;
  quizGen.fileText = '';
  if (!quizGen.title) quizGen.title = file.name.replace(/\.[^.]+$/, '');
  const availSubs = getAvailableSubjectsForQuizGen();
  const matchedSub = availSubs.find(s => s.toLowerCase() === file.name.replace(/\.[^.]+$/, '').toLowerCase());
  if (!quizGen.subject && matchedSub) quizGen.subject = matchedSub;
  renderQuizModal();
  extractFileText(file, ext)
    .then(text => { quizGen.fileText = text; renderQuizModal(); })
    .catch(() => { showToast('Could not fully read this file — generation will rely on the filename instead', 'info'); });
}

function extractFileText(file, ext) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    if (ext === '.txt') {
      reader.onload = () => resolve(String(reader.result).slice(0, 18000));
      reader.onerror = reject;
      reader.readAsText(file);
    } else if (ext === '.pdf') {
      reader.onload = async () => {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(reader.result) }).promise;
          let text = '';
          for (let i = 1; i <= Math.min(pdf.numPages, 25); i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(it => it.str).join(' ') + '\n';
            if (text.length > 18000) break;
          }
          resolve(text.slice(0, 18000));
        } catch (e) { reject(e); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    } else if (ext === '.docx') {
      reader.onload = async () => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: reader.result });
          resolve(result.value.slice(0, 18000));
        } catch (e) { reject(e); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    } else {
      resolve('');
    }
  });
}

function removeFile() {
  quizGen.file = null;
  quizGen.fileText = '';
  quizGen.questions = [];
  renderQuizModal();
}

let currentQuizGenToken = 0;

async function generateQuiz() {
  if (!quizGen.file) { showToast('Please upload a material file first', 'error'); return; }
  quizGen.step = 'loading';
  const genToken = ++currentQuizGenToken;
  renderQuizModal();

  let waited = 0;
  while (!quizGen.fileText && waited < 6000) {
    if (quizGen.step !== 'loading' || genToken !== currentQuizGenToken) return;
    await new Promise(r => setTimeout(r, 300));
    waited += 300;
  }
  if (quizGen.step !== 'loading' || genToken !== currentQuizGenToken) return;

  const payload = {
    title: quizGen.title || quizGen.subject || 'Untitled Quiz',
    subject: quizGen.subject || '',
    fileName: quizGen.file.name,
    formats: Array.from(quizGen.formats),
    count: quizGen.count,
    distributionMode: quizGen.distributionMode,
    formatCounts: quizGen.distributionMode === 'custom' ? quizGen.formatCounts : undefined,
    sourceText: (quizGen.fileText || '').slice(0, 18000)
  };

  try {
    const response = await fetch(QUIZ_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (quizGen.step !== 'loading' || genToken !== currentQuizGenToken) return;
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || ('Backend returned ' + response.status));
    }
    const data = await response.json();
    if (quizGen.step !== 'loading' || genToken !== currentQuizGenToken) return;
    applyGeneratedQuestions(data.questions || [], false);
  } catch (err) {
    if (quizGen.step !== 'loading' || genToken !== currentQuizGenToken) return;
    console.warn('Quiz backend unavailable, showing demo data instead:', err.message);
    applyGeneratedQuestions(buildDemoQuestions(), true);
    showToast('System generation service is unavailable — showing sample questions', 'warning');
  }
  renderQuizModal();
}

function applyGeneratedQuestions(list, isDemo) {
  const fileName = quizGen.file ? quizGen.file.name : '';
  const lesson = quizGen.lesson || '';
  quizGen.questions = (list || []).map((q, i) => {
    const obj = Object.assign({
      _id: 'q' + i,
      _demo: !!isDemo, _quiz_type: quizGen.type || 'standard',
      sourceMaterial: fileName,
      source_material: fileName,
      lesson: lesson
    }, q);
    if (obj.type === 'matching' && !obj.instructions) {
      obj.instructions = obj.question || 'Match the items on the left with the correct matches on the right.';
    }
    if (obj.type === 'multiple_choice') obj._answerIdx = Math.max(0, (obj.options || []).indexOf(obj.answer));
    return obj;
  });
  if (quizGen.questions.length === 0) {
    quizGen.step = 'error';
    quizGen.errorMsg = 'No questions were returned. Please try again.';
  } else {
    quizGen.step = 'setup';
    quizGen.wizardStep = 5;
  }
}

function addNewManualQuestion() {
  const newId = 'q_' + Date.now();
  const format = quizGen.formats.has('mc') ? 'multiple_choice' : quizGen.formats.has('id') ? 'identification' : 'matching';
  if (format === 'multiple_choice') {
    quizGen.questions.push({
      _id: newId,
      type: 'multiple_choice',
      question: `Question ${quizGen.questions.length + 1} (Multiple Choice)`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 'Option A',
      _answerIdx: 0
    });
  } else if (format === 'identification') {
    quizGen.questions.push({
      _id: newId,
      type: 'identification',
      question: `Question ${quizGen.questions.length + 1} (Identification)`,
      answer: 'Correct Answer'
    });
  } else {
    quizGen.questions.push({
      _id: newId,
      type: 'matching',
      instructions: 'Match the prompts on the left with the correct answers on the right.',
      pairs: [
        { left: 'Prompt 1', right: 'Match A' },
        { left: 'Prompt 2', right: 'Match B' }
      ]
    });
  }
  renderQuizModal();
  showToast('New question item added to preview', 'success');
}

function buildDemoQuestions() {
  const name = quizGen.file ? quizGen.file.name : 'your file';
  const selectedFormats = Array.from(quizGen.formats);
  if (selectedFormats.length === 0) selectedFormats.push('mc', 'id');

  const demo = [];
  const samplePool = {
    mc: (i) => ({
      type: 'multiple_choice',
      question: `Question ${i + 1} (Multiple Choice) — sample generated item from "${name}".`,
      options: ['Sample option A', 'Sample option B', 'Sample option C', 'Sample option D'],
      answer: 'Sample option A'
    }),
    id: (i) => ({
      type: 'identification',
      question: `Question ${i + 1} (Identification) — sample generated prompt from "${name}".`,
      answer: 'Sample answer'
    }),
    match: (i) => ({
      type: 'matching',
      instructions: `Question ${i + 1} (Matching Type) — sample matching set from "${name}".`,
      pairs: [
        { left: `Term ${i + 1}A`, right: `Definition ${i + 1}A` },
        { left: `Term ${i + 1}B`, right: `Definition ${i + 1}B` },
        { left: `Term ${i + 1}C`, right: `Definition ${i + 1}C` }
      ]
    })
  };

  if (quizGen.distributionMode === 'custom') {
    let qIndex = 0;
    selectedFormats.forEach(fmt => {
      const countForFmt = quizGen.formatCounts[fmt] || 0;
      for (let i = 0; i < countForFmt; i++) {
        demo.push(samplePool[fmt](qIndex++));
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
        demo.push(samplePool[fmt](qIndex++));
      }
    });
  }

  if (demo.length === 0) {
    demo.push(samplePool['mc'](0));
  }

  return demo;
}

function removeQuestion(id) { quizGen.questions = quizGen.questions.filter(q => q._id !== id); renderQuizModal(); }
function editQuestion(id, field, value) { const q = quizGen.questions.find(q => q._id === id); if (q) q[field] = value; }
function editOption(id, idx, value) {
  const q = quizGen.questions.find(q => q._id === id);
  if (!q) return;
  q.options[idx] = value;
  if (q._answerIdx === idx) q.answer = value;
}
function setAnswerIndex(id, idx) {
  const q = quizGen.questions.find(q => q._id === id);
  if (q) { q._answerIdx = idx; q.answer = q.options[idx]; }
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
  if (q) q.pairs[idx][side] = value;
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

let isSavingQuiz = false;

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

    const fileName = quizGen.file ? quizGen.file.name : (quizGen.subject ? quizGen.subject + ' Handout' : '');
    const lessonName = quizGen.lesson || '';

    // Attach metadata to questions so interactive type, timer, sections, and source material are preserved inside questions JSONB without needing extra DB columns
    const questionsToSave = (quizGen.questions || []).map((q, idx) => ({
      ...q,
      sourceMaterial: q.sourceMaterial || fileName,
      source_material: q.sourceMaterial || fileName,
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
          sourceMaterial: fileName,
          lesson: lessonName,
          sections: targetSectionsStr,
          dueDate: quizGen.dueDate || null
        }
      } : {})
    }));

    const baseQuizRow = {
      title: title,
      subject: quizGen.subject || null,
      strand: quizGen.strands.size ? Array.from(quizGen.strands).join(', ') : null,
      grade_level: quizGen.gradeLevel || null,
      created_by: userId,
      questions: questionsToSave,
      status: quizStatus,
      is_demo: isDemo
    };

    const optionalFields = {
      sections: targetSectionsStr,
      lesson: quizGen.lesson || null,
      due_date: quizGen.dueDate || null,
      time_limit_minutes: quizGen.timeLimitMinutes || 0
    };

    let insertData = { ...baseQuizRow, ...optionalFields };
    let { error } = await db.from('quizzes').insert(insertData);

    // If table lacks any extra columns in Supabase schema cache, strip unknown fields and retry
    let retries = 0;
    while (error && error.message && error.message.includes('schema cache') && retries < 5) {
      retries++;
      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && match[1] in insertData) {
        delete insertData[match[1]];
        const retry = await db.from('quizzes').insert(insertData);
        error = retry.error;
      } else {
        insertData = { ...baseQuizRow };
        const retry = await db.from('quizzes').insert(insertData);
        error = retry.error;
        break;
      }
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

    // Automatically close the modal immediately upon saving
    closeQuizModal();
    await loadQuizzesFromDB();
    if (typeof updateApprovalBadge === 'function') updateApprovalBadge();

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
  try {
    if (typeof db !== 'undefined' && db) {
      const { error } = await db.from('quizzes').delete().eq('id', id);
      if (error) { showToast('Failed to deny quiz: ' + error.message, 'error'); return; }
    }
    customQuizzes = customQuizzes.filter(q => q.id !== id);
    showToast('Quiz denied and deleted', 'success');
    await loadQuizzesFromDB();
    if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
    if (typeof renderMaterialsContainer === 'function') renderMaterialsContainer();
  } catch (e) {
    showToast('Failed to deny quiz: ' + e.message, 'error');
  }
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

  try {
    if (typeof db !== 'undefined' && db) {
      const { error } = await db.from('quizzes').delete().eq('id', id);
      if (error) {
        console.warn('DB delete warning:', error.message);
      }
    }
    customQuizzes = customQuizzes.filter(q => q.id !== id);
    showToast(`Quiz "${quizTitle}" deleted successfully`, 'success');
    await loadQuizzesFromDB();
    if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
  } catch (err) {
    showToast('Failed to delete quiz: ' + err.message, 'error');
  }
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
  const formatNames = { mc: 'Multiple Choice', id: 'Identification', match: 'Matching Type' };
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
    ? (quizGen.timerPerQuestion > 0 ? `${quizGen.timerPerQuestion}s per question` : 'Untimed per question')
    : (quizGen.timeLimitMinutes > 0 ? `${quizGen.timeLimitMinutes} minutes overall` : 'Untimed');

  const deadlineText = quizGen.dueDate ? new Date(quizGen.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No Expiration Set';

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
          <span class="qz-summary-val">${escHtml(itemCountText)} (${escHtml(selectedFmtList)})</span>
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
  const formatNames = { mc: 'Multiple Choice', id: 'Identification', match: 'Matching Type' };
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
          <span class="qz-cd-val">${escHtml(itemCountText)} · 📅 ${escHtml(deadlineText)}</span>
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
    body.innerHTML = `<div class="gen-loading"><div class="gl-ring"></div><p>Reading your material and drafting questions…</p><span class="gl-sub">This usually takes a few seconds</span></div>`;
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

  const formatNames = { mc: 'Multiple Choice', id: 'Identification', match: 'Matching Type' };
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
            <p>System-generated identification, multiple choice, and matching questions</p>
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
    // ── STEP 2: DESCRIPTION OF QUIZ (QUIZ TITLE, SECTION, ETC.) ──
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
          <label>Target Strands <span style="text-transform:none;font-weight:500;color:var(--text-muted);">(select strand to filter subject list)</span></label>
          <div class="format-grid">
            ${STRANDS.map(s => {
              const isSelected = quizGen.strands.has(s);
              const isAllowed = !isTeacher || teacherStrands.includes(s);
              const isLocked = isTeacher && teacherStrands.length === 1 && teacherStrands[0] === s;
              const disabledStyle = (!isAllowed || isLocked) ? 'style="opacity: 0.45; cursor: not-allowed;"' : '';
              return `<div class="format-chip ${isSelected ? 'on' : ''}" ${disabledStyle} onclick="toggleQuizStrand('${s}')">${s}</div>`;
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
          <div class="gen-field"><label>Grade Level</label>
            <select onchange="quizGen.gradeLevel = this.value; renderQuizModal();">
              ${GRADE_LEVELS.map(g => `<option value="${g}" ${quizGen.gradeLevel === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          </div>
          <div class="gen-field"><label>Lesson</label><input type="text" placeholder="e.g. Lesson 3" value="${escHtml(quizGen.lesson)}" oninput="quizGen.lesson = this.value;"></div>
        </div>

        <div class="gen-field">
          <label>Target Sections <span style="text-transform:none;font-weight:500;color:var(--text-muted);">(select multiple or leave blank for all)</span></label>
          <div class="format-grid">
            ${SECTIONS.map(s => {
              const isSelected = quizGen.sections.has(s);
              return `<div class="format-chip ${isSelected ? 'on' : ''}" onclick="toggleQuizSection('${s}')">${s}</div>`;
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
    // ── STEP 3: DEADLINE, TYPE OF QUIZ / TIME LIMIT, DISTRIBUTION (NUMBER OF EXAM) ──
    const formattedDeadline = quizGen.dueDate 
      ? new Date(quizGen.dueDate).toLocaleString([], { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';

    // Build day options for selected month/year
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

        <!-- ── DEADLINE & EXPIRATION CARD ── -->
        <div class="gen-field qz-card-field">
          <div class="qz-card-header">
            <label><span>📅</span> Quiz Expiration / Due Date &amp; Time</label>
            <span class="qz-card-sublabel">${quizGen.dueDate ? 'Deadline Active' : 'Optional · No Expiration'}</span>
          </div>

          <!-- Quick Presets -->
          <div class="count-pills" style="margin-bottom:6px;">
            <div class="count-pill ${!quizGen.dueDate ? 'on' : ''}" onclick="setDeadlinePreset('none')">No Deadline</div>
            <div class="count-pill" onclick="setDeadlinePreset('today')">Today 11:59 PM</div>
            <div class="count-pill" onclick="setDeadlinePreset('tomorrow')">Tomorrow 11:59 PM</div>
            <div class="count-pill" onclick="setDeadlinePreset('3days')">In 3 Days</div>
            <div class="count-pill" onclick="setDeadlinePreset('1week')">In 1 Week</div>
          </div>

          <!-- Month / Day / Year + Time Selectors -->
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

        <!-- ── TIMER SETTINGS CARD ── -->
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

          <!-- Quick Preset Pills -->
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

          <!-- Adjustable Custom Minutes Stepper -->
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

        <div class="gen-field">
          <label>Question Formats</label>
          <div class="format-grid">
            <div class="format-chip ${quizGen.formats.has('mc') ? 'on' : ''}" onclick="toggleFormat('mc')">Multiple Choice</div>
            <div class="format-chip ${quizGen.formats.has('id') ? 'on' : ''}" onclick="toggleFormat('id')">Identification</div>
            <div class="format-chip ${quizGen.formats.has('match') ? 'on' : ''}" onclick="toggleFormat('match')">Matching Type</div>
            <div class="format-chip ${quizGen.formats.size === 3 ? 'on' : ''}" onclick="setAllFormats()">All Formats</div>
          </div>
        </div>

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
              <div class="dmp-desc">Set specific numbers for each question style (e.g. 7 Multiple Choice + 3 Identification)</div>
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

  // ── STEP 4: UPLOAD & GENERATE ──
  if (quizGen.wizardStep === 4) {
    body.innerHTML = `
      ${stepperHtml}
      <div class="qz-step-pane">
        <div class="qz-step-banner">
          <div class="qz-step-banner-title">
            <span>4. Upload Material &amp; Generate Questions</span>
          </div>
          <span class="qz-step-banner-tag">Step 4 of 5</span>
        </div>

        <div class="gen-field">
          <label>Source Material <span style="color:#ef4444;">*</span></label>
          ${quizGen.file ? `
            <div class="file-chip">
              <div class="fc-icon">${iconDoc().replace('<svg viewBox="0 0 24 24">','<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">')}</div>
              <div class="fc-info"><h5>${escHtml(quizGen.file.name)}</h5><span>${quizGen.fileText ? 'Text extracted · ready to generate' : 'Reading file…'}</span></div>
              <button class="fc-remove" onclick="removeFile()">${iconClose()}</button>
            </div>` : `
            <label class="dropzone" for="quizFileInput">
              ${iconUpload()}
              <div class="dz-title">Click to upload a handout, module, or notes</div>
              <div class="dz-sub">PDF, DOCX, or TXT (Max 50MB only)</div>
            </label>
            <input type="file" id="quizFileInput" accept=".pdf,.docx,.txt" style="display:none" onchange="handleFileInput(this)">
          `}
        </div>

        ${getQuizConfigSummary()}

        ${quizGen.file ? `
        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
          <span style="font-size:22px;">✨</span>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:2px;">Ready to Generate!</div>
            <div style="font-size:11.5px;color:#64748b;">Click the button below to let the system read your material and draft quiz questions. You will review them in the next step.</div>
          </div>
        </div>
        ` : ''}
      </div>
    `;

    foot.innerHTML = `
      <button class="foot-btn-secondary" onclick="prevQuizStep()">&larr; Back</button>
      <button class="gen-btn" ${!quizGen.file ? 'disabled' : ''} onclick="generateQuiz()">${iconChip()} Generate Questions &rarr;</button>
    `;
    return;
  }

  // ── STEP 5: PREVIEW, EDIT & SAVE ──
  const hasQuestions = quizGen.questions && quizGen.questions.length > 0;
  const isDemo = hasQuestions && quizGen.questions.some(q => q._demo);

  body.innerHTML = `
    ${stepperHtml}
    <div class="qz-step-pane">
      <div class="qz-step-banner">
        <div class="qz-step-banner-title">
          <span>5. Preview, Edit &amp; Double Check</span>
        </div>
        <span class="qz-step-banner-tag">Step 5 of 5</span>
      </div>

      ${hasQuestions ? `
      <div class="qz-questions-preview-section">
        <div class="qz-preview-header">
          <div class="qz-preview-title">
            <span class="qz-preview-icon">📝</span>
            <div>
              <h4>Question Items Preview (${quizGen.questions.length} items)</h4>
              <span>Review and edit questions, options, and answers below before saving</span>
            </div>
          </div>
          <button type="button" class="foot-btn-secondary" onclick="addNewManualQuestion()" style="font-size:11.5px;padding:5px 12px;border-radius:8px;font-weight:700;">
            + Add Question
          </button>
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
      <button class="gen-btn" ${!hasQuestions ? 'disabled' : ''} onclick="saveQuiz()">${iconChip()} Save Quiz${hasQuestions ? ` (${quizGen.questions.length} items)` : ''}</button>
    </div>
  `;
}


function renderQuestionCard(q, idx) {
  const qNum = typeof idx === 'number' ? (idx + 1) : '';
  const tagClass = q.type === 'multiple_choice' ? 'mc' : q.type === 'identification' ? 'id' : 'match';
  const tagLabel = q.type === 'multiple_choice' ? 'Multiple Choice' : q.type === 'identification' ? 'Identification' : 'Matching Type';
  const cardLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const cardColors = ['#22c55e', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#3b82f6', '#14b8a6', '#6366f1'];
  let body = '';
  if (q.type === 'multiple_choice') {
    body = `<textarea rows="2" data-field="question" oninput="editQuestion('${q._id}','question',this.value)">${escHtml(q.question)}</textarea>
      <div class="qr-options">${(q.options || []).map((opt, i) => `
        <div class="qr-opt-row">
          <input type="radio" name="ans-${q._id}" ${i === q._answerIdx ? 'checked' : ''} onchange="setAnswerIndex('${q._id}', ${i})" title="Mark as correct answer">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${cardColors[i] || '#64748b'};color:#fff;font-size:11px;font-weight:800;flex-shrink:0;">${cardLetters[i] || String.fromCharCode(65 + i)}</span>
          <input type="text" data-field="opt-${i}" value="${escHtml(opt)}" oninput="editOption('${q._id}', ${i}, this.value)">
          ${(q.options || []).length > 2 ? `<button class="qr-opt-del-btn" title="Remove this choice" onclick="removeOption('${q._id}', ${i})">&times;</button>` : ''}
        </div>`).join('')}</div>
      <div style="margin-top:8px;">
        <button class="qr-add-opt-btn" onclick="addOption('${q._id}')">+ Add Choice</button>
      </div>`;
  } else if (q.type === 'identification') {
    body = `<textarea rows="2" data-field="question" oninput="editQuestion('${q._id}','question',this.value)">${escHtml(q.question)}</textarea>
      <div class="qr-label">Correct Answer</div>
      <input type="text" data-field="answer" value="${escHtml(q.answer)}" oninput="editQuestion('${q._id}','answer',this.value)">`;
  } else {
    body = `<div class="qr-label">Instructions</div>
      <input type="text" data-field="instructions" value="${escHtml(q.instructions || '')}" oninput="editQuestion('${q._id}','instructions',this.value)">
      <div class="qr-pairs">${(q.pairs || []).map((p, i) => `
        <div class="qr-pair-row">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#0284c7;color:#fff;font-size:11px;font-weight:800;flex-shrink:0;">${i + 1}</span>
          <input type="text" data-field="pair-${i}" value="${escHtml(p.left)}" oninput="editPair('${q._id}', ${i}, 'left', this.value)" placeholder="Prompt ${i + 1}">
          <span>&harr;</span>
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#8b5cf6;color:#fff;font-size:11px;font-weight:800;flex-shrink:0;">${cardLetters[i] || String.fromCharCode(65 + i)}</span>
          <input type="text" value="${escHtml(p.right)}" oninput="editPair('${q._id}', ${i}, 'right', this.value)" placeholder="Match ${cardLetters[i] || String.fromCharCode(65 + i)}">
        </div>`).join('')}</div>`;
  }
  return `<div class="qresult-card" id="qcard-${q._id}">
    <div class="qr-top">
      <div style="display:flex;align-items:center;gap:8px;">
        ${qNum ? `<span style="font-size:12px;font-weight:800;color:var(--text-primary);">#${qNum}</span>` : ''}
        <span class="qr-type-tag ${tagClass}">${tagLabel}</span>
      </div>
      <button class="qr-remove" onclick="removeQuestion('${q._id}')" title="Delete this question">${iconTrash()}</button>
    </div>
    ${body}
  </div>`;
}
