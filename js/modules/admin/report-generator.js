/* ── ACADEMIC REPORT GENERATION & PRINT ENGINE ── */

let activeReportType = null; // 'section' | 'student' | 'census'
let activeReportSection = null;
let activeReportStudent = null;
let studentGradeSlipResizeHandler = null;

function fitStudentGradeSlipPreview() {
  const modal = document.getElementById('academicReportModal');
  const sheet = document.querySelector('#academicReportModal .student-grade-report');
  if (!modal?.classList.contains('student-grade-slip-fit') || !sheet) return;
  sheet.style.zoom = '1';
  const bounds = sheet.getBoundingClientRect();
  const availableWidth = Math.max(280, window.innerWidth - 64);
  const availableHeight = Math.max(240, window.innerHeight - 150);
  const scale = Math.min(1, availableWidth / bounds.width, availableHeight / bounds.height);
  sheet.style.zoom = String(Math.max(0.35, scale));
}

function closeAcademicReportModal() {
  document.body.classList.remove('printing-academic-report');
  const modal = document.getElementById('academicReportModal');
  if (modal) modal.classList.remove('active', 'student-grade-slip-fit');
  if (studentGradeSlipResizeHandler) {
    window.removeEventListener('resize', studentGradeSlipResizeHandler);
    studentGradeSlipResizeHandler = null;
  }
}

function triggerPrintReport() {
  const prevTitle = document.title;
  let sectionPrintPageStyle = null;
  let cleaned = false;
  const cleanupPrintState = () => {
    if (cleaned) return;
    cleaned = true;
    setTimeout(() => {
      document.body.classList.remove('printing-academic-report');
      if (sectionPrintPageStyle) { sectionPrintPageStyle.remove(); sectionPrintPageStyle = null; }
      document.title = prevTitle;
      window.removeEventListener('afterprint', cleanupPrintState);
    }, 1200);
  };

  document.body.classList.add('printing-academic-report');
  if (activeReportType === 'section') {
    document.title = activeReportSection
      ? `Master_Grade_Sheet_${activeReportSection.replace(/\s+/g, '_')}`
      : 'Master_Grade_Sheets_All_Sections';
    sectionPrintPageStyle = document.createElement('style');
    sectionPrintPageStyle.textContent = '@page { size: A4 landscape; margin: 8mm; }';
    document.head.appendChild(sectionPrintPageStyle);
  } else if (activeReportType === 'student') {
    const studentObj = (typeof registeredUsers !== 'undefined' ? registeredUsers : []).find(u => u.dbId === activeReportStudent || u.id === activeReportStudent || u.name === activeReportStudent);
    const sName = studentObj?.name || activeReportStudent || 'Student';
    document.title = `Grade_Slip_${sName.replace(/\s+/g, '_')}`;
  } else if (activeReportType === 'census') {
    document.title = 'Institutional_Census_SY2026_2027';
    sectionPrintPageStyle = document.createElement('style');
    sectionPrintPageStyle.textContent = '@page { size: A4 landscape; margin: 8mm; }';
    document.head.appendChild(sectionPrintPageStyle);
  }

  const body = document.getElementById('academicReportModalBody');
  if (body) body.scrollTop = 0;
  window.scrollTo(0, 0);

  // Clean up safely after print completes without stripping state during Edge preview generation
  window.addEventListener('afterprint', cleanupPrintState);

  // Wait for the report DOM and print styles to settle before Chromium captures it.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}

/**
 * Opens every section handled by the teacher as one print-ready report,
 * with a page break between sections.
 */
function openAllSectionReportsModal() {
  const summaries = typeof buildSectionSummaryEntries === 'function' ? buildSectionSummaryEntries() : [];
  const sectionNames = summaries.map(s => s.section).filter(Boolean);
  const fallbackSections = typeof managedSections !== 'undefined'
    ? managedSections.map(s => s.name).filter(Boolean)
    : [];
  const sections = [...new Set(sectionNames.length ? sectionNames : fallbackSections)];
  const body = document.getElementById('academicReportModalBody');
  const head = document.getElementById('academicReportModalHead');
  const modal = document.getElementById('academicReportModal');
  if (!body || !head || !modal || !sections.length) return;

  const reports = [];
  sections.forEach((sectionName, index) => {
    openSectionReportModal(sectionName);
    reports.push(`${index ? '<div style="page-break-before:always;break-before:page;"></div>' : ''}${body.innerHTML}`);
  });

  activeReportType = 'section';
  activeReportSection = null;
  head.innerHTML = `
    <div>
      <h3 style="font-size:17px;font-weight:800;color:#0f172a;margin-bottom:2px;">Print & Export Preview — All Sections</h3>
      <span style="font-size:12px;color:var(--text-muted);">${sections.length} handled sections · each section starts on a separate page</span>
    </div>
    <div style="display:flex;gap:10px;align-items:center;">
      <button class="gen-btn" style="background:#1e293b;color:#fff;display:inline-flex;align-items:center;gap:6px;padding:7px 16px;" onclick="triggerPrintReport()">
        Print / Save PDF
      </button>
      <button class="modal-x" onclick="closeAcademicReportModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;
  body.innerHTML = reports.join('');
  modal.classList.add('active');
}

/**
 * Opens Section Master Grade Sheet Preview Modal
 */
function openSectionReportModal(sectionName) {
  const reportModal = document.getElementById('academicReportModal');
  if (reportModal) reportModal.classList.remove('student-grade-slip-fit');
  if (studentGradeSlipResizeHandler) {
    window.removeEventListener('resize', studentGradeSlipResizeHandler);
    studentGradeSlipResizeHandler = null;
  }
  activeReportType = 'section';
  activeReportSection = sectionName || (managedSections[0]?.name || 'Section A');
  activeReportStudent = null;

  const sec = managedSections.find(s => s.name === activeReportSection) || {
    name: activeReportSection,
    gradeLevel: 'Grade 11',
    strand: 'STEM',
    adviser: 'Class Adviser'
  };

  const quizzes = typeof getClassRecordQuizzes === 'function' ? getClassRecordQuizzes() : [];
  const quizColumnWidth = quizzes.length ? (39 / quizzes.length).toFixed(3) : 0;
  const allEntries = typeof buildRealClassRecordEntries === 'function' ? buildRealClassRecordEntries() : [];
  
  // Filter students in this section
  const sectionStudents = allEntries.filter(e =>
    (e.section || '').trim().toLowerCase() === activeReportSection.trim().toLowerCase()
  );

  const validAvgs = sectionStudents.map(e => e.avg).filter(a => a !== null && !isNaN(a));
  const classAvg = validAvgs.length ? Number((validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length).toFixed(2)) : null;
  const passingCount = validAvgs.filter(a => a >= 75).length;
  const passingRate = validAvgs.length ? Math.round((passingCount / validAvgs.length) * 100) : null;
  const highestScore = validAvgs.length ? Math.max(...validAvgs).toFixed(2) : '—';
  const lowestScore = validAvgs.length ? Math.min(...validAvgs).toFixed(2) : '—';

  const dateGenerated = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const body = document.getElementById('academicReportModalBody');
  const head = document.getElementById('academicReportModalHead');
  if (!body || !head) return;

  head.innerHTML = `
    <div>
      <h3 style="font-size:17px;font-weight:800;color:#0f172a;margin-bottom:2px;">Print & Export Preview — ${escHtml(sec.name)}</h3>
      <span style="font-size:12px;color:var(--text-muted);">Official Section Master Grade Summary & Performance Sheet</span>
    </div>
    <div style="display:flex;gap:10px;align-items:center;">
      <button class="foot-btn-secondary" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;" onclick="exportSectionGradeCSV('${escHtml(activeReportSection)}')">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export CSV
      </button>
      <button class="gen-btn" style="background:#1e293b;color:#fff;display:inline-flex;align-items:center;gap:6px;padding:7px 16px;" onclick="triggerPrintReport()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save PDF
      </button>
      <button class="modal-x" onclick="closeAcademicReportModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  body.innerHTML = `
    <div class="report-document-sheet printable-document section-master-report" id="printableReportArea">
      <!-- OFFICIAL SCHOOL HEADER -->
      <div class="report-school-header">
        <div class="report-logo-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        </div>
        <div class="report-school-details">
          <h2>HAVEN OF WISDOM ACADEMY, INC.</h2>
          <p>Senior High School Department · Academic Affairs & Records Office</p>
          <span class="report-doc-badge">OFFICIAL SECTION MASTER GRADE SHEET & SUMMARY</span>
        </div>
      </div>

      <!-- METADATA INFORMATION STRIP -->
      <div class="report-info-grid">
        <div class="report-info-item"><strong>Section:</strong> <span>${escHtml(sec.name)}</span></div>
        <div class="report-info-item"><strong>Grade & Strand:</strong> <span>${escHtml(sec.gradeLevel || 'Grade 11')} · ${escHtml(sec.strand || 'STEM')}</span></div>
        <div class="report-info-item"><strong>Subject / Course:</strong> <span>${escHtml(sectionStudents[0]?.subject || (CURRENT_PROFILE?.subjects || 'Core Academics'))}</span></div>
        <div class="report-info-item"><strong>Class Adviser:</strong> <span>${escHtml(sec.adviser || CURRENT_PROFILE?.full_name || 'Department Adviser')}</span></div>
        <div class="report-info-item"><strong>Academic Year:</strong> <span>S.Y. 2026–2027 · Term 1</span></div>
        <div class="report-info-item"><strong>Date Issued:</strong> <span>${dateGenerated}</span></div>
      </div>

      <!-- SUMMARY KPI STATS -->
      <div class="report-kpi-row">
        <div class="report-kpi-card">
          <div class="kpi-label">Total Enrolled</div>
          <div class="kpi-value">${sectionStudents.length}</div>
          <div class="kpi-sub">Students in Roster</div>
        </div>
        <div class="report-kpi-card">
          <div class="kpi-label">Class Average</div>
          <div class="kpi-value ${classAvg !== null && classAvg >= 80 ? 'text-green' : ''}">${classAvg !== null ? classAvg.toFixed(2) + '%' : '—'}</div>
          <div class="kpi-sub">Combined Performance</div>
        </div>
        <div class="report-kpi-card">
          <div class="kpi-label">Passing Rate</div>
          <div class="kpi-value ${passingRate !== null && passingRate >= 75 ? 'text-green' : 'text-amber'}">${passingRate !== null ? passingRate + '%' : '—'}</div>
          <div class="kpi-sub">${passingCount} of ${sectionStudents.length} Passing</div>
        </div>
        <div class="report-kpi-card">
          <div class="kpi-label">Grade Range</div>
          <div class="kpi-value" style="font-size:15px;margin-top:4px;">${highestScore}% / ${lowestScore}%</div>
          <div class="kpi-sub">Highest / Lowest</div>
        </div>
      </div>

      <!-- MASTER GRADING TABLE -->
      <div class="report-table-container">
        <table class="report-table">
          <colgroup>
            <col style="width:4%;"><col style="width:22%;"><col style="width:8%;">
            ${quizzes.map(() => `<col style="width:${quizColumnWidth}%;">`).join('')}
            <col style="width:6%;"><col style="width:9%;"><col style="width:12%;">
          </colgroup>
          <thead>
            <tr>
              <th style="width:36px;text-align:center;">#</th>
              <th>Student Full Name</th>
              <th>Strand</th>
              ${quizzes.map((q, idx) => `<th style="text-align:center;font-size:11px;" title="${escHtml(q.title)}">Q${idx + 1}</th>`).join('')}
              <th style="text-align:center;">Taken</th>
              <th style="text-align:center;">Final Grade</th>
              <th style="text-align:center;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${sectionStudents.length > 0 ? sectionStudents.map((st, index) => {
              const isPassing = st.avg !== null && st.avg >= 75;
              const hasAvg = st.avg !== null;
              return `
                <tr>
                  <td style="text-align:center;color:#64748b;font-weight:600;">${index + 1}</td>
                  <td><strong>${escHtml(st.name)}</strong></td>
                  <td>${escHtml(st.strand)}</td>
                  ${quizzes.map(q => {
                    const sc = st.quizScores?.[q.id]?.scorePct;
                    return `<td style="text-align:center;font-size:12px;color:${sc !== undefined && sc !== null ? (sc >= 75 ? '#0f172a' : '#b91c1c') : '#94a3b8'};">${sc !== undefined && sc !== null ? sc + '%' : '—'}</td>`;
                  }).join('')}
                  <td style="text-align:center;font-weight:600;">${st.quizzesTakenCount}</td>
                  <td style="text-align:center;font-weight:700;font-size:13px;color:${hasAvg ? (isPassing ? '#15803d' : '#b91c1c') : '#64748b'};">
                    ${hasAvg ? st.avg.toFixed(2) + '%' : '—'}
                  </td>
                  <td style="text-align:center;">
                    <span class="report-status-pill ${hasAvg ? (isPassing ? 'pass' : 'fail') : 'pending'}">
                      ${hasAvg ? (isPassing ? 'PASSED' : 'FAILED') : 'INCOMPLETE'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="${6 + quizzes.length}" style="text-align:center;padding:30px;color:#94a3b8;">
                  No student records available for this section.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- FORMAL CERTIFICATION & SIGNATURE BLOCKS -->
      <div class="report-signatures-grid">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-name">${escHtml(CURRENT_PROFILE?.full_name || 'Subject Teacher')}</div>
          <div class="signature-title">Prepared by (Subject Instructor)</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-name">${escHtml(sec.adviser || 'Department Adviser')}</div>
          <div class="signature-title">Verified by (Class Adviser)</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-name">Dr. Evelyn R. Sandoval</div>
          <div class="signature-title">Approved by (School Principal)</div>
        </div>
      </div>

      <!-- FOOTER STAMP -->
      <div class="report-document-footer">
        <span>Scholaria Academic System · Official Record</span>
        <span>Confidential Student Information · Haven of Wisdom Academy Inc.</span>
        <span>Official Section Record</span>
      </div>
    </div>
  `;

  document.getElementById('academicReportModal').classList.add('active');
}

/**
 * Opens Individual Student Grade Slip Preview Modal
 */
function openStudentReportModal(studentKey) {
  activeReportType = 'student';
  activeReportStudent = studentKey;

  const student = registeredUsers.find(u => u.dbId === studentKey || u.id === studentKey || u.name === studentKey) || {
    name: studentKey,
    id: studentKey,
    strand: 'STEM',
    gradeLevel: 'Grade 11',
    section: 'Section A'
  };

  const attempts = typeof getAllRecordedAttempts === 'function' ? getAllRecordedAttempts() : [];
  const studAttempts = attempts.filter(a => isAttemptBelongingToStudent(a, student));
  const custom = typeof getCustomClassRecEntries === 'function' ? getCustomClassRecEntries() : {};
  const studCustom = custom[student.id] || custom[student.dbId] || custom[student.name] || {};

  const quizzes = typeof getClassRecordQuizzes === 'function' ? getClassRecordQuizzes() : [];
  
  // Calculate assessments details
  const assessmentsList = [];
  let scoreSum = 0;
  let scoreCount = 0;

  quizzes.forEach((q, idx) => {
    let scorePct = null;
    let rawScore = '—';
    let totalItems = '—';
    let dateTaken = '—';

    const att = studAttempts.find(a =>
      String(a.quiz_id || '').toLowerCase() === String(q.id || '').toLowerCase() ||
      (a.quiz_title && String(a.quiz_title).toLowerCase() === String(q.title || '').toLowerCase())
    );

    if (att) {
      if (att.score_percentage !== undefined && att.score_percentage !== null) {
        scorePct = Math.round(Number(att.score_percentage));
      } else if (att.score !== undefined && att.total_items) {
        scorePct = Math.round((att.score / att.total_items) * 100);
      }
      rawScore = att.score !== undefined ? att.score : '—';
      totalItems = att.total_items || 10;
      dateTaken = att.submitted_at ? new Date(att.submitted_at).toLocaleDateString() : 'Recorded';
    } else if (studCustom[q.id] !== undefined) {
      scorePct = Number(studCustom[q.id]);
      rawScore = scorePct;
      totalItems = 100;
      dateTaken = 'Manual Entry';
    }

    if (scorePct !== null && !isNaN(scorePct)) {
      scoreSum += scorePct;
      scoreCount++;
    }

    assessmentsList.push({
      num: idx + 1,
      title: q.title || `Quiz ${idx + 1}`,
      subject: studCustom.subject || (ROLE === 'teacher' ? (CURRENT_PROFILE?.subjects || 'Web Systems') : 'Web Systems'),
      rawScore,
      totalItems,
      scorePct,
      dateTaken
    });
  });

  const finalAvg = scoreCount > 0 ? Number((scoreSum / scoreCount).toFixed(2)) : null;
  const isPassing = finalAvg !== null && finalAvg >= 75;

  const dateGenerated = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const body = document.getElementById('academicReportModalBody');
  const head = document.getElementById('academicReportModalHead');
  if (!body || !head) return;

  head.innerHTML = `
    <div>
      <h3 style="font-size:17px;font-weight:800;color:#0f172a;margin-bottom:2px;">Student Grade Slip — ${escHtml(student.name)}</h3>
      <span style="font-size:12px;color:var(--text-muted);">Official Individual Assessment Breakdown & Report Card</span>
    </div>
    <div style="display:flex;gap:10px;align-items:center;">
      <button class="gen-btn" style="background:#1e293b;color:#fff;display:inline-flex;align-items:center;gap:6px;padding:7px 16px;" onclick="triggerPrintReport()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save PDF
      </button>
      <button class="modal-x" onclick="closeAcademicReportModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  body.innerHTML = `
    <div class="report-document-sheet printable-document student-grade-report" id="printableReportArea" style="max-width:680px;">
      <!-- OFFICIAL SCHOOL HEADER -->
      <div class="report-school-header">
        <div class="report-logo-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        </div>
        <div class="report-school-details">
          <h2>HAVEN OF WISDOM ACADEMY, INC.</h2>
          <p>Senior High School Department · Academic Affairs & Records Office</p>
          <span class="report-doc-badge">OFFICIAL STUDENT GRADE SLIP & EVALUATION</span>
        </div>
      </div>

      <!-- STUDENT INFORMATION STRIP -->
      <div class="report-info-grid">
        <div class="report-info-item"><strong>Student Name:</strong> <span>${escHtml(student.name)}</span></div>
        <div class="report-info-item"><strong>Student ID:</strong> <span>${escHtml(student.id || studentKey)}</span></div>
        <div class="report-info-item"><strong>Grade & Strand:</strong> <span>${escHtml(student.gradeLevel || 'Grade 11')} — ${escHtml(student.strand || 'STEM')}</span></div>
        <div class="report-info-item"><strong>Class Section:</strong> <span>${escHtml(student.section || 'Unassigned')}</span></div>
        <div class="report-info-item"><strong>Grading Period:</strong> <span>Term 1 / Midterm</span></div>
        <div class="report-info-item"><strong>Date Issued:</strong> <span>${dateGenerated}</span></div>
      </div>

      <!-- STUDENT FINAL GRADE SUMMARY CARD -->
      <div class="student-grade-summary-card ${isPassing ? 'pass-card' : 'fail-card'}">
        <div>
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#475569;">Cumulative Subject Average</div>
          <div style="font-size:28px;font-weight:800;color:${finalAvg !== null ? (isPassing ? '#15803d' : '#b91c1c') : '#64748b'};margin-top:2px;">
            ${finalAvg !== null ? finalAvg.toFixed(2) + '%' : 'No Grades'}
          </div>
        </div>
        <div style="text-align:right;">
          <span class="report-status-pill ${finalAvg !== null ? (isPassing ? 'pass' : 'fail') : 'pending'}" style="font-size:13px;padding:5px 14px;">
            ${finalAvg !== null ? (isPassing ? (finalAvg >= 90 ? 'PASSED (OUTSTANDING)' : 'PASSED') : 'NEEDS IMPROVEMENT') : 'PENDING'}
          </span>
          <div style="font-size:11.5px;color:#64748b;margin-top:6px;">${scoreCount} of ${assessmentsList.length} Quizzes Completed</div>
        </div>
      </div>

      <!-- ASSESSMENT BREAKDOWN TABLE -->
      <div class="report-table-container">
        <table class="report-table">
          <colgroup>
            <col style="width:5%;"><col style="width:31%;"><col style="width:19%;"><col style="width:15%;"><col style="width:13%;"><col style="width:17%;">
          </colgroup>
          <thead>
            <tr>
              <th style="width:36px;text-align:center;">#</th>
              <th>Assessment Title</th>
              <th>Subject</th>
              <th style="text-align:center;">Score / Items</th>
              <th style="text-align:center;">Percentage</th>
              <th style="text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${assessmentsList.map(a => {
              const hasScore = a.scorePct !== null;
              const aPass = hasScore && a.scorePct >= 75;
              return `
                <tr>
                  <td style="text-align:center;color:#64748b;">${a.num}</td>
                  <td><strong>${escHtml(a.title)}</strong></td>
                  <td>${escHtml(a.subject)}</td>
                  <td style="text-align:center;">${a.rawScore} / ${a.totalItems}</td>
                  <td style="text-align:center;font-weight:700;color:${hasScore ? (aPass ? '#15803d' : '#b91c1c') : '#94a3b8'};">
                    ${hasScore ? a.scorePct + '%' : '—'}
                  </td>
                  <td style="text-align:center;">
                    <span class="report-status-pill ${hasScore ? (aPass ? 'pass' : 'fail') : 'pending'}">
                      ${hasScore ? (aPass ? 'Passed' : 'Failed') : 'Pending'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- SIGNATURE BLOCK -->
      <div class="report-signatures-grid" style="grid-template-columns:1fr 1fr;margin-top:36px;">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-name">${escHtml(CURRENT_PROFILE?.full_name || 'Subject Instructor')}</div>
          <div class="signature-title">Subject Teacher</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-name" style="color:#94a3b8;">Parent / Guardian Signature</div>
          <div class="signature-title">Acknowledgment over Printed Name</div>
        </div>
      </div>

      <!-- FOOTER STAMP -->
      <div class="report-document-footer">
        <span>Student Form 138-A · Haven of Wisdom Academy Inc.</span>
        <span>Issued via Scholaria Academic Portal</span>
      </div>
    </div>
  `;

  const reportModal = document.getElementById('academicReportModal');
  reportModal.classList.add('active', 'student-grade-slip-fit');
  if (studentGradeSlipResizeHandler) window.removeEventListener('resize', studentGradeSlipResizeHandler);
  studentGradeSlipResizeHandler = fitStudentGradeSlipPreview;
  window.addEventListener('resize', studentGradeSlipResizeHandler);
  requestAnimationFrame(() => requestAnimationFrame(fitStudentGradeSlipPreview));
}

/**
 * Exports Section Grade Summary to clean CSV
 */
function exportSectionGradeCSV(sectionName) {
  const targetSec = sectionName || (managedSections[0]?.name || 'Section A');
  const quizzes = typeof getClassRecordQuizzes === 'function' ? getClassRecordQuizzes() : [];
  const allEntries = typeof buildRealClassRecordEntries === 'function' ? buildRealClassRecordEntries() : [];

  const sectionStudents = allEntries.filter(e =>
    (e.section || '').trim().toLowerCase() === targetSec.trim().toLowerCase()
  );

  const headers = [
    'No.',
    'Student Name',
    'Student ID',
    'Strand',
    'Grade Level',
    'Section',
    ...quizzes.map(q => `"${(q.title || 'Quiz').replace(/"/g, '""')}"`),
    'Quizzes Taken',
    'Final Grade (%)',
    'Remarks'
  ];

  const rows = sectionStudents.map((st, i) => {
    const isPassing = st.avg !== null && st.avg >= 75;
    const hasAvg = st.avg !== null;
    const remarks = hasAvg ? (isPassing ? 'PASSED' : 'FAILED') : 'INCOMPLETE';

    const quizValues = quizzes.map(q => {
      const sc = st.quizScores?.[q.id]?.scorePct;
      return sc !== undefined && sc !== null ? sc : '';
    });

    return [
      i + 1,
      `"${st.name.replace(/"/g, '""')}"`,
      `"${st.key}"`,
      `"${st.strand}"`,
      `"Grade 11"`,
      `"${targetSec}"`,
      ...quizValues,
      st.quizzesTakenCount,
      hasAvg ? st.avg.toFixed(2) : '',
      `"${remarks}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Grade_Summary_${targetSec.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Exported ${targetSec} grade summary to CSV!`, 'success');
}

/* ── OFFICIAL INSTITUTIONAL CENSUS REPORT ── */

function buildInstitutionalCensusData() {
  const allUsers = typeof registeredUsers !== 'undefined' ? registeredUsers : [];
  const students = allUsers.filter(u => u.role === 'student');
  const teachers = allUsers.filter(u => u.role === 'teacher');
  const admins = allUsers.filter(u => u.role === 'admin');

  const ratio = teachers.length
    ? `1 : ${Math.max(1, Math.round(students.length / teachers.length))}`
    : '—';

  const strandCounts = { STEM: 0, HUMSS: 0, ABM: 0, TVL: 0, GAS: 0 };
  students.forEach(s => {
    const raw = (s.strand || '').toUpperCase();
    if (raw.includes('STEM')) strandCounts.STEM++;
    else if (raw.includes('HUMSS')) strandCounts.HUMSS++;
    else if (raw.includes('ABM')) strandCounts.ABM++;
    else if (raw.includes('TVL') || raw.includes('ICT')) strandCounts.TVL++;
    else strandCounts.GAS++;
  });

  const gr11 = students.filter(s => (s.grade_level || s.grade || '').includes('11')).length;
  const gr12 = students.filter(s => (s.grade_level || s.grade || '').includes('12')).length;
  const otherGrade = Math.max(0, students.length - (gr11 + gr12));

  const entries = typeof buildRealClassRecordEntries === 'function' ? buildRealClassRecordEntries() : [];
  const validAvgs = entries.map(e => e.avg).filter(a => a !== null && !isNaN(a));
  const passingCount = validAvgs.filter(a => a >= 75).length;
  const passingRate = validAvgs.length ? Math.round((passingCount / validAvgs.length) * 100) : null;

  let archives = [];
  try {
    const raw = localStorage.getItem('scholaria_historical_census_archives');
    if (raw) archives = JSON.parse(raw);
  } catch (_) {}
  if (!Array.isArray(archives)) archives = [];

  const sectionsList = typeof managedSections !== 'undefined' ? managedSections : [];
  const activeSections = sectionsList.filter(s => !s.isArchived);
  const archivedSections = sectionsList.filter(s => s.isArchived);
  const countInSection = name => students.filter(s =>
    (s.section || '').trim().toLowerCase() === String(name || '').trim().toLowerCase()
  ).length;

  const sectionRows = activeSections.map(sec => {
    const enrolled = countInSection(sec.name);
    return {
      name: sec.name,
      gradeLevel: sec.gradeLevel || 'Grade 11',
      strand: sec.strand || 'STEM',
      adviser: sec.adviser || 'Department Adviser',
      enrolled,
      capacity: 45,
      utilPct: Math.min(100, Math.round((enrolled / 45) * 100))
    };
  });
  const archivedRows = archivedSections.map(sec => ({
    name: sec.name,
    gradeLevel: sec.gradeLevel || 'Grade 11',
    strand: sec.strand || 'STEM',
    adviser: sec.adviser || 'Department Adviser',
    enrolled: countInSection(sec.name),
    archivedAt: sec.archivedAt
  }));

  const currentEntry = {
    year: 'S.Y. 2026–2027',
    isCurrent: true,
    students: students.length,
    teachers: teachers.length,
    ratio,
    sections: activeSections.length,
    stem: strandCounts.STEM,
    humss: strandCounts.HUMSS,
    abm: strandCounts.ABM,
    tvl: strandCounts.TVL,
    passingRate: passingRate !== null ? `${passingRate}%` : '—',
    growth: 'Active S.Y.',
    status: 'Current Active'
  };

  return {
    students, teachers, admins, ratio, strandCounts,
    gr11, gr12, otherGrade,
    passingRate, passingCount, assessedCount: validAvgs.length,
    historical: [...archives, currentEntry],
    hasArchives: archives.length > 0,
    sectionRows, archivedRows,
    activeSectionCount: activeSections.length,
    archivedSectionCount: archivedSections.length
  };
}

/**
 * Opens the official Institutional Census as a print-ready document:
 * institutional summary, longitudinal enrollment audit, strand/grade
 * demographics, section capacity register, and archived-section audit trail.
 */
function openInstitutionalCensusReportModal() {
  const modal = document.getElementById('academicReportModal');
  const body = document.getElementById('academicReportModalBody');
  const head = document.getElementById('academicReportModalHead');
  if (!modal || !body || !head) return;

  modal.classList.remove('student-grade-slip-fit');
  if (studentGradeSlipResizeHandler) {
    window.removeEventListener('resize', studentGradeSlipResizeHandler);
    studentGradeSlipResizeHandler = null;
  }
  activeReportType = 'census';
  activeReportSection = null;
  activeReportStudent = null;

  const d = buildInstitutionalCensusData();
  const dateGenerated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const totalStudents = d.students.length;
  const pctOf = n => totalStudents > 0 ? Math.round((n / totalStudents) * 100) : 0;

  const partHeading = (label, note) => `
    <div class="census-part-heading" style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:20px 0 10px;padding-bottom:6px;border-bottom:1.5px solid #cbd5e1;break-inside:avoid;">
      <span class="census-part-label" style="font-size:12px;font-weight:800;letter-spacing:.06em;color:#1e293b;text-transform:uppercase;">${label}</span>
      ${note ? `<span class="census-part-note" style="font-size:10.5px;color:#64748b;">${note}</span>` : ''}
    </div>`;

  const shareBar = (count, color) => `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="flex:1;height:7px;min-width:40px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${pctOf(count)}%;background:${color};border-radius:4px;"></div>
      </div>
      <span style="font-size:11px;font-weight:700;color:#475569;white-space:nowrap;">${pctOf(count)}%</span>
    </div>`;

  const capacityPill = pct => pct >= 100
    ? '<span class="report-status-pill fail">At Capacity</span>'
    : pct >= 90
      ? '<span class="report-status-pill fail">Near Capacity</span>'
      : pct >= 75
        ? '<span class="report-status-pill" style="background:#fef3c7;color:#b45309;">Filling Up</span>'
        : '<span class="report-status-pill pass">Open</span>';

  const strandDefs = [
    { key: 'STEM', code: 'STEM', label: 'Science, Technology, Engineering & Math', color: '#0284c7' },
    { key: 'HUMSS', code: 'HUMSS', label: 'Humanities & Social Sciences', color: '#8b5cf6' },
    { key: 'ABM', code: 'ABM', label: 'Accountancy, Business & Management', color: '#f59e0b' },
    { key: 'TVL', code: 'TVL/ICT', label: 'Technical-Vocational-Livelihood (ICT)', color: '#10b981' },
    { key: 'GAS', code: 'GAS', label: 'General Academic Strand / Other', color: '#64748b' }
  ];

  head.innerHTML = `
    <div>
      <h3 style="font-size:17px;font-weight:800;color:#0f172a;margin-bottom:2px;">Print & Export Preview — Institutional Census</h3>
      <span style="font-size:12px;color:var(--text-muted);">Official enrollment, faculty & section capacity census · S.Y. 2026–2027</span>
    </div>
    <div style="display:flex;gap:10px;align-items:center;">
      <button class="foot-btn-secondary" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;" onclick="exportAdminCensusCSV()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export CSV
      </button>
      <button class="gen-btn" style="background:#1e293b;color:#fff;display:inline-flex;align-items:center;gap:6px;padding:7px 16px;" onclick="triggerPrintReport()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save PDF
      </button>
      <button class="modal-x" onclick="closeAcademicReportModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  body.innerHTML = `
    <div class="report-document-sheet printable-document institutional-census-report" id="printableReportArea" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      <!-- OFFICIAL SCHOOL HEADER -->
      <div class="report-school-header">
        <div class="report-logo-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        </div>
        <div class="report-school-details">
          <h2>HAVEN OF WISDOM ACADEMY, INC.</h2>
          <p>Senior High School Department · Office of Academic Affairs & Records</p>
          <span class="report-doc-badge">OFFICIAL INSTITUTIONAL ENROLLMENT & CAPACITY CENSUS</span>
        </div>
      </div>

      <!-- CENSUS METADATA -->
      <div class="report-info-grid">
        <div class="report-info-item"><strong>Institution:</strong> <span>Haven of Wisdom Academy, Inc.</span></div>
        <div class="report-info-item"><strong>Academic Year:</strong> <span>S.Y. 2026–2027 · Term 1</span></div>
        <div class="report-info-item"><strong>Department:</strong> <span>Senior High School (Grades 11–12)</span></div>
        <div class="report-info-item"><strong>Census As-Of:</strong> <span>${dateGenerated}</span></div>
        <div class="report-info-item"><strong>Administrative Staff:</strong> <span>${d.admins.length} personnel</span></div>
        <div class="report-info-item"><strong>Prepared By:</strong> <span>${escHtml(CURRENT_PROFILE?.full_name || 'School Administrator')}</span></div>
      </div>

      <!-- INSTITUTIONAL KEY FIGURES -->
      <div class="report-kpi-row">
        <div class="report-kpi-card">
          <div class="kpi-label">Total Enrollees</div>
          <div class="kpi-value">${totalStudents}</div>
          <div class="kpi-sub">Grade 11: ${d.gr11} · Grade 12: ${d.gr12}</div>
        </div>
        <div class="report-kpi-card">
          <div class="kpi-label">Active Faculty</div>
          <div class="kpi-value">${d.teachers.length}</div>
          <div class="kpi-sub">Student–Teacher Ratio ${d.ratio}</div>
        </div>
        <div class="report-kpi-card">
          <div class="kpi-label">Active Sections</div>
          <div class="kpi-value">${d.activeSectionCount}</div>
          <div class="kpi-sub">${d.archivedSectionCount} archived · 45-seat cap</div>
        </div>
        <div class="report-kpi-card">
          <div class="kpi-label">Overall Passing Rate</div>
          <div class="kpi-value ${d.passingRate !== null ? (d.passingRate >= 75 ? 'text-green' : 'text-amber') : ''}">${d.passingRate !== null ? d.passingRate + '%' : '—'}</div>
          <div class="kpi-sub">${d.passingCount} of ${d.assessedCount} assessed</div>
        </div>
      </div>

      ${partHeading('Part I — Longitudinal Enrollment & Faculty Audit', `${d.historical.length}-year comparative range`)}
      <div class="report-table-container">
        <table class="report-table">
          <colgroup>
            <col style="width:13%;"><col style="width:8%;"><col style="width:10%;"><col style="width:7%;">
            <col style="width:10%;"><col style="width:7%;"><col style="width:6%;"><col style="width:6%;">
            <col style="width:6%;"><col style="width:6%;"><col style="width:10%;"><col style="width:11%;">
          </colgroup>
          <thead>
            <tr>
              <th>Academic Year</th>
              <th style="text-align:center;">Enrollment</th>
              <th style="text-align:center;">YoY Trend</th>
              <th style="text-align:center;">Faculty</th>
              <th style="text-align:center;">Stud–Teacher Ratio</th>
              <th style="text-align:center;">Sections</th>
              <th style="text-align:center;">STEM</th>
              <th style="text-align:center;">HUMSS</th>
              <th style="text-align:center;">ABM</th>
              <th style="text-align:center;">TVL/ICT</th>
              <th style="text-align:center;">Passing Rate</th>
              <th style="text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${d.historical.map(h => `
              <tr${h.isCurrent ? ' style="background:#f0f9ff;"' : ''}>
                <td><strong>${escHtml(h.year)}</strong>${h.isCurrent ? ' <span style="color:#0284c7;font-weight:700;font-size:10px;">(Active)</span>' : ''}</td>
                <td style="text-align:center;"><strong>${h.students}</strong></td>
                <td style="text-align:center;font-weight:700;color:${h.isCurrent || String(h.growth || '').startsWith('+') ? '#15803d' : '#64748b'};">${escHtml(h.growth || '—')}</td>
                <td style="text-align:center;">${h.teachers}</td>
                <td style="text-align:center;">${escHtml(h.ratio || '—')}</td>
                <td style="text-align:center;">${h.sections}</td>
                <td style="text-align:center;">${h.stem}</td>
                <td style="text-align:center;">${h.humss}</td>
                <td style="text-align:center;">${h.abm}</td>
                <td style="text-align:center;">${h.tvl}</td>
                <td style="text-align:center;font-weight:700;">${escHtml(String(h.passingRate ?? '—'))}</td>
                <td style="text-align:center;"><span class="report-status-pill ${h.isCurrent ? 'pass' : 'pending'}">${h.isCurrent ? 'Active' : escHtml(h.status || 'Finalized')}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${!d.hasArchives ? `
        <p style="font-size:10.5px;color:#94a3b8;margin:-18px 0 18px;font-style:italic;">No prior-year archives on record yet — year-over-year rows appear automatically once previous school years are archived.</p>
      ` : ''}

      <!-- DEMOGRAPHIC BREAKDOWN: STRAND & GRADE LEVEL -->
      <div class="census-breakdown-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;break-inside:avoid;">
        <div>
          ${partHeading('Census by Academic Strand', 'S.Y. 2026–2027')}
          <div class="report-table-container" style="margin-bottom:0;">
            <table class="report-table" style="min-width:0;">
              <colgroup><col style="width:16%;"><col style="width:42%;"><col style="width:14%;"><col style="width:28%;"></colgroup>
              <thead>
                <tr><th>Strand</th><th>Academic Track</th><th style="text-align:center;">Enrollees</th><th>Share</th></tr>
              </thead>
              <tbody>
                ${strandDefs.map(st => `
                  <tr>
                    <td><strong style="color:${st.color};">${st.code}</strong></td>
                    <td>${st.label}</td>
                    <td style="text-align:center;"><strong>${d.strandCounts[st.key]}</strong></td>
                    <td>${shareBar(d.strandCounts[st.key], st.color)}</td>
                  </tr>
                `).join('')}
                <tr style="background:#f1f5f9;">
                  <td colspan="2"><strong>TOTAL INSTITUTIONAL ENROLLMENT</strong></td>
                  <td style="text-align:center;"><strong>${totalStudents}</strong></td>
                  <td><strong style="font-size:11px;color:#475569;">${totalStudents > 0 ? '100%' : '—'}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div>
          ${partHeading('Census by Grade Level', 'S.Y. 2026–2027')}
          <div class="report-table-container" style="margin-bottom:0;">
            <table class="report-table" style="min-width:0;">
              <colgroup><col style="width:34%;"><col style="width:20%;"><col style="width:46%;"></colgroup>
              <thead>
                <tr><th>Grade Level</th><th style="text-align:center;">Enrollees</th><th>Share</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Grade 11</strong></td>
                  <td style="text-align:center;"><strong>${d.gr11}</strong></td>
                  <td>${shareBar(d.gr11, '#0284c7')}</td>
                </tr>
                <tr>
                  <td><strong>Grade 12</strong></td>
                  <td style="text-align:center;"><strong>${d.gr12}</strong></td>
                  <td>${shareBar(d.gr12, '#7c3aed')}</td>
                </tr>
                <tr>
                  <td>Other / Unassigned</td>
                  <td style="text-align:center;">${d.otherGrade}</td>
                  <td>${shareBar(d.otherGrade, '#94a3b8')}</td>
                </tr>
                <tr style="background:#f1f5f9;">
                  <td><strong>TOTAL</strong></td>
                  <td style="text-align:center;"><strong>${totalStudents}</strong></td>
                  <td><strong style="font-size:11px;color:#475569;">${totalStudents > 0 ? '100%' : '—'}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="census-personnel-note" style="margin-top:12px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;color:#475569;line-height:1.5;">
            <strong style="color:#1e293b;">Personnel complement:</strong> ${d.teachers.length} active faculty members and ${d.admins.length} administrative staff serving ${totalStudents} enrollees across ${d.activeSectionCount} active sections.
          </div>
        </div>
      </div>

      <!-- PART II: SECTION CAPACITY REGISTER (flows on the same sheet; compact
           print styling keeps a typical census to a single A4 landscape page) -->
      ${partHeading('Part II — Section Capacity & Utilization Register', `Standard capacity: 45 seats per section`)}
      <div class="report-table-container">
        <table class="report-table">
          <colgroup>
            <col style="width:4%;"><col style="width:16%;"><col style="width:10%;"><col style="width:9%;">
            <col style="width:17%;"><col style="width:8%;"><col style="width:8%;"><col style="width:18%;"><col style="width:10%;">
          </colgroup>
          <thead>
            <tr>
              <th style="text-align:center;">#</th>
              <th>Section</th>
              <th>Grade Level</th>
              <th>Strand</th>
              <th>Class Adviser</th>
              <th style="text-align:center;">Enrolled</th>
              <th style="text-align:center;">Capacity</th>
              <th>Utilization</th>
              <th style="text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${d.sectionRows.length ? d.sectionRows.map((s, i) => `
              <tr>
                <td style="text-align:center;color:#64748b;">${i + 1}</td>
                <td><strong>${escHtml(s.name)}</strong></td>
                <td>${escHtml(s.gradeLevel)}</td>
                <td>${escHtml(s.strand)}</td>
                <td>${escHtml(s.adviser)}</td>
                <td style="text-align:center;"><strong>${s.enrolled}</strong></td>
                <td style="text-align:center;">${s.capacity}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;height:7px;min-width:40px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                      <div style="height:100%;width:${s.utilPct}%;background:${s.utilPct >= 90 ? '#dc2626' : s.utilPct >= 75 ? '#d97706' : '#059669'};border-radius:4px;"></div>
                    </div>
                    <span style="font-size:11px;font-weight:700;color:${s.utilPct >= 90 ? '#dc2626' : '#475569'};white-space:nowrap;">${s.utilPct}% (${s.enrolled}/${s.capacity})</span>
                  </div>
                </td>
                <td style="text-align:center;">${capacityPill(s.utilPct)}</td>
              </tr>
            `).join('') : `
              <tr><td colspan="9" style="text-align:center;padding:24px;color:#94a3b8;">No active sections configured in the census.</td></tr>
            `}
            ${d.sectionRows.length ? `
              <tr style="background:#f1f5f9;">
                <td colspan="5"><strong>TOTAL ACTIVE SECTIONS: ${d.sectionRows.length}</strong></td>
                <td style="text-align:center;"><strong>${d.sectionRows.reduce((a, s) => a + s.enrolled, 0)}</strong></td>
                <td style="text-align:center;"><strong>${d.sectionRows.length * 45}</strong></td>
                <td colspan="2" style="font-size:11px;color:#475569;">Institution-wide utilization: <strong>${d.sectionRows.length ? Math.round((d.sectionRows.reduce((a, s) => a + s.enrolled, 0) / (d.sectionRows.length * 45)) * 100) : 0}%</strong></td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <!-- ARCHIVED SECTIONS AUDIT TRAIL -->
      ${partHeading('Archived Sections — Audit Trail', 'Excluded from active headcounts')}
      <div class="report-table-container">
        <table class="report-table">
          <colgroup>
            <col style="width:18%;"><col style="width:18%;"><col style="width:22%;"><col style="width:12%;"><col style="width:16%;"><col style="width:14%;">
          </colgroup>
          <thead>
            <tr>
              <th>Section</th>
              <th>Grade & Strand</th>
              <th>Class Adviser</th>
              <th style="text-align:center;">Last Headcount</th>
              <th>Archived Date</th>
              <th style="text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${d.archivedRows.length ? d.archivedRows.map(s => `
              <tr>
                <td><strong>${escHtml(s.name)}</strong></td>
                <td>${escHtml(s.gradeLevel)} · ${escHtml(s.strand)}</td>
                <td>${escHtml(s.adviser)}</td>
                <td style="text-align:center;">${s.enrolled}</td>
                <td>${s.archivedAt ? new Date(s.archivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</td>
                <td style="text-align:center;"><span class="report-status-pill" style="background:#fef3c7;color:#b45309;">Archived</span></td>
              </tr>
            `).join('') : `
              <tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">No archived sections on record for this census period.</td></tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- CERTIFICATION -->
      <div class="census-certification" style="margin-top:6px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;line-height:1.55;color:#475569;break-inside:avoid;">
        <strong style="color:#1e293b;">Certification.</strong> This institutional census certifies that the enrollment, faculty, and section capacity figures stated above are drawn from the official Scholaria academic records of Haven of Wisdom Academy, Inc. as of ${dateGenerated}, and reflect the active roster for S.Y. 2026–2027. Archived sections are excluded from active headcounts and listed separately for audit purposes.
      </div>

      <!-- FORMAL SIGNATURE BLOCKS -->
      <div class="report-signatures-grid">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-name">${escHtml(CURRENT_PROFILE?.full_name || 'School Administrator')}</div>
          <div class="signature-title">Prepared by (Administrator)</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-name">Office of the Registrar</div>
          <div class="signature-title">Certified by (Academic Records)</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-name">Dr. Evelyn R. Sandoval</div>
          <div class="signature-title">Approved by (School Principal)</div>
        </div>
      </div>

      <!-- FOOTER STAMP -->
      <div class="report-document-footer">
        <span>Scholaria Academic System · Institutional Census</span>
        <span>Confidential · Official Institutional Record · Haven of Wisdom Academy Inc.</span>
        <span>S.Y. 2026–2027</span>
      </div>
    </div>
  `;

  body.scrollTop = 0;
  modal.classList.add('active');
}
