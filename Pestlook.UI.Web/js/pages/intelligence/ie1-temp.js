import { escapeHtml, celsiusToFahrenheit } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';
import { getUser }     from '../../utils/storage.js';

function convTemp(c, unit) {
  if (c == null) return '—';
  return Number(unit === 'F' ? celsiusToFahrenheit(c) : c).toFixed(1);
}
function convRange(rangeStr, unit) {
  if (!rangeStr) return '—';
  const m = rangeStr.match(/([-\d.]+)[–-]([-\d.]+)/);
  if (!m) return rangeStr;
  return `${convTemp(parseFloat(m[1]), unit)}–${convTemp(parseFloat(m[2]), unit)}`;
}
function convSlope(slopePerC, unit) {
  const v = unit === 'F' ? slopePerC * 5 / 9 : slopePerC;
  return (v > 0 ? '+' : '') + Number(v).toFixed(3);
}

/* ─────────────────────────────────────────────────────────────────────────────
   E1 — Temperature × Pest Activity Index
   data = {
     pests: [{ pestId, pestName, dataPoints, correlation, slopePerDegC,
               optimalTempRange, influence, sensitivity, avgCount, avgTemp,
               buckets: [{ bucket, tempRange, avgCount, observations }] }],
     heatMap: [{ bucket, tempRange, avgCount, observations, pestCount }],
     summary: { totalPests, tempSensitive, coldFavoring, dataPoints, overallAvgTemp }
   }
───────────────────────────────────────────────────────────────────────────── */

const INFLUENCE_COL = { 'Warm-Favoring': '#c0392b', 'Cold-Favoring': '#2980b9', 'None': '#7f8c8d' };
const INFLUENCE_ICON = { 'Warm-Favoring': '🌡↑', 'Cold-Favoring': '🌡↓', 'None': '—' };
const SENSITIVITY_COL = { Strong: '#c0392b', Moderate: '#e67e22', Weak: '#7f8c8d' };

export async function renderTemperatureActivity(el, data) {
  const { pests = [], heatMap = [], summary = {} } = data;
  const unit = getUser()?.temperatureUnit || 'C';
  const deg  = unit === 'F' ? '°F' : '°C';

  if (!pests.length) {
    el.innerHTML = emptyState('🌡', 'No temperature data',
      'No scouting sessions with temperature recorded were found in the selected period. Ensure scouts record temperature during sessions.');
    return;
  }

  const kpi = (label, value, colour, sub = '', tooltip = '') => `
    <div class="card card-p${tooltip ? ' has-kpi-tip' : ''}" style="flex:1;min-width:130px;"${tooltip ? ` data-kpi-tip="${tooltip}"` : ''}>
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Groups observation counts into 5°C temperature bands to reveal each pest's <strong>optimal temperature range</strong>. Pearson correlation and OLS regression quantify whether the pest responds to temperature: <strong>Warm-Favoring</strong> pests increase in warmer conditions; <strong>Cold-Favoring</strong> pests peak in cooler weather. The global heat map at the bottom shows combined activity of all pests across the temperature spectrum.</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${kpi('Pests Analysed',   summary.totalPests      ?? 0, 'var(--text)',  'with temperature data',      'Number of pest species with enough temperature-linked session data to calculate a correlation and determine temperature preference.')}
      ${kpi('Warm-Favoring',    summary.tempSensitive   ?? 0, '#c0392b',     'higher counts in warm temps', 'Pests with a positive temperature correlation — activity and counts tend to increase as temperatures rise. Warm weather periods are a trigger for monitoring these species.')}
      ${kpi('Cold-Favoring',    summary.coldFavoring    ?? 0, '#2980b9',     'higher counts in cool temps', 'Pests with a negative temperature correlation — they are more active in cooler conditions. Watch these species during cool spells and early spring/autumn periods.')}
      ${kpi('Avg Temp (period)', convTemp(summary.overallAvgTemp, unit) + deg, 'var(--accent)', `${summary.dataPoints ?? 0} data points`, 'The average temperature recorded across all scouting sessions in the selected period, based on session-level temperature fields.')}
    </div>`;

  const rows = pests.map(p => {
    const infCol  = INFLUENCE_COL[p.influence]  ?? '#888';
    const senCol  = SENSITIVITY_COL[p.sensitivity] ?? '#888';
    const slope   = convSlope(p.slopePerDegC, unit);
    const corr    = p.correlation  > 0 ? `+${p.correlation}`  : `${p.correlation}`;

    const bucketBars = (p.buckets ?? []).map(b => {
      const max = Math.max(...(p.buckets ?? []).map(x => x.avgCount), 1);
      const pct = Math.round((b.avgCount / max) * 100);
      return `
        <div style="margin-bottom:4px;">
          <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--text-dim);margin-bottom:2px;">
            <span>${convRange(b.tempRange, unit)}${deg}</span>
            <span>${b.avgCount} avg (${b.observations})</span>
          </div>
          <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${infCol};border-radius:3px;"></div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="card card-p" style="border-left:4px solid ${infCol};margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">${escapeHtml(p.pestName)}</div>
            <div style="font-size:0.78rem;color:var(--text-dim);">${p.dataPoints} data points · avg count ${p.avgCount} · avg temp ${convTemp(p.avgTemp, unit)}${deg}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${infCol}22;color:${infCol};">
              ${INFLUENCE_ICON[p.influence] ?? ''} ${escapeHtml(p.influence)}
            </span>
            <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${senCol}22;color:${senCol};">
              ${escapeHtml(p.sensitivity)} correlation
            </span>
          </div>
        </div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:0.82rem;margin-bottom:10px;">
          <span style="color:var(--text-dim);cursor:help;" title="Pearson correlation coefficient between session temperature and pest count. Range −1 to +1. Positive = warmer conditions mean higher counts; negative = cooler conditions mean higher counts. Values below ±0.2 are treated as no meaningful relationship.">Pearson r: <strong>${corr}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="OLS regression slope: how much the average pest count changes per 1 degree increase in temperature. E.g. +0.4 means each extra degree is associated with 0.4 more pests counted on average.">Slope: <strong>${slope} per ${deg}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="The 5-degree temperature band where this pest's average count was highest across the selected period. Not a strict biological optimum — it reflects the temperature range most associated with high scouting counts in your data.">Optimal range: <strong>${convRange(p.optimalTempRange, unit)}${deg}</strong></span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Count by temperature band</div>
        ${bucketBars}
      </div>`;
  }).join('');

  // Global heat map
  const heatMapMax = Math.max(...heatMap.map(b => b.avgCount), 1);
  const heatMapRows = heatMap.map(b => {
    const pct = Math.round((b.avgCount / heatMapMax) * 100);
    return `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:8px 10px;font-weight:600;">${convRange(b.tempRange, unit)}${deg}</td>
        <td style="padding:8px 10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:10px;background:var(--border);border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:4px;"></div>
            </div>
            <span style="font-size:0.8rem;font-weight:700;min-width:36px;text-align:right;">${b.avgCount}</span>
          </div>
        </td>
        <td style="padding:8px 10px;text-align:right;font-size:0.8rem;">${b.observations}</td>
        <td style="padding:8px 10px;text-align:right;font-size:0.8rem;">${b.pestCount}</td>
      </tr>`;
  }).join('');

  el.innerHTML = `
    ${kpis}
    <div style="margin-bottom:20px;">
      ${rows}
    </div>
    <div class="card card-p">
      <div style="font-weight:700;font-size:0.88rem;margin-bottom:14px;">🌡 Global Temperature Heat Map — All Pests Combined</div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
          <thead>
            <tr style="border-bottom:2px solid var(--border);">
              <th style="padding:8px 10px;text-align:left;color:var(--text-dim);">Temp Band</th>
              <th style="padding:8px 10px;text-align:left;color:var(--text-dim);">Avg Count</th>
              <th style="padding:8px 10px;text-align:right;color:var(--text-dim);">Sessions</th>
              <th style="padding:8px 10px;text-align:right;color:var(--text-dim);">Pests</th>
            </tr>
          </thead>
          <tbody>${heatMapRows}</tbody>
        </table>
      </div>
    </div>`;
}
