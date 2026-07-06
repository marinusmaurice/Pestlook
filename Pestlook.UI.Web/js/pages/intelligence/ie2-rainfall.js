import { escapeHtml, celsiusToFahrenheit } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';
import { getUser }     from '../../utils/storage.js';

// Temperature delta conversion: a drop of N°C = N×9/5°F
function convDelta(deltaC, unit) {
  const v = unit === 'F' ? deltaC * 9 / 5 : deltaC;
  return Number(v).toFixed(1);
}

/* ─────────────────────────────────────────────────────────────────────────────
   E2 — Rainfall Lag Effect
   data = {
     wetEvents: [{ weekStart, tempDrop }],
     pests: [{ pestId, pestName, wetEventsTotal, eventsWithSpike, lagConfidence,
               avgLagWeeks, avgLagDays, avgSpikePct,
               lagDetail: [{ weekStart, tempDrop, peakLag, peakCount, baseline, spikePct }] }],
     summary: { wetEventsFound, pestsAnalysed, strongLag, moderateLag, dataNote }
   }
───────────────────────────────────────────────────────────────────────────── */

const CONF_COL  = { Strong: '#c0392b', Moderate: '#e67e22', Weak: '#f1c40f', None: '#7f8c8d' };
const CONF_ICON = { Strong: '🔴', Moderate: '🟠', Weak: '🟡', None: '⚪' };

const infoIcon = (tooltip) =>
  `<span style="font-size:0.7rem;color:var(--text-dim);cursor:help;margin-left:3px;opacity:0.7;" title="${tooltip}">&#9432;</span>`;

export async function renderRainfallLag(el, data) {
  const { wetEvents = [], pests = [], summary = {} } = data;
  const unit = getUser()?.temperatureUnit || 'C';
  const deg  = unit === 'F' ? '°F' : '°C';

  if (!pests.length) {
    el.innerHTML = emptyState('🌧', 'No lag data',
      (summary.dataNote ?? 'No temperature-recorded sessions found. At least 4 weeks of data is required to detect wet events.'));
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
      Detects <strong>wet events</strong> — weeks where the average session temperature dropped 3${deg} or more
      below the 4-week rolling average (a proxy for rainfall when no live weather feed is connected) —
      then checks whether pest populations <strong>spiked in the 1–3 weeks following</strong> each event.
      A strong lag signal means the pest consistently responds to wet conditions within that window,
      allowing pre-emptive treatment planning.
      <strong>Note:</strong> wet events within 3 weeks of your filter end date have incomplete follow-up data.
      A spike of 100% where the baseline was zero means the pest was absent before the event — not that it doubled.
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      ${kpi('Wet Events Detected', summary.wetEventsFound ?? 0, 'var(--accent)', 'temp-drop proxy',
        'Weeks where the average session temperature dropped 3°C or more below the preceding 4-week rolling average — used as a rainfall proxy when no live weather feed is connected. The more consistent the scouts are at recording temperature, the more accurate this signal.')}
      ${kpi('Pests Analysed', summary.pestsAnalysed ?? 0, 'var(--text)', 'with lag check',
        'Number of pest species checked for a population spike in the 1–3 weeks following each detected wet event. Only pests with observation data in the selected period are included.')}
      ${kpi('Strong Lag Signal', summary.strongLag ?? 0, '#c0392b', '≥3 events with spike',
        'Pests that spiked (>20% above baseline) after 3 or more wet events AND with an average spike >50%. A reliable rainfall-driven trigger — consider pre-emptive treatment before the next wet period for these species.')}
      ${kpi('Moderate Lag Signal', summary.moderateLag ?? 0, '#e67e22', '≥2 events with spike',
        'Pests that showed a >20% spike after at least 2 wet events — a moderate indicator of rainfall sensitivity. Worth increased scouting frequency in the 2–3 weeks following wet conditions.')}
    </div>
    <div style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.75rem;color:var(--text-dim);margin-bottom:18px;">
      ℹ️ ${escapeHtml(summary.dataNote ?? '')}
    </div>`;

  // Wet event timeline
  const eventPills = wetEvents.length
    ? wetEvents.map(e => {
        const d = new Date(e.weekStart + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        return `
        <span style="display:inline-block;margin:3px;padding:3px 10px;border-radius:20px;font-size:0.72rem;
          background:rgba(41,128,185,0.12);color:#2980b9;border:1px solid #2980b944;cursor:default;"
          title="Wet event detected on week of ${d}. Average session temperature this week was ${convDelta(e.tempDrop, unit)}${deg} below the 4-week rolling average — the threshold for counting as a potential rainfall event.">
          💧 ${d} (−${convDelta(e.tempDrop, unit)}${deg})
        </span>`;
      }).join('')
    : '<span style="color:var(--text-dim);font-size:0.82rem;">No wet events detected in the selected period.</span>';

  const eventsBlock = `
    <div class="card card-p" style="margin-bottom:18px;">
      <div style="font-weight:700;font-size:0.88rem;margin-bottom:4px;">
        💧 Detected Wet Events (temperature-drop proxy)
        ${infoIcon('Each pill is a week where average session temperature dropped ≥3°C below the 4-week rolling average. The value in brackets is the size of the temperature drop. Hover each pill for more detail.')}
      </div>
      <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:10px;line-height:1.5;">
        These are the weeks checked for a follow-on pest spike. Hover a pill for details.
      </div>
      <div>${eventPills}</div>
    </div>`;

  const rows = pests.map(p => {
    const col    = CONF_COL[p.lagConfidence] ?? '#888';
    const hasLag = p.lagConfidence !== 'None';

    // Show ALL wet events in the table, not just spiking ones
    const detailRows = (p.lagDetail ?? []).map(d => {
      const ws = d.weekStart
        ? new Date(d.weekStart + (d.weekStart.includes('T') ? '' : 'T00:00:00')).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
      const spiked  = d.spikePct > 20;
      const noSpike = d.spikePct <= 0;
      const spikeLabel = noSpike    ? '<span style="color:var(--text-dim);">—</span>'
                       : spiked     ? `<span style="color:${d.spikePct > 50 ? '#c0392b' : '#e67e22'};font-weight:700;">+${d.spikePct}%</span>`
                       : `<span style="color:var(--text-dim);">+${d.spikePct}%</span>`;
      return `
      <tr style="border-bottom:1px solid var(--border);font-size:0.75rem;${spiked ? '' : 'opacity:0.65;'}">
        <td style="padding:5px 8px;"
            title="Week of the wet event. The 1–3 weeks after this date are scanned for a pest count spike.">${ws}</td>
        <td style="padding:5px 8px;text-align:right;"
            title="How much the average session temperature dropped below the 4-week rolling average. Larger drops are stronger wet-event signals.">−${convDelta(d.tempDrop, unit)}${deg}</td>
        <td style="padding:5px 8px;text-align:center;"
            title="Which of the 3 follow-on weeks had the highest pest count — 1, 2, or 3 weeks after the wet event.${d.spikePct <= 0 ? ' No spike was detected.' : ''}">${d.spikePct <= 0 ? '—' : d.peakLag + ' wk'}</td>
        <td style="padding:5px 8px;text-align:right;"
            title="Average pest count in the 2 weeks before the wet event — used as the reference level to measure whether a spike occurred.">${d.baseline}</td>
        <td style="padding:5px 8px;text-align:right;font-weight:600;"
            title="Highest pest count recorded in the 1–3 weeks after the wet event.">${d.peakCount}</td>
        <td style="padding:5px 8px;text-align:right;"
            title="${spiked ? 'Spike exceeds the 20% threshold — this event counts towards the lag signal confidence.' : d.spikePct > 0 ? 'Positive but below the 20% spike threshold — not counted towards lag signal.' : 'Pest count did not rise above baseline after this wet event.'}">${spikeLabel}</td>
      </tr>`;
    }).join('');

    const thTip = (text) => `title="${text}"`;

    const detailTable = detailRows ? `
      <div style="margin-top:12px;overflow-x:auto;">
        <div style="font-size:0.68rem;color:var(--text-dim);margin-bottom:6px;">
          Rows at reduced opacity had no spike (peak count did not exceed baseline by &gt;20%).
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
          <thead>
            <tr style="border-bottom:2px solid var(--border);">
              <th style="padding:5px 8px;text-align:left;color:var(--text-dim);"
                  ${thTip('The Monday of the week in which the wet event (temperature drop) was detected.')}>
                Wet Event Week ${infoIcon('Monday of the week where the temperature drop was detected.')}
              </th>
              <th style="padding:5px 8px;text-align:right;color:var(--text-dim);"
                  ${thTip('How far below the 4-week rolling average temperature the session average fell this week.')}>
                Temp Drop ${infoIcon('How much cooler this week was relative to the preceding 4-week average. A drop ≥3°C qualifies as a wet event.')}
              </th>
              <th style="padding:5px 8px;text-align:center;color:var(--text-dim);"
                  ${thTip('Which follow-on week (1, 2, or 3 weeks after the event) had the highest pest count.')}>
                Peak Lag ${infoIcon('The week (1, 2, or 3) after the wet event where pest counts peaked. A consistent lag of the same week across events is a strong signal.')}
              </th>
              <th style="padding:5px 8px;text-align:right;color:var(--text-dim);"
                  ${thTip('Average pest count in the 2 weeks before the wet event — the reference level.')}>
                Baseline ${infoIcon('Average pest count in the 2 weeks immediately before the wet event. The spike % is measured against this level.')}
              </th>
              <th style="padding:5px 8px;text-align:right;color:var(--text-dim);"
                  ${thTip('Highest total pest count recorded in weeks 1–3 after the wet event.')}>
                Peak Count ${infoIcon('Highest total pest count seen in the 3 weeks following the wet event.')}
              </th>
              <th style="padding:5px 8px;text-align:right;color:var(--text-dim);"
                  ${thTip('Percentage increase of the peak count above baseline. Spikes above 20% (shown in colour) count towards the lag signal confidence rating.')}>
                Spike ${infoIcon('(Peak Count − Baseline) ÷ Baseline × 100. Highlighted in colour if ≥20% — these events count towards the lag signal rating. Rows at reduced opacity did not spike.')}
              </th>
            </tr>
          </thead>
          <tbody>${detailRows}</tbody>
        </table>
      </div>` : '';

    const metric = (label, value, tooltip, note = '') => `
      <div style="min-width:140px;">
        <div style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">
          ${label}${infoIcon(tooltip)}
        </div>
        <div style="font-size:0.88rem;font-weight:700;">${value}</div>
        ${note ? `<div style="font-size:0.67rem;color:var(--text-dim);margin-top:1px;">${note}</div>` : ''}
      </div>`;

    return `
      <div class="card card-p" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">${CONF_ICON[p.lagConfidence] ?? ''} ${escapeHtml(p.pestName)}</div>
            <div style="font-size:0.78rem;color:var(--text-dim);margin-top:2px;"
                 title="Number of detected wet events where this pest's count rose more than 20% above its 2-week baseline within 3 weeks of the event.">
              ${p.eventsWithSpike} of ${p.wetEventsTotal} wet events triggered a spike
            </div>
          </div>
          <span style="padding:3px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${col}22;color:${col};"
                title="Lag signal confidence. Strong: ≥3 spikes AND avg spike >50%. Moderate: ≥2 spikes. Weak: 1 spike. None: no spikes detected. A higher rating means this pest more reliably responds to wet conditions.">
            ${escapeHtml(p.lagConfidence)} lag signal
          </span>
        </div>
        ${hasLag ? `
        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;padding:10px 12px;background:var(--surface-alt, var(--border));border-radius:8px;">
          ${metric('Avg Lag',
            `${p.avgLagDays} days (~${p.avgLagWeeks} wks)`,
            'Average number of days between the wet event and when this pest\'s count peaked, across all events that triggered a spike (>20% above baseline). Use this to time your next scouting visit after a rain event.',
            'Time between rain and population peak')}
          ${metric('Avg Spike',
            `<span style="color:#e67e22;">+${p.avgSpikePct}%</span>`,
            'Average percentage increase in pest count during the peak lag week compared to the 2-week baseline before each wet event, averaged across all spiking events only.',
            'Avg count rise above pre-rain baseline')}
        </div>` : `<div style="font-size:0.8rem;color:var(--text-dim);margin-top:8px;">No consistent spike detected after wet events in the selected period.</div>`}
        ${detailTable}
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${eventsBlock}${rows}`;
}
