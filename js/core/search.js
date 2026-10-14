/* ── GLOBAL OMNI-SEARCH & SPOTLIGHT ENGINE FOR SCHOLARIA ── */

(function() {
  let activeIndex = -1;
  let searchDebounceTimer = null;

  function initGlobalSearch() {
    const input = document.getElementById('globalSearchInput');
    const wrap = document.getElementById('globalSearchWrap');
    const dropdown = document.getElementById('searchResultsDropdown');
    const clearBtn = document.getElementById('globalSearchClearBtn');
    const kbdBadge = document.getElementById('searchKbdBadge');

    if (!input || !dropdown) return;

    // Detect macOS vs Windows/Linux for keyboard badge
    if (kbdBadge) {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      kbdBadge.textContent = isMac ? '⌘K' : 'Ctrl K';
    }

    // Input Typing
    input.addEventListener('input', e => {
      const val = e.target.value.trim();
      if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
      if (kbdBadge) kbdBadge.style.display = val ? 'none' : 'inline-block';

      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        if (!val) {
          renderSuggestionsMenu();
        } else {
          executeSearch(val);
        }
      }, 120);
    });

    // Focus / Click
    input.addEventListener('focus', () => {
      const val = input.value.trim();
      if (val) {
        executeSearch(val);
      } else {
        renderSuggestionsMenu();
      }
      dropdown.style.display = 'block';
    });

    // Clear Button
    if (clearBtn) {
      clearBtn.addEventListener('click', e => {
        e.stopPropagation();
        input.value = '';
        clearBtn.style.display = 'none';
        if (kbdBadge) kbdBadge.style.display = 'inline-block';
        input.focus();
        renderSuggestionsMenu();
      });
    }

    // Keyboard Navigation on Search Input
    input.addEventListener('keydown', e => {
      const items = dropdown.querySelectorAll('.search-result-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!items.length) return;
        activeIndex = (activeIndex + 1) % items.length;
        updateActiveItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        updateActiveItem(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) {
          items[activeIndex].click();
        } else if (items.length > 0) {
          items[0].click();
        }
      } else if (e.key === 'Escape') {
        closeGlobalSearch();
        input.blur();
      }
    });

    // Global Hotkeys (Ctrl+K, Cmd+K, or '/')
    document.addEventListener('keydown', e => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
        dropdown.style.display = 'block';
        if (!input.value.trim()) renderSuggestionsMenu();
      } else if (e.key === '/' && document.activeElement !== input && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
        dropdown.style.display = 'block';
        if (!input.value.trim()) renderSuggestionsMenu();
      }
    });

    // Click Outside
    document.addEventListener('click', e => {
      if (wrap && !wrap.contains(e.target)) {
        closeGlobalSearch();
      }
    });
  }

  function updateActiveItem(items) {
    items.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  function closeGlobalSearch() {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (dropdown) dropdown.style.display = 'none';
    activeIndex = -1;
  }

  window.closeGlobalSearch = closeGlobalSearch;

  function highlightMatches(text, query) {
    if (!text) return '';
    if (!query) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const cleanQ = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!cleanQ) return escapedText;
    const regex = new RegExp(`(${cleanQ})`, 'gi');
    return escapedText.replace(regex, '<mark class="search-hl">$1</mark>');
  }

  function escapeHtml(str) {
    if (typeof escHtml === 'function') return escHtml(str);
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getCurrentUserRole() {
    if (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE && CURRENT_PROFILE.role) {
      return CURRENT_PROFILE.role;
    }
    if (typeof ROLE !== 'undefined') return ROLE;
    return 'student';
  }

  // ── CORE SEARCH AGGREGATOR ──
  function executeSearch(query) {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) return;
    activeIndex = -1;

    const q = query.toLowerCase().trim();
    const role = getCurrentUserRole();
    const categories = [];

    // 1. SUBJECTS & COURSES
    const courseMatches = [];
    if (typeof COURSES_DATABASE !== 'undefined' && Array.isArray(COURSES_DATABASE)) {
      COURSES_DATABASE.forEach(c => {
        const titleMatch = (c.title || '').toLowerCase().includes(q);
        const codeMatch = (c.code || '').toLowerCase().includes(q);
        const strandMatch = (c.strand || '').toLowerCase().includes(q);
        const instrMatch = (c.instructor || '').toLowerCase().includes(q);
        const descMatch = (c.description || '').toLowerCase().includes(q);

        if (titleMatch || codeMatch || strandMatch || instrMatch || descMatch) {
          courseMatches.push({
            id: c.id,
            title: c.title,
            subtitle: `${c.code || ''} • ${c.strand || ''} • Instructor: ${c.instructor || 'Staff'}`,
            icon: '📚',
            badge: c.strand || 'Subject',
            action: () => {
              closeGlobalSearch();
              if (typeof renderPage === 'function') renderPage('materials');
              if (typeof setActiveSubjectMaterials === 'function') setActiveSubjectMaterials(c.id);
            }
          });
        }
      });
    }
    if (courseMatches.length) {
      categories.push({ name: 'Subjects & Courses', icon: '📚', items: courseMatches.slice(0, 4) });
    }

    // 2. LEARNING MATERIALS & HANDOUTS
    const materialMatches = [];
    let allMaterials = [];
    if (typeof materialsData !== 'undefined' && Array.isArray(materialsData)) {
      allMaterials = materialsData;
    } else if (typeof getCustomMaterialsFromStorage === 'function') {
      allMaterials = getCustomMaterialsFromStorage();
    }
    allMaterials.forEach(m => {
      // Role safety: students only see approved materials
      if (role === 'student' && m.status && m.status !== 'approved') return;

      const titleMatch = (m.title || '').toLowerCase().includes(q);
      const subMatch = (m.subject || '').toLowerCase().includes(q);
      const strandMatch = (m.strand || '').toLowerCase().includes(q);
      const fileMatch = (m.fileName || m.filename || '').toLowerCase().includes(q);
      const uploaderMatch = (m.uploader_name || m.uploaded_by || '').toLowerCase().includes(q);

      if (titleMatch || subMatch || strandMatch || fileMatch || uploaderMatch) {
        materialMatches.push({
          id: m.id,
          title: m.title,
          subtitle: `${m.subject || 'General'} • Handout / Document • ${(m.uploader_name || 'Teacher')}`,
          icon: '📄',
          badge: m.strand || 'Handout',
          action: () => {
            closeGlobalSearch();
            if (typeof previewOrDownloadMaterial === 'function') {
              previewOrDownloadMaterial(m.id);
            } else if (typeof renderPage === 'function') {
              renderPage('materials');
            }
          }
        });
      }
    });
    if (materialMatches.length) {
      categories.push({ name: 'Learning Materials & PDFs', icon: '📄', items: materialMatches.slice(0, 4) });
    }

    // 3. QUIZZES & ASSESSMENTS
    const quizMatches = [];
    let allQuizzes = [];
    if (typeof customQuizzes !== 'undefined' && Array.isArray(customQuizzes)) {
      allQuizzes = customQuizzes;
    }
    allQuizzes.forEach(quiz => {
      // Role safety: students only see active quizzes
      if (role === 'student' && quiz.status && quiz.status !== 'active') return;

      const titleMatch = (quiz.title || '').toLowerCase().includes(q);
      const subMatch = (quiz.subject || '').toLowerCase().includes(q);
      const lessonMatch = (quiz.lesson || '').toLowerCase().includes(q);

      if (titleMatch || subMatch || lessonMatch) {
        const isInteractive = quiz.type === 'interactive';
        quizMatches.push({
          id: quiz.id,
          title: quiz.title,
          subtitle: `${quiz.subject || 'General'} • ${isInteractive ? 'Interactive Arena' : 'Standard Assessment'}`,
          icon: isInteractive ? '🎮' : '📝',
          badge: isInteractive ? 'Game' : 'Quiz',
          action: () => {
            closeGlobalSearch();
            if (role === 'student' && typeof openTakeQuizModal === 'function') {
              openTakeQuizModal(quiz.id);
            } else if (typeof renderPage === 'function') {
              renderPage(role === 'teacher' ? 'quiz' : 'quizzes');
            }
          }
        });
      }
    });
    if (quizMatches.length) {
      categories.push({ name: 'Quizzes & Assessments', icon: '📝', items: quizMatches.slice(0, 4) });
    }

    // 4. ANNOUNCEMENTS & ADVISORIES
    const ancMatches = [];
    let allAncs = [];
    if (typeof getStoredAnnouncements === 'function') {
      allAncs = getStoredAnnouncements();
    }
    allAncs.forEach(anc => {
      // Role safety: students only see published non-draft items
      if (role === 'student' && (anc.isDraft || anc.status === 'draft')) return;

      const titleMatch = (anc.title || '').toLowerCase().includes(q);
      const msgMatch = (anc.message || '').toLowerCase().includes(q);
      const catMatch = (anc.category || anc.customCategory || '').toLowerCase().includes(q);

      if (titleMatch || msgMatch || catMatch) {
        ancMatches.push({
          id: anc.id,
          title: anc.title,
          subtitle: `${anc.priority ? anc.priority.toUpperCase() + ' • ' : ''}${anc.category || 'General News'}`,
          icon: anc.priority === 'critical' ? '🚨' : '📢',
          badge: anc.category || 'News',
          action: () => {
            closeGlobalSearch();
            if (typeof openAnnouncementDetailModal === 'function') {
              openAnnouncementDetailModal(anc.id);
            } else if (typeof renderPage === 'function') {
              renderPage('announcements');
            }
          }
        });
      }
    });
    if (ancMatches.length) {
      categories.push({ name: 'Announcements & News', icon: '📢', items: ancMatches.slice(0, 3) });
    }

    // 5. EMERGENCY HOTLINES
    const hotlineMatches = [];
    let allHotlines = [];
    if (typeof getStoredHotlines === 'function') {
      allHotlines = getStoredHotlines();
    }
    allHotlines.forEach(hl => {
      const nameMatch = (hl.name || '').toLowerCase().includes(q);
      const shortMatch = (hl.shortName || '').toLowerCase().includes(q);
      const numMatch = (hl.number || '').toLowerCase().includes(q);
      const telMatch = (hl.tel || '').toLowerCase().includes(q);

      if (nameMatch || shortMatch || numMatch || telMatch) {
        hotlineMatches.push({
          id: hl.id,
          title: `${hl.icon || '📞'} ${hl.name}`,
          subtitle: `Tel: ${hl.number} (${hl.tel}) • Click to Dial Hotline`,
          icon: hl.icon || '🚨',
          badge: 'Emergency',
          action: () => {
            closeGlobalSearch();
            if (typeof openEmergencyHotlinesModal === 'function') {
              openEmergencyHotlinesModal();
            } else {
              window.location.href = `tel:${hl.tel}`;
            }
          }
        });
      }
    });
    if (hotlineMatches.length) {
      categories.push({ name: 'Emergency Hotlines', icon: '🚨', items: hotlineMatches.slice(0, 3) });
    }

    // 6. PEOPLE & DIRECTORY (Role-Aware)
    const peopleMatches = [];
    let allUsers = [];
    if (typeof registeredUsers !== 'undefined' && Array.isArray(registeredUsers)) {
      allUsers = registeredUsers;
    } else if (typeof DEFAULT_SEED_USERS !== 'undefined') {
      allUsers = [...DEFAULT_SEED_USERS, ...(typeof DEFAULT_SEED_ADMINS !== 'undefined' ? DEFAULT_SEED_ADMINS : [])];
    }

    allUsers.forEach(u => {
      // Role filter: students only see teachers and admins
      if (role === 'student' && u.role === 'student') return;

      const nameMatch = (u.name || u.full_name || '').toLowerCase().includes(q);
      const idMatch = (u.id || '').toLowerCase().includes(q);
      const roleMatch = (u.role || '').toLowerCase().includes(q);
      const strandMatch = (u.strand || '').toLowerCase().includes(q);

      if (nameMatch || idMatch || roleMatch || strandMatch) {
        peopleMatches.push({
          id: u.id || u.dbId,
          title: u.name || u.full_name,
          subtitle: `${(u.role || 'Member').toUpperCase()}${u.strand ? ' • ' + u.strand : ''}${u.section ? ' • ' + u.section : ''}`,
          icon: u.role === 'student' ? '🎓' : u.role === 'teacher' ? '👨‍🏫' : '🛡️',
          badge: u.role || 'User',
          action: () => {
            closeGlobalSearch();
            if (role === 'student') {
              if (typeof renderPage === 'function') renderPage('chats');
            } else {
              if (typeof renderPage === 'function') renderPage('users');
            }
          }
        });
      }
    });
    if (peopleMatches.length) {
      categories.push({ name: 'People & Directory', icon: '👥', items: peopleMatches.slice(0, 3) });
    }

    // 7. QUICK COMMANDS & ACTIONS
    const actionMatches = [];
    const commandList = [
      { name: 'Dashboard Home', sub: 'Jump to student/admin overview', icon: '🏠', roles: ['student', 'teacher', 'admin'], run: () => renderPage('dashboard') },
      { name: 'My Progress & Grades', sub: 'View academic standing and quiz review', icon: '📈', roles: ['student'], run: () => renderPage('progress') },
      { name: 'My Materials Repository', sub: 'Browse and download subject modules', icon: '📂', roles: ['student'], run: () => renderPage('materials') },
      { name: 'Materials Manager', sub: 'Manage learning handouts and uploads', icon: '📂', roles: ['teacher', 'admin'], run: () => renderPage('materials') },
      { name: 'Quizzes & Assessments', sub: 'Take tests and interactive games', icon: '🎯', roles: ['student', 'teacher', 'admin'], run: () => renderPage(role === 'teacher' ? 'quiz' : 'quizzes') },
      { name: 'Create / AI Quiz Maker', sub: 'Generate quizzes from documents', icon: '⚡', roles: ['teacher', 'admin'], run: () => typeof openQuizModal === 'function' ? openQuizModal() : window.location.href = 'quiz-maker.html' },
      { name: 'Upload Learning Material', sub: 'Submit new handout or lecture notes', icon: '📤', roles: ['teacher', 'admin'], run: () => typeof openMaterialModal === 'function' ? openMaterialModal() : null },
      { name: 'Broadcast Announcement', sub: 'Create new school news or advisory', icon: '📢', roles: ['teacher', 'admin'], run: () => typeof openCreateAnnouncementModal === 'function' ? openCreateAnnouncementModal() : null },
      { name: 'Manage Emergency Hotlines', sub: 'Add or modify hotline numbers', icon: '⚙️', roles: ['admin'], run: () => typeof openManageHotlinesModal === 'function' ? openManageHotlinesModal() : null },
      { name: 'Emergency Directory', sub: 'View contact numbers and emergency hotlines', icon: '📞', roles: ['student', 'teacher', 'admin'], run: () => typeof openEmergencyHotlinesModal === 'function' ? openEmergencyHotlinesModal() : null },
      { name: 'School Announcements', sub: 'Browse campus broadcasts and notices', icon: '📰', roles: ['student', 'teacher', 'admin'], run: () => renderPage('announcements') },
      { name: 'Class Chats & Discussions', sub: 'Direct messages and group study channels', icon: '💬', roles: ['student', 'teacher', 'admin'], run: () => renderPage('chats') },
      { name: 'My Profile & Security', sub: 'Manage account, password, and 2FA', icon: '👤', roles: ['student', 'teacher', 'admin'], run: () => renderPage('profile') }
    ];

    commandList.forEach(cmd => {
      if (!cmd.roles.includes(role)) return;
      if (cmd.name.toLowerCase().includes(q) || cmd.sub.toLowerCase().includes(q)) {
        actionMatches.push({
          title: cmd.name,
          subtitle: cmd.sub,
          icon: cmd.icon,
          badge: 'Action',
          action: () => {
            closeGlobalSearch();
            cmd.run();
          }
        });
      }
    });
    if (actionMatches.length) {
      categories.push({ name: 'Quick Actions & Commands', icon: '⚡', items: actionMatches.slice(0, 3) });
    }

    renderResultsHTML(categories, query);
  }

  // ── RENDER RESULTS DROPDOWN ──
  function renderResultsHTML(categories, query) {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) return;

    if (!categories.length) {
      dropdown.innerHTML = `
        <div class="search-empty-state">
          <div style="font-size:32px;margin-bottom:8px;">🔍</div>
          <div style="font-weight:700;color:#0f172a;font-size:14px;margin-bottom:4px;">No matching results</div>
          <div style="font-size:12px;color:#64748b;max-width:320px;margin:0 auto;">
            We couldn't find anything matching <strong>"${escapeHtml(query)}"</strong>. Try searching for subjects, handout files, quizzes, or hotlines.
          </div>
        </div>
      `;
      dropdown.style.display = 'block';
      return;
    }

    // Attach actions to window for safe execution
    window._searchActionMap = window._searchActionMap || {};

    let html = `<div class="search-results-scroll">`;
    let globalIndex = 0;

    categories.forEach(cat => {
      html += `
        <div class="search-cat-header">
          <span>${cat.icon}</span>
          <span>${cat.name}</span>
          <span class="search-cat-count">${cat.items.length}</span>
        </div>
      `;

      cat.items.forEach(item => {
        const actionKey = 'act_' + (globalIndex++);
        window._searchActionMap[actionKey] = item.action;

        html += `
          <div class="search-result-item" onclick="window._searchActionMap['${actionKey}']()">
            <div class="search-res-icon">${item.icon}</div>
            <div class="search-res-content">
              <div class="search-res-title">
                ${highlightMatches(item.title, query)}
                ${item.badge ? `<span class="search-res-badge">${escapeHtml(item.badge)}</span>` : ''}
              </div>
              <div class="search-res-subtitle">${highlightMatches(item.subtitle, query)}</div>
            </div>
            <div class="search-res-jump">Jump ↵</div>
          </div>
        `;
      });
    });

    html += `</div>`;
    html += `
      <div class="search-dropdown-footer">
        <span>Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>Enter</kbd> to select, <kbd>Esc</kbd> to close</span>
      </div>
    `;

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
  }

  // ── RENDER DEFAULT SUGGESTIONS MENU ──
  function renderSuggestionsMenu() {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) return;
    activeIndex = -1;

    const role = getCurrentUserRole();
    window._searchActionMap = window._searchActionMap || {};

    let html = `
      <div class="search-results-scroll">
        <div class="search-cat-header">
          <span>⚡</span>
          <span>Quick Actions</span>
        </div>
        <div class="search-quick-chips">
    `;

    const chips = [
      { label: '📚 Enrolled Subjects', action: () => { closeGlobalSearch(); renderPage('materials'); } },
      { label: '📝 Available Quizzes', action: () => { closeGlobalSearch(); renderPage(role === 'teacher' ? 'quiz' : 'quizzes'); } },
      { label: '📢 Latest News', action: () => { closeGlobalSearch(); renderPage('announcements'); } },
      { label: '🚨 Emergency Hotlines', action: () => { closeGlobalSearch(); if (typeof openEmergencyHotlinesModal === 'function') openEmergencyHotlinesModal(); } }
    ];

    if (role === 'teacher' || role === 'admin') {
      chips.unshift({ label: '➕ AI Quiz Maker', action: () => { closeGlobalSearch(); typeof openQuizModal === 'function' ? openQuizModal() : window.location.href = 'quiz-maker.html'; } });
      chips.unshift({ label: '📤 Upload Material', action: () => { closeGlobalSearch(); typeof openMaterialModal === 'function' ? openMaterialModal() : null; } });
    }

    chips.forEach((c, idx) => {
      const actKey = 'chip_' + idx;
      window._searchActionMap[actKey] = c.action;
      html += `<button type="button" class="search-quick-chip" onclick="window._searchActionMap['${actKey}']()">${c.label}</button>`;
    });

    html += `</div>`;

    // Add Popular Subjects
    if (typeof COURSES_DATABASE !== 'undefined' && COURSES_DATABASE.length) {
      html += `
        <div class="search-cat-header" style="margin-top:12px;">
          <span>📚</span>
          <span>Subjects & Learning Modules</span>
        </div>
      `;

      COURSES_DATABASE.slice(0, 4).forEach((c, idx) => {
        const actKey = 'course_sug_' + idx;
        window._searchActionMap[actKey] = () => {
          closeGlobalSearch();
          if (typeof renderPage === 'function') renderPage('materials');
          if (typeof setActiveSubjectMaterials === 'function') setActiveSubjectMaterials(c.id);
        };

        html += `
          <div class="search-result-item" onclick="window._searchActionMap['${actKey}']()">
            <div class="search-res-icon">📚</div>
            <div class="search-res-content">
              <div class="search-res-title">
                ${escapeHtml(c.title)}
                <span class="search-res-badge">${escapeHtml(c.strand || 'STEM')}</span>
              </div>
              <div class="search-res-subtitle">${escapeHtml(c.code || '')} • ${escapeHtml(c.instructor || 'Staff')}</div>
            </div>
            <div class="search-res-jump">Open ↵</div>
          </div>
        `;
      });
    }

    html += `</div>`;
    html += `
      <div class="search-dropdown-footer">
        <span>Press <kbd>Ctrl</kbd> + <kbd>K</kbd> anytime to open Omni-Search</span>
      </div>
    `;

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
  }

  // Initialize on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalSearch);
  } else {
    initGlobalSearch();
  }
})();
