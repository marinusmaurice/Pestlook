import { escapeHtml } from '../../utils/helpers.js';
import { C, kpiGrid, kpiCard, emptyState } from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   IM2 — GPS Hotspot Map
   data = {
     summary: { totalPoints, breaches, confirmedPresent, confirmedAbsent },
     points: [{
       pestName, fieldName, farmName, scoutName,
       count, thresholdCount, isPresent,
       observedAt, lat, lng
     }]
   }
   ctx = { farms, fields, traps }
───────────────────────────────────────────────────────────────────────────── */

/* ── Leaflet loader ──────────────────────────────────────────────────────── */
let _leafletLoading = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (_leafletLoading) return _leafletLoading;
  _leafletLoading = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const link = Object.assign(document.createElement('link'), {
        id: 'leaflet-css', rel: 'stylesheet',
        href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      });
      document.head.appendChild(link);
    }
    const s = Object.assign(document.createElement('script'), {
      src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    });
    s.onload  = () => { _leafletLoading = null; resolve(); };
    s.onerror = () => { _leafletLoading = null; reject(new Error('Leaflet failed to load')); };
    document.head.appendChild(s);
  });
  return _leafletLoading;
}

/* ── Colour helpers ──────────────────────────────────────────────────────── */
function dotColor(pt, mode) {
  if (mode === 'presence') {
    if (pt.isPresent === true)  return '#ef4444';
    if (pt.isPresent === false) return '#94a3b8';
    return '#f59e0b';
  }
  if (pt.count == null) return '#94a3b8';
  if (pt.thresholdCount != null && pt.count > pt.thresholdCount) return '#ef4444';
  if (pt.thresholdCount != null && pt.count >= Math.ceil(pt.thresholdCount * 0.8)) return '#f59e0b';
  return '#60a5fa';
}

function dotStatus(pt, mode) {
  if (mode === 'presence') {
    if (pt.isPresent === true)  return '● Present';
    if (pt.isPresent === false) return '○ Absent';
    return '? No presence data';
  }
  if (pt.count == null) return '— No count data';
  if (pt.thresholdCount != null && pt.count > pt.thresholdCount) return `⚠ Breach (${pt.count} > ${pt.thresholdCount})`;
  if (pt.thresholdCount != null && pt.count >= Math.ceil(pt.thresholdCount * 0.8)) return `~ Approaching (${pt.count} / ${pt.thresholdCount})`;
  return pt.thresholdCount != null ? `✓ Within threshold (${pt.count} / ${pt.thresholdCount})` : `Count: ${pt.count}`;
}

/* ── CSV export ──────────────────────────────────────────────────────────── */
function exportCsv(points) {
  const headers = ['Date', 'Farm', 'Field', 'Pest', 'Scout', 'Count', 'Threshold', 'Breached', 'IsPresent', 'Lat', 'Lng'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [headers.join(',')];
  for (const p of points) {
    const breached = p.thresholdCount != null ? (p.count > p.thresholdCount ? 'Yes' : 'No') : '';
    rows.push([
      p.observedAt ? new Date(p.observedAt).toISOString().slice(0, 10) : '',
      esc(p.farmName), esc(p.fieldName), esc(p.pestName), esc(p.scoutName),
      p.count ?? '', p.thresholdCount ?? '', breached,
      p.isPresent != null ? (p.isPresent ? 'Yes' : 'No') : '',
      p.lat ?? '', p.lng ?? '',
    ].join(','));
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), {
    href: url, download: `hotspot-map-${new Date().toLocaleDateString('en-CA')}.csv`,
  }).click();
  URL.revokeObjectURL(url);
}

/* ── Toggle button ───────────────────────────────────────────────────────── */
function mkToggle(label, active) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = 'padding:4px 12px;font-size:0.76rem;border-radius:8px;cursor:pointer;font-family:inherit;transition:background .15s,color .15s,border-color .15s;';
  _setToggle(btn, active);
  return btn;
}

function _setToggle(btn, active) {
  btn.dataset.active = active ? '1' : '0';
  btn.style.background   = active ? 'var(--green)' : 'var(--surface)';
  btn.style.color        = active ? '#fff'         : 'var(--text-dim)';
  btn.style.border       = active ? '1px solid var(--green)' : '1px solid var(--border)';
}

/* ── Legend HTML ─────────────────────────────────────────────────────────── */
function legendHtml(mode) {
  const dot = c => `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin-right:4px;"></span>`;
  if (mode === 'presence') return `
    <span>${dot('#ef4444')}Present</span>
    <span>${dot('#94a3b8')}Absent</span>
    <span>${dot('#f59e0b')}No data</span>`;
  return `
    <span>${dot('#60a5fa')}Within threshold</span>
    <span>${dot('#f59e0b')}Approaching</span>
    <span>${dot('#ef4444')}Breach</span>
    <span>${dot('#94a3b8')}No count</span>`;
}

/* ── Main renderer ───────────────────────────────────────────────────────── */
export async function renderHotspotMap(el, data, { farms = [], fields = [], traps = [] } = {}) {
  const summary = data.summary ?? {};
  const points  = data.points  ?? [];

  if (!points.length) {
    el.innerHTML = emptyState(
      '🗺',
      'No GPS-tagged observations',
      'Hotspot mapping requires observations with GPS coordinates. Scouts must enable GPS on the mobile app when recording observations.'
    );
    return;
  }

  /* ── Description ──────────────────────────────────────────────────────── */
  el.innerHTML = '<div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Plots every GPS-tagged observation as a dot on the map. Switch between <strong>Count mode</strong> — coloured by how the count compares to the action threshold — and <strong>Presence mode</strong> — coloured by whether the pest was confirmed present or absent. Use the layer toggles to overlay farm boundaries, field boundaries, and trap locations. Click any dot for full observation details. Export the visible data as CSV for offline analysis.</div>';

  /* ── KPI row ───────────────────────────────────────────────────────────── */
  el.innerHTML += kpiGrid([
    kpiCard('GPS Points', summary.totalPoints ?? points.length, 'observations mapped', C.blue,
      'Observations with GPS coordinates in the selected period.'),
    kpiCard('Threshold Breaches', summary.breaches ?? 0, 'above action threshold',
      (summary.breaches ?? 0) > 0 ? C.red : '',
      'Observations where pest count exceeded the configured action threshold.'),
    kpiCard('Confirmed Present', summary.confirmedPresent ?? 0, 'presence checks',
      (summary.confirmedPresent ?? 0) > 0 ? C.amber : '',
      'Presence-mode observations where the pest was confirmed present.'),
    kpiCard('Confirmed Absent', summary.confirmedAbsent ?? 0, 'presence checks', '',
      'Presence-mode observations where the pest was confirmed absent.'),
  ]);

  /* ── Controls bar ──────────────────────────────────────────────────────── */
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;';

  // Mode buttons (mutually exclusive)
  let mode = 'count';
  const btnCount    = mkToggle('📊 Count',    true);
  const btnPresence = mkToggle('👁 Presence', false);

  btnCount.addEventListener('click', () => {
    mode = 'count';
    _setToggle(btnCount, true); _setToggle(btnPresence, false);
    refreshDots(); legendEl.innerHTML = legendHtml(mode);
  });
  btnPresence.addEventListener('click', () => {
    mode = 'presence';
    _setToggle(btnPresence, true); _setToggle(btnCount, false);
    refreshDots(); legendEl.innerHTML = legendHtml(mode);
  });

  // Layer buttons
  const btnFarms  = mkToggle('⬡ Farms',  false);
  const btnFields = mkToggle('⬡ Fields', false);
  const btnTraps  = mkToggle('📍 Traps', false);

  let showFarms  = false;
  let showFields = false;
  let showTraps  = false;

  btnFarms.addEventListener('click', () => {
    showFarms = !showFarms;
    _setToggle(btnFarms, showFarms);
    refreshLayers();
  });
  btnFields.addEventListener('click', () => {
    showFields = !showFields;
    _setToggle(btnFields, showFields);
    refreshLayers();
  });
  btnTraps.addEventListener('click', () => {
    showTraps = !showTraps;
    _setToggle(btnTraps, showTraps);
    refreshLayers();
  });

  const sep = () => {
    const s = document.createElement('span');
    s.style.cssText = 'width:1px;height:20px;background:var(--border);flex-shrink:0;';
    return s;
  };

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn-outline';
  exportBtn.style.cssText = 'padding:4px 12px;font-size:0.76rem;margin-left:auto;';
  exportBtn.textContent = '⬇ Export CSV';
  exportBtn.addEventListener('click', () => exportCsv(points));

  bar.append(btnCount, btnPresence, sep(), btnFarms, btnFields, btnTraps, sep(), exportBtn);
  el.append(bar);

  /* ── Legend ────────────────────────────────────────────────────────────── */
  const legendEl = document.createElement('div');
  legendEl.style.cssText = 'display:flex;align-items:center;gap:14px;font-size:0.72rem;color:var(--text-dim);margin-bottom:10px;flex-wrap:wrap;';
  legendEl.innerHTML = legendHtml(mode);
  el.append(legendEl);

  /* ── Map card ──────────────────────────────────────────────────────────── */
  const card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'overflow:hidden;flex-shrink:0;';
  const mapEl = document.createElement('div');
  mapEl.style.cssText = 'height:520px;width:100%;';
  card.append(mapEl);
  el.append(card);

  /* ── Load Leaflet ──────────────────────────────────────────────────────── */
  try {
    await loadLeaflet();
  } catch {
    mapEl.style.cssText += 'display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:0.85rem;padding:40px;text-align:center;';
    mapEl.textContent = 'Could not load map library. Check your internet connection.';
    return;
  }

  const L = window.L;

  /* ── Init map ──────────────────────────────────────────────────────────── */
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  const map = L.map(mapEl, { preferCanvas: true }).setView([centerLat, centerLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  /* ── Layer groups ──────────────────────────────────────────────────────── */
  const dotsGroup   = L.layerGroup().addTo(map);
  const farmsGroup  = L.layerGroup();
  const fieldsGroup = L.layerGroup();
  const trapsGroup  = L.layerGroup();

  /* ── Draw observation dots ─────────────────────────────────────────────── */
  function refreshDots() {
    dotsGroup.clearLayers();
    for (const pt of points) {
      const color  = dotColor(pt, mode);
      const status = dotStatus(pt, mode);
      const date   = pt.observedAt
        ? new Date(pt.observedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';

      const marker = L.circleMarker([pt.lat, pt.lng], {
        radius: 7, color, weight: 1.5, fillColor: color, fillOpacity: 0.8,
      });

      marker.bindPopup(`
        <div style="min-width:190px;font-family:inherit;font-size:0.82rem;line-height:1.5;">
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:5px;">${escapeHtml(pt.pestName ?? '—')}</div>
          <div style="color:#64748b;margin-bottom:4px;">📍 ${escapeHtml(pt.fieldName ?? '—')} · ${escapeHtml(pt.farmName ?? '—')}</div>
          <div style="margin-bottom:2px;">${escapeHtml(status)}</div>
          <div style="color:#64748b;margin-top:4px;">👤 ${escapeHtml(pt.scoutName ?? '—')} · ${date}</div>
          <div style="color:#94a3b8;font-size:0.72rem;margin-top:2px;">${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}</div>
        </div>`);

      dotsGroup.addLayer(marker);
    }
  }

  /* ── Draw boundary / trap layers ───────────────────────────────────────── */
  function refreshLayers() {
    // Farm boundaries
    farmsGroup.clearLayers();
    if (showFarms) {
      for (const f of farms) {
        if (!f.boundaryGeoJson) continue;
        try {
          const geo = typeof f.boundaryGeoJson === 'string' ? JSON.parse(f.boundaryGeoJson) : f.boundaryGeoJson;
          L.geoJSON(geo, {
            style: { color: f.boundaryColor || '#3aad5a', weight: 2, fillOpacity: 0.06 },
          }).bindTooltip(escapeHtml(f.name), { permanent: false, className: 'leaflet-label' }).addTo(farmsGroup);
        } catch { /* skip bad GeoJSON */ }
      }
      if (!map.hasLayer(farmsGroup)) farmsGroup.addTo(map);
    } else {
      map.removeLayer(farmsGroup);
    }

    // Field boundaries
    fieldsGroup.clearLayers();
    if (showFields) {
      for (const f of fields) {
        if (!f.geoBoundary) continue;
        try {
          const geo = typeof f.geoBoundary === 'string' ? JSON.parse(f.geoBoundary) : f.geoBoundary;
          L.geoJSON(geo, {
            style: { color: f.boundaryColor || '#f0b840', weight: 1.8, fillOpacity: 0.1 },
          }).bindTooltip(escapeHtml(f.name), { permanent: false, className: 'leaflet-label' }).addTo(fieldsGroup);
        } catch { /* skip bad GeoJSON */ }
      }
      if (!map.hasLayer(fieldsGroup)) fieldsGroup.addTo(map);
    } else {
      map.removeLayer(fieldsGroup);
    }

    // Trap markers
    trapsGroup.clearLayers();
    if (showTraps) {
      for (const t of traps) {
        if (!t.latitude || !t.longitude) continue;
        const icon = L.divIcon({
          html: `<div style="background:#3b82f6;border:2px solid #fff;border-radius:50%;width:10px;height:10px;box-shadow:0 1px 3px rgba(0,0,0,.35);"></div>`,
          className: '', iconSize: [10, 10], iconAnchor: [5, 5],
        });
        L.marker([t.latitude, t.longitude], { icon })
          .bindPopup(`
            <div style="font-size:0.82rem;font-family:inherit;">
              <strong>${escapeHtml(t.name ?? '—')}</strong><br/>
              <span style="color:#64748b;">${escapeHtml(t.trapTypeName ?? t.trapType ?? '')}</span>
              ${t.fieldName ? `<br/><span style="color:#64748b;">📍 ${escapeHtml(t.fieldName)}</span>` : ''}
            </div>`)
          .addTo(trapsGroup);
      }
      if (!map.hasLayer(trapsGroup)) trapsGroup.addTo(map);
    } else {
      map.removeLayer(trapsGroup);
    }
  }

  refreshDots();
  try {
    const layers = dotsGroup.getLayers();
    if (layers.length) map.fitBounds(layers.map(l => l.getLatLng()), { padding: [40, 40], maxZoom: 14 });
  } catch { /* ignore */ }
  refreshLayers();
}
