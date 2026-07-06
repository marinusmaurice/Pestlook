import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   A4 — Overdue Action Alerts
   data = {
     alerts: [{ pestId, pestName, fieldId, fieldName, farmName, scoutName,
       breachDate, peakCount, threshold, isSevere,
       responseWindowHours, hoursOverdue, daysOverdue, urgency }],
     summary: { total, critical, high, medium }
   }
───────────────────────────────────────────────────────────────────────────── */

const URG_COL = { Critical: '#c0392b', High: '#e67e22', Medium: '#f39c12' };
const URG_BG  = {
  Critical: 'rgba(192,57,43,0.1)',
  High:     'rgba(230,126,34,0.1)',
  Medium:   'rgba(243,156,18,0.1)',
};

export async function renderOverdueAlerts(el, data) {
  const { alerts = [], summary = {} } = data;

  if (!alerts.length) {
    el.innerHTML = emptyState('✅', 'No overdue alerts', 'All threshold breaches in the selected period have received a follow-up scouting session within the required response window. Great work!');
    return;
  }

  const kpi = (label, value, colour, sub = '', tooltip = '') => `
    <div class="card card-p${tooltip ? ' has-kpi-tip' : ''}" style="flex:1;min-width:120px;"${tooltip ? ` data-kpi-tip="${tooltip}"` : ''}>
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${kpi('Total Overdue',  summary.total    ?? 0, '#c0392b', '',                    'Total threshold breach events that have not received a follow-up scouting visit within their required response window.')}
      ${kpi('Critical',       summary.critical ?? 0, '#c0392b', 'severe breach, 48h window', 'Severe breaches — where the pest count reached 2× the threshold — that have not had a follow-up session within 48 hours. Highest priority.')}
      ${kpi('High',           summary.high     ?? 0, '#e67e22', 'overdue >3 days',    'Standard threshold breaches that have been outstanding for more than 3 days without a follow-up scouting visit.')}
      ${kpi('Medium',         summary.medium   ?? 0, '#f39c12', 'overdue <3 days',    'Standard threshold breaches overdue for less than 3 days — still within the early response window but action is required soon.')}
    </div>`;

  const rows = alerts.map(a => {
    const col = URG_COL[a.urgency] ?? '#e67e22';
    const bg  = URG_BG[a.urgency]  ?? 'transparent';
    const ratio = a.threshold > 0 ? (a.peakCount / a.threshold).toFixed(1) : '?';
    const windowLabel = a.responseWindowHours === 48 ? '48 h (severe breach)' : '7 days';

    return `
      <div class="card card-p" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-weight:700;color:var(--text);font-size:0.95rem;">🚨 ${escapeHtml(a.pestName)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(a.fieldName)} — ${escapeHtml(a.farmName ?? '')}</div>
            ${a.scoutName ? `<div style="font-size:0.78rem;color:var(--text-dim);">Scout: ${escapeHtml(a.scoutName)}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <span style="padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;background:${bg};color:${col};">${a.urgency}</span>
            ${a.isSevere ? `<div style="font-size:0.72rem;color:#c0392b;margin-top:4px;font-weight:600;">⚠ Severe breach (${ratio}× threshold)</div>` : ''}
          </div>
        </div>

        <div style="display:flex;gap:16px;flex-wrap:wrap;margin:10px 0;font-size:0.82rem;">
          <span style="color:var(--text-dim);cursor:help;" title="Local calendar date of the most recent threshold breach observation for this pest × field combination within the selected period.">Breach date: <strong style="color:var(--text);">${new Date(a.breachDate + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Highest single observation count recorded above the threshold for this pest in this field during the selected period.">Peak count: <strong style="color:#c0392b;">${a.peakCount.toLocaleString()}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Configured action threshold per observation for this pest. A count at or above this number triggers a breach and starts the response window.">Threshold: <strong style="color:var(--text);">${a.threshold.toLocaleString()}</strong></span>
          <span style="color:var(--text-dim);cursor:help;" title="Time allowed after a breach before a follow-up scouting session is required: 48 hours for severe breaches (count ≥ 2× threshold), 7 days for standard breaches.">Response window: <strong style="color:var(--text);">${windowLabel}</strong></span>
        </div>

        <div style="background:${bg};border-radius:6px;padding:8px 12px;font-size:0.83rem;color:${col};font-weight:600;">
          ⏰ Overdue by ${a.daysOverdue} day${a.daysOverdue === 1 ? '' : 's'} — a follow-up scouting session is required immediately.
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
      A threshold breach is considered <strong>overdue</strong> when no follow-up scouting session has been completed on the same field within the response window: <strong>48 hours</strong> for severe breaches (count ≥ 2× threshold) and <strong>7 days</strong> for standard breaches. These fields need immediate attention.
    </div>
    ${kpis}
    <div>${rows}</div>`;
}
