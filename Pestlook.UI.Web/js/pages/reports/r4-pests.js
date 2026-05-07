import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, PALETTE, mkChart,
  kpiGrid, kpiCard, chartCard, tableCard, emptyState, filterBadge,
} from './utils.js';

// data = { pests: [{ pestId, pestName, category, totalCount, fieldCount, sessionCount, breachCount, thresholdCount, topLifeStage }] }
export function renderTopPests(el, data, lookups) {
  const pests = data.pests ?? [];

  const totalCount    = pests.reduce((s, p) => s + (p.totalCount ?? 0), 0);
  const uniqueSpecies = pests.length;
  const aboveThresh   = pests.filter(p => (p.breachCount ?? 0) > 0).length;
  const mostWide      = pests.reduce((best, p) =>
    (p.fieldCount ?? 0) > (best?.fieldCount ?? 0) ? p : best, null);

  // Category breakdown
  const catMap = {};
  for (const p of pests) {
    const cat = p.category ?? 'Unknown';
    catMap[cat] = (catMap[cat] ?? 0) + (p.totalCount ?? 0);
  }
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const top10 = pests.slice(0, 10);

  const tableRows = pests.length
    ? pests.map((p, i) => {
        const share = totalCount > 0 ? ((p.totalCount / totalCount) * 100).toFixed(1) : '0.0';
        return `<tr>
          <td style="font-family:'JetBrains Mono',monospace;color:var(--text-dim);">${i + 1}</td>
          <td style="font-weight:500;">${escapeHtml(p.pestName ?? '—')}</td>
          <td style="font-size:0.8rem;">${escapeHtml(p.category ?? '—')}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${(p.totalCount ?? 0).toLocaleString()}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${share}%</td>
          <td style="font-family:'JetBrains Mono',monospace;">${p.fieldCount ?? 0}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${p.sessionCount ?? 0}</td>
          <td style="font-family:'JetBrains Mono',monospace;color:${(p.breachCount ?? 0) > 0 ? C.red : ''};">${p.breachCount ?? 0}</td>
          <td style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(p.topLifeStage ?? '—')}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:20px;">No pest observations in selected period</td></tr>`;

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Unique Species',     uniqueSpecies, 'Different pest species observed'),
      kpiCard('Total Observations', totalCount.toLocaleString(), 'Across all fields and sessions'),
      kpiCard('Above Threshold',    aboveThresh, 'Species with at least one breach', aboveThresh > 0 ? C.red : ''),
      kpiCard('Most Widespread',    escapeHtml(mostWide?.pestName ?? '—'),
        mostWide ? `${mostWide.fieldCount} field${mostWide.fieldCount !== 1 ? 's' : ''}` : ''),
    ])}
    <div class="two-col" style="margin-bottom:16px;">
      ${chartCard('Top 10 pests by count', 'c-pests-bar', 220)}
      ${chartCard('Observations by pest category', 'c-pests-cat', 220)}
    </div>
    ${tableCard(
      ['#', 'Pest', 'Category', 'Count', 'Share', 'Fields', 'Sessions', 'Breaches', 'Top Life Stage'],
      tableRows,
      'All observed pests',
      'Sorted by total count — highest first'
    )}
  `;

  setTimeout(() => {
    mkChart('c-pests-bar', 'bar', {
      labels: top10.map(p => (p.pestName ?? '').length > 18 ? p.pestName.slice(0, 16) + '…' : p.pestName),
      datasets: [{
        data: top10.map(p => p.totalCount ?? 0),
        backgroundColor: PALETTE,
        borderRadius: 4,
      }],
    }, { indexAxis: 'y', scales: { x: { ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } } });

    mkChart('c-pests-cat', 'doughnut', {
      labels: catEntries.map(([n]) => n),
      datasets: [{ data: catEntries.map(([, v]) => v), backgroundColor: PALETTE, borderWidth: 0 }],
    }, { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } });
  }, 0);
}
