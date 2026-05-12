import { getFarms, createFarm, updateFarm, deleteFarm } from '../api/farms.js';
import { getFields, createField, updateField, deleteField } from '../api/fields.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDate } from '../utils/helpers.js';
import { openBoundaryMap } from '../components/boundary-map.js';

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
  const form   = document.createElement('div');

  // Track drawn GeoJSON independently of the text hidden state
  let _drawnGeoJson  = isEdit ? (field.geoBoundary || null) : null;
  let _drawnAreaHa   = isEdit ? (field.areaHectares ?? null) : null;

  const hasBoundary = !!_drawnGeoJson;

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
        <input class="input-field" type="number" step="0.01" min="0" id="fldArea"
               placeholder="Auto-calculated from boundary"
               value="${isEdit && field.areaHectares != null ? field.areaHectares : ''}">
      </div>
      <div style="display:flex;flex-direction:column;justify-content:flex-end;">
        <label class="input-label">Field Boundary</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="btn-outline" id="drawFieldBoundaryBtn"
                  style="flex:1;padding:6px 10px;font-size:0.78rem;justify-content:center;">
            🗺 ${hasBoundary ? 'Edit Boundary' : 'Draw Boundary'}
          </button>
          <span id="fldBoundaryStatus" style="font-size:0.72rem;color:${hasBoundary ? 'var(--green)' : 'var(--text-dim)'};">
            ${hasBoundary ? '✓ Boundary set' : 'None'}
          </span>
        </div>
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

  // Build background layers: other fields of same farm (read-only context)
  const backgroundLayers = [];
  // (Fields list not available here without another fetch, so we pass empty;
  //  the farm boundary is shown if available.)
  if (farm.boundaryGeoJson) {
    backgroundLayers.push({ name: farm.name, geoJson: farm.boundaryGeoJson, color: '#6aaf7a' });
  }

  document.getElementById('drawFieldBoundaryBtn').addEventListener('click', () => {
    closeModal();
    openBoundaryMap({
      title:            isEdit ? `Edit Boundary – ${field.name}` : 'Draw Field Boundary',
      existingGeoJson:  _drawnGeoJson,
      centerLat:        farm.latitude,
      centerLng:        farm.longitude,
      backgroundLayers,
      onConfirm: ({ geoJson, areaHectares }) => {
        _drawnGeoJson = geoJson;
        _drawnAreaHa  = areaHectares;
        // Re-open modal with updated values
        const currentName   = document.getElementById('fldName')?.value   ?? (isEdit ? field.name : '');
        const currentCrop   = document.getElementById('fldCrop')?.value   ?? (isEdit ? field.cropType   || '' : '');
        const currentSeason = document.getElementById('fldSeason')?.value ?? (isEdit ? field.season     || '' : '');
        const syntheticField = isEdit
          ? { ...field, name: currentName, cropType: currentCrop, season: currentSeason,
              geoBoundary: geoJson, areaHectares }
          : null;
        showFieldModal(syntheticField ?? { name: currentName, cropType: currentCrop, season: currentSeason },
                       farm, farmIdx);
        // Patch area after re-open
        setTimeout(() => {
          const areaInp = document.getElementById('fldArea');
          if (areaInp) areaInp.value = areaHectares.toFixed(2);
          const statusEl = document.getElementById('fldBoundaryStatus');
          if (statusEl) { statusEl.textContent = '✓ Boundary set'; statusEl.style.color = 'var(--green)'; }
          const btn = document.getElementById('drawFieldBoundaryBtn');
          if (btn) btn.textContent = '🗺 Edit Boundary';
        }, 50);
      },
    });
  });

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
    const manualArea = parseFloat(document.getElementById('fldArea').value) || null;
    const payload = {
      name,
      cropType:     document.getElementById('fldCrop').value.trim()   || null,
      areaHectares: _drawnAreaHa ?? manualArea,
      season:       document.getElementById('fldSeason').value.trim() || null,
      geoBoundary:  _drawnGeoJson,
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
  let _drawnBoundary = farm.boundaryGeoJson || null;

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
      <div>
        <label class="input-label">Farm Boundary</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="btn-outline" id="drawFarmBoundaryBtn"
                  style="flex:1;padding:6px 10px;font-size:0.78rem;justify-content:center;">
            🗺 ${_drawnBoundary ? 'Edit Farm Boundary' : 'Draw Farm Boundary'}
          </button>
          <span id="editFarmBoundaryStatus"
                style="font-size:0.72rem;color:${_drawnBoundary ? 'var(--green)' : 'var(--text-dim)'};">
            ${_drawnBoundary ? '✓ Boundary set' : 'None'}
          </span>
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

  document.getElementById('drawFarmBoundaryBtn').addEventListener('click', () => {
    const lat = parseFloat(document.getElementById('editFarmLat').value) || farm.latitude;
    const lng = parseFloat(document.getElementById('editFarmLng').value) || farm.longitude;
    closeModal();
    openBoundaryMap({
      title:           `Farm Boundary – ${farm.name}`,
      existingGeoJson: _drawnBoundary,
      centerLat:       lat,
      centerLng:       lng,
      onConfirm: ({ geoJson }) => {
        _drawnBoundary = geoJson;
        showEditFarmModal({ ...farm, boundaryGeoJson: geoJson }, farmIdx);
        setTimeout(() => {
          const s = document.getElementById('editFarmBoundaryStatus');
          if (s) { s.textContent = '✓ Boundary set'; s.style.color = 'var(--green)'; }
          const b = document.getElementById('drawFarmBoundaryBtn');
          if (b) b.textContent = '🗺 Edit Farm Boundary';
        }, 50);
      },
    });
  });

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
        boundaryGeoJson: _drawnBoundary,
        isActive: newActive,
      });
      closeModal();
      showToast('Farm updated!', 'success');
      const updatedFarm = { ...farm, name: newName, address: newAddress,
                            latitude: newLat, longitude: newLng,
                            boundaryGeoJson: _drawnBoundary, isActive: newActive };
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

function showCreateFarmModal(prefill = {}) {
  let _drawnBoundary = prefill.boundaryGeoJson || null;

  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label class="input-label">Farm Name</label>
        <input class="input-field" type="text" id="farmName" placeholder="e.g. Sunrise Farm" required
               value="${escapeHtml(prefill.name || '')}">
      </div>
      <div>
        <label class="input-label">Address</label>
        <input class="input-field" type="text" id="farmAddress" placeholder="e.g. Stellenbosch, Western Cape"
               value="${escapeHtml(prefill.address || '')}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label class="input-label">Latitude</label>
          <input class="input-field" type="number" step="any" id="farmLat" placeholder="-33.9321"
                 value="${prefill.latitude ?? ''}">
        </div>
        <div>
          <label class="input-label">Longitude</label>
          <input class="input-field" type="number" step="any" id="farmLng" placeholder="18.8602"
                 value="${prefill.longitude ?? ''}">
        </div>
      </div>
      <div>
        <label class="input-label">Farm Boundary <span style="color:var(--text-dim);font-size:0.7rem;">(optional)</span></label>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="btn-outline" id="drawNewFarmBoundaryBtn"
                  style="flex:1;padding:6px 10px;font-size:0.78rem;justify-content:center;">
            🗺 ${_drawnBoundary ? 'Edit Farm Boundary' : 'Draw Farm Boundary'}
          </button>
          <span id="newFarmBoundaryStatus"
                style="font-size:0.72rem;color:${_drawnBoundary ? 'var(--green)' : 'var(--text-dim)'};">
            ${_drawnBoundary ? '✓ Boundary set' : 'None'}
          </span>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelFarm">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveFarm">🌾 Create Farm</button>
      </div>
    </div>
  `;

  openModal({ title: 'Add New Farm', subtitle: 'Register a new farm property', content: form });
  setTimeout(() => document.getElementById('farmName')?.focus(), 100);

  document.getElementById('drawNewFarmBoundaryBtn').addEventListener('click', () => {
    const lat = parseFloat(document.getElementById('farmLat').value) || null;
    const lng = parseFloat(document.getElementById('farmLng').value) || null;
    const savedPrefill = {
      name:      document.getElementById('farmName').value,
      address:   document.getElementById('farmAddress').value,
      latitude:  lat,
      longitude: lng,
      boundaryGeoJson: _drawnBoundary,
    };
    closeModal();
    openBoundaryMap({
      title:           'Draw Farm Boundary',
      existingGeoJson: _drawnBoundary,
      centerLat:       lat,
      centerLng:       lng,
      onConfirm: ({ geoJson }) => {
        _drawnBoundary = geoJson;
        showCreateFarmModal({ ...savedPrefill, boundaryGeoJson: geoJson });
        setTimeout(() => {
          const s = document.getElementById('newFarmBoundaryStatus');
          if (s) { s.textContent = '✓ Boundary set'; s.style.color = 'var(--green)'; }
          const b = document.getElementById('drawNewFarmBoundaryBtn');
          if (b) b.textContent = '🗺 Edit Farm Boundary';
        }, 50);
      },
    });
  });

  document.getElementById('cancelFarm').addEventListener('click', closeModal);
  document.getElementById('saveFarm').addEventListener('click', async () => {
    const btn = document.getElementById('saveFarm');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await createFarm({
        name:            document.getElementById('farmName').value.trim(),
        address:         document.getElementById('farmAddress').value.trim() || null,
        latitude:        parseFloat(document.getElementById('farmLat').value) || null,
        longitude:       parseFloat(document.getElementById('farmLng').value) || null,
        boundaryGeoJson: _drawnBoundary,
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
