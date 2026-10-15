/* ── SCHOLARIA ANNOUNCEMENTS & EMERGENCY BULLETIN ENGINE ── */

const ANNOUNCEMENTS_STORAGE_KEY = 'scholaria_announcements_v1';



const DEFAULT_SEED_ANNOUNCEMENTS = [];

function getStoredAnnouncements() {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(a => !['anc_seed_1', 'anc_seed_2', 'anc_seed_3'].includes(a.id));
    }
  } catch (e) {
    return [];
  }
  return [];
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
    if (prioRadio && !prioRadio.disabled && (ROLE !== 'teacher' || anc.priority !== 'critical')) {
      prioRadio.checked = true;
    } else {
      const fallbackRadio = document.querySelector('input[name="ancPriority"][value="important"]');
      if (fallbackRadio) fallbackRadio.checked = true;
    }
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
      <div class="eb-content" style="cursor:pointer;" onclick="openAnnouncementDetailModal('${emergency.id}')" title="Click to view full news advisory">
        <span class="eb-badge">🚨 EMERGENCY ADVISORY</span>
        <span class="eb-text"><strong>${escHtml(emergency.title)}:</strong> ${escHtml(emergency.message.split('\n\n')[0])} ${remaining ? `<span style="opacity:0.85;font-weight:700;margin-left:6px;">(Ends in: ${remaining})</span>` : ''}</span>
      </div>
      <div class="eb-actions">
        <button class="eb-btn" onclick="openEmergencyHotlinesModal()">📞 City Emergency Hotlines</button>
        <button class="eb-btn" onclick="openAnnouncementDetailModal('${emergency.id}')">View Details</button>
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

function openAnnouncementDetailModal(id) {
  const all = getStoredAnnouncements();
  const anc = all.find(a => String(a.id) === String(id));
  if (!anc) return;

  // Mark as read for current user
  markAnnouncementRead(id);
  // Re-render page in background to update unread indicators (non-blocking)
  if (typeof renderPage === 'function') {
    setTimeout(() => renderPage('announcements'), 0);
  }

  const modal = document.getElementById('announcementDetailModal');
  if (!modal) return;

  const titleEl = document.getElementById('ancDetailTitle');
  const catEl = document.getElementById('ancDetailCatBadge');
  const prioEl = document.getElementById('ancDetailPrioBadge');
  const authorEl = document.getElementById('ancDetailAuthor');
  const dateEl = document.getElementById('ancDetailDate');
  const audienceEl = document.getElementById('ancDetailAudience');
  const msgEl = document.getElementById('ancDetailMsg');
  const hotlinesWrap = document.getElementById('ancDetailHotlinesWrap');
  const hotlinesList = document.getElementById('ancDetailHotlinesList');

  if (titleEl) titleEl.textContent = anc.title || 'Announcement';
  if (catEl) {
    let catLabel = '📢 General';
    let catClass = anc.category || 'general';
    if (anc.category === 'emergency') catLabel = '🚨 Emergency & Suspensions';
    else if (anc.category === 'academic') catLabel = '📚 Academic';
    else if (anc.category === 'event') catLabel = '🏫 School Events';
    else if (anc.category === 'others' && anc.customCategory) catLabel = `📌 ${anc.customCategory}`;
    catEl.className = `anc-cat-tag ${catClass}`;
    catEl.textContent = catLabel;
  }

  if (prioEl) {
    if (anc.priority === 'critical') {
      prioEl.innerHTML = '<span style="font-size:11px;font-weight:700;color:#dc2626;background:#fee2e2;padding:2px 8px;border-radius:10px;">⚡ Critical Priority</span>';
    } else if (anc.priority === 'important') {
      prioEl.innerHTML = '<span style="font-size:11px;font-weight:700;color:#d97706;background:#fef3c7;padding:2px 8px;border-radius:10px;">⭐ Important</span>';
    } else {
      prioEl.innerHTML = '<span style="font-size:11px;font-weight:700;color:#059669;background:#dcfce7;padding:2px 8px;border-radius:10px;">📢 Bulletin</span>';
    }
  }

  if (authorEl) authorEl.textContent = `👤 Posted by: ${anc.authorName || 'School Administration'} (${anc.authorRole || 'Admin'})`;
  if (dateEl) dateEl.textContent = `📅 ${formatSentDate(anc.timestamp)}`;
  if (audienceEl) audienceEl.textContent = `👥 Audience: ${(anc.audience || ['All']).join(', ')}`;
  if (msgEl) msgEl.textContent = anc.message || '';

  if (hotlinesWrap && hotlinesList) {
    if (anc.hotlines && anc.hotlines.length) {
      hotlinesWrap.style.display = 'block';
      hotlinesList.innerHTML = anc.hotlines.map(h => `
        <a href="tel:${h.number.replace(/[^0-9+]/g, '')}" class="anc-hotline-chip" title="Click to call ${h.name}" onclick="event.stopPropagation()">
          <span>${h.icon || '📞'} <strong>${escHtml(h.name)}:</strong></span>
          <span class="anc-hotline-num">${escHtml(h.number)}</span>
        </a>
      `).join('');
    } else {
      hotlinesWrap.style.display = 'none';
      hotlinesList.innerHTML = '';
    }
  }

  modal.classList.add('active');
}

function closeAnnouncementDetailModal() {
  const modal = document.getElementById('announcementDetailModal');
  if (modal) modal.classList.remove('active');
}

/* ── ANNOUNCEMENTS HUB PAGE MODULE ── */
let ancCategoryFilter = 'all'; // 'all' | 'emergency' | 'academic' | 'event'
let ancArchiveView = 'active'; // 'active' | 'drafts' | 'archived'

/* ── READ RECEIPT HELPERS ── */
const ANC_READ_KEY = 'scholaria_anc_read_v1';
function getReadAnnouncementIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(ANC_READ_KEY) || '[]'));
  } catch (e) {
    return new Set();
  }
}
function markAnnouncementRead(id) {
  const read = getReadAnnouncementIds();
  read.add(String(id));
  try {
    localStorage.setItem(ANC_READ_KEY, JSON.stringify([...read]));
  } catch (e) {}
}

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
  if (typeof updateSidebarBadges === 'function') updateSidebarBadges();
  renderEmergencyTopBanner();
  if (typeof renderPage === 'function') renderPage('announcements');
}

function buildAnnouncementsPage() {
  const all = getStoredAnnouncements();

  const activeAnnouncements = all.filter(a => !isAnnouncementExpired(a) && a.status !== 'draft' && !a.isDraft);
  const draftAnnouncements = all.filter(a => a.status === 'draft' || a.isDraft);
  const archivedAnnouncements = all.filter(a => isAnnouncementExpired(a) && a.status !== 'draft' && !a.isDraft);

  let currentList = activeAnnouncements;
  if (ancArchiveView === 'drafts') currentList = draftAnnouncements;
  else if (ancArchiveView === 'archived') currentList = archivedAnnouncements;

  const filtered = ancCategoryFilter === 'all'
    ? currentList
    : ancCategoryFilter === 'others'
      ? currentList.filter(a => a.category === 'others' || a.category === 'general')
      : currentList.filter(a => a.category === ancCategoryFilter);

  const emergencyCount = currentList.filter(a => a.category === 'emergency').length;
  const academicCount = currentList.filter(a => a.category === 'academic').length;
  const eventCount = currentList.filter(a => a.category === 'event').length;
  const othersCount = currentList.filter(a => a.category === 'others' || a.category === 'general').length;

  const canPost = ROLE === 'admin' || ROLE === 'teacher';

  return `
  <div class="anc-page-wrap">
    <div class="section-hdr">
      <div>
        <h2>School Announcements & Bulletins</h2>
        <span style="font-size:12.5px;color:var(--text-muted);">Official advisories, class suspension notices, and City of Imus emergency hotlines</span>
      </div>
      ${canPost ? `
        <div style="display:flex; gap:10px; align-items:center;">
          ${ROLE === 'admin' ? `<button class="add-btn" style="background:#475569;border-color:#334155;" onclick="openManageHotlinesModal()">⚙️ Manage Hotlines</button>` : ''}
          <button class="add-btn" onclick="openCreateAnnouncementModal()">
            ${typeof iconPlus === 'function' ? iconPlus() : ''}
            Broadcast Announcement
          </button>
        </div>
      ` : ''}
    </div>

    <!-- Filter Chips Bar + Archive/Draft Toggle -->
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
        <button class="anc-chip ${ancCategoryFilter === 'others' ? 'active' : ''}" onclick="setAncCategoryFilter('others')">
          📌 Others <span class="anc-chip-count">${othersCount}</span>
        </button>
      </div>

      <!-- Archive / Draft View Toggle -->
      <div class="anc-archive-toggle-wrap">
        <button class="anc-archive-tab ${ancArchiveView === 'active' ? 'active' : ''}" onclick="setAncArchiveView('active')">
          ${typeof iconClock === 'function' ? iconClock() : ''} Active (${activeAnnouncements.length})
        </button>
        ${canPost ? `
          <button class="anc-archive-tab ${ancArchiveView === 'drafts' ? 'active' : ''}" onclick="setAncArchiveView('drafts')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Drafts / Unposted (${draftAnnouncements.length})
          </button>
        ` : ''}
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
          const isDraft = anc.status === 'draft' || anc.isDraft;
          const isExpired = !isDraft && isAnnouncementExpired(anc);
          const remainingText = isDraft ? null : getRemainingTimeText(anc.expiresAt);
          const readIds = getReadAnnouncementIds();
          const isUnread = !isDraft && !isExpired && !readIds.has(String(anc.id));

          return `
            <div class="anc-card ${categoryClass}${isUnread ? ' anc-card--unread' : ''}" onclick="openAnnouncementDetailModal('${anc.id}')" style="cursor:pointer;${isExpired ? 'opacity:0.85;background:#f8fafc;' : isDraft ? 'border-left:4px solid #f59e0b;background:#fffdfa;' : ''}" title="Click to view full announcement details">
              <div class="anc-card-header">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span class="anc-cat-tag ${categoryClass}">${catLabel}</span>
                  ${isDraft ? `
                    <span style="font-size:11px;font-weight:700;color:#b45309;background:#fef3c7;padding:2px 8px;border-radius:10px;display:inline-flex;align-items:center;gap:4px;">
                      📝 Draft · Hindi Pa Na-popost
                    </span>
                  ` : isExpired ? `
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
                  ${isUnread ? '<span class="anc-unread-badge">NEW</span>' : ''}
                </div>
                <div class="anc-meta">
                  <span>📅 ${dateStr}</span>
                  ${isDraft && canManage ? `
                    <button class="ca-approve" style="padding:4px 10px;font-size:11.5px;font-weight:700;background:#059669;color:#fff;border:none;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;margin-left:6px;" onclick="event.stopPropagation(); publishAnnouncementDraft('${anc.id}')" title="Publish Announcement Live">
                      🚀 Post Now
                    </button>
                  ` : ''}
                  ${canManage ? `
                    <button class="notif-del-row-btn" style="margin-left:8px;" onclick="event.stopPropagation(); deleteAnnouncement('${anc.id}')" title="Delete Announcement">
                      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  ` : ''}
                </div>
              </div>

              <div class="anc-card-body">
                <h3 class="anc-card-title${isUnread ? ' unread' : ''}" style="${isUnread ? 'font-weight:900;' : ''}">${isUnread ? '<span class="anc-unread-dot"></span>' : ''}${escHtml(anc.title)}</h3>
                <p class="anc-card-msg">${escHtml(anc.message)}</p>

                ${anc.hotlines && anc.hotlines.length ? `
                  <div class="anc-hotline-box" onclick="event.stopPropagation()">
                    <div style="font-size:11.5px;font-weight:800;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">📞 City of Imus Emergency Hotlines</div>
                    <div class="anc-hotline-chips">
                      ${anc.hotlines.map(h => `
                        <a href="tel:${h.number.replace(/[^0-9+]/g, '')}" class="anc-hotline-chip" title="Click to call ${h.name}" onclick="event.stopPropagation()">
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
                
                <div style="display:flex;align-items:center;gap:8px;" onclick="event.stopPropagation()">
                  ${canManage ? `
                    ${isDraft ? `
                      <button class="anc-preset-btn" style="padding:3px 8px;font-size:11px;background:#fef3c7;color:#b45309;border-color:#fde68a;" onclick="event.stopPropagation(); reuseAnnouncement('${anc.id}')" title="Edit Draft">
                        ✏️ Edit Draft
                      </button>
                    ` : isExpired ? `
                      <button class="anc-preset-btn" style="padding:3px 8px;font-size:11px;background:#e0f2fe;color:#0369a1;border-color:#bae6fd;" onclick="event.stopPropagation(); reuseAnnouncement('${anc.id}')" title="Reuse & Edit this Announcement">
                        ${typeof iconRefresh === 'function' ? iconRefresh() : ''} Reuse Announcement
                      </button>
                    ` : anc.expiresAt ? `
                      <button class="anc-preset-btn" style="padding:3px 8px;font-size:11px;" onclick="event.stopPropagation(); extendAnnouncementDeadline('${anc.id}', 2)" title="Extend Deadline by 2 Days">
                        ${typeof iconPlus === 'function' ? iconPlus() : ''} Extend +2 Days
                      </button>
                    ` : ''}
                    ${!isDraft ? `
                      <button class="anc-preset-btn" style="padding:3px 8px;font-size:11px;" onclick="event.stopPropagation(); toggleArchiveAnnouncement('${anc.id}')">
                        ${typeof iconArchive === 'function' ? iconArchive() : ''} ${anc.isArchived ? 'Unarchive' : 'Archive'}
                      </button>
                    ` : ''}
                  ` : ''}
                  <span>Audience: ${(anc.audience || ['All']).join(', ')}</span>
                </div>
              </div>
            </div>
          `;
        }).join('') : `
          <div style="padding:40px;text-align:center;color:var(--text-muted);background:#fff;border-radius:16px;border:1.5px solid #e8f0fe;">
            No ${ancArchiveView === 'active' ? 'active' : ancArchiveView === 'drafts' ? 'draft' : 'archived'} announcements in this category.
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
      criticalRadio.checked = false;
      if (criticalRadio.closest('.anc-radio-label')) {
        criticalRadio.closest('.anc-radio-label').style.display = 'none';
      }
    }
    if (importantRadio) importantRadio.checked = true;
    resetAncCategorySelect('academic');

    const allTeachersCb = document.querySelector('input[name="ancAudience"][value="All Teachers"]');
    if (allTeachersCb) {
      allTeachersCb.checked = false;
      allTeachersCb.disabled = true;
      if (allTeachersCb.closest('.anc-checkbox-label')) {
        allTeachersCb.closest('.anc-checkbox-label').style.opacity = '0.45';
        allTeachersCb.closest('.anc-checkbox-label').style.cursor = 'not-allowed';
      }
    }

    const allStudentsCb = document.querySelector('input[name="ancAudience"][value="All Students"]');
    if (allStudentsCb) {
      allStudentsCb.checked = false;
    }
  } else {
    if (emergencyOpt) {
      emergencyOpt.disabled = false;
      emergencyOpt.hidden = false;
    }
    if (criticalRadio) {
      criticalRadio.disabled = false;
      criticalRadio.checked = true;
      if (criticalRadio.closest('.anc-radio-label')) {
        criticalRadio.closest('.anc-radio-label').style.display = '';
        criticalRadio.closest('.anc-radio-label').style.opacity = '1';
        criticalRadio.closest('.anc-radio-label').style.cursor = 'pointer';
      }
    }
    resetAncCategorySelect('emergency');
    
    const allTeachersCb = document.querySelector('input[name="ancAudience"][value="All Teachers"]');
    if (allTeachersCb) {
      allTeachersCb.disabled = false;
      if (allTeachersCb.closest('.anc-checkbox-label')) {
        allTeachersCb.closest('.anc-checkbox-label').style.opacity = '1';
        allTeachersCb.closest('.anc-checkbox-label').style.cursor = 'pointer';
      }
    }
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

function submitCreateAnnouncement(isDraft = false) {
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

  if (!isDraft && ROLE === 'teacher' && categoryValue === 'emergency') {
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
    const hl = (typeof getStoredHotlines === "function" ? getStoredHotlines() : []).find(h => h.id === cb.value);
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
    priority: (ROLE === 'teacher' && priorityInput && priorityInput.value === 'critical')
      ? 'important'
      : (priorityInput ? priorityInput.value : 'normal'),
    audience: selectedAudience.length ? selectedAudience : ['All Students', 'All Teachers'],
    message: msgInput.value.trim(),
    authorName: CURRENT_PROFILE ? CURRENT_PROFILE.full_name : 'School Administration',
    authorRole: ROLE === 'admin' ? 'Admin' : 'Teacher',
    timestamp: new Date().toISOString(),
    expiresAt: expiresAtVal,
    isArchived: false,
    isDraft: !!isDraft,
    status: isDraft ? 'draft' : 'active',
    hotlines: selectedHotlines.length ? selectedHotlines : (typeof getStoredHotlines === "function" ? getStoredHotlines() : []).slice(0, 4)
  };

  const all = getStoredAnnouncements();
  all.unshift(newAnc);
  saveAnnouncements(all);

  if (!isDraft) {
    // Send real-time notification
    if (typeof addNotification === 'function') {
      addNotification({
        targetRole: 'all',
        title: (newAnc.priority === 'critical' ? '🚨 EMERGENCY: ' : '') + newAnc.title,
        message: newAnc.message.slice(0, 100) + '…',
        type: newAnc.category === 'emergency' ? 'approval' : 'info',
        senderName: newAnc.authorName,
        senderAvatar: typeof initialsFor === 'function' ? initialsFor(newAnc.authorName) : 'SA'
      });
    }

    if (newAnc.priority === 'critical') {
      sessionStorage.removeItem('scholaria_emergency_dismissed');
    }
    showToast('Announcement broadcasted successfully!', 'success');
  } else {
    showToast('Announcement saved as draft (not yet posted)', 'info');
  }

  closeCreateAnnouncementModal();
  if (typeof updateSidebarBadges === 'function') updateSidebarBadges();
  renderEmergencyTopBanner();
  if (typeof renderPage === 'function') renderPage('announcements');
}

function publishAnnouncementDraft(id) {
  const all = getStoredAnnouncements();
  const anc = all.find(a => String(a.id) === String(id));
  if (!anc) return;

  anc.isDraft = false;
  anc.status = 'active';
  anc.timestamp = new Date().toISOString();
  saveAnnouncements(all);

  if (typeof addNotification === 'function') {
    addNotification({
      targetRole: 'all',
      title: (anc.priority === 'critical' ? '🚨 EMERGENCY: ' : '') + anc.title,
      message: anc.message.slice(0, 100) + '…',
      type: anc.category === 'emergency' ? 'approval' : 'info',
      senderName: anc.authorName,
      senderAvatar: typeof initialsFor === 'function' ? initialsFor(anc.authorName) : 'SA'
    });
  }

  if (anc.priority === 'critical') {
    sessionStorage.removeItem('scholaria_emergency_dismissed');
  }

  showToast('Announcement published and broadcasted live!', 'success');
  if (typeof updateSidebarBadges === 'function') updateSidebarBadges();
  renderEmergencyTopBanner();
  if (typeof renderPage === 'function') renderPage('announcements');
}

/* ── NEWS ALERT POPUP (Persistent single-view until a NEW announcement is posted) ── */

function getSeenNewsAlertIds() {
  try {
    const raw = localStorage.getItem('scholaria_news_popup_seen_ids_v1');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function markNewsAlertsAsSeen(ids) {
  try {
    const set = getSeenNewsAlertIds();
    ids.forEach(id => set.add(String(id)));
    localStorage.setItem('scholaria_news_popup_seen_ids_v1', JSON.stringify([...set]));
  } catch (e) {}
}

function closeNewsAlertModal() {
  const modal = document.getElementById('newsAlertModal');
  if (modal) modal.classList.remove('active');

  // Mark all active announcements as seen so it will NEVER pop up again until a BRAND NEW announcement is posted!
  const all = typeof getStoredAnnouncements === 'function' ? getStoredAnnouncements() : [];
  const active = all.filter(a =>
    !a.isArchived && a.status !== 'draft' && !a.isDraft &&
    !(a.expiresAt && new Date(a.expiresAt).getTime() <= Date.now())
  );
  markNewsAlertsAsSeen(active.map(a => a.id));
}

function showNewsAlertIfNeeded() {
  // Only for students
  if (typeof ROLE === 'undefined' || ROLE !== 'student') return;

  const modal = document.getElementById('newsAlertModal');
  const listEl = document.getElementById('newsAlertList');
  if (!modal || !listEl) return;

  const all = typeof getStoredAnnouncements === 'function' ? getStoredAnnouncements() : [];
  const seenIds = getSeenNewsAlertIds();

  // Get active, non-draft announcements
  const active = all.filter(a =>
    !a.isArchived && a.status !== 'draft' && !a.isDraft &&
    !(a.expiresAt && new Date(a.expiresAt).getTime() <= Date.now())
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // If no active announcements exist, never show popup
  if (!active.length) return;

  // Filter for brand-new announcements that the student has NOT seen in the pop-up yet
  const unseenNew = active.filter(a => !seenIds.has(String(a.id)));

  // If there are NO new announcements, DO NOT SHOW POPUP!
  // The popup will ONLY trigger if a teacher/admin posted a brand new announcement!
  if (!unseenNew.length) return;

  // Priority: unseen emergency first, then other unseen announcements
  const emergencyUnseen = unseenNew.filter(a => a.category === 'emergency');
  const otherUnseen = unseenNew.filter(a => a.category !== 'emergency');
  const toShow = [...emergencyUnseen, ...otherUnseen].slice(0, 4);

  if (!toShow.length) return;

  const catConfig = {
    emergency: { label: '🚨 Suspension / Emergency', bg: '#fee2e2', color: '#dc2626', icon: '🚨' },
    academic:  { label: '📚 Academic Update',         bg: '#e0f2fe', color: '#0369a1', icon: '📚' },
    event:     { label: '🏫 School Event',             bg: '#dcfce7', color: '#15803d', icon: '🏫' },
    others:    { label: '📌 Others',                   bg: '#ede9fe', color: '#6d28d9', icon: '📌' },
    general:   { label: '📢 General',                  bg: '#f1f5f9', color: '#475569', icon: '📢' },
  };

  // Update header if there's an emergency
  const hasEmergency = emergencyUnread.length > 0;
  const headerGrad = hasEmergency
    ? 'background:linear-gradient(135deg,#991b1b 0%,#dc2626 100%)'
    : 'background:linear-gradient(135deg,#1e40af 0%,#2563eb 100%)';
  const headerIcon = hasEmergency ? '🚨' : '📰';
  const headerTitle = hasEmergency ? '⚠️ Class Suspension / Emergency Alert' : 'Latest School News';
  const headerSub = hasEmergency
    ? 'Important advisory — please read before proceeding'
    : 'Recent announcements for you';

  const headerEl = modal.querySelector('[style*="linear-gradient"]');
  if (headerEl) {
    headerEl.style.cssText = headerEl.style.cssText.replace(/background:[^;]+/, headerGrad);
    const iconEl = headerEl.querySelector('[style*="font-size:20px"]');
    if (iconEl) iconEl.textContent = headerIcon;
    const titleEls = headerEl.querySelectorAll('div > div');
    if (titleEls[0]) titleEls[0].textContent = headerTitle;
    if (titleEls[1]) titleEls[1].textContent = headerSub;
  }

  listEl.innerHTML = toShow.map(anc => {
    const cfg = catConfig[anc.category] || catConfig.general;
    const timeAgo = (() => {
      const diff = Date.now() - new Date(anc.timestamp).getTime();
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor(diff / 3600000);
      const mins = Math.floor(diff / 60000);
      if (days > 0) return `${days}d ago`;
      if (hrs > 0)  return `${hrs}h ago`;
      if (mins > 0) return `${mins}m ago`;
      return 'Just now';
    })();

    return `
      <div onclick="openAnnouncementDetailModal('${anc.id}'); closeNewsAlertModal();"
        style="display:flex;gap:12px;padding:12px 14px;border-radius:12px;cursor:pointer;
          border:1.5px solid ${anc.category === 'emergency' ? '#fca5a5' : '#e8f0fe'};
          background:${anc.category === 'emergency' ? '#fff5f5' : '#f8faff'};
          ${anc.category === 'emergency' ? 'border-left:4px solid #dc2626;' : ''}
          transition:all 0.15s;"
        onmouseover="this.style.transform='translateX(4px)'"
        onmouseout="this.style.transform=''"
        title="Click to read full announcement">
        <div style="width:36px;height:36px;border-radius:10px;flex-shrink:0;
          background:${cfg.bg};display:flex;align-items:center;justify-content:center;font-size:17px;">${cfg.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;">
            <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;
              background:${cfg.bg};color:${cfg.color};text-transform:uppercase;letter-spacing:0.3px;">${cfg.label}</span>
            <span style="font-size:11px;color:#94a3b8;margin-left:auto;">${timeAgo}</span>
          </div>
          <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:2px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${typeof escHtml === 'function' ? escHtml(anc.title) : anc.title}</div>
          <div style="font-size:12px;color:#64748b;line-height:1.4;
            display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${typeof escHtml === 'function' ? escHtml(anc.message.replace(/\n/g, ' ')) : anc.message}</div>
        </div>
      </div>`;
  }).join('');

  // Show modal after a short delay so dashboard renders first
  setTimeout(() => {
    modal.classList.add('active');
    markNewsAlertsAsSeen(toShow.map(a => a.id));
  }, 600);
}

function renderDashboardNewsWidget() {
  const all = typeof getStoredAnnouncements === "function" ? getStoredAnnouncements() : [];
  const readIds = typeof getReadAnnouncementIds === "function" ? getReadAnnouncementIds() : new Set();
  
  const active = all.filter(a =>
    !a.isArchived && a.status !== "draft" && !a.isDraft &&
    !(a.expiresAt && new Date(a.expiresAt).getTime() <= Date.now())
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 3);

  if (!active.length) {
    return `<div style="padding:20px;text-align:center;color:var(--text-muted);background:#fff;border-radius:12px;border:1px dashed #cbd5e1;font-size:13px;">No recent news or announcements.</div>`;
  }

  const catConfig = {
    emergency: { label: "Suspension", bg: "#fee2e2", color: "#dc2626", icon: "🚨" },
    academic:  { label: "Academic", bg: "#e0f2fe", color: "#0369a1", icon: "📚" },
    event:     { label: "Event", bg: "#dcfce7", color: "#15803d", icon: "🏫" },
    others:    { label: "Others", bg: "#ede9fe", color: "#6d28d9", icon: "📌" },
    general:   { label: "General", bg: "#f1f5f9", color: "#475569", icon: "📢" },
  };

  return active.map(anc => {
    const cfg = catConfig[anc.category] || catConfig.general;
    const isUnread = !readIds.has(String(anc.id));
    const timeAgo = (() => {
      const diff = Date.now() - new Date(anc.timestamp).getTime();
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor(diff / 3600000);
      const mins = Math.floor(diff / 60000);
      if (days > 0) return `${days}d ago`;
      if (hrs > 0)  return `${hrs}h ago`;
      if (mins > 0) return `${mins}m ago`;
      return "Just now";
    })();

    return `
      <div onclick="openAnnouncementDetailModal('${anc.id}')"
        style="display:flex;gap:12px;padding:12px;border-radius:12px;cursor:pointer;margin-bottom:8px;
          border:1px solid ${anc.category === 'emergency' ? '#fca5a5' : '#e8f0fe'};
          background:${anc.category === 'emergency' ? '#fff5f5' : '#fff'};
          ${anc.category === 'emergency' ? 'border-left:4px solid #dc2626;' : ''}
          ${isUnread ? 'box-shadow:0 2px 8px rgba(37,99,235,0.08);' : ''}
          transition:all 0.15s;"
        onmouseover="this.style.transform='translateX(4px)'"
        onmouseout="this.style.transform=''"
        title="Click to read full announcement">
        <div style="width:32px;height:32px;border-radius:10px;flex-shrink:0;
          background:${cfg.bg};display:flex;align-items:center;justify-content:center;font-size:16px;">${cfg.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;">
            <span style="font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:20px;
              background:${cfg.bg};color:${cfg.color};text-transform:uppercase;letter-spacing:0.3px;">${cfg.label}</span>
            <span style="font-size:10px;color:#94a3b8;margin-left:auto;">${timeAgo}</span>
          </div>
          <div style="font-size:12.5px;font-weight:${isUnread ? '800' : '600'};color:#0f172a;margin-bottom:2px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${isUnread ? '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#ef4444;margin-right:4px;vertical-align:middle;"></span>' : ''}
            ${typeof escHtml === 'function' ? escHtml(anc.title) : anc.title}
          </div>
        </div>
      </div>`;
  }).join('');
}










