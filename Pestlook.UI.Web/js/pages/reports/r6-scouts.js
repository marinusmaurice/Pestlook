import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, PALETTE, mkChart,
  realObs, sessionDuration, overdueSessions,
  lastNWeekLabels, weekIndex,
  kpiGrid, kpiCard, chartCard, tableCard, filterBadge,
} from './utils.js';

export function renderScoutProductivity(el, { sessions, pests }, rawData) {
  const pestById = Object.fromEntries(pests.map(p => [p.id, p]));
  const scoutMap = {};
  const now = new Date();

  for (const s of sessions) {
    const name = s.scouterName || s.scouterId || 'Unknown';
    if (!scoutMap[name]) scoutMap[name] = {
      sessions: 0, completed: 0, alerts: 0, overdue: 0,
      durations: [], totalObs: 0,
      fields: new Set(), farms: new Set(),
    };
    const sm = scoutMap[name];
    sm.sessions++;
    if (s.completedAt) sm.completed++;
    const obs = realObs(s);
    sm.totalObs += obs.reduce((sum, o) => sum + (o.count ?? 1), 0);
    for (const o of obs) {
      const pest = o.pestId ? pestById[o.pestId] : null;
      if (pest?.thresholdCount != null && (o.count || 0) > pest.thresholdCount) sm.alerts++;
    }
    const dur = sessionDuration(s);
    if (dur !== null) sm.durations.push(dur);
    if (s.isPlanned && !s.startedAt && !s.completedAt && s.scheduledDate && new Date(s.scheduledDate) < now) sm.overdue++;
    if (s.fieldId) sm.fields.add(s.fieldId);
    if (s.farmId)  sm.farms.add(s.farmId);
  }

  const scouts = Object.entries(scoutMap).sort((a, b) => b[1].sessions - a[1].sessions);
  const totalSessions  = sessions.length;
  const totalScouts    = scouts.length;
  const avgSessPerScout = totalScouts > 0 ? (totalSessions / totalScouts).toFixed(1) : '—';
  const topScout = scouts[0];

  const weeks = lastNWeekLabels(8);
  const scoutDatasets = scouts.slice(0, 5).map(([name], i) => {
    const counts = Array(8).fill(0);
    for (const s of sessions.filter(ss => (ss.scouterName || ss.scouterId || 'Unknown') === name)) {
      const idx = weekIndex(s.completedAt || s.startedAt || s.scheduledDate);
      if (idx >= 0) counts[idx]++;
    }
    return {
      label: name.length > 14 ? name.slice(0, 12) + '…' : name,
      data: counts,
      backgroundColor: PALETTE[i % PALETTE.length],
      borderRadius: 3,
      stack: 's',
    };
  });

  const tableRows = scouts.map(([name, sm]) => {
    const avgDur     = sm.durations.length
      ? Math.round(sm.durations.reduce((a, b) => a + b, 0) / sm.durations.length)
      : null;
    const compRate   = sm.sessions > 0 ? Math.round((sm.completed / sm.sessions) * 100) : 0;
    const obsPerSess = sm.completed > 0 ? (sm.totalObs / sm.completed).toFixed(1) : '—';
    const compColor  = compRate >= 80 ? C.green : compRate >= 50 ? C.amber : C.red;
    return `<tr>
      <td style="font-weight:500;">${escapeHtml(name)}</td>
      <td style="font-family:'JetBrains Mono',monospace;">${sm.sessions}</td>
      <td style="font-family:'JetBrains Mono',monospace;">
        <span style="font-weight:600;color:${compColor};">${compRate}%</span>
        <span style="font-size:0.75rem;color:var(--text-dim);margin-left:4px;">${sm.completed}/${sm.sessions}</span>
      </td>
      <td style="font-family:'JetBrains Mono',monospace;">${avgDur !== null ? avgDur + ' min' : '—'}</td>
      <td style="font-family:'JetBrains Mono',monospace;">${sm.totalObs.toLocaleString()}</td>
      <td style="font-family:'JetBrains Mono',monospace;">${obsPerSess}</td>
      <td style="font-family:'JetBrains Mono',monospace;">${sm.fields.size}</td>
      <td style="font-family:'JetBrains Mono',monospace;color:${sm.alerts > 0 ? C.red : ''};">${sm.alerts}</td>
      <td style="font-family:'JetBrains Mono',monospace;color:${sm.overdue > 0 ? C.amber : ''};">${sm.overdue}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:20px;">No scouting data in selected period</td></tr>`;

  el.innerHTML = `
    ${filterBadge(rawData)}
    ${kpiGrid([
      kpiCard('Active Scouts', totalScouts, 'With sessions in period'),
      kpiCard('Most Sessions', topScout ? escapeHtml(topScout[0]) : '—',
        topScout ? topScout[1].sessions + ' sessions · ' + topScout[1].completed + ' completed' : ''),
      kpiCard('Avg Sessions / Scout', avgSessPerScout, 'In selected period'),
      kpiCard('Overdue Sessions', overdueSessions(sessions).length,
        'Across all scouts', overdueSessions(sessions).length > 0 ? C.amber : ''),
    ])}
    ${chartCard('Sessions per scout — last 8 weeks (top 5)', 'c-scouts', 200, 'Stacked by scout name')}
    ${tableCard(
      ['Scout', 'Sessions', 'Compliance', 'Avg Duration', 'Total Obs', 'Obs / Session', 'Fields', 'Alerts', 'Overdue'],
      tableRows,
      'Scout performance breakdown'
    )}
  `;

  setTimeout(() => {
    mkChart('c-scouts', 'bar', { labels: weeks, datasets: scoutDatasets }, {
      scales: {
        x: { stacked: true, ticks: { font: { size: 11 } } },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
      },
      plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
    });
  }, 0);
}
