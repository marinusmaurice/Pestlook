import { escapeHtml, formatDate } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, mkChart, PALETTE,
  realObs, overdueSessions,
  kpiGrid, kpiCard, chartCard, tableCard, emptyState, filterBadge,
} from './utils.js';

export function renderThresholdAlerts(el, { sessions, pests }, rawData) {
  const pestById = Object.fromEntries(pests.map(p => [p.id, p]));

  const breaches = [];
  for (const s of sessions) {
    for (const o of realObs(s)) {
      const pest = o.pestId ? pestById[o.pestId] : null;
      if (!pest?.thresholdCount || (o.count || 0) <= pest.thresholdCount) continue;
      const pct    = Math.round(((o.count - pest.thresholdCount) / pest.thresholdCount) * 100);
      const isCrit = (o.count || 0) >= pest.thresholdCount * 2;
      breaches.push({ o, s, pest, pct, isCrit });
    }
  }
  breaches.sort((a, b) => b.pct - a.pct);

  // Repeat offenders — pests breaching in more than one session
  const offenderMap = {};
  for (const { pest, s, o, pct, isCrit } of breaches) {
    const key = pest.commonName;
    if (!offenderMap[key]) offenderMap[key] = { pest, sessions: [], maxPct: 0, fields: new Set() };
    offenderMap[key].sessions.push({ s, o, pct, isCrit });
    if (pct > offenderMap[key].maxPct) offenderMap[key].maxPct = pct;
    offenderMap[key].fields.add(s.fieldId || s.fieldName);
  }
  const repeatOffenders = Object.values(offenderMap)
    .filter(r => r.sessions.length > 1)
    .sort((a, b) => b.sessions.length - a.sessions.length);

  const fieldsAffected = new Set(breaches.map(b => b.s.fieldId).filter(Boolean)).size;
  const farmsAffected  = new Set(breaches.map(b => b.s.farmId).filter(Boolean)).size;
  const critical       = breaches.filter(b => b.isCrit).length;

  // Breach count per week for sparkline
  const weekLabels = [];
  const weekCounts = Array(8).fill(0);
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weekLabels.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
  }
  for (const { s } of breaches) {
    const dateStr = s.completedAt || s.startedAt;
    if (!dateStr) continue;
    const diffMs    = Date.now() - new Date(dateStr).getTime();
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    const idx = 7 - diffWeeks;
    if (idx >= 0 && idx <= 7) weekCounts[idx]++;
  }

  const offenderHtml = repeatOffenders.length ? `
    <div class="card card-p card-static" style="margin-bottom:16px;border-left:3px solid ${C.red};">
      <div class="section-title" style="margin-bottom:12px;">⚠ Repeat Offenders</div>
      <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:12px;">Pests breaching thresholds across multiple scouting sessions</div>
      ${repeatOffenders.map(r => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="flex:1;">
            <span style="font-weight:600;font-size:0.88rem;">${escapeHtml(r.pest.commonName)}</span>
            <span style="font-size:0.75rem;color:var(--text-dim);margin-left:8px;">Threshold: ${r.pest.thresholdCount}</span>
          </div>
          <div style="font-size:0.8rem;color:var(--text-dim);">${r.fields.size} field${r.fields.size !== 1 ? 's' : ''}</div>
          ${tag(r.sessions.length + ' breaches', 'red')}
          ${tag('Max +' + r.maxPct + '%', r.maxPct >= 100 ? 'red' : 'amber')}
        </div>`).join('')}
    </div>` : '';

  const tableRows = breaches.length
    ? breaches.map(({ o, s, pest, pct, isCrit }) => `<tr>
        <td style="font-weight:500;">${escapeHtml(pest.commonName)}</td>
        <td>${escapeHtml(s.fieldName || '—')}</td>
        <td>${escapeHtml(s.farmName  || '—')}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-weight:600;color:${isCrit ? C.red : C.amber};">${o.count ?? '—'}</td>
        <td style="font-family:'JetBrains Mono',monospace;">${pest.thresholdCount}</td>
        <td style="font-family:'JetBrains Mono',monospace;">${pct}%</td>
        <td>${escapeHtml(s.scouterName || '—')}</td>
        <td style="font-size:0.82rem;">${s.completedAt ? formatDate(s.completedAt) : '—'}</td>
        <td>${tag(isCrit ? 'Critical' : 'Warning', isCrit ? 'red' : 'amber')}</td>
      </tr>`).join('')
    : `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:20px;">
        No threshold breaches in the selected period — all pest counts within limits ✓
      </td></tr>`;

  el.innerHTML = `
    ${filterBadge(rawData)}
    ${kpiGrid([
      kpiCard('Total Breaches',   breaches.length, '', breaches.length > 0 ? C.red : C.green),
      kpiCard('Critical',         critical, '≥ 2× threshold — act immediately', critical > 0 ? C.red : ''),
      kpiCard('Warning',          breaches.length - critical, '> threshold — monitor closely', (breaches.length - critical) > 0 ? C.amber : ''),
      kpiCard('Fields Affected',  fieldsAffected, `${farmsAffected} farm${farmsAffected !== 1 ? 's' : ''}`),
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
      datasets: [{ data: weekCounts, backgroundColor: weekCounts.map(v => v > 0 ? C.red : 'rgba(199,81,70,0.15)'), borderRadius: 4 }],
    }, { scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } } });
  }, 0);
}
