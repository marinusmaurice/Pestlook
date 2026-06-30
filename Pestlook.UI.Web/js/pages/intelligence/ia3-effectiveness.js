import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   A3 — Treatment Effectiveness Scoring
   data = {
     scores: [{ pestId, pestName, fieldId, fieldName, farmName, threshold,
       breachCount, preBreachAvg, postBreachAvg, percentChange,
       effectiveness, dataQuality }],
     summary: { total, effective, partial, ineffective, insufficient }
   }
───────────────────────────────────────────────────────────────────────────── */

const EFF_COL = {
  'Effective':            '#27ae60',
  'Partially Effective':  '#e67e22',
  'Ineffective':          '#c0392b',
  'Insufficient Data':    '#7f8c8d',
};
const EFF_ICON = {
  'Effective':            '✅',
  'Partially Effective':  '⚠️',
  'Ineffective':          '❌',
  'Insufficient Data':    '❓',
};

export async function renderTreatmentEffectiveness(el, data) {
  const { scores = [], summary = {} } = data;

  if (!scores.length) {
    el.innerHTML = emptyState('📊', 'No effectiveness data', 'No threshold breaches found for the selected period. This analysis requires at least one breach event with scouting sessions both before and after it.');
    return;
  }

  const kpi = (label, value, colour, sub = '', tooltip = '') => `
    <div class="card card-p${tooltip ? ' has-kpi-tip' : ''}" style="flex:1;min-width:120px;"${tooltip ? ` data-kpi-tip="${tooltip}"` : ''}>
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${kpi('Total Analysed',    summary.total        ?? 0, 'var(--text)', '',     'Total number of pest × field combinations evaluated — each combination must have at least one threshold breach with scouting sessions both before and after it.')}
      ${kpi('Effective',         summary.effective    ?? 0, '#27ae60', '≥50% reduction',     'Combinations where post-breach average counts fell by 50% or more compared to pre-breach averages — suggesting the applied control was successful.')}
      ${kpi('Partially Effective', summary.partial    ?? 0, '#e67e22', '20–49% reduction',   'Combinations showing a 20–49% reduction in pest counts after a breach — some improvement but the control may need to be repeated or strengthened.')}
      ${kpi('Ineffective',       summary.ineffective  ?? 0, '#c0392b', '<20% reduction',     'Combinations where counts declined by less than 20% after a breach — the current treatment approach shows little to no measurable effect.')}
      ${kpi('Insufficient Data', summary.insufficient ?? 0, '#7f8c8d', 'no follow-up sessions', 'Combinations where a breach was recorded but no scouting session followed within the measurement window, making effectiveness impossible to assess.')}
    </div>`;

  const rows = scores.map(s => {
    const col  = EFF_COL[s.effectiveness]  ?? 'var(--text)';
    const icon = EFF_ICON[s.effectiveness] ?? '?';
    const pctCol = s.percentChange <= -50 ? '#27ae60'
                 : s.percentChange <= -20 ? '#e67e22'
                 : s.percentChange <= 0   ? '#f39c12'
                 : '#c0392b';

    // Visual before/after bars (pre/post are session-day sums; threshold is per-obs and not comparable on same scale)
    const maxVal = Math.max(s.preBreachAvg, s.postBreachAvg, 1);
    const preW   = Math.min(100, s.preBreachAvg  / maxVal * 100);
    const postW  = Math.min(100, s.postBreachAvg / maxVal * 100);

    return `
      <div class="card card-p" style="border-left:4px solid ${col};margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-weight:700;color:var(--text);font-size:0.95rem;">${icon} ${escapeHtml(s.pestName)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(s.fieldName)} — ${escapeHtml(s.farmName ?? '')}</div>
          </div>
          <div style="text-align:right;">
            <span style="padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${col}22;color:${col};">${s.effectiveness}</span>
            <div style="font-size:0.78rem;color:var(--text-dim);margin-top:4px;">${s.breachCount} breach${s.breachCount === 1 ? '' : 'es'} recorded</div>
          </div>
        </div>

        <!-- Before / After comparison bars -->
        <div style="margin:12px 0;">
          <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;">Before vs After Breach</div>
          <div style="margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-dim);margin-bottom:3px;">
              <span style="cursor:help;" title="Average total pest count per scouting day across the two sessions immediately before the first threshold breach. Each day's value is the sum of all observations recorded on that day.">Pre-breach avg</span><span><strong>${s.preBreachAvg.toLocaleString()}</strong></span>
            </div>
            <div style="height:10px;background:var(--border);border-radius:5px;overflow:hidden;">
              <div style="height:100%;width:${preW}%;background:#3498db;border-radius:5px;"></div>
            </div>
          </div>
          <div style="margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-dim);margin-bottom:3px;">
              <span style="cursor:help;" title="Average total pest count per scouting day across the two sessions immediately after the breach. A lower value than the pre-breach average suggests the control response was effective.">Post-breach avg</span><span><strong>${s.postBreachAvg.toLocaleString()}</strong></span>
            </div>
            <div style="height:10px;background:var(--border);border-radius:5px;overflow:hidden;">
              <div style="height:100%;width:${postW}%;background:${col};border-radius:5px;"></div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.82rem;margin-bottom:8px;">
          <span style="color:var(--text-dim);cursor:help;" title="Action threshold per observation: ${s.threshold.toLocaleString()}. A single scout recording this count or above constitutes a breach. Not shown on the bars above — the bars use session-day totals which are a different scale.">Threshold: <strong style="color:var(--text);">${s.threshold.toLocaleString()} per obs</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Percentage change from pre-breach average to post-breach average. Negative means pest counts fell after the breach response — the more negative, the more effective the control.">Change: <strong style="color:${pctCol};">${s.percentChange > 0 ? '+' : ''}${s.percentChange.toFixed(1)}%</strong></span>
        </div>

        <div style="font-size:0.75rem;color:var(--text-dim);font-style:italic;">${escapeHtml(s.dataQuality)}</div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
      For each pest × field combination with a threshold breach, this tab compares average pest counts in the two scouting sessions before the breach versus the two sessions after. A ≥50% reduction is scored <strong>Effective</strong>; 20–49% is <strong>Partially Effective</strong>; less than 20% is <strong>Ineffective</strong>.
    </div>
    ${kpis}
    <div>${rows}</div>`;
}
