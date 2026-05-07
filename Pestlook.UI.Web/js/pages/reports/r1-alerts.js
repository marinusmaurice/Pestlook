import { escapeHtml, formatDate } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, mkChart,
  kpiGrid, kpiCard, chartCard, tableCard, emptyState, filterBadge,
} from './utils.js';

// data = { breaches, repeatOffenders, weeklyTrend }
export function renderThresholdAlerts(el, data, lookups) {
  const breaches        = data.breaches        ?? [];
  const repeatOffenders = data.repeatOffenders ?? [];
  const weeklyTrend     = data.weeklyTrend     ?? [];

  const critical       = breaches.filter(b => (b.observedCount ?? 0) >= (b.thresholdCount ?? 0) * 2).length;
  const fieldsAffected = new Set(breaches.map(b => b.fieldName).filter(Boolean)).size;
  const farmsAffected  = new Set(breaches.map(b => b.farmName).filter(Boolean)).size;

  const weekLabels = weeklyTrend.map(w =>
    new Date(w.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
  const weekCounts = weeklyTrend.map(w => w.breaches);

  const offenderHtml = repeatOffenders.length ? `
    <div class="card card-p card-static" style="margin-bottom:16px;border-left:3px solid ${C.red};">
      <div class="section-title" style="margin-bottom:12px;">⚠ Repeat Offenders</div>
      <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:12px;">Pests breaching thresholds across multiple scouting sessions</div>
      ${repeatOffenders.map(r => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="flex:1;">
            <span style="font-weight:600;font-size:0.88rem;">${escapeHtml(r.pestName ?? '—')}</span>
            <span style="font-size:0.75rem;color:var(--text-dim);margin-left:8px;">${escapeHtml(r.fieldName ?? '—')}</span>
          </div>
          ${tag(r.breachCount + ' breaches', 'red')}
        </div>`).join('')}
    </div>` : '';

  const tableRows = breaches.length
    ? breaches.map(b => {
        const isCrit = (b.observedCount ?? 0) >= (b.thresholdCount ?? 0) * 2;
        const pct    = b.thresholdCount
          ? Math.round(((b.observedCount - b.thresholdCount) / b.thresholdCount) * 100)
          : 0;
        return `<tr>
          <td style="font-weight:500;">${escapeHtml(b.pestName ?? '—')}</td>
          <td>${escapeHtml(b.fieldName ?? '—')}</td>
          <td>${escapeHtml(b.farmName  ?? '—')}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:600;color:${isCrit ? C.red : C.amber};">${b.observedCount ?? '—'}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${b.thresholdCount ?? '—'}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${pct}%</td>
          <td>${escapeHtml(b.scouterName ?? '—')}</td>
          <td style="font-size:0.82rem;">${b.completedAt ? formatDate(b.completedAt) : '—'}</td>
          <td>${tag(isCrit ? 'Critical' : 'Warning', isCrit ? 'red' : 'amber')}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:20px;">
        No threshold breaches in the selected period — all pest counts within limits ✓
      </td></tr>`;

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Total Breaches',  breaches.length, '', breaches.length > 0 ? C.red : C.green),
      kpiCard('Critical',        critical, '≥ 2× threshold — act immediately', critical > 0 ? C.red : ''),
      kpiCard('Warning',         breaches.length - critical, '> threshold — monitor closely', (breaches.length - critical) > 0 ? C.amber : ''),
      kpiCard('Fields Affected', fieldsAffected, `${farmsAffected} farm${farmsAffected !== 1 ? 's' : ''}`),
    ])}
    ${offenderHtml}
    ${chartCard('Threshold breaches per week', 'c-alerts-trend', 160, 'Number of breaching observations each week')}
    ${tableCard(
      ['Pest', 'Field', 'Farm', 'Count', 'Threshold', 'Over by', 'Scout', 'Date', 'Status'],
      tableRows,
      'All threshold breaches',
      'Sorted by severity — highest first'
    )}
  `;

  setTimeout(() => {
    mkChart('c-alerts-trend', 'bar', {
      labels: weekLabels,
      datasets: [{
        data: weekCounts,
        backgroundColor: weekCounts.map(v => v > 0 ? C.red : 'rgba(199,81,70,0.15)'),
        borderRadius: 4,
      }],
    }, { scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } } });
  }, 0);
}
