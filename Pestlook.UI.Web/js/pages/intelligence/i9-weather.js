import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   I9 — Weather-Correlated Risk Index
   data = { pests: [{ pestId, pestName, dataPoints, correlation, tempInfluence,
              slopePerDegree, optimalTempRange, currentTempAvg, projectedCount,
              threshold, riskIndex, riskLevel,
              temperatureProfile: [{ tempRange, avgCount, observations }] }],
            summary: { totalPests, highRisk, dataPoints, currentTempAvg } }
───────────────────────────────────────────────────────────────────────────── */

const RISK_COLOUR = { High: '#c0392b', Medium: '#e67e22', Low: '#27ae60' };
const INFLUENCE_ICON = { Positive: '🌡↑', Negative: '🌡↓', None: '—' };

export async function renderWeatherRisk(el, data) {
  const { pests = [], summary = {} } = data;

  if (!pests.length) {
    el.innerHTML = emptyState('🌡', 'No data',
      'No temperature data found. Ensure scouting sessions have temperature recorded.');
    return;
  }

  const colour = r => RISK_COLOUR[r] ?? '#888';

  const kpis = `
    <div style="font-size:0.75rem;color:var(--text-dim);line-height:1.6;margin-bottom:16px;">
      Correlates the temperature recorded on scouting sessions with observed pest counts using Pearson correlation and OLS regression.
      <strong>Positive</strong> influence = pest is more active in warmer conditions · <strong>Negative</strong> = favours cooler temperatures.
      The <strong>risk index</strong> projects each pest's expected count at the recent average temperature (last 10 sessions) and divides by the action threshold — values near or above 1.0 mean current conditions are conducive to a breach.
      <strong>Peak Range</strong> shows the temperature band where the 5 highest individual counts were recorded.
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
      <div class="card card-p has-kpi-tip" style="text-align:center;" data-kpi-tip="Number of pest species for which Pearson correlation and OLS regression could be calculated from temperature-recorded scouting sessions.">
        <div style="font-size:1.8rem;font-weight:700;">${summary.totalPests ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Pests Analysed</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid #c0392b;" data-kpi-tip="Pest species where the projected count at the current average temperature equals or exceeds the configured action threshold — current conditions are conducive to a population breach.">
        <div style="font-size:1.8rem;font-weight:700;color:#c0392b;">${summary.highRisk ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">High Risk</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid var(--accent);" data-kpi-tip="The average temperature from the 10 most recent scouting sessions, used as the 'current conditions' input for projecting pest counts via the regression model.">
        <div style="font-size:1.8rem;font-weight:700;">${summary.currentTempAvg ?? '—'}°C</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Current Avg Temp</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;" data-kpi-tip="Total number of individual session observations used to build the temperature regression models across all analysed pest species.">
        <div style="font-size:1.8rem;font-weight:700;">${summary.dataPoints ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Data Points</div>
      </div>
    </div>
  `;

  const rows = pests.map(p => {
    const profile = (p.temperatureProfile ?? []).map(b => `
      <div style="display:inline-block;margin:2px 4px;padding:2px 6px;border-radius:6px;
        font-size:0.7rem;background:var(--surface-alt,var(--surface));border:1px solid var(--border);">
        ${escapeHtml(b.tempRange)}: <strong>${b.avgCount}</strong>
        <span style="color:var(--text-dim);">(${b.observations})</span>
      </div>
    `).join('');

    return `
      <tr style="border-bottom:1px solid var(--border);vertical-align:top;">
        <td style="padding:10px 10px;font-weight:700;">${escapeHtml(p.pestName)}</td>
        <td style="padding:10px 10px;text-align:right;">${p.dataPoints}</td>
        <td style="padding:10px 10px;text-align:center;">${INFLUENCE_ICON[p.tempInfluence] ?? p.tempInfluence}</td>
        <td style="padding:10px 10px;text-align:right;">${p.slopePerDegree > 0 ? '+' : ''}${p.slopePerDegree}</td>
        <td style="padding:10px 10px;text-align:center;">${escapeHtml(p.optimalTempRange ?? '—')}</td>
        <td style="padding:10px 10px;text-align:right;">${p.projectedCount}</td>
        <td style="padding:10px 10px;text-align:right;">${p.threshold || '—'}</td>
        <td style="padding:10px 10px;text-align:right;font-weight:700;">
          <span style="color:${colour(p.riskLevel)};">${p.riskIndex}</span>
        </td>
        <td style="padding:10px 10px;">
          <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700;
            background:${colour(p.riskLevel)}22;color:${colour(p.riskLevel)};">${p.riskLevel}</span>
        </td>
        <td style="padding:10px 10px;font-size:0.75rem;">${profile || '<span style="color:var(--text-dim);">—</span>'}</td>
      </tr>
    `;
  }).join('');

  el.innerHTML = `
    ${kpis}
    <div class="card card-p" style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);text-align:left;">
            <th style="padding:8px 10px;color:var(--text-dim);" title="Pest species analysed">Pest</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;" title="Number of observations used to build the regression model for this pest">Points</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:center;" title="Positive = pest count increases with temperature · Negative = count increases in cooler conditions · None = weak or no correlation (|r| < 0.2)">Temp Influence</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;" title="OLS regression slope — how many additional pests are expected per 1°C increase in temperature. Negative values mean fewer pests as it warms.">Slope/°C</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:center;" title="Temperature range where the 5 highest individual pest counts were recorded">Peak Range</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;" title="Expected pest count at the current average temperature (last 10 sessions), derived from the regression model">Projected</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;" title="Configured action threshold for this pest — the count above which treatment is warranted">Threshold</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;" title="Projected count ÷ threshold — values near or above 1.0 mean current temperatures are conducive to a threshold breach">Risk Index</th>
            <th style="padding:8px 10px;color:var(--text-dim);" title="High (≥ 0.8) = act now · Medium (0.4–0.79) = monitor closely · Low (< 0.4) = routine scouting">Risk</th>
            <th style="padding:8px 10px;color:var(--text-dim);" title="Average pest count grouped by 5°C temperature buckets, with number of observations in parentheses">Temp Profile</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
