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

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString() : '—';
  const colour  = u => URGENCY_COLOUR[u] ?? '#555';

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
      <div class="card card-p" style="text-align:center;">
        <div style="font-size:1.8rem;font-weight:700;">${summary.total ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Recommendations</div>
      </div>
      <div class="card card-p" style="text-align:center;border-left:3px solid #c0392b;">
        <div style="font-size:1.8rem;font-weight:700;color:#c0392b;">${summary.urgent ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Urgent (≤3 days)</div>
      </div>
      <div class="card card-p" style="text-align:center;border-left:3px solid #e67e22;">
        <div style="font-size:1.8rem;font-weight:700;color:#e67e22;">${summary.soon ?? 0}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">Soon (4–7 days)</div>
      </div>
      <div class="card card-p" style="text-align:center;border-left:3px solid #27ae60;">
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
