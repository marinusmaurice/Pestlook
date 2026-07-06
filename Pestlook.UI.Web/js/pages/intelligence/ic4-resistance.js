import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   C4 — Resistance Pattern Detection
   data = {
     patterns: [{ pestId, pestName, fieldId, fieldName, farmName,
                  totalBreachYears, trend, resistanceRisk, rateChangePoints,
                  breachSeasons: [{ year, sessionCount, breachCount, breachRate, avgCount }],
                  recommendation }],
     summary: { totalPatterns, likelyResistance, possibleResistance,
                yearsAnalysed, dataNote }
   }
───────────────────────────────────────────────────────────────────────────── */

const RISK_COL  = { Likely: '#c0392b', Possible: '#e67e22', Monitor: '#7f8c8d' };
const RISK_BG   = { Likely: 'rgba(192,57,43,0.1)', Possible: 'rgba(230,126,34,0.08)', Monitor: 'rgba(127,140,141,0.07)' };
const TREND_COL = { Worsening: '#c0392b', Stable: '#e67e22', Improving: '#27ae60' };
const TREND_ICON = { Worsening: '📈', Stable: '➡️', Improving: '📉' };

const infoIcon = (tooltip) =>
  `<span style="font-size:0.7rem;color:var(--text-dim);cursor:help;margin-left:3px;opacity:0.7;" title="${tooltip}">&#9432;</span>`;

export async function renderResistancePatterns(el, data) {
  const { patterns = [], summary = {} } = data;

  if (!patterns.length) {
    el.innerHTML = emptyState('🧬', 'No resistance patterns detected',
      summary.dataNote ?? 'No field + pest combinations with threshold breaches across 2 or more calendar years were found. Widen the date range to at least 2 years.');
    return;
  }

  const kpi = (label, value, colour, sub = '', tooltip = '') => `
    <div class="card card-p${tooltip ? ' has-kpi-tip' : ''}" style="flex:1;min-width:130px;"${tooltip ? ` data-kpi-tip="${tooltip}"` : ''}>
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Flags field × pest combinations where threshold breaches have recurred across <strong>two or more calendar years</strong> without sustained improvement. A worsening breach rate year-on-year is a strong indicator that current control measures are losing effectiveness and that <strong>pesticide resistance testing</strong> or rotation of mode-of-action should be considered. No treatment records are required — the analysis is based entirely on observation counts and configured thresholds. <strong>The date filter applies:</strong> only observations within the selected range are included, so the range must span at least two calendar years for any patterns to appear. The default range is two years.</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      ${kpi('Patterns Found',       summary.totalPatterns      ?? 0, 'var(--text)', `over ${summary.yearsAnalysed ?? '?'} years`,
        'Total field × pest combinations with threshold breaches recorded across two or more distinct calendar years — indicating a persistent, recurring infestation rather than a one-off event.')}
      ${kpi('Likely Resistance',    summary.likelyResistance   ?? 0, '#c0392b',    '3+ breach years / worsening',
        'Combinations with breaches in three or more calendar years, or with a worsening year-on-year breach rate. Strong evidence that current treatments are losing effectiveness — consider pesticide rotation or resistance testing.')}
      ${kpi('Possible Resistance',  summary.possibleResistance ?? 0, '#e67e22',    '2 breach years',
        'Combinations with breaches recorded in exactly two distinct calendar years. A potential early warning of emerging resistance — review treatment mode-of-action and increase scouting frequency.')}
    </div>
    <div style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.75rem;color:var(--text-dim);margin-bottom:18px;">
      ℹ️ ${escapeHtml(summary.dataNote ?? '')}
    </div>`;

  const rows = patterns.map(p => {
    const riskCol   = RISK_COL[p.resistanceRisk]  ?? '#888';
    const riskBg    = RISK_BG[p.resistanceRisk]   ?? 'transparent';
    const trendCol  = TREND_COL[p.trend]           ?? '#888';
    const trendIcon = TREND_ICON[p.trend]          ?? '';

    const seasonMax = Math.max(...(p.breachSeasons ?? []).map(s => s.breachRate), 1);
    const seasonBars = (p.breachSeasons ?? []).map(s => {
      const pct    = Math.min(Math.round(s.breachRate / seasonMax * 100), 100);
      const barCol = s.breachRate >= 60 ? '#c0392b' : s.breachRate >= 30 ? '#e67e22' : '#27ae60';
      return `
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-dim);margin-bottom:3px;">
            <span style="font-weight:600;"
                  title="Calendar year (in your account timezone). Each year is a separate season in the analysis.">${s.year}</span>
            <span title="Obs = number of individual observation records for this pest on this field in this year (one per scouting session). Breaches = how many of those had a count above the configured threshold. Avg count = mean pest count per observation.">
              ${s.breachCount} breaches / ${s.sessionCount} obs
              · <strong style="color:${barCol};">${s.breachRate}%</strong>
              · avg count ${s.avgCount}
            </span>
          </div>
          <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;"
               title="Bar width = this year's breach rate relative to the highest year in this pattern (${seasonMax}% = 100%). Red ≥60%, orange ≥30%, green &lt;30%.">
            <div style="height:100%;width:${pct}%;background:${barCol};border-radius:4px;transition:width .3s;"></div>
          </div>
        </div>`;
    }).join('');

    const rateArrow = p.rateChangePoints >= 0 ? `+${p.rateChangePoints}` : `${p.rateChangePoints}`;

    return `
      <div class="card card-p" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">🧬 ${escapeHtml(p.pestName)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(p.fieldName)} · ${escapeHtml(p.farmName)}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${riskBg};color:${riskCol};"
                  title="Likely = breaches in 3+ years or a worsening trend. Possible = breaches in exactly 2 years with no worsening. Monitor = 2 years but trend is stable or improving.">
              ${escapeHtml(p.resistanceRisk)} Resistance Risk
            </span>
            <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${trendCol}22;color:${trendCol};"
                  title="Trend direction based on breach rate change from the first year to the last year in the analysis. pp = percentage points. Worsening: last year breach rate higher than first year. Improving: last year lower. Stable: little change. Note: only first and last year are compared — spikes in the middle are not weighted.">
              ${trendIcon} ${escapeHtml(p.trend)} (${rateArrow} pp)
            </span>
          </div>
        </div>

        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:0.82rem;margin-bottom:12px;">
          <span style="color:var(--text-dim);">
            Breach years: <strong>${p.totalBreachYears}</strong>
            ${infoIcon('Number of distinct calendar years (within the selected date range) where this pest exceeded its configured threshold at least once on this field. 2 years = Possible resistance risk; 3+ years = Likely.')}
          </span>
          <span style="color:var(--text-dim);">
            Rate change: <strong style="color:${trendCol};">${rateArrow} percentage points</strong>
            ${infoIcon('Difference in breach rate between the first and last calendar year in the analysis. Positive = breach rate is higher in the most recent year than the first year (worsening). Negative = improving. Intermediate years are not averaged — only the first and last year are compared.')}
          </span>
        </div>

        <div style="margin-bottom:12px;">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-dim);margin-bottom:8px;">
            Breach Rate by Season
            ${infoIcon('Annual breach rate = percentage of scouting observations where this pest\'s count exceeded its threshold. Bar width is relative to the year with the highest breach rate in this pattern. Red ≥60%, orange ≥30%, green <30%.')}
          </div>
          ${seasonBars}
        </div>

        <div style="padding:8px 12px;background:${riskBg};border-radius:6px;font-size:0.78rem;color:var(--text);">
          💡 ${escapeHtml(p.recommendation)}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${rows}`;
}
