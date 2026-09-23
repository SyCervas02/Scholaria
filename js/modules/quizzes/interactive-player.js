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
  isWaitingFeedback: false
};

let interactiveBGM = null;
let interactiveMusicMuted = false;
let sfxCorrect = null;
let sfxWrong = null;

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

  const timerVal = typeof quiz.timerPerQuestion === 'number' 
    ? quiz.timerPerQuestion 
    : (typeof quiz.questions?.[0]?._meta?.timerPerQuestion === 'number' ? quiz.questions[0]._meta.timerPerQuestion : 0);

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
    isSubmitted: false
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

/**
 * Starts countdown timer for the current question
 */
function startQuestionTimer() {
  clearInterval(interactivePlayerState.timerInterval);
  if (interactivePlayerState.timerPerQuestion <= 0) return;

  interactivePlayerState.timerSecondsLeft = interactivePlayerState.timerPerQuestion;
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
  timerEl.textContent = `⏱️ ${interactivePlayerState.timerSecondsLeft}s`;
  if (interactivePlayerState.timerSecondsLeft <= 5) {
    timerEl.classList.add('warning');
  } else {
    timerEl.classList.remove('warning');
  }
}

function handleQuestionTimeout() {
  const curQ = interactivePlayerState.questions[interactivePlayerState.currentIndex];
  if (!curQ) return;

  if (curQ.type === 'multiple_choice') {
    submitMultipleChoiceAnswer(null);
  } else if (curQ.type === 'identification') {
    submitIdentificationAnswer('');
  } else if (curQ.type === 'matching') {
    submitMatchingAnswer();
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
      <div style="text-align: center; margin-bottom: 8px;">
        <span class="iq-progress-badge">
          ${currentIndex + 1} / ${questions.length}
          ${interactivePlayerState.timerPerQuestion > 0 ? `<span class="iq-timer-indicator" id="iqTimerDisplay">⏱️ ${interactivePlayerState.timerSecondsLeft}s</span>` : ''}
        </span>
      </div>
      ${questionBodyHTML}
    </div>

    <!-- Student Badge (Bottom Left) -->
    <div class="iq-student-badge">
      <div class="iq-student-avatar">${studentInitial}</div>
      <span>${escHtml(studentName)}</span>
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
      <div class="iq-id-tag">
        <span class="iq-id-tag-icon">★</span>
        <span>Identification</span>
      </div>

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
  const isCorrect = given.toLowerCase() === correct.toLowerCase();

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
    sourceMaterialText: q.sourceMaterial,
    lessonText: q.lesson
  });
}

/**
 * View 2: Matching Type (Drag and Drop / Tap to Pair)
 */
function renderMatchingView(q) {
  const selections = interactivePlayerState.matchingSelections;
  const usedKeys = Object.values(selections);

  const colorClasses = ['color-a', 'color-b', 'color-c', 'color-d', 'color-e'];
  const numClasses = ['num-1', 'num-2', 'num-3', 'num-4', 'num-5'];
  const borderClasses = ['border-1', 'border-2', 'border-3', 'border-4', 'border-5'];

  return `
    <div class="iq-match-container">
      <!-- Left Column: Choices -->
      <div class="iq-match-left">
        <div class="iq-match-left-head">
          <div class="iq-match-left-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <div>
            <h4>Choices</h4>
            <p>Match the correct answer to each question.</p>
          </div>
        </div>

        <div class="iq-choices-list" id="iqChoicesContainer">
          ${q.choices.map((c, i) => {
            const isUsed = usedKeys.includes(c.key);
            const isSelected = interactivePlayerState.selectedMatchingChoice === c.key;
            const col = colorClasses[i % colorClasses.length];
            return `
              <div class="iq-choice-pill ${col} ${isUsed ? 'used' : ''} ${isSelected ? 'selected' : ''}" 
                   id="choice_pill_${c.key}"
                   draggable="${!isUsed}" 
                   ondragstart="handleChoiceDragStart(event, '${c.key}')"
                   onclick="handleChoiceTap('${c.key}')">
                <span class="iq-choice-badge">${c.key}</span>
                <span>${escHtml(c.text)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Right Column: Prompts -->
      <div class="iq-match-right">
        ${q.pairs.map((p, i) => {
          const assignedKey = selections[i];
          const assignedChoice = assignedKey ? q.choices.find(c => c.key === assignedKey) : null;
          const choiceIndex = assignedChoice ? q.choices.indexOf(assignedChoice) : 0;
          const assignedCol = colorClasses[choiceIndex % colorClasses.length];

          return `
            <div class="iq-prompt-row ${borderClasses[i % borderClasses.length]}">
              <div class="iq-prompt-left">
                <div class="iq-prompt-num ${numClasses[i % numClasses.length]}">${i + 1}</div>
                <div class="iq-prompt-text">${escHtml(p.left)}</div>
              </div>
              <div class="iq-drop-target ${assignedChoice ? 'filled' : ''}" 
                   id="drop_target_${i}"
                   ondragover="handleDropOver(event)"
                   ondrop="handleChoiceDrop(event, ${i})"
                   onclick="handleTargetTap(${i})">
                ${assignedChoice ? `
                  <div class="iq-choice-pill ${assignedCol}" style="width: 100%; border: none; cursor: pointer;" title="Click to remove">
                    <span class="iq-choice-badge" style="width:24px;height:24px;font-size:11px;">${assignedChoice.key}</span>
                    <span style="font-size:12.5px;">${escHtml(assignedChoice.text)}</span>
                  </div>
                ` : `Drag your answer here`}
              </div>
            </div>
          `;
        }).join('')}

        <div class="iq-submit-btn-wrap" style="margin-top: 12px;">
          <button class="iq-submit-btn" onclick="submitMatchingAnswer()">
            <span>Submit Matches</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function handleChoiceDragStart(e, key) {
  e.dataTransfer.setData('text/plain', key);
}

function handleDropOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('hovered');
}

function handleChoiceDrop(e, targetIdx) {
  e.preventDefault();
  e.currentTarget.classList.remove('hovered');
  const key = e.dataTransfer.getData('text/plain');
  if (!key) return;

  assignMatchingChoice(targetIdx, key);
}

function handleChoiceTap(key) {
  const selections = interactivePlayerState.matchingSelections;
  if (Object.values(selections).includes(key)) return;

  if (interactivePlayerState.selectedMatchingChoice === key) {
    interactivePlayerState.selectedMatchingChoice = null;
  } else {
    interactivePlayerState.selectedMatchingChoice = key;
  }
  renderCurrentInteractiveQuestion();
}

function handleTargetTap(targetIdx) {
  if (interactivePlayerState.matchingSelections[targetIdx]) {
    // Clicked an already filled target -> clear it!
    delete interactivePlayerState.matchingSelections[targetIdx];
    interactivePlayerState.selectedMatchingChoice = null;
    renderCurrentInteractiveQuestion();
    return;
  }

  if (interactivePlayerState.selectedMatchingChoice) {
    assignMatchingChoice(targetIdx, interactivePlayerState.selectedMatchingChoice);
  }
}

function assignMatchingChoice(targetIdx, key) {
  // Remove if previously assigned elsewhere
  for (const idx in interactivePlayerState.matchingSelections) {
    if (interactivePlayerState.matchingSelections[idx] === key) {
      delete interactivePlayerState.matchingSelections[idx];
    }
  }

  interactivePlayerState.matchingSelections[targetIdx] = key;
  interactivePlayerState.selectedMatchingChoice = null;
  renderCurrentInteractiveQuestion();
}

function submitMatchingAnswer() {
  if (interactivePlayerState.isWaitingFeedback) return;
  interactivePlayerState.isWaitingFeedback = true;

  clearInterval(interactivePlayerState.timerInterval);
  const q = interactivePlayerState.questions[interactivePlayerState.currentIndex];
  if (!q) return;

  const selections = interactivePlayerState.matchingSelections;
  let matchesCorrect = 0;
  const pairDetails = [];

  (q.pairs || []).forEach((pair, pi) => {
    const assignedKey = selections[pi];
    const assignedChoice = assignedKey ? q.choices.find(c => c.key === assignedKey) : null;
    const givenText = assignedChoice ? assignedChoice.text : '';
    const correctText = pair.right;
    const isCorrect = givenText.trim().toLowerCase() === correctText.trim().toLowerCase();

    if (isCorrect) {
      interactivePlayerState.score++;
      matchesCorrect++;
    }
    pairDetails.push(`${pair.left} ➔ ${pair.right}`);

    interactivePlayerState.userResponses[`${q.id}_${pi}`] = {
      label: pair.left,
      given: givenText,
      correct: correctText,
      isCorrect
    };
  });

  const totalPairs = (q.pairs || []).length;
  const isAllCorrect = matchesCorrect === totalPairs;

  interactivePlayerState.matchingSelections = {};
  interactivePlayerState.selectedMatchingChoice = null;

  showAnswerFeedback({
    isCorrect: isAllCorrect,
    correctAnswerText: `${matchesCorrect}/${totalPairs} Pairs Matched. Key: ${pairDetails.slice(0, 3).join(' | ')}${pairDetails.length > 3 ? '...' : ''}`,
    sourceMaterialText: q.sourceMaterial,
    lessonText: q.lesson
  });
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
    lessonText: q.lesson
  });
}

function showAnswerFeedback({ isCorrect, correctAnswerText, sourceMaterialText, sourcePageText, lessonText }) {
  playInteractiveSFX(isCorrect);
  if (isCorrect) {
    triggerConfettiBurst(70);
  }

  const modal = document.getElementById('interactiveQuizModal');
  if (!modal) return;

  const existingDrawer = document.getElementById('iqFeedbackDrawer');
  if (existingDrawer) existingDrawer.remove();

  const cleanPageText = sourcePageText ? String(sourcePageText).replace(/^(page\s*)+/i, '').trim() : '';
  const pageBadge = cleanPageText ? ` · Page ${escHtml(cleanPageText)}` : '';

  const drawer = document.createElement('div');
  drawer.id = 'iqFeedbackDrawer';
  drawer.className = `iq-feedback-drawer ${isCorrect ? 'is-correct' : 'is-incorrect'}`;
  drawer.innerHTML = `
    <div class="iq-fb-content">
      <div class="iq-fb-header">
        <div class="iq-fb-badge ${isCorrect ? 'correct' : 'incorrect'}">
          ${isCorrect ? '✔ Correct!' : '✖ Not quite!'}
        </div>
        ${!isCorrect ? `
          <div class="iq-fb-answer-wrap">
            <span class="iq-fb-label">Correct Answer:</span>
            <strong class="iq-fb-val">${escHtml(correctAnswerText)}</strong>
          </div>
        ` : `
          <div class="iq-fb-praise">Great job! You got this right. 🎉</div>
        `}
      </div>

      <div class="iq-fb-source">
        <span class="iq-fb-source-icon">📖</span>
        <div class="iq-fb-source-info">
          <span class="iq-fb-source-label">Source Handout:</span>
          <span class="iq-fb-source-title">${escHtml(sourceMaterialText || 'Class Handout')}${pageBadge}</span>
          ${lessonText ? `<span class="iq-fb-lesson">(${escHtml(lessonText)})</span>` : ''}
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

  // Save attempt to localStorage
  try {
    const attemptObj = {
      id: 'att_' + Date.now(),
      quiz_id: quiz.id,
      quiz_title: quiz.title || 'Interactive Quiz',
      student_id: CURRENT_PROFILE.id,
      student_name: CURRENT_PROFILE.full_name,
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
    if (typeof db !== 'undefined' && db) {
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
