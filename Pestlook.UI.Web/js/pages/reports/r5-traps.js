import { escapeHtml, formatDate } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, PALETTE, mkChart,
  kpiGrid, kpiCard, chartCard, tableCard, emptyState, filterBadge,
} from './utils.js';

// data = { traps: [...], catchesByType: [{ trapType, totalCatches }] }
export function renderTrapPerformance(el, data, lookups) {
  const traps         = data.traps         ?? [];
  const catchesByType = data.catchesByType ?? [];

  const activeTraps   = traps.filter(t => t.isEnabled).length;
  const totalCatches  = traps.reduce((s, t) => s + (t.totalCatches ?? 0), 0);
  const totalChecks   = traps.reduce((s, t) => s + (t.checkCount   ?? 0), 0);
  const avgCatchRate  = totalChecks > 0 ? (totalCatches / totalChecks).toFixed(2) : '0.00';
  const overdue7      = traps.filter(t => t.isEnabled && (t.daysSinceCheck ?? 0) > 7).length;

  const sorted = [...traps].sort((a, b) => (b.totalCatches ?? 0) - (a.totalCatches ?? 0));

  const tableRows = sorted.length
    ? sorted.map(t => {
        const overdueTag = t.isEnabled && (t.daysSinceCheck ?? 0) > 7
          ? tag('Overdue', 'red')
          : t.isEnabled ? tag('Active', 'green') : tag('Disabled', 'amber');
        return `<tr>
          <td style="font-weight:500;">${escapeHtml(t.trapName ?? '—')}</td>
          <td style="font-size:0.8rem;">${escapeHtml(t.trapType ?? '—')}</td>
          <td>${escapeHtml(t.fieldName ?? '—')}</td>
          <td>${escapeHtml(t.farmName  ?? '—')}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${(t.totalCatches ?? 0).toLocaleString()}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${t.checkCount ?? 0}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${t.catchRate  ?? 0}</td>
          <td style="font-size:0.82rem;">${t.lastChecked ? formatDate(t.lastChecked) : '—'}</td>
          <td style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(t.topPest ?? '—')}</td>
          <td>${overdueTag}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="10" style="text-align:center;color:var(--text-dim);padding:20px;">No traps found for the selected filters</td></tr>`;

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Active Traps',   activeTraps,  `${traps.length - activeTraps} disabled`),
      kpiCard('Total Catches',  totalCatches.toLocaleString(), 'In selected period'),
      kpiCard('Avg Catch Rate', avgCatchRate, 'catches per check'),
      kpiCard('Overdue Checks', overdue7, 'Active traps not checked in > 7 days', overdue7 > 0 ? C.red : ''),
    ])}
    <div class="two-col" style="margin-bottom:16px;">
      ${chartCard('Top 10 traps by catches', 'c-traps-bar', 220)}
      ${chartCard('Catches by trap type', 'c-traps-type', 220)}
    </div>
    ${tableCard(
      ['Trap', 'Type', 'Field', 'Farm', 'Catches', 'Checks', 'Catch Rate', 'Last Checked', 'Top Pest', 'Status'],
      tableRows,
      'All traps',
      'Sorted by total catches — highest first'
    )}
  `;

  setTimeout(() => {
    const top10 = sorted.slice(0, 10);
    mkChart('c-traps-bar', 'bar', {
      labels: top10.map(t => (t.trapName ?? '').length > 16 ? t.trapName.slice(0, 14) + '…' : t.trapName),
      datasets: [{
        data: top10.map(t => t.totalCatches ?? 0),
        backgroundColor: C.teal,
        borderRadius: 4,
      }],
    }, { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } } });

    mkChart('c-traps-type', 'doughnut', {
      labels: catchesByType.map(x => x.trapType ?? 'Unknown'),
      datasets: [{ data: catchesByType.map(x => x.totalCatches ?? 0), backgroundColor: PALETTE, borderWidth: 0 }],
    }, { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } });
  }, 0);
}
