import { getMonitoringPoints, createMonitoringPoint } from '../api/monitoring-points.js';
import { getFarms } from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { getTrapTypes } from '../api/trap-types.js';
import { getPests } from '../api/pests.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, MonitoringPointType } from '../utils/helpers.js';

let cachedFarms = [];
let cachedFields = [];
let cachedTrapTypes = [];
let cachedPests = [];

export async function renderMonitoringPoints(container) {
  setPageTitle('Monitoring Points');
  setTopbarCta('＋ Add Point', () => showCreatePointModal(container));

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;">
      <div>
        <div class="page-heading">Monitoring Points</div>
        <div class="page-desc">Track trap locations and pest assignment</div>
      </div>
    </div>
    <div class="tab-bar" id="mpTabs" style="margin-bottom:20px;"></div>
    <div class="card" id="mpTable"><div class="card-p"><div class="skeleton skeleton-card" style="height:300px;"></div></div></div>
  `;

  try {
    const [pointsRes, farmsRes, fieldsRes, trapRes, pestsRes] = await Promise.all([
      getMonitoringPoints(),
      getFarms(),
      getFields(),
      getTrapTypes(),
      getPests(),
    ]);

    const points = pointsRes.data || [];
    cachedFarms = farmsRes.data || [];
    cachedFields = fieldsRes.data || [];
    cachedTrapTypes = trapRes.data || [];
    cachedPests = pestsRes.data || [];

    renderTabs(points);
    renderTable(points, 'all');
  } catch (err) {
    showToast('Failed to load monitoring points: ' + err.message, 'error');
  }
}

function renderTabs(points) {
  const active = points.filter(p => p.isActive);
  const inactive = points.filter(p => !p.isActive);
  const el = document.getElementById('mpTabs');

  el.innerHTML = `
    <button class="tab-btn active" data-filter="all">All (${points.length})</button>
    <button class="tab-btn" data-filter="active">Active (${active.length})</button>
    <button class="tab-btn" data-filter="inactive">Inactive (${inactive.length})</button>
  `;

  el.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const filtered = filter === 'active' ? active : filter === 'inactive' ? inactive : points;
      renderTable(filtered, filter);
    });
  });
}

function renderTable(points, filter) {
  const el = document.getElementById('mpTable');

  if (points.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📍</div><h3>No monitoring points</h3><p>Add a monitoring point to start tracking</p></div>`;
    return;
  }

  let rows = '';
  for (const p of points) {
    const farm = cachedFarms.find(f => f.id === p.farmId);
    const field = cachedFields.find(f => f.id === p.fieldId);
    const typeLabel = MonitoringPointType[p.pointType] || 'Unknown';
    const typeTag = p.pointType === 0 ? tag('Trap', 'blue') : p.pointType === 1 ? tag('Inspect', 'green') : tag('Visit', 'gray');
    const pestNames = (p.assignedPests || []).map(ap => ap.pestName).join(', ') || '—';
    const statusTag = p.isActive ? tag('Active', 'green') : tag('Inactive', 'gray');

    rows += `
      <tr>
        <td>
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;font-weight:500;color:var(--text);">${escapeHtml(p.name || '—')}</div>
          <div style="font-size:0.7rem;color:var(--text-dim);">${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}</div>
        </td>
        <td>
          <div style="font-weight:500;color:var(--text);">${escapeHtml(farm?.name || '—')}</div>
          <div style="font-size:0.72rem;color:var(--text-dim);">${escapeHtml(field?.name || '')}</div>
        </td>
        <td>${typeTag}</td>
        <td style="font-size:0.8rem;color:var(--text-mid);">${escapeHtml(p.trapTypeName || 'None')}</td>
        <td><span style="font-size:0.78rem;">${escapeHtml(pestNames)}</span></td>
        <td>${statusTag}</td>
      </tr>
    `;
  }

  el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Point</th><th>Farm / Field</th><th>Type</th><th>Trap</th><th>Pests Monitored</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function showCreatePointModal(listContainer) {
  const farmOptions = cachedFarms.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
  const trapOptions = `<option value="">None</option>` + cachedTrapTypes.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
  const pestCheckboxes = cachedPests.map(p => `
    <label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--text-mid);cursor:pointer;">
      <input type="checkbox" value="${p.id}" class="pest-cb"> ${escapeHtml(p.commonName)}
    </label>
  `).join('');

  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label class="input-label">Farm</label>
        <select class="input-field" id="mpFarm">${farmOptions}</select>
      </div>
      <div>
        <label class="input-label">Name</label>
        <input class="input-field" type="text" id="mpName" placeholder="e.g. MP-01">
      </div>
      <div>
        <label class="input-label">Type</label>
        <select class="input-field" id="mpType">
          <option value="0">Fixed Trap</option>
          <option value="1">Fixed Scouting</option>
          <option value="2">Scouting Visit</option>
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><label class="input-label">Latitude</label><input class="input-field" type="number" step="any" id="mpLat" required></div>
        <div><label class="input-label">Longitude</label><input class="input-field" type="number" step="any" id="mpLng" required></div>
      </div>
      <div>
        <label class="input-label">Trap Type</label>
        <select class="input-field" id="mpTrap">${trapOptions}</select>
      </div>
      <div>
        <label class="input-label">Assign Pests</label>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;max-height:120px;overflow-y:auto;">
          ${pestCheckboxes || '<div style="font-size:0.8rem;color:var(--text-dim);">No pests in catalogue yet</div>'}
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelMp">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveMp">📍 Create Point</button>
      </div>
    </div>
  `;

  openModal({ title: 'Add Monitoring Point', subtitle: 'Set up a new trap or inspection point', content: form });

  document.getElementById('cancelMp').addEventListener('click', closeModal);
  document.getElementById('saveMp').addEventListener('click', async () => {
    const btn = document.getElementById('saveMp');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    const selectedPests = [...form.querySelectorAll('.pest-cb:checked')].map(cb => ({ pestId: cb.value }));

    try {
      await createMonitoringPoint({
        farmId: document.getElementById('mpFarm').value,
        pointType: parseInt(document.getElementById('mpType').value),
        name: document.getElementById('mpName').value.trim() || null,
        latitude: parseFloat(document.getElementById('mpLat').value),
        longitude: parseFloat(document.getElementById('mpLng').value),
        trapTypeId: document.getElementById('mpTrap').value || null,
        pests: selectedPests.length > 0 ? selectedPests : null,
      });
      closeModal();
      showToast('Monitoring point created!', 'success');
      renderMonitoringPoints(listContainer);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '📍 Create Point';
    }
  });
}
