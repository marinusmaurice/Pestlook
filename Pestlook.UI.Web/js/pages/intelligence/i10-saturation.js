import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   I10 — Trap Saturation Prediction
   data = { traps: [{ trapId, trapName, farmName, checkCount, currentRate,
              peakRate, slope, trend, saturationThreshold, weeksToPeak,
              saturationRisk, weeklyHistory: [{ weekStart, total }] }],
            summary: { totalTraps, critical, high, avgCatchRate } }
───────────────────────────────────────────────────────────────────────────── */

const RISK_COLOUR = { Critical: '#8e44ad', High: '#c0392b', Medium: '#e67e22', Low: '#27ae60', Unknown: '#95a5a6' };
const TREND_ICON  = { Rising: '↑', Falling: '↓', Stable: '→' };

export async function renderTrapSaturation(el, data) {
  const { traps = [], summary = {} } = data;

  if (!traps.length) {
    el.innerHTML = emptyState('🪤', 'No data', 'No active traps with catch data found for the selected filters.');
    return;
  }

  const colour = r => RISK_COLOUR[r] ?? '#888';

  el.innerHTML = `
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Tracks weekly catch totals for each active trap and uses OLS linear regression to project how many weeks until the catch rate reaches <strong>saturation</strong> — defined as 20% above the trap's own historic peak catch, or 500 insects, whichever is higher. A saturated trap loses effectiveness as adhesive or bait is exhausted; this tab flags traps that need servicing before that point is reached.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
      <div class="card card-p" style="text-align:center;">
        <div style="font-size:1.8rem;font-weight:700;">${summary.totalTraps ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Traps Monitored</div>
      </div>
      <div class="card card-p" style="text-align:center;border-left:3px solid #8e44ad;">
        <div style="font-size:1.8rem;font-weight:700;color:#8e44ad;">${summary.critical ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Critical (≤4 wks)</div>
      </div>
      <div class="card card-p" style="text-align:center;border-left:3px solid #c0392b;">
        <div style="font-size:1.8rem;font-weight:700;color:#c0392b;">${summary.high ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">High (5–12 wks)</div>
      </div>
      <div class="card card-p" style="text-align:center;border-left:3px solid var(--accent);">
        <div style="font-size:1.8rem;font-weight:700;">${summary.avgCatchRate ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Avg Catch / Week</div>
      </div>
    </div>

    <div class="card card-p" style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);text-align:left;">
            <th style="padding:8px 10px;color:var(--text-dim);">Trap</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Farm</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Checks</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Current Rate</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Peak Rate</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Trend</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Sat. Threshold</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Weeks to Full</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Risk</th>
          </tr>
        </thead>
        <tbody>
          ${traps.map(t => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px 10px;font-weight:600;">${escapeHtml(t.trapName)}</td>
              <td style="padding:8px 10px;color:var(--text-dim);">${escapeHtml(t.farmName ?? '—')}</td>
              <td style="padding:8px 10px;text-align:right;">${t.checkCount}</td>
              <td style="padding:8px 10px;text-align:right;">${t.currentRate}</td>
              <td style="padding:8px 10px;text-align:right;">${t.peakRate ?? '—'}</td>
              <td style="padding:8px 10px;">${TREND_ICON[t.trend] ?? ''} ${escapeHtml(t.trend ?? '')}</td>
              <td style="padding:8px 10px;text-align:right;">${t.saturationThreshold ?? '—'}</td>
              <td style="padding:8px 10px;text-align:right;font-weight:600;">
                ${t.weeksToPeak != null
                  ? `<span style="color:${colour(t.saturationRisk)};">${t.weeksToPeak} wk${t.weeksToPeak !== 1 ? 's' : ''}</span>`
                  : '<span style="color:var(--text-dim);">—</span>'}
              </td>
              <td style="padding:8px 10px;">
                <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700;
                  background:${colour(t.saturationRisk)}22;color:${colour(t.saturationRisk)};">${t.saturationRisk}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
