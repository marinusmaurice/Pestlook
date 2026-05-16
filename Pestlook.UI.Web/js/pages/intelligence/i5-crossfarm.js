import { escapeHtml }                                from '../../utils/helpers.js';
import { C, kpiGrid, kpiCard, emptyState,
         loadChartJs, chartInstances }               from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   I5 — Cross-Farm Outbreak Correlation
   data = {
     outbreaks: [ {
       pestId, pestName, peakWeek, farmCount, totalCount, isRegional,
       weeks: [ { weekStart, farmCount, totalCount,
                  farms: [ { farmId, farmName, weekCount, isAboveThreshold } ] } ],
       farmTimeline: [ { farmId, farmName,
                         series: [ { weekStart, count, isSpike } ] } ]
     } ],
     summary: { totalOutbreakPests, regionalOutbreaks, peakFarmCount, peakPestName }
   }
───────────────────────────────────────────────────────────────────────────── */

const PALETTE = [
  '#6366f1','#f59e0b','#10b981','#f87171','#3b82f6',
  '#a78bfa','#34d399','#fbbf24','#60a5fa','#f472b6',
];

function fmtWeek(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function regionalBadge(isRegional, farmCount) {
  if (isRegional) {
    return `<span style="background:${C.red}22;color:${C.red};border:1px solid ${C.red}55;
      border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">
      🌍 Regional — ${farmCount} farms</span>`;
  }
  return `<span style="background:${C.amber}22;color:${C.amber};border:1px solid ${C.amber}55;
    border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:700;">
    🏠 Local — ${farmCount} farm${farmCount !== 1 ? 's' : ''}</span>`;
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export async function renderCrossFarmCorrelation(container, data, onMinFarmsChange) {
  const summary   = data.summary   ?? { totalOutbreakPests: 0, regionalOutbreaks: 0, peakFarmCount: 0, peakPestName: null };
  const outbreaks = data.outbreaks ?? [];

  if (!outbreaks.length) {
    container.innerHTML = emptyState('✅', 'No cross-farm outbreaks detected',
      'No pest species spiked simultaneously across two or more farms in the selected period. ' +
      'Try widening the date range or reducing the minimum-farms threshold.');
    return;
  }

  // Collect pests for selector
  const pests = outbreaks.map(o => ({ id: o.pestId, name: o.pestName }));
  let activePestId = pests[0]?.id ?? null;

  // ── KPI row ──────────────────────────────────────────────────────────────
  container.innerHTML = '<div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Detects weeks where the same pest spiked simultaneously across <strong>two or more farms</strong> — a signal of a regional outbreak rather than an isolated farm-level incident. A spike is defined as a week exceeding both the configured action threshold and 1.5× that farm\'s own median weekly count, so detection adapts to each farm\'s normal activity level.</div>' + kpiGrid([
    kpiCard('Outbreak Pests',     summary.totalOutbreakPests,  'species with multi-farm spikes', summary.totalOutbreakPests > 0 ? C.red   : '',
      'Number of pest species that produced simultaneous spikes across two or more farms in any single week of the selected period.'),
    kpiCard('Regional Outbreaks', summary.regionalOutbreaks,   '2+ farms same week',             summary.regionalOutbreaks  > 0 ? C.red   : '',
      'Weeks where a single pest was found spiking on two or more farms at the same time — a pattern indicative of a landscape-level outbreak rather than a localised farm incident.'),
    kpiCard('Peak Farm Count',    summary.peakFarmCount,       summary.peakPestName ?? '',       summary.peakFarmCount > 2      ? C.red   : C.amber,
      'The highest number of farms that recorded a simultaneous spike for a single pest in any one week — the peak width of the worst outbreak detected.'),
    kpiCard('Min Farms Threshold','configurable below',        'adjust to raise/lower sensitivity','',
      'Minimum number of farms that must spike in the same week for the event to be classified as a regional outbreak. Increase this value to filter out smaller co-occurrences.'),
  ]) + `

  <!-- Controls -->
  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <label style="font-size:0.8rem;color:var(--text-dim);font-weight:600;">🏠 Min Farms</label>
      <select id="cf-minfarms" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;">
        ${[2,3,4,5].map(n => `<option value="${n}"${n === 2 ? ' selected' : ''}>${n}+ farms</option>`).join('')}
      </select>
    </div>
    ${pests.length > 1 ? `
    <div style="display:flex;align-items:center;gap:8px;">
      <label style="font-size:0.8rem;color:var(--text-dim);font-weight:600;">🐛 Pest</label>
      <select id="cf-pest" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;">
        ${pests.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
      </select>
    </div>` : ''}
  </div>

  <!-- Outbreak summary cards -->
  <div id="cf-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-bottom:16px;"></div>

  <!-- Detail panel -->
  <div id="cf-detail"></div>`;

  // ── Min-farms change → re-fetch ───────────────────────────────────────────
  document.getElementById('cf-minfarms')?.addEventListener('change', e => {
    if (typeof onMinFarmsChange === 'function') onMinFarmsChange(Number(e.target.value));
  });

  // ── Pest selector ─────────────────────────────────────────────────────────
  document.getElementById('cf-pest')?.addEventListener('change', e => {
    activePestId = e.target.value;
    renderDetail(activePestId);
    highlightCard(activePestId);
  });

  // ── Outbreak summary cards ────────────────────────────────────────────────
  const cardsEl = document.getElementById('cf-cards');
  if (cardsEl) {
    cardsEl.innerHTML = outbreaks.map(o => `
      <div class="card card-p" data-pest="${o.pestId}" style="cursor:pointer;border:2px solid transparent;transition:border-color 0.15s;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
          <div style="font-size:0.92rem;font-weight:700;color:var(--text);">${escapeHtml(o.pestName)}</div>
          ${regionalBadge(o.isRegional, o.farmCount)}
        </div>
        <div style="font-size:0.78rem;color:var(--text-dim);">
          Peak week: <strong>${fmtWeek(o.peakWeek)}</strong><br>
          ${o.weeks.length} outbreak week${o.weeks.length !== 1 ? 's' : ''} · ${o.totalCount.toLocaleString()} observations
        </div>
      </div>`).join('');

    // Attach click listeners directly to card elements — no document-level
    // listener, so there is no accumulation across filter-change re-renders.
    cardsEl.querySelectorAll('[data-pest]').forEach(card => {
      card.addEventListener('click', () => {
        activePestId = card.dataset.pest;
        const pestSel = document.getElementById('cf-pest');
        if (pestSel) pestSel.value = activePestId;
        renderDetail(activePestId);
        highlightCard(activePestId);
      });
    });
  }

  function highlightCard(pestId) {
    document.querySelectorAll('#cf-cards [data-pest]').forEach(el => {
      el.style.borderColor = el.dataset.pest === pestId ? C.blue ?? '#3b82f6' : 'transparent';
    });
  }

  await loadChartJs();
  renderDetail(activePestId);
  highlightCard(activePestId);

  /* ── Detail renderer ─────────────────────────────────────────────────────── */
  function renderDetail(pestId) {
    const detail = document.getElementById('cf-detail');
    if (!detail) return;

    const outbreak = outbreaks.find(o => o.pestId === pestId);
    if (!outbreak) { detail.innerHTML = ''; return; }

    const farmTimeline = outbreak.farmTimeline ?? [];
    const weeks        = outbreak.weeks        ?? [];
    const chartId      = 'cf-chart';

    // Destroy previous chart if any
    if (chartInstances[chartId]) { chartInstances[chartId].destroy(); delete chartInstances[chartId]; }

    // Collect all week labels across all farms
    const allWeekLabels = [...new Set(
      farmTimeline.flatMap(f => f.series.map(s => s.weekStart))
    )].sort();

    detail.innerHTML = `
    <div class="card card-p" style="margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
        <div style="font-size:1rem;font-weight:700;color:var(--text);">${escapeHtml(outbreak.pestName)} — Weekly Farm Counts</div>
        ${regionalBadge(outbreak.isRegional, outbreak.farmCount)}
      </div>
      <div style="position:relative;height:260px;">
        <canvas id="${chartId}"></canvas>
      </div>
      <div style="font-size:0.72rem;color:var(--text-dim);margin-top:8px;">
        Shaded columns indicate weeks where ${outbreak.farmCount >= 2 ? outbreak.farmCount : '2'}+ farms spiked simultaneously.
        A spike is defined as a count exceeding 1.5× the farm's own median for this pest.
      </div>
    </div>

    <!-- Outbreak weeks table -->
    <div class="card card-p" style="margin-bottom:14px;">
      <div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:10px;">
        Simultaneous Spike Weeks <span style="font-weight:400;color:var(--text-dim);">(${weeks.length} week${weeks.length !== 1 ? 's' : ''})</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>Week of</th><th>Farms Spiking</th><th>Combined Count</th><th>Farms</th></tr></thead>
          <tbody>
            ${weeks.map(w => `
            <tr>
              <td>${fmtWeek(w.weekStart)}</td>
              <td><strong style="color:${w.farmCount >= 3 ? C.red : C.amber};">${w.farmCount}</strong></td>
              <td>${w.totalCount.toLocaleString()}</td>
              <td style="font-size:0.78rem;">${w.farms.map(f =>
                `${escapeHtml(f.farmName)}${f.isAboveThreshold ? ' <span style="color:' + C.red + '">⚠</span>' : ''}`
              ).join(', ')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

    // ── Chart.js multi-line chart ─────────────────────────────────────────
    if (!window.Chart || !allWeekLabels.length) return;

    const canvas = document.getElementById(chartId);
    if (!canvas) return;

    // Spike-week background plugin
    const spikeWeeks = new Set(weeks.map(w => w.weekStart));
    const spikeBgPlugin = {
      id: 'spikeBg',
      beforeDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;
        ctx.save();
        for (const label of allWeekLabels) {
          if (!spikeWeeks.has(label)) continue;
          const x = scales.x.getPixelForValue(label);
          const bw = scales.x.width / allWeekLabels.length;
          ctx.fillStyle = 'rgba(239,68,68,0.08)';
          ctx.fillRect(x - bw / 2, chartArea.top, bw, chartArea.bottom - chartArea.top);
        }
        ctx.restore();
      },
    };

    const datasets = farmTimeline.map((f, i) => ({
      label:       f.farmName,
      data:        allWeekLabels.map(wk => {
        const pt = f.series.find(s => s.weekStart === wk);
        return pt ? pt.count : null;
      }),
      borderColor:     PALETTE[i % PALETTE.length],
      backgroundColor: PALETTE[i % PALETTE.length] + '33',
      borderWidth:     2,
      pointRadius:     3,
      pointHoverRadius: 5,
      tension:         0.3,
      spanGaps:        true,
      fill:            false,
    }));

    const chart = new window.Chart(canvas, {
      type:    'line',
      plugins: [spikeBgPlugin],
      data: {
        labels:   allWeekLabels.map(fmtWeek),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              title: items => 'Week of ' + items[0].label,
              footer: items => {
                const total = items.reduce((s, i) => s + (i.raw ?? 0), 0);
                const wkRaw = allWeekLabels[items[0].dataIndex];
                const isSpike = spikeWeeks.has(wkRaw);
                return [
                  `Total: ${total.toLocaleString()}`,
                  isSpike ? '⚠ Regional spike week' : '',
                ].filter(Boolean).join('\n');
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { maxRotation: 45, font: { size: 10 } },
            grid:  { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { font: { size: 10 } },
            title: { display: true, text: 'Observation count', font: { size: 10 } },
          },
        },
      },
    });
    chartInstances[chartId] = chart;
  }
}
