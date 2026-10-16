/* ── UI HELPERS, TOASTS, NOTIFICATIONS & ICONS ── */

const STRANDS = ['STEM', 'HUMSS', 'ABM', 'TVL'];
const GRADE_LEVELS = ['Grade 11', 'Grade 12'];

function sortSectionsNaturally(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const nameA = typeof a === 'string' ? a : (a?.name || '');
    const nameB = typeof b === 'string' ? b : (b?.name || '');
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });
}
window.sortSectionsNaturally = sortSectionsNaturally;

const DEFAULT_MANAGED_SECTIONS = [
  { id: 'sec-a', name: 'Section A', gradeLevel: 'Grade 11', strand: 'STEM', adviser: '', room: '' },
  { id: 'sec-b', name: 'Section B', gradeLevel: 'Grade 11', strand: 'HUMSS', adviser: '', room: '' },
  { id: 'sec-c', name: 'Section C', gradeLevel: 'Grade 12', strand: 'STEM', adviser: '', room: '' },
  { id: 'sec-d', name: 'Section D', gradeLevel: 'Grade 12', strand: 'ABM', adviser: '', room: '' }
];

let managedSections = (() => {
  try {
    const saved = localStorage.getItem('scholaria_managed_sections');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach(s => {
          if (s.room && (s.room.startsWith('Room 30') || s.room.startsWith('Room 40'))) s.room = '';
          if (s.adviser && s.adviser.startsWith('Adviser ')) s.adviser = '';
        });
        return sortSectionsNaturally(parsed);
      }
    }
  } catch (e) {
    console.warn('Could not read saved sections:', e);
  }
  return sortSectionsNaturally([...DEFAULT_MANAGED_SECTIONS]);
})();

function saveManagedSections() {
  try {
    managedSections = sortSectionsNaturally(managedSections);
    localStorage.setItem('scholaria_managed_sections', JSON.stringify(managedSections));
  } catch (e) {
    console.warn('Could not save sections to localStorage:', e);
  }
  syncSectionsArray();
}

let SECTIONS = sortSectionsNaturally(managedSections.filter(s => !s.isArchived)).map(s => s.name);

function syncSectionsArray() {
  SECTIONS.length = 0;
  sortSectionsNaturally(managedSections.filter(s => !s.isArchived)).forEach(s => SECTIONS.push(s.name));
}


function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.className = `toast ${type} show`;
  toast.innerHTML = `<span class="toast-icon">${type === 'success' ? iconCheck() : type === 'error' ? iconAlert() : iconInfo()}</span><span>${escHtml(msg)}</span>`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initialsFor(fullName) {
  if (!fullName) return '?';
  const parts = fullName.replace(',', '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

/* ── STRICT TEXTBOX VALIDATION & DATABASE PROTECTION ENGINE (SYSTEM-WIDE) ── */

/**
 * Categorizes inputs across the system:
 * 1. Search bars: Focus on main titles / variables, unrestricted character set, capped at 100 max chars.
 * 2. Number-only inputs: Phone, capacity, LRN, age, percent, etc. Blocks non-digits and caps length (e.g. phone: 11, capacity: 4).
 * 3. Letter-only inputs: First name, last name, middle initial, etc. Blocks numbers & symbols, caps name length.
 * 4. General text / Textareas: Strictly caps length to prevent database overflow (e.g. typing a hundred 9s or huge spam strings).
 */

function isSearchInputField(el) {
  if (!el || !el.tagName) return false;
  if (el.type === 'search') return true;
  const idStr = (el.id || '').toLowerCase();
  const classStr = (el.className || '').toLowerCase();
  const placeholderStr = (el.placeholder || '').toLowerCase();
  const nameStr = (el.name || '').toLowerCase();
  return idStr.includes('search') || classStr.includes('search') || placeholderStr.includes('search') ||
         idStr.includes('filter') || classStr.includes('filter') || placeholderStr.includes('filter') ||
         nameStr.includes('search') || nameStr.includes('query');
}

function isNumberOnlyInputField(el) {
  if (!el || !el.tagName) return false;
  if (isSearchInputField(el)) return false;
  if (el.type === 'number' || el.inputMode === 'numeric') return true;
  if (el.dataset && el.dataset.type === 'number') return true;
  const idStr = (el.id || '').toLowerCase();
  const classStr = (el.className || '').toLowerCase();
  const placeholderStr = (el.placeholder || '').toLowerCase();
  const nameStr = (el.name || '').toLowerCase();
  
  const numKeywords = ['phone', 'mobile', 'contact', 'lrn', 'capacity', 'seats', 'score', 'points', 'age', 'year', 'qty', 'count', 'limit', 'duration', 'percent', 'pct'];
  return numKeywords.some(kw => idStr.includes(kw) || classStr.includes(kw) || placeholderStr.includes(kw) || nameStr.includes(kw));
}

function isLetterOnlyInputField(el) {
  if (!el || !el.tagName) return false;
  if (isSearchInputField(el)) return false;
  if (el.dataset && (el.dataset.type === 'alphanumeric' || el.dataset.type === 'text' || el.dataset.type === 'any')) return false;
  if (el.dataset && el.dataset.type === 'letters') return true;
  const idStr = (el.id || '').toLowerCase();
  const classStr = (el.className || '').toLowerCase();
  const placeholderStr = (el.placeholder || '').toLowerCase();
  const nameStr = (el.name || '').toLowerCase();
  
  // Explicit exemptions: Room names, building names, sections, subjects, titles, codes allow numbers
  if (idStr.includes('room') || idStr.includes('building') || idStr.includes('rfname') || idStr.includes('section') || idStr.includes('course') || idStr.includes('subject') || idStr.includes('title')) return false;
  if (idStr.includes('username') || idStr.includes('user_id') || idStr.includes('school_id')) return false;
  
  // Specific letter-only keywords for person names
  const letterKeywords = ['firstname', 'first_name', 'lastname', 'last_name', 'middlename', 'middle_name', 'middleinitial', 'middle_initial', 'initial', 'advisercustom', 'adviser_custom', 'author_name'];
  const hasExactShortName = ['fname', 'lname', 'mname'].some(k => idStr === k || nameStr === k || idStr.endsWith('_' + k) || idStr.endsWith('-' + k));
  return hasExactShortName || letterKeywords.some(kw => idStr.includes(kw) || classStr.includes(kw) || placeholderStr.includes(kw) || nameStr.includes(kw));
}

function getSafeMaxInputLimit(el) {
  if (isSearchInputField(el)) return 100;
  if (isNumberOnlyInputField(el)) {
    const idStr = (el.id || '').toLowerCase();
    const placeholderStr = (el.placeholder || '').toLowerCase();
    if (idStr.includes('phone') || idStr.includes('mobile') || idStr.includes('contact') || placeholderStr.includes('09')) return 11;
    if (idStr.includes('lrn')) return 12;
    if (idStr.includes('age') || idStr.includes('percent') || idStr.includes('pct')) return 3;
    if (idStr.includes('year')) return 4;
    if (idStr.includes('capacity') || idStr.includes('seats')) return 4; // up to 9999
    if (idStr.includes('score') || idStr.includes('points') || idStr.includes('duration')) return 5;
    return 8; // generic number max 8 to prevent typing a hundred 9's
  }
  if (isLetterOnlyInputField(el)) {
    const idStr = (el.id || '').toLowerCase();
    if (idStr.includes('initial') || idStr.includes('mi')) return 4;
    return 40;
  }
  if (el.tagName === 'TEXTAREA') return 1000;
  const type = (el.type || 'text').toLowerCase();
  if (type === 'email') return 80;
  if (type === 'password') return 64;
  return 100;
}

/**
 * Universal Keydown Interceptor
 */
function handleUniversalKeydown(e) {
  const el = e.target;
  if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
  if (el.readOnly || el.disabled || el.type === 'checkbox' || el.type === 'radio' || el.type === 'file' || el.type === 'button' || el.type === 'submit') return;

  const isNav = e.ctrlKey || e.altKey || e.metaKey || ['Backspace', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End', 'Escape'].includes(e.key);

  // 1. NUMBER-ONLY INPUTS: block any non-digit
  if (isNumberOnlyInputField(el)) {
    if (!isNav && !/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
  }

  // 2. LETTER-ONLY INPUTS: block numbers and special symbols
  if (isLetterOnlyInputField(el)) {
    if (!isNav && !/^[a-zA-Z\sñÑ\-.]+$/.test(e.key)) {
      e.preventDefault();
      return;
    }
  }

  // 3. ENFORCE SAFE MAX LIMIT: avoid database overflow (e.g. holding key for hundred 9s)
  if (!isNav && el.value) {
    const max = getSafeMaxInputLimit(el);
    const hasSelection = typeof el.selectionStart === 'number' && el.selectionEnd > el.selectionStart;
    if (!hasSelection && el.value.length >= max) {
      e.preventDefault();
    }
  }
}

/**
 * Universal Input / Paste Sanitizer
 */
function handleUniversalSanitize(e) {
  const el = e.target;
  if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
  if (el.readOnly || el.disabled || el.type === 'checkbox' || el.type === 'radio' || el.type === 'file') return;

  const max = getSafeMaxInputLimit(el);
  let val = el.value || '';

  if (isNumberOnlyInputField(el)) {
    const cleaned = val.replace(/\D/g, '');
    val = cleaned.slice(0, max);
    if (el.value !== val) el.value = val;
    return;
  }

  if (isLetterOnlyInputField(el)) {
    const cleaned = val.replace(/[^a-zA-Z\sñÑ\-.]/g, '');
    val = cleaned.slice(0, max);
    if (el.value !== val) el.value = val;
    return;
  }

  if (val.length > max) {
    el.value = val.slice(0, max);
  }
}

// Attach universal listeners globally
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', handleUniversalKeydown, true);
  document.addEventListener('input', handleUniversalSanitize, true);
  document.addEventListener('paste', () => setTimeout(() => handleUniversalSanitize({ target: document.activeElement }), 0), true);
}

/**
 * Legacy standalone helpers for direct inline attributes
 */
function allowLettersOnly(e) {
  if (e.ctrlKey || e.altKey || e.metaKey || ['Backspace', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'].includes(e.key)) return true;
  if (!/^[a-zA-Z\sñÑ\-.]+$/.test(e.key)) { e.preventDefault(); return false; }
  return true;
}

function sanitizeNameInput(el) {
  if (!el) return;
  const original = el.value;
  const cleaned = original.replace(/[^a-zA-Z\sñÑ\-.]/g, '');
  if (original !== cleaned) el.value = cleaned;
}

function allowDigitsOnly(e) {
  if (e.ctrlKey || e.altKey || e.metaKey || ['Backspace', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'].includes(e.key)) return true;
  if (!/^[0-9]$/.test(e.key)) { e.preventDefault(); return false; }
  return true;
}

function sanitizePhoneInput(el) {
  if (!el) return;
  let digits = el.value.replace(/\D/g, '');
  if (digits.length > 11) digits = digits.slice(0, 11);
  if (el.value !== digits) el.value = digits;
}

function isValidPhilippineMobile(num) {
  if (!num) return false;
  const clean = String(num).trim().replace(/\D/g, '');
  return /^09\d{9}$/.test(clean);
}

function validatePhoneField(el, errId) {
  if (!el) return true;
  const val = (el.value || '').trim();
  const errEl = document.getElementById(errId);
  if (!val) {
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    el.classList.remove('input-err-active');
    return true;
  }
  const valid = isValidPhilippineMobile(val);
  if (!valid) {
    if (errEl) {
      errEl.textContent = 'Must be exactly 11 digits starting with 09 (e.g. 09123456789)';
      errEl.style.display = 'block';
    }
    el.classList.add('input-err-active');
    return false;
  } else {
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    el.classList.remove('input-err-active');
    return true;
  }
}

/**
 * Splits a full name string into First Name, Middle Name, Last Name, and Suffix parts.
 * Matching the User Management schema: First Name, Middle Name, Last Name, Suffix.
 */
function parseFullNameParts(fullName) {
  if (!fullName) return { firstName: '', middleName: '', lastName: '', suffix: '', middleInitial: '' };
  const str = String(fullName).trim();

  // Common suffixes in the Philippines & internationally
  const KNOWN_SUFFIXES = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']);

  let suffix = '';

  // Case 1: Comma-separated format: "Aquino, Amara Abigail" or "Dela Cruz, Juan Mercado Jr."
  if (str.includes(',')) {
    const parts = str.split(',').map(s => s.trim()).filter(Boolean);
    const lastNamePart = parts[0] || '';
    let firstMiddlePart = parts.slice(1).join(' ').trim();

    const tokens = firstMiddlePart.split(/\s+/).filter(Boolean);
    if (tokens.length > 1 && KNOWN_SUFFIXES.has(tokens[tokens.length - 1].toUpperCase().replace(',', ''))) {
      suffix = tokens.pop();
    }
    let firstName = '';
    let middleName = '';
    if (tokens.length === 1) {
      firstName = tokens[0];
    } else if (tokens.length === 2) {
      firstName = tokens[0];
      middleName = tokens[1];
    } else if (tokens.length >= 3) {
      firstName = tokens.slice(0, -1).join(' ');
      middleName = tokens[tokens.length - 1];
    }
    const middleInitial = middleName ? middleName.replace('.', '')[0]?.toUpperCase() || '' : '';
    return { firstName, middleName, lastName: lastNamePart, suffix, middleInitial };
  }

  // Case 2: Space-separated format: "Amara Abigail Aquino" or "Juan Mercado Dela Cruz Jr."
  const words = str.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { firstName: '', middleName: '', lastName: '', suffix: '', middleInitial: '' };
  if (words.length === 1) return { firstName: words[0], middleName: '', lastName: '', suffix: '', middleInitial: '' };

  // 1. Extract suffix if last word is a known suffix
  if (words.length > 2 && KNOWN_SUFFIXES.has(words[words.length - 1].toUpperCase().replace('.', ''))) {
    suffix = words.pop();
  }

  if (words.length === 2) {
    // "Maria Santos" -> firstName: Maria, middleName: "", lastName: Santos
    return { firstName: words[0], middleName: '', lastName: words[1], suffix, middleInitial: '' };
  }

  // 2. Check for compound Philippine surnames (e.g. "Dela Cruz", "De Los Santos", "San Juan", "Santa Maria")
  let lastName = '';
  let middleName = '';
  let firstName = '';

  const upperStr = words.map(w => w.toUpperCase());
  let matchedCompound = false;

  if (words.length >= 5 && upperStr[words.length - 3] === 'DE' && upperStr[words.length - 2] === 'LOS') {
    lastName = words.slice(words.length - 3).join(' ');
    words.splice(words.length - 3, 3);
    matchedCompound = true;
  } else if (words.length >= 4 && ['DELA', 'DE', 'SAN', 'SANTA', 'SANTO', 'STA.', 'STO.'].includes(upperStr[words.length - 2])) {
    lastName = words.slice(words.length - 2).join(' ');
    words.splice(words.length - 2, 2);
    matchedCompound = true;
  }

  if (matchedCompound) {
    if (words.length === 1) {
      firstName = words[0];
    } else if (words.length === 2) {
      firstName = words[0];
      middleName = words[1];
    } else {
      firstName = words.slice(0, -1).join(' ');
      middleName = words[words.length - 1];
    }
    const middleInitial = middleName ? middleName.replace('.', '')[0]?.toUpperCase() || '' : '';
    return { firstName, middleName, lastName, suffix, middleInitial };
  }

  // 3. Exactly 3 words: e.g. "Amara Abigail Aquino" -> firstName: "Amara", middleName: "Abigail", lastName: "Aquino"
  if (words.length === 3) {
    firstName = words[0];
    middleName = words[1];
    lastName = words[2];
    const middleInitial = middleName ? middleName.replace('.', '')[0]?.toUpperCase() || '' : '';
    return { firstName, middleName, lastName, suffix, middleInitial };
  }

  // 4. 4 or more words: e.g. "Maria Clara Lopez Santos"
  // Surnames is last word, middle name is second to last word, first name is all preceding words
  firstName = words.slice(0, words.length - 2).join(' ');
  middleName = words[words.length - 2];
  lastName = words[words.length - 1];
  const middleInitial = middleName ? middleName.replace('.', '')[0]?.toUpperCase() || '' : '';
  return { firstName, middleName, lastName, suffix, middleInitial };
}

/**
 * Assembles First Name, Middle Name, Last Name, and Suffix into a standardized Full Name.
 */
function assembleFullName(firstName, middleName, lastName, suffix) {
  // Support legacy 3-parameter call: assembleFullName(first, last, mi)
  if (arguments.length === 3 && typeof lastName === 'string' && typeof middleName === 'string') {
    const isLegacyMi = (middleName.length > 2 && lastName.length <= 2) || (lastName.endsWith('.') && lastName.length <= 3);
    if (isLegacyMi) {
      const f = (firstName || '').trim();
      const l = (middleName || '').trim();
      let mi = (lastName || '').trim().toUpperCase().replace('.', '');
      if (mi) mi = mi + '.';
      return [f, mi, l].filter(Boolean).join(' ');
    }
  }
  const f = (firstName || '').trim();
  const m = (middleName || '').trim();
  const l = (lastName || '').trim();
  const s = (suffix || '').trim();
  return [f, m, l, s].filter(Boolean).join(' ');
}



/* ── SVG ICONS ── */
function iconCheck()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`; }
function iconAlert()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`; }
function iconInfo()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`; }

function iconHome()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`; }
function iconFolder()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`; }
function iconQuiz()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`; }
function iconProgress(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`; }
function iconChat()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`; }
function iconProfile() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`; }
function iconChart()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`; }
function iconRecord()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`; }
function iconApproval(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`; }
function iconSections(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`; }
function iconRooms()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 7v14M21 7v14M6 21V10a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11M10 14h4M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4"/></svg>`; }
function iconNotif()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`; }
function iconAnnouncement() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><line x1="9" y1="10" x2="15" y2="10"/></svg>`; }
function iconUsers()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`; }
function iconPlus()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`; }
function iconRefresh() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`; }
function iconSend()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`; }
function iconUpload()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`; }
function iconChip()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><line x1="9" y1="2" x2="9" y2="6"/><line x1="15" y1="2" x2="15" y2="6"/><line x1="9" y1="18" x2="9" y2="22"/><line x1="15" y1="18" x2="15" y2="22"/><line x1="2" y1="9" x2="6" y2="9"/><line x1="2" y1="15" x2="6" y2="15"/><line x1="18" y1="9" x2="22" y2="9"/><line x1="18" y1="15" x2="22" y2="15"/></svg>`; }
function iconGamepad() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="6"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="10.5" r="1"/><circle cx="18" cy="13.5" r="1"/></svg>`; }
function iconTrash()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`; }
function iconClose()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`; }
function iconDoc()     { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`; }
function iconMute()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`; }
function iconArchive()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`; }
function iconClock()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`; }
function iconCalendar() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`; }
function iconLightning(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`; }
function iconInfinity() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.178 8c5.096 0 5.096 8 0 8-2.67 0-4.664-1.9-6.178-4-1.514 2.1-3.508 4-6.178 4-5.096 0-5.096-8 0-8 2.67 0 4.664 1.9 6.178 4 1.514-2.1 3.508-4 6.178-4z"/></svg>`; }

async function logout() {
  if (typeof resetChatState === 'function') resetChatState();
  await db.auth.signOut();
  window.location.href = 'login.html';
}

/* ── GLOBAL SEARCH ENGINE (INSTANT REAL-TIME SEARCH) ── */
let globalSearchDebounceTimer = null;

function handleGlobalSearchFocus() {
  const input = document.getElementById('globalSearchInput');
  if (input && input.value.trim().length >= 1) {
    handleGlobalSearchInput(input.value);
  }
}

function clearGlobalSearch() {
  const input = document.getElementById('globalSearchInput');
  const clearBtn = document.getElementById('globalSearchClearBtn');
  const dropdown = document.getElementById('globalSearchResults');
  if (input) input.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  if (dropdown) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
  }
}

function handleGlobalSearchKeydown(e) {
  if (e.key === 'Escape') {
    clearGlobalSearch();
  } else if (e.key === 'Enter') {
    const input = document.getElementById('globalSearchInput');
    const q = (input ? input.value : '').trim().toLowerCase();
    if (!q) return;
    closeGlobalSearchDropdown();

    if (typeof currentPage !== 'undefined' && currentPage === 'materials') {
      const matInput = document.getElementById('materialsSearchInput');
      if (matInput) {
        matInput.value = q;
        if (typeof setMaterialsSearchQuery === 'function') setMaterialsSearchQuery(q);
      }
    } else if (typeof currentPage !== 'undefined' && currentPage === 'quizzes') {
      if (typeof studentQuizSearchQuery !== 'undefined') {
        studentQuizSearchQuery = q;
        if (typeof renderPage === 'function') renderPage('quizzes');
      }
    }
  }
}

function handleGlobalSearchInput(rawVal) {
  const clearBtn = document.getElementById('globalSearchClearBtn');
  const dropdown = document.getElementById('globalSearchResults');
  const query = (rawVal || '').trim().toLowerCase();

  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

  if (!query) {
    if (dropdown) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }
    return;
  }

  clearTimeout(globalSearchDebounceTimer);
  globalSearchDebounceTimer = setTimeout(() => {
    executeGlobalSearch(query);
  }, 120);
}

function executeGlobalSearch(query) {
  const dropdown = document.getElementById('globalSearchResults');
  if (!dropdown) return;

  const results = {
    courses: [],
    materials: [],
    quizzes: [],
    announcements: []
  };

  // 1. Courses & Subjects
  if (typeof COURSES_DATABASE !== 'undefined' && Array.isArray(COURSES_DATABASE)) {
    COURSES_DATABASE.forEach(c => {
      const t = (c.title || '').toLowerCase();
      const code = (c.code || '').toLowerCase();
      const inst = (c.instructor || '').toLowerCase();
      if (t.includes(query) || code.includes(query) || inst.includes(query)) {
        results.courses.push({
          id: c.id,
          title: c.title,
          sub: `${c.code} · ${c.instructor}`,
          action: `navigateToSubjectMaterials('${c.id}')`
        });
      }
    });
  }

  // 2. Learning Materials & PDFs
  const allMats = (typeof materialsData !== 'undefined' && Array.isArray(materialsData)) ? materialsData : [];
  allMats.forEach(m => {
    const t = (m.title || m.fileName || '').toLowerCase();
    const s = (m.subject || '').toLowerCase();
    if (t.includes(query) || s.includes(query)) {
      results.materials.push({
        id: m.id,
        title: m.title || m.fileName || 'Learning Handout',
        sub: `📄 ${m.subject || 'Material'} · ${m.file_type ? m.file_type.toUpperCase() : 'PDF'}`,
        action: `previewSubjectUploadedMaterial('${m.id}')`
      });
    }
  });

  // 3. Quizzes & Assessments
  const allQuizzes = (typeof customQuizzes !== 'undefined' && Array.isArray(customQuizzes)) ? customQuizzes : [];
  allQuizzes.forEach(q => {
    const t = (q.title || '').toLowerCase();
    const s = (q.subject || '').toLowerCase();
    if (t.includes(query) || s.includes(query)) {
      const isInter = q.type === 'interactive' || q.quiz_type === 'interactive';
      results.quizzes.push({
        id: q.id,
        title: q.title || 'Quiz Assessment',
        sub: `📝 ${q.subject || 'Quiz'} · ${isInter ? 'Interactive' : 'Standard'}`,
        action: isInter ? `openInteractiveQuiz('${q.id}')` : `openTakeQuizModal('${q.id}')`
      });
    }
  });

  // 4. Announcements
  const allAnc = typeof getStoredAnnouncements === 'function' ? getStoredAnnouncements() : [];
  allAnc.forEach(a => {
    if (a.isArchived || a.status === 'draft') return;
    const t = (a.title || '').toLowerCase();
    const msg = (a.message || '').toLowerCase();
    if (t.includes(query) || msg.includes(query)) {
      results.announcements.push({
        id: a.id,
        title: a.title,
        sub: `📢 ${a.category ? a.category.toUpperCase() : 'News'}`,
        action: `openAnnouncementDetailModal('${a.id}')`
      });
    }
  });

  const totalHits = results.courses.length + results.materials.length + results.quizzes.length + results.announcements.length;

  if (totalHits === 0) {
    dropdown.innerHTML = `
      <div style="padding:16px;text-align:center;color:#64748b;font-size:13px;">
        <div style="font-size:22px;margin-bottom:6px;">🔍</div>
        No matching courses, materials, or quizzes found for "<strong>${escHtml(query)}</strong>"
      </div>
    `;
    dropdown.style.display = 'block';
    return;
  }

  let html = '';

  if (results.courses.length) {
    html += `
      <div class="search-results-group">
        <div class="search-group-title">📚 Courses &amp; Subjects</div>
        ${results.courses.slice(0, 4).map(c => `
          <div class="search-item" onclick="${c.action}; closeGlobalSearchDropdown();">
            <div class="search-item-icon" style="background:#eff6ff;color:#2563eb;">📚</div>
            <div class="search-item-main">
              <div class="search-item-title">${escHtml(c.title)}</div>
              <div class="search-item-sub">${escHtml(c.sub)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (results.materials.length) {
    html += `
      <div class="search-results-group">
        <div class="search-group-title">📄 Materials &amp; PDFs</div>
        ${results.materials.slice(0, 4).map(m => `
          <div class="search-item" onclick="${m.action}; closeGlobalSearchDropdown();">
            <div class="search-item-icon" style="background:#f0fdf4;color:#16a34a;">📄</div>
            <div class="search-item-main">
              <div class="search-item-title">${escHtml(m.title)}</div>
              <div class="search-item-sub">${escHtml(m.sub)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (results.quizzes.length) {
    html += `
      <div class="search-results-group">
        <div class="search-group-title">📝 Quizzes &amp; Assessments</div>
        ${results.quizzes.slice(0, 4).map(q => `
          <div class="search-item" onclick="${q.action}; closeGlobalSearchDropdown();">
            <div class="search-item-icon" style="background:#ede9fe;color:#7c3aed;">📝</div>
            <div class="search-item-main">
              <div class="search-item-title">${escHtml(q.title)}</div>
              <div class="search-item-sub">${escHtml(q.sub)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (results.announcements.length) {
    html += `
      <div class="search-results-group">
        <div class="search-group-title">📢 Announcements &amp; News</div>
        ${results.announcements.slice(0, 3).map(a => `
          <div class="search-item" onclick="${a.action}; closeGlobalSearchDropdown();">
            <div class="search-item-icon" style="background:#fee2e2;color:#dc2626;">📢</div>
            <div class="search-item-main">
              <div class="search-item-title">${escHtml(a.title)}</div>
              <div class="search-item-sub">${escHtml(a.sub)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  dropdown.innerHTML = html;
  dropdown.style.display = 'block';
}

function closeGlobalSearchDropdown() {
  const dropdown = document.getElementById('globalSearchResults');
  if (dropdown) dropdown.style.display = 'none';
}

function navigateToSubjectMaterials(courseId) {
  if (typeof setActiveSubjectMaterials === 'function') {
    setActiveSubjectMaterials(courseId);
  }
  if (typeof renderPage === 'function') {
    renderPage('materials');
  }
}

document.addEventListener('click', function(e) {
  const searchBar = document.getElementById('globalSearchBar');
  if (searchBar && !searchBar.contains(e.target)) {
    closeGlobalSearchDropdown();
  }
});

/* ── SEARCHABLE SUBJECT PICKER WITH TEXT HIGHLIGHTING ── */

if (typeof window.SUBJECTS_BY_STRAND === 'undefined') {
  window.SUBJECTS_BY_STRAND = {
    STEM: [
      'Pre-Calculus', 'Basic Calculus', 'General Biology 1', 'General Biology 2',
      'General Physics 1', 'General Physics 2', 'General Chemistry 1', 'General Chemistry 2',
      'Empowerment Technologies (ICT)', 'Earth and Life Science', 'Oral Communication in Context',
      'Media & Information Literacy', 'Practical Research 1', 'Practical Research 2',
      'Reading and Writing', 'Statistics and Probability', 'Physical Science'
    ],
    HUMSS: [
      'Creative Writing', 'Creative Nonfiction', 'Philippine Politics and Governance',
      'Disciplines and Ideas in the Social Sciences', 'Disciplines and Ideas in the Applied Social Sciences',
      'Community Engagement, Solidarity and Citizenship', 'Trends, Networks, and Critical Thinking in the 21st Century',
      'Introduction to World Religions and Belief Systems', 'Understanding Culture, Society and Politics',
      'Oral Communication in Context', 'Reading and Writing Skills', 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
      '21st Century Literature from the Philippines and the World'
    ],
    ABM: [
      'Applied Economics', 'Business Ethics and Social Responsibility', 'Fundamentals of Accountancy, Business and Management 1',
      'Fundamentals of Accountancy, Business and Management 2', 'Business Math', 'Business Finance',
      'Organization and Management', 'Principles of Marketing', 'Business Enterprise Simulation'
    ],
    TVL: [
      'Computer Systems Servicing', 'Technical Drafting', 'Food and Beverage Services',
      'Bread and Pastry Production', 'Cookery', 'Shielded Metal Arc Welding',
      'Electrical Installation and Maintenance', 'Tourism Promotion Services'
    ]
  };
}

function getCurriculumSubjectsList() {
  const subjectsSet = new Set();
  if (typeof window.COURSES_DATABASE !== 'undefined' && Array.isArray(window.COURSES_DATABASE)) {
    window.COURSES_DATABASE.forEach(c => {
      if (c && c.title) subjectsSet.add(c.title);
    });
  }
  if (typeof window.SUBJECTS_BY_STRAND !== 'undefined') {
    Object.values(window.SUBJECTS_BY_STRAND).forEach(list => {
      if (Array.isArray(list)) list.forEach(s => subjectsSet.add(s));
    });
  }
  if (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE && CURRENT_PROFILE.subjects) {
    CURRENT_PROFILE.subjects.split(',').map(s => s.trim()).filter(Boolean).forEach(s => subjectsSet.add(s));
  }
  return Array.from(subjectsSet).sort((a, b) => a.localeCompare(b));
}
window.getCurriculumSubjectsList = getCurriculumSubjectsList;

function highlightTextMatch(text, query) {
  if (!text) return '';
  if (!query || !query.trim()) return (typeof escHtml === 'function') ? escHtml(text) : text;
  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${q})`, 'gi');
  const parts = String(text).split(regex);
  const escapeFn = typeof escHtml === 'function' ? escHtml : (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return parts.map(part => {
    if (part.toLowerCase() === query.trim().toLowerCase()) {
      return `<mark class="subj-match-highlight">${escapeFn(part)}</mark>`;
    }
    return escapeFn(part);
  }).join('');
}
window.highlightTextMatch = highlightTextMatch;

window._sspRegistries = window._sspRegistries || {};

function renderSearchableSubjectPicker({
  id,
  inputId,
  value = '',
  options = [],
  placeholder = 'Select from dropdown or search subject...',
  onSelect = ''
}) {
  const pickerId = id || 'ssp_' + Math.random().toString(36).substr(2, 7);
  const targetInputId = inputId || `${pickerId}_input`;
  const escapeFn = typeof escHtml === 'function' ? escHtml : (s) => String(s);

  // Register in global registry
  window._sspRegistries[pickerId] = {
    options: Array.isArray(options) ? options : [],
    onSelect,
    inputId: targetInputId
  };

  return `
  <div class="searchable-subject-picker" id="${pickerId}_wrap" data-picker-id="${pickerId}">
    <div class="ssp-input-group">
      <input type="text"
        id="${targetInputId}"
        class="ssp-input"
        placeholder="${escapeFn(placeholder)}"
        value="${escapeFn(value)}"
        autocomplete="off"
        spellcheck="false"
        onfocus="sspOpenDropdown('${pickerId}')"
        oninput="sspOnInput('${pickerId}', this.value)"
        onkeydown="sspOnKeyDown(event, '${pickerId}')"
      />
      <div class="ssp-actions">
        <button type="button" class="ssp-btn ssp-search-btn" title="Search subjects with highlight" onclick="sspSearchClick('${pickerId}')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </button>
        <button type="button" class="ssp-btn ssp-toggle-btn" title="Browse subject options dropdown" onclick="sspToggleDropdown('${pickerId}')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
    </div>
    <div class="ssp-dropdown scholaria-custom-scroll" id="${pickerId}_dropdown" role="listbox"></div>
  </div>`;
}
window.renderSearchableSubjectPicker = renderSearchableSubjectPicker;

function sspGetRegistry(pickerId) {
  return window._sspRegistries[pickerId] || { options: [], onSelect: '', inputId: `${pickerId}_input` };
}

function sspPopulateDropdown(pickerId, query = '') {
  const reg = sspGetRegistry(pickerId);
  const dropdown = document.getElementById(`${pickerId}_dropdown`);
  if (!dropdown) return;

  const currentVal = (document.getElementById(reg.inputId)?.value || '').trim().toLowerCase();
  const qClean = (query || '').trim().toLowerCase();

  let filtered = reg.options;
  if (qClean) {
    filtered = reg.options.filter(opt => (opt || '').toLowerCase().includes(qClean));
  }

  if (!filtered.length) {
    dropdown.innerHTML = `<div class="ssp-empty">No matching subjects found for "<strong>${typeof escHtml === 'function' ? escHtml(query) : query}</strong>"</div>`;
    return;
  }

  const escapeFn = typeof escHtml === 'function' ? escHtml : (s) => String(s);
  dropdown.innerHTML = filtered.map(opt => {
    const isSelected = opt.toLowerCase() === currentVal;
    const highlightedLabel = highlightTextMatch(opt, query);
    return `
      <div class="ssp-option ${isSelected ? 'selected' : ''}" role="option" onclick="sspSelectOption('${pickerId}', '${escapeFn(opt.replace(/'/g, "\\'"))}')">
        <span>${highlightedLabel}</span>
        ${isSelected ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" stroke-width="3" style="pointer-events:none;"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>
    `;
  }).join('');
}

function sspOpenDropdown(pickerId) {
  const dropdown = document.getElementById(`${pickerId}_dropdown`);
  if (!dropdown) return;
  const input = document.getElementById(sspGetRegistry(pickerId).inputId);
  const val = input ? input.value : '';
  sspPopulateDropdown(pickerId, val);
  dropdown.classList.add('open');
}
window.sspOpenDropdown = sspOpenDropdown;

function sspCloseDropdown(pickerId) {
  const dropdown = document.getElementById(`${pickerId}_dropdown`);
  if (dropdown) dropdown.classList.remove('open');
}
window.sspCloseDropdown = sspCloseDropdown;

function sspToggleDropdown(pickerId) {
  const dropdown = document.getElementById(`${pickerId}_dropdown`);
  if (!dropdown) return;
  if (dropdown.classList.contains('open')) {
    sspCloseDropdown(pickerId);
  } else {
    // When clicking dropdown toggle, show all options
    sspPopulateDropdown(pickerId, '');
    dropdown.classList.add('open');
    const input = document.getElementById(sspGetRegistry(pickerId).inputId);
    if (input) input.focus();
  }
}
window.sspToggleDropdown = sspToggleDropdown;

function sspSearchClick(pickerId) {
  const reg = sspGetRegistry(pickerId);
  const input = document.getElementById(reg.inputId);
  if (input) input.focus();
  const val = input ? input.value : '';
  sspPopulateDropdown(pickerId, val);
  const dropdown = document.getElementById(`${pickerId}_dropdown`);
  if (dropdown) dropdown.classList.add('open');
}
window.sspSearchClick = sspSearchClick;

function sspOnInput(pickerId, val) {
  sspPopulateDropdown(pickerId, val);
  const dropdown = document.getElementById(`${pickerId}_dropdown`);
  if (dropdown) dropdown.classList.add('open');

  const reg = sspGetRegistry(pickerId);
  if (reg.onSelect) {
    if (typeof reg.onSelect === 'function') {
      reg.onSelect(val);
    } else if (typeof window[reg.onSelect] === 'function') {
      window[reg.onSelect](val);
    }
  }
}
window.sspOnInput = sspOnInput;

function sspSelectOption(pickerId, value) {
  const reg = sspGetRegistry(pickerId);
  const input = document.getElementById(reg.inputId);
  if (input) {
    input.value = value;
  }
  sspCloseDropdown(pickerId);

  if (reg.onSelect) {
    if (typeof reg.onSelect === 'function') {
      reg.onSelect(value);
    } else if (typeof window[reg.onSelect] === 'function') {
      window[reg.onSelect](value);
    }
  }
}
window.sspSelectOption = sspSelectOption;

function sspOnKeyDown(e, pickerId) {
  if (e.key === 'Escape') {
    sspCloseDropdown(pickerId);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const dropdown = document.getElementById(`${pickerId}_dropdown`);
    if (dropdown && dropdown.classList.contains('open')) {
      const firstOpt = dropdown.querySelector('.ssp-option');
      if (firstOpt) {
        firstOpt.click();
      } else {
        sspCloseDropdown(pickerId);
      }
    }
  }
}
window.sspOnKeyDown = sspOnKeyDown;

document.addEventListener('click', function(e) {
  document.querySelectorAll('.searchable-subject-picker').forEach(wrap => {
    if (!wrap.contains(e.target)) {
      const dropdown = wrap.querySelector('.ssp-dropdown');
      if (dropdown) dropdown.classList.remove('open');
    }
  });
});


