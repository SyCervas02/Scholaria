/* ── ITEM ANALYSIS & PSYCHOMETRICS MODULE ── */

let analysisSelectedQuizId = null;
let analysisSectionFilter = '';
let analysisStudentSearchQuery = '';
let analysisScoreFilter = 'all'; // 'all' | 'passed' | 'failed'
let analysisActiveTab = 'questions'; // 'questions' | 'students'
let analysisQuestionSearchQuery = '';
let analysisAttemptsCache = {};
let analysisFetchInFlightFor = null;

function setAnalysisTab(tab) {
  analysisActiveTab = tab;
  if (typeof renderPage === 'function') renderPage('analysis');
}
window.setAnalysisTab = setAnalysisTab;

function setAnalysisSectionFilter(sec) {
  analysisSectionFilter = sec;
  if (typeof renderPage === 'function') renderPage('analysis');
}
window.setAnalysisSectionFilter = setAnalysisSectionFilter;

function setAnalysisQuiz(quizId) {
  analysisSelectedQuizId = quizId;
  if (typeof renderPage === 'function') renderPage('analysis');
}
window.setAnalysisQuiz = setAnalysisQuiz;

function setAnalysisStudentSearch(q) {
  analysisStudentSearchQuery = (q || '').toLowerCase().trim();
  if (typeof renderPage === 'function') renderPage('analysis');
}
window.setAnalysisStudentSearch = setAnalysisStudentSearch;

function setAnalysisScoreFilter(f) {
  analysisScoreFilter = f;
  if (typeof renderPage === 'function') renderPage('analysis');
}
window.setAnalysisScoreFilter = setAnalysisScoreFilter;

function setAnalysisQuestionSearch(q) {
  analysisQuestionSearchQuery = (q || '').toLowerCase().trim();
  if (typeof renderPage === 'function') renderPage('analysis');
}
window.setAnalysisQuestionSearch = setAnalysisQuestionSearch;

function getAttemptsForAnalysis(quizId, secFilter = '', studentSearch = '', scoreFilter = 'all') {
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

  // Resolve authentic student metadata from registeredUsers
  const userList = (typeof registeredUsers !== 'undefined' && Array.isArray(registeredUsers)) ? registeredUsers : [];
  pool.forEach(a => {
    const sid = String(a.student_id || a.studentId || a.user_id || '').toLowerCase().trim();
    const sname = String(a.student_name || a.studentName || '').toLowerCase().trim();

    const matchU = userList.find(u => {
      const uDbId = String(u.dbId || '').toLowerCase().trim();
      const uId = String(u.id || '').toLowerCase().trim();
      const uSchoolId = String(u.school_id || '').toLowerCase().trim();
      const uName = String(u.name || '').toLowerCase().trim();
      return (uDbId && uDbId === sid) ||
             (uId && uId === sid) ||
             (uSchoolId && uSchoolId === sid) ||
             (uName && (uName === sname || uName === sid));
    });

    if (matchU) {
      if (!a.student_name || a.student_name === 'Student') a.student_name = matchU.name || matchU.full_name;
      if (!a.student_school_id) a.student_school_id = matchU.school_id || matchU.id;
      if (!a.section || a.section === 'Unassigned') a.section = matchU.section || 'Unassigned';
      if (!a.strand) a.strand = matchU.strand || 'STEM';
    } else {
      if (!a.student_name) a.student_name = 'Student';
      if (!a.student_school_id) a.student_school_id = a.student_id || '—';
      if (!a.section) a.section = 'Unassigned';
      if (!a.strand) a.strand = 'General';
    }

    // Ensure valid bounded score percentages (0% - 100%)
    if (a.score_percentage !== undefined && a.score_percentage !== null && !isNaN(a.score_percentage)) {
      a.score_percentage = Math.min(100, Math.max(0, Math.round(Number(a.score_percentage))));
    } else if (a.total_items && a.total_items > 0 && a.score !== undefined && !isNaN(a.score)) {
      a.score_percentage = Math.min(100, Math.max(0, Math.round((Number(a.score) / Number(a.total_items)) * 100)));
    } else if (a.score !== undefined && !isNaN(a.score)) {
      a.score_percentage = Math.min(100, Math.max(0, Math.round(Number(a.score))));
    } else {
      a.score_percentage = 0;
    }
  });

  // Deduplicate by student and submission, prioritizing attempts that contain answers
  const attemptsByKey = new Map();
  pool.forEach(a => {
    if (!a) return;
    const studentKey = String(a.student_id || a.studentId || a.student_school_id || a.student_name || '').toLowerCase().trim();
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

  // Filter by section if specified
  if (secFilter) {
    uniqueAttempts = uniqueAttempts.filter(a => {
      const sec = (a.section || '').trim().toLowerCase();
      return sec === secFilter.trim().toLowerCase();
    });
  } else if (typeof ROLE !== 'undefined' && ROLE === 'teacher') {
    const teacherHandled = typeof getTeacherHandledSections === 'function'
      ? getTeacherHandledSections(typeof CURRENT_PROFILE !== 'undefined' ? CURRENT_PROFILE : null)
      : [];
    if (teacherHandled.length > 0) {
      uniqueAttempts = uniqueAttempts.filter(a => {
        const sec = (a.section || '').trim().toLowerCase();
        return teacherHandled.some(h => h.trim().toLowerCase() === sec);
      });
    }
  }

  // Filter by student search query if specified
  if (studentSearch) {
    const q = studentSearch.trim().toLowerCase();
    uniqueAttempts = uniqueAttempts.filter(a => {
      const name = (a.student_name || '').toLowerCase();
      const schoolId = (a.student_school_id || a.student_id || '').toLowerCase();
      const section = (a.section || '').toLowerCase();
      return name.includes(q) || schoolId.includes(q) || section.includes(q);
    });
  }

  // Filter by score status (passed >= 75% vs needs improvement < 75%)
  if (scoreFilter === 'passed') {
    uniqueAttempts = uniqueAttempts.filter(a => (a.score_percentage || 0) >= 75);
  } else if (scoreFilter === 'failed') {
    uniqueAttempts = uniqueAttempts.filter(a => (a.score_percentage || 0) < 75);
  }

  return uniqueAttempts;
}
window.getAttemptsForAnalysis = getAttemptsForAnalysis;

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
      correctStudents: [],
      incorrectStudents: [],
      index: idx
    }
  ]));

  (attempts || []).forEach(a => {
    const ansList = Array.isArray(a.answers) ? a.answers : [];
    if (!ansList.length) return; // Authentic data only: no artificial seeds or pseudo-random distribution

    const studentInfo = {
      id: a.id,
      name: a.student_name || 'Student',
      schoolId: a.student_school_id || a.student_id || '—',
      section: a.section || 'Unassigned',
      scorePct: a.score_percentage || 0
    };

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
        const studAns = ans.studentAnswer != null ? String(ans.studentAnswer) : (ans.given != null ? String(ans.given) : (ans.userAnswer != null ? String(ans.userAnswer) : '—'));
        if (ans.isCorrect) {
          targetTally.correct++;
          targetTally.correctStudents.push({ ...studentInfo, answer: studAns });
        } else {
          targetTally.incorrect++;
          targetTally.incorrectStudents.push({ ...studentInfo, answer: studAns });
        }
      }
    });
  });

  return Array.from(tally.values()).map(t => {
    const total = t.correct + t.incorrect;
    const pct = total ? Math.min(100, Math.max(0, Math.round((t.correct / total) * 100))) : 0;
    let difficulty = 'Average';
    let diffColor = '#2563eb';
    let diffBadge = 'moderate';

    if (total === 0) {
      difficulty = 'No Responses';
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
      diffBadge,
      correctStudents: t.correctStudents,
      incorrectStudents: t.incorrectStudents
    };
  });
}
window.buildAnalysisRows = buildAnalysisRows;

async function loadAttemptsForAnalysis(quizId) {
  if (!quizId || analysisFetchInFlightFor === quizId) return;
  analysisFetchInFlightFor = quizId;
  try {
    const customQList = typeof customQuizzes !== 'undefined' ? customQuizzes : [];
    const targetQuiz = customQList.find(q => String(q.id) === String(quizId));
    const targetTitle = targetQuiz ? String(targetQuiz.title || '').trim().toLowerCase() : '';

    let qaData = [];
    let crData = [];

    // 1. Supabase direct queries
    if (typeof db !== 'undefined' && db) {
      try {
        const { data, error } = await db.from('quiz_attempts').select('*').eq('quiz_id', quizId).order('submitted_at', { ascending: false });
        if (!error && Array.isArray(data)) qaData = data;
      } catch (err) {
        console.warn('quiz_attempts select notice:', err);
      }

      try {
        const { data: cData, error: cErr } = await db.from('class_records').select('*').order('submitted_at', { ascending: false });
        if (!cErr && Array.isArray(cData)) {
          crData = cData.filter(item =>
            String(item.quiz_id || '').toLowerCase() === String(quizId).toLowerCase() ||
            (targetTitle && String(item.quiz_title || '').trim().toLowerCase() === targetTitle)
          );
        }
      } catch (err) {
        console.warn('class_records select notice:', err);
      }
    }

    // 2. Backend service API query if available
    try {
      if (typeof API_BASE !== 'undefined' && typeof db !== 'undefined' && db.auth) {
        const { data: { session } } = await db.auth.getSession().catch(() => ({ data: {} }));
        if (session && session.access_token) {
          const apiRes = await fetch(`${API_BASE}/api/quiz-attempts/${quizId}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            if (apiJson && Array.isArray(apiJson.attempts)) {
              apiJson.attempts.forEach(att => {
                if (!qaData.some(existing => existing.id === att.id)) qaData.push(att);
              });
            }
          }
        }
      }
    } catch (_) {}

    // 3. Merge qaData (which has answers) with crData (which has student metadata)
    const attemptMap = new Map();

    qaData.forEach(item => {
      const sKey = String(item.student_id || item.user_id || item.id || '').toLowerCase().trim();
      attemptMap.set(sKey, Object.assign({}, item));
    });

    crData.forEach(item => {
      const sKey = String(item.student_id || item.user_id || '').toLowerCase().trim();
      if (attemptMap.has(sKey)) {
        const existing = attemptMap.get(sKey);
        attemptMap.set(sKey, Object.assign({}, item, existing, {
          student_name: item.student_name || existing.student_name,
          section: item.section || existing.section,
          strand: item.strand || existing.strand
        }));
      } else {
        attemptMap.set(sKey, Object.assign({}, item));
      }
    });

    // 4. Merge with local attempts
    if (typeof getAllRecordedAttempts === 'function') {
      const localAll = getAllRecordedAttempts();
      localAll.forEach(la => {
        const matchId = String(la.quiz_id || la.quizId || '').toLowerCase() === String(quizId).toLowerCase();
        const matchTitle = targetTitle && String(la.quiz_title || la.quizTitle || '').trim().toLowerCase() === targetTitle;
        if (matchId || matchTitle) {
          const sKey = String(la.student_id || la.studentId || la.student_name || '').toLowerCase().trim();
          if (attemptMap.has(sKey)) {
            const existing = attemptMap.get(sKey);
            if ((!existing.answers || !existing.answers.length) && (la.answers && la.answers.length)) {
              existing.answers = la.answers;
            }
            if (!existing.section && la.section) existing.section = la.section;
          } else {
            attemptMap.set(sKey, la);
          }
        }
      });
    }

    analysisAttemptsCache[quizId] = Array.from(attemptMap.values());
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
window.loadAttemptsForAnalysis = loadAttemptsForAnalysis;

/* ── STUDENT ATTEMPT INSPECTION MODAL ── */
function inspectStudentAttempt(attemptId) {
  const allAttempts = getAttemptsForAnalysis(analysisSelectedQuizId, '', '', 'all');
  const attempt = allAttempts.find(a => String(a.id) === String(attemptId) || String(a.student_id) === String(attemptId) || String(a.student_school_id) === String(attemptId));
  if (!attempt) {
    if (typeof showToast === 'function') showToast('Student submission details not found', 'warning');
    return;
  }

  const customQList = typeof customQuizzes !== 'undefined' ? customQuizzes : [];
  const targetQuiz = customQList.find(q => String(q.id) === String(analysisSelectedQuizId)) || {};

  let modal = document.getElementById('analysisStudentInspectModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'analysisStudentInspectModal';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '10000';
    document.body.appendChild(modal);
  }

  const answersList = Array.isArray(attempt.answers) ? attempt.answers : [];
  const dateStr = attempt.submitted_at
    ? new Date(attempt.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Recent Submission';

  const scorePct = Math.min(100, Math.max(0, attempt.score_percentage != null ? attempt.score_percentage : 0));
  const isPassing = scorePct >= 75;

  modal.innerHTML = `
    <div class="modal-card" style="max-width:680px;width:92%;max-height:88vh;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,0.22);padding:0;">
      <!-- Modal Header -->
      <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#93c5fd;font-weight:700;">Student Evaluation Breakdown</div>
          <h2 style="margin:2px 0 0 0;font-size:20px;font-weight:800;color:#ffffff;">${typeof escHtml === 'function' ? escHtml(attempt.student_name) : attempt.student_name}</h2>
          <div style="font-size:12.5px;color:#e0f2fe;margin-top:3px;">
            <span>School ID: <strong>${typeof escHtml === 'function' ? escHtml(attempt.student_school_id) : attempt.student_school_id}</strong></span> · 
            <span>Section: <strong>${typeof escHtml === 'function' ? escHtml(attempt.section) : attempt.section}</strong></span> · 
            <span>${typeof escHtml === 'function' ? escHtml(attempt.strand) : attempt.strand}</span>
          </div>
        </div>
        <button type="button" onclick="closeStudentAttemptInspectModal()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:10px;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;transition:background 0.15s;" title="Close Modal">✕</button>
      </div>

      <!-- Overview Score Strip -->
      <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Assessment Target</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;">${typeof escHtml === 'function' ? escHtml(targetQuiz.title || 'Quiz Assessment') : 'Quiz Assessment'}</div>
          <div style="font-size:11.5px;color:#64748b;margin-top:2px;">Submitted: ${typeof escHtml === 'function' ? escHtml(dateStr) : dateStr}</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="text-align:right;">
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Final Score</div>
            <div style="font-size:20px;font-weight:800;color:${isPassing ? '#059669' : '#dc2626'};">${attempt.score != null ? attempt.score : '—'} / ${attempt.total_items || (answersList.length || '—')}</div>
          </div>
          <span style="display:inline-block;padding:6px 14px;border-radius:10px;font-size:13px;font-weight:800;background:${isPassing ? '#dcfce7' : '#fee2e2'};color:${isPassing ? '#15803d' : '#991b1b'};">
            ${scorePct}% ${isPassing ? 'PASSED' : 'NEEDS IMP.'}
          </span>
        </div>
      </div>

      <!-- Question List Body -->
      <div class="scholaria-custom-scroll" style="padding:20px 24px;overflow-y:auto;max-height:55vh;display:flex;flex-direction:column;gap:14px;">
        ${answersList.length ? answersList.map((ans, idx) => {
          const isCorrect = !!ans.isCorrect;
          const quizQuestion = (targetQuiz.questions && targetQuiz.questions[idx]) || {};
          const label = ans.label || ans.question || quizQuestion.question || `Question ${idx + 1}`;
          const rawStud = ans.studentAnswer ?? ans.given ?? ans.userAnswer ?? ans.answer;
          const studAns = Array.isArray(rawStud) ? rawStud.join(', ') : (rawStud != null && String(rawStud).trim() !== '' ? String(rawStud) : 'No answer provided');
          const rawCorrect = ans.correctAnswer ?? ans.correct ?? ans.key ?? quizQuestion.answer ?? (quizQuestion.options ? quizQuestion.options[quizQuestion.answer] : '');
          const correctKey = Array.isArray(rawCorrect) ? rawCorrect.join(', ') : (rawCorrect != null && String(rawCorrect).trim() !== '' ? String(rawCorrect) : '—');
          return `
            <div style="background:#ffffff;border:1.5px solid ${isCorrect ? '#bbf7d0' : '#fecaca'};border-radius:12px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px;">
                <div style="display:flex;align-items:flex-start;gap:8px;">
                  <span style="font-weight:800;font-size:12px;background:#f1f5f9;color:#334155;padding:2px 7px;border-radius:6px;flex-shrink:0;">#${idx + 1}</span>
                  <div style="font-size:13.5px;font-weight:700;color:#0f172a;line-height:1.4;">${typeof escHtml === 'function' ? escHtml(label) : label}</div>
                </div>
                <span style="font-size:11px;font-weight:800;padding:3px 8px;border-radius:6px;flex-shrink:0;background:${isCorrect ? '#dcfce7' : '#fee2e2'};color:${isCorrect ? '#15803d' : '#991b1b'};">
                  ${isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;font-size:12.5px;">
                <div>
                  <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Student's Answer:</div>
                  <div style="font-weight:600;color:${isCorrect ? '#15803d' : '#b91c1c'};margin-top:2px;">${typeof escHtml === 'function' ? escHtml(studAns) : studAns}</div>
                </div>
                <div>
                  <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Correct Answer / Key:</div>
                  <div style="font-weight:700;color:#0369a1;margin-top:2px;">${typeof escHtml === 'function' ? escHtml(correctKey) : correctKey}</div>
                </div>
              </div>
            </div>
          `;
        }).join('') : `
          <div style="text-align:center;color:#64748b;padding:36px;font-size:13.5px;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#94a3b8" stroke-width="2" style="margin-bottom:8px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>Summary submission recorded (${attempt.score != null ? attempt.score : 0} points) — no itemized question snapshot available for this historical attempt.</div>
          </div>
        `}
      </div>

      <!-- Modal Foot -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 24px;display:flex;justify-content:flex-end;">
        <button type="button" class="table-act-btn review" onclick="closeStudentAttemptInspectModal()" style="padding:8px 20px;font-size:13px;">Close Evaluation</button>
      </div>
    </div>
  `;

  modal.classList.add('active');
}
window.inspectStudentAttempt = inspectStudentAttempt;

function closeStudentAttemptInspectModal() {
  const modal = document.getElementById('analysisStudentInspectModal');
  if (modal) modal.classList.remove('active');
}
window.closeStudentAttemptInspectModal = closeStudentAttemptInspectModal;

/* ── QUESTION ITEM STUDENT ROSTER MODAL ── */
function viewQuestionStudentsBreakdown(itemId) {
  const customQList = typeof customQuizzes !== 'undefined' ? customQuizzes : [];
  const targetQuiz = customQList.find(q => String(q.id) === String(analysisSelectedQuizId));
  const attempts = getAttemptsForAnalysis(analysisSelectedQuizId, analysisSectionFilter, '', 'all');
  const rows = buildAnalysisRows(targetQuiz, attempts);
  const row = rows.find(r => String(r.itemId) === String(itemId)) || rows[0];

  if (!row) {
    if (typeof showToast === 'function') showToast('Question details not found', 'warning');
    return;
  }

  let modal = document.getElementById('analysisQuestionStudentsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'analysisQuestionStudentsModal';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '10000';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-card" style="max-width:650px;width:92%;max-height:85vh;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,0.22);padding:0;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">Item Accuracy Breakdown</div>
          <h3 style="margin:4px 0 0 0;font-size:17px;font-weight:800;color:#ffffff;line-height:1.4;">${typeof escHtml === 'function' ? escHtml(row.label) : row.label}</h3>
          <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">
            Correct Answer: <strong>${typeof escHtml === 'function' ? escHtml(row.correctAnswer) : row.correctAnswer}</strong> · Accuracy: <strong>${row.pct}%</strong>
          </div>
        </div>
        <button type="button" onclick="closeQuestionStudentsModal()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:10px;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;" title="Close Modal">✕</button>
      </div>

      <!-- Two column breakdown: Correct vs Incorrect Students -->
      <div class="scholaria-custom-scroll" style="padding:20px 24px;overflow-y:auto;max-height:55vh;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
          <!-- Correct Students -->
          <div>
            <div style="font-weight:800;font-size:13px;color:#059669;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
              <span>✓ Correct (${row.correctStudents.length})</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${row.correctStudents.length ? row.correctStudents.map(st => `
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 10px;font-size:12px;">
                  <div style="font-weight:700;color:#0f172a;">${typeof escHtml === 'function' ? escHtml(st.name) : st.name}</div>
                  <div style="color:#64748b;font-size:11px;margin-top:2px;">${typeof escHtml === 'function' ? escHtml(st.section) : st.section} · ${typeof escHtml === 'function' ? escHtml(st.schoolId) : st.schoolId}</div>
                </div>
              `).join('') : '<div style="font-size:12px;color:#94a3b8;padding:10px 0;">No correct responses recorded.</div>'}
            </div>
          </div>

          <!-- Incorrect Students -->
          <div>
            <div style="font-weight:800;font-size:13px;color:#dc2626;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
              <span>✗ Incorrect (${row.incorrectStudents.length})</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${row.incorrectStudents.length ? row.incorrectStudents.map(st => `
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 10px;font-size:12px;">
                  <div style="font-weight:700;color:#0f172a;">${typeof escHtml === 'function' ? escHtml(st.name) : st.name}</div>
                  <div style="color:#64748b;font-size:11px;margin-top:2px;">${typeof escHtml === 'function' ? escHtml(st.section) : st.section} · ${typeof escHtml === 'function' ? escHtml(st.schoolId) : st.schoolId}</div>
                  <div style="font-size:11px;color:#b91c1c;margin-top:3px;font-weight:600;">Answered: "${typeof escHtml === 'function' ? escHtml(st.answer) : st.answer}"</div>
                </div>
              `).join('') : '<div style="font-size:12px;color:#94a3b8;padding:10px 0;">No incorrect responses recorded.</div>'}
            </div>
          </div>
        </div>
      </div>

      <!-- Foot -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 24px;display:flex;justify-content:flex-end;">
        <button type="button" class="table-act-btn review" onclick="closeQuestionStudentsModal()" style="padding:8px 20px;font-size:13px;">Close</button>
      </div>
    </div>
  `;

  modal.classList.add('active');
}
window.viewQuestionStudentsBreakdown = viewQuestionStudentsBreakdown;

function closeQuestionStudentsModal() {
  const modal = document.getElementById('analysisQuestionStudentsModal');
  if (modal) modal.classList.remove('active');
}
window.closeQuestionStudentsModal = closeQuestionStudentsModal;
