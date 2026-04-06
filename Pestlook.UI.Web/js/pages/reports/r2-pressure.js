import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, PALETTE, mkChart,
  realObs, completedSessions,
  kpiGrid, kpiCard, chartCard, tableCard, emptyState, filterBadge,
} from './utils.js';

export function renderPestPressure(el, { sessions, pests }, rawData) {
  const pestById = Object.fromEntries(pests.map(p => [p.id, p]));

  const fieldMap = {};
  for (const s of completedSessions(sessions)) {
    const key = s.fieldId || s.fieldName || 'unknown';
    if (!fieldMap[key]) fieldMap[key] = {
      name: s.fieldName || 'Unknown', farm: s.farmName || '—',
      sessions: 0, totalObs: 0, breaches: 0, pestCounts: {},
    };
    const fm = fieldMap[key];
    fm.sessions++;
    for (const o of realObs(s)) {
      fm.totalObs += o.count || 1;
      if (!o.isUnknownPest && o.pestName) {
        fm.pestCounts[o.pestName] = (fm.pestCounts[o.pestName] || 0) + (o.count || 1);
      }
      const pest = o.pestId ? pestById[o.pestId] : null;
      if (pest?.thresholdCount && (o.count || 0) > pest.thresholdCount) fm.breaches++;
    }
  }

  const rows = Object.values(fieldMap).map(f => {
    const avg  = f.sessions > 0 ? f.totalObs / f.sessions : 0;
    const top3 = Object.entries(f.pestCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { ...f, avg, top3 };
  }).sort((a, b) => b.avg - a.avg);

  const maxAvg = rows.length ? rows[0].avg : 1;

  const highPressure = rows.filter(r => r.avg >= maxAvg * 0.66).length;
  const medPressure  = rows.filter(r => r.avg >= maxAvg * 0.33 && r.avg < maxAvg * 0.66).length;
  const lowPressure  = rows.filter(r => r.avg < maxAvg * 0.33).length;
  const totalBreaches = rows.reduce((sum, r) => sum + r.breaches, 0);

  const pressureList = rows.length ? rows.map(r => {
    const pct      = maxAvg > 0 ? Math.round((r.avg / maxAvg) * 100) : 0;
    const barColor = pct >= 66 ? C.red : pct >= 33 ? C.amber : C.green;
    const levelTag = pct >= 66
      ? tag('High',   'red')
      : pct >= 33
        ? tag('Medium', 'amber')
        : tag('Low',    'green');
    const top3Html = r.top3.map(([n, v]) => `<span style="font-size:0.73rem;background:var(--surface3,#f0f4f1);border-radius:4px;padding:1px 6px;">${escapeHtml(n)} (${v})</span>`).join(' ');
    return `
      <div style="margin-bottom:10px;padding:10px 14px;background:var(--surface2);border-radius:8px;border-left:3px solid ${barColor};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div>
            <span style="font-weight:500;font-size:0.88rem;">${escapeHtml(r.name)}</span>
            <span style="font-size:0.75rem;color:var(--text-dim);margin-left:6px;">— ${escapeHtml(r.farm)}</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            ${levelTag}
            <span style="font-size:0.78rem;color:var(--text-dim);">${r.avg.toFixed(1)} obs/session · ${r.sessions} session${r.sessions !== 1 ? 's' : ''}</span>
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
        <td style="font-weight:500;">${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.farm)}</td>
        <td style="font-family:'JetBrains Mono',monospace;">${r.sessions}</td>
        <td style="font-family:'JetBrains Mono',monospace;">${r.totalObs.toLocaleString()}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${r.avg.toFixed(1)}</td>
        <td style="font-family:'JetBrains Mono',monospace;color:${r.breaches > 0 ? C.red : ''};">${r.breaches}</td>
        <td style="font-size:0.8rem;">${r.top3.map(([n]) => escapeHtml(n)).join(', ') || '—'}</td>
      </tr>`).join('')
    : `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:20px;">No completed sessions in selected period</td></tr>`;

  el.innerHTML = `
    ${filterBadge(rawData)}
    ${kpiGrid([
      kpiCard('High Pressure',   highPressure, 'Fields ≥ 66% of peak avg', highPressure > 0 ? C.red   : ''),
      kpiCard('Medium Pressure', medPressure,  'Fields 33–65% of peak avg', medPressure  > 0 ? C.amber : ''),
      kpiCard('Low Pressure',    lowPressure,  'Fields < 33% of peak avg', C.green),
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
      labels: top10.map(r => r.name.length > 16 ? r.name.slice(0, 14) + '…' : r.name),
      datasets: [{
        data: top10.map(r => parseFloat(r.avg.toFixed(1))),
        backgroundColor: top10.map(r => {
          const pct = maxAvg > 0 ? r.avg / maxAvg : 0;
          return pct >= 0.66 ? C.red : pct >= 0.33 ? C.amber : C.green;
        }),
        borderRadius: 4,
      }],
    }, { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } } });
  }, 0);
}
