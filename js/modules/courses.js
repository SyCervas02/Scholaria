/* ── COURSES MODULE — HAVEN OF WISDOM ACADEMY ENROLLED SUBJECTS & INDIVIDUAL PDF MODULES ── */

const COURSES_DATABASE = [
  // ── STEM STRAND SUBJECTS ──
  {
    id: 'course-pre-calc',
    title: 'Pre-Calculus',
    code: 'STEM-1101',
    strand: 'STEM',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 45,
    modules: 0,
    instructor: 'Dr. Eleanor Llorente',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
    description: 'Covers analytic geometry, conic sections, systems of nonlinear equations, and circular/trigonometric functions.',
    documents: []
  },
  {
    id: 'course-gen-bio1',
    title: 'General Biology 1',
    code: 'STEM-1102',
    strand: 'STEM',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 35,
    modules: 0,
    instructor: 'Prof. Maria Reyes',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=600&q=80',
    description: 'Study of cell structure, cellular processes, biological molecules, and energy transformation.',
    documents: []
  },
  {
    id: 'course-gen-phys1',
    title: 'General Physics 1',
    code: 'STEM-1201',
    strand: 'STEM',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 60,
    modules: 0,
    instructor: 'Dr. Arthur Cruz',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80',
    description: 'Mechanics, kinematics, dynamics, work, energy, momentum, and rotational motion.',
    documents: []
  },
  {
    id: 'course-gen-chem1',
    title: 'General Chemistry 1',
    code: 'STEM-1202',
    strand: 'STEM',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 50,
    modules: 0,
    instructor: 'Dr. Patricia Mendoza',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
    description: 'Matter, atomic structure, chemical bonding, stoichiometry, and thermochemistry.',
    documents: []
  },
  {
    id: 'course-gen-math',
    title: 'General Mathematics',
    code: 'MATH-1101',
    strand: 'All',
    track: 'Core',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 40,
    modules: 0,
    instructor: 'Dr. Wilfredo Santos',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80',
    description: 'Functions and their graphs, rational, exponential, and logarithmic functions, business mathematics, and logic.',
    documents: []
  },
  {
    id: 'course-stat-prob',
    title: 'Statistics and Probability',
    code: 'STAT-1102',
    strand: 'All',
    track: 'Core',
    gradeLevel: 'Grade 11',
    semester: '2nd Sem',
    progress: 30,
    modules: 0,
    instructor: 'Dr. Eleanor Llorente',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
    description: 'Random variables, probability distributions, sampling techniques, parameter estimation, and hypothesis testing.',
    documents: []
  },
  {
    id: 'course-read-write',
    title: 'Reading and Writing Skills',
    code: 'ENG-1102',
    strand: 'All',
    track: 'Core',
    gradeLevel: 'Grade 11',
    semester: '2nd Sem',
    progress: 55,
    modules: 0,
    instructor: 'Ms. Liza Navarro',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
    description: 'Critical reading strategies, text and context connections, and academic writing across disciplines.',
    documents: []
  },
  {
    id: 'course-empotech',
    title: 'Empowerment Technologies (ICT)',
    code: 'ICT-1101',
    strand: 'All',
    track: 'Applied',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 75,
    modules: 0,
    instructor: 'Engr. Julian Callanta',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
    description: 'Information and communication technology tools, digital safety, and web prototyping.',
    documents: []
  },
  {
    id: 'course-earth-life',
    title: 'Earth and Life Science',
    code: 'SCI-1101',
    strand: 'All',
    track: 'Core',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 100,
    modules: 0,
    instructor: 'Prof. Gabriel Santos',
    status: 'completed',
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    description: 'Earth subsystems, geological processes, origin of life, and ecosystems.',
    documents: []
  },
  {
    id: 'course-basic-calc',
    title: 'Basic Calculus',
    code: 'STEM-1103',
    strand: 'STEM',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '2nd Sem',
    progress: 20,
    modules: 0,
    instructor: 'Dr. Eleanor Llorente',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80',
    description: 'Limits, continuity, and differential calculus with mathematical applications.',
    documents: []
  },
  {
    id: 'course-mil',
    title: 'Media & Information Literacy',
    code: 'MIL-1201',
    strand: 'All',
    track: 'Core',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 85,
    modules: 0,
    instructor: 'Ms. Clara Asis',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
    description: 'Media languages, critical consumption, and responsible digital citizenship.',
    documents: []
  },
  {
    id: 'course-oral-comm',
    title: 'Oral Communication in Context',
    code: 'ENG-1101',
    strand: 'All',
    track: 'Core',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 100,
    modules: 0,
    instructor: 'Prof. Teresa Santos',
    status: 'completed',
    cover: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80',
    description: 'Speech styles, communication barriers, speech writing, and delivery strategies.',
    documents: []
  },
  {
    id: 'course-research1',
    title: 'Practical Research 1',
    code: 'RES-1101',
    strand: 'All',
    track: 'Applied',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 40,
    modules: 0,
    instructor: 'Dr. Patricia Mendoza',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
    description: 'Qualitative research methodologies, problem statements, and literature review.',
    documents: []
  },

  // ── HUMSS STRAND SUBJECTS ──
  {
    id: 'course-humss-diss',
    title: 'Disciplines and Ideas in the Social Sciences',
    code: 'HUMSS-1101',
    strand: 'HUMSS',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 40,
    modules: 0,
    instructor: 'Prof. Teresa Santos',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
    description: 'Basic concepts, theories, and methodologies from anthropology, economics, geography, history, and sociology.',
    documents: []
  },
  {
    id: 'course-humss-ppg',
    title: 'Philippine Politics and Governance',
    code: 'HUMSS-1102',
    strand: 'HUMSS',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '2nd Sem',
    progress: 30,
    modules: 0,
    instructor: 'Atty. Roberto Silva',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80',
    description: 'Historical background of Philippine politics, branches of government, political institutions, and civil society.',
    documents: []
  },
  {
    id: 'course-humss-creative-writing',
    title: 'Creative Writing',
    code: 'HUMSS-1201',
    strand: 'HUMSS',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 50,
    modules: 0,
    instructor: 'Ms. Clara Asis',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
    description: 'Poetry, fiction, drama, sensory imagery, literary figures, and creative storytelling techniques.',
    documents: []
  },

  // ── ABM STRAND SUBJECTS ──
  {
    id: 'course-abm-bus-math',
    title: 'Business Math',
    code: 'ABM-1101',
    strand: 'ABM',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 35,
    modules: 0,
    instructor: 'Dr. Wilfredo Santos',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    description: 'Fractions, decimals, percentages, payroll, mark-up, mark-down, gross and net margin, and simple break-even analysis.',
    documents: []
  },
  {
    id: 'course-abm-fabm1',
    title: 'Fundamentals of Accountancy, Business & Management 1',
    code: 'ABM-1102',
    strand: 'ABM',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 45,
    modules: 0,
    instructor: 'Prof. Carmen Reyes',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
    description: 'Accounting concepts, accounting equation, double-entry bookkeeping, journalizing, and financial statement prep.',
    documents: []
  },
  {
    id: 'course-abm-org-mgmt',
    title: 'Organization and Management',
    code: 'ABM-1103',
    strand: 'ABM',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '2nd Sem',
    progress: 25,
    modules: 0,
    instructor: 'Ms. Liza Navarro',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    description: 'Principles, functions, and theories of management in business organizations and enterprise dynamics.',
    documents: []
  },

  // ── TVL STRAND SUBJECTS ──
  {
    id: 'course-tvl-css1',
    title: 'Computer Systems Servicing 1',
    code: 'TVL-1101',
    strand: 'TVL',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 50,
    modules: 0,
    instructor: 'Engr. Julian Callanta',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80',
    description: 'Computer hardware assembly, operating system installation, networking diagnostics, and systems maintenance.',
    documents: []
  },
  {
    id: 'course-tvl-web1',
    title: 'Web Systems and Technologies 1',
    code: 'TVL-1102',
    strand: 'TVL',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '2nd Sem',
    progress: 30,
    modules: 0,
    instructor: 'Engr. Daniel Cruz',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=600&q=80',
    description: 'Client-side web development, HTML5 semantic structure, modern CSS responsive layouts, and interactive UI.',
    documents: []
  }
];

let coursesActiveTab = 'enrolled';

function scrollCoursesGrid(direction) {
  const grid = document.getElementById('cwCardsGrid');
  if (!grid) return;
  const scrollAmount = direction === 'left' ? -320 : 320;
  grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

function isCourseOpenForStudent(course) {
  const studentStrand = (CURRENT_PROFILE?.strand || 'STEM').toUpperCase();
  const courseStrand = (course.strand || 'STEM').toUpperCase();

  // Strict strand check: student only sees subjects belonging to their enrolled strand (e.g. STEM)
  return courseStrand === studentStrand;
}

function handleCourseClick(courseId) {
  const course = COURSES_DATABASE.find(c => c.id === courseId);
  if (!course) return;

  const isOpen = isCourseOpenForStudent(course);
  if (!isOpen) {
    showToast(`🔒 "${course.title}" is locked. Your enrolled strand is ${CURRENT_PROFILE?.strand || 'STEM'}.`, 'error');
    return;
  }

  // Open this specific subject's individual PDF modules & materials
  openSubjectMaterials(courseId);
}

function openSubjectMaterials(courseId) {
  if (typeof setActiveSubjectMaterials === 'function') {
    setActiveSubjectMaterials(courseId);
  }

  // Highlight "My Materials" in sidebar
  document.querySelectorAll('.menu-item').forEach(item => {
    if (item.dataset.page === 'materials') item.classList.add('active');
    else item.classList.remove('active');
  });

  renderPage('materials');
}

function renderCoursesWidgetHTML() {
  const studentStrand = CURRENT_PROFILE?.strand || 'STEM';

  // Get all courses enrolled for the student
  const enrolledList = COURSES_DATABASE.filter(c => isCourseOpenForStudent(c));

  return `
  <div class="courses-widget">
    <div class="cw-hdr">
      <div class="cw-title-wrap">
        <h2 class="cw-title">Enrolled Subjects</h2>
        <span class="cw-subtitle">S.Y. 2024–2025 · First Semester · Click any subject to view its individual PDF learning modules</span>
      </div>
    </div>

    <div class="cw-filters-row">
      <div class="cw-left-filters">
        <div class="cw-tab-group">
          <button class="cw-tab active" title="Subjects Enrolled">
            Subjects Enrolled <span class="cw-count">${enrolledList.length}</span>
          </button>
        </div>
      </div>

      <div class="cw-nav-btns">
        <button class="cw-slide-btn" onclick="scrollCoursesGrid('left')" aria-label="Scroll left" title="Scroll left">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button class="cw-slide-btn" onclick="scrollCoursesGrid('right')" aria-label="Scroll right" title="Scroll right">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <div class="cw-cards-grid" id="cwCardsGrid">
      ${enrolledList.length ? enrolledList.map(c => renderCourseCard(c)).join('') : `
        <div style="padding: 30px; color: var(--text-muted); text-align: center; width: 100%; font-size: 13px;">
          No enrolled subjects found for ${studentStrand}.
        </div>
      `}
    </div>
  </div>`;
}

function renderCourseCard(course) {
  const isOpen = isCourseOpenForStudent(course);
  const isCompleted = course.progress === 100;
  const uploadsForCourse = (typeof materialsData !== 'undefined' && Array.isArray(materialsData))
    ? materialsData.filter(m => (typeof isMaterialMatchingCourse === 'function' ? isMaterialMatchingCourse(m, course) : false) && (m.status === 'approved' || (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE && m.uploaded_by === CURRENT_PROFILE.id)))
    : [];
  const docCount = uploadsForCourse.length;

  return `
  <div class="cw-card ${!isOpen ? 'locked' : ''}" onclick="handleCourseClick('${course.id}')" title="Click to view learning materials for ${escHtml(course.title)}">
    <div class="cw-thumb" style="background-image: url('${course.cover}');">
      <div class="cw-thumb-gradient"></div>
      
      <div class="cw-thumb-top">
        <span class="cw-track-badge">${course.track || 'Core'}</span>
        <span class="cw-strand-badge ${!isOpen ? 'locked-badge' : ''}">${isOpen ? course.strand : '🔒 ' + course.strand}</span>
      </div>

      <div class="cw-thumb-bottom">
        <span class="cw-sem-tag">${course.semester || '1st Sem'} · ${course.gradeLevel || 'Grade 12'}</span>
      </div>

      ${!isOpen ? `
        <div class="cw-lock-overlay">
          <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <span>Locked for ${CURRENT_PROFILE?.strand || 'STEM'}</span>
        </div>` : ''}
    </div>

    <div class="cw-card-body">
      <div class="cw-code-row">
        <span class="cw-course-code">${course.code || 'SUBJ-101'}</span>
        <span class="cw-mod-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          ${docCount} ${docCount === 1 ? 'Handout' : 'Handouts'}
        </span>
      </div>

      <h3 class="cw-card-title">${escHtml(course.title)}</h3>

      <div class="cw-instructor-row">
        <div class="cw-avatar" title="${escHtml(course.instructor)}">${course.instructor ? course.instructor.charAt(course.instructor.startsWith('Dr.') ? 4 : course.instructor.startsWith('Prof.') ? 6 : course.instructor.startsWith('Engr.') ? 6 : course.instructor.startsWith('Ms.') ? 4 : 0) : 'U'}</div>
        <span class="cw-instructor-name">${escHtml(course.instructor || 'Faculty')}</span>
      </div>

      <div class="cw-progress-section">
        <div class="cw-progress-info">
          <span class="cw-progress-text">${isCompleted ? 'Completed' : 'Course Progress'}</span>
          <span class="cw-progress-pct ${isCompleted ? 'done' : ''}">${course.progress}%</span>
        </div>
        <div class="cw-progress-bar-track">
          <div class="cw-progress-bar-fill ${isCompleted ? 'done' : ''}" style="width: ${isOpen ? course.progress : 0}%;"></div>
        </div>
      </div>

      <div class="cw-card-foot">
        <span class="cw-view-link">
          ${docCount > 0 ? 'View Learning Handouts' : 'Open Subject Portal'}
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      </div>
    </div>
  </div>`;
}

function renderCoursesWidget() {
  const container = document.getElementById('coursesWidgetContainer');
  if (container) {
    container.innerHTML = renderCoursesWidgetHTML();
  }
}
