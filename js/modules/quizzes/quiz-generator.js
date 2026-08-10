/* ── AI QUIZ GENERATOR & MANAGEMENT MODULE ── */

const QUIZ_API_ENDPOINT = 'http://localhost:3001/api/quiz/generate';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

let customQuizzes = [];

async function loadQuizzesFromDB() {
  const { data, error } = await db.from('quizzes').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Failed to load quizzes:', error.message); return; }
  customQuizzes = (data || []).map(q => ({
    id: q.id,
    createdBy: q.created_by,
    subject: q.subject,
    strand: q.strand,
    sections: q.sections,
    createdAt: q.created_at,
    title: q.title + (q.is_demo ? ' (Demo)' : ''),
    meta: q.is_demo
      ? `${q.subject || 'General'} · ${(q.questions||[]).length} items · Sample data`
      : `${[q.subject || 'General', q.strand, q.sections].filter(Boolean).join(' · ')} · ${(q.questions||[]).length} items · ${q.status === 'pending' ? 'Pending admin approval' : q.status}`,
    isDemo: q.is_demo,
    status: q.status,
    questions: q.questions || []
  }));
  if (currentPage === 'quiz' || currentPage === 'dashboard' || currentPage === 'quizzes' || currentPage === 'analysis') {
    renderPage(currentPage);
  }
}

const quizGen = {
  step: 'setup', type: 'standard', file: null, fileText: '',
  title: '', subject: '', formats: new Set(['mc', 'id']), count: 'auto',
  strands: new Set(), sections: new Set(),
  questions: [], errorMsg: ''
};

function openQuizModal() {
  Object.assign(quizGen, {
    step: 'setup', type: 'standard', file: null, fileText: '',
    title: '', subject: '', formats: new Set(['mc', 'id']), count: 'auto',
    strands: new Set(), sections: new Set(),
    questions: [], errorMsg: ''
  });
  document.getElementById('quizModal').classList.add('active');
  renderQuizModal();
}

function closeQuizModal() {
  document.getElementById('quizModal').classList.remove('active');
}

function selectQuizType(type) {
  if (type === 'gamified') {
    showToast('Gamified quizzes (Family Feud mode) are coming soon', 'info');
    return;
  }
  quizGen.type = type;
  renderQuizModal();
}

function toggleFormat(key) {
  if (quizGen.formats.has(key)) quizGen.formats.delete(key);
  else quizGen.formats.add(key);
  if (quizGen.formats.size === 0) quizGen.formats.add('mc');
  renderQuizModal();
}

function toggleQuizStrand(s) {
  if (quizGen.strands.has(s)) quizGen.strands.delete(s);
  else quizGen.strands.add(s);
  renderQuizModal();
}

function toggleQuizSection(s) {
  if (quizGen.sections.has(s)) quizGen.sections.delete(s);
  else quizGen.sections.add(s);
  renderQuizModal();
}

function setAllFormats() { quizGen.formats = new Set(['mc', 'id', 'match']); renderQuizModal(); }
function selectCount(c)  { quizGen.count = c; renderQuizModal(); }
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
  if (!quizGen.subject) quizGen.subject = file.name.replace(/\.[^.]+$/, '');
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
    sourceText: (quizGen.fileText || '').slice(0, 18000)
  };

  try {
    const response = await fetch(QUIZ_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Backend returned ' + response.status);
    const data = await response.json();
    applyGeneratedQuestions(data.questions || [], false);
  } catch (err) {
    console.warn('Quiz backend unavailable, showing demo data instead:', err.message);
    applyGeneratedQuestions(buildDemoQuestions(), true);
    showToast('No AI backend connected yet — showing sample questions', 'info');
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
  const demo = [];
  if (quizGen.formats.has('mc')) demo.push({
    type: 'multiple_choice',
    question: `Sample multiple choice item — connect QUIZ_API_ENDPOINT to generate real questions from "${name}".`,
    options: ['Sample option A', 'Sample option B', 'Sample option C', 'Sample option D'],
    answer: 'Sample option A'
  });
  if (quizGen.formats.has('id')) demo.push({
    type: 'identification',
    question: 'Sample identification item — placeholder until the AI backend is connected.',
    answer: 'Sample answer'
  });
  if (quizGen.formats.has('match')) demo.push({
    type: 'matching',
    instructions: 'Sample matching set — placeholder until the AI backend is connected.',
    pairs: [{ left: 'Sample term A', right: 'Sample definition A' }, { left: 'Sample term B', right: 'Sample definition B' }]
  });
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
function editPair(id, idx, side, value) {
  const q = quizGen.questions.find(q => q._id === id);
  if (q) q.pairs[idx][side] = value;
}

async function saveQuiz() {
  if (quizGen.questions.length === 0) { showToast('Nothing to save yet', 'error'); return; }
  const isDemo = quizGen.questions.some(q => q._demo);
  const title = quizGen.title || (quizGen.subject ? quizGen.subject + ' – AI Generated Quiz' : 'AI Generated Quiz');
  const { error } = await db.from('quizzes').insert({
    title: title,
    subject: quizGen.subject || null,
    strand: quizGen.strands.size ? Array.from(quizGen.strands).join(', ') : null,
    sections: quizGen.sections.size ? Array.from(quizGen.sections).join(', ') : null,
    questions: quizGen.questions,
    status: 'pending',
    is_demo: isDemo
  });
  if (error) {
    showToast('Failed to save quiz: ' + error.message, 'error'); return;
  }
  closeQuizModal();
  showToast(isDemo ? 'Demo quiz saved for preview' : 'Quiz submitted for admin approval', isDemo ? 'info' : 'success');
  await loadQuizzesFromDB();
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
      ${isDemo ? `<div class="demo-banner">${iconChip()} <div><strong>Sample data</strong> — no AI backend is connected yet. These placeholders show how generated questions will look and behave once <code>QUIZ_API_ENDPOINT</code> is live.</div></div>` : ''}
      <div class="qresult-list">${quizGen.questions.map(renderQuestionCard).join('')}</div>`;
    foot.innerHTML = `<button class="foot-btn-secondary" onclick="quizGen.step='setup';renderQuizModal();">Back</button><button class="gen-btn" onclick="saveQuiz()">${iconChip()} Save Quiz (${quizGen.questions.length} items)</button>`;
    return;
  }

  body.innerHTML = `
    <div class="type-select">
      <div class="type-card ${quizGen.type === 'standard' ? 'active' : ''}" onclick="selectQuizType('standard')">
        <div class="tc-icon">${iconQuiz()}</div>
        <h4>Standard Quiz</h4>
        <p>AI-generated identification, multiple choice, and matching questions</p>
      </div>
      <div class="type-card locked" onclick="selectQuizType('gamified')">
        <span class="soon-tag">Soon</span>
        <div class="tc-icon">${iconGamepad()}</div>
        <h4>Gamified — Family Feud</h4>
        <p>Live team-based review game for the whole class</p>
      </div>
    </div>
    <div class="gen-row">
      <div class="gen-field"><label>Quiz Title</label><input type="text" placeholder="e.g. Cybersecurity – Quiz 4" value="${escHtml(quizGen.title)}" oninput="updateTitle(this.value)"></div>
      <div class="gen-field"><label>Subject</label><input type="text" placeholder="e.g. Cybersecurity Fundamentals" value="${escHtml(quizGen.subject)}" oninput="updateSubject(this.value)"></div>
    </div>
    <div class="gen-field">
      <label>Target Strands <span style="text-transform:none;font-weight:500;color:var(--text-muted);">(leave blank for all)</span></label>
      <div class="format-grid">
        ${STRANDS.map(s => `<div class="format-chip ${quizGen.strands.has(s) ? 'on' : ''}" onclick="toggleQuizStrand('${s}')">${s}</div>`).join('')}
      </div>
    </div>
    <div class="gen-field">
      <label>Target Sections <span style="text-transform:none;font-weight:500;color:var(--text-muted);">(leave blank for all)</span></label>
      <div class="format-grid">
        ${SECTIONS.map(s => `<div class="format-chip ${quizGen.sections.has(s) ? 'on' : ''}" onclick="toggleQuizSection('${s}')">${s}</div>`).join('')}
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
        <div class="format-chip ${quizGen.formats.size === 3 ? 'on' : ''}" onclick="setAllFormats()">All</div>
      </div>
    </div>
    <div class="gen-field">
      <label>Number of Questions</label>
      <div class="count-pills">
        <div class="count-pill ${quizGen.count === 'auto' ? 'on' : ''}" onclick="selectCount('auto')">Automatic</div>
        <div class="count-pill ${quizGen.count === 10 ? 'on' : ''}" onclick="selectCount(10)">10</div>
        <div class="count-pill ${quizGen.count === 15 ? 'on' : ''}" onclick="selectCount(15)">15</div>
        <div class="count-pill ${quizGen.count === 20 ? 'on' : ''}" onclick="selectCount(20)">20</div>
        <div class="count-pill ${quizGen.count === 25 ? 'on' : ''}" onclick="selectCount(25)">25</div>
      </div>
    </div>`;

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
          <input type="radio" name="ans-${q._id}" ${i === q._answerIdx ? 'checked' : ''} onchange="setAnswerIndex('${q._id}', ${i})">
          <input type="text" value="${escHtml(opt)}" oninput="editOption('${q._id}', ${i}, this.value)">
        </div>`).join('')}</div>`;
  } else if (q.type === 'identification') {
    body = `<textarea rows="2" oninput="editQuestion('${q._id}','question',this.value)">${escHtml(q.question)}</textarea>
      <div class="qr-label">Answer</div>
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
