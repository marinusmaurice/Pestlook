import { getTraps, createTrap, updateTrap, toggleTrap, deleteTrap } from '../api/traps.js';
import { getTrapTypes } from '../api/trap-types.js';
import { getMonitoringPoints } from '../api/monitoring-points.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDateTime } from '../utils/helpers.js';

let cachedTrapTypes = [];
let cachedMonitoringPoints = [];
let cachedTraps = [];
let leafletMap = null;
let mapMarkers = {};    // trapId → L.marker
let selectedTrapId = null;

export async function renderTraps(container) {
  setPageTitle('Traps');
  setTopbarCta('＋ Add Trap', () => showCreateTrapModal(container));

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;">
      <div>
        <div class="page-heading">Traps</div>
        <div class="page-desc">Manage physical traps, barcodes and locations</div>
      </div>
    </div>
    <div class="tab-bar" id="trapTabs" style="margin-bottom:20px;"></div>
    <div id="trapMapWrap" style="margin-bottom:20px;border-radius:12px;overflow:hidden;border:1px solid var(--border);height:380px;display:none;position:relative;"></div>
    <div class="card" id="trapTable"><div class="card-p"><div class="skeleton skeleton-card" style="height:300px;"></div></div></div>
  `;

  try {
    const [trapsRes, typesRes, mpRes] = await Promise.all([
      getTraps(),
      getTrapTypes(),
      getMonitoringPoints(),
    ]);

    cachedTraps = trapsRes.data || [];
    cachedTrapTypes = typesRes.data || [];
    cachedMonitoringPoints = mpRes.data || [];

    renderTabs(cachedTraps);
    renderTable(cachedTraps, 'all');
    renderMap(cachedTraps);
  } catch (err) {
    showToast('Failed to load traps: ' + err.message, 'error');
  }
}

function renderTabs(traps) {
  const enabled = traps.filter(t => t.isEnabled);
  const disabled = traps.filter(t => !t.isEnabled);
  const el = document.getElementById('trapTabs');

  el.innerHTML = `
    <button class="tab-btn active" data-filter="all">All (${traps.length})</button>
    <button class="tab-btn" data-filter="enabled">Enabled (${enabled.length})</button>
    <button class="tab-btn" data-filter="disabled">Disabled (${disabled.length})</button>
    <button class="tab-btn" data-filter="map">🗺 Map View</button>
  `;

  el.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const mapWrap = document.getElementById('trapMapWrap');

      if (filter === 'map') {
        mapWrap.style.display = 'block';
        // Leaflet needs a nudge after the container becomes visible
        if (leafletMap) setTimeout(() => leafletMap.invalidateSize(), 50);
      } else {
        mapWrap.style.display = 'none';
      }

      const filtered = filter === 'enabled' ? enabled : filter === 'disabled' ? disabled : traps;
      renderTable(filtered, filter);
    });
  });
}

function renderMap(traps) {
  const mapWrap = document.getElementById('trapMapWrap');
  if (!mapWrap) return;

  // Preserve current visibility — only the tab buttons should show/hide the map
  const wasVisible = mapWrap.style.display === 'block';

  // Clean up any previous Leaflet instance
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }
  mapMarkers = {};

  const locatedTraps = traps.filter(t => t.latitude && t.longitude);
  if (locatedTraps.length === 0) {
    mapWrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:0.85rem;">No traps with GPS coordinates to display</div>`;
    if (wasVisible) mapWrap.style.display = 'block';
    return;
  }

  // Create the map container
  mapWrap.innerHTML = `
    <div id="trapLeafletMap" style="width:100%;height:340px;"></div>
    <div style="padding:8px 12px;background:var(--surface);font-size:0.72rem;color:var(--text-dim);display:flex;gap:12px;">
      <span>🟢 Enabled (${locatedTraps.filter(t => t.isEnabled).length})</span>
      <span>🔴 Disabled (${locatedTraps.filter(t => !t.isEnabled).length})</span>
      <span style="margin-left:auto;">📍 ${locatedTraps.length} trap(s) on map · Click a pin to highlight its row</span>
    </div>
  `;
  if (wasVisible) mapWrap.style.display = 'block';

  // Initialize Leaflet map
  leafletMap = L.map('trapLeafletMap', { zoomControl: true });

  // Google-style road tiles (via OpenStreetMap — no API key required)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(leafletMap);

  // Custom pin icons
  const enabledIcon = L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#22c55e;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
             <span style="transform:rotate(45deg);font-size:12px;">🕸️</span>
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });

  const disabledIcon = L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#ef4444;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
             <span style="transform:rotate(45deg);font-size:12px;">🕸️</span>
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });

  const selectedIcon = L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:#3b82f6;border:3px solid #fff;box-shadow:0 2px 10px rgba(59,130,246,.6);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
             <span style="transform:rotate(45deg);font-size:14px;">📍</span>
           </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34]
  });

  const bounds = L.latLngBounds();

  for (const t of locatedTraps) {
    const icon = t.isEnabled ? enabledIcon : disabledIcon;
    const marker = L.marker([t.latitude, t.longitude], { icon })
      .addTo(leafletMap)
      .bindPopup(`
        <div style="font-size:0.82rem;min-width:140px;">
          <strong>${escapeHtml(t.name)}</strong><br/>
          <span style="color:#666;">${escapeHtml(t.trapTypeName || 'No type')}</span><br/>
          <span style="font-size:0.75rem;color:#999;">${t.latitude.toFixed(5)}, ${t.longitude.toFixed(5)}</span>
          ${t.barcode ? `<br/><span style="font-size:0.75rem;">🏷 ${escapeHtml(t.barcode)}</span>` : ''}
        </div>
      `);

    marker._trapId = t.id;
    marker._defaultIcon = icon;
    marker._selectedIcon = selectedIcon;

    marker.on('click', () => selectTrap(t.id));

    mapMarkers[t.id] = marker;
    bounds.extend([t.latitude, t.longitude]);
  }

  leafletMap.fitBounds(bounds.pad(0.15));

  // Invalidate size after the container is visible (Leaflet needs this)
  setTimeout(() => leafletMap.invalidateSize(), 100);
}

/** Select a trap — highlight both map pin and table row */
function selectTrap(trapId) {
  // Deselect previous
  if (selectedTrapId && mapMarkers[selectedTrapId]) {
    mapMarkers[selectedTrapId].setIcon(mapMarkers[selectedTrapId]._defaultIcon);
  }
  document.querySelectorAll('#trapTable tr.trap-row-selected').forEach(r => r.classList.remove('trap-row-selected'));

  selectedTrapId = trapId;

  // Highlight pin
  if (mapMarkers[trapId]) {
    mapMarkers[trapId].setIcon(mapMarkers[trapId]._selectedIcon);
    mapMarkers[trapId].openPopup();
  }

  // Highlight and scroll to table row
  const row = document.querySelector(`#trapTable tr[data-trap-id="${trapId}"]`);
  if (row) {
    row.classList.add('trap-row-selected');
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderTable(traps, filter) {
  const el = document.getElementById('trapTable');

  if (traps.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🕸️</div><h3>No traps</h3><p>Add a trap to start tracking locations and barcodes</p></div>`;
    return;
  }

  let rows = '';
  for (const t of traps) {
    const statusTag = t.isEnabled ? tag('Enabled', 'green') : tag('Disabled', 'gray');
    const coords = (t.latitude && t.longitude)
      ? `${t.latitude.toFixed(4)}, ${t.longitude.toFixed(4)}`
      : '—';

    rows += `
      <tr data-trap-id="${t.id}" style="cursor:pointer;">
        <td>
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;font-weight:500;color:var(--text);">${escapeHtml(t.name)}</div>
          ${t.barcode ? `<div style="font-size:0.7rem;color:var(--text-dim);">🏷 ${escapeHtml(t.barcode)}</div>` : ''}
        </td>
        <td style="font-size:0.8rem;color:var(--text-mid);">${escapeHtml(t.trapTypeName || '—')}</td>
        <td style="font-size:0.78rem;color:var(--text-dim);font-family:'JetBrains Mono',monospace;">${coords}</td>
        <td style="font-size:0.8rem;color:var(--text-mid);">${escapeHtml(t.monitoringPointName || '—')}</td>
        <td>${statusTag}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn-icon" data-edit="${t.id}" title="Edit">✏️</button>
            <button class="btn-icon" data-toggle="${t.id}" title="${t.isEnabled ? 'Disable' : 'Enable'}">${t.isEnabled ? '⏸' : '▶️'}</button>
            <button class="btn-icon" data-del="${t.id}" title="Delete" style="color:var(--red);">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }

  el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Trap</th><th>Type</th><th>Location</th><th>Monitoring Point</th><th>Status</th><th style="width:100px;"></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Wire action buttons
  el.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await toggleTrap(btn.dataset.toggle);
        showToast('Trap status updated', 'success');
        await reloadTraps(el);
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  el.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this trap?')) return;
      try {
        await deleteTrap(btn.dataset.del);
        showToast('Trap deleted', 'success');
        await reloadTraps(el);
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  el.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const trap = cachedTraps.find(t => t.id === btn.dataset.edit);
      if (trap) showEditTrapModal(trap, el);
    });
  });

  // Row click → highlight pin on map
  el.querySelectorAll('tr[data-trap-id]').forEach(row => {
    row.addEventListener('click', () => {
      const trapId = row.dataset.trapId;
      selectTrap(trapId);
      // Pan the map to the selected marker
      if (leafletMap && mapMarkers[trapId]) {
        leafletMap.panTo(mapMarkers[trapId].getLatLng(), { animate: true });
      }
    });
  });
}

async function reloadTraps(tableEl) {
  const res = await getTraps();
  cachedTraps = res.data || [];
  renderTabs(cachedTraps);
  renderTable(cachedTraps, 'all');
  renderMap(cachedTraps);
}

function buildTrapForm(trap) {
  const typeOptions = `<option value="">None</option>` + cachedTrapTypes.map(t => `<option value="${t.id}" ${trap && trap.trapTypeId === t.id ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('');
  const mpOptions = `<option value="">None</option>` + cachedMonitoringPoints.map(mp => `<option value="${mp.id}" ${trap && trap.monitoringPointId === mp.id ? 'selected' : ''}>${escapeHtml(mp.name || 'Unnamed')} (${mp.latitude.toFixed(2)}, ${mp.longitude.toFixed(2)})</option>`).join('');

  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label class="input-label">Name *</label>
        <input class="input-field" type="text" id="trapName" value="${escapeHtml(trap?.name || '')}" placeholder="e.g. Trap-01 North Block">
      </div>
      <div>
        <label class="input-label">Barcode / QR Code</label>
        <input class="input-field" type="text" id="trapBarcode" value="${escapeHtml(trap?.barcode || '')}" placeholder="Scan or type barcode">
      </div>
      <div>
        <label class="input-label">Trap Type</label>
        <select class="input-field" id="trapType">${typeOptions}</select>
      </div>
      <div>
        <label class="input-label">Monitoring Point</label>
        <select class="input-field" id="trapMp">${mpOptions}</select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><label class="input-label">Latitude</label><input class="input-field" type="number" step="any" id="trapLat" value="${trap?.latitude || ''}"></div>
        <div><label class="input-label">Longitude</label><input class="input-field" type="number" step="any" id="trapLng" value="${trap?.longitude || ''}"></div>
      </div>
      ${trap ? `<div>
        <label class="input-label">Status</label>
        <select class="input-field" id="trapEnabled">
          <option value="true" ${trap.isEnabled ? 'selected' : ''}>Enabled</option>
          <option value="false" ${!trap.isEnabled ? 'selected' : ''}>Disabled</option>
        </select>
      </div>` : ''}
      <div>
        <label class="input-label">Notes</label>
        <textarea class="input-field" id="trapNotes" rows="2" placeholder="Optional notes">${escapeHtml(trap?.notes || '')}</textarea>
      </div>
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelTrap">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveTrap">🪤 ${trap ? 'Update' : 'Create'} Trap</button>
      </div>
    </div>
  `;
  return form;
}

function getFormValues(isEdit) {
  const name = document.getElementById('trapName').value.trim();
  const barcode = document.getElementById('trapBarcode').value.trim() || null;
  const trapTypeId = document.getElementById('trapType').value || null;
  const monitoringPointId = document.getElementById('trapMp').value || null;
  const lat = document.getElementById('trapLat').value;
  const lng = document.getElementById('trapLng').value;
  const notes = document.getElementById('trapNotes').value.trim() || null;

  const data = {
    name,
    barcode,
    trapTypeId,
    monitoringPointId,
    latitude: lat ? parseFloat(lat) : null,
    longitude: lng ? parseFloat(lng) : null,
    notes,
  };

  if (isEdit) {
    data.isEnabled = document.getElementById('trapEnabled').value === 'true';
  }

  return data;
}

function showCreateTrapModal(listContainer) {
  const form = buildTrapForm(null);
  openModal({ title: 'Add Trap', subtitle: 'Register a new physical trap with optional barcode and GPS', content: form });

  document.getElementById('cancelTrap').addEventListener('click', closeModal);
  document.getElementById('saveTrap').addEventListener('click', async () => {
    const btn = document.getElementById('saveTrap');
    const data = getFormValues(false);
    if (!data.name) { showToast('Name is required', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await createTrap(data);
      closeModal();
      showToast('Trap created!', 'success');
      await renderTraps(listContainer);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '🪤 Create Trap';
    }
  });
}

function showEditTrapModal(trap, tableEl) {
  const form = buildTrapForm(trap);
  openModal({ title: 'Edit Trap', subtitle: trap.name, content: form });

  document.getElementById('cancelTrap').addEventListener('click', closeModal);
  document.getElementById('saveTrap').addEventListener('click', async () => {
    const btn = document.getElementById('saveTrap');
    const data = getFormValues(true);
    if (!data.name) { showToast('Name is required', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await updateTrap(trap.id, data);
      closeModal();
      showToast('Trap updated!', 'success');
      await reloadTraps(tableEl);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '🪤 Update Trap';
    }
  });
}
