import { escapeHtml, celsiusToFahrenheit } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';
import { getUser }     from '../../utils/storage.js';

function convTemp(c, unit) {
  if (c == null) return '—';
  return Number(unit === 'F' ? celsiusToFahrenheit(c) : c).toFixed(1);
}

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
const STRESS_ICON = { Strong: '🔴', Moderate: '🟠', Weak: '🟡', None: '' };

export async function renderDroughtStress(el, data) {
  const { droughtPeriods = [], pests = [], summary = {} } = data;
  const unit = getUser()?.temperatureUnit || 'C';
  const deg  = unit === 'F' ? '°F' : '°C';

  if (!pests.length) {
    el.innerHTML = emptyState('☀', 'No drought data',
      (summary.dataNote ?? 'No temperature-recorded sessions with threshold data were found in the selected period.'));
    return;
  }

  const kpi = (label, value, colour, sub = '', tooltip = '') => `
    <div class="card card-p${tooltip ? ' has-kpi-tip' : ''}" style="flex:1;min-width:130px;"${tooltip ? ` data-kpi-tip="${tooltip}"` : ''}>
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Classifies each scouting date as a <strong>drought day</strong> when the 30-day rolling average session temperature exceeded the long-term mean by 2°C or more, then compares threshold breach rates during drought versus normal periods for each pest. A strong drought-stress link means the pest breaches significantly more often in hot, dry conditions — useful for scheduling pre-emptive interventions ahead of predicted heatwaves. <strong>Note:</strong> the long-term mean is calculated from your filter period only, not historical records — filtering to a single hot season will raise the LTM and suppress drought detection. Scouting dates near the start or end of your filter range may use a partial 30-day window. A drought bias of 100% when the normal breach rate was 0% simply means the pest was never recorded above threshold in normal conditions — not that it is twice as dangerous in drought.</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      ${kpi('Drought Days',      summary.droughtDays    ?? 0, '#c0392b',     `>${convTemp(summary.droughtThreshold, unit)}${deg} avg`, 'Days where the 30-day rolling average session temperature exceeded the long-term mean by 2°C or more, classified as drought-stress conditions.')}
      ${kpi('Normal Days',       summary.normalDays     ?? 0, '#27ae60',     'within long-term mean',       'Days with average temperatures within the normal range — used as the baseline to compare pest breach rates against drought conditions.')}
      ${kpi('Long-Term Mean',    convTemp(summary.longTermMeanTemp, unit) + deg, 'var(--accent)', 'session temperature avg', 'The average temperature across all scouting sessions in the full dataset, used as the baseline reference to classify drought vs normal days.')}
      ${kpi('Drought-Stressed',  summary.droughtStress  ?? 0, '#e67e22',     `of ${summary.pestsAnalysed ?? 0} pests`, 'Pest species that show a significantly higher threshold breach rate during drought-classified days compared to normal days — indicating heat/drought amplifies their activity.')}
    </div>
    <div style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.75rem;color:var(--text-dim);margin-bottom:18px;">
      ℹ️ ${escapeHtml(summary.dataNote ?? '')}
    </div>`;

  // Drought period timeline
  const periodPills = droughtPeriods.length
    ? droughtPeriods.map(p => {
        const fmt = s => new Date(s + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        return `
        <span style="display:inline-block;margin:3px;padding:3px 10px;border-radius:20px;font-size:0.72rem;
          background:rgba(192,57,43,0.12);color:#c0392b;border:1px solid #c0392b44;">
          ☀ ${fmt(p.start)} → ${fmt(p.end)} (${p.days}d)
        </span>`;
      }).join('')
    : '<span style="color:var(--text-dim);font-size:0.82rem;">No drought periods detected in the selected period.</span>';

  const periodsBlock = `
    <div class="card card-p" style="margin-bottom:18px;">
      <div style="font-weight:700;font-size:0.88rem;margin-bottom:10px;">☀ Detected Drought Periods</div>
      <div>${periodPills}</div>
    </div>`;

  // When no drought periods exist the comparison is meaningless — say so clearly
  const noDroughtBanner = (summary.droughtDays ?? 0) === 0 ? `
    <div style="padding:16px 20px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:18px;font-size:0.83rem;color:var(--text-dim);line-height:1.6;">
      <strong style="color:var(--text);">No drought periods detected in this date range.</strong><br>
      The drought threshold for this period is <strong>&gt;${convTemp(summary.droughtThreshold, unit)}${deg}</strong> rolling average — no scouting window reached that level.
      The tab cannot compare breach rates without at least one drought period to measure against.
      Try extending your date range to include hotter months, or check that scouts record temperature consistently during sessions.
    </div>` : '';

  const rows = (summary.droughtDays ?? 0) === 0 ? '' : pests.map(p => {
    const col        = STRESS_COL[p.stressLink]  ?? '#888';
    const hasStress  = p.stressLink !== 'None';
    const bias       = p.droughtBiasPct >= 0 ? `+${p.droughtBiasPct}%` : `${p.droughtBiasPct}%`;
    const biasCol    = p.droughtBiasPct >= 50 ? '#c0392b' : p.droughtBiasPct >= 20 ? '#e67e22' : 'var(--text)';

    const normalBar  = Math.min(Math.round(p.normalBreachRate), 100);

    const droughtSection = p.droughtSessions > 0 ? `
          <div style="margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-dim);margin-bottom:3px;">
              <span>Breach rate during drought</span>
              <span><strong>${p.droughtBreachRate}%</strong> (${p.droughtBreaches} breaches)</span>
            </div>
            <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${Math.min(Math.round(p.droughtBreachRate), 100)}%;background:#c0392b;border-radius:4px;"></div>
            </div>
          </div>` : `
          <div style="margin-bottom:6px;font-size:0.75rem;color:var(--text-dim);">
            Breach rate during drought: <em>no drought sessions recorded for this pest</em>
          </div>`;

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

        <div style="margin-bottom:10px;">
          ${droughtSection}
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
          ${p.droughtSessions > 0 ? `<span style="color:var(--text-dim);cursor:help;" title="Average daily pest count across scouting sessions that fell within drought-classified periods (30-day rolling avg temperature ≥ 2°C above long-term mean).">Avg count (drought): <strong>${p.avgCountDrought}</strong></span>` : ''}
          <span style="color:var(--text-dim);cursor:help;" title="Average daily pest count across scouting sessions during normal temperature periods — used as the baseline for drought comparison.">Avg count (normal): <strong>${p.avgCountNormal}</strong></span>
          ${hasStress ? `<span style="color:var(--text-dim);cursor:help;" title="How much higher the breach rate is during drought periods relative to normal conditions. Calculated as (drought breach rate − normal breach rate) / normal breach rate × 100.">Drought bias: <strong style="color:${biasCol};">${bias}</strong> breach rate increase</span>` : ''}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${periodsBlock}${noDroughtBanner}${rows}`;
}
