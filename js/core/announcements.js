/* ── SCHOLARIA ANNOUNCEMENTS & EMERGENCY BULLETIN ENGINE ── */

const ANNOUNCEMENTS_STORAGE_KEY = 'scholaria_announcements_v1';

const DEFAULT_HOTLINES = [
  { id: 'hl_imus_cdrrmo', name: 'Imus Disaster Risk (CDRRMO)', number: '(046) 515-1358', icon: '🚨' },
  { id: 'hl_imus_bfp', name: 'Imus Bureau of Fire (BFP)', number: '(046) 970-5161', icon: '🚒' },
  { id: 'hl_imus_pnp', name: 'Imus Police (PNP)', number: '(046) 471-3993', icon: '🚓' },
  { id: 'hl_imus_hospital', name: 'Medical Center Imus', number: '(046) 471-9487', icon: '🏥' },
  { id: 'hl_imus_mayor', name: 'Imus City Hall (Mayor)', number: '(046) 471-2732', icon: '🏛️' },
  { id: 'hl_imus_health', name: 'Imus City Health Center', number: '(046) 471-5560', icon: '🩺' },
  { id: 'hl_national_911', name: 'National Emergency', number: '911', icon: '🆘' },
  { id: 'hl_red_cross', name: 'Philippine Red Cross', number: '143', icon: '⛑️' }
];

const DEFAULT_SEED_ANNOUNCEMENTS = [
  {
    id: 'anc_seed_1',
    title: 'Super Typhoon Class Suspension & Asynchronous Shift',
    category: 'emergency', // 'emergency' | 'academic' | 'event' | 'general'
    priority: 'critical', // 'critical' (sticky top banner) | 'important' | 'normal'
    audience: ['All Students', 'All Teachers', 'STEM Strand', 'HUMSS Strand', 'ABM Strand', 'TVL Strand'],
    message: 'DEAR SCHOLARIA COMMUNITY:\n\nDue to severe weather conditions and local government advisories, all face-to-face classes for Senior High School are SUSPENDED from Aug 26 to Sept 05.\n\nStudents are instructed to shift to ASYNCHRONOUS LEARNING MODE. In case of severe flooding, power outages, or medical emergencies, please use the official City of Imus Emergency Hotlines attached below.',
    authorName: "Principal's Office",
    authorRole: 'Admin',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    expiresAt: new Date(Date.now() + 3600000 * 72).toISOString(),
    isArchived: false,
    hotlines: [
      { name: 'Imus Disaster Risk (CDRRMO)', number: '(046) 515-1358', icon: '🚨' },
      { name: 'Imus Bureau of Fire (BFP)', number: '(046) 970-5161', icon: '🚒' },
      { name: 'Imus Police (PNP)', number: '(046) 471-3993', icon: '🚓' },
      { name: 'Medical Center Imus', number: '(046) 471-9487', icon: '🏥' }
    ]
  },
  {
    id: 'anc_seed_2',
    title: 'Q1 Midterm Examination Schedule Shift',
    category: 'academic',
    priority: 'important',
    audience: ['All Students', 'All Teachers'],
    message: 'Notice to all Grade 11 and Grade 12 students:\n\nIn light of the recent class suspension, the First Quarter Midterm Examination schedule has been adjusted. Exams will officially commence on Sept 12. Updated review pointers and coverage lists are uploaded under your respective Subject Workspaces.',
    authorName: 'Academic Registrar',
    authorRole: 'Admin',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    expiresAt: new Date(Date.now() + 3600000 * 168).toISOString(),
    isArchived: false,
    hotlines: []
  },
  {
    id: 'anc_seed_3',
    title: 'Senior High School Foundation Day Assembly',
    category: 'event',
    priority: 'normal',
    audience: ['All Students', 'All Teachers'],
    message: 'Imus National High School / Senior High Department will celebrate its Annual Foundation Week next month! Student Council activities, strand exhibits, and performance competitions will be announced soon.',
    authorName: 'Student Affairs Council',
    authorRole: 'Admin',
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    expiresAt: null,
    isArchived: false,
    hotlines: []
  }
];

function getStoredAnnouncements() {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_ANNOUNCEMENTS));
      return DEFAULT_SEED_ANNOUNCEMENTS;
    }
    const parsed = JSON.parse(raw);
    return (parsed && parsed.length) ? parsed : DEFAULT_SEED_ANNOUNCEMENTS;
  } catch (e) {
    return DEFAULT_SEED_ANNOUNCEMENTS;
  }
}

function saveAnnouncements(list) {
  try {
    localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

function isAnnouncementExpired(anc) {
  if (!anc) return false;
  if (anc.isArchived) return true;
  if (anc.expiresAt && new Date(anc.expiresAt).getTime() <= Date.now()) return true;
  return false;
}

function getRemainingTimeText(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function extendAnnouncementDeadline(id, days = 2) {
  const all = getStoredAnnouncements();
  const anc = all.find(a => a.id === id);
  if (!anc) return;
  const baseTime = anc.expiresAt && new Date(anc.expiresAt).getTime() > Date.now()
    ? new Date(anc.expiresAt).getTime()
    : Date.now();
  anc.expiresAt = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();
  anc.isArchived = false;
  saveAnnouncements(all);
  showToast(`Extended deadline by ${days} days`, 'success');
  renderEmergencyTopBanner();
  if (typeof renderPage === 'function') renderPage('announcements');
}

function toggleArchiveAnnouncement(id) {
  const all = getStoredAnnouncements();
  const anc = all.find(a => a.id === id);
  if (!anc) return;
  anc.isArchived = !anc.isArchived;
  saveAnnouncements(all);
  showToast(anc.isArchived ? 'Announcement moved to Archive' : 'Announcement restored to Active', 'success');
  renderEmergencyTopBanner();
  if (typeof renderPage === 'function') renderPage('announcements');
}

function reuseAnnouncement(id) {
  const all = getStoredAnnouncements();
  const anc = all.find(a => a.id === id);
  if (!anc) return;

  openCreateAnnouncementModal();

  const titleInput = document.getElementById('ancTitleInput');
  const catSelect = document.getElementById('ancCategoryInput');
  const customCatInput = document.getElementById('ancCustomCategoryInput');
  const msgInput = document.getElementById('ancMessageInput');

  if (titleInput) titleInput.value = anc.title || '';
  if (msgInput) msgInput.value = anc.message || '';

  if (anc.category === 'others') {
    handleAncCategoryChange('others');
    if (catSelect) catSelect.value = 'others';
    if (customCatInput) customCatInput.value = anc.customCategory || '';
  } else if (catSelect) {
    if (ROLE === 'teacher' && anc.category === 'emergency') {
      catSelect.value = 'academic';
    } else {
      catSelect.value = anc.category || 'emergency';
    }
    handleAncCategoryChange(catSelect.value);
  }

  if (anc.priority) {
    const prioRadio = document.querySelector(`input[name="ancPriority"][value="${anc.priority}"]`);
    if (prioRadio && !prioRadio.disabled) prioRadio.checked = true;
  }

  const audCheckboxes = document.querySelectorAll('input[name="ancAudience"]');
  audCheckboxes.forEach(cb => {
    if (anc.audience && Array.isArray(anc.audience)) {
      cb.checked = anc.audience.includes(cb.value);
    }
  });
  handleAncAudienceToggle();

  const hlCheckboxes = document.querySelectorAll('input[name="ancHotline"]');
  hlCheckboxes.forEach(cb => {
    if (anc.hotlines && Array.isArray(anc.hotlines)) {
      cb.checked = anc.hotlines.some(h => h.id === cb.value || h.name === cb.value);
    } else {
      cb.checked = false;
    }
  });

  setAncExpiryPreset('24h');
  showToast('Pre-filled modal from archived advisory — ready to edit and broadcast!', 'info');
}

/**
 * Get sticky critical emergency announcement for top banner
 */
function getStickyEmergencyAnnouncement() {
  const all = getStoredAnnouncements();
  return all.find(a => (!isAnnouncementExpired(a)) && (a.priority === 'critical' || a.category === 'emergency')) || null;
}

/**
 * Render sticky top emergency banner
 */
function renderEmergencyTopBanner() {
  const container = document.getElementById('emergencyBannerContainer');
  if (!container) return;

  // Check if user dismissed emergency banner for current session
  if (sessionStorage.getItem('scholaria_emergency_dismissed') === 'true') {
    container.innerHTML = '';
    document.body.classList.remove('has-anc-banner');
    return;
  }

  const emergency = getStickyEmergencyAnnouncement();
  if (!emergency) {
    container.innerHTML = '';
    document.body.classList.remove('has-anc-banner');
    return;
  }

  document.body.classList.add('has-anc-banner');
  const remaining = getRemainingTimeText(emergency.expiresAt);

  container.innerHTML = `
    <div class="emergency-top-banner">
      <div class="eb-content">
        <span class="eb-badge">🚨 EMERGENCY ADVISORY</span>
        <span class="eb-text"><strong>${escHtml(emergency.title)}:</strong> ${escHtml(emergency.message.split('\n\n')[0])} ${remaining ? `<span style="opacity:0.85;font-weight:700;margin-left:6px;">(Ends in: ${remaining})</span>` : ''}</span>
      </div>
      <div class="eb-actions">
        <button class="eb-btn" onclick="openEmergencyHotlinesModal()">📞 City Emergency Hotlines</button>
        <button class="eb-btn" onclick="renderPage('announcements')">View Details</button>
        <button class="eb-close-btn" onclick="closeEmergencyBanner()" title="Dismiss Banner">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `;
}

function closeEmergencyBanner() {
  sessionStorage.setItem('scholaria_emergency_dismissed', 'true');
  document.body.classList.remove('has-anc-banner');
  const container = document.getElementById('emergencyBannerContainer');
  if (container) container.innerHTML = '';
}

function openEmergencyHotlinesModal() {
  const modal = document.getElementById('hotlineDirectoryModal');
  if (modal) modal.classList.add('active');
}

function closeEmergencyHotlinesModal() {
  const modal = document.getElementById('hotlineDirectoryModal');
  if (modal) modal.classList.remove('active');
}

/* ── ANNOUNCEMENTS HUB PAGE MODULE ── */
let ancCategoryFilter = 'all'; // 'all' | 'emergency' | 'academic' | 'event'
let ancArchiveView = 'active'; // 'active' | 'archived'

function setAncCategoryFilter(cat) {
  ancCategoryFilter = cat;
  if (typeof renderPage === 'function') renderPage('announcements');
}

function setAncArchiveView(view) {
  ancArchiveView = view;
  if (typeof renderPage === 'function') renderPage('announcements');
}

function deleteAnnouncement(id) {
  let all = getStoredAnnouncements();
  all = all.filter(a => a.id !== id);
  saveAnnouncements(all);
  showToast('Announcement deleted', 'success');
  renderEmergencyTopBanner();
  if (typeof renderPage === 'function') renderPage('announcements');
}

function buildAnnouncementsPage() {
  const all = getStoredAnnouncements();

  const activeAnnouncements = all.filter(a => !isAnnouncementExpired(a));
  const archivedAnnouncements = all.filter(a => isAnnouncementExpired(a));
  const currentList = ancArchiveView === 'active' ? activeAnnouncements : archivedAnnouncements;

  const filtered = ancCategoryFilter === 'all' 
    ? currentList 
    : currentList.filter(a => a.category === ancCategoryFilter);

  const emergencyCount = currentList.filter(a => a.category === 'emergency').length;
  const academicCount = currentList.filter(a => a.category === 'academic').length;
  const eventCount = currentList.filter(a => a.category === 'event').length;

  const canPost = ROLE === 'admin' || ROLE === 'teacher';

  return `
  <div class="anc-page-wrap">
    <div class="section-hdr">
      <div>
        <h2>School Announcements & Bulletins</h2>
        <span style="font-size:12.5px;color:var(--text-muted);">Official advisories, class suspension notices, and City of Imus emergency hotlines</span>
      </div>
      ${canPost ? `
        <button class="add-btn" onclick="openCreateAnnouncementModal()">
          ${typeof iconPlus === 'function' ? iconPlus() : ''}
          Broadcast Announcement
        </button>
      ` : ''}
    </div>

    <!-- Filter Chips Bar + Archive Toggle (Highlighted Location) -->
    <div class="anc-filter-bar">
      <div class="anc-chip-group">
        <button class="anc-chip ${ancCategoryFilter === 'all' ? 'active' : ''}" onclick="setAncCategoryFilter('all')">
          All Advisories <span class="anc-chip-count">${currentList.length}</span>
        </button>
        <button class="anc-chip ${ancCategoryFilter === 'emergency' ? 'active' : ''}" onclick="setAncCategoryFilter('emergency')">
          🚨 Suspensions & Emergency <span class="anc-chip-count">${emergencyCount}</span>
        </button>
        <button class="anc-chip ${ancCategoryFilter === 'academic' ? 'active' : ''}" onclick="setAncCategoryFilter('academic')">
          📚 Academic Updates <span class="anc-chip-count">${academicCount}</span>
        </button>
        <button class="anc-chip ${ancCategoryFilter === 'event' ? 'active' : ''}" onclick="setAncCategoryFilter('event')">
          🏫 School Events <span class="anc-chip-count">${eventCount}</span>
        </button>
      </div>

      <!-- Archive View Toggle (Highlighted Red Box Location) -->
      <div class="anc-archive-toggle-wrap">
        <button class="anc-archive-tab ${ancArchiveView === 'active' ? 'active' : ''}" onclick="setAncArchiveView('active')">
          ${typeof iconClock === 'function' ? iconClock() : ''} Active (${activeAnnouncements.length})
        </button>
        <button class="anc-archive-tab ${ancArchiveView === 'archived' ? 'active' : ''}" onclick="setAncArchiveView('archived')">
          ${typeof iconArchive === 'function' ? iconArchive() : ''} Archived (${archivedAnnouncements.length})
        </button>
      </div>
    </div>

    <div class="anc-grid">
      <!-- Main Column: List of Announcement Cards -->
      <div class="anc-main-col">
        ${filtered.length ? filtered.map(anc => {
          const categoryClass = anc.category || 'general';
          let catLabel = '';
          if (anc.category === 'others' && anc.customCategory) {
            catLabel = `📌 ${anc.customCategory}`;
          } else if (anc.category === 'emergency') {
            catLabel = '🚨 Emergency & Suspensions';
          } else if (anc.category === 'academic') {
            catLabel = '📚 Academic';
          } else if (anc.category === 'event') {
            catLabel = '🏫 School Events';
          } else {
            catLabel = '📢 General';
          }
          const dateStr = formatSentDate(anc.timestamp);
          const canManage = ROLE === 'admin' || (ROLE === 'teacher' && anc.authorRole === 'Teacher');
          const isExpired = isAnnouncementExpired(anc);
          const remainingText = getRemainingTimeText(anc.expiresAt);

          return `
            <div class="anc-card ${categoryClass}" style="${isExpired ? 'opacity:0.85;background:#f8fafc;' : ''}">
              <div class="anc-card-header">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span class="anc-cat-tag ${categoryClass}">${catLabel}</span>
                  ${isExpired ? `
                    <span style="font-size:11px;font-weight:700;color:#64748b;background:#e2e8f0;padding:2px 8px;border-radius:10px;display:inline-flex;align-items:center;gap:4px;">
                      ${typeof iconArchive === 'function' ? iconArchive() : ''} Archived
                    </span>
                  ` : remainingText ? `
                    <span style="font-size:11px;font-weight:700;color:#0284c7;background:#e0f2fe;padding:2px 8px;border-radius:10px;display:inline-flex;align-items:center;gap:4px;">
                      ${typeof iconClock === 'function' ? iconClock() : ''} ${remainingText}
                    </span>
                  ` : `
                    <span style="font-size:11px;font-weight:700;color:#059669;background:#dcfce7;padding:2px 8px;border-radius:10px;display:inline-flex;align-items:center;gap:4px;">
                      ${typeof iconInfinity === 'function' ? iconInfinity() : ''} Permanent
                    </span>
                  `}
                </div>
                <div class="anc-meta">
                  <span>📅 ${dateStr}</span>
                  ${canManage ? `
                    <button class="notif-del-row-btn" style="margin-left:8px;" onclick="deleteAnnouncement('${anc.id}')" title="Delete Announcement">
                      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  ` : ''}
                </div>
              </div>

              <div class="anc-card-body">
                <h3 class="anc-card-title">${escHtml(anc.title)}</h3>
                <p class="anc-card-msg">${escHtml(anc.message)}</p>

                ${anc.hotlines && anc.hotlines.length ? `
                  <div class="anc-hotline-box">
                    <div style="font-size:11.5px;font-weight:800;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">📞 City of Imus Emergency Hotlines</div>
                    <div class="anc-hotline-chips">
                      ${anc.hotlines.map(h => `
                        <a href="tel:${h.number.replace(/[^0-9+]/g, '')}" class="anc-hotline-chip" title="Click to call ${h.name}">
                          <span>${h.icon || '📞'} <strong>${escHtml(h.name)}:</strong></span>
                          <span class="anc-hotline-num">${escHtml(h.number)}</span>
                        </a>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>

              <div class="anc-card-foot">
                <div class="anc-author-info">
                  <div class="anc-author-avatar">${anc.authorName ? anc.authorName.charAt(0).toUpperCase() : 'A'}</div>
                  <span>Posted by: <strong>${escHtml(anc.authorName || 'School Administration')}</strong></span>
                </div>
                
                <div style="display:flex;align-items:center;gap:8px;">
                  ${canManage ? `
                    ${isExpired ? `
                      <button class="anc-preset-btn" style="padding:3px 8px;font-size:11px;background:#e0f2fe;color:#0369a1;border-color:#bae6fd;" onclick="reuseAnnouncement('${anc.id}')" title="Reuse & Edit this Announcement">
                        ${typeof iconRefresh === 'function' ? iconRefresh() : ''} Reuse Announcement
                      </button>
                    ` : anc.expiresAt ? `
                      <button class="anc-preset-btn" style="padding:3px 8px;font-size:11px;" onclick="extendAnnouncementDeadline('${anc.id}', 2)" title="Extend Deadline by 2 Days">
                        ${typeof iconPlus === 'function' ? iconPlus() : ''} Extend +2 Days
                      </button>
                    ` : ''}
                    <button class="anc-preset-btn" style="padding:3px 8px;font-size:11px;" onclick="toggleArchiveAnnouncement('${anc.id}')">
                      ${typeof iconArchive === 'function' ? iconArchive() : ''} ${anc.isArchived ? 'Unarchive' : 'Archive'}
                    </button>
                  ` : ''}
                  <span>Audience: ${(anc.audience || ['All']).join(', ')}</span>
                </div>
              </div>
            </div>
          `;
        }).join('') : `
          <div style="padding:40px;text-align:center;color:var(--text-muted);background:#fff;border-radius:16px;border:1.5px solid #e8f0fe;">
            No ${ancArchiveView === 'active' ? 'active' : 'archived'} announcements in this category.
          </div>
        `}
      </div>

      <!-- Right Sidebar: Emergency Directory & Quick Info -->
      <div class="anc-sidebar">
        <div class="anc-widget-card" style="background:#fff5f5;border-color:#fecaca;">
          <h4 class="anc-widget-title" style="color:#b91c1c;">🚨 City of Imus Emergency Hotlines</h4>
          <p style="font-size:12.5px;color:#7f1d1d;line-height:1.5;">
            In case of emergency, flooding, or medical assistance during class suspensions, students and parents can contact Imus city emergency offices directly.
          </p>
        </div>

        <div class="anc-widget-card">
          <h4 class="anc-widget-title">City of Imus Emergency Directory</h4>
          <div class="anc-dir-item">
            <div class="anc-dir-icon">🚨</div>
            <div class="anc-dir-details">
              <h5>Imus Disaster Risk (CDRRMO)</h5>
              <span style="font-weight:800;color:#dc2626;">(046) 515-1358</span>
            </div>
          </div>
          <div class="anc-dir-item">
            <div class="anc-dir-icon">🚒</div>
            <div class="anc-dir-details">
              <h5>Imus Bureau of Fire (BFP)</h5>
              <span style="font-weight:800;color:#dc2626;">(046) 970-5161</span>
            </div>
          </div>
          <div class="anc-dir-item">
            <div class="anc-dir-icon">🚓</div>
            <div class="anc-dir-details">
              <h5>Imus PNP Police Station</h5>
              <span>(046) 471-3993</span>
            </div>
          </div>
          <div class="anc-dir-item">
            <div class="anc-dir-icon">🏥</div>
            <div class="anc-dir-details">
              <h5>Medical Center Imus</h5>
              <span>(046) 471-9487</span>
            </div>
          </div>
          <div class="anc-dir-item">
            <div class="anc-dir-icon">🏛️</div>
            <div class="anc-dir-details">
              <h5>Imus City Hall (Mayor)</h5>
              <span>(046) 471-2732</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}

function handleAncAudienceToggle() {
  const allStudentsCb = document.querySelector('input[name="ancAudience"][value="All Students"]');
  if (!allStudentsCb) return;

  const isAllStudentsChecked = allStudentsCb.checked;
  const strandValues = ['STEM Strand', 'HUMSS Strand', 'ABM Strand', 'TVL Strand'];

  strandValues.forEach(val => {
    const strandCb = document.querySelector(`input[name="ancAudience"][value="${val}"]`);
    if (strandCb) {
      strandCb.disabled = isAllStudentsChecked;
      if (isAllStudentsChecked) {
        strandCb.checked = true;
      }
      const label = strandCb.closest('.anc-checkbox-label');
      if (label) {
        if (isAllStudentsChecked) {
          label.style.opacity = '0.5';
          label.style.cursor = 'not-allowed';
        } else {
          label.style.opacity = '1';
          label.style.cursor = 'pointer';
        }
      }
    }
  });
}

function handleAncCategoryChange(val) {
  const catSelect = document.getElementById('ancCategoryInput');
  const customInput = document.getElementById('ancCustomCategoryInput');
  const resetBtn = document.getElementById('ancResetCatBtn');
  if (!customInput || !catSelect) return;

  if (val === 'others') {
    catSelect.style.display = 'none';
    customInput.style.display = 'block';
    if (resetBtn) resetBtn.style.display = 'inline-block';
    customInput.focus();
  } else {
    catSelect.style.display = 'block';
    customInput.style.display = 'none';
    if (resetBtn) resetBtn.style.display = 'none';
  }
}

function resetAncCategorySelect(defaultVal = 'emergency') {
  const catSelect = document.getElementById('ancCategoryInput');
  const customInput = document.getElementById('ancCustomCategoryInput');
  const resetBtn = document.getElementById('ancResetCatBtn');
  if (catSelect) {
    catSelect.value = defaultVal;
    catSelect.style.display = 'block';
  }
  if (customInput) {
    customInput.value = '';
    customInput.style.display = 'none';
  }
  if (resetBtn) resetBtn.style.display = 'none';
}

function setAncExpiryPreset(preset) {
  const buttons = ['preset24h', 'preset3d', 'preset1w', 'presetPerm'];
  buttons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });
  const targetId = preset === '24h' ? 'preset24h' : preset === '3d' ? 'preset3d' : preset === '1w' ? 'preset1w' : 'presetPerm';
  const activeBtn = document.getElementById(targetId);
  if (activeBtn) activeBtn.classList.add('active');

  const expiryInput = document.getElementById('ancExpiryInput');
  if (!expiryInput) return;

  if (preset === 'perm') {
    expiryInput.value = '';
    return;
  }

  const now = new Date();
  let targetTime = new Date();
  if (preset === '24h') targetTime.setHours(now.getHours() + 24);
  else if (preset === '3d') targetTime.setDate(now.getDate() + 3);
  else if (preset === '1w') targetTime.setDate(now.getDate() + 7);

  const year = targetTime.getFullYear();
  const month = String(targetTime.getMonth() + 1).padStart(2, '0');
  const day = String(targetTime.getDate()).padStart(2, '0');
  const hours = String(targetTime.getHours()).padStart(2, '0');
  const mins = String(targetTime.getMinutes()).padStart(2, '0');
  expiryInput.value = `${year}-${month}-${day}T${hours}:${mins}`;
}

function onAncExpiryInputChange() {
  const buttons = ['preset24h', 'preset3d', 'preset1w', 'presetPerm'];
  buttons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });
}

/* ── ANNOUNCEMENT CREATOR MODAL (ADMIN & TEACHER) ── */
function openCreateAnnouncementModal() {
  const modal = document.getElementById('ancModal');
  if (modal) modal.classList.add('active');

  const catSelect = document.getElementById('ancCategoryInput');
  const emergencyOpt = catSelect ? catSelect.querySelector('option[value="emergency"]') : null;
  const criticalRadio = document.querySelector('input[name="ancPriority"][value="critical"]');
  const importantRadio = document.querySelector('input[name="ancPriority"][value="important"]');

  if (ROLE === 'teacher') {
    if (emergencyOpt) {
      emergencyOpt.disabled = true;
      emergencyOpt.hidden = true;
    }
    if (criticalRadio) {
      criticalRadio.disabled = true;
      if (criticalRadio.closest('.anc-radio-label')) {
        criticalRadio.closest('.anc-radio-label').style.opacity = '0.45';
        criticalRadio.closest('.anc-radio-label').style.cursor = 'not-allowed';
      }
    }
    if (importantRadio) importantRadio.checked = true;
    resetAncCategorySelect('academic');
  } else {
    if (emergencyOpt) {
      emergencyOpt.disabled = false;
      emergencyOpt.hidden = false;
    }
    if (criticalRadio) {
      criticalRadio.disabled = false;
      criticalRadio.checked = true;
      if (criticalRadio.closest('.anc-radio-label')) {
        criticalRadio.closest('.anc-radio-label').style.opacity = '1';
        criticalRadio.closest('.anc-radio-label').style.cursor = 'pointer';
      }
    }
    resetAncCategorySelect('emergency');
  }

  setAncExpiryPreset('24h');
  const expiryInput = document.getElementById('ancExpiryInput');
  if (expiryInput) {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const dy = String(now.getDate()).padStart(2, '0');
    const hr = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    expiryInput.min = `${yr}-${mo}-${dy}T${hr}:${mi}`;
  }
  handleAncAudienceToggle();
}

function closeCreateAnnouncementModal() {
  const modal = document.getElementById('ancModal');
  if (modal) modal.classList.remove('active');
}

function submitCreateAnnouncement() {
  const titleInput = document.getElementById('ancTitleInput');
  const catInput = document.getElementById('ancCategoryInput');
  const customCatInput = document.getElementById('ancCustomCategoryInput');
  const priorityInput = document.querySelector('input[name="ancPriority"]:checked');
  const msgInput = document.getElementById('ancMessageInput');
  const expiryInput = document.getElementById('ancExpiryInput');

  if (!titleInput || !titleInput.value.trim() || !msgInput || !msgInput.value.trim()) {
    showToast('Please enter an announcement title and message', 'error');
    return;
  }

  let categoryValue = catInput ? catInput.value : 'emergency';

  if (ROLE === 'teacher' && categoryValue === 'emergency') {
    showToast('Only Admins can broadcast Emergency & Class Suspensions', 'error');
    return;
  }

  if (expiryInput && expiryInput.value) {
    const selectedTime = new Date(expiryInput.value).getTime();
    if (selectedTime <= Date.now()) {
      showToast('Expiration deadline cannot be set in the past', 'error');
      return;
    }
  }

  let customCategoryName = '';
  if (categoryValue === 'others') {
    customCategoryName = customCatInput ? customCatInput.value.trim() : '';
    if (!customCategoryName) customCategoryName = 'General Advisory';
  }

  // Get selected hotlines
  const selectedHotlines = [];
  const hlCheckboxes = document.querySelectorAll('input[name="ancHotline"]:checked');
  hlCheckboxes.forEach(cb => {
    const hl = DEFAULT_HOTLINES.find(h => h.id === cb.value);
    if (hl) selectedHotlines.push(hl);
  });

  // Get selected audience
  const selectedAudience = [];
  const audCheckboxes = document.querySelectorAll('input[name="ancAudience"]:checked');
  audCheckboxes.forEach(cb => {
    if (!cb.disabled || cb.value === 'All Students') {
      selectedAudience.push(cb.value);
    }
  });

  const expiresAtVal = (expiryInput && expiryInput.value)
    ? new Date(expiryInput.value).toISOString()
    : null;

  const newAnc = {
    id: 'anc_' + Date.now(),
    title: titleInput.value.trim(),
    category: categoryValue,
    customCategory: customCategoryName,
    priority: priorityInput ? priorityInput.value : 'normal',
    audience: selectedAudience.length ? selectedAudience : ['All Students', 'All Teachers'],
    message: msgInput.value.trim(),
    authorName: CURRENT_PROFILE ? CURRENT_PROFILE.full_name : 'School Administration',
    authorRole: ROLE === 'admin' ? 'Admin' : 'Teacher',
    timestamp: new Date().toISOString(),
    expiresAt: expiresAtVal,
    isArchived: false,
    hotlines: selectedHotlines.length ? selectedHotlines : DEFAULT_HOTLINES.slice(0, 4)
  };

  const all = getStoredAnnouncements();
  all.unshift(newAnc);
  saveAnnouncements(all);

  // Send real-time notification
  if (typeof addNotification === 'function') {
    addNotification({
      targetRole: 'all',
      title: (newAnc.priority === 'critical' ? '🚨 EMERGENCY: ' : '') + newAnc.title,
      message: newAnc.message.slice(0, 100) + '…',
      type: newAnc.category === 'emergency' ? 'approval' : 'info',
      senderName: newAnc.authorName,
      senderAvatar: initialsFor(newAnc.authorName)
    });
  }

  closeCreateAnnouncementModal();
  showToast('Announcement broadcasted successfully!', 'success');

  // Reset session dismissal if critical emergency broadcasted
  if (newAnc.priority === 'critical') {
    sessionStorage.removeItem('scholaria_emergency_dismissed');
  }

  renderEmergencyTopBanner();
  if (typeof renderPage === 'function') renderPage('announcements');
}
