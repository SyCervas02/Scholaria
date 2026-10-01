/* ── SCHOLARIA INTERACTIVE QUIZ ENGINE & PLAYER ── */

const interactivePlayerState = {
  quiz: null,
  questions: [],
  currentIndex: 0,
  userResponses: {}, // itemId -> { given, isCorrect, correct }
  score: 0,
  totalItems: 0,
  timerSecondsLeft: 0,
  timerPerQuestion: 0,
  timerInterval: null,
  startTime: null,
  elapsedSeconds: 0,
  matchingSelections: {}, // pairIndex -> choiceKey
  selectedMatchingChoice: null, // For tap-to-pair fallback
  isSubmitted: false,
  isWaitingFeedback: false,
  usedPowerups: { time: false, handout: false, hint: false }
};

let interactiveBGM = null;
let interactiveMusicMuted = false;
let sfxCorrect = null;
let sfxWrong = null;

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

function initInteractiveSFX() {
  if (!sfxCorrect) {
    sfxCorrect = new Audio('assets/audio/dragon-studio-correct.mp3');
    sfxCorrect.volume = 0.5;
  }
  if (!sfxWrong) {
    sfxWrong = new Audio('assets/audio/eritnhut-wrong.mp3');
    sfxWrong.volume = 0.45;
  }
}

function playInteractiveSFX(isCorrect) {
  if (interactiveMusicMuted) return;
  try {
    initInteractiveSFX();
    const sound = isCorrect ? sfxCorrect : sfxWrong;
    if (sound) {
      sound.currentTime = 0;
      const p = sound.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    }
  } catch (e) {
    console.warn('SFX playback error:', e);
  }
}

function stopInteractiveSFX() {
  if (sfxCorrect) {
    sfxCorrect.pause();
    sfxCorrect.currentTime = 0;
  }
  if (sfxWrong) {
    sfxWrong.pause();
    sfxWrong.currentTime = 0;
  }
}

function initInteractiveBGM() {
  if (!interactiveBGM) {
    interactiveBGM = new Audio('assets/audio/loop3.mp3');
    interactiveBGM.loop = true;
    interactiveBGM.volume = 0.25;
  }
}

function playInteractiveBGM() {
  initInteractiveBGM();
  if (interactiveMusicMuted) return;

  interactiveBGM.currentTime = 0;
  const p = interactiveBGM.play();
  if (p !== undefined) {
    p.catch(() => {
      const resumeOnGesture = () => {
        if (!interactiveMusicMuted && interactiveBGM) {
          interactiveBGM.play().catch(() => {});
        }
        document.removeEventListener('click', resumeOnGesture);
        document.removeEventListener('keydown', resumeOnGesture);
      };
      document.addEventListener('click', resumeOnGesture, { once: true });
      document.addEventListener('keydown', resumeOnGesture, { once: true });
    });
  }
}

function stopInteractiveBGM() {
  if (interactiveBGM) {
    interactiveBGM.pause();
    interactiveBGM.currentTime = 0;
  }
  stopInteractiveSFX();
}

function toggleInteractiveMusic() {
  initInteractiveBGM();
  interactiveMusicMuted = !interactiveMusicMuted;
  if (interactiveMusicMuted) {
    interactiveBGM.pause();
    stopInteractiveSFX();
  } else {
    interactiveBGM.play().catch(() => {});
  }
  updateMusicButtonUI();
}

function updateMusicButtonUI() {
  const btn = document.getElementById('iqMusicToggleBtn');
  if (!btn) return;
  btn.innerHTML = interactiveMusicMuted ? iconAudioMuted() : iconAudioPlaying();
  btn.title = interactiveMusicMuted ? 'Unmute Background Music' : 'Mute Background Music';
  if (interactiveMusicMuted) btn.classList.add('muted');
  else btn.classList.remove('muted');
}

function iconAudioPlaying() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
}

function iconAudioMuted() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
}

/* ── INTERACTIVE CANVAS CONFETTI ENGINE ── */
let confettiCanvas = null;
let confettiCtx = null;
let confettiParticles = [];
let confettiAnimId = null;

function initConfettiCanvas() {
  if (!confettiCanvas) {
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.id = 'iqConfettiCanvas';
    confettiCanvas.style.position = 'fixed';
    confettiCanvas.style.inset = '0';
    confettiCanvas.style.width = '100vw';
    confettiCanvas.style.height = '100vh';
    confettiCanvas.style.pointerEvents = 'none';
    confettiCanvas.style.zIndex = '20000';
    document.body.appendChild(confettiCanvas);

    window.addEventListener('resize', () => {
      if (confettiCanvas) resizeConfettiCanvas();
    });
  }
  resizeConfettiCanvas();
}

function resizeConfettiCanvas() {
  if (!confettiCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  confettiCanvas.width = Math.round(w * dpr);
  confettiCanvas.height = Math.round(h * dpr);
  confettiCtx = confettiCanvas.getContext('2d');
  confettiCtx.scale(dpr, dpr);
}

function triggerConfettiBurst(particleCount = 80) {
  initConfettiCanvas();
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ec4899', 
    '#8b5cf6', '#06b6d4', '#f43f5e', '#eab308', '#6366f1'
  ];
  const w = window.innerWidth;
  const h = window.innerHeight;
  const half = Math.floor(particleCount / 2);

  // Left cannon (fires up-right)
  for (let i = 0; i < half; i++) {
    const angle = (-Math.PI / 3) + (Math.random() - 0.5) * 0.7; // ~-60 deg
    const speed = 13 + Math.random() * 15;
    confettiParticles.push(createConfettiParticle(w * 0.15, h * 0.95, Math.cos(angle) * speed, Math.sin(angle) * speed, colors));
  }

  // Right cannon (fires up-left)
  for (let i = 0; i < half; i++) {
    const angle = (-2 * Math.PI / 3) + (Math.random() - 0.5) * 0.7; // ~-120 deg
    const speed = 13 + Math.random() * 15;
    confettiParticles.push(createConfettiParticle(w * 0.85, h * 0.95, Math.cos(angle) * speed, Math.sin(angle) * speed, colors));
  }

  if (!confettiAnimId) {
    animateConfetti();
  }
}

function createConfettiParticle(x, y, vx, vy, colors) {
  const isRibbon = Math.random() > 0.6;
  const size = isRibbon ? (8 + Math.random() * 8) : (6 + Math.random() * 6);
  return {
    x,
    y,
    vx,
    vy,
    color: colors[Math.floor(Math.random() * colors.length)],
    size,
    aspect: isRibbon ? 0.45 : (Math.random() > 0.4 ? 1 : 0.7),
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 14,
    wobble: Math.random() * 10,
    wobbleSpeed: 0.08 + Math.random() * 0.08,
    shape: Math.random() > 0.25 ? 'rect' : 'circle',
    opacity: 1,
    gravity: 0.38 + Math.random() * 0.14,
    friction: 0.965
  };
}

function animateConfetti() {
  if (!confettiCtx || !confettiCanvas) return;
  const w = window.innerWidth;
  const h = window.innerHeight;

  confettiCtx.clearRect(0, 0, w, h);

  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.vx *= p.friction;
    p.vy *= p.friction;
    p.vy += p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed;
    p.wobble += p.wobbleSpeed;

    if (p.y > h * 0.65) {
      p.opacity -= 0.022;
    }

    if (p.opacity <= 0 || p.y > h + 30) {
      confettiParticles.splice(i, 1);
      continue;
    }

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.scale(Math.cos(p.wobble), 1);
    confettiCtx.globalAlpha = Math.max(0, p.opacity);
    confettiCtx.fillStyle = p.color;

    if (p.shape === 'circle') {
      confettiCtx.beginPath();
      confettiCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      confettiCtx.fill();
    } else {
      confettiCtx.fillRect(-p.size / 2, (-p.size * p.aspect) / 2, p.size, p.size * p.aspect);
    }
    confettiCtx.restore();
  }

  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiCtx.clearRect(0, 0, w, h);
    confettiAnimId = null;
  }
}

function stopConfetti() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  confettiParticles = [];
  if (confettiCtx && confettiCanvas) {
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

/**
 * Normalizes question list into interactive items
 */
function buildInteractiveQuestions(quiz) {
  const items = [];
  const defaultSource = quiz.sourceMaterial || quiz.source_material || (quiz.questions?.[0]?._meta?.sourceMaterial) || (quiz.questions?.[0]?._sourceMaterial) || (quiz.subject ? `${quiz.subject} Handout` : 'Course Learning Material');
  const defaultLesson = quiz.lesson || (quiz.questions?.[0]?._meta?.lesson) || '';

  (quiz?.questions || []).forEach((q, qi) => {
    const qSource = q.sourceMaterial || q.source_material || defaultSource;
    const qLesson = q.lesson || defaultLesson;

    if (q.type === 'multiple_choice') {
      items.push({
        id: `mc_${qi}`,
        type: 'multiple_choice',
        question: q.question,
        options: q.options || [],
        answer: q.answer,
        explanation: q.explanation || '',
        sourceMaterial: qSource,
        sourceFile: q.source_file || qSource,
        sourcePage: q.source_page || null,
        lesson: qLesson
      });
    } else if (q.type === 'true_false' || q.type === 'tf') {
      items.push({
        id: `tf_${qi}`,
        type: 'true_false',
        question: q.question,
        options: ['True', 'False'],
        answer: q.answer || 'True',
        explanation: q.explanation || '',
        sourceMaterial: qSource,
        sourceFile: q.source_file || qSource,
        sourcePage: q.source_page || null,
        lesson: qLesson
      });
    } else if (q.type === 'identification') {
      items.push({
        id: `id_${qi}`,
        type: 'identification',
        question: q.question,
        answer: q.answer,
        explanation: q.explanation || '',
        sourceMaterial: qSource,
        sourceFile: q.source_file || qSource,
        sourcePage: q.source_page || null,
        lesson: qLesson
      });
    } else if (q.type === 'matching') {
      const pairs = (q.pairs || []).map((p, pi) => ({
        id: `p_${pi}`,
        left: p.left,
        right: p.right
      }));
      // Collect choices A-E from pairs
      const choices = pairs.map((p, pi) => ({
        key: String.fromCharCode(65 + pi),
        text: p.right
      }));
      // Scramble choices for student matching
      const shuffledChoices = [...choices].sort(() => Math.random() - 0.5);

      items.push({
        id: `match_${qi}`,
        type: 'matching',
        instructions: q.instructions || 'Match the correct answer to each question.',
        pairs: pairs,
        choices: shuffledChoices,
        sourceMaterial: qSource,
        sourceFile: q.source_file || qSource,
        sourcePage: q.source_page || null,
        lesson: qLesson
      });
    }
  });
  return items;
}

/**
 * Opens and initializes the Interactive Quiz Arena
 */
function openInteractiveQuiz(quizId) {
  let quiz = null;
  if (quizId && typeof quizId === 'object') {
    quiz = quizId;
  } else {
    const quizList = (typeof customQuizzes !== 'undefined') ? customQuizzes : [];
    quiz = quizList.find(q => String(q.id) === String(quizId));
  }
  if (!quiz) {
    showToast('Quiz not found', 'error');
    return;
  }

  const questions = buildInteractiveQuestions(quiz);
  if (!questions.length) {
    showToast('This quiz has no interactive items available', 'warning');
    return;
  }

  // Count total gradable items (matching counts each pair as an item)
  let totalItemsCount = 0;
  questions.forEach(q => {
    if (q.type === 'matching') totalItemsCount += (q.pairs || []).length;
    else totalItemsCount += 1;
  });

  const timerVal = typeof quiz.timerPerQuestion === 'number' && quiz.timerPerQuestion > 0
    ? quiz.timerPerQuestion 
    : (typeof quiz.questions?.[0]?._meta?.timerPerQuestion === 'number' && quiz.questions[0]._meta.timerPerQuestion > 0 ? quiz.questions[0]._meta.timerPerQuestion : 30);

  lastActiveTimerIndex = -1;
  Object.assign(interactivePlayerState, {
    quiz,
    questions,
    currentIndex: 0,
    userResponses: {},
    score: 0,
    totalItems: totalItemsCount,
    timerSecondsLeft: timerVal,
    timerPerQuestion: timerVal,
    startTime: Date.now(),
    elapsedSeconds: 0,
    matchingSelections: {},
    selectedMatchingChoice: null,
    isSubmitted: false,
    isWaitingFeedback: false,
    matchingEvaluated: false,
    matchingFeedback: null,
    lastMatchingPointsEarned: 0,
    usedPowerups: { time: false, handout: false, hint: false }
  });

  const modal = document.getElementById('interactiveQuizModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  playInteractiveBGM();
  renderCurrentInteractiveQuestion();
}

/**
 * Requests exit confirmation for Interactive Arena
 */
function requestCloseInteractiveQuiz() {
  if (interactivePlayerState.isSubmitted) {
    closeInteractiveQuiz(false);
    return;
  }
  const confirmEl = document.getElementById('iqExitConfirmModal');
  if (confirmEl) {
    confirmEl.style.display = 'flex';
  } else {
    closeInteractiveQuiz(false);
  }
}

function cancelExitInteractiveQuiz() {
  const confirmEl = document.getElementById('iqExitConfirmModal');
  if (confirmEl) {
    confirmEl.style.display = 'none';
  }
}

function confirmExitInteractiveQuiz() {
  cancelExitInteractiveQuiz();
  closeInteractiveQuiz(false);
}

/**
 * Closes the Interactive Arena
 */
function closeInteractiveQuiz(confirmFirst = false) {
  if (confirmFirst && !interactivePlayerState.isSubmitted) {
    requestCloseInteractiveQuiz();
    return;
  }

  stopInteractiveBGM();
  stopConfetti();
  closeInteractiveHandoutModal();
  clearInterval(interactivePlayerState.timerInterval);
  const modal = document.getElementById('interactiveQuizModal');
  if (modal) {
    modal.classList.remove('active');
    modal.innerHTML = '';
    document.body.style.overflow = '';
  }
}

/**
 * Toggle Fullscreen
 */
function toggleInteractiveFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => console.log(err));
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

let lastActiveTimerIndex = -1;

/**
 * Starts countdown timer for the current question
 */
function startQuestionTimer() {
  if (lastActiveTimerIndex === interactivePlayerState.currentIndex && interactivePlayerState.timerInterval) {
    return;
  }
  lastActiveTimerIndex = interactivePlayerState.currentIndex;
  clearInterval(interactivePlayerState.timerInterval);

  const curQ = interactivePlayerState.questions[interactivePlayerState.currentIndex];
  let timerVal = interactivePlayerState.timerPerQuestion || 30;
  if (curQ && curQ.type === 'matching') {
    const pairCount = (curQ.pairs || []).length || 4;
    timerVal = Math.max(45, timerVal * Math.min(2, pairCount));
  }

  if (timerVal <= 0) return;

  interactivePlayerState.timerSecondsLeft = timerVal;
  updateTimerUI();

  interactivePlayerState.timerInterval = setInterval(() => {
    interactivePlayerState.timerSecondsLeft--;
    updateTimerUI();

    if (interactivePlayerState.timerSecondsLeft <= 0) {
      clearInterval(interactivePlayerState.timerInterval);
      handleQuestionTimeout();
    }
  }, 1000);
}

function updateTimerUI() {
  const timerEl = document.getElementById('iqTimerDisplay');
  if (!timerEl) return;
  timerEl.innerHTML = `⏱️ ${interactivePlayerState.timerSecondsLeft}s`;
  if (interactivePlayerState.timerSecondsLeft <= 5) {
    timerEl.classList.add('urgent', 'warning');
  } else {
    timerEl.classList.remove('urgent', 'warning');
  }
}

function handleQuestionTimeout() {
  const curQ = interactivePlayerState.questions[interactivePlayerState.currentIndex];
  if (!curQ) return;

  if (curQ.type === 'multiple_choice' || curQ.type === 'true_false' || curQ.type === 'tf') {
    submitMultipleChoiceAnswer(null);
  } else if (curQ.type === 'identification') {
    submitIdentificationAnswer('');
  } else if (curQ.type === 'matching') {
    forceSubmitMatchingOnTimeout();
  }
}

/**
 * Main Render Dispatcher
 */
function renderCurrentInteractiveQuestion() {
  const modal = document.getElementById('interactiveQuizModal');
  if (!modal) return;

  interactivePlayerState.isWaitingFeedback = false;
  const existingDrawer = document.getElementById('iqFeedbackDrawer');
  if (existingDrawer) existingDrawer.remove();

  const { questions, currentIndex, isSubmitted } = interactivePlayerState;
  if (isSubmitted || currentIndex >= questions.length) {
    renderCompletedInteractiveScreen();
    return;
  }

  const q = questions[currentIndex];
  startQuestionTimer();

  const studentName = (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE?.full_name) 
    ? CURRENT_PROFILE.full_name 
    : 'Student';
  const studentInitial = studentName.charAt(0).toUpperCase();

  const docRef = q.sourceFile || q.sourceMaterial || '';
  const cleanPageText = q.sourcePage ? String(q.sourcePage).replace(/^(page\s*)+/i, '').trim() : '';

  let qTitle = 'Knowledge Check';
  let qSubtitle = '';
  if (q.type === 'matching') {
    qTitle = 'Match the pairs';
    qSubtitle = 'Drag each answer to its matching term.';
  } else if (q.type === 'identification') {
    qTitle = 'Identification';
    qSubtitle = 'Type the correct answer and submit.';
  } else if (q.type === 'true_false' || q.type === 'tf') {
    qTitle = 'True or False';
    qSubtitle = 'Choose whether the statement is true or false.';
  } else {
    qTitle = 'Multiple Choice';
    qSubtitle = 'Select the correct option below.';
  }

  let questionBodyHTML = '';
  if (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'tf') {
    questionBodyHTML = renderMultipleChoiceView(q);
  } else if (q.type === 'identification') {
    questionBodyHTML = renderIdentificationView(q);
  } else if (q.type === 'matching') {
    questionBodyHTML = renderMatchingView(q);
  }

  modal.innerHTML = `
    <!-- Organic Background Waves -->
    <div class="iq-bg-decor">
      <div class="iq-bg-wave-1"></div>
      <div class="iq-bg-wave-2"></div>
      <svg class="iq-star-sparkle" style="top: 15%; left: 8%; width: 24px; height: 24px;" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
      </svg>
      <svg class="iq-star-sparkle" style="bottom: 25%; right: 10%; width: 28px; height: 28px; color: #f59e0b;" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
      </svg>
    </div>

    <!-- Header -->
    <div class="iq-header">
      <div class="iq-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        <span>Scholaria</span>
      </div>
      <div class="iq-header-actions">
        <button class="iq-btn-icon ${interactiveMusicMuted ? 'muted' : ''}" id="iqMusicToggleBtn" title="${interactiveMusicMuted ? 'Unmute Background Music' : 'Mute Background Music'}" onclick="toggleInteractiveMusic()">
          ${interactiveMusicMuted ? iconAudioMuted() : iconAudioPlaying()}
        </button>
        <button class="iq-btn-icon" title="Exit Quiz" onclick="requestCloseInteractiveQuiz()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <button class="iq-btn-icon" title="Toggle Fullscreen" onclick="toggleInteractiveFullscreen()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        </button>
      </div>
    </div>

    <!-- Arena Body -->
    <div class="iq-body">
      <div class="iq-match-hero-header">
        <div class="iq-match-hero-left">
          <span class="iq-match-kcheck">Knowledge Check</span>
          <h2 class="iq-match-title">${qTitle}</h2>
          <p class="iq-match-subtitle">${qSubtitle}</p>
        </div>
        <div class="iq-match-hero-right">
          <div class="iq-match-progress-wrap">
            <span class="iq-match-progress-label">Question ${currentIndex + 1} of ${questions.length}</span>
            <div class="iq-match-progress-bar">
              <div class="iq-match-progress-fill" style="width: ${Math.round(((currentIndex + 1) / questions.length) * 100)}%;"></div>
            </div>
          </div>
          <div class="iq-match-timer-pill ${interactivePlayerState.timerSecondsLeft <= 5 ? 'urgent' : ''}" id="iqTimerDisplay">
            ⏱️ ${interactivePlayerState.timerSecondsLeft}s
          </div>
        </div>
      </div>

      ${questionBodyHTML}
    </div>

    <!-- Student Badge (Bottom Left) -->
    <div class="iq-student-badge">
      <div class="iq-student-avatar">${studentInitial}</div>
      <span>${escHtml(studentName)}</span>
    </div>

    <!-- Arena Power-ups Dock (Bottom Right) -->
    <div class="iq-bottom-dock-right" id="iqBottomDockRight">
      <button type="button" 
              class="iq-powerup-btn iq-powerup-time ${interactivePlayerState.usedPowerups?.time ? 'used' : ''}" 
              id="iqPowerupTime" 
              onclick="usePowerupTime()" 
              ${interactivePlayerState.usedPowerups?.time ? 'disabled' : ''}
              title="${interactivePlayerState.usedPowerups?.time ? 'Time Boost already used' : 'Time Boost (+15s) · 1-time use'}">
        +15
      </button>
      <button type="button" 
              class="iq-powerup-btn iq-powerup-handout ${interactivePlayerState.usedPowerups?.handout ? 'used' : ''}" 
              id="iqPowerupHandout" 
              onclick="usePowerupHandout()" 
              ${interactivePlayerState.usedPowerups?.handout ? 'disabled' : ''}
              title="${interactivePlayerState.usedPowerups?.handout ? 'Handout Reference already used' : 'Review Handout Reference · 1-time use'}">
        📖
      </button>
      <button type="button" 
              class="iq-powerup-btn iq-powerup-hint ${interactivePlayerState.usedPowerups?.hint ? 'used' : ''}" 
              id="iqPowerupHint" 
              onclick="usePowerupHint()" 
              ${interactivePlayerState.usedPowerups?.hint ? 'disabled' : ''}
              title="${interactivePlayerState.usedPowerups?.hint ? 'Hint already used' : 'Hint / Clue · 1-time use'}">
        💡
      </button>
    </div>

    <!-- Exit Confirmation Modal Dialog -->
    <div id="iqExitConfirmModal" class="iq-confirm-overlay" style="display: none;">
      <div class="iq-confirm-card">
        <div class="iq-confirm-icon">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 class="iq-confirm-title">Exit Interactive Quiz?</h3>
        <p class="iq-confirm-desc">Are you sure you want to exit? Your current progress and score in this interactive quiz will not be saved.</p>
        <div class="iq-confirm-actions">
          <button type="button" class="iq-confirm-btn-no" onclick="cancelExitInteractiveQuiz()">No, Continue</button>
          <button type="button" class="iq-confirm-btn-yes" onclick="confirmExitInteractiveQuiz()">Yes, Exit</button>
        </div>
      </div>
    </div>
  `;

  // Auto focus input if identification
  if (q.type === 'identification') {
    setTimeout(() => {
      const input = document.getElementById('iqIdAnswerInput');
      if (input) input.focus();
    }, 100);
  }
}

/**
 * View 1: Identification
 */
function renderIdentificationView(q) {
  return `
    <div class="iq-id-card">
      <div class="iq-id-question-wrap">
        <svg class="iq-id-burst-left" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="3" y1="12" x2="8" y2="12"></line>
          <line x1="4.5" y1="5.5" x2="8.5" y2="8.5"></line>
          <line x1="4.5" y1="18.5" x2="8.5" y2="15.5"></line>
        </svg>

        <div class="iq-id-question-text">${escHtml(q.question)}</div>

        <svg class="iq-id-burst-right" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="21" y1="12" x2="16" y2="12"></line>
          <line x1="19.5" y1="5.5" x2="15.5" y2="8.5"></line>
          <line x1="19.5" y1="18.5" x2="15.5" y2="15.5"></line>
        </svg>
      </div>

      <div class="iq-id-input-box">
        <div class="iq-id-input-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <input type="text" id="iqIdAnswerInput" placeholder="Type your answer here..." autocomplete="off" onkeydown="if(event.key==='Enter') submitIdentificationAnswer(this.value)">
        </div>
        <div class="iq-id-input-line"></div>
      </div>

      <div class="iq-submit-btn-wrap">
        <button class="iq-submit-btn" onclick="submitIdentificationAnswer(document.getElementById('iqIdAnswerInput').value)">
          <span>Submit Answer</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      </div>
    </div>
  `;
}

function submitIdentificationAnswer(val) {
  if (interactivePlayerState.isWaitingFeedback) return;
  interactivePlayerState.isWaitingFeedback = true;

  clearInterval(interactivePlayerState.timerInterval);
  const q = interactivePlayerState.questions[interactivePlayerState.currentIndex];
  if (!q) return;

  const given = (val || '').trim();
  const correct = (q.answer || '').trim();
  const isCorrect = compareAnswers(given, correct);

  if (isCorrect) interactivePlayerState.score++;
  interactivePlayerState.userResponses[q.id] = { given, correct, isCorrect };

  const inputBox = document.querySelector('.iq-id-input-box');
  const inputField = document.getElementById('iqIdAnswerInput');
  if (inputField) inputField.disabled = true;
  if (inputBox) {
    inputBox.classList.add(isCorrect ? 'correct' : 'incorrect');
  }

  showAnswerFeedback({
    isCorrect,
    correctAnswerText: correct,
    sourceMaterialText: q.sourceFile || q.sourceMaterial,
    sourcePageText: q.sourcePage || null,
    lessonText: q.lesson,
    explanationText: q.explanation || null
  });
}

/**
 * View 2: Matching Type (Drag and Drop / Tap to Pair)
 */
function renderMatchingView(q) {
  return `
    <!-- Main Two Column Grid (Board) -->
    <div id="iqMatchingBoardWrap" style="width:100%;">
      ${renderMatchingBoardHTML(q)}
    </div>
  `;
}

function renderMatchingBoardHTML(q) {
  const selections = interactivePlayerState.matchingSelections || {};
  const usedKeys = Object.values(selections);
  const totalPairs = (q.pairs || []).length;
  const matchedCount = Object.keys(selections).filter(k => selections[k] != null).length;
  const isGraded = !!interactivePlayerState.matchingEvaluated;
  const feedbackMap = interactivePlayerState.matchingFeedback || {};
  const pointsEarned = interactivePlayerState.lastMatchingPointsEarned || 0;

  const colorClasses = ['color-a', 'color-b', 'color-c', 'color-d', 'color-e'];

  return `
    <div class="iq-match-container">
      <!-- Left Column: Answer Bank -->
      <div class="iq-match-bank-card">
        <div class="iq-bank-head">
          <div class="iq-bank-head-left">
            <div class="iq-bank-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <div>
              <h4>Answer bank</h4>
              <p>${isGraded ? 'Matching phase complete' : 'Drag a card to make a match.'}</p>
            </div>
          </div>
          <span class="iq-bank-badge">${(q.choices || []).length} choices</span>
        </div>

        <div class="iq-choices-list" id="iqChoicesContainer">
          ${(q.choices || []).map((c, i) => {
            const isUsed = usedKeys.includes(c.key);
            const isSelected = interactivePlayerState.selectedMatchingChoice === c.key;
            const col = colorClasses[i % colorClasses.length];
            return `
              <div class="iq-choice-pill ${col} ${isUsed ? 'used' : ''} ${isSelected ? 'selected' : ''}" 
                   id="choice_pill_${c.key}"
                   draggable="${!isUsed && !isGraded}" 
                   ondragstart="${isGraded ? '' : `handleChoiceDragStart(event, '${c.key}')`}"
                   onclick="${isGraded ? '' : `handleChoiceTap('${c.key}')`}">
                <div class="iq-drag-handle" title="${isGraded ? 'Locked' : 'Drag this card'}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="8" cy="6" r="2"/><circle cx="16" cy="6" r="2"/>
                    <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
                    <circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/>
                  </svg>
                </div>
                <span class="iq-choice-badge">${c.key}</span>
                <span class="iq-choice-text">${escHtml(c.text)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Right Column: Match the terms -->
      <div class="iq-match-terms-card">
        <div class="iq-terms-head">
          <h4>Match the terms</h4>
          <p>${isGraded ? `${pointsEarned} of ${totalPairs} correct` : `${matchedCount} of ${totalPairs} matched`}</p>
        </div>

        <div class="iq-terms-list">
          ${(q.pairs || []).map((p, i) => {
            const assignedKey = selections[i];
            const assignedChoice = assignedKey ? q.choices.find(c => c.key === assignedKey) : null;
            const choiceIndex = assignedChoice ? q.choices.indexOf(assignedChoice) : 0;
            const assignedCol = colorClasses[choiceIndex % colorClasses.length];
            const numStr = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;

            const evalInfo = isGraded && feedbackMap ? feedbackMap[i] : null;
            const isPairRight = evalInfo ? evalInfo.isCorrect : false;

            return `
              <div class="iq-term-row ${isGraded ? (isPairRight ? 'is-correct' : 'is-incorrect') : ''}" style="flex-direction:column;align-items:stretch;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;">
                  <div class="iq-term-left">
                    <div class="iq-term-num-badge">${numStr}</div>
                    <div class="iq-term-label">${escHtml(p.left)}</div>
                  </div>
                  <div class="iq-drop-slot ${assignedChoice ? 'filled ' + assignedCol : ''}" 
                       id="drop_slot_${i}"
                       ondragover="${isGraded ? '' : 'handleDropOver(event)'}"
                       ondragleave="${isGraded ? '' : 'handleDropLeave(event)'}"
                       ondrop="${isGraded ? '' : `handleChoiceDrop(event, ${i})`}"
                       onclick="${isGraded ? '' : `handleTargetTap(${i})`}">
                    ${assignedChoice ? `
                      <div class="iq-slot-filled-card" title="${escHtml(assignedChoice.text)}">
                        <span class="iq-choice-badge">${assignedChoice.key}</span>
                        <span class="iq-choice-text">${escHtml(assignedChoice.text)}</span>
                        ${isGraded ? `
                          <span class="iq-slot-result-badge ${isPairRight ? 'correct' : 'wrong'}">
                            ${isPairRight ? '✔ +1 pt' : '✖ Missed'}
                          </span>
                        ` : `
                          <button type="button" class="iq-slot-remove-btn" onclick="clearMatchingSlot(event, ${i})" title="Remove match">&times;</button>
                        `}
                      </div>
                    ` : `
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                      </svg>
                      <span>Drop answer here</span>
                    `}
                  </div>
                </div>
                ${isGraded && !isPairRight ? `
                  <div class="iq-slot-correct-hint">
                    ✔ Correct Match: <strong>${escHtml(p.right)}</strong>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Bottom Row: Submit button & Rearrange note -->
    <div class="iq-match-bottom-bar">
      <button class="iq-submit-btn ${isGraded ? 'ready' : (matchedCount === totalPairs ? 'ready' : 'incomplete')}" 
              id="iqSubmitMatchesBtn" 
              ${isGraded ? 'disabled style="cursor:default;"' : ''}
              onclick="${isGraded ? '' : 'submitMatchingAnswer()'}">
        <span>${isGraded ? `✓ Graded (+${pointsEarned} pt${pointsEarned === 1 ? '' : 's'})` : `Submit Matches`}</span>
        ${!isGraded ? `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>` : ''}
      </button>
      <span class="iq-match-bottom-note">
        ${isGraded 
          ? `Graded: <strong>${pointsEarned}/${totalPairs}</strong> pairs correct (+${pointsEarned} pt${pointsEarned === 1 ? '' : 's'} added).` 
          : `You can rearrange your answers before submitting.`}
      </span>
    </div>
  `;
}

function renderMatchingBoardOnly() {
  const wrap = document.getElementById('iqMatchingBoardWrap');
  if (!wrap) {
    renderCurrentInteractiveQuestion();
    return;
  }
  const q = interactivePlayerState.questions[interactivePlayerState.currentIndex];
  if (!q || q.type !== 'matching') return;

  wrap.innerHTML = renderMatchingBoardHTML(q);
}

function handleChoiceDragStart(e, key) {
  e.dataTransfer.setData('text/plain', key);
}

function handleDropOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('hovered');
}

function handleDropLeave(e) {
  e.currentTarget.classList.remove('hovered');
}

function handleChoiceDrop(e, targetIdx) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('hovered');
  const key = e.dataTransfer.getData('text/plain');
  if (!key) return;

  assignMatchingChoice(targetIdx, key);
}

function handleChoiceTap(key) {
  const selections = interactivePlayerState.matchingSelections || {};
  if (Object.values(selections).includes(key)) return;

  if (interactivePlayerState.selectedMatchingChoice === key) {
    interactivePlayerState.selectedMatchingChoice = null;
  } else {
    interactivePlayerState.selectedMatchingChoice = key;
  }
  renderMatchingBoardOnly();
}

function handleTargetTap(targetIdx) {
  if (interactivePlayerState.selectedMatchingChoice) {
    assignMatchingChoice(targetIdx, interactivePlayerState.selectedMatchingChoice);
  }
}

function clearMatchingSlot(e, targetIdx) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (interactivePlayerState.matchingSelections) {
    delete interactivePlayerState.matchingSelections[targetIdx];
  }
  interactivePlayerState.selectedMatchingChoice = null;
  renderMatchingBoardOnly();
}

function assignMatchingChoice(targetIdx, key) {
  if (!interactivePlayerState.matchingSelections) {
    interactivePlayerState.matchingSelections = {};
  }

  // Remove if assigned to another slot
  for (const idx in interactivePlayerState.matchingSelections) {
    if (interactivePlayerState.matchingSelections[idx] === key) {
      delete interactivePlayerState.matchingSelections[idx];
    }
  }

  interactivePlayerState.matchingSelections[targetIdx] = key;
  interactivePlayerState.selectedMatchingChoice = null;
  renderMatchingBoardOnly();
}

function submitMatchingAnswer() {
  if (interactivePlayerState.isWaitingFeedback) return;

  const q = interactivePlayerState.questions[interactivePlayerState.currentIndex];
  if (!q) return;

  const totalPairs = (q.pairs || []).length;
  const selections = interactivePlayerState.matchingSelections || {};
  const matchedCount = Object.keys(selections).filter(k => selections[k] != null).length;

  if (matchedCount < totalPairs) {
    if (typeof showToast === 'function') {
      showToast(`Please match all ${totalPairs} terms before submitting (${matchedCount}/${totalPairs} matched).`, 'warning');
    }
    const btn = document.getElementById('iqSubmitMatchesBtn');
    if (btn) {
      btn.classList.remove('iq-shake');
      void btn.offsetWidth;
      btn.classList.add('iq-shake');
    }
    return;
  }

  interactivePlayerState.isWaitingFeedback = true;
  clearInterval(interactivePlayerState.timerInterval);

  let matchesCorrect = 0;
  const pairDetails = [];
  const feedbackMap = {};

  (q.pairs || []).forEach((pair, pi) => {
    const assignedKey = selections[pi];
    const assignedChoice = assignedKey ? q.choices.find(c => c.key === assignedKey) : null;
    const givenText = assignedChoice ? assignedChoice.text : '';
    const correctText = pair.right;
    const isCorrect = compareAnswers(givenText, correctText);

    if (isCorrect) {
      interactivePlayerState.score++;
      matchesCorrect++;
    }
    pairDetails.push(`${pair.left} ➔ ${pair.right}`);

    feedbackMap[pi] = {
      isCorrect,
      given: givenText,
      correct: correctText
    };

    interactivePlayerState.userResponses[`${q.id}_${pi}`] = {
      label: pair.left,
      given: givenText,
      correct: correctText,
      isCorrect
    };
  });

  interactivePlayerState.matchingEvaluated = true;
  interactivePlayerState.matchingFeedback = feedbackMap;
  interactivePlayerState.lastMatchingPointsEarned = matchesCorrect;

  // Render board to show green/red per row
  renderMatchingBoardOnly();

  const isAllCorrect = matchesCorrect === totalPairs;
  const feedbackType = isAllCorrect ? 'correct' : (matchesCorrect > 0 ? 'partial' : 'incorrect');

  showAnswerFeedback({
    isCorrect: isAllCorrect,
    feedbackType: feedbackType,
    matchesCorrect: matchesCorrect,
    totalPairs: totalPairs,
    correctAnswerText: `${matchesCorrect}/${totalPairs} Pairs Matched. Key: ${pairDetails.slice(0, 3).join(' | ')}${pairDetails.length > 3 ? '...' : ''}`,
    sourceMaterialText: q.sourceFile || q.sourceMaterial,
    sourcePageText: q.sourcePage || null,
    lessonText: q.lesson,
    explanationText: q.explanation || null
  });
}

function forceSubmitMatchingOnTimeout() {
  if (interactivePlayerState.isWaitingFeedback) return;
  interactivePlayerState.isWaitingFeedback = true;
  clearInterval(interactivePlayerState.timerInterval);

  const q = interactivePlayerState.questions[interactivePlayerState.currentIndex];
  if (!q) return;

  const totalPairs = (q.pairs || []).length;
  const selections = interactivePlayerState.matchingSelections || {};
  let matchesCorrect = 0;
  const pairDetails = [];
  const feedbackMap = {};

  (q.pairs || []).forEach((pair, pi) => {
    const assignedKey = selections[pi];
    const assignedChoice = assignedKey ? q.choices.find(c => c.key === assignedKey) : null;
    const givenText = assignedChoice ? assignedChoice.text : '';
    const correctText = pair.right;
    const isCorrect = givenText && compareAnswers(givenText, correctText);

    if (isCorrect) {
      interactivePlayerState.score++;
      matchesCorrect++;
    }
    pairDetails.push(`${pair.left} ➔ ${pair.right}`);

    feedbackMap[pi] = {
      isCorrect: !!isCorrect,
      given: givenText,
      correct: correctText
    };

    interactivePlayerState.userResponses[`${q.id}_${pi}`] = {
      label: pair.left,
      given: givenText,
      correct: correctText,
      isCorrect: !!isCorrect
    };
  });

  interactivePlayerState.matchingEvaluated = true;
  interactivePlayerState.matchingFeedback = feedbackMap;
  interactivePlayerState.lastMatchingPointsEarned = matchesCorrect;

  renderMatchingBoardOnly();

  const isAllCorrect = matchesCorrect === totalPairs;
  const feedbackType = isAllCorrect ? 'correct' : (matchesCorrect > 0 ? 'partial' : 'incorrect');

  showAnswerFeedback({
    isCorrect: isAllCorrect,
    feedbackType: feedbackType,
    matchesCorrect: matchesCorrect,
    totalPairs: totalPairs,
    correctAnswerText: `${matchesCorrect}/${totalPairs} Pairs Matched. Key: ${pairDetails.slice(0, 3).join(' | ')}${pairDetails.length > 3 ? '...' : ''}`,
    sourceMaterialText: q.sourceFile || q.sourceMaterial,
    sourcePageText: q.sourcePage || null,
    lessonText: q.lesson,
    explanationText: q.explanation || null
  });
}

/**
 * Power-up 1: Time Boost (+15s)
 * Adds 15 extra seconds to current timer
 */
function usePowerupTime() {
  if (interactivePlayerState.isWaitingFeedback || interactivePlayerState.isSubmitted) return;

  if (!interactivePlayerState.timerPerQuestion || interactivePlayerState.timerPerQuestion <= 0) {
    if (typeof showToast === 'function') {
      showToast('This quiz has no time limit!', 'info');
    }
    return;
  }

  if (interactivePlayerState.usedPowerups?.time) {
    if (typeof showToast === 'function') {
      showToast('Time boost (+15s) can only be used once per quiz!', 'warning');
    }
    return;
  }

  if (!interactivePlayerState.usedPowerups) {
    interactivePlayerState.usedPowerups = {};
  }
  interactivePlayerState.usedPowerups.time = true;

  interactivePlayerState.timerSecondsLeft += 15;
  updateTimerUI();

  const timerEl = document.getElementById('iqTimerDisplay');
  if (timerEl) {
    timerEl.classList.remove('iq-timer-boost');
    void timerEl.offsetWidth;
    timerEl.classList.add('iq-timer-boost');
    setTimeout(() => {
      if (timerEl) timerEl.classList.remove('iq-timer-boost');
    }, 700);
  }

  const btn = document.getElementById('iqPowerupTime');
  if (btn) {
    btn.classList.add('used');
    btn.disabled = true;
    btn.title = 'Time Boost already used';
  }

  playInteractiveSFX(true);
  if (typeof showToast === 'function') {
    showToast('⚡ +15 Seconds Added to Timer!', 'success');
  }
}

/**
 * Power-up 2: Handout Study Reference
 * Opens a focused reference dialog highlighting the document and relevant page (1-time use)
 */
function usePowerupHandout() {
  const curQ = interactivePlayerState.questions[interactivePlayerState.currentIndex];
  if (!curQ) return;

  if (interactivePlayerState.usedPowerups?.handout) {
    if (typeof showToast === 'function') {
      showToast('Handout reference power-up can only be used once per quiz!', 'warning');
    }
    return;
  }

  if (!interactivePlayerState.usedPowerups) {
    interactivePlayerState.usedPowerups = {};
  }
  interactivePlayerState.usedPowerups.handout = true;

  const btn = document.getElementById('iqPowerupHandout');
  if (btn) {
    btn.classList.add('used');
    btn.disabled = true;
    btn.title = 'Handout Reference already used';
  }

  const docRef = curQ.sourceFile || curQ.sourceMaterial || (interactivePlayerState.quiz?.subject ? `${interactivePlayerState.quiz.subject} Handout` : 'Course Learning Material');
  const rawPage = curQ.sourcePage ? String(curQ.sourcePage).replace(/^(page\s*)+/i, '').trim() : '';
  const pageText = rawPage ? `Page ${rawPage}` : '';
  const lessonText = curQ.lesson ? curQ.lesson.trim() : '';

  closeInteractiveHandoutModal();

  const modal = document.createElement('div');
  modal.id = 'iqHandoutRefModal';
  modal.className = 'iq-confirm-overlay';
  modal.style.display = 'flex';
  modal.onclick = (e) => {
    if (e.target === modal) closeInteractiveHandoutModal();
  };

  modal.innerHTML = `
    <div class="iq-confirm-card" style="max-width: 480px; text-align: left; animation: iqPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);" onclick="event.stopPropagation()">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:38px;height:38px;border-radius:12px;background:#f3e8ff;color:#7e22ce;display:flex;align-items:center;justify-content:center;font-size:18px;border:1.5px solid #ddd6fe;">📖</div>
          <div>
            <h3 style="margin:0;font-size:16.5px;font-weight:800;color:#0f172a;">Handout Reference</h3>
            <span style="font-size:12px;color:#64748b;">Study material for this question</span>
          </div>
        </div>
        <button type="button" onclick="closeInteractiveHandoutModal()" style="border:none;background:transparent;cursor:pointer;font-size:22px;color:#94a3b8;line-height:1;padding:4px;" title="Close">&times;</button>
      </div>

      <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:14px 16px;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
          <span>📄 Handout:</span>
          <span style="color:#0284c7;font-weight:800;">${escHtml(docRef)}</span>
        </div>
        ${pageText ? `
          <div style="font-size:12.5px;font-weight:600;color:#475569;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
            <span>📑 Reference:</span>
            <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-weight:700;">${escHtml(pageText)}</span>
          </div>
        ` : ''}
        ${lessonText ? `
          <div style="font-size:12px;color:#64748b;margin-top:8px;border-top:1px dashed #e2e8f0;padding-top:8px;">
            <strong style="color:#334155;">Topic:</strong> <em>${escHtml(lessonText)}</em>
          </div>
        ` : ''}
      </div>

      <div style="display:flex;justify-content:flex-end;">
        <button type="button" class="iq-confirm-btn-yes" style="padding:8px 20px;font-size:13px;" onclick="closeInteractiveHandoutModal()">Back to Quiz</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  if (typeof showToast === 'function') {
    showToast(`Handout: ${docRef}${pageText ? ' · ' + pageText : ''}`, 'info');
  }
}

function closeInteractiveHandoutModal() {
  const modal = document.getElementById('iqHandoutRefModal');
  if (modal) modal.remove();
}

function openInteractiveHandoutView() {
  usePowerupHandout();
}

/**
 * Power-up 3: Hint / 50:50 Clue (1-time use)
 * - Multiple Choice: Eliminates 2 incorrect options
 * - True/False: Provides contextual topic clue
 * - Identification: Reveals first letter & word length
 * - Matching: Auto-pairs 1 unassigned term
 */
function usePowerupHint() {
  if (interactivePlayerState.isWaitingFeedback || interactivePlayerState.isSubmitted) return;

  const curQ = interactivePlayerState.questions[interactivePlayerState.currentIndex];
  if (!curQ) return;

  if (interactivePlayerState.usedPowerups?.hint) {
    if (typeof showToast === 'function') {
      showToast('Hint power-up can only be used once per quiz!', 'warning');
    }
    return;
  }

  let hintActivated = false;

  if (curQ.type === 'multiple_choice') {
    // 50/50 elimination: Remove up to 2 wrong option cards
    const opts = curQ.options || [];
    const correctAns = String(curQ.answer || '').trim().toLowerCase();
    const wrongIndices = [];
    opts.forEach((opt, idx) => {
      if (String(opt).trim().toLowerCase() !== correctAns) {
        wrongIndices.push(idx);
      }
    });

    for (let i = wrongIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wrongIndices[i], wrongIndices[j]] = [wrongIndices[j], wrongIndices[i]];
    }
    const toEliminate = wrongIndices.slice(0, Math.min(2, Math.max(1, wrongIndices.length - 1)));

    toEliminate.forEach(idx => {
      const card = document.getElementById(`mc_card_${idx}`);
      if (card) {
        card.classList.add('eliminated');
      }
    });

    if (toEliminate.length > 0) {
      hintActivated = true;
      playInteractiveSFX(true);
      if (typeof showToast === 'function') {
        showToast(`💡 50/50: Removed ${toEliminate.length} incorrect option${toEliminate.length > 1 ? 's' : ''}!`, 'success');
      }
    }
  } else if (curQ.type === 'true_false' || curQ.type === 'tf') {
    const lesson = curQ.lesson ? curQ.lesson.trim() : '';
    const msg = lesson 
      ? `💡 Clue: Focus on the concept of "${lesson}" to verify the statement.`
      : `💡 Clue: Watch out for absolute terms like "always" or "never".`;
    if (typeof showToast === 'function') {
      showToast(msg, 'info');
    }
    hintActivated = true;
    playInteractiveSFX(true);
  } else if (curQ.type === 'identification') {
    const ans = String(curQ.answer || '').trim();
    const cleanAns = ans.replace(/^["'`“‘]+|[)"'`”’:,;.]+$/g, '').trim();
    const firstChar = cleanAns.charAt(0).toUpperCase();
    const letterCount = cleanAns.replace(/\s+/g, '').length;
    const lesson = curQ.lesson ? ` · Topic: ${curQ.lesson}` : '';

    const input = document.getElementById('iqIdAnswerInput');
    if (input) {
      input.placeholder = `Starts with "${firstChar}" (${letterCount} letters)...`;
      input.focus();
    }

    if (typeof showToast === 'function') {
      showToast(`💡 Hint: Starts with "${firstChar}" (${letterCount} letters)${lesson}`, 'info');
    }
    hintActivated = true;
    playInteractiveSFX(true);
  } else if (curQ.type === 'matching') {
    // Auto-match 1 unassigned term
    const pairs = curQ.pairs || [];
    const choices = curQ.choices || [];
    const selections = interactivePlayerState.matchingSelections || {};

    let targetPairIdx = -1;
    for (let i = 0; i < pairs.length; i++) {
      if (!selections[i]) {
        targetPairIdx = i;
        break;
      }
    }

    if (targetPairIdx === -1 && pairs.length > 0) {
      for (let i = 0; i < pairs.length; i++) {
        const key = selections[i];
        const ch = choices.find(c => c.key === key);
        if (!ch || !compareAnswers(ch.text, pairs[i].right)) {
          targetPairIdx = i;
          break;
        }
      }
    }

    if (targetPairIdx !== -1) {
      const correctText = pairs[targetPairIdx].right;
      const matchingChoice = choices.find(c => compareAnswers(c.text, correctText));
      if (matchingChoice) {
        assignMatchingChoice(targetPairIdx, matchingChoice.key);
        if (typeof showToast === 'function') {
          showToast(`💡 Hint: Matched "${pairs[targetPairIdx].left}" for you!`, 'success');
        }
        hintActivated = true;
        playInteractiveSFX(true);
      }
    } else {
      if (typeof showToast === 'function') {
        showToast('💡 All pairs are already filled!', 'info');
      }
    }
  }

  if (hintActivated) {
    if (!interactivePlayerState.usedPowerups) {
      interactivePlayerState.usedPowerups = {};
    }
    interactivePlayerState.usedPowerups.hint = true;
    const btn = document.getElementById('iqPowerupHint');
    if (btn) {
      btn.classList.add('used');
      btn.disabled = true;
      btn.title = 'Hint already used';
    }
  }
}

function openInteractiveHint() {
  usePowerupHint();
}

/**
 * View 3: Multiple Choice & True/False (Cards A, B, C, D, E, F)
 */
function renderMultipleChoiceView(q) {
  const cardLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const cardClasses = ['card-a', 'card-b', 'card-c', 'card-d', 'card-a', 'card-b'];

  const isTf = q.type === 'true_false' || q.type === 'tf';
  return `
    <div class="iq-mc-container">
      <div class="iq-mc-question-banner">
        ${escHtml(q.question)}
      </div>

      <div class="iq-mc-options-grid" style="${isTf || (q.options || []).length <= 2 ? 'grid-template-columns: 1fr 1fr;' : ''}">
        ${(q.options || []).map((opt, i) => {
          const letter = cardLetters[i] || String.fromCharCode(65 + i);
          const cardClass = cardClasses[i % cardClasses.length];
          return `
            <div class="iq-mc-card ${cardClass}" id="mc_card_${i}" onclick="selectMultipleChoiceCard(${i}, '${escHtml(opt).replace(/'/g, "\\'")}')">
              <div class="iq-mc-card-head">
                <span>${letter}</span>
              </div>
              <div class="iq-mc-card-body">
                ${escHtml(opt)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function selectMultipleChoiceCard(cardIdx, optValue) {
  if (interactivePlayerState.isWaitingFeedback) return;
  interactivePlayerState.isWaitingFeedback = true;

  const card = document.getElementById(`mc_card_${cardIdx}`);
  if (card) {
    card.classList.add('selected');
  }

  submitMultipleChoiceAnswer(optValue, cardIdx);
}

function submitMultipleChoiceAnswer(val, clickedCardIdx) {
  clearInterval(interactivePlayerState.timerInterval);
  const q = interactivePlayerState.questions[interactivePlayerState.currentIndex];
  if (!q) return;

  const given = (val || '').trim();
  const correct = (q.answer || '').trim();
  const isCorrect = given.toLowerCase() === correct.toLowerCase();

  if (isCorrect) interactivePlayerState.score++;
  interactivePlayerState.userResponses[q.id] = { given, correct, isCorrect };

  // Color-code the cards
  const cards = document.querySelectorAll('.iq-mc-card');
  cards.forEach(c => c.classList.add('disabled'));

  const correctIdx = (q.options || []).findIndex(opt => opt.trim().toLowerCase() === correct.toLowerCase());

  if (isCorrect) {
    if (clickedCardIdx != null && cards[clickedCardIdx]) {
      cards[clickedCardIdx].classList.add('mc-correct');
    }
  } else {
    if (clickedCardIdx != null && cards[clickedCardIdx]) {
      cards[clickedCardIdx].classList.add('mc-incorrect');
    }
    if (correctIdx !== -1 && cards[correctIdx]) {
      cards[correctIdx].classList.add('mc-correct');
    }
  }

  showAnswerFeedback({
    isCorrect,
    correctAnswerText: correct,
    sourceMaterialText: q.sourceFile || q.sourceMaterial,
    sourcePageText: q.sourcePage || null,
    lessonText: q.lesson,
    explanationText: q.explanation || null
  });
}

function showAnswerFeedback({ isCorrect, feedbackType, matchesCorrect, totalPairs, correctAnswerText, sourceMaterialText, sourcePageText, lessonText, explanationText }) {
  const isPartial = feedbackType === 'partial';
  const effectiveSuccess = isCorrect || isPartial;

  playInteractiveSFX(effectiveSuccess);
  if (isCorrect) {
    triggerConfettiBurst(70);
  } else if (isPartial) {
    triggerConfettiBurst(35);
  }

  const modal = document.getElementById('interactiveQuizModal');
  if (!modal) return;

  const existingDrawer = document.getElementById('iqFeedbackDrawer');
  if (existingDrawer) existingDrawer.remove();

  const cleanPageText = sourcePageText ? String(sourcePageText).replace(/^(page\s*)+/i, '').trim() : '';
  const pageBadge = cleanPageText ? ` · Page ${escHtml(cleanPageText)}` : '';

  const drawerClass = isCorrect ? 'is-correct' : (isPartial ? 'is-partial' : 'is-incorrect');
  const badgeClass = isCorrect ? 'correct' : (isPartial ? 'partial' : 'incorrect');
  const badgeText = isCorrect 
    ? '✔ Correct!' 
    : (isPartial ? `⚡ Partial Score: ${matchesCorrect}/${totalPairs} Correct (+${matchesCorrect} pt${matchesCorrect > 1 ? 's' : ''})` : '✖ Not quite!');

  let answerDetailsHtml = '';
  if (isCorrect) {
    answerDetailsHtml = `<div class="iq-fb-praise">Great job! You got this right. 🎉</div>`;
  } else if (isPartial) {
    answerDetailsHtml = `
      <div class="iq-fb-praise" style="color: #b45309;">Good effort! You earned points for each correct match. Check the board above for missed items.</div>
    `;
  } else {
    answerDetailsHtml = `
      <div class="iq-fb-answer-wrap">
        <span class="iq-fb-label">Correct Answer:</span>
        <strong class="iq-fb-val">${escHtml(correctAnswerText)}</strong>
      </div>
    `;
  }

  let explanationHtml = '';
  if (explanationText) {
    explanationHtml = `
      <div class="iq-fb-explanation-box" style="margin-top:8px;padding:8px 12px;background:rgba(255, 255, 255, 0.9);border-left:3px solid ${isCorrect ? '#10b981' : '#f59e0b'};border-radius:6px;font-size:12.5px;color:#1e293b;line-height:1.45;text-align:left;">
        <span style="font-weight:700;color:${isCorrect ? '#047857' : '#b45309'};margin-right:4px;">💡 Why:</span>
        <span>${escHtml(explanationText)}</span>
      </div>
    `;
  }

  const drawer = document.createElement('div');
  drawer.id = 'iqFeedbackDrawer';
  drawer.className = `iq-feedback-drawer ${drawerClass}`;
  drawer.innerHTML = `
    <div class="iq-fb-content">
      <div class="iq-fb-header">
        <div class="iq-fb-badge ${badgeClass}">
          ${badgeText}
        </div>
        ${answerDetailsHtml}
        ${explanationHtml}
      </div>

      <div class="iq-fb-source">
        <div class="iq-fb-source-hdr">
          <span class="iq-fb-source-icon">📍</span>
          <span class="iq-fb-source-label">Where to find this in your handouts:</span>
        </div>
        <div class="iq-fb-source-details">
          <span class="iq-fb-source-file">📄 <strong>${escHtml(sourceMaterialText || 'Class Handout')}</strong></span>
          ${cleanPageText ? `<span class="iq-fb-source-page">📑 Page <strong>${escHtml(cleanPageText)}</strong></span>` : ''}
          ${lessonText ? `<span class="iq-fb-lesson">(${escHtml(lessonText)})</span>` : ''}
        </div>
        <div class="iq-fb-source-hint">
          Open <strong>${escHtml(sourceMaterialText || 'your handout')}</strong>${cleanPageText ? ` to <strong>Page ${escHtml(cleanPageText)}</strong>` : ''} to navigate and review this topic.
        </div>
      </div>
    </div>

    <button class="iq-continue-btn" onclick="handleFeedbackContinue()">
      <span>Continue</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </button>
  `;

  modal.appendChild(drawer);
  setTimeout(() => drawer.classList.add('active'), 40);
}

function handleFeedbackContinue() {
  const drawer = document.getElementById('iqFeedbackDrawer');
  if (drawer) {
    drawer.classList.remove('active');
    setTimeout(() => drawer.remove(), 250);
  }
  advanceToNextQuestion();
}

/**
 * Advance to next question or complete
 */
function advanceToNextQuestion() {
  lastActiveTimerIndex = -1;
  interactivePlayerState.isWaitingFeedback = false;
  interactivePlayerState.matchingEvaluated = false;
  interactivePlayerState.matchingFeedback = null;
  interactivePlayerState.lastMatchingPointsEarned = 0;
  interactivePlayerState.matchingSelections = {};
  interactivePlayerState.selectedMatchingChoice = null;
  closeInteractiveHandoutModal();
  interactivePlayerState.currentIndex++;
  if (interactivePlayerState.currentIndex >= interactivePlayerState.questions.length) {
    interactivePlayerState.isSubmitted = true;
    finishInteractiveQuiz();
  } else {
    renderCurrentInteractiveQuestion();
  }
}

/**
 * Complete & persist results
 */
async function finishInteractiveQuiz() {
  stopInteractiveBGM();
  clearInterval(interactivePlayerState.timerInterval);
  const { quiz, score, totalItems, startTime } = interactivePlayerState;

  const elapsedMs = Date.now() - (startTime || Date.now());
  const totalSeconds = Math.max(1, Math.round(elapsedMs / 1000));
  interactivePlayerState.elapsedSeconds = totalSeconds;

  // Format graded answers for database attempt history
  const gradedAnswers = Object.keys(interactivePlayerState.userResponses).map(key => {
    const item = interactivePlayerState.userResponses[key];
    return {
      itemId: key,
      label: item.label || '',
      given: item.given,
      correct: item.correct,
      isCorrect: item.isCorrect
    };
  });

  // Save attempt to localStorage and Supabase (only if not preview)
  if (!quiz.is_preview) {
    try {
      const attemptObj = {
        id: 'att_' + Date.now(),
        quiz_id: quiz.id,
        quiz_title: quiz.title || 'Interactive Quiz',
        student_id: CURRENT_PROFILE?.id || 'demo_user',
        student_name: CURRENT_PROFILE?.full_name || 'Teacher / Tester',
        score: score,
        total_items: totalItems,
        submitted_at: new Date().toISOString(),
        answers: gradedAnswers
      };
      const rawAtt = localStorage.getItem('scholaria_all_attempts_v1');
      const listAtt = rawAtt ? JSON.parse(rawAtt) : [];
      listAtt.unshift(attemptObj);
      localStorage.setItem('scholaria_all_attempts_v1', JSON.stringify(listAtt));

      const rawCR = localStorage.getItem('scholaria_class_records_v2');
      const listCR = rawCR ? JSON.parse(rawCR) : [];
      listCR.unshift(attemptObj);
      localStorage.setItem('scholaria_class_records_v2', JSON.stringify(listCR));
    } catch (e) {}

    // Sync with Supabase (class_records + quiz_attempts)
    try {
      if (typeof db !== 'undefined' && db && CURRENT_PROFILE) {
        await db.from('class_records').insert({
          student_id: String(CURRENT_PROFILE.id || CURRENT_PROFILE.school_id || 'seed_stud_1'),
          student_name: CURRENT_PROFILE.full_name || 'Student',
          section: CURRENT_PROFILE.section || 'Section A',
          subject: quiz.subject || CURRENT_PROFILE.strand || 'General',
          strand: CURRENT_PROFILE.strand || 'STEM',
          quiz_id: String(quiz.id),
          quiz_title: quiz.title || 'Interactive Quiz',
          score,
          total_items: totalItems,
          score_percentage: totalItems ? Math.round((score / totalItems) * 100) : 0
        });

        await db.from('quiz_attempts').insert({
          quiz_id: quiz.id,
          quiz_title: quiz.title || 'Interactive Quiz',
          student_id: CURRENT_PROFILE.id,
          student_name: CURRENT_PROFILE.full_name,
          score,
          total_items: totalItems,
          answers: gradedAnswers
        });
      }
    } catch (err) {
      console.warn('Interactive quiz attempt sync notice:', err);
    }
  }

  renderCompletedInteractiveScreen();

  if (typeof loadMyAttemptsFromDB === 'function') {
    await loadMyAttemptsFromDB();
  }
  if (typeof loadClassRecAttempts === 'function') {
    await loadClassRecAttempts(true);
  }
}

/**
 * View 4: Completed Screen (Trophy, Radial Score Ring, Stats)
 */
function renderCompletedInteractiveScreen() {
  const modal = document.getElementById('interactiveQuizModal');
  if (!modal) return;

  const { score, totalItems, elapsedSeconds } = interactivePlayerState;
  const incorrectCount = Math.max(0, totalItems - score);

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timeFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const pct = totalItems > 0 ? Math.round((score / totalItems) * 100) : 0;
  const circumference = 2 * Math.PI * 45; // r = 45
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  let feedbackTitle = "Well done!";
  let feedbackText = "You're doing great. Keep up the good work!";
  if (pct === 100) {
    feedbackTitle = "Perfect Score!";
    feedbackText = "Flawless performance! You've mastered this material.";
  } else if (pct < 60) {
    feedbackTitle = "Good Effort!";
    feedbackText = "You can always review the learning material and try again to improve.";
  }

  if (pct >= 50) {
    setTimeout(() => {
      triggerConfettiBurst(110);
    }, 250);
  }

  modal.innerHTML = `
    <!-- Background Decor -->
    <div class="iq-bg-decor">
      <div class="iq-bg-wave-1"></div>
      <div class="iq-bg-wave-2"></div>
    </div>

    <!-- Header -->
    <div class="iq-header">
      <div class="iq-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        <span>Scholaria</span>
      </div>
      <div class="iq-header-actions">
        <button class="iq-btn-icon" title="Exit" onclick="closeInteractiveQuiz(false)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- Results Card -->
    <div class="iq-body">
      <div class="iq-completed-card">
        <div class="iq-trophy-wrap">
          <svg class="iq-trophy-img" viewBox="0 0 100 100" fill="none">
            <!-- Trophy cup illustration -->
            <circle cx="50" cy="50" r="38" fill="#e0f2fe" opacity="0.6"/>
            <path d="M32 30 H68 V50 C68 60 60 68 50 68 C40 68 32 60 32 50 Z" fill="#facc15" stroke="#ca8a04" stroke-width="3"/>
            <path d="M42 68 H58 V78 H42 Z" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
            <path d="M35 78 H65 V84 H35 Z" fill="#ca8a04" rx="2"/>
            <!-- Handles -->
            <path d="M32 36 C24 36 22 46 32 52" stroke="#ca8a04" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M68 36 C76 36 78 46 68 52" stroke="#ca8a04" stroke-width="3" fill="none" stroke-linecap="round"/>
            <!-- Star inside trophy -->
            <polygon points="50,38 53,46 61,46 55,51 57,59 50,54 43,59 45,51 39,46 47,46" fill="#ffffff"/>
            <!-- Sparkles -->
            <circle cx="22" cy="24" r="3" fill="#facc15"/>
            <circle cx="78" cy="24" r="2.5" fill="#38bdf8"/>
            <circle cx="82" cy="48" r="3" fill="#facc15"/>
          </svg>
        </div>

        <h2>Quiz Completed!</h2>
        <p class="iq-comp-sub">Great job! You've finished the quiz.<br>Here's how you did:</p>

        <div class="iq-results-box">
          <div class="iq-radial-wrap">
            <svg class="iq-radial-svg" viewBox="0 0 100 100">
              <circle class="iq-radial-bg" cx="50" cy="50" r="45"/>
              <circle class="iq-radial-fg" cx="50" cy="50" r="45" style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset};"/>
            </svg>
            <div class="iq-radial-text">
              <div class="iq-radial-score">${score}/${totalItems}</div>
              <div class="iq-radial-label">Correct</div>
            </div>
          </div>

          <div class="iq-stats-list">
            <div class="iq-stat-item">
              <div class="iq-stat-icon correct">✔</div>
              <span>Correct Answers</span>
              <strong>${score}</strong>
            </div>
            <div class="iq-stat-item">
              <div class="iq-stat-icon incorrect">✖</div>
              <span>Incorrect Answers</span>
              <strong>${incorrectCount}</strong>
            </div>
            <div class="iq-stat-item">
              <div class="iq-stat-icon time">⏱</div>
              <span>Time Taken</span>
              <strong>${timeFormatted}</strong>
            </div>
          </div>
        </div>

        <div class="iq-feedback-box">
          <div class="iq-feedback-icon">💡</div>
          <div class="iq-feedback-text">
            <h4>${feedbackTitle}</h4>
            <p>${feedbackText}</p>
          </div>
        </div>

        <!-- Question Review & Handout Navigation Guide -->
        <div class="iq-study-guide-wrap">
          <div class="iq-study-guide-head">
            <h3>📖 Question Review & Handout Navigation</h3>
            <p>Review every question and navigate to the exact handout and page to study:</p>
          </div>
          <div class="iq-study-guide-list">
            ${interactivePlayerState.questions.map((q, qIdx) => {
              const resp = interactivePlayerState.userResponses[q.id] || {};
              const isRight = resp.isCorrect;
              const docName = q.sourceFile || q.sourceMaterial || 'Handout Material';
              const cleanP = q.sourcePage ? String(q.sourcePage).replace(/^(page\s*)+/i, '').trim() : '';
              return `
                <div class="iq-study-card ${isRight ? 'is-correct' : 'is-incorrect'}">
                  <div class="iq-study-card-top">
                    <span class="iq-study-num">Question ${qIdx + 1}</span>
                    <span class="iq-study-badge ${isRight ? 'correct' : 'incorrect'}">${isRight ? '✔ Correct' : '✖ Review Needed'}</span>
                    <div class="iq-study-citation">
                      <span class="iq-study-file">📄 ${escHtml(docName)}</span>
                      ${cleanP ? `<span class="iq-study-page">📑 Page ${escHtml(cleanP)}</span>` : ''}
                    </div>
                  </div>
                  <div class="iq-study-qtext">${escHtml(q.question || q.label || 'Question Item')}</div>
                  <div class="iq-study-answer-row">
                    <span class="iq-study-ans-label">Correct Answer:</span>
                    <strong class="iq-study-ans-val">${escHtml(String(q.answer || resp.correct || ''))}</strong>
                    ${!isRight && resp.given ? `<span class="iq-study-given">(Your answer: ${escHtml(String(resp.given))})</span>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <button class="iq-home-btn" onclick="closeInteractiveQuiz(false); if(typeof renderPage==='function') renderPage(currentPage);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  `;
}
