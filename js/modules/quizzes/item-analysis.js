/* ── ITEM ANALYSIS MODULE (TEACHER) ── */

let analysisSelectedQuizId = null;
let analysisAttemptsCache = {};
let analysisFetchInFlightFor = null;

function buildAnalysisRows(quiz, attempts) {
  if (!quiz) return [];
  const tally = new Map(buildQuizItems(quiz).map(it => [it.itemId, { label: it.label, correct: 0, incorrect: 0 }]));
  attempts.forEach(a => {
    (a.answers || []).forEach(ans => {
      if (!tally.has(ans.itemId)) tally.set(ans.itemId, { label: ans.label, correct: 0, incorrect: 0 });
      const t = tally.get(ans.itemId);
      if (ans.isCorrect) t.correct++; else t.incorrect++;
    });
  });
  return Array.from(tally.values()).map(t => {
    const total = t.correct + t.incorrect;
    return { label: t.label, correct: t.correct, incorrect: t.incorrect, pct: total ? Math.round((t.correct / total) * 100) : 0 };
  });
}

async function loadAttemptsForAnalysis(quizId) {
  if (!quizId || analysisFetchInFlightFor === quizId) return;
  analysisFetchInFlightFor = quizId;
  const { data, error } = await db.from('quiz_attempts').select('*').eq('quiz_id', quizId).order('submitted_at', { ascending: false });
  if (analysisFetchInFlightFor === quizId) analysisFetchInFlightFor = null;
  if (error) { console.error('Failed to load attempts for analysis:', error.message); analysisAttemptsCache[quizId] = []; }
  else analysisAttemptsCache[quizId] = data || [];
  if (currentPage === 'analysis') {
    renderPage('analysis');
  }
}

function setAnalysisQuiz(quizId) {
  analysisSelectedQuizId = quizId;
  renderPage('analysis');
}
