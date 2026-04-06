import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import { PestCategory, LifeStage } from '../../utils/helpers.js';
import {
  C, PALETTE, mkChart,
  realObs,
  kpiGrid, kpiCard, chartCard, tableCard, emptyState, filterBadge,
} from './utils.js';

export function renderTopPests(el, { sessions, pests }, rawData) {
  const pestById = Object.fromEntries(pests.map(p => [p.id, p]));

  const pestStats = {};
  for (const s of sessions) {
    for (const o of realObs(s)) {
      if (o.isUnknownPest || !o.pestName) continue;
      if (!pestStats[o.pestName]) pestStats[o.pestName] = {
        count: 0, fields: new Set(), farms: new Set(),
        sessionIds: new Set(), breaches: 0,
        lifeStageCounts: {}, pestId: o.pestId,
      };
      const ps = pestStats[o.pestName];
      ps.count += o.count || 1;
      if (s.fieldId) ps.fields.add(s.fieldId);
      if (s.farmId)  ps.farms.add(s.farmId);
      ps.sessionIds.add(s.id || s.sessionId);
      if (o.lifeStage != null) {
        const ls = LifeStage[o.lifeStage] ?? String(o.lifeStage);
        ps.lifeStageCounts[ls] = (ps.lifeStageCounts[ls] || 0) + 1;
      }
      const pest = o.pestId ? pestById[o.pestId] : null;
      if (pest?.thresholdCount && (o.count || 0) > pest.thresholdCount) ps.breaches++;
    }
  }

  const sorted = Object.entries(pestStats).sort((a, b) => b[1].count - a[1].count);
  const totalObs = sorted.reduce((sum, [, ps]) => sum + ps.count, 0);

  // Category breakdown for doughnut
  const catCounts = {};
  for (const [, { count, pestId }] of sorted) {
    const pest = pestId ? pestById[pestId] : null;
    const cat  = pest?.category != null ? (PestCategory[pest.category] || 'Other') : 'Unknown';
    catCounts[cat] = (catCounts[cat] || 0) + count;
  }
  const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);

  const topForChart = sorted.slice(0, 10);

  const tableRows = sorted.length
    ? sorted.map(([name, ps], idx) => {
        const pest     = ps.pestId ? pestById[ps.pestId] : null;
        const cat      = pest?.category != null ? (PestCategory[pest.category] || '—') : '—';
        const thresh   = pest?.thresholdCount ?? '—';
        const pct      = totalObs > 0 ? ((ps.count / totalObs) * 100).toFixed(1) : '0';
        const topStage = Object.entries(ps.lifeStageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        const hasAlert = ps.breaches > 0;
        return `<tr>
          <td style="font-family:'JetBrains Mono',monospace;color:var(--text-dim);">${idx + 1}</td>
          <td style="font-weight:500;">${escapeHtml(name)}</td>
          <td>${escapeHtml(cat)}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${ps.count.toLocaleString()}</td>
          <td style="font-family:'JetBrains Mono',monospace;color:var(--text-dim);">${pct}%</td>
          <td style="font-family:'JetBrains Mono',monospace;">${ps.fields.size}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${ps.sessionIds.size}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${thresh}</td>
          <td>${hasAlert ? tag(ps.breaches + ' breach' + (ps.breaches > 1 ? 'es' : ''), 'red') : tag('None', 'green')}</td>
          <td style="font-size:0.8rem;">${escapeHtml(topStage)}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="10" style="text-align:center;color:var(--text-dim);padding:20px;">No pest observations recorded in this period</td></tr>`;

  el.innerHTML = `
    ${filterBadge(rawData)}
    ${kpiGrid([
      kpiCard('Unique Pest Species',   sorted.length,                                     'Identified across all sessions'),
      kpiCard('Total Observations',    totalObs.toLocaleString(),                          'Sum of all counts'),
      kpiCard('Species Above Threshold', sorted.filter(([, ps]) => ps.breaches > 0).length, 'Require action', sorted.filter(([, ps]) => ps.breaches > 0).length > 0 ? C.red : ''),
      kpiCard('Most Widespread',       sorted[0] ? escapeHtml(sorted[0][0]) : '—',         sorted[0] ? sorted[0][1].fields.size + ' fields' : ''),
    ])}
    <div class="two-col" style="margin-bottom:16px;">
      ${chartCard('Top 10 pests by count', 'c-toppests', 220, 'Total observation count in selected period')}
      ${chartCard('Observations by pest category', 'c-cat-donut', 220)}
    </div>
    ${tableCard(
      ['#', 'Pest', 'Category', 'Total Count', '% of Total', 'Fields', 'Sessions', 'Threshold', 'Breaches', 'Top Life Stage'],
      tableRows,
      'Full pest ranking'
    )}
  `;

  setTimeout(() => {
    mkChart('c-toppests', 'bar', {
      labels: topForChart.map(([n]) => n.length > 18 ? n.slice(0, 16) + '…' : n),
      datasets: [{
        data: topForChart.map(([, ps]) => ps.count),
        backgroundColor: topForChart.map(([, ps]) => {
          const pest = ps.pestId ? pestById[ps.pestId] : null;
          return pest?.thresholdCount && ps.breaches > 0 ? C.red : C.blue;
        }),
        borderRadius: 4,
      }],
    }, { scales: { x: { ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } } });

    mkChart('c-cat-donut', 'doughnut', {
      labels: catEntries.map(([k]) => k),
      datasets: [{ data: catEntries.map(([, v]) => v), backgroundColor: PALETTE, borderWidth: 0 }],
    }, { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } });
  }, 0);
}
