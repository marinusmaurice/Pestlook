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

const infoIcon = (tooltip) =>
  `<span style="font-size:0.7rem;color:var(--text-dim);cursor:help;margin-left:3px;opacity:0.7;" title="${tooltip}">&#9432;</span>`;

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
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
      Computes a <strong>spread vector</strong> (compass bearing and weekly velocity) for each pest from weekly GPS centroids,
      then identifies unaffected farms within <strong>±60° of the spread bearing</strong> and twice the weekly spread distance.
      These farms form the recommended <strong>containment perimeter</strong> — the most likely next targets if the outbreak
      continues unchecked. Farms directly in the spread path are flagged <strong>High</strong>;
      nearby off-axis farms are flagged <strong>Monitor</strong>.
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${kpi('Pests Spreading', summary.pestsWithVector ?? 0, 'var(--text)',
        'with measurable vector',
        'Number of pest species for which a directional spread vector could be computed from at least two weeks of GPS-tagged observations. Requires farm GPS coordinates to be set on the Farms page.')}
      ${kpi('Perimeter Zones', summary.fieldsInPerimeter ?? 0, '#c0392b',
        'farms directly in spread path',
        'Unaffected farms that fall within ±60° of the spread bearing and within twice the weekly spread distance — classified as High urgency. These are the most likely next targets if the outbreak continues on its current trajectory.')}
      ${kpi('Inside Zone', summary.totalInsideZone ?? 0, '#e67e22',
        'fields already affected',
        'Fields that have already recorded observations for the spreading pest within the selected date range — the current known extent of the infestation.')}
    </div>`;

  const rows = pests.map(p => {
    const dirIcon    = DIR_ICON[p.spreadDirection] ?? '→';
    const highUrgency = (p.containmentPerimeter ?? []).filter(z => z.urgency === 'High');

    const insideRows = (p.insideZone ?? []).map(z => `
      <tr style="border-bottom:1px solid var(--border);font-size:0.78rem;">
        <td style="padding:6px 8px;"
            title="Field name within the farm.">${escapeHtml(z.fieldName)}</td>
        <td style="padding:6px 8px;color:var(--text-dim);"
            title="Farm this field belongs to.">${escapeHtml(z.farmName)}</td>
        <td style="padding:6px 8px;"
            title="Earliest date this pest was observed on this field within the selected date range, in your account timezone. Sorted by this date to show the likely origin field first.">
          ${new Date(z.firstDetected + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </td>
        <td style="padding:6px 8px;text-align:right;font-weight:700;"
            title="Highest single-session pest count recorded on this field within the selected period.">${z.peakCount}</td>
      </tr>`).join('');

    const perimRows = (p.containmentPerimeter ?? []).map(z => {
      const urg = z.urgency === 'High';
      return `
        <tr style="border-bottom:1px solid var(--border);font-size:0.78rem;${urg ? 'background:rgba(192,57,43,0.06);' : ''}"
            title="${urg
              ? `HIGH URGENCY: ${z.farmName} is within ±60° of the spread bearing and within the perimeter radius — directly in the pest\'s projected path. Distance: ${formatDistance(z.distanceKm, distUnit)} from the current spread front.`
              : `MONITOR: ${z.farmName} is within the perimeter radius but off-axis (>60° from the spread bearing). Less immediately at risk but worth increased scouting. Distance: ${formatDistance(z.distanceKm, distUnit)}.`}">
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
      <div class="card card-p" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">🛡 ${escapeHtml(p.pestName)}</div>
            <div style="font-size:0.78rem;color:var(--text-dim);"
                 title="Number of distinct weeks with GPS-tagged observations used to calculate the spread vector. More weeks = more reliable bearing and velocity estimate.">
              ${p.weeksObserved} weeks observed
            </div>
            <div style="font-size:0.78rem;color:var(--text-dim);"
                 title="Total displacement from the first week\'s GPS centroid to the most recent week\'s centroid — the overall distance the pest population has moved across the landscape. This is the straight-line vector, not the accumulated distance of all weekly movements.">
              ${formatDistance(p.spreadKmTotal, distUnit)} total spread
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <span style="font-size:1.4rem;"
                  title="Compass direction of the overall spread vector: ${p.spreadDirection} (${p.spreadBearing}°).">${dirIcon}</span>
            <span style="padding:3px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;background:rgba(192,57,43,0.12);color:#c0392b;"
                  title="Spread direction and weekly velocity. Direction is the bearing from the earliest to the most recent GPS centroid. Velocity is the total spread distance divided by the number of weeks observed.">
              ${p.spreadDirection} · ${formatDistance(p.spreadKmPerWeek, distUnit)}/wk
            </span>
          </div>
        </div>

        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:0.82rem;margin-bottom:14px;padding:10px 12px;background:var(--surface);border-radius:8px;border:1px solid var(--border);">
          <span style="color:var(--text-dim);">
            Perimeter radius: <strong>${formatDistance(p.perimeterRadius, distUnit)}</strong>
            ${infoIcon('Search radius around the current spread front: 2× the weekly spread velocity, with a minimum of 5 km. Farms within this radius that are not yet affected are candidates for the containment perimeter.')}
          </span>
          <span style="color:var(--text-dim);">
            Bearing: <strong>${p.spreadBearing}°</strong>
            ${infoIcon('Compass bearing of the overall spread vector. Measured from the first week\'s GPS centroid to the most recent week\'s centroid. 0° = North, 90° = East, 180° = South, 270° = West.')}
          </span>
          <span style="color:var(--text-dim);">
            Front at: <strong>${escapeHtml(p.currentFront?.fieldName ?? 'Unknown')}</strong>
            ${infoIcon('The field closest to the most recent weekly GPS centroid — the current leading edge of the infestation.')}
          </span>
          <span style="color:var(--text-dim);">
            Zones in path: <strong style="color:${highUrgency.length > 0 ? '#c0392b' : 'var(--text)'};">${p.zonesRecommended}</strong>
            ${infoIcon('Number of unaffected farms within ±60° of the spread bearing and within the perimeter radius. These are classified as High urgency — directly in the pest\'s projected path.')}
          </span>
        </div>

        <div style="display:flex;gap:14px;flex-wrap:wrap;">
          ${insideRows ? `
          <div style="flex:1;min-width:220px;">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-dim);margin-bottom:8px;">
              🔴 Affected Fields (inside zone)
              ${infoIcon('Fields that have already recorded observations for this pest in the selected date range. Sorted by first detection date — the earliest field is the likely origin.')}
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="border-bottom:2px solid var(--border);">
                  <th style="padding:5px 8px;text-align:left;font-size:0.72rem;color:var(--text-dim);"
                      title="Field name within the farm.">Field</th>
                  <th style="padding:5px 8px;text-align:left;font-size:0.72rem;color:var(--text-dim);"
                      title="Farm the field belongs to.">Farm</th>
                  <th style="padding:5px 8px;text-align:left;font-size:0.72rem;color:var(--text-dim);"
                      title="Earliest date this pest was observed on this field within the selected date range, in your account timezone.">
                    First Seen ${infoIcon('Date of earliest observation for this pest on this field, within the selected date range. Displayed in your account timezone.')}
                  </th>
                  <th style="padding:5px 8px;text-align:right;font-size:0.72rem;color:var(--text-dim);"
                      title="Highest single-session pest count recorded on this field in the selected period.">
                    Peak Count ${infoIcon('Highest individual session count recorded for this pest on this field within the selected date range.')}
                  </th>
                </tr></thead>
                <tbody>${insideRows}</tbody>
              </table>
            </div>
          </div>` : ''}

          ${perimRows ? `
          <div style="flex:1;min-width:220px;">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-dim);margin-bottom:8px;">
              🛡 Containment Perimeter (unaffected)
              ${infoIcon('Farms that are not yet affected but lie within the perimeter radius. High = directly in the spread path (±60° of bearing). Monitor = nearby but off-axis. Hover a row for full details.')}
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="border-bottom:2px solid var(--border);">
                  <th style="padding:5px 8px;text-align:left;font-size:0.72rem;color:var(--text-dim);"
                      title="Name of the unaffected farm on the containment perimeter.">Farm</th>
                  <th style="padding:5px 8px;text-align:right;font-size:0.72rem;color:var(--text-dim);"
                      title="Straight-line distance from the current spread front (most recent GPS centroid) to this farm.">
                    Distance ${infoIcon('Straight-line distance from the current spread front to this farm.')}
                  </th>
                  <th style="padding:5px 8px;text-align:center;font-size:0.72rem;color:var(--text-dim);"
                      title="High = within ±60° of the spread bearing and within the perimeter radius — directly in projected path. Monitor = within radius but off-axis (>60° from bearing).">
                    Urgency ${infoIcon('High = directly in the spread bearing path (≤60° offset). Monitor = within perimeter radius but off-axis. Hover a row for the full explanation.')}
                  </th>
                </tr></thead>
                <tbody>${perimRows}</tbody>
              </table>
            </div>
            <div style="font-size:0.72rem;color:var(--text-dim);margin-top:6px;">🚨 High = directly in spread path · 👁 Monitor = nearby but off-axis</div>
          </div>` : ''}
        </div>
        ${!perimRows ? `<div style="margin-top:10px;font-size:0.82rem;color:var(--text-dim);">No unaffected farms detected within perimeter range — all nearby farms are already affected or no farms have GPS coordinates set.</div>` : ''}
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${rows}`;
}
