import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   I7 — Optimal Next Scouting Date
   data = { recommendations: [{ fieldId, fieldName, farmName,
              lastSessionDate, daysSinceLastSession, recommendedIntervalDays,
              nextRecommendedDate, daysUntilNext, isOverdue, urgency,
              rationale, growthRate }],
            summary: { total, urgent, soon, onSchedule } }
───────────────────────────────────────────────────────────────────────────── */

const URGENCY_COLOUR = { Urgent: '#c0392b', Soon: '#e67e22', 'On Schedule': '#27ae60', Overdue: '#8e44ad' };

export async function renderNextScouting(el, data) {
  const { recommendations = [], summary = {} } = data;

  if (!recommendations.length) {
    el.innerHTML = emptyState('📅', 'No data', 'No recommendations available for the selected filters.');
    return;
  }

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
  const colour  = u => URGENCY_COLOUR[u] ?? '#555';

  el.innerHTML = `
    <div style="font-size:0.75rem;color:var(--text-dim);line-height:1.6;margin-bottom:16px;">
      For each field, fits a trend line (OLS) through weekly counts <strong>per pest species</strong> and picks the <strong>fastest-growing pest</strong> to drive the recommendation — so one surging pest triggers an urgent visit even if others are declining.
      Growth rate = OLS slope ÷ average weekly count.
      <strong>≥ 100%</strong> → 3 days (Critical) ·
      <strong>≥ 50%</strong> → 4 days (High) ·
      <strong>≥ 20%</strong> → 5 days (Medium) ·
      <strong>≤ −20%</strong> → 10 days (Low, declining) ·
      <strong>otherwise</strong> → 7 days (stable).
      <em>Example: Whitefly trend rises by 200/week with an average of 4 000 → 200 ÷ 4 000 = 5% → stable → 7-day interval.</em>
      Next scouting = last visit + interval. Overdue fields are listed first.
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
      <div class="card card-p has-kpi-tip" style="text-align:center;" data-kpi-tip="Total number of fields for which a next scouting visit recommendation was generated in the selected period.">
        <div style="font-size:1.8rem;font-weight:700;">${summary.total ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Recommendations</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid #c0392b;" data-kpi-tip="Fields where the pest population is growing fast enough that a scouting visit is recommended within 3 days or is already overdue. Act immediately.">
        <div style="font-size:1.8rem;font-weight:700;color:#c0392b;">${summary.urgent ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Urgent (≤3 days)</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid #e67e22;" data-kpi-tip="Fields recommended for a scouting visit within 4–7 days based on their current pest growth rate and last visit date.">
        <div style="font-size:1.8rem;font-weight:700;color:#e67e22;">${summary.soon ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Soon (4–7 days)</div>
      </div>
      <div class="card card-p has-kpi-tip" style="text-align:center;border-left:3px solid #27ae60;" data-kpi-tip="Fields whose next recommended scouting visit is more than 7 days away, based on stable or declining pest populations.">
        <div style="font-size:1.8rem;font-weight:700;color:#27ae60;">${summary.onSchedule ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">On Schedule</div>
      </div>
    </div>

    <div class="card card-p" style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);text-align:left;">
            <th style="padding:8px 10px;color:var(--text-dim);" title="Field name">Field</th>
            <th style="padding:8px 10px;color:var(--text-dim);" title="Farm the field belongs to">Farm</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;" title="Date of the most recent completed scouting session on this field">Last Visit</th>
            <th style="padding:8px 10px;color:var(--text-dim);" title="The pest species with the fastest-growing weekly trend on this field — the one driving the recommended interval">Driving Pest</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;" title="OLS weekly growth rate of the driving pest, as a percentage of its average weekly count">Growth/wk</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;" title="Recommended days between visits based on the driving pest's growth rate">Interval</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;" title="Last visit date plus the recommended interval">Next Scouting</th>
            <th style="padding:8px 10px;color:var(--text-dim);" title="Critical (3 days) · High (4 days) · Medium (5 days) · Low (7–10 days)">Urgency</th>
          </tr>
        </thead>
        <tbody>
          ${recommendations.map(r => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px 10px;font-weight:600;">${escapeHtml(r.fieldName ?? '—')}</td>
              <td style="padding:8px 10px;color:var(--text-dim);">${escapeHtml(r.farmName ?? '—')}</td>
              <td style="padding:8px 10px;text-align:right;">${fmtDate(r.lastSessionDate)}</td>
              <td style="padding:8px 10px;">${escapeHtml(r.drivingPest ?? '—')}</td>
              <td style="padding:8px 10px;text-align:right;">${r.growthRate > 0 ? '+' : ''}${(r.growthRate * 100).toFixed(0)}%</td>
              <td style="padding:8px 10px;text-align:right;">${r.recommendedIntervalDays}</td>
              <td style="padding:8px 10px;text-align:right;font-weight:600;">${fmtDate(r.nextRecommendedDate)}</td>
              <td style="padding:8px 10px;">
                <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700;
                  background:${colour(r.urgency)}22;color:${colour(r.urgency)};">${r.urgency}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
