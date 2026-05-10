import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

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
const CONF_ICON = { Strong: '🔴', Moderate: '🟠', Weak: '🟡', None: '⬜' };

export async function renderRainfallLag(el, data) {
  const { wetEvents = [], pests = [], summary = {} } = data;

  if (!pests.length) {
    el.innerHTML = emptyState('🌧', 'No lag data',
      (summary.dataNote ?? 'No temperature-recorded sessions found. At least 4 weeks of data is required to detect wet events.'));
    return;
  }

  const kpi = (label, value, colour, sub = '') => `
    <div class="card card-p" style="flex:1;min-width:130px;">
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Detects <strong>wet events</strong> — weeks where the average session temperature dropped 3°C or more below the 4-week rolling average (a proxy for rainfall in the absence of a live weather feed) — then checks whether pest populations spiked in the 1–3 weeks following each event. A strong lag signal indicates the pest consistently responds to wet conditions within that window, allowing pre-emptive treatment planning.</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      ${kpi('Wet Events Detected', summary.wetEventsFound  ?? 0, 'var(--accent)', 'temp-drop proxy')}
      ${kpi('Pests Analysed',      summary.pestsAnalysed  ?? 0, 'var(--text)',   'with lag check')}
      ${kpi('Strong Lag Signal',   summary.strongLag      ?? 0, '#c0392b',       '≥3 events with spike')}
      ${kpi('Moderate Lag Signal', summary.moderateLag    ?? 0, '#e67e22',       '≥2 events with spike')}
    </div>
    <div style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.75rem;color:var(--text-dim);margin-bottom:18px;">
      ℹ️ ${escapeHtml(summary.dataNote ?? '')}
    </div>`;

  // Wet event timeline
  const eventPills = wetEvents.length
    ? wetEvents.map(e => `
        <span style="display:inline-block;margin:3px;padding:3px 10px;border-radius:20px;font-size:0.72rem;
          background:rgba(41,128,185,0.12);color:#2980b9;border:1px solid #2980b944;">
          💧 ${escapeHtml(e.weekStart)} (−${e.tempDrop}°C)
        </span>`).join('')
    : '<span style="color:var(--text-dim);font-size:0.82rem;">No wet events detected in the selected period.</span>';

  const eventsBlock = `
    <div class="card card-p" style="margin-bottom:18px;">
      <div style="font-weight:700;font-size:0.88rem;margin-bottom:10px;">💧 Detected Wet Events (temperature-drop proxy)</div>
      <div>${eventPills}</div>
    </div>`;

  const rows = pests.map(p => {
    const col = CONF_COL[p.lagConfidence]  ?? '#888';
    const hasLag = p.lagConfidence !== 'None';

    const detailRows = (p.lagDetail ?? []).filter(d => d.spikePct > 0).slice(0, 5).map(d => `
      <tr style="border-bottom:1px solid var(--border);font-size:0.75rem;">
        <td style="padding:5px 8px;">${escapeHtml(d.weekStart ?? '')}</td>
        <td style="padding:5px 8px;text-align:right;">−${d.tempDrop}°C</td>
        <td style="padding:5px 8px;text-align:center;">${d.peakLag} wk</td>
        <td style="padding:5px 8px;text-align:right;">${d.baseline}</td>
        <td style="padding:5px 8px;text-align:right;font-weight:700;">${d.peakCount}</td>
        <td style="padding:5px 8px;text-align:right;color:${d.spikePct > 50 ? '#c0392b' : d.spikePct > 20 ? '#e67e22' : 'var(--text)'};">
          +${d.spikePct}%
        </td>
      </tr>`).join('');

    const detailTable = detailRows ? `
      <div style="margin-top:10px;overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
          <thead>
            <tr style="border-bottom:2px solid var(--border);">
              <th style="padding:5px 8px;text-align:left;color:var(--text-dim);">Wet Event Week</th>
              <th style="padding:5px 8px;text-align:right;color:var(--text-dim);">Temp Drop</th>
              <th style="padding:5px 8px;text-align:center;color:var(--text-dim);">Peak Lag</th>
              <th style="padding:5px 8px;text-align:right;color:var(--text-dim);">Baseline</th>
              <th style="padding:5px 8px;text-align:right;color:var(--text-dim);">Peak Count</th>
              <th style="padding:5px 8px;text-align:right;color:var(--text-dim);">Spike</th>
            </tr>
          </thead>
          <tbody>${detailRows}</tbody>
        </table>
      </div>` : '';

    return `
      <div class="card card-p" style="border-left:4px solid ${col};margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">${CONF_ICON[p.lagConfidence] ?? ''} ${escapeHtml(p.pestName)}</div>
            <div style="font-size:0.78rem;color:var(--text-dim);">
              ${p.eventsWithSpike} of ${p.wetEventsTotal} wet events triggered a spike
            </div>
          </div>
          <span style="padding:3px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${col}22;color:${col};">
            ${escapeHtml(p.lagConfidence)} lag signal
          </span>
        </div>
        ${hasLag ? `
        <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:0.82rem;margin-top:10px;">
          <span style="color:var(--text-dim);">Avg lag: <strong>${p.avgLagDays} days (~${p.avgLagWeeks} wks)</strong></span>
          <span style="color:var(--text-dim);">Avg spike: <strong style="color:#e67e22;">+${p.avgSpikePct}%</strong></span>
        </div>` : `<div style="font-size:0.8rem;color:var(--text-dim);margin-top:8px;">No consistent spike detected after wet events.</div>`}
        ${detailTable}
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${eventsBlock}${rows}`;
}
