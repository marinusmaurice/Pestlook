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
    <div style="font-size:0.75rem;color:var(--text-dim);line-height:1.6;margin-bottom:16px;">
      Uses OLS regression on individual scouting counts to project each pest × field combination <strong>7 days forward</strong>, then calculates the probability that projection exceeds the action threshold (z-score against residual error).
      <strong>Current</strong> = last recorded count · <strong>Threshold</strong> = threshold captured on the most recent observation (not necessarily the current Pest Catalogue value) · <strong>Projected</strong> = model estimate in 7 days · <strong>Trend</strong> = population direction · Risk: <strong style="color:#c0392b;">High ≥ 60%</strong> act now · <strong style="color:#e67e22;">Medium 30–59%</strong> monitor closely · <strong style="color:#27ae60;">Low &lt; 30%</strong> routine scouting.
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
      <div class="card card-p has-kpi-tip" style="text-align:center;" data-kpi-tip="Total number of pest × field combinations evaluated for breach probability in the selected period.">
        <div style="font-size:1.8rem;font-weight:700;">${summary.total ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Combinations</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid #c0392b;" data-kpi-tip="Combinations where the OLS projection shows a 60% or higher probability that the next session count will exceed the configured action threshold. Immediate monitoring is recommended.">
        <div style="font-size:1.8rem;font-weight:700;color:#c0392b;">${summary.highRisk ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">High Risk (&gt;60%)</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid #e67e22;" data-kpi-tip="Combinations with a 30–59% breach probability — watch closely and plan a scouting visit within the coming week.">
        <div style="font-size:1.8rem;font-weight:700;color:#e67e22;">${summary.mediumRisk ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Medium Risk</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid #27ae60;" data-kpi-tip="Combinations with less than 30% breach probability based on current population trends — continue routine monitoring.">
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
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Threshold (at last obs.)</th>
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
