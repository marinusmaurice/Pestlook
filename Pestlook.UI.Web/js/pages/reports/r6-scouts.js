import { escapeHtml } from '../../utils/helpers.js';
import {
  C, PALETTE, mkChart,
  kpiGrid, kpiCard, chartCard, tableCard, filterBadge,
} from './utils.js';

// data = { scouts: [...], weeklyActivity: [{ scouterName, weekStart, completedCount }] }
export function renderScoutProductivity(el, data, lookups) {
  const scouts         = data.scouts         ?? [];
  const weeklyActivity = data.weeklyActivity ?? [];

  const totalSessions = scouts.reduce((s, x) => s + (x.totalSessions ?? 0), 0);
  const avgPerScout   = scouts.length > 0 ? (totalSessions / scouts.length).toFixed(1) : '0';
  const topScout      = scouts[0];

  // Build top-5 weekly stacked chart
  const top5Names = scouts.slice(0, 5).map(s => s.scouterName);
  const weekSet   = [...new Set(weeklyActivity.map(w => w.weekStart))].sort();
  const weekLabels = weekSet.map(w => new Date(w).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));

  const datasets = top5Names.map((name, i) => ({
    label: name,
    data:  weekSet.map(w => {
      const entry = weeklyActivity.find(x => x.scouterName === name && x.weekStart === w);
      return entry?.completedCount ?? 0;
    }),
    backgroundColor: PALETTE[i % PALETTE.length],
    borderRadius: 3,
  }));

  const tableRows = scouts.length
    ? scouts.map(s => {
        const rate  = s.completionRate ?? 0;
        const color = rate >= 80 ? C.green : rate >= 50 ? C.amber : C.red;
        return `<tr>
          <td style="font-weight:500;">${escapeHtml(s.scouterName ?? '—')}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${s.totalSessions ?? 0}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${s.completed ?? 0}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="progress-bar" style="width:80px;">
                <div class="progress-fill" style="width:${rate}%;background:${color};"></div>
              </div>
              <span style="font-family:'JetBrains Mono',monospace;font-size:0.85rem;color:${color};">${rate.toFixed(0)}%</span>
            </div>
          </td>
          <td style="font-family:'JetBrains Mono',monospace;">${s.avgDurationMin != null ? s.avgDurationMin.toFixed(0) + ' min' : '—'}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${(s.totalObs ?? 0).toLocaleString()}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${s.obsPerSession != null ? s.obsPerSession.toFixed(1) : '—'}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${s.fieldCount ?? 0}</td>
          <td style="font-family:'JetBrains Mono',monospace;color:${(s.alertCount ?? 0) > 0 ? C.red : ''};">${s.alertCount ?? 0}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:20px;">No scout activity in selected period</td></tr>`;

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Active Scouts',    scouts.length,   'Scouts with sessions in period', '',
        'Number of individual scouts (users) who have at least one scouting session recorded within the selected date range and filters.'),
      kpiCard('Total Sessions',   totalSessions,   '', '',
        'Total number of scouting sessions attributed to any scout in the selected period, across all farms and fields in scope.'),
      kpiCard('Avg / Scout',      avgPerScout,     'Average sessions per scout', '',
        'Average number of sessions per active scout. Calculated as: total sessions ÷ number of scouts with at least one session in the period.'),
      kpiCard('Top Scout',        escapeHtml(topScout?.scouterName ?? '—'),
        topScout ? `${topScout.totalSessions} sessions` : '', '',
        'The scout who completed the most scouting sessions in the selected period. The sub-label shows their total session count.'),
    ])}
    ${chartCard('Weekly completed sessions — top 5 scouts', 'c-scouts-weekly', 220)}
    ${tableCard(
      ['Scout', 'Sessions', 'Completed', 'Compliance', 'Avg Duration', 'Total Obs', 'Obs/Session', 'Fields', 'Alerts'],
      tableRows,
      'Scout breakdown'
    )}
  `;

  setTimeout(() => {
    if (datasets.length) {
      mkChart('c-scouts-weekly', 'bar', { labels: weekLabels, datasets }, {
        plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { stacked: true, ticks: { font: { size: 11 } } },
          y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
        },
      });
    }
  }, 0);
}
