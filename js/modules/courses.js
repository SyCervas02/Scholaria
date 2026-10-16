/* ── COURSES MODULE — HAVEN OF WISDOM ACADEMY ENROLLED SUBJECTS & INDIVIDUAL PDF MODULES ── */

const COURSES_DATABASE = [
  // ── STEM STRAND SPECIALIZED SUBJECTS (Strictly for STEM Sections like Section A, C, E) ──
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

  // ── CORE & APPLIED SUBJECTS (DepEd Mandated for ALL Strands: STEM, HUMSS, ABM, TVL) ──
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

  {
    id: 'course-research2',
    title: 'Practical Research 2',
    code: 'RES-1201',
    strand: 'All',
    track: 'Applied',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 30,
    modules: 0,
    instructor: 'Dr. Patricia Mendoza',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
    description: 'Quantitative research methodologies, statistical analysis, hypothesis testing, and empirical study execution.',
    documents: []
  },
  {
    id: 'course-philosophy',
    title: 'Introduction to the Philosophy of the Human Person',
    code: 'PHIL-1201',
    strand: 'All',
    track: 'Core',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 45,
    modules: 0,
    instructor: 'Dr. Arthur Cruz',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
    description: 'Philosophical reflection on human nature, embodiment, freedom, intersubjectivity, and mortality.',
    documents: []
  },
  {
    id: 'course-cpar',
    title: 'Contemporary Philippine Arts from the Regions',
    code: 'CPAR-1201',
    strand: 'All',
    track: 'Core',
    gradeLevel: 'Grade 12',
    semester: '2nd Sem',
    progress: 25,
    modules: 0,
    instructor: 'Ms. Clara Asis',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80',
    description: 'Appreciation of contemporary art forms, techniques, and cultural heritage from the various regions of the Philippines.',
    documents: []
  },
  
  // ── HUMSS STRAND ALLOCATED SPECIALIZED SUBJECTS (Strictly for HUMSS Sections like Section B) ──
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
    id: 'course-humss-diass',
    title: 'Disciplines and Ideas in the Applied Social Sciences',
    code: 'HUMSS-1103',
    strand: 'HUMSS',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '2nd Sem',
    progress: 35,
    modules: 0,
    instructor: 'Prof. Teresa Santos',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80',
    description: 'Counseling, social work, and communication disciplines and their real-world applications in community development.',
    documents: []
  },
  {
    id: 'course-humss-creative-writing',
    title: 'Creative Writing / Malikhaing Pagsulat',
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
  {
    id: 'course-humss-religions',
    title: 'Introduction to World Religions and Belief Systems',
    code: 'HUMSS-1202',
    strand: 'HUMSS',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 25,
    modules: 0,
    instructor: 'Dr. Arthur Cruz',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    description: 'Historical contexts, founders, core teachings, and practices of major world religions and belief systems.',
    documents: []
  },
  {
    id: 'course-humss-nonfiction',
    title: 'Creative Nonfiction: The Literary Essay',
    code: 'HUMSS-1203',
    strand: 'HUMSS',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '2nd Sem',
    progress: 20,
    modules: 0,
    instructor: 'Ms. Clara Asis',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=600&q=80',
    description: 'Personal essays, memoirs, travelogues, and narrative journalism with literary techniques.',
    documents: []
  },
  {
    id: 'course-humss-community',
    title: 'Community Engagement, Solidarity and Citizenship',
    code: 'HUMSS-1204',
    strand: 'HUMSS',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '2nd Sem',
    progress: 15,
    modules: 0,
    instructor: 'Atty. Roberto Silva',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80',
    description: 'Integration of social science theories in community action, civic participation, and solidarity programs.',
    documents: []
  },

  // ── ABM STRAND ALLOCATED SPECIALIZED SUBJECTS (Strictly for ABM Sections like Section D) ──
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
  {
    id: 'course-abm-marketing',
    title: 'Principles of Marketing',
    code: 'ABM-1104',
    strand: 'ABM',
    track: 'Specialized',
    gradeLevel: 'Grade 11',
    semester: '2nd Sem',
    progress: 30,
    modules: 0,
    instructor: 'Prof. Carmen Reyes',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?auto=format&fit=crop&w=600&q=80',
    description: 'Marketing concepts, consumer analysis, market segmentation, product positioning, and marketing mix strategies.',
    documents: []
  },
  {
    id: 'course-abm-fabm2',
    title: 'Fundamentals of Accountancy, Business & Management 2',
    code: 'ABM-1201',
    strand: 'ABM',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 40,
    modules: 0,
    instructor: 'Prof. Carmen Reyes',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    description: 'Preparation of financial statements for service and merchandising businesses, cash flow, and financial analysis.',
    documents: []
  },
  {
    id: 'course-abm-applied-econ',
    title: 'Applied Economics',
    code: 'ABM-1202',
    strand: 'ABM',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 35,
    modules: 0,
    instructor: 'Dr. Wilfredo Santos',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
    description: 'Microeconomics and macroeconomics principles applied to contemporary Philippine economic issues.',
    documents: []
  },
  {
    id: 'course-abm-finance',
    title: 'Business Finance',
    code: 'ABM-1203',
    strand: 'ABM',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '2nd Sem',
    progress: 20,
    modules: 0,
    instructor: 'Prof. Carmen Reyes',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&w=600&q=80',
    description: 'Financial management, capital budgeting, working capital, financial ratio analysis, and investments.',
    documents: []
  },

  // ── TVL / ICT STRAND ALLOCATED SPECIALIZED SUBJECTS (Strictly for TVL Sections) ──
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
  },
  {
    id: 'course-tvl-web2',
    title: 'Web Systems and Technologies 2',
    code: 'TVL-1201',
    strand: 'TVL',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 35,
    modules: 0,
    instructor: 'Engr. Daniel Cruz',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
    description: 'Full-stack application development, RESTful APIs, back-end scripting, and server configuration.',
    documents: []
  },
  {
    id: 'course-tvl-dbms',
    title: 'Database Management Systems',
    code: 'TVL-1202',
    strand: 'TVL',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 40,
    modules: 0,
    instructor: 'Engr. Julian Callanta',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80',
    description: 'Relational database schema design, SQL querying, data integrity constraints, normalization, and ACID transactions.',
    documents: []
  },
  {
    id: 'course-tvl-cybersec',
    title: 'Cybersecurity Fundamentals',
    code: 'TVL-1203',
    strand: 'TVL',
    track: 'Specialized',
    gradeLevel: 'Grade 12',
    semester: '2nd Sem',
    progress: 25,
    modules: 0,
    instructor: 'Engr. Julian Callanta',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
    description: 'Information security principles, threat modeling, network encryption, vulnerability scanning, and cyber defense.',
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

  // Strict strand check: student sees subjects of their enrolled strand or common Core/Applied subjects
  return courseStrand === studentStrand || courseStrand === 'ALL' || course.track === 'Core' || course.track === 'Applied';
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
    <div class="courses-widget-container">
      <div class="cw-header">
        <div>
          <h3>My Enrolled Subjects</h3>
          <p>DepEd Official Senior High School Curriculum (${studentStrand} Strand · S.Y. 2026–2027)</p>
        </div>
        <div class="cw-controls">
          <button class="cw-nav-btn prev" onclick="scrollCoursesGrid('left')" title="Scroll left">&#8249;</button>
          <button class="cw-nav-btn next" onclick="scrollCoursesGrid('right')" title="Scroll right">&#8250;</button>
        </div>
      </div>
      <div class="cw-cards-grid" id="cwCardsGrid">
        ${enrolledList.map(c => `
          <div class="cw-subject-card" onclick="handleCourseClick('${c.id}')" title="View ${escHtml(c.title)} Modules">
            <div class="cw-card-thumb" style="background-image:url('${c.cover}');">
              <span class="cw-badge-code">${c.code}</span>
              <span class="cw-badge-track">${c.track}</span>
            </div>
            <div class="cw-card-body">
              <h4 class="cw-card-title">${escHtml(c.title)}</h4>
              <p class="cw-card-inst">${escHtml(c.instructor)}</p>
              <div class="cw-progress-bar-wrap">
                <div class="cw-progress-fill" style="width:${c.progress}%;"></div>
              </div>
              <div class="cw-card-meta">
                <span>${c.modules} Modules</span>
                <span>${c.progress}% Finished</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
