/* ── ACADEMIC REPORT GENERATION & PRINT ENGINE ── */

let activeReportType = null; // 'section' | 'student'
let activeReportSection = null;
let activeReportStudent = null;

function closeAcademicReportModal() {
  const modal = document.getElementById('academicReportModal');
  if (modal) modal.classList.remove('active');
}

function triggerPrintReport() {
  const prevTitle = document.title;
  if (activeReportType === 'section') {
    document.title = activeReportSection
      ? `Master_Grade_Sheet_${activeReportSection.replace(/\s+/g, '_')}`
      : 'Master_Grade_Sheets_All_Sections';
  } else if (activeReportType === 'student') {
    const studentObj = (typeof registeredUsers !== 'undefined' ? registeredUsers : []).find(u => u.dbId === activeReportStudent || u.id === activeReportStudent || u.name === activeReportStudent);
    const sName = studentObj?.name || activeReportStudent || 'Student';
    document.title = `Grade_Slip_${sName.replace(/\s+/g, '_')}`;
  }

  const body = document.getElementById('academicReportModalBody');
  if (body) body.scrollTop = 0;
  window.scrollTo(0, 0);

  // Wait for the report DOM and print styles to settle before Chromium captures it.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.print());
  });

  setTimeout(() => {
    document.title = prevTitle;
  }, 1000);
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
    <div class="report-document-sheet printable-document" id="printableReportArea">
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
          <thead>
            <tr>
              <th style="width:32px;text-align:center;">#</th>
              <th style="text-align:left;white-space:nowrap;">Student Full Name</th>
              <th style="width:65px;text-align:center;">Strand</th>
              ${quizzes.map((q, idx) => `<th style="width:46px;text-align:center;font-size:11px;" title="${escHtml(q.title)}">Q${idx + 1}</th>`).join('')}
              <th style="width:52px;text-align:center;">Taken</th>
              <th style="width:80px;text-align:center;white-space:nowrap;">Final Grade</th>
              <th style="width:90px;text-align:center;white-space:nowrap;">Remarks</th>
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
                  <td style="text-align:center;white-space:nowrap;">
                    <span class="report-status-pill ${hasAvg ? (isPassing ? 'pass' : 'fail') : 'pending'}" style="display:inline-block;padding:3px 9px;white-space:nowrap;font-weight:800;letter-spacing:0.5px;">
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
        <span>Page 1 of 1</span>
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
    <div class="report-document-sheet printable-document" id="printableReportArea" style="max-width:680px;">
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

  document.getElementById('academicReportModal').classList.add('active');
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
