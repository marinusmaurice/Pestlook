import { getFarms }  from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/helpers.js';
import { emptyState } from './reports/utils.js';

import {
  getTemperatureActivity,
  getRainfallLag,
  getDroughtStress,
} from '../api/intelligence.js';

import { renderTemperatureActivity } from './intelligence/ie1-temp.js';
import { renderRainfallLag }         from './intelligence/ie2-rainfall.js';
import { renderDroughtStress }       from './intelligence/ie3-drought.js';

/* ── Tab registry ──────────────────────────────────────────────────────────── */

const SECTIONS = [
  {
    id:    'temp-activity',
    label: '🌡 Temperature Activity',
    desc:  'Per-pest temperature sensitivity coefficients: Pearson correlation, slope (counts per °C), and a heat map of average count per temperature band.',
  },
  {
    id:    'rainfall',
    label: '🌧 Rainfall Lag Effect',
    desc:  'Detects whether pest populations spike 7–21 days after a significant wet event, approximated as a sharp temperature drop below the rolling 4-week average.',
  },
  {
    id:    'drought',
    label: '☀ Drought Stress',
    desc:  'Correlates hot/dry periods (average session temperature exceeding the long-term mean by ≥ 2°C) with elevated pest threshold breach rates.',
  },
];

/* ── Shared filter state ───────────────────────────────────────────────────── */

const eFilters = { from: '', to: '', farmId: '', fieldId: '', pestId: '' };

/* ── Entry point ───────────────────────────────────────────────────────────── */

export async function renderEnvironmental(container) {
  let alive = true;
  container._cleanup = () => { alive = false; };

  const today    = new Date();
  const sixMoAgo = new Date(today);
  sixMoAgo.setDate(sixMoAgo.getDate() - 180);
  const fmt = d => d.toISOString().slice(0, 10);

  eFilters.from    = fmt(sixMoAgo);
  eFilters.to      = fmt(today);
  eFilters.farmId  = '';
  eFilters.fieldId = '';
  eFilters.pestId  = '';

  // ── Shell ─────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;">
      <div>
        <div class="page-heading">🌡 Environmental Correlation Intelligence</div>
        <div class="page-desc">Temperature activity, rainfall lag effect, and drought stress correlation across pest species</div>
      </div>
    </div>

    <!-- Tab bar -->
    <div style="overflow-x:auto;margin-bottom:14px;padding-bottom:4px;">
      <div style="display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;width:fit-content;">
        ${SECTIONS.map((s, i) => `
          <button class="tab-btn${i === 0 ? ' active' : ''}" data-etab="${s.id}" style="white-space:nowrap;">${s.label}</button>
        `).join('')}
      </div>
    </div>

    <!-- Shared filters -->
    <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;">
      <span style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-right:4px;">Filter</span>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        From <input type="date" id="ef-from" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        To   <input type="date" id="ef-to"   class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <select id="ef-farm"  class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;"><option value="">All Farms</option></select>
      <select id="ef-field" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;"><option value="">All Fields</option></select>
      <button id="ef-clear" class="btn-outline" style="padding:6px 12px;font-size:0.8rem;">✕ Clear</button>
    </div>

    <!-- Tab body -->
    <div id="ef-body">
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

  const farmSel = document.getElementById('ef-farm');
  for (const f of farms) {
    const opt = document.createElement('option');
    opt.value = f.id; opt.textContent = f.name;
    farmSel.appendChild(opt);
  }

  function populateFields(farmId) {
    const sel = document.getElementById('ef-field');
    if (!sel) return;
    sel.innerHTML = '<option value="">All Fields</option>';
    eFilters.fieldId = '';
    const list = farmId ? fields.filter(f => String(f.farmId) === farmId) : fields;
    for (const f of list) {
      const opt = document.createElement('option');
      opt.value = f.id; opt.textContent = f.name;
      sel.appendChild(opt);
    }
  }

  document.getElementById('ef-from').value = eFilters.from;
  document.getElementById('ef-to').value   = eFilters.to;

  // ── Filter events ─────────────────────────────────────────────────────────
  const rerender = () => showActiveTab();

  document.getElementById('ef-from').addEventListener('change', e => { if (e.target.value) { eFilters.from    = e.target.value; rerender(); } });
  document.getElementById('ef-to').addEventListener('change',   e => { if (e.target.value) { eFilters.to      = e.target.value; rerender(); } });
  farmSel.addEventListener('change',                            e => { eFilters.farmId  = e.target.value; populateFields(e.target.value); rerender(); });
  document.getElementById('ef-field').addEventListener('change',e => { eFilters.fieldId = e.target.value; rerender(); });
  document.getElementById('ef-clear').addEventListener('click', () => {
    eFilters.from = fmt(sixMoAgo); eFilters.to = fmt(today);
    eFilters.farmId = ''; eFilters.fieldId = ''; eFilters.pestId = '';
    document.getElementById('ef-from').value = eFilters.from;
    document.getElementById('ef-to').value   = eFilters.to;
    farmSel.value = '';
    populateFields('');
    rerender();
  });

  // ── Tab switching ─────────────────────────────────────────────────────────
  container.querySelectorAll('[data-etab]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-etab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showActiveTab();
    });
  });

  // ── Initial render ────────────────────────────────────────────────────────
  showActiveTab();

  /* ── Tab dispatcher ────────────────────────────────────────────────────── */
  async function showActiveTab() {
    const activeId = container.querySelector('[data-etab].active')?.dataset?.etab ?? SECTIONS[0].id;
    const body     = document.getElementById('ef-body');
    if (!body || !alive) return;

    body.innerHTML = `<div class="card card-p"><div class="skeleton skeleton-card" style="height:320px;"></div></div>`;

    try {
      if (activeId === 'temp-activity') {
        const res = await getTemperatureActivity({ ...eFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderTemperatureActivity(body, res?.data ?? {});

      } else if (activeId === 'rainfall') {
        const res = await getRainfallLag({ ...eFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderRainfallLag(body, res?.data ?? {});

      } else if (activeId === 'drought') {
        const res = await getDroughtStress({ ...eFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderDroughtStress(body, res?.data ?? {});
      }

    } catch (err) {
      if (!alive) return;
      showToast('Load failed: ' + err.message, 'error');
      body.innerHTML = emptyState('⚠', 'Could not load data', escapeHtml(err.message));
    }
  }
}
