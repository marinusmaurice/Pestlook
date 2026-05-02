import { getSessions } from '../api/sessions.js';
import { getTraps } from '../api/traps.js';
import { getPests } from '../api/pests.js';
import { getFarms } from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { getBillingSnapshots } from '../api/billing.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/helpers.js';

import {
  loadChartJs, destroyCharts, applyFilters, filters, emptyState,
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

/* ── Tabs ─────────────────────────────────────────────────────────────────────── */

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

/* ── Entry point ─────────────────────────────────────────────────────────────── */

export async function renderReports(container) {

  filters.dateRange = '90';
  filters.farmId    = '';
  filters.fieldId   = '';
  filters.scoutId   = '';

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;">
      <div>
        <div class="page-heading">Analytics</div>
        <div class="page-desc">Insights across your farms, traps, sessions and scouts</div>
      </div>
    </div>
    <div style="overflow-x:auto;margin-bottom:14px;padding-bottom:4px;">
      <div style="display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;width:fit-content;">
        ${TABS.map(t => `<button class="tab-btn${t.id === 'dash' ? ' active' : ''}" data-tab="${t.id}" style="white-space:nowrap;">${t.label}</button>`).join('')}
      </div>
    </div>
    <div id="rpt-filters" style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;">
      <span style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-right:4px;">Filter</span>
      <select id="rpt-date" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;">
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90" selected>Last 90 days</option>
        <option value="365">Last 12 months</option>
        <option value="all">All time</option>
      </select>
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
    <div id="rpt-body">
      <div class="card card-p"><div class="skeleton skeleton-card" style="height:300px;"></div></div>
    </div>
  `;

  try {
    await loadChartJs().catch(err => console.warn('Chart.js unavailable — charts disabled:', err.message));

    const [sessRes, trapsRes, pestsRes, farmsRes, fieldsRes, billRes] = await Promise.all([
      getSessions().catch(() => ({ data: [] })),
      getTraps().catch(() => ({ data: [] })),
      getPests().catch(() => ({ data: [] })),
      getFarms().catch(() => ({ data: [] })),
      getFields().catch(() => ({ data: [] })),
      getBillingSnapshots().catch(() => ({ data: [] })),
    ]);

    const rawData = {
      sessions: sessRes.data   || [],
      traps:    trapsRes.data  || [],
      pests:    pestsRes.data  || [],
      farms:    farmsRes.data  || [],
      fields:   fieldsRes.data || [],
      billing:  billRes.data   || [],
    };
    rawData.farmNameById = Object.fromEntries(rawData.farms.map(f => [f.id, f.name]));

    // Populate farm dropdown
    const farmSel = document.getElementById('rpt-farm');
    for (const f of rawData.farms) {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      farmSel.appendChild(opt);
    }

    // Populate scout dropdown
    const scoutSel = document.getElementById('rpt-scout');
    const scoutNames = [...new Set(
      rawData.sessions.map(s => s.scouterName || s.scouterId).filter(Boolean)
    )].sort();
    for (const name of scoutNames) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      scoutSel.appendChild(opt);
    }

    function populateFields(farmId) {
      const fieldSel = document.getElementById('rpt-field');
      fieldSel.innerHTML = '<option value="">All Fields</option>';
      filters.fieldId = '';
      const list = farmId ? rawData.fields.filter(f => String(f.farmId) === farmId) : rawData.fields;
      for (const f of list) {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        fieldSel.appendChild(opt);
      }
    }

    function rerender() {
      destroyCharts();
      const activeTab = container.querySelector('[data-tab].active')?.dataset?.tab || 'dash';
      showTab(activeTab, rawData, container);
    }

    document.getElementById('rpt-date').addEventListener('change', e => { filters.dateRange = e.target.value; rerender(); });
    farmSel.addEventListener('change', e => { filters.farmId = e.target.value; populateFields(e.target.value); rerender(); });
    document.getElementById('rpt-field').addEventListener('change', e => { filters.fieldId = e.target.value; rerender(); });
    scoutSel.addEventListener('change', e => { filters.scoutId = e.target.value; rerender(); });
    document.getElementById('rpt-clear').addEventListener('click', () => {
      filters.dateRange = '90'; filters.farmId = ''; filters.fieldId = ''; filters.scoutId = '';
      document.getElementById('rpt-date').value = '90';
      farmSel.value = '';
      scoutSel.value = '';
      populateFields('');
      rerender();
    });

    showTab('dash', rawData, container);

    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        destroyCharts();
        container.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showTab(btn.dataset.tab, rawData, container);
      });
    });

  } catch (err) {
    showToast('Failed to load report data: ' + err.message, 'error');
    document.getElementById('rpt-body').innerHTML =
      emptyState('⚠', 'Could not load reports', escapeHtml(err.message));
  }
}

/* ── Tab dispatcher ──────────────────────────────────────────────────────────── */

function showTab(id, rawData, container) {
  const body = document.getElementById('rpt-body');
  if (!body) return;
  const data = applyFilters(rawData);
  const map = {
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
  (map[id] || (() => {}))(body, data, rawData);
}
