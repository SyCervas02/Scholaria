const HOTLINES_STORAGE_KEY = 'scholaria_hotlines';

const HOTLINE_ICON_META = {
  emergency: { label: 'Emergency response', color: '#dc2626', bg: '#fee2e2', path: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="5"/><path d="m10 12 1.3 1.3L14.5 10"/>' },
  fire: { label: 'Fire department', color: '#ea580c', bg: '#ffedd5', path: '<path d="M8.5 14.5A4.5 4.5 0 0 0 17 17c2-4-1-7-4-10 0 3-2 4-2 4 0-4-3-7-3-7s1 4-2 8a7 7 0 1 0 13 4"/>' },
  police: { label: 'Police', color: '#1d4ed8', bg: '#dbeafe', path: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m12 7 1.4 2.8 3.1.5-2.2 2.1.5 3.1-2.8-1.5-2.8 1.5.5-3.1-2.2-2.1 3.1-.5L12 7Z"/>' },
  medical: { label: 'Medical assistance', color: '#dc2626', bg: '#fee2e2', path: '<path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7"/><path d="M12 3v12m-6-6h12"/><path d="M4 7h4m8 0h4"/>' },
  health: { label: 'Health services', color: '#059669', bg: '#d1fae5', path: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/><path d="M7 12h3l1.5-3 2 6 1.5-3H18"/>' },
  city: { label: 'City government', color: '#7c3aed', bg: '#ede9fe', path: '<path d="M3 21h18M3 10h18M5 10v11m4-11v11m6-11v11m4-11v11M12 2 2 7h20L12 2Z"/>' },
  phone: { label: 'Telephone hotline', color: '#2563eb', bg: '#dbeafe', path: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.7L7.2 10a16 16 0 0 0 6 6l1.6-1.8a2 2 0 0 1 1.7-.6l3 .5a2 2 0 0 1 1.5 2.8Z"/>' }
};

function hotlineIconKey(hotline) {
  const stored = String(hotline?.icon || '').toLowerCase();
  if (HOTLINE_ICON_META[stored]) return stored;
  const key = `${hotline?.id || ''} ${hotline?.name || ''} ${hotline?.shortName || ''}`.toLowerCase();
  if (/fire|bfp/.test(key)) return 'fire';
  if (/police|pnp/.test(key)) return 'police';
  if (/red cross|medical|hospital/.test(key)) return 'medical';
  if (/health|clinic/.test(key)) return 'health';
  if (/city hall|mayor|government/.test(key)) return 'city';
  if (/cdrrmo|disaster|emergency|911|rescue/.test(key)) return 'emergency';
  return 'phone';
}

function hotlineIconSvg(hotline, size = 30) {
  const key = hotlineIconKey(hotline);
  const meta = HOTLINE_ICON_META[key];
  const label = typeof escHtml === 'function' ? escHtml(meta.label) : meta.label;
  return `<span class="hotline-service-icon hotline-service-icon-${key}" role="img" aria-label="${label}" title="${label}" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9px;background:${meta.bg};color:${meta.color};flex:0 0 ${size}px;vertical-align:middle;"><svg viewBox="0 0 24 24" width="${Math.round(size * .58)}" height="${Math.round(size * .58)}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${meta.path}</svg></span>`;
}

function updateHotlineIconPreview() {
  const select = document.getElementById('newHlIcon');
  const preview = document.getElementById('newHlIconPreview');
  if (select && preview) preview.innerHTML = hotlineIconSvg({ icon: select.value }, 36);
}

function validateHotlineField(field) {
  if (!field) return true;
  const value = field.value.trim();
  let message = '';
  if ((field.id === 'newHlName' || field.id === 'newHlShort') && /\d/.test(value)) {
    message = 'Numbers are not allowed in hotline names.';
  } else if ((field.id === 'newHlNum' || field.id === 'newHlTel') && value && !/^\+?[0-9\s().-]+$/.test(value)) {
    message = 'Use digits and phone formatting only; letters are not allowed.';
  } else if ((field.id === 'newHlNum' || field.id === 'newHlTel') && value && !/\d/.test(value)) {
    message = 'Enter at least one digit in the hotline number.';
  }
  field.setCustomValidity(message);
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  field.classList.toggle('input-err-active', Boolean(message));
  return !message;
}

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
      <label class="anc-checkbox-label" style="background:#fff;border:1px solid #fca5a5;padding:6px 10px;border-radius:16px;font-size:11.5px;font-weight:700;color:#b91c1c;gap:7px;">
        <input type="checkbox" name="ancHotline" value="${hl.id}"/> ${hotlineIconSvg(hl, 24)} <span>${hl.shortName} ${hl.number}</span>
      </label>
    `).join('');
  }

  // 2. Render Public Hotline Directory Modal
  const directoryContainer = document.getElementById('directoryHotlinesContainer');
  if (directoryContainer) {
    directoryContainer.innerHTML = hotlines.map(hl => `
      <a href="tel:${hl.tel}" class="anc-hotline-chip" style="padding:10px 14px;border-radius:12px;justify-content:space-between;font-size:13px;display:flex;align-items:center;background:#fff;border:1px solid #e2e8f0;text-decoration:none;color:#0f172a;margin-bottom:8px;">
        <span style="display:flex;align-items:center;gap:10px;">${hotlineIconSvg(hl, 34)} <strong>${hl.name}</strong></span>
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
                ${hotlineIconSvg(hl, 34)}
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
  if (iconInput) iconInput.value = hotlineIconKey(hl);
  updateHotlineIconPreview();

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
  if (iconInput) iconInput.value = 'emergency';
  updateHotlineIconPreview();

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
  const telInput = document.getElementById('newHlTel');
  const telRaw = (telInput?.value || '').trim();
  const icon = (document.getElementById('newHlIcon')?.value || '').trim() || 'emergency';

  const fields = ['newHlName', 'newHlShort', 'newHlNum', 'newHlTel'].map(id => document.getElementById(id)).filter(Boolean);
  const invalidField = fields.find(field => !validateHotlineField(field));
  if (invalidField) {
    if (typeof showToast === 'function') showToast(invalidField.validationMessage, 'error');
    invalidField.reportValidity();
    invalidField.focus();
    return;
  }

  if (!name || !shortName || !number || !telRaw) {
    if (typeof showToast === 'function') showToast('Please fill out all required fields', 'error');
    else alert('Please fill out all required fields');
    return;
  }

  const tel = telRaw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  if (!tel) {
    if (telInput) { telInput.setCustomValidity('Enter a valid callable number.'); telInput.reportValidity(); telInput.focus(); }
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
  ['newHlName', 'newHlShort', 'newHlNum', 'newHlTel'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', event => validateHotlineField(event.currentTarget));
  });
  const iconSelect = document.getElementById('newHlIcon');
  if (iconSelect && !iconSelect.value) iconSelect.value = 'emergency';
  updateHotlineIconPreview();
  renderHotlinesUI();
});
