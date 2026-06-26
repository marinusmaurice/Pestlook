import { escapeHtml } from '../../utils/helpers.js';
import { C, kpiGrid, kpiCard, emptyState } from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   IM1 — Pest Presence
   data = {
     summary: { pestsTracked, newIntroductions, newlyClear, activePresence, confirmedAbsent },
     pests: [{
       pestId, pestName, newIntroductions, activePresenceCount,
       fields: [{
         fieldId, fieldName, farmName,
         status,               // "Present" | "Absent" | "Unknown"
         statusAt,             // ISO date of last status observation
         firstDetectedAt,      // ISO date of first ever confirmed present
         isNewIntroduction,    // firstDetectedAt is within the filter period
         isNewlyClear,         // was present at some point, now confirmed absent
         confirmedPresentCount,
         confirmedAbsentCount,
       }]
     }]
   }
───────────────────────────────────────────────────────────────────────────── */

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadge(field) {
  if (field.isNewIntroduction) {
    return `<span title="First ever confirmed-present observation for this pest in this field falls within the selected date range — this is a new arrival." style="cursor:help;background:${C.amber}22;color:${C.amber};border:1px solid ${C.amber}55;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;">⚠ New Introduction</span>`;
  }
  if (field.isNewlyClear) {
    return `<span title="This pest was confirmed present at some point in the period, but the most recent presence check confirmed it absent — possible containment success or natural decline." style="cursor:help;background:${C.teal}22;color:${C.teal};border:1px solid ${C.teal}55;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;">✓ Newly Clear</span>`;
  }
  if (field.status === 'Present') {
    return `<span title="Most recent presence-type observation confirmed this pest is present in the field." style="cursor:help;background:${C.red}22;color:${C.red};border:1px solid ${C.red}55;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;">● Present</span>`;
  }
  if (field.status === 'Absent') {
    return `<span title="Most recent presence-type observation confirmed this pest was not found in the field." style="cursor:help;background:var(--border);color:var(--text-dim);border:1px solid var(--border);border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;">○ Absent</span>`;
  }
  return `<span style="color:var(--text-dim);font-size:0.72rem;">—</span>`;
}

function sortPriority(f) {
  if (f.isNewIntroduction) return 0;
  if (f.status === 'Present') return 1;
  if (f.isNewlyClear) return 2;
  return 3;
}

export function renderPresenceMap(container, data) {
  const summary = data.summary ?? {};
  const pests   = data.pests   ?? [];

  if (!pests.length) {
    container.innerHTML = emptyState(
      '👁',
      'No presence/absence data',
      'Scouts need to record "Confirmed Present" or "Confirmed Absent" observations for this view to populate. These are separate from count-based observations.'
    );
    return;
  }

  container.innerHTML =
    '<div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">' +
    'Tracks which pests have been <strong>confirmed present or absent</strong> per field, using presence-type observations (not counts). ' +
    '<span style="color:' + C.amber + ';font-weight:600;">⚠ New Introduction</span> = first confirmed presence within the selected period. ' +
    '<span style="color:' + C.teal + ';font-weight:600;">✓ Newly Clear</span> = was present but most recent check confirmed absent.' +
    '</div>' +
    kpiGrid([
      kpiCard('Pests Tracked',      summary.pestsTracked     ?? 0, 'with presence data',    C.blue,
        'Number of distinct pest species that have at least one confirmed-present or confirmed-absent observation in the selected period.'),
      kpiCard('New Introductions',  summary.newIntroductions ?? 0, 'first detected in period', summary.newIntroductions > 0 ? C.amber : '',
        'Field × pest combinations where the first ever confirmed-present observation falls within the selected date range — a new arrival.'),
      kpiCard('Newly Clear',        summary.newlyClear       ?? 0, 'absent after presence',   summary.newlyClear > 0 ? C.teal : '',
        'Field × pest combinations where the pest was previously confirmed present but the most recent check confirmed absent — possible containment success.'),
      kpiCard('Active Presence',    summary.activePresence   ?? 0, 'confirmed present',        summary.activePresence > 0 ? C.red : '',
        'Field × pest combinations where the most recent presence observation confirmed the pest is still present.'),
    ]);

  for (const pest of pests) {
    const sorted = [...pest.fields].sort((a, b) => sortPriority(a) - sortPriority(b));

    const rows = sorted.map(f => `
      <tr>
        <td>
          <div style="font-size:0.85rem;font-weight:600;color:var(--text);">${escapeHtml(f.fieldName ?? '—')}</div>
          <div style="font-size:0.75rem;color:var(--text-dim);">${escapeHtml(f.farmName ?? '—')}</div>
        </td>
        <td>${statusBadge(f)}</td>
        <td style="font-size:0.78rem;color:var(--text-dim);white-space:nowrap;">${fmtDate(f.statusAt)}</td>
        <td style="font-size:0.78rem;color:var(--text-dim);white-space:nowrap;">
          ${f.firstDetectedAt ? fmtDate(f.firstDetectedAt) : '<span style="color:var(--text-dim);">—</span>'}
        </td>
        <td style="font-family:monospace;font-size:0.82rem;text-align:center;"
            title="Number of individual observations where a scout recorded 'Confirmed Present' (left) vs 'Confirmed Absent' (right) for this pest in this field within the selected period.">
          <span style="color:${C.red};cursor:help;" title="Times confirmed present">${f.confirmedPresentCount} ✓</span>
          <span style="color:var(--text-dim);"> / </span>
          <span style="color:var(--text-dim);cursor:help;" title="Times confirmed absent">${f.confirmedAbsentCount} ✗</span>
        </td>
      </tr>`).join('');

    const newBadge = pest.newIntroductions > 0
      ? `<span style="background:${C.amber}22;color:${C.amber};border:1px solid ${C.amber}55;border-radius:20px;padding:1px 8px;font-size:0.7rem;font-weight:700;margin-left:8px;">${pest.newIntroductions} new</span>`
      : '';

    container.insertAdjacentHTML('beforeend', `
      <div class="card card-p" style="margin-bottom:14px;">
        <div style="font-size:0.95rem;font-weight:700;color:var(--text);margin-bottom:12px;">
          🐛 ${escapeHtml(pest.pestName)}${newBadge}
          <span style="font-size:0.75rem;font-weight:400;color:var(--text-dim);margin-left:10px;">${pest.fields.length} field${pest.fields.length !== 1 ? 's' : ''} tracked</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table" style="width:100%;">
            <thead>
              <tr>
                <th>Field</th>
                <th>Status</th>
                <th>Last Confirmed</th>
                <th>First Detected</th>
                <th style="text-align:center;cursor:help;" title="Count of observations recorded as 'Confirmed Present' vs 'Confirmed Absent' within the selected period.">Checks ✓ / ✗</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`);
  }
}
