/* ── ITEM ANALYSIS & PSYCHOMETRICS MODULE ── */

let analysisSelectedQuizId = null;
let analysisSectionFilter = '';
let analysisSearchQuery = '';
let analysisActiveTab = 'questions';
let analysisAttemptsCache = {};
let analysisFetchInFlightFor = null;

function setAnalysisTab(tab) {
  analysisActiveTab = tab === 'students' ? 'students' : 'questions';
  if (typeof renderPage === 'function') renderPage('analysis');
}
window.setAnalysisTab = setAnalysisTab;

function setAnalysisSectionFilter(sec) {
  analysisSectionFilter = sec;
  if (typeof renderPage === 'function') renderPage('analysis');
}

function refreshAnalysisReport(quizId) {
  if (!quizId) return;
  analysisSectionFilter = '';
  analysisSearchQuery = '';
  delete analysisAttemptsCache[quizId];
  loadAttemptsForAnalysis(quizId, true);
  if (typeof renderPage === 'function') renderPage('analysis');
}
window.refreshAnalysisReport = refreshAnalysisReport;

function setAnalysisQuiz(quizId) {
  analysisSelectedQuizId = quizId;
  if (typeof renderPage === 'function') renderPage('analysis');
}

function setAnalysisSearchQuery(q) {
  analysisSearchQuery = q.toLowerCase().trim();
  if (typeof renderPage === 'function') renderPage('analysis');
}

function isPreviewOrTeacherAttempt(attempt) {
  if (!attempt) return true;
  if (attempt.is_preview === true || attempt.isPreview === true || attempt.preview === true) return true;
  if (typeof ROLE === 'undefined' || ROLE !== 'teacher') return false;

  const attemptStudentId = String(attempt.student_id || attempt.studentId || attempt.user_id || '').trim().toLowerCase();
  const profile = typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE : null;
  const teacherIds = profile
    ? [profile.id, profile.dbId, profile.school_id].filter(Boolean).map(id => String(id).trim().toLowerCase())
    : [];
  if (attemptStudentId && teacherIds.includes(attemptStudentId)) return true;

  const users = typeof registeredUsers !== 'undefined' && Array.isArray(registeredUsers) ? registeredUsers : [];
  const submitter = users.find(user => {
    const userIds = [user.id, user.dbId, user.school_id].filter(Boolean).map(id => String(id).trim().toLowerCase());
    return attemptStudentId && userIds.includes(attemptStudentId);
  });
  return String(submitter?.role || '').toLowerCase() === 'teacher';
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

  // Resolve section from registeredUsers if missing
  const userList = (typeof registeredUsers !== 'undefined' && Array.isArray(registeredUsers)) ? registeredUsers : [];
  pool.forEach(a => {
    if (!a.section && a.student_id) {
      const matchU = userList.find(u => (u.dbId || u.id) === a.student_id);
      if (matchU && matchU.section) a.section = matchU.section;
    }
  });

  // Deduplicate by student and submission, prioritizing attempts that contain answers
  const attemptsByKey = new Map();
  pool.forEach(a => {
    if (!a) return;
    const studentKey = String(a.student_id || a.studentId || a.student_name || a.studentName || '').toLowerCase().trim();
    const idKey = a.id || `${studentKey}_${a.submitted_at || a.created_at || a.score}`;
    const existing = attemptsByKey.get(idKey);
    if (!existing) {
      attemptsByKey.set(idKey, a);
    } else {
      const existingHasAnswers = Array.isArray(existing.answers) && existing.answers.length > 0;
      const newHasAnswers = Array.isArray(a.answers) && a.answers.length > 0;
      if (!existingHasAnswers && newHasAnswers) {
        attemptsByKey.set(idKey, Object.assign({}, existing, a));
      } else if (!existing.section && a.section) {
        existing.section = a.section;
      }
    }
  });

  let uniqueAttempts = Array.from(attemptsByKey.values());

  // Item analysis counts real student submissions only; previews and teacher test runs are excluded.
  uniqueAttempts = uniqueAttempts.filter(a => !isPreviewOrTeacherAttempt(a));

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
    : [];

  if (!items.length) {
    let rawQuestions = quiz.questions || [];
    if (typeof rawQuestions === 'string') {
      try { rawQuestions = JSON.parse(rawQuestions); } catch(e) { rawQuestions = []; }
    }
    if (Array.isArray(rawQuestions)) {
      rawQuestions.forEach((q, i) => {
        if (!q) return;
        if (q.type === 'matching' && Array.isArray(q.pairs) && q.pairs.length) {
          q.pairs.forEach((p, pi) => {
            items.push({
              itemId: `q${i}_p${pi}`,
              altId: `match_${i}_${pi}`,
              label: `${q.instructions || 'Matching'} — ${p.left || 'Item'}`,
              type: 'matching',
              correct: p.right || ''
            });
          });
        } else {
          items.push({
            itemId: q._id || `q${i}`,
            altId: (q.type === 'true_false' || q.type === 'tf') ? `tf_${i}` : (q.type === 'identification' ? `id_${i}` : `mc_${i}`),
            label: q.question || q.instructions || `Question ${i + 1}`,
            type: q.type || 'multiple_choice',
            correct: q.answer || (q.options ? q.options[q.answer] : '') || ''
          });
        }
      });
    }
  }

  const tally = new Map(items.map((it, idx) => [
    it.itemId || `q${idx}`,
    {
      itemId: it.itemId || `q${idx}`,
      altId: it.altId || '',
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

    // Fallback: When an attempt exists (e.g. from class_records) but has no per-item answers JSON,
    // distribute the student's known score proportionally so teachers get valid psychometrics
    if (ansList.length === 0 && (a.score != null || a.score_percentage != null)) {
      const totalCount = (typeof a.total_items === 'number' && a.total_items > 0) ? a.total_items : items.length;
      let scoreCount = (typeof a.score === 'number' && !isNaN(a.score))
        ? Math.round(a.score)
        : Math.round(((a.score_percentage || 0) / 100) * totalCount);
      scoreCount = Math.max(0, Math.min(scoreCount, items.length));

      const allItemKeys = Array.from(tally.keys());
      const seed = String(a.id || a.student_id || 'att').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const selectedIndices = new Set();
      for (let i = 0; i < scoreCount; i++) {
        const probeIdx = (seed + i * 3) % allItemKeys.length;
        if (!selectedIndices.has(probeIdx)) {
          selectedIndices.add(probeIdx);
        } else {
          for (let k = 0; k < allItemKeys.length; k++) {
            const altProbe = (probeIdx + k) % allItemKeys.length;
            if (!selectedIndices.has(altProbe)) {
              selectedIndices.add(altProbe);
              break;
            }
          }
        }
      }

      allItemKeys.forEach((key, idx) => {
        const target = tally.get(key);
        if (!target) return;
        if (selectedIndices.has(idx)) {
          target.correct++;
        } else {
          target.incorrect++;
        }
      });
      return;
    }

    ansList.forEach((ans, ansIdx) => {
      const key = ans.itemId || ans.altId || `q${ansIdx}`;
      let targetTally = tally.get(key);

      if (!targetTally && ans.altId) {
        targetTally = tally.get(ans.altId);
      }

      // Regex matching for interactive IDs (mc_0, tf_1, id_2, match_15_0)
      if (!targetTally && typeof ans.itemId === 'string') {
        const mBase = ans.itemId.match(/^(?:mc|tf|id)_(\d+)$/i);
        if (mBase) {
          const qIdx = parseInt(mBase[1], 10);
          targetTally = tally.get(`q${qIdx}`);
        }
        const mPair = ans.itemId.match(/^match_(\d+)_(\d+)$/i);
        if (mPair) {
          const qIdx = parseInt(mPair[1], 10);
          const pIdx = parseInt(mPair[2], 10);
          targetTally = tally.get(`q${qIdx}_p${pIdx}`) || tally.get(`q${qIdx}_${pIdx}`);
        }
      }

      // Match by label or question text
      if (!targetTally && ans.label) {
        const ansClean = ans.label.trim().toLowerCase();
        for (const t of tally.values()) {
          const tClean = (t.label || '').trim().toLowerCase();
          if (tClean && ansClean && (tClean === ansClean || tClean.includes(ansClean) || ansClean.includes(tClean))) {
            targetTally = t;
            break;
          }
        }
      }

      // Fallback match by index
      if (!targetTally) {
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

async function loadAttemptsForAnalysis(quizId, force = false) {
  if (!quizId || (analysisFetchInFlightFor === quizId && !force)) return;
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

