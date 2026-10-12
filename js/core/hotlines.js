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
      adminList.innerHTML = hotlines.map(hl => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:8px;">
          <div>
            <div style="font-weight:700;font-size:14px;color:#0f172a;">${hl.icon} ${hl.name}</div>
            <div style="font-size:12px;color:#64748b;">Short: ${hl.shortName} • Num: ${hl.number} • Tel: ${hl.tel}</div>
          </div>
          <button onclick="deleteHotline('${hl.id}')" style="background:#fee2e2;color:#dc2626;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Delete</button>
        </div>
      `).join('');
    }
  }
}

function openManageHotlinesModal() {
  const modal = document.getElementById('manageHotlinesModal');
  if (modal) modal.classList.add('active');
  renderHotlinesUI();
}

function closeManageHotlinesModal() {
  const modal = document.getElementById('manageHotlinesModal');
  if (modal) modal.classList.remove('active');
}

function addNewHotline() {
  const name = document.getElementById('newHlName').value.trim();
  const shortName = document.getElementById('newHlShort').value.trim();
  const number = document.getElementById('newHlNum').value.trim();
  const tel = document.getElementById('newHlTel').value.trim();
  const icon = document.getElementById('newHlIcon').value.trim() || '📞';

  if (!name || !shortName || !number || !tel) {
    if (typeof showToast === 'function') showToast('Please fill out all required fields', 'error');
    else alert('Please fill out all required fields');
    return;
  }

  const hotlines = getStoredHotlines();
  hotlines.push({
    id: 'hl_' + Date.now(),
    name,
    shortName,
    number,
    tel,
    icon
  });
  
  saveHotlines(hotlines);
  
  // Clear inputs
  document.getElementById('newHlName').value = '';
  document.getElementById('newHlShort').value = '';
  document.getElementById('newHlNum').value = '';
  document.getElementById('newHlTel').value = '';
  document.getElementById('newHlIcon').value = '📞';
  
  if (typeof showToast === 'function') showToast('Hotline added successfully!', 'success');
}

function deleteHotline(id) {
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
