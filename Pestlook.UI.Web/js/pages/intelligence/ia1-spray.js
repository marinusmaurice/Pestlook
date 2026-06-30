import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   A1 — Spray Timing Recommendation
   data = {
     recommendations: [{ pestId, pestName, fieldId, fieldName, farmName,
       currentCount, threshold, weeklySlope, weeksUntilBreach,
       projectedAt4Weeks, projectedAt8Weeks, multiplierAt8Weeks,
       urgency, action, dataPoints }],
     summary: { total, urgent, upcoming, monitor }
   }
───────────────────────────────────────────────────────────────────────────── */

const URGENCY_COLOUR = {
  Immediate: '#c0392b',
  Urgent:    '#e67e22',
  Upcoming:  '#f39c12',
  Monitor:   '#27ae60',
};
const URGENCY_BG = {
  Immediate: 'rgba(192,57,43,0.12)',
  Urgent:    'rgba(230,126,34,0.12)',
  Upcoming:  'rgba(243,156,18,0.12)',
  Monitor:   'rgba(39,174,96,0.12)',
};

export async function renderSprayTiming(el, data) {
  const { recommendations = [], summary = {} } = data;

  if (!recommendations.length) {
    el.innerHTML = emptyState('🌿', 'No spray timing data', 'No rising pest populations found for the selected filters. Either all populations are stable or declining, or there is insufficient observation history.');
    return;
  }

  // KPI cards
  const kpi = (label, value, colour, sub = '', tooltip = '') => `
    <div class="card card-p${tooltip ? ' has-kpi-tip' : ''}" style="flex:1;min-width:130px;cursor:default;"${tooltip ? ` data-kpi-tip="${tooltip}"` : ''}>
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${kpi('Total Tracked',  summary.total   ?? 0, 'var(--text)',  '', 'Total number of pest-field combinations being monitored for spray timing recommendations.')}
      ${kpi('Urgent / Immediate', summary.urgent ?? 0, '#c0392b', 'act within 14 days', 'Pest populations growing fast enough that intervention is recommended within the next 14 days to prevent threshold breach.')}
      ${kpi('Upcoming',       summary.upcoming ?? 0, '#e67e22', 'act within 6 weeks',  'Populations on a rising trend projected to reach action levels within approximately 6 weeks.')}
      ${kpi('Monitor',        summary.monitor  ?? 0, '#27ae60', 'rising but not imminent', 'Populations that are increasing but remain well below the action threshold — continue monitoring.')}
    </div>`;

  const rows = recommendations.map(r => {
    const col = URGENCY_COLOUR[r.urgency] ?? 'var(--text)';
    const bg  = URGENCY_BG[r.urgency]    ?? 'transparent';

    return `
      <div class="card card-p" style="border-left:4px solid ${col};margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-weight:700;color:var(--text);font-size:0.95rem;">${escapeHtml(r.pestName)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(r.fieldName)} — ${escapeHtml(r.farmName ?? '')}</div>
          </div>
          <span style="padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${bg};color:${col};white-space:nowrap;">${r.urgency}</span>
        </div>

        <!-- Weekly trend stats -->
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin:10px 0;font-size:0.8rem;">
          <span style="color:var(--text-dim);cursor:help;" title="The configured action threshold for a single observation in this field. When a scout records a count at or above this number, intervention is required.">Threshold: <strong style="color:var(--text);">${r.threshold.toLocaleString()}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="The OLS-projected average count per observation for the current week. Compares directly to the threshold — when this reaches the threshold, a typical scout visit will see action-level counts.">Avg now: <strong style="color:var(--text);">${r.currentCount.toLocaleString()}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Weekly change in average observation count, derived from the OLS regression slope. Positive means the population is growing; negative means it is declining.">Trend: <strong style="color:${r.weeklySlope > 0 ? '#e67e22' : '#27ae60'};">${r.weeklySlope > 0 ? '+' : ''}${r.weeklySlope}/wk</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Projected average count per observation 4 weeks from now if the current trend continues unchanged.">4-wk projection: <strong style="color:var(--text);">${r.projectedAt4Weeks.toLocaleString()}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Projected average count per observation 8 weeks from now if the current trend continues unchanged.">8-wk projection: <strong style="color:var(--text);">${r.projectedAt8Weeks.toLocaleString()}</strong></span>
          ${r.weeksUntilBreach < 99 ? `<span style="color:var(--text-dim);cursor:help;" title="Weeks until the OLS trend line is projected to cross the action threshold. 'Now' means the current average is already at or above threshold.">Trend breach in: <strong style="color:${col};">${r.weeksUntilBreach === 0 ? 'Now' : r.weeksUntilBreach + ' wk'}</strong></span>` : ''}
        </div>

        <!-- Recommendation -->
        <div style="background:${bg};border-radius:6px;padding:8px 12px;font-size:0.83rem;color:var(--text);">
          🎯 ${escapeHtml(r.action)}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
      Groups observations by week and calculates the <strong>average count per observation</strong> — the same unit as the per-observation action threshold. A linear regression (OLS) on those weekly averages identifies pest × field combinations on a rising trend and projects how many weeks before the average observation is expected to breach the threshold.
    </div>
    ${kpis}
    <div>${rows}</div>`;
}
