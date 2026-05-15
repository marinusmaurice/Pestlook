import { getFarms }  from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/helpers.js';
import { emptyState } from './reports/utils.js';

import {
  getPopulationForecast,
  getBreachProbability,
  getNextScoutingDate,
  getSeasonalPressure,
  getWeatherRisk,
  getTrapSaturation,
} from '../api/intelligence.js';

import { renderForecast }          from './intelligence/i2-forecast.js';
import { renderBreachProbability } from './intelligence/i6-breach.js';
import { renderNextScouting }      from './intelligence/i7-scouting.js';
import { renderSeasonalPressure }  from './intelligence/i8-seasonal.js';
import { renderWeatherRisk }       from './intelligence/i9-weather.js';
import { renderTrapSaturation }    from './intelligence/i10-saturation.js';

/* ── Tab registry ──────────────────────────────────────────────────────────── */

const SECTIONS = [
  {
    id:    'forecast',
    label: '📈 Population Forecast',
    desc:  'Linear-regression forecast of pest counts per field for the next 4 weeks, with breach probability and trend analysis.',
  },
  {
    id:    'breach',
    label: '⚠️ Breach Probability',
    desc:  'For each field + pest combination, the statistical probability of a threshold breach in the next scouting session.',
  },
  {
    id:    'scouting',
    label: '📅 Next Scouting Date',
    desc:  'Recommended next visit date per field + pest based on population growth rate — rapid growth shortens the interval.',
  },
  {
    id:    'seasonal',
    label: '🗓 Seasonal Pressure',
    desc:  'Using 18-month history, forecast which pest species are likely to peak in the coming 4–6 weeks.',
  },
  {
    id:    'weather',
    label: '🌡 Weather Risk Index',
    desc:  'Correlates session temperature with observed pest counts to produce a temperature-driven risk index per pest.',
  },
  {
    id:    'saturation',
    label: '🪤 Trap Saturation',
    desc:  'Predict when each trap will reach peak capacity based on current catch-rate trends.',
  },
];

/* ── Shared filter state ───────────────────────────────────────────────────── */

const pFilters = { from: '', to: '', farmId: '', fieldId: '', pestId: '' };

/* ── Entry point ───────────────────────────────────────────────────────────── */

export async function renderPredictive(container) {
  let alive = true;
  container._cleanup = () => { alive = false; };
  container.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;height:100%;';

  const today    = new Date();
  const sixMoAgo = new Date(today);
  sixMoAgo.setDate(sixMoAgo.getDate() - 180);
  const fmt = d => d.toISOString().slice(0, 10);

  pFilters.from    = fmt(sixMoAgo);
  pFilters.to      = fmt(today);
  pFilters.farmId  = '';
  pFilters.fieldId = '';
  pFilters.pestId  = '';

  // ── Shell ─────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;flex-shrink:0;">
      <div>
        <div class="page-heading">📈 Predictive Intelligence</div>
        <div class="page-desc">Forecasts, risk scores and scheduling recommendations derived from your historical observation data</div>
      </div>
    </div>

    <!-- Tab bar -->
    <div style="overflow-x:auto;margin-bottom:14px;padding-bottom:4px;flex-shrink:0;">
      <div style="display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;width:fit-content;">
        ${SECTIONS.map((s, i) => `
          <button class="tab-btn${i === 0 ? ' active' : ''}" data-ptab="${s.id}" style="white-space:nowrap;">${s.label}</button>
        `).join('')}
      </div>
    </div>

    <!-- Shared filters -->
    <div style="margin-bottom:16px;flex-shrink:0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;">
      <span style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-right:4px;">Filter</span>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        From <input type="date" id="pf-from" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        To   <input type="date" id="pf-to"   class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <select id="pf-farm"  class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;"><option value="">All Farms</option></select>
      <select id="pf-field" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;"><option value="">All Fields</option></select>
      <button id="pf-clear" class="btn-outline" style="padding:6px 12px;font-size:0.8rem;">✕ Clear</button>
    </div>

    <!-- Tab body -->
    <div id="pf-body" style="flex:1;overflow-y:auto;min-height:0;">
      <div class="card card-p"><div class="skeleton skeleton-card" style="height:320px;"></div></div>
    </div>
  `;

  // ── Farm / field lookups ──────────────────────────────────────────────────
  let farms = [], fields = [];
  try {
    const [fr, fir] = await Promise.all([
      getFarms().catch(() => ({ data: [] })),
      getFields().catch(() => ({ data: [] })),
    ]);
    if (!alive) return;
    farms  = fr.data  ?? [];
    fields = fir.data ?? [];
  } catch { /* non-fatal */ }

  const farmSel = document.getElementById('pf-farm');
  for (const f of farms) {
    const opt = document.createElement('option');
    opt.value = f.id; opt.textContent = f.name;
    farmSel.appendChild(opt);
  }

  function populateFields(farmId) {
    const sel = document.getElementById('pf-field');
    if (!sel) return;
    sel.innerHTML = '<option value="">All Fields</option>';
    pFilters.fieldId = '';
    const list = farmId ? fields.filter(f => String(f.farmId) === farmId) : fields;
    for (const f of list) {
      const opt = document.createElement('option');
      opt.value = f.id; opt.textContent = f.name;
      sel.appendChild(opt);
    }
  }

  document.getElementById('pf-from').value = pFilters.from;
  document.getElementById('pf-to').value   = pFilters.to;

  // ── Filter events ─────────────────────────────────────────────────────────
  const rerender = () => showActiveTab();

  document.getElementById('pf-from').addEventListener('change', e => { if (e.target.value) { pFilters.from    = e.target.value; rerender(); } });
  document.getElementById('pf-to').addEventListener('change',   e => { if (e.target.value) { pFilters.to      = e.target.value; rerender(); } });
  farmSel.addEventListener('change',                            e => { pFilters.farmId  = e.target.value; populateFields(e.target.value); rerender(); });
  document.getElementById('pf-field').addEventListener('change',e => { pFilters.fieldId = e.target.value; rerender(); });
  document.getElementById('pf-clear').addEventListener('click', () => {
    pFilters.from = fmt(sixMoAgo); pFilters.to = fmt(today);
    pFilters.farmId = ''; pFilters.fieldId = ''; pFilters.pestId = '';
    document.getElementById('pf-from').value = pFilters.from;
    document.getElementById('pf-to').value   = pFilters.to;
    farmSel.value = '';
    populateFields('');
    rerender();
  });

  // ── Tab switching ─────────────────────────────────────────────────────────
  container.querySelectorAll('[data-ptab]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-ptab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showActiveTab();
    });
  });

  // ── Initial render ────────────────────────────────────────────────────────
  showActiveTab();

  /* ── Tab dispatcher ────────────────────────────────────────────────────── */
  async function showActiveTab() {
    const activeId = container.querySelector('[data-ptab].active')?.dataset?.ptab ?? SECTIONS[0].id;
    const body     = document.getElementById('pf-body');
    if (!body || !alive) return;

    body.innerHTML = `<div class="card card-p"><div class="skeleton skeleton-card" style="height:320px;"></div></div>`;

    try {
      if (activeId === 'forecast') {
        const res  = await getPopulationForecast({ ...pFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderForecast(body, res?.data ?? { forecasts: [] });

      } else if (activeId === 'breach') {
        const res  = await getBreachProbability({ ...pFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderBreachProbability(body, res?.data ?? {});

      } else if (activeId === 'scouting') {
        const res  = await getNextScoutingDate({ ...pFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderNextScouting(body, res?.data ?? {});

      } else if (activeId === 'seasonal') {
        const res  = await getSeasonalPressure({ ...pFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderSeasonalPressure(body, res?.data ?? {});

      } else if (activeId === 'weather') {
        const res  = await getWeatherRisk({ ...pFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderWeatherRisk(body, res?.data ?? {});

      } else if (activeId === 'saturation') {
        const res  = await getTrapSaturation({ ...pFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderTrapSaturation(body, res?.data ?? {});
      }

    } catch (err) {
      if (!alive) return;
      showToast('Load failed: ' + err.message, 'error');
      body.innerHTML = emptyState('⚠', 'Could not load data', escapeHtml(err.message));
    }
  }
}
