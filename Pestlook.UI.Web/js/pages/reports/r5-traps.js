import { escapeHtml, formatDate } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, PALETTE, mkChart,
  kpiGrid, kpiCard, chartCard, emptyState, filterBadge,
} from './utils.js';

// data = { traps: [...], catchesByType: [{ trapType, totalCatches }] }
export function renderTrapPerformance(el, data, lookups) {
  const traps         = data.traps         ?? [];
  const catchesByType = data.catchesByType ?? [];

  const activeTraps  = traps.filter(t => t.isEnabled).length;
  const totalCatches = traps.reduce((s, t) => s + (t.totalCatches ?? 0), 0);
  const totalChecks  = traps.reduce((s, t) => s + (t.checkCount   ?? 0), 0);
  const avgCatchRate = totalChecks > 0 ? (totalCatches / totalChecks).toFixed(2) : '0.00';
  const overdue7     = traps.filter(t => t.isEnabled && (t.daysSinceCheck ?? 0) > 7).length;

  const trapTypes = [...new Set(traps.map(t => t.trapType).filter(Boolean))].sort();
  const typeOptions = trapTypes.map(ty => `<option value="${escapeHtml(ty)}">${escapeHtml(ty)}</option>`).join('');

  const sorted = [...traps].sort((a, b) => (b.totalCatches ?? 0) - (a.totalCatches ?? 0));

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Active Traps',   activeTraps,  `${traps.length - activeTraps} disabled`, '',
        'Number of traps currently marked as enabled and actively collecting data. Disabled traps are shown in the sub-label and are excluded from catch-rate calculations.'),
      kpiCard('Total Catches',  totalCatches.toLocaleString(), 'In selected period', '',
        'Sum of all catch counts recorded across every active trap in the selected date range. Each trap check contributes its recorded catch count to this total.'),
      kpiCard('Avg Catch Rate', avgCatchRate, 'catches per check', '',
        'Average number of catches recorded per trap inspection. Calculated as: total catches ÷ total check events across all traps in the period. Higher values indicate greater pest activity at monitored points.'),
      kpiCard('Overdue Checks', overdue7, 'Active traps not checked in > 7 days', overdue7 > 0 ? C.red : '',
        'Number of enabled traps whose last recorded check was more than 7 days ago. These traps may have stale data and should be inspected soon to maintain data quality.'),
    ])}
    <div class="two-col" style="margin-bottom:16px;">
      ${chartCard('Top 10 traps by catches', 'c-traps-bar', 220)}
      ${chartCard('Catches by trap type', 'c-traps-type', 220)}
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);">
        <span style="font-weight:600;font-size:0.88rem;">All traps</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input id="tr-search" type="text" class="input-field" placeholder="Search trap, field or farm…"
            style="margin:0;padding:5px 10px;font-size:0.78rem;width:200px;" />
          <select id="tr-type" class="input-field" style="margin:0;padding:5px 8px;font-size:0.78rem;width:auto;">
            <option value="">All types</option>
            ${typeOptions}
          </select>
          <select id="tr-status" class="input-field" style="margin:0;padding:5px 8px;font-size:0.78rem;width:auto;">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>
      <div style="overflow-x:auto;overflow-y:auto;max-height:260px;">
        <table class="data-table" style="width:100%;min-width:700px;font-size:0.78rem;">
          <thead style="position:sticky;top:0;z-index:1;background:var(--surface);">
            <tr>
              <th data-col="trap"      style="cursor:pointer;white-space:nowrap;">Trap</th>
              <th data-col="type"      style="cursor:pointer;white-space:nowrap;">Type</th>
              <th data-col="field"     style="cursor:pointer;white-space:nowrap;">Field</th>
              <th data-col="farm"      style="cursor:pointer;white-space:nowrap;">Farm</th>
              <th data-col="catches"   style="cursor:pointer;white-space:nowrap;">Catches</th>
              <th data-col="checks"    style="cursor:pointer;white-space:nowrap;">Checks</th>
              <th data-col="catchrate" style="cursor:pointer;white-space:nowrap;">Catch Rate</th>
              <th data-col="lastcheck" style="cursor:pointer;white-space:nowrap;">Last Checked</th>
              <th>Top Pest</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="tr-tbody"></tbody>
        </table>
      </div>
      <div id="tr-pagination" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 14px;border-top:1px solid var(--border);font-size:0.76rem;color:var(--text-dim);"></div>
    </div>
  `;

  setTimeout(() => {
    const top10 = sorted.slice(0, 10);
    mkChart('c-traps-bar', 'bar', {
      labels: top10.map(t => (t.trapName ?? '').length > 16 ? t.trapName.slice(0, 14) + '…' : t.trapName),
      datasets: [{
        data: top10.map(t => t.totalCatches ?? 0),
        backgroundColor: C.teal,
        borderRadius: 4,
      }],
    }, { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } } });

    mkChart('c-traps-type', 'doughnut', {
      labels: catchesByType.map(x => x.trapType ?? 'Unknown'),
      datasets: [{ data: catchesByType.map(x => x.totalCatches ?? 0), backgroundColor: PALETTE, borderWidth: 0 }],
    }, { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } });

    // ── Interactive traps grid ────────────────────────────────────────────────
    let sortCol  = 'catches';
    let sortDesc = true;
    let search   = '';
    let typeFilter   = '';
    let statusFilter = '';
    let page     = 1;
    const pageSize = 10;

    function statusOf(t) {
      if (!t.isEnabled) return 'disabled';
      if ((t.daysSinceCheck ?? 0) > 7) return 'overdue';
      return 'active';
    }

    function getRows() {
      const q = search.toLowerCase();
      return traps
        .filter(t => {
          if (typeFilter   && (t.trapType ?? '') !== typeFilter)     return false;
          if (statusFilter && statusOf(t) !== statusFilter)          return false;
          if (!q) return true;
          return (t.trapName  ?? '').toLowerCase().includes(q) ||
                 (t.fieldName ?? '').toLowerCase().includes(q) ||
                 (t.farmName  ?? '').toLowerCase().includes(q);
        })
        .sort((a, b) => {
          let av, bv;
          switch (sortCol) {
            case 'trap':      av = a.trapName  ?? ''; bv = b.trapName  ?? ''; break;
            case 'type':      av = a.trapType  ?? ''; bv = b.trapType  ?? ''; break;
            case 'field':     av = a.fieldName ?? ''; bv = b.fieldName ?? ''; break;
            case 'farm':      av = a.farmName  ?? ''; bv = b.farmName  ?? ''; break;
            case 'catches':   av = a.totalCatches ?? 0; bv = b.totalCatches ?? 0; break;
            case 'checks':    av = a.checkCount   ?? 0; bv = b.checkCount   ?? 0; break;
            case 'catchrate': av = parseFloat(a.catchRate ?? 0); bv = parseFloat(b.catchRate ?? 0); break;
            case 'lastcheck': av = a.lastChecked ?? ''; bv = b.lastChecked ?? ''; break;
            default:          av = 0; bv = 0;
          }
          if (av < bv) return sortDesc ? 1 : -1;
          if (av > bv) return sortDesc ? -1 : 1;
          return 0;
        });
    }

    const colLabels = { trap: 'Trap', type: 'Type', field: 'Field', farm: 'Farm', catches: 'Catches', checks: 'Checks', catchrate: 'Catch Rate', lastcheck: 'Last Checked' };

    function render() {
      const filtered   = getRows();
      const total      = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (page > totalPages) page = totalPages;
      const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

      el.querySelectorAll('th[data-col]').forEach(th => {
        const key = th.dataset.col;
        th.textContent = colLabels[key] ?? key;
        if (key === sortCol) th.textContent += sortDesc ? ' ▼' : ' ▲';
      });

      const tbody = el.querySelector('#tr-tbody');
      tbody.innerHTML = slice.length
        ? slice.map(t => {
            const s = statusOf(t);
            const statusTag = s === 'overdue'  ? tag('Overdue', 'red')
                            : s === 'disabled' ? tag('Disabled', 'amber')
                            :                   tag('Active', 'green');
            return `<tr>
              <td style="font-weight:500;">${escapeHtml(t.trapName ?? '—')}</td>
              <td style="font-size:0.75rem;">${escapeHtml(t.trapType ?? '—')}</td>
              <td>${escapeHtml(t.fieldName ?? '—')}</td>
              <td>${escapeHtml(t.farmName  ?? '—')}</td>
              <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${(t.totalCatches ?? 0).toLocaleString()}</td>
              <td style="font-family:'JetBrains Mono',monospace;">${t.checkCount ?? 0}</td>
              <td style="font-family:'JetBrains Mono',monospace;">${t.catchRate  ?? 0}</td>
              <td style="white-space:nowrap;">${t.lastChecked ? formatDate(t.lastChecked) : '—'}</td>
              <td style="font-size:0.75rem;color:var(--text-dim);">${escapeHtml(t.topPest ?? '—')}</td>
              <td>${statusTag}</td>
            </tr>`;
          }).join('')
        : `<tr><td colspan="10" style="text-align:center;color:var(--text-dim);padding:16px;">No traps match your filters</td></tr>`;

      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end   = Math.min(page * pageSize, total);
      el.querySelector('#tr-pagination').innerHTML = `
        <span>${start}–${end} of ${total} traps</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="btn-outline tr-prev" style="padding:3px 10px;font-size:0.75rem;" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>
          <span>Page ${page} of ${totalPages}</span>
          <button class="btn-outline tr-next" style="padding:3px 10px;font-size:0.75rem;" ${page >= totalPages ? 'disabled' : ''}>Next ›</button>
        </div>
      `;
      el.querySelector('.tr-prev')?.addEventListener('click', () => { if (page > 1) { page--; render(); } });
      el.querySelector('.tr-next')?.addEventListener('click', () => { if (page < totalPages) { page++; render(); } });
    }

    el.querySelectorAll('th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.col;
        if (sortCol === key) sortDesc = !sortDesc;
        else { sortCol = key; sortDesc = true; }
        page = 1;
        render();
      });
    });

    let _deb;
    el.querySelector('#tr-search').addEventListener('input', e => {
      clearTimeout(_deb);
      _deb = setTimeout(() => { search = e.target.value.trim(); page = 1; render(); }, 250);
    });
    el.querySelector('#tr-type').addEventListener('change',   e => { typeFilter   = e.target.value; page = 1; render(); });
    el.querySelector('#tr-status').addEventListener('change', e => { statusFilter = e.target.value; page = 1; render(); });

    render();
  }, 0);
}


