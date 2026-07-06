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

const infoIcon = (tooltip) =>
  `<span style="font-size:0.7rem;color:var(--text-dim);cursor:help;margin-left:3px;opacity:0.7;" title="${tooltip}">&#9432;</span>`;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

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
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
      Classifies each scouting date as a <strong>drought day</strong> when the 30-day rolling average session temperature
      exceeded the long-term mean by 2${deg} or more, then compares <strong>threshold breach rates</strong> during drought
      versus normal periods for each pest. A strong drought-stress link means the pest breaches significantly more often
      in hot, dry conditions — useful for scheduling pre-emptive interventions ahead of predicted heatwaves.
      <strong>Note:</strong> the long-term mean is calculated from your filter period only, not historical records —
      filtering to a single hot season will raise the LTM and suppress drought detection.
      A drought bias of 100% when the normal breach rate was 0% simply means the pest was never recorded above threshold
      in normal conditions — not that it is twice as dangerous in drought.
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      ${kpi('Drought Days', summary.droughtDays ?? 0, '#c0392b',
        `>${convTemp(summary.droughtThreshold, unit)}${deg} avg`,
        `Number of scouting dates where the 30-day rolling average session temperature exceeded the long-term mean (${convTemp(summary.longTermMeanTemp, unit)}${deg}) by 2${deg} or more. These dates are treated as hot/drought conditions for breach rate comparison.`)}
      ${kpi('Normal Days', summary.normalDays ?? 0, '#27ae60',
        'within long-term mean',
        `Number of scouting dates with average temperatures within the normal range (below ${convTemp(summary.droughtThreshold, unit)}${deg} rolling average). These form the baseline against which drought breach rates are measured.`)}
      ${kpi('Long-Term Mean', convTemp(summary.longTermMeanTemp, unit) + deg, 'var(--accent)',
        'session temperature avg',
        'The average temperature across all scouting sessions in the selected filter period. Drought days are those where the 30-day rolling average exceeds this value by 2°C or more. Note: this is calculated from your filter window only — a shorter or hotter filter period will produce a higher long-term mean.')}
      ${kpi('Drought-Stressed', summary.droughtStress ?? 0, '#e67e22',
        `of ${plural(summary.pestsAnalysed ?? 0, 'pest')}`,
        'Pest species showing a significantly higher threshold breach rate during drought-classified days compared to normal days. Strong = drought bias ≥50% with ≥3 drought breaches. Moderate = drought bias ≥20% with ≥2 breaches.')}
    </div>
    <div style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.75rem;color:var(--text-dim);margin-bottom:18px;">
      ℹ️ ${escapeHtml(summary.dataNote ?? '')}
    </div>`;

  // Drought period timeline
  const fmt = s => new Date(s + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  const periodPills = droughtPeriods.length
    ? droughtPeriods.map(p => `
        <span style="display:inline-block;margin:3px;padding:3px 10px;border-radius:20px;font-size:0.72rem;
          background:rgba(192,57,43,0.12);color:#c0392b;border:1px solid #c0392b44;cursor:default;"
          title="Drought period from ${fmt(p.start)} to ${fmt(p.end)} — ${p.days} consecutive scouting dates where the 30-day rolling average temperature exceeded the long-term mean by ≥2${deg}. All pest observations on these dates are classified as drought-condition sessions.">
          ☀ ${fmt(p.start)} → ${fmt(p.end)} (${p.days}d)
        </span>`).join('')
    : '<span style="color:var(--text-dim);font-size:0.82rem;">No drought periods detected in the selected period.</span>';

  const periodsBlock = `
    <div class="card card-p" style="margin-bottom:18px;">
      <div style="font-weight:700;font-size:0.88rem;margin-bottom:4px;">
        ☀ Detected Drought Periods
        ${infoIcon('Contiguous date ranges where the 30-day rolling average session temperature exceeded the long-term mean by ≥2°C. Hover each pill for details. Scouting dates with no temperature data are excluded from the classification.')}
      </div>
      <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:10px;line-height:1.5;">
        Each period is a run of consecutive hot days above the drought threshold. Hover a pill for details.
      </div>
      <div>${periodPills}</div>
    </div>`;

  const noDroughtBanner = (summary.droughtDays ?? 0) === 0 ? `
    <div style="padding:16px 20px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:18px;font-size:0.83rem;color:var(--text-dim);line-height:1.6;">
      <strong style="color:var(--text);">No drought periods detected in this date range.</strong><br>
      The drought threshold for this period is <strong>&gt;${convTemp(summary.droughtThreshold, unit)}${deg}</strong> rolling average — no scouting window reached that level.
      Try extending your date range to include hotter months, or check that scouts record temperature consistently during sessions.
    </div>` : '';

  const rows = (summary.droughtDays ?? 0) === 0 ? '' : pests.map(p => {
    const col      = STRESS_COL[p.stressLink] ?? '#888';
    const hasStress = p.stressLink !== 'None';
    const bias     = p.droughtBiasPct >= 0 ? `+${p.droughtBiasPct}%` : `${p.droughtBiasPct}%`;
    const biasCol  = p.droughtBiasPct >= 50 ? '#c0392b' : p.droughtBiasPct >= 20 ? '#e67e22' : 'var(--text)';

    const droughtSection = p.droughtSessions > 0 ? `
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-dim);margin-bottom:3px;">
          <span>
            Breach rate during drought
            ${infoIcon('The percentage of scouting sessions during drought-classified dates where the pest count exceeded its configured threshold. A higher rate than normal indicates drought stress amplifies this pest\'s population.')}
          </span>
          <span title="Breach rate: ${p.droughtBreaches} sessions above threshold out of ${p.droughtSessions} drought sessions total.">
            <strong>${p.droughtBreachRate}%</strong>
            <span style="font-size:0.7rem;opacity:0.7;">(${p.droughtBreaches} of ${p.droughtSessions} sessions)</span>
          </span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;"
             title="Bar width = breach rate during drought (${p.droughtBreachRate}% of a 0–100% scale).">
          <div style="height:100%;width:${Math.min(Math.round(p.droughtBreachRate), 100)}%;background:#c0392b;border-radius:4px;"></div>
        </div>
      </div>` : `
      <div style="margin-bottom:8px;font-size:0.75rem;color:var(--text-dim);">
        Breach rate during drought: <em>no drought sessions recorded for this pest</em>
      </div>`;

    const metric = (label, value, tooltip, note = '') => `
      <div style="min-width:130px;">
        <div style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">
          ${label}${infoIcon(tooltip)}
        </div>
        <div style="font-size:0.88rem;font-weight:700;">${value}</div>
        ${note ? `<div style="font-size:0.67rem;color:var(--text-dim);margin-top:1px;">${note}</div>` : ''}
      </div>`;

    return `
      <div class="card card-p" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">${STRESS_ICON[p.stressLink] ?? ''} ${escapeHtml(p.pestName)}</div>
            <div style="font-size:0.78rem;color:var(--text-dim);"
                 title="Number of scouting sessions (with threshold data) that fell on drought-classified dates vs normal-temperature dates. More sessions in each category produces a more reliable breach rate comparison.">
              ${plural(p.droughtSessions, 'drought session')} · ${plural(p.normalSessions, 'normal session')}
            </div>
          </div>
          <span style="padding:3px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${col}22;color:${col};"
                title="Drought stress link strength. Strong: drought bias ≥50% AND ≥3 drought breaches. Moderate: bias ≥20% AND ≥2 breaches. Weak: bias ≥5%. None: no meaningful difference between drought and normal breach rates.">
            ${escapeHtml(p.stressLink)} stress link
          </span>
        </div>

        <div style="margin-bottom:10px;">
          ${droughtSection}
          <div>
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-dim);margin-bottom:3px;">
              <span>
                Breach rate in normal conditions
                ${infoIcon('The percentage of scouting sessions during normal-temperature dates where the pest count exceeded its threshold. This is the baseline used to determine whether drought amplifies pest activity.')}
              </span>
              <span title="Breach rate: ${p.normalBreaches} sessions above threshold out of ${p.normalSessions} normal sessions total.">
                <strong>${p.normalBreachRate}%</strong>
                <span style="font-size:0.7rem;opacity:0.7;">(${p.normalBreaches} of ${p.normalSessions} sessions)</span>
              </span>
            </div>
            <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;"
                 title="Bar width = breach rate in normal conditions (${p.normalBreachRate}% of a 0–100% scale). Compare with the drought bar above.">
              <div style="height:100%;width:${Math.min(Math.round(p.normalBreachRate), 100)}%;background:#27ae60;border-radius:4px;"></div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:16px;flex-wrap:wrap;padding:10px 12px;background:var(--surface-alt, var(--border));border-radius:8px;">
          ${p.droughtSessions > 0
            ? metric('Avg Count (Drought)', p.avgCountDrought,
                'Average total pest count per scouting session during drought-classified dates. Compare with the normal average to see how drought affects population size — not just breach frequency.',
                'per session during drought')
            : ''}
          ${metric('Avg Count (Normal)', p.avgCountNormal,
            'Average total pest count per scouting session during normal-temperature dates — the baseline population level outside of drought conditions.',
            'per session in normal conditions')}
          ${hasStress
            ? metric('Drought Bias', `<span style="color:${biasCol};">${bias}</span>`,
                'How much higher the breach rate is during drought compared to normal conditions. Formula: (drought breach rate − normal breach rate) ÷ normal breach rate × 100. A bias of +81% means the pest breaches nearly twice as often during drought. A 100% bias when normal rate is 0% simply means breaches only occurred during drought.',
                'breach rate increase vs normal')
            : ''}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${periodsBlock}${noDroughtBanner}${rows}`;
}
