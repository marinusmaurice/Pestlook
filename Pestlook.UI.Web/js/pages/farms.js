import { getFarms, createFarm, updateFarm, deleteFarm } from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { getMonitoringPoints } from '../api/monitoring-points.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml } from '../utils/helpers.js';
import { navigate } from '../utils/router.js';

export async function renderFarms(container) {
  setPageTitle('Farms & Fields');
  setTopbarCta('＋ Add Farm', () => showCreateFarmModal(container));

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;">
      <div>
        <div class="page-heading">Farms & Fields</div>
        <div class="page-desc">Manage your farm properties and crop fields</div>
      </div>
    </div>
    <div class="three-col" id="farmsGrid">
      <div class="card"><div class="card-p"><div class="skeleton skeleton-card"></div></div></div>
      <div class="card"><div class="card-p"><div class="skeleton skeleton-card"></div></div></div>
      <div class="card"><div class="card-p"><div class="skeleton skeleton-card"></div></div></div>
    </div>
  `;

  try {
    const [farmsRes, fieldsRes, pointsRes] = await Promise.all([
      getFarms(),
      getFields(),
      getMonitoringPoints(),
    ]);

    const farms = farmsRes.data || [];
    const fields = fieldsRes.data || [];
    const points = pointsRes.data || [];

    renderFarmGrid(farms, fields, points, container);
  } catch (err) {
    showToast('Failed to load farms: ' + err.message, 'error');
  }
}

const farmColors = [
  ['#1a3d20', '#2a5e30'],
  ['#1f3520', '#3a5530'],
  ['#2a2f1a', '#3d4520'],
  ['#1a2830', '#203545'],
  ['#2a1a30', '#3d2045'],
];
const farmEmojis = ['🌾', '🌿', '🍇', '🌻', '🌽', '🌴', '🌱'];

function renderFarmGrid(farms, fields, points, container) {
  const grid = document.getElementById('farmsGrid');
  let html = '';

  farms.forEach((farm, i) => {
    const farmFields = fields.filter(f => f.farmId === farm.id);
    const farmPoints = points.filter(p => p.farmId === farm.id);
    const c = farmColors[i % farmColors.length];
    const emoji = farmEmojis[i % farmEmojis.length];
    const topField = farmFields[0];
    const crop = topField?.cropType || '—';
    const ha = topField?.areaHectares ? `${topField.areaHectares} ha` : '';

    html += `
      <div class="card" style="display:flex;flex-direction:column;">
        <div class="farm-card-header" style="background:linear-gradient(135deg,${c[0]},${c[1]});cursor:pointer;" onclick="location.hash='#/farms/${farm.id}'">
          <div class="grid-overlay"></div>
          ${emoji}
        </div>
        <div class="card-p" style="flex:1;cursor:pointer;" onclick="location.hash='#/farms/${farm.id}'">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="font-weight:600;color:#fff;font-size:0.95rem;">${escapeHtml(farm.name)}</div>
            ${tag('Active', 'green')}
          </div>
          <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:12px;">📍 ${escapeHtml(farm.address || 'No address')}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div style="background:var(--surface2);border-radius:8px;padding:8px 10px;">
              <div style="font-size:0.65rem;color:var(--text-dim);margin-bottom:2px;text-transform:uppercase;letter-spacing:0.06em;">Fields</div>
              <div style="font-family:'Fraunces',serif;font-weight:700;color:var(--green);font-size:1.2rem;">${farmFields.length}</div>
            </div>
            <div style="background:var(--surface2);border-radius:8px;padding:8px 10px;">
              <div style="font-size:0.65rem;color:var(--text-dim);margin-bottom:2px;text-transform:uppercase;letter-spacing:0.06em;">Mon. Points</div>
              <div style="font-family:'Fraunces',serif;font-weight:700;color:var(--blue);font-size:1.2rem;">${farmPoints.length}</div>
            </div>
          </div>
          ${crop !== '—' || ha ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:0.75rem;color:var(--text-dim);">Crop: ${escapeHtml(crop)}${ha ? ' · ' + ha : ''}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;padding:10px 14px;border-top:1px solid var(--border);">
          <button class="btn-outline" style="flex:1;padding:5px 0;font-size:0.75rem;justify-content:center;" data-edit-farm="${farm.id}">✏️ Edit</button>
          <button class="btn-danger" style="flex:1;padding:5px 0;font-size:0.75rem;" data-delete-farm="${farm.id}">🗑 Delete</button>
        </div>
      </div>
    `;
  });

  html += `
    <div class="card add-card" onclick="document.dispatchEvent(new Event('addFarm'))">
      <div style="text-align:center;">
        <div style="font-size:2rem;margin-bottom:8px;">＋</div>
        <div style="font-size:0.85rem;color:var(--text-dim);">Add New Farm</div>
      </div>
    </div>
  `;

  grid.innerHTML = html;

  document.addEventListener('addFarm', () => showCreateFarmModal(container), { once: true });

  grid.querySelectorAll('[data-edit-farm]').forEach(btn => {
    btn.addEventListener('click', () => {
      const farm = farms.find(f => f.id === btn.dataset.editFarm);
      if (farm) showEditFarmModal(farm, container);
    });
  });

  grid.querySelectorAll('[data-delete-farm]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const farm = farms.find(f => f.id === btn.dataset.deleteFarm);
      if (!farm) return;
      if (!confirm(`Delete "${farm.name}"? This cannot be undone.`)) return;
      try {
        await deleteFarm(farm.id);
        showToast('Farm deleted.', 'success');
        renderFarms(container);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function showEditFarmModal(farm, listContainer) {
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
      renderFarms(listContainer);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '💾 Save Changes';
    }
  });
}

function showCreateFarmModal(listContainer) {
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
        name: document.getElementById('farmName').value.trim(),
        address: document.getElementById('farmAddress').value.trim() || null,
        latitude: parseFloat(document.getElementById('farmLat').value) || null,
        longitude: parseFloat(document.getElementById('farmLng').value) || null,
      });
      closeModal();
      showToast('Farm created!', 'success');
      renderFarms(listContainer);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '🌾 Create Farm';
    }
  });
}
