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
  let rawQuestions = quiz?.questions || [];
  if (typeof rawQuestions === 'string') {
    try { rawQuestions = JSON.parse(rawQuestions); } catch(e) { rawQuestions = []; }
  }
  if (!Array.isArray(rawQuestions)) rawQuestions = [];

  rawQuestions.forEach((q, qi) => {
    if (!q) return;
    const srcFile = q.source_file || q.sourceMaterial || q.source_material || '';
    const srcPage = q.source_page || null;

    const correctVal = q.answer || q.correct || q.correctAnswer || q.correct_answer || (typeof q._answerIdx === 'number' && q.options ? q.options[q._answerIdx] : '') || '';

    if (q.type === 'multiple_choice') {
      items.push({ 
        itemId: `q${qi}`, 
        label: q.question || q.label || `Question ${qi + 1}`, 
        type: 'multiple_choice', 
        options: Array.isArray(q.options) ? q.options : [], 
        correct: correctVal,
        explanation: q.explanation || '',
        sourceFile: srcFile,
        sourcePage: srcPage
      });
    } else if (q.type === 'true_false' || q.type === 'tf') {
      items.push({ 
        itemId: `q${qi}`, 
        label: q.question || q.label || `Question ${qi + 1}`, 
        type: 'true_false', 
        options: ['True', 'False'], 
        correct: correctVal || 'True',
        explanation: q.explanation || '',
        sourceFile: srcFile,
        sourcePage: srcPage
      });
    } else if (q.type === 'identification') {
      items.push({ 
        itemId: `q${qi}`, 
        label: q.question || q.label || `Question ${qi + 1}`, 
        type: 'identification', 
        correct: correctVal,
        explanation: q.explanation || '',
        sourceFile: srcFile,
        sourcePage: srcPage
      });
    } else if (q.type === 'matching') {
      (q.pairs || []).forEach((p, pi) => {
        items.push({
          itemId: `q${qi}_p${pi}`,
          label: `${q.instructions || 'Matching'} — ${p.left || 'Item'}`,
          type: 'matching',
          options: (q.pairs || []).map(x => x.right).filter(Boolean),
          correct: p.right,
          explanation: q.explanation || '',
          sourceFile: srcFile,
          sourcePage: srcPage
        });
      });
    } else {
      items.push({
        itemId: `q${qi}`,
        label: q.question || q.label || `Question ${qi + 1}`,
        type: q.options && q.options.length ? 'multiple_choice' : 'identification',
        options: Array.isArray(q.options) ? q.options : [],
        correct: correctVal,
        explanation: q.explanation || '',
        sourceFile: srcFile,
        sourcePage: srcPage
      });
    }
  });
  return items;
}

/**
 * Normalizes text for lenient, accurate comparison:
 * - Lowercases and trims
 * - Removes leading articles ("a", "an", "the")
 * - Removes trailing punctuation (.,;:!?)
 * - Collapses extra whitespace
 */
function normalizeAnswerString(str) {
  if (str == null) return '';
  let s = String(str).trim().toLowerCase();
  s = s.replace(/[.,;:!?]+$/, '').trim();
  s = s.replace(/^(a|an|the)\s+/i, '').trim();
  s = s.replace(/\s+/g, ' ');
  return s;
}

function compareAnswers(given, correct) {
  if (given == null || correct == null) return false;
  const gRaw = String(given).trim().toLowerCase();
  const cRaw = String(correct).trim().toLowerCase();
  if (!gRaw || !cRaw) return false;
  if (gRaw === cRaw) return true;

  const gNorm = normalizeAnswerString(given);
  const cNorm = normalizeAnswerString(correct);
  if (gNorm && cNorm && gNorm === cNorm) return true;

  const alternatives = String(correct).split(/[\/|;]/).map(a => normalizeAnswerString(a)).filter(Boolean);
  if (alternatives.some(alt => alt === gNorm)) return true;

  const cNoParen = normalizeAnswerString(String(correct).replace(/\(.*?\)/g, ''));
  if (cNoParen && cNoParen === gNorm) return true;

  return false;
}

/**
 * Checks if a given option was selected by the student,
 * supporting exact option text, letter ('A', 'B'), 'A.', 'A)',
 * index, and prefixed representations like "B. Mitosis".
 */
function isOptionSelected(opt, optIdx, studentGiven) {
  if (studentGiven == null || studentGiven === '') return false;
  const s = String(studentGiven).trim();
  const o = String(opt).trim();
  if (s.toLowerCase() === o.toLowerCase()) return true;

  const sNorm = normalizeAnswerString(s);
  const oNorm = normalizeAnswerString(o);
  if (sNorm && oNorm && sNorm === oNorm) return true;

  const letter = String.fromCharCode(65 + optIdx).toLowerCase(); // 'a', 'b', 'c', ...
  const sLower = s.toLowerCase();

  // If student given is single letter 'a', 'b', or 'a.', 'a)'
  if (sLower === letter || sLower === `${letter}.` || sLower === `${letter})`) return true;

  // If student given has letter prefix like "b. mitosis" or "b) mitosis"
  const prefixRegex = new RegExp(`^${letter}[\\.\\)\\:\\-\\s]+`, 'i');
  if (prefixRegex.test(sLower)) {
    const afterPrefix = sLower.replace(prefixRegex, '').trim();
    if (afterPrefix === o.toLowerCase() || normalizeAnswerString(afterPrefix) === oNorm) {
      return true;
    }
  }

  // If student given was pure index number (e.g. 0, 1)
  if (/^\d+$/.test(s)) {
    const num = parseInt(s, 10);
    if (num === optIdx) return true;
  }

  return false;
}

/**
 * Checks if a given option is the correct answer according to the answer key,
 * handling option text, letter ('A', 'B'), prefixed, or formatted values.
 */
function isOptionCorrect(opt, optIdx, itemCorrect) {
  if (itemCorrect == null || itemCorrect === '') return false;
  const c = String(itemCorrect).trim();
  const o = String(opt).trim();
  if (c.toLowerCase() === o.toLowerCase()) return true;

  const cNorm = normalizeAnswerString(c);
  const oNorm = normalizeAnswerString(o);
  if (cNorm && oNorm && cNorm === oNorm) return true;

  const letter = String.fromCharCode(65 + optIdx).toLowerCase();
  const cLower = c.toLowerCase();

  if (cLower === letter || cLower === `${letter}.` || cLower === `${letter})`) return true;

  const prefixRegex = new RegExp(`^${letter}[\\.\\)\\:\\-\\s]+`, 'i');
  if (prefixRegex.test(cLower)) {
    const afterPrefix = cLower.replace(prefixRegex, '').trim();
    if (afterPrefix === o.toLowerCase() || normalizeAnswerString(afterPrefix) === oNorm) {
      return true;
    }
  }

  if (/^\d+$/.test(c)) {
    const num = parseInt(c, 10);
    if (num === optIdx) return true;
  }

  return compareAnswers(o, c);
}

function gradeItem(item, given) {
  if (given == null || given === '') return false;
  return compareAnswers(given, item.correct || '');
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
  timerEl.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> <span>Time left <strong>${mins}:${secs < 10 ? '0' : ''}${secs}</strong></span>`;
  if (takeQuizState.secondsLeft <= 60) {
    timerEl.classList.add('urgent');
  } else {
    timerEl.classList.remove('urgent');
  }
}

function handleTakeQuizTimeout() {
  if (typeof showToast === 'function') {
    showToast('Time is up! Auto-submitting your quiz answers...', 'warning');
  }
  submitQuizAttempt(true);
}

function openTakeQuizModal(quizId) {
  let quiz = null;
  if (quizId && typeof quizId === 'object') {
    quiz = quizId;
  } else {
    const quizList = typeof customQuizzes !== 'undefined' ? customQuizzes : [];
    quiz = quizList.find(q => String(q.id) === String(quizId));
  }
  if (!quiz) { 
    if (typeof showToast === 'function') showToast('Quiz not found', 'error'); 
    return; 
  }

  // Prevent students from taking overdue quizzes
  if (typeof ROLE !== 'undefined' && ROLE === 'student') {
    const rawDue = quiz.dueDate || quiz.due_date;
    if (rawDue) {
      const dueTime = new Date(rawDue).getTime();
      if (!isNaN(dueTime) && dueTime < Date.now()) {
        if (typeof showToast === 'function') {
          showToast('This assessment deadline has passed and is closed for submissions.', 'error');
        } else {
          alert('This assessment deadline has passed and is closed for submissions.');
        }
        return;
      }
    }
  }

  if (quiz.type === 'interactive' || quiz.quiz_type === 'interactive') {
    if (typeof openInteractiveQuiz === 'function') {
      openInteractiveQuiz(quizId);
      return;
    }
  }

  const items = buildQuizItems(quiz);
  if (!items.length) { 
    if (typeof showToast === 'function') showToast('This quiz has no gradable items yet', 'error'); 
    return; 
  }

  const timeLimitMins = Number(quiz.timeLimitMinutes || quiz.questions?.[0]?._meta?.timeLimitMinutes || quiz.questions?.[0]?._timeLimitMinutes || 0);

  clearInterval(takeQuizState.timerInterval);
  Object.assign(takeQuizState, { 
    quiz, 
    items, 
    responses: {}, 
    submitting: false, 
    reviewMode: false, 
    reviewAnswers: [],
    startTime: Date.now(),
    timeLimitMinutes: timeLimitMins,
    secondsLeft: timeLimitMins * 60
  });

  const modal = document.getElementById('takeQuizModal');
  if (modal) {
    modal.classList.add('active', 'sq-take-quiz-overlay');
  }
  renderTakeQuizModal();

  if (timeLimitMins > 0) {
    startTakeQuizTimer();
  }
}

async function openReviewAttempt(quizIdOrAttemptId, optionalAttemptId) {
  clearInterval(takeQuizState.timerInterval);
  const quizList = typeof customQuizzes !== 'undefined' && Array.isArray(customQuizzes) ? customQuizzes : [];
  const targetId = String(quizIdOrAttemptId || '').toLowerCase().trim();
  const targetAttemptId = String(optionalAttemptId || '').toLowerCase().trim();

  // 1. Gather all attempts in memory & storage
  let attemptsPool = [];
  if (typeof getAllRecordedAttempts === 'function') {
    try { attemptsPool.push(...getAllRecordedAttempts()); } catch(e) {}
  }
  if (typeof myQuizAttempts !== 'undefined' && Array.isArray(myQuizAttempts)) {
    attemptsPool.push(...myQuizAttempts);
  }
  try {
    const raw = localStorage.getItem('scholaria_all_attempts_v1');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) attemptsPool.push(...list);
    }
  } catch(e) {}
  try {
    const rawCR = localStorage.getItem('scholaria_class_records_v2');
    if (rawCR) {
      const listCR = JSON.parse(rawCR);
      if (Array.isArray(listCR)) attemptsPool.push(...listCR);
    }
  } catch(e) {}

  const prof = (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE) ? CURRENT_PROFILE : {};
  const currentStudentId = String(prof.id || prof.school_id || '').toLowerCase().trim();
  const currentStudentName = String(prof.full_name || '').toLowerCase().trim();

  // 2. Identify the attempt
  let attempt = null;

  // Case A: specific attemptId was passed
  if (targetAttemptId) {
    attempt = attemptsPool.find(a => a && String(a.id || '').toLowerCase().trim() === targetAttemptId);
  }

  // Case B: targetId is itself an attempt ID (e.g. from sidebar recent attempts)
  if (!attempt && targetId) {
    attempt = attemptsPool.find(a => a && String(a.id || '').toLowerCase().trim() === targetId);
  }

  // Case C: targetId is a quiz ID
  if (!attempt && targetId) {
    const matching = attemptsPool.filter(a => {
      if (!a) return false;
      const aQid = String(a.quiz_id || '').toLowerCase().trim();
      return aQid && aQid === targetId;
    });
    if (matching.length) {
      attempt = matching.find(a => {
        const sid = String(a.student_id || a.studentId || a.user_id || '').toLowerCase().trim();
        const sname = String(a.student_name || a.studentName || '').toLowerCase().trim();
        if (currentStudentId && sid === currentStudentId) return true;
        if (currentStudentName && (sname === currentStudentName || sid === currentStudentName)) return true;
        return false;
      }) || matching[0];
    }
  }

  // Case D: targetId matches quiz title
  if (!attempt && targetId) {
    const matchingByTitle = attemptsPool.filter(a => {
      if (!a || !a.quiz_title) return false;
      return String(a.quiz_title).toLowerCase().trim() === targetId;
    });
    if (matchingByTitle.length) attempt = matchingByTitle[0];
  }

  // Case E: Try fetching from Supabase directly if still not found
  if (!attempt && typeof db !== 'undefined' && db && db.from && targetId) {
    try {
      const { data } = await db.from('quiz_attempts').select('*').or(`id.eq.${targetId},quiz_id.eq.${targetId}`);
      if (data && data.length) {
        attempt = data[0];
        attemptsPool.push(attempt);
      }
    } catch(dbErr) {}
  }

  // 3. Identify the quiz
  let quiz = null;
  const quizTargetId = attempt ? String(attempt.quiz_id || '').toLowerCase().trim() : targetId;

  if (quizTargetId) {
    quiz = quizList.find(q => String(q.id).toLowerCase().trim() === quizTargetId);
    if (!quiz && typeof allQuizzes !== 'undefined' && Array.isArray(allQuizzes)) {
      quiz = allQuizzes.find(q => String(q.id).toLowerCase().trim() === quizTargetId);
    }
  }
  if (!quiz && attempt && attempt.quiz_title) {
    const tLower = String(attempt.quiz_title).toLowerCase().trim();
    quiz = quizList.find(q => q.title && String(q.title).toLowerCase().trim() === tLower);
  }

  // Try fetching quiz from Supabase if not in memory
  if (!quiz && typeof db !== 'undefined' && db && db.from && quizTargetId) {
    try {
      const { data } = await db.from('quizzes').select('*').eq('id', quizTargetId).single();
      if (data) quiz = data;
    } catch(qDbErr) {}
  }

  // Fallback: Reconstruct minimal quiz object from attempt metadata
  if (!quiz && attempt) {
    quiz = {
      id: attempt.quiz_id || targetId,
      title: attempt.quiz_title || 'Quiz Review',
      subject: attempt.subject || 'General',
      strand: attempt.strand || 'General',
      questions: []
    };
  }

  if (!attempt) { 
    if (typeof showToast === 'function') showToast('Quiz attempt record not found', 'error'); 
    return; 
  }

  // 4. Parse answers safely
  let parsedAnswers = attempt.answers || [];
  if (typeof parsedAnswers === 'string') {
    try { parsedAnswers = JSON.parse(parsedAnswers); } catch(e) { parsedAnswers = []; }
  }
  if (!Array.isArray(parsedAnswers) && parsedAnswers && typeof parsedAnswers === 'object') {
    parsedAnswers = Object.keys(parsedAnswers).map(k => ({ itemId: k, ...parsedAnswers[k] }));
  }
  if (!Array.isArray(parsedAnswers)) parsedAnswers = [];

  // 5. Build items and populate from parsed answers if quiz questions are missing
  let items = buildQuizItems(quiz);
  if (!items.length && parsedAnswers.length) {
    parsedAnswers.forEach((ans, idx) => {
      items.push({
        itemId: ans.itemId || `q${idx}`,
        label: ans.label || ans.question || `Question ${idx + 1}`,
        type: ans.type || (Array.isArray(ans.options) && ans.options.length ? 'multiple_choice' : 'identification'),
        options: Array.isArray(ans.options) ? ans.options : (ans.given && ans.correct && ans.given !== ans.correct ? [ans.given, ans.correct] : [ans.correct || 'Option A']),
        correct: ans.correct ?? ans.correctAnswer ?? '',
        explanation: ans.explanation || '',
        sourceFile: ans.sourceFile || ans.sourceMaterial || '',
        sourcePage: ans.sourcePage || null
      });
    });
  }

  Object.assign(takeQuizState, { 
    quiz, 
    items, 
    attempt,
    responses: {}, 
    submitting: false, 
    reviewMode: true, 
    reviewAnswers: parsedAnswers,
    timeLimitMinutes: 0,
    secondsLeft: 0
  });
  const modal = document.getElementById('takeQuizModal');
  if (modal) {
    modal.classList.add('active', 'sq-take-quiz-overlay');
  }
  renderTakeQuizModal();
}

window.openReviewAttempt = openReviewAttempt;

function requestCloseTakeQuizModal() {
  if (takeQuizState.reviewMode) {
    closeTakeQuizModal();
    return;
  }
  const confirmEl = document.getElementById('sqExitConfirmModal');
  if (confirmEl) {
    confirmEl.style.display = 'flex';
  } else {
    closeTakeQuizModal();
  }
}

function cancelExitQuiz() {
  const confirmEl = document.getElementById('sqExitConfirmModal');
  if (confirmEl) {
    confirmEl.style.display = 'none';
  }
}

function confirmExitQuiz() {
  cancelExitQuiz();
  closeTakeQuizModal();
}

function closeTakeQuizModal() {
  clearInterval(takeQuizState.timerInterval);
  const modal = document.getElementById('takeQuizModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function setTQAnswer(itemId, value) {
  takeQuizState.responses[itemId] = value;
  // Update selected state visually without full re-render
  const { items, responses } = takeQuizState;
  
  // Remove unanswered highlight from this card if present
  const cardEl = document.getElementById(`sq-card-${itemId}`);
  if (cardEl) {
    cardEl.classList.remove('sq-card-unanswered');
  }

  // Update radio rows for this item
  document.querySelectorAll(`.sq-opt-row[data-item="${itemId}"]`).forEach(row => {
    const rowVal = row.getAttribute('data-val');
    if (String(rowVal) === String(value)) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });

  // Update answered count
  const answeredCount = items.filter(it => responses[it.itemId] != null && String(responses[it.itemId]).trim() !== '').length;
  const countEl = document.querySelector('.sq-footer-count strong');
  if (countEl) countEl.textContent = `${answeredCount} of ${items.length} answered`;

  // Hide warning box immediately when student starts/continues answering
  const warningBox = document.getElementById('sqWarningBox');
  if (warningBox) {
    warningBox.style.display = 'none';
  }
}

/* ── STANDARD QUIZ MODERN RENDERER ── */
function renderTakeQuizModal() {
  const modal = document.getElementById('takeQuizModal');
  if (!modal) return;

  const { quiz, items, responses, submitting, reviewMode, reviewAnswers, timeLimitMinutes, secondsLeft } = takeQuizState;
  const safeEsc = typeof escHtml === 'function' ? escHtml : (str => String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])));

  const prof = (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE) ? CURRENT_PROFILE : {};
  const studentName = prof.full_name || 'Student';
  const quizSubject = quiz?.subject || prof.strand || 'General Academic';
  const quizTitle = quiz ? (quiz.title || 'Knowledge Check').replace(' (Demo)', '') : 'Knowledge Check';

  // Avatar HTML for upper right
  const userInitials = typeof initialsFor === 'function' ? initialsFor(studentName) : (studentName ? studentName.substring(0, 2).toUpperCase() : 'ST');
  const avatarHtml = prof.avatar_url 
    ? `<img src="${safeEsc(prof.avatar_url)}" class="sq-user-avatar-img" alt="${safeEsc(studentName)}" onerror="this.outerHTML='<div class=\\'sq-user-avatar-init\\'>${userInitials}</div>'"/>`
    : `<div class="sq-user-avatar-init">${userInitials}</div>`;

  const totalItems = items.length;
  const answeredCount = items.filter(it => responses[it.itemId] != null && String(responses[it.itemId]).trim() !== '').length;
  const reviewScore = (typeof takeQuizState.attempt?.score === 'number')
    ? takeQuizState.attempt.score
    : items.reduce((acc, it, idx) => {
        let ans = reviewAnswers.find(a => a && (String(a.itemId) === String(it.itemId) || String(a.id) === String(it.itemId))) ||
                  reviewAnswers.find(a => a && (String(a.itemId) === `q${idx}` || String(a.id) === `q${idx}` || a.questionIndex === idx)) ||
                  reviewAnswers[idx];
        if (!ans) return acc;
        const g = ans.given ?? ans.answer ?? ans.studentAnswer ?? ans.user_answer ?? ans.selected ?? '';
        const c = it.correct || ans.correct || ans.correctAnswer || '';
        const ok = ans.isCorrect !== undefined ? Boolean(ans.isCorrect) : compareAnswers(g, c);
        return acc + (ok ? 1 : 0);
      }, 0);

  // Timer HTML
  const mins = Math.floor(Math.max(0, secondsLeft) / 60);
  const secs = Math.max(0, secondsLeft) % 60;
  const timerHtml = (timeLimitMinutes > 0 && !reviewMode)
    ? `<div class="sq-hero-timer ${secondsLeft <= 60 ? 'urgent' : ''}" id="tqTimerDisplay">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>Time left <strong>${mins}:${secs < 10 ? '0' : ''}${secs}</strong></span>
      </div>`
    : '';

  const allowReviewAnswers = (
    quiz?.allowReviewAnswers !== false &&
    quiz?.allow_review_answers !== false &&
    quiz?._meta?.allowReviewAnswers !== false &&
    quiz?.questions?.[0]?._meta?.allowReviewAnswers !== false &&
    quiz?.questions?.[0]?._allowReviewAnswers !== false
  );
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  function buildQuestionCard(item, idx) {
    let reviewAns = null;
    if (reviewMode && Array.isArray(reviewAnswers)) {
      // 1. Match by itemId
      reviewAns = reviewAnswers.find(a => a && (String(a.itemId) === String(item.itemId) || String(a.id) === String(item.itemId)));
      // 2. Match by "q{idx}" or numeric index
      if (!reviewAns) {
        reviewAns = reviewAnswers.find(a => a && (String(a.itemId) === `q${idx}` || String(a.id) === `q${idx}` || a.questionIndex === idx || a.itemIndex === idx));
      }
      // 3. Match by question label / text
      if (!reviewAns && item.label) {
        const itemNormLabel = normalizeAnswerString(item.label);
        reviewAns = reviewAnswers.find(a => a && a.label && normalizeAnswerString(a.label) === itemNormLabel);
      }
      // 4. Positional fallback
      if (!reviewAns && reviewAnswers[idx]) {
        reviewAns = reviewAnswers[idx];
      }
    }

    const studentGiven = reviewMode 
      ? (reviewAns ? (reviewAns.given ?? reviewAns.answer ?? reviewAns.studentAnswer ?? reviewAns.user_answer ?? reviewAns.selected ?? responses[item.itemId] ?? '') : (responses[item.itemId] || ''))
      : (responses[item.itemId] || '');

    const itemCorrect = item.correct || (reviewAns ? (reviewAns.correct ?? reviewAns.correctAnswer ?? reviewAns.answer) : '');

    const isAnsCorrect = reviewMode 
      ? (reviewAns && reviewAns.isCorrect !== undefined ? Boolean(reviewAns.isCorrect) : (studentGiven ? compareAnswers(studentGiven, itemCorrect) : false))
      : false;

    // Card review class: green border if correct, red border if incorrect
    let cardReviewClass = '';
    let cardHeaderStatusBadge = '';
    if (reviewMode) {
      if (isAnsCorrect) {
        cardReviewClass = ' sq-review-correct';
        cardHeaderStatusBadge = `<span class="sq-opt-badge correct-badge" style="margin-left:auto;font-size:12px;padding:3px 10px;border-radius:20px;">✔ Correct</span>`;
      } else {
        cardReviewClass = ' sq-review-wrong';
        cardHeaderStatusBadge = `<span class="sq-opt-badge wrong-badge" style="margin-left:auto;font-size:12px;padding:3px 10px;border-radius:20px;">✘ Incorrect</span>`;
      }
    }

    const explanationHtml = (reviewMode && item.explanation && allowReviewAnswers)
      ? `<div style="margin-top:10px;padding:10px 14px;background:#fefce8;border:1px solid #fef08a;border-radius:8px;font-size:12.5px;color:#854d0e;line-height:1.45;display:flex;align-items:flex-start;gap:8px;">
          <span style="font-size:14px;flex-shrink:0;">💡</span>
          <div><strong>Why:</strong> ${safeEsc(item.explanation)}</div>
        </div>` : '';

    let inputHtml = '';

    if (item.type === 'multiple_choice' || item.type === 'true_false') {
      const optionsList = (item.options || []).map((opt, optIdx) => {
        const isSelected = reviewMode 
          ? isOptionSelected(opt, optIdx, studentGiven)
          : (String(studentGiven) === String(opt));

        const isOptRight = isOptionCorrect(opt, optIdx, itemCorrect);
        const letter = letters[optIdx] || String.fromCharCode(65 + optIdx);

        let rowClass = 'sq-opt-row';
        let badgeHtml = '';

        if (reviewMode) {
          rowClass += ' disabled';
          if (isSelected) {
            rowClass += ' selected';
            if (isAnsCorrect) {
              rowClass += ' correct';
              badgeHtml = `<span class="sq-opt-badge correct-badge">✔ Your Answer (Correct)</span>`;
            } else {
              rowClass += ' wrong';
              badgeHtml = `<span class="sq-opt-badge wrong-badge">✘ Your Answer</span>`;
            }
          } else if (isOptRight && allowReviewAnswers) {
            // When teacher allows review answers, highlight the actual correct answer in green
            rowClass += ' correct';
            badgeHtml = `<span class="sq-opt-badge correct-badge">✔ Correct Answer</span>`;
          }
        } else {
          if (isSelected) rowClass += ' selected';
        }

        const clickAttr = reviewMode ? '' : `onclick="setTQAnswer('${item.itemId}', '${safeEsc(opt).replace(/'/g, "\\'")}')"`; 
        return `<div class="${rowClass}" data-item="${safeEsc(item.itemId)}" data-val="${safeEsc(opt)}" ${clickAttr}>
          <div class="sq-opt-radio"></div>
          <div class="sq-opt-text">${letter}. ${safeEsc(opt)}</div>
          ${badgeHtml}
        </div>`;
      }).join('');

      let feedbackHtml = '';
      if (reviewMode) {
        if (isAnsCorrect) {
          feedbackHtml = `<div style="margin-top:12px;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;background:#dcfce7;color:#166534;border:1px solid #86efac;">
            ✔ Correct!
          </div>${explanationHtml}`;
        } else {
          if (allowReviewAnswers) {
            feedbackHtml = `<div style="margin-top:12px;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;">
              ✘ Incorrect — Correct answer: <strong>${safeEsc(String(itemCorrect || ''))}</strong>
            </div>${explanationHtml}`;
          } else {
            feedbackHtml = `<div style="margin-top:12px;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;">
              ✘ Incorrect
            </div>`;
          }
        }
      }

      inputHtml = `<div class="sq-options-list">${optionsList}</div>${feedbackHtml}`;

    } else if (item.type === 'identification') {
      let inputStyle = '';
      let feedbackHtml = '';
      if (reviewMode) {
        if (isAnsCorrect) {
          inputStyle = 'border:2px solid #22c55e !important;background:#f0fdf4 !important;color:#15803d !important;font-weight:600;';
          feedbackHtml = `<div style="margin-top:12px;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;background:#dcfce7;color:#166534;border:1px solid #86efac;">
            ✔ Correct!
          </div>${explanationHtml}`;
        } else {
          inputStyle = 'border:2px solid #ef4444 !important;background:#fef2f2 !important;color:#b91c1c !important;font-weight:600;';
          if (allowReviewAnswers) {
            feedbackHtml = `<div style="margin-top:12px;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;">
              ✘ Incorrect — Correct answer: <strong>${safeEsc(String(itemCorrect || ''))}</strong>
            </div>${explanationHtml}`;
          } else {
            feedbackHtml = `<div style="margin-top:12px;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;">
              ✘ Incorrect
            </div>`;
          }
        }
      }
      inputHtml = `<input type="text" class="sq-id-input" value="${safeEsc(studentGiven)}" placeholder="Type your answer here..." ${reviewMode ? 'disabled' : ''} style="${inputStyle}" oninput="setTQAnswer('${item.itemId}', this.value)">${feedbackHtml}`;

    } else {
      // matching
      let selectStyle = '';
      let feedbackHtml = '';
      if (reviewMode) {
        if (isAnsCorrect) {
          selectStyle = 'border:2px solid #22c55e !important;background:#f0fdf4 !important;color:#15803d !important;font-weight:600;';
          feedbackHtml = `<div style="margin-top:12px;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;background:#dcfce7;color:#166534;border:1px solid #86efac;">
            ✔ Correct!
          </div>${explanationHtml}`;
        } else {
          selectStyle = 'border:2px solid #ef4444 !important;background:#fef2f2 !important;color:#b91c1c !important;font-weight:600;';
          if (allowReviewAnswers) {
            feedbackHtml = `<div style="margin-top:12px;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;">
              ✘ Incorrect — Correct answer: <strong>${safeEsc(String(itemCorrect || ''))}</strong>
            </div>${explanationHtml}`;
          } else {
            feedbackHtml = `<div style="margin-top:12px;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;">
              ✘ Incorrect
            </div>`;
          }
        }
      }
      inputHtml = `<select class="sq-match-select" ${reviewMode ? 'disabled' : ''} style="${selectStyle}" onchange="setTQAnswer('${item.itemId}', this.value)">
        <option value="">— select matching item —</option>
        ${(item.options || []).map(opt => `<option value="${safeEsc(opt)}" ${studentGiven === opt ? 'selected' : ''}>${safeEsc(opt)}</option>`).join('')}
      </select>${feedbackHtml}`;
    }

    const cleanPage = item.sourcePage ? String(item.sourcePage).replace(/^(page\s*)+/i, '').trim() : '';
    const citationHtml = (reviewMode && item.sourceFile)
      ? `<div class="qz-source-badge" style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>📍 Find in handout:</span> <strong>${safeEsc(item.sourceFile)}</strong> ${cleanPage ? `· <span>Page ${safeEsc(cleanPage)}</span>` : ''}
        </div>`
      : '';

    return `<div class="sq-question-card${cardReviewClass}" id="sq-card-${safeEsc(item.itemId)}">
      <div class="sq-qcard-header">
        <span class="sq-qnum">${idx + 1}.</span>
        <span class="sq-qlabel">${safeEsc(item.label)}</span>
        ${cardHeaderStatusBadge}
      </div>
      ${inputHtml}
      ${citationHtml}
    </div>`;
  }

  const allCardsHtml = items.map((it, idx) => buildQuestionCard(it, idx)).join('');

  modal.innerHTML = `
    <header class="sq-header-nav">
      <div class="sq-student-brand">
        <img src="assets/logo.png" alt="Haven of Wisdom Academy Logo" class="sq-school-logo" onerror="this.style.display='none'"/>
        <span class="sq-brand-text">Scholaria</span>
      </div>
      <div class="sq-header-right">
        <span class="sq-student-name-pill">${safeEsc(studentName)}</span>
        ${avatarHtml}
        <button class="sq-close-btn" onclick="requestCloseTakeQuizModal()" title="Exit Quiz">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="sq-scroll-body">
      <div class="sq-hero-section">
        <div class="sq-hero-inner">
          <div class="sq-hero-text">
            <div class="sq-hero-subject">${safeEsc(quizSubject)}</div>
            <h1 class="sq-hero-title">${safeEsc(quizTitle)}</h1>
            <p class="sq-hero-subtitle">${reviewMode ? (allowReviewAnswers ? 'Reviewing your submitted answers and score.' : 'Reviewing your submitted answers and score (Answer key hidden by teacher).') : `Answer all ${totalItems} questions, then submit your quiz.`}</p>
          </div>
          ${timerHtml}
        </div>
      </div>

      <div class="sq-all-questions">
        ${(reviewMode && !allowReviewAnswers) ? `
          <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:12px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;color:#92400e;font-size:13px;line-height:1.45;">
            <span style="font-size:22px;flex-shrink:0;">🔒</span>
            <div>
              <strong>Correct Answers Hidden:</strong> Your teacher has configured this assessment so that the answer key and question explanations are hidden. You can review your submitted responses and overall score.
            </div>
          </div>
        ` : ''}
        ${allCardsHtml}
      </div>
    </div>

    <div class="sq-sticky-footer">
      <div id="sqWarningBox" class="sq-warning-box" style="display: none;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span id="sqWarningMsg">Please answer all questions before submitting.</span>
      </div>

      <div class="sq-footer-count">
        <strong>${reviewMode ? `${reviewScore} of ${totalItems} correct` : `${answeredCount} of ${totalItems} answered`}</strong>
      </div>
      ${reviewMode
        ? `<button class="sq-submit-btn" onclick="closeTakeQuizModal()">Close Review</button>`
        : `<button class="sq-submit-btn" onclick="submitQuizAttempt()" ${submitting ? 'disabled' : ''}>${submitting ? 'Submitting…' : 'Submit Quiz'}</button>`
      }
      <div class="sq-footer-note">${reviewMode ? `Final Score: ${reviewScore}/${totalItems}` : 'Review your answers before submitting.'}</div>
    </div>

    <!-- Exit Confirmation Modal Dialog -->
    <div id="sqExitConfirmModal" class="sq-confirm-overlay" style="display: none;">
      <div class="sq-confirm-card">
        <div class="sq-confirm-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 class="sq-confirm-title">Exit Quiz?</h3>
        <p class="sq-confirm-desc">Are you sure you want to exit? Your current progress and answers will not be saved.</p>
        <div class="sq-confirm-actions">
          <button type="button" class="sq-confirm-btn-no" onclick="cancelExitQuiz()">No, Continue</button>
          <button type="button" class="sq-confirm-btn-yes" onclick="confirmExitQuiz()">Yes, Exit</button>
        </div>
      </div>
    </div>
  `;
}

async function submitQuizAttempt(isAutoSubmit = false) {
  const { quiz, items, responses, submitting } = takeQuizState;
  if (submitting) return;

  if (!isAutoSubmit) {
    const unansweredItems = items.filter(it => responses[it.itemId] == null || String(responses[it.itemId]).trim() === '');
    if (unansweredItems.length > 0) { 
      // Highlight unanswered question cards
      unansweredItems.forEach(it => {
        const cardEl = document.getElementById(`sq-card-${it.itemId}`);
        if (cardEl) cardEl.classList.add('sq-card-unanswered');
      });

      // Scroll smoothly to first unanswered card
      const firstUnansweredCard = document.getElementById(`sq-card-${unansweredItems[0].itemId}`);
      if (firstUnansweredCard) {
        firstUnansweredCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Show warning box in sticky footer
      const warningBox = document.getElementById('sqWarningBox');
      const warningMsg = document.getElementById('sqWarningMsg');
      if (warningBox && warningMsg) {
        warningMsg.innerHTML = `⚠️ <strong>Incomplete Answers:</strong> You have <strong>${unansweredItems.length}</strong> unanswered question${unansweredItems.length > 1 ? 's' : ''} left. Please answer all items before submitting.`;
        warningBox.style.display = 'flex';
        warningBox.classList.remove('sq-shake');
        void warningBox.offsetWidth; // trigger reflow for animation
        warningBox.classList.add('sq-shake');
      }

      if (typeof showToast === 'function') {
        showToast(`Please answer all questions before submitting (${unansweredItems.length} remaining).`, 'warning');
      }
      return; 
    }
  }

  clearInterval(takeQuizState.timerInterval);
  takeQuizState.submitting = true;
  renderTakeQuizModal();

  const gradedAnswers = items.map(it => {
    const given = responses[it.itemId] || '';
    return { itemId: it.itemId, label: it.label, type: it.type, given, correct: it.correct, isCorrect: gradeItem(it, given) };
  });
  const score = gradedAnswers.filter(a => a.isCorrect).length;
  const total = gradedAnswers.length;

  const prof = (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE) ? CURRENT_PROFILE : {};
  const studentId = prof.id || prof.school_id || 'stud_1';
  const studentName = prof.full_name || 'Student';
  const section = prof.section || 'Section A';
  const strand = prof.strand || 'STEM';
  const subject = quiz?.subject || strand;

  const attemptObj = {
    id: 'att_' + Date.now(),
    quiz_id: quiz?.id || '',
    quiz_title: quiz?.title || 'Quiz',
    student_id: studentId,
    student_name: studentName,
    section: section,
    subject: subject,
    strand: strand,
    score,
    total_items: total,
    score_percentage: total ? Math.round((score / total) * 100) : 0,
    answers: gradedAnswers,
    submitted_at: new Date().toISOString()
  };

  if (!quiz?.is_preview) {
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

    // Dual insert into quiz_attempts AND dedicated class_records table if db is available
    if (typeof db !== 'undefined' && db && db.from) {
      try {
        await db.from('class_records').insert({
          student_id: String(studentId),
          student_name: studentName,
          section: section,
          subject: subject,
          strand: strand,
          quiz_id: String(quiz?.id || ''),
          quiz_title: quiz?.title || 'Quiz',
          score,
          total_items: total,
          score_percentage: total ? Math.round((score / total) * 100) : 0
        });
      } catch(crErr) {
        console.warn('Class Records table sync notice:', crErr);
      }

      try {
        let { error } = await db.from('quiz_attempts').insert({
          quiz_id: quiz?.id || '',
          quiz_title: quiz?.title || 'Quiz',
          student_id: prof.id || studentId,
          student_name: studentName,
          score,
          total_items: total,
          answers: gradedAnswers
        });

        if (error) {
          await db.from('quiz_attempts').insert({
            quiz_id: quiz?.id || '',
            student_id: prof.id || studentId,
            score,
            total_items: total,
            answers: gradedAnswers
          });
        }
      } catch(dbErr) {
        console.warn('Supabase insert notice:', dbErr);
      }
    }
  }

  const elapsedSec = Math.max(1, Math.round((Date.now() - (takeQuizState.startTime || Date.now())) / 1000));
  takeQuizState.submitting = false;
  closeTakeQuizModal();
  
  if (typeof showToast === 'function') {
    showToast(`Submitted — Score: ${score}/${total}`, 'success');
  }

  await loadMyAttemptsFromDB();

  if (typeof loadClassRecAttempts === 'function') {
    await loadClassRecAttempts(true);
  }
  if (typeof renderPage === 'function' && typeof currentPage !== 'undefined' && (currentPage === 'quizzes' || currentPage === 'dashboard' || currentPage === 'classrec' || currentPage === 'progress')) {
    renderPage(currentPage);
  }
}

let myQuizAttempts = [];

async function loadMyAttemptsFromDB() {
  if (typeof ROLE !== 'undefined' && ROLE !== 'student') return;
  const prof = (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE) ? CURRENT_PROFILE : {};
  
  let dbAttempts = [];
  if (typeof db !== 'undefined' && db && db.from && prof.id) {
    try {
      const { data, error } = await db.from('quiz_attempts').select('*').eq('student_id', prof.id).order('submitted_at', { ascending: false });
      if (!error && data) dbAttempts = data;
    } catch(e) {}
  }

  let localAttempts = [];
  try {
    const raw = localStorage.getItem('scholaria_all_attempts_v1');
    if (raw) {
      const list = JSON.parse(raw);
      localAttempts = list.filter(a => 
        (prof.id && String(a.student_id).toLowerCase() === String(prof.id).toLowerCase()) ||
        (prof.school_id && String(a.student_id).toLowerCase() === String(prof.school_id).toLowerCase()) ||
        (prof.full_name && a.student_name && a.student_name.toLowerCase() === prof.full_name.toLowerCase())
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
    if (mainContent && typeof getPageContent === 'function' && typeof ROLE !== 'undefined') {
      mainContent.innerHTML = getPageContent(ROLE, currentPage);
    }
  }
}

/* ── CLASS LEADERBOARD MODAL (FOR TEACHERS & ADMINS IN QUIZ MANAGER) ── */
function closeClassLeaderboardModal() {
  const modal = document.getElementById('classLeaderboardModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function openClassLeaderboardModalById(quizId) {
  const all = (typeof customQuizzes !== 'undefined' ? customQuizzes : []);
  const quiz = all.find(q => String(q.id) === String(quizId)) || { id: quizId, title: 'Quiz Assessment' };
  await openClassLeaderboardModal(quiz);
}

async function openClassLeaderboardModal(quiz) {
  // STRICTLY FOR TEACHERS & ADMINS (hidden from students)
  if (typeof ROLE !== 'undefined' && ROLE === 'student') return;

  const modal = document.getElementById('classLeaderboardModal');
  const container = document.getElementById('classLeaderboardModalContent');
  if (!modal || !container) return;

  const quizTitle = quiz?.title || 'Class Quiz Assessment';
  const totalQuestions = (quiz?.questions || []).length || 10;

  // Show modal immediately with loading indicator
  container.innerHTML = `
    <div style="padding: 40px 32px; text-align: center; background: #ffffff;">
      <div style="font-size: 32px; margin-bottom: 12px; animation: spin 1s linear infinite;">⏳</div>
      <h3 style="font-size: 16px; font-weight: 700; color: #1e3a8a; margin: 0 0 6px;">Loading Leaderboard</h3>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Retrieving real student submissions from database...</p>
    </div>`;
  modal.style.display = 'flex';

  // 1. Fetch live attempts from Supabase for this quiz
  let liveAttempts = [];
  if (typeof db !== 'undefined' && db && db.from && quiz?.id) {
    try {
      const { data, error } = await db.from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('submitted_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        liveAttempts = data;
      }
    } catch (dbErr) {
      console.warn('Leaderboard Supabase fetch notice:', dbErr);
    }
  }

  // 2. Fetch local storage attempts fallback
  let localAttempts = [];
  try {
    const raw = localStorage.getItem('scholaria_all_attempts_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localAttempts = parsed.filter(a => String(a.quiz_id) === String(quiz?.id || ''));
      }
    }
  } catch (_) {}

  // 3. Cached in-memory attempts
  const cachedAttempts = [
    ...(typeof classRecAttemptsCache !== 'undefined' && Array.isArray(classRecAttemptsCache) ? classRecAttemptsCache : []),
    ...(typeof myQuizAttempts !== 'undefined' && Array.isArray(myQuizAttempts) ? myQuizAttempts : [])
  ].filter(a => String(a.quiz_id) === String(quiz?.id || ''));

  // Combine attempts uniquely
  const attemptMap = new Map();
  [...liveAttempts, ...localAttempts, ...cachedAttempts].forEach(a => {
    if (!a) return;
    const key = a.id || `${a.student_id || a.user_id}_${a.submitted_at || a.created_at || a.score}`;
    if (!attemptMap.has(key)) attemptMap.set(key, a);
  });
  const allAttempts = Array.from(attemptMap.values());

  // 4. Resolve registered students to get official names
  const handledStudents = (typeof registeredUsers !== 'undefined' && Array.isArray(registeredUsers) ? registeredUsers : []).filter(u => u.role === 'student');

  // 5. Aggregate best attempt per student (highest score, tie-breaker: fastest time)
  const studentBestMap = new Map();
  allAttempts.forEach(att => {
    const sId = String(att.student_id || att.user_id || att.email || '').trim();
    if (!sId) return;

    const score = Number(att.score != null ? att.score : 0);
    const total = Number(att.total_items || totalQuestions);
    const durationSec = att.time_taken_seconds != null ? Number(att.time_taken_seconds) : (att.duration != null ? Number(att.duration) : null);

    const studentObj = handledStudents.find(u => String(u.id) === sId || u.email === att.student_email || u.email === att.email) || null;
    const studentName = att.student_name || (studentObj ? (studentObj.full_name || studentObj.name) : '') || 'Student User';

    const existing = studentBestMap.get(sId);
    if (!existing) {
      studentBestMap.set(sId, { id: sId, name: studentName, score, total, durationSec });
    } else {
      if (score > existing.score) {
        studentBestMap.set(sId, { id: sId, name: studentName, score, total, durationSec });
      } else if (score === existing.score && durationSec != null && (existing.durationSec == null || durationSec < existing.durationSec)) {
        studentBestMap.set(sId, { id: sId, name: studentName, score, total, durationSec });
      }
    }
  });

  const rankingList = Array.from(studentBestMap.values());

  // Sort: Highest score first, then fastest time
  rankingList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.durationSec != null && b.durationSec != null) return a.durationSec - b.durationSec;
    return 0;
  });

  const formatDuration = (sec) => {
    if (sec == null || isNaN(sec) || sec <= 0) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const getRankBadgeStyle = (rank) => {
    if (rank === 1) return 'background: #f59e0b; color: #fff; box-shadow: 0 3px 8px rgba(245,158,11,0.4);';
    if (rank === 2) return 'background: #94a3b8; color: #fff;';
    if (rank === 3) return 'background: #ea580c; color: #fff;';
    return 'background: #60a5fa; color: #fff;';
  };

  const getScorePillStyle = (score, total) => {
    const pct = total > 0 ? (score / total) * 100 : 0;
    if (pct >= 90) return 'background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;';
    if (pct >= 70) return 'background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd;';
    if (pct >= 50) return 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;';
    return 'background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;';
  };

  const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];

  const tableOrEmptyHtml = rankingList.length > 0 ? `
    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 16px; max-height: 440px; overflow-y: auto;">
      <table style="width: 100%; border-collapse: separate; border-spacing: 0 8px; min-width: 480px;">
        <thead>
          <tr style="color: #64748b; font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em;">
            <th style="padding: 6px 14px; text-align: center; width: 64px;">Rank</th>
            <th style="padding: 6px 14px; text-align: left;">Student</th>
            <th style="padding: 6px 14px; text-align: center; width: 110px;">Score</th>
            <th style="padding: 6px 14px; text-align: right; width: 110px;">Time</th>
          </tr>
        </thead>
        <tbody>
          ${rankingList.map((st, idx) => {
            const rank = idx + 1;
            const isRank1 = rank === 1;
            const rowStyle = isRank1
              ? 'background: #f0fdf4; border: 1.5px solid #bbf7d0; box-shadow: 0 3px 10px rgba(34,197,94,0.12);'
              : 'background: #ffffff; border: 1px solid #f1f5f9;';

            const avatarColor = avatarColors[idx % avatarColors.length];
            const initial = (st.name || 'S').trim().charAt(0).toUpperCase();

            return `
            <tr style="${rowStyle} border-radius: 14px; transition: transform 0.15s ease;">
              <!-- Rank -->
              <td style="padding: 10px 14px; text-align: center; border-top-left-radius: 14px; border-bottom-left-radius: 14px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; font-size: 13px; font-weight: 800; ${getRankBadgeStyle(rank)}">
                  ${rank}
                </div>
              </td>

              <!-- Student -->
              <td style="padding: 10px 14px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 34px; height: 34px; border-radius: 50%; background: ${avatarColor}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
                    ${initial}
                  </div>
                  <div>
                    <div style="font-weight: 700; font-size: 13.5px; color: #1e293b;">${escHtml(st.name)}</div>
                  </div>
                </div>
              </td>

              <!-- Score -->
              <td style="padding: 10px 14px; text-align: center;">
                <span style="display: inline-block; padding: 4px 14px; border-radius: 20px; font-weight: 800; font-size: 12.5px; ${getScorePillStyle(st.score, st.total)}">
                  ${st.score}/${st.total}
                </span>
              </td>

              <!-- Time -->
              <td style="padding: 10px 14px; text-align: right; border-top-right-radius: 14px; border-bottom-right-radius: 14px;">
                <span style="font-weight: 700; font-size: 13px; color: #334155;">
                  ${formatDuration(st.durationSec)}
                </span>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : `
    <div style="text-align: center; padding: 42px 20px; background: #f8fafc; border-radius: 16px; border: 1.5px dashed #cbd5e1; margin: 10px 0;">
      <div style="font-size: 40px; margin-bottom: 8px;">📝</div>
      <h3 style="font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 6px;">No Submissions Recorded Yet</h3>
      <p style="font-size: 13.5px; color: #64748b; max-width: 400px; margin: 0 auto; line-height: 1.5;">
        None of your enrolled students have completed this quiz yet. Rankings and completion times will automatically appear here once students submit their answers.
      </p>
    </div>`;

  container.innerHTML = `
  <div style="padding: 28px 32px; background: #ffffff; position: relative;">
    <!-- Top Bar with Teacher Badge & Close Button -->
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 18px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; color: #1d4ed8; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid #bfdbfe;">
          ⚡ Teacher Portal • Real Student Records
        </span>
        <span style="display: inline-flex; align-items: center; gap: 4px; background: #f1f5f9; color: #475569; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;">
          ${rankingList.length} ${rankingList.length === 1 ? 'Student' : 'Students'} Completed
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="display: inline-flex; align-items: center; gap: 6px; background: #f0fdf4; color: #15803d; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid #bbf7d0; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escHtml(quizTitle)}</span>
        </div>
        <button onclick="closeClassLeaderboardModal()" style="background: #f1f5f9; border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; font-size: 16px; font-weight: 700;" title="Close">✕</button>
      </div>
    </div>

    <!-- Centered Trophy & Title -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; position: relative; margin-bottom: 4px;">
        <div style="font-size: 52px; line-height: 1; filter: drop-shadow(0 4px 12px rgba(245,158,11,0.3));">🏆</div>
        <div style="position: absolute; top: -6px; right: -14px; font-size: 18px;">✨</div>
        <div style="position: absolute; bottom: 4px; left: -14px; font-size: 18px;">⭐</div>
      </div>
      <h2 style="font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; color: #1e3a8a; margin: 4px 0 6px 0; letter-spacing: -0.02em;">Class Leaderboard</h2>
      <p style="font-size: 14px; color: #64748b; font-weight: 600; margin: 0;">Verified student rankings and completion times on this assessment</p>
    </div>

    <!-- Table Container or Empty Notice -->
    ${tableOrEmptyHtml}

    <!-- Action Button -->
    <div style="text-align: center; margin-top: 24px;">
      <button onclick="closeClassLeaderboardModal()" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; font-weight: 700; border-radius: 50px; padding: 12px 36px; border: none; cursor: pointer; font-size: 14px; box-shadow: 0 4px 14px rgba(37,99,235,0.3); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
        Close Leaderboard
      </button>
    </div>
  </div>`;
}

if (typeof window !== 'undefined') {
  window.openClassLeaderboardModalById = openClassLeaderboardModalById;
  window.openClassLeaderboardModal = openClassLeaderboardModal;
  window.closeClassLeaderboardModal = closeClassLeaderboardModal;
}