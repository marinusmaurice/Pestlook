import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   E3 — Drought Stress Correlation
   data = {
     droughtPeriods: [{ start, end, days }],
     pests: [{ pestId, pestName, droughtSessions, normalSessions,
               droughtBreaches, normalBreaches, droughtBreachRate, normalBreachRate,
               avgCountDrought, avgCountNormal, droughtBiasPct, stressLink }],
     summary: { droughtDays, normalDays, longTermMeanTemp, droughtThreshold,
                pestsAnalysed, droughtStress, dataNote }
   }
───────────────────────────────────────────────────────────────────────────── */

const STRESS_COL  = { Strong: '#c0392b', Moderate: '#e67e22', Weak: '#f1c40f', None: '#7f8c8d' };
const STRESS_ICON = { Strong: '🔴', Moderate: '🟠', Weak: '🟡', None: '⬜' };

export async function renderDroughtStress(el, data) {
  const { droughtPeriods = [], pests = [], summary = {} } = data;

  if (!pests.length) {
    el.innerHTML = emptyState('☀', 'No drought data',
      (summary.dataNote ?? 'No temperature-recorded sessions with threshold data were found in the selected period.'));
    return;
  }

  const kpi = (label, value, colour, sub = '') => `
    <div class="card card-p" style="flex:1;min-width:130px;">
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      ${kpi('Drought Days',      summary.droughtDays    ?? 0, '#c0392b',     `>${summary.droughtThreshold ?? '—'}°C avg`)}
      ${kpi('Normal Days',       summary.normalDays     ?? 0, '#27ae60',     'within long-term mean')}
      ${kpi('Long-Term Mean',    (summary.longTermMeanTemp ?? '—') + '°C', 'var(--accent)', 'session temperature avg')}
      ${kpi('Drought-Stressed',  summary.droughtStress  ?? 0, '#e67e22',     `of ${summary.pestsAnalysed ?? 0} pests`)}
    </div>
    <div style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.75rem;color:var(--text-dim);margin-bottom:18px;">
      ℹ️ ${escapeHtml(summary.dataNote ?? '')}
    </div>`;

  // Drought period timeline
  const periodPills = droughtPeriods.length
    ? droughtPeriods.map(p => `
        <span style="display:inline-block;margin:3px;padding:3px 10px;border-radius:20px;font-size:0.72rem;
          background:rgba(192,57,43,0.12);color:#c0392b;border:1px solid #c0392b44;">
          ☀ ${escapeHtml(p.start)} → ${escapeHtml(p.end)} (${p.days}d)
        </span>`).join('')
    : '<span style="color:var(--text-dim);font-size:0.82rem;">No drought periods detected in the selected period.</span>';

  const periodsBlock = `
    <div class="card card-p" style="margin-bottom:18px;">
      <div style="font-weight:700;font-size:0.88rem;margin-bottom:10px;">☀ Detected Drought Periods</div>
      <div>${periodPills}</div>
    </div>`;

  const rows = pests.map(p => {
    const col        = STRESS_COL[p.stressLink]  ?? '#888';
    const hasStress  = p.stressLink !== 'None';
    const bias       = p.droughtBiasPct >= 0 ? `+${p.droughtBiasPct}%` : `${p.droughtBiasPct}%`;
    const biasCol    = p.droughtBiasPct >= 50 ? '#c0392b' : p.droughtBiasPct >= 20 ? '#e67e22' : 'var(--text)';

    // Breach rate comparison bars
    const droughtBar = Math.min(Math.round(p.droughtBreachRate), 100);
    const normalBar  = Math.min(Math.round(p.normalBreachRate),  100);

    return `
      <div class="card card-p" style="border-left:4px solid ${col};margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">${STRESS_ICON[p.stressLink] ?? ''} ${escapeHtml(p.pestName)}</div>
            <div style="font-size:0.78rem;color:var(--text-dim);">
              ${p.droughtSessions} drought sessions · ${p.normalSessions} normal sessions
            </div>
          </div>
          <span style="padding:3px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${col}22;color:${col};">
            ${escapeHtml(p.stressLink)} stress link
          </span>
        </div>

        <!-- Breach rate comparison -->
        <div style="margin-bottom:10px;">
          <div style="margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-dim);margin-bottom:3px;">
              <span>Breach rate during drought</span>
              <span><strong>${p.droughtBreachRate}%</strong> (${p.droughtBreaches} breaches)</span>
            </div>
            <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${droughtBar}%;background:#c0392b;border-radius:4px;"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-dim);margin-bottom:3px;">
              <span>Breach rate in normal conditions</span>
              <span><strong>${p.normalBreachRate}%</strong> (${p.normalBreaches} breaches)</span>
            </div>
            <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${normalBar}%;background:#27ae60;border-radius:4px;"></div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:0.82rem;">
          <span style="color:var(--text-dim);">Avg count (drought): <strong>${p.avgCountDrought}</strong></span>
          <span style="color:var(--text-dim);">Avg count (normal): <strong>${p.avgCountNormal}</strong></span>
          ${hasStress ? `<span style="color:var(--text-dim);">Drought bias: <strong style="color:${biasCol};">${bias}</strong> breach rate increase</span>` : ''}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${periodsBlock}${rows}`;
}
