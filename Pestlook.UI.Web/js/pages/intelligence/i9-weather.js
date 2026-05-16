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
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Correlates the temperature recorded on scouting sessions with observed pest counts using Pearson correlation and OLS regression. A <strong>Positive</strong> influence means the pest is more active in warmer conditions; <strong>Negative</strong> means it favours cooler temperatures. The risk index projects each pest's expected count at the current average temperature and compares it to the configured action threshold.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
      <div class="card card-p has-kpi-tip" style="text-align:center;" data-kpi-tip="Number of pest species for which Pearson correlation and OLS regression could be calculated from temperature-recorded scouting sessions.">
        <div style="font-size:1.8rem;font-weight:700;">${summary.totalPests ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Pests Analysed</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid #c0392b;" data-kpi-tip="Pest species where the projected count at the current average temperature equals or exceeds the configured action threshold — current conditions are conducive to a population breach.">
        <div style="font-size:1.8rem;font-weight:700;color:#c0392b;">${summary.highRisk ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">High Risk</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid var(--accent);" data-kpi-tip="The average temperature recorded across all scouting sessions in the selected period, used to project pest counts using the regression model.">
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
            <th style="padding:8px 10px;color:var(--text-dim);">Pest</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Points</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:center;">Temp Influence</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Slope/°C</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:center;">Peak Range</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Projected</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Threshold</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Risk Index</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Risk</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Temp Profile</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
