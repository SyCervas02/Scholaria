/* ── STUDENT QUIZ TAKING & SCORING ENGINE ── */

const takeQuizState = { 
  quiz: null, 
  items: [], 
  responses: {}, 
  submitting: false, 
  reviewMode: false, 
  reviewAnswers: [],
  timeLimitMinutes: 0,
  secondsLeft: 0,
  timerInterval: null
};

function buildQuizItems(quiz) {
  const items = [];
  (quiz?.questions || []).forEach((q, qi) => {
    if (q.type === 'multiple_choice') {
      items.push({ itemId: `q${qi}`, label: q.question, type: 'multiple_choice', options: q.options || [], correct: q.answer });
    } else if (q.type === 'identification') {
      items.push({ itemId: `q${qi}`, label: q.question, type: 'identification', correct: q.answer });
    } else if (q.type === 'matching') {
      (q.pairs || []).forEach((p, pi) => {
        items.push({
          itemId: `q${qi}_p${pi}`,
          label: `${q.instructions || 'Matching'} — ${p.left}`,
          type: 'matching',
          options: (q.pairs || []).map(x => x.right),
          correct: p.right
        });
      });
    }
  });
  return items;
}

function gradeItem(item, given) {
  if (given == null) return false;
  return String(given).trim().toLowerCase() === String(item.correct).trim().toLowerCase();
}

function startTakeQuizTimer() {
  clearInterval(takeQuizState.timerInterval);
  if (takeQuizState.timeLimitMinutes <= 0) return;
  takeQuizState.secondsLeft = takeQuizState.timeLimitMinutes * 60;
  updateTakeQuizTimerDisplay();

  takeQuizState.timerInterval = setInterval(() => {
    takeQuizState.secondsLeft--;
    updateTakeQuizTimerDisplay();
    if (takeQuizState.secondsLeft <= 0) {
      clearInterval(takeQuizState.timerInterval);
      handleTakeQuizTimeout();
    }
  }, 1000);
}

function updateTakeQuizTimerDisplay() {
  const timerEl = document.getElementById('tqTimerDisplay');
  if (!timerEl) return;
  const mins = Math.floor(Math.max(0, takeQuizState.secondsLeft) / 60);
  const secs = Math.max(0, takeQuizState.secondsLeft) % 60;
  timerEl.textContent = `⏱️ ${mins}:${secs < 10 ? '0' : ''}${secs}`;
  if (takeQuizState.secondsLeft <= 60) {
    timerEl.classList.add('urgent');
  } else {
    timerEl.classList.remove('urgent');
  }
}

function handleTakeQuizTimeout() {
  showToast('Time is up! Auto-submitting your quiz answers...', 'warning');
  submitQuizAttempt(true);
}

function openTakeQuizModal(quizId) {
  const quiz = customQuizzes.find(q => q.id === quizId);
  if (!quiz) { showToast('Quiz not found', 'error'); return; }
  const items = buildQuizItems(quiz);
  if (!items.length) { showToast('This quiz has no gradable items yet', 'error'); return; }

  const timeLimitMins = quiz.timeLimitMinutes || (quiz.questions?.[0]?._meta?.timeLimitMinutes) || (quiz.questions?.[0]?._timeLimitMinutes) || 0;

  clearInterval(takeQuizState.timerInterval);
  Object.assign(takeQuizState, { 
    quiz, 
    items, 
    responses: {}, 
    submitting: false, 
    reviewMode: false, 
    reviewAnswers: [],
    timeLimitMinutes: timeLimitMins,
    secondsLeft: timeLimitMins * 60
  });

  document.getElementById('takeQuizModal').classList.add('active');
  renderTakeQuizModal();

  if (timeLimitMins > 0) {
    startTakeQuizTimer();
  }
}

function openReviewAttempt(quizId) {
  clearInterval(takeQuizState.timerInterval);
  const quiz = customQuizzes.find(q => q.id === quizId);
  const attempt = myQuizAttempts.find(a => a.quiz_id === quizId);
  if (!quiz || !attempt) { showToast('Attempt not found', 'error'); return; }
  const items = buildQuizItems(quiz);
  Object.assign(takeQuizState, { 
    quiz, 
    items, 
    responses: {}, 
    submitting: false, 
    reviewMode: true, 
    reviewAnswers: attempt.answers || [],
    timeLimitMinutes: 0,
    secondsLeft: 0
  });
  document.getElementById('takeQuizModal').classList.add('active');
  renderTakeQuizModal();
}

function closeTakeQuizModal() {
  clearInterval(takeQuizState.timerInterval);
  document.getElementById('takeQuizModal').classList.remove('active');
}

function setTQAnswer(itemId, value) {
  takeQuizState.responses[itemId] = value;
}

function renderTakeQuizModal() {
  const titleEl = document.getElementById('takeQuizModalTitle');
  const subEl = document.getElementById('takeQuizModalSubtitle');
  const body = document.getElementById('takeQuizModalBody');
  const foot = document.getElementById('takeQuizModalFoot');
  if (!titleEl) return;
  const { quiz, items, responses, submitting, reviewMode, reviewAnswers } = takeQuizState;

  titleEl.textContent = quiz ? quiz.title.replace(' (Demo)', '') : 'Quiz';

  const timerHtml = (takeQuizState.timeLimitMinutes > 0 && !reviewMode)
    ? `<span class="tq-timer-badge" id="tqTimerDisplay">⏱️ ${Math.floor(takeQuizState.secondsLeft / 60)}:${(takeQuizState.secondsLeft % 60) < 10 ? '0' : ''}${takeQuizState.secondsLeft % 60}</span>`
    : '';

  subEl.innerHTML = reviewMode
    ? 'Reviewing your submitted answers'
    : `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:2px;">
        <span>${items.length} item${items.length === 1 ? '' : 's'} — answer everything, then submit</span>
        ${timerHtml}
      </div>`;

  body.innerHTML = items.map((it, idx) => {
    const reviewAns = reviewMode ? reviewAnswers.find(a => a.itemId === it.itemId) : null;
    let fieldHtml = '';
    if (it.type === 'multiple_choice') {
      const current = reviewMode ? (reviewAns ? reviewAns.given : null) : responses[it.itemId];
      fieldHtml = (it.options || []).map(opt => `
        <label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:${reviewMode ? 'default' : 'pointer'};">
          <input type="radio" name="tq_${it.itemId}" value="${escHtml(opt)}" ${current === opt ? 'checked' : ''} ${reviewMode ? 'disabled' : ''} onchange="setTQAnswer('${it.itemId}', this.value)">
          <span>${escHtml(opt)}</span>
        </label>`).join('');
    } else if (it.type === 'identification') {
      const val = reviewMode ? (reviewAns ? reviewAns.given : '') : (responses[it.itemId] || '');
      fieldHtml = `<input type="text" value="${escHtml(val)}" placeholder="Type your answer" ${reviewMode ? 'disabled' : ''} oninput="setTQAnswer('${it.itemId}', this.value)" style="width:100%;padding:8px 10px;border:1.5px solid var(--blue-light);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;">`;
    } else if (it.type === 'matching') {
      const val = reviewMode ? (reviewAns ? reviewAns.given : '') : (responses[it.itemId] || '');
      fieldHtml = `<select class="user-filter-select" style="width:100%;" ${reviewMode ? 'disabled' : ''} onchange="setTQAnswer('${it.itemId}', this.value)">
        <option value="">— select a match —</option>
        ${(it.options || []).map(opt => `<option value="${escHtml(opt)}" ${val === opt ? 'selected' : ''}>${escHtml(opt)}</option>`).join('')}
      </select>`;
    }
    const resultTag = reviewMode && reviewAns
      ? `<div style="margin-top:6px;font-size:12px;font-weight:700;color:${reviewAns.isCorrect ? '#059669' : '#dc2626'};">
          ${reviewAns.isCorrect ? '✔ Correct' : `✘ Incorrect — correct answer: ${escHtml(String(it.correct))}`}
        </div>`
      : '';
    return `<div style="padding:12px 0;border-bottom:1px solid var(--blue-light);">
      <p style="font-weight:600;margin-bottom:8px;font-size:13px;">${idx + 1}. ${escHtml(it.label)}</p>
      ${fieldHtml}
      ${resultTag}
    </div>`;
  }).join('');

  foot.innerHTML = reviewMode
    ? `<button class="add-btn" onclick="closeTakeQuizModal()">Close</button>`
    : `<button class="add-btn" ${submitting ? 'disabled' : ''} onclick="submitQuizAttempt()">${submitting ? 'Submitting…' : 'Submit Quiz'}</button>`;
}

async function submitQuizAttempt(isAutoSubmit = false) {
  const { quiz, items, responses, submitting } = takeQuizState;
  if (submitting) return;

  if (!isAutoSubmit) {
    const unanswered = items.some(it => responses[it.itemId] == null || responses[it.itemId] === '');
    if (unanswered) { showToast('Please answer every item before submitting', 'error'); return; }
  }

  clearInterval(takeQuizState.timerInterval);
  takeQuizState.submitting = true;
  renderTakeQuizModal();

  const gradedAnswers = items.map(it => {
    const given = responses[it.itemId];
    return { itemId: it.itemId, label: it.label, type: it.type, given, correct: it.correct, isCorrect: gradeItem(it, given) };
  });
  const score = gradedAnswers.filter(a => a.isCorrect).length;
  const total = gradedAnswers.length;

  const attemptObj = {
    id: 'att_' + Date.now(),
    quiz_id: quiz.id,
    quiz_title: quiz.title || 'Quiz',
    student_id: CURRENT_PROFILE.id || CURRENT_PROFILE.school_id || 'stud_1',
    student_name: CURRENT_PROFILE.full_name || 'Student John Doe',
    section: CURRENT_PROFILE.section || 'Section A',
    subject: quiz.subject || CURRENT_PROFILE.strand || 'STEM, HUMSS',
    strand: CURRENT_PROFILE.strand || 'STEM',
    score,
    total_items: total,
    score_percentage: total ? Math.round((score / total) * 100) : 0,
    answers: gradedAnswers,
    submitted_at: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem('scholaria_all_attempts_v1');
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(attemptObj);
    localStorage.setItem('scholaria_all_attempts_v1', JSON.stringify(list));
  } catch(e) {}

  try {
    const rawCR = localStorage.getItem('scholaria_class_records_v2');
    const listCR = rawCR ? JSON.parse(rawCR) : [];
    listCR.unshift(attemptObj);
    localStorage.setItem('scholaria_class_records_v2', JSON.stringify(listCR));
  } catch(e) {}

  // Dual insert into quiz_attempts AND dedicated class_records table
  try {
    await db.from('class_records').insert({
      student_id: String(CURRENT_PROFILE.id || CURRENT_PROFILE.school_id || 'seed_stud_1'),
      student_name: CURRENT_PROFILE.full_name || 'Student John Doe',
      section: CURRENT_PROFILE.section || 'Section A',
      subject: quiz.subject || CURRENT_PROFILE.strand || 'STEM, HUMSS',
      strand: CURRENT_PROFILE.strand || 'STEM',
      quiz_id: String(quiz.id),
      quiz_title: quiz.title || 'Quiz',
      score,
      total_items: total,
      score_percentage: total ? Math.round((score / total) * 100) : 0
    });
  } catch(crErr) {
    console.warn('Class Records table sync notice:', crErr);
  }

  let { error } = await db.from('quiz_attempts').insert({
    quiz_id: quiz.id,
    quiz_title: quiz.title || 'Quiz',
    student_id: CURRENT_PROFILE.id,
    student_name: CURRENT_PROFILE.full_name,
    score,
    total_items: total,
    answers: gradedAnswers
  });

  if (error) {
    const retry = await db.from('quiz_attempts').insert({
      quiz_id: quiz.id,
      student_id: CURRENT_PROFILE.id,
      score,
      total_items: total,
      answers: gradedAnswers
    });
    error = retry.error;
  }

  takeQuizState.submitting = false;
  if (error) {
    console.warn('Supabase insert notice:', error.message);
  }

  closeTakeQuizModal();
  showToast(`Submitted — score ${score}/${total}`, 'success');
  await loadMyAttemptsFromDB();
  if (typeof loadClassRecAttempts === 'function') {
    await loadClassRecAttempts(true);
  }
  if (currentPage === 'quizzes' || currentPage === 'dashboard' || currentPage === 'classrec' || currentPage === 'progress') {
    renderPage(currentPage);
  }
}

let myQuizAttempts = [];

async function loadMyAttemptsFromDB() {
  if (ROLE !== 'student') return;
  let dbAttempts = [];
  try {
    const { data, error } = await db.from('quiz_attempts').select('*').eq('student_id', CURRENT_PROFILE.id).order('submitted_at', { ascending: false });
    if (!error && data) dbAttempts = data;
  } catch(e) {}

  let localAttempts = [];
  try {
    const raw = localStorage.getItem('scholaria_all_attempts_v1');
    if (raw) {
      const list = JSON.parse(raw);
      localAttempts = list.filter(a => 
        String(a.student_id).toLowerCase() === String(CURRENT_PROFILE.id).toLowerCase() ||
        String(a.student_id).toLowerCase() === String(CURRENT_PROFILE.school_id || '').toLowerCase() ||
        (a.student_name && a.student_name.toLowerCase() === (CURRENT_PROFILE.full_name || '').toLowerCase())
      );
    }
  } catch(e) {}

  const combined = [...dbAttempts];
  localAttempts.forEach(la => {
    if (!combined.some(ca => (ca.id && ca.id === la.id) || (String(ca.quiz_id) === String(la.quiz_id)))) {
      combined.push(la);
    }
  });

  myQuizAttempts = typeof deduplicateQuizAttempts === 'function' ? deduplicateQuizAttempts(combined) : combined;

  if (typeof currentPage !== 'undefined' && (currentPage === 'progress' || currentPage === 'quizzes' || currentPage === 'dashboard')) {
    const mainContent = document.getElementById('mainContent');
    if (mainContent && typeof getPageContent === 'function') {
      mainContent.innerHTML = getPageContent(ROLE, currentPage);
    }
  }
}
