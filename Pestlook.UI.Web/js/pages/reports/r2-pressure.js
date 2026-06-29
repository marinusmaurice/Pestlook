import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, mkChart,
  kpiGrid, kpiCard, chartCard, emptyState, filterBadge,
} from './utils.js';

// data = { fields: [{ fieldId, fieldName, farmName, sessionCount, totalObs, avgObsPerSession, breachCount, topPests }] }
export function renderPestPressure(el, data, lookups) {
  const rows   = data.fields ?? [];
  const maxAvg = rows.length ? Math.max(...rows.map(r => r.avgObsPerSession ?? 0)) : 1;

  const highPressure  = rows.filter(r => (r.avgObsPerSession ?? 0) >= maxAvg * 0.66).length;
  const medPressure   = rows.filter(r => (r.avgObsPerSession ?? 0) >= maxAvg * 0.33 && (r.avgObsPerSession ?? 0) < maxAvg * 0.66).length;
  const lowPressure   = rows.filter(r => (r.avgObsPerSession ?? 0) < maxAvg * 0.33).length;
  const totalBreaches = rows.reduce((sum, r) => sum + (r.breachCount ?? 0), 0);

  const pressureList = rows.length ? rows.map(r => {
    const pct      = maxAvg > 0 ? Math.round(((r.avgObsPerSession ?? 0) / maxAvg) * 100) : 0;
    const barColor = pct >= 66 ? C.red : pct >= 33 ? C.amber : C.green;
    const levelTag = pct >= 66 ? tag('High', 'red') : pct >= 33 ? tag('Medium', 'amber') : tag('Low', 'green');
    const top3Html = (r.topPests ?? []).map(p =>
      `<span style="font-size:0.73rem;background:var(--surface3,#f0f4f1);border-radius:4px;padding:1px 6px;">${escapeHtml(p.pestName)} (${p.pestCount})</span>`
    ).join(' ');
    return `
      <div style="margin-bottom:10px;padding:10px 14px;background:var(--surface2);border-radius:8px;border-left:3px solid ${barColor};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div>
            <span style="font-weight:500;font-size:0.88rem;">${escapeHtml(r.fieldName ?? '—')}</span>
            <span style="font-size:0.75rem;color:var(--text-dim);margin-left:6px;">— ${escapeHtml(r.farmName ?? '—')}</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            ${levelTag}
            <span style="font-size:0.78rem;color:var(--text-dim);">${(r.avgObsPerSession ?? 0).toFixed(1)} obs/session · ${r.sessionCount ?? 0} session${r.sessionCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="progress-bar" style="margin-bottom:6px;">
          <div class="progress-fill" style="width:${pct}%;background:${barColor};"></div>
        </div>
        ${top3Html ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;">${top3Html}</div>` : ''}
      </div>`;
  }).join('') : emptyState('🌿', 'No completed sessions', 'Complete scouting sessions to see field pressure');

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('High Pressure',   highPressure,  'Fields ≥ 66% of peak avg', highPressure > 0 ? C.red   : '',
        'Fields whose average pest observations per session is ≥ 66% of the highest-performing field in the period. Calculated as: avg obs/session ÷ max avg obs/session across all fields.'),
      kpiCard('Medium Pressure', medPressure,   'Fields 33–65% of peak avg', medPressure  > 0 ? C.amber : '',
        'Fields with average pest observations per session between 33% and 65% of the peak field. Indicates moderate activity requiring continued monitoring.'),
      kpiCard('Low Pressure',    lowPressure,   'Fields < 33% of peak avg', C.green,
        'Fields with average pest observations per session below 33% of the peak field. These fields are relatively clear based on recent scouting data.'),
      kpiCard('Total Breaches',  totalBreaches, 'Threshold breaches across all fields', totalBreaches > 0 ? C.red : '',
        'Sum of all threshold breach events recorded across every field in the selected period. A breach occurs when a single observation\'s pest count exceeds the configured threshold for that monitoring point.'),
    ])}
    ${chartCard('Avg observations per session by field (top 10)', 'c-pressure', 220, 'Higher = more pest activity per visit')}
    <div class="card card-p card-static" style="margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:4px;">Field pressure overview</div>
      <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:14px;">Relative pest pressure — bar width proportional to peak field in period</div>
      ${pressureList}
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);">
        <span style="font-weight:600;font-size:0.88rem;">Detailed field breakdown</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input id="fb-search" type="text" class="input-field" placeholder="Search field or farm…"
            style="margin:0;padding:5px 10px;font-size:0.78rem;width:190px;" />
          <select id="fb-level" class="input-field" style="margin:0;padding:5px 8px;font-size:0.78rem;width:auto;">
            <option value="">All pressure levels</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      <div style="overflow-x:auto;overflow-y:auto;max-height:260px;">
        <table class="data-table" style="width:100%;min-width:560px;font-size:0.78rem;">
          <thead style="position:sticky;top:0;z-index:1;background:var(--surface);">
            <tr>
              <th data-col="field"    style="cursor:pointer;white-space:nowrap;">Field</th>
              <th data-col="farm"     style="cursor:pointer;white-space:nowrap;">Farm</th>
              <th data-col="sessions" style="cursor:pointer;white-space:nowrap;">Sessions</th>
              <th data-col="total"    style="cursor:pointer;white-space:nowrap;">Total Obs</th>
              <th data-col="avg"      style="cursor:pointer;white-space:nowrap;">Avg / Session</th>
              <th data-col="breaches" style="cursor:pointer;white-space:nowrap;">Breaches</th>
              <th>Top Pests</th>
            </tr>
          </thead>
          <tbody id="fb-tbody"></tbody>
        </table>
      </div>
      <div id="fb-pagination" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 14px;border-top:1px solid var(--border);font-size:0.76rem;color:var(--text-dim);"></div>
    </div>
  `;

  setTimeout(() => {
    const top10 = rows.slice(0, 10);
    mkChart('c-pressure', 'bar', {
      labels: top10.map(r => {
        const lbl = r.farmName ? `${r.fieldName ?? '—'} (${r.farmName})` : (r.fieldName ?? '—');
        return lbl.length > 28 ? lbl.slice(0, 26) + '…' : lbl;
      }),
      datasets: [{
        data: top10.map(r => parseFloat((r.avgObsPerSession ?? 0).toFixed(1))),
        backgroundColor: top10.map(r => {
          const pct = maxAvg > 0 ? (r.avgObsPerSession ?? 0) / maxAvg : 0;
          return pct >= 0.66 ? C.red : pct >= 0.33 ? C.amber : C.green;
        }),
        borderRadius: 4,
      }],
    }, {
      indexAxis: 'y',
      scales: { x: { beginAtZero: true, ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => {
              const r = top10[ctx[0].dataIndex];
              return r.farmName ? `${r.farmName} · ${r.fieldName ?? '—'}` : (r.fieldName ?? '—');
            },
          },
        },
      },
    });

    // ── Interactive field breakdown grid ──────────────────────────────────────
    let sortCol  = 'avg';
    let sortDesc = true;
    let search   = '';
    let level    = '';
    let page     = 1;
    const pageSize = 10;

    function levelOf(r) {
      const pct = maxAvg > 0 ? ((r.avgObsPerSession ?? 0) / maxAvg) * 100 : 0;
      return pct >= 66 ? 'high' : pct >= 33 ? 'medium' : 'low';
    }

    function getRows() {
      const q = search.toLowerCase();
      return rows
        .filter(r => {
          if (level && levelOf(r) !== level) return false;
          if (!q) return true;
          return (r.fieldName ?? '').toLowerCase().includes(q) ||
                 (r.farmName  ?? '').toLowerCase().includes(q);
        })
        .sort((a, b) => {
          let av, bv;
          switch (sortCol) {
            case 'field':    av = a.fieldName ?? ''; bv = b.fieldName ?? ''; break;
            case 'farm':     av = a.farmName  ?? ''; bv = b.farmName  ?? ''; break;
            case 'sessions': av = a.sessionCount     ?? 0; bv = b.sessionCount     ?? 0; break;
            case 'total':    av = a.totalObs          ?? 0; bv = b.totalObs          ?? 0; break;
            case 'avg':      av = a.avgObsPerSession  ?? 0; bv = b.avgObsPerSession  ?? 0; break;
            case 'breaches': av = a.breachCount       ?? 0; bv = b.breachCount       ?? 0; break;
            default:         av = 0; bv = 0;
          }
          if (av < bv) return sortDesc ? 1 : -1;
          if (av > bv) return sortDesc ? -1 : 1;
          return 0;
        });
    }

    const colLabels = { field: 'Field', farm: 'Farm', sessions: 'Sessions', total: 'Total Obs', avg: 'Avg / Session', breaches: 'Breaches' };

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

      const tbody = el.querySelector('#fb-tbody');
      tbody.innerHTML = slice.length
        ? slice.map(r => `<tr>
            <td style="font-weight:500;">${escapeHtml(r.fieldName ?? '—')}</td>
            <td>${escapeHtml(r.farmName ?? '—')}</td>
            <td style="font-family:'JetBrains Mono',monospace;">${r.sessionCount ?? 0}</td>
            <td style="font-family:'JetBrains Mono',monospace;">${(r.totalObs ?? 0).toLocaleString()}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${(r.avgObsPerSession ?? 0).toFixed(1)}</td>
            <td style="font-family:'JetBrains Mono',monospace;color:${(r.breachCount ?? 0) > 0 ? C.red : ''};">${r.breachCount ?? 0}</td>
            <td style="font-size:0.75rem;">${(r.topPests ?? []).map(p => escapeHtml(p.pestName)).join(', ') || '—'}</td>
          </tr>`).join('')
        : `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:16px;">No fields match your filters</td></tr>`;

      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end   = Math.min(page * pageSize, total);
      el.querySelector('#fb-pagination').innerHTML = `
        <span>${start}–${end} of ${total} fields</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="btn-outline fb-prev" style="padding:3px 10px;font-size:0.75rem;" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>
          <span>Page ${page} of ${totalPages}</span>
          <button class="btn-outline fb-next" style="padding:3px 10px;font-size:0.75rem;" ${page >= totalPages ? 'disabled' : ''}>Next ›</button>
        </div>
      `;
      el.querySelector('.fb-prev')?.addEventListener('click', () => { if (page > 1) { page--; render(); } });
      el.querySelector('.fb-next')?.addEventListener('click', () => { if (page < totalPages) { page++; render(); } });
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
    el.querySelector('#fb-search').addEventListener('input', e => {
      clearTimeout(_deb);
      _deb = setTimeout(() => { search = e.target.value.trim(); page = 1; render(); }, 250);
    });

    el.querySelector('#fb-level').addEventListener('change', e => {
      level = e.target.value;
      page  = 1;
      render();
    });

    render();
  }, 0);
}


