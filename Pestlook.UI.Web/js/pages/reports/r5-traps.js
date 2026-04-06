import { escapeHtml, formatDate } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, PALETTE, mkChart,
  realObs, completedSessions,
  kpiGrid, kpiCard, chartCard, tableCard, emptyState, filterBadge,
} from './utils.js';

export function renderTrapPerformance(el, { sessions, traps }, rawData) {
  // Build per-trap stats from completed session observations
  const trapStats = {};
  for (const s of completedSessions(sessions)) {
    for (const o of realObs(s)) {
      if ((o.observationType !== 'Trap' && o.observationType !== 0) || !o.trapId) continue;
      if (!trapStats[o.trapId]) trapStats[o.trapId] = { count: 0, checks: 0, lastChecked: null, pestNames: {} };
      const ts = trapStats[o.trapId];
      ts.count  += o.count || 1;
      ts.checks += 1;
      if (!ts.lastChecked || s.completedAt > ts.lastChecked) ts.lastChecked = s.completedAt;
      if (!o.isUnknownPest && o.pestName) ts.pestNames[o.pestName] = (ts.pestNames[o.pestName] || 0) + (o.count || 1);
    }
  }

  const now = new Date();
  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    return Math.floor((now - new Date(dateStr)) / 86400000);
  };

  const sortedTraps = traps.slice().sort((a, b) => (trapStats[b.id]?.count || 0) - (trapStats[a.id]?.count || 0));

  const activeTraps     = traps.filter(t => t.isEnabled).length;
  const neverChecked    = sortedTraps.filter(t => t.isEnabled && !trapStats[t.id]?.checks).length;
  const overdue7days    = sortedTraps.filter(t => {
    if (!t.isEnabled) return false;
    const ds = daysSince(trapStats[t.id]?.lastChecked);
    return ds === null || ds > 7;
  }).length;
  const totalCatches    = Object.values(trapStats).reduce((sum, ts) => sum + ts.count, 0);
  const totalChecks     = Object.values(trapStats).reduce((sum, ts) => sum + ts.checks, 0);
  const avgCatchRate    = totalChecks > 0 ? (totalCatches / totalChecks).toFixed(2) : '—';

  // Catches by trap type
  const typeCounts = {};
  for (const t of traps) {
    const type = t.trapTypeName || 'Unknown';
    typeCounts[type] = (typeCounts[type] || 0) + (trapStats[t.id]?.count || 0);
  }
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  // Top 8 traps for bar chart
  const top8 = sortedTraps.filter(t => (trapStats[t.id]?.count || 0) > 0).slice(0, 8);

  const tableRows = sortedTraps.length
    ? sortedTraps.map(t => {
        const ts     = trapStats[t.id] || { count: 0, checks: 0, lastChecked: null, pestNames: {} };
        const ds     = daysSince(ts.lastChecked);
        const rate   = ts.checks > 0 ? (ts.count / ts.checks).toFixed(1) : '—';
        const topPest = Object.entries(ts.pestNames).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

        let statusTag;
        if (!t.isEnabled)              statusTag = tag('Disabled', 'gray');
        else if (ds === null)          statusTag = tag('Never checked', 'red');
        else if (ds > 14)              statusTag = tag(ds + 'd ago', 'red');
        else if (ds > 7)               statusTag = tag(ds + 'd ago', 'amber');
        else if (!ts.count)            statusTag = tag('No catches', 'amber');
        else                           statusTag = tag('Active', 'green');

        const freshnessHtml = ds !== null
          ? `<span style="font-size:0.75rem;color:${ds > 7 ? C.red : 'var(--text-dim)'};">${ds}d ago</span>`
          : `<span style="font-size:0.75rem;color:${C.red};">—</span>`;

        return `<tr>
          <td>
            ${escapeHtml(t.name)}
            ${t.barcode ? `<span style="font-size:0.72rem;color:var(--text-dim);margin-left:6px;">${escapeHtml(t.barcode)}</span>` : ''}
          </td>
          <td>${escapeHtml(t.trapTypeName || '—')}</td>
          <td>${escapeHtml(t.fieldName || '—')}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${ts.count.toLocaleString()}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${ts.checks}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${rate}</td>
          <td>${ts.lastChecked ? formatDate(ts.lastChecked) : '—'} ${freshnessHtml}</td>
          <td style="font-size:0.8rem;">${escapeHtml(topPest)}</td>
          <td>${statusTag}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:20px;">No traps found</td></tr>`;

  el.innerHTML = `
    ${filterBadge(rawData)}
    ${kpiGrid([
      kpiCard('Active Traps',    activeTraps,  `${traps.length - activeTraps} disabled`),
      kpiCard('Total Catches',   totalCatches.toLocaleString(), `${totalChecks} checks recorded`),
      kpiCard('Avg Catch Rate',  avgCatchRate !== '—' ? avgCatchRate + ' per check' : '—', 'Across all active traps'),
      kpiCard('Needs Attention', overdue7days, 'Active traps not checked in 7+ days', overdue7days > 0 ? C.red : ''),
    ])}
    <div class="two-col" style="margin-bottom:16px;">
      ${chartCard('Top 8 traps by total catches', 'c-top-traps', 200)}
      ${chartCard('Total catches by trap type', 'c-trap-types', 200)}
    </div>
    ${tableCard(
      ['Trap', 'Type', 'Field', 'Total Catches', 'Checks', 'Catch Rate', 'Last Checked', 'Top Pest', 'Status'],
      tableRows,
      'Trap catch summary',
      'Sorted by total catches — highest first'
    )}
  `;

  setTimeout(() => {
    mkChart('c-top-traps', 'bar', {
      labels: top8.map(t => t.name.length > 16 ? t.name.slice(0, 14) + '…' : t.name),
      datasets: [{
        data: top8.map(t => trapStats[t.id]?.count || 0),
        backgroundColor: top8.map((_, i) => PALETTE[i % PALETTE.length]),
        borderRadius: 4,
      }],
    }, { scales: { x: { ticks: { font: { size: 11 } } }, y: { beginAtZero: true, ticks: { font: { size: 11 } } } } });

    mkChart('c-trap-types', 'doughnut', {
      labels: typeEntries.map(([k]) => k),
      datasets: [{ data: typeEntries.map(([, v]) => v), backgroundColor: PALETTE, borderWidth: 0 }],
    }, { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } });
  }, 0);
}
