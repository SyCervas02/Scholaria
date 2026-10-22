const HOTLINES_STORAGE_KEY = 'scholaria_hotlines';

const DEFAULT_HOTLINES = [
  { id: 'hl_imus_cdrrmo', name: 'City Disaster Risk Reduction (CDRRMO Imus)', shortName: 'CDRRMO', number: '(046) 515-1358', tel: '0465151358', icon: '🚨' },
  { id: 'hl_imus_bfp', name: 'Bureau of Fire Department (BFP Imus)', shortName: 'BFP', number: '(046) 970-5161', tel: '0469705161', icon: '🚒' },
  { id: 'hl_imus_pnp', name: 'Imus PNP Police Station', shortName: 'PNP', number: '(046) 471-3993', tel: '0464713993', icon: '🚓' },
  { id: 'hl_imus_hospital', name: 'Medical Center Imus', shortName: 'Med Center', number: '(046) 471-9487', tel: '0464719487', icon: '🏥' },
  { id: 'hl_imus_cityhall', name: 'Imus City Hall (Office of the Mayor)', shortName: 'City Hall', number: '(046) 471-2732', tel: '0464712732', icon: '🏛️' },
  { id: 'hl_imus_health', name: 'Imus City Health Center', shortName: 'Health Center', number: '(046) 471-5560', tel: '0464715560', icon: '⚕️' },
  { id: 'hl_national_911', name: 'National Emergency Hotline', shortName: 'Natl Emergency', number: '911', tel: '911', icon: '🆘' },
  { id: 'hl_redcross', name: 'Philippine Red Cross', shortName: 'Red Cross', number: '143', tel: '143', icon: '🩸' }
];

function getStoredHotlines() {
  try {
    const raw = localStorage.getItem(HOTLINES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(HOTLINES_STORAGE_KEY, JSON.stringify(DEFAULT_HOTLINES));
      return DEFAULT_HOTLINES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_HOTLINES;
  }
}

function saveHotlines(list) {
  localStorage.setItem(HOTLINES_STORAGE_KEY, JSON.stringify(list));
  renderHotlinesUI(); // re-render UIs whenever saved
}

function renderHotlinesUI() {
  const hotlines = getStoredHotlines();
  
  // 1. Render Attach Checkboxes in Create Announcement Modal
  const attachContainer = document.getElementById('createAncHotlinesContainer');
  if (attachContainer) {
    attachContainer.innerHTML = hotlines.map(hl => `
      <label class="anc-checkbox-label" style="background:#fff;border:1px solid #fca5a5;padding:4px 10px;border-radius:16px;font-size:11.5px;font-weight:700;color:#b91c1c;">
        <input type="checkbox" name="ancHotline" value="${hl.id}"/> ${hl.icon} ${hl.shortName} ${hl.number}
      </label>
    `).join('');
  }

  // 2. Render Public Hotline Directory Modal
  const directoryContainer = document.getElementById('directoryHotlinesContainer');
  if (directoryContainer) {
    directoryContainer.innerHTML = hotlines.map(hl => `
      <a href="tel:${hl.tel}" class="anc-hotline-chip" style="padding:10px 14px;border-radius:12px;justify-content:space-between;font-size:13px;display:flex;align-items:center;background:#fff;border:1px solid #e2e8f0;text-decoration:none;color:#0f172a;margin-bottom:8px;">
        <span>${hl.icon} <strong>${hl.name}</strong></span>
        <span class="anc-hotline-num" style="color:#b91c1c;font-weight:700;">${hl.number}</span>
      </a>
    `).join('');
  }

  // 3. Render Admin Settings List
  const adminList = document.getElementById('adminHotlinesList');
  if (adminList) {
    if (hotlines.length === 0) {
      adminList.innerHTML = `<p style="padding:20px;text-align:center;color:#64748b;font-size:13px;">No hotlines configured.</p>`;
    } else {
      adminList.innerHTML = hotlines.map(hl => {
        const isEditing = editingHotlineId === hl.id;
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:${isEditing ? '#eff6ff' : '#f8fafc'};border:1.5px solid ${isEditing ? '#0284c7' : '#e2e8f0'};border-radius:12px;margin-bottom:8px;transition:all 0.15s ease;">
            <div style="flex:1;min-width:0;padding-right:10px;">
              <div style="font-weight:700;font-size:13.5px;color:#0f172a;display:flex;align-items:center;gap:6px;">
                <span>${hl.icon || '📞'}</span>
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${hl.name}</span>
                ${isEditing ? '<span style="font-size:10px;background:#0284c7;color:#fff;padding:1px 6px;border-radius:4px;font-weight:800;letter-spacing:0.5px;">EDITING</span>' : ''}
              </div>
              <div style="font-size:11.5px;color:#64748b;margin-top:2px;">
                Short: <strong style="color:#334155;">${hl.shortName}</strong> • Num: <strong style="color:#b91c1c;">${hl.number}</strong> • Tel: <span>${hl.tel}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <button type="button" onclick="editHotline('${hl.id}')" style="background:#e0f2fe;color:#0284c7;border:1px solid #bae6fd;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Edit this hotline">
                ✏️ Edit
              </button>
              <button type="button" onclick="deleteHotline('${hl.id}')" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;" title="Delete this hotline">
                Delete
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

let editingHotlineId = null;

function editHotline(id) {
  const hotlines = getStoredHotlines();
  const hl = hotlines.find(h => h.id === id);
  if (!hl) return;

  editingHotlineId = id;

  const nameInput = document.getElementById('newHlName');
  const shortInput = document.getElementById('newHlShort');
  const numInput = document.getElementById('newHlNum');
  const telInput = document.getElementById('newHlTel');
  const iconInput = document.getElementById('newHlIcon');

  if (nameInput) nameInput.value = hl.name || '';
  if (shortInput) shortInput.value = hl.shortName || '';
  if (numInput) numInput.value = hl.number || '';
  if (telInput) telInput.value = hl.tel || '';
  if (iconInput) iconInput.value = hl.icon || '📞';

  const formTitle = document.getElementById('manageHlFormTitle');
  if (formTitle) {
    formTitle.innerHTML = `✏️ Edit Hotline: <span style="color:#0284c7;font-weight:800;">${hl.shortName || hl.name}</span>`;
  }

  const saveBtn = document.getElementById('saveHlBtn') || document.querySelector('#manageHotlinesModal button[onclick*="addNewHotline"]');
  if (saveBtn) {
    saveBtn.textContent = 'Save Changes';
    saveBtn.style.background = '#0284c7';
  }

  const cancelBtn = document.getElementById('cancelEditHlBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';

  renderHotlinesUI();

  if (nameInput) {
    nameInput.focus();
    nameInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function cancelEditHotline() {
  editingHotlineId = null;

  const nameInput = document.getElementById('newHlName');
  const shortInput = document.getElementById('newHlShort');
  const numInput = document.getElementById('newHlNum');
  const telInput = document.getElementById('newHlTel');
  const iconInput = document.getElementById('newHlIcon');

  if (nameInput) nameInput.value = '';
  if (shortInput) shortInput.value = '';
  if (numInput) numInput.value = '';
  if (telInput) telInput.value = '';
  if (iconInput) iconInput.value = '';

  const formTitle = document.getElementById('manageHlFormTitle');
  if (formTitle) formTitle.textContent = 'Add New Hotline';

  const saveBtn = document.getElementById('saveHlBtn') || document.querySelector('#manageHotlinesModal button[onclick*="addNewHotline"]');
  if (saveBtn) {
    saveBtn.textContent = 'Add Hotline';
    saveBtn.style.background = '#0284c7';
  }

  const cancelBtn = document.getElementById('cancelEditHlBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';

  renderHotlinesUI();
}

function openManageHotlinesModal() {
  const modal = document.getElementById('manageHotlinesModal');
  if (modal) modal.classList.add('active');
  renderHotlinesUI();
}

function closeManageHotlinesModal() {
  cancelEditHotline();
  const modal = document.getElementById('manageHotlinesModal');
  if (modal) modal.classList.remove('active');
}

function addNewHotline() {
  const name = (document.getElementById('newHlName')?.value || '').trim();
  const shortName = (document.getElementById('newHlShort')?.value || '').trim();
  const number = (document.getElementById('newHlNum')?.value || '').trim();
  const tel = (document.getElementById('newHlTel')?.value || '').trim();
  const icon = (document.getElementById('newHlIcon')?.value || '').trim() || '📞';

  if (!name || !shortName || !number || !tel) {
    if (typeof showToast === 'function') showToast('Please fill out all required fields', 'error');
    else alert('Please fill out all required fields');
    return;
  }

  const hotlines = getStoredHotlines();

  if (editingHotlineId) {
    const idx = hotlines.findIndex(h => h.id === editingHotlineId);
    if (idx !== -1) {
      hotlines[idx] = {
        ...hotlines[idx],
        name,
        shortName,
        number,
        tel,
        icon
      };
      saveHotlines(hotlines);

      // Sync updated hotline into stored announcements if attached
      try {
        if (typeof getStoredAnnouncements === 'function' && typeof saveAnnouncements === 'function') {
          const ancs = getStoredAnnouncements();
          let anyUpdated = false;
          ancs.forEach(a => {
            if (a.hotlines && Array.isArray(a.hotlines)) {
              a.hotlines.forEach((h, hIdx) => {
                if (h.id === editingHotlineId) {
                  a.hotlines[hIdx] = { ...h, name, shortName, number, tel, icon };
                  anyUpdated = true;
                }
              });
            }
          });
          if (anyUpdated) saveAnnouncements(ancs);
        }
      } catch (e) {}

      cancelEditHotline();
      if (typeof showToast === 'function') showToast('Hotline updated successfully!', 'success');
      return;
    }
  }

  hotlines.push({
    id: 'hl_' + Date.now(),
    name,
    shortName,
    number,
    tel,
    icon
  });
  
  saveHotlines(hotlines);
  cancelEditHotline();
  if (typeof showToast === 'function') showToast('Hotline added successfully!', 'success');
}

function deleteHotline(id) {
  if (editingHotlineId === id) {
    cancelEditHotline();
  }
  if (!confirm('Are you sure you want to delete this hotline?')) return;
  const hotlines = getStoredHotlines();
  const updated = hotlines.filter(h => h.id !== id);
  saveHotlines(updated);
  if (typeof showToast === 'function') showToast('Hotline deleted', 'success');
}

// Initial render hook
document.addEventListener('DOMContentLoaded', () => {
  renderHotlinesUI();
});
