import { escapeHtml } from '../../utils/helpers.js';
import {
  C, mkChart,
  kpiGrid, kpiCard, chartCard, tableCard, filterBadge,
} from './utils.js';

// data = { months: [{ monthKey, monthLabel, sessionCount, totalObs, avgTempCelsius, topPests }] }
export function renderSeasonalTrends(el, data, lookups) {
  const months = data.months ?? [];

  const obsCounts  = months.map(m => m.totalObs    ?? 0);
  const sessCounts = months.map(m => m.sessionCount ?? 0);
  const avgTemps   = months.map(m => m.avgTempCelsius ?? null);
  const labels     = months.map(m => m.monthLabel ?? m.monthKey);

  const peakIdx   = obsCounts.indexOf(Math.max(...obsCounts, 0));
  const peakMonth = peakIdx >= 0 ? labels[peakIdx] : '—';
  const peakCount = peakIdx >= 0 ? obsCounts[peakIdx] : 0;
  const totalObs  = obsCounts.reduce((a, b) => a + b, 0);
  const avgPerMo  = months.length > 0 ? Math.round(totalObs / months.length) : 0;

  // Overall top pest
  const allPest = {};
  for (const m of months) {
    for (const p of (m.topPests ?? [])) {
      allPest[p.pestName] = (allPest[p.pestName] ?? 0) + (p.pestCount ?? 0);
    }
  }
  const topPest = Object.entries(allPest).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const tableRows = months.length
    ? [...months].reverse().map(m => {
        const avgT = m.avgTempCelsius != null ? m.avgTempCelsius.toFixed(1) + ' °C' : '—';
        const top3 = (m.topPests ?? []).map(p => escapeHtml(p.pestName)).join(', ') || '—';
        return `<tr>
          <td>${escapeHtml(m.monthLabel ?? m.monthKey)}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${(m.totalObs ?? 0).toLocaleString()}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${m.sessionCount ?? 0}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${avgT}</td>
          <td style="font-size:0.8rem;">${top3}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:20px;">No completed sessions in selected period</td></tr>`;

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Peak Month',        peakMonth, `${peakCount.toLocaleString()} observations`, peakCount > 0 ? C.red : ''),
      kpiCard('Avg / Month',       avgPerMo.toLocaleString(), 'Average pest observations per month'),
      kpiCard('Months Tracked',    months.length, 'Up to 18 months of history'),
      kpiCard('Top Pest (Period)', escapeHtml(topPest), allPest[topPest] ? allPest[topPest].toLocaleString() + ' total' : ''),
    ])}
    ${chartCard('Monthly pest counts vs avg temperature (°C)', 'c-seasonal', 250, 'Pest pressure typically rises with temperature — spot seasonal patterns')}
    ${chartCard('Scouting sessions per month', 'c-sess-monthly', 160)}
    ${tableCard(
      ['Month', 'Total Obs', 'Sessions', 'Avg Temp', 'Top Pests'],
      tableRows,
      'Monthly breakdown',
      'Most recent first — last 18 months'
    )}
  `;

  setTimeout(() => {
    mkChart('c-seasonal', 'line', {
      labels,
      datasets: [
        { label: 'Total pest count', data: obsCounts, borderColor: C.red,   backgroundColor: 'rgba(199,81,70,.06)',  fill: true, tension: 0.3, yAxisID: 'y',  pointRadius: 4 },
        { label: 'Avg temp °C',      data: avgTemps,  borderColor: C.amber, backgroundColor: 'transparent',          fill: false, tension: 0.3, yAxisID: 'y1', borderDash: [4, 3], pointRadius: 3 },
      ],
    }, {
      plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
      scales: {
        y:  { beginAtZero: true, ticks: { font: { size: 11 } } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 11 }, callback: v => v + '°' } },
        x:  { ticks: { font: { size: 11 } } },
      },
    });

    mkChart('c-sess-monthly', 'bar', {
      labels,
      datasets: [{ data: sessCounts, backgroundColor: C.blue, borderRadius: 4 }],
    }, { scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } } });
  }, 0);
}
