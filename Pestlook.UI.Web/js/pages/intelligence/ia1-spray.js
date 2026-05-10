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
  const kpi = (label, value, colour, sub = '') => `
    <div class="card card-p" style="flex:1;min-width:130px;">
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${kpi('Total Tracked',  summary.total   ?? 0, 'var(--text)')}
      ${kpi('Urgent / Immediate', summary.urgent ?? 0, '#c0392b', 'act within 14 days')}
      ${kpi('Upcoming',       summary.upcoming ?? 0, '#e67e22', 'act within 6 weeks')}
      ${kpi('Monitor',        summary.monitor  ?? 0, '#27ae60', 'rising but not imminent')}
    </div>`;

  const rows = recommendations.map(r => {
    const col = URGENCY_COLOUR[r.urgency] ?? 'var(--text)';
    const bg  = URGENCY_BG[r.urgency]    ?? 'transparent';
    const pct = r.threshold > 0 ? Math.round(r.currentCount / r.threshold * 100) : 0;
    const barW = Math.min(100, pct);
    const barCol = pct >= 100 ? '#c0392b' : pct >= 70 ? '#e67e22' : '#3498db';

    return `
      <div class="card card-p" style="border-left:4px solid ${col};margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-weight:700;color:var(--text);font-size:0.95rem;">${escapeHtml(r.pestName)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(r.fieldName)} — ${escapeHtml(r.farmName ?? '')}</div>
          </div>
          <span style="padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${bg};color:${col};white-space:nowrap;">${r.urgency}</span>
        </div>

        <!-- Progress bar: current vs threshold -->
        <div style="margin:10px 0 4px;">
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-dim);margin-bottom:4px;">
            <span>Current: <strong style="color:var(--text);">${r.currentCount.toLocaleString()}</strong></span>
            <span>Threshold: <strong style="color:var(--text);">${r.threshold.toLocaleString()}</strong></span>
          </div>
          <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${barW}%;background:${barCol};border-radius:4px;transition:width .3s;"></div>
          </div>
          <div style="font-size:0.72rem;color:var(--text-dim);margin-top:3px;">${pct}% of threshold</div>
        </div>

        <!-- Projections -->
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin:8px 0;font-size:0.8rem;">
          <span style="color:var(--text-dim);">Trend: <strong style="color:${r.weeklySlope > 0 ? '#e67e22' : '#27ae60'};">${r.weeklySlope > 0 ? '+' : ''}${r.weeklySlope}/wk</strong></span>
          <span style="color:var(--text-dim);">4-wk projection: <strong style="color:var(--text);">${r.projectedAt4Weeks.toLocaleString()}</strong></span>
          <span style="color:var(--text-dim);">8-wk projection: <strong style="color:${r.multiplierAt8Weeks >= 1 ? '#c0392b' : 'var(--text)'};">${r.projectedAt8Weeks.toLocaleString()} (${r.multiplierAt8Weeks}× threshold)</strong></span>
          ${r.weeksUntilBreach < 99 ? `<span style="color:var(--text-dim);">Breach in: <strong style="color:${col};">${r.weeksUntilBreach === 0 ? 'Now' : r.weeksUntilBreach + ' wk'}</strong></span>` : ''}
        </div>

        <!-- Recommendation -->
        <div style="background:${bg};border-radius:6px;padding:8px 12px;font-size:0.83rem;color:var(--text);">
          🎯 ${escapeHtml(r.action)}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
      Based on a linear regression of weekly observation counts, this tab identifies pest × field combinations on a rising trend and calculates the treatment window before the population is projected to breach its configured action threshold.
    </div>
    ${kpis}
    <div>${rows}</div>`;
}
