import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   I6 — Threshold Breach Probability
   data = { combinations: [{ pestId, pestName, fieldId, fieldName, farmName,
              currentLevel, projectedNext, threshold, breachProbability,
              trend, dataPoints, risk }],
            summary: { total, highRisk, mediumRisk, lowRisk } }
───────────────────────────────────────────────────────────────────────────── */

const RISK_COLOUR = { High: '#c0392b', Medium: '#e67e22', Low: '#27ae60' };
const TREND_ICON  = { Rising: '↑', Falling: '↓', Stable: '→' };

export async function renderBreachProbability(el, data) {
  const { combinations = [], summary = {} } = data;

  if (!combinations.length) {
    el.innerHTML = emptyState('⚠️', 'No data', 'No field + pest combinations found for the selected filters.');
    return;
  }

  const pct = v => `${Math.round((v ?? 0) * 100)}%`;
  const colour = r => RISK_COLOUR[r] ?? '#888';

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
      <div class="card card-p" style="text-align:center;">
        <div style="font-size:1.8rem;font-weight:700;">${summary.total ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Combinations</div>
      </div>
      <div class="card card-p" style="text-align:center;border-left:3px solid #c0392b;">
        <div style="font-size:1.8rem;font-weight:700;color:#c0392b;">${summary.highRisk ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">High Risk (&gt;60%)</div>
      </div>
      <div class="card card-p" style="text-align:center;border-left:3px solid #e67e22;">
        <div style="font-size:1.8rem;font-weight:700;color:#e67e22;">${summary.mediumRisk ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Medium Risk</div>
      </div>
      <div class="card card-p" style="text-align:center;border-left:3px solid #27ae60;">
        <div style="font-size:1.8rem;font-weight:700;color:#27ae60;">${summary.lowRisk ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Low Risk</div>
      </div>
    </div>

    <div class="card card-p" style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);text-align:left;">
            <th style="padding:8px 10px;color:var(--text-dim);">Pest</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Field</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Farm</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Current</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Threshold</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Projected</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Breach Prob.</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Trend</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Risk</th>
          </tr>
        </thead>
        <tbody>
          ${combinations.map(c => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px 10px;font-weight:600;">${escapeHtml(c.pestName)}</td>
              <td style="padding:8px 10px;">${escapeHtml(c.fieldName ?? '—')}</td>
              <td style="padding:8px 10px;color:var(--text-dim);">${escapeHtml(c.farmName ?? '—')}</td>
              <td style="padding:8px 10px;text-align:right;">${c.currentLevel ?? '—'}</td>
              <td style="padding:8px 10px;text-align:right;">${c.threshold || '—'}</td>
              <td style="padding:8px 10px;text-align:right;">${c.projectedNext ?? '—'}</td>
              <td style="padding:8px 10px;text-align:right;">
                <span style="font-weight:700;color:${colour(c.risk)};">${pct(c.breachProbability)}</span>
              </td>
              <td style="padding:8px 10px;">${TREND_ICON[c.trend] ?? ''} ${escapeHtml(c.trend ?? '')}</td>
              <td style="padding:8px 10px;">
                <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700;
                  background:${colour(c.risk)}22;color:${colour(c.risk)};">${c.risk}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
