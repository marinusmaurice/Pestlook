import { getFarm, updateFarm } from '../api/farms.js';
import { getFields, createField, updateField, deleteField } from '../api/fields.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDate } from '../utils/helpers.js';
import { navigate } from '../utils/router.js';

export async function renderFarmDetail(container, params) {
  const farmId = params.id;

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <a href="#/farms" style="font-size:0.82rem;color:var(--text-dim);text-decoration:none;">← Back to Farms</a>
    </div>
    <div id="farmDetail"><div class="skeleton skeleton-card" style="height:200px;"></div></div>
  `;

  try {
    const [farmRes, fieldsRes] = await Promise.all([
      getFarm(farmId),
      getFields(farmId),
    ]);

    const farm = farmRes.data;
    const fields = fieldsRes.data || [];

    renderDetail(farm, fields, container, params);
  } catch (err) {
    showToast('Failed to load farm: ' + err.message, 'error');
  }
}

function renderDetail(farm, fields, container, params) {
  const el = document.getElementById('farmDetail');

  const totalHa = fields.reduce((s, f) => s + (parseFloat(f.areaHectares) || 0), 0);
  const haDisplay = totalHa % 1 === 0 ? totalHa : totalHa.toFixed(1);

  let fieldsHtml = '';
  if (fields.length === 0) {
    fieldsHtml = `
      <div class="empty-state" style="padding:40px;text-align:center;">
        <div class="empty-icon">🌱</div>
        <h3>No fields yet</h3>
        <p>Add a field to start monitoring</p>
      </div>`;
  } else {
    fieldsHtml = `<table class="data-table">
      <thead>
        <tr>
          <th>Field Name</th><th>Crop Type</th><th>Season</th>
          <th>Area (ha)</th><th>Geo Boundary</th><th>Created</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>`;
    for (const f of fields) {
      fieldsHtml += `
        <tr>
          <td><div style="font-weight:600;color:var(--text);">${escapeHtml(f.name)}</div></td>
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

  el.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;gap:20px;">
      <div style="font-size:2.2rem;">🌾</div>
      <div style="flex:1;">
        <div style="font-family:'Fraunces',serif;font-weight:700;font-size:1.1rem;color:var(--text);">${escapeHtml(farm.name)}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);margin-top:2px;">📍 ${escapeHtml(farm.address || 'No address')}${farm.latitude ? ` · ${farm.latitude.toFixed(4)}, ${farm.longitude.toFixed(4)}` : ''}</div>
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
          <button class="btn-outline" id="editFarmBtn" style="padding:5px 12px;font-size:0.78rem;">✏️ Edit Farm</button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-p" style="border-bottom:1px solid var(--border);">
        <div class="section-head" style="margin-bottom:0;">
          <div>
            <div class="section-title">Fields</div>
            <div class="section-sub">${fields.length} field${fields.length !== 1 ? 's' : ''} · ${haDisplay} ha total</div>
          </div>
          <button class="btn-primary" id="addFieldBtn" style="padding:6px 14px;">＋ Add Field</button>
        </div>
      </div>
      <div style="overflow-x:auto;">${fieldsHtml}</div>
    </div>
  `;

  document.getElementById('addFieldBtn')?.addEventListener('click', () => showFieldModal(null, farm.id, container, params));
  document.getElementById('editFarmBtn')?.addEventListener('click', () => showEditFarmModal(farm, container, params));

  el.querySelectorAll('[data-edit-field]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const field = fields.find(f => f.id === btn.dataset.editField);
      if (field) showFieldModal(field, farm.id, container, params);
    });
  });

  el.querySelectorAll('[data-delete-field]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const field = fields.find(f => f.id === btn.dataset.deleteField);
      if (field) showDeleteFieldConfirm(field, container, params);
    });
  });
}

function showEditFarmModal(farm, listContainer, params) {
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
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelEditFarm">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveEditFarm">💾 Save Changes</button>
      </div>
    </div>
  `;

  openModal({ title: 'Edit Farm', subtitle: 'Update farm details', content: form });

  document.getElementById('cancelEditFarm').addEventListener('click', closeModal);
  document.getElementById('saveEditFarm').addEventListener('click', async () => {
    const btn = document.getElementById('saveEditFarm');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      await updateFarm(farm.id, {
        name: document.getElementById('editFarmName').value.trim(),
        address: document.getElementById('editFarmAddress').value.trim() || null,
        latitude: parseFloat(document.getElementById('editFarmLat').value) || null,
        longitude: parseFloat(document.getElementById('editFarmLng').value) || null,
        boundaryGeoJson: farm.boundaryGeoJson || null,
      });
      closeModal();
      showToast('Farm updated!', 'success');
      renderFarmDetail(listContainer, params);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '💾 Save Changes';
    }
  });
}

function showFieldModal(field, farmId, listContainer, params) {
  const isEdit = field !== null;
  const form = document.createElement('div');
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
      <div style="grid-column:1/-1;display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelFld">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveFld">${isEdit ? '💾 Save Changes' : '🌱 Create Field'}</button>
      </div>
    </div>
  `;

  openModal({
    title: isEdit ? 'Edit Field' : 'Add Field',
    subtitle: isEdit ? 'Update field details' : 'New crop field for this farm',
    content: form,
  });
  setTimeout(() => document.getElementById('fldName')?.focus(), 100);

  document.getElementById('cancelFld').addEventListener('click', closeModal);
  document.getElementById('saveFld').addEventListener('click', async () => {
    const btn = document.getElementById('saveFld');
    const name = document.getElementById('fldName').value.trim();
    if (!name) {
      const inp = document.getElementById('fldName');
      inp.style.borderColor = 'var(--red)';
      inp.focus();
      setTimeout(() => inp.style.borderColor = '', 1500);
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const payload = {
        name,
        cropType: document.getElementById('fldCrop').value.trim() || null,
        areaHectares: parseFloat(document.getElementById('fldArea').value) || null,
        season: document.getElementById('fldSeason').value.trim() || null,
        geoBoundary: document.getElementById('fldGeo').value.trim() || null,
      };
      if (isEdit) {
        await updateField(field.id, payload);
        showToast('Field updated!', 'success');
      } else {
        await createField({ farmId, ...payload });
        showToast('Field created!', 'success');
      }
      closeModal();
      renderFarmDetail(listContainer, params);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = isEdit ? '💾 Save Changes' : '🌱 Create Field';
    }
  });
}

function showDeleteFieldConfirm(field, listContainer, params) {
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
      renderFarmDetail(listContainer, params);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Delete Field';
    }
  });
}
