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
    modules: 6,
    instructor: 'Dr. Eleanor Llorente',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
    description: 'Covers analytic geometry, conic sections, systems of nonlinear equations, and circular/trigonometric functions.',
    documents: [
      {
        id: 'precalc-m1',
        title: 'Module 01: Introduction to Conic Sections & Circles',
        fileName: 'Pre-Calc_Mod1_Conic_Sections_and_Circles.pdf',
        type: 'pdf',
        size: '2.4 MB',
        pages: 18,
        date: 'Aug 04, 2024',
        topics: 'Standard equations of circles, center-radius form, graphing circles on coordinate plane.'
      },
      {
        id: 'precalc-m2',
        title: 'Module 02: Parabolas, Ellipses & Hyperbolas',
        fileName: 'Pre-Calc_Mod2_Parabolas_Ellipses_Hyperbolas.pdf',
        type: 'pdf',
        size: '3.1 MB',
        pages: 24,
        date: 'Aug 11, 2024',
        topics: 'Foci, directrix, vertices, asymptotes, and real-world parabolic applications.'
      },
      {
        id: 'precalc-m3',
        title: 'Module 03: Systems of Nonlinear Equations',
        fileName: 'Pre-Calc_Mod3_Systems_of_Nonlinear_Equations.pdf',
        type: 'pdf',
        size: '1.9 MB',
        pages: 14,
        date: 'Aug 18, 2024',
        topics: 'Substitution, elimination with quadratics, graphical intersections.'
      },
      {
        id: 'precalc-m4',
        title: 'Module 04: Sequences, Series & Mathematical Induction',
        fileName: 'Pre-Calc_Mod4_Series_and_Mathematical_Induction.pdf',
        type: 'pdf',
        size: '2.7 MB',
        pages: 20,
        date: 'Aug 25, 2024',
        topics: 'Arithmetic & geometric progressions, sigma notation, binomial theorem.'
      },
      {
        id: 'precalc-m5',
        title: 'Module 05: The Unit Circle & Circular Functions',
        fileName: 'Pre-Calc_Mod5_Unit_Circle_and_Trig_Functions.pdf',
        type: 'pdf',
        size: '3.8 MB',
        pages: 28,
        date: 'Sep 02, 2024',
        topics: 'Radian measure, special angles on unit circle, sine/cosine graphs, fundamental identities.'
      },
      {
        id: 'precalc-m6',
        title: 'Handout: Complete Pre-Calculus Formula Sheet & Reference Guide',
        fileName: 'Pre-Calc_Formula_Sheet_Reference.pdf',
        type: 'pdf',
        size: '950 KB',
        pages: 4,
        date: 'Sep 05, 2024',
        topics: 'Quick reference summary of all conic equations, trig identities, and conversion formulas.'
      }
    ]
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
    modules: 5,
    instructor: 'Prof. Maria Reyes',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=600&q=80',
    description: 'Study of cell structure, cellular processes, biological molecules, and energy transformation.',
    documents: [
      {
        id: 'bio-m1',
        title: 'Module 01: Cell Theory, Structure & Organelles',
        fileName: 'GenBio1_Mod1_Cell_Structure_Organelles.pdf',
        type: 'pdf',
        size: '3.6 MB',
        pages: 22,
        date: 'Aug 04, 2024',
        topics: 'Prokaryotic vs Eukaryotic cells, endomembrane system, mitochondria & chloroplasts.'
      },
      {
        id: 'bio-m2',
        title: 'Module 02: Cell Membrane Transport Mechanisms',
        fileName: 'GenBio1_Mod2_Cell_Membrane_Transport.pdf',
        type: 'pdf',
        size: '2.8 MB',
        pages: 18,
        date: 'Aug 12, 2024',
        topics: 'Phospholipid bilayer, active vs passive transport, osmosis and tonicity.'
      },
      {
        id: 'bio-m3',
        title: 'Module 03: Biological Macromolecules',
        fileName: 'GenBio1_Mod3_Biological_Macromolecules.pdf',
        type: 'pdf',
        size: '4.1 MB',
        pages: 26,
        date: 'Aug 19, 2024',
        topics: 'Carbohydrates, lipids, amino acids, protein folding, DNA/RNA nucleotide structure.'
      },
      {
        id: 'bio-m4',
        title: 'Module 04: Enzymes & Cellular Bioenergetics',
        fileName: 'GenBio1_Mod4_Enzymes_and_Energy.pdf',
        type: 'pdf',
        size: '2.5 MB',
        pages: 16,
        date: 'Aug 26, 2024',
        topics: 'Activation energy, enzyme inhibition, ATP synthesis and coupled reactions.'
      },
      {
        id: 'bio-m5',
        title: 'Module 05: Photosynthesis & Cellular Respiration',
        fileName: 'GenBio1_Mod5_Photosynthesis_Respiration.pdf',
        type: 'pdf',
        size: '4.5 MB',
        pages: 30,
        date: 'Sep 02, 2024',
        topics: 'Light dependent reactions, Calvin cycle, glycolysis, Krebs cycle, electron transport chain.'
      }
    ]
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
    modules: 5,
    instructor: 'Dr. Arthur Cruz',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80',
    description: 'Mechanics, kinematics, dynamics, work, energy, momentum, and rotational motion.',
    documents: [
      {
        id: 'phys-m1',
        title: 'Module 01: Vectors & 1D Kinematic Equations',
        fileName: 'GenPhys1_Mod1_Vectors_1D_Kinematics.pdf',
        type: 'pdf',
        size: '2.9 MB',
        pages: 20,
        date: 'Aug 04, 2024',
        topics: 'Vector components, scalar vs vector, uniform accelerated motion equations.'
      },
      {
        id: 'phys-m2',
        title: 'Module 02: 2D Kinematics & Projectile Motion',
        fileName: 'GenPhys1_Mod2_2D_Projectile_Motion.pdf',
        type: 'pdf',
        size: '3.4 MB',
        pages: 22,
        date: 'Aug 11, 2024',
        topics: 'Horizontal vs vertical components, flight time, maximum height, range calculations.'
      },
      {
        id: 'phys-m3',
        title: 'Module 03: Newton’s Laws of Motion & Friction',
        fileName: 'GenPhys1_Mod3_Newtons_Laws_Friction.pdf',
        type: 'pdf',
        size: '3.8 MB',
        pages: 25,
        date: 'Aug 18, 2024',
        topics: 'Free body diagrams, static and kinetic friction, inclined plane problems.'
      },
      {
        id: 'phys-m4',
        title: 'Module 04: Work, Energy & Conservation Laws',
        fileName: 'GenPhys1_Mod4_Work_Energy_Conservation.pdf',
        type: 'pdf',
        size: '2.7 MB',
        pages: 18,
        date: 'Aug 25, 2024',
        topics: 'Work-energy theorem, potential energy curves, conservation of mechanical energy.'
      },
      {
        id: 'phys-m5',
        title: 'Module 05: Impulse, Momentum & Collisions',
        fileName: 'GenPhys1_Mod5_Impulse_Momentum_Collisions.pdf',
        type: 'pdf',
        size: '3.2 MB',
        pages: 21,
        date: 'Sep 02, 2024',
        topics: 'Elastic vs inelastic collisions, center of mass, linear momentum conservation.'
      }
    ]
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
    modules: 5,
    instructor: 'Dr. Patricia Mendoza',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
    description: 'Matter, atomic structure, chemical bonding, stoichiometry, and thermochemistry.',
    documents: [
      {
        id: 'chem-m1',
        title: 'Module 01: Matter, Atomic Structure & Electron Config',
        fileName: 'GenChem1_Mod1_Matter_Atomic_Structure.pdf',
        type: 'pdf',
        size: '2.8 MB',
        pages: 19,
        date: 'Aug 04, 2024',
        topics: 'Subatomic particles, isotopes, quantum numbers, Aufbau principle, Hund’s rule.'
      },
      {
        id: 'chem-m2',
        title: 'Module 02: Chemical Bonding & Lewis Structures',
        fileName: 'GenChem1_Mod2_Chemical_Bonding_Lewis.pdf',
        type: 'pdf',
        size: '3.5 MB',
        pages: 23,
        date: 'Aug 12, 2024',
        topics: 'Ionic and covalent bonds, electronegativity difference, resonance structures, formal charges.'
      },
      {
        id: 'chem-m3',
        title: 'Module 03: Stoichiometry & Chemical Reactions',
        fileName: 'GenChem1_Mod3_Stoichiometry_Reactions.pdf',
        type: 'pdf',
        size: '3.1 MB',
        pages: 21,
        date: 'Aug 19, 2024',
        topics: 'The mole concept, balancing redox equations, limiting and excess reactants, percent yield.'
      },
      {
        id: 'chem-m4',
        title: 'Module 04: Gas Laws & Kinetic Molecular Theory',
        fileName: 'GenChem1_Mod4_Gas_Laws_KMT.pdf',
        type: 'pdf',
        size: '2.6 MB',
        pages: 17,
        date: 'Aug 26, 2024',
        topics: 'Ideal gas law PV=nRT, Dalton’s law of partial pressures, Graham’s law of effusion.'
      },
      {
        id: 'chem-m5',
        title: 'Module 05: Thermochemistry & Enthalpy of Reactions',
        fileName: 'GenChem1_Mod5_Thermochemistry_Enthalpy.pdf',
        type: 'pdf',
        size: '3.0 MB',
        pages: 20,
        date: 'Sep 02, 2024',
        topics: 'Endothermic vs exothermic, calorimetry, Hess’s law, standard enthalpy of formation.'
      }
    ]
  },
  {
    id: 'course-empotech',
    title: 'Empowerment Technologies (ICT)',
    code: 'ICT-1101',
    strand: 'STEM',
    track: 'Applied',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 75,
    modules: 4,
    instructor: 'Engr. Julian Callanta',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
    description: 'Information and communication technology tools, digital safety, and web prototyping.',
    documents: [
      {
        id: 'emp-m1',
        title: 'Module 01: Information & Communication Technology Trends',
        fileName: 'Empotech_Mod1_ICT_Trends.pdf',
        type: 'pdf',
        size: '3.2 MB',
        pages: 20,
        date: 'Aug 04, 2024',
        topics: 'Evolution of Web 1.0, 2.0, 3.0, mobile technologies, and collaborative platforms.'
      },
      {
        id: 'emp-m2',
        title: 'Module 02: Online Safety, Cybersecurity & Netiquette',
        fileName: 'Empotech_Mod2_Online_Safety_Ethics.pdf',
        type: 'pdf',
        size: '2.4 MB',
        pages: 16,
        date: 'Aug 11, 2024',
        topics: 'Digital footprint, malware types, phishing, intellectual property, and copyright.'
      },
      {
        id: 'emp-m3',
        title: 'Module 03: Advanced Spreadsheets & Data Analytics',
        fileName: 'Empotech_Mod3_Spreadsheet_Data_Analytics.pdf',
        type: 'pdf',
        size: '3.9 MB',
        pages: 25,
        date: 'Aug 18, 2024',
        topics: 'VLOOKUP, INDEX/MATCH, logical formulas, pivot tables, chart visualization.'
      },
      {
        id: 'emp-m4',
        title: 'Module 04: Web Prototyping & UX/UI Design Principles',
        fileName: 'Empotech_Mod4_Web_Prototyping_Design.pdf',
        type: 'pdf',
        size: '3.5 MB',
        pages: 22,
        date: 'Aug 25, 2024',
        topics: 'Wireframing, visual hierarchy, typography, user accessibility, responsive design.'
      }
    ]
  },
  {
    id: 'course-earth-life',
    title: 'Earth and Life Science',
    code: 'SCI-1101',
    strand: 'STEM',
    track: 'Core',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 100,
    modules: 4,
    instructor: 'Prof. Gabriel Santos',
    status: 'completed',
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    description: 'Earth subsystems, geological processes, origin of life, and ecosystems.',
    documents: [
      {
        id: 'els-m1',
        title: 'Module 01: Origin & Subsystems of the Earth',
        fileName: 'ELS_Mod1_Earth_Subsystems.pdf',
        type: 'pdf',
        size: '3.0 MB',
        pages: 19,
        date: 'Aug 04, 2024',
        topics: 'Atmosphere, lithosphere, hydrosphere, biosphere interactions, Earth’s unique features.'
      },
      {
        id: 'els-m2',
        title: 'Module 02: Minerals & Rock-Forming Processes',
        fileName: 'ELS_Mod2_Minerals_and_Rocks.pdf',
        type: 'pdf',
        size: '3.8 MB',
        pages: 24,
        date: 'Aug 11, 2024',
        topics: 'Igneous, sedimentary, metamorphic classification, rock cycle, physical mineral properties.'
      },
      {
        id: 'els-m3',
        title: 'Module 03: Plate Tectonics & Internal Earth Heat',
        fileName: 'ELS_Mod3_Plate_Tectonics_Internal_Heat.pdf',
        type: 'pdf',
        size: '3.4 MB',
        pages: 22,
        date: 'Aug 18, 2024',
        topics: 'Continental drift evidence, plate boundaries, earthquakes, volcanic formations.'
      },
      {
        id: 'els-m4',
        title: 'Module 04: Introduction to Biological Diversity & Ecosystems',
        fileName: 'ELS_Mod4_Biodiversity_Ecosystems.pdf',
        type: 'pdf',
        size: '2.9 MB',
        pages: 18,
        date: 'Aug 25, 2024',
        topics: 'Energy flow in food webs, ecological succession, conservation biology.'
      }
    ]
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
    modules: 4,
    instructor: 'Dr. Eleanor Llorente',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80',
    description: 'Limits, continuity, and differential calculus with mathematical applications.',
    documents: [
      {
        id: 'calc-m1',
        title: 'Module 01: Limits of Functions & Continuity',
        fileName: 'BasicCalc_Mod1_Limits_and_Continuity.pdf',
        type: 'pdf',
        size: '2.7 MB',
        pages: 18,
        date: 'Aug 04, 2024',
        topics: 'Limit laws, one-sided limits, infinite limits, continuity at a point and on intervals.'
      },
      {
        id: 'calc-m2',
        title: 'Module 02: Derivatives & Fundamental Differentiation Rules',
        fileName: 'BasicCalc_Mod2_Derivatives_Rules.pdf',
        type: 'pdf',
        size: '3.3 MB',
        pages: 22,
        date: 'Aug 11, 2024',
        topics: 'Definition of derivative as limit of difference quotient, power rule, product & quotient rules.'
      },
      {
        id: 'calc-m3',
        title: 'Module 03: The Chain Rule & Implicit Differentiation',
        fileName: 'BasicCalc_Mod3_Chain_Rule_Implicit.pdf',
        type: 'pdf',
        size: '3.1 MB',
        pages: 20,
        date: 'Aug 18, 2024',
        topics: 'Composite function derivatives, implicit differentiation techniques, higher-order derivatives.'
      },
      {
        id: 'calc-m4',
        title: 'Module 04: Applications of Derivatives & Optimization',
        fileName: 'BasicCalc_Mod4_Optimization_Related_Rates.pdf',
        type: 'pdf',
        size: '3.6 MB',
        pages: 24,
        date: 'Aug 25, 2024',
        topics: 'Critical points, extreme values, curve sketching, related rates and optimization problems.'
      }
    ]
  },
  {
    id: 'course-mil',
    title: 'Media & Information Literacy',
    code: 'MIL-1201',
    strand: 'STEM',
    track: 'Core',
    gradeLevel: 'Grade 12',
    semester: '1st Sem',
    progress: 85,
    modules: 3,
    instructor: 'Ms. Clara Asis',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
    description: 'Media languages, critical consumption, and responsible digital citizenship.',
    documents: [
      {
        id: 'mil-m1',
        title: 'Module 01: Evolution of Media & Information Literacy',
        fileName: 'MIL_Mod1_Evolution_of_Media.pdf',
        type: 'pdf',
        size: '2.5 MB',
        pages: 17,
        date: 'Aug 04, 2024',
        topics: 'Traditional to new media, digital divides, information evaluation framework.'
      },
      {
        id: 'mil-m2',
        title: 'Module 02: Media Codes, Conventions & Message Framing',
        fileName: 'MIL_Mod2_Media_Languages_Codes.pdf',
        type: 'pdf',
        size: '2.9 MB',
        pages: 19,
        date: 'Aug 12, 2024',
        topics: 'Technical, symbolic, written codes, audience interpretation, media representation.'
      },
      {
        id: 'mil-m3',
        title: 'Module 03: Intellectual Property, Ethics & Fair Use',
        fileName: 'MIL_Mod3_IP_Fair_Use_Ethics.pdf',
        type: 'pdf',
        size: '2.2 MB',
        pages: 15,
        date: 'Aug 20, 2024',
        topics: 'Creative commons, copyright laws, plagiarism avoidance, digital ethics.'
      }
    ]
  },
  {
    id: 'course-oral-comm',
    title: 'Oral Communication in Context',
    code: 'ENG-1101',
    strand: 'STEM',
    track: 'Core',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 100,
    modules: 3,
    instructor: 'Prof. Teresa Santos',
    status: 'completed',
    cover: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80',
    description: 'Speech styles, communication barriers, speech writing, and delivery strategies.',
    documents: [
      {
        id: 'oral-m1',
        title: 'Module 01: Nature, Elements & Models of Communication',
        fileName: 'OralComm_Mod1_Models_and_Elements.pdf',
        type: 'pdf',
        size: '2.4 MB',
        pages: 16,
        date: 'Aug 04, 2024',
        topics: 'Linear, interactive, transactional models, Shannon-Weaver, communication breakdown.'
      },
      {
        id: 'oral-m2',
        title: 'Module 02: Intercultural & Non-Verbal Communication',
        fileName: 'OralComm_Mod2_Intercultural_Nonverbal.pdf',
        type: 'pdf',
        size: '2.8 MB',
        pages: 18,
        date: 'Aug 11, 2024',
        topics: 'Kinesics, proxemics, paralanguage, cultural barriers, speech styles.'
      },
      {
        id: 'oral-m3',
        title: 'Module 03: Speech Writing Principles & Delivery',
        fileName: 'OralComm_Mod3_Speech_Writing_Delivery.pdf',
        type: 'pdf',
        size: '3.1 MB',
        pages: 20,
        date: 'Aug 18, 2024',
        topics: 'Audience analysis, organizing body points, manuscript, memorized, extemporaneous delivery.'
      }
    ]
  },
  {
    id: 'course-research1',
    title: 'Practical Research 1',
    code: 'RES-1101',
    strand: 'STEM',
    track: 'Applied',
    gradeLevel: 'Grade 11',
    semester: '1st Sem',
    progress: 40,
    modules: 4,
    instructor: 'Dr. Patricia Mendoza',
    status: 'enrolled',
    cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
    description: 'Qualitative research methodologies, problem statements, and literature review.',
    documents: [
      {
        id: 'res-m1',
        title: 'Module 01: Nature of Inquiry & Qualitative Research',
        fileName: 'Research1_Mod1_Qualitative_Inquiry.pdf',
        type: 'pdf',
        size: '2.9 MB',
        pages: 19,
        date: 'Aug 04, 2024',
        topics: 'Phenomenology, case study, ethnography, grounded theory characteristics.'
      },
      {
        id: 'res-m2',
        title: 'Module 02: Identifying Inquiry & Stating Research Problem',
        fileName: 'Research1_Mod2_Problem_Statement.pdf',
        type: 'pdf',
        size: '2.7 MB',
        pages: 18,
        date: 'Aug 11, 2024',
        topics: 'Research questions formulation, scope and delimitation, conceptual framework.'
      },
      {
        id: 'res-m3',
        title: 'Module 03: Review of Related Literature & Synthesis Matrix',
        fileName: 'Research1_Mod3_RRL_and_Synthesis.pdf',
        type: 'pdf',
        size: '3.4 MB',
        pages: 22,
        date: 'Aug 18, 2024',
        topics: 'APA 7th edition referencing, synthesis matrix crafting, ethical citation.'
      },
      {
        id: 'res-m4',
        title: 'Module 04: Qualitative Data Collection & Thematic Analysis',
        fileName: 'Research1_Mod4_Data_Collection_Analysis.pdf',
        type: 'pdf',
        size: '3.1 MB',
        pages: 20,
        date: 'Aug 25, 2024',
        topics: 'Semi-structured interviews, focus group discussions, coding and theme generation.'
      }
    ]
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
  const studentStrand = CURRENT_PROFILE?.strand || 'STEM';

  // If course is marked Core or Applied, open for all
  if (course.track === 'Core' || course.track === 'Applied' || course.strand === 'CORE' || course.strand === 'GENERAL') return true;

  // IF STUDENT IS ENROLLED IN STEM: ONLY STEM SUBJECTS ARE OPEN
  if (studentStrand === 'STEM') {
    return course.strand === 'STEM';
  }

  // Otherwise check if course strand matches student strand
  return course.strand === studentStrand;
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
  const docCount = course.documents ? course.documents.length : course.modules;

  return `
  <div class="cw-card ${!isOpen ? 'locked' : ''}" onclick="handleCourseClick('${course.id}')" title="Click to view PDF files for ${escHtml(course.title)}">
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
          ${docCount} PDF ${docCount === 1 ? 'Module' : 'Modules'}
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
          ${isCompleted ? 'Review PDF Files' : 'View PDF Modules'}
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
