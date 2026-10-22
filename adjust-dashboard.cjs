const fs=require('fs');const file='js/core/learning-ui.js';let s=fs.readFileSync(file,'utf8');
const start=s.indexOf('  const notifications = getNotificationsForCurrentUser()',s.indexOf('function renderLearningDashboard()'));
const end=s.indexOf('\n}\n',start);
if(start<0||end<0)throw Error('Dashboard boundary not found');
const replacement=`  const subjects = COURSES_DATABASE.filter(isCourseOpenForStudent);
  const readNews = typeof getReadAnnouncementIds === 'function' ? getReadAnnouncementIds() : new Set();
  const unreadNews = news.filter(a => !readNews.has(String(a.id))).length;
  const latest = myQuizAttempts.slice().sort((a,b) => (uiDate(b.submitted_at)?.getTime() || 0) - (uiDate(a.submitted_at)?.getTime() || 0))[0];
  const latestScore = latest && Number(latest.total_items) > 0 && Number.isFinite(Number(latest.score)) ? Math.round(Number(latest.score) / Number(latest.total_items) * 100) : null;
  const summary = (label,value,description,action,icon,tone='') => \`<button type="button" class="info-card ui-summary-card" onclick="\${escHtml(action)}"><div class="ic-head"><span class="ic-icon \${tone}">\${icon}</span><div><span class="ic-sub">\${escHtml(label)}</span><strong class="ic-num \${tone}">\${escHtml(value)}</strong></div></div><p>\${escHtml(description)}</p></button>\`;
  const nearest = urgent.find(q => uiDate(q.dueDate || q.due_date));
  return \`<div class="ui-dashboard ui-dashboard-restored">\${uiDataNotice()}
    <header class="ui-page-heading"><div><span class="ui-eyebrow">Your learning space</span><h1>Welcome back, \${escHtml(name)}.</h1><p>Your subjects, activities, and latest school updates.</p></div>\${uiAction('My progress', "renderPage('progress')", true)}</header>
    <div class="card-grid ui-dashboard-summary">
      \${summary('Enrolled Subjects',subjects.length,'Explore your learning resources',"renderPage('materials')",typeof iconFolder==='function'?iconFolder():'')}
      \${summary('Available Quizzes',urgent.length,quizzes.length?'Quizzes awaiting your submission':'No assigned quizzes',"renderPage('quizzes')",typeof iconQuiz==='function'?iconQuiz():'','gold')}
      \${summary('Latest Score',latestScore === null ? '—' : latestScore+'%',latest ? latest.quiz_title || 'Latest recorded quiz submission' : 'No quizzes completed yet',"renderPage('progress')",typeof iconProgress==='function'?iconProgress():'','green')}
      \${summary('Unread News',unreadNews,'School and teacher announcements',"renderPage('announcements')",typeof iconNotif==='function'?iconNotif():'','purple')}
    </div>
    \${nearest ? \`<aside class="ui-deadline-strip"><div><span class="ui-status \${uiDate(nearest.dueDate || nearest.due_date).getTime()<Date.now()?'overdue':'pending'}">\${uiDate(nearest.dueDate || nearest.due_date).getTime()<Date.now()?'Needs attention':'Next deadline'}</span><strong>\${escHtml(nearest.title)}</strong><span>\${escHtml(uiDeadline(nearest))}</span></div>\${uiAction('View quizzes',"renderPage('quizzes')",true)}</aside>\` : ''}
    <div id="coursesWidgetContainer">\${typeof renderCoursesWidgetHTML === 'function' ? renderCoursesWidgetHTML() : uiEmpty('Your subjects','Explore your subject resources.',uiAction('Explore subjects',"renderPage('materials')",true))}</div>
    <div class="ui-priority-grid"><section class="ui-panel ui-priorities" aria-labelledby="uiTaskTitle"><div class="ui-panel-heading"><div><h2 id="uiTaskTitle">Quizzes needing attention</h2><p>Check your deadlines and go directly to your activity.</p></div>\${uiAction('All quizzes',"renderPage('quizzes')",true)}</div><div class="ui-task-list">\${urgent.slice(0,3).map(q=>uiTaskCard(q)).join('') || uiEmpty('No pending quizzes','Check your subjects for learning resources or review your latest feedback.',uiAction('Explore subjects',"renderPage('materials')",true))}</div></section>\${uiLearningCard()}</div>
    <section class="ui-panel"><div class="ui-panel-heading"><h2>Important announcements</h2>\${uiAction('All announcements',"renderPage('announcements')",true)}</div>\${news.slice(0,2).map(a=>\`<article class="ui-news"><span class="ui-status \${a.priority==='critical'?'overdue':'pending'}">\${escHtml(a.category || 'Announcement')}</span><h3>\${escHtml(a.title)}</h3><p>\${escHtml(String(a.message || '').slice(0,160))}\${String(a.message || '').length>160?'…':''}</p>\${uiAction('Read announcement',uiCall('openAnnouncementDetailModal',a.id),true)}</article>\`).join('') || uiEmpty('No new announcements','School and teacher updates will appear here when published.')}</section>
  </div>\`;
`;
s=s.slice(0,start)+replacement+s.slice(end);s=s.replace('  const progress = uiRecordedProgress();\n','');fs.writeFileSync(file,s);
