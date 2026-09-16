/* ── AI QUIZ GENERATOR & MANAGEMENT MODULE ── */

const QUIZ_API_ENDPOINT = typeof API_BASE !== 'undefined' ? `${API_BASE}/api/quiz/generate` : 'http://localhost:3001/api/quiz/generate';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

let customQuizzes = [];
let isFetchingQuizzes = false;

async function loadQuizzesFromDB() {
  if (isFetchingQuizzes) return;
  isFetchingQuizzes = true;
  try {
    const { data, error } = await db.from('quizzes').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Failed to load quizzes:', error.message); return; }
    customQuizzes = (data || []).map(q => ({
      id: q.id,
      createdBy: q.created_by,
      subject: q.subject,
      strand: q.strand,
      sections: q.sections,
      gradeLevel: q.grade_level,
      grade_level: q.grade_level,
      createdAt: q.created_at,
      title: q.title + (q.is_demo ? ' (Demo)' : ''),
      meta: q.is_demo
        ? `${q.subject || 'General'} · ${(q.questions||[]).length} items · Sample data`
        : `${[q.subject || 'General', q.strand].filter(Boolean).join(' · ')} · ${(q.questions||[]).length} items · ${q.status || 'active'}`,
      isDemo: q.is_demo,
      status: q.status || 'active',
      questions: q.questions || []
    }));
  } finally {
    isFetchingQuizzes = false;
  }
  if (typeof currentPage !== 'undefined' && (currentPage === 'dashboard' || currentPage === 'quizzes' || currentPage === 'progress')) {
    const mainContent = document.getElementById('mainContent');
    if (mainContent && typeof getPageContent === 'function') {
      mainContent.innerHTML = getPageContent(ROLE, currentPage);
    }
  }
}

const quizGen = {
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
  questions: [], errorMsg: ''
};

function getQuizDueDateConstraints() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const tzOffset = now.getTimezoneOffset() * 60000;
  const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  const maxISOTime = `${currentYear}-12-31T23:59`;

  return { minISO: localISOTime, maxISO: maxISOTime, currentYear };
}

function updateQuizDueDate(val) {
  if (!val) {
    quizGen.dueDate = '';
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
}

function openQuizModal() {
  const defaultSections = (CURRENT_PROFILE && CURRENT_PROFILE.role === 'teacher' && CURRENT_PROFILE.section) 
    ? new Set([CURRENT_PROFILE.section]) 
    : new Set();

  const teacherStrands = (CURRENT_PROFILE && CURRENT_PROFILE.role === 'teacher' && CURRENT_PROFILE.strand)
    ? new Set(CURRENT_PROFILE.strand.split(',').map(s => s.trim()).filter(Boolean))
    : new Set();

  Object.assign(quizGen, {
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
    questions: [], errorMsg: ''
  });
  document.getElementById('quizModal').classList.add('active');
  renderQuizModal();
}

function closeQuizModal() {
  document.getElementById('quizModal').classList.remove('active');
}

function selectQuizType(type) {
  if (type === 'gamified' || type === 'interactive') {
    showToast('Interactive quizzes are coming soon', 'info');
    return;
  }
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
  if (typeof getFilteredSubjects === 'function') {
    if (selectedStrands.length === 1) {
      return getFilteredSubjects(selectedStrands[0], quizGen.gradeLevel);
    }
    if (selectedStrands.length > 1) {
      const combined = [];
      selectedStrands.forEach(st => {
        getFilteredSubjects(st, quizGen.gradeLevel).forEach(sub => {
          if (!combined.includes(sub)) combined.push(sub);
        });
      });
      return combined;
    }
    return getFilteredSubjects(null, quizGen.gradeLevel);
  }
  const subjectsMap = typeof SUBJECTS_BY_STRAND !== 'undefined' ? SUBJECTS_BY_STRAND : {};
  if (selectedStrands.length === 0) {
    const all = [];
    Object.values(subjectsMap).forEach(list => {
      list.forEach(sub => { if (!all.includes(sub)) all.push(sub); });
    });
    return all;
  }
  const filtered = [];
  selectedStrands.forEach(str => {
    (subjectsMap[str] || []).forEach(sub => { if (!filtered.includes(sub)) filtered.push(sub); });
  });
  return filtered;
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
    showToast('File is too large — please keep uploads under 10MB', 'error');
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
    .then(text => { quizGen.fileText = text; })
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
  renderQuizModal();
}

async function generateQuiz() {
  if (!quizGen.file) { showToast('Please upload a material file first', 'error'); return; }
  quizGen.step = 'loading';
  renderQuizModal();

  let waited = 0;
  while (!quizGen.fileText && waited < 6000) {
    await new Promise(r => setTimeout(r, 300));
    waited += 300;
  }

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
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || ('Backend returned ' + response.status));
    }
    const data = await response.json();
    applyGeneratedQuestions(data.questions || [], false);
  } catch (err) {
    console.warn('Quiz backend unavailable, showing demo data instead:', err.message);
    applyGeneratedQuestions(buildDemoQuestions(), true);
    showToast('API is currently not working — showing sample questions', 'warning');
  }
  renderQuizModal();
}

function applyGeneratedQuestions(list, isDemo) {
  quizGen.questions = (list || []).map((q, i) => {
    const obj = Object.assign({ _id: 'q' + i, _demo: !!isDemo }, q);
    if (obj.type === 'multiple_choice') obj._answerIdx = Math.max(0, (obj.options || []).indexOf(obj.answer));
    return obj;
  });
  if (quizGen.questions.length === 0) {
    quizGen.step = 'error';
    quizGen.errorMsg = 'No questions were returned. Please try again.';
  } else {
    quizGen.step = 'results';
  }
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

async function saveQuiz() {
  if (quizGen.questions.length === 0) { showToast('Nothing to save yet', 'error'); return; }
  const isDemo = quizGen.questions.some(q => q._demo);
  const title = quizGen.title || (quizGen.subject ? quizGen.subject + ' – AI Generated Quiz' : 'AI Generated Quiz');
  const { data: { session } } = await db.auth.getSession();
  const userId = session?.user?.id || CURRENT_PROFILE?.id;

  const isAdmin = CURRENT_PROFILE && CURRENT_PROFILE.role === 'admin';
  const quizStatus = isAdmin ? 'active' : 'pending';
  const targetSectionsStr = quizGen.sections.size ? Array.from(quizGen.sections).join(', ') : null;

  const quizRow = {
    title: title,
    subject: quizGen.subject || null,
    strand: quizGen.strands.size ? Array.from(quizGen.strands).join(', ') : null,
    grade_level: quizGen.gradeLevel || null,
    sections: targetSectionsStr,
    lesson: quizGen.lesson || '',
    due_date: quizGen.dueDate || null,
    created_by: userId,
    questions: quizGen.questions,
    status: quizStatus,
    is_demo: isDemo
  };

  let { error } = await db.from('quizzes').insert(quizRow);
  if (error && error.message.includes('due_date')) {
    delete quizRow.due_date;
    const retry = await db.from('quizzes').insert(quizRow);
    error = retry.error;
  }

  if (error) {
    showToast('Failed to save quiz: ' + error.message, 'error'); return;
  }

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
    }
    showToast('Quiz submitted for Admin content approval!', 'success');
  }

  closeQuizModal();
  await loadQuizzesFromDB();
  if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
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
  const { error } = await db.from('quizzes').delete().eq('id', id);
  if (error) { showToast('Failed to deny quiz: ' + error.message, 'error'); return; }
  showToast('Quiz denied and deleted', 'success');
  await loadQuizzesFromDB();
  if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
  if (typeof renderMaterialsContainer === 'function') renderMaterialsContainer();
}

function renderQuizModal() {
  const body = document.getElementById('quizModalBody');
  const foot = document.getElementById('quizModalFoot');

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
      ${isDemo ? `<div class="demo-banner">${iconChip()} <div><strong>Preview Mode</strong> — The AI API is currently not working or temporarily busy. Showing sample generated questions. You may try generating again shortly.</div></div>` : ''}
      <div class="qresult-list">${quizGen.questions.map(renderQuestionCard).join('')}</div>`;
    foot.innerHTML = `<button class="foot-btn-secondary" onclick="quizGen.step='setup';renderQuizModal();">Back</button><button class="gen-btn" onclick="saveQuiz()">${iconChip()} Save Quiz (${quizGen.questions.length} items)</button>`;
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

  const { minISO, maxISO, currentYear } = getQuizDueDateConstraints();

  // Calculate live breakdown percentages
  let totalCalculatedCount = 0;
  selectedFmtList.forEach(f => { totalCalculatedCount += (quizGen.formatCounts[f] || 0); });
  const isCustomMode = quizGen.distributionMode === 'custom';

  body.innerHTML = `
    <div class="type-select">
      <div class="type-card ${quizGen.type === 'standard' ? 'active' : ''}" onclick="selectQuizType('standard')">
        <div class="tc-icon">${iconQuiz()}</div>
        <h4>Standard Quiz</h4>
        <p>AI-generated identification, multiple choice, and matching questions</p>
      </div>
      <div class="type-card locked" onclick="selectQuizType('interactive')">
        <span class="soon-tag">Soon</span>
        <div class="tc-icon">${iconGamepad()}</div>
        <h4>Interactive</h4>
        <p>Live team-based review game for the whole class</p>
      </div>
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
      <div class="gen-field"><label>Quiz Title</label><input type="text" placeholder="e.g. Cybersecurity – Quiz 4" value="${escHtml(quizGen.title)}" oninput="updateTitle(this.value)"></div>
      <div class="gen-field"><label>Subject</label>
        <select onchange="updateSubject(this.value)">
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
      <label>Quiz Expiration / Due Date & Time <span style="text-transform:none;font-weight:500;color:var(--text-muted);">(optional deadline for student submission)</span></label>
      <input type="datetime-local" 
             min="${minISO}" 
             max="${maxISO}" 
             value="${quizGen.dueDate || ''}" 
             onchange="updateQuizDueDate(this.value)"
             style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;font-family:inherit;font-size:13px;color:#0f172a;background:#ffffff;">
      <span style="font-size:11.5px;color:var(--text-muted);margin-top:4px;display:block;">
        🕒 Hour & minute selectable · Restricted up to <strong>${currentYear}</strong> only · Past hours blocked.
      </span>
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
    <div class="gen-field">
      <label>Source Material</label>
      ${quizGen.file ? `
        <div class="file-chip">
          <div class="fc-icon">${iconDoc().replace('<svg viewBox="0 0 24 24">','<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">')}</div>
          <div class="fc-info"><h5>${escHtml(quizGen.file.name)}</h5><span>${quizGen.fileText ? 'Text extracted · ready to generate' : 'Reading file…'}</span></div>
          <button class="fc-remove" onclick="removeFile()">${iconClose()}</button>
        </div>` : `
        <label class="dropzone" for="quizFileInput">
          ${iconUpload()}
          <div class="dz-title">Click to upload a handout, module, or notes</div>
          <div class="dz-sub">PDF, DOCX, or TXT</div>
        </label>
        <input type="file" id="quizFileInput" accept=".pdf,.docx,.txt" style="display:none" onchange="handleFileInput(this)">
      `}
    </div>
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
        <span class="cc-hint">${typeof quizGen.count === 'number' ? `(${quizGen.count} questions total${isMultiFormat ? ' · evenly balanced' : ''})` : '(AI will choose optimal balanced count)'}</span>
      </div>
    </div>
    `}
  `;

  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="closeQuizModal()">Cancel</button>
    <button class="gen-btn" ${!quizGen.file ? 'disabled' : ''} onclick="generateQuiz()">${iconChip()} Generate Quiz</button>`;
}

function renderQuestionCard(q) {
  const tagClass = q.type === 'multiple_choice' ? 'mc' : q.type === 'identification' ? 'id' : 'match';
  const tagLabel = q.type === 'multiple_choice' ? 'Multiple Choice' : q.type === 'identification' ? 'Identification' : 'Matching Type';
  let body = '';
  if (q.type === 'multiple_choice') {
    body = `<textarea rows="2" oninput="editQuestion('${q._id}','question',this.value)">${escHtml(q.question)}</textarea>
      <div class="qr-options">${(q.options || []).map((opt, i) => `
        <div class="qr-opt-row">
          <input type="radio" name="ans-${q._id}" ${i === q._answerIdx ? 'checked' : ''} onchange="setAnswerIndex('${q._id}', ${i})" title="Mark as correct answer">
          <input type="text" value="${escHtml(opt)}" oninput="editOption('${q._id}', ${i}, this.value)">
          ${(q.options || []).length > 2 ? `<button class="qr-opt-del-btn" title="Remove this choice" onclick="removeOption('${q._id}', ${i})">&times;</button>` : ''}
        </div>`).join('')}</div>
      <div style="margin-top:8px;">
        <button class="qr-add-opt-btn" onclick="addOption('${q._id}')">+ Add Choice</button>
      </div>`;
  } else if (q.type === 'identification') {
    body = `<textarea rows="2" oninput="editQuestion('${q._id}','question',this.value)">${escHtml(q.question)}</textarea>
      <div class="qr-label">Correct Answer</div>
      <input type="text" value="${escHtml(q.answer)}" oninput="editQuestion('${q._id}','answer',this.value)">`;
  } else {
    body = `<div class="qr-label">Instructions</div>
      <input type="text" value="${escHtml(q.instructions || '')}" oninput="editQuestion('${q._id}','instructions',this.value)">
      <div class="qr-pairs">${(q.pairs || []).map((p, i) => `
        <div class="qr-pair-row">
          <input type="text" value="${escHtml(p.left)}" oninput="editPair('${q._id}', ${i}, 'left', this.value)">
          <span>&harr;</span>
          <input type="text" value="${escHtml(p.right)}" oninput="editPair('${q._id}', ${i}, 'right', this.value)">
        </div>`).join('')}</div>`;
  }
  return `<div class="qresult-card">
    <div class="qr-top"><span class="qr-type-tag ${tagClass}">${tagLabel}</span><button class="qr-remove" onclick="removeQuestion('${q._id}')">${iconTrash()}</button></div>
    ${body}
  </div>`;
}
