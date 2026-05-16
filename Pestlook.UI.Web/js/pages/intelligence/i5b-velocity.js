import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   I5b — Spread Velocity Score
   data = { pests: [{ pestId, pestName, currentActive, peakActive,
              currentVelocity, peakVelocity, trend, status,
              weeklyHistory: [{ weekStart, activeFields, velocity, velocityScore }] }],
            summary: { totalPests, activelySpreading, retreating, contained } }

   Velocity = week-over-week change in distinct fields actively reporting the pest.
   Positive → spreading into more fields.  Negative → retreating.  Zero → stable.
───────────────────────────────────────────────────────────────────────────── */

const STATUS_COLOUR = {
  Spreading:  '#c0392b',
  Retreating: '#27ae60',
  Contained:  '#e67e22',
  Inactive:   '#95a5a6',
};
const TREND_ICON = { Rising: '↑', Falling: '↓', Stable: '→' };

function sparkline(history) {
  if (!history?.length) return '<span style="color:var(--text-dim);">—</span>';

  const H = 28, W = 5, gap = 2;
  const maxAbs = Math.max(...history.map(w => Math.abs(w.velocity)), 1);

  const bars = history.map((w, i) => {
    const h      = Math.max(2, Math.round((Math.abs(w.velocity) / maxAbs) * (H / 2)));
    const colour = w.velocity > 0 ? '#c0392b'
                 : w.velocity < 0 ? '#27ae60'
                 : '#ddd';
    const midY  = H / 2;
    const rectY = w.velocity >= 0 ? midY - h : midY;
    return `<rect x="${i * (W + gap)}" y="${rectY}" width="${W}" height="${h}"
              fill="${colour}" rx="1"
              title="${w.weekStart}: ${w.velocity > 0 ? '+' : ''}${w.velocity} fields (${w.activeFields} active)"/>`;
  });

  const totalW = history.length * (W + gap) - gap;
  const midY   = H / 2;
  return `<svg width="${totalW}" height="${H}" style="vertical-align:middle;">
    <line x1="0" y1="${midY}" x2="${totalW}" y2="${midY}"
          stroke="var(--border)" stroke-width="1" stroke-dasharray="3 3"/>
    ${bars.join('')}
  </svg>`;
}

export async function renderSpreadVelocity(el, data) {
  const { pests = [], summary = {} } = data;

  if (!pests.length) {
    el.innerHTML = emptyState('📡', 'No spread data',
      'No observations with field assignments found for the selected filters.');
    return;
  }

  const colour = s => STATUS_COLOUR[s] ?? '#888';
  const velFmt = v => v > 0 ? `+${v}` : `${v}`;

  el.innerHTML = `
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Measures how actively each pest is spreading field-to-field right now. <strong>Velocity</strong> is the week-over-week change in the number of distinct fields with at least one active observation. A positive velocity means more fields are affected this week than last; negative means the pest is retreating. This remains meaningful for established pests as it tracks seasonal flare-ups and post-treatment recovery.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
      <div class="card card-p has-kpi-tip" style="text-align:center;" data-kpi-tip="Total number of pest species with enough weekly observation data to calculate a field-to-field spread velocity.">
        <div style="font-size:1.8rem;font-weight:700;">${summary.totalPests ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Pests Tracked</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid #c0392b;" data-kpi-tip="Pest species with a positive velocity this week — they are actively colonising new fields. These pests need the most urgent monitoring attention.">
        <div style="font-size:1.8rem;font-weight:700;color:#c0392b;">${summary.activelySpreading ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Spreading</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid #27ae60;" data-kpi-tip="Pest species with a negative velocity this week — fewer fields reported them active compared to last week, indicating a retreating population. May reflect successful treatment or seasonal decline.">
        <div style="font-size:1.8rem;font-weight:700;color:#27ae60;">${summary.retreating ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Retreating</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid #e67e22;" data-kpi-tip="Pest species with zero velocity this week — the number of active fields has not changed. Contained pests are stable but should continue to be monitored for any renewed spread.">
        <div style="font-size:1.8rem;font-weight:700;color:#e67e22;">${summary.contained ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Contained / Inactive</div>
      </div>
    </div>

    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:12px;padding:8px 12px;
      background:var(--surface);border:1px solid var(--border);border-radius:8px;">
      <strong>Velocity</strong> = week-over-week change in fields actively reporting the pest. &nbsp;
      <span style="color:#c0392b;">■ Positive</span> = spreading into more fields. &nbsp;
      <span style="color:#27ae60;">■ Negative</span> = retreating (fewer fields active this week).
    </div>

    <div class="card card-p" style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);text-align:left;">
            <th style="padding:8px 10px;color:var(--text-dim);">Pest</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Active Fields</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Peak Active</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Velocity (this wk)</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Peak Spread</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Trend</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Weekly Activity ±</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Status</th>
          </tr>
        </thead>
        <tbody>
          ${pests.map(p => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px 10px;font-weight:600;">${escapeHtml(p.pestName)}</td>
              <td style="padding:8px 10px;text-align:right;">${p.currentActive}</td>
              <td style="padding:8px 10px;text-align:right;">${p.peakActive}</td>
              <td style="padding:8px 10px;text-align:right;font-weight:700;
                color:${p.currentVelocity > 0 ? '#c0392b' : p.currentVelocity < 0 ? '#27ae60' : 'var(--text-dim)'};">
                ${velFmt(p.currentVelocity)} fields/wk
              </td>
              <td style="padding:8px 10px;text-align:right;">+${p.peakVelocity}</td>
              <td style="padding:8px 10px;">${TREND_ICON[p.trend] ?? ''} ${escapeHtml(p.trend)}</td>
              <td style="padding:8px 10px;">${sparkline(p.weeklyHistory)}</td>
              <td style="padding:8px 10px;">
                <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700;
                  background:${colour(p.status)}22;color:${colour(p.status)};">${p.status}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
