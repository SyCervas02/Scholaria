/* ── STUDENT QUIZ TAKING & SCORING ENGINE ── */

const takeQuizState = { quiz: null, items: [], responses: {}, submitting: false, reviewMode: false, reviewAnswers: [] };

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
  Object.assign(takeQuizState, { quiz, items, responses: {}, submitting: false, reviewMode: false, reviewAnswers: [] });
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
  Object.assign(takeQuizState, { quiz, items, responses: {}, submitting: false, reviewMode: true, reviewAnswers: attempt.answers || [] });
  document.getElementById('takeQuizModal').classList.add('active');
  renderTakeQuizModal();
}

function closeTakeQuizModal() {
  document.getElementById('takeQuizModal').classList.remove('active');
}

function setTQAnswer(itemId, value) {
  takeQuizState.responses[itemId] = value;
}

/* ── INTERACTIVE GAME LOBBY & CUSTOMIZATION ── */

function initInteractiveQuiz() {
  if (interactiveState.timerInterval) clearInterval(interactiveState.timerInterval);
  Object.assign(interactiveState, {
    active: true,
    viewMode: 'lobby',
    selectedFormat: 'all',
    selectedCount: 'auto',
    activeItems: [...takeQuizState.items],
    currentIndex: 0,
    score: 0,
    points: 0,
    streak: 0,
    maxStreak: 0,
    timer: 15,
    timerInterval: null,
    selectedAnswer: null,
    isAnswered: false,
    isFinished: false,
    feedbackText: '',
    feedbackType: ''
  });
}

function setGamifiedFormat(format) {
  playGamifiedSfx('click');
  interactiveState.selectedFormat = format;
  renderTakeQuizModal();
}

function setGamifiedCount(count) {
  playGamifiedSfx('click');
  interactiveState.selectedCount = count;
  renderTakeQuizModal();
}

function toggleGamifiedSetting(key) {
  playGamifiedSfx('click');
  interactiveState.settings[key] = !interactiveState.settings[key];
  renderTakeQuizModal();
}

function cycleGamifiedTheme() {
  playGamifiedSfx('click');
  const themes = ['purple', 'cyber', 'gold', 'space'];
  const nextIdx = (themes.indexOf(interactiveState.theme) + 1) % themes.length;
  interactiveState.theme = themes[nextIdx];
  renderTakeQuizModal();
}

function getFilteredInteractiveItems() {
  let list = [...takeQuizState.items];
  if (interactiveState.selectedFormat !== 'all') {
    list = list.filter(it => it.type === interactiveState.selectedFormat);
  }
  if (interactiveState.selectedCount !== 'auto' && typeof interactiveState.selectedCount === 'number') {
    list = list.slice(0, interactiveState.selectedCount);
  }
  return list.length ? list : takeQuizState.items;
}

function startInteractiveGameSession() {
  playGamifiedSfx('click');
  interactiveState.activeItems = getFilteredInteractiveItems();
  interactiveState.viewMode = 'playing';
  interactiveState.currentIndex = 0;
  interactiveState.score = 0;
  interactiveState.points = 0;
  interactiveState.streak = 0;
  interactiveState.maxStreak = 0;
  interactiveState.isAnswered = false;
  interactiveState.isFinished = false;
  interactiveState.feedbackText = '';
  interactiveState.feedbackType = '';
  
  startInteractiveTimer();
  renderTakeQuizModal();
}

function startInteractiveTimer() {
  if (interactiveState.timerInterval) clearInterval(interactiveState.timerInterval);
  interactiveState.timer = 15;
  const currentItem = interactiveState.activeItems[interactiveState.currentIndex];
  if (currentItem) speakQuestionText(currentItem.label);

  interactiveState.timerInterval = setInterval(() => {
    interactiveState.timer--;
    const timerBar = document.getElementById('iqTimerBar');
    const timerText = document.getElementById('iqTimerText');
    if (timerBar) timerBar.style.width = `${(interactiveState.timer / 15) * 100}%`;
    if (timerText) timerText.textContent = `${interactiveState.timer}s`;
    
    if (interactiveState.timer <= 0) {
      clearInterval(interactiveState.timerInterval);
      handleInteractiveAnswer(null, true);
    }
  }, 1000);
}

function handleInteractiveAnswer(given, isTimeout = false) {
  if (interactiveState.isAnswered) return;
  if (interactiveState.timerInterval) clearInterval(interactiveState.timerInterval);
  
  const currentItem = interactiveState.activeItems[interactiveState.currentIndex];
  if (!currentItem) return;
  
  interactiveState.isAnswered = true;
  interactiveState.selectedAnswer = given;
  setTQAnswer(currentItem.itemId, given || '');
  
  const isCorrect = !isTimeout && gradeItem(currentItem, given);
  
  if (isCorrect) {
    playGamifiedSfx('correct');
    interactiveState.streak++;
    if (interactiveState.streak > interactiveState.maxStreak) {
      interactiveState.maxStreak = interactiveState.streak;
    }
    const mult = Math.min(3, 1 + Math.floor(interactiveState.streak / 2));
    const earnedPoints = 100 * mult + interactiveState.timer * 5;
    interactiveState.points += earnedPoints;
    interactiveState.score++;
    interactiveState.feedbackType = 'correct';
    interactiveState.feedbackText = `+${earnedPoints} PTS! ${mult > 1 ? `🔥 ${mult}x Combo!` : 'Correct!'}`;
  } else {
    playGamifiedSfx('wrong');
    interactiveState.streak = 0;
    interactiveState.feedbackType = 'incorrect';
    interactiveState.feedbackText = isTimeout
      ? `Time's up! Correct answer: ${currentItem.correct}`
      : `Incorrect! Correct answer: ${currentItem.correct}`;
  }
  
  renderTakeQuizModal();
}

function nextInteractiveQuestion() {
  if (interactiveState.currentIndex < interactiveState.activeItems.length - 1) {
    interactiveState.currentIndex++;
    interactiveState.isAnswered = false;
    interactiveState.selectedAnswer = null;
    interactiveState.feedbackText = '';
    interactiveState.feedbackType = '';
    startInteractiveTimer();
    renderTakeQuizModal();
  } else {
    if (interactiveState.timerInterval) clearInterval(interactiveState.timerInterval);
    interactiveState.viewMode = 'summary';
    interactiveState.isFinished = true;
    renderTakeQuizModal();
  }
}

function shareQuizLink() {
  playGamifiedSfx('click');
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Quiz link copied to clipboard!', 'info');
  }).catch(() => {
    showToast('Quiz code: ' + (takeQuizState.quiz?.id || 'SCHOLARIA'), 'info');
  });
}

/* ── MODAL RENDER ROUTER ── */

function renderTakeQuizModal() {
  const titleEl = document.getElementById('takeQuizModalTitle');
  const subEl = document.getElementById('takeQuizModalSubtitle');
  const body = document.getElementById('takeQuizModalBody');
  const foot = document.getElementById('takeQuizModalFoot');
  if (!titleEl) return;
  const { quiz, items, responses, submitting, reviewMode, reviewAnswers } = takeQuizState;

  // 🌟 ALWAYS UPDATE SUBJECT BACKDROP TO FILL FULL SCREEN FOR ALL MODES & SUBJECTS
  const subTheme = getSubjectTheme(quiz?.subject, quiz?.title, quiz?.strand, quiz?.questions, quiz?.lesson);
  const backdropEl = document.getElementById('takeQuizBackdrop');
  if (backdropEl) {
    backdropEl.innerHTML = `${subTheme.svgMarkup}<div class="iq-subject-overlay"></div>`;
  }

  if (interactiveState.active && !reviewMode) {
    const themeClass = `iq-theme-${interactiveState.theme}`;

    /* ── LOBBY VIEW (MATCHING DASHBOARD STYLING & DYNAMIC SUBJECT BG) ── */
    if (interactiveState.viewMode === 'lobby') {
      const activeItems = takeQuizState.items;
      const teacherName = quiz?.createdBy ? 'Teacher' : 'Scholaria Instructor';
      
      titleEl.innerHTML = `⚡ Interactive: ${escHtml(quiz?.title.replace(' (Demo)', '') || 'Quiz')}`;
      subEl.textContent = `${escHtml(quiz?.subject || subTheme.name)} · ${activeItems.length} questions · Ready to challenge`;

      body.innerHTML = `
        
        <div class="iq-lobby-container">
          <div class="iq-lobby-grid">
            <!-- Left Info Card -->
            <div class="iq-lobby-card iq-info-card">
              <div>
                <div class="iq-quiz-badge" style="background: ${subTheme.badgeBg};">${subTheme.icon}</div>
                <h2 class="iq-quiz-title">${escHtml(quiz?.title.replace(' (Demo)', '') || 'Interactive Challenge')}</h2>
                <div class="iq-quiz-meta" style="color: ${subTheme.accent};">
                  <span class="iq-subject-pill" style="border-color:${subTheme.accent};color:${subTheme.accent};">${escHtml(quiz?.subject || subTheme.name)}</span> · ${activeItems.length} questions
                </div>
                <div class="iq-quiz-author">By : ${escHtml(teacherName)}</div>
              </div>
              <button class="iq-share-btn" onclick="shareQuizLink()">
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Share
              </button>
            </div>

            <!-- Right Progress & Start Card -->
            <div class="iq-lobby-card iq-progress-card">
              <div class="iq-runner-wrap">
                <div class="iq-runner-labels"><span>Start</span> <span>End</span></div>
                <div class="iq-runner-track">
                  <div class="iq-runner-progress" style="width: 0%; background: ${subTheme.accent};"></div>
                  <div class="iq-runner-avatar-wrap" style="left: 0%;">
                    ${getStudentRunnerAvatarHtml()}
                  </div>
                  <div class="iq-flag-icon">🏅</div>
                </div>
              </div>
              <div class="iq-remaining-lbl">${activeItems.length} questions remaining</div>
              <button class="iq-start-btn" style="background: ${subTheme.accent}; box-shadow: 0 4px 14px ${subTheme.cardGlow};" onclick="startInteractiveGameSession()">
                Start Game
              </button>
            </div>
          </div>
        </div>
      `;

      foot.innerHTML = `<button class="iq-exit-lobby-btn" onclick="closeTakeQuizModal()">Exit Lobby</button>`;
      return;
    }

    /* ── PLAYING VIEW ── */
    const activeList = interactiveState.activeItems;
    const progressPct = Math.round((interactiveState.currentIndex / activeList.length) * 100);
    titleEl.textContent = quiz ? `⚡ Interactive: ${quiz.title.replace(' (Demo)', '')}` : 'Interactive Quiz';
    subEl.textContent = `${escHtml(quiz?.subject || subTheme.name)} · Question ${interactiveState.currentIndex + 1} of ${activeList.length}`;
    
    if (interactiveState.viewMode === 'summary') {
      const pct = Math.round((interactiveState.score / activeList.length) * 100);
      const stars = pct >= 80 ? '⭐⭐⭐' : pct >= 60 ? '⭐⭐' : '⭐';
      body.innerHTML = `
        
        <div class="iq-finish-card ${themeClass}">
          <div class="iq-stars">${stars}</div>
          <h3>Quiz Completed!</h3>
          <p class="iq-subtitle">Great effort on completing the ${escHtml(quiz?.subject || subTheme.name)} interactive challenge!</p>
          <div class="iq-stats-grid">
            <div class="iq-stat-box">
              <div class="iq-stat-val" style="color:${subTheme.accent};">${interactiveState.points}</div>
              <div class="iq-stat-lbl">Total Score</div>
            </div>
            <div class="iq-stat-box">
              <div class="iq-stat-val" style="color:${subTheme.accent};">${interactiveState.score}/${activeList.length}</div>
              <div class="iq-stat-lbl">Accuracy (${pct}%)</div>
            </div>
            <div class="iq-stat-box">
              <div class="iq-stat-val">🔥 ${interactiveState.maxStreak}</div>
              <div class="iq-stat-lbl">Max Streak</div>
            </div>
          </div>
        </div>
      `;
      foot.innerHTML = `
        <button class="add-btn" ${submitting ? 'disabled' : ''} onclick="submitQuizAttempt()">
          ${submitting ? 'Submitting…' : 'Submit & Save Score'}
        </button>
      `;
      return;
    }
    
    const item = activeList[interactiveState.currentIndex];
    const mult = Math.min(3, 1 + Math.floor(interactiveState.streak / 2));
    
    let optionsHtml = '';
    if (item.type === 'multiple_choice') {
      optionsHtml = `<div class="iq-options-grid">
        ${(item.options || []).map((opt, i) => {
          const isSel = interactiveState.selectedAnswer === opt;
          const isCorrect = String(opt).trim().toLowerCase() === String(item.correct).trim().toLowerCase();
          let btnClass = 'iq-opt-btn';
          if (interactiveState.isAnswered) {
            if (isCorrect) btnClass += ' correct';
            else if (isSel) btnClass += ' wrong';
            else btnClass += ' disabled';
          }
          return `<button class="${btnClass}" ${interactiveState.isAnswered ? 'disabled' : ''} onclick="handleInteractiveAnswer('${escHtml(opt)}')">
            <span class="iq-opt-letter">${String.fromCharCode(65 + i)}</span>
            <span>${escHtml(opt)}</span>
          </button>`;
        }).join('')}
      </div>`;
    } else if (item.type === 'identification') {
      optionsHtml = `
        <div style="display:flex;gap:10px;margin-top:14px;">
          <input type="text" id="iqIdInput" placeholder="Type your answer here..." ${interactiveState.isAnswered ? 'disabled' : ''} style="flex:1;padding:12px 16px;border:1.5px solid var(--blue-light);border-radius:12px;font-size:14px;" onkeypress="if(event.key==='Enter') handleInteractiveAnswer(this.value)">
          <button class="add-btn" style="background:${subTheme.accent};" ${interactiveState.isAnswered ? 'disabled' : ''} onclick="handleInteractiveAnswer(document.getElementById('iqIdInput').value)">Submit</button>
        </div>
      `;
    } else {
      optionsHtml = `
        <div style="margin-top:14px;">
          <select id="iqMatchSelect" class="user-filter-select" style="width:100%;padding:12px;border-radius:12px;" ${interactiveState.isAnswered ? 'disabled' : ''} onchange="handleInteractiveAnswer(this.value)">
            <option value="">— Select matching answer —</option>
            ${(item.options || []).map(opt => `<option value="${escHtml(opt)}">${escHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }
    
    body.innerHTML = `
      
      <div class="iq-game-header ${themeClass}">
        <div class="iq-runner-wrap" style="margin-bottom:12px;padding:0 4px;">
          <div class="iq-runner-labels"><span>Start</span> <span>End</span></div>
          <div class="iq-runner-track">
            <div class="iq-runner-progress" style="width: ${progressPct}%; background: ${subTheme.accent};"></div>
            <div class="iq-runner-avatar-wrap" style="left: ${progressPct}%;">
              ${getStudentRunnerAvatarHtml()}
            </div>
            <div class="iq-flag-icon">🏅</div>
          </div>
        </div>
        <div class="iq-timer-wrap">
          <div class="iq-timer-bar" id="iqTimerBar" style="width: ${(interactiveState.timer / 15) * 100}%"></div>
        </div>
        <div class="iq-top-bar">
          <span class="iq-timer-text" id="iqTimerText" style="color:${subTheme.accent};">${interactiveState.timer}s</span>
          <span class="iq-score-badge">🏆 ${interactiveState.points} PTS</span>
          <span class="iq-streak-badge ${interactiveState.streak > 1 ? 'hot' : ''}">🔥 ${interactiveState.streak}x Streak</span>
        </div>
      </div>
      
      <div class="iq-card ${themeClass}">
        <div class="iq-qtype" style="color:${subTheme.accent};">${subTheme.icon} ${item.type === 'multiple_choice' ? 'Multiple Choice' : item.type === 'identification' ? 'Identification' : 'Matching'} · ${escHtml(quiz?.subject || subTheme.name)}</div>
        <h3 class="iq-qtitle">${escHtml(item.label)}</h3>
        ${optionsHtml}
        ${interactiveState.feedbackText ? `
          <div class="iq-feedback ${interactiveState.feedbackType}">
            ${escHtml(interactiveState.feedbackText)}
          </div>
        ` : ''}
      </div>
    `;
    
    foot.innerHTML = `
      <button class="iq-exit-lobby-btn" style="background:#fee2e2;color:#dc2626;box-shadow:none;border:1px solid #fca5a5;" onclick="initInteractiveQuiz();renderTakeQuizModal();">Exit to Lobby</button>
      ${interactiveState.isAnswered ? `
        <button class="gen-btn" style="background:${subTheme.accent};" onclick="nextInteractiveQuestion()">
          ${interactiveState.currentIndex < activeList.length - 1 ? 'Next Question ➔' : 'View Summary 🏆'}
        </button>
      ` : ''}
    `;
    return;
  }

  /* ── STANDARD / REVIEW MODE RENDER ── */

  titleEl.textContent = quiz ? quiz.title.replace(' (Demo)', '') : 'Quiz';

  const timerHtml = (takeQuizState.timeLimitMinutes > 0 && !reviewMode)
    ? `<span class="tq-timer-badge" id="tqTimerDisplay">⏱️ ${Math.floor(takeQuizState.secondsLeft / 60)}:${(takeQuizState.secondsLeft % 60) < 10 ? '0' : ''}${takeQuizState.secondsLeft % 60}</span>`
    : '';

  subEl.innerHTML = reviewMode
    ? 'Reviewing your submitted answers'
    : `${items.length} item${items.length === 1 ? '' : 's'} — answer everything, then submit`;

  body.innerHTML = `<div class="sq-container" style="width:100%;max-width:860px;margin:0 auto;background:#fff;border:1.5px solid var(--blue-light);border-radius:16px;padding:24px 28px;box-shadow:0 4px 18px rgba(37,99,235,0.05);">${items.map((it, idx) => {
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
    return `<div style="padding:14px 0;border-bottom:1px solid var(--blue-light);">
      <p style="font-weight:600;margin-bottom:8px;font-size:14px;">${idx + 1}. ${escHtml(it.label)}</p>
      ${fieldHtml}
      ${resultTag}
    </div>`;
  }).join('')}</div>`;

  foot.innerHTML = reviewMode
    ? `<button class="iq-exit-lobby-btn" onclick="closeTakeQuizModal()">Close Review</button>`
    : `<button class="iq-exit-lobby-btn" style="background:#fee2e2;color:#dc2626;box-shadow:none;border:1px solid #fca5a5;" onclick="closeTakeQuizModal()">Cancel</button>
       <button class="add-btn" style="background:${subTheme.accent};margin-left:auto;" ${submitting ? 'disabled' : ''} onclick="submitQuizAttempt()">${submitting ? 'Submitting…' : 'Submit Quiz'}</button>`;
}

async function submitQuizAttempt(isAutoSubmit = false) {
  const { quiz, items, responses, submitting } = takeQuizState;
  if (submitting) return;
  const unanswered = items.some(it => responses[it.itemId] == null || responses[it.itemId] === '');
  if (unanswered) { showToast('Please answer every item before submitting', 'error'); return; }

  clearInterval(takeQuizState.timerInterval);
  takeQuizState.submitting = true;
  renderTakeQuizModal();

  const gradedAnswers = targetItems.map(it => {
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
