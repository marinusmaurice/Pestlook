import { escapeHtml, formatDate } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, mkChart,
  realObs, completedSessions,
  kpiGrid, kpiCard, chartCard, emptyState, filterBadge,
} from './utils.js';

export function renderFieldCoverage(el, { sessions, fields, farmNameById }, rawData) {
  const now             = new Date();
  const TARGET_PER_MONTH = 4;

  const isThisMonth = (dateStr) => {
    const d = new Date(dateStr || '');
    return !isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const coverage = fields.map(f => {
    const farmName  = farmNameById[f.farmId] || '—';
    const allSess   = completedSessions(sessions).filter(s => String(s.fieldId) === String(f.id));
    const monthSess = allSess.filter(s => isThisMonth(s.completedAt));
    const pct       = Math.min(100, Math.round((monthSess.length / TARGET_PER_MONTH) * 100));

    // Last session info
    const lastSess  = allSess.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0] || null;
    const daysSince = lastSess
      ? Math.floor((now - new Date(lastSess.completedAt)) / 86400000)
      : null;

    // Top pest from all sessions on this field
    const pestCounts = {};
    for (const s of allSess) {
      for (const o of realObs(s)) {
        if (!o.isUnknownPest && o.pestName) pestCounts[o.pestName] = (pestCounts[o.pestName] || 0) + (o.count || 1);
      }
    }
    const topPest = Object.entries(pestCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return { name: f.name, farmName, monthSess: monthSess.length, totalSess: allSess.length, pct, daysSince, lastSess, topPest };
  }).sort((a, b) => a.pct - b.pct); // least covered first

  const full    = coverage.filter(f => f.pct >= 100).length;
  const partial = coverage.filter(f => f.pct > 0 && f.pct < 100).length;
  const none    = coverage.filter(f => f.pct === 0).length;
  const neverScouted = coverage.filter(f => f.totalSess === 0).length;

  // Urgency helper
  const urgencyTag = (f) => {
    if (f.totalSess === 0)       return tag('Never scouted', 'red');
    if (f.pct === 0)             return tag('Not this month', 'red');
    if (f.pct < 50)              return tag('Behind', 'amber');
    if (f.pct < 100)             return tag('On track', 'blue');
    return tag('Complete', 'green');
  };

  const coverageList = coverage.length
    ? coverage.map(f => {
        const barColor = f.pct === 0 ? C.red : f.pct < 50 ? C.amber : f.pct < 100 ? C.blue : C.green;
        const daysHtml = f.daysSince !== null
          ? `<span style="font-size:0.75rem;color:${f.daysSince > 14 ? C.red : f.daysSince > 7 ? C.amber : 'var(--text-dim)'};">Last: ${f.daysSince === 0 ? 'today' : f.daysSince + 'd ago'}</span>`
          : `<span style="font-size:0.75rem;color:${C.red};">Never scouted</span>`;
        return `
          <div style="margin-bottom:10px;padding:10px 14px;background:var(--surface2);border-radius:8px;border-left:3px solid ${barColor};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
              <div>
                <span style="font-weight:500;font-size:0.88rem;">${escapeHtml(f.name)}</span>
                <span style="font-size:0.75rem;color:var(--text-dim);margin-left:6px;">— ${escapeHtml(f.farmName)}</span>
              </div>
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                ${urgencyTag(f)}
                ${daysHtml}
                <span style="font-size:0.78rem;color:var(--text-dim);">${f.monthSess}/${TARGET_PER_MONTH} sessions · ${f.pct}%</span>
              </div>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${f.pct}%;background:${barColor};"></div>
            </div>
            ${f.topPest !== '—' ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:5px;">Top pest: <strong>${escapeHtml(f.topPest)}</strong></div>` : ''}
          </div>`;
      }).join('')
    : emptyState('🌿', 'No fields found', 'Add fields to track coverage');

  // Chart: coverage % per field (top 12)
  const chartFields = [...coverage].sort((a, b) => b.pct - a.pct).slice(0, 12);

  el.innerHTML = `
    ${filterBadge(rawData)}
    ${kpiGrid([
      kpiCard('Fully Covered',    full,          `≥ ${TARGET_PER_MONTH} sessions this month`, full > 0 ? C.green : ''),
      kpiCard('Partially Covered', partial,       '1–3 sessions this month',                  partial > 0 ? C.amber : ''),
      kpiCard('Not Scouted',      none,           'Zero sessions this month',                  none > 0 ? C.red : ''),
      kpiCard('Never Scouted',    neverScouted,   'No sessions ever recorded',                 neverScouted > 0 ? C.red : ''),
    ])}
    ${chartCard('This month\'s coverage % per field', 'c-coverage', 200, `Target: ${TARGET_PER_MONTH} sessions per field — showing top 12`)}
    <div class="card card-p card-static" style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:4px;">Field scouting status — lowest coverage first</div>
      <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:14px;">Target: ${TARGET_PER_MONTH} sessions per field per month</div>
      ${coverageList}
    </div>
  `;

  setTimeout(() => {
    mkChart('c-coverage', 'bar', {
      labels: chartFields.map(f => f.name.length > 14 ? f.name.slice(0, 12) + '…' : f.name),
      datasets: [{
        data: chartFields.map(f => f.pct),
        backgroundColor: chartFields.map(f => f.pct >= 100 ? C.green : f.pct >= 50 ? C.blue : f.pct > 0 ? C.amber : C.red),
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
