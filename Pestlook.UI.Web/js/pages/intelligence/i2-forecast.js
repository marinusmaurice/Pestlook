import { escapeHtml }                           from '../../utils/helpers.js';
import { C, PALETTE, kpiGrid, kpiCard,
         emptyState, loadChartJs, chartInstances } from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   I2 — Pest Population Forecast
   data = { forecasts: [ { pestId, pestName, fieldId, fieldName, farmName,
             threshold, trend, breachProbability, peakCount, projectedPeak,
             history: [{ weekStart, totalCount, fittedCount }],
             forecast: [{ weekStart, projectedCount, lower, upper }] } ] }
───────────────────────────────────────────────────────────────────────────── */

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function trendIcon(t)  { return t === 'rising' ? '↑' : t === 'falling' ? '↓' : '→'; }
function trendColor(t) { return t === 'rising' ? C.red : t === 'falling' ? C.green : C.amber; }

function bpColor(bp) {
  if (bp >= 0.6) return C.red;
  if (bp >= 0.3) return C.amber;
  return C.green;
}

function bpBar(bp) {
  const pct   = Math.round(bp * 100);
  const color = bpColor(bp);
  return `
    <div style="display:flex;align-items:center;gap:6px;">
      <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
      </div>
      <span style="font-size:0.78rem;font-weight:600;color:${color};width:32px;text-align:right;">${pct}%</span>
    </div>`;
}

/* ── Sort state ──────────────────────────────────────────────────────────── */
let _sortKey = 'breachProbability';
let _sortDir = -1; // -1 = desc, 1 = asc

function sortForecasts(rows) {
  return [...rows].sort((a, b) => {
    const av = a[_sortKey] ?? 0;
    const bv = b[_sortKey] ?? 0;
    return typeof av === 'string'
      ? _sortDir * av.localeCompare(bv)
      : _sortDir * (av - bv);
  });
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export async function renderForecast(el, data) {
  const all = data.forecasts ?? [];

  if (all.length === 0) {
    el.innerHTML = emptyState('📈',
      'No forecast data available',
      'Pest population forecasting requires at least one week of scouting observations. Try widening the date range or removing field/farm filters.');
    return;
  }

  /* ── KPIs ───────────────────────────────────────────────────────────────── */
  const pestCount  = new Set(all.map(f => f.pestId)).size;
  const fieldCount = new Set(all.map(f => f.fieldId)).size;
  const highRisk   = all.filter(f => f.breachProbability >= 0.6).length;
  const fastest    = [...all].filter(f => f.trend === 'rising')
                             .sort((a, b) => b.breachProbability - a.breachProbability)[0] ?? null;

  /* ── Pest list for in-page filter ─────────────────────────────────────── */
  const pestMap = new Map(all.map(f => [String(f.pestId), f.pestName]));
  const pestOpts = [...pestMap.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`)
    .join('');

  /* ── Shell ───────────────────────────────────────────────────────────────── */
  el.innerHTML = `
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Applies ordinary least-squares (OLS) linear regression to weekly observation totals to project pest populations up to 12 weeks ahead. Each forecast includes a 90% confidence interval and a <strong>breach probability</strong> — the share of projected weeks where the upper confidence bound crosses the configured action threshold. Combinations are ranked highest-risk first so you can act before a breach occurs.</div>
    ${kpiGrid([
      kpiCard('Pests Tracked',   pestCount,  'species with forecast data'),
      kpiCard('Fields Covered',  fieldCount, 'distinct fields with observations'),
      kpiCard('High Risk',       highRisk,
        'fields with ≥ 60 % breach probability', highRisk > 0 ? C.red : ''),
      fastest
        ? kpiCard('Fastest Rising',
            escapeHtml(fastest.pestName),
            `${escapeHtml(fastest.fieldName)} · ${Math.round(fastest.breachProbability * 100)}% breach risk`,
            C.red)
        : kpiCard('Fastest Rising', '—', 'no rising trends detected'),
    ])}

    <!-- Controls -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
      <label style="font-size:0.78rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        Pest
        <select id="fc-pest" class="input-field" style="margin-top:0;width:auto;padding:4px 8px;font-size:0.78rem;">
          <option value="">All pests</option>
          ${pestOpts}
        </select>
      </label>
      <label style="font-size:0.78rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        Show
        <select id="fc-trend" class="input-field" style="margin-top:0;width:auto;padding:4px 8px;font-size:0.78rem;">
          <option value="">All trends</option>
          <option value="rising">↑ Rising only</option>
          <option value="stable">→ Stable only</option>
          <option value="falling">↓ Falling only</option>
        </select>
      </label>
      <label style="font-size:0.78rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        Rows
        <select id="fc-pagesize" class="input-field" style="margin-top:0;width:auto;padding:4px 8px;font-size:0.78rem;">
          <option value="10">10</option>
          <option value="20" selected>20</option>
          <option value="50">50</option>
        </select>
      </label>
      <span id="fc-count" style="font-size:0.75rem;color:var(--text-dim);margin-left:4px;"></span>
    </div>

    <!-- Risk table -->
    <div class="card" style="margin-bottom:16px;overflow:hidden;">
      <div style="overflow-x:auto;max-height:420px;overflow-y:auto;">
        <table class="data-table" id="fc-table" style="font-size:0.78rem;">
          <thead style="position:sticky;top:0;z-index:1;background:var(--surface);">
            <tr>
              <th data-col="pestName"          style="cursor:pointer;white-space:nowrap;padding:7px 10px;">Pest ⇅</th>
              <th data-col="fieldName"         style="cursor:pointer;white-space:nowrap;padding:7px 10px;">Field ⇅</th>
              <th style="padding:7px 10px;">Farm</th>
              <th data-col="trend"             style="cursor:pointer;white-space:nowrap;padding:7px 10px;">Trend ⇅</th>
              <th data-col="peakCount"         style="cursor:pointer;white-space:nowrap;padding:7px 10px;">Peak ⇅</th>
              <th data-col="projectedPeak"     style="cursor:pointer;white-space:nowrap;padding:7px 10px;">Proj. ⇅</th>
              <th data-col="breachProbability" style="cursor:pointer;white-space:nowrap;padding:7px 10px;min-width:100px;">Breach ⇅</th>
              <th style="padding:7px 10px;">Threshold</th>
            </tr>
          </thead>
          <tbody id="fc-body"></tbody>
        </table>
      </div>
      <!-- Pagination bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-top:1px solid var(--border);background:var(--surface);flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span id="fc-page-info" style="font-size:0.75rem;color:var(--text-dim);"></span>
          <label style="font-size:0.75rem;color:var(--text-dim);display:flex;align-items:center;gap:4px;">
            Rows
            <select id="fc-pagesize" class="input-field" style="margin-top:0;padding:2px 6px;font-size:0.75rem;width:auto;">
              <option value="10">10</option>
              <option value="20" selected>20</option>
              <option value="50">50</option>
            </select>
          </label>
        </div>
        <div style="display:flex;gap:4px;">
          <button id="fc-prev" class="btn-outline" style="padding:4px 10px;font-size:0.75rem;">‹ Prev</button>
          <div id="fc-page-nums" style="display:flex;gap:2px;"></div>
          <button id="fc-next" class="btn-outline" style="padding:4px 10px;font-size:0.75rem;">Next ›</button>
        </div>
      </div>
    </div>

    <!-- Detail chart panel (hidden until row selected) -->
    <div id="fc-detail" class="card card-p" style="display:none;margin-bottom:16px;">
      <div id="fc-detail-title" style="font-weight:600;font-size:0.9rem;margin-bottom:14px;"></div>
      <div id="fc-legend" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px;font-size:0.78rem;color:var(--text-dim);"></div>
      <div style="height:300px;position:relative;">
        <canvas id="fc-chart"></canvas>
      </div>
      <div id="fc-detail-stats"
           style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-top:14px;"></div>
    </div>
  `;

  /* ── Table state ────────────────────────────────────────────────────────── */
  let activePestFilter  = '';
  let activeTrendFilter = '';
  let selectedKey       = '';   // `${pestId}:${fieldId}`
  let _page     = 1;
  let _pageSize = 20;

  function visibleRows() {
    return sortForecasts(all).filter(f => {
      if (activePestFilter  && String(f.pestId) !== activePestFilter)  return false;
      if (activeTrendFilter && f.trend !== activeTrendFilter)           return false;
      return true;
    });
  }

  function renderTable() {
    const rows    = visibleRows();
    const total   = rows.length;
    const pages   = Math.max(1, Math.ceil(total / _pageSize));
    _page         = Math.min(_page, pages);
    const start   = (_page - 1) * _pageSize;
    const pageRows = rows.slice(start, start + _pageSize);

    const tbody   = document.getElementById('fc-body');
    const counter = document.getElementById('fc-count');
    if (!tbody) return;

    counter.textContent = `${total} row${total !== 1 ? 's' : ''}`;

    if (total === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:24px;">No rows match the selected filters.</td></tr>`;
    } else {
      tbody.innerHTML = pageRows.map(f => {
        const key      = `${f.pestId}:${f.fieldId}`;
        const selected = key === selectedKey;
        const tColor   = trendColor(f.trend);
        const tIcon    = trendIcon(f.trend);
        return `
          <tr data-key="${escapeHtml(key)}" style="cursor:pointer;${selected ? 'background:var(--surface2,#f4f7f4);' : ''}">
            <td style="font-weight:500;font-size:0.78rem;padding:6px 10px;">${escapeHtml(f.pestName)}</td>
            <td style="font-size:0.78rem;padding:6px 10px;">${escapeHtml(f.fieldName)}</td>
            <td style="color:var(--text-dim);font-size:0.78rem;padding:6px 10px;">${escapeHtml(f.farmName ?? '—')}</td>
            <td style="padding:6px 10px;"><span style="color:${tColor};font-weight:700;">${tIcon}</span>
                <span style="color:${tColor};font-size:0.75rem;margin-left:3px;">${escapeHtml(f.trend)}</span></td>
            <td style="text-align:right;font-size:0.78rem;padding:6px 10px;">${(f.peakCount ?? 0).toLocaleString()}</td>
            <td style="text-align:right;font-weight:600;font-size:0.78rem;padding:6px 10px;color:${f.projectedPeak > f.peakCount ? C.red : 'var(--text)'};">
              ${(f.projectedPeak ?? 0).toLocaleString()}</td>
            <td style="min-width:100px;padding:6px 10px;">${bpBar(f.breachProbability)}</td>
            <td style="text-align:right;font-size:0.78rem;padding:6px 10px;color:var(--text-dim);">${f.threshold ?? '—'}</td>
          </tr>`;
      }).join('');

      // Row click → detail chart
      tbody.querySelectorAll('tr[data-key]').forEach(row => {
        row.addEventListener('click', () => {
          selectedKey = row.dataset.key;
          const forecast = all.find(f => `${f.pestId}:${f.fieldId}` === selectedKey);
          if (forecast) showDetail(forecast);
          renderTable();
        });
      });
    }

    /* ── Pagination controls ─────────────────────────────────────────────── */
    const pageInfo = document.getElementById('fc-page-info');
    const pageNums = document.getElementById('fc-page-nums');
    const prevBtn  = document.getElementById('fc-prev');
    const nextBtn  = document.getElementById('fc-next');
    if (!pageInfo || !pageNums || !prevBtn || !nextBtn) return;

    const from = total === 0 ? 0 : start + 1;
    const to   = Math.min(start + _pageSize, total);
    pageInfo.textContent = `${from}–${to} of ${total}`;

    prevBtn.disabled = _page <= 1;
    nextBtn.disabled = _page >= pages;

    // Page number buttons (show up to 5 around current page)
    const radius = 2;
    let pStart = Math.max(1, _page - radius);
    let pEnd   = Math.min(pages, _page + radius);
    if (pEnd - pStart < radius * 2) {
      if (pStart === 1) pEnd = Math.min(pages, pStart + radius * 2);
      else              pStart = Math.max(1, pEnd - radius * 2);
    }
    let nums = '';
    if (pStart > 1) nums += `<button class="btn-outline fc-pg" data-p="1" style="padding:4px 8px;font-size:0.75rem;">1</button>${pStart > 2 ? '<span style="padding:0 2px;font-size:0.75rem;color:var(--text-dim);">…</span>' : ''}`;
    for (let p = pStart; p <= pEnd; p++) {
      const active = p === _page ? 'background:var(--accent,#3b7db8);color:#fff;' : '';
      nums += `<button class="btn-outline fc-pg" data-p="${p}" style="padding:4px 8px;font-size:0.75rem;${active}">${p}</button>`;
    }
    if (pEnd < pages) nums += `${pEnd < pages - 1 ? '<span style="padding:0 2px;font-size:0.75rem;color:var(--text-dim);">…</span>' : ''}<button class="btn-outline fc-pg" data-p="${pages}" style="padding:4px 8px;font-size:0.75rem;">${pages}</button>`;
    pageNums.innerHTML = nums;

    pageNums.querySelectorAll('.fc-pg').forEach(btn => {
      btn.addEventListener('click', () => { _page = +btn.dataset.p; renderTable(); });
    });
    prevBtn.onclick = () => { if (_page > 1)    { _page--; renderTable(); } };
    nextBtn.onclick = () => { if (_page < pages) { _page++; renderTable(); } };
  }

  /* ── Column sort ─────────────────────────────────────────────────────────── */
  document.getElementById('fc-table').querySelectorAll('th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (_sortKey === col) { _sortDir *= -1; }
      else { _sortKey = col; _sortDir = col === 'pestName' || col === 'fieldName' || col === 'trend' ? 1 : -1; }
      _page = 1;
      renderTable();
    });
  });

  /* ── Pest / trend / page-size filters ───────────────────────────────────── */
  document.getElementById('fc-pest').addEventListener('change', e => {
    activePestFilter = e.target.value; _page = 1; renderTable();
  });
  document.getElementById('fc-trend').addEventListener('change', e => {
    activeTrendFilter = e.target.value; _page = 1; renderTable();
  });
  document.getElementById('fc-pagesize').addEventListener('change', e => {
    _pageSize = +e.target.value; _page = 1; renderTable();
  });

  /* ── Detail chart ─────────────────────────────────────────────────────────── */
  async function showDetail(f) {
    const panel = document.getElementById('fc-detail');
    panel.style.display = '';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    document.getElementById('fc-detail-title').textContent =
      `📈 ${f.pestName} — ${f.fieldName}${f.farmName ? ' · ' + f.farmName : ''}`;

    // Legend
    document.getElementById('fc-legend').innerHTML = `
      <span>🟦 Observed count</span>
      <span style="color:${C.dim};">— Fitted trend</span>
      <span style="color:${C.amber};">- - Forecast</span>
      ${f.threshold ? `<span style="color:${C.red};">— Threshold (${f.threshold})</span>` : ''}
    `;

    // Stat chips
    const bp     = Math.round(f.breachProbability * 100);
    const bpCol  = bpColor(f.breachProbability);
    const tColor = trendColor(f.trend);
    document.getElementById('fc-detail-stats').innerHTML = `
      <div style="border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">Trend</div>
        <div style="font-size:1.3rem;font-weight:700;color:${tColor};">${trendIcon(f.trend)}</div>
        <div style="font-size:0.78rem;color:${tColor};">${f.trend}</div>
      </div>
      <div style="border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">Breach risk</div>
        <div style="font-size:1.3rem;font-weight:700;color:${bpCol};">${bp}%</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">next ${f.forecast.length} weeks</div>
      </div>
      <div style="border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">Historical peak</div>
        <div style="font-size:1.3rem;font-weight:700;">${(f.peakCount ?? 0).toLocaleString()}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">any single week</div>
      </div>
      <div style="border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">Projected peak</div>
        <div style="font-size:1.3rem;font-weight:700;color:${f.projectedPeak > f.peakCount ? C.red : 'var(--text)'};">
          ${(f.projectedPeak ?? 0).toLocaleString()}</div>
        <div style="font-size:0.78rem;color:var(--text-dim);">next ${f.forecast.length} weeks</div>
      </div>`;

    // Build chart data
    await loadChartJs();

    const histLabels  = f.history.map(h => h.weekStart);
    const fcLabels    = f.forecast.map(p => p.weekStart);
    const allLabels   = [...histLabels, ...fcLabels];
    const histLen     = histLabels.length;

    const histCounts  = f.history.map(h => h.totalCount);
    const fittedLine  = [
      ...f.history.map(h => h.fittedCount),
      ...f.forecast.map(p => p.projectedCount),
    ];
    const upperBand   = [...Array(histLen).fill(null), ...f.forecast.map(p => p.upper)];
    const lowerBand   = [...Array(histLen).fill(null), ...f.forecast.map(p => p.lower)];
    const fcLine      = [...Array(histLen).fill(null), ...f.forecast.map(p => p.projectedCount)];
    const threshLine  = f.threshold ? allLabels.map(() => f.threshold) : null;

    // Custom plugin: vertical split line between history and forecast
    const splitPlugin = {
      id: 'splitLine',
      afterDraw(chart) {
        const xScale = chart.scales.x;
        if (!xScale) return;
        const x = xScale.getPixelForValue(histLen - 0.5);
        const ctx = chart.ctx;
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(100,100,100,0.25)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(x, chart.chartArea.top);
        ctx.lineTo(x, chart.chartArea.bottom);
        ctx.stroke();
        ctx.restore();
      },
    };

    const datasets = [
      // Upper CI band — fills down to lower band
      {
        label:           'Upper CI',
        data:            upperBand,
        borderColor:     'transparent',
        backgroundColor: 'rgba(229,165,47,0.13)',
        fill:            '+1',
        pointRadius:     0,
        tension:         0.3,
        order:           4,
      },
      // Lower CI band
      {
        label:           'Lower CI',
        data:            lowerBand,
        borderColor:     'transparent',
        backgroundColor: 'transparent',
        fill:            false,
        pointRadius:     0,
        tension:         0.3,
        order:           5,
      },
      // Historical bars
      {
        type:            'bar',
        label:           'Observed',
        data:            [...histCounts, ...Array(fcLabels.length).fill(null)],
        backgroundColor: 'rgba(59,125,184,0.45)',
        borderColor:     C.blue,
        borderWidth:     1,
        borderRadius:    3,
        order:           3,
      },
      // OLS fitted + forecast line (continuous)
      {
        label:           'Trend / Forecast',
        data:            fittedLine,
        borderColor:     C.dim,
        backgroundColor: 'transparent',
        borderWidth:     1.5,
        borderDash:      [],
        pointRadius:     0,
        tension:         0.3,
        fill:            false,
        order:           2,
      },
      // Dashed forecast overlay (makes the forecast segment visually distinct)
      {
        label:           'Forecast',
        data:            fcLine,
        borderColor:     C.amber,
        backgroundColor: 'transparent',
        borderWidth:     2,
        borderDash:      [6, 4],
        pointRadius:     3,
        pointBackgroundColor: C.amber,
        tension:         0.3,
        fill:            false,
        order:           1,
      },
      // Threshold horizontal line
      ...(threshLine ? [{
        label:           'Threshold',
        data:            threshLine,
        borderColor:     C.red,
        backgroundColor: 'transparent',
        borderWidth:     1.5,
        borderDash:      [4, 3],
        pointRadius:     0,
        fill:            false,
        order:           0,
      }] : []),
    ];

    // Destroy any previous instance before creating a new one
    try { chartInstances['fc-chart']?.destroy(); } catch { /* ignore */ }
    delete chartInstances['fc-chart'];

    const canvas = document.getElementById('fc-chart');
    if (canvas && window.Chart) {
      // Root-level `plugins` array is the correct way to register an inline
      // plugin in Chart.js 4.  options.plugins is for configuring built-in
      // plugins (legend, tooltip, etc.) — not for custom plugin objects.
      chartInstances['fc-chart'] = new window.Chart(canvas, {
        type:    'line',
        plugins: [splitPlugin],
        data:    { labels: allLabels, datasets },
        options: {
          responsive:          true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend:  { display: false },
            tooltip: {
              callbacks: { title: ctx => `Week of ${ctx[0].label}` },
              filter: item => item.dataset.label !== 'Upper CI'
                           && item.dataset.label !== 'Lower CI',
            },
          },
          scales: {
            x: { ticks: { maxRotation: 45, font: { size: 10 } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { font: { size: 10 } } },
          },
        },
      });
    }
  }

  // Initial table render
  renderTable();

  // Auto-select the top row so the chart shows immediately
  if (all.length > 0) {
    const top = sortForecasts(all)[0];
    selectedKey = `${top.pestId}:${top.fieldId}`;
    await showDetail(top);
    renderTable(); // re-render to highlight selected row
  }
}
