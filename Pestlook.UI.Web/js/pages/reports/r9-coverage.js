import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, mkChart,
  kpiGrid, kpiCard, chartCard, emptyState, filterBadge,
} from './utils.js';

// data = { targetPerMonth, fields: [{ id, name, farmName, sessionsThisMonth, totalSessions, coveragePct, lastSessionAt, daysSinceLastSession, topPest }] }
export function renderFieldCoverage(el, data, lookups) {
  const fields         = data.fields         ?? [];
  const targetPerMonth = data.targetPerMonth ?? 4;

  const full    = fields.filter(f => (f.coveragePct ?? 0) >= 100).length;
  const partial = fields.filter(f => (f.coveragePct ?? 0) > 0 && (f.coveragePct ?? 0) < 100).length;
  const none    = fields.filter(f => (f.coveragePct ?? 0) === 0).length;
  const never   = fields.filter(f => (f.totalSessions ?? 0) === 0).length;

  const urgencyTag = f => {
    if ((f.totalSessions ?? 0) === 0)     return tag('Never scouted', 'red');
    if ((f.coveragePct ?? 0) === 0)       return tag('Not this month', 'red');
    if ((f.coveragePct ?? 0) < 50)        return tag('Behind', 'amber');
    if ((f.coveragePct ?? 0) < 100)       return tag('On track', 'blue');
    return tag('Complete', 'green');
  };

  const coverageList = fields.length
    ? fields.map(f => {
        const pct      = f.coveragePct ?? 0;
        const barColor = pct === 0 ? C.red : pct < 50 ? C.amber : pct < 100 ? C.blue : C.green;
        const days     = f.daysSinceLastSession;
        const daysHtml = days != null
          ? `<span style="font-size:0.75rem;color:${days > 14 ? C.red : days > 7 ? C.amber : 'var(--text-dim)'};">Last: ${days === 0 ? 'today' : days + 'd ago'}</span>`
          : `<span style="font-size:0.75rem;color:${C.red};">Never scouted</span>`;
        return `
          <div style="margin-bottom:10px;padding:10px 14px;background:var(--surface2);border-radius:8px;border-left:3px solid ${barColor};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
              <div>
                <span style="font-weight:500;font-size:0.88rem;">${escapeHtml(f.name ?? '—')}</span>
                <span style="font-size:0.75rem;color:var(--text-dim);margin-left:6px;">— ${escapeHtml(f.farmName ?? '—')}</span>
              </div>
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                ${urgencyTag(f)}
                ${daysHtml}
                <span style="font-size:0.78rem;color:var(--text-dim);">${f.sessionsThisMonth ?? 0}/${targetPerMonth} sessions · ${pct}%</span>
              </div>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${pct}%;background:${barColor};"></div>
            </div>
            ${(f.topPest && f.topPest !== '—') ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:5px;">Top pest: <strong>${escapeHtml(f.topPest)}</strong></div>` : ''}
          </div>`;
      }).join('')
    : emptyState('🌿', 'No fields found', 'Add fields to track coverage');

  // Chart: top 12 by coverage %
  const chartFields = [...fields].sort((a, b) => (b.coveragePct ?? 0) - (a.coveragePct ?? 0)).slice(0, 12);

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Fully Covered',     full,    `≥ ${targetPerMonth} sessions this month`, full > 0 ? C.green : ''),
      kpiCard('Partially Covered', partial, '1–3 sessions this month',                 partial > 0 ? C.amber : ''),
      kpiCard('Not Scouted',       none,    'Zero sessions this month',                none > 0 ? C.red : ''),
      kpiCard('Never Scouted',     never,   'No sessions ever recorded',               never > 0 ? C.red : ''),
    ])}
    ${chartCard("This month's coverage % per field", 'c-coverage', 200, `Target: ${targetPerMonth} sessions per field — showing top 12`)}
    <div class="card card-p card-static" style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:4px;">Field scouting status — lowest coverage first</div>
      <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:14px;">Target: ${targetPerMonth} sessions per field per month</div>
      ${coverageList}
    </div>
  `;

  setTimeout(() => {
    mkChart('c-coverage', 'bar', {
      labels: chartFields.map(f => (f.name ?? '').length > 16 ? f.name.slice(0, 14) + '…' : f.name),
      datasets: [{
        data: chartFields.map(f => f.coveragePct ?? 0),
        backgroundColor: chartFields.map(f => {
          const p = f.coveragePct ?? 0;
          return p >= 100 ? C.green : p >= 50 ? C.blue : p > 0 ? C.amber : C.red;
        }),
        borderRadius: 4,
      }],
    }, {
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%', font: { size: 11 } } },
        x: { ticks: { font: { size: 11 } } },
      },
    });
  }, 0);
}
