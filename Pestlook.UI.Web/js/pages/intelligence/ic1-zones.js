import { escapeHtml, formatDistance } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';
import { getUser }     from '../../utils/storage.js';

/* ─────────────────────────────────────────────────────────────────────────────
   C1 — Containment Zone Recommendation
   data = {
     pests: [{ pestId, pestName, spreadBearing, spreadDirection, spreadKmTotal,
               spreadKmPerWeek, weeksObserved, perimeterRadius,
               currentFront: { lat, lng, fieldName },
               insideZone: [{ fieldId, fieldName, farmName, firstDetected, peakCount }],
               containmentPerimeter: [{ farmId, farmName, lat, lng, distanceKm,
                                        bearing, inPath, urgency }],
               zonesRecommended }],
     summary: { pestsWithVector, fieldsInPerimeter, totalInsideZone }
   }
───────────────────────────────────────────────────────────────────────────── */

const DIR_ICON = { N:'↑', NE:'↗', E:'→', SE:'↘', S:'↓', SW:'↙', W:'←', NW:'↖' };

export async function renderContainmentZones(el, data) {
  const { pests = [], summary = {} } = data;
  const distUnit = getUser()?.distanceUnit || 'km';

  if (!pests.length) {
    el.innerHTML = emptyState('🛡', 'No spread vectors detected',
      'At least 2 weeks of GPS-tagged observations are required to compute a spread vector. Ensure farm GPS coordinates are set on the Farms page.');
    return;
  }

  const kpi = (label, value, colour, sub = '', tooltip = '') => `
    <div class="card card-p${tooltip ? ' has-kpi-tip' : ''}" style="flex:1;min-width:130px;"${tooltip ? ` data-kpi-tip="${tooltip}"` : ''}>
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Computes a spread vector (compass bearing and weekly velocity) for each pest from weekly GPS centroids, then identifies unaffected farms within <strong>±60° of the spread bearing</strong> and twice the weekly spread distance. These farms form the recommended <strong>containment perimeter</strong> — the most likely next targets if the outbreak continues unchecked. Farms directly in the spread path are flagged High; nearby off-axis farms are flagged Monitor.</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${kpi('Pests Spreading',    summary.pestsWithVector   ?? 0, 'var(--text)',  'with measurable vector',     'Number of pest species for which a directional spread vector could be computed from at least two weeks of GPS-tagged observations.')}
      ${kpi('Perimeter Zones',    summary.fieldsInPerimeter ?? 0, '#c0392b',     'farms directly in spread path', 'Unaffected farms that fall within ±60° of the spread bearing and within twice the weekly spread distance — the most likely next targets of the outbreak.')}
      ${kpi('Inside Zone',        summary.totalInsideZone   ?? 0, '#e67e22',     'fields already affected',     'Fields that have already recorded observations for the spreading pest — the current extent of the infestation.')}
    </div>`;

  const rows = pests.map(p => {
    const dirIcon   = DIR_ICON[p.spreadDirection] ?? '→';
    const highUrgency = (p.containmentPerimeter ?? []).filter(z => z.urgency === 'High');
    const borderCol = highUrgency.length > 0 ? '#c0392b' : '#e67e22';

    const insideRows = (p.insideZone ?? []).map(z => `
      <tr style="border-bottom:1px solid var(--border);font-size:0.78rem;">
        <td style="padding:6px 8px;">${escapeHtml(z.fieldName)}</td>
        <td style="padding:6px 8px;color:var(--text-dim);">${escapeHtml(z.farmName)}</td>
        <td style="padding:6px 8px;">${new Date(z.firstDetected + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:700;">${z.peakCount}</td>
      </tr>`).join('');

    const perimRows = (p.containmentPerimeter ?? []).map(z => {
      const urg = z.urgency === 'High';
      return `
        <tr style="border-bottom:1px solid var(--border);font-size:0.78rem;${urg ? 'background:rgba(192,57,43,0.06);' : ''}">
          <td style="padding:6px 8px;font-weight:${urg ? '700' : '400'};">${urg ? '🚨 ' : '👁 '}${escapeHtml(z.farmName)}</td>
          <td style="padding:6px 8px;text-align:right;">${formatDistance(z.distanceKm, distUnit)}</td>
          <td style="padding:6px 8px;text-align:center;">
            <span style="padding:2px 8px;border-radius:20px;font-size:0.7rem;font-weight:700;
              background:${urg ? 'rgba(192,57,43,0.15)' : 'rgba(230,126,34,0.12)'};
              color:${urg ? '#c0392b' : '#e67e22'};">${z.urgency}</span>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="card card-p" style="border-left:4px solid ${borderCol};margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">🛡 ${escapeHtml(p.pestName)}</div>
            <div style="font-size:0.78rem;color:var(--text-dim);">${p.weeksObserved} weeks observed · ${formatDistance(p.spreadKmTotal, distUnit)} total spread</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <span style="font-size:1.4rem;" title="${p.spreadDirection}">${dirIcon}</span>
            <span style="padding:3px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;background:rgba(192,57,43,0.12);color:#c0392b;">
              ${p.spreadDirection} · ${formatDistance(p.spreadKmPerWeek, distUnit)}/wk
            </span>
          </div>
        </div>

        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:0.82rem;margin-bottom:14px;padding:10px 12px;background:var(--surface);border-radius:8px;border:1px solid var(--border);">
          <span style="color:var(--text-dim);cursor:help;" title="Search radius around the current spread front: 2× the weekly spread velocity, minimum 5 km. Farms within this radius are candidates for the containment perimeter.">Perimeter radius: <strong>${formatDistance(p.perimeterRadius, distUnit)}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Compass bearing of the overall spread vector, measured from the first week's GPS centroid to the most recent week's centroid. 0° = North, 90° = East, 180° = South, 270° = West.">Bearing: <strong>${p.spreadBearing}°</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="The field name closest to the most recent weekly GPS centroid — the leading edge of the current infestation.">Front at: <strong>${escapeHtml(p.currentFront?.fieldName ?? 'Unknown')}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Number of unaffected farms that fall within ±60° of the spread bearing and within the perimeter radius — classified as High urgency and directly in the pest's projected path.">Zones in path: <strong style="color:${borderCol};">${p.zonesRecommended}</strong></span>
        </div>

        <div style="display:flex;gap:14px;flex-wrap:wrap;">
          ${insideRows ? `
          <div style="flex:1;min-width:220px;">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-dim);margin-bottom:8px;">🔴 Affected Fields (inside zone)</div>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="border-bottom:2px solid var(--border);">
                  <th style="padding:5px 8px;text-align:left;font-size:0.72rem;color:var(--text-dim);">Field</th>
                  <th style="padding:5px 8px;text-align:left;font-size:0.72rem;color:var(--text-dim);">Farm</th>
                  <th style="padding:5px 8px;text-align:left;font-size:0.72rem;color:var(--text-dim);">First Seen</th>
                  <th style="padding:5px 8px;text-align:right;font-size:0.72rem;color:var(--text-dim);">Peak Count</th>
                </tr></thead>
                <tbody>${insideRows}</tbody>
              </table>
            </div>
          </div>` : ''}

          ${perimRows ? `
          <div style="flex:1;min-width:220px;">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-dim);margin-bottom:8px;">🛡 Containment Perimeter (unaffected)</div>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="border-bottom:2px solid var(--border);">
                  <th style="padding:5px 8px;text-align:left;font-size:0.72rem;color:var(--text-dim);">Farm</th>
                  <th style="padding:5px 8px;text-align:right;font-size:0.72rem;color:var(--text-dim);">Distance</th>
                  <th style="padding:5px 8px;text-align:center;font-size:0.72rem;color:var(--text-dim);">Urgency</th>
                </tr></thead>
                <tbody>${perimRows}</tbody>
              </table>
            </div>
            <div style="font-size:0.72rem;color:var(--text-dim);margin-top:6px;">🚨 High = directly in spread path · 👁 Monitor = nearby but off-axis</div>
          </div>` : ''}
        </div>
        ${!perimRows ? `<div style="margin-top:10px;font-size:0.82rem;color:var(--text-dim);">No unaffected farms detected within perimeter range — all nearby farms are already affected.</div>` : ''}
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${rows}`;
}
