import { getTraps, getTrapsPaged, createTrap, updateTrap, toggleTrap, deleteTrap } from '../api/traps.js';
import { getTrapTypes } from '../api/trap-types.js';
import { getFarms } from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDateTime } from '../utils/helpers.js';

let cachedTrapTypes = [];
let cachedTraps = [];        // used only for the map view (full unfiltered list)
let leafletMap = null;

const listState = {
  search:       '',
  sortBy:       'name',
  sortDesc:     false,
  filterType:   '',
  page:         1,
  pageSize:     25,
  activeFilter: 'all',
  // server-side result metadata
  totalCount:   0,
  totalPages:   1,
};
let mapMarkers = {};    // trapId → L.marker
let selectedTrapId = null;
let currentContainer = null;

export async function renderTraps(container) {
  currentContainer = container;

  // Reset list state on each visit
  listState.search      = '';
  listState.sortBy      = 'name';
  listState.sortDesc    = false;
  listState.filterType  = '';
  listState.page        = 1;
  listState.pageSize    = 20;
  listState.activeFilter = 'all';

  const prevCssText = container.style.cssText;
  container._cleanup = () => { container.style.cssText = prevCssText; };
  container.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;height:100%;';

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;flex-shrink:0;">
      <div>
        <div class="page-heading">Traps</div>
        <div class="page-desc">Manage physical traps, barcodes and locations</div>
      </div>
      <button class="btn-primary" id="addTrapBtn">＋ Add Trap</button>
    </div>
    <div class="tab-bar" id="trapTabs" style="margin-bottom:20px;flex-shrink:0;"></div>
    <div id="trapMapWrap" style="margin-bottom:20px;border-radius:12px;overflow:hidden;border:1px solid var(--border);height:380px;display:none;position:relative;flex-shrink:0;"></div>
    <div class="card" id="trapTable" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;"><div class="card-p"><div class="skeleton skeleton-card" style="height:300px;"></div></div></div>
  `;

  document.getElementById('addTrapBtn').addEventListener('click', () => showCreateTrapModal(container));

  try {
    const [trapsRes, typesRes] = await Promise.all([
      getTraps(),
      getTrapTypes(),
    ]);

    cachedTraps = trapsRes.data || [];
    cachedTrapTypes = typesRes.data || [];

    renderTabs(cachedTraps);
    await renderTable('all');
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
        if (leafletMap) setTimeout(() => leafletMap.invalidateSize(), 50);
      } else {
        mapWrap.style.display = 'none';
        renderTable(filter);
      }
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

  // Right-click on map to quick-add a trap at that location
  leafletMap.on('contextmenu', (e) => {
    const latitude = Number(e.latlng.lat.toFixed(6));
    const longitude = Number(e.latlng.lng.toFixed(6));
    if (!confirm(`Add a trap at this location?\n\nLat: ${latitude}\nLng: ${longitude}`)) return;
    showCreateTrapModal(currentContainer, { latitude, longitude });
  });

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

    marker.on('click', () => {
      selectTrap(t.id);
      leafletMap.flyTo(marker.getLatLng(), 17, { animate: true, duration: 1 });
    });

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

async function renderTable(filter) {
  if (filter !== undefined) {
    listState.activeFilter = filter;
    listState.page = 1;
  }

  const el = document.getElementById('trapTable');

  // Derive enabled param from active tab
  const enabledParam = listState.activeFilter === 'enabled'  ? true
                     : listState.activeFilter === 'disabled' ? false
                     : undefined;

  // Show skeleton while fetching
  el.innerHTML = `<div class="card-p"><div class="skeleton skeleton-card" style="height:200px;"></div></div>`;

  let pagedResult;
  try {
    const res = await getTrapsPaged({
      page:         listState.page,
      pageSize:     listState.pageSize,
      search:       listState.search,
      trapTypeName: listState.filterType,
      enabled:      enabledParam,
      sortBy:       listState.sortBy,
      sortDesc:     listState.sortDesc,
    });
    pagedResult = res.data;
  } catch (err) {
    el.innerHTML = `<div class="card-p empty-state"><div class="empty-icon">⚠</div><h3>Error</h3><p>${escapeHtml(err.message)}</p></div>`;
    showToast('Failed to load traps: ' + err.message, 'error');
    return;
  }

  const { items, totalCount, page, pageSize, totalPages } = pagedResult;
  listState.totalCount = totalCount;
  listState.totalPages = totalPages;

  // Sort header helper
  function thBtn(label, key) {
    const active = listState.sortBy === key;
    const arrow  = active ? (listState.sortDesc ? ' ▼' : ' ▲') : '';
    return `<th style="cursor:pointer;user-select:none;white-space:nowrap;" data-sort="${key}">${label}${arrow}</th>`;
  }

  // Rows
  let rows = '';
  if (items.length === 0) {
    rows = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-dim);font-size:0.85rem;">${totalCount === 0 && !listState.search && !listState.filterType ? 'No traps yet. Add one to get started.' : 'No traps match your search.'}</td></tr>`;
  } else {
    for (const t of items) {
      const statusTag = t.isEnabled ? tag('Enabled', 'green') : tag('Disabled', 'gray');
      const coords = (t.latitude && t.longitude)
        ? `${Number(t.latitude).toFixed(4)}, ${Number(t.longitude).toFixed(4)}`
        : '—';
      const farmName  = t.farmName  ? escapeHtml(t.farmName)  : '<span style="color:var(--text-dim);">—</span>';
      const fieldName = t.fieldName ? escapeHtml(t.fieldName) : '<span style="color:var(--text-dim);">—</span>';
      rows += `
        <tr data-trap-id="${t.id}" style="cursor:pointer;">
          <td>
            <div style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;font-weight:500;color:var(--text);">${escapeHtml(t.name)}</div>
            ${t.barcode ? `<div style="font-size:0.7rem;color:var(--text-dim);">🏷 ${escapeHtml(t.barcode)}</div>` : ''}
          </td>
          <td style="font-size:0.8rem;color:var(--text-mid);">${farmName}</td>
          <td style="font-size:0.8rem;color:var(--text-mid);">${fieldName}</td>
          <td style="font-size:0.8rem;color:var(--text-mid);">${escapeHtml(t.trapTypeName || '—')}</td>
          <td style="font-size:0.78rem;color:var(--text-dim);font-family:'JetBrains Mono',monospace;">${coords}</td>
          <td>${statusTag}</td>
          <td style="width:1%;white-space:nowrap;">
            <div style="display:flex;gap:6px;">
              <button class="btn-icon" data-edit="${t.id}" title="Edit">✏️</button>
              <button class="btn-icon" data-toggle="${t.id}" title="${t.isEnabled ? 'Disable' : 'Enable'}">${t.isEnabled ? '⏸' : '▶️'}</button>
              <button class="btn-icon" data-del="${t.id}" title="Delete" style="color:var(--red);">🗑</button>
            </div>
          </td>
        </tr>`;
    }
  }

  // Pagination bar — same style as fields screen
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalCount);

  el.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border);flex-shrink:0;">
      <input type="text" id="trapSearch" class="input-field" placeholder="Search name, barcode, farm…"
        style="margin:0;flex:1;min-width:160px;max-width:280px;padding:6px 10px;font-size:0.8rem;" value="${escapeHtml(listState.search)}"/>
      <select id="trapTypeFilter" class="input-field" style="margin:0;padding:6px 10px;font-size:0.8rem;width:auto;">
        <option value="">All types</option>
        ${cachedTrapTypes.map(tt => `<option value="${escapeHtml(tt.name)}" ${listState.filterType === tt.name ? 'selected' : ''}>${escapeHtml(tt.name)}</option>`).join('')}
      </select>
    </div>
    <div style="overflow-x:auto;overflow-y:auto;flex:1;min-height:0;">
      <table class="data-table">
        <thead style="position:sticky;top:0;z-index:1;background:var(--surface);">
          <tr>
          ${thBtn('Trap',   'name')}
          ${thBtn('Farm',   'farm')}
          ${thBtn('Field',  'field')}
          ${thBtn('Type',   'type')}
          <th>Location</th>
          ${thBtn('Status', 'status')}
          <th style="width:1%;white-space:nowrap;"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div id="trapsPagination" style="flex-shrink:0;"></div>
  `;

  // Render pagination bar
  const pagEl = document.getElementById('trapsPagination');
  pagEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;
                padding:10px 14px;border-top:1px solid var(--border);font-size:0.8rem;color:var(--text-dim);">
      <span>${start}–${end} of ${totalCount} trap${totalCount !== 1 ? 's' : ''}</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <button class="btn-outline pg-btn" data-action="prev" style="padding:4px 10px;" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>
        <span style="font-size:0.78rem;">Page
          <input type="number" class="input-field pg-input" value="${page}" min="1" max="${totalPages}"
            style="width:52px;padding:3px 6px;font-size:0.78rem;margin:0 4px;display:inline-block;" />
          of ${totalPages}
        </span>
        <button class="btn-outline pg-btn" data-action="next" style="padding:4px 10px;" ${page >= totalPages ? 'disabled' : ''}>Next ›</button>
        <select class="input-field pg-size" style="margin:0;padding:4px 8px;font-size:0.78rem;width:auto;">
          ${[10, 25, 50, 100].map(n => `<option value="${n}"${n === pageSize ? ' selected' : ''}>${n} / page</option>`).join('')}
        </select>
      </div>
    </div>`;

  pagEl.querySelectorAll('.pg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.action === 'prev' && listState.page > 1)            { listState.page--; renderTable(); }
      if (btn.dataset.action === 'next' && listState.page < totalPages)   { listState.page++; renderTable(); }
    });
  });
  pagEl.querySelector('.pg-input').addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 1 && v <= totalPages) { listState.page = v; renderTable(); }
  });
  pagEl.querySelector('.pg-size').addEventListener('change', e => {
    listState.pageSize = parseInt(e.target.value, 10);
    listState.page = 1;
    renderTable();
  });

  // Search
  let _debounce;
  el.querySelector('#trapSearch').addEventListener('input', e => {
    clearTimeout(_debounce);
    _debounce = setTimeout(() => { listState.search = e.target.value.trim(); listState.page = 1; renderTable(); }, 300);
  });

  // Type filter
  el.querySelector('#trapTypeFilter').addEventListener('change', e => {
    listState.filterType = e.target.value;
    listState.page = 1;
    renderTable();
  });

  // Sort headers
  el.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (listState.sortBy === key) listState.sortDesc = !listState.sortDesc;
      else { listState.sortBy = key; listState.sortDesc = false; }
      listState.page = 1;
      renderTable();
    });
  });

  // Action buttons — find item from page result
  el.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await toggleTrap(btn.dataset.toggle);
        showToast('Trap status updated', 'success');
        await reloadTraps();
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
        await reloadTraps();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  el.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const trap = items.find(t => t.id === btn.dataset.edit);
      if (trap) showEditTrapModal(trap, el);
    });
  });

  // Row click → highlight map pin
  el.querySelectorAll('tr[data-trap-id]').forEach(row => {
    row.addEventListener('click', () => {
      const trapId = row.dataset.trapId;
      const isMapTab = document.querySelector('.tab-btn[data-filter="map"]')?.classList.contains('active');
      selectTrap(trapId);
      if (isMapTab && leafletMap && mapMarkers[trapId]) {
        leafletMap.flyTo(mapMarkers[trapId].getLatLng(), 17, { animate: true, duration: 1 });
      }
    });
  });
}

async function reloadTraps() {
  const res = await getTraps();
  cachedTraps = res.data || [];
  renderTabs(cachedTraps);
  await renderTable();
  renderMap(cachedTraps);
}

function buildTrapForm(trap, freshTrapTypes, farms, allFields) {
  const typeOptions = `<option value="">None</option>` + freshTrapTypes.map(t => `<option value="${t.id}" ${trap && trap.trapTypeId === t.id ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('');

  // When editing, find which farm the current field belongs to
  const selectedFarmId = allFields.find(f => f.id === trap?.fieldId)?.farmId ?? '';

  const farmOptions = `<option value="">— Select Farm —</option>` +
    farms.map(f => `<option value="${f.id}" ${f.id === selectedFarmId ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('');

  const farmFields = selectedFarmId ? allFields.filter(f => f.farmId === selectedFarmId) : [];
  const fieldOptions = `<option value="">— Select Field —</option>` +
    farmFields.map(f => `<option value="${f.id}" ${f.id === trap?.fieldId ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('');

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex:1;min-height:0;overflow:hidden;width:100%;';
  wrapper.innerHTML = `
    <!-- LEFT: form -->
    <div class="modal-map-form">
      <div>
        <label class="input-label">Farm <span style="color:var(--red);">*</span></label>
        <select class="input-field" id="trapFarm">${farmOptions}</select>
      </div>
      <div>
        <label class="input-label">Field <span style="color:var(--red);">*</span></label>
        <select class="input-field" id="trapField">${fieldOptions}</select>
      </div>
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
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label class="input-label">Latitude</label>
          <input class="input-field" type="number" step="any" id="trapLat" value="${trap?.latitude || ''}" placeholder="Click map to set">
        </div>
        <div>
          <label class="input-label">Longitude</label>
          <input class="input-field" type="number" step="any" id="trapLng" value="${trap?.longitude || ''}" placeholder="Click map to set">
        </div>
      </div>
      ${trap?.id ? `<div>
        <label class="input-label">Status</label>
        <select class="input-field" id="trapEnabled">
          <option value="true" ${trap.isEnabled ? 'selected' : ''}>Enabled</option>
          <option value="false" ${!trap.isEnabled ? 'selected' : ''}>Disabled</option>
        </select>
      </div>` : ''}
      <div>
        <label class="input-label">Notes</label>
        <textarea class="input-field" id="trapNotes" rows="2" style="resize:none;" placeholder="Optional notes">${escapeHtml(trap?.notes || '')}</textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:auto;padding-top:8px;">
        <button class="btn-outline" style="flex:1;" id="cancelTrap">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveTrap">💾 ${trap ? 'Update' : 'Create'} Trap</button>
      </div>
    </div>

    <!-- RIGHT: map -->
    <div class="modal-map-canvas" style="position:relative;display:flex;flex-direction:column;overflow:hidden;">
      <div id="trapModalMap" style="width:100%;flex:1;min-height:300px;"></div>
      <div id="trapMapHint" style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);
           background:rgba(0,0,0,0.55);color:#fff;font-size:0.72rem;padding:5px 12px;border-radius:20px;
           pointer-events:none;white-space:nowrap;">
        Select a farm &amp; field to see its boundary
      </div>
    </div>
  `;

  // Map state
  let dialogMap = null;
  let boundaryLayer = null;
  let trapMarker = null;

  function getOrInitMap() {
    if (dialogMap) return dialogMap;
    const mapEl = document.getElementById('trapModalMap');
    if (!mapEl || !window.L) return null;
    dialogMap = L.map('trapModalMap', { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(dialogMap);

    // Click sets trap location
    dialogMap.on('click', (e) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      const latEl = document.getElementById('trapLat');
      const lngEl = document.getElementById('trapLng');
      if (latEl) latEl.value = lat;
      if (lngEl) lngEl.value = lng;
      placeTrapMarker(lat, lng);
    });

    return dialogMap;
  }

  function placeTrapMarker(lat, lng) {
    const map = getOrInitMap();
    if (!map) return;
    if (trapMarker) {
      trapMarker.setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#3b82f6;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
                 <span style="transform:rotate(45deg);font-size:12px;">📍</span>
               </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });
      trapMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      trapMarker.on('dragend', () => {
        const p = trapMarker.getLatLng();
        const rLat = Number(p.lat.toFixed(6));
        const rLng = Number(p.lng.toFixed(6));
        const latEl = document.getElementById('trapLat');
        const lngEl = document.getElementById('trapLng');
        if (latEl) latEl.value = rLat;
        if (lngEl) lngEl.value = rLng;
      });
    }
  }

  function removeTrapMarker() {
    if (trapMarker && dialogMap) { dialogMap.removeLayer(trapMarker); trapMarker = null; }
  }

  function showFieldBoundary(field) {
    const map = getOrInitMap();
    if (!map) return;
    if (boundaryLayer) { map.removeLayer(boundaryLayer); boundaryLayer = null; }

    const hint = document.getElementById('trapMapHint');

    if (!field?.geoBoundary) {
      // No boundary — try trap coords first, then field coords
      const latEl = document.getElementById('trapLat');
      const lngEl = document.getElementById('trapLng');
      const trapLat = parseFloat(latEl?.value);
      const trapLng = parseFloat(lngEl?.value);
      if (!isNaN(trapLat) && !isNaN(trapLng)) {
        map.setView([trapLat, trapLng], 15);
      } else if (field?.latitude && field?.longitude) {
        map.setView([field.latitude, field.longitude], 15);
      } else {
        map.setView([0, 0], 2);
      }
      if (hint) hint.textContent = 'Click the map to set the trap location';
      setTimeout(() => map.invalidateSize(), 50);
      return;
    }

    try {
      const geoData = typeof field.geoBoundary === 'string' ? JSON.parse(field.geoBoundary) : field.geoBoundary;
      boundaryLayer = L.geoJSON(geoData, {
        style: { color: field.boundaryColor || '#f0b840', weight: 2, fillOpacity: 0.15, interactive: false },
      }).addTo(map);
      map.fitBounds(boundaryLayer.getBounds().pad(0.15));
    } catch {
      if (hint) hint.textContent = 'Click the map to set the trap location';
    }

    if (hint) hint.textContent = 'Click the map to set the trap location';
    setTimeout(() => map.invalidateSize(), 50);
  }

  // Wire cascading farm → field → boundary
  setTimeout(() => {
    const farmSel  = document.getElementById('trapFarm');
    const fieldSel = document.getElementById('trapField');
    if (!farmSel || !fieldSel) return;

    function onFieldChange() {
      const fieldId = fieldSel.value;
      const field   = allFields.find(f => f.id === fieldId);
      showFieldBoundary(field || null);
    }

    farmSel.addEventListener('change', () => {
      const fid = farmSel.value;
      const filtered = fid ? allFields.filter(f => f.farmId === fid) : [];
      fieldSel.innerHTML = `<option value="">— Select Field —</option>` +
        filtered.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
      onFieldChange();
    });

    fieldSel.addEventListener('change', onFieldChange);

    // Wire lat/lng inputs → sync marker
    const latEl = document.getElementById('trapLat');
    const lngEl = document.getElementById('trapLng');
    function syncMarkerFromInputs() {
      const lat = parseFloat(latEl?.value);
      const lng = parseFloat(lngEl?.value);
      if (isNaN(lat) || isNaN(lng) || latEl?.value === '' || lngEl?.value === '') {
        removeTrapMarker();
        return;
      }
      placeTrapMarker(lat, lng);
    }
    latEl?.addEventListener('input', syncMarkerFromInputs);
    lngEl?.addEventListener('input', syncMarkerFromInputs);

    // If editing and already has a field selected, show its boundary + existing marker
    if (fieldSel.value) {
      onFieldChange();
    } else {
      // No field selected — center on existing trap coords if available
      setTimeout(() => {
        const map = getOrInitMap();
        if (!map) return;
        const latEl = document.getElementById('trapLat');
        const lngEl = document.getElementById('trapLng');
        const lat = parseFloat(latEl?.value);
        const lng = parseFloat(lngEl?.value);
        map.setView(!isNaN(lat) && !isNaN(lng) ? [lat, lng] : [0, 0], !isNaN(lat) ? 15 : 2);
        map.invalidateSize();
      }, 80);
    }

    // If editing and has existing coords, place marker
    const initLat = parseFloat(latEl?.value);
    const initLng = parseFloat(lngEl?.value);
    if (!isNaN(initLat) && !isNaN(initLng)) {
      setTimeout(() => placeTrapMarker(initLat, initLng), 150);
    }
  }, 0);

  return wrapper;
}

function getFormValues(isEdit) {
  const name = document.getElementById('trapName').value.trim();
  const barcode = document.getElementById('trapBarcode').value.trim() || null;
  const trapTypeId = document.getElementById('trapType').value || null;
  const fieldId = document.getElementById('trapField').value || null;
  const lat = document.getElementById('trapLat').value;
  const lng = document.getElementById('trapLng').value;
  const notes = document.getElementById('trapNotes').value.trim() || null;

  const data = {
    name,
    barcode,
    trapTypeId,
    fieldId,
    latitude: lat ? parseFloat(lat) : null,
    longitude: lng ? parseFloat(lng) : null,
    notes,
  };

  if (isEdit) {
    data.isEnabled = document.getElementById('trapEnabled').value === 'true';
  }

  return data;
}

async function showCreateTrapModal(listContainer, presetCoords = null) {
  const [freshTrapTypes, farmsRes, fieldsRes] = await Promise.all([
    getTrapTypes().then(r => r.data || []).catch(() => cachedTrapTypes),
    getFarms().then(r => r.data || []).catch(() => []),
    getFields().then(r => r.data || []).catch(() => []),
  ]);
  const trapPreset = presetCoords ? { latitude: presetCoords.latitude, longitude: presetCoords.longitude } : null;
  const form = buildTrapForm(trapPreset, freshTrapTypes, farmsRes, fieldsRes);
  const subtitle = presetCoords
    ? `Register a new trap at ${presetCoords.latitude}, ${presetCoords.longitude}`
    : 'Register a new physical trap with optional barcode and GPS';
  openModal({ title: 'Add Trap', subtitle, content: form, extraClass: 'modal-map' });

  document.getElementById('cancelTrap').addEventListener('click', closeModal);
  document.getElementById('saveTrap').addEventListener('click', async () => {
    const btn = document.getElementById('saveTrap');
    const data = getFormValues(false);
    if (!data.name) { showToast('Name is required', 'error'); return; }
    if (!data.fieldId) { showToast('Field is required', 'error'); return; }

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
      btn.textContent = '💾 Create Trap';
    }
  });
}

async function showEditTrapModal(trap, tableEl) {
  const [freshTrapTypes, farmsRes, fieldsRes] = await Promise.all([
    getTrapTypes().then(r => r.data || []).catch(() => cachedTrapTypes),
    getFarms().then(r => r.data || []).catch(() => []),
    getFields().then(r => r.data || []).catch(() => []),
  ]);
  const form = buildTrapForm(trap, freshTrapTypes, farmsRes, fieldsRes);
  openModal({ title: 'Edit Trap', subtitle: trap.name, content: form, extraClass: 'modal-map' });

  document.getElementById('cancelTrap').addEventListener('click', closeModal);
  document.getElementById('saveTrap').addEventListener('click', async () => {
    const btn = document.getElementById('saveTrap');
    const data = getFormValues(true);
    if (!data.name) { showToast('Name is required', 'error'); return; }
    if (!data.fieldId) { showToast('Field is required', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await updateTrap(trap.id, data);
      closeModal();
      showToast('Trap updated!', 'success');
      await reloadTraps();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '💾 Update Trap';
    }
  });
}
