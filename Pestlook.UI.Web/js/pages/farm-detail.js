import { getFarm } from '../api/farms.js';
import { getFields, createField, deleteField } from '../api/fields.js';
import { getMonitoringPoints } from '../api/monitoring-points.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDate } from '../utils/helpers.js';
import { navigate } from '../utils/router.js';

export async function renderFarmDetail(container, params) {
  const farmId = params.id;
  setTopbarCta('＋ Add Field', () => showCreateFieldModal(farmId, container, params));

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <a href="#/farms" style="font-size:0.82rem;color:var(--text-dim);text-decoration:none;">← Back to Farms</a>
    </div>
    <div id="farmDetail"><div class="skeleton skeleton-card" style="height:200px;"></div></div>
  `;

  try {
    const [farmRes, fieldsRes, pointsRes] = await Promise.all([
      getFarm(farmId),
      getFields(farmId),
      getMonitoringPoints(farmId),
    ]);

    const farm = farmRes.data;
    const fields = fieldsRes.data || [];
    const points = pointsRes.data || [];

    setPageTitle(farm.name);
    renderDetail(farm, fields, points, container, params);
  } catch (err) {
    showToast('Failed to load farm: ' + err.message, 'error');
  }
}

function renderDetail(farm, fields, points, container, params) {
  const el = document.getElementById('farmDetail');

  let fieldsHtml = '';
  if (fields.length === 0) {
    fieldsHtml = `<div class="empty-state"><div class="empty-icon">🌱</div><h3>No fields yet</h3><p>Add a field to start monitoring</p></div>`;
  } else {
    fieldsHtml = `<table class="data-table">
      <thead><tr><th>Name</th><th>Crop</th><th>Area</th><th>Season</th><th>Created</th><th></th></tr></thead>
      <tbody>`;
    for (const f of fields) {
      const fieldPoints = points.filter(p => p.fieldId === f.id);
      fieldsHtml += `
        <tr>
          <td style="font-weight:500;color:var(--text);">${escapeHtml(f.name)}</td>
          <td>${escapeHtml(f.cropType || '—')}</td>
          <td>${f.areaHectares ? f.areaHectares + ' ha' : '—'}</td>
          <td>${escapeHtml(f.season || '—')}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--text-dim);">${formatDate(f.createdAt)}</td>
          <td style="display:flex;gap:6px;">
            ${tag(fieldPoints.length + ' pts', 'blue')}
            <button class="btn-danger" style="padding:3px 8px;font-size:0.7rem;" data-delete-field="${f.id}">Delete</button>
          </td>
        </tr>
      `;
    }
    fieldsHtml += `</tbody></table>`;
  }

  el.innerHTML = `
    <div class="card card-p" style="margin-bottom:16px;">
      <div class="section-head">
        <div>
          <div class="section-title">${escapeHtml(farm.name)}</div>
          <div class="section-sub">📍 ${escapeHtml(farm.address || 'No address')}${farm.latitude ? ` · ${farm.latitude.toFixed(4)}, ${farm.longitude.toFixed(4)}` : ''}</div>
        </div>
        <div style="display:flex;gap:8px;">
          ${tag(fields.length + ' fields', 'green')}
          ${tag(points.length + ' monitoring points', 'blue')}
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-p" style="border-bottom:1px solid var(--border);">
        <div class="section-head" style="margin-bottom:0;">
          <div class="section-title">Fields</div>
          <button class="btn-primary" id="addFieldBtn" style="padding:6px 14px;">＋ Add Field</button>
        </div>
      </div>
      ${fieldsHtml}
    </div>
  `;

  document.getElementById('addFieldBtn')?.addEventListener('click', () => showCreateFieldModal(farm.id, container, params));

  el.querySelectorAll('[data-delete-field]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const fieldId = btn.dataset.deleteField;
      if (!confirm('Delete this field?')) return;
      try {
        await deleteField(fieldId);
        showToast('Field deleted', 'success');
        renderFarmDetail(container, params);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function showCreateFieldModal(farmId, listContainer, params) {
  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label class="input-label">Field Name</label>
        <input class="input-field" type="text" id="fieldName" placeholder="e.g. North Maize Block" required>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label class="input-label">Crop Type</label>
          <input class="input-field" type="text" id="fieldCrop" placeholder="e.g. Maize">
        </div>
        <div>
          <label class="input-label">Area (hectares)</label>
          <input class="input-field" type="number" step="any" id="fieldArea" placeholder="e.g. 120">
        </div>
      </div>
      <div>
        <label class="input-label">Season</label>
        <input class="input-field" type="text" id="fieldSeason" placeholder="e.g. 2026 Summer">
      </div>
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelField">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveField">🌱 Create Field</button>
      </div>
    </div>
  `;

  openModal({ title: 'Add Field', subtitle: 'Create a new field for this farm', content: form });

  document.getElementById('cancelField').addEventListener('click', closeModal);
  document.getElementById('saveField').addEventListener('click', async () => {
    const btn = document.getElementById('saveField');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await createField({
        farmId,
        name: document.getElementById('fieldName').value.trim(),
        cropType: document.getElementById('fieldCrop').value.trim() || null,
        areaHectares: parseFloat(document.getElementById('fieldArea').value) || null,
        season: document.getElementById('fieldSeason').value.trim() || null,
      });
      closeModal();
      showToast('Field created!', 'success');
      renderFarmDetail(listContainer, params);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '🌱 Create Field';
    }
  });
}
