import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, PALETTE, mkChart,
  kpiGrid, kpiCard, chartCard, emptyState, filterBadge,
} from './utils.js';

// data = { pests: [{ pestId, pestName, category, totalCount, fieldCount, sessionCount, breachCount, thresholdCount, topLifeStage }] }
export function renderTopPests(el, data, lookups) {
  const pests = data.pests ?? [];

  const totalCount    = pests.reduce((s, p) => s + (p.totalCount ?? 0), 0);
  const uniqueSpecies = pests.length;
  const aboveThresh   = pests.filter(p => (p.breachCount ?? 0) > 0).length;
  const mostWide      = pests.reduce((best, p) =>
    (p.fieldCount ?? 0) > (best?.fieldCount ?? 0) ? p : best, null);

  const catMap = {};
  for (const p of pests) {
    const cat = p.category ?? 'Unknown';
    catMap[cat] = (catMap[cat] ?? 0) + (p.totalCount ?? 0);
  }
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const top10 = pests.slice(0, 10);

  // Build category options for filter
  const categoryOptions = catEntries.map(([cat]) =>
    `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Unique Species',     uniqueSpecies, 'Different pest species observed', '',
        'Count of distinct pest species recorded in at least one observation within the selected date range and filters. Each species is counted once regardless of how many times it was observed.'),
      kpiCard('Total Observations', totalCount.toLocaleString(), 'Across all fields and sessions', '',
        'Sum of all individual pest count values recorded across every observation in the selected period. If multiple observations recorded the same pest, each count contributes separately to this total.'),
      kpiCard('Above Threshold',    aboveThresh, 'Species with at least one breach', aboveThresh > 0 ? C.red : '',
        'Number of pest species that triggered at least one threshold breach during the period. A species is counted here if any single observation of that pest exceeded its configured alert threshold.'),
      kpiCard('Most Widespread',    escapeHtml(mostWide?.pestName ?? '—'),
        mostWide ? `${mostWide.fieldCount} field${mostWide.fieldCount !== 1 ? 's' : ''}` : '', '',
        'The pest species observed in the greatest number of distinct fields during the selected period. Field count (shown in the sub-label) indicates how broadly this pest is spread across the operation.'),
    ])}
    <div class="two-col" style="margin-bottom:16px;">
      ${chartCard('Top 10 pests by count', 'c-pests-bar', 220)}
      ${chartCard('Observations by pest category', 'c-pests-cat', 220)}
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);">
        <span style="font-weight:600;font-size:0.88rem;">All observed pests</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input id="op-search" type="text" class="input-field" placeholder="Search pest name…"
            style="margin:0;padding:5px 10px;font-size:0.78rem;width:190px;" />
          <select id="op-category" class="input-field" style="margin:0;padding:5px 8px;font-size:0.78rem;width:auto;">
            <option value="">All categories</option>
            ${categoryOptions}
          </select>
          <select id="op-breach" class="input-field" style="margin:0;padding:5px 8px;font-size:0.78rem;width:auto;">
            <option value="">All</option>
            <option value="yes">With breaches</option>
            <option value="no">No breaches</option>
          </select>
        </div>
      </div>
      <div style="overflow-x:auto;overflow-y:auto;max-height:260px;">
        <table class="data-table" style="width:100%;min-width:640px;font-size:0.78rem;">
          <thead style="position:sticky;top:0;z-index:1;background:var(--surface);">
            <tr>
              <th style="width:36px;">#</th>
              <th data-col="pest"      style="cursor:pointer;white-space:nowrap;">Pest</th>
              <th data-col="category"  style="cursor:pointer;white-space:nowrap;">Category</th>
              <th data-col="count"     style="cursor:pointer;white-space:nowrap;">Count</th>
              <th data-col="share"     style="cursor:pointer;white-space:nowrap;">Share</th>
              <th data-col="fields"    style="cursor:pointer;white-space:nowrap;">Fields</th>
              <th data-col="sessions"  style="cursor:pointer;white-space:nowrap;">Sessions</th>
              <th data-col="breaches"  style="cursor:pointer;white-space:nowrap;">Breaches</th>
              <th>Top Life Stage</th>
            </tr>
          </thead>
          <tbody id="op-tbody"></tbody>
        </table>
      </div>
      <div id="op-pagination" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 14px;border-top:1px solid var(--border);font-size:0.76rem;color:var(--text-dim);"></div>
    </div>
  `;

  setTimeout(() => {
    mkChart('c-pests-bar', 'bar', {
      labels: top10.map(p => (p.pestName ?? '').length > 18 ? p.pestName.slice(0, 16) + '…' : p.pestName),
      datasets: [{
        data: top10.map(p => p.totalCount ?? 0),
        backgroundColor: PALETTE,
        borderRadius: 4,
      }],
    }, { indexAxis: 'y', scales: { x: { ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } } });

    mkChart('c-pests-cat', 'doughnut', {
      labels: catEntries.map(([n]) => n),
      datasets: [{ data: catEntries.map(([, v]) => v), backgroundColor: PALETTE, borderWidth: 0 }],
    }, { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } });

    // ── Interactive pests grid ────────────────────────────────────────────────
    let sortCol  = 'count';
    let sortDesc = true;
    let search   = '';
    let category = '';
    let breach   = '';
    let page     = 1;
    const pageSize = 10;

    function getRows() {
      const q = search.toLowerCase();
      return pests
        .filter(p => {
          if (category && (p.category ?? '') !== category) return false;
          if (breach === 'yes' && !(p.breachCount > 0)) return false;
          if (breach === 'no'  &&   p.breachCount > 0)  return false;
          if (!q) return true;
          return (p.pestName ?? '').toLowerCase().includes(q);
        })
        .sort((a, b) => {
          let av, bv;
          switch (sortCol) {
            case 'pest':     av = a.pestName  ?? ''; bv = b.pestName  ?? ''; break;
            case 'category': av = a.category  ?? ''; bv = b.category  ?? ''; break;
            case 'count':    av = a.totalCount   ?? 0; bv = b.totalCount   ?? 0; break;
            case 'share':    av = a.totalCount   ?? 0; bv = b.totalCount   ?? 0; break;
            case 'fields':   av = a.fieldCount   ?? 0; bv = b.fieldCount   ?? 0; break;
            case 'sessions': av = a.sessionCount ?? 0; bv = b.sessionCount ?? 0; break;
            case 'breaches': av = a.breachCount  ?? 0; bv = b.breachCount  ?? 0; break;
            default:         av = 0; bv = 0;
          }
          if (av < bv) return sortDesc ? 1 : -1;
          if (av > bv) return sortDesc ? -1 : 1;
          return 0;
        });
    }

    const colLabels = { pest: 'Pest', category: 'Category', count: 'Count', share: 'Share', fields: 'Fields', sessions: 'Sessions', breaches: 'Breaches' };

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

      const tbody = el.querySelector('#op-tbody');
      tbody.innerHTML = slice.length
        ? slice.map((p, i) => {
            const rank  = (page - 1) * pageSize + i + 1;
            const share = totalCount > 0 ? ((p.totalCount / totalCount) * 100).toFixed(1) : '0.0';
            return `<tr>
              <td style="font-family:'JetBrains Mono',monospace;color:var(--text-dim);">${rank}</td>
              <td style="font-weight:500;">${escapeHtml(p.pestName ?? '—')}</td>
              <td style="font-size:0.78rem;">${escapeHtml(p.category ?? '—')}</td>
              <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${(p.totalCount ?? 0).toLocaleString()}</td>
              <td style="font-family:'JetBrains Mono',monospace;">${share}%</td>
              <td style="font-family:'JetBrains Mono',monospace;">${p.fieldCount ?? 0}</td>
              <td style="font-family:'JetBrains Mono',monospace;">${p.sessionCount ?? 0}</td>
              <td style="font-family:'JetBrains Mono',monospace;color:${(p.breachCount ?? 0) > 0 ? C.red : ''};">${p.breachCount ?? 0}</td>
              <td style="font-size:0.75rem;color:var(--text-dim);">${escapeHtml(p.topLifeStage ?? '—')}</td>
            </tr>`;
          }).join('')
        : `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:16px;">No pests match your filters</td></tr>`;

      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end   = Math.min(page * pageSize, total);
      el.querySelector('#op-pagination').innerHTML = `
        <span>${start}–${end} of ${total} species</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="btn-outline op-prev" style="padding:3px 10px;font-size:0.75rem;" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>
          <span>Page ${page} of ${totalPages}</span>
          <button class="btn-outline op-next" style="padding:3px 10px;font-size:0.75rem;" ${page >= totalPages ? 'disabled' : ''}>Next ›</button>
        </div>
      `;
      el.querySelector('.op-prev')?.addEventListener('click', () => { if (page > 1) { page--; render(); } });
      el.querySelector('.op-next')?.addEventListener('click', () => { if (page < totalPages) { page++; render(); } });
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
    el.querySelector('#op-search').addEventListener('input', e => {
      clearTimeout(_deb);
      _deb = setTimeout(() => { search = e.target.value.trim(); page = 1; render(); }, 250);
    });
    el.querySelector('#op-category').addEventListener('change', e => { category = e.target.value; page = 1; render(); });
    el.querySelector('#op-breach').addEventListener('change',   e => { breach   = e.target.value; page = 1; render(); });

    render();
  }, 0);
}
