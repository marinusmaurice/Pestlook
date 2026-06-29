import { escapeHtml } from '../../utils/helpers.js';
import { C, kpiGrid, kpiCard, emptyState } from '../reports/utils.js';
import { drawBoundaries } from './map-boundaries.js';

/* ── Leaflet loader (CDN with fallback) ──────────────────────────────────── */
let leafletLoading = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletLoading) return leafletLoading;

  leafletLoading = new Promise((resolve, reject) => {
    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload  = () => { leafletLoading = null; resolve(); };
    script.onerror = () => { leafletLoading = null; reject(new Error('Leaflet failed to load')); };
    document.head.appendChild(script);
  });
  return leafletLoading;
}

/* ── Bearing → compass arrow (Unicode) ──────────────────────────────────── */
function bearingArrow(deg) {
  const arrows = ['↑','↗','→','↘','↓','↙','←','↖'];
  return arrows[Math.round(deg / 45) % 8];
}

/* ── Colour for spread velocity ─────────────────────────────────────────── */
function velocityColor(v) {
  if (v <= 0)   return C.green;
  if (v < 0.5)  return C.amber;
  return C.red;
}

/* ─────────────────────────────────────────────────────────────────────────
   Main renderer
   data = { pests, fields, weeklySnapshots, spreadVectors }
   filters = current filter state (from, to, farmId, fieldId, pestId)
   onPestChange = callback(pestId) → re-fetch + re-render
───────────────────────────────────────────────────────────────────────── */
export async function renderSpreadDirection(el, data, onPestChange, lookups = {}) {
  const pests          = data.pests          ?? [];
  const weeklySnaps    = data.weeklySnapshots ?? [];
  const spreadVectors  = data.spreadVectors   ?? [];
  const allFields      = data.fields          ?? [];

  // ── No-data guard ────────────────────────────────────────────────────────
  if (weeklySnaps.length === 0) {
    el.innerHTML = emptyState('🧭',
      'No GPS-tagged observations found',
      'Pest spread mapping requires observations with GPS coordinates recorded by scouts in the field, or a farm with latitude / longitude set. Try widening the date range.');
    return;
  }

  // ── KPI cards ────────────────────────────────────────────────────────────
  const pestsWithVectors  = spreadVectors.length;
  const totalNeighbourRisk = spreadVectors.reduce((s, v) => s + (v.neighbourRisk?.length ?? 0), 0);
  const fastestSpreader   = spreadVectors.length
    ? spreadVectors.reduce((best, v) => v.velocityFieldsPerWeek > best.velocityFieldsPerWeek ? v : best, spreadVectors[0])
    : null;

  // ── Build HTML shell ─────────────────────────────────────────────────────
  const pestOptions = pests.map(p =>
    `<option value="${escapeHtml(p.pestId)}">${escapeHtml(p.pestName)}</option>`).join('');

  el.innerHTML = `
    <div style="font-size:0.75rem;color:var(--text-dim);line-height:1.6;margin-bottom:16px;">
      Groups GPS-tagged scouting observations into <strong>weekly centroids</strong> (average lat/lng of all observations that week) per pest.
      The <strong>bearing</strong> is the compass direction from the earliest to the latest centroid — showing the net direction the pest population has moved.
      <strong>Velocity</strong> is the OLS slope of cumulative distinct fields over time — how many new fields are being reached per week on average.
      A velocity of 0 means the pest is contained to the same fields; a rising value signals active geographic expansion.
      Fields within 5 km of the latest centroid that haven't recorded the pest are flagged as <strong>neighbour risk</strong>.
    </div>
    ${kpiGrid([
      kpiCard('Pests Tracked', pestsWithVectors, 'species with spread data', '',
        'Number of pest species for which at least two weekly observation centroids exist, making it possible to compute a direction and velocity of spread.'),
      kpiCard('Fields Affected', allFields.length, 'distinct fields with observations', '',
        'Total number of distinct fields that recorded at least one observation for any tracked pest in the selected period.'),
      kpiCard('Neighbour Risk', totalNeighbourRisk,
        'fields near active spread fronts', totalNeighbourRisk > 0 ? C.amber : '',
        'Unaffected fields that lie directly in the projected spread path of a tracked pest. These fields are at elevated risk and should be prioritised for upcoming scouting visits.'),
      fastestSpreader
        ? kpiCard('Fastest Spreading',
            `${escapeHtml(fastestSpreader.pestName)} ${bearingArrow(fastestSpreader.bearingDeg)}`,
            `${fastestSpreader.velocityFieldsPerWeek} new fields/week · moving ${escapeHtml(fastestSpreader.bearingLabel)}`,
            C.red,
            'The pest species spreading into new fields at the highest rate. Velocity is the OLS slope of cumulative distinct fields per week — a value of 0.5 means roughly one new field every two weeks.')
        : kpiCard('Fastest Spreading', '—', 'insufficient data', '',
            'Requires at least two weeks of GPS-tagged observations to calculate a spread rate.'),
    ])}

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
      <span style="font-size:0.75rem;color:var(--text-dim);">
        Week ${weeklySnaps.length > 0 ? weeklySnaps[0].weekStart : '—'}
        → ${weeklySnaps.length > 0 ? weeklySnaps.at(-1).weekStart : '—'}
        (${weeklySnaps.length} weeks)
      </span>
      <button id="spread-play-btn" style="padding:5px 14px;border-radius:6px;border:1px solid var(--border);background:var(--surface);font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:5px;">
        ▶ Animate
      </button>
    </div>

    <!-- Legend -->
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;font-size:0.75rem;color:var(--text-dim);align-items:center;">
      <span style="font-weight:600;">Map legend:</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b7db8;margin-right:4px;vertical-align:middle;"></span> Field (static)</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ccc;border:1px solid #aaa;margin-right:4px;vertical-align:middle;"></span> No activity this week</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b7db8;margin-right:4px;vertical-align:middle;opacity:0.75;"></span> Active (within threshold)</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#c75146;margin-right:4px;vertical-align:middle;"></span> Active (above threshold)</span>
      <span style="border-left:1px solid var(--border);padding-left:12px;"><span style="display:inline-block;width:18px;height:0;border-top:3px dashed #4ade80;margin-right:4px;vertical-align:middle;"></span> Contained</span>
      <span><span style="display:inline-block;width:18px;height:0;border-top:3px dashed #f59e0b;margin-right:4px;vertical-align:middle;"></span> Slow spread</span>
      <span><span style="display:inline-block;width:18px;height:0;border-top:3px dashed #f87171;margin-right:4px;vertical-align:middle;"></span> Fast spread</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4ade80;margin-right:4px;vertical-align:middle;"></span> Spread front (tip of vector)</span>
    </div>

    <div class="two-col" style="gap:16px;margin-bottom:16px;">
      <!-- Map -->
      <div class="card card-static" style="padding:0;overflow:hidden;border-radius:10px;min-height:420px;position:relative;">
        <div id="spread-map" style="width:100%;height:420px;"></div>
        <div class="week-label" style="position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1000;
          background:rgba(0,0,0,0.7);color:#fff;padding:4px 14px;border-radius:6px;font-size:0.82rem;font-weight:600;
          pointer-events:none;display:none;"></div>
      </div>

      <!-- Vector table -->
      <div class="card card-p" style="overflow:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <span style="font-weight:600;font-size:0.9rem;">Spread Summary by Pest</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <button id="vec-prev" style="padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.8rem;">‹</button>
            <span id="vec-counter" style="font-size:0.78rem;color:var(--text-dim);"></span>
            <button id="vec-next" style="padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.8rem;">›</button>
          </div>
        </div>
        <div id="spread-vector-list" style="display:flex;flex-direction:column;gap:10px;"></div>
      </div>
    </div>

    <!-- Neighbour Risk section -->
    <div class="card card-p" style="margin-bottom:16px;" id="spread-neighbour-panel">
      <div style="font-weight:600;font-size:0.9rem;margin-bottom:10px;">⚠ Neighbour Risk — Fields Near the Spread Front</div>
      <div id="spread-neighbour-list"></div>
    </div>

    <!-- Timeline -->
    <div class="card card-p" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <span style="font-weight:600;font-size:0.9rem;">Weekly Field Exposure Timeline</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <button id="tl-prev" style="padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.8rem;">‹ Earlier</button>
          <span id="tl-counter" style="font-size:0.78rem;color:var(--text-dim);"></span>
          <button id="tl-next" style="padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:0.8rem;">Later ›</button>
        </div>
      </div>
      <div id="spread-timeline" style="overflow-x:auto;"></div>
    </div>
  `;

  // ── Render vector summary cards (2-pest paginator) ─────────────────────
  const vectorList = document.getElementById('spread-vector-list');
  const vecPrev    = document.getElementById('vec-prev');
  const vecNext    = document.getElementById('vec-next');
  const vecCounter = document.getElementById('vec-counter');
  const PAGE_SIZE  = 2;
  let vecPage      = 0;

  function vectorCardHtml(v) {
    const speedColor = velocityColor(v.velocityFieldsPerWeek);
    return `
      <div style="border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span style="font-weight:600;font-size:0.88rem;">${escapeHtml(v.pestName)}</span>
          <span style="font-size:1.4rem;" title="Moving ${escapeHtml(v.bearingLabel)}">${bearingArrow(v.bearingDeg)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:0.8rem;color:var(--text-dim);">
          <span>Direction</span><span style="color:var(--text);">${escapeHtml(v.bearingLabel)} (${v.bearingDeg}°)</span>
          <span>Velocity</span>
          <span style="color:${speedColor};font-weight:600;">${v.velocityFieldsPerWeek} fields/week</span>
          <span>Fields affected</span><span style="color:var(--text);">${v.affectedFieldCount}</span>
          <span>Origin field</span><span style="color:var(--text);">${escapeHtml(v.originFieldName)}</span>
          <span>First seen</span><span style="color:var(--text);">${v.firstSeenAt}</span>
          <span>Last seen</span><span style="color:var(--text);">${v.lastSeenAt}</span>
          ${v.neighbourRisk?.length
            ? `<span>Neighbours at risk</span><span style="color:${C.amber};font-weight:600;">${v.neighbourRisk.length} field(s)</span>`
            : ''}
        </div>
      </div>`;
  }

  function renderVectorPage() {
    if (spreadVectors.length === 0) {
      vectorList.innerHTML = `<div style="color:var(--text-dim);font-size:0.85rem;">Not enough data to compute spread vectors (need observations across multiple weeks).</div>`;
      vecPrev.style.display = vecNext.style.display = vecCounter.style.display = 'none';
      return;
    }
    const total   = spreadVectors.length;
    const maxPage = Math.ceil(total / PAGE_SIZE) - 1;
    vecPage       = Math.max(0, Math.min(vecPage, maxPage));
    const slice   = spreadVectors.slice(vecPage * PAGE_SIZE, vecPage * PAGE_SIZE + PAGE_SIZE);
    vectorList.innerHTML = slice.map(vectorCardHtml).join('');
    const from = vecPage * PAGE_SIZE + 1;
    const to   = Math.min(from + PAGE_SIZE - 1, total);
    vecCounter.textContent = `${from}–${to} of ${total}`;
    vecPrev.disabled = vecPage === 0;
    vecNext.disabled = vecPage === maxPage;
    vecPrev.style.opacity = vecPage === 0       ? '0.4' : '1';
    vecNext.style.opacity = vecPage === maxPage ? '0.4' : '1';
  }

  vecPrev.addEventListener('click', () => { vecPage--; renderVectorPage(); });
  vecNext.addEventListener('click', () => { vecPage++; renderVectorPage(); });
  renderVectorPage();

  // ── Neighbour risk list ───────────────────────────────────────────────────
  const nbrPanel = document.getElementById('spread-neighbour-panel');
  const nbrList  = document.getElementById('spread-neighbour-list');
  const allNbrs  = spreadVectors.flatMap(v =>
    (v.neighbourRisk ?? []).map(n => ({ ...n, pestName: v.pestName })));

  if (allNbrs.length === 0) {
    nbrPanel.style.display = 'none';
  } else {
    nbrList.innerHTML = `
      <div style="font-size:0.82rem;color:var(--text-dim);margin-bottom:8px;">
        These fields are within 5 km of an active spread front but have not yet reported this pest. Schedule an unplanned inspection.
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>Field</th><th>Farm</th><th>Pest spreading nearby</th></tr></thead>
          <tbody>
            ${allNbrs.map(n => `
              <tr>
                <td>${escapeHtml(n.fieldName ?? '—')}</td>
                <td>${escapeHtml(n.farmName  ?? '—')}</td>
                <td><span style="color:${C.amber};font-weight:600;">${escapeHtml(n.pestName)}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ── Weekly timeline (windowed, 8 weeks at a time) ──────────────────────
  const WEEK_WIN  = 8;
  let tlPage      = 0;
  const tlEl      = document.getElementById('spread-timeline');
  const tlPrev    = document.getElementById('tl-prev');
  const tlNext    = document.getElementById('tl-next');
  const tlCounter = document.getElementById('tl-counter');

  function renderTimelinePage() {
    const totalWeeks = weeklySnaps.length;
    if (totalWeeks === 0) { tlEl.innerHTML = ''; tlPrev.style.display = tlNext.style.display = 'none'; return; }
    const maxPage = Math.ceil(totalWeeks / WEEK_WIN) - 1;
    tlPage        = Math.max(0, Math.min(tlPage, maxPage));
    const slice   = weeklySnaps.slice(tlPage * WEEK_WIN, tlPage * WEEK_WIN + WEEK_WIN);
    buildTimeline(tlEl, slice);
    const from = tlPage * WEEK_WIN + 1;
    const to   = Math.min(from + WEEK_WIN - 1, totalWeeks);
    tlCounter.textContent = `Weeks ${from}–${to} of ${totalWeeks}`;
    tlPrev.disabled = tlPage === 0;
    tlNext.disabled = tlPage === maxPage;
    tlPrev.style.opacity = tlPage === 0       ? '0.4' : '1';
    tlNext.style.opacity = tlPage === maxPage ? '0.4' : '1';
  }

  tlPrev.addEventListener('click', () => { tlPage--; renderTimelinePage(); });
  tlNext.addEventListener('click', () => { tlPage++; renderTimelinePage(); });
  renderTimelinePage();

  // ── Map ───────────────────────────────────────────────────────────────────
  try {
    await loadLeaflet();
    buildMap('spread-map', allFields, weeklySnaps, spreadVectors);
    if (_map) drawBoundaries(_map, lookups);
  } catch (err) {
    document.getElementById('spread-map').innerHTML =
      `<div style="padding:24px;color:var(--text-dim);font-size:0.85rem;">Map unavailable: ${escapeHtml(err.message)}</div>`;
  }

  // ── Animation button ─────────────────────────────────────────────────────
  let animHandle = null;
  let animIdx    = 0;
  const playBtn  = document.getElementById('spread-play-btn');

  const weekLabel = document.querySelector('#spread-map + .week-label') ??
                    document.querySelector('.week-label');

  playBtn.addEventListener('click', () => {
    if (animHandle) {
      clearInterval(animHandle);
      animHandle = null;
      playBtn.textContent = '▶ Animate';
      if (weekLabel) weekLabel.style.display = 'none';
      return;
    }
    if (weeklySnaps.length < 2) return;
    playBtn.textContent = '⏹ Stop';
    if (weekLabel) weekLabel.style.display = 'block';
    animIdx = 0;

    animHandle = setInterval(() => {
      if (animIdx >= weeklySnaps.length) {
        clearInterval(animHandle);
        animHandle = null;
        playBtn.textContent = '▶ Animate';
        if (weekLabel) { setTimeout(() => { weekLabel.style.display = 'none'; }, 2000); }
        return;
      }
      const snap = weeklySnaps[animIdx];
      if (weekLabel) weekLabel.textContent = `Week of ${snap.weekStart}`;
      updateMapToWeek('spread-map', snap, allFields);
      animIdx++;
    }, 900);
  });
}

/* ── Build Leaflet map ─────────────────────────────────────────────────────── */
let _map = null;
let _markerLayer = null;
let _arrowLayer  = null;

function buildMap(containerId, fields, weeklySnaps, spreadVectors) {
  const L = window.L;

  // Destroy previous instance if container was reused
  if (_map) { try { _map.remove(); } catch { /* ignore */ } _map = null; }

  // Find a centre
  const validFields = fields.filter(f => f.lat && f.lng);
  if (validFields.length === 0) {
    document.getElementById(containerId).innerHTML =
      `<div style="padding:24px;color:var(--text-dim);font-size:0.85rem;">No geographic data available — observations are missing GPS coordinates and farms have no location set.</div>`;
    return;
  }

  const avgLat = validFields.reduce((s, f) => s + f.lat, 0) / validFields.length;
  const avgLng = validFields.reduce((s, f) => s + f.lng, 0) / validFields.length;

  _map = L.map(containerId).setView([avgLat, avgLng], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(_map);

  _markerLayer = L.layerGroup().addTo(_map);
  _arrowLayer  = L.layerGroup().addTo(_map);

  // Plot all field dots
  for (const f of validFields) {
    L.circleMarker([f.lat, f.lng], {
      radius: 8, color: '#3b7db8', fillColor: '#3b7db8',
      fillOpacity: 0.35, weight: 2,
    })
      .addTo(_markerLayer)
      .bindPopup(`<strong>${escapeHtml(f.fieldName ?? '')}</strong><br>${escapeHtml(f.farmName ?? '')}`);
  }

  // Draw spread vectors as arrows (skip single-field pests — no meaningful spread)
  for (const v of spreadVectors) {
    if ((v.affectedFieldCount ?? 0) < 2) continue;
    const origin = fields.find(f => f.fieldId && v.originFieldId && String(f.fieldId) === String(v.originFieldId));
    if (!origin) continue;

    // Most-recent centroid from last weekly snapshot that has this pest
    let destLat = origin.lat, destLng = origin.lng;
    for (let i = weeklySnaps.length - 1; i >= 0; i--) {
      const bp = weeklySnaps[i].byPest?.find(p => String(p.pestId) === String(v.pestId));
      if (bp?.fields?.length) {
        destLat = bp.fields.reduce((s, f) => s + f.lat, 0) / bp.fields.length;
        destLng = bp.fields.reduce((s, f) => s + f.lng, 0) / bp.fields.length;
        break;
      }
    }

    if (Math.abs(destLat - origin.lat) < 0.0001 && Math.abs(destLng - origin.lng) < 0.0001) continue;

    const color = velocityColor(v.velocityFieldsPerWeek);
    L.polyline([[origin.lat, origin.lng], [destLat, destLng]], {
      color, weight: 3, dashArray: '6 4', opacity: 0.85,
    }).addTo(_arrowLayer).bindPopup(
      `<strong>${escapeHtml(v.pestName)}</strong><br>` +
      `Moving ${escapeHtml(v.bearingLabel)} · ${v.velocityFieldsPerWeek} fields/week`
    );

    // Arrowhead circle at the front
    L.circleMarker([destLat, destLng], {
      radius: 6, color, fillColor: color, fillOpacity: 0.9, weight: 2,
    }).addTo(_arrowLayer);
  }

  // Fit bounds
  try { _map.fitBounds(_markerLayer.getBounds().pad(0.2)); } catch { /* ignore */ }
}

/* ── Update map to a single week snapshot ─────────────────────────────────── */
function updateMapToWeek(containerId, snap, allFields) {
  if (!_map || !_markerLayer) return;
  _markerLayer.clearLayers();

  const el = document.getElementById(containerId);
  if (el) {
    const label = el.parentElement?.querySelector('.week-label');
    if (label) label.textContent = snap.weekStart;
  }

  const L = window.L;
  const seen = new Set();

  for (const byPest of snap.byPest ?? []) {
    for (const f of byPest.fields ?? []) {
      if (!f.lat || !f.lng) continue;
      const key = `${f.lat},${f.lng}`;
      seen.add(key);
      const color = f.isAboveThreshold ? '#c75146' : '#3b7db8';
      L.circleMarker([f.lat, f.lng], {
        radius: 9, color, fillColor: color, fillOpacity: 0.75, weight: 2,
      })
        .addTo(_markerLayer)
        .bindPopup(
          `<strong>${escapeHtml(f.fieldName)}</strong><br>` +
          `${escapeHtml(byPest.pestName)} · count: ${f.totalCount}` +
          (f.isAboveThreshold ? ' ⚠ above threshold' : '')
        );
    }
  }

  // Grey dots for fields not active this week
  for (const f of allFields) {
    if (!f.lat || !f.lng) continue;
    const key = `${f.lat},${f.lng}`;
    if (seen.has(key)) continue;
    L.circleMarker([f.lat, f.lng], {
      radius: 5, color: '#aaa', fillColor: '#ccc', fillOpacity: 0.3, weight: 1,
    }).addTo(_markerLayer);
  }
}

/* ── Weekly timeline table ─────────────────────────────────────────────────── */
function buildTimeline(el, weeklySnaps) {
  if (weeklySnaps.length === 0) { el.innerHTML = ''; return; }

  // Collect all pest names
  const pestNames = [...new Set(weeklySnaps.flatMap(w => w.byPest?.map(p => p.pestName) ?? []))].sort();
  if (pestNames.length === 0) { el.innerHTML = ''; return; }

  const weeks  = weeklySnaps.map(w => w.weekStart);

  let html = `<table class="data-table" style="min-width:600px;">
    <thead>
      <tr>
        <th>Pest</th>
        ${weeks.map(w => `<th style="font-size:0.72rem;white-space:nowrap;">${w}</th>`).join('')}
      </tr>
    </thead>
    <tbody>`;

  for (const pest of pestNames) {
    html += `<tr><td style="font-weight:500;white-space:nowrap;">${escapeHtml(pest)}</td>`;
    for (const snap of weeklySnaps) {
      const bp = snap.byPest?.find(p => p.pestName === pest);
      if (!bp) {
        html += `<td style="text-align:center;color:var(--text-dim);font-size:0.7rem;">—</td>`;
      } else {
        const total   = bp.fields.reduce((s, f) => s + f.totalCount, 0);
        const breach  = bp.fields.some(f => f.isAboveThreshold);
        const bg      = breach ? 'rgba(199,81,70,0.15)' : 'rgba(59,125,184,0.12)';
        const color   = breach ? C.red : C.blue;
        html += `<td style="text-align:center;background:${bg};border-radius:4px;">
          <span style="font-size:0.78rem;color:${color};font-weight:600;">${total.toLocaleString()}</span>
          <div style="font-size:0.65rem;color:var(--text-dim);">${bp.fields.length} field${bp.fields.length !== 1 ? 's' : ''}</div>
        </td>`;
      }
    }
    html += `</tr>`;
  }

  html += `</tbody></table>`;
  el.innerHTML = html;
}
