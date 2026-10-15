/* ═══════════════════════════════════════════════════════════════
   ROOM MANAGEMENT & SECTION SCHEDULING ENGINE
   Strictly AM / PM Time System with Conflict Prevention
   ═══════════════════════════════════════════════════════════════ */

const ROOMS_STORAGE_KEY = 'scholaria_managed_rooms';

const DEFAULT_MANAGED_ROOMS = [];

let managedRooms = (() => {
  try {
    const raw = localStorage.getItem(ROOMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out legacy placeholder seeds
        return parsed.filter(r => !['room-301', 'room-302', 'room-401', 'room-402', 'room-avr', 'room-comlab1'].includes(r.id));
      }
    }
  } catch (e) {
    console.warn('Could not read saved rooms:', e);
  }
  return [];
})();

function saveManagedRooms() {
  try {
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(managedRooms));
  } catch (e) {
    console.warn('Could not save rooms:', e);
  }
}

/* ── 12-HOUR AM / PM TIME CATALOG (STRICTLY NO MILITARY TIME) ── */
const AM_PM_TIME_OPTIONS = [
  '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
  '07:00 PM', '07:30 PM', '08:00 PM'
];

const SCHEDULE_DAYS_OPTIONS = [
  'Monday - Friday',
  'Mon / Wed / Fri',
  'Tue / Thu',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
  'Weekend (Sat - Sun)',
  'Daily (Mon - Sat)',
  'Daily (Mon - Sun)'
];

let currentSelectedScheduleDays = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

function extractDaySet(pat) {
  const s = new Set();
  if (!pat) return s;
  const str = String(pat).trim().toLowerCase();

  if (str.includes('daily') || str.includes('everyday') || str.includes('mon - sun') || str.includes('mon-sun')) {
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(d => s.add(d));
    return s;
  }
  if (str.includes('mon - sat') || str.includes('monday - saturday') || str.includes('mon-sat')) {
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].forEach(d => s.add(d));
    return s;
  }
  if (str.includes('mon - fri') || str.includes('monday - friday') || str.includes('weekdays') || str.includes('mon-fri')) {
    ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(d => s.add(d));
  }
  if (str.includes('weekend') || str.includes('sat - sun') || str.includes('saturday - sunday') || str.includes('sat-sun')) {
    ['sat', 'sun'].forEach(d => s.add(d));
  }

  const dayTokens = [
    { key: 'mon', regex: /\b(mon|monday)\b/i },
    { key: 'tue', regex: /\b(tue|tues|tuesday)\b/i },
    { key: 'wed', regex: /\b(wed|wednesday)\b/i },
    { key: 'thu', regex: /\b(thu|thur|thurs|thursday)\b/i },
    { key: 'fri', regex: /\b(fri|friday)\b/i },
    { key: 'sat', regex: /\b(sat|saturday)\b/i },
    { key: 'sun', regex: /\b(sun|sunday)\b/i }
  ];

  dayTokens.forEach(item => {
    if (item.regex.test(str)) s.add(item.key);
  });

  if (s.size === 0) {
    ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(d => s.add(d));
  }
  return s;
}

function getFormattedScheduleDaysString(daySet) {
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const activeList = allDays.filter(d => daySet.has(d));

  if (activeList.length === 0) return 'Monday - Friday';
  if (activeList.length === 7) return 'Daily (Mon - Sun)';

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const isWeekdays = weekdays.length === activeList.length && weekdays.every(d => daySet.has(d));
  if (isWeekdays) return 'Monday - Friday';

  const mwf = ['Monday', 'Wednesday', 'Friday'];
  const isMwf = mwf.length === activeList.length && mwf.every(d => daySet.has(d));
  if (isMwf) return 'Mon / Wed / Fri';

  const tth = ['Tuesday', 'Thursday'];
  const isTth = tth.length === activeList.length && tth.every(d => daySet.has(d));
  if (isTth) return 'Tue / Thu';

  const weekend = ['Saturday', 'Sunday'];
  const isWeekend = weekend.length === activeList.length && weekend.every(d => daySet.has(d));
  if (isWeekend) return 'Weekend (Sat - Sun)';

  if (activeList.length === 6 && !daySet.has('Sunday')) return 'Daily (Mon - Sat)';

  if (activeList.length === 1) return activeList[0];

  return activeList.map(d => d.slice(0, 3)).join(', ');
}

const ROOM_TYPES = [
  'Lecture Classroom',
  'Science Laboratory',
  'Computer Laboratory',
  'Audio-Visual Hall',
  'Demonstration Room',
  'Conference Room'
];

/**
 * Converts 12-hour AM/PM string (e.g., "08:30 AM", "01:00 PM") into minutes from midnight.
 */
function parseAmPmToMinutes(timeStr) {
  if (!timeStr) return null;
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return hours * 60 + minutes;
}

/**
 * Checks whether two day-recurrence patterns share at least one common day.
 */
function doDaysOverlap(dayPatternA, dayPatternB) {
  if (!dayPatternA || !dayPatternB) return true;
  if (dayPatternA === dayPatternB) return true;

  const setA = extractDaySet(dayPatternA);
  const setB = extractDaySet(dayPatternB);

  for (const d of setA) {
    if (setB.has(d)) return true;
  }
  return false;
}

function getOverlappingDayNames(dayPatternA, dayPatternB) {
  const setA = extractDaySet(dayPatternA);
  const setB = extractDaySet(dayPatternB);
  const dayNamesMap = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const overlapping = [];
  for (const d of setA) {
    if (setB.has(d) && dayNamesMap[d]) overlapping.push(dayNamesMap[d]);
  }
  return overlapping;
}

/**
 * Strict Schedule Conflict Checker
 * Returns { hasConflict: boolean, message?: string }
 */
function checkScheduleConflict(roomId, sectionName, dayPattern, startTime, endTime, excludeScheduleId = null) {
  const startMin = parseAmPmToMinutes(startTime);
  const endMin = parseAmPmToMinutes(endTime);

  if (startMin === null || endMin === null) {
    return { hasConflict: true, message: 'Please select valid Start and End times in AM/PM format.' };
  }
  if (startMin >= endMin) {
    return { hasConflict: true, message: `Start time (${startTime}) must be strictly earlier than End time (${endTime}).` };
  }

  const room = managedRooms.find(r => r.id === roomId);
  if (!room) return { hasConflict: true, message: 'Selected room not found.' };

  // 1. Conflict Check: Is the ROOM already occupied by another section during overlapping times?
  for (const s of (room.schedule || [])) {
    if (excludeScheduleId && s.id === excludeScheduleId) continue;
    if (doDaysOverlap(dayPattern, s.day)) {
      const existingStart = parseAmPmToMinutes(s.startTime);
      const existingEnd = parseAmPmToMinutes(s.endTime);
      if (existingStart !== null && existingEnd !== null) {
        if (startMin < existingEnd && existingStart < endMin) {
          const overlapDays = getOverlappingDayNames(dayPattern, s.day);
          const overlapStr = overlapDays.length ? ` (overlaps on ${overlapDays.join(', ')})` : '';
          return {
            hasConflict: true,
            conflictType: 'room_occupied',
            message: `Schedule Conflict: Room "${room.name}" is already occupied by ${s.sectionName} (${s.subject || 'Class'}) from ${s.startTime} to ${s.endTime} on ${s.day}${overlapStr}. Please select another time or adjust the schedule.`
          };
        }
      }
    }
  }

  // 2. Conflict Check: Is THIS SECTION already scheduled in ANY other room during overlapping times?
  for (const otherRoom of managedRooms) {
    for (const s of (otherRoom.schedule || [])) {
      if (excludeScheduleId && s.id === excludeScheduleId) continue;
      if ((s.sectionName || '').trim().toLowerCase() === (sectionName || '').trim().toLowerCase()) {
        if (doDaysOverlap(dayPattern, s.day)) {
          const existingStart = parseAmPmToMinutes(s.startTime);
          const existingEnd = parseAmPmToMinutes(s.endTime);
          if (existingStart !== null && existingEnd !== null) {
            if (startMin < existingEnd && existingStart < endMin) {
              const overlapDays = getOverlappingDayNames(dayPattern, s.day);
              const overlapStr = overlapDays.length ? ` (overlaps on ${overlapDays.join(', ')})` : '';
              return {
                hasConflict: true,
                conflictType: 'section_busy',
                message: `Schedule Conflict: "${sectionName}" is already scheduled in ${otherRoom.name} from ${s.startTime} to ${s.endTime} on ${s.day}${overlapStr}. A section cannot be in two rooms at the same time.`
              };
            }
          }
        }
      }
    }
  }

  return { hasConflict: false };
}

/* ── UI STATE & RENDERING ENGINE ── */
let roomSearchQuery = '';
let roomTypeFilter = '';
let roomStatusFilter = ''; // '' | 'available' | 'occupied'

function setRoomFilter(type, val) {
  if (type === 'search') roomSearchQuery = val;
  if (type === 'type') roomTypeFilter = val;
  if (type === 'status') roomStatusFilter = val;
  const grid = document.getElementById('roomsCardsGridWrap');
  if (grid) grid.innerHTML = renderRoomCards();
}

/**
 * Main Tab Content for Admin "Rooms"
 */
function renderRoomsTabContent() {
  const activeSections = (typeof managedSections !== 'undefined' ? managedSections : []).filter(s => !s.isArchived);
  const totalRooms = managedRooms.length;
  const occupiedCount = managedRooms.filter(r => (r.schedule || []).length > 0).length;
  const availableCount = totalRooms - occupiedCount;

  return `
    <!-- ── STAT SUMMARY ROW ── -->
    <div class="rooms-stat-row">
      <div class="rooms-stat-card">
        <div class="rsc-icon" style="background:#eff6ff;color:#2563eb;">
          ${iconRooms()}
        </div>
        <div>
          <div class="rsc-num">${totalRooms}</div>
          <div class="rsc-label">Total Campus Rooms</div>
        </div>
      </div>
      <div class="rooms-stat-card">
        <div class="rsc-icon" style="background:#f0fdf4;color:#16a34a;">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
        </div>
        <div>
          <div class="rsc-num" style="color:#16a34a;">${availableCount}</div>
          <div class="rsc-label">Vacant / Unscheduled</div>
        </div>
      </div>
      <div class="rooms-stat-card">
        <div class="rsc-icon" style="background:#fff7ed;color:#ea580c;">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div>
          <div class="rsc-num" style="color:#ea580c;">${occupiedCount}</div>
          <div class="rsc-label">Rooms with Active Schedules</div>
        </div>
      </div>
    </div>

    <!-- ── DRAGGABLE SECTIONS TRAY (AESTHETIC HORIZONTAL SCROLLBAR) ── -->
    <div class="sec-tray-wrapper">
      <div class="sec-tray-hdr">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:13px;font-weight:700;color:var(--text-primary);">Class Sections Tray</span>
          <span class="sec-badge count">${activeSections.length} Sections Available</span>
        </div>
        <span style="font-size:11.5px;color:var(--text-muted);">
          🖐️ <strong>Drag & Drop</strong> any section pill into a room card below to instantly assign schedule
        </span>
      </div>
      <div class="sec-tray-scroll" id="sectionsDraggableTray">
        ${activeSections.length === 0 ? `
          <div style="font-size:12px;color:var(--text-muted);padding:8px 12px;">No active sections available. Please create a section first.</div>
        ` : activeSections.map(s => {
          const enrolled = (typeof registeredUsers !== 'undefined' ? registeredUsers : []).filter(u =>
            u.role === 'student' && (u.section || '').trim().toLowerCase() === (s.name || '').trim().toLowerCase()
          ).length;
          return `
            <div class="sec-drag-pill" draggable="true" ondragstart="handleSectionDragStart(event, '${escHtml(s.name)}')" title="Click or drag to assign to a room">
              <span class="sdp-handle">⋮⋮</span>
              <div class="sdp-info">
                <strong>${escHtml(s.name)}</strong>
                <span>${escHtml(s.strand || 'General')} · ${enrolled} Students</span>
              </div>
              <button type="button" class="sdp-assign-btn" onclick="openAssignSectionModal(null, '${escHtml(s.name)}')" title="Assign Section to Room">
                + Assign
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- ── ROOMS FILTER & SEARCH ROW ── -->
    <div class="user-search-row" style="margin-top:16px;">
      <div class="user-search-wrap">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="roomSearchInput" placeholder="Search rooms by name, building, or wing…" value="${escHtml(roomSearchQuery)}" oninput="setRoomFilter('search', this.value)">
      </div>

      <select class="user-filter-select" id="roomTypeFilterSelect" onchange="setRoomFilter('type', this.value)">
        <option value="">All Room Types</option>
        ${ROOM_TYPES.map(t => `<option value="${t}" ${roomTypeFilter === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>

      <select class="user-filter-select" id="roomStatusFilterSelect" onchange="setRoomFilter('status', this.value)">
        <option value="" ${!roomStatusFilter ? 'selected' : ''}>All Statuses</option>
        <option value="available" ${roomStatusFilter === 'available' ? 'selected' : ''}>Vacant / Unscheduled</option>
        <option value="occupied" ${roomStatusFilter === 'occupied' ? 'selected' : ''}>Scheduled</option>
      </select>
    </div>

    <!-- ── ROOMS CARDS GRID ── -->
    <div class="rooms-cards-grid" id="roomsCardsGridWrap">
      ${renderRoomCards()}
    </div>
  `;
}

function renderRoomCards() {
  const q = (roomSearchQuery || '').toLowerCase().trim();
  let list = managedRooms.filter(r => {
    const matchQ = !q || (r.name + ' ' + (r.building || '') + ' ' + (r.floor || '') + ' ' + (r.type || '')).toLowerCase().includes(q);
    const matchType = !roomTypeFilter || r.type === roomTypeFilter;
    const hasSched = (r.schedule || []).length > 0;
    const matchStatus = !roomStatusFilter ? true : roomStatusFilter === 'available' ? !hasSched : hasSched;
    return matchQ && matchType && matchStatus;
  });

  if (!list.length) {
    return `
      <div style="grid-column:1/-1;background:#fff;border:1.5px dashed var(--blue-light);border-radius:16px;padding:36px;text-align:center;color:var(--text-muted);">
        <div style="width:44px;height:44px;margin:0 auto 12px;color:var(--blue-mid);">${iconRooms()}</div>
        <h4 style="font-size:15px;color:var(--text-primary);margin-bottom:4px;">No Rooms Found</h4>
        <p style="font-size:13px;margin-bottom:16px;">${q ? `No room matches "${escHtml(q)}".` : 'No rooms match your filter criteria.'}</p>
        <button class="foot-btn-secondary" onclick="openCreateRoomModal()">${iconPlus()} Add New Room</button>
      </div>
    `;
  }

  return list.map(room => {
    const schedules = room.schedule || [];
    const isOccupied = schedules.length > 0;

    return `
      <div class="room-card" id="roomCard_${escHtml(room.id)}">
        <!-- Room Header -->
        <div class="rc-head">
          <div>
            <div class="rc-title-row">
              <h3 class="rc-name">${escHtml(room.name)}</h3>
              <span class="rc-badge-type">${escHtml(room.type || 'Lecture Room')}</span>
            </div>
            <div class="rc-location">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${escHtml(room.building || 'Main Campus')} · ${escHtml(room.floor || 'Floor 1')}</span>
            </div>
          </div>
          <div class="rc-capacity-badge" title="Maximum student capacity">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            ${room.capacity || 40} seats
          </div>
        </div>

        <!-- Drag & Drop Dropzone for Section Assignment -->
        <div class="rc-dropzone" ondragover="handleRoomDragOver(event)" ondragleave="handleRoomDragLeave(event)" ondrop="handleRoomDrop(event, '${escHtml(room.id)}')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Drop Section here to schedule</span>
        </div>

        <!-- Schedule Timeline List with Sleek Vertical Scrollbar -->
        <div class="rc-schedules-wrap">
          <div class="rc-sched-header">
            <span class="rc-sched-title">Assigned Schedules (${schedules.length})</span>
            ${isOccupied ? `<span class="rc-status-pill occupied">● Scheduled</span>` : `<span class="rc-status-pill available">● Vacant</span>`}
          </div>

          <div class="rc-sched-list">
            ${schedules.length === 0 ? `
              <div class="rc-sched-empty">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#94a3b8" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>No sections assigned to this room yet.</span>
              </div>
            ` : schedules.map(s => `
              <div class="rc-sched-item">
                <div class="rc-sched-time">
                  <span class="rc-time-tag">${escHtml(s.startTime)} – ${escHtml(s.endTime)}</span>
                  <span class="rc-days-tag">${escHtml(s.day || 'Mon - Fri')}</span>
                </div>
                <div class="rc-sched-body">
                  <div class="rc-sec-name">${escHtml(s.sectionName)}</div>
                  ${s.subject ? `<div class="rc-subj-name">${escHtml(s.subject)}</div>` : ''}
                </div>
                <button type="button" class="rc-sched-del" title="Remove schedule" onclick="removeSectionSchedulePrompt('${escHtml(room.id)}', '${escHtml(s.id)}', '${escHtml(s.sectionName)}')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Room Actions Footer -->
        <div class="rc-foot">
          <button type="button" class="rc-btn-assign" onclick="openAssignSectionModal('${escHtml(room.id)}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Assign Section
          </button>
          <div style="display:flex;gap:6px;">
            <button type="button" class="sec-btn-icon" title="Edit Room" onclick="openEditRoomModal('${escHtml(room.id)}')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button type="button" class="sec-btn-icon delete" title="Delete Room" onclick="deleteRoomPrompt('${escHtml(room.id)}')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ── DRAG AND DROP HANDLERS ── */
let currentDraggedSectionName = null;

function handleSectionDragStart(e, sectionName) {
  currentDraggedSectionName = sectionName;
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', sectionName);
    e.dataTransfer.effectAllowed = 'copy';
  }
}

function handleRoomDragOver(e) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  const target = e.currentTarget;
  if (target && !target.classList.contains('dragover')) {
    target.classList.add('dragover');
  }
}

function handleRoomDragLeave(e) {
  const target = e.currentTarget;
  if (target) target.classList.remove('dragover');
}

function handleRoomDrop(e, roomId) {
  e.preventDefault();
  const target = e.currentTarget;
  if (target) target.classList.remove('dragover');

  let sectionName = currentDraggedSectionName;
  if (e.dataTransfer) {
    const data = e.dataTransfer.getData('text/plain');
    if (data) sectionName = data;
  }

  if (roomId && sectionName) {
    openAssignSectionModal(roomId, sectionName);
  }
}

/* ── CREATE / EDIT ROOM MODAL ── */
let currentEditingRoomId = null;

function openCreateRoomModal() {
  currentEditingRoomId = null;
  const modal = document.getElementById('roomModal');
  if (!modal) return;
  document.getElementById('roomModalTitle').textContent = 'Create New Campus Room';
  document.getElementById('roomModalSubtitle').textContent = 'Register a lecture room, laboratory, or hall for scheduling';
  renderRoomModalForm({
    name: '',
    building: 'Main Academic Building',
    floor: '1st Floor',
    type: 'Lecture Classroom',
    capacity: 45
  });
  modal.classList.add('active');
}

function openEditRoomModal(roomId) {
  currentEditingRoomId = roomId;
  const room = managedRooms.find(r => r.id === roomId);
  if (!room) return;
  const modal = document.getElementById('roomModal');
  if (!modal) return;
  document.getElementById('roomModalTitle').textContent = 'Edit Room Details';
  document.getElementById('roomModalSubtitle').textContent = 'Update room name, capacity, and facility information';
  renderRoomModalForm(room);
  modal.classList.add('active');
}

function closeRoomModal() {
  const modal = document.getElementById('roomModal');
  if (modal) modal.classList.remove('active');
  currentEditingRoomId = null;
}

function renderRoomModalForm(r) {
  const body = document.getElementById('roomModalBody');
  const foot = document.getElementById('roomModalFoot');
  if (!body || !foot) return;

  body.innerHTML = `
    <div class="gen-field">
      <label>Room Name / Identifier *</label>
      <input type="text" id="rfName" data-type="alphanumeric" placeholder="e.g. Room 305, Science Lab 2, AVR" value="${escHtml(r.name || '')}" maxlength="40" required>
      <span style="font-size:11px;color:var(--text-muted);">Enter the official door designation or room name</span>
    </div>

    <div class="gen-row">
      <div class="gen-field">
        <label>Building / Wing *</label>
        <input type="text" id="rfBuilding" placeholder="e.g. Main Academic Building" value="${escHtml(r.building || 'Main Academic Building')}" maxlength="60" required>
      </div>
      <div class="gen-field">
        <label>Floor Level</label>
        <input type="text" id="rfFloor" placeholder="e.g. 3rd Floor" value="${escHtml(r.floor || '1st Floor')}" maxlength="30">
      </div>
    </div>

    <div class="gen-row">
      <div class="gen-field">
        <label>Room Type</label>
        <select id="rfType" class="user-filter-select" style="width:100%;">
          ${ROOM_TYPES.map(t => `<option value="${t}" ${r.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="gen-field">
        <label>Seating Capacity *</label>
        <input type="number" id="rfCapacity" placeholder="e.g. 45" value="${r.capacity || 45}" min="1" max="500" data-type="number" maxlength="4" required>
        <span style="font-size:11px;color:var(--text-muted);">Maximum students (Digits only, max 4 digits)</span>
      </div>
    </div>
  `;

  foot.innerHTML = `
    <button type="button" class="foot-btn-secondary" onclick="closeRoomModal()">Cancel</button>
    <button type="button" class="gen-btn" onclick="saveRoomForm()">${iconCheck()} Save Room</button>
  `;
}

function saveRoomForm() {
  const name = (document.getElementById('rfName')?.value || '').trim();
  const building = (document.getElementById('rfBuilding')?.value || '').trim() || 'Main Academic Building';
  const floor = (document.getElementById('rfFloor')?.value || '').trim() || '1st Floor';
  const type = document.getElementById('rfType')?.value || 'Lecture Classroom';
  const capacityRaw = document.getElementById('rfCapacity')?.value || '45';
  const capacity = parseInt(capacityRaw, 10) || 45;

  if (!name) {
    showToast('Please enter a Room Name', 'error');
    document.getElementById('rfName')?.focus();
    return;
  }

  // Duplicate name check
  const duplicate = managedRooms.find(r => r.name.toLowerCase() === name.toLowerCase() && r.id !== currentEditingRoomId);
  if (duplicate) {
    showToast(`A room named "${name}" already exists`, 'error');
    return;
  }

  if (currentEditingRoomId) {
    const idx = managedRooms.findIndex(r => r.id === currentEditingRoomId);
    if (idx !== -1) {
      managedRooms[idx] = {
        ...managedRooms[idx],
        name, building, floor, type, capacity
      };
      showToast(`Room "${name}" updated successfully!`, 'success');
    }
  } else {
    managedRooms.push({
      id: 'room-' + Date.now(),
      name, building, floor, type, capacity,
      schedule: []
    });
    showToast(`Room "${name}" created successfully!`, 'success');
  }

  saveManagedRooms();
  closeRoomModal();
  const wrap = document.getElementById('roomsCardsGridWrap');
  if (wrap) wrap.innerHTML = renderRoomCards();
}

function deleteRoomPrompt(roomId) {
  const room = managedRooms.find(r => r.id === roomId);
  if (!room) return;
  const schedCount = (room.schedule || []).length;
  const msg = schedCount > 0
    ? `Are you sure you want to delete "${room.name}"?\n\nThis room currently has ${schedCount} active section schedule(s) assigned to it.`
    : `Delete room "${room.name}"?`;

  if (confirm(msg)) {
    managedRooms = managedRooms.filter(r => r.id !== roomId);
    saveManagedRooms();
    showToast(`Room "${room.name}" deleted.`, 'info');
    const wrap = document.getElementById('roomsCardsGridWrap');
    if (wrap) wrap.innerHTML = renderRoomCards();
  }
}

/* ── ASSIGN SECTION TO ROOM MODAL (WITH AM / PM & CONFLICT DETECTION) ── */
let currentAssignTargetRoomId = null;
let currentAssignTargetSection = null;

function openAssignSectionModal(roomId = null, prefillSectionName = null, initialDayPattern = null) {
  currentAssignTargetRoomId = roomId;
  currentAssignTargetSection = prefillSectionName;

  currentSelectedScheduleDays.clear();
  if (initialDayPattern) {
    const parsed = extractDaySet(initialDayPattern);
    const dayMap = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
    parsed.forEach(k => { if (dayMap[k]) currentSelectedScheduleDays.add(dayMap[k]); });
  }
  if (currentSelectedScheduleDays.size === 0) {
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(d => currentSelectedScheduleDays.add(d));
  }

  const modal = document.getElementById('assignSectionRoomModal');
  if (!modal) return;

  document.getElementById('assignSectionRoomTitle').textContent = 'Assign Section Schedule';
  document.getElementById('assignSectionRoomSubtitle').textContent = 'Configure class schedule and room assignment with flexible day selection & AM/PM validation';

  renderAssignSectionModalForm();
  modal.classList.add('active');
}

function closeAssignSectionRoomModal() {
  const modal = document.getElementById('assignSectionRoomModal');
  if (modal) modal.classList.remove('active');
  currentAssignTargetRoomId = null;
  currentAssignTargetSection = null;
}

function renderAssignSectionModalForm() {
  const body = document.getElementById('assignSectionRoomBody');
  const foot = document.getElementById('assignSectionRoomFoot');
  if (!body || !foot) return;

  const activeSections = (typeof managedSections !== 'undefined' ? managedSections : []).filter(s => !s.isArchived);

  body.innerHTML = `
    <!-- Real-time Conflict Alert Box -->
    <div id="assignConflictAlert" class="assign-conflict-alert" style="display:none;"></div>

    <div class="gen-row">
      <div class="gen-field">
        <label>Target Room *</label>
        <select id="asfRoomId" class="user-filter-select" style="width:100%;" onchange="validateAssignTimesLive()">
          ${managedRooms.map(r => `
            <option value="${escHtml(r.id)}" ${r.id === currentAssignTargetRoomId ? 'selected' : ''}>
              ${escHtml(r.name)} (${escHtml(r.type || 'Lecture')} · Cap: ${r.capacity})
            </option>
          `).join('')}
        </select>
      </div>

      <div class="gen-field">
        <label>Class Section *</label>
        <select id="asfSectionName" class="user-filter-select" style="width:100%;" onchange="handleSectionSelectChange(this.value); validateAssignTimesLive();">
          ${activeSections.map(s => `
            <option value="${escHtml(s.name)}" ${s.name === currentAssignTargetSection ? 'selected' : ''}>
              ${escHtml(s.name)} (${escHtml(s.strand || 'General')} · ${escHtml(s.gradeLevel || 'Grade 11')})
            </option>
          `).join('')}
        </select>
      </div>
    </div>

    <div class="gen-field">
      <label>Subject / Class Course (Optional)</label>
      <input type="text" id="asfSubject" placeholder="e.g. General Biology 1, Pre-Calculus, Practical Research" maxlength="80">
      <span style="font-size:11px;color:var(--text-muted);">Specific academic subject taking place in this room</span>
    </div>

    <div class="gen-field" style="margin-bottom:18px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
        <label style="margin-bottom:0;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
          📅 Days Schedule *
        </label>
        <span id="asfDaysSummaryBadge" style="font-size:12px;font-weight:700;color:var(--blue, #2563eb);background:#eff6ff;border:1px solid #bfdbfe;padding:2px 10px;border-radius:12px;">
          ${getFormattedScheduleDaysString(currentSelectedScheduleDays)} (${currentSelectedScheduleDays.size} days)
        </span>
      </div>

      <!-- Quick Preset Buttons -->
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
        <span style="font-size:11.5px;color:var(--text-muted);font-weight:600;">Presets:</span>
        <button type="button" class="asf-preset-btn" onclick="applyScheduleDaysPreset('mon-fri')">Mon – Fri (Weekdays)</button>
        <button type="button" class="asf-preset-btn" onclick="applyScheduleDaysPreset('mwf')">Mon / Wed / Fri</button>
        <button type="button" class="asf-preset-btn" onclick="applyScheduleDaysPreset('tth')">Tue / Thu</button>
        <button type="button" class="asf-preset-btn" onclick="applyScheduleDaysPreset('sat')">Saturday Only</button>
        <button type="button" class="asf-preset-btn" onclick="applyScheduleDaysPreset('weekend')">Weekend (Sat–Sun)</button>
        <button type="button" class="asf-preset-btn" onclick="applyScheduleDaysPreset('daily')">Daily (Mon–Sat)</button>
        <button type="button" class="asf-preset-btn" onclick="applyScheduleDaysPreset('mon-sun')">Everyday (Mon–Sun)</button>
      </div>

      <!-- Individual Day Toggle Pills -->
      <div class="asf-days-grid" style="display:grid;grid-template-columns:repeat(7, 1fr);gap:8px;">
        ${[
          { name: 'Monday', abbr: 'Mon', sub: 'M' },
          { name: 'Tuesday', abbr: 'Tue', sub: 'T' },
          { name: 'Wednesday', abbr: 'Wed', sub: 'W' },
          { name: 'Thursday', abbr: 'Thu', sub: 'Th' },
          { name: 'Friday', abbr: 'Fri', sub: 'F' },
          { name: 'Saturday', abbr: 'Sat', sub: 'Sa' },
          { name: 'Sunday', abbr: 'Sun', sub: 'Su' }
        ].map(d => {
          const isAct = currentSelectedScheduleDays.has(d.name);
          return `
            <button type="button" class="asf-day-btn ${isAct ? 'active' : ''}" data-day="${d.name}" onclick="toggleAssignScheduleDay('${d.name}')" style="background:${isAct ? '#2563eb' : '#f8fafc'};border:1.5px solid ${isAct ? '#2563eb' : '#cbd5e1'};color:${isAct ? '#ffffff' : '#334155'};border-radius:10px;padding:8px 4px;text-align:center;cursor:pointer;transition:all 0.15s ease;box-shadow:${isAct ? '0 3px 8px rgba(37,99,235,0.25)' : 'none'};">
              <span style="font-size:10px;display:block;opacity:${isAct ? '0.9' : '0.6'};font-weight:700;text-transform:uppercase;">${d.sub}</span>
              <strong style="font-size:12.5px;display:block;margin-top:1px;">${d.abbr}</strong>
            </button>
          `;
        }).join('')}
      </div>
      <span style="font-size:11px;color:var(--text-muted);margin-top:6px;display:block;">Click any day to toggle it on or off for custom schedule flexibility</span>

      <input type="hidden" id="asfDays" value="${getFormattedScheduleDaysString(currentSelectedScheduleDays)}">
    </div>

    <!-- AM / PM TIME SELECTION (STRICTLY 12-HOUR FORMAT) -->
    <div class="gen-row" style="background:#f8fafc;padding:14px;border-radius:12px;border:1px solid #e2e8f0;margin-top:6px;">
      <div class="gen-field" style="margin-bottom:0;">
        <label style="color:#0f172a;font-weight:700;">Start Time (AM / PM) *</label>
        <select id="asfStartTime" class="user-filter-select" style="width:100%;font-weight:600;" onchange="validateAssignTimesLive()">
          ${AM_PM_TIME_OPTIONS.slice(0, -1).map((t, idx) => `
            <option value="${t}" ${t === '08:00 AM' ? 'selected' : ''}>${t}</option>
          `).join('')}
        </select>
        <span style="font-size:11px;color:var(--text-muted);">Standard 12-hour AM/PM start time</span>
      </div>

      <div class="gen-field" style="margin-bottom:0;">
        <label style="color:#0f172a;font-weight:700;">End Time (AM / PM) *</label>
        <select id="asfEndTime" class="user-filter-select" style="width:100%;font-weight:600;" onchange="validateAssignTimesLive()">
          ${AM_PM_TIME_OPTIONS.slice(1).map((t, idx) => `
            <option value="${t}" ${t === '09:30 AM' ? 'selected' : ''}>${t}</option>
          `).join('')}
        </select>
        <span style="font-size:11px;color:var(--text-muted);">Standard 12-hour AM/PM dismissal time</span>
      </div>
    </div>
  `;

  foot.innerHTML = `
    <button type="button" class="foot-btn-secondary" onclick="closeAssignSectionRoomModal()">Cancel</button>
    <button type="button" class="gen-btn" id="saveAssignScheduleBtn" onclick="saveSectionAssignmentForm()">${iconCheck()} Confirm & Assign Schedule</button>
  `;

  // Pre-validate on modal open
  setTimeout(validateAssignTimesLive, 50);
}


function updateAssignScheduleDaysUI() {
  const container = document.querySelector('.asf-days-grid');
  if (container) {
    container.querySelectorAll('.asf-day-btn').forEach(btn => {
      const day = btn.dataset.day;
      const isAct = currentSelectedScheduleDays.has(day);
      btn.classList.toggle('active', isAct);
      btn.style.background = isAct ? '#2563eb' : '#f8fafc';
      btn.style.borderColor = isAct ? '#2563eb' : '#cbd5e1';
      btn.style.color = isAct ? '#ffffff' : '#334155';
      btn.style.boxShadow = isAct ? '0 3px 8px rgba(37,99,235,0.25)' : 'none';
      const sub = btn.querySelector('span');
      if (sub) sub.style.opacity = isAct ? '0.9' : '0.6';
    });
  }

  const str = getFormattedScheduleDaysString(currentSelectedScheduleDays);
  const hiddenInput = document.getElementById('asfDays');
  if (hiddenInput) hiddenInput.value = str;

  const badge = document.getElementById('asfDaysSummaryBadge');
  if (badge) {
    const count = currentSelectedScheduleDays.size;
    badge.textContent = `${str} (${count} day${count === 1 ? '' : 's'})`;
  }

  validateAssignTimesLive();
}

function toggleAssignScheduleDay(dayName) {
  if (!dayName) return;
  if (currentSelectedScheduleDays.has(dayName)) {
    if (currentSelectedScheduleDays.size > 1) {
      currentSelectedScheduleDays.delete(dayName);
    } else {
      if (typeof showToast === 'function') showToast('Please keep at least one day selected for the schedule', 'info');
      return;
    }
  } else {
    currentSelectedScheduleDays.add(dayName);
  }
  updateAssignScheduleDaysUI();
}

function applyScheduleDaysPreset(preset) {
  currentSelectedScheduleDays.clear();
  if (preset === 'mon-fri') {
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(d => currentSelectedScheduleDays.add(d));
  } else if (preset === 'mwf') {
    ['Monday', 'Wednesday', 'Friday'].forEach(d => currentSelectedScheduleDays.add(d));
  } else if (preset === 'tth') {
    ['Tuesday', 'Thursday'].forEach(d => currentSelectedScheduleDays.add(d));
  } else if (preset === 'sat') {
    ['Saturday'].forEach(d => currentSelectedScheduleDays.add(d));
  } else if (preset === 'weekend') {
    ['Saturday', 'Sunday'].forEach(d => currentSelectedScheduleDays.add(d));
  } else if (preset === 'daily') {
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].forEach(d => currentSelectedScheduleDays.add(d));
  } else if (preset === 'mon-sun') {
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(d => currentSelectedScheduleDays.add(d));
  } else {
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(d => currentSelectedScheduleDays.add(d));
  }
  updateAssignScheduleDaysUI();
}

if (typeof window !== 'undefined') {
  window.toggleAssignScheduleDay = toggleAssignScheduleDay;
  window.applyScheduleDaysPreset = applyScheduleDaysPreset;
  window.updateAssignScheduleDaysUI = updateAssignScheduleDaysUI;
}

function handleSectionSelectChange(secName) {
  currentAssignTargetSection = secName;
}

function validateAssignTimesLive() {
  const roomId = document.getElementById('asfRoomId')?.value;
  const sectionName = document.getElementById('asfSectionName')?.value;
  const day = document.getElementById('asfDays')?.value;
  const startTime = document.getElementById('asfStartTime')?.value;
  const endTime = document.getElementById('asfEndTime')?.value;
  const alertEl = document.getElementById('assignConflictAlert');
  const btn = document.getElementById('saveAssignScheduleBtn');

  if (!alertEl || !roomId || !sectionName || !startTime || !endTime) return;

  const result = checkScheduleConflict(roomId, sectionName, day, startTime, endTime);

  if (result.hasConflict) {
    alertEl.style.display = 'flex';
    alertEl.innerHTML = `
      <div style="font-size:18px;line-height:1;flex-shrink:0;">⚠️</div>
      <div>
        <strong style="display:block;margin-bottom:2px;">Schedule Conflict Detected</strong>
        <span>${escHtml(result.message)}</span>
      </div>
    `;
    if (btn) {
      btn.style.opacity = '0.6';
      btn.style.cursor = 'not-allowed';
    }
    return false;
  } else {
    alertEl.style.display = 'none';
    alertEl.innerHTML = '';
    if (btn) {
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
    return true;
  }
}

function saveSectionAssignmentForm() {
  const roomId = document.getElementById('asfRoomId')?.value;
  const sectionName = document.getElementById('asfSectionName')?.value;
  const subject = (document.getElementById('asfSubject')?.value || '').trim();
  const day = document.getElementById('asfDays')?.value || 'Monday - Friday';
  const startTime = document.getElementById('asfStartTime')?.value;
  const endTime = document.getElementById('asfEndTime')?.value;

  if (!roomId) {
    showToast('Please select a Target Room', 'error');
    return;
  }
  if (!sectionName) {
    showToast('Please select a Class Section', 'error');
    return;
  }

  // Conflict validation: WILL NOT PROCEED IF TIME IS CONFLICTING!
  const check = checkScheduleConflict(roomId, sectionName, day, startTime, endTime);
  if (check.hasConflict) {
    showToast(check.message, 'error');
    validateAssignTimesLive();
    return; // PREVENT SUBMISSION!
  }

  const room = managedRooms.find(r => r.id === roomId);
  if (!room) return;

  if (!room.schedule) room.schedule = [];

  const newSched = {
    id: 'sched-' + Date.now(),
    sectionName,
    subject: subject || 'General Class',
    day,
    startTime,
    endTime
  };

  room.schedule.push(newSched);

  // Also update section's room property if empty
  if (typeof managedSections !== 'undefined') {
    const secObj = managedSections.find(s => s.name.toLowerCase() === sectionName.toLowerCase());
    if (secObj && (!secObj.room || secObj.room === 'TBD')) {
      secObj.room = room.name;
      if (typeof saveManagedSections === 'function') saveManagedSections();
    }
  }

  saveManagedRooms();
  showToast(`"${sectionName}" assigned to ${room.name} (${startTime} – ${endTime})!`, 'success');
  closeAssignSectionRoomModal();

  const wrap = document.getElementById('roomsCardsGridWrap');
  if (wrap) wrap.innerHTML = renderRoomCards();
}

function removeSectionSchedulePrompt(roomId, schedId, sectionName) {
  const room = managedRooms.find(r => r.id === roomId);
  if (!room) return;

  if (confirm(`Remove "${sectionName}" from ${room.name}'s schedule?`)) {
    room.schedule = (room.schedule || []).filter(s => s.id !== schedId);
    saveManagedRooms();
    showToast(`Schedule removed from ${room.name}.`, 'info');
    const wrap = document.getElementById('roomsCardsGridWrap');
    if (wrap) wrap.innerHTML = renderRoomCards();
  }
}

/* Expose global functions to window */
if (typeof window !== 'undefined') {
  window.renderRoomsTabContent = renderRoomsTabContent;
  window.openCreateRoomModal = openCreateRoomModal;
  window.openEditRoomModal = openEditRoomModal;
  window.closeRoomModal = closeRoomModal;
  window.saveRoomForm = saveRoomForm;
  window.deleteRoomPrompt = deleteRoomPrompt;
  window.openAssignSectionModal = openAssignSectionModal;
  window.closeAssignSectionRoomModal = closeAssignSectionRoomModal;
  window.saveSectionAssignmentForm = saveSectionAssignmentForm;
  window.removeSectionSchedulePrompt = removeSectionSchedulePrompt;
  window.handleSectionDragStart = handleSectionDragStart;
  window.handleRoomDragOver = handleRoomDragOver;
  window.handleRoomDragLeave = handleRoomDragLeave;
  window.handleRoomDrop = handleRoomDrop;
  window.setRoomFilter = setRoomFilter;
  window.validateAssignTimesLive = validateAssignTimesLive;
  window.handleSectionSelectChange = handleSectionSelectChange;
}
