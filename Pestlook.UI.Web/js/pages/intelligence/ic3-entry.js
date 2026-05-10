import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   C3 — Entry Point Analysis
   data = {
     pests: [{ pestId, pestName, spreadChainLength,
               originField: { fieldId, fieldName, farmId, farmName, farmLat, farmLng,
                              firstSeen, maxCount, weekCount },
               spreadChain: [{ fieldId, fieldName, farmId, farmName, farmLat, farmLng,
                               firstSeen, daysAfterOrigin, maxCount, weekCount }],
               entryVector, originDistFromCentroidKm, clusterMedianDistKm,
               isPeripheralEntry, entryPointNote }],
     clusterCentroid: { lat, lng },
     summary: { pestsAnalysed, peripheralEntries, centralEntries, unknownGps, dataNote }
   }
───────────────────────────────────────────────────────────────────────────── */

const VECTOR_COL  = { peripheral: '#c0392b', central: '#2980b9', unknown: '#7f8c8d' };
const VECTOR_ICON = { peripheral: '🔴', central: '🔵', unknown: '⬜' };
const VECTOR_LABEL = { peripheral: 'Peripheral Entry', central: 'Central Cluster', unknown: 'GPS Unknown' };

export async function renderEntryPointAnalysis(el, data) {
  const { pests = [], summary = {}, clusterCentroid = {} } = data;

  if (!pests.length) {
    el.innerHTML = emptyState('🔍', 'No entry point data',
      summary.dataNote ?? 'No multi-field pest observations found in the selected period. At least 2 fields must report the same pest for an entry point to be determined.');
    return;
  }

  const kpi = (label, value, colour, sub = '') => `
    <div class="card card-p" style="flex:1;min-width:130px;">
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Identifies the most likely <strong>entry point</strong> for each pest outbreak by locating the field with the earliest detection and measuring how far its farm sits from the centroid of all your farms. Farms on the <strong>perimeter</strong> of your cluster are the most probable entry points for introductions from outside (boundary vectors, road sides, irrigation channels). <strong>Central</strong> entries suggest internal spread via shared equipment, workers, or plant material.</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      ${kpi('Pests Analysed',      summary.pestsAnalysed     ?? 0, 'var(--text)',  'with origin detected')}
      ${kpi('Peripheral Entries',  summary.peripheralEntries ?? 0, '#c0392b',     'border / perimeter farms')}
      ${kpi('Central Entries',     summary.centralEntries    ?? 0, '#2980b9',     'within farm cluster')}
      ${kpi('GPS Not Set',         summary.unknownGps        ?? 0, '#7f8c8d',     'farms need coordinates')}
    </div>
    <div style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.75rem;color:var(--text-dim);margin-bottom:18px;">
      ℹ️ ${escapeHtml(summary.dataNote ?? '')}
    </div>`;

  const rows = pests.map(p => {
    const col   = VECTOR_COL[p.entryVector]   ?? '#888';
    const icon  = VECTOR_ICON[p.entryVector]  ?? '⬜';
    const label = VECTOR_LABEL[p.entryVector] ?? 'Unknown';

    const chainRows = (p.spreadChain ?? []).map((s, idx) => `
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
        <div style="width:22px;height:22px;border-radius:50%;background:${idx === 0 ? '#c0392b' : idx === (p.spreadChain.length - 1) ? '#f39c12' : '#2980b9'};
          color:#fff;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${idx + 1}</div>
        <div style="flex:1;">
          <div style="font-weight:${idx === 0 ? '700' : '400'};font-size:0.85rem;">
            ${escapeHtml(s.fieldName)} <span style="color:var(--text-dim);font-size:0.78rem;">· ${escapeHtml(s.farmName)}</span>
            ${idx === 0 ? '<span style="padding:1px 7px;border-radius:10px;font-size:0.68rem;font-weight:700;background:rgba(192,57,43,0.12);color:#c0392b;margin-left:6px;">ORIGIN</span>' : ''}
          </div>
          <div style="font-size:0.75rem;color:var(--text-dim);">
            First seen: ${s.firstSeen}
            ${s.daysAfterOrigin > 0 ? `· <span style="color:#e67e22;">${s.daysAfterOrigin}d after origin</span>` : ''}
            · Peak count: <strong>${s.maxCount}</strong>
          </div>
        </div>
      </div>`).join('');

    return `
      <div class="card card-p" style="border-left:4px solid ${col};margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">🔍 ${escapeHtml(p.pestName)}</div>
            <div style="font-size:0.78rem;color:var(--text-dim);">${p.spreadChainLength} fields in spread chain</div>
          </div>
          <span style="padding:3px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${col}22;color:${col};">
            ${icon} ${label}
          </span>
        </div>

        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:0.82rem;margin-bottom:12px;padding:10px 12px;background:var(--surface);border-radius:8px;border:1px solid var(--border);">
          <span style="color:var(--text-dim);">Origin dist from cluster centre: <strong>${p.originDistFromCentroidKm} km</strong></span>
          <span style="color:var(--text-dim);">Cluster median dist: <strong>${p.clusterMedianDistKm} km</strong></span>
        </div>

        <div style="padding:8px 12px;background:${col}11;border-radius:6px;font-size:0.78rem;color:var(--text);margin-bottom:14px;">
          💡 ${escapeHtml(p.entryPointNote)}
        </div>

        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-dim);margin-bottom:8px;">Spread Chain</div>
        ${chainRows}
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${rows}`;
}
