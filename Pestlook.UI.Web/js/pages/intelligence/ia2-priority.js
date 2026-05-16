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
  function scoreBar(label, value, max, colour) {
    const w = Math.min(100, value / max * 100);
    return `
      <div style="margin-bottom:4px;">
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-dim);margin-bottom:2px;">
          <span>${label}</span><span>${value.toFixed(1)} / ${max}</span>
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
          <span style="color:var(--text-dim);">Last visit: <strong style="color:var(--text);">${lastVisit}</strong></span>
          <span style="color:var(--text-dim);">Breaches: <strong style="color:${f.recentBreaches > 0 ? '#c0392b' : 'var(--text)'};">${f.recentBreaches}</strong></span>
          <span style="color:var(--text-dim);">Total obs: <strong style="color:var(--text);">${f.totalObsCount.toLocaleString()}</strong></span>
          <span style="color:var(--text-dim);">Growth rate: <strong style="color:${f.growthRate > 0 ? '#e67e22' : '#27ae60'};">${f.growthRate > 0 ? '+' : ''}${(f.growthRate * 100).toFixed(0)}%/wk</strong></span>
        </div>

        <div style="display:flex;flex-direction:column;gap:0;">
          ${scoreBar('Population trend', f.trendScore, 40, '#e74c3c')}
          ${scoreBar('Days since visit',  f.recencyScore, 35, '#e67e22')}
          ${scoreBar('Recent breaches',   f.breachScore, 25, '#c0392b')}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
      Fields are ranked by a composite score (max 100) combining population growth rate (40 pts), days since last scouting visit (35 pts), and number of recent threshold breaches (25 pts). Visit the highest-scoring fields first.
    </div>
    ${kpis}
    <div>${rows}</div>`;
}
