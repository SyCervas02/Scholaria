// Read-only calendar presentation; uses only deadlines already visible on the dashboard.
function renderDashboardCalendarBanner() {
  return `<section class="dashboard-calendar-banner">
    <div class="dashboard-calendar-art" aria-hidden="true"><img src="assets/dashboard-books.svg" alt="">${iconCalendar()}</div>
    <div><h3>Stay on track with your studies!</h3><p>Check your deadlines, complete your quizzes, and don't forget to read the latest announcements.</p></div>
    <button type="button" onclick="openDashboardCalendar()">${iconCalendar()} View Calendar</button>
  </section>`;
}

function openDashboardCalendar() {
  document.getElementById('dashboardCalendarDialog')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'dashboardCalendarDialog';
  dialog.className = 'dashboard-calendar-dialog';
  dialog.setAttribute('aria-labelledby', 'dashboardCalendarTitle');
  const deadlines = [...document.querySelectorAll('.student-deadlines-table tbody tr')].map(row => {
    const dateLabel = row.querySelector('.dashboard-date > span');
    const date = new Date(dateLabel?.firstChild?.textContent || '');
    return { date, title: row.cells[1]?.textContent.trim() || '', subject: row.cells[0]?.textContent.trim() || '' };
  }).filter(item => !Number.isNaN(item.date.getTime()));
  let month = new Date();
  month = new Date(month.getFullYear(), month.getMonth(), 1);
  const today = new Date();
  function paint() {
    dialog.innerHTML = `<header><div><h2 id="dashboardCalendarTitle">Calendar</h2><p>${month.toLocaleDateString('en-US', {month:'long', year:'numeric'})}</p></div><button type="button" data-close aria-label="Close calendar">&times;</button></header>
      <nav aria-label="Calendar month"><button type="button" data-previous aria-label="Previous month">&#8592;</button><button type="button" data-today>Today</button><button type="button" data-next aria-label="Next month">&#8594;</button></nav>
      <div class="dashboard-calendar-grid" role="group" aria-label="${month.toLocaleDateString('en-US', {month:'long', year:'numeric'})}"></div>`;
    const grid = dialog.querySelector('.dashboard-calendar-grid');
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(day => {
      const label = document.createElement('strong'); label.textContent = day; grid.append(label);
    });
    for (let i=0; i<month.getDay(); i++) grid.append(document.createElement('span'));
    const days = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
    for (let day=1; day<=days; day++) {
      const cell = document.createElement('div'); cell.className = 'dashboard-calendar-day'; cell.textContent = day;
      if (day===today.getDate() && month.getMonth()===today.getMonth() && month.getFullYear()===today.getFullYear()) cell.setAttribute('aria-current','date');
      deadlines.filter(item=>item.date.getFullYear()===month.getFullYear() && item.date.getMonth()===month.getMonth() && item.date.getDate()===day).forEach(item=>{
        const entry=document.createElement('small'); entry.textContent=item.title; entry.title=item.subject; cell.append(entry);
      });
      grid.append(cell);
    }
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();
    dialog.querySelector('[data-previous]').onclick=()=>{month.setMonth(month.getMonth()-1);paint();dialog.querySelector('[data-previous]').focus();};
    dialog.querySelector('[data-next]').onclick=()=>{month.setMonth(month.getMonth()+1);paint();dialog.querySelector('[data-next]').focus();};
    dialog.querySelector('[data-today]').onclick=()=>{month=new Date(today.getFullYear(),today.getMonth(),1);paint();dialog.querySelector('[data-today]').focus();};
  }
  paint();
  dialog.addEventListener('click', e=>{if(e.target===dialog){const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.body.append(dialog);
  dialog.showModal();
}
