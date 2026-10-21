const SUBJECTS_BY_STRAND_AND_GRADE = {
  HUMSS: {
    'Grade 11': [
      'Oral Communication',
      'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
      'General Mathematics',
      'Earth and Life Science',
      'Understanding Culture, Society, and Politics',
      'Personal Development / Pansariling Kaunlaran',
      'Physical Education and Health',
      'English for Academic and Professional Purposes',
      'Disciplines and Ideas in the Social Sciences',
      'Homeroom Guidance (HG1)',
      'Reading and Writing Skills',
      "Pagbasa at Pagsusuri ng Iba't ibang Teksto Tungo sa Pananaliksik",
      '21st Century Literature from the Philippines and the World',
      'Statistics and Probability',
      'Physical Science',
      'Research 1',
      'Disciplines and Ideas in the Applied Social Sciences',
      'Philippine Politics and Governance'
    ],
    'Grade 12': [
      'Media and Information Literacy',
      'Pagsulat sa Filipino sa Piling Larang',
      'Introduction to the Philosophy of Human Person',
      'Contemporary Philippine Arts from the Regions',
      'Physical Education and Health',
      'Empowerment Technologies (E-Tech): ICT for Professional Tracks',
      'Research in Daily Life 2',
      'Creative Writing / Malikhaing Pagsulat',
      'Introduction to World Religions and Belief Systems',
      'Entrepreneurship',
      'Research Project 3I (Inquiries, Investigation, and Immersion)',
      'Creative Nonfiction: The Literary Essay',
      'Trends, Networks and Critical Thinking in the 21st Century Culture',
      'Community Engagement, Solidarity and Citizenship',
      'Culminating Activity',
      'Homeroom Guidance (HG)'
    ]
  },
  STEM: {
    'Grade 11': [
      'Oral Communication',
      'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
      'General Mathematics',
      'Earth Science',
      '21st Century Literature from the Philippines and the World',
      'Physical Education and Health',
      'Empowerment Technologies',
      'Filipino sa Piling Larang',
      'Pre-Calculus',
      'General Biology 1',
      'Human Biology 1',
      'Complex Numbers',
      'Reading and Writing Skills',
      "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
      'Statistics and Probability',
      'Disaster Readiness and Risk Reduction',
      'Personal Development',
      'Practical Research 1',
      'Entrepreneurship',
      'Basic Calculus',
      'General Biology 2',
      'Human Biology 2',
      'Vectors and the Geometry of Space'
    ],
    'Grade 12': [
      'Introduction to the Philosophy of the Human Person',
      'Contemporary Philippine Arts from the Regions',
      'Understanding Culture, Society and Politics',
      'Physical Education and Health',
      'Practical Research 2',
      'English for Academic and Special Purposes',
      'General Physics 1',
      'General Chemistry 1',
      'Human Biology 3',
      'Differential Equations',
      'Media and Information Literacy',
      'Inquiries, Investigations and Immersion',
      'General Physics 2',
      'General Chemistry 2',
      'Work Immersion / Research / Culminating Activity',
      'Biochemistry'
    ]
  },
  ABM: {
    'Grade 11': [
      'Oral Communication',
      'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
      'General Mathematics',
      'Earth and Life Science',
      '21st Century Literature from the Philippines and the World',
      'Physical Education and Health',
      'Empowerment Technologies',
      'Filipino sa Piling Larang',
      'Organization and Management',
      'Business Math',
      'Reading and Writing Skills',
      "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
      'Statistics and Probability',
      'Physical Science',
      'Personal Development',
      'Entrepreneurship',
      'Practical Research 1',
      'Fundamentals of Accountancy, Business and Management 1',
      'Principles of Marketing'
    ],
    'Grade 12': [
      'Introduction to the Philosophy of the Human Person',
      'Contemporary Philippine Arts from the Regions',
      'Understanding Culture, Society and Politics',
      'Physical Education and Health',
      'English for Academic and Professional Purposes',
      'Practical Research 2',
      'Fundamentals of Accountancy, Business and Management 2',
      'Applied Economics',
      'Media and Information Literacy',
      'Inquiries, Investigations and Immersion',
      'Business Finance',
      'Business Ethics and Social Responsibility',
      'Business Enterprise Simulation or Work Immersion'
    ]
  },
  TVL: {
    'Grade 11': [
      'Oral Communication',
      'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
      'General Mathematics',
      'Earth and Life Science',
      'Personal Development / Pansariling Kaunlaran',
      '21st Century Literature from Philippines and the World',
      'Physical Education and Health 1',
      'Computer Programming 1 (.Net Technology NC III) or (Java NC III)',
      'Reading and Writing',
      "Pagbasa at Pagsusuri sa Iba't-Ibang Tekso Tungo sa Pananaliksik",
      'Statistics and Probability',
      'Physical Science',
      'Physical Education and Health 2',
      'English for Academic and Professional Purposes',
      'Practical Research 1',
      'Computer Programming 2 (.Net Technology NC III) or (Java NC III)'
    ],
    'Grade 12': [
      'Understanding Culture, Society and Politics',
      'Introduction to the Philosophy of the Human Person / Pambungad sa Pilosopiyang Tao',
      'Physical Education and Health 3',
      'Practical Research 2',
      'Pagsulat sa Filipino sa Piling Larangan (Akademik)',
      'Empowerment IT Technologies',
      'Computer Programming 3 (.Net Technology NC III) or (Java NC III)',
      'Contemporary Philippine Arts from the Regions',
      'Media and Information Literacy',
      'Physical Education and Health 4',
      'Entrepreneurship',
      'Inquiries, Investigation and Immersion (Project Research)',
      'Computer Programming 4 (.Net Technology NC III) or (Java NC III)',
      'Culminating Activity / Career Advocacy / Work Immersion / Research'
    ]
  }
};

function getFilteredSubjects(strand, gradeLevel) {
  let targetStrands = [];
  if (strand) {
    const sUpper = String(strand).toUpperCase();
    if (sUpper === 'ALL' || sUpper.includes('ALL') || sUpper.includes('BOTH') || sUpper.includes(',') || sUpper.includes('&')) {
      if (sUpper.includes('STEM') && sUpper.includes('HUMSS')) {
        targetStrands = ['STEM', 'HUMSS'];
      } else if (sUpper.includes('ALL')) {
        targetStrands = ['STEM', 'HUMSS', 'ABM', 'TVL'];
      } else {
        targetStrands = String(strand).split(/[,&]+/).map(s => s.trim().toUpperCase()).filter(s => SUBJECTS_BY_STRAND_AND_GRADE[s]);
      }
    } else if (SUBJECTS_BY_STRAND_AND_GRADE[strand]) {
      targetStrands = [strand];
    }
  }

  if (targetStrands.length > 0) {
    const list = [];
    targetStrands.forEach(st => {
      const strandObj = SUBJECTS_BY_STRAND_AND_GRADE[st] || {};
      if (gradeLevel) {
        (strandObj[gradeLevel] || []).forEach(sub => {
          if (!list.includes(sub)) list.push(sub);
        });
      } else {
        (strandObj['Grade 11'] || []).forEach(sub => {
          if (!list.includes(sub)) list.push(sub);
        });
        (strandObj['Grade 12'] || []).forEach(sub => {
          if (!list.includes(sub)) list.push(sub);
        });
      }
    });
    return list;
  }

  if (gradeLevel) {
    const list = [];
    Object.values(SUBJECTS_BY_STRAND_AND_GRADE).forEach(grades => {
      (grades[gradeLevel] || []).forEach(sub => {
        if (!list.includes(sub)) list.push(sub);
      });
    });
    return list;
  }
  const all = [];
  Object.values(SUBJECTS_BY_STRAND_AND_GRADE).forEach(grades => {
    Object.values(grades).forEach(subList => {
      subList.forEach(sub => {
        if (!all.includes(sub)) all.push(sub);
      });
    });
  });
  return all;
}

const SUBJECTS_BY_STRAND = {
  STEM: [ ...(SUBJECTS_BY_STRAND_AND_GRADE.STEM['Grade 11'] || []), ...(SUBJECTS_BY_STRAND_AND_GRADE.STEM['Grade 12'] || []) ],
  HUMSS: [ ...(SUBJECTS_BY_STRAND_AND_GRADE.HUMSS['Grade 11'] || []), ...(SUBJECTS_BY_STRAND_AND_GRADE.HUMSS['Grade 12'] || []) ],
  ABM: [ ...(SUBJECTS_BY_STRAND_AND_GRADE.ABM['Grade 11'] || []), ...(SUBJECTS_BY_STRAND_AND_GRADE.ABM['Grade 12'] || []) ],
  TVL: [ ...(SUBJECTS_BY_STRAND_AND_GRADE.TVL['Grade 11'] || []), ...(SUBJECTS_BY_STRAND_AND_GRADE.TVL['Grade 12'] || []) ]
};

const CUSTOM_MATERIALS_STORAGE_KEY = 'scholaria_custom_materials_v1';

function cleanupLegacyDummyStorage() {
  try {
    const raw = localStorage.getItem(CUSTOM_MATERIALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(m => {
          if (!m || !m.title) return false;
          const t = String(m.title || m.fileName || '').trim().toLowerCase();
          if (t === 'lesson' || t === 'multiple handouts testing' || t === 'cyber' || String(m.id).startsWith('mat_')) return false;
          return true;
        }).map(m => ({
          ...m,
          status: 'approved' // Auto-approve teacher uploads so they reflect immediately for students
        }));
        localStorage.setItem(CUSTOM_MATERIALS_STORAGE_KEY, JSON.stringify(cleaned));
      }
    }
  } catch(e) {}

  try {
    const rawQ = localStorage.getItem('scholaria_quizzes');
    if (rawQ) {
      const parsedQ = JSON.parse(rawQ);
      if (Array.isArray(parsedQ)) {
        const cleanedQ = parsedQ.filter(q => {
          if (!q || !q.title) return false;
          const t = String(q.title || '').trim().toLowerCase();
          if (t.includes('(demo)') || t === 'game dev (demo)' || t === 'multiple handouts testing' || t === '01_activity_1(8)' || t === 'test') return false;
          return true;
        });
        localStorage.setItem('scholaria_quizzes', JSON.stringify(cleanedQ));
      }
    }
  } catch(e) {}
}

cleanupLegacyDummyStorage();

function getCustomMaterialsFromStorage() {
  try {
    const raw = localStorage.getItem(CUSTOM_MATERIALS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(m => {
      if (!m || !m.title) return false;
      const t = String(m.title || m.fileName || '').trim().toLowerCase();
      if (t === 'lesson' || t === 'multiple handouts testing' || t === 'cyber' || String(m.id).startsWith('mat_')) return false;
      return true;
    }).map(m => ({
      ...m,
      status: m.status || 'approved'
    }));
  } catch (e) {
    return [];
  }
}

function saveCustomMaterialToStorage(record) {
  try {
    const list = getCustomMaterialsFromStorage();
    const idx = list.findIndex(m => String(m.id) === String(record.id));
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem(CUSTOM_MATERIALS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save custom material to localStorage:', e);
  }
}

function isMaterialMatchingCourse(material, course) {
  if (!material || !course) return false;

  // 1. Direct course ID match
  if (material.course_id && (material.course_id === course.id || String(material.course_id) === String(course.id))) return true;
  if (material.courseId && (material.courseId === course.id || String(material.courseId) === String(course.id))) return true;

  // 2. Direct course code match
  if (material.course_code && course.code && material.course_code.trim().toLowerCase() === course.code.trim().toLowerCase()) return true;

  const mSub = (material.subject || '').trim().toLowerCase();
  const cTitle = (course.title || '').trim().toLowerCase();

  // 3. Exact string match
  if (mSub && cTitle && mSub === cTitle) return true;

  // 4. Substring containment
  if (mSub && cTitle && (cTitle.includes(mSub) || mSub.includes(cTitle))) return true;

  // 5. Canonical subject alias mapping
  function canonicalSubject(str) {
    if (!str) return '';
    let s = String(str).toLowerCase().trim();
    s = s.replace(/^(grade\s*(11|12)\s*[-:]?\s*)/i, '');
    s = s.replace(/\b(module|handout|notes|lecture|exam|quiz)\b/gi, '');
    s = s.replace(/\s*(1|2|i|ii)\b/gi, '');
    s = s.replace(/\bgen\b/g, 'general');
    s = s.replace(/\bchem\b/g, 'chemistry');
    s = s.replace(/\bbio\b/g, 'biology');
    s = s.replace(/\bphys\b/g, 'physics');
    s = s.replace(/\bcalc\b/g, 'calculus');
    s = s.replace(/\bmath\b/g, 'mathematics');
    s = s.replace(/\bstat\b/g, 'statistics');
    s = s.replace(/\bstats\b/g, 'statistics');
    s = s.replace(/\boral\s*comm\b/g, 'oral communication');
    s = s.replace(/\bempotech\b/g, 'empowerment technologies');
    s = s.replace(/\be-tech\b/g, 'empowerment technologies');
    s = s.replace(/\bdrrr\b/g, 'disaster readiness');
    s = s.replace(/\bucsp\b/g, 'understanding culture');
    s = s.replace(/\bmil\b/g, 'media and information literacy');
    s = s.replace(/\beapp\b/g, 'english for academic');
    s = s.replace(/[^a-z]/g, '');
    return s;
  }

  const canonM = canonicalSubject(mSub);
  const canonC = canonicalSubject(cTitle);
  if (canonM && canonC) {
    if (canonM === canonC || canonC.includes(canonM) || canonM.includes(canonC)) return true;
  }

  // 6. Check title / fileName for subject keywords
  const titleStr = (material.title || material.fileName || '').toLowerCase();
  const canonTitle = canonicalSubject(titleStr);
  if (canonC && canonTitle && (canonTitle.includes(canonC) || canonC.includes(canonTitle))) return true;

  return false;
}

let materialsData = getCustomMaterialsFromStorage();
let materialsStrandFilter = '';
let materialsAdminTab = 'pending';
let activeSubjectFilter = null; // course.id or null
let activeSubjectSection = null; // e.g. 'Section A' or 'Section B'
let activeSubjectSubTab = 'modules'; // 'modules' | 'quizzes' | 'uploads'
let expandedModuleMap = {}; // { [docId]: boolean }

function setActiveSubjectMaterials(courseId, section, shouldRender = true) {
  activeSubjectFilter = courseId || null;
  activeSubjectSection = (courseId && section) ? section : null;
  window.activeSubjectFilter = activeSubjectFilter;
  window.activeSubjectSection = activeSubjectSection;
  activeSubjectSubTab = 'modules';
  if (shouldRender) {
    renderMaterialsContainer();
  }
}
window.setActiveSubjectMaterials = setActiveSubjectMaterials;
window.activeSubjectFilter = null;
window.activeSubjectSection = null;

function openTeacherCreateQuizForSubject(subject, section) {
  const url = `quiz-maker.html?subject=${encodeURIComponent(subject || '')}&section=${encodeURIComponent(section || '')}`;
  const container = document.getElementById('quizMakerContainer');
  const modal = document.getElementById('quizModal');
  if (container || modal) {
    if (typeof openQuizModal === 'function') {
      openQuizModal();
      if (typeof quizGen !== 'undefined') {
        if (subject) quizGen.subject = subject;
        if (section) quizGen.sections = new Set([section]);
        if (typeof renderQuizWizard === 'function') renderQuizWizard();
      }
    }
  } else {
    window.location.href = url;
  }
}
window.openTeacherCreateQuizForSubject = openTeacherCreateQuizForSubject;

function setSubjectSubTab(tab) {
  activeSubjectSubTab = tab;
  renderMaterialsContainer();
}
window.setSubjectSubTab = setSubjectSubTab;

let adminUploadScope = 'all'; // 'all' | 'mine'
window.adminUploadScope = 'all';

function setAdminUploadScope(scope) {
  adminUploadScope = scope;
  window.adminUploadScope = scope;
  renderMaterialsContainer();
}
window.setAdminUploadScope = setAdminUploadScope;

function navigateToUploadedMaterial(courseId, subject, section, materialId) {
  let targetCourse = null;
  if (typeof COURSES_DATABASE !== 'undefined' && Array.isArray(COURSES_DATABASE)) {
    if (courseId) {
      targetCourse = COURSES_DATABASE.find(c => c.id === courseId);
    }
    if (!targetCourse && subject) {
      const sLow = String(subject).toLowerCase().trim();
      targetCourse = COURSES_DATABASE.find(c => (c.title || '').toLowerCase().trim() === sLow || (c.code || '').toLowerCase().trim() === sLow);
    }
  }
  const cId = targetCourse ? targetCourse.id : (courseId || (typeof COURSES_DATABASE !== 'undefined' && COURSES_DATABASE[0] ? COURSES_DATABASE[0].id : null));
  const sec = section && section !== 'All' ? section : 'Section A';

  if (cId && typeof setActiveSubjectMaterials === 'function') {
    setActiveSubjectMaterials(cId, sec, false);
  }
  if (typeof setSubjectSubTab === 'function') {
    setSubjectSubTab('uploads');
  }
  if (typeof renderPage === 'function') {
    renderPage('materials');
  }
  if (typeof showToast === 'function') {
    showToast(`Redirected to ${targetCourse ? targetCourse.title : (subject || 'Subject')} (${sec}) — Uploads tab`, 'info');
  }
}
window.navigateToUploadedMaterial = navigateToUploadedMaterial;

function toggleModuleAccordion(modId) {
  expandedModuleMap[modId] = !expandedModuleMap[modId];
  renderMaterialsContainer();
}

let expandedLessonMap = {};

function toggleLessonAccordion(lessonId) {
  expandedLessonMap[lessonId] = !expandedLessonMap[lessonId];
  renderMaterialsContainer();
}

function extractMaterialLessonNum(m) {
  if (!m) return null;
  if (m.lesson_num) {
    const p = parseInt(m.lesson_num, 10);
    if (!isNaN(p)) return p;
  }
  if (m.lesson_id) {
    const mIdMatch = String(m.lesson_id).match(/(?:_l|^0*|lesson[_-]?)(\d+)$/i);
    if (mIdMatch) {
      const p = parseInt(mIdMatch[1], 10);
      if (!isNaN(p)) return p;
    }
  }
  const text = `${m.title || ''} ${m.fileName || ''} ${m.lesson_title || ''}`;
  const mMatch = text.match(/(?:^|[\b_ \-\[])(?:lesson|module|handout|chap|chapter|l)?\s*0*(\d+)/i);
  if (mMatch && mMatch[1]) {
    const p = parseInt(mMatch[1], 10);
    if (!isNaN(p)) return p;
  }
  return null;
}

function isTeacherMaterial(m) {
  if (!m) return false;
  if (m.is_curriculum === true) return false;
  const r = (m.uploader_role || m.uploaded_by_role || '').toLowerCase();
  const n = (m.uploaded_by_name || m.uploader_name || '').toLowerCase();
  if (r.includes('admin') || r.includes('curriculum')) return false;
  if (n.includes('admin') || n.includes('jacky doe')) return false;

  if (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE && (CURRENT_PROFILE.role === 'admin' || ROLE === 'admin')) {
    if (m.uploaded_by && CURRENT_PROFILE.id && String(m.uploaded_by) === String(CURRENT_PROFILE.id)) return false;
    if (n && CURRENT_PROFILE.full_name && n === CURRENT_PROFILE.full_name.toLowerCase()) return false;
  }
  return true;
}

function getSubjectLessons(course) {
  const lessons = getRawSubjectLessons(course);
  if (!lessons || !lessons.length || !Array.isArray(lessons)) return lessons || [];

  lessons.forEach((lesson, lIdx) => {
    lesson.items = lesson.items || [];
    if (typeof materialsData !== "undefined" && Array.isArray(materialsData)) {
      const lessonNumInt = parseInt(lesson.num, 10);

      const matchingUploads = materialsData.filter(m => {
        if (!m || m.status !== "approved") return false;
        const courseMatch = (m.course_id && course && (m.course_id === course.id || String(m.course_id) === String(course.id))) ||
                            (course && typeof isMaterialMatchingCourse === "function" && isMaterialMatchingCourse(m, course));
        if (!courseMatch) return false;

        // 1. Direct ID or exact num match
        if (m.lesson_id && (m.lesson_id === lesson.id || m.lesson_id === lesson.num)) return true;
        if (m.lesson_num && (m.lesson_num === lesson.num || parseInt(m.lesson_num, 10) === lessonNumInt)) return true;
        if (m.lesson_title && m.lesson_title.toLowerCase().includes(lesson.num.toLowerCase())) return true;

        // 2. Extracted lesson number from title or filename (e.g. 01_Handout_1(26) -> 1 === lessonNumInt)
        const extractedNum = extractMaterialLessonNum(m);
        if (extractedNum !== null && !isNaN(lessonNumInt) && extractedNum === lessonNumInt) {
          return true;
        }

        // 3. Keyword match from title if lesson keywords exist in material title
        if (lesson.title) {
          const cleanLessonTopic = lesson.title.replace(/^\d+[\s\-_.]*/, '').trim().toLowerCase();
          const matText = `${m.title || ''} ${m.fileName || ''}`.toLowerCase();
          if (cleanLessonTopic.length > 5 && matText.includes(cleanLessonTopic.slice(0, 15))) {
            return true;
          }
        }

        // 4. Admin official curriculum fallback: if uploaded by admin and no specific lesson number was found in any lesson
        const isAdminUpload = !isTeacherMaterial(m);
        if (isAdminUpload && extractedNum === null && lIdx === 0) {
          return true;
        }

        return false;
      });

      matchingUploads.forEach(u => {
        if (!lesson.items.some(existing => existing.id === u.id)) {
          lesson.items.push({
            id: u.id,
            title: u.title || u.fileName || "Curriculum Handout",
            type: u.type || (u.file_type && u.file_type.includes("word") ? "DOCX" : (u.file_type && u.file_type.includes("presentation") ? "PPTX" : "PDF")),
            score: (u.uploader_name && !u.uploader_name.toLowerCase().includes('admin')) ? u.uploader_name : "Official Admin Handout",
            submitted: u.date_formatted || "Oct 16, 2026",
            due: u.date_formatted || "Official Handout",
            status: "Completed",
            file_url: u.file_url || "SURVEY FORMS - Scholaria.pdf"
          });
        }
      });
    }
  });

  return lessons;
}
function getRawSubjectLessons(course) {
  if (!course) return [];
  if (typeof course === 'string') course = { title: course, id: 'course-' + course.toLowerCase().replace(/[^a-z0-9]+/g, '-') };
  if (!course.id) course.id = 'course-' + (course.title || 'subj').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const cTitle = (course.title || '').toLowerCase();
  
  if (cTitle.includes('general math') || cTitle.includes('gen math') || cTitle === 'general mathematics' || cTitle === 'math') {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Functions and Their Graphs (Linear, Quadratic & Piecewise)', cover: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Rational, Exponential & Logarithmic Functions', cover: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Simple & Compound Interest, Annuities & Amortization', cover: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Basic Logic, Truth Tables & Categorical Syllogisms', cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('statistics') || cTitle.includes('stat') || cTitle.includes('probability')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Random Variables & Probability Distributions', cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Normal Distribution, Mean, Variance & Z-Scores', cover: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Sampling Techniques & Sampling Distributions', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Estimation of Parameters, Hypothesis Testing & Correlation', cover: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('pre-calculus') || cTitle.includes('precalculus')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Platforms and Conic Sections', cover: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Parabolas, Circles & Ellipses', cover: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Hyperbolas and Nonlinear Systems', cover: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Circular & Trigonometric Functions', cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('basic calculus') || cTitle.includes('calculus')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Limits & Continuity of Algebraic & Transcendental Functions', cover: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Derivatives, Tangent Lines & Differentiation Rules', cover: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Applications of Derivatives (Optimization & Rates)', cover: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Antiderivatives & the Fundamental Theorem of Calculus', cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }
  
  if (cTitle.includes('biology')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Cell Structure, Organelles and Transport', cover: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Biological Macromolecules and Enzymes', cover: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Photosynthesis & Energy Transformation', cover: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Cellular Respiration & Cell Division', cover: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }
  
  if (cTitle.includes('physics')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Vectors, Measurements and Physical Quantities', cover: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Kinematics: 1D and 2D Motion', cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Newton\'s Laws of Motion and Friction', cover: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Work, Energy, Momentum and Power', cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('chemistry') || cTitle.includes('chem')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Matter, Atoms, Molecules, Ions & Periodic Trends', cover: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Stoichiometry & Chemical Formulas Calculations', cover: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Electronic Structure & Chemical Bonding', cover: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Thermochemistry, Gases & Intermolecular Forces', cover: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('earth') || cTitle.includes('life science')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Earth Systems, Subsystems & Origin of the Universe', cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Minerals, Rocks & Internal/Surface Geologic Processes', cover: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Historical Geology, Fossils & Early Evolution of Life', cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Ecology, Biomes, Energy Flow & Ecosystem Dynamics', cover: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('reading') || cTitle.includes('writing')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Reading & Evaluating Patterns of Written Development', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Text and Context Connections (Intertextuality & Hypertext)', cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Critical Reading, Claim Formulations & Textual Evidence', cover: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Academic & Professional Purpose Document Composition', cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('oral') || cTitle.includes('communication')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Nature, Elements & Models of Communication', cover: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Intercultural Communication & Speech Contexts', cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Speech Styles, Speech Acts & Communicative Strategies', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Principles of Speech Writing & Effective Delivery', cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('empowerment') || cTitle.includes('ict')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 ICT Environment, Online Safety & Netiquette', cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Productivity Tools & Cloud Collaboration Systems', cover: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Imaging, Graphic Design Principles & Infographics', cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Web Prototyping & Online Platforms for Social Change', cover: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('research')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Nature of Inquiry & Research Problem Formulation', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Review of Related Literature & Conceptual Framework', cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Research Design, Sampling & Data Collection Instruments', cover: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Data Analysis, Findings Synthesis & Recommendations', cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('disciplines and ideas') || cTitle.includes('diss') || cTitle.includes('social science')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Emergence of Social Sciences & Dominant Approaches', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Structural-Functionalism, Marxism & Symbolic Interactionism', cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Psychoanalysis, Rational Choice & Institutionalism', cover: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Real-World Applications & Filipino Indigenous Social Thought', cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('philippine politics') || cTitle.includes('governance') || cTitle.includes('politics')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Concepts, Theories & Evolution of Philippine Politics', cover: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 The Executive, Legislative & Judicial Branches', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Local Government Units, Decentralization & Elections', cover: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Citizenship, Civil Society Movements & Good Governance', cover: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('creative writing') || cTitle.includes('pagsulat')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Sensory Imagery, Figures of Speech & Literary Diction', cover: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Poetry: Forms, Rhyme, Meter & Contemporary Verse', cover: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Fiction: Characterization, Plot Structure & Point of View', cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Playwriting, Dramatic Scripts, Staging & Dialogue', cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('business math') || cTitle.includes('bus math')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Fractions, Decimals, Percentages & Business Ratios', cover: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Buying & Selling: Mark-on, Mark-down, Margin & Gross Profit', cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Salaries, Wages, Overtime, Deductions & Net Earnings', cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Business Data Presentation & Break-Even Analysis', cover: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('accountancy') || cTitle.includes('fabm') || cTitle.includes('accounting')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Introduction to Accounting, Ethics & Forms of Organization', cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 The Accounting Equation, Double-Entry & Types of Accounts', cover: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Accounting Cycle: Books of Accounts, Journalizing & Posting', cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Trial Balance, Adjusting Entries & Financial Statement Prep', cover: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('organization') || cTitle.includes('management') || cTitle.includes('org-mgmt')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Nature & Theories of Management in Modern Enterprises', cover: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 Planning, Decision-Making & Strategic Environmental Scanning', cover: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Organizational Structures, Delegation & Staffing Functions', cover: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Leadership, Motivation Theories, Communication & Control', cover: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  if (cTitle.includes('computer systems') || cTitle.includes('servicing') || cTitle.includes('tvl') || cTitle.includes('web systems') || cTitle.includes('cybersecurity')) {
    return [
      { id: `${course.id}_l1`, num: '01', title: '01 Hardware Architecture, BIOS Configuration & Tool Safety', cover: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l2`, num: '02', title: '02 OS Deployment, Device Drivers & Local Area Networking', cover: 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l3`, num: '03', title: '03 Web Development Protocols, Semantic HTML5 & Responsive UI', cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80', items: [] },
      { id: `${course.id}_l4`, num: '04', title: '04 Cyber Defense Protocols, Threat Mitigation & Systems Maintenance', cover: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=400&q=80', items: [] }
    ];
  }

  const defaultLessons = [
    { id: `${course.id}_l1`, num: '01', title: `01 Introduction to ${course.title}`, cover: course.cover || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80', items: [] },
    { id: `${course.id}_l2`, num: '02', title: `02 Core Concepts & Theoretical Principles`, cover: course.cover || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80', items: [] },
    { id: `${course.id}_l3`, num: '03', title: `03 Practical Applications & Problem Solving`, cover: course.cover || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80', items: [] },
    { id: `${course.id}_l4`, num: '04', title: `04 Module Mastery & Academic Synthesis`, cover: course.cover || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80', items: [] }
  ];
  return defaultLessons;
}

function setMaterialsAdminTab(tab) {
  materialsAdminTab = tab;
  renderPage(currentPage);
}

function fileIconClass(fileType) {
  if (!fileType) return 'pdf';
  if (fileType.includes('pdf')) return 'pdf';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'pptx';
  if (fileType.includes('word') || fileType.includes('document')) return 'docx';
  return 'pdf';
}
function fileIconSvg() {
  return `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
}

let isFetchingMaterials = false;

function renderMaterialsContainer() {
  const container = document.getElementById('materialsListWrap');
  if (container) {
    const prevInp = document.getElementById('studentMatSearchInput');
    const hadFocus = (document.activeElement === prevInp);
    const selStart = prevInp ? prevInp.selectionStart : null;
    const selEnd = prevInp ? prevInp.selectionEnd : null;

    container.innerHTML = renderMaterialsList(ROLE);

    if (hadFocus) {
      const newInp = document.getElementById('studentMatSearchInput');
      if (newInp) {
        newInp.focus();
        if (selStart !== null && selEnd !== null) {
          try { newInp.setSelectionRange(selStart, selEnd); } catch(e) {}
        }
      }
    }
  }
  const approvalContainer = document.getElementById('approvalListWrap');
  if (approvalContainer) approvalContainer.innerHTML = renderApprovalMaterialRows();
}

async function loadMaterialsFromDB() {
  if (isFetchingMaterials) return;
  isFetchingMaterials = true;
  const { data: { session } } = await db.auth.getSession().catch(() => ({ data: {} }));

  let fetchedData = [];
  if (session && session.access_token) {
    try {
      const params = new URLSearchParams();
      if (ROLE === 'student') {
        if (CURRENT_PROFILE?.strand) params.set('strand', CURRENT_PROFILE.strand);
      } else if (materialsStrandFilter) {
        params.set('strand', materialsStrandFilter);
      }
      const qs = params.toString();
      const res = await fetch(`${API_BASE}/api/materials${qs ? '?' + qs : ''}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        fetchedData = data;
      }
    } catch (err) {
      console.warn('Backend API server offline, querying Supabase directly:', err.message);
      try {
        let query = db.from('materials').select('*').order('created_at', { ascending: false });
        if (ROLE === 'student' && CURRENT_PROFILE?.strand) {
          query = query.or(`strand.eq.${CURRENT_PROFILE.strand},strand.is.null`);
        } else if (materialsStrandFilter) {
          query = query.eq('strand', materialsStrandFilter);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          fetchedData = data;
        }
      } catch (e) {
        console.error('Supabase direct query failed:', e.message);
      }
    }
  } else {
    try {
      const { data } = await db.from('materials').select('*').order('created_at', { ascending: false });
      if (data && Array.isArray(data)) fetchedData = data;
    } catch (e) {}
  }

  // Merge with locally stored custom uploads so uploads are never lost
  const localList = getCustomMaterialsFromStorage();
  const merged = [...localList];
  fetchedData.forEach(d => {
    if (!merged.some(m => String(m.id) === String(d.id))) {
      merged.push(d);
    }
  });

  // Only use real fetched materials and valid custom uploads (exclude broken dummy files)
  const filteredMerged = merged.filter(m => {
    if (!m) return false;
    if (String(m.id).startsWith('mat_')) return false;
    const t = String(m.title || m.fileName || '').trim().toLowerCase();
    if (t === 'lesson' || t === 'multiple handouts testing' || t === 'cyber') return false;
    return true;
  }).map(m => ({
    ...m,
    category: m.category || 'Handout',
    tag: m.tag || 'Handout'
  }));

  if (ROLE === 'student') {
    const studentStrand = (CURRENT_PROFILE?.strand || 'STEM').toUpperCase();
    materialsData = filteredMerged.filter(m => {
      const isTeacher = (m.uploader_role || '').toLowerCase().includes('teacher') || (m.uploaded_by_name || '').toLowerCase().includes('teacher') || (m.uploader_name || '').toLowerCase().includes('teacher');
      if (m.status && m.status !== 'approved' && !isTeacher) return false;
      const mStrand = (m.strand || '').toUpperCase();
      if (mStrand && !mStrand.includes(studentStrand) && mStrand !== 'CORE' && mStrand !== 'GENERAL' && mStrand !== 'ALL' && !mStrand.includes('ALL') && !mStrand.includes('BOTH')) return false;
      return true;
    });
  } else {
    materialsData = filteredMerged;
  }

  if (ROLE === 'student' && currentPage === 'materials' && typeof loadQuizzesFromDB === 'function') {
    try { await loadQuizzesFromDB(); } catch (e) { console.warn('Could not load quizzes for My Materials:', e.message); }
  }

  isFetchingMaterials = false;
  updateApprovalBadge();
  if (currentPage === 'materials' || currentPage === 'approval') {
    renderMaterialsContainer();
  } else if (currentPage === 'dashboard') {
    const mainContent = document.getElementById('mainContent');
    if (mainContent && typeof getPageContent === 'function') {
      mainContent.innerHTML = getPageContent(ROLE, 'dashboard');
    }
  }
}

function updateApprovalBadge() {
  const item = document.querySelector('.menu-item[data-page="approval"]');
  if (!item) return;
  const pendingMaterialsCount = materialsData.filter(m => m.status === 'pending').length;
  const pendingQuizzesCount = typeof customQuizzes !== 'undefined' ? customQuizzes.filter(q => q.status === 'pending').length : 0;
  const totalPending = pendingMaterialsCount + pendingQuizzesCount;

  let badge = item.querySelector('.menu-badge');
  if (totalPending > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'menu-badge';
      item.appendChild(badge);
    }
    badge.textContent = totalPending;
  } else if (badge) {
    badge.remove();
  }
}

function renderMaterialsList(role) {
  const studentStrand = (CURRENT_PROFILE?.strand || 'STEM').toUpperCase();
  let enrolledCourses = (typeof COURSES_DATABASE !== 'undefined')
    ? (role === 'teacher'
        ? (materialsStrandFilter ? COURSES_DATABASE.filter(c => (c.strand || '').toUpperCase() === materialsStrandFilter.toUpperCase()) : COURSES_DATABASE.slice())
        : COURSES_DATABASE.filter(c => typeof isCourseAssignedToStudent === 'function'
            ? isCourseAssignedToStudent(c, CURRENT_PROFILE)
            : (c.strand || '').toUpperCase() === studentStrand &&
              String(c.gradeLevel || '').match(/\d+/)?.[0] === String(CURRENT_PROFILE?.grade_level || CURRENT_PROFILE?.gradeLevel || '').match(/\d+/)?.[0]))
    : [];

  if (role === 'teacher' && typeof materialsStrandFilter !== 'undefined' && materialsStrandFilter) {
    enrolledCourses = enrolledCourses.filter(c => (c.strand || '').toUpperCase() === materialsStrandFilter.toUpperCase());
  }

  // ── INDIVIDUAL SUBJECT WORKSPACE VIEW (STUDENT & TEACHER PORTAL) ──
  if (activeSubjectFilter) {
    const course = enrolledCourses.find(c => c.id === activeSubjectFilter) || COURSES_DATABASE.find(c => c.id === activeSubjectFilter);
    if (course) {
      const subjectUploads = materialsData.filter(m => {
        if (!isMaterialMatchingCourse(m, course)) return false;
        if (!isTeacherMaterial(m)) return false;
        if (activeSubjectSection) {
          const mSec = (m.section || m.target_section || '').toLowerCase();
          const aSec = activeSubjectSection.toLowerCase();
          if (mSec && mSec !== 'all' && !mSec.includes(aSec) && !aSec.includes(mSec)) return false;
        }
        if (role === 'student') {
          return m.status === 'approved' || (m.uploader_role || '').toLowerCase().includes('teacher') || (m.uploaded_by_name || '').toLowerCase().includes('teacher') || (m.uploader_name || '').toLowerCase().includes('teacher');
        }
        return true;
      });

      const docs = course.documents || [];
      const lessons = getSubjectLessons(course);
      const subjectQuizzes = (typeof customQuizzes !== 'undefined') ? customQuizzes.filter(q => {
        if (!q) return false;
        const qSubject = String(q.subject || q.subject_name || '').toLowerCase().trim();
        const courseTitle = String(course.title || '').toLowerCase().trim();
        const courseCode = String(course.code || '').toLowerCase().trim();
        const qCourseId = String(q.course_id || q.courseId || '').toLowerCase().trim();
        const matchesCourse = qCourseId === String(course.id || '').toLowerCase().trim() ||
          (!!qSubject && ((courseTitle && (qSubject.includes(courseTitle) || courseTitle.includes(qSubject))) ||
            (courseCode && (qSubject.includes(courseCode) || courseCode.includes(qSubject)))));
        if (!matchesCourse) return false;
        if (activeSubjectSection) {
          const qSec = [q.sections, q.section, q.target_section].flat().filter(Boolean).join(',').toLowerCase();
          const aSec = activeSubjectSection.toLowerCase();
          if (qSec && qSec !== 'all' && !qSec.includes(aSec) && !aSec.includes(qSec)) return false;
        }
        if (role === 'student' && typeof isQuizTargetedForStudent === 'function' &&
          String(q.status || '').toLowerCase() !== 'closed' && !isQuizTargetedForStudent(q, CURRENT_PROFILE)) return false;
        return true;
      }) : [];
      const attempts = (typeof getAllRecordedAttempts === 'function')
        ? getAllRecordedAttempts()
        : ((typeof myQuizAttempts !== 'undefined') ? myQuizAttempts : []);

      const completedQuizzesCount = subjectQuizzes.filter(q => {
        return attempts.some(a => {
          if (!a) return false;
          const aQid = String(a.quiz_id || '').toLowerCase().trim();
          const qId = String(q.id || '').toLowerCase().trim();
          if (aQid && aQid === qId) return true;
          if (a.quiz_title && q.title && String(a.quiz_title).trim().toLowerCase() === String(q.title).trim().toLowerCase()) return true;
          return false;
        });
      }).length;

      const pendingQuizzesCount = Math.max(0, subjectQuizzes.length - completedQuizzesCount);
      const totalSubjectMat = lessons.length + subjectUploads.length;

      const quizProgressPct = subjectQuizzes.length > 0
        ? Math.round((completedQuizzesCount / subjectQuizzes.length) * 100)
        : 100;

      const sC = 238.76;
      const sCompLen = (quizProgressPct / 100) * sC;
      const sPendLen = sC - sCompLen;

      return `
      <div class="sw-workspace">
        <div class="sh-breadcrumb">
          <button class="sh-back-btn" onclick="setActiveSubjectMaterials(null)">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            Back to All Subjects
          </button>
          <span class="sh-bc-sep">/</span>
          <span class="sh-bc-curr">${escHtml(course.title)} (${escHtml(course.code)})${activeSubjectSection ? ` · ${escHtml(activeSubjectSection)}` : ''}</span>
        </div>

        <div class="sw-header-card">
          <div class="sw-header-tags">
            <span class="sh-tag track">${escHtml((course.track || 'SPECIALIZED').toUpperCase())}</span>
            ${activeSubjectSection ? `<span class="sh-tag section" style="background:#0284c7;color:#fff;font-weight:700;">${escHtml(activeSubjectSection.toUpperCase())}</span>` : ''}
            <span class="sh-tag strand">${escHtml(course.strand || 'STEM')} STRAND</span>
            <span class="sh-tag sem">${escHtml(course.semester || '1ST SEM')} · ${escHtml(course.gradeLevel || 'GRADE 11')}</span>
          </div>
          <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
            <img src="${course.cover || 'assets/slide1.jpg'}" alt="${escHtml(course.title)}" style="width:115px;height:84px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.06);flex-shrink:0;">
            <div style="flex:1;min-width:240px;">
              <h1 class="sw-title" style="margin:0 0 4px 0;font-size:22px;">${escHtml(course.title)}</h1>
              <p class="sw-desc" style="margin:0 0 10px 0;font-size:13px;color:#475569;">${escHtml(course.description || 'Covers analytic geometry, conic sections, systems of nonlinear equations, and circular/trigonometric functions.')}</p>
              <div class="sw-instructor-badge">
                <div class="sh-avatar">${course.instructor ? course.instructor.charAt(course.instructor.startsWith('Dr.') ? 4 : course.instructor.startsWith('Prof.') ? 6 : course.instructor.startsWith('Engr.') ? 6 : course.instructor.startsWith('Ms.') ? 4 : 0) : 'E'}</div>
                <span>Instructor: <strong>${escHtml(course.instructor || 'Dr. Eleanor Llorente')}</strong></span>
              </div>
            </div>

          </div>
        </div>

        <div class="sw-tabs-bar">
          <button class="sw-tab ${activeSubjectSubTab === 'modules' ? 'active' : ''}" onclick="setSubjectSubTab('modules')">
            Modules &amp; Handouts <span class="sw-tab-badge">${lessons.length}</span>
          </button>
          <button class="sw-tab ${activeSubjectSubTab === 'quizzes' ? 'active' : ''}" onclick="setSubjectSubTab('quizzes')">
            Quizzes &amp; Assessments <span class="sw-tab-badge">${subjectQuizzes.length}</span>
          </button>
          <button class="sw-tab ${activeSubjectSubTab === 'uploads' ? 'active' : ''}" onclick="setSubjectSubTab('uploads')">
            Teacher Uploads <span class="sw-tab-badge">${subjectUploads.length}</span>
          </button>
        </div>

        <div class="sw-grid">
          <div class="sw-main-column">
            ${
              activeSubjectSubTab === 'modules' ? `
                <div class="sw-modules-wrap">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                    <div>
                      <h3 style="margin:0;font-size:15.5px;font-weight:700;color:#0f172a;">Modules &amp; Handouts</h3>
                      <span style="font-size:12px;color:var(--text-muted);">Curriculum modules, syllabus guides, and official study handouts for ${escHtml(course.title)}</span>
                    </div>
                    ${(role === 'admin') ? `
                      <button class="sw-btn primary" onclick="openMaterialModal('${course.id}', '${escHtml(activeSubjectSection || '')}')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-weight:700;font-size:12.5px;">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Upload Curriculum Handout
                      </button>
                    ` : ''}
                  </div>

                  ${subjectUploads.length > 0 ? `
                    <div style="margin-bottom:14px;padding:12px 16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:20px;">📁</span>
                        <div>
                          <div style="font-size:13px;color:#0369a1;font-weight:700;">${subjectUploads.length} Supplemental Handout${subjectUploads.length === 1 ? '' : 's'} Uploaded by Faculty</div>
                          <div style="font-size:11.5px;color:#0284c7;">Available to view and download in the Teacher Uploads tab.</div>
                        </div>
                      </div>
                      <button class="sw-btn primary" onclick="setSubjectSubTab('uploads')" style="padding:6px 14px;font-size:12px;border-radius:8px;font-weight:700;">View Teacher Uploads →</button>
                    </div>
                  ` : ''}

                  ${lessons.length ? `
                    <div class="sw-lessons-list" style="display:flex;flex-direction:column;gap:14px;">
                      ${lessons.map((lesson, idx) => {
                        const isExpanded = expandedLessonMap[lesson.id] !== undefined ? expandedLessonMap[lesson.id] : (idx === 0);
                        const items = lesson.items || [];
                        return `
                          <div class="sw-lesson-card ${isExpanded ? 'expanded' : ''}" style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.04);transition:all 0.2s ease;">
                            <div class="sw-lesson-header" onclick="toggleLessonAccordion('${lesson.id}')" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;cursor:pointer;user-select:none;gap:14px;background:#ffffff;">
                              <div style="display:flex;align-items:center;gap:14px;min-width:0;flex:1;">
                                <img src="${lesson.cover}" alt="${escHtml(lesson.title)}" style="width:96px;height:62px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.06);flex-shrink:0;">
                                <div style="min-width:0;">
                                  <h4 style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(lesson.title)}</h4>
                                  <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#64748b;">
                                    ${(() => {
                                      const compCount = items.filter(it => (it.status || '').toLowerCase() === 'completed').length;
                                      const compPct = items.length ? Math.round((compCount / items.length) * 100) : 0;
                                      return items.length ? `
                                        <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:${compPct === 100 ? '#dcfce7;color:#15803d' : '#e0f2fe;color:#0369a1'};border:1px solid #e2e8f0;">${compPct}% Completed</span>
                                        <span>·</span>
                                        <span>${items.length} handout${items.length === 1 ? '' : 's'} available</span>
                                      ` : `
                                        <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;">0% Empty</span>
                                        <span>·</span>
                                        <span>No files posted yet</span>
                                      `;
                                    })()}
                                  </div>
                                </div>
                              </div>
                              <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
                                ${(role === 'admin') ? `
                                  <button type="button" class="sw-btn outline" onclick="event.stopPropagation(); openMaterialModal('${course.id}', '${escHtml(activeSubjectSection || '')}', '${lesson.id}')" style="padding:4px 10px;font-size:11.5px;border-radius:8px;font-weight:700;display:inline-flex;align-items:center;gap:4px;">
                                    <span>+</span> Add Handout
                                  </button>
                                ` : ''}
                                <span style="font-size:12px;font-weight:600;color:#64748b;">${items.length} handout${items.length === 1 ? '' : 's'}</span>
                                <div style="width:28px;height:28px;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;transition:transform 0.2s ease;transform:${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};">
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                              </div>
                            </div>

                            ${isExpanded ? `
                              <div class="sw-lesson-body" style="border-top:1px solid #f1f5f9;background:#f8fafc;padding:16px 20px;">
                                <div style="overflow-x:auto;">
                                  <table style="width:100%;border-collapse:collapse;font-size:12.5px;color:#334155;text-align:left;">
                                    <thead>
                                      <tr style="border-bottom:1.5px solid #e2e8f0;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;background:#ffffff;">
                                        <th style="padding:9px 12px;font-weight:700;">Section / Handout</th>
                                        <th style="padding:9px 12px;font-weight:700;">Submitted</th>
                                        <th style="padding:9px 12px;font-weight:700;">Score</th>
                                        <th style="padding:9px 12px;font-weight:700;">Due</th>
                                        <th style="padding:9px 12px;font-weight:700;">Status</th>
                                        <th style="padding:9px 12px;font-weight:700;text-align:right;">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${items.length ? items.map(it => `
                                        <tr style="border-bottom:1px solid #e2e8f0;background:#ffffff;">
                                          <td style="padding:10px 12px;color:#0f172a;font-weight:600;">
                                            <div style="display:flex;align-items:center;gap:8px;cursor:pointer;" onclick="previewSubjectUploadedMaterial('${it.id}')" title="Click to preview ${escHtml(it.title)}">
                                              <span style="font-size:15px;">📄</span>
                                              <span style="color:#0f172a;transition:color 0.15s ease;" onmouseover="this.style.color='#0284c7';this.style.textDecoration='underline'" onmouseout="this.style.color='#0f172a';this.style.textDecoration='none'">${escHtml(it.title)}</span>
                                            </div>
                                          </td>
                                          <td style="padding:10px 12px;color:#64748b;">${escHtml(it.submitted || '-')}</td>
                                          <td style="padding:10px 12px;color:#64748b;">${escHtml(it.score || '-')}</td>
                                          <td style="padding:10px 12px;color:#64748b;">${escHtml(it.due || '-')}</td>
                                          <td style="padding:10px 12px;"><span class="sw-status-pill ${it.status === 'Completed' ? 'done' : (it.status === 'Ongoing' ? 'ongoing' : '')}">${escHtml(it.status || 'Pending')}</span></td>
                                          <td style="padding:10px 12px;text-align:right;">
                                            <div style="display:inline-flex;align-items:center;gap:6px;justify-content:flex-end;">
                                              <button type="button" class="sw-btn outline" onclick="event.stopPropagation(); previewSubjectUploadedMaterial('${it.id}')" style="padding:4px 10px;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:5px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;color:#334155;cursor:pointer;transition:all 0.15s ease;" title="Instant Handout Preview">
                                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                Preview
                                              </button>
                                              <a href="${it.file_url || 'SURVEY FORMS - Scholaria.pdf'}" target="_blank" download style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;background:#f0f9ff;border:1px solid #bae6fd;color:#0284c7;font-size:11.5px;font-weight:700;text-decoration:none;" title="Download Handout">
                                                <span>⬇</span> Download
                                              </a>
                                              ${(role === 'admin') ? `
                                                <button type="button" onclick="event.stopPropagation(); deleteMaterial('${it.id}')" style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:6px;background:#fff1f2;border:1px solid #fecdd3;color:#e11d48;font-size:11.5px;font-weight:700;cursor:pointer;" title="Delete Handout">
                                                  🗑
                                                </button>
                                              ` : ''}
                                            </div>
                                          </td>
                                        </tr>
                                      `).join('') : `
                                        <tr>
                                          <td colspan="6" style="padding:32px 16px;text-align:center;background:#ffffff;border-radius:8px;">
                                            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                                              <span style="font-size:24px;">📦</span>
                                              <div style="font-size:13.5px;font-weight:700;color:#0f172a;">Empty — No files uploaded for this lesson yet.</div>
                                              <div style="font-size:12px;color:#64748b;max-width:440px;">Learning handouts and module materials for this lesson will appear here once published.</div>
                                              ${(role === 'admin') ? `
                                                <button class="sw-btn primary" onclick="openMaterialModal('${course.id}', '${escHtml(activeSubjectSection || '')}', '${lesson.id}')" style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;">
                                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                                  Upload Handout to this Lesson
                                                </button>
                                              ` : ''}
                                            </div>
                                          </td>
                                        </tr>
                                      `}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ` : ''}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  ` : `
                    <div style="padding:40px 24px;text-align:center;background:#fff;border-radius:14px;border:1.5px dashed #cbd5e1;display:flex;flex-direction:column;align-items:center;gap:10px;">
                      <div style="width:48px;height:48px;border-radius:12px;background:#f0f9ff;color:#0284c7;display:flex;align-items:center;justify-content:center;font-size:24px;">📖</div>
                      <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">No official curriculum modules uploaded yet</h4>
                      <p style="margin:0;font-size:13px;color:#64748b;max-width:440px;line-height:1.5;">Curriculum modules and syllabus handouts for ${escHtml(course.title)} will appear here once published.</p>
                      ${(role === 'teacher' || role === 'admin') ? `
                        <button class="sw-btn primary" onclick="openMaterialModal('${course.id}')" style="margin-top:6px;display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-weight:700;">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          Upload Handout for this Subject
                        </button>
                      ` : ''}
                    </div>
                  `}
                  ${role === 'student' && subjectQuizzes.length ? `
                    <div class="sw-subject-quizzes-card" style="margin-top:20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
                      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
                        <div>
                          <h3 style="margin:0;font-size:15.5px;font-weight:700;color:#0f172a;">Quizzes &amp; Assessments</h3>
                          <span style="font-size:12px;color:var(--text-muted);">Assigned for ${escHtml(course.title)}</span>
                        </div>
                        <button type="button" class="sw-btn outline" onclick="setSubjectSubTab('quizzes')" style="padding:6px 12px;font-size:12px;">View all ${subjectQuizzes.length}</button>
                      </div>
                      <div class="file-list" style="display:flex;flex-direction:column;gap:8px;">
                        ${subjectQuizzes.map(q => {
                          const attempt = attempts.find(a => {
                            if (!a) return false;
                            const attemptQuizId = String(a.quiz_id || '').toLowerCase().trim();
                            const quizId = String(q.id || '').toLowerCase().trim();
                            return (attemptQuizId && attemptQuizId === quizId) ||
                              (a.quiz_title && q.title && String(a.quiz_title).trim().toLowerCase() === String(q.title).trim().toLowerCase());
                          });
                          const isInteractiveQuiz = q.type === 'interactive' || q.quiz_type === 'interactive';
                          return `
                            <div class="file-row">
                              <div class="file-icon" style="background:${isInteractiveQuiz ? '#7c3aed' : '#2563eb'};color:#fff;">${isInteractiveQuiz ? '🎮' : '📝'}</div>
                              <div class="file-info">
                                <h4>${escHtml(q.title || 'Quiz')}</h4>
                                <span>${(Array.isArray(q.questions) ? q.questions.length : 0)} items${q.dueDate || q.due_date ? ` · Due ${escHtml(String(q.dueDate || q.due_date))}` : ''}</span>
                              </div>
                              <span class="status-pill ${attempt ? 'done' : 'pending'}">${attempt ? 'Completed' : 'Pending'}</span>
                              ${attempt
                                ? `<button type="button" class="sw-btn outline" onclick="openReviewAttempt('${q.id}', '${attempt.id || ''}')" style="padding:6px 12px;font-size:12px;">Review</button>`
                                : `<button type="button" class="take-btn" onclick="${isInteractiveQuiz ? `openInteractiveQuiz('${q.id}')` : `openTakeQuizModal('${q.id}')`}" style="padding:7px 14px;font-size:12px;font-weight:700;">${isInteractiveQuiz ? 'Play Quiz' : 'Take Quiz'}</button>`}
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              ` : activeSubjectSubTab === 'quizzes' ? `
                <div class="sw-quizzes-list" style="display:flex;flex-direction:column;gap:10px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                    <div>
                      <h3 style="margin:0;font-size:15.5px;font-weight:700;color:#0f172a;">Quizzes &amp; Assessments</h3>
                      <span style="font-size:12px;color:var(--text-muted);">Assigned assessments and quizzes for ${escHtml(course.title)}${activeSubjectSection ? ` (${escHtml(activeSubjectSection)})` : ''}</span>
                    </div>
                    ${(role === 'teacher' || role === 'admin') ? `
                      <button class="sw-btn primary" onclick="openTeacherCreateQuizForSubject('${escHtml(course.title)}', '${escHtml(activeSubjectSection || '')}')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-weight:700;font-size:12.5px;">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Create Quiz for ${escHtml(activeSubjectSection || 'this Subject')}
                      </button>
                    ` : ''}
                  </div>

                  ${subjectQuizzes.length ? subjectQuizzes.map(q => {
                    const attempt = attempts.find(a => {
                      if (!a) return false;
                      const aQid = String(a.quiz_id || '').toLowerCase().trim();
                      const qId = String(q.id || '').toLowerCase().trim();
                      if (aQid && aQid === qId) return true;
                      if (a.quiz_title && q.title && String(a.quiz_title).trim().toLowerCase() === String(q.title).trim().toLowerCase()) return true;
                      return false;
                    });
                    const pct = attempt && attempt.total_items ? Math.round((attempt.score / attempt.total_items) * 100) : null;
                    return `
                      <div class="file-row">
                        <div class="file-icon" style="background:#059669;">
                          <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                        </div>
                        <div class="file-info">
                          <h4>${escHtml(q.title)}</h4>
                          <span>${(q.questions||[]).length} items${attempt ? ' · Score: ' + pct + '%' : ''}</span>
                        </div>
                        <span class="status-pill ${attempt ? 'done' : 'pending'}">${attempt ? 'Completed' : 'Pending'}</span>
                        ${attempt ? `
                          <button class="sw-btn outline" onclick="openReviewAttempt('${q.id}', '${attempt.id || ''}')" style="padding:6px 14px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:6px;border-radius:8px;border:1.5px solid #0284c7;color:#0284c7;background:#fff;cursor:pointer;transition:all 0.15s ease;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Review
                          </button>
                        ` : `
                          <button class="take-btn" onclick="${(q.type === 'interactive' || q.quiz_type === 'interactive') ? `openInteractiveQuiz('${q.id}')` : `openTakeQuizModal('${q.id}')`}" style="padding:7px 16px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;border-radius:8px;background:${(q.type === 'interactive' || q.quiz_type === 'interactive') ? 'linear-gradient(135deg,#0284c7,#8b5cf6)' : 'linear-gradient(135deg,#0284c7,#0369a1)'};color:#ffffff;border:none;box-shadow:0 2px 6px rgba(2,132,199,0.25);cursor:pointer;transition:all 0.15s ease;">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            ${(q.type === 'interactive' || q.quiz_type === 'interactive') ? 'Play Quiz' : 'Take Quiz'}
                          </button>
                        `}
                      </div>
                    `;
                  }).join('') : '<p style="padding:24px;color:var(--text-muted);font-size:13px;text-align:center;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">No quizzes assigned for this subject yet.</p>'}
                </div>
              ` : `
                <div class="sw-uploads-wrap">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                    <div>
                      <h3 style="margin:0;font-size:15.5px;font-weight:700;color:#0f172a;">Teacher Uploads</h3>
                      <span style="font-size:12px;color:var(--text-muted);">Supplemental handouts, slide decks, and worksheets uploaded by faculty for ${escHtml(course.title)}</span>
                    </div>
                    ${(role === 'teacher') ? `
                      <button class="sw-btn primary" onclick="openMaterialModal('${course.id}', '${escHtml(activeSubjectSection || '')}')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-weight:700;font-size:12.5px;">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Upload Handouts to ${escHtml(activeSubjectSection || 'this Subject')}
                      </button>
                    ` : ''}
                  </div>

                  <div class="file-list">
                    ${(() => {
                      const finalUploads = (role === 'admin' && window.adminUploadScope === 'mine')
                        ? subjectUploads.filter(m => (CURRENT_PROFILE && m.uploaded_by === CURRENT_PROFILE.id) || (m.uploader_role||'').toLowerCase().includes('admin') || (m.uploaded_by_name||'').toLowerCase().includes('admin'))
                        : subjectUploads;
                      return finalUploads.length ? finalUploads.map(m => `
                      <div class="file-row">
                        <div class="file-icon ${fileIconClass(m.file_type)}">${fileIconSvg()}</div>
                        <div class="file-info">
                          <h4>${escHtml(m.title)}</h4>
                          <span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px;">
                            <span>👤 ${escHtml(m.uploaded_by_name || m.uploader_name || 'Teacher')}</span>
                            <span>·</span>
                            <span>📅 ${escHtml(m.date_formatted || 'Recent')}</span>
                            <span>·</span>
                            <span style="background:#f1f5f9;padding:1px 6px;border-radius:6px;font-weight:600;font-size:11px;">${escHtml(m.size || 'PDF')}</span>
                            ${m.status === 'pending'
                              ? '<span style="background:#fef3c7;color:#b45309;padding:1px 7px;border-radius:6px;font-weight:700;font-size:11px;border:1px solid #fde68a;">⏳ Pending Admin Approval</span>'
                              : '<span style="background:#ecfdf5;color:#047857;padding:1px 7px;border-radius:6px;font-weight:700;font-size:11px;">✓ Approved</span>'
                            }
                          </span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                          <button class="sw-btn outline" onclick="previewSubjectUploadedMaterial('${m.id}')" style="padding:6px 12px;font-size:12px;display:inline-flex;align-items:center;gap:4px;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Preview
                          </button>
                          <button class="dl-btn" onclick="downloadMaterial('${m.id}')" style="padding:6px 14px;font-size:12px;">Download</button>
                          ${(role === 'admin' || (CURRENT_PROFILE && m.uploaded_by === CURRENT_PROFILE.id)) ? `
                            <button class="sw-btn" onclick="deleteMaterial('${m.id}')" title="Delete Material" style="background:#fee2e2;color:#b91c1c;border:none;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:12px;">
                              🗑️
                            </button>
                          ` : ''}
                        </div>
                      </div>
                    `).join('') : `
                      <div style="padding:40px 24px;text-align:center;background:#fff;border-radius:14px;border:1.5px dashed #cbd5e1;display:flex;flex-direction:column;align-items:center;gap:10px;">
                        <div style="width:48px;height:48px;border-radius:12px;background:#f0f9ff;color:#0284c7;display:flex;align-items:center;justify-content:center;font-size:24px;">📁</div>
                        <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">No teacher uploads for ${escHtml(course.title)} yet</h4>
                        <p style="margin:0;font-size:13px;color:#64748b;max-width:440px;line-height:1.5;">Supplemental handouts, slide decks, and worksheets uploaded by faculty members for this subject will appear here.</p>
                        ${(role === 'teacher' || role === 'admin') ? `
                          <button class="sw-btn primary" onclick="openMaterialModal('${course.id}')" style="margin-top:6px;display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-weight:700;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Upload Handouts to ${escHtml(activeSubjectSection || 'this Subject')}
                          </button>
                        ` : ''}
                      </div>
                    `;
                  })()}
                  </div>
                </div>
              `
            }
          </div>

          <div class="sw-sidebar">
            <!-- Widget 1: Subject Progress -->
            <div class="sw-widget-card" style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:18px;padding:20px;box-shadow:0 2px 10px rgba(15,23,42,0.04);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;">
                  <span style="color:#0284c7;">📊</span> Subject Progress
                </h4>
                <a href="javascript:void(0)" onclick="renderPage('progress')" style="font-size:12px;color:#0284c7;font-weight:700;text-decoration:none;">View All →</a>
              </div>
              <div class="sw-gauge-wrap" style="position:relative;width:120px;height:120px;margin:0 auto 16px auto;">
                <svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(-90deg);">
                  <!-- Base track -->
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" stroke-width="9"/>
                  <!-- Completed (Green) -->
                  ${sCompLen > 0 ? `<circle cx="50" cy="50" r="38" fill="none" stroke="#16a34a" stroke-width="9" stroke-linecap="round" stroke-dasharray="${sCompLen.toFixed(2)} ${sC}" stroke-dashoffset="0"/>` : ''}
                  <!-- Pending (Amber) -->
                  ${(pendingQuizzesCount > 0 && sPendLen > 0) ? `<circle cx="50" cy="50" r="38" fill="none" stroke="#d97706" stroke-width="9" stroke-linecap="round" stroke-dasharray="${sPendLen.toFixed(2)} ${sC}" stroke-dashoffset="-${sCompLen.toFixed(2)}"/>` : ''}
                </svg>
                <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                  <span style="font-size:24px;font-weight:800;color:#0f172a;line-height:1;">${quizProgressPct}%</span>
                  <span style="font-size:9px;font-weight:700;color:#64748b;margin-top:2px;">${pendingQuizzesCount === 0 ? 'COMPLETE' : 'PROGRESS'}</span>
                </div>
              </div>
              <span style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.6px;text-transform:uppercase;text-align:center;display:block;margin-top:6px;margin-bottom:12px;">ACADEMIC OVERVIEW</span>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span style="display:inline-flex;align-items:center;gap:6px;color:#475569;"><span style="width:8px;height:8px;border-radius:50%;background:#16a34a;"></span> Quizzes Completed</span>
                  <strong style="color:#0f172a;">${completedQuizzesCount} / ${subjectQuizzes.length}</strong>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span style="display:inline-flex;align-items:center;gap:6px;color:#475569;"><span style="width:8px;height:8px;border-radius:50%;background:${pendingQuizzesCount > 0 ? '#d97706' : '#16a34a'};"></span> Quizzes Pending</span>
                  <strong style="color:${pendingQuizzesCount > 0 ? '#d97706' : '#16a34a'};">${pendingQuizzesCount}</strong>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span style="display:inline-flex;align-items:center;gap:6px;color:#475569;"><span style="width:8px;height:8px;border-radius:50%;background:#0284c7;"></span> Teacher Handouts</span>
                  <strong style="color:#0f172a;">${subjectUploads.length}</strong>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span style="display:inline-flex;align-items:center;gap:6px;color:#475569;"><span style="width:8px;height:8px;border-radius:50%;background:#8b5cf6;"></span> Modules Available</span>
                  <strong style="color:#0f172a;">${lessons.length}</strong>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;padding-top:6px;border-top:1px solid #f1f5f9;">
                  <span style="display:inline-flex;align-items:center;gap:6px;color:#0284c7;font-weight:700;"><span style="width:8px;height:8px;border-radius:50%;background:#0284c7;"></span> Total Learning Files</span>
                  <strong style="color:#0284c7;">${totalSubjectMat}</strong>
                </div>
              </div>
            </div>

            <!-- Widget 2: Subject To-Do -->
            <div class="sw-widget-card" style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:18px;padding:20px;box-shadow:0 2px 10px rgba(15,23,42,0.04);margin-top:16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;">
                  <span>📋</span> Subject To-Do
                </h4>
                <a href="javascript:void(0)" onclick="renderPage('quizzes')" style="font-size:12px;color:#0284c7;font-weight:700;text-decoration:none;">View All →</a>
              </div>
              <div class="sw-todo-list" style="display:flex;flex-direction:column;gap:10px;">
                ${subjectQuizzes.filter(q => !attempts.some(a => a.quiz_id === q.id)).slice(0, 3).map(q => `
                  <div class="sw-todo-item" onclick="${(q.type === 'interactive' || q.quiz_type === 'interactive') ? `openInteractiveQuiz('${q.id}')` : `openTakeQuizModal('${q.id}')`}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;cursor:pointer;">
                    <span class="sw-todo-icon" style="font-size:18px;">${(q.type === 'interactive' || q.quiz_type === 'interactive') ? '🎮' : '📝'}</span>
                    <div class="sw-todo-info" style="flex:1;">
                      <h5 style="margin:0 0 2px 0;font-size:13px;font-weight:700;color:#0f172a;">${escHtml(q.title)}</h5>
                      <span style="font-size:11.5px;color:#64748b;">${(q.questions||[]).length} items · Pending</span>
                    </div>
                    <span style="color:#94a3b8;font-size:14px;">›</span>
                  </div>
                `).join('') || `
                  <div style="padding:14px 10px;text-align:center;color:#64748b;font-size:12px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
                    ✓ All caught up! No pending assessments for this subject.
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }
  }

  // ── TEACHER & ADMIN VIEW: STI eLMS SECTION-SEPARATED CLASS COMPILATION HUB ──
  if (role === 'teacher' || role === 'admin') {
    return renderTeacherSubjectsHubHTML(enrolledCourses, role);
  }

  // ── STUDENT VIEW: SUBJECT CARDS COMPILATION HUB ──
  return renderStudentMaterialsHubHTML(enrolledCourses, studentStrand);
}

// ── TEACHER COMPILATION HUB (STI eLMS MODEL) STATE & FUNCTIONS ──
function getSectionStrand(secName) {
  if (typeof managedSections !== 'undefined' && Array.isArray(managedSections)) {
    const found = managedSections.find(s => (s.name || '').toLowerCase().trim() === (secName || '').toLowerCase().trim());
    if (found && found.strand) return found.strand.toUpperCase().trim();
  }
  const sLow = (secName || '').toLowerCase().trim();
  if (sLow.includes('stem')) return 'STEM';
  if (sLow.includes('humss')) return 'HUMSS';
  if (sLow.includes('abm')) return 'ABM';
  if (sLow.includes('tvl')) return 'TVL';
  if (sLow === 'section a') return 'STEM';
  if (sLow === 'section b') return 'HUMSS';
  if (sLow === 'section c') return 'STEM';
  if (sLow === 'section d') return 'ABM';
  return 'STEM';
}
window.getSectionStrand = getSectionStrand;

function getSectionGradeLevel(secName) {
  if (typeof managedSections !== 'undefined' && Array.isArray(managedSections)) {
    const found = managedSections.find(s => (s.name || '').toLowerCase().trim() === (secName || '').toLowerCase().trim());
    if (found && found.gradeLevel) return found.gradeLevel.trim();
  }
  const sLow = (secName || '').toLowerCase().trim();
  if (sLow.includes('grade 12') || sLow.includes('gr12') || sLow.includes('g12')) return 'Grade 12';
  if (sLow.includes('grade 11') || sLow.includes('gr11') || sLow.includes('g11')) return 'Grade 11';
  if (sLow === 'section c' || sLow === 'section d') return 'Grade 12';
  return 'Grade 11';
}
window.getSectionGradeLevel = getSectionGradeLevel;
function getTrackForSubjectTitle(title, strand) {
  const t = (title || '').toLowerCase();
  if (t.includes('homeroom')) return 'Other';
  if (t.includes('complex numbers') || t.includes('vectors') || t.includes('human biology') || t.includes('differential equations') || t.includes('biochemistry')) return 'Elective';
  if (t.includes('pre-calculus') || t.includes('basic calculus') || t.includes('general biology') || t.includes('general physics') || t.includes('general chemistry') || t.includes('work immersion / research / culminating activity')) return 'Specialized';
  if (t.includes('disciplines and ideas') || t.includes('philippine politics') || t.includes('creative writing') || t.includes('world religions') || t.includes('creative nonfiction') || t.includes('community engagement') || t.includes('trends, networks') || t.includes('culminating activity')) return 'Specialized';
  if (t.includes('business math') || t.includes('fundamentals of accountancy') || t.includes('principles of marketing') || t.includes('applied economics') || t.includes('business finance') || t.includes('business ethics') || t.includes('business enterprise simulation') || t.includes('organization and management')) return 'Specialized';
  if (t.includes('computer systems') || t.includes('web systems') || t.includes('database management') || t.includes('cybersecurity') || t.includes('work immersion (tvl)')) return 'Specialized';
  if (t.includes('research') || t.includes('empowerment') || t.includes('eapp') || t.includes('english for academic') || t.includes('filipino sa piling') || t.includes('entrepreneurship') || t.includes('inquiries, investigation') || t.includes('inquiries, investigations')) return 'Applied';
  return 'Core';
}
window.getTrackForSubjectTitle = getTrackForSubjectTitle;


let teacherGradeFilter = 'all';
window.teacherGradeFilter = 'all';

function setTeacherGradeFilter(gradeVal) {
  teacherGradeFilter = gradeVal || 'all';
  window.teacherGradeFilter = teacherGradeFilter;
  applyTeacherClassFilter();
}
window.setTeacherGradeFilter = setTeacherGradeFilter;

let teacherStrandFilter = 'all';
window.teacherStrandFilter = 'all';
let teacherSectionFilter = 'all';
window.teacherSectionFilter = 'all';
let teacherTrackFilter = 'all';
window.teacherTrackFilter = 'all';
let teacherClassFilter = 'all';
window.teacherClassFilter = 'all';
let teacherClassSearchQuery = '';
window.teacherClassSearchQuery = '';

function setTeacherStrandFilter(strandVal) {
  teacherStrandFilter = strandVal || 'all';
  window.teacherStrandFilter = teacherStrandFilter;
  teacherSectionFilter = 'all';
  window.teacherSectionFilter = 'all';
  const secSelect = document.getElementById('teacherSectionSelect');
  if (secSelect) secSelect.value = 'all';
  applyTeacherClassFilter();
}
window.setTeacherStrandFilter = setTeacherStrandFilter;

function setTeacherSectionFilter(secVal) {
  teacherSectionFilter = secVal || 'all';
  window.teacherSectionFilter = teacherSectionFilter;
  applyTeacherClassFilter();
}
window.setTeacherSectionFilter = setTeacherSectionFilter;

function setTeacherTrackFilter(trackVal) {
  teacherTrackFilter = trackVal || 'all';
  window.teacherTrackFilter = teacherTrackFilter;
  applyTeacherClassFilter();
}
window.setTeacherTrackFilter = setTeacherTrackFilter;

function setTeacherClassFilter(filterVal) {
  if (!filterVal || filterVal === 'all') {
    resetAllMaterialsFilters();
    return;
  }
  if (filterVal.toLowerCase().startsWith('section')) {
    setTeacherSectionFilter(filterVal);
  } else {
    setTeacherTrackFilter(filterVal);
  }
}
window.setTeacherClassFilter = setTeacherClassFilter;

function resetAllMaterialsFilters() {
  teacherStrandFilter = 'all';
  window.teacherStrandFilter = 'all';
  teacherSectionFilter = 'all';
  window.teacherSectionFilter = 'all';
  teacherTrackFilter = 'all';
  window.teacherTrackFilter = 'all';
  teacherClassFilter = 'all';
  window.teacherClassFilter = 'all';
  teacherClassSearchQuery = '';
  window.teacherClassSearchQuery = '';

  const gradeSelect = document.getElementById('teacherGradeSelect');
  if (gradeSelect) gradeSelect.value = 'all';
  const strandSelect = document.getElementById('teacherStrandSelect');
  if (strandSelect) strandSelect.value = 'all';
  const secSelect = document.getElementById('teacherSectionSelect');
  if (secSelect) secSelect.value = 'all';
  const trackSelect = document.getElementById('teacherTrackSelect');
  if (trackSelect) trackSelect.value = 'all';
  const searchInp = document.getElementById('teacherClassSearchInput');
  if (searchInp) searchInp.value = '';
  const clearBtn = document.getElementById('teacherClassSearchClearBtn');
  if (clearBtn) clearBtn.style.display = 'none';

  applyTeacherClassFilter();
}
window.resetAllMaterialsFilters = resetAllMaterialsFilters;

function setTeacherClassSearch(query) {
  teacherClassSearchQuery = (query || '').toLowerCase().trim();
  window.teacherClassSearchQuery = teacherClassSearchQuery;
  const clearBtn = document.getElementById('teacherClassSearchClearBtn');
  if (clearBtn) clearBtn.style.display = teacherClassSearchQuery ? 'inline-block' : 'none';
  applyTeacherClassFilter();
}
window.setTeacherClassSearch = setTeacherClassSearch;

function clearTeacherClassSearch() {
  const inp = document.getElementById('teacherClassSearchInput');
  if (inp) { inp.value = ''; inp.focus(); }
  setTeacherClassSearch('');
}
window.clearTeacherClassSearch = clearTeacherClassSearch;

function updateSectionDropdownOptions(activeStrand) {
  const select = document.getElementById('teacherSectionSelect');
  if (!select) return;

  const currentVal = (window.teacherSectionFilter || 'all').toLowerCase();
  const options = select.querySelectorAll('option[data-section-strand]');
  let isCurrentStillValid = (currentVal === 'all');

  options.forEach(opt => {
    const optStrand = (opt.dataset.sectionStrand || '').toLowerCase();
    if (activeStrand === 'all' || optStrand === activeStrand || optStrand === 'all') {
      opt.style.display = '';
      opt.disabled = false;
      if (opt.value.toLowerCase() === currentVal) isCurrentStillValid = true;
    } else {
      opt.style.display = 'none';
      opt.disabled = true;
    }
  });

  if (!isCurrentStillValid) {
    select.value = 'all';
    window.teacherSectionFilter = 'all';
  } else {
    select.value = window.teacherSectionFilter;
  }
}
window.updateSectionDropdownOptions = updateSectionDropdownOptions;

function applyTeacherClassFilter() {
  const grid = document.getElementById('teacherClassesFolderGrid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.subject-folder-card');
  const emptyState = document.getElementById('teacherClassesEmptyState');

  const activeGrade = (window.teacherGradeFilter || 'all').toLowerCase().replace(/\s+/g, '');
  const strandSelect = document.getElementById('teacherStrandSelect');
  const activeStrand = strandSelect ? (window.teacherStrandFilter || 'all').toLowerCase() : 'all';
  const activeSection = (window.teacherSectionFilter || 'all').toLowerCase();
  const activeTrack = (window.teacherTrackFilter || 'all').toLowerCase();
  const searchQuery = (window.teacherClassSearchQuery || '').toLowerCase().trim();

  let visibleCount = 0;

  cards.forEach(card => {
    const cardSection = (card.dataset.section || '').toLowerCase();
    const cardTrack = (card.dataset.track || '').toLowerCase();
    const cardSearch = (card.dataset.search || '').toLowerCase();
    const cardStrand = (card.dataset.strand || '').toLowerCase();
    const cardSecStrand = (card.dataset.sectionStrand || '').toLowerCase();
    const cardGrade = (card.dataset.grade || '').toLowerCase().replace(/\s+/g, '');

    // 0. GRADE LEVEL MATCH:
    let matchesGrade = true;
    if (activeGrade !== 'all') {
      matchesGrade = (cardGrade === activeGrade);
    }

    // 1. STRAND MATCH: When a strand like STEM/HUMSS/ABM/TVL is picked, strictly isolate matching sections/classes
    let matchesStrand = true;
    if (activeStrand !== 'all') {
      matchesStrand = (cardSecStrand === activeStrand || cardStrand === activeStrand);
    }

    // 2. SECTION MATCH:
    let matchesSection = true;
    if (activeSection !== 'all') {
      matchesSection = (cardSection === activeSection);
    }

    // 3. TRACK MATCH (Specialized, Core, Applied):
    let matchesTrack = true;
    if (activeTrack !== 'all') {
      matchesTrack = (cardTrack === activeTrack);
    }

    // 4. SEARCH MATCH:
    let matchesSearch = true;
    if (searchQuery) {
      matchesSearch = cardSearch.includes(searchQuery);
    }

    if (matchesGrade && matchesStrand && matchesSection && matchesTrack && matchesSearch) {
      card.style.display = 'flex';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  // Dynamically update section dropdown to hide non-matching sections
  updateSectionDropdownOptions(activeStrand);

  // Live count badge
  const countBadge = document.getElementById('activeClassesCountBadge');
  if (countBadge) {
    countBadge.textContent = `${visibleCount} ${visibleCount === 1 ? 'Class' : 'Classes'}`;
  }

  if (emptyState) {
    emptyState.style.display = (visibleCount === 0) ? 'flex' : 'none';
  }
}
window.applyTeacherClassFilter = applyTeacherClassFilter;

function getTeacherHandledClassCards(courses, currentRole = (typeof ROLE !== 'undefined' ? ROLE : 'teacher')) {
  const classCards = [];
  let handledSections = ['Section A', 'Section B'];

  if (currentRole === 'admin') {
    if (typeof managedSections !== 'undefined' && Array.isArray(managedSections)) {
      const nonArch = managedSections.filter(s => !s.isArchived).map(s => s.name);
      if (nonArch.length) handledSections = nonArch;
    } else if (typeof SECTIONS !== 'undefined' && Array.isArray(SECTIONS) && SECTIONS.length) {
      handledSections = SECTIONS.slice();
    }
  } else if (CURRENT_PROFILE && CURRENT_PROFILE.section) {
    const raw = CURRENT_PROFILE.section.split(',').map(s => s.trim()).filter(Boolean);
    if (raw.length > 0) handledSections = raw;
  }

  handledSections.forEach(sec => {
    const secStrand = getSectionStrand(sec);
    const secGrade = getSectionGradeLevel(sec);

    // Official curriculum list matching the Senior High School Curriculum Guide
    const officialTitles = (typeof SUBJECTS_BY_STRAND_AND_GRADE !== 'undefined' && SUBJECTS_BY_STRAND_AND_GRADE[secStrand]?.[secGrade])
      ? SUBJECTS_BY_STRAND_AND_GRADE[secStrand][secGrade]
      : [];

    if (officialTitles.length > 0) {
      officialTitles.forEach(title => {
        const foundCourse = (courses || []).find(c => {
          const cT = (c.title || '').toLowerCase().trim();
          const tT = title.toLowerCase().trim();
          return cT === tT || cT.includes(tT) || tT.includes(cT);
        }) || {};

        const track = foundCourse.track || getTrackForSubjectTitle(title, secStrand);
        const baseId = foundCourse.id || ('course-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
        const cover = foundCourse.cover || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80';
        const desc = foundCourse.description || (`Official DepEd Senior High School ${secStrand} curriculum subject: ${title}.`);

        let secCode = foundCourse.code || (`${secStrand}-${secGrade === 'Grade 12' ? '1201' : '1101'}`);
        const letterMatch = sec.match(/Section\s*([A-Za-z0-9]+)/i);
        const secIdentifier = letterMatch ? letterMatch[1].toUpperCase() : sec.trim().charAt(0).toUpperCase();

        if (secIdentifier === 'B') {
          secCode = secCode.replace(/1$/, '2');
          if (!secCode.endsWith('-B')) secCode += '-B';
        } else if (secIdentifier === 'A') {
          if (!secCode.endsWith('-A')) secCode += '-A';
        } else {
          if (!secCode.endsWith(`-${secIdentifier}`)) secCode += `-${secIdentifier}`;
        }

        classCards.push({
          ...foundCourse,
          id: `${baseId}__${sec.replace(/\s+/g, '_')}`,
          cardKey: `${baseId}__${sec.replace(/\s+/g, '_')}`,
          baseCourseId: baseId,
          title: title,
          track: track,
          strand: secStrand,
          gradeLevel: secGrade,
          assignedSection: sec,
          sectionCode: secCode,
          sectionStrand: secStrand,
          sectionGradeLevel: secGrade,
          displayStrand: secStrand,
          cover: cover,
          description: desc
        });
      });
    } else {
      // Fallback in case of custom strand
      (courses || []).forEach(course => {
        let secCode = course.code || 'SUBJ-1101';
        classCards.push({
          ...course,
          cardKey: `${course.id}__${sec.replace(/\s+/g, '_')}`,
          baseCourseId: course.id,
          assignedSection: sec,
          sectionCode: secCode,
          sectionStrand: secStrand,
          sectionGradeLevel: secGrade,
          displayStrand: secStrand,
          gradeLevel: secGrade
        });
      });
    }
  });

  return classCards;
}


function getMaterialFormatBadge(type, fileName) {
  const t = (type || (fileName ? fileName.split('.').pop() : 'PDF')).toUpperCase();
  let bg = '#fee2e2', color = '#dc2626', label = 'PDF';
  if (t === 'PDF') { bg = '#fee2e2'; color = '#dc2626'; label = 'PDF'; }
  else if (t === 'DOCX' || t === 'DOC') { bg = '#dbeafe'; color = '#1d4ed8'; label = 'DOCX'; }
  else if (t === 'PPTX' || t === 'PPT') { bg = '#ffedd5'; color = '#c2410c'; label = 'PPTX'; }
  else if (['PNG', 'JPG', 'JPEG', 'WEBP', 'IMG', 'IMAGE'].includes(t)) { bg = '#dcfce7'; color = '#15803d'; label = 'IMAGE'; }
  else if (t === 'TXT') { bg = '#f1f5f9'; color = '#475569'; label = 'TXT'; }
  else { bg = '#ede9fe'; color = '#6d28d9'; label = t.slice(0, 4); }
  return '<span style="background:' + bg + ';color:' + color + ';font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:5px;letter-spacing:0.4px;">' + label + '</span>';
}

function renderAdminApprovedHandoutRow(m) {
  const isTeacher = (m.uploader_role || '').toLowerCase().includes('teacher') || 
                    (m.uploaded_by_name || '').toLowerCase().includes('teacher') || 
                    (m.uploader_name || '').toLowerCase().includes('teacher');
  const uploaderRole = isTeacher ? 'Teacher' : 'Admin';
  const uploaderName = m.uploaded_by_name || m.uploader_name || (isTeacher ? 'Faculty Instructor' : 'Administrator');
  const approverName = m.approved_by_name || (isTeacher ? 'Academic Admin' : uploaderName);

  const title = m.title || m.fileName || 'Curriculum Handout';
  const formatBadge = getMaterialFormatBadge(m.type, m.fileName);
  const size = m.size || 'Official Handout';
  const date = m.date_formatted || (m.created_at ? new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified');
  const section = m.section || 'All Sections';
  const subject = m.subject || 'General Curriculum';
  const strandGrade = [m.strand, m.grade_level].filter(Boolean).join(' · ') || 'SHS Curriculum';

  return '<tr data-material-id="' + escHtml(m.id) + '" data-origin="' + uploaderRole.toLowerCase() + '" data-section="' + escHtml(section.toLowerCase()) + '" data-search="' + escHtml((title + ' ' + (m.fileName || '') + ' ' + subject + ' ' + section + ' ' + uploaderName + ' ' + approverName).toLowerCase()) + '">' +
    '<td>' +
      '<div style="display:flex;align-items:flex-start;gap:10px;">' +
        '<div style="margin-top:2px;">' + formatBadge + '</div>' +
        '<div style="min-width:0;">' +
          '<div style="font-weight:700;color:var(--text-primary);font-size:13.5px;margin-bottom:2px;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escHtml(title) + '">' + escHtml(title) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text-muted);display:flex;align-items:center;gap:6px;flex-wrap:nowrap;">' +
            '<span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="' + escHtml(m.fileName || title) + '">' + escHtml(m.fileName || title) + '</span>' +
            '<span>&middot;</span>' +
            '<span>' + escHtml(size) + '</span>' +
            '<span>&middot;</span>' +
            '<span>' + escHtml(date) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</td>' +
    '<td>' +
      '<div style="font-weight:600;color:var(--text-primary);font-size:13px;">' + escHtml(subject) + '</div>' +
      '<div style="font-size:11.5px;color:var(--text-muted);">' + escHtml(strandGrade) + '</div>' +
    '</td>' +
    '<td>' +
      '<span style="background:#f1f5f9;color:#334155;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:6px;display:inline-block;">' +
        escHtml(section) +
      '</span>' +
    '</td>' +
    '<td>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span class="role-tag ' + uploaderRole.toLowerCase() + '">' + uploaderRole + '</span>' +
        '<span style="font-weight:600;color:var(--text-primary);font-size:13px;">' + escHtml(uploaderName) + '</span>' +
      '</div>' +
    '</td>' +
    '<td>' +
      '<div style="display:inline-flex;align-items:center;gap:6px;color:#15803d;font-weight:600;font-size:12.5px;">' +
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#dcfce7;color:#16a34a;font-size:11px;flex-shrink:0;">✓</span>' +
        '<span>' + escHtml(approverName) + '</span>' +
      '</div>' +
    '</td>' +
    '<td>' +
      '<div style="display:inline-flex;align-items:center;gap:8px;">' +
        '<button class="table-act-btn preview" onclick="previewSubjectUploadedMaterial(\'' + escHtml(m.id) + '\')" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:5px;cursor:pointer;" title="Instant Handout Preview">' +
          '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
          'Preview' +
        '</button>' +
        '<button class="table-act-btn download" onclick="downloadMaterial(\'' + escHtml(m.id) + '\')" style="background:#f8fafc;color:#334155;border:1px solid #cbd5e1;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:5px;cursor:pointer;" title="Download Handout">' +
          '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
          'Download' +
        '</button>' +
        '<button class="table-act-btn delete" onclick="deleteMaterial(\'' + escHtml(m.id) + '\')" style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:7px;padding:6px 9px;font-size:12px;font-weight:700;cursor:pointer;" title="Delete Handout">' +
          '🗑️' +
        '</button>' +
      '</div>' +
    '</td>' +
  '</tr>';
}

function renderAdminApprovedHandoutsTableHTML() {
  const approvedList = materialsData.filter(m => m && m.status === 'approved' && (m.title || m.fileName));
  const distinctSections = [...new Set(approvedList.map(m => m.section).filter(Boolean))].sort();

  return '<div class="admin-approved-materials-panel" style="background:#ffffff;border:1.5px solid var(--blue-light);border-radius:16px;padding:22px;margin-bottom:26px;box-shadow:var(--shadow);">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
        '<div style="width:42px;height:42px;border-radius:12px;background:#eef2ff;color:#4338ca;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">📋</div>' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<h3 style="margin:0;font-size:17px;font-weight:800;color:var(--text-primary);">Institutional Approved Handouts Repository</h3>' +
            '<span id="adminApprovedCountBadge" style="background:#dcfce7;color:#15803d;font-size:11.5px;font-weight:800;padding:2px 8px;border-radius:20px;">' + approvedList.length + ' Approved</span>' +
          '</div>' +
          '<div style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">Showing verified and published module handouts from teachers &amp; administrators. Unapproved handouts are excluded.</div>' +
        '</div>' +
      '</div>' +
      '<button class="add-btn" onclick="openMaterialModal()" style="background:#4338ca;color:#ffffff;border:none;box-shadow:0 4px 12px rgba(67,56,202,0.25);font-weight:700;padding:8px 16px;font-size:12.5px;border-radius:8px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">' +
        (typeof iconPlus === 'function' ? iconPlus() : '+') + ' Upload Handout' +
      '</button>' +
    '</div>' +
    '<div class="user-search-row" style="margin-bottom:14px;gap:10px;flex-wrap:wrap;">' +
      '<div class="user-search-wrap" style="flex:1;min-width:240px;">' +
        '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
        '<input type="text" id="adminApprovedSearchInput" placeholder="Search handouts by title, filename, subject, uploader, or approver..." oninput="filterAdminApprovedHandouts()">' +
      '</div>' +
      '<select class="user-filter-select" id="adminApprovedOriginFilter" onchange="filterAdminApprovedHandouts()">' +
        '<option value="">All Uploaders (Faculty &amp; Admins)</option>' +
        '<option value="teacher">Faculty / Teachers Only</option>' +
        '<option value="admin">Administrators Only</option>' +
      '</select>' +
      '<select class="user-filter-select" id="adminApprovedSectionFilter" onchange="filterAdminApprovedHandouts()">' +
        '<option value="">All Sections</option>' +
        distinctSections.map(s => '<option value="' + escHtml(s.toLowerCase()) + '">' + escHtml(s) + '</option>').join('') +
      '</select>' +
      '<select class="user-filter-select" id="adminApprovedSortFilter" onchange="filterAdminApprovedHandouts()">' +
        '<option value="newest">Newest First</option>' +
        '<option value="oldest">Oldest First</option>' +
        '<option value="az">Title (A-Z)</option>' +
      '</select>' +
    '</div>' +
    '<div class="user-table" id="adminApprovedTableWrap" style="max-height:480px;overflow-y:auto;">' +
      '<table style="width:100%;border-collapse:collapse;min-width:980px;">' +
        '<thead>' +
          '<tr>' +
            '<th style="position:sticky;top:0;z-index:2;">Handout &amp; Document</th>' +
            '<th style="position:sticky;top:0;z-index:2;">Subject &amp; Strand</th>' +
            '<th style="position:sticky;top:0;z-index:2;">Target Section</th>' +
            '<th style="position:sticky;top:0;z-index:2;">Uploaded By (Origin)</th>' +
            '<th style="position:sticky;top:0;z-index:2;">Approved By</th>' +
            '<th style="position:sticky;top:0;z-index:2;">Actions</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody id="adminApprovedTableBody">' +
          (approvedList.length ? approvedList.map(m => renderAdminApprovedHandoutRow(m)).join('') : '') +
        '</tbody>' +
      '</table>' +
      '<div id="adminApprovedNoResults" style="' + (approvedList.length === 0 ? '' : 'display:none;') + 'padding:36px;text-align:center;color:var(--text-muted);font-size:13px;">' +
        '<div style="font-size:26px;margin-bottom:8px;">📄</div>' +
        '<strong>No approved handouts found</strong>' +
        '<div style="font-size:12px;margin-top:4px;">Either no handouts have been approved yet, or no items match your active search filters.</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function filterAdminApprovedHandouts() {
  const q = (document.getElementById('adminApprovedSearchInput')?.value || '').trim().toLowerCase();
  const origin = (document.getElementById('adminApprovedOriginFilter')?.value || '').toLowerCase();
  const sec = (document.getElementById('adminApprovedSectionFilter')?.value || '').toLowerCase();
  const sort = document.getElementById('adminApprovedSortFilter')?.value || 'newest';

  const tbody = document.getElementById('adminApprovedTableBody');
  const noRes = document.getElementById('adminApprovedNoResults');
  const countBadge = document.getElementById('adminApprovedCountBadge');
  if (!tbody) return;

  let approved = materialsData.filter(m => m && m.status === 'approved' && (m.title || m.fileName));

  if (q) {
    approved = approved.filter(m => {
      const isTeacher = (m.uploader_role || '').toLowerCase().includes('teacher') || (m.uploaded_by_name || '').toLowerCase().includes('teacher') || (m.uploader_name || '').toLowerCase().includes('teacher');
      const uploader = m.uploaded_by_name || m.uploader_name || (isTeacher ? 'Teacher' : 'Admin');
      const approver = m.approved_by_name || 'Administrator';
      const haystack = ('' + (m.title || '') + ' ' + (m.fileName || '') + ' ' + (m.subject || '') + ' ' + (m.section || '') + ' ' + uploader + ' ' + approver).toLowerCase();
      return haystack.includes(q);
    });
  }

  if (origin) {
    approved = approved.filter(m => {
      const isTeacher = (m.uploader_role || '').toLowerCase().includes('teacher') || (m.uploaded_by_name || '').toLowerCase().includes('teacher') || (m.uploader_name || '').toLowerCase().includes('teacher');
      return origin === 'teacher' ? isTeacher : !isTeacher;
    });
  }

  if (sec) {
    approved = approved.filter(m => (m.section || '').toLowerCase().includes(sec));
  }

  if (sort === 'az') {
    approved.sort((a, b) => (a.title || a.fileName || '').localeCompare(b.title || b.fileName || ''));
  } else if (sort === 'oldest') {
    approved.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  } else {
    approved.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  tbody.innerHTML = approved.map(m => renderAdminApprovedHandoutRow(m)).join('');
  if (noRes) noRes.style.display = approved.length === 0 ? 'block' : 'none';
  if (countBadge) countBadge.textContent = approved.length + ' Approved';
}
window.filterAdminApprovedHandouts = filterAdminApprovedHandouts;
window.renderAdminApprovedHandoutsTableHTML = renderAdminApprovedHandoutsTableHTML;
window.renderAdminApprovedHandoutRow = renderAdminApprovedHandoutRow;

function renderTeacherSubjectsHubHTML(enrolledCourses, activeRole = (typeof ROLE !== 'undefined' ? ROLE : 'teacher')) {
  setTimeout(() => applyTeacherClassFilter(), 0);
  const classCards = getTeacherHandledClassCards(enrolledCourses, activeRole);

  const distinctSections = [...new Set(classCards.map(c => c.assignedSection))].sort();
  const specializedCount = classCards.filter(c => c.track === 'Specialized').length;
  const coreCount = classCards.filter(c => c.track === 'Core').length;
  const appliedCount = classCards.filter(c => c.track === 'Applied').length;
  const isAdmin = (activeRole === 'admin');
  if (!isAdmin) {
    teacherStrandFilter = 'all';
    window.teacherStrandFilter = 'all';
  }
  const adminMaterials = materialsData.filter(m => {
    if (!m) return false;
    if (CURRENT_PROFILE && m.uploaded_by && m.uploaded_by === CURRENT_PROFILE.id) return true;
    const r = (m.uploader_role || '').toLowerCase();
    const n = (m.uploaded_by_name || m.uploader_name || '').toLowerCase();
    return r.includes('admin') || n.includes('admin');
  });
  const myAdminMaterialsCount = adminMaterials.length;

  const totalAllCards = classCards.length;
  const totalStemCards = classCards.filter(c => {
    const sStrand = (c.strand || '').toUpperCase();
    const secStrand = (c.sectionStrand || '').toUpperCase();
    return secStrand === 'STEM' && (sStrand === 'STEM' || c.track === 'Core' || c.track === 'Applied');
  }).length;
  const totalHumssCards = classCards.filter(c => {
    const sStrand = (c.strand || '').toUpperCase();
    const secStrand = (c.sectionStrand || '').toUpperCase();
    return secStrand === 'HUMSS' && (sStrand === 'HUMSS' || c.track === 'Core' || c.track === 'Applied');
  }).length;
  const totalAbmCards = classCards.filter(c => {
    const sStrand = (c.strand || '').toUpperCase();
    const secStrand = (c.sectionStrand || '').toUpperCase();
    return secStrand === 'ABM' && (sStrand === 'ABM' || c.track === 'Core' || c.track === 'Applied');
  }).length;
  const totalTvlCards = classCards.filter(c => {
    const sStrand = (c.strand || '').toUpperCase();
    const secStrand = (c.sectionStrand || '').toUpperCase();
    return secStrand === 'TVL' && (sStrand === 'TVL' || c.track === 'Core' || c.track === 'Applied');
  }).length;

  return `
  <div class="materials-page-container">
    <!-- 1. HERO BANNER -->
    <div class="materials-hero-banner" style="background:${isAdmin ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0284c7 100%)'};padding:24px 28px;border-radius:18px;margin-bottom:20px;box-shadow:0 6px 20px rgba(15,23,42,0.15);color:#fff;width:100%;box-sizing:border-box;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;width:100%;">
        <div style="display:flex;align-items:center;gap:18px;flex:1;min-width:300px;">
          <div style="width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;">${isAdmin ? '🏛️' : '🏫'}</div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="background:${isAdmin ? '#c7d2fe' : '#38bdf8'};color:${isAdmin ? '#312e81' : '#0c4a6e'};font-size:11px;font-weight:800;padding:2px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:0.5px;">${isAdmin ? 'ADMINISTRATOR PORTAL' : 'FACULTY PORTAL'}</span>
              <span style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:600;">S.Y. 2026–2027 · ${isAdmin ? 'Master Curriculum Repository' : 'STI eLMS Class Structure'}</span>
            </div>
            <h1 style="color:#ffffff;margin:0 0 6px 0;font-size:22px;font-weight:800;letter-spacing:-0.02em;">${isAdmin ? 'Academic Classes &amp; Materials Repository' : 'Handled Classes &amp; Materials Hub'}</h1>
            <p style="color:rgba(255,255,255,0.9);margin:0;font-size:13px;max-width:680px;line-height:1.45;">${isAdmin ? 'Master curriculum manager across all sections and strands. Upload official module handouts, manage class resources, and review student progress.' : 'Subjects are separated by handled section (Section A and Section B). Open any class to view curriculum modules, manage quizzes, or upload supplemental handouts.'}</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-left:auto;justify-content:flex-end;">
          <button class="add-btn" onclick="openMaterialModal()" style="background:#ffffff;color:${isAdmin ? '#4338ca' : '#0284c7'};border:none;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-weight:700;padding:9px 18px;font-size:13px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap;">
            ${typeof iconPlus === 'function' ? iconPlus() : '+'} Upload Handout
          </button>
          ${!isAdmin ? `
            <button class="add-btn" onclick="typeof openQuizModal === 'function' ? openQuizModal() : window.location.href='quiz-maker.html'" style="background:#38bdf8;color:#082f49;border:none;box-shadow:0 4px 12px rgba(56,189,248,0.25);font-weight:700;padding:9px 18px;font-size:13px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap;">
              ${typeof iconPlus === 'function' ? iconPlus() : '+'} AI Quiz Maker
            </button>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- 2. INSTITUTIONAL APPROVED HANDOUTS REPOSITORY (USER MANAGEMENT STYLE) -->
    ${isAdmin ? renderAdminApprovedHandoutsTableHTML() : ''}

    <!-- 3. GRADE, STRAND, SECTION & TRACK DROPDOWN FILTERS TOOLBAR -->
    <div class="user-search-row" style="margin-bottom:20px;gap:10px;flex-wrap:wrap;align-items:center;">
      <div class="user-search-wrap" style="flex:1;min-width:220px;">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="teacherClassSearchInput" placeholder="Search classes, subjects, sections, or codes..." value="${escHtml(teacherClassSearchQuery || '')}" oninput="setTeacherClassSearch(this.value)">
        <button type="button" id="teacherClassSearchClearBtn" onclick="clearTeacherClassSearch()" style="${teacherClassSearchQuery ? 'display:block;' : 'display:none;'}position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;line-height:1;padding:4px;">&times;</button>
      </div>

      <!-- GRADE LEVEL DROPDOWN -->
      <select class="user-filter-select" id="teacherGradeSelect" onchange="setTeacherGradeFilter(this.value)" aria-label="Filter by Grade Level">
        <option value="all" ${(!teacherGradeFilter || teacherGradeFilter === 'all') ? 'selected' : ''}>All Grades</option>
        <option value="Grade 11" ${teacherGradeFilter === 'Grade 11' ? 'selected' : ''}>Grade 11</option>
        <option value="Grade 12" ${teacherGradeFilter === 'Grade 12' ? 'selected' : ''}>Grade 12</option>
      </select>

      <!-- STRAND DROPDOWN (Admin only - teachers already filter by handled Section A/B) -->
      ${isAdmin ? `
      <select class="user-filter-select" id="teacherStrandSelect" onchange="setTeacherStrandFilter(this.value)" aria-label="Filter by Strand">
        <option value="all" ${(!teacherStrandFilter || teacherStrandFilter === 'all') ? 'selected' : ''}>All Strands</option>
        <option value="STEM" ${teacherStrandFilter === 'STEM' ? 'selected' : ''}>STEM</option>
        <option value="HUMSS" ${teacherStrandFilter === 'HUMSS' ? 'selected' : ''}>HUMSS</option>
        <option value="ABM" ${teacherStrandFilter === 'ABM' ? 'selected' : ''}>ABM</option>
        <option value="TVL" ${teacherStrandFilter === 'TVL' ? 'selected' : ''}>TVL</option>
      </select>
      ` : ''}

      <!-- SECTION DROPDOWN -->
      <select class="user-filter-select" id="teacherSectionSelect" onchange="setTeacherSectionFilter(this.value)" aria-label="Filter by Section">
        <option value="all">All Sections</option>
        ${distinctSections.map(sec => {
          const secStrand = getSectionStrand(sec);
          const secGrade = getSectionGradeLevel(sec);
          return `<option value="${escHtml(sec)}" data-section-strand="${escHtml(secStrand)}" data-section-grade="${escHtml(secGrade)}" ${teacherSectionFilter.toLowerCase() === sec.toLowerCase() ? 'selected' : ''}>${escHtml(sec)} (${secStrand} · ${secGrade})</option>`;
        }).join('')}
      </select>

      <!-- TRACK DROPDOWN -->
      <select class="user-filter-select" id="teacherTrackSelect" onchange="setTeacherTrackFilter(this.value)" aria-label="Filter by Track">
        <option value="all" ${(!teacherTrackFilter || teacherTrackFilter === 'all') ? 'selected' : ''}>All Tracks</option>
        <option value="Specialized" ${teacherTrackFilter === 'Specialized' ? 'selected' : ''}>Specialized</option>
        <option value="Core" ${teacherTrackFilter === 'Core' ? 'selected' : ''}>Core Subjects</option>
        <option value="Applied" ${teacherTrackFilter === 'Applied' ? 'selected' : ''}>Applied</option>
        <option value="Elective" ${teacherTrackFilter === 'Elective' ? 'selected' : ''}>Electives</option>
        <option value="Other" ${teacherTrackFilter === 'Other' ? 'selected' : ''}>Homeroom / Other</option>
      </select>

      <!-- ACTIVE CLASSES BADGE -->
      <div id="activeClassesCountBadge" style="padding:9px 13px;background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:10px;font-size:13px;font-weight:700;color:#0284c7;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;box-sizing:border-box;">
        ${classCards.length} Classes
      </div>

      <!-- RESET BUTTON -->
      <button type="button" class="user-filter-select" onclick="resetAllMaterialsFilters()" style="display:inline-flex;align-items:center;gap:5px;background:#f8fafc;font-weight:700;color:#475569;" title="Reset all filters">
        &#8634; Reset
      </button>
    </div>

    <!-- 3. STI eLMS CARDS GRID -->
    <div class="subjects-folder-grid" id="teacherClassesFolderGrid" style="grid-template-columns:repeat(auto-fill, minmax(295px, 1fr));gap:20px;">
      
      ${classCards.map(card => {
        const lessons = getSubjectLessons(card);
        const uploadsForClass = materialsData.filter(m => {
          if (!isMaterialMatchingCourse(m, card)) return false;
          if (m.section && m.section !== 'All' && !m.section.toLowerCase().includes(card.assignedSection.toLowerCase())) return false;
          return true;
        });
        const quizzesForClass = (typeof customQuizzes !== 'undefined') ? customQuizzes.filter(q => {
          if (!q.subject) return false;
          const s = q.subject.toLowerCase();
          const t = card.title.toLowerCase();
          if (!s.includes(t) && !t.includes(s)) return false;
          if (q.sections && q.sections !== 'All' && !q.sections.toLowerCase().includes(card.assignedSection.toLowerCase())) return false;
          return true;
        }) : [];

        const hasAdminMaterials = uploadsForClass.some(m => {
          if (CURRENT_PROFILE && m.uploaded_by && m.uploaded_by === CURRENT_PROFILE.id) return true;
          const r = (m.uploader_role || '').toLowerCase();
          const n = (m.uploaded_by_name || m.uploader_name || '').toLowerCase();
          return r.includes('admin') || n.includes('admin');
        });

        const searchKeywords = `${card.title} ${card.sectionCode} ${card.assignedSection} ${card.track || ''} ${card.strand || ''} ${card.description || ''}`.toLowerCase();

        return `
          <div class="subject-folder-card"
               data-section="${escHtml(card.assignedSection.toLowerCase())}"
               data-track="${escHtml((card.track || 'specialized').toLowerCase())}"
               data-strand="${escHtml((card.strand || '').toLowerCase())}"
               data-section-strand="${escHtml((card.sectionStrand || '').toLowerCase())}"
               data-grade="${escHtml((card.gradeLevel || card.sectionGradeLevel || 'Grade 11').toLowerCase())}"
               data-search="${escHtml(searchKeywords)}"
               data-has-admin-materials="${hasAdminMaterials ? 'true' : 'false'}"
               onclick="setActiveSubjectMaterials('${card.baseCourseId}', '${card.assignedSection}')"
               title="Open ${escHtml(card.title)} (${escHtml(card.assignedSection)}) Workspace">
            <div class="sfc-thumb" style="height:125px;background-image:url('${card.cover || 'assets/slide1.jpg'}');position:relative;">
              <span class="sfc-code" style="background:#ffffff;color:#0284c7;font-weight:800;border-radius:8px;padding:4px 10px;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.18);">${escHtml(card.sectionCode)}</span>
              <span class="sfc-strand" style="background:#0284c7;color:#ffffff;font-weight:700;border-radius:8px;padding:4px 10px;font-size:11px;">${escHtml(card.track || 'Specialized')}</span>
            </div>
            <div class="sfc-body" style="padding:18px;">
              <h4 class="sfc-title" style="font-size:16px;margin-bottom:6px;">${escHtml(card.title)}</h4>
              <div style="display:inline-flex;align-items:center;gap:6px;margin-bottom:8px;">
                <span style="background:#e0f2fe;color:#0369a1;font-weight:700;font-size:11px;padding:2px 8px;border-radius:6px;">Section: ${escHtml(card.assignedSection)}</span>
                <span style="background:#f1f5f9;color:#475569;font-weight:600;font-size:11px;padding:2px 8px;border-radius:6px;">${escHtml(card.displayStrand || card.sectionStrand || card.strand || 'General')} · ${escHtml(card.gradeLevel || 'Grade 11')}</span>
              </div>
              <p style="margin:0 0 10px 0;font-size:12px;color:#64748b;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                ${escHtml(card.description || 'Curriculum learning modules, handouts, and laboratory activities.')}
              </p>
              <div class="sfc-foot" style="padding-top:12px;border-top:1px solid #f1f5f9;display:flex;align-items:center;gap:6px;font-size:11.5px;color:#475569;font-weight:600;flex-wrap:nowrap;overflow:hidden;">
                <span style="background:#f1f5f9;padding:4px 8px;border-radius:6px;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;flex-shrink:0;">📄 ${lessons.length} Modules</span>
                <span style="background:#e0f2fe;color:#0369a1;padding:4px 8px;border-radius:6px;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;flex-shrink:0;">📁 ${uploadsForClass.length} Files</span>
                <span style="background:#fef3c7;color:#b45309;padding:4px 8px;border-radius:6px;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;flex-shrink:0;">📝 ${quizzesForClass.length} Quizzes</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div id="teacherClassesEmptyState" style="display:none;padding:60px 24px;text-align:center;background:#fff;border-radius:16px;border:1.5px dashed #cbd5e1;flex-direction:column;align-items:center;gap:12px;margin-top:10px;">
      <div style="width:54px;height:54px;border-radius:14px;background:#f0f9ff;color:#0284c7;display:flex;align-items:center;justify-content:center;font-size:26px;">🔍</div>
      <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">No handled classes match your search</h3>
      <p style="margin:0;font-size:13px;color:#64748b;max-width:440px;">Try adjusting your section, track filter, or search keywords.</p>
      <button class="sw-btn outline" onclick="clearTeacherClassSearch()" style="margin-top:6px;">Reset Filters</button>
    </div>
  </div>`;
}

function renderStudentSubjectsGridHTML(enrolledCourses, studentStrand) {
  setTimeout(() => applyStudentSubjectFilter(), 0);

  return `
    <div class="subjects-folder-grid" id="studentSubjectsFolderGrid" style="grid-template-columns:repeat(auto-fill, minmax(290px, 1fr));gap:20px;">
      ${enrolledCourses.map(course => {
        const courseLessons = getSubjectLessons(course);
        const courseUploads = materialsData.filter(m => isMaterialMatchingCourse(m, course));
        const courseQuizzes = (typeof customQuizzes !== 'undefined') ? customQuizzes.filter(q => {
          if (!q.subject) return false;
          const s = q.subject.toLowerCase();
          const t = course.title.toLowerCase();
          return s.includes(t) || t.includes(s);
        }) : [];

        const searchKeywords = `${course.title} ${course.code || ''} ${course.instructor || ''} ${course.description || ''} ${course.track || ''}`.toLowerCase();

        return `
          <div class="subject-folder-card"
               data-track="${escHtml((course.track || 'specialized').toLowerCase())}"
               data-search="${escHtml(searchKeywords)}"
               onclick="setActiveSubjectMaterials('${course.id}', '${CURRENT_PROFILE?.section || 'Section A'}')"
               title="Open ${escHtml(course.title)} Workspace">
            <div class="sfc-thumb" style="height:125px;background-image:url('${course.cover || 'assets/slide1.jpg'}');">
              <span class="sfc-code" style="background:#ffffff;color:#0284c7;font-weight:800;border-radius:8px;padding:4px 10px;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.18);">${escHtml(course.code || 'STEM-1101')}</span>
              <span class="sfc-strand" style="background:#0284c7;">${escHtml(course.track || 'Specialized')}</span>
            </div>
            <div class="sfc-body" style="padding:18px;">
              <h4 class="sfc-title" style="font-size:16px;margin-bottom:6px;">${escHtml(course.title)}</h4>
              <p style="margin:0 0 10px 0;font-size:12px;color:#64748b;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                ${escHtml(course.description || 'Curriculum learning modules, handouts, and laboratory activities.')}
              </p>
              <p class="sfc-instructor" style="margin-bottom:12px;">👤 <span>Instructor: <strong>${escHtml(course.instructor || 'Faculty')}</strong></span></p>

              <div class="sfc-foot" style="padding-top:12px;border-top:1px solid #f1f5f9;display:flex;align-items:center;gap:6px;font-size:11.5px;color:#475569;font-weight:600;flex-wrap:nowrap;overflow:hidden;">
                <span style="background:#f1f5f9;padding:4px 8px;border-radius:6px;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;flex-shrink:0;">📄 ${courseLessons.length} Modules</span>
                <span style="background:#e0f2fe;color:#0369a1;padding:4px 8px;border-radius:6px;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;flex-shrink:0;">📁 ${courseUploads.length} Files</span>
                <span style="background:#fef3c7;color:#b45309;padding:4px 8px;border-radius:6px;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;flex-shrink:0;">📝 ${courseQuizzes.length} Quizzes</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div id="studentSubjectsEmptyState" style="display:none;padding:60px 24px;text-align:center;background:#fff;border-radius:16px;border:1.5px dashed #cbd5e1;flex-direction:column;align-items:center;gap:12px;margin-top:10px;">
      <div style="width:54px;height:54px;border-radius:14px;background:#f0f9ff;color:#0284c7;display:flex;align-items:center;justify-content:center;font-size:26px;">🔍</div>
      <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">No ${escHtml(studentStrand)} subjects found</h3>
      <p id="studentSubjectsEmptyMsg" style="margin:0;font-size:13px;color:#64748b;max-width:440px;">No subjects matched your filter.</p>
      <button class="sw-btn outline" onclick="clearStudentMatSearch()" style="margin-top:6px;">Reset Filters</button>
    </div>
  `;
}

// ── STUDENT COMPILATION HUB HTML ──
function renderStudentMaterialsHubHTML(enrolledCourses, studentStrand) {
  const specializedCount = enrolledCourses.filter(c => c.track === 'Specialized').length;
  const coreCount = enrolledCourses.filter(c => c.track === 'Core').length;
  const appliedCount = enrolledCourses.filter(c => c.track === 'Applied').length;
  const electiveCount = enrolledCourses.filter(c => c.track === 'Elective').length;

  return `
  <div class="materials-page-container">
    <!-- 1. HERO BANNER -->
    <div class="materials-hero-banner" style="background:linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%);padding:24px 28px;border-radius:18px;margin-bottom:20px;box-shadow:0 6px 20px rgba(30,58,138,0.15);">
      <div class="materials-hero-left" style="display:flex;align-items:center;gap:18px;">
        <div class="materials-hero-icon" style="width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;">📚</div>
        <div class="materials-hero-text">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="background:#fef08a;color:#854d0e;font-size:11px;font-weight:800;padding:2px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(studentStrand)} STRAND</span>
            <span style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:600;">S.Y. 2026–2027 · Academic Portal</span>
          </div>
          <h1 style="color:#ffffff;margin:0 0 6px 0;font-size:22px;font-weight:800;letter-spacing:-0.02em;">My Academic Materials</h1>
          <p style="color:rgba(255,255,255,0.9);margin:0;font-size:13px;max-width:680px;line-height:1.45;">Select any enrolled subject below to open its dedicated workspace — separating official modules &amp; handouts, quizzes, and teacher supplementary files.</p>
        </div>
      </div>
    </div>

    <!-- 2. TRACK FILTERS & LIVE SEARCH -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:20px;flex-wrap:wrap;">
      <div class="subject-chips-bar" style="margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <button class="subject-chip ${(!studentMatTrackFilter || studentMatTrackFilter === 'all') ? 'active' : ''}" data-track="all" onclick="setStudentMatTrack('all')" style="cursor:pointer;">
          All ${escHtml(studentStrand)} Subjects <span class="sc-badge">${enrolledCourses.length}</span>
        </button>
        <button class="subject-chip ${studentMatTrackFilter === 'Specialized' ? 'active' : ''}" data-track="Specialized" onclick="setStudentMatTrack('Specialized')" style="cursor:pointer;">
          Specialized <span class="sc-badge">${specializedCount}</span>
        </button>
        <button class="subject-chip ${studentMatTrackFilter === 'Core' ? 'active' : ''}" data-track="Core" onclick="setStudentMatTrack('Core')" style="cursor:pointer;">
          Core <span class="sc-badge">${coreCount}</span>
        </button>
        <button class="subject-chip ${studentMatTrackFilter === 'Applied' ? 'active' : ''}" data-track="Applied" onclick="setStudentMatTrack('Applied')" style="cursor:pointer;">
          Applied <span class="sc-badge">${appliedCount}</span>
        </button>
        <button class="subject-chip ${studentMatTrackFilter === 'Elective' ? 'active' : ''}" data-track="Elective" onclick="setStudentMatTrack('Elective')" style="cursor:pointer;">
          Elective <span class="sc-badge">${electiveCount}</span>
        </button>
      </div>

      <div class="materials-search-wrap" style="min-width:280px;max-width:360px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:#3b82f6;flex-shrink:0;">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input type="text" id="studentMatSearchInput" placeholder="Search subjects, codes, or instructors..." value="${escHtml(studentMatSearchQuery)}" oninput="setStudentMatSearch(this.value)"/>
        <button id="studentMatSearchClearBtn" onclick="clearStudentMatSearch()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:0 4px;display:${studentMatSearchQuery ? 'inline-block' : 'none'};" title="Clear search">✕</button>
      </div>
    </div>

    <!-- 3. SUBJECT CARDS COMPILATION GRID -->
    <div id="studentSubjectsGridWrap">
      ${renderStudentSubjectsGridHTML(enrolledCourses, studentStrand)}
    </div>
  </div>`;
}

function getStudentFilteredMaterials() {
  const customApproved = materialsData.filter(m => m.status === 'approved').map(m => {
    const isDocx = (m.file_type && m.file_type.includes('word')) || m.type === 'DOCX';
    const isPpt = (m.file_type && (m.file_type.includes('presentation') || m.file_type.includes('powerpoint'))) || m.type === 'PPT';
    const fmt = isDocx ? 'DOCX' : (isPpt ? 'PPT' : (m.type || 'PDF'));

    return {
      id: m.id,
      course_id: m.course_id || null,
      title: m.title || m.fileName || 'Learning Handout',
      subtitle: m.description || `${m.type || 'PDF'} document and guide`,
      subject: m.subject || 'General Academic',
      type: fmt,
      dateAdded: m.date_formatted ? `${m.date_formatted} ${m.time_formatted || ''}` : 'Recent',
      status: 'Completed',
      cover: m.cover || 'assets/slide1.jpg',
      file_url: m.file_url || 'SURVEY FORMS - Scholaria.pdf'
    };
  });

  let displayMaterials = [...STUDENT_DEFAULT_MATERIALS, ...customApproved];

  // Apply Search Query filter
  const q = (studentMatSearchQuery || '').trim().toLowerCase();
  if (q) {
    displayMaterials = displayMaterials.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.subtitle || '').toLowerCase().includes(q) ||
      (m.subject || '').toLowerCase().includes(q)
    );
  }

  // Apply Subject Dropdown filter
  if (studentMatSubjectFilter && studentMatSubjectFilter !== 'all') {
    displayMaterials = displayMaterials.filter(m =>
      (m.subject || '').toLowerCase().includes(studentMatSubjectFilter.toLowerCase())
    );
  }

  // Apply Type Dropdown filter
  if (studentMatTypeFilter && studentMatTypeFilter !== 'all') {
    displayMaterials = displayMaterials.filter(m =>
      (m.type || '').toUpperCase() === studentMatTypeFilter.toUpperCase()
    );
  }

  // Alphabetical sort (A-Z) by title as requested
  displayMaterials.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  return displayMaterials;
}

function renderStudentMaterialsSplitContent() {
  const displayMaterials = getStudentFilteredMaterials();
  const totalMatCount = displayMaterials.length;
  const pagedMaterials = studentMatViewAll ? displayMaterials : displayMaterials.slice(0, 5);

  const completedCount = displayMaterials.filter(m => (m.status || '').toLowerCase() === 'completed').length;
  const inProgressCount = displayMaterials.filter(m => (m.status || '').toLowerCase().includes('progress')).length;
  const pendingCount = displayMaterials.filter(m => (m.status || '').toLowerCase().includes('pend')).length;

  const C = 238.76;
  const compLen = totalMatCount > 0 ? (completedCount / totalMatCount) * C : 0;
  const progLen = totalMatCount > 0 ? (inProgressCount / totalMatCount) * C : 0;
  const pendLen = totalMatCount > 0 ? (pendingCount / totalMatCount) * C : 0;
  const progOffset = -compLen;
  const pendOffset = -(compLen + progLen);

  return `
      <!-- LEFT COLUMN: MATERIALS LIST TABLE -->
      <div class="materials-table-card">
        <div class="materials-table-header" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f1f5f9;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;border-radius:10px;background:#fef9c3;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:20px;">📁</div>
            <div>
              <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">My Materials</h3>
              <p style="margin:2px 0 0 0;font-size:12px;color:#64748b;">Your learning materials and files, organized by subject.</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#64748b;font-weight:600;">
            <span>Showing ${pagedMaterials.length} of ${totalMatCount}</span>
            <a href="javascript:void(0)" onclick="toggleStudentMatViewAll()" style="color:#0284c7;font-weight:700;text-decoration:none;margin-left:6px;">${studentMatViewAll ? 'Show Less ↑' : 'View All →'}</a>
          </div>
        </div>

        <div class="materials-table-wrap">
          <table class="materials-table">
            <thead>
              <tr>
                <th style="width:28%;">Material</th>
                <th style="width:25%;">Subject</th>
                <th style="width:9%;">Type</th>
                <th style="width:20%;">Date Added</th>
                <th style="width:13%;">Status</th>
                <th style="width:5%;text-align:right;"></th>
              </tr>
            </thead>
            <tbody>
              ${pagedMaterials.length > 0 ? pagedMaterials.map(m => {
                const subjectClickHandler = m.course_id
                  ? `setActiveSubjectMaterials('${m.course_id}')`
                  : `setStudentMatSubject('${escHtml(m.subject)}')`;
                const itemClickHandler = m.course_id
                  ? `setActiveSubjectMaterials('${m.course_id}')`
                  : `previewSubjectUploadedMaterial('${m.id}')`;

                let subjPillClass = 'purple';
                const sLow = (m.subject || '').toLowerCase();
                if (sLow.includes('bio')) subjPillClass = 'green';
                else if (sLow.includes('phys') || sLow.includes('math')) subjPillClass = 'cyan';
                else if (sLow.includes('chem')) subjPillClass = 'purple';
                else if (sLow.includes('ict') || sLow.includes('tech')) subjPillClass = 'pink';

                let typePillClass = 'pdf';
                const tLow = (m.type || '').toLowerCase();
                if (tLow.includes('pdf')) typePillClass = 'pdf';
                else if (tLow.includes('doc')) typePillClass = 'docx';
                else if (tLow.includes('ppt') || tLow.includes('power')) typePillClass = 'ppt';
                else if (tLow.includes('vid')) typePillClass = 'video';
                else if (tLow.includes('note')) typePillClass = 'notes';
                else if (tLow.includes('file')) typePillClass = 'file';

                let statusPillClass = 'completed';
                const stLow = (m.status || '').toLowerCase();
                if (stLow.includes('progress')) statusPillClass = 'inprogress';
                else if (stLow.includes('pend')) statusPillClass = 'pending';

                return `
                <tr onclick="${itemClickHandler}" style="cursor:pointer;" title="Click to open ${escHtml(m.title)}">
                  <!-- Material Name & Thumbnail -->
                  <td>
                    <div class="mat-tbl-cell-main">
                      <img src="${m.cover}" alt="${escHtml(m.title)}" class="mat-tbl-thumb" onerror="this.src='assets/slide1.jpg'"/>
                      <div class="mat-tbl-cell-text">
                        <div class="mat-tbl-title" title="${escHtml(m.title)}">${escHtml(m.title)}</div>
                        <div class="mat-tbl-sub" title="${escHtml(m.subtitle || 'Lesson module and activities')}">${escHtml(m.subtitle || 'Lesson module and activities')}</div>
                      </div>
                    </div>
                  </td>

                  <!-- Subject -->
                  <td>
                    <span class="mat-subj-badge ${subjPillClass}" onclick="event.stopPropagation(); ${subjectClickHandler};" title="Open ${escHtml(m.subject)}">
                      ${escHtml(m.subject)}
                    </span>
                  </td>

                  <!-- Type -->
                  <td>
                    <span class="mat-format-badge ${typePillClass}">
                      ${escHtml(m.type)}
                    </span>
                  </td>

                  <!-- Date Added -->
                  <td>
                    <span style="font-size:12px;color:#64748b;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;">
                      📅 ${escHtml(m.dateAdded || 'Sep 5, 2025 10:10 AM')}
                    </span>
                  </td>

                  <!-- Status -->
                  <td>
                    <span class="mat-status-badge ${statusPillClass}">
                      ${escHtml(m.status || 'Completed')}
                    </span>
                  </td>

                  <!-- Action Menu (3 vertical dots) -->
                  <td style="text-align:right;" onclick="event.stopPropagation(); previewSubjectUploadedMaterial('${m.id}');">
                    <button class="mat-row-opt-btn" title="View Options" style="background:none;border:none;color:#64748b;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;line-height:1;">
                      ⋮
                    </button>
                  </td>
                </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="6" style="text-align:center;padding:36px;color:#64748b;font-size:13px;">
                    No materials found matching "${escHtml(studentMatSearchQuery)}".
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <!-- RIGHT COLUMN: SIDEBAR WIDGETS (IMAGE 3) -->
      <div class="materials-sidebar-column">
        <!-- Widget 1: Subject Progress (Dynamic Multi-Colored Donut Chart) -->
        <div class="sw-widget-card" style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:18px;padding:20px;box-shadow:0 2px 10px rgba(15,23,42,0.04);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;">
              <span style="color:#0284c7;">📊</span> Subject Progress
            </h4>
            <a href="javascript:void(0)" onclick="toggleStudentMatViewAll()" style="font-size:12px;color:#0284c7;font-weight:700;text-decoration:none;">View All →</a>
          </div>
          <div style="display:flex;align-items:center;gap:18px;">
            <!-- Circular Multi-Colored Donut Chart -->
            <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
              <div class="sw-gauge-wrap" style="position:relative;width:96px;height:96px;margin:0 auto;">
                <svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(-90deg);">
                  <!-- Base track -->
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" stroke-width="9"/>
                  <!-- Completed (Green) -->
                  ${compLen > 0 ? `<circle cx="50" cy="50" r="38" fill="none" stroke="#16a34a" stroke-width="9" stroke-linecap="round" stroke-dasharray="${compLen.toFixed(2)} ${C}" stroke-dashoffset="0"/>` : ''}
                  <!-- In Progress (Orange) -->
                  ${progLen > 0 ? `<circle cx="50" cy="50" r="38" fill="none" stroke="#ea580c" stroke-width="9" stroke-linecap="round" stroke-dasharray="${progLen.toFixed(2)} ${C}" stroke-dashoffset="${progOffset.toFixed(2)}"/>` : ''}
                  <!-- Pending (Amber) -->
                  ${pendLen > 0 ? `<circle cx="50" cy="50" r="38" fill="none" stroke="#d97706" stroke-width="9" stroke-linecap="round" stroke-dasharray="${pendLen.toFixed(2)} ${C}" stroke-dashoffset="${pendOffset.toFixed(2)}"/>` : ''}
                </svg>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                  <span style="font-size:26px;font-weight:800;color:#0f172a;line-height:1;">${totalMatCount}</span>
                </div>
              </div>
              <span style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:0.6px;text-transform:uppercase;text-align:center;display:block;margin-top:6px;">MATERIALS</span>
            </div>
            <!-- Stats Breakdown: Dynamic from current materials -->
            <div style="flex:1;display:flex;flex-direction:column;gap:8px;font-size:12px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span style="display:inline-flex;align-items:center;gap:6px;color:#475569;"><span style="width:8px;height:8px;border-radius:50%;background:#16a34a;"></span> Completed</span>
                <strong style="color:#0f172a;">${completedCount}</strong>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span style="display:inline-flex;align-items:center;gap:6px;color:#475569;"><span style="width:8px;height:8px;border-radius:50%;background:#ea580c;"></span> In Progress</span>
                <strong style="color:#0f172a;">${inProgressCount}</strong>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span style="display:inline-flex;align-items:center;gap:6px;color:#475569;"><span style="width:8px;height:8px;border-radius:50%;background:#d97706;"></span> Pending</span>
                <strong style="color:#0f172a;">${pendingCount}</strong>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding-top:6px;border-top:1px solid #f1f5f9;">
                <span style="display:inline-flex;align-items:center;gap:6px;color:#0284c7;font-weight:700;"><span style="width:8px;height:8px;border-radius:50%;background:#0284c7;"></span> Total Materials</span>
                <strong style="color:#0284c7;">${totalMatCount}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Widget 2: Upcoming Quizzes (Image 3) -->
        <div class="sw-widget-card" style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:18px;padding:20px;box-shadow:0 2px 10px rgba(15,23,42,0.04);margin-top:0;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;">
              <span style="color:#2563eb;">📅</span> Upcoming Quizzes
            </h4>
            <a href="javascript:void(0)" onclick="renderPage('quizzes')" style="font-size:12px;color:#2563eb;font-weight:700;text-decoration:none;">View All →</a>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:12px;border:1px solid #f1f5f9;cursor:pointer;" onclick="renderPage('quizzes')">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:10px;font-weight:700;padding:3px 7px;border-radius:6px;background:#e0f2fe;color:#0284c7;text-transform:uppercase;">Quiz</span>
                <div>
                  <div style="font-size:12.5px;font-weight:700;color:#0f172a;">Pre-Calculus Quiz 3</div>
                  <div style="font-size:11px;color:#64748b;">Due: Tomorrow, 11:59 PM</div>
                </div>
              </div>
              <span style="color:#94a3b8;font-size:16px;font-weight:700;">›</span>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:12px;border:1px solid #f1f5f9;cursor:pointer;" onclick="renderPage('quizzes')">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:9.5px;font-weight:700;padding:3px 7px;border-radius:6px;background:#f3e8ff;color:#7c3aed;text-transform:uppercase;">Interactive Quiz</span>
                <div>
                  <div style="font-size:12.5px;font-weight:700;color:#0f172a;">General Biology 1 Activity</div>
                  <div style="font-size:11px;color:#64748b;">Due: Sep 18, 2025 · 10:00 AM</div>
                </div>
              </div>
              <span style="color:#94a3b8;font-size:16px;font-weight:700;">›</span>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:12px;border:1px solid #f1f5f9;cursor:pointer;" onclick="renderPage('quizzes')">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:10px;font-weight:700;padding:3px 7px;border-radius:6px;background:#e0f2fe;color:#0284c7;text-transform:uppercase;">Quiz</span>
                <div>
                  <div style="font-size:12.5px;font-weight:700;color:#0f172a;">Physics Mastery Check</div>
                  <div style="font-size:11px;color:#64748b;">Due: Sep 20, 2025 · 02:00 PM</div>
                </div>
              </div>
              <span style="color:#94a3b8;font-size:16px;font-weight:700;">›</span>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:12px;border:1px solid #f1f5f9;cursor:pointer;" onclick="renderPage('quizzes')">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:9.5px;font-weight:700;padding:3px 7px;border-radius:6px;background:#f3e8ff;color:#7c3aed;text-transform:uppercase;">Interactive Quiz</span>
                <div>
                  <div style="font-size:12.5px;font-weight:700;color:#0f172a;">Chemistry Lab Report</div>
                  <div style="font-size:11px;color:#64748b;">Due: Sep 22, 2025 · 11:59 PM</div>
                </div>
              </div>
              <span style="color:#94a3b8;font-size:16px;font-weight:700;">›</span>
            </div>
          </div>
        </div>
      </div>
  `;
}

// ── STUDENT MATERIALS STATE & REPOSITORY DATA (IMAGE 3) ──
let studentMatTrackFilter = 'all';
let studentMatSearchQuery = '';
let studentMatSubjectFilter = 'all';
let studentMatTypeFilter = 'all';
let studentMatMonthFilter = 'all';
let studentMatSort = 'newest';
let studentMatViewMode = 'grid';
let studentMatViewAll = false;

function setStudentMatTrack(track) {
  studentMatTrackFilter = track;

  // 1. Update active state of chip buttons without destroying page
  document.querySelectorAll('.subject-chips-bar .subject-chip').forEach(btn => {
    const t = btn.dataset.track;
    if (t === track) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // 2. Instant DOM filter (zero lag, 0ms)
  applyStudentSubjectFilter();
}

function toggleStudentMatViewAll() {
  studentMatViewAll = !studentMatViewAll;
  updateStudentMaterialsUI();
}

const STUDENT_DEFAULT_MATERIALS = [];

function applyStudentSubjectFilter() {
  const grid = document.getElementById('studentSubjectsFolderGrid');
  if (!grid) return;

  const cards = grid.querySelectorAll('.subject-folder-card');
  const emptyState = document.getElementById('studentSubjectsEmptyState');
  const emptyMsg = document.getElementById('studentSubjectsEmptyMsg');

  if (!cards || !cards.length) return;

  const sq = (studentMatSearchQuery || '').trim().toLowerCase();
  const track = (studentMatTrackFilter || 'all').toLowerCase();

  let visibleCount = 0;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const cardTrack = (card.getAttribute('data-track') || '').toLowerCase();
    const cardSearch = (card.getAttribute('data-search') || '').toLowerCase();

    const matchTrack = (track === 'all' || cardTrack === track);
    const matchSearch = (!sq || cardSearch.indexOf(sq) !== -1);

    if (matchTrack && matchSearch) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  }

  if (emptyState) {
    emptyState.style.display = (visibleCount === 0) ? 'flex' : 'none';
    if (emptyMsg) {
      emptyMsg.textContent = sq
        ? `No subjects matched "${sq}" under the selected filter.`
        : `No subjects found under the selected category.`;
    }
  }
}

function setStudentMatSearch(query) {
  studentMatSearchQuery = (query || '').toLowerCase();

  const clearBtn = document.getElementById('studentMatSearchClearBtn');
  if (clearBtn) {
    clearBtn.style.display = studentMatSearchQuery ? 'inline-block' : 'none';
  }

  // Instant DOM filter (0ms delay, zero lag)
  applyStudentSubjectFilter();
}

function clearStudentMatSearch() {
  studentMatSearchQuery = '';
  const inp = document.getElementById('studentMatSearchInput');
  if (inp) {
    inp.value = '';
    inp.focus();
  }
  const clearBtn = document.getElementById('studentMatSearchClearBtn');
  if (clearBtn) clearBtn.style.display = 'none';

  applyStudentSubjectFilter();
}

function setStudentMatSubject(subj) {
  studentMatSubjectFilter = subj;
  updateStudentMaterialsUI();
}

function setStudentMatType(type) {
  studentMatTypeFilter = type;
  updateStudentMaterialsUI();
}

function setStudentMatMonth(m) {
  studentMatMonthFilter = m;
  updateStudentMaterialsUI();
}

function setStudentMatSort(sort) {
  studentMatSort = sort;
  updateStudentMaterialsUI();
}

function setStudentMatViewMode(mode) {
  studentMatViewMode = mode;
  updateStudentMaterialsUI();
}

function resetStudentMatFilters() {
  studentMatSearchQuery = '';
  studentMatSubjectFilter = 'all';
  studentMatTypeFilter = 'all';
  studentMatMonthFilter = 'all';
  studentMatSort = 'newest';
  const inp = document.getElementById('studentMatSearchInput');
  if (inp) inp.value = '';
  updateStudentMaterialsUI();
}

function updateStudentMaterialsUI() {
  const container = document.getElementById('materialsListWrap');
  if (container) {
    container.innerHTML = renderMaterialsList('student');
    return;
  }
  const splitWrap = document.getElementById('studentMatSplitWrap');
  if (splitWrap) {
    splitWrap.innerHTML = renderStudentMaterialsSplitContent();
  }
}

// ── MATERIALS MANAGER STATE & DEMO DATA ──
let materialsSearchQuery = '';
let materialsContentTypeFilter = ''; // '' | 'quiz' | 'material'
let materialsGradeFilter = '';
let materialsSubjectFilter = '';
let materialsStatusFilter = '';
let materialsActiveTab = 'all'; // 'all' | 'pending' | 'teacher' | 'student'
let materialsViewMode = 'list'; // 'list' | 'grid'
let materialsCurrentPage = 1;
const MATERIALS_PAGE_SIZE = 6;
let activeMaterialActionMenuId = null;

// Only real materials uploaded by teachers and approved in the system
const SEED_MATERIALS = [];

function getUnifiedMaterialsList() {
  const customList = Array.isArray(materialsData) ? materialsData : [];
  const quizzesList = Array.isArray(customQuizzes) ? customQuizzes : [];

  // Format quizzes so they integrate seamlessly into Materials Manager
  const formattedQuizzes = quizzesList.map(q => {
    const d = q.createdAt ? new Date(q.createdAt) : new Date();
    const isInteractive = q.quiz_type === 'interactive' || q.type === 'interactive';
    const qCount = Array.isArray(q.questions) ? q.questions.length : (q.question_count || 10);
    return {
      id: q.id,
      title: q.title || 'Untitled Quiz',
      fileName: `${q.title || 'Quiz'}.quiz`,
      subject: q.subject || 'General',
      strand: q.strand || 'General',
      grade_level: q.grade_level || 'Grade 11',
      uploader_name: q.createdByName || q.author || 'Teacher',
      uploaded_by_name: q.createdByName || q.author || 'Teacher',
      uploader_role: 'Teacher',
      file_type: isInteractive ? 'application/quiz-interactive' : 'application/quiz',
      type: isInteractive ? 'INTERACTIVE' : 'QUIZ',
      status: q.status || 'approved',
      created_at: q.createdAt || d.toISOString(),
      date_formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time_formatted: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      size: `${qCount} Questions`,
      contentType: 'quiz',
      quiz_type: isInteractive ? 'interactive' : 'standard'
    };
  });

  // Format real materials
  const formattedDb = customList.map(m => {
    const ext = (m.file_type || m.title || '').toLowerCase();
    let type = 'PDF';
    if (ext.includes('presentation') || ext.includes('powerpoint') || ext.includes('pptx')) type = 'PPTX';
    else if (ext.includes('word') || ext.includes('document') || ext.includes('docx')) type = 'DOCX';
    else if (ext.includes('sheet') || ext.includes('excel') || ext.includes('xlsx')) type = 'XLSX';
    else if (ext.includes('image') || ext.includes('jpg') || ext.includes('png')) type = 'Image';
    else if (ext.includes('zip') || ext.includes('rar') || ext.includes('archive')) type = 'ZIP';

    const uRole = m.uploader_role || (m.uploaded_by_role ? (m.uploaded_by_role.charAt(0).toUpperCase() + m.uploaded_by_role.slice(1)) : 'Teacher');
    const d = m.created_at ? new Date(m.created_at) : new Date();

    return {
      id: m.id,
      title: m.title || 'Untitled Material',
      fileName: m.title || 'Document.pdf',
      category: m.category || 'Handout',
      tag: m.tag || 'Handout',
      subject: m.subject || 'General',
      strand: m.strand || 'General',
      grade_level: m.grade_level || 'Grade 11',
      uploader_name: m.uploaded_by_name || m.uploader_name || 'Faculty Member',
      uploaded_by_name: m.uploaded_by_name || m.uploader_name || 'Faculty Member',
      uploader_role: uRole,
      file_type: m.file_type || 'application/pdf',
      type: type,
      status: m.status || 'approved',
      created_at: m.created_at || d.toISOString(),
      date_formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time_formatted: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      size: m.size || '2.4 MB',
      contentType: 'material'
    };
  });

  return [...formattedQuizzes, ...formattedDb];
}

// ── FILTER & INTERACTIVE HANDLERS ──
function setMaterialsContentTypeFilter(type) {
  materialsContentTypeFilter = type || '';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsSearch(query) {
  materialsSearchQuery = (query || '').trim();
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsStrandFilter(strand) {
  materialsStrandFilter = strand || '';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsGradeFilter(grade) {
  materialsGradeFilter = grade || '';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsSubjectFilter(sub) {
  materialsSubjectFilter = sub || '';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsStatusFilter(st) {
  materialsStatusFilter = st || '';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsActiveTab(tab) {
  materialsActiveTab = tab || 'all';
  materialsCurrentPage = 1;
  renderMaterialsContainer();
}

function setMaterialsViewMode(mode) {
  materialsViewMode = mode || 'list';
  renderMaterialsContainer();
}

function setMaterialsPage(page) {
  materialsCurrentPage = Math.max(1, page);
  renderMaterialsContainer();
  const el = document.querySelector('.mm-table-card');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleMaterialActionMenu(event, id) {
  event.stopPropagation();
  if (activeMaterialActionMenuId === id) {
    activeMaterialActionMenuId = null;
  } else {
    activeMaterialActionMenuId = id;
  }
  renderMaterialsContainer();
}

// Global click to dismiss action menu
if (typeof window !== 'undefined') {
  window.addEventListener('click', () => {
    if (activeMaterialActionMenuId !== null) {
      activeMaterialActionMenuId = null;
      renderMaterialsContainer();
    }
  });
}

function previewOrDownloadMaterial(id) {
  const all = getUnifiedMaterialsList();
  const m = all.find(item => String(item.id) === String(id)) || materialsData.find(item => String(item.id) === String(id));
  if (!m) return;
  if (m.contentType === 'quiz') {
    showToast(`Launching quiz "${m.title}"…`, 'info');
    if (m.quiz_type === 'interactive' && typeof openInteractiveQuiz === 'function') {
      openInteractiveQuiz(m.id);
    } else if (typeof openTakeQuizModal === 'function') {
      openTakeQuizModal(m.id);
    } else {
      showToast('Quiz launcher ready', 'success');
    }
    return;
  }
  previewSubjectUploadedMaterial(m.id);
}

function getFileTypeSvg(type) {
  const t = (type || '').toUpperCase();
  if (t === 'QUIZ') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 12l2 2 4-4"/></svg>`;
  }
  if (t === 'INTERACTIVE') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="6"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><line x1="8" y1="9.5" x2="8" y2="14.5"/><line x1="5.5" y1="12" x2="10.5" y2="12"/></svg>`;
  }
  if (t === 'PDF') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`;
  }
  if (t === 'DOCX') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="12" x2="10" y2="17"/><line x1="10" y1="17" x2="12" y2="12"/><line x1="12" y1="12" x2="14" y2="17"/><line x1="14" y1="17" x2="16" y2="12"/></svg>`;
  }
  if (t === 'PPTX') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 17V12h3a2 2 0 0 1 0 4H9"/></svg>`;
  }
  if (t === 'XLSX') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="17"/><line x1="15" y1="13" x2="9" y2="17"/></svg>`;
  }
  if (t === 'IMAGE') {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`;
}

// ── MAIN MATERIALS MANAGER RENDERER ──
function renderMaterialsManagerPage(role) {
  const allMaterials = getUnifiedMaterialsList();

  // 1. Calculate Stat Cards
  const totalMaterialsCount = allMaterials.length;
  const pendingReviewCount = allMaterials.filter(m => m.status === 'pending').length;
  const teacherFilesCount = allMaterials.filter(m => (m.uploader_role || '').toLowerCase() === 'teacher').length;
  const studentFilesCount = allMaterials.filter(m => (m.uploader_role || '').toLowerCase() === 'student').length;

  // 2. Filter by Active Tab
  let filtered = allMaterials;
  if (materialsActiveTab === 'pending') {
    filtered = filtered.filter(m => m.status === 'pending');
  } else if (materialsActiveTab === 'teacher') {
    filtered = filtered.filter(m => (m.uploader_role || '').toLowerCase() === 'teacher');
  } else if (materialsActiveTab === 'student') {
    filtered = filtered.filter(m => (m.uploader_role || '').toLowerCase() === 'student');
  }

  // Content Type Filter (All content types, Quiz, Material)
  if (materialsContentTypeFilter === 'quiz') {
    filtered = filtered.filter(m => m.contentType === 'quiz');
  } else if (materialsContentTypeFilter === 'material') {
    filtered = filtered.filter(m => m.contentType !== 'quiz');
  }

  // 3. Filter by Search Query
  if (materialsSearchQuery) {
    const q = materialsSearchQuery.toLowerCase();
    filtered = filtered.filter(m => 
      (m.title && m.title.toLowerCase().includes(q)) ||
      (m.subject && m.subject.toLowerCase().includes(q)) ||
      (m.uploader_name && m.uploader_name.toLowerCase().includes(q)) ||
      (m.strand && m.strand.toLowerCase().includes(q))
    );
  }

  // 4. Filter by Strand Dropdown
  if (materialsStrandFilter) {
    filtered = filtered.filter(m => m.strand === materialsStrandFilter);
  }

  // 5. Filter by Grade Level Dropdown
  if (materialsGradeFilter) {
    filtered = filtered.filter(m => m.grade_level === materialsGradeFilter);
  }

  // 6. Filter by Subject Dropdown
  if (materialsSubjectFilter) {
    filtered = filtered.filter(m => m.subject === materialsSubjectFilter);
  }

  // 7. Filter by Status Dropdown
  if (materialsStatusFilter) {
    filtered = filtered.filter(m => m.status === materialsStatusFilter);
  }

  // Collect unique subjects for dropdown
  const uniqueSubjects = Array.from(new Set(allMaterials.map(m => m.subject).filter(Boolean))).sort();

  // 8. Pagination Calculations
  const totalFilteredCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / MATERIALS_PAGE_SIZE));
  const currentPage = Math.min(materialsCurrentPage, totalPages);
  const startIdx = (currentPage - 1) * MATERIALS_PAGE_SIZE;
  const paginatedItems = filtered.slice(startIdx, startIdx + MATERIALS_PAGE_SIZE);
  const endIdx = Math.min(startIdx + MATERIALS_PAGE_SIZE, totalFilteredCount);

  // Generate pagination buttons
  const renderPaginationBtns = () => {
    if (totalPages <= 1) return '';
    let pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages = [1, 2, 3, 4, 5, '...', totalPages];
      } else if (currentPage >= totalPages - 3) {
        pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }

    return `
      <button class="mm-pag-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="setMaterialsPage(${currentPage - 1})" title="Previous Page">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      ${pages.map(p => {
        if (p === '...') return `<span class="mm-pag-dots">…</span>`;
        const isActive = p === currentPage;
        return `<button class="mm-pag-btn ${isActive ? 'active' : ''}" onclick="setMaterialsPage(${p})">${p}</button>`;
      }).join('')}
      <button class="mm-pag-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="setMaterialsPage(${currentPage + 1})" title="Next Page">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    `;
  };

  return `
    <div class="mm-manager-wrap">
      <!-- ── TOP HEADER ── -->
      <div class="mm-header-row">
        <div class="mm-header-info">
          <h1 class="mm-page-title">Materials Manager</h1>
          <p class="mm-page-subtitle">Manage and review learning materials uploaded by teachers and students.</p>
        </div>
        <button class="mm-upload-btn" onclick="openMaterialModal()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload Material
        </button>
      </div>

      <!-- ── STATS METRIC CARDS ── -->
      <div class="mm-stats-grid">
        <!-- 1. Total Materials -->
        <div class="mm-stat-card" onclick="setMaterialsActiveTab('all')">
          <div class="mm-stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div class="mm-stat-content">
            <span class="mm-stat-label">Total Materials</span>
            <span class="mm-stat-val blue">${totalMaterialsCount}</span>
          </div>
        </div>

        <!-- 2. Pending Review -->
        <div class="mm-stat-card" onclick="setMaterialsActiveTab('pending')">
          <div class="mm-stat-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="mm-stat-content">
            <span class="mm-stat-label">Pending Review</span>
            <span class="mm-stat-val amber">${pendingReviewCount}</span>
          </div>
        </div>

        <!-- 3. Teacher Files -->
        <div class="mm-stat-card" onclick="setMaterialsActiveTab('teacher')">
          <div class="mm-stat-icon blue-user">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="mm-stat-content">
            <span class="mm-stat-label">Teacher Files</span>
            <span class="mm-stat-val blue">${teacherFilesCount}</span>
          </div>
        </div>

        <!-- 4. Student Files -->
        <div class="mm-stat-card" onclick="setMaterialsActiveTab('student')">
          <div class="mm-stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="12" y1="11" x2="12" y2="17"/></svg>
          </div>
          <div class="mm-stat-content">
            <span class="mm-stat-label">Student Files</span>
            <span class="mm-stat-val purple">${studentFilesCount}</span>
          </div>
        </div>
      </div>

      <!-- ── CONTROLS: SEARCH + DROPDOWN FILTERS + VIEW TOGGLE ── -->
      <div class="mm-controls-bar">
        <!-- Search input -->
        <div class="mm-search-wrap">
          <svg viewBox="0 0 24 24" class="mm-search-icon" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="mm-search-input" placeholder="Search by file name, subject, or uploader..." value="${escHtml(materialsSearchQuery)}" oninput="setMaterialsSearch(this.value)" />
          ${materialsSearchQuery ? `<button class="mm-search-clear" onclick="setMaterialsSearch('')" title="Clear search">&times;</button>` : ''}
        </div>

        <!-- Dropdown Filters -->
        <div class="mm-filters-group">
          <!-- Content Type (All content types, Quiz, Material) -->
          <select class="mm-filter-select" onchange="setMaterialsContentTypeFilter(this.value)">
            <option value="" ${!materialsContentTypeFilter ? 'selected' : ''}>All content types</option>
            <option value="quiz" ${materialsContentTypeFilter === 'quiz' ? 'selected' : ''}>Quiz</option>
            <option value="material" ${materialsContentTypeFilter === 'material' ? 'selected' : ''}>Material</option>
          </select>

          <!-- Strands -->
          <select class="mm-filter-select" onchange="setMaterialsStrandFilter(this.value)">
            <option value="">All Strands</option>
            ${STRANDS.map(s => `<option value="${s}" ${materialsStrandFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>

          <!-- Grades -->
          <select class="mm-filter-select" onchange="setMaterialsGradeFilter(this.value)">
            <option value="">All Grades</option>
            <option value="Grade 11" ${materialsGradeFilter === 'Grade 11' ? 'selected' : ''}>Grade 11</option>
            <option value="Grade 12" ${materialsGradeFilter === 'Grade 12' ? 'selected' : ''}>Grade 12</option>
          </select>

          <!-- Subjects -->
          <select class="mm-filter-select" onchange="setMaterialsSubjectFilter(this.value)">
            <option value="">All Subjects</option>
            ${uniqueSubjects.map(sub => `<option value="${escHtml(sub)}" ${materialsSubjectFilter === sub ? 'selected' : ''}>${escHtml(sub)}</option>`).join('')}
          </select>

          <!-- Status -->
          <select class="mm-filter-select" onchange="setMaterialsStatusFilter(this.value)">
            <option value="">All Status</option>
            <option value="pending" ${materialsStatusFilter === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="approved" ${materialsStatusFilter === 'approved' ? 'selected' : ''}>Approved</option>
            <option value="rejected" ${materialsStatusFilter === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>
      </div>

      <!-- ── TABS BAR ── -->
      <div class="mm-tabs-bar">
        <button class="mm-tab-item ${materialsActiveTab === 'all' ? 'active' : ''}" onclick="setMaterialsActiveTab('all')">
          All Materials <span class="mm-tab-count">${totalMaterialsCount}</span>
        </button>
        <button class="mm-tab-item ${materialsActiveTab === 'pending' ? 'active' : ''}" onclick="setMaterialsActiveTab('pending')">
          Pending Review <span class="mm-tab-count">${pendingReviewCount}</span>
        </button>
        <button class="mm-tab-item ${materialsActiveTab === 'teacher' ? 'active' : ''}" onclick="setMaterialsActiveTab('teacher')">
          Teacher Files <span class="mm-tab-count">${teacherFilesCount}</span>
        </button>
        <button class="mm-tab-item ${materialsActiveTab === 'student' ? 'active' : ''}" onclick="setMaterialsActiveTab('student')">
          Student Files <span class="mm-tab-count">${studentFilesCount}</span>
        </button>
      </div>

      <!-- ── MAIN CONTENT (TABLE OR GRID) ── -->
      <div class="mm-content-card">
        ${materialsViewMode === 'list' ? `
          <!-- ── DATA TABLE ── -->
          <div class="mm-table-responsive">
            <table class="mm-table">
              <thead>
                <tr>
                  <th style="width:28%;">File Name</th>
                  <th style="width:18%;">Uploader</th>
                  <th style="width:18%;">Subject</th>
                  <th style="width:10%;">Type</th>
                  <th style="width:10%;">Status</th>
                  <th style="width:10%;">Date Uploaded</th>
                  <th style="width:6%;text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${paginatedItems.length ? paginatedItems.map(m => {
                  const typeClass = (m.type || 'PDF').toLowerCase();
                  const roleClass = (m.uploader_role || 'Teacher').toLowerCase();
                  const statusClass = (m.status || 'approved').toLowerCase();
                  const isMenuOpen = activeMaterialActionMenuId === m.id;

                  return `
                    <tr class="mm-table-row">
                      <!-- 1. File Name -->
                      <td>
                        <div class="mm-file-cell">
                          <div class="mm-file-box ${typeClass}">
                            ${typeClass === 'docx' ? '<span class="mm-doc-letter">W</span>' :
                              typeClass === 'pptx' ? '<span class="mm-doc-letter">P</span>' :
                              typeClass === 'xlsx' ? '<span class="mm-doc-letter">X</span>' :
                              typeClass === 'quiz' ? getFileTypeSvg('QUIZ') :
                              typeClass === 'interactive' ? getFileTypeSvg('INTERACTIVE') :
                              typeClass === 'image' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' :
                              typeClass === 'zip' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>' :
                              getFileTypeSvg('PDF')}
                          </div>
                          <div class="mm-file-meta">
                            <span class="mm-file-name" title="${escHtml(m.title)}">${escHtml(m.title)}</span>
                            <span class="mm-file-subject">${escHtml(m.subject || 'General Subject')}</span>
                          </div>
                        </div>
                      </td>

                      <!-- 2. Uploader -->
                      <td>
                        <div class="mm-uploader-cell">
                          <span class="mm-uploader-name">${escHtml(m.uploader_name || 'Faculty Member')}</span>
                          <span class="mm-role-badge ${roleClass}">${escHtml(m.uploader_role || 'Teacher')}</span>
                        </div>
                      </td>

                      <!-- 3. Subject -->
                      <td>
                        <span class="mm-subject-text">${escHtml(m.subject || 'General')}</span>
                      </td>

                      <!-- 4. Type -->
                      <td>
                        <div class="mm-type-pill ${typeClass}">
                          <span class="mm-type-dot ${typeClass}"></span>
                          <span>${escHtml(m.type || 'PDF')}</span>
                        </div>
                        <span class="mm-handout-badge" style="display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:700;color:#b45309;background:#fef3c7;border:1px solid #fde68a;padding:1px 6px;border-radius:4px;margin-top:4px;white-space:nowrap;">
                          Handout
                        </span>
                      </td>

                      <!-- 5. Status -->
                      <td>
                        <span class="mm-status-pill ${statusClass}">
                          ${m.status === 'approved' ? 'Approved' : m.status === 'pending' ? 'Pending' : 'Rejected'}
                        </span>
                      </td>

                      <!-- 6. Date Uploaded -->
                      <td>
                        <div class="mm-date-cell">
                          <span class="mm-date-main">${escHtml(m.date_formatted || 'Sep 21, 2026')}</span>
                          <span class="mm-date-sub">${escHtml(m.time_formatted || '10:24 AM')}</span>
                        </div>
                      </td>

                      <!-- 7. Actions -->
                      <td style="text-align:right;">
                        <div class="mm-actions-cell">
                          <button class="mm-action-btn view-btn" onclick="previewOrDownloadMaterial('${m.id}')" title="Preview Material">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          
                          <div class="mm-action-menu-wrap">
                            <button class="mm-action-btn more-btn" onclick="toggleMaterialActionMenu(event, '${m.id}')" title="More Actions">
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                            </button>

                            ${isMenuOpen ? `
                              <div class="mm-action-dropdown">
                                <div class="mm-ad-item" onclick="previewOrDownloadMaterial('${m.id}')">
                                  <span>👁️</span> ${m.contentType === 'quiz' ? 'Take Quiz' : 'Preview'}
                                </div>
                                ${m.contentType !== 'quiz' ? `
                                  <div class="mm-ad-item" onclick="downloadSubjectPdf('mat', '${m.id}')">
                                    <span>⬇️</span> Download (${m.size || 'PDF'})
                                  </div>
                                ` : ''}
                                ${role === 'admin' && m.status === 'pending' ? `
                                  <div class="mm-ad-item" onclick="approveMaterial('${m.id}')">
                                    <span>✓</span> Approve
                                  </div>
                                  <div class="mm-ad-item reject" onclick="rejectMaterial('${m.id}')">
                                    <span>✕</span> Reject
                                  </div>
                                ` : ''}
                                ${(role === 'admin' || (CURRENT_PROFILE && m.uploaded_by === CURRENT_PROFILE.id)) ? `
                                  <div class="mm-ad-item delete" onclick="deleteMaterial('${m.id}')">
                                    <span>🗑️</span> Delete
                                  </div>
                                ` : ''}
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="7" class="mm-empty-state">
                      <div class="mm-empty-inner">
                        <span class="mm-empty-icon">📂</span>
                        <h4>No materials found</h4>
                        <p>No learning materials match your active search or filter criteria.</p>
                      </div>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        ` : `
          <!-- ── GRID VIEW CARDS ── -->
          <div class="mm-cards-grid">
            ${paginatedItems.map(m => {
              const typeClass = (m.type || 'PDF').toLowerCase();
              const roleClass = (m.uploader_role || 'Teacher').toLowerCase();
              const statusClass = (m.status || 'approved').toLowerCase();
              return `
                <div class="mm-card-item">
                  <div class="mm-card-head">
                    <div class="mm-file-box ${typeClass}">
                      ${typeClass === 'docx' ? '<span class="mm-doc-letter">W</span>' :
                        typeClass === 'pptx' ? '<span class="mm-doc-letter">P</span>' :
                        typeClass === 'xlsx' ? '<span class="mm-doc-letter">X</span>' :
                        getFileTypeSvg(m.type)}
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                      <span class="mm-status-pill ${statusClass}">${m.status === 'approved' ? 'Approved' : m.status === 'pending' ? 'Pending' : 'Rejected'}</span>
                      <span class="mm-handout-badge" style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;color:#b45309;background:#fef3c7;border:1px solid #fde68a;padding:1px 6px;border-radius:4px;white-space:nowrap;">
                        Handout
                      </span>
                    </div>
                  </div>
                  <h4 class="mm-card-title">${escHtml(m.title)}</h4>
                  <p class="mm-card-subject">${escHtml(m.subject)} · ${escHtml(m.strand)}</p>
                  <div class="mm-card-meta">
                    <div class="mm-card-uploader">
                      <span>${escHtml(m.uploader_name)}</span>
                      <span class="mm-role-badge ${roleClass}">${escHtml(m.uploader_role)}</span>
                    </div>
                    <span class="mm-card-date">${escHtml(m.date_formatted)}</span>
                  </div>
                  <div class="mm-card-foot">
                    <button class="sw-btn outline full" onclick="previewOrDownloadMaterial('${m.id}')">${m.contentType === 'quiz' ? 'Take Quiz' : 'Preview File'}</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        <!-- ── PAGINATION BAR ── -->
        <div class="mm-pagination-row">
          <span class="mm-pagination-info">
            Showing <strong>${totalFilteredCount === 0 ? 0 : startIdx + 1}–${endIdx}</strong> of <strong>${totalFilteredCount}</strong> materials
          </span>
          <div class="mm-pagination-controls">
            ${renderPaginationBtns()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function previewSubjectPdf(courseId, docId) {
  const course = (typeof COURSES_DATABASE !== 'undefined') ? COURSES_DATABASE.find(c => c.id === courseId) : null;
  const doc = course?.documents?.find(d => d.id === docId);
  if (doc && doc.url) {
    if (typeof openRealPdfPreviewModal === 'function') {
      openRealPdfPreviewModal(doc.url, doc.title || doc.fileName);
      return;
    }
  }
  previewSubjectUploadedMaterial(docId);
}

function closeDocPreviewModal() {
  const modal = document.getElementById('docPreviewModal');
  if (modal) modal.classList.remove('active');
  const bodyEl = document.getElementById('docPreviewBody');
  if (bodyEl) bodyEl.innerHTML = '';
}

function downloadSubjectPdf(courseId, docId) {
  const course = (typeof COURSES_DATABASE !== 'undefined') ? COURSES_DATABASE.find(c => c.id === courseId) : null;
  const doc = course?.documents?.find(d => d.id === docId);
  if (doc && doc.url) {
    const a = document.createElement('a');
    a.href = doc.url;
    a.download = doc.fileName || `${doc.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  downloadMaterial(docId);
}

async function previewSubjectUploadedMaterial(id) {
  let m = materialsData.find(mat => String(mat.id) === String(id)) || 
            getCustomMaterialsFromStorage().find(mat => String(mat.id) === String(id)) ||
            (typeof STUDENT_DEFAULT_MATERIALS !== 'undefined' ? STUDENT_DEFAULT_MATERIALS.find(mat => String(mat.id) === String(id)) : null);

  if (!m && typeof COURSES_DATABASE !== 'undefined') {
    for (const c of COURSES_DATABASE) {
      const lessons = getSubjectLessons(c);
      for (const l of lessons) {
        const item = (l.items || []).find(it => String(it.id) === String(id) || String(it.title).toLowerCase() === String(id).toLowerCase());
        if (item) {
          m = {
            id: item.id,
            title: item.title,
            fileName: item.fileName || item.title,
            subject: c.title,
            file_url: item.file_url || 'SURVEY FORMS - Scholaria.pdf',
            file_type: 'application/pdf',
            type: item.type || 'PDF',
            date_formatted: item.due || item.submitted || 'Recent',
            uploaded_by_name: item.score || 'Curriculum Handout'
          };
          break;
        }
      }
      if (m) break;
    }
  }
  if (!m) {
    showToast('Learning material not found', 'error');
    return;
  }

  const modal = document.getElementById('docPreviewModal');
  const titleEl = document.getElementById('docPreviewTitle');
  const subEl = document.getElementById('docPreviewSubtitle');
  const bodyEl = document.getElementById('docPreviewBody');
  const dlBtn = document.getElementById('docPreviewDlBtn');

  const title = m.title || m.fileName || 'Learning Material';
  const uploader = m.uploaded_by_name || m.uploader_name || m.instructor || 'Teacher';
  const subject = m.subject || 'General Subject';
  const size = m.size || m.meta || '';
  const date = m.date_formatted || '';

  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = `${subject}${uploader ? ' · Uploaded by ' + uploader : ''}${date ? ' · ' + date : ''}${size ? ' · ' + size : ''}`;
  if (dlBtn) dlBtn.onclick = () => downloadMaterial(m.id);

  if (!bodyEl) return;
  if (modal) modal.classList.add('active');

  bodyEl.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:360px;gap:12px;color:#64748b;">
      <div style="width:36px;height:36px;border:3px solid #cbd5e1;border-top-color:#0284c7;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <p style="font-size:14px;font-weight:600;margin:0;">Loading document preview...</p>
    </div>
  `;

  let fileUrl = null;
  let fileType = (m.file_type || m.type || '').toLowerCase();

  try {
    const { data: { session } } = await db.auth.getSession().catch(() => ({ data: {} }));
    if (session && session.access_token) {
      const res = await fetch(`${API_BASE}/api/materials/${encodeURIComponent(m.id)}/download`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          fileUrl = data.url;
          if (data.file_type) fileType = data.file_type.toLowerCase();
        }
      }
    }

    if (!fileUrl && m.file_url) {
      if (m.file_url.includes('/') || m.file_url.endsWith('.pdf')) {
        fileUrl = m.file_url;
      } else {
        const { data, error } = await db.storage
          .from('learning-materials')
          .createSignedUrl(m.file_url, 60 * 15);
        if (!error && data?.signedUrl) {
          fileUrl = data.signedUrl;
        }
      }
    }
  } catch (err) {
    console.error('Error fetching file URL for preview:', err);
  }

  const isPdf = fileType.includes('pdf') || (m.fileName && m.fileName.toLowerCase().endsWith('.pdf')) || (m.title && m.title.toLowerCase().endsWith('.pdf')) || m.type === 'PDF';
  const isImage = fileType.includes('image') || /\.(jpe?g|png|gif|webp|svg)$/i.test(m.fileName || m.title || '');

  if (!fileUrl) {
    if (m.file_url || m.url) {
      fileUrl = m.file_url || m.url;
    } else if (isPdf) {
      fileUrl = 'SURVEY FORMS - Scholaria.pdf';
    }
  }

  if (!fileUrl) {
    bodyEl.innerHTML = `
      <div style="padding:40px 20px;text-align:center;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
        <div style="font-size:36px;margin-bottom:12px;">⚠️</div>
        <h4 style="margin:0 0 8px 0;font-size:16px;color:#0f172a;">Unable to load file preview</h4>
        <p style="margin:0 0 16px 0;font-size:13px;color:#64748b;">The document could not be loaded from storage. Please verify that the file exists or try downloading it directly.</p>
        <button class="sw-btn primary" onclick="downloadMaterial('${m.id}')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;">
          Download File
        </button>
      </div>
    `;
    return;
  }
  if (isPdf) {
    bodyEl.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;gap:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;background:#fff;padding:8px 14px;border-radius:8px;border:1px solid #e2e8f0;font-size:12.5px;color:#475569;">
          <span style="font-weight:600;">📄 ${escHtml(m.fileName || title)}</span>
          <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" style="color:#0284c7;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
            Open in new tab ↗
          </a>
        </div>
        <div style="flex:1;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #cbd5e1;box-shadow:0 2px 8px rgba(0,0,0,0.06);min-height:550px;">
          <iframe src="${fileUrl}#toolbar=1" style="width:100%;height:68vh;min-height:550px;border:none;display:block;" title="${escHtml(title)}"></iframe>
        </div>
      </div>
    `;
  } else if (isImage) {
    bodyEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
        <img src="${fileUrl}" alt="${escHtml(title)}" style="max-width:100%;max-height:70vh;object-fit:contain;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.08);" />
      </div>
    `;
  } else {
    bodyEl.innerHTML = `
      <div style="padding:48px 24px;text-align:center;background:#fff;border-radius:12px;border:1px solid #e2e8f0;display:flex;flex-direction:column;align-items:center;gap:12px;">
        <div style="width:54px;height:54px;border-radius:14px;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;font-size:26px;">📁</div>
        <h4 style="margin:0;font-size:17px;font-weight:700;color:#0f172a;">${escHtml(m.fileName || title)}</h4>
        <p style="margin:0;font-size:13px;color:#64748b;max-width:440px;">This document format (${fileType || 'Document'}) cannot be previewed inline in the browser. You can download the file to view it on your device.</p>
        <button class="pf-save" onclick="downloadMaterial('${m.id}')" style="background:#0284c7;display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border-radius:8px;font-weight:600;margin-top:6px;cursor:pointer;">
          <svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:#fff;fill:none;stroke-width:2.5;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download File to View
        </button>
      </div>
    `;
  }
}

// Content Approval presentation state; approval and denial use the existing handlers.
const approvalView = { tab: 'pending', search: '', type: '', subject: '', page: 1 };
const APPROVAL_ARCHIVE_KEY = 'scholaria_archived_approvals';
const APPROVAL_UNARCHIVE_KEY = 'scholaria_unarchived_approvals';

function getArchivedApprovalIds() {
  try {
    return JSON.parse(localStorage.getItem(APPROVAL_ARCHIVE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function getUnarchivedApprovalIds() {
  try {
    return JSON.parse(localStorage.getItem(APPROVAL_UNARCHIVE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function isEntryArchived(kind, id, dbStatus) {
  const key = `${kind}:${id}`;
  const unarchived = getUnarchivedApprovalIds();
  if (unarchived.includes(key)) return false;
  const archived = getArchivedApprovalIds();
  if (archived.includes(key)) return true;
  return dbStatus === 'archived';
}

function toggleArchiveApprovalEntry(kind, id) {
  const key = `${kind}:${id}`;
  let archived = getArchivedApprovalIds();
  let unarchived = getUnarchivedApprovalIds();
  
  const strId = String(id);
  const isCurrentlyArchived = approvalView.tab === 'archived' || isEntryArchived(kind, id);
  
  if (isCurrentlyArchived) {
    archived = archived.filter(k => k !== key && k !== strId && !k.endsWith(`:${strId}`));
    if (!unarchived.includes(key)) unarchived.push(key);
    if (!unarchived.includes(strId)) unarchived.push(strId);
    localStorage.setItem(APPROVAL_ARCHIVE_KEY, JSON.stringify(archived));
    localStorage.setItem(APPROVAL_UNARCHIVE_KEY, JSON.stringify(unarchived));
    showToast('Item unarchived', 'success');
  } else {
    unarchived = unarchived.filter(k => k !== key && k !== strId && !k.endsWith(`:${strId}`));
    if (!archived.includes(key)) archived.push(key);
    localStorage.setItem(APPROVAL_ARCHIVE_KEY, JSON.stringify(archived));
    localStorage.setItem(APPROVAL_UNARCHIVE_KEY, JSON.stringify(unarchived));
    showToast('Item moved to Archive', 'success');
  }
  
  document.querySelectorAll('.ca-more-menu.show').forEach(m => m.classList.remove('show'));

  const wrap = document.getElementById('approvalListWrap');
  if (wrap) wrap.innerHTML = renderApprovalMaterialRows();
}

function toggleApprovalMenu(event) {
  event.stopPropagation();
  const btn = event.currentTarget || (event.target && event.target.closest('.ca-more-btn'));
  const wrap = btn ? btn.closest('.ca-more-wrap') : null;
  const menu = wrap ? wrap.querySelector('.ca-more-menu') : null;
  const isOpen = menu?.classList.contains('show');
  document.querySelectorAll('.ca-more-menu.show').forEach(m => m.classList.remove('show'));
  if (menu && !isOpen) {
    menu.classList.add('show');
  }
}

if (typeof window !== 'undefined' && !window._caMenuListenerAdded) {
  window._caMenuListenerAdded = true;
  document.addEventListener('click', () => {
    document.querySelectorAll('.ca-more-menu.show').forEach(m => m.classList.remove('show'));
  });
}

function approvalIcon(name) {
  const paths = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l5 3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    file: '<path d="M14 2H5v20h14V7z"/><path d="M14 2v6h5M8 12h8M8 16h8M8 19h5"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    dots: '<circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
    archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
}

function approvalEntries() {
  const quizzes = typeof customQuizzes !== 'undefined' ? customQuizzes : [];
  const users = typeof registeredUsers !== 'undefined' ? registeredUsers : [];

  const allMaterials = Array.isArray(materialsData) ? materialsData.filter(Boolean) : [];
  const allQuizzes = Array.isArray(quizzes) ? quizzes.filter(Boolean) : [];

  return [
    ...allMaterials.map(m => {
      const isArchived = isEntryArchived('material', m.id, m.status);
      let status = isArchived ? 'archived' : (m.status || 'pending');
      if (!isArchived && ['rejected', 'revision', 'needs_revision'].includes(status)) status = 'revision';
      return {
        id: m.id,
        kind: 'material',
        title: m.title || m.fileName || 'Untitled Material',
        type: m.content_type || m.file_type || 'Material',
        subject: m.subject || 'General',
        name: m.uploaded_by_name || m.uploader_name || 'Teacher',
        date: m.created_at,
        status,
        isArchived
      };
    }),
    ...allQuizzes.map(q => {
      const isArchived = isEntryArchived('quiz', q.id, q.status);
      let status = isArchived ? 'archived' : (q.status === 'active' ? 'approved' : (q.status || 'pending'));
      if (!isArchived && ['rejected', 'revision', 'needs_revision'].includes(status)) status = 'revision';
      const authorUser = users.find(u => u.dbId === q.createdBy || u.id === q.createdBy || (q.createdBy && String(u.dbId).toLowerCase() === String(q.createdBy).toLowerCase()));
      const uploaderName = q.createdByName || q.author || q.uploaded_by_name || authorUser?.name || authorUser?.full_name || 'Teacher';
      const isInteractive = q.quiz_type === 'interactive' || q.type === 'interactive';
      return {
        id: q.id,
        kind: 'quiz',
        title: q.title || 'Untitled Quiz',
        type: isInteractive ? 'Interactive Quiz' : 'Quiz',
        subject: q.subject || 'General',
        name: uploaderName,
        date: q.createdAt,
        status,
        isArchived
      };
    })
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function setApprovalView(key, value) {
  approvalView[key] = value;
  if (key !== 'page') approvalView.page = 1;
  const wrap = document.getElementById('approvalListWrap');
  if (!wrap) return;
  const position = key === 'search' ? document.getElementById('caSearch')?.selectionStart : null;
  wrap.innerHTML = renderApprovalMaterialRows();
  if (key === 'search') {
    const input = document.getElementById('caSearch');
    input.focus();
    if (position != null) input.setSelectionRange(position, position);
  }
}

async function refreshApprovalView() {
  await Promise.all([loadMaterialsFromDB(), typeof loadQuizzesFromDB === 'function' ? loadQuizzesFromDB() : Promise.resolve()]);
  const wrap = document.getElementById('approvalListWrap');
  if (wrap) wrap.innerHTML = renderApprovalMaterialRows();
  updateApprovalBadge();
}

function renderApprovalMaterialRows() {
  const entries = approvalEntries();
  const counts = status => entries.filter(e => e.status === status).length;
  const query = approvalView.search.trim().toLowerCase();
  const filtered = entries.filter(e => e.status === approvalView.tab && (!approvalView.type || e.type === approvalView.type) && (!approvalView.subject || e.subject === approvalView.subject) && (!query || `${e.title} ${e.name} ${e.subject}`.toLowerCase().includes(query)));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  approvalView.page = Math.min(pages, Math.max(1, approvalView.page));
  const offset = (approvalView.page - 1) * 5;
  const options = key => [...new Set(entries.map(e => e[key]))].filter(Boolean).sort().map(value => `<option value="${escHtml(value)}" ${approvalView[key] === value ? 'selected' : ''}>${escHtml(value)}</option>`).join('');
  const rows = filtered.slice(offset, offset + 5).map(e => {
    const args = escHtml(JSON.stringify(e.kind) + ',' + JSON.stringify(String(e.id)));
    const date = new Date(e.date);
    const isItemArchived = e.status === 'archived' || e.isArchived || approvalView.tab === 'archived';
    const archiveLabel = isItemArchived ? 'Unarchive' : 'Archive';
    return `<tr>
      <td><div class="ca-content"><span class="ca-file ${e.kind}">${approvalIcon('file')}</span><div><strong>${escHtml(e.title)}</strong><small>${escHtml(e.type)} &middot; ${escHtml(e.subject)}</small></div></div></td>
      <td><div class="ca-person"><span class="ca-avatar">${escHtml(initialsFor(e.name))}</span><div>${escHtml(e.name)}<small>Teacher</small></div></div></td>
      <td class="ca-date">${Number.isNaN(date.getTime()) ? '?' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
      <td>
        <div class="ca-actions">
          <button class="ca-review" onclick="reviewApprovalEntry(${args})">${approvalIcon('eye')} Review</button>
          ${e.status === 'pending' ? `<button class="ca-approve" title="Approve" aria-label="Approve ${escHtml(e.title)}" onclick="runApprovalAction(${args},true)">${approvalIcon('check')}</button><button class="ca-reject" title="Deny" aria-label="Deny ${escHtml(e.title)}" onclick="runApprovalAction(${args},false)">${approvalIcon('close')}</button>` : ''}
          ${(e.status === 'archived' || approvalView.tab === 'archived') ? `<button class="ca-unarchive-btn" title="Unarchive" aria-label="Unarchive ${escHtml(e.title)}" onclick="toggleArchiveApprovalEntry('${e.kind}', '${escHtml(String(e.id))}')">${approvalIcon('archive')} Unarchive</button>` : ''}
          <div class="ca-more-wrap">
            <button class="ca-more-btn" title="More options" aria-label="More options" onclick="toggleApprovalMenu(event)">${approvalIcon('dots')}</button>
            <div class="ca-more-menu">
              <button class="ca-menu-item" onclick="toggleArchiveApprovalEntry('${e.kind}', '${escHtml(String(e.id))}')">${approvalIcon('archive')} ${archiveLabel}</button>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');
  return `<div class="ca-heading"><h2>Content Approval</h2><div class="ca-heading-actions"><button class="ca-button ca-primary" onclick="refreshApprovalView()">${iconRefresh()} Refresh</button></div></div>
    <div class="ca-banner"><h3>Approval Queue</h3><p>All materials and quizzes submitted by teachers require your approval before they become visible to students.</p></div>
    <div class="ca-stats">${[['pending','Pending review','clock'],['approved','Approved','check'],['revision','Needs revision','file']].map(([status,label,icon]) => `<div class="ca-stat ${status} ${approvalView.tab === status ? 'active' : ''}" onclick="setApprovalView('tab','${status}')" role="button" tabindex="0" title="Click to filter ${label}"><div class="ca-stat-icon">${approvalIcon(icon)}</div><div><span>${label}</span><strong>${counts(status)}</strong></div></div>`).join('')}</div>
    <div class="ca-panel"><div class="ca-tabs" aria-label="Submission status">${[['pending',`Pending (${counts('pending')})`],['approved','Approved'],['revision','Needs revision'],['archived',`Archive (${counts('archived')})`]].map(([status,label]) => `<button aria-pressed="${approvalView.tab === status}" class="${approvalView.tab === status ? 'active' : ''}" onclick="setApprovalView('tab','${status}')">${label}</button>`).join('')}</div>
    <div class="ca-filters"><label class="ca-search">${approvalIcon('search')}<input id="caSearch" aria-label="Search submissions" placeholder="Search submissions..." value="${escHtml(approvalView.search)}" oninput="setApprovalView('search',this.value)"></label><select aria-label="Content type" onchange="setApprovalView('type',this.value)"><option value="">All content types</option>${options('type')}</select><select aria-label="Subject" onchange="setApprovalView('subject',this.value)"><option value="">All subjects</option>${options('subject')}</select></div>
    <div class="ca-table-wrap"><table class="ca-table"><thead><tr><th scope="col">Content</th><th scope="col">Submitted by</th><th scope="col">Date submitted</th><th scope="col">Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="ca-empty">No submissions found.</td></tr>'}</tbody></table></div>
    <div class="ca-footer"><span>Showing ${Math.min(5, filtered.length - offset)} of ${filtered.length} submissions</span><nav class="ca-pagination" aria-label="Submission pages">${approvalView.page > 1 ? `<button aria-label="Previous page" onclick="setApprovalView('page',${approvalView.page - 1})">&#8249;</button>` : ''}${Array.from({ length: Math.min(3, pages) }, (_, i) => Math.max(1, Math.min(approvalView.page - 1, pages - 2)) + i).map(page => `<button aria-label="Page ${page}" ${page === approvalView.page ? 'aria-current="page"' : ''} class="${page === approvalView.page ? 'active' : ''}" onclick="setApprovalView('page',${page})">${page}</button>`).join('')}<button aria-label="Next page" ${approvalView.page === pages ? 'disabled' : ''} onclick="setApprovalView('page',${approvalView.page + 1})">&#8250;</button></nav></div></div>`;
}

function runApprovalAction(kind, id, approve) {
  return kind === 'quiz' ? (approve ? approveQuiz(id) : rejectQuiz(id)) : (approve ? approveMaterial(id) : rejectMaterial(id));
}

async function reviewApprovalEntry(kind, id) {
  if (kind === 'material') {
    const material = materialsData.find(m => String(m.id) === id);
    if (!material) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'ca-review-dialog';
    dialog.setAttribute('aria-labelledby', 'caReviewTitle');
    dialog.innerHTML = `<form method="dialog"><button class="ca-dialog-close" aria-label="Close review">&times;</button></form><h2 id="caReviewTitle">${escHtml(material.title)}</h2><p>${escHtml(material.subject || 'General')}</p><p class="ca-file-preview" aria-live="polite">Loading file...</p>`;
    dialog.addEventListener('close', () => dialog.remove());
    document.body.appendChild(dialog);
    dialog.showModal();
    const preview = dialog.querySelector('.ca-file-preview');
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) throw new Error('Please sign in to review this file.');
      const response = await fetch(`${API_BASE}/api/materials/${encodeURIComponent(id)}/download`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to open material.');
      const url = new URL(data.url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid file URL.');
      preview.innerHTML = `<a href="${escHtml(url.href)}" target="_blank" rel="noopener noreferrer">Open submitted file</a>`;
    } catch (error) { preview.textContent = error.message; }
    return;
  }
  const quiz = customQuizzes.find(q => String(q.id) === id);
  if (!quiz) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'ca-review-dialog';
  dialog.setAttribute('aria-labelledby', 'caReviewTitle');
  dialog.innerHTML = `<form method="dialog"><button class="ca-dialog-close" aria-label="Close review">&times;</button></form><h2 id="caReviewTitle">${escHtml(quiz.title)}</h2><p>${escHtml(quiz.subject || 'General')}</p>${(quiz.questions || []).map((q, i) => `<section><h3>${i + 1}. ${escHtml(q.question || q.text || q.prompt || 'Question')}</h3>${Array.isArray(q.options) ? `<ul>${q.options.map(option => `<li>${escHtml(typeof option === 'object' && option ? option.text || option.label : option)}</li>`).join('')}</ul>` : ''}<p>Answer: ${escHtml(q.answer ?? q.correctAnswer ?? q.correct_answer ?? 'Not provided')}</p></section>`).join('') || '<p>No questions available.</p>'}`;
  dialog.addEventListener('close', () => dialog.remove());
  document.body.appendChild(dialog);
  dialog.showModal();
}

async function approveMaterial(id) {
  // 1. Update in localStorage custom materials
  const localList = getCustomMaterialsFromStorage();
  const localIdx = localList.findIndex(m => String(m.id) === String(id));
  if (localIdx >= 0) {
    localList[localIdx].status = 'approved';
    localList[localIdx].approved_by = (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE?.id) || 'admin';
    localList[localIdx].approved_by_name = (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE?.full_name) || 'Administrator';
    localStorage.setItem(CUSTOM_MATERIALS_STORAGE_KEY, JSON.stringify(localList));
  }
  // 2. Update in-memory materialsData
  const memItem = materialsData.find(m => String(m.id) === String(id));
  if (memItem) {
    memItem.status = 'approved';
    memItem.approved_by = (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE?.id) || 'admin';
    memItem.approved_by_name = (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE?.full_name) || 'Administrator';
  }

  const { data: { session } } = await db.auth.getSession().catch(() => ({ data: {} }));
  let backendItem = null;
  if (session && session.access_token) {
    try {
      const res = await fetch(`${API_BASE}/api/materials/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: 'approved' })
      });
      const data = await res.json();
      if (res.ok) {
        backendItem = data;
      }
    } catch (err) {
      console.warn('Backend update notice:', err);
    }
  }

  showToast('Material approved and published to students!', 'success');

  const uploaderId = backendItem?.uploaded_by || memItem?.uploaded_by;
  const itemTitle = backendItem?.title || memItem?.title || 'Material';
  const itemSub = backendItem?.subject || memItem?.subject || 'General';

  if (typeof addNotification === 'function') {
    if (uploaderId) {
      addNotification({
        targetUserId: uploaderId,
        targetRole: 'teacher',
        title: 'Material Approved',
        message: `Your material "${itemTitle}" has been approved by the Admin and is now live.`,
        type: 'material'
      });
    }
    addNotification({
      targetRole: 'student',
      title: 'New Material Available',
      message: `New learning material "${itemTitle}" (${itemSub}) is now available.`,
      type: 'material'
    });
  }

  renderMaterialsContainer();
  const wrap = document.getElementById('approvalListWrap');
  if (wrap) wrap.innerHTML = renderApprovalMaterialRows();
  if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
  loadMaterialsFromDB().catch(() => {});
}

async function rejectMaterial(id) {
  if (!confirm('Deny and delete this material? It will be removed from the approval queue.')) return;

  // 1. Remove from localStorage
  try {
    const customList = getCustomMaterialsFromStorage().filter(m => String(m.id) !== String(id));
    localStorage.setItem(CUSTOM_MATERIALS_STORAGE_KEY, JSON.stringify(customList));
  } catch (e) {}

  // 2. Remove from in-memory materialsData
  materialsData = materialsData.filter(m => String(m.id) !== String(id));

  const { data: { session } } = await db.auth.getSession().catch(() => ({ data: {} }));
  if (session && session.access_token) {
    try {
      await fetch(`${API_BASE}/api/materials/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: 'rejected' })
      });
    } catch (err) {
      console.warn('Backend reject notice:', err);
    }
  }

  showToast('Material denied and removed', 'success');
  renderMaterialsContainer();
  const wrap = document.getElementById('approvalListWrap');
  if (wrap) wrap.innerHTML = renderApprovalMaterialRows();
  if (typeof updateApprovalBadge === 'function') updateApprovalBadge();
  loadMaterialsFromDB().catch(() => {});
}

async function downloadMaterial(id) {
  const m = materialsData.find(mat => String(mat.id) === String(id)) || 
            getCustomMaterialsFromStorage().find(mat => String(mat.id) === String(id)) ||
            (typeof STUDENT_DEFAULT_MATERIALS !== 'undefined' ? STUDENT_DEFAULT_MATERIALS.find(mat => String(mat.id) === String(id)) : null);

  let cleanFileName = (m?.fileName || m?.title || 'Learning_Material').replace(/[^\w.\-]+/g, '_');
  if (!cleanFileName.includes('.')) {
    const isDocx = (m?.file_type && m.file_type.includes('word')) || m?.type === 'DOCX';
    const isPptx = (m?.file_type && m.file_type.includes('presentation')) || m?.type === 'PPTX';
    const isXlsx = (m?.file_type && m.file_type.includes('sheet')) || m?.type === 'XLSX';
    cleanFileName += isDocx ? '.docx' : (isPptx ? '.pptx' : (isXlsx ? '.xlsx' : '.pdf'));
  }

  showToast(`Preparing download for "${m?.title || 'document'}"…`, 'info');

  const { data: { session } } = await db.auth.getSession().catch(() => ({ data: {} }));
  let fileUrl = null;

  if (session && session.access_token) {
    try {
      const res = await fetch(`${API_BASE}/api/materials/${encodeURIComponent(id)}/download`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) fileUrl = data.url;
      }
    } catch (e) {
      console.warn('API download call failed, checking direct storage:', e);
    }
  }

  // Fallback to direct Supabase storage signed URL
  if (!fileUrl && m?.file_url) {
    if (m.file_url.includes('/') || m.file_url.endsWith('.pdf')) {
      fileUrl = m.file_url;
    } else {
      try {
        const { data, error } = await db.storage
          .from('learning-materials')
          .createSignedUrl(m.file_url, 60 * 10);
        if (!error && data?.signedUrl) {
          fileUrl = data.signedUrl;
        }
      } catch (e) {}
    }
  }

  if (!fileUrl) {
    if (m?.file_url || m?.url) {
      fileUrl = m.file_url || m.url;
    } else {
      fileUrl = 'SURVEY FORMS - Scholaria.pdf';
    }
  }

  if (!fileUrl) {
    showToast('Download failed: File not found in storage.', 'error');
    return;
  }

  // Trigger real download by fetching blob so the browser saves actual binary file data
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = cleanFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    showToast(`Downloaded "${cleanFileName}" successfully.`, 'success');
  } catch (err) {
    console.warn('Direct blob download failed, falling back to window.open:', err);
    const a = document.createElement('a');
    a.href = fileUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = cleanFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

async function deleteMaterial(id) {
  if (!confirm('Are you sure you want to delete this material? This will permanently remove the file.')) return;

  // 1. Remove from localStorage custom materials
  try {
    const customList = getCustomMaterialsFromStorage().filter(m => String(m.id) !== String(id));
    localStorage.setItem(CUSTOM_MATERIALS_STORAGE_KEY, JSON.stringify(customList));
  } catch (e) {}

  // 2. Remove from in-memory materialsData
  materialsData = materialsData.filter(m => String(m.id) !== String(id));

  // 3. Delete from backend if session exists
  const { data: { session } } = await db.auth.getSession().catch(() => ({ data: {} }));
  if (session && session.access_token) {
    try {
      await fetch(`${API_BASE}/api/materials/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
    } catch (err) {}
  }

  showToast('Material deleted', 'success');
  renderMaterialsContainer();
}

const materialUploadState = { 
  course_id: null,
  course_title: null,
  course_code: null,
  title: '', 
  subject: '', 
  strand: '', 
  grade_level: '', 
  sections: new Set(), 
  files: [], 
  submitting: false 
};

function openMaterialModal(courseId, targetSection, targetLessonId) {
  const teacherStrands = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.strand)
    ? CURRENT_PROFILE.strand.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : [];
  if (ROLE === 'teacher') {
    if (!teacherStrands.includes('STEM')) teacherStrands.push('STEM');
    if (!teacherStrands.includes('HUMSS')) teacherStrands.push('HUMSS');
  }

  const teacherGrades = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.grade_level)
    ? CURRENT_PROFILE.grade_level.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const teacherSections = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.section)
    ? CURRENT_PROFILE.section.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const targetCourseId = courseId || activeSubjectFilter;
  const chosenSection = targetSection || activeSubjectSection;
  let targetCourse = null;
  if (targetCourseId && typeof COURSES_DATABASE !== 'undefined') {
    targetCourse = COURSES_DATABASE.find(c => c.id === targetCourseId) || null;
  }

  let initialSubject = '';
  let initialStrand = '';
  let initialGrade = teacherGrades.length === 1 ? teacherGrades[0] : (targetCourse?.gradeLevel || 'Grade 11');

  if (targetCourse) {
    initialSubject = targetCourse.title;
    initialStrand = (ROLE === 'teacher' && (targetCourse.track === 'Core' || targetCourse.track === 'Applied'))
      ? 'STEM, HUMSS'
      : (targetCourse.strand || (ROLE === 'teacher' ? 'STEM, HUMSS' : 'All Strands'));
    initialGrade = targetCourse.gradeLevel || initialGrade;
  } else {
    initialStrand = (ROLE === 'teacher') ? 'STEM, HUMSS' : 'All Strands';
  }

  const initialSectionsSet = chosenSection
    ? new Set([chosenSection])
    : (teacherSections.length ? new Set(teacherSections) : (ROLE === 'teacher' ? new Set(['Section A', 'Section B']) : new Set()));

  const courseLessons = targetCourse ? getSubjectLessons(targetCourse) : [];
  let initialLessonId = targetLessonId || null;
  if (!initialLessonId && ROLE === 'admin' && courseLessons.length > 0) {
    initialLessonId = courseLessons[0]?.id || courseLessons[0]?.num || null;
  }

  Object.assign(materialUploadState, { 
    course_id: targetCourse ? targetCourse.id : null,
    course_title: targetCourse ? targetCourse.title : null,
    course_code: targetCourse ? targetCourse.code : null,
    lesson_id: initialLessonId,
    title: targetCourse ? (ROLE === 'admin' ? `${targetCourse.title} Curriculum Handout` : `${targetCourse.title} Supplementary Handout`) : '', 
    subject: initialSubject, 
    strand: initialStrand, 
    grade_level: initialGrade, 
    sections: initialSectionsSet,
    files: [], 
    submitting: false 
  });

  const modal = document.getElementById('materialModal');
  if (modal) modal.classList.add('active');
  renderMaterialModal();
}

function toggleMaterialSection(sec) {
  if (materialUploadState.sections.has(sec)) {
    materialUploadState.sections.delete(sec);
  } else {
    materialUploadState.sections.add(sec);
  }
  renderMaterialModal();
}

function closeMaterialModal() {
  const modal = document.getElementById('materialModal');
  if (modal) modal.classList.remove('active');
}

function muUpdateField(field, value) {
  materialUploadState[field] = value;
  muRefreshUploadButton();
}

function muRefreshUploadButton() {
  const btn = document.getElementById('muSubmitBtn');
  if (!btn) return;
  const s = materialUploadState;
  const ok = !!(s.files.length > 0 && s.title.trim() && s.strand && s.subject && !s.submitting);
  btn.disabled = !ok;
}

function getAllSubjects() {
  const all = [];
  Object.values(SUBJECTS_BY_STRAND).forEach(list => {
    list.forEach(sub => {
      if (!all.includes(sub)) all.push(sub);
    });
  });
  return all;
}

function muUpdateStrand(value) {
  materialUploadState.strand = value;
  if (ROLE === 'teacher') {
    const valUp = (value || '').toUpperCase();
    if (valUp.includes('STEM') && valUp.includes('HUMSS')) {
      materialUploadState.sections = new Set(['Section A', 'Section B']);
    } else if (valUp === 'STEM') {
      materialUploadState.sections = new Set(['Section A']);
    } else if (valUp === 'HUMSS') {
      materialUploadState.sections = new Set(['Section B']);
    }
  }
  const available = getFilteredSubjects(materialUploadState.strand, materialUploadState.grade_level);
  if (materialUploadState.subject && available.length > 0 && !available.includes(materialUploadState.subject)) {
    materialUploadState.subject = '';
  }
  renderMaterialModal();
}

function muUpdateGradeLevel(value) {
  materialUploadState.grade_level = value;
  const available = getFilteredSubjects(materialUploadState.strand, materialUploadState.grade_level);
  if (materialUploadState.subject && available.length > 0 && !available.includes(materialUploadState.subject)) {
    materialUploadState.subject = '';
  }
  renderMaterialModal();
}

function muUpdateSubject(value) {
  materialUploadState.subject = value;
  materialUploadState.lesson_id = null;
  if (value && (!materialUploadState.strand || !materialUploadState.grade_level)) {
    for (const [str, grades] of Object.entries(SUBJECTS_BY_STRAND_AND_GRADE)) {
      for (const [gLevel, list] of Object.entries(grades)) {
        if (list.includes(value)) {
          if (!materialUploadState.strand) materialUploadState.strand = str;
          if (!materialUploadState.grade_level) materialUploadState.grade_level = gLevel;
          break;
        }
      }
    }
  }
  renderMaterialModal();
}

function muHandleFileInput(input) {
  const incomingFiles = Array.from(input.files || []);
  if (!incomingFiles.length) return;

  const validFiles = [];
  for (const f of incomingFiles) {
    if (f.size > 50 * 1024 * 1024) {
      showToast(`"${f.name}" exceeds the 50MB limit`, 'error');
      continue;
    }
    // Prevent duplicate files in the current staged batch
    if (!materialUploadState.files.some(existing => existing.name === f.name && existing.size === f.size)) {
      validFiles.push(f);
    }
  }

  materialUploadState.files.push(...validFiles);
  input.value = ''; // Reset input so user can pick the same file again if removed

  // Auto-set title if currently blank
  if (materialUploadState.files.length === 1 && (!materialUploadState.title || materialUploadState.title.includes('Supplementary Handout'))) {
    materialUploadState.title = materialUploadState.files[0].name.replace(/\.[^.]+$/, '');
  } else if (materialUploadState.files.length > 1 && (!materialUploadState.title || materialUploadState.title.includes('.'))) {
    materialUploadState.title = materialUploadState.subject ? `${materialUploadState.subject} Learning Materials` : `${materialUploadState.files.length} Handouts`;
  }

  // Auto-detect subject from filename if not yet selected
  if (!materialUploadState.subject && validFiles.length > 0) {
    const rawName = validFiles[0].name.toLowerCase();
    for (const [str, grades] of Object.entries(SUBJECTS_BY_STRAND_AND_GRADE)) {
      for (const [gLevel, list] of Object.entries(grades)) {
        const found = list.find(sub => rawName.includes(sub.toLowerCase()) || sub.toLowerCase().includes(rawName));
        if (found) {
          materialUploadState.subject = found;
          if (!materialUploadState.strand) materialUploadState.strand = str;
          if (!materialUploadState.grade_level) materialUploadState.grade_level = gLevel;
          break;
        }
      }
    }
  }

  renderMaterialModal();
}

function muRemoveFile(idx) {
  materialUploadState.files.splice(idx, 1);
  if (materialUploadState.files.length === 1 && (!materialUploadState.title || materialUploadState.title.includes('Learning Materials'))) {
    materialUploadState.title = materialUploadState.files[0].name.replace(/\.[^.]+$/, '');
  }
  renderMaterialModal();
}

function renderMaterialModal() {
  const body = document.getElementById('materialModalBody');
  const foot = document.getElementById('materialModalFoot');
  const s = materialUploadState;
  if (!body || !foot) return;

  const subjectOptions = getFilteredSubjects(s.strand, s.grade_level);
  const teacherStrands = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.strand)
    ? CURRENT_PROFILE.strand.split(',').map(str => str.trim().toUpperCase()).filter(Boolean)
    : [];
  if (ROLE === 'teacher') {
    if (!teacherStrands.includes('STEM')) teacherStrands.push('STEM');
    if (!teacherStrands.includes('HUMSS')) teacherStrands.push('HUMSS');
  }

  const teacherGrades = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.grade_level)
    ? CURRENT_PROFILE.grade_level.split(',').map(g => g.trim()).filter(Boolean)
    : [];
  const teacherSections = (ROLE === 'teacher' && CURRENT_PROFILE && CURRENT_PROFILE.section)
    ? CURRENT_PROFILE.section.split(',').map(sec => sec.trim()).filter(Boolean)
    : [];

  const availableStrands = (ROLE === 'teacher' && teacherStrands.length) ? teacherStrands : STRANDS;
  const availableGrades  = (ROLE === 'teacher' && teacherGrades.length) ? teacherGrades : GRADE_LEVELS;
  
  const sortFn = (typeof sortSectionsNaturally === 'function')
    ? sortSectionsNaturally
    : (list) => [...list].sort((a,b) => (typeof a === 'string' ? a : (a?.name || '')).localeCompare(typeof b === 'string' ? b : (b?.name || ''), undefined, { numeric: true, sensitivity: 'base' }));

  const rawSections = (ROLE === 'teacher' && teacherSections.length) ? teacherSections : SECTIONS;
  const availableSections = sortFn(rawSections);

  const isGradeLocked  = ROLE === 'teacher' && teacherGrades.length === 1;

  body.innerHTML = `
    ${s.course_title ? `
      <div style="background:#e0f2fe;border:1px solid #bae6fd;color:#0369a1;padding:10px 14px;border-radius:10px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:8px;margin-bottom:14px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Posting directly to <strong>${escHtml(s.course_title)}</strong> ${s.course_code ? '(' + escHtml(s.course_code) + ')' : ''}</span>
      </div>
    ` : ''}

    <div class="gen-row">
      <div class="gen-field"><label>Strand ${ROLE === 'teacher' ? '<span style="font-size:11px;color:#0284c7;font-weight:600;">(Handled Strands)</span>' : ''}</label>
        <select onchange="muUpdateStrand(this.value)">
          ${ROLE === 'teacher' ? `
            <option value="STEM, HUMSS" ${(s.strand === 'STEM, HUMSS' || s.strand === 'Both STEM & HUMSS' || (s.strand && s.strand.includes('STEM') && s.strand.includes('HUMSS'))) ? 'selected' : ''}>Both STEM &amp; HUMSS (All Handled)</option>
            <option value="STEM" ${s.strand === 'STEM' ? 'selected' : ''}>STEM</option>
            <option value="HUMSS" ${s.strand === 'HUMSS' ? 'selected' : ''}>HUMSS</option>
            ${availableStrands.filter(st => st !== 'STEM' && st !== 'HUMSS').map(st => `<option value="${st}" ${s.strand === st ? 'selected' : ''}>${st}</option>`).join('')}
          ` : `
            <option value="All Strands" ${(!s.strand || s.strand === 'All Strands' || s.strand === 'all') ? 'selected' : ''}>All Strands (General / Core)</option>
            ${availableStrands.map(str => `<option value="${str}" ${s.strand === str ? 'selected' : ''}>${str}</option>`).join('')}
          `}
        </select>
      </div>
      <div class="gen-field"><label>Grade Level ${isGradeLocked ? '<span style="font-size:11px;color:#0284c7;font-weight:600;">(Handled Grade)</span>' : ''}</label>
        ${isGradeLocked ? `
          <select disabled style="opacity:0.85;cursor:not-allowed;background:#f8fafc;font-weight:600;">
            <option value="${teacherGrades[0]}" selected>${teacherGrades[0]} (Locked to handled grade)</option>
          </select>
        ` : `
          <select onchange="muUpdateGradeLevel(this.value)">
            <option value="" disabled ${!s.grade_level ? 'selected' : ''}>Select grade level</option>
            ${availableGrades.map(g => `<option value="${g}" ${s.grade_level === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        `}
      </div>
    </div>
    <div class="gen-field">
      <label>Target Sections <span style="text-transform:none;font-weight:500;color:var(--text-muted);">${ROLE === 'teacher' ? '(Limited to your handled sections)' : '(select multiple or leave blank for all sections)'}</span></label>
      <div class="format-grid">
        ${availableSections.map(sec => {
          const isSelected = s.sections.has(sec);
          return `<div class="format-chip ${isSelected ? 'on' : ''}" onclick="toggleMaterialSection('${sec}')">${sec}</div>`;
        }).join('')}
      </div>
    </div>
    <div class="gen-row">
      <div class="gen-field"><label>Title / Description</label><input type="text" placeholder="e.g. Q1 Lesson 3 – Lecture Notes & Handouts" value="${escHtml(s.title)}" oninput="muUpdateField('title', this.value)"></div>
      <div class="gen-field"><label>Subject</label>
        <select onchange="muUpdateSubject(this.value)">
          <option value="" disabled ${!s.subject ? 'selected' : ''}>${(s.strand && s.grade_level) ? `Select subject (${s.strand} · ${s.grade_level})` : s.strand ? `Select subject (${s.strand})` : s.grade_level ? `Select subject (${s.grade_level})` : 'Select subject'}</option>
          ${subjectOptions.map(sub => `<option value="${escHtml(sub)}" ${s.subject === sub ? 'selected' : ''}>${escHtml(sub)}</option>`).join('')}
          ${(s.subject && !subjectOptions.includes(s.subject)) ? `<option value="${escHtml(s.subject)}" selected>${escHtml(s.subject)}</option>` : ''}
        </select>
      </div>
    </div>
    ${(() => {
      let matchedCourse = null;
      if (typeof COURSES_DATABASE !== 'undefined' && Array.isArray(COURSES_DATABASE)) {
        if (s.course_id) matchedCourse = COURSES_DATABASE.find(c => c.id === s.course_id);
        if (!matchedCourse && s.subject) {
          const sNorm = s.subject.toLowerCase().trim();
          matchedCourse = COURSES_DATABASE.find(c => {
            const cNorm = (c.title || '').toLowerCase().trim();
            return cNorm === sNorm || cNorm.includes(sNorm) || sNorm.includes(cNorm);
          });
        }
      }
      const courseObj = matchedCourse || (s.subject ? {
        id: 'course-' + s.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: s.subject,
        strand: s.strand || 'STEM',
        gradeLevel: s.grade_level || 'Grade 11'
      } : null);
      const availableLessons = courseObj ? getSubjectLessons(courseObj) : [];
      return `
        <div class="gen-field" style="margin-top:4px;">
          <label>Target Lesson / Placement <span style="text-transform:none;font-weight:500;color:var(--text-muted);">${ROLE === 'admin' ? '(Admin curriculum handouts appear inside the module box under Modules & Handouts)' : '(Select a specific lesson or general supplementary)'}</span></label>
          <select onchange="muUpdateField('lesson_id', this.value)">
            ${ROLE === 'admin' ? `
              <option value="" ${!s.lesson_id ? 'selected' : ''}>📖 Auto-detect from file (e.g. 01_Handout → Lesson 01)</option>
            ` : `
              <option value="" ${!s.lesson_id ? 'selected' : ''}>📁 General Supplementary (Appears in Teacher Uploads Tab)</option>
            `}
            ${availableLessons.map(l => `
              <option value="${escHtml(l.id || l.num)}" ${s.lesson_id === (l.id || l.num) ? 'selected' : ''}>
                📖 ${escHtml(l.title)}
              </option>
            `).join('')}
          </select>
        </div>
      `;
    })()}
    <div class="gen-field">
      <label>Files to Upload <span style="text-transform:none;font-weight:500;color:var(--text-muted);">(You can select multiple handouts, modules, or slides)</span></label>
      ${s.files.length > 0 ? `
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;max-height:200px;overflow-y:auto;padding-right:4px;">
          ${s.files.map((file, idx) => `
            <div class="file-chip" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                <div class="fc-icon" style="width:32px;height:32px;border-radius:8px;background:#0284c7;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div class="fc-info" style="min-width:0;">
                  <h5 style="margin:0;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px;">${escHtml(file.name)}</h5>
                  <span style="font-size:11px;color:var(--text-muted);">${(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload</span>
                </div>
              </div>
              <button class="fc-remove" onclick="muRemoveFile(${idx})" style="background:none;border:none;cursor:pointer;color:#94a3b8;padding:4px;border-radius:6px;display:flex;align-items:center;justify-content:center;" title="Remove this file">${iconClose()}</button>
            </div>
          `).join('')}
        </div>
        <label class="dropzone" for="materialFileInput" style="padding:10px;cursor:pointer;border:1.5px dashed #0284c7;border-radius:10px;text-align:center;background:#f0f9ff;display:flex;align-items:center;justify-content:center;gap:8px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0284c7" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span style="font-size:12.5px;font-weight:700;color:#0284c7;">+ Add more handouts / slides</span>
        </label>
        <input type="file" id="materialFileInput" accept=".pdf,.doc,.docx,.ppt,.pptx" multiple style="display:none" onchange="muHandleFileInput(this)">
      ` : `
        <label class="dropzone" for="materialFileInput">
          ${iconUpload()}
          <div class="dz-title">Click to upload handouts, modules, or slides</div>
          <div class="dz-sub">Select single or multiple files (PDF, DOCX, PPTX) — up to 50MB each</div>
        </label>
        <input type="file" id="materialFileInput" accept=".pdf,.doc,.docx,.ppt,.pptx" multiple style="display:none" onchange="muHandleFileInput(this)">
      `}
    </div>
    ${ROLE === 'teacher' ? `<div style="font-size:11.5px;color:#0369a1;display:flex;align-items:center;gap:6px;"><span style="color:#0284c7;font-weight:700;">✓</span> Handouts will be immediately published and available to your students.</div>` : ''}
  `;

  const hasFiles = s.files.length > 0;
  const isReady = !!(hasFiles && s.title.trim() && s.strand && s.subject && !s.submitting);
  const btnLabel = s.submitting 
    ? 'Uploading…' 
    : (s.files.length > 1 ? `Upload ${s.files.length} Handouts` : 'Upload Handout');

  foot.innerHTML = `
    <button class="foot-btn-secondary" onclick="closeMaterialModal()">Cancel</button>
    <button class="gen-btn" id="muSubmitBtn" ${!isReady ? 'disabled' : ''} onclick="submitMaterialUpload()">
      ${iconUpload()} ${btnLabel}
    </button>
  `;
}

async function submitMaterialUpload() {
  const s = materialUploadState;
  if (!s.files.length || !s.title.trim() || !s.strand || !s.subject || s.submitting) return;

  const { data: { session } } = await db.auth.getSession().catch(() => ({ data: {} }));
  s.submitting = true;
  renderMaterialModal();

  const targetSection = s.sections.size ? Array.from(s.sections).join(', ') : '';
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const formData = new FormData();
  s.files.forEach(f => {
    formData.append('files', f);
  });
  formData.append('title', s.title.trim());
  formData.append('subject', s.subject.trim());
  formData.append('strand', s.strand.trim());
  formData.append('grade_level', s.grade_level.trim());
  formData.append('section', targetSection);

  let serverRecords = [];

  if (session && session.access_token) {
    try {
      const res = await fetch(`${API_BASE}/api/materials/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        serverRecords = data.materials || (data.id ? [data] : []);
      } else {
        console.warn('Backend upload notice:', data.error);
      }
    } catch (err) {
      console.warn('Could not contact upload endpoint, persisting locally:', err);
    }
  }

  // Persist each file in scholaria_custom_materials_v1 in localStorage so materials are NEVER lost
  const uploaderName = CURRENT_PROFILE?.full_name || (ROLE === 'admin' ? 'Administrator' : 'Teacher');
  const uploaderRole = ROLE === 'admin' ? 'Admin' : 'Teacher';
  const targetStatus = 'approved'; // Instantly approved so uploads reflect immediately for students

  // Determine course lessons for auto-assignment if needed
  let courseForLessons = null;
  if (typeof COURSES_DATABASE !== 'undefined') {
    courseForLessons = COURSES_DATABASE.find(c => c.id === s.course_id || (s.subject && c.title && c.title.toLowerCase().trim() === s.subject.toLowerCase().trim()));
  }
  const cLessons = courseForLessons ? getSubjectLessons(courseForLessons) : [];

  s.files.forEach((f, idx) => {
    const srv = serverRecords[idx] || null;
    const itemTitle = s.files.length === 1 ? s.title.trim() : (f.name.replace(/\.[^.]+$/, '') || s.title.trim());
    const ext = f.name.split('.').pop() || 'pdf';
    const typeLabel = ext.toUpperCase();

    // Determine lesson assignment for the handout
    let assignedLessonId = s.lesson_id || null;
    let assignedLessonNum = null;
    let assignedLessonTitle = null;

    if (!assignedLessonId) {
      const detectedNum = extractMaterialLessonNum({ title: itemTitle, fileName: f.name });
      if (detectedNum !== null && cLessons.length > 0) {
        const foundL = cLessons.find(l => parseInt(l.num, 10) === detectedNum);
        if (foundL) {
          assignedLessonId = foundL.id;
          assignedLessonNum = foundL.num;
          assignedLessonTitle = foundL.title;
        }
      }
    }

    // For admin, default to first lesson if unassigned
    if (ROLE === 'admin' && !assignedLessonId && cLessons.length > 0) {
      assignedLessonId = cLessons[0].id;
      assignedLessonNum = cLessons[0].num;
      assignedLessonTitle = cLessons[0].title;
    }

    if (assignedLessonId && !assignedLessonNum && cLessons.length > 0) {
      const foundL = cLessons.find(l => l.id === assignedLessonId || l.num === assignedLessonId);
      if (foundL) {
        assignedLessonNum = foundL.num;
        assignedLessonTitle = foundL.title;
      }
    }

    const localRecord = {
      id: srv ? srv.id : `local_${Date.now()}_${idx}`,
      title: itemTitle,
      fileName: f.name,
      category: ROLE === 'admin' ? 'Curriculum' : 'Handout',
      tag: ROLE === 'admin' ? 'Curriculum' : 'Handout',
      subject: s.subject.trim(),
      course_id: s.course_id || activeSubjectFilter || null,
      course_code: s.course_code || null,
      lesson_id: assignedLessonId,
      lesson_num: assignedLessonNum,
      lesson_title: assignedLessonTitle,
      strand: s.strand.trim(),
      grade_level: s.grade_level.trim(),
      section: targetSection,
      uploader_name: uploaderName,
      uploaded_by_name: uploaderName,
      uploader_role: uploaderRole,
      uploaded_by: CURRENT_PROFILE?.id || 'local_user',
      approved_by: CURRENT_PROFILE?.id || 'admin',
      approved_by_name: ROLE === 'admin' ? uploaderName : 'System Administrator',
      is_curriculum: ROLE === 'admin',
      file_type: f.type || 'application/pdf',
      type: typeLabel,
      status: targetStatus,
      created_at: now.toISOString(),
      date_formatted: dateFormatted,
      time_formatted: timeFormatted,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`
    };

    saveCustomMaterialToStorage(localRecord);

    const existingIdx = materialsData.findIndex(m => String(m.id) === String(localRecord.id));
    if (existingIdx >= 0) {
      materialsData[existingIdx] = localRecord;
    } else {
      materialsData.unshift(localRecord);
    }

    if (ROLE === 'admin' && assignedLessonId) {
      expandedLessonMap[assignedLessonId] = true;
    }
  });

  const uploadCount = s.files.length;
  showToast(uploadCount > 1 ? `${uploadCount} handouts uploaded and published to students!` : 'Handout uploaded and published to students!', 'success');
  if (ROLE !== 'admin' && typeof addNotification === 'function') {
    addNotification({
      targetRole: 'admin',
      title: 'New Material Published',
      message: `Teacher ${uploaderName} uploaded ${uploadCount > 1 ? `${uploadCount} handouts for "${s.subject}"` : `"${s.title.trim()}"`}.`,
      type: 'info'
    });
  }

  if (typeof updateApprovalBadge === 'function') updateApprovalBadge();

  // If inside subject or course was targeted, ensure activeSubjectSubTab routes to modules for admin
  if (activeSubjectFilter || s.course_id) {
    if (!activeSubjectFilter && s.course_id) {
      activeSubjectFilter = s.course_id;
    }
    activeSubjectSubTab = (ROLE === 'admin') ? 'modules' : 'uploads';
  } else if (ROLE === 'admin') {
    // For admin, reset filters so the newly uploaded handout appears immediately at the top
    materialsActiveTab = 'all';
    materialsStatusFilter = '';
    materialsSearchQuery = '';
    materialsCurrentPage = 1;
  }

  closeMaterialModal();
  renderMaterialsContainer();

  loadMaterialsFromDB().catch(() => {});
}

window.previewSubjectUploadedMaterial = previewSubjectUploadedMaterial;
window.deleteMaterial = deleteMaterial;
window.downloadMaterial = downloadMaterial;
