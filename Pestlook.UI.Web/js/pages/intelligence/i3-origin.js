import { escapeHtml }                      from '../../utils/helpers.js';
import { C, kpiGrid, kpiCard, emptyState } from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   I3 — Infestation Origin Detection
   data = { origins: [ {
     pestId, pestName, totalFieldsAffected, daysToSecondField,
     maxSpreadDistanceKm, outbreakConfidence,
     chain: [ { step, fieldId, fieldName, farmName, lat, lng,
                firstSeenAt, firstCount, threshold, wasAboveThreshold,
                lagDays, distanceKm, isOrigin } ]
   } ] }
───────────────────────────────────────────────────────────────────────────── */

/* ── Leaflet loader ──────────────────────────────────────────────────────── */
let _leafletLoading = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (_leafletLoading) return _leafletLoading;
  _leafletLoading = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const link = Object.assign(document.createElement('link'),
        { id: 'leaflet-css', rel: 'stylesheet',
          href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' });
      document.head.appendChild(link);
    }
    const s = document.createElement('script');
    s.src     = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload  = () => { _leafletLoading = null; resolve(); };
    s.onerror = () => { _leafletLoading = null; reject(new Error('Leaflet failed to load')); };
    document.head.appendChild(s);
  });
  return _leafletLoading;
}

let _maps = {};   // keyed by containerId — destroyed on re-render

function destroyMaps() {
  for (const m of Object.values(_maps)) { try { m.remove(); } catch { /* ignore */ } }
  _maps = {};
}

/* ── Confidence badge ────────────────────────────────────────────────────── */
function confidenceBadge(score) {
  const pct   = Math.round(score * 100);
  const color = score >= 0.7 ? C.red : score >= 0.4 ? C.amber : C.green;
  const label = score >= 0.7 ? 'High' : score >= 0.4 ? 'Moderate' : 'Low';
  return `<span style="background:${color}22;color:${color};border:1px solid ${color}55;
    border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">
    ${label} ${pct}%</span>`;
}

/* ── Step colour ─────────────────────────────────────────────────────────── */
function stepColor(step, total) {
  if (step === 0)         return C.red;    // origin
  if (step === total - 1) return C.amber;  // current front
  return C.blue;
}

/* ── Build one origin Leaflet map ────────────────────────────────────────── */
function buildOriginMap(containerId, chain) {
  const L          = window.L;
  const gpsSteps   = chain.filter(s => s.lat && s.lng);

  if (gpsSteps.length === 0) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML =
      `<div style="display:flex;align-items:center;justify-content:center;height:100%;
          color:var(--text-dim);font-size:0.82rem;text-align:center;padding:20px;">
        No GPS coordinates available for this pest.<br>
        Set a farm latitude &amp; longitude on the Farms page to enable the map.
      </div>`;
    return;
  }

  const total  = chain.length;
  const avgLat = gpsSteps.reduce((s, f) => s + f.lat, 0) / gpsSteps.length;
  const avgLng = gpsSteps.reduce((s, f) => s + f.lng, 0) / gpsSteps.length;

  const map = L.map(containerId).setView([avgLat, avgLng], 11);
  _maps[containerId] = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19,
  }).addTo(map);

  // Connecting polyline through all GPS steps in order
  if (gpsSteps.length > 1) {
    L.polyline(gpsSteps.map(s => [s.lat, s.lng]), {
      color: '#5a6b62', weight: 2, dashArray: '6 4', opacity: 0.7,
    }).addTo(map);
  }

  // Numbered markers per step
  for (const s of gpsSteps) {
    const color = stepColor(s.step, total);
    const icon  = L.divIcon({
      className: '',
      html: `<div style="width:30px;height:30px;border-radius:50%;
               background:${color};color:#fff;display:flex;align-items:center;
               justify-content:center;font-weight:700;font-size:0.82rem;
               border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.28);">
               ${s.step + 1}</div>`,
      iconSize:   [30, 30],
      iconAnchor: [15, 15],
    });

    const days  = s.lagDays === 0 ? 'Origin' : `+${s.lagDays} day${s.lagDays !== 1 ? 's' : ''}`;
    const dist  = s.distanceKm != null ? ` · ${s.distanceKm} km from origin` : '';
    const above = s.wasAboveThreshold ? ' ⚠ above threshold' : '';

    L.marker([s.lat, s.lng], { icon })
      .addTo(map)
      .bindPopup(
        `<strong>${escapeHtml(s.fieldName)}</strong><br>` +
        `${escapeHtml(s.farmName ?? '')}` +
        `<br><span style="color:#888;font-size:0.8rem;">${days}${dist}</span>` +
        `<br>First count: <strong>${s.firstCount.toLocaleString()}</strong>${above}`
      );
  }

  try { map.fitBounds(L.latLngBounds(gpsSteps.map(s => [s.lat, s.lng])).pad(0.3)); } catch { /* ignore */ }
}

/* ── Spread chain list ───────────────────────────────────────────────────── */
function chainListHtml(chain) {
  const total = chain.length;
  return chain.map(s => {
    const color     = stepColor(s.step, total);
    const badge     = s.isOrigin
      ? `<span style="background:${C.red}22;color:${C.red};border:1px solid ${C.red}55;
            border-radius:20px;padding:1px 8px;font-size:0.7rem;font-weight:700;">ORIGIN</span>`
      : `<span style="background:var(--surface2,#f4f7f4);color:var(--text-dim);border:1px solid var(--border);
            border-radius:20px;padding:1px 8px;font-size:0.7rem;">+${s.lagDays}d</span>`;
    const dist  = s.distanceKm != null
      ? `<span style="font-size:0.78rem;color:var(--text-dim);">${s.distanceKm} km from origin</span>`
      : '';
    const above = s.wasAboveThreshold
      ? `<span style="font-size:0.75rem;color:${C.red};font-weight:600;">⚠ above threshold</span>`
      : `<span style="font-size:0.75rem;color:${C.green};">within threshold</span>`;
    return `
      <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;
                  border-bottom:1px solid var(--border);">
        <!-- Step number -->
        <div style="flex-shrink:0;width:30px;height:30px;border-radius:50%;
                    background:${color};color:#fff;display:flex;align-items:center;
                    justify-content:center;font-weight:700;font-size:0.85rem;
                    box-shadow:0 1px 4px rgba(0,0,0,0.2);">${s.step + 1}</div>
        <!-- Content -->
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
            <span style="font-weight:600;font-size:0.88rem;">${escapeHtml(s.fieldName)}</span>
            ${badge}
          </div>
          <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:4px;">
            ${escapeHtml(s.farmName ?? '—')}
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.78rem;">
            <span>📅 ${s.firstSeenAt}</span>
            <span>🐛 Count: <strong>${s.firstCount.toLocaleString()}</strong>
              ${s.threshold ? `/ ${s.threshold} threshold` : ''}</span>
            ${dist}
          </div>
          <div style="margin-top:3px;">${above}</div>
        </div>
      </div>`;
  }).join('');
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export async function renderOriginDetection(el, data) {
  destroyMaps();
  const origins = data.origins ?? [];

  if (origins.length === 0) {
    el.innerHTML = emptyState('🔍',
      'No origin data available',
      'Infestation origin detection requires observations spanning at least one field in the selected period. Try widening the date range or removing farm/field filters.');
    return;
  }

  /* ── KPIs ──────────────────────────────────────────────────────────────── */
  const multiField   = origins.filter(o => o.totalFieldsAffected > 1).length;
  const fastest      = origins
    .filter(o => o.daysToSecondField != null)
    .sort((a, b) => a.daysToSecondField - b.daysToSecondField)[0] ?? null;
  const farthest     = origins
    .filter(o => o.maxSpreadDistanceKm != null)
    .sort((a, b) => b.maxSpreadDistanceKm - a.maxSpreadDistanceKm)[0] ?? null;

  /* ── Pest selector ─────────────────────────────────────────────────────── */
  const pestOpts = origins
    .map(o => `<option value="${escapeHtml(String(o.pestId))}">${escapeHtml(o.pestName)}</option>`)
    .join('');

  el.innerHTML = `
    ${kpiGrid([
      kpiCard('Pests Traced',      origins.length,    'species with traceable origin data'),
      kpiCard('Multi-field Outbreaks', multiField,
        'pests that spread to 2+ fields', multiField > 0 ? C.amber : ''),
      fastest
        ? kpiCard('Fastest Spread',
            `${fastest.daysToSecondField} day${fastest.daysToSecondField !== 1 ? 's' : ''}`,
            `${escapeHtml(fastest.pestName)} reached a second field`, C.red)
        : kpiCard('Fastest Spread', '—', 'no multi-field outbreaks detected'),
      farthest
        ? kpiCard('Farthest Spread',
            `${farthest.maxSpreadDistanceKm} km`,
            `${escapeHtml(farthest.pestName)} — furthest field from origin`)
        : kpiCard('Farthest Spread', '—', 'no GPS data for distance'),
    ])}

    <!-- Pest selector -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
      <label style="font-size:0.82rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        Show pest
        <select id="origin-pest-sel" class="input-field"
          style="margin-top:0;width:auto;padding:5px 10px;font-size:0.82rem;">
          ${pestOpts}
        </select>
      </label>
      <span id="origin-confidence-badge"></span>
    </div>

    <!-- Main two-column layout -->
    <div class="two-col" style="gap:16px;margin-bottom:16px;">
      <!-- Map -->
      <div class="card card-static" style="padding:0;overflow:hidden;border-radius:10px;min-height:380px;">
        <div id="origin-map" style="width:100%;height:380px;"></div>
      </div>
      <!-- Chain list -->
      <div class="card card-p" style="overflow-y:auto;max-height:380px;">
        <div style="font-weight:600;font-size:0.9rem;margin-bottom:10px;">Spread Chain</div>
        <div id="origin-chain-list"></div>
      </div>
    </div>

    <!-- Summary table of all pests -->
    <div class="card card-p">
      <div style="font-weight:600;font-size:0.9rem;margin-bottom:12px;">All Pest Origins — Summary</div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Pest</th>
              <th>Origin Field</th>
              <th>Farm</th>
              <th>First Detected</th>
              <th>Fields in Chain</th>
              <th>Days to 2nd Field</th>
              <th>Max Distance</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            ${origins.map(o => {
              const chain0 = o.chain[0];
              return `
                <tr style="cursor:pointer;" data-origin-pest="${escapeHtml(String(o.pestId))}">
                  <td style="font-weight:500;">${escapeHtml(o.pestName)}</td>
                  <td>${escapeHtml(chain0?.fieldName ?? '—')}</td>
                  <td style="color:var(--text-dim);">${escapeHtml(chain0?.farmName ?? '—')}</td>
                  <td style="white-space:nowrap;">${chain0?.firstSeenAt ?? '—'}</td>
                  <td style="text-align:center;">${o.totalFieldsAffected}</td>
                  <td style="text-align:center;">${o.daysToSecondField != null ? o.daysToSecondField + 'd' : '—'}</td>
                  <td style="text-align:center;">${o.maxSpreadDistanceKm != null ? o.maxSpreadDistanceKm + ' km' : '—'}</td>
                  <td>${confidenceBadge(o.outbreakConfidence)}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  /* ── Pest detail logic ──────────────────────────────────────────────────── */
  let currentOrigin = origins[0];

  function showOriginDetail(origin) {
    currentOrigin = origin;

    // Update confidence badge
    const badge = document.getElementById('origin-confidence-badge');
    if (badge) badge.innerHTML = `Confidence: ${confidenceBadge(origin.outbreakConfidence)}`;

    // Update chain list
    const list = document.getElementById('origin-chain-list');
    if (list) list.innerHTML = chainListHtml(origin.chain);

    // Rebuild map
    destroyMaps();
    const mapEl = document.getElementById('origin-map');
    if (mapEl) {
      mapEl.innerHTML = '';
      loadLeaflet()
        .then(() => buildOriginMap('origin-map', origin.chain))
        .catch(err => {
          mapEl.innerHTML = `<div style="padding:24px;color:var(--text-dim);font-size:0.85rem;">
            Map unavailable: ${escapeHtml(err.message)}</div>`;
        });
    }

    // Highlight summary table row
    el.querySelectorAll('tr[data-origin-pest]').forEach(tr => {
      tr.style.background = String(tr.dataset.originPest) === String(origin.pestId)
        ? 'var(--surface2,#f4f7f4)' : '';
    });

    // Sync selector
    const sel = document.getElementById('origin-pest-sel');
    if (sel) sel.value = String(origin.pestId);
  }

  /* ── Wire pest selector ─────────────────────────────────────────────────── */
  document.getElementById('origin-pest-sel').addEventListener('change', e => {
    const found = origins.find(o => String(o.pestId) === e.target.value);
    if (found) showOriginDetail(found);
  });

  /* ── Wire summary table rows ────────────────────────────────────────────── */
  el.querySelectorAll('tr[data-origin-pest]').forEach(tr => {
    tr.addEventListener('click', () => {
      const found = origins.find(o => String(o.pestId) === tr.dataset.originPest);
      if (found) showOriginDetail(found);
    });
  });

  /* ── Initial render ─────────────────────────────────────────────────────── */
  showOriginDetail(origins[0]);
}
