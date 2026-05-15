import {
  getOverview, getAlerts, getPestPressure, getSessionsSummary, getTopPests,
  getTrapPerformance, getScoutProductivity, getSeasonalTrends,
  getUnknownPests, getFieldCoverage, getBillingAnalytics,
} from '../api/analytics.js';
import { getTraps }  from '../api/traps.js';
import { getFarms }  from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/helpers.js';

import {
  loadChartJs, destroyCharts, filters, emptyState,
} from './reports/utils.js';

import { renderOverview }          from './reports/r0-overview.js';
import { renderThresholdAlerts }   from './reports/r1-alerts.js';
import { renderPestPressure }      from './reports/r2-pressure.js';
import { renderScoutingSessions }  from './reports/r3-sessions.js';
import { renderTopPests }          from './reports/r4-pests.js';
import { renderTrapPerformance }   from './reports/r5-traps.js';
import { renderScoutProductivity } from './reports/r6-scouts.js';
import { renderSeasonalTrends }    from './reports/r7-seasonal.js';
import { renderUnknownPests }      from './reports/r8-unknown.js';
import { renderFieldCoverage }     from './reports/r9-coverage.js';
import { renderBilling }           from './reports/r10-billing.js';

/* -- Tabs ----------------------------------------------------------------------- */

const TABS = [
  { id: 'dash', label: '📊 Overview' },
  { id: 'r1',   label: '🚨 Threshold Alerts' },
  { id: 'r2',   label: '🌿 Pest Pressure' },
  { id: 'r3',   label: '📋 Sessions' },
  { id: 'r4',   label: '🐛 Top Pests' },
  { id: 'r5',   label: '🕸️ Trap Performance' },
  { id: 'r6',   label: '👤 Scout Productivity' },
  { id: 'r7',   label: '📅 Seasonal Trends' },
  { id: 'r8',   label: '❓ Unknown Pests' },
  { id: 'r9',   label: '🗺 Field Coverage' },
  { id: 'r10',  label: '💳 Billing & Quota' },
];

const TAB_FETCHER = {
  dash: f => getOverview(f),
  r1:   f => getAlerts(f),
  r2:   f => getPestPressure(f),
  r3:   f => getSessionsSummary(f),
  r4:   f => getTopPests(f),
  r5:   f => getTrapPerformance(f),
  r6:   f => getScoutProductivity(f),
  r7:   f => getSeasonalTrends(f),
  r8:   f => getUnknownPests(f),
  r9:   f => getFieldCoverage(f),
  r10:  ()  => getBillingAnalytics(),
};

const TAB_RENDERER = {
  dash: renderOverview,
  r1:   renderThresholdAlerts,
  r2:   renderPestPressure,
  r3:   renderScoutingSessions,
  r4:   renderTopPests,
  r5:   renderTrapPerformance,
  r6:   renderScoutProductivity,
  r7:   renderSeasonalTrends,
  r8:   renderUnknownPests,
  r9:   renderFieldCoverage,
  r10:  renderBilling,
};

/* -- Entry point --------------------------------------------------------------- */

export async function renderReports(container) {

  let alive = true;
  const prevCssText = container.style.cssText;
  container._cleanup = () => { alive = false; container.style.cssText = prevCssText; };
  container.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;height:100%;';

  const _today    = new Date();
  const _90dAgo   = new Date(_today);
  _90dAgo.setDate(_90dAgo.getDate() - 90);
  const _fmt = d => d.toISOString().slice(0, 10);

  filters.from    = _fmt(_90dAgo);
  filters.to      = _fmt(_today);
  filters.farmId  = '';
  filters.fieldId = '';
  filters.scoutId = '';

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;flex-shrink:0;">
      <div>
        <div class="page-heading">Analytics</div>
        <div class="page-desc">Insights across your farms, traps, sessions and scouts</div>
      </div>
    </div>
    <div style="overflow-x:auto;margin-bottom:14px;padding-bottom:4px;flex-shrink:0;">
      <div style="display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;width:fit-content;">
        ${TABS.map(t => `<button class="tab-btn${t.id === 'dash' ? ' active' : ''}" data-tab="${t.id}" style="white-space:nowrap;">${t.label}</button>`).join('')}
      </div>
    </div>
    <div id="rpt-filters" style="margin-bottom:16px;flex-shrink:0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;">
      <span style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-right:4px;">Filter</span>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        From
        <input type="date" id="rpt-from" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        To
        <input type="date" id="rpt-to" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <select id="rpt-farm" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;">
        <option value="">All Farms</option>
      </select>
      <select id="rpt-field" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;">
        <option value="">All Fields</option>
      </select>
      <select id="rpt-scout" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;">
        <option value="">All Scouts</option>
      </select>
      <button id="rpt-clear" class="btn-outline" style="padding:6px 12px;font-size:0.8rem;">✕ Clear</button>
    </div>
    <div id="rpt-body" style="flex:1;min-height:0;overflow-y:auto;padding-right:2px;">
      <div class="card card-p"><div class="skeleton skeleton-card" style="height:300px;"></div></div>
    </div>
  `;

  try {
    await loadChartJs().catch(err => console.warn('Chart.js unavailable — charts disabled:', err.message));

    const [trapsRes, farmsRes, fieldsRes] = await Promise.all([
      getTraps().catch(() => ({ data: [] })),
      getFarms().catch(() => ({ data: [] })),
      getFields().catch(() => ({ data: [] })),
    ]);

    if (!alive) return;

    const lookups = {
      traps:  trapsRes.data  || [],
      farms:  farmsRes.data  || [],
      fields: fieldsRes.data || [],
    };
    lookups.farmNameById = Object.fromEntries(lookups.farms.map(f => [f.id, f.name]));

    // Populate farm dropdown
    const farmSel = document.getElementById('rpt-farm');
    for (const f of lookups.farms) {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      farmSel.appendChild(opt);
    }

    function populateFields(farmId) {
      const fieldSel = document.getElementById('rpt-field');
      fieldSel.innerHTML = '<option value="">All Fields</option>';
      filters.fieldId = '';
      const list = farmId ? lookups.fields.filter(f => String(f.farmId) === farmId) : lookups.fields;
      for (const f of list) {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        fieldSel.appendChild(opt);
      }
    }

    // Scout dropdown is populated after the first overview fetch completes,
    // avoiding an unnecessary GetScoutProductivity call on every page load.

    function rerender() {
      destroyCharts();
      const activeTab = container.querySelector('[data-tab].active')?.dataset?.tab || 'dash';
      document.getElementById('rpt-body')?.scrollTo(0, 0);
      showTab(activeTab, lookups, container);
    }

    document.getElementById('rpt-from').value = filters.from;
    document.getElementById('rpt-to').value   = filters.to;

    document.getElementById('rpt-from').addEventListener('change', e => { if (e.target.value) { filters.from = e.target.value; rerender(); } });
    document.getElementById('rpt-to').addEventListener('change',   e => { if (e.target.value) { filters.to   = e.target.value; rerender(); } });
    farmSel.addEventListener('change', e => { filters.farmId = e.target.value; populateFields(e.target.value); rerender(); });
    document.getElementById('rpt-field').addEventListener('change', e => { filters.fieldId = e.target.value; rerender(); });
    document.getElementById('rpt-scout').addEventListener('change', e => { filters.scoutId = e.target.value; rerender(); });
    document.getElementById('rpt-clear').addEventListener('click', () => {
      const _t  = new Date();
      const _f  = new Date(_t);
      _f.setDate(_f.getDate() - 90);
      const _fmt2 = d => d.toISOString().slice(0, 10);
      filters.from = _fmt2(_f); filters.to = _fmt2(_t);
      filters.farmId = ''; filters.fieldId = ''; filters.scoutId = '';
      document.getElementById('rpt-from').value = filters.from;
      document.getElementById('rpt-to').value   = filters.to;
      farmSel.value = '';
      document.getElementById('rpt-scout').value = '';
      populateFields('');
      rerender();
    });

    showTab('dash', lookups, container);

    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        destroyCharts();
        container.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('rpt-body')?.scrollTo(0, 0);
        showTab(btn.dataset.tab, lookups, container);
      });
    });

  } catch (err) {
    if (!alive) return;
    showToast('Failed to load report data: ' + err.message, 'error');
    const body = document.getElementById('rpt-body');
    if (body) body.innerHTML = emptyState('⚠', 'Could not load reports', escapeHtml(err.message));
  }
}

/* -- Tab dispatcher ------------------------------------------------------------ */

async function showTab(id, lookups, container) {
  const body = document.getElementById('rpt-body');
  if (!body) return;

  body.innerHTML = `<div class="card card-p"><div class="skeleton skeleton-card" style="height:300px;"></div></div>`;

  const fetcher  = TAB_FETCHER[id];
  const renderer = TAB_RENDERER[id];
  if (!fetcher || !renderer) return;

  try {
    const res  = await fetcher({ ...filters });
    const data = res?.data ?? {};
    renderer(body, data, lookups);

    // Populate scout dropdown from productivity data the first time that tab loads —
    // avoids firing a separate request just to fill the filter on page load.
    if (id === 'r6' && data.scouts?.length) {
      const sel = document.getElementById('rpt-scout');
      if (sel && sel.options.length <= 1) {
        for (const s of data.scouts) {
          const opt = document.createElement('option');
          opt.value = s.scouterName;
          opt.textContent = s.scouterName;
          sel.appendChild(opt);
        }
      }
    }
  } catch (err) {
    body.innerHTML = emptyState('⚠', 'Could not load tab', escapeHtml(err.message));
  }
}
