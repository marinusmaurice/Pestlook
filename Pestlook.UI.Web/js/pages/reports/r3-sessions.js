import { escapeHtml, formatDate } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, PALETTE, mkChart,
  realObs, completedSessions, plannedSessions, overdueSessions, activeSessions, sessionDuration,
  lastNWeekLabels, weekIndex,
  kpiGrid, kpiCard, chartCard, tableCard, filterBadge,
} from './utils.js';

export function renderScoutingSessions(el, { sessions }, rawData) {
  const completed = completedSessions(sessions);
  const planned   = plannedSessions(sessions);
  const overdue   = overdueSessions(sessions);
  const active    = activeSessions(sessions);

  const total      = sessions.length;
  const compRate   = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  const durations  = completed.map(sessionDuration).filter(d => d !== null);
  const avgDur     = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  const minDur     = durations.length ? Math.min(...durations) : null;
  const maxDur     = durations.length ? Math.max(...durations) : null;
  const now        = new Date();

  // Compliance rate per scout
  const scoutMap = {};
  for (const s of sessions) {
    const name = s.scouterName || s.scouterId || 'Unknown';
    if (!scoutMap[name]) scoutMap[name] = { completed: 0, total: 0 };
    scoutMap[name].total++;
    if (s.completedAt) scoutMap[name].completed++;
  }

  // Weekly completion counts (stacked: completed / planned / overdue)
  const weeks            = lastNWeekLabels(8);
  const weekCompleted    = Array(8).fill(0);
  const weekPlanned      = Array(8).fill(0);
  const weekOverdue      = Array(8).fill(0);
  for (const s of sessions) {
    const ref = s.completedAt || s.startedAt || s.scheduledDate;
    const idx = weekIndex(ref);
    if (idx < 0) continue;
    if (s.completedAt) weekCompleted[idx]++;
    else if (s.isPlanned && !s.startedAt && s.scheduledDate && new Date(s.scheduledDate) < now) weekOverdue[idx]++;
    else if (s.isPlanned) weekPlanned[idx]++;
  }

  const tableRows = sessions
    .slice()
    .sort((a, b) => {
      const da = new Date(b.scheduledDate || b.startedAt || b.completedAt || 0);
      const db = new Date(a.scheduledDate || a.startedAt || a.completedAt || 0);
      return da - db;
    })
    .slice(0, 150)
    .map(s => {
      const isCompleted = !!s.completedAt;
      const isActive    = !!s.startedAt && !isCompleted;
      const isOvd       = s.isPlanned && !s.startedAt && !isCompleted && s.scheduledDate && new Date(s.scheduledDate) < now;
      let statusTag;
      if (isCompleted)      statusTag = tag('Complete', 'green');
      else if (isActive)    statusTag = tag('Active',   'blue');
      else if (isOvd)       statusTag = tag('Overdue',  'red');
      else if (s.isPlanned) statusTag = tag('Planned',  'gray');
      else                  statusTag = tag('—', 'gray');

      const dur      = sessionDuration(s);
      const obs      = realObs(s);
      const obsTotal = obs.reduce((sum, o) => sum + (o.count || 1), 0);
      const dateStr  = s.scheduledDate ? formatDate(s.scheduledDate) : (s.startedAt ? formatDate(s.startedAt) : '—');
      const weather  = s.weatherConditions
        ? escapeHtml(s.weatherConditions) + (s.temperatureCelsius != null ? ', ' + Math.round(s.temperatureCelsius) + '°C' : '')
        : '—';

      return `<tr>
        <td style="font-size:0.82rem;">${dateStr}</td>
        <td>${escapeHtml(s.farmName  || '—')}</td>
        <td>${escapeHtml(s.fieldName || '—')}</td>
        <td>${escapeHtml(s.scouterName || '—')}</td>
        <td style="font-family:'JetBrains Mono',monospace;">${dur !== null ? dur + ' min' : '—'}</td>
        <td style="font-family:'JetBrains Mono',monospace;">${isCompleted ? obsTotal : '—'}</td>
        <td style="font-size:0.82rem;color:var(--text-dim);">${weather}</td>
        <td>${statusTag}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:20px;">No sessions in selected period</td></tr>`;

  el.innerHTML = `
    ${filterBadge(rawData)}
    ${kpiGrid([
      kpiCard('Compliance Rate', compRate + '%',
        `${completed.length} of ${total} completed`,
        compRate >= 80 ? C.green : compRate >= 50 ? C.amber : C.red),
      kpiCard('Overdue Sessions', overdue.length,
        'Past scheduled date — follow up required',
        overdue.length > 0 ? C.red : ''),
      kpiCard('Avg Duration', avgDur !== null ? avgDur + ' min' : '—',
        minDur !== null ? `Min ${minDur} · Max ${maxDur} min` : 'No completed sessions'),
      kpiCard('Active Now', active.length,
        planned.length + ' planned upcoming', active.length > 0 ? C.blue : ''),
    ])}
    ${chartCard('Weekly session activity', 'c-sessions-weekly', 200, 'Completed, planned and overdue sessions per week')}
    ${tableCard(
      ['Date', 'Farm', 'Field', 'Scout', 'Duration', 'Obs Total', 'Weather', 'Status'],
      tableRows,
      'All sessions',
      'Most recent first — showing up to 150 records'
    )}
  `;

  setTimeout(() => {
    mkChart('c-sessions-weekly', 'bar', {
      labels: weeks,
      datasets: [
        { label: 'Completed', data: weekCompleted, backgroundColor: C.green,  borderRadius: 3, stack: 's' },
        { label: 'Planned',   data: weekPlanned,   backgroundColor: C.blue,   borderRadius: 3, stack: 's' },
        { label: 'Overdue',   data: weekOverdue,   backgroundColor: C.red,    borderRadius: 3, stack: 's' },
      ],
    }, {
      scales: {
        x: { stacked: true, ticks: { font: { size: 11 } } },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
      },
      plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
    });
  }, 0);
}
