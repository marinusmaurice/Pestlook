import { escapeHtml } from '../../utils/helpers.js';
import {
  C, mkChart,
  realObs, completedSessions,
  kpiGrid, kpiCard, chartCard, tableCard, filterBadge,
} from './utils.js';

export function renderSeasonalTrends(el, { sessions }, rawData) {
  const monthMap = {};
  for (const s of completedSessions(sessions)) {
    const d   = new Date(s.completedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const lbl = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    if (!monthMap[key]) monthMap[key] = { label: lbl, totalObs: 0, temps: [], sessions: 0, pestCounts: {} };
    const m = monthMap[key];
    m.sessions++;
    for (const o of realObs(s)) {
      m.totalObs += o.count ?? 1;
      if (!o.isUnknownPest && o.pestName) {
        m.pestCounts[o.pestName] = (m.pestCounts[o.pestName] || 0) + (o.count ?? 1);
      }
    }
    if (s.temperatureCelsius != null) m.temps.push(s.temperatureCelsius);
  }

  const allMonths = Object.keys(monthMap).sort();
  const months    = allMonths.slice(-18); // last 18 months
  const labels    = months.map(k => monthMap[k].label);
  const obsCounts = months.map(k => monthMap[k].totalObs);
  const sessCounts = months.map(k => monthMap[k].sessions);
  const avgTemps  = months.map(k => {
    const t = monthMap[k].temps;
    return t.length ? parseFloat((t.reduce((a, b) => a + b, 0) / t.length).toFixed(1)) : null;
  });

  // Peak month
  const peakIdx     = obsCounts.indexOf(Math.max(...obsCounts));
  const peakMonth   = peakIdx >= 0 ? labels[peakIdx] : '—';
  const peakCount   = peakIdx >= 0 ? obsCounts[peakIdx] : 0;
  const totalObs    = obsCounts.reduce((a, b) => a + b, 0);
  const avgPerMonth = months.length > 0 ? Math.round(totalObs / months.length) : 0;

  // Overall top pest across all months
  const allPestCounts = {};
  for (const k of months) {
    for (const [p, v] of Object.entries(monthMap[k].pestCounts)) {
      allPestCounts[p] = (allPestCounts[p] || 0) + v;
    }
  }
  const topPest = Object.entries(allPestCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const tableRows = months.length
    ? [...months].reverse().map(k => {
        const m    = monthMap[k];
        const avgT = m.temps.length
          ? (m.temps.reduce((a, b) => a + b, 0) / m.temps.length).toFixed(1) + ' °C'
          : '—';
        const top3 = Object.entries(m.pestCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => escapeHtml(n)).join(', ') || '—';
        return `<tr>
          <td>${escapeHtml(m.label)}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${m.totalObs.toLocaleString()}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${m.sessions}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${avgT}</td>
          <td style="font-size:0.8rem;">${top3}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:20px;">No completed sessions in selected period</td></tr>`;

  el.innerHTML = `
    ${filterBadge(rawData)}
    ${kpiGrid([
      kpiCard('Peak Month',     peakMonth,     `${peakCount.toLocaleString()} observations`, peakCount > 0 ? C.red : ''),
      kpiCard('Avg / Month',    avgPerMonth.toLocaleString(), 'Average pest observations per month'),
      kpiCard('Months Tracked', months.length, 'Up to 18 months of history'),
      kpiCard('Top Pest (Period)', escapeHtml(topPest), allPestCounts[topPest] ? allPestCounts[topPest].toLocaleString() + ' total' : ''),
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
