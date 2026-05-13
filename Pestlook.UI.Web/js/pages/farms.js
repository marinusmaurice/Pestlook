import { getFarms, createFarm, updateFarm, deleteFarm } from '../api/farms.js';
import { getFields, createField, updateField, deleteField } from '../api/fields.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDate } from '../utils/helpers.js';
import { openBoundaryMap, createInlineBoundaryMap } from '../components/boundary-map.js';

export async function renderFarms(container) {
  _container = container;

  container.innerHTML = `
    <div id="farms-list-panel">
      <div class="section-head" style="margin-bottom:20px;">
        <div>
          <div class="page-heading">Farms &amp; Fields</div>
          <div class="page-desc">Click a farm to manage its fields</div>
        </div>
        <button class="btn-primary" id="addFarmBtn">＋ Add Farm</button>
      </div>
      <div class="three-col" id="farmsGrid">
        ${[0,1,2].map(() => '<div class="card"><div class="card-p"><div class="skeleton skeleton-card"></div></div></div>').join('')}
      </div>
    </div>
    <div id="farms-fields-panel" style="display:none;"></div>
  `;

  await loadAndRenderGrid();
  document.getElementById('addFarmBtn')?.addEventListener('click', () => showCreateFarmModal());
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
            <div style="font-weight:600;color:var(--text);font-size:0.95rem;">${escapeHtml(farm.name)}</div>
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
          ${farm.boundaryGeoJson ? `<button class="btn-outline" style="padding:5px 8px;font-size:0.75rem;" data-map-farm="${farm.id}" title="View boundary map">🗺</button>` : ''}
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

  grid.querySelectorAll('[data-map-farm]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const farm = farms.find(f => f.id === btn.dataset.mapFarm);
      if (!farm) return;
      // Show a read-only overview map with the farm boundary + all its field boundaries
      const farmFields = fields.filter(f => f.farmId === farm.id);
      const backgroundLayers = farmFields
        .filter(f => f.geoBoundary)
        .map(f => ({ name: f.name, geoJson: f.geoBoundary, color: '#f0b840' }));
      openBoundaryMap({
        title:           `Map – ${farm.name}`,
        existingGeoJson: farm.boundaryGeoJson,
        centerLat:       farm.latitude,
        centerLng:       farm.longitude,
        backgroundLayers,
        onConfirm: () => {}, // read-only overview – confirm does nothing meaningful
      });
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
          <td><div style="font-weight:600;color:var(--text);">${escapeHtml(f.name)}</div></td>
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
              ${f.geoBoundary ? `<button data-map-field="${f.id}" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:5px 9px;color:var(--text-mid);font-size:0.75rem;cursor:pointer;font-family:inherit;" title="View / edit boundary">🗺</button>` : ''}
              <button data-edit-field="${f.id}" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:5px 11px;color:var(--text-mid);font-size:0.75rem;cursor:pointer;font-family:inherit;">✏ Edit</button>
              <button data-delete-field="${f.id}" style="background:rgba(224,96,96,0.08);border:1px solid rgba(224,96,96,0.2);border-radius:7px;padding:5px 11px;color:var(--red);font-size:0.75rem;cursor:pointer;font-family:inherit;">🗑 Delete</button>
            </div>

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
        <div style="font-family:'Fraunces',serif;font-weight:700;font-size:1.1rem;color:var(--text);">${escapeHtml(farm.name)}</div>
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
      <div style="overflow-x:auto;">${fieldsHtml}</div>
    </div>
  `;

  document.getElementById('backToFarmsBtn').addEventListener('click', closeFarmFields);
  document.getElementById('editFarmBannerBtn').addEventListener('click', () => showEditFarmModal(farm, farmIdx));
  document.getElementById('addFieldPanelBtn').addEventListener('click', () => showFieldModal(null, farm, farmIdx));

  panel.querySelectorAll('[data-map-field]').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = fields.find(f => f.id === btn.dataset.mapField);
      if (!field) return;
      const backgroundLayers = farm.boundaryGeoJson
        ? [{ name: farm.name, geoJson: farm.boundaryGeoJson, color: '#6aaf7a' }]
        : [];
      openBoundaryMap({
        title:           `Boundary – ${field.name}`,
        existingGeoJson: field.geoBoundary,
        centerLat:       farm.latitude,
        centerLng:       farm.longitude,
        backgroundLayers,
        onConfirm: async ({ geoJson, areaHectares }) => {
          try {
            await updateField(field.id, {
              name:         field.name,
              cropType:     field.cropType,
              season:       field.season,
              isActive:     field.isActive,
              geoBoundary:  geoJson,
              areaHectares,
            });
            showToast('Field boundary updated!', 'success');
            await openFarmFields(farm, farmIdx);
          } catch (err) {
            showToast(err.message, 'error');
          }
        },
      });
    });
  });

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

  const backgroundLayers = [];
  if (farm.boundaryGeoJson) {
    backgroundLayers.push({ name: farm.name, geoJson: farm.boundaryGeoJson, color: '#6aaf7a' });
  }

  const ov = document.querySelector('.modal-overlay') || (() => {
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
    return el;
  })();

  ov.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'modal-box modal-map';

  box.innerHTML = `
    <div class="modal-map-header">
      <div>
        <div style="font-family:'Fraunces',serif;font-size:1.2rem;font-weight:700;color:#fff;">${isEdit ? 'Edit Field' : 'Add Field'}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);margin-top:2px;">${isEdit ? 'Update field details' : 'New crop field for this farm'}</div>
      </div>
      <button id="fldCloseBtn" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;width:32px;height:32px;cursor:pointer;color:var(--text-dim);font-size:1rem;display:flex;align-items:center;justify-content:center;">×</button>
    </div>
    <div class="modal-map-body">
      <div class="modal-map-form">
        <div>
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
          <input class="input-field" type="number" step="0.01" min="0" id="fldArea"
                 placeholder="Auto-calculated from boundary"
                 value="${isEdit && field.areaHectares != null ? field.areaHectares : ''}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label class="input-label">Latitude</label>
            <input class="input-field" type="number" step="any" id="fldLat"
                   placeholder="-33.9321"
                   value="${isEdit && field.latitude != null ? field.latitude : ''}">
          </div>
          <div>
            <label class="input-label">Longitude</label>
            <input class="input-field" type="number" step="any" id="fldLng"
                   placeholder="18.8602"
                   value="${isEdit && field.longitude != null ? field.longitude : ''}">
          </div>
        </div>
        ${isEdit ? `<div style="display:flex;align-items:center;gap:10px;">
          <label class="input-label" style="margin-bottom:0;">Status</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.82rem;color:var(--text-mid);">
            <input type="checkbox" id="fldActive" ${field.isActive !== false ? 'checked' : ''}> Active
          </label>
        </div>` : ''}
        <div style="flex:1;"></div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn-outline" style="flex:1;" id="cancelFld">Cancel</button>
          <button class="btn-primary" style="flex:2;justify-content:center;" id="saveFld">${isEdit ? '💾 Save Changes' : '🌱 Create Field'}</button>
        </div>
      </div>
      <div class="modal-map-canvas" id="fieldMapCanvas"></div>
    </div>
  `;

  ov.appendChild(box);
  ov.classList.add('open');

  setTimeout(() => document.getElementById('fldName')?.focus(), 100);

  let inlineBm = null;

  requestAnimationFrame(() => {
    const canvas = document.getElementById('fieldMapCanvas');
    if (canvas) {
      inlineBm = createInlineBoundaryMap(canvas, {
        existingGeoJson:  isEdit ? (field.geoBoundary || null) : null,
        centerLat:        isEdit ? (field.latitude  || farm.latitude)  : farm.latitude,
        centerLng:        isEdit ? (field.longitude || farm.longitude) : farm.longitude,
        backgroundLayers,
      });
    }
  });

  // Re-centre when lat/lng inputs change
  ['fldLat', 'fldLng'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      const lat = parseFloat(document.getElementById('fldLat').value);
      const lng = parseFloat(document.getElementById('fldLng').value);
      if (lat && lng && inlineBm) inlineBm.setCenter(lat, lng);
    });
  });

  function destroyAndClose() {
    inlineBm?.destroy();
    inlineBm = null;
    ov.classList.remove('open');
    ov.innerHTML = '';
  }

  document.getElementById('fldCloseBtn').addEventListener('click', destroyAndClose);
  document.getElementById('cancelFld').addEventListener('click', destroyAndClose);

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

    let lat = parseFloat(document.getElementById('fldLat').value) || null;
    let lng = parseFloat(document.getElementById('fldLng').value) || null;
    // auto-calculate centre from drawn boundary when lat/lng are empty
    if ((!lat || !lng) && inlineBm) {
      const centroid = inlineBm.getCentroid();
      if (centroid) { lat = centroid.lat; lng = centroid.lng; }
    }

    const manualArea = parseFloat(document.getElementById('fldArea').value) || null;
    const boundaryGeoJson = inlineBm ? inlineBm.getGeoJson() : (isEdit ? (field.geoBoundary || null) : null);
    const areaHa = inlineBm ? inlineBm.getAreaHa() || null : null;

    const payload = {
      name,
      cropType:     document.getElementById('fldCrop').value.trim()   || null,
      areaHectares: areaHa ?? manualArea,
      latitude:     lat,
      longitude:    lng,
      season:       document.getElementById('fldSeason').value.trim() || null,
      geoBoundary:  boundaryGeoJson,
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
      destroyAndClose();
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
  form.className = 'modal-map';
  form.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;';

  form.innerHTML = `
    <div class="modal-map-header">
      <div>
        <div style="font-family:'Fraunces',serif;font-size:1.2rem;font-weight:700;color:#fff;">Edit Farm</div>
        <div style="font-size:0.78rem;color:var(--text-dim);margin-top:2px;">Update farm details</div>
      </div>
      <button id="editFarmCloseBtn" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;width:32px;height:32px;cursor:pointer;color:var(--text-dim);font-size:1rem;display:flex;align-items:center;justify-content:center;">×</button>
    </div>
    <div class="modal-map-body">
      <div class="modal-map-form">
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
        <div style="flex:1;"></div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn-outline" style="flex:1;" id="cancelEditFarm">Cancel</button>
          <button class="btn-primary" style="flex:2;justify-content:center;" id="saveEditFarm">💾 Save Changes</button>
        </div>
      </div>
      <div class="modal-map-canvas" id="editFarmMapCanvas"></div>
    </div>
  `;

  // Use a raw overlay so we control the box class ourselves
  const ov = document.querySelector('.modal-overlay') || (() => {
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
    return el;
  })();

  ov.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'modal-box modal-map';
  box.appendChild(form);
  ov.appendChild(box);
  ov.classList.add('open');

  let inlineBm = null;

  // Mount map after DOM is visible
  requestAnimationFrame(() => {
    const canvas = document.getElementById('editFarmMapCanvas');
    if (canvas) {
      inlineBm = createInlineBoundaryMap(canvas, {
        existingGeoJson:  farm.boundaryGeoJson || null,
        centerLat:        farm.latitude,
        centerLng:        farm.longitude,
      });
    }
  });

  // Re-centre when lat/lng inputs change
  ['editFarmLat', 'editFarmLng'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      const lat = parseFloat(document.getElementById('editFarmLat').value);
      const lng = parseFloat(document.getElementById('editFarmLng').value);
      if (lat && lng && inlineBm) inlineBm.setCenter(lat, lng);
    });
  });

  function destroyAndClose() {
    inlineBm?.destroy();
    inlineBm = null;
    ov.classList.remove('open');
    ov.innerHTML = '';
  }

  document.getElementById('editFarmCloseBtn').addEventListener('click', destroyAndClose);
  document.getElementById('cancelEditFarm').addEventListener('click', destroyAndClose);

  document.getElementById('saveEditFarm').addEventListener('click', async () => {
    const btn        = document.getElementById('saveEditFarm');
    const newName    = document.getElementById('editFarmName').value.trim();
    const newAddress = document.getElementById('editFarmAddress').value.trim() || null;
    let   newLat     = parseFloat(document.getElementById('editFarmLat').value) || null;
    let   newLng     = parseFloat(document.getElementById('editFarmLng').value) || null;
    const newActive  = document.getElementById('editFarmActive').checked;
    const newBoundary = inlineBm ? inlineBm.getGeoJson() : (farm.boundaryGeoJson || null);
    // auto-calculate centre from drawn boundary when lat/lng are empty
    if ((!newLat || !newLng) && inlineBm) {
      const centroid = inlineBm.getCentroid();
      if (centroid) { newLat = centroid.lat; newLng = centroid.lng; }
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await updateFarm(farm.id, {
        name: newName, address: newAddress,
        latitude: newLat, longitude: newLng,
        boundaryGeoJson: newBoundary,
        isActive: newActive,
      });
      destroyAndClose();
      showToast('Farm updated!', 'success');
      const updatedFarm = { ...farm, name: newName, address: newAddress,
                            latitude: newLat, longitude: newLng,
                            boundaryGeoJson: newBoundary, isActive: newActive };
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
  const ov = document.querySelector('.modal-overlay') || (() => {
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
    return el;
  })();

  ov.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'modal-box modal-map';

  box.innerHTML = `
    <div class="modal-map-header">
      <div>
        <div style="font-family:'Fraunces',serif;font-size:1.2rem;font-weight:700;color:#fff;">Add New Farm</div>
        <div style="font-size:0.78rem;color:var(--text-dim);margin-top:2px;">Register a new farm property</div>
      </div>
      <button id="createFarmCloseBtn" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;width:32px;height:32px;cursor:pointer;color:var(--text-dim);font-size:1rem;display:flex;align-items:center;justify-content:center;">×</button>
    </div>
    <div class="modal-map-body">
      <div class="modal-map-form">
        <div>
          <label class="input-label">Farm Name <span style="color:var(--red);">*</span></label>
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
        <div style="flex:1;"></div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn-outline" style="flex:1;" id="cancelFarm">Cancel</button>
          <button class="btn-primary" style="flex:2;justify-content:center;" id="saveFarm">🌾 Create Farm</button>
        </div>
      </div>
      <div class="modal-map-canvas" id="createFarmMapCanvas"></div>
    </div>
  `;

  ov.appendChild(box);
  ov.classList.add('open');

  setTimeout(() => document.getElementById('farmName')?.focus(), 100);

  let inlineBm = null;

  requestAnimationFrame(() => {
    const canvas = document.getElementById('createFarmMapCanvas');
    if (canvas) {
      inlineBm = createInlineBoundaryMap(canvas, {
        existingGeoJson: null,
        centerLat: null,
        centerLng: null,
      });
    }
  });

  // Re-centre when lat/lng inputs change
  ['farmLat', 'farmLng'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      const lat = parseFloat(document.getElementById('farmLat').value);
      const lng = parseFloat(document.getElementById('farmLng').value);
      if (lat && lng && inlineBm) inlineBm.setCenter(lat, lng);
    });
  });

  function destroyAndClose() {
    inlineBm?.destroy();
    inlineBm = null;
    ov.classList.remove('open');
    ov.innerHTML = '';
  }

  document.getElementById('createFarmCloseBtn').addEventListener('click', destroyAndClose);
  document.getElementById('cancelFarm').addEventListener('click', destroyAndClose);

  document.getElementById('saveFarm').addEventListener('click', async () => {
    const btn = document.getElementById('saveFarm');
    const name = document.getElementById('farmName').value.trim();
    if (!name) {
      const inp = document.getElementById('farmName');
      inp.style.borderColor = 'var(--red)';
      inp.focus();
      setTimeout(() => inp.style.borderColor = '', 1500);
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    let lat = parseFloat(document.getElementById('farmLat').value) || null;
    let lng = parseFloat(document.getElementById('farmLng').value) || null;
    // auto-calculate centre from drawn boundary when lat/lng are empty
    if ((!lat || !lng) && inlineBm) {
      const centroid = inlineBm.getCentroid();
      if (centroid) { lat = centroid.lat; lng = centroid.lng; }
    }

    try {
      await createFarm({
        name,
        address:         document.getElementById('farmAddress').value.trim() || null,
        latitude:        lat,
        longitude:       lng,
        boundaryGeoJson: inlineBm ? inlineBm.getGeoJson() : null,
      });
      destroyAndClose();
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
