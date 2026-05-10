import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

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

  if (!pests.length) {
    el.innerHTML = emptyState('🌡', 'No temperature data',
      'No scouting sessions with temperature recorded were found in the selected period. Ensure scouts record temperature during sessions.');
    return;
  }

  const kpi = (label, value, colour, sub = '') => `
    <div class="card card-p" style="flex:1;min-width:130px;">
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Groups observation counts into 5°C temperature bands to reveal each pest's <strong>optimal temperature range</strong>. Pearson correlation and OLS regression quantify whether the pest responds to temperature: <strong>Warm-Favoring</strong> pests increase in warmer conditions; <strong>Cold-Favoring</strong> pests peak in cooler weather. The global heat map at the bottom shows combined activity of all pests across the temperature spectrum.</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${kpi('Pests Analysed',   summary.totalPests      ?? 0, 'var(--text)',  'with temperature data')}
      ${kpi('Warm-Favoring',    summary.tempSensitive   ?? 0, '#c0392b',     'higher counts in warm temps')}
      ${kpi('Cold-Favoring',    summary.coldFavoring    ?? 0, '#2980b9',     'higher counts in cool temps')}
      ${kpi('Avg Temp (period)', (summary.overallAvgTemp ?? '—') + '°C', 'var(--accent)', `${summary.dataPoints ?? 0} data points`)}
    </div>`;

  const rows = pests.map(p => {
    const infCol  = INFLUENCE_COL[p.influence]  ?? '#888';
    const senCol  = SENSITIVITY_COL[p.sensitivity] ?? '#888';
    const slope   = p.slopePerDegC > 0 ? `+${p.slopePerDegC}` : `${p.slopePerDegC}`;
    const corr    = p.correlation  > 0 ? `+${p.correlation}`  : `${p.correlation}`;

    const bucketBars = (p.buckets ?? []).map(b => {
      const max = Math.max(...(p.buckets ?? []).map(x => x.avgCount), 1);
      const pct = Math.round((b.avgCount / max) * 100);
      return `
        <div style="margin-bottom:4px;">
          <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--text-dim);margin-bottom:2px;">
            <span>${escapeHtml(b.tempRange)}</span>
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
            <div style="font-size:0.78rem;color:var(--text-dim);">${p.dataPoints} sessions · avg count ${p.avgCount} · avg temp ${p.avgTemp}°C</div>
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
          <span style="color:var(--text-dim);">Pearson r: <strong>${corr}</strong></span>
          <span style="color:var(--text-dim);">Slope: <strong>${slope} per °C</strong></span>
          <span style="color:var(--text-dim);">Optimal range: <strong>${escapeHtml(p.optimalTempRange ?? '—')}</strong></span>
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
        <td style="padding:8px 10px;font-weight:600;">${escapeHtml(b.tempRange)}</td>
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
