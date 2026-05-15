import { escapeHtml, formatDate } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, mkChart,
  kpiGrid, kpiCard, chartCard, tableCard, filterBadge,
} from './utils.js';

// data = { kpis, items: [...], weeklyTrend: [{ weekStart, unknownCount }] }
export function renderUnknownPests(el, data, lookups) {
  const kpis        = data.kpis        ?? {};
  const items       = data.items       ?? [];
  const weeklyTrend = data.weeklyTrend ?? [];

  const priority = items.filter(i => i.isPriority);

  const weekLabels = weeklyTrend.map(w =>
    new Date(w.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
  const weekCounts = weeklyTrend.map(w => w.unknownCount);

  const priorityHtml = priority.length ? `
    <div class="card card-p card-static" style="margin-bottom:16px;border-left:3px solid ${C.amber};">
      <div class="section-title" style="margin-bottom:4px;">🔍 Priority — Requires Identification</div>
      <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:12px;">High count (≥ 5) or has photos — submit to agronomist for ID</div>
      ${priority.map(i => {
        const photoCount = (i.photoUrls ?? []).length;
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="flex:1;">
            <div style="font-size:0.85rem;font-weight:500;">${escapeHtml(i.fieldName ?? '—')} <span style="color:var(--text-dim);font-weight:400;">— ${escapeHtml(i.farmName ?? '—')}</span></div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px;">Scout: ${escapeHtml(i.scouterName ?? '—')} · ${i.completedAt ? formatDate(i.completedAt) : '—'}${i.notes ? ' · ' + escapeHtml(i.notes) : ''}</div>
          </div>
          ${i.count != null ? `<span style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:0.9rem;">${i.count}</span>` : ''}
          ${photoCount > 0 ? tag('📷 ' + photoCount + ' photo' + (photoCount > 1 ? 's' : ''), 'green') : tag('No photo', 'amber')}
        </div>`;
      }).join('')}
    </div>` : '';

  const tableRows = items.length
    ? items.map(i => {
        const photoCount = (i.photoUrls ?? []).length;
        return `<tr>
          <td style="font-size:0.82rem;">${i.completedAt ? formatDate(i.completedAt) : '—'}</td>
          <td>${escapeHtml(i.farmName  ?? '—')}</td>
          <td>${escapeHtml(i.fieldName ?? '—')}</td>
          <td>${escapeHtml(i.scouterName ?? '—')}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${i.count ?? '—'}</td>
          <td>${escapeHtml(i.lifeStage ?? '—')}</td>
          <td>${photoCount > 0 ? tag('📷 ' + photoCount, 'green') : tag('None', 'red')}</td>
          <td style="font-size:0.8rem;color:var(--text-dim);max-width:200px;">${escapeHtml(i.notes ?? '—')}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:20px;">No unknown pest sightings in selected period ✓</td></tr>`;

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Total Sightings',  kpis.total          ?? 0, '', (kpis.total ?? 0) > 0 ? C.amber : '',
        'Total number of scouting observations recorded as "Unknown" pest within the selected date range and filters.'),
      kpiCard('With Photos',      kpis.withPhotos     ?? 0, 'Can be submitted for identification', '',
        'Unknown pest sightings that have at least one photo attached — these can be sent to an agronomist or lab for identification.'),
      kpiCard('With Notes',       kpis.withNotes      ?? 0, 'Scout notes attached', '',
        'Unknown sightings where the scout added descriptive notes — useful context for identification even without a photo.'),
      kpiCard('Fields Affected',  kpis.fieldsAffected ?? 0, '', '',
        'Number of distinct fields that have at least one unknown pest sighting in the selected period.'),
    ])}
    ${priorityHtml}
    ${chartCard('Unknown pest sightings per week', 'c-unknown-trend', 160)}
    ${tableCard(
      ['Date', 'Farm', 'Field', 'Scout', 'Count', 'Life Stage', 'Photos', 'Notes'],
      tableRows,
      'All unknown pest sightings',
      'Most recent first'
    )}
  `;

  setTimeout(() => {
    mkChart('c-unknown-trend', 'bar', {
      labels: weekLabels,
      datasets: [{
        data: weekCounts,
        backgroundColor: weekCounts.map(v => v > 0 ? C.amber : 'rgba(210,160,46,0.15)'),
        borderRadius: 4,
      }],
    }, { scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } } });
  }, 0);
}
