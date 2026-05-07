import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, mkChart,
  kpiGrid, kpiCard, chartCard, tableCard, emptyState, filterBadge,
} from './utils.js';

// data = { fields: [{ fieldId, fieldName, farmName, sessionCount, totalObs, avgObsPerSession, breachCount, topPests }] }
export function renderPestPressure(el, data, lookups) {
  const rows   = data.fields ?? [];
  const maxAvg = rows.length ? Math.max(...rows.map(r => r.avgObsPerSession ?? 0)) : 1;

  const highPressure  = rows.filter(r => (r.avgObsPerSession ?? 0) >= maxAvg * 0.66).length;
  const medPressure   = rows.filter(r => (r.avgObsPerSession ?? 0) >= maxAvg * 0.33 && (r.avgObsPerSession ?? 0) < maxAvg * 0.66).length;
  const lowPressure   = rows.filter(r => (r.avgObsPerSession ?? 0) < maxAvg * 0.33).length;
  const totalBreaches = rows.reduce((sum, r) => sum + (r.breachCount ?? 0), 0);

  const pressureList = rows.length ? rows.map(r => {
    const pct      = maxAvg > 0 ? Math.round(((r.avgObsPerSession ?? 0) / maxAvg) * 100) : 0;
    const barColor = pct >= 66 ? C.red : pct >= 33 ? C.amber : C.green;
    const levelTag = pct >= 66 ? tag('High', 'red') : pct >= 33 ? tag('Medium', 'amber') : tag('Low', 'green');
    const top3Html = (r.topPests ?? []).map(p =>
      `<span style="font-size:0.73rem;background:var(--surface3,#f0f4f1);border-radius:4px;padding:1px 6px;">${escapeHtml(p.pestName)} (${p.pestCount})</span>`
    ).join(' ');
    return `
      <div style="margin-bottom:10px;padding:10px 14px;background:var(--surface2);border-radius:8px;border-left:3px solid ${barColor};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div>
            <span style="font-weight:500;font-size:0.88rem;">${escapeHtml(r.fieldName ?? '—')}</span>
            <span style="font-size:0.75rem;color:var(--text-dim);margin-left:6px;">— ${escapeHtml(r.farmName ?? '—')}</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            ${levelTag}
            <span style="font-size:0.78rem;color:var(--text-dim);">${(r.avgObsPerSession ?? 0).toFixed(1)} obs/session · ${r.sessionCount ?? 0} session${r.sessionCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="progress-bar" style="margin-bottom:6px;">
          <div class="progress-fill" style="width:${pct}%;background:${barColor};"></div>
        </div>
        ${top3Html ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;">${top3Html}</div>` : ''}
      </div>`;
  }).join('') : emptyState('🌿', 'No completed sessions', 'Complete scouting sessions to see field pressure');

  const tableRows = rows.length
    ? rows.map(r => `<tr>
        <td style="font-weight:500;">${escapeHtml(r.fieldName ?? '—')}</td>
        <td>${escapeHtml(r.farmName ?? '—')}</td>
        <td style="font-family:'JetBrains Mono',monospace;">${r.sessionCount ?? 0}</td>
        <td style="font-family:'JetBrains Mono',monospace;">${(r.totalObs ?? 0).toLocaleString()}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${(r.avgObsPerSession ?? 0).toFixed(1)}</td>
        <td style="font-family:'JetBrains Mono',monospace;color:${(r.breachCount ?? 0) > 0 ? C.red : ''};">${r.breachCount ?? 0}</td>
        <td style="font-size:0.8rem;">${(r.topPests ?? []).map(p => escapeHtml(p.pestName)).join(', ') || '—'}</td>
      </tr>`)
      .join('')
    : `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:20px;">No completed sessions in selected period</td></tr>`;

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('High Pressure',   highPressure,  'Fields ≥ 66% of peak avg', highPressure > 0 ? C.red   : ''),
      kpiCard('Medium Pressure', medPressure,   'Fields 33–65% of peak avg', medPressure  > 0 ? C.amber : ''),
      kpiCard('Low Pressure',    lowPressure,   'Fields < 33% of peak avg', C.green),
      kpiCard('Total Breaches',  totalBreaches, 'Threshold breaches across all fields', totalBreaches > 0 ? C.red : ''),
    ])}
    ${chartCard('Avg observations per session by field (top 10)', 'c-pressure', 220, 'Higher = more pest activity per visit')}
    <div class="card card-p card-static" style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:4px;">Field pressure overview</div>
      <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:14px;">Relative pest pressure — bar width proportional to peak field in period</div>
      ${pressureList}
    </div>
    ${tableCard(
      ['Field', 'Farm', 'Sessions', 'Total Obs', 'Avg / Session', 'Breaches', 'Top Pests'],
      tableRows,
      'Detailed field breakdown'
    )}
  `;

  setTimeout(() => {
    const top10 = rows.slice(0, 10);
    mkChart('c-pressure', 'bar', {
      labels: top10.map(r => (r.fieldName ?? '').length > 16 ? r.fieldName.slice(0, 14) + '…' : r.fieldName),
      datasets: [{
        data: top10.map(r => parseFloat((r.avgObsPerSession ?? 0).toFixed(1))),
        backgroundColor: top10.map(r => {
          const pct = maxAvg > 0 ? (r.avgObsPerSession ?? 0) / maxAvg : 0;
          return pct >= 0.66 ? C.red : pct >= 0.33 ? C.amber : C.green;
        }),
        borderRadius: 4,
      }],
    }, { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } } });
  }, 0);
}
