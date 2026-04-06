import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, PALETTE, mkChart,
  allRealObs, realObs, completedSessions, plannedSessions, activeSessions, overdueSessions,
  trendArrow, lastNWeekLabels, weekIndex,
  kpiGrid, kpiCard, chartCard, tableCard, filterBadge,
} from './utils.js';

export function renderOverview(el, { sessions, traps, pests }, rawData) {
  const pestById = Object.fromEntries(pests.map(p => [p.id, p]));
  const obs      = allRealObs(sessions);

  const breaches = [];
  for (const s of sessions) {
    for (const o of realObs(s)) {
      if (!o.thresholdCount || (o.count || 0) <= o.thresholdCount) continue;
      const pct    = Math.round(((o.count - o.thresholdCount) / o.thresholdCount) * 100);
      const isCrit = (o.count || 0) >= o.thresholdCount * 2;
      const pest   = o.pestId ? pestById[o.pestId] : null;
      breaches.push({ o, s, pest, pct, isCrit });
    }
  }
  breaches.sort((a, b) => b.pct - a.pct);

  const critical  = breaches.filter(b => b.isCrit).length;
  const completed = completedSessions(sessions);
  const planned   = plannedSessions(sessions);
  const overdue   = overdueSessions(sessions);
  const totalObs  = obs.reduce((sum, o) => sum + (o.count || 1), 0);
  const compTotal = completed.length + planned.length + overdue.length;
  const compRate  = compTotal > 0 ? Math.round((completed.length / compTotal) * 100) : 0;

  const pestCounts = {};
  for (const o of obs) {
    if (o.isUnknownPest || !o.pestName) continue;
    pestCounts[o.pestName] = (pestCounts[o.pestName] || 0) + (o.count || 1);
  }
  const topPests = Object.entries(pestCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const weeks      = lastNWeekLabels(8);
  const weekCounts = Array(8).fill(0);
  for (const s of sessions) {
    const idx = weekIndex(s.completedAt || s.startedAt);
    if (idx < 0) continue;
    for (const o of realObs(s)) weekCounts[idx] += o.count || 1;
  }
  const recent4   = weekCounts.slice(4).reduce((a, b) => a + b, 0);
  const prior4    = weekCounts.slice(0, 4).reduce((a, b) => a + b, 0);
  const trendHtml = trendArrow(recent4, prior4);

  const breachRows = breaches.slice(0, 6).map(({ o, s, pest, pct, isCrit }) => `<tr>
    <td style="font-weight:500;">${escapeHtml(pest.commonName)}</td>
    <td>${escapeHtml(s.fieldName || '—')}</td>
    <td>${escapeHtml(s.farmName  || '—')}</td>
    <td style="font-family:'JetBrains Mono',monospace;font-weight:600;color:${isCrit ? C.red : C.amber};">${o.count ?? '—'}</td>
    <td style="font-family:'JetBrains Mono',monospace;">${o.thresholdCount ?? '—'}</td>
    <td style="font-family:'JetBrains Mono',monospace;">${pct}%</td>
    <td>${tag(isCrit ? 'Critical' : 'Warning', isCrit ? 'red' : 'amber')}</td>
  </tr>`).join('') ||
    `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:16px;">No threshold breaches in this period</td></tr>`;

  el.innerHTML = `
    ${filterBadge(rawData)}
    ${kpiGrid([
      kpiCard('Threshold Breaches', breaches.length,
        `${critical} critical · ${breaches.length - critical} warning`,
        breaches.length > 0 ? C.red : ''),
      kpiCard('Session Compliance', compRate + '%',
        `${completed.length} completed · ${overdue.length} overdue`,
        overdue.length > 0 ? C.amber : C.green),
      kpiCard('Active Traps', traps.filter(t => t.isEnabled).length,
        `${traps.filter(t => !t.isEnabled).length} disabled`),
      kpiCard('Total Observations', totalObs.toLocaleString(),
        `vs prev period: ${trendHtml}`, C.green),
    ])}
    <div class="two-col" style="margin-bottom:16px;">
      ${chartCard('Weekly pest count trend', 'c-trend', 200, 'Total observations per week in the selected period')}
      ${chartCard('Top 6 pests by count', 'c-pests', 200, 'Ranked by total observation count')}
    </div>
    <div class="two-col" style="margin-bottom:16px;">
      ${chartCard('Session status breakdown', 'c-sess', 180)}
      ${chartCard('Observation type distribution', 'c-donut', 180, 'Trap catch vs ad-hoc scouting')}
    </div>
    ${tableCard(
      ['Pest', 'Field', 'Farm', 'Count', 'Threshold', 'Over by', 'Status'],
      breachRows,
      'Active threshold breaches',
      'Pests exceeding economic thresholds — requires immediate action'
    )}
  `;

  setTimeout(() => {
    mkChart('c-trend', 'bar', {
      labels: weeks,
      datasets: [{ data: weekCounts, backgroundColor: weekCounts.map(v => v > 0 ? C.blue : 'rgba(59,125,184,0.2)'), borderRadius: 4 }],
    }, { scales: { y: { beginAtZero: true, ticks: { font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } } });

    mkChart('c-pests', 'bar', {
      labels: topPests.map(([n]) => n.length > 18 ? n.slice(0, 16) + '…' : n),
      datasets: [{ data: topPests.map(([, v]) => v), backgroundColor: PALETTE, borderRadius: 4 }],
    }, { indexAxis: 'y', scales: { x: { ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } } });

    mkChart('c-sess', 'doughnut', {
      labels: ['Completed', 'Planned', 'Overdue', 'Active'],
      datasets: [{ data: [completed.length, planned.length, overdue.length, activeSessions(sessions).length],
        backgroundColor: [C.green, C.blue, C.red, C.amber], borderWidth: 0 }],
    }, { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } });

    const trapTotal  = obs.filter(o => o.observationType === 'Trap'  || o.observationType === 0).length;
    const adhocTotal = obs.filter(o => o.observationType === 'AdHoc' || o.observationType === 1).length;
    mkChart('c-donut', 'doughnut', {
      labels: ['Trap catch', 'Ad-hoc scouting'],
      datasets: [{ data: [trapTotal, adhocTotal], backgroundColor: [C.teal, C.green], borderWidth: 0 }],
    }, { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } });
  }, 0);
}
