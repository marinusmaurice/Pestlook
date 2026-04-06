import { escapeHtml, formatDate } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import { LifeStage } from '../../utils/helpers.js';
import {
  C, mkChart,
  realObs,
  kpiGrid, kpiCard, chartCard, tableCard, emptyState, filterBadge,
} from './utils.js';

export function renderUnknownPests(el, { sessions }, rawData) {
  const items = [];
  for (const s of sessions) {
    for (const o of realObs(s)) {
      if (o.isUnknownPest) items.push({ o, s });
    }
  }
  items.sort((a, b) => new Date(b.s.completedAt || b.s.startedAt || 0) - new Date(a.s.completedAt || a.s.startedAt || 0));

  const withPhotos    = items.filter(({ o }) => o.photoUrls?.length > 0).length;
  const withNotes     = items.filter(({ o }) => o.notes?.trim()).length;
  const fieldsAffect  = new Set(items.map(({ s }) => s.fieldId).filter(Boolean)).size;
  const farmsAffect   = new Set(items.map(({ s }) => s.farmId).filter(Boolean)).size;

  // Priority items: high count (>=5) or has photos (can be identified)
  const priority = items.filter(({ o }) => (o.count || 0) >= 5 || o.photoUrls?.length > 0);

  const lifeStageLabel = (v) => v == null ? '—' : (LifeStage[v] ?? String(v));

  const weekLabels = [];
  const weekCounts = Array(8).fill(0);
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weekLabels.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
  }
  for (const { s } of items) {
    const dateStr = s.completedAt || s.startedAt;
    if (!dateStr) continue;
    const diffMs    = Date.now() - new Date(dateStr).getTime();
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    const idx = 7 - diffWeeks;
    if (idx >= 0 && idx <= 7) weekCounts[idx]++;
  }

  const priorityHtml = priority.length ? `
    <div class="card card-p card-static" style="margin-bottom:16px;border-left:3px solid ${C.amber};">
      <div class="section-title" style="margin-bottom:4px;">🔍 Priority — Requires Identification</div>
      <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:12px;">High count (≥ 5) or has photos — submit to agronomist for ID</div>
      ${priority.map(({ o, s }) => {
        const dateStr    = s.completedAt ? formatDate(s.completedAt) : (s.startedAt ? formatDate(s.startedAt) : '—');
        const photoCount = o.photoUrls?.length || 0;
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="flex:1;">
            <div style="font-size:0.85rem;font-weight:500;">${escapeHtml(s.fieldName || '—')} <span style="color:var(--text-dim);font-weight:400;">— ${escapeHtml(s.farmName || '—')}</span></div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px;">Scout: ${escapeHtml(s.scouterName || '—')} · ${dateStr}${o.notes ? ' · ' + escapeHtml(o.notes) : ''}</div>
          </div>
          ${o.count != null ? `<span style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:0.9rem;">${o.count}</span>` : ''}
          ${photoCount > 0 ? tag('📷 ' + photoCount + ' photo' + (photoCount > 1 ? 's' : ''), 'green') : tag('No photo', 'amber')}
        </div>`;
      }).join('')}
    </div>` : '';

  const tableRows = items.length
    ? items.map(({ o, s }) => {
        const photoCount = o.photoUrls?.length || 0;
        const dateStr    = s.completedAt ? formatDate(s.completedAt) : (s.startedAt ? formatDate(s.startedAt) : '—');
        return `<tr>
          <td style="font-size:0.82rem;">${dateStr}</td>
          <td>${escapeHtml(s.farmName  || '—')}</td>
          <td>${escapeHtml(s.fieldName || '—')}</td>
          <td>${escapeHtml(s.scouterName || '—')}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${o.count ?? '—'}</td>
          <td>${escapeHtml(lifeStageLabel(o.lifeStage))}</td>
          <td>${photoCount > 0 ? tag('📷 ' + photoCount, 'green') : tag('None', 'red')}</td>
          <td style="font-size:0.8rem;color:var(--text-dim);max-width:200px;">${escapeHtml(o.notes || '—')}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:20px;">No unknown pest sightings in selected period ✓</td></tr>`;

  el.innerHTML = `
    ${filterBadge(rawData)}
    ${kpiGrid([
      kpiCard('Unidentified Sightings', items.length, `${fieldsAffect} field${fieldsAffect !== 1 ? 's' : ''} · ${farmsAffect} farm${farmsAffect !== 1 ? 's' : ''}`, items.length > 0 ? C.amber : ''),
      kpiCard('With Photos', withPhotos, 'Can be submitted for ID', withPhotos > 0 ? C.green : ''),
      kpiCard('Without Photos', items.length - withPhotos, 'Harder to identify', (items.length - withPhotos) > 0 ? C.red : ''),
      kpiCard('With Notes', withNotes, 'Have descriptive notes'),
    ])}
    ${items.length > 0 ? chartCard('Unknown sightings per week', 'c-unknown-trend', 140) : ''}
    ${priorityHtml}
    ${tableCard(
      ['Date', 'Farm', 'Field', 'Scout', 'Count', 'Life Stage', 'Photo', 'Notes'],
      tableRows,
      'All unknown pest sightings',
      'Most recent first'
    )}
  `;

  if (items.length > 0) {
    setTimeout(() => {
      mkChart('c-unknown-trend', 'bar', {
        labels: weekLabels,
        datasets: [{ data: weekCounts, backgroundColor: weekCounts.map(v => v > 0 ? C.amber : 'rgba(229,165,47,0.15)'), borderRadius: 4 }],
      }, { scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } } });
    }, 0);
  }
}
