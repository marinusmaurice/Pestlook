import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   A5 — Under-scouted High-Risk Zones
   data = {
     zones: [{ fieldId, fieldName, farmName, sessionsThisMonth, targetSessions,
       coveragePct, totalObsInPeriod, breachCount, topPest,
       isHighPressure, riskLevel, blindSpot, message }],
     summary: { totalUnderScouted, criticalBlindSpots, highRisk, low }
   }
───────────────────────────────────────────────────────────────────────────── */

const RISK_COL = { Critical: '#c0392b', High: '#e67e22', Low: '#7f8c8d' };
const RISK_BG  = {
  Critical: 'rgba(192,57,43,0.1)',
  High:     'rgba(230,126,34,0.1)',
  Low:      'rgba(127,140,141,0.08)',
};

export async function renderUnderscoutedZones(el, data) {
  const { zones = [], summary = {} } = data;

  if (!zones.length) {
    el.innerHTML = emptyState('🎯', 'No under-scouted zones', 'All fields have met their coverage target of at least 2 sessions this month. Keep up the good work!');
    return;
  }

  const kpi = (label, value, colour, sub = '', tooltip = '') => `
    <div class="card card-p${tooltip ? ' has-kpi-tip' : ''}" style="flex:1;min-width:130px;"${tooltip ? ` data-kpi-tip="${tooltip}"` : ''}>
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${kpi('Under-scouted',        summary.totalUnderScouted  ?? 0, '#e67e22', '<50% coverage this month', 'Fields that received fewer than half of their target scouting sessions this month — meaning key pest data may be missing.')}
      ${kpi('Critical Blind Spots', summary.criticalBlindSpots ?? 0, '#c0392b', 'low coverage + high pressure', 'Fields with both low scouting coverage and documented high pest pressure — the most dangerous intelligence gaps in your programme.')}
      ${kpi('High Risk',             summary.highRisk           ?? 0, '#e67e22', 'low coverage + some pressure', 'Under-scouted fields with moderate pest pressure — elevated risk of a missed threshold breach.')}
      ${kpi('Low Risk',              summary.low                ?? 0, '#7f8c8d', 'low coverage, low pressure',  'Under-scouted fields with currently low pest pressure — monitor but not immediately critical.')}
    </div>`;

  const rows = zones.map(z => {
    const col  = RISK_COL[z.riskLevel] ?? '#7f8c8d';
    const bg   = RISK_BG[z.riskLevel]  ?? 'transparent';
    const barW = Math.round(z.coveragePct);
    const barCol = barW >= 75 ? '#27ae60' : barW >= 50 ? '#f39c12' : '#c0392b';

    return `
      <div class="card card-p" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-weight:700;color:var(--text);font-size:0.95rem;">
              ${z.blindSpot ? '🚨' : '⚠️'} ${escapeHtml(z.fieldName)}
            </div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(z.farmName ?? '')}</div>
          </div>
          <div style="text-align:right;">
            <span style="padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${bg};color:${col};">
              ${z.riskLevel}${z.blindSpot ? ' · Blind Spot' : ''}
            </span>
          </div>
        </div>

        <!-- Coverage bar -->
        <div style="margin:10px 0 6px;">
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-dim);margin-bottom:4px;">
            <span>Coverage this month</span>
            <span><strong>${z.sessionsThisMonth} / ${z.targetSessions} sessions</strong> (${z.coveragePct.toFixed(0)}%)</span>
          </div>
          <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${barW}%;background:${barCol};border-radius:4px;transition:width .3s;"></div>
          </div>
        </div>

        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.82rem;margin:8px 0;">
          <span style="color:var(--text-dim);cursor:help;" title="Sum of all pest counts recorded across every observation in this field during the selected filter period. Fields above the median across all fields are considered high pressure.">Pest pressure (period): <strong style="color:${z.isHighPressure ? '#e67e22' : 'var(--text)'};">${z.totalObsInPeriod.toLocaleString()} counts</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Number of individual observations where the pest count exceeded that pest's configured action threshold during the selected period.">Breaches: <strong style="color:${z.breachCount > 0 ? '#c0392b' : 'var(--text)'};">${z.breachCount}</strong></span>
          ${z.topPest !== 'None' ? `<span style="color:var(--text-dim);cursor:help;" title="Pest species with the highest cumulative count in this field during the selected period.">Top pest: <strong style="color:var(--text);">${escapeHtml(z.topPest)}</strong></span>` : ''}
        </div>

        <div style="background:${bg};border-radius:6px;padding:8px 12px;font-size:0.83rem;color:var(--text);">
          ${z.blindSpot ? '🔍' : '📋'} ${escapeHtml(z.message)}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
      Fields below <strong>50% coverage</strong> (fewer than 2 of the 4 target sessions this month) are listed here. A <strong>Critical Blind Spot</strong> is a field that is both under-scouted <em>and</em> shows above-median pest pressure — you do not know what is happening in this field during a potentially dangerous period.
    </div>
    ${kpis}
    <div>${rows}</div>`;
}
