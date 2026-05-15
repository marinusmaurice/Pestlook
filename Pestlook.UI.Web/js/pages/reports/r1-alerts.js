import { escapeHtml, formatDate } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, mkChart,
  kpiGrid, kpiCard, chartCard, emptyState, filterBadge,
} from './utils.js';

// data = { breaches, repeatOffenders, weeklyTrend }
export function renderThresholdAlerts(el, data, lookups) {
  const breaches        = data.breaches        ?? [];
  const repeatOffenders = data.repeatOffenders ?? [];
  const weeklyTrend     = data.weeklyTrend     ?? [];

  const critical       = breaches.filter(b => (b.observedCount ?? 0) >= (b.thresholdCount ?? 0) * 2).length;
  const fieldsAffected = new Set(breaches.map(b => b.fieldName).filter(Boolean)).size;
  const farmsAffected  = new Set(breaches.map(b => b.farmName).filter(Boolean)).size;

  const weekLabels = weeklyTrend.map(w =>
    new Date(w.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
  const weekCounts = weeklyTrend.map(w => w.breaches);

  const offenderHtml = repeatOffenders.length ? `
    <div class="card card-p card-static" style="margin-bottom:16px;border-left:3px solid ${C.red};">
      <div class="section-title" style="margin-bottom:8px;">⚠ Repeat Offenders</div>
      <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:8px;">Pests breaching thresholds across multiple scouting sessions</div>
      <div style="max-height:180px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent;">
      ${repeatOffenders.map(r => `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);">
          <div style="flex:1;">
            <span style="font-weight:600;font-size:0.82rem;">${escapeHtml(r.pestName ?? '—')}</span>
            <span style="font-size:0.72rem;color:var(--text-dim);margin-left:8px;">${escapeHtml(r.fieldName ?? '—')}</span>
          </div>
          ${tag(r.breachCount + ' breaches', 'red')}
        </div>`).join('')}
      </div>
    </div>` : '';

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('Total Breaches',  breaches.length, '', breaches.length > 0 ? C.red : C.green,
        'Total number of observations in the selected period where the recorded pest count exceeded the configured alert threshold for that monitoring point.'),
      kpiCard('Critical',        critical, '≥ 2× threshold — act immediately', critical > 0 ? C.red : '',
        'Observations where the count was at least double the threshold value. Calculated as: observed count ≥ 2 × threshold count. These require immediate action.'),
      kpiCard('Warning',         breaches.length - critical, '> threshold — monitor closely', (breaches.length - critical) > 0 ? C.amber : '',
        'Breaches that exceeded the threshold but did not reach the critical level (i.e. count < 2 × threshold). These should be closely monitored.'),
      kpiCard('Fields Affected', fieldsAffected, `${farmsAffected} farm${farmsAffected !== 1 ? 's' : ''}`, '',
        'Number of distinct fields containing at least one threshold breach in the selected period. The sub-label shows how many farms those fields belong to.'),
    ])}
    ${chartCard('Threshold breaches per week', 'c-alerts-trend', 160, 'Number of breaching observations each week')}
    ${offenderHtml}
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);">
        <span style="font-weight:600;font-size:0.88rem;">All threshold breaches</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input id="ab-search" type="text" class="input-field" placeholder="Search pest, field or scout…"
            style="margin:0;padding:5px 10px;font-size:0.78rem;width:200px;" />
          <select id="ab-status" class="input-field" style="margin:0;padding:5px 8px;font-size:0.78rem;width:auto;">
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
          </select>
        </div>
      </div>
      <div id="ab-table-wrap" style="overflow-x:auto;overflow-y:auto;max-height:260px;">
        <table class="data-table" style="width:100%;min-width:640px;font-size:0.78rem;">
          <thead style="position:sticky;top:0;z-index:1;background:var(--surface);">
            <tr>
              <th data-col="pest"    style="cursor:pointer;white-space:nowrap;">Pest</th>
              <th data-col="field"   style="cursor:pointer;white-space:nowrap;">Field</th>
              <th data-col="farm"    style="cursor:pointer;white-space:nowrap;">Farm</th>
              <th data-col="count"   style="cursor:pointer;white-space:nowrap;">Count</th>
              <th data-col="thresh"  style="cursor:pointer;white-space:nowrap;">Threshold</th>
              <th data-col="pct"     style="cursor:pointer;white-space:nowrap;">Over by</th>
              <th data-col="scout"   style="cursor:pointer;white-space:nowrap;">Scout</th>
              <th data-col="date"    style="cursor:pointer;white-space:nowrap;">Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="ab-tbody"></tbody>
        </table>
      </div>
      <div id="ab-pagination" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 14px;border-top:1px solid var(--border);font-size:0.76rem;color:var(--text-dim);"></div>
    </div>
  `;

  setTimeout(() => {
    mkChart('c-alerts-trend', 'bar', {
      labels: weekLabels,
      datasets: [{
        data: weekCounts,
        backgroundColor: weekCounts.map(v => v > 0 ? C.red : 'rgba(199,81,70,0.15)'),
        borderRadius: 4,
      }],
    }, { scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } } });

    // ── Interactive breaches grid ─────────────────────────────────────────────
    const COLS = ['pest','field','farm','count','thresh','pct','scout','date'];
    let sortCol  = 'pct';
    let sortDesc = true;
    let search   = '';
    let severity = '';
    let page     = 1;
    const pageSize = 10;

    function getRows() {
      const q = search.toLowerCase();
      return breaches
        .filter(b => {
          const isCrit = (b.observedCount ?? 0) >= (b.thresholdCount ?? 0) * 2;
          if (severity === 'critical' && !isCrit) return false;
          if (severity === 'warning'  &&  isCrit) return false;
          if (!q) return true;
          return (b.pestName    ?? '').toLowerCase().includes(q) ||
                 (b.fieldName   ?? '').toLowerCase().includes(q) ||
                 (b.farmName    ?? '').toLowerCase().includes(q) ||
                 (b.scouterName ?? '').toLowerCase().includes(q);
        })
        .sort((a, b) => {
          let av, bv;
          const pctA = a.thresholdCount ? ((a.observedCount - a.thresholdCount) / a.thresholdCount) * 100 : 0;
          const pctB = b.thresholdCount ? ((b.observedCount - b.thresholdCount) / b.thresholdCount) * 100 : 0;
          switch (sortCol) {
            case 'pest':   av = a.pestName    ?? ''; bv = b.pestName    ?? ''; break;
            case 'field':  av = a.fieldName   ?? ''; bv = b.fieldName   ?? ''; break;
            case 'farm':   av = a.farmName    ?? ''; bv = b.farmName    ?? ''; break;
            case 'count':  av = a.observedCount  ?? 0; bv = b.observedCount  ?? 0; break;
            case 'thresh': av = a.thresholdCount ?? 0; bv = b.thresholdCount ?? 0; break;
            case 'pct':    av = pctA; bv = pctB; break;
            case 'scout':  av = a.scouterName ?? ''; bv = b.scouterName ?? ''; break;
            case 'date':   av = a.completedAt ?? ''; bv = b.completedAt ?? ''; break;
            default:       av = 0; bv = 0;
          }
          if (av < bv) return sortDesc ? 1 : -1;
          if (av > bv) return sortDesc ? -1 : 1;
          return 0;
        });
    }

    function render() {
      const rows      = getRows();
      const total     = rows.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (page > totalPages) page = totalPages;
      const slice     = rows.slice((page - 1) * pageSize, page * pageSize);

      // Update sort arrows in headers
      el.querySelectorAll('th[data-col]').forEach(th => {
        const key = th.dataset.col;
        th.textContent = {pest:'Pest',field:'Field',farm:'Farm',count:'Count',thresh:'Threshold',pct:'Over by',scout:'Scout',date:'Date'}[key];
        if (key === sortCol) th.textContent += sortDesc ? ' ▼' : ' ▲';
      });

      const tbody = el.querySelector('#ab-tbody');
      if (!slice.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:16px;">No breaches match your filters</td></tr>`;
      } else {
        tbody.innerHTML = slice.map(b => {
          const isCrit = (b.observedCount ?? 0) >= (b.thresholdCount ?? 0) * 2;
          const pct    = b.thresholdCount
            ? Math.round(((b.observedCount - b.thresholdCount) / b.thresholdCount) * 100) + '%'
            : '—';
          return `<tr>
            <td style="font-weight:500;">${escapeHtml(b.pestName ?? '—')}</td>
            <td>${escapeHtml(b.fieldName ?? '—')}</td>
            <td>${escapeHtml(b.farmName  ?? '—')}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-weight:600;color:${isCrit ? C.red : C.amber};">${b.observedCount ?? '—'}</td>
            <td style="font-family:'JetBrains Mono',monospace;">${b.thresholdCount ?? '—'}</td>
            <td style="font-family:'JetBrains Mono',monospace;">${pct}</td>
            <td>${escapeHtml(b.scouterName ?? '—')}</td>
            <td style="white-space:nowrap;">${b.completedAt ? formatDate(b.completedAt) : '—'}</td>
            <td>${tag(isCrit ? 'Critical' : 'Warning', isCrit ? 'red' : 'amber')}</td>
          </tr>`;
        }).join('');
      }

      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end   = Math.min(page * pageSize, total);
      el.querySelector('#ab-pagination').innerHTML = `
        <span>${start}–${end} of ${total} breaches</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="btn-outline ab-prev" style="padding:3px 10px;font-size:0.75rem;" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>
          <span>Page ${page} of ${totalPages}</span>
          <button class="btn-outline ab-next" style="padding:3px 10px;font-size:0.75rem;" ${page >= totalPages ? 'disabled' : ''}>Next ›</button>
        </div>
      `;

      el.querySelector('.ab-prev')?.addEventListener('click', () => { if (page > 1) { page--; render(); } });
      el.querySelector('.ab-next')?.addEventListener('click', () => { if (page < totalPages) { page++; render(); } });
    }

    // Sort headers
    el.querySelectorAll('th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.col;
        if (sortCol === key) sortDesc = !sortDesc;
        else { sortCol = key; sortDesc = true; }
        page = 1;
        render();
      });
    });

    // Search
    let _deb;
    el.querySelector('#ab-search').addEventListener('input', e => {
      clearTimeout(_deb);
      _deb = setTimeout(() => { search = e.target.value.trim(); page = 1; render(); }, 250);
    });

    // Severity filter
    el.querySelector('#ab-status').addEventListener('change', e => {
      severity = e.target.value;
      page = 1;
      render();
    });

    render();
  }, 0);
}
