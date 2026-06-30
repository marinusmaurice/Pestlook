import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   A2 — Scout Priority Queue
   data = {
     fields: [{ fieldId, fieldName, farmName, priorityScore, urgency,
       growthRate, daysSinceLastSession, recentBreaches, totalObsCount,
       trendScore, recencyScore, breachScore, rank }],
     summary: { totalFields, critical, high, medium, low }
   }
───────────────────────────────────────────────────────────────────────────── */

const URG_COL = { Critical: '#c0392b', High: '#e67e22', Medium: '#f39c12', Low: '#27ae60' };
const URG_BG  = {
  Critical: 'rgba(192,57,43,0.1)',
  High:     'rgba(230,126,34,0.1)',
  Medium:   'rgba(243,156,18,0.1)',
  Low:      'rgba(39,174,96,0.08)',
};

export async function renderScoutPriority(el, data) {
  const { fields = [], summary = {} } = data;

  if (!fields.length) {
    el.innerHTML = emptyState('📋', 'No priority data', 'No fields found for the selected filters. Ensure scouting sessions and observations have been recorded.');
    return;
  }

  const kpi = (label, value, colour, sub = '', tooltip = '') => `
    <div class="card card-p${tooltip ? ' has-kpi-tip' : ''}" style="flex:1;min-width:120px;cursor:default;"${tooltip ? ` data-kpi-tip="${tooltip}"` : ''}>
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${kpi('Total Fields',  summary.totalFields ?? 0, 'var(--text)',  '', 'Total number of fields evaluated for scouting priority in the selected period.')}
      ${kpi('Critical',      summary.critical    ?? 0, '#c0392b', 'visit today',      'Fields where pest counts have exceeded the alert threshold — immediate scouting visit required today.')}
      ${kpi('High',          summary.high        ?? 0, '#e67e22', 'visit this week',  'Fields approaching threshold levels — a scouting visit is recommended within the current week.')}
      ${kpi('Medium',        summary.medium      ?? 0, '#f39c12',  '',                'Fields with elevated but below-threshold pest activity — schedule a visit in the coming weeks.')}
      ${kpi('Low',           summary.low         ?? 0, '#27ae60',  '',                'Fields with low or stable pest counts — routine monitoring schedule is sufficient.')}
    </div>`;

  // Score breakdown bar
  function scoreBar(label, value, max, colour, tooltip = '') {
    const w = Math.min(100, value / max * 100);
    const tip = tooltip ? ` title="${tooltip}" style="cursor:help;"` : '';
    return `
      <div style="margin-bottom:4px;">
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-dim);margin-bottom:2px;">
          <span${tip}>${label}</span><span>${value.toFixed(1)} / ${max}</span>
        </div>
        <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${w}%;background:${colour};border-radius:3px;"></div>
        </div>
      </div>`;
  }

  const rows = fields.map(f => {
    const col = URG_COL[f.urgency] ?? 'var(--text)';
    const bg  = URG_BG[f.urgency]  ?? 'transparent';
    const lastVisit = f.daysSinceLastSession < 0
      ? '<em style="color:#e67e22;">Never visited</em>'
      : f.daysSinceLastSession === 0
        ? 'Today'
        : `${f.daysSinceLastSession} day${f.daysSinceLastSession === 1 ? '' : 's'} ago`;

    return `
      <div class="card card-p" style="border-left:4px solid ${col};margin-bottom:8px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="min-width:36px;height:36px;border-radius:50%;background:${bg};border:2px solid ${col};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;color:${col};">${f.rank}</div>
            <div>
              <div style="font-weight:700;color:var(--text);font-size:0.92rem;">${escapeHtml(f.fieldName)}</div>
              <div style="font-size:0.78rem;color:var(--text-dim);">${escapeHtml(f.farmName ?? '')}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <span style="padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${bg};color:${col};">${f.urgency}</span>
            <div style="font-size:0.8rem;color:var(--text-dim);margin-top:4px;">Score: <strong style="color:var(--text);">${f.priorityScore.toFixed(0)}/100</strong></div>
          </div>
        </div>

        <div style="display:flex;gap:16px;flex-wrap:wrap;margin:10px 0;font-size:0.8rem;">
          <span style="color:var(--text-dim);cursor:help;" title="Date of the most recent completed scouting session for this field within the selected period.">Last visit: <strong style="color:var(--text);">${lastVisit}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Number of individual observation records where the pest count exceeded that pest's configured action threshold. Counted across all pest species in this field.">Breaches: <strong style="color:${f.recentBreaches > 0 ? '#c0392b' : 'var(--text)'};">${f.recentBreaches}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Sum of all pest counts recorded across every observation in this field during the selected period — not the number of individual observations.">Total count: <strong style="color:var(--text);">${f.totalObsCount.toLocaleString()}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Week-over-week growth rate of the total weekly pest count (OLS slope ÷ mean). Positive means populations are rising; negative means declining.">Growth rate: <strong style="color:${f.growthRate > 0 ? '#e67e22' : '#27ae60'};">${f.growthRate > 0 ? '+' : ''}${(f.growthRate * 100).toFixed(0)}%/wk</strong></span>
        </div>

        <div style="display:flex;flex-direction:column;gap:0;">
          ${scoreBar('Population trend (max 40)', f.trendScore, 40, '#e74c3c',
            '0–40 pts. How fast is the combined pest count growing? A linear regression (OLS) is run on the weekly total pest counts for this field. The slope (change per week) is divided by the mean to get a relative growth rate. Score = growth rate × 100, capped at 40. Declining or stable = 0 pts. Growing at +10%/wk = 10 pts; +40%/wk or faster = full 40 pts.')}
          ${scoreBar('Days since visit (max 35)',  f.recencyScore, 35, '#e67e22',
            '0–35 pts. How long has it been since this field was last scouted? Looks up the most recent completed scouting session for this field across all time — not just the filter period. Score increases linearly: 0 days = 0 pts, 15 days ≈ 17.5 pts, 30 days or more = full 35 pts. High score means your data is stale — you have no recent picture of what is happening in this field.')}
          ${scoreBar('Recent breaches (max 25)',   f.breachScore, 25, '#c0392b',
            '0–25 pts. How many times did pest counts exceed the action threshold in the selected period? Counts every individual observation record where the count was above that pest\'s configured threshold, across all pest species in this field. Each breach = 5 pts, capped at 25 pts (5 or more breaches = full score). High score means confirmed infestation history — warrants monitoring even if the current trend is declining.')}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
      Fields are ranked by a composite score (max 100) combining population growth rate (40 pts), days since last scouting visit (35 pts), and number of recent threshold breaches (25 pts). Visit the highest-scoring fields first.
    </div>
    ${kpis}
    <div>${rows}</div>`;
}
