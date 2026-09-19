/* ── ITEM ANALYSIS & PSYCHOMETRICS MODULE ── */

let analysisSelectedQuizId = null;
let analysisSectionFilter = '';
let analysisSearchQuery = '';
let analysisAttemptsCache = {};
let analysisFetchInFlightFor = null;

function setAnalysisSectionFilter(sec) {
  analysisSectionFilter = sec;
  if (typeof renderPage === 'function') renderPage('analysis');
}

function setAnalysisQuiz(quizId) {
  analysisSelectedQuizId = quizId;
  if (typeof renderPage === 'function') renderPage('analysis');
}

function setAnalysisSearchQuery(q) {
  analysisSearchQuery = q.toLowerCase().trim();
  if (typeof renderPage === 'function') renderPage('analysis');
}

function getAttemptsForAnalysis(quizId, secFilter = '') {
  if (!quizId) return [];
  const customQList = typeof customQuizzes !== 'undefined' ? customQuizzes : [];
  const targetQuiz = customQList.find(q => String(q.id) === String(quizId));
  const targetTitle = targetQuiz ? String(targetQuiz.title || '').toLowerCase().trim() : '';

  const pool = [];

  // 1. Attempts fetched directly from DB cache
  if (analysisAttemptsCache[quizId] && Array.isArray(analysisAttemptsCache[quizId])) {
    analysisAttemptsCache[quizId].forEach(a => pool.push(a));
  }

  // 2. Attempts from global pool (class records, student history, localStorage)
  if (typeof getAllRecordedAttempts === 'function') {
    const all = getAllRecordedAttempts();
    all.forEach(a => {
      const matchId = String(a.quiz_id || a.quizId || '').toLowerCase() === String(quizId).toLowerCase();
      const matchTitle = targetTitle && String(a.quiz_title || a.quizTitle || '').toLowerCase().trim() === targetTitle;
      if (matchId || matchTitle) pool.push(a);
    });
  }

  // Deduplicate by ID
  const seen = new Set();
  let uniqueAttempts = [];
  pool.forEach(a => {
    const idKey = a.id || `${a.student_id || a.studentId}_${a.submitted_at || a.created_at || a.score}`;
    if (!seen.has(idKey)) {
      seen.add(idKey);
      uniqueAttempts.push(a);
    }
  });

  // Filter by section if specified
  if (secFilter) {
    uniqueAttempts = uniqueAttempts.filter(a => {
      const sec = (a.section || '').trim().toLowerCase();
      return sec === secFilter.trim().toLowerCase();
    });
  }

  return uniqueAttempts;
}

function buildAnalysisRows(quiz, attempts) {
  if (!quiz) return [];
  const items = (typeof buildQuizItems === 'function')
    ? buildQuizItems(quiz)
    : (quiz.questions || []).map((q, i) => ({
        itemId: q._id || `q${i}`,
        label: q.question || q.instructions || `Question ${i + 1}`,
        type: q.type || 'multiple_choice',
        correct: q.answer || (q.options ? q.options[q.answer] : '') || ''
      }));

  if (!items.length && Array.isArray(quiz.questions)) {
    quiz.questions.forEach((q, i) => {
      items.push({
        itemId: q._id || `q${i}`,
        label: q.question || q.instructions || `Question ${i + 1}`,
        type: q.type || 'multiple_choice',
        correct: q.answer || (q.options ? q.options[q.answer] : '') || ''
      });
    });
  }

  const tally = new Map(items.map((it, idx) => [
    it.itemId || `q${idx}`,
    {
      itemId: it.itemId || `q${idx}`,
      label: it.label || `Question ${idx + 1}`,
      type: it.type || 'multiple_choice',
      correctAnswer: it.correct != null ? String(it.correct) : '—',
      correct: 0,
      incorrect: 0,
      index: idx
    }
  ]));

  (attempts || []).forEach(a => {
    const ansList = Array.isArray(a.answers) ? a.answers : [];
    ansList.forEach((ans, ansIdx) => {
      const key = ans.itemId || `q${ansIdx}`;
      let targetTally = tally.get(key);

      if (!targetTally) {
        // Match by label or question text
        for (const t of tally.values()) {
          if (t.label && ans.label && t.label.trim().toLowerCase() === ans.label.trim().toLowerCase()) {
            targetTally = t;
            break;
          }
        }
      }

      if (!targetTally) {
        // Fallback match by index
        const itemKeys = Array.from(tally.keys());
        if (ansIdx < itemKeys.length) {
          targetTally = tally.get(itemKeys[ansIdx]);
        }
      }

      if (targetTally) {
        if (ans.isCorrect) targetTally.correct++;
        else targetTally.incorrect++;
      }
    });
  });

  return Array.from(tally.values()).map(t => {
    const total = t.correct + t.incorrect;
    const pct = total ? Math.round((t.correct / total) * 100) : 0;
    let difficulty = 'Average';
    let diffColor = '#2563eb';
    let diffBadge = 'moderate';

    if (total === 0) {
      difficulty = 'No Data';
      diffColor = 'var(--text-muted)';
      diffBadge = 'pending';
    } else if (pct >= 80) {
      difficulty = 'Easy';
      diffColor = '#059669';
      diffBadge = 'done';
    } else if (pct < 50) {
      difficulty = 'Difficult';
      diffColor = '#dc2626';
      diffBadge = 'low';
    }

    return {
      itemId: t.itemId,
      label: t.label,
      type: t.type,
      correctAnswer: t.correctAnswer,
      correct: t.correct,
      incorrect: t.incorrect,
      totalResponses: total,
      pct,
      difficulty,
      diffColor,
      diffBadge
    };
  });
}

async function loadAttemptsForAnalysis(quizId) {
  if (!quizId || analysisFetchInFlightFor === quizId) return;
  analysisFetchInFlightFor = quizId;
  try {
    if (typeof db !== 'undefined' && db) {
      const { data, error } = await db.from('quiz_attempts').select('*').eq('quiz_id', quizId).order('submitted_at', { ascending: false });
      if (error) {
        console.warn('Failed to load attempts for analysis:', error.message);
        if (!analysisAttemptsCache[quizId]) analysisAttemptsCache[quizId] = [];
      } else {
        analysisAttemptsCache[quizId] = data || [];
      }
    }
  } catch (e) {
    console.warn('Failed to load attempts for analysis:', e.message);
    if (!analysisAttemptsCache[quizId]) analysisAttemptsCache[quizId] = [];
  } finally {
    if (analysisFetchInFlightFor === quizId) analysisFetchInFlightFor = null;
  }
  if (typeof currentPage !== 'undefined' && currentPage === 'analysis') {
    const mainContent = document.getElementById('mainContent');
    if (mainContent && typeof getPageContent === 'function') {
      mainContent.innerHTML = getPageContent(ROLE, 'analysis');
    }
  }
}

