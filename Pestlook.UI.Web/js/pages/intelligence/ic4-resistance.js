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
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Flags field × pest combinations where threshold breaches have recurred across <strong>two or more calendar years</strong> without sustained improvement. A worsening breach rate year-on-year is a strong indicator that current control measures are losing effectiveness and that <strong>pesticide resistance testing</strong> or rotation of mode-of-action should be considered. No treatment records are required — the analysis is based entirely on observation counts and configured thresholds.</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      ${kpi('Patterns Found',       summary.totalPatterns      ?? 0, 'var(--text)', `over ${summary.yearsAnalysed ?? '?'} years`, 'Total pest × field combinations with threshold breaches recorded across two or more calendar years, indicating a persistent rather than one-off infestation.')}
      ${kpi('Likely Resistance',    summary.likelyResistance   ?? 0, '#c0392b',    '3+ breach years / worsening', 'Combinations with breaches in three or more years and/or a worsening year-on-year breach rate — strong evidence that current treatments are losing effectiveness.')}
      ${kpi('Possible Resistance',  summary.possibleResistance ?? 0, '#e67e22',    '2 breach years',              'Combinations with breaches recorded in exactly two different years — may indicate emerging resistance; review treatment rotation.')}
    </div>
    <div style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.75rem;color:var(--text-dim);margin-bottom:18px;">
      ℹ️ ${escapeHtml(summary.dataNote ?? '')}
    </div>`;

  const rows = patterns.map(p => {
    const riskCol  = RISK_COL[p.resistanceRisk]  ?? '#888';
    const riskBg   = RISK_BG[p.resistanceRisk]   ?? 'transparent';
    const trendCol = TREND_COL[p.trend]           ?? '#888';
    const trendIcon = TREND_ICON[p.trend]         ?? '';

    const seasonMax = Math.max(...(p.breachSeasons ?? []).map(s => s.breachRate), 1);
    const seasonBars = (p.breachSeasons ?? []).map(s => {
      const pct = Math.min(Math.round(s.breachRate / seasonMax * 100), 100);
      const barCol = s.breachRate >= 60 ? '#c0392b' : s.breachRate >= 30 ? '#e67e22' : '#27ae60';
      return `
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-dim);margin-bottom:3px;">
            <span style="font-weight:600;">${s.year}</span>
            <span>${s.breachCount} breaches / ${s.sessionCount} sessions · <strong style="color:${barCol};">${s.breachRate}%</strong> · avg count ${s.avgCount}</span>
          </div>
          <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${barCol};border-radius:4px;transition:width .3s;"></div>
          </div>
        </div>`;
    }).join('');

    const rateArrow = p.rateChangePoints >= 0 ? `+${p.rateChangePoints}` : `${p.rateChangePoints}`;

    return `
      <div class="card card-p" style="border-left:4px solid ${riskCol};margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">🧬 ${escapeHtml(p.pestName)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(p.fieldName)} · ${escapeHtml(p.farmName)}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${riskBg};color:${riskCol};">
              ${escapeHtml(p.resistanceRisk)} Resistance Risk
            </span>
            <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${trendCol}22;color:${trendCol};">
              ${trendIcon} ${escapeHtml(p.trend)} (${rateArrow} pp)
            </span>
          </div>
        </div>

        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:0.82rem;margin-bottom:12px;">
          <span style="color:var(--text-dim);">Breach years: <strong>${p.totalBreachYears}</strong></span>
          <span style="color:var(--text-dim);">Rate change: <strong style="color:${trendCol};">${rateArrow} percentage points</strong></span>
        </div>

        <div style="margin-bottom:12px;">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-dim);margin-bottom:8px;">Breach Rate by Season</div>
          ${seasonBars}
        </div>

        <div style="padding:8px 12px;background:${riskBg};border-radius:6px;font-size:0.78rem;color:var(--text);">
          💡 ${escapeHtml(p.recommendation)}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${rows}`;
}
