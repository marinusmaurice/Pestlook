import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, PALETTE, mkChart,
  trendArrow,
  kpiGrid, kpiCard, chartCard, tableCard, filterBadge, emptyState,
} from './utils.js';

// data = { kpis, weeklyTrend, topPests }
// lookups = { traps, farms, fields, farmNameById }
export function renderOverview(el, data, lookups) {
  const kpis       = data.kpis       ?? {};
  const weeklyTrend = data.weeklyTrend ?? [];
  const topPests   = data.topPests   ?? [];
  const traps      = lookups.traps   ?? [];

  const activeTraps   = traps.filter(t => t.isEnabled).length;
  const disabledTraps = traps.filter(t => !t.isEnabled).length;

  const spanDays = weeklyTrend.length > 1
    ? (new Date(weeklyTrend.at(-1).weekStart) - new Date(weeklyTrend[0].weekStart)) / 86400000
    : 0;
  const dateFmt = spanDays > 180
    ? { month: 'short', year: '2-digit' }
    : { day: 'numeric', month: 'short' };
  const weekLabels = weeklyTrend.map(w =>
    new Date(w.weekStart).toLocaleDateString('en-GB', dateFmt));
  const weekCounts = weeklyTrend.map(w => w.totalObs);

  const recent4 = weekCounts.slice(-4).reduce((a, b) => a + b, 0);
  const prior4  = weekCounts.slice(0, 4).reduce((a, b) => a + b, 0);
  const trendHtml = trendArrow(recent4, prior4);

  const compRate = kpis.totalSessions > 0
    ? Math.round(100 * kpis.completedSessions / kpis.totalSessions)
    : 0;

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Threshold Breaches', kpis.thresholdBreaches ?? 0,
        '',
        (kpis.thresholdBreaches ?? 0) > 0 ? C.red : ''),
      kpiCard('Session Compliance', compRate + '%',
        `${kpis.completedSessions ?? 0} of ${kpis.totalSessions ?? 0} completed`,
        compRate < 80 ? C.amber : C.green),
      kpiCard('Active Traps', activeTraps,
        `${disabledTraps} disabled`),
      kpiCard('Total Observations', (kpis.totalObservations ?? 0).toLocaleString(),
        `vs prev period: ${trendHtml}`, C.green),
    ])}
    <div class="two-col" style="margin-bottom:16px;">
      ${chartCard('Weekly pest count trend', 'c-trend', 200, 'Total observations per week in the selected period')}
      ${chartCard('Top 6 pests by count', 'c-pests', 200, 'Ranked by total observation count')}
    </div>
  `;

  setTimeout(() => {
    mkChart('c-trend', 'bar', {
      labels: weekLabels,
      datasets: [{
        data: weekCounts,
        backgroundColor: weekCounts.map(v => v > 0 ? C.blue : 'rgba(59,125,184,0.2)'),
        borderRadius: 4,
      }],
    }, { scales: { y: { beginAtZero: true, ticks: { font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } } });

    mkChart('c-pests', 'bar', {
      labels: topPests.map(p => (p.pestName ?? '').length > 18 ? p.pestName.slice(0, 16) + '…' : p.pestName),
      datasets: [{
        data: topPests.map(p => p.totalCount),
        backgroundColor: PALETTE,
        borderRadius: 4,
      }],
    }, { indexAxis: 'y', scales: { x: { ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } } });
  }, 0);
}
