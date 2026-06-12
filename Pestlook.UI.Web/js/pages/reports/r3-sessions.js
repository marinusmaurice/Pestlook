import { escapeHtml, formatDate } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, PALETTE, mkChart,
  kpiGrid, kpiCard, chartCard, tableCard, emptyState, filterBadge,
} from './utils.js';

// data = { kpis, scoutCompliance, weeklyStacked, sessions }
export function renderScoutingSessions(el, data, lookups) {
  const kpis           = data.kpis           ?? {};
  const scoutCompliance = data.scoutCompliance ?? [];
  const weeklyStacked  = data.weeklyStacked   ?? [];
  const sessions       = data.sessions        ?? [];

  const weekLabels  = weeklyStacked.map(w =>
    new Date(w.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }));
  const completedW  = weeklyStacked.map(w => w.completed);
  const plannedW    = weeklyStacked.map(w => w.planned);
  const overdueW    = weeklyStacked.map(w => w.overdue);

  const complianceRows = scoutCompliance.length
    ? scoutCompliance.map(s => {
        const rate = s.total > 0 ? Math.round(100 * s.completed / s.total) : 0;
        const color = rate >= 80 ? C.green : rate >= 50 ? C.amber : C.red;
        return `<tr>
          <td style="font-weight:500;">${escapeHtml(s.scouterName ?? '—')}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${s.total}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${s.completed}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="progress-bar" style="width:80px;">
                <div class="progress-fill" style="width:${rate}%;background:${color};"></div>
              </div>
              <span style="font-family:'JetBrains Mono',monospace;font-size:0.85rem;color:${color};">${rate}%</span>
            </div>
          </td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No scout data</td></tr>`;

  const sessionRows = sessions.length
    ? sessions.map(s => {
        const status = s.completedAt  ? tag('Completed', 'green')
                     : s.startedAt    ? tag('Active',    'blue')
                     : s.scheduledDate && new Date(s.scheduledDate) <= new Date() ? tag('Overdue', 'red')
                     : tag('Planned', 'amber');
        let dateStr, datePill;
        if (s.scheduledDate && !s.startedAt) {
          dateStr  = formatDate(s.scheduledDate);
          datePill = `<span style="display:inline-block;font-size:0.62rem;font-weight:600;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.4);border-radius:20px;padding:1px 7px;vertical-align:middle;margin-left:5px;line-height:1.6;">Scheduled</span>`;
        } else if (s.startedAt && !s.completedAt) {
          dateStr  = formatDate(s.startedAt);
          datePill = `<span style="display:inline-block;font-size:0.62rem;font-weight:600;background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.4);border-radius:20px;padding:1px 7px;vertical-align:middle;margin-left:5px;line-height:1.6;">Started</span>`;
        } else if (s.completedAt) {
          dateStr  = formatDate(s.startedAt || s.completedAt);
          datePill = `<span style="display:inline-block;font-size:0.62rem;font-weight:600;background:rgba(129,140,248,0.15);color:#818cf8;border:1px solid rgba(129,140,248,0.4);border-radius:20px;padding:1px 7px;vertical-align:middle;margin-left:5px;line-height:1.6;">Completed</span>`;
        } else {
          dateStr  = '—';
          datePill = '';
        }
        return `<tr>
          <td style="font-size:0.82rem;white-space:nowrap;">${dateStr}${datePill}</td>
          <td style="font-weight:500;">${escapeHtml(s.fieldName ?? '—')}</td>
          <td>${escapeHtml(s.farmName ?? '—')}</td>
          <td>${escapeHtml(s.scouterName ?? '—')}</td>
          <td>${status}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${s.durationMin != null ? s.durationMin + ' min' : '—'}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${s.obsCount ?? 0}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:20px;">No sessions in selected period</td></tr>`;

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Total Sessions',    kpis.total      ?? 0, '',  '',
        'Total number of scouting sessions in the selected date range and filter scope, including planned, active, completed, and overdue sessions.'),
      kpiCard('Completion Rate',   (kpis.completionRate ?? 0) + '%',
        `${kpis.completed ?? 0} completed · ${kpis.overdue ?? 0} overdue`,
        (kpis.overdue ?? 0) > 0 ? C.amber : C.green,
        'Percentage of sessions that were fully completed. Calculated as: completed sessions ÷ total sessions × 100. Sessions still active or planned are excluded from the numerator.'),
      kpiCard('Avg Duration',      (kpis.avgDurationMin ?? 0) + ' min',
        `Min ${kpis.minDurationMin ?? 0} · Max ${kpis.maxDurationMin ?? 0}`, '',
        'Average time (in minutes) between session start and completion, taken across all completed sessions in the period. Min and Max show the shortest and longest individual sessions.'),
      kpiCard('Active Now',        kpis.active ?? 0, 'Sessions currently in progress', '',
        'Number of sessions that have been started (have a start time) but not yet marked as completed. These are in-progress at the time the report was loaded.'),
    ])}
    ${chartCard('Weekly session activity', 'c-sess-weekly', 200, 'Completed / planned / overdue per week')}
    ${tableCard(
      ['Scout', 'Total', 'Completed', 'Compliance'],
      complianceRows,
      'Scout compliance',
      'Sessions completed vs total assigned'
    )}
    ${tableCard(
      ['Date', 'Field', 'Farm', 'Scout', 'Status', 'Duration', 'Observations'],
      sessionRows,
      'Session list',
      'Most recent 150 sessions'
    )}
  `;

  setTimeout(() => {
    mkChart('c-sess-weekly', 'bar', {
      labels: weekLabels,
      datasets: [
        { label: 'Completed', data: completedW, backgroundColor: C.green,  borderRadius: 3 },
        { label: 'Planned',   data: plannedW,   backgroundColor: C.blue,   borderRadius: 3 },
        { label: 'Overdue',   data: overdueW,   backgroundColor: C.red,    borderRadius: 3 },
      ],
    }, {
      plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 11 } } },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
      },
    });
  }, 0);
}
