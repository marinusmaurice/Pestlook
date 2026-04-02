import { getFarms, createFarm, updateFarm, deleteFarm } from '../api/farms.js';
import { getFields, createField, updateField, deleteField } from '../api/fields.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDate } from '../utils/helpers.js';

export async function renderFarms(container) {
  _container = container;
  setPageTitle('Farms & Fields');
  setTopbarCta('＋ Add Farm', () => showCreateFarmModal());

  container.innerHTML = `
    <div id="farms-list-panel">
      <div class="section-head" style="margin-bottom:20px;">
        <div>
          <div class="page-heading">Farms &amp; Fields</div>
          <div class="page-desc">Click a farm to manage its fields</div>
        </div>
      </div>
      <div class="three-col" id="farmsGrid">
        ${[0,1,2].map(() => '<div class="card"><div class="card-p"><div class="skeleton skeleton-card"></div></div></div>').join('')}
      </div>
    </div>
    <div id="farms-fields-panel" style="display:none;"></div>
  `;

  await loadAndRenderGrid();
}

// ── module state ──────────────────────────────────────────────
let _container = null;

async function loadAndRenderGrid() {
  try {
    const [farmsRes, fieldsRes] = await Promise.all([
      getFarms(),
      getFields(),
    ]);
    renderFarmGrid(farmsRes.data || [], fieldsRes.data || []);
  } catch (err) {
    showToast('Failed to load farms: ' + err.message, 'error');
  }
}

// ── Farm grid ─────────────────────────────────────────────────
function renderFarmGrid(farms, fields) {
  const grid = document.getElementById('farmsGrid');
  if (!grid) return;

  let html = '';
  farms.forEach((farm, i) => {
    const farmFields = fields.filter(f => f.farmId === farm.id);
    const c     = farmColors[i % farmColors.length];
    const emoji = farmEmojis[i % farmEmojis.length];
    const totalHa = farmFields.reduce((s, f) => s + (parseFloat(f.areaHectares) || 0), 0);
    const haText  = totalHa > 0
      ? (totalHa % 1 === 0 ? totalHa : totalHa.toFixed(1)) + ' ha'
      : '';
    const crop = farmFields[0]?.cropType || '';

    html += `
      <div class="card" style="display:flex;flex-direction:column;" data-farm-idx="${i}">
        <div class="farm-card-header" style="background:linear-gradient(135deg,${c[0]},${c[1]});">
          <div class="grid-overlay"></div>
          ${emoji}
        </div>
        <div class="card-p" style="flex:1;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="font-weight:600;color:#fff;font-size:0.95rem;">${escapeHtml(farm.name)}</div>
            ${farm.isActive !== false ? tag('Active', 'green') : tag('Inactive', 'red')}
          </div>
          <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:12px;">📍 ${escapeHtml(farm.address || 'No address')}</div>
          <div style="display:grid;grid-template-columns:1fr;gap:8px;">
            <div style="background:var(--surface2);border-radius:8px;padding:8px 10px;">
              <div style="font-size:0.65rem;color:var(--text-dim);margin-bottom:2px;text-transform:uppercase;letter-spacing:0.06em;">Fields</div>
              <div style="font-family:'Fraunces',serif;font-weight:700;color:var(--green);font-size:1.2rem;">${farmFields.length}</div>
            </div>
          </div>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:0.75rem;color:var(--text-dim);">${escapeHtml(crop)}${crop && haText ? ' · ' : ''}${haText}</span>
            <span data-manage-farm="${farm.id}" style="font-size:0.72rem;color:var(--green);font-weight:500;cursor:pointer;">Manage fields →</span>
          </div>
        </div>
        <div style="display:flex;gap:6px;padding:10px 14px;border-top:1px solid var(--border);">
          <button class="btn-outline" style="flex:1;padding:5px 0;font-size:0.75rem;justify-content:center;" data-edit-farm="${farm.id}">✏️ Edit</button>
          <button class="btn-danger"  style="flex:1;padding:5px 0;font-size:0.75rem;" data-delete-farm="${farm.id}">🗑 Delete</button>
        </div>
      </div>`;
  });

  grid.innerHTML = html;

  grid.querySelectorAll('[data-manage-farm]').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.stopPropagation();
      const card    = link.closest('[data-farm-idx]');
      const farm    = farms.find(f => f.id === link.dataset.manageFarm);
      const farmIdx = parseInt(card.dataset.farmIdx, 10);
      if (farm) await openFarmFields(farm, farmIdx);
    });
  });

  grid.querySelectorAll('[data-edit-farm]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const farm    = farms.find(f => f.id === btn.dataset.editFarm);
      const farmIdx = farms.indexOf(farm);
      if (farm) showEditFarmModal(farm, farmIdx);
    });
  });

  grid.querySelectorAll('[data-delete-farm]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const farm = farms.find(f => f.id === btn.dataset.deleteFarm);
      if (!farm) return;
      if (!confirm(`Delete "${farm.name}"? This will also delete all its fields and monitoring points.`)) return;
      try {
        await deleteFarm(farm.id);
        showToast('Farm deleted.', 'success');
        await loadAndRenderGrid();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// ── Fields panel ──────────────────────────────────────────────
async function openFarmFields(farm, farmIdx) {
  setTopbarCta('＋ Add Field', () => showFieldModal(null, farm, farmIdx));

  const listPanel   = document.getElementById('farms-list-panel');
  const fieldsPanel = document.getElementById('farms-fields-panel');
  listPanel.style.display   = 'none';
  fieldsPanel.style.display = 'block';
  fieldsPanel.innerHTML = `<div class="skeleton skeleton-card" style="height:300px;margin-bottom:16px;"></div>`;

  try {
    const [fieldsRes] = await Promise.all([
      getFields(farm.id),
    ]);
    renderFieldsPanel(farm, farmIdx, fieldsRes.data || []);
  } catch (err) {
    showToast('Failed to load fields: ' + err.message, 'error');
  }
}

function closeFarmFields() {
  setTopbarCta('＋ Add Farm', () => showCreateFarmModal());
  setPageTitle('Farms & Fields');
  document.getElementById('farms-list-panel').style.display   = 'block';
  document.getElementById('farms-fields-panel').style.display = 'none';
  loadAndRenderGrid();
}

function renderFieldsPanel(farm, farmIdx, fields) {
  const emoji     = farmEmojis[farmIdx % farmEmojis.length];
  const totalHa   = fields.reduce((s, f) => s + (parseFloat(f.areaHectares) || 0), 0);
  const haDisplay = totalHa % 1 === 0 ? totalHa : totalHa.toFixed(1);
  const panel     = document.getElementById('farms-fields-panel');

  let fieldsHtml = '';
  if (fields.length === 0) {
    fieldsHtml = `
      <div style="padding:48px;text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:10px;">🌱</div>
        <div style="font-size:0.9rem;color:var(--text-dim);">No fields yet. Add the first field to this farm.</div>
      </div>`;
  } else {
    fieldsHtml = `<table class="data-table">
      <thead>
        <tr>
          <th>Field Name</th><th>Status</th><th>Crop Type</th><th>Season</th>
          <th>Area (ha)</th><th>Geo Boundary</th><th>Created</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>`;
    for (const f of fields) {
      fieldsHtml += `
        <tr>
          <td><div style="font-weight:600;color:#fff;">${escapeHtml(f.name)}</div></td>
          <td>${f.isActive !== false ? tag('Active', 'green') : tag('Inactive', 'red')}</td>
          <td>${f.cropType
            ? `<span class="tag tag-green" style="font-size:0.72rem;">${escapeHtml(f.cropType)}</span>`
            : '<span style="color:var(--text-dim);font-size:0.8rem;">—</span>'}</td>
          <td style="font-size:0.82rem;color:var(--text-mid);">${escapeHtml(f.season || '—')}</td>
          <td>
            <span style="font-family:'Fraunces',serif;font-weight:700;font-size:1.05rem;color:var(--amber);">${f.areaHectares != null ? f.areaHectares : '—'}</span>
            ${f.areaHectares != null ? '<span style="font-size:0.7rem;color:var(--text-dim);margin-left:2px;">ha</span>' : ''}
          </td>
          <td style="font-size:0.78rem;color:var(--text-dim);font-family:'JetBrains Mono',monospace;">
            ${f.geoBoundary
              ? `<span style="color:var(--blue);">✓</span> ${escapeHtml(f.geoBoundary)}`
              : '<span style="color:var(--text-dim);">—</span>'}
          </td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:var(--text-dim);">${formatDate(f.createdAt)}</td>
          <td style="text-align:right;">
            <div style="display:flex;gap:6px;justify-content:flex-end;align-items:center;">
              <button data-edit-field="${f.id}"
              <button data-delete-field="${f.id}" style="background:rgba(224,96,96,0.08);border:1px solid rgba(224,96,96,0.2);border-radius:7px;padding:5px 11px;color:var(--red);font-size:0.75rem;cursor:pointer;font-family:inherit;">🗑 Delete</button>
            </div>
          </td>
        </tr>`;
    }
    fieldsHtml += `</tbody></table>`;
  }

  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
      <button id="backToFarmsBtn" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 12px;color:var(--text-mid);font-size:0.8rem;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px;">← Back to Farms</button>
      <span style="color:var(--text-dim);font-size:0.8rem;">/</span>
      <span style="font-size:0.85rem;color:var(--text);font-weight:500;">${escapeHtml(farm.name)}</span>
      <span style="color:var(--text-dim);font-size:0.8rem;">/</span>
      <span style="font-size:0.85rem;color:var(--green);">Fields</span>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:20px;">
      <div style="font-size:2.2rem;">${emoji}</div>
      <div style="flex:1;">
        <div style="font-family:'Fraunces',serif;font-weight:700;font-size:1.1rem;color:#fff;">${escapeHtml(farm.name)}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);margin-top:2px;">📍 ${escapeHtml(farm.address || 'No address')}</div>
      </div>
      <div style="display:flex;gap:20px;align-items:center;">
        <div style="text-align:center;">
          <div style="font-family:'Fraunces',serif;font-weight:700;font-size:1.5rem;color:var(--green);">${fields.length}</div>
          <div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.07em;">Fields</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:'Fraunces',serif;font-weight:700;font-size:1.5rem;color:var(--amber);">${haDisplay}</div>
          <div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.07em;">Total ha</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="editFarmBannerBtn" class="btn-outline" style="padding:5px 12px;font-size:0.78rem;">✏️ Edit Farm</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-p" style="border-bottom:1px solid var(--border);">
        <div class="section-head" style="margin-bottom:0;">
          <div>
            <div class="section-title">Fields</div>
            <div class="section-sub">${fields.length} field${fields.length !== 1 ? 's' : ''} · ${haDisplay} ha total</div>
          </div>
          <button class="btn-primary" id="addFieldPanelBtn">＋ Add Field</button>
        </div>
      </div>
      ${fieldsHtml}
    </div>
  `;

  document.getElementById('backToFarmsBtn').addEventListener('click', closeFarmFields);
  document.getElementById('editFarmBannerBtn').addEventListener('click', () => showEditFarmModal(farm, farmIdx));
  document.getElementById('addFieldPanelBtn').addEventListener('click', () => showFieldModal(null, farm, farmIdx));

  panel.querySelectorAll('[data-edit-field]').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = fields.find(f => f.id === btn.dataset.editField);
      if (field) showFieldModal(field, farm, farmIdx);
    });
  });

  panel.querySelectorAll('[data-delete-field]').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = fields.find(f => f.id === btn.dataset.deleteField);
      if (field) showDeleteFieldConfirm(field, farm, farmIdx);
    });
  });
}

// ── Field modals ──────────────────────────────────────────────
function showFieldModal(field, farm, farmIdx) {
  const isEdit = field !== null;
  const form   = document.createElement('div');
  form.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div style="grid-column:1/-1;">
        <label class="input-label">Field Name <span style="color:var(--red);">*</span></label>
        <input class="input-field" type="text" id="fldName" placeholder="e.g. North Maize Block" value="${isEdit ? escapeHtml(field.name) : ''}">
      </div>
      <div>
        <label class="input-label">Crop Type</label>
        <input class="input-field" type="text" id="fldCrop" placeholder="e.g. Maize, Wheat" value="${isEdit ? escapeHtml(field.cropType || '') : ''}">
      </div>
      <div>
        <label class="input-label">Season</label>
        <input class="input-field" type="text" id="fldSeason" placeholder="e.g. Summer 2025/26" value="${isEdit ? escapeHtml(field.season || '') : ''}">
      </div>
      <div>
        <label class="input-label">Area (hectares)</label>
        <input class="input-field" type="number" step="0.1" min="0" id="fldArea" placeholder="e.g. 45.5" value="${isEdit && field.areaHectares != null ? field.areaHectares : ''}">
      </div>
      <div>
        <label class="input-label">Geo Boundary</label>
        <input class="input-field" type="text" id="fldGeo" placeholder="GeoJSON or polygon ref" value="${isEdit ? escapeHtml(field.geoBoundary || '') : ''}">
      </div>
      ${isEdit ? `<div style="grid-column:1/-1;display:flex;align-items:center;gap:10px;">
        <label class="input-label" style="margin-bottom:0;">Status</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.82rem;color:var(--text-mid);">
          <input type="checkbox" id="fldActive" ${field.isActive !== false ? 'checked' : ''}> Active
        </label>
      </div>` : ''}
      <div style="grid-column:1/-1;display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelFld">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveFld">${isEdit ? '💾 Save Changes' : '🌱 Create Field'}</button>
      </div>
    </div>
  `;

  openModal({
    title:    isEdit ? 'Edit Field' : 'Add Field',
    subtitle: isEdit ? 'Update field details' : 'New crop field for this farm',
    content:  form,
  });
  setTimeout(() => document.getElementById('fldName')?.focus(), 100);

  document.getElementById('cancelFld').addEventListener('click', closeModal);
  document.getElementById('saveFld').addEventListener('click', async () => {
    const btn  = document.getElementById('saveFld');
    const name = document.getElementById('fldName').value.trim();
    if (!name) {
      const inp = document.getElementById('fldName');
      inp.style.borderColor = 'var(--red)';
      inp.focus();
      setTimeout(() => inp.style.borderColor = '', 1500);
      return;
    }
    const payload = {
      name,
      cropType:     document.getElementById('fldCrop').value.trim()   || null,
      areaHectares: parseFloat(document.getElementById('fldArea').value) || null,
      season:       document.getElementById('fldSeason').value.trim() || null,
      geoBoundary:  document.getElementById('fldGeo').value.trim()    || null,
    };
    if (isEdit) {
      payload.isActive = document.getElementById('fldActive').checked;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      if (isEdit) {
        await updateField(field.id, payload);
        showToast('Field updated!', 'success');
      } else {
        await createField({ farmId: farm.id, ...payload });
        showToast('Field created!', 'success');
      }
      closeModal();
      await openFarmFields(farm, farmIdx);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = isEdit ? '💾 Save Changes' : '🌱 Create Field';
    }
  });
}

function showDeleteFieldConfirm(field, farm, farmIdx) {
  const form = document.createElement('div');
  form.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:2.5rem;margin-bottom:12px;">🗑️</div>
      <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:6px;">You are about to delete:</div>
      <div style="font-size:0.95rem;font-weight:600;color:var(--red);margin-bottom:16px;">"${escapeHtml(field.name)}"</div>
      <div style="font-size:0.8rem;color:var(--text-dim);background:rgba(224,96,96,0.08);border:1px solid rgba(224,96,96,0.15);border-radius:8px;padding:10px 14px;margin-bottom:20px;">
        This will permanently remove the field. Any monitoring points linked to this field will be unlinked.
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn-outline" style="flex:1;" id="cancelDelFld">Cancel</button>
        <button id="confirmDelFld" style="flex:1;background:#8a2020;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit;">Delete Field</button>
      </div>
    </div>
  `;

  openModal({ title: 'Delete Field', subtitle: 'This action cannot be undone', content: form });

  document.getElementById('cancelDelFld').addEventListener('click', closeModal);
  document.getElementById('confirmDelFld').addEventListener('click', async () => {
    const btn = document.getElementById('confirmDelFld');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await deleteField(field.id);
      closeModal();
      showToast('Field deleted', 'success');
      await openFarmFields(farm, farmIdx);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Delete Field';
    }
  });
}

// ── Farm modals ───────────────────────────────────────────────
function showEditFarmModal(farm, farmIdx) {
  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label class="input-label">Farm Name</label>
        <input class="input-field" type="text" id="editFarmName" value="${escapeHtml(farm.name)}" required>
      </div>
      <div>
        <label class="input-label">Address</label>
        <input class="input-field" type="text" id="editFarmAddress" value="${escapeHtml(farm.address || '')}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label class="input-label">Latitude</label>
          <input class="input-field" type="number" step="any" id="editFarmLat" value="${farm.latitude ?? ''}">
        </div>
        <div>
          <label class="input-label">Longitude</label>
          <input class="input-field" type="number" step="any" id="editFarmLng" value="${farm.longitude ?? ''}">
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <label class="input-label" style="margin-bottom:0;">Status</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.82rem;color:var(--text-mid);">
          <input type="checkbox" id="editFarmActive" ${farm.isActive !== false ? 'checked' : ''}> Active
        </label>
      </div>
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelEditFarm">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveEditFarm">💾 Save Changes</button>
      </div>
    </div>
  `;

  openModal({ title: 'Edit Farm', subtitle: 'Update farm details', content: form });

  document.getElementById('cancelEditFarm').addEventListener('click', closeModal);
  document.getElementById('saveEditFarm').addEventListener('click', async () => {
    const btn        = document.getElementById('saveEditFarm');
    const newName    = document.getElementById('editFarmName').value.trim();
    const newAddress = document.getElementById('editFarmAddress').value.trim() || null;
    const newLat     = parseFloat(document.getElementById('editFarmLat').value) || null;
    const newLng     = parseFloat(document.getElementById('editFarmLng').value) || null;
    const newActive  = document.getElementById('editFarmActive').checked;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await updateFarm(farm.id, {
        name: newName, address: newAddress,
        latitude: newLat, longitude: newLng,
        boundaryGeoJson: farm.boundaryGeoJson || null,
        isActive: newActive,
      });
      closeModal();
      showToast('Farm updated!', 'success');
      const updatedFarm = { ...farm, name: newName, address: newAddress, latitude: newLat, longitude: newLng, isActive: newActive };
      const inFieldsPanel = document.getElementById('farms-fields-panel')?.style.display !== 'none';
      if (inFieldsPanel && farmIdx !== undefined) {
        await openFarmFields(updatedFarm, farmIdx);
      } else {
        await loadAndRenderGrid();
      }
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '💾 Save Changes';
    }
  });
}

function showCreateFarmModal() {
  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label class="input-label">Farm Name</label>
        <input class="input-field" type="text" id="farmName" placeholder="e.g. Sunrise Farm" required>
      </div>
      <div>
        <label class="input-label">Address</label>
        <input class="input-field" type="text" id="farmAddress" placeholder="e.g. Stellenbosch, Western Cape">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label class="input-label">Latitude</label>
          <input class="input-field" type="number" step="any" id="farmLat" placeholder="-33.9321">
        </div>
        <div>
          <label class="input-label">Longitude</label>
          <input class="input-field" type="number" step="any" id="farmLng" placeholder="18.8602">
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelFarm">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveFarm">🌾 Create Farm</button>
      </div>
    </div>
  `;

  openModal({ title: 'Add New Farm', subtitle: 'Register a new farm property', content: form });

  document.getElementById('cancelFarm').addEventListener('click', closeModal);
  document.getElementById('saveFarm').addEventListener('click', async () => {
    const btn = document.getElementById('saveFarm');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await createFarm({
        name:      document.getElementById('farmName').value.trim(),
        address:   document.getElementById('farmAddress').value.trim() || null,
        latitude:  parseFloat(document.getElementById('farmLat').value) || null,
        longitude: parseFloat(document.getElementById('farmLng').value) || null,
      });
      closeModal();
      showToast('Farm created!', 'success');
      await loadAndRenderGrid();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '🌾 Create Farm';
    }
  });
}

const farmColors = [
  ['#1a3d20', '#2a5e30'],
  ['#1f3520', '#3a5530'],
  ['#2a2f1a', '#3d4520'],
  ['#1a2830', '#203545'],
  ['#2a1a30', '#3d2045'],
];
const farmEmojis = ['🌾', '🌿', '🍇', '🌻', '🌽', '🌴', '🌱'];
