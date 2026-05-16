import { escapeHtml }                      from '../../utils/helpers.js';
import { C, kpiGrid, kpiCard, emptyState } from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   I4 — Neighbour Risk Alert
   data = {
     radiusKm,
     alerts: [ {
       pestId, pestName,
       sourceField: { fieldId, fieldName, farmName, lat, lng,
                      breachCount, lastBreachAt, maxCount, threshold },
       atRiskNeighbours: [ { fieldId, fieldName, farmName, lat, lng,
                              distanceKm, lastSessionAt, daysSinceLastSession } ],
       neighbourCount, unscoutedCount
     } ],
     summary: { breachedFields, atRiskFields, unscoutedRiskFields }
   }
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

let _maps = {};
function destroyMaps() {
  for (const m of Object.values(_maps)) { try { m.remove(); } catch { /* ignore */ } }
  _maps = {};
}

/* ── Urgency helpers ─────────────────────────────────────────────────────── */
function urgencyColor(days) {
  if (days === null || days === undefined) return C.red;   // never scouted
  if (days > 14) return C.red;
  if (days > 7)  return C.amber;
  return C.green;
}

function urgencyLabel(days) {
  if (days === null || days === undefined) return 'Never scouted';
  if (days > 14) return `${days}d ago — critical`;
  if (days > 7)  return `${days}d ago — overdue`;
  return `${days}d ago`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export async function renderNeighbourRisk(container, data, onRadiusChange) {
  destroyMaps();

  const summary = data.summary ?? { breachedFields: 0, atRiskFields: 0, unscoutedRiskFields: 0 };
  const alerts  = data.alerts  ?? [];
  const radiusKm = data.radiusKm ?? 5;

  if (!alerts.length) {
    container.innerHTML = emptyState('✅', 'No neighbour risk alerts', 'No threshold breaches were found in the selected period, or no adjacent fields have GPS coordinates set.');
    return;
  }

  // Collect all unique pests for the pest selector
  const pests = [...new Map(alerts.map(a => [a.pestId, a.pestName])).entries()]
    .map(([id, name]) => ({ id, name }));

  let activePestId = pests[0]?.id ?? null;

  // ── KPI row ──────────────────────────────────────────────────────────────
  container.innerHTML = '<div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Identifies fields where a pest <strong>breached its action threshold</strong> in the selected period, then finds all other fields within the configurable search radius. Neighbouring fields that have not been scouted in 7 or more days are flagged as unscouted risk — an intelligence gap next to an active infestation that needs immediate attention.</div>' + kpiGrid([
    kpiCard('Breached Fields',    summary.breachedFields,     '',                                   summary.breachedFields > 0     ? C.red   : '',
      'Fields where the observed pest count exceeded the configured action threshold at least once in the selected period.'),
    kpiCard('At-Risk Neighbours', summary.atRiskFields,       'within radius',                      summary.atRiskFields > 0       ? C.amber : '',
      'Unaffected fields that fall within the search radius of a breached field — they share proximity to an active infestation and need monitoring.'),
    kpiCard('Unscouted Risk',     summary.unscoutedRiskFields,'neighbours not visited in 7+ days',  summary.unscoutedRiskFields > 0 ? C.red   : '',
      'At-risk neighbour fields that have not had a completed scouting session in 7 or more days — an intelligence gap next to a live infestation.'),
    kpiCard('Search Radius',      radiusKm + ' km',           'configurable below',                 C.blue ?? '#3b82f6',
      'The radius used to identify neighbouring fields. Increase this value to catch more distant at-risk fields; reduce it for tighter cluster analysis.'),
  ]) + `
  <!-- Controls row -->
  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <label style="font-size:0.8rem;color:var(--text-dim);font-weight:600;">📍 Radius</label>
      <select id="nb-radius" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;">
        ${[3, 5, 10, 20].map(r => `<option value="${r}"${r === Math.round(radiusKm) ? ' selected' : ''}>${r} km</option>`).join('')}
      </select>
    </div>
    ${pests.length > 1 ? `
    <div style="display:flex;align-items:center;gap:8px;">
      <label style="font-size:0.8rem;color:var(--text-dim);font-weight:600;">🐛 Pest</label>
      <select id="nb-pest" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;">
        ${pests.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
      </select>
    </div>` : ''}
  </div>

  <!-- Map + alerts layout -->
  <div id="nb-body"></div>`;

  // ── Radius selector ───────────────────────────────────────────────────────
  document.getElementById('nb-radius')?.addEventListener('change', e => {
    if (typeof onRadiusChange === 'function') onRadiusChange(Number(e.target.value));
  });

  // ── Pest selector ─────────────────────────────────────────────────────────
  document.getElementById('nb-pest')?.addEventListener('change', e => {
    activePestId = e.target.value;
    renderBody(activePestId);
  });

  await loadLeaflet();
  renderBody(activePestId);

  /* ── Body renderer (switches by pest) ────────────────────────────────── */
  async function renderBody(pestId) {
    destroyMaps();
    const body = document.getElementById('nb-body');
    if (!body) return;

    const pestAlerts = alerts.filter(a => a.pestId === pestId);
    if (!pestAlerts.length) {
      body.innerHTML = emptyState('✅', 'No alerts for this pest', '');
      return;
    }

    // Collect all unique source fields for this pest (may be more than one)
    body.innerHTML = pestAlerts.map((alert, idx) => {
      const src  = alert.sourceField;
      const nbrs = alert.atRiskNeighbours ?? [];
      const mapId = `nb-map-${idx}`;
      const listId = `nb-list-${idx}`;

      const unscoutedCount = nbrs.filter(n => n.daysSinceLastSession === null || n.daysSinceLastSession > 7).length;

      return `
      <div class="card card-p" style="margin-bottom:16px;">
        <!-- Source field header -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
          <div>
            <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-bottom:4px;">Breach Source</div>
            <div style="font-size:1rem;font-weight:700;color:var(--text);">${escapeHtml(src.fieldName)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(src.farmName)}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span style="background:${C.red}22;color:${C.red};border:1px solid ${C.red}55;border-radius:20px;padding:3px 12px;font-size:0.75rem;font-weight:700;">
              ⚠ ${alert.breachCount} breach${alert.breachCount !== 1 ? 'es' : ''}
            </span>
            ${unscoutedCount > 0 ? `<span style="background:${C.amber}22;color:${C.amber};border:1px solid ${C.amber}55;border-radius:20px;padding:3px 12px;font-size:0.75rem;font-weight:700;">
              ${unscoutedCount} unscouted
            </span>` : ''}
          </div>
        </div>
        <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:12px;">
          Last breach: <strong>${fmtDate(src.lastBreachAt)}</strong> &nbsp;·&nbsp;
          Peak count: <strong>${src.maxCount}</strong> &nbsp;·&nbsp;
          Threshold: <strong>${src.threshold}</strong> &nbsp;·&nbsp;
          ${alert.neighbourCount} neighbour${alert.neighbourCount !== 1 ? 's' : ''} within ${radiusKm} km
        </div>

        <!-- Map + list -->
        <div style="display:grid;grid-template-columns:1fr 340px;gap:14px;min-height:300px;">
          <div id="${mapId}" style="height:340px;border-radius:10px;overflow:hidden;border:1px solid var(--border);"></div>
          <div id="${listId}" style="overflow-y:auto;max-height:340px;display:flex;flex-direction:column;gap:6px;"></div>
        </div>
      </div>`;
    }).join('');

    // ── Build maps for each alert ─────────────────────────────────────────
    for (let idx = 0; idx < pestAlerts.length; idx++) {
      const alert = pestAlerts[idx];
      const src   = alert.sourceField;
      const nbrs  = alert.atRiskNeighbours ?? [];
      const mapId  = `nb-map-${idx}`;
      const listId = `nb-list-${idx}`;

      const mapEl = document.getElementById(mapId);
      if (!mapEl || !window.L) continue;

      const map = window.L.map(mapEl, { zoomControl: true, scrollWheelZoom: false });
      _maps[mapId] = map;

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const allLatLngs = [];

      // Source field — red circle marker
      if (src.lat && src.lng) {
        const latLng = [src.lat, src.lng];
        allLatLngs.push(latLng);

        window.L.circleMarker(latLng, {
          radius: 14, fillColor: C.red, color: '#fff', weight: 2, fillOpacity: 0.85,
        }).addTo(map)
          .bindPopup(`<strong>⚠ BREACH SOURCE</strong><br>${escapeHtml(src.fieldName)}<br>${escapeHtml(src.farmName)}<br>
            Peak count: ${src.maxCount} (threshold: ${src.threshold})<br>Last breach: ${fmtDate(src.lastBreachAt)}`);

        // Radius ring
        window.L.circle(latLng, {
          radius: radiusKm * 1000,
          color: C.red, weight: 1.5, opacity: 0.4,
          fillColor: C.red, fillOpacity: 0.05,
          dashArray: '6 4',
        }).addTo(map);
      }

      // Neighbour fields
      for (const nbr of nbrs) {
        if (!nbr.lat || !nbr.lng) continue;
        const latLng = [nbr.lat, nbr.lng];
        allLatLngs.push(latLng);

        const isUnscouted = nbr.daysSinceLastSession === null || nbr.daysSinceLastSession > 7;
        const color       = isUnscouted ? C.amber : C.green;

        // Dashed line from source to neighbour
        if (src.lat && src.lng) {
          window.L.polyline([[src.lat, src.lng], latLng], {
            color: '#94a3b8', weight: 1, dashArray: '4 4', opacity: 0.6,
          }).addTo(map);
        }

        window.L.circleMarker(latLng, {
          radius: 10, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.85,
        }).addTo(map)
          .bindPopup(`<strong>${escapeHtml(nbr.fieldName)}</strong><br>${escapeHtml(nbr.farmName)}<br>
            ${nbr.distanceKm} km from breach source<br>${urgencyLabel(nbr.daysSinceLastSession)}`);
      }

      // Fit map
      if (allLatLngs.length > 1) {
        map.fitBounds(window.L.latLngBounds(allLatLngs), { padding: [30, 30] });
      } else if (allLatLngs.length === 1) {
        map.setView(allLatLngs[0], 12);
      }

      // ── Neighbour list ──────────────────────────────────────────────────
      const listEl = document.getElementById(listId);
      if (listEl) {
        if (!nbrs.length) {
          listEl.innerHTML = `<div style="font-size:0.8rem;color:var(--text-dim);padding:12px;">No neighbouring fields with GPS found within ${radiusKm} km.</div>`;
        } else {
          listEl.innerHTML = nbrs.map(nbr => {
            const col   = urgencyColor(nbr.daysSinceLastSession);
            const label = urgencyLabel(nbr.daysSinceLastSession);
            return `
            <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;border-left:3px solid ${col};">
              <div style="font-size:0.85rem;font-weight:600;color:var(--text);">${escapeHtml(nbr.fieldName)}</div>
              <div style="font-size:0.75rem;color:var(--text-dim);">${escapeHtml(nbr.farmName)}</div>
              <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:0.75rem;">
                <span style="color:var(--text-dim);">${nbr.distanceKm} km away</span>
                <span style="color:${col};font-weight:600;">${escapeHtml(label)}</span>
              </div>
              ${nbr.lastSessionAt ? `<div style="font-size:0.72rem;color:var(--text-dim);margin-top:2px;">Last session: ${fmtDate(nbr.lastSessionAt)}</div>` : ''}
            </div>`;
          }).join('');
        }
      }
    }

    // ── Summary table ─────────────────────────────────────────────────────
    const allNbrs = pestAlerts.flatMap(a => (a.atRiskNeighbours ?? []).map(n => ({ ...n, sourceName: a.sourceField.fieldName })));
    if (allNbrs.length) {
      const tableHtml = `
      <div class="card card-p" style="margin-top:4px;">
        <div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:10px;">All At-Risk Neighbours</div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead><tr>
              <th>Field</th><th>Farm</th><th>Breach Source</th><th>Distance</th><th>Last Scouted</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${allNbrs.map(n => {
                const col   = urgencyColor(n.daysSinceLastSession);
                const label = urgencyLabel(n.daysSinceLastSession);
                return `<tr>
                  <td>${escapeHtml(n.fieldName)}</td>
                  <td>${escapeHtml(n.farmName)}</td>
                  <td>${escapeHtml(n.sourceName)}</td>
                  <td>${n.distanceKm} km</td>
                  <td>${fmtDate(n.lastSessionAt)}</td>
                  <td><span style="color:${col};font-weight:600;">${escapeHtml(label)}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
      body.insertAdjacentHTML('beforeend', tableHtml);
    }
  }
}
