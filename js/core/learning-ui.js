/* Presentation helpers. No authentication, assessment, or scoring rules live here. */
function uiAction(label, handler, secondary = false) {
  return `<button type="button" class="ui-button${secondary ? ' ui-button-secondary' : ''}" onclick="${escHtml(handler)}">${escHtml(label)}</button>`;
}
function uiCall(name, id) { return `${name}(${JSON.stringify(String(id))})`; }
function uiEmpty(title, message, action = '') {
  return `<div class="ui-empty"><h3>${escHtml(title)}</h3><p>${escHtml(message)}</p>${action}</div>`;
}
function uiDate(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}
const uiDataState = {quizzes:'idle'};
function uiSetDataState(key, state) {
  uiDataState[key] = state;
  if (typeof currentPage !== 'undefined' && currentPage === 'dashboard' && ROLE === 'student') {
    const main = document.getElementById('mainContent');
    if (main) main.innerHTML = renderLearningDashboard();
  }
}
function uiDataNotice() {
  if (uiDataState.quizzes === 'error') return `<div class="ui-notice" role="alert"><p>We couldn't refresh your quizzes. Previously loaded information may be out of date.</p>${uiAction('Try again','loadQuizzesFromDB()',true)}</div>`;
  if (uiDataState.quizzes === 'loading') return '<div class="ui-notice" role="status" aria-live="polite">Updating your assigned quizzes…</div>';
  return '';
}
function uiDeadline(quiz) {
  const date = uiDate(quiz.dueDate || quiz.due_date);
  return date ? date.toLocaleString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short'}) : 'No deadline set';
}
function uiStudentQuizzes() {
  return customQuizzes.filter(q => !q.isDemo || CURRENT_PROFILE?.is_demo).filter(q =>
    ['active', 'approved', 'closed'].includes(q.status) && isQuizTargetedForStudent(q, CURRENT_PROFILE));
}
function uiRecordedProgress(subject) {
  const quizzes = uiStudentQuizzes().filter(q => !subject || String(q.subject).toLowerCase() === String(subject).toLowerCase());
  const ids = new Set(myQuizAttempts.map(a => String(a.quiz_id)));
  const completed = quizzes.filter(q => ids.has(String(q.id))).length;
  return {total:quizzes.length, completed, percent:quizzes.length ? Math.round(completed / quizzes.length * 100) : null};
}
function uiProgressHTML(subject) {
  const p = uiRecordedProgress(subject);
  return `<div class="ui-progress"><div><span>Quiz completion</span><strong>${p.total ? `${p.completed} of ${p.total}` : 'No assigned quizzes'}</strong></div>${p.total ? `<progress max="${p.total}" value="${p.completed}" aria-label="${escHtml(subject || 'Assigned')} quizzes completed"></progress>` : ''}<p>Based on recorded submissions. Lesson completion is not tracked.</p></div>`;
}
function uiRecentKey() { return `scholaria_recent_resource_v1:${CURRENT_PROFILE?.id || ''}`; }
function uiRememberResource(material) {
  if (!CURRENT_PROFILE?.id || ROLE !== 'student') return;
  try { localStorage.setItem(uiRecentKey(), JSON.stringify({id:String(material.id), openedAt:new Date().toISOString()})); } catch (_) {}
}
function uiAvailableResources() {
  const seeds = new Set(typeof SEED_MATERIALS !== 'undefined' ? SEED_MATERIALS.map(m => String(m.id)) : []);
  return materialsData.filter(m => m.status === 'approved' && (CURRENT_PROFILE?.is_demo || !seeds.has(String(m.id))));
}
function uiLearningCard() {
  const resources = uiAvailableResources();
  let recent = null;
  try { recent = JSON.parse(localStorage.getItem(uiRecentKey()) || 'null'); } catch (_) {}
  const last = recent && resources.find(m => String(m.id) === recent.id);
  const next = last || resources.slice().sort((a,b) => (uiDate(b.created_at)?.getTime() || 0) - (uiDate(a.created_at)?.getTime() || 0))[0];
  return `<section class="ui-panel ui-learning" aria-labelledby="uiLearningTitle"><div class="ui-eyebrow">Your next learning step</div><h2 id="uiLearningTitle">${last ? 'Continue learning' : 'Make room for learning'}</h2>${next ? `<p class="ui-meta">${escHtml(next.subject || 'Learning resource')}</p><h3>${escHtml(next.title || 'Teacher resource')}</h3><p>${last ? 'Return to the resource you last opened on this device.' : 'Open an available teacher resource to get started.'}</p>${uiAction(last ? 'Continue resource' : 'Open resource', uiCall('previewSubjectUploadedMaterial', next.id))}<p class="ui-caption">Your reading position and lesson completion are not recorded yet.</p>` : uiEmpty('Start with your subjects', 'Browse your subject outlines and check for teacher uploads.', uiAction('Explore subjects', "renderPage('materials')"))}</section>`;
}
function uiTaskCard(quiz, attempted = false) {
  const due = uiDate(quiz.dueDate || quiz.due_date);
  const closed = quiz.status === 'closed';
  const overdue = !attempted && due && due.getTime() < Date.now();
  const status = attempted ? 'Completed' : closed ? 'Closed' : overdue ? 'Overdue' : 'Pending';
  const interactive = quiz.type === 'interactive' || quiz.quiz_type === 'interactive';
  const action = attempted ? uiAction('View feedback', uiCall('openReviewAttempt', quiz.id), true) : closed ? '<span class="ui-caption">Contact your teacher about access.</span>' : uiAction(interactive ? 'Play quiz' : 'Take quiz', uiCall(interactive ? 'openInteractiveQuiz' : 'openTakeQuizModal', quiz.id));
  return `<article class="ui-task"><div class="ui-task-content"><div class="ui-meta">${escHtml(quiz.subject || 'General')} <span class="ui-status ${status.toLowerCase()}">${status}</span></div><h3>${escHtml(quiz.title || 'Quiz')}</h3><p class="ui-deadline">${due ? `<time datetime="${due.toISOString()}">${escHtml(uiDeadline(quiz))}</time>` : 'No deadline set'}</p></div><div class="ui-task-action">${action}</div></article>`;
}
function renderLearningDashboard() {
  const quizzes = uiStudentQuizzes();
  const attempts = new Set(myQuizAttempts.map(a => String(a.quiz_id)));
  const pending = quizzes.filter(q => !attempts.has(String(q.id))).sort((a,b) => (uiDate(a.dueDate || a.due_date)?.getTime() ?? Infinity) - (uiDate(b.dueDate || b.due_date)?.getTime() ?? Infinity));
  const urgent = pending.filter(q => q.status !== 'closed');
  const name = CURRENT_PROFILE?.full_name?.split(' ')[0] || 'there';
  const news = getStoredAnnouncements().filter(a => !a.isArchived && a.status !== 'draft' && !a.isDraft && !isAnnouncementExpired(a)).filter(a => {
    const audience = a.audience || [];
    return !audience.length || audience.includes('All') || audience.includes('All Students') || audience.includes(`${CURRENT_PROFILE?.strand} Strand`);
  }).sort((a,b) => Number(b.priority === 'critical') - Number(a.priority === 'critical') || (uiDate(b.timestamp)?.getTime() || 0) - (uiDate(a.timestamp)?.getTime() || 0));
  const subjects = COURSES_DATABASE.filter(isCourseOpenForStudent);
  const readNews = typeof getReadAnnouncementIds === 'function' ? getReadAnnouncementIds() : new Set();
  const unreadNews = news.filter(a => !readNews.has(String(a.id))).length;
  const latest = myQuizAttempts.slice().sort((a,b) => (uiDate(b.submitted_at)?.getTime() || 0) - (uiDate(a.submitted_at)?.getTime() || 0))[0];
  const latestScore = latest && Number(latest.total_items) > 0 && Number.isFinite(Number(latest.score)) ? Math.round(Number(latest.score) / Number(latest.total_items) * 100) : null;
  const summary = (label,value,description,action,icon,tone='') => `<button type="button" class="info-card ui-summary-card" onclick="${escHtml(action)}"><div class="ic-head"><span class="ic-icon ${tone}">${icon}</span><div><span class="ic-sub">${escHtml(label)}</span><strong class="ic-num ${tone}">${escHtml(value)}</strong></div></div><p>${escHtml(description)}</p></button>`;
  const nearest = urgent.find(q => uiDate(q.dueDate || q.due_date));
  return `<div class="ui-dashboard ui-dashboard-restored">${uiDataNotice()}
    <header class="ui-page-heading"><div><span class="ui-eyebrow">Your learning space</span><h1>Welcome back, ${escHtml(name)}.</h1><p>Your subjects, activities, and latest school updates.</p></div>${uiAction('My progress', "renderPage('progress')", true)}</header>
    <div class="card-grid ui-dashboard-summary">
      ${summary('Enrolled Subjects',subjects.length,'Explore your learning resources',"renderPage('materials')",typeof iconFolder==='function'?iconFolder():'')}
      ${summary('Available Quizzes',urgent.length,quizzes.length?'Quizzes awaiting your submission':'No assigned quizzes',"renderPage('quizzes')",typeof iconQuiz==='function'?iconQuiz():'','gold')}
      ${summary('Latest Score',latestScore === null ? '—' : latestScore+'%',latest ? latest.quiz_title || 'Latest recorded quiz submission' : 'No quizzes completed yet',"renderPage('progress')",typeof iconProgress==='function'?iconProgress():'','green')}
      ${summary('Unread News',unreadNews,'School and teacher announcements',"renderPage('announcements')",typeof iconNotif==='function'?iconNotif():'','purple')}
    </div>
    ${nearest ? `<aside class="ui-deadline-strip"><div><span class="ui-status ${uiDate(nearest.dueDate || nearest.due_date).getTime()<Date.now()?'overdue':'pending'}">${uiDate(nearest.dueDate || nearest.due_date).getTime()<Date.now()?'Needs attention':'Next deadline'}</span><strong>${escHtml(nearest.title)}</strong><span>${escHtml(uiDeadline(nearest))}</span></div>${uiAction('View quizzes',"renderPage('quizzes')",true)}</aside>` : ''}
    <div id="coursesWidgetContainer">${typeof renderCoursesWidgetHTML === 'function' ? renderCoursesWidgetHTML() : uiEmpty('Your subjects','Explore your subject resources.',uiAction('Explore subjects',"renderPage('materials')",true))}</div>
    <div class="ui-priority-grid"><section class="ui-panel ui-priorities" aria-labelledby="uiTaskTitle"><div class="ui-panel-heading"><div><h2 id="uiTaskTitle">Quizzes needing attention</h2><p>Check your deadlines and go directly to your activity.</p></div>${uiAction('All quizzes',"renderPage('quizzes')",true)}</div><div class="ui-task-list">${urgent.slice(0,3).map(q=>uiTaskCard(q)).join('') || uiEmpty('No pending quizzes','Check your subjects for learning resources or review your latest feedback.',uiAction('Explore subjects',"renderPage('materials')",true))}</div></section>${uiLearningCard()}</div>
    <section class="ui-panel"><div class="ui-panel-heading"><h2>Important announcements</h2>${uiAction('All announcements',"renderPage('announcements')",true)}</div>${news.slice(0,2).map(a=>`<article class="ui-news"><span class="ui-status ${a.priority==='critical'?'overdue':'pending'}">${escHtml(a.category || 'Announcement')}</span><h3>${escHtml(a.title)}</h3><p>${escHtml(String(a.message || '').slice(0,160))}${String(a.message || '').length>160?'…':''}</p>${uiAction('Read announcement',uiCall('openAnnouncementDetailModal',a.id),true)}</article>`).join('') || uiEmpty('No new announcements','School and teacher updates will appear here when published.')}</section>
  </div>`;

}

/* Keyboard support for legacy clickable cards, without changing their actions. */
document.addEventListener('keydown', event => {
  if (!['Enter',' '].includes(event.key) || !event.target.matches('[data-ui-keyboard]')) return;
  event.preventDefault(); event.target.click();
});
let uiFocusedDialog = null;
let uiDialogReturnFocus = null;
function uiVisibleDialog() {
  return [...document.querySelectorAll('.modal-overlay.active,.login-modal-overlay.open')].filter(e => e.getClientRects().length).pop() || null;
}
function uiDialogStops(dialog) {
  return [...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
}
document.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const dialog = uiVisibleDialog();
  if (!dialog) return;
  const stops = uiDialogStops(dialog);
  if (!stops.length) return;
  const first = stops[0], last = stops[stops.length-1];
  if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
});
function uiEnhanceControls(root = document) {
  root.querySelectorAll('.menu-item[data-page]').forEach(link => link.setAttribute('aria-current', link.classList.contains('active') ? 'page' : 'false'));
  root.querySelectorAll('.cw-card[onclick], .sw-ac-header[onclick], .sw-todo-item[onclick], .au-type-card[onclick], .type-card[onclick]').forEach(card => {
    card.setAttribute('tabindex','0'); card.setAttribute('role','button'); card.setAttribute('data-ui-keyboard','');
    if (card.classList.contains('sw-ac-header')) card.setAttribute('aria-expanded', String(card.parentElement.classList.contains('expanded')));
  });
  const dialog = uiVisibleDialog();
  if (dialog && dialog !== uiFocusedDialog) {
    uiDialogReturnFocus = document.activeElement;
    uiFocusedDialog = dialog;
    dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true');
    const title = dialog.querySelector('h2,h3');
    if (title && !dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) dialog.setAttribute('aria-label',title.textContent.trim());
    uiDialogStops(dialog)[0]?.focus({preventScroll:true});
  } else if (!dialog && uiFocusedDialog) {
    uiFocusedDialog = null;
    if (uiDialogReturnFocus?.isConnected) uiDialogReturnFocus.focus({preventScroll:true});
    uiDialogReturnFocus = null;
  }
}
document.addEventListener('DOMContentLoaded', () => {
  uiEnhanceControls();
  let scheduled = false;
  new MutationObserver(() => { if (!scheduled) { scheduled = true; requestAnimationFrame(() => { scheduled = false; uiEnhanceControls(); }); } }).observe(document.body, {childList:true, subtree:true,attributes:true,attributeFilter:['class']});
});
