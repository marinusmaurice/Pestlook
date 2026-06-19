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
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Calculates the recommended interval between scouting visits for each field by measuring the <strong>pest population growth rate</strong> — the relative change in weekly observation totals from first to last in the period. Rapidly growing populations trigger shorter intervals (as few as 3 days); declining populations allow longer gaps (up to 10 days). Fields already overdue for a visit are listed first.</div>
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
            <th style="padding:8px 10px;color:var(--text-dim);">Field</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Farm</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Last Visit</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Growth/wk</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Interval (days)</th>
            <th style="padding:8px 10px;color:var(--text-dim);text-align:right;">Next Scouting</th>
            <th style="padding:8px 10px;color:var(--text-dim);">Urgency</th>
          </tr>
        </thead>
        <tbody>
          ${recommendations.map(r => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px 10px;font-weight:600;">${escapeHtml(r.fieldName ?? '—')}</td>
              <td style="padding:8px 10px;color:var(--text-dim);">${escapeHtml(r.farmName ?? '—')}</td>
              <td style="padding:8px 10px;text-align:right;">${fmtDate(r.lastSessionDate)}</td>
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
