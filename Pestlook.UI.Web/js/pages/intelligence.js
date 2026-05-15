import { getFarms }  from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/helpers.js';
import { emptyState } from './reports/utils.js';

import { getSpreadDirection, getSpreadVelocity,
         getOriginDetection, getNeighbourRisk,
         getCrossFarmCorrelation }                    from '../api/intelligence.js';
import { renderSpreadDirection }      from './intelligence/i1-spread.js';
import { renderSpreadVelocity }       from './intelligence/i5b-velocity.js';
import { renderOriginDetection }      from './intelligence/i3-origin.js';
import { renderNeighbourRisk }        from './intelligence/i4-neighbour.js';
import { renderCrossFarmCorrelation } from './intelligence/i5-crossfarm.js';

/* ── Tab registry ──────────────────────────────────────────────────────────── */

const SECTIONS = [
  {
    id:    'spread',
    group: '🧭 Spread & Movement',
    label: '🧭 Pest Spread Direction',
    desc:  'Map the direction and velocity of pest spread across your fields using GPS observation data.',
  },
  {
    id:    'origin',
    group: '🧭 Spread & Movement',
    label: '🔍 Origin Detection',
    desc:  'Trace each pest outbreak back to its origin field and visualise the chronological spread chain.',
  },
  {
    id:    'neighbour',
    group: '🧭 Spread & Movement',
    label: '🏘 Neighbour Risk',
    desc:  'Flag all fields adjacent to a threshold breach as elevated-risk and highlight unscouted neighbours.',
  },
  {
    id:    'crossfarm',
    group: '🧭 Spread & Movement',
    label: '🌍 Cross-Farm Outbreak',
    desc:  'Identify weeks where the same pest spiked simultaneously across multiple farms — regional outbreak vs isolated incident.',
  },
  {
    id:    'velocity',
    group: '🧭 Spread & Movement',
    label: '📡 Spread Velocity',
    desc:  'Score how fast each pest is spreading field-to-field. A score of 0 means contained; a rising score signals active spread.',
  },
  // Future spread & movement tabs will be added here
];

/* ── State shared across renders ───────────────────────────────────────────── */

const iFilters = {
  from:     '',
  to:       '',
  farmId:   '',
  fieldId:  '',
  pestId:   '',
  radiusKm: 5,
  minFarms: 2,
};

/* ── Entry point ─────────────────────────────────────────────────────────────── */

export async function renderIntelligence(container) {
  let alive = true;
  let tabController = null;
  container._cleanup = () => { alive = false; tabController?.abort(); };

  // Default to last 180 days
  const today   = new Date();
  const sixMoAgo = new Date(today);
  sixMoAgo.setDate(sixMoAgo.getDate() - 180);
  const fmt = d => d.toISOString().slice(0, 10);

  iFilters.from    = fmt(sixMoAgo);
  iFilters.to      = fmt(today);
  iFilters.farmId  = '';
  iFilters.fieldId = '';
  iFilters.pestId  = '';

  // ── Shell HTML ────────────────────────────────────────────────────────────
  container.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;height:100%;';

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;flex-shrink:0;">
      <div>
        <div class="page-heading">🧭 Spread & Movement Intelligence</div>
        <div class="page-desc">Track how pest populations move, where outbreaks originate, and which fields are at risk</div>
      </div>
    </div>

    <!-- Tab bar -->
    <div style="overflow-x:auto;margin-bottom:14px;padding-bottom:4px;flex-shrink:0;">
      <div style="display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;width:fit-content;">
        ${SECTIONS.map((s, i) => `
          <button class="tab-btn${i === 0 ? ' active' : ''}" data-itab="${s.id}" style="white-space:nowrap;">${s.label}</button>
        `).join('')}
      </div>
    </div>

    <!-- Shared filters -->
    <div id="int-filters" style="margin-bottom:16px;flex-shrink:0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;">
      <span style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-right:4px;">Filter</span>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        From <input type="date" id="int-from" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        To   <input type="date" id="int-to"   class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <select id="int-farm"  class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;"><option value="">All Farms</option></select>
      <select id="int-field" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;"><option value="">All Fields</option></select>
      <button id="int-clear" class="btn-outline" style="padding:6px 12px;font-size:0.8rem;">✕ Clear</button>
    </div>

    <!-- Tab body -->
    <div id="int-body" style="flex:1;overflow-y:auto;min-height:0;">
      <div class="card card-p"><div class="skeleton skeleton-card" style="height:320px;"></div></div>
    </div>
  `;

  // ── Load farm/field lookups ───────────────────────────────────────────────
  let farms  = [];
  let fields = [];

  try {
    const [farmsRes, fieldsRes] = await Promise.all([
      getFarms().catch(() => ({ data: [] })),
      getFields().catch(() => ({ data: [] })),
    ]);
    if (!alive) return;
    farms  = farmsRes.data  ?? [];
    fields = fieldsRes.data ?? [];
  } catch { /* non-fatal */ }

  // Populate farm dropdown
  const farmSel = document.getElementById('int-farm');
  for (const f of farms) {
    const opt = document.createElement('option');
    opt.value       = f.id;
    opt.textContent = f.name;
    farmSel.appendChild(opt);
  }

  function populateFields(farmId) {
    const fieldSel = document.getElementById('int-field');
    if (!fieldSel) return;
    fieldSel.innerHTML = '<option value="">All Fields</option>';
    iFilters.fieldId = '';
    const list = farmId ? fields.filter(f => String(f.farmId) === farmId) : fields;
    for (const f of list) {
      const opt = document.createElement('option');
      opt.value       = f.id;
      opt.textContent = f.name;
      fieldSel.appendChild(opt);
    }
  }

  // Initialise date inputs
  document.getElementById('int-from').value = iFilters.from;
  document.getElementById('int-to').value   = iFilters.to;

  // ── Filter event handlers ─────────────────────────────────────────────────
  function rerender() { showActiveTab(); }

  document.getElementById('int-from').addEventListener('change', e => { if (e.target.value) { iFilters.from = e.target.value; rerender(); } });
  document.getElementById('int-to').addEventListener('change',   e => { if (e.target.value) { iFilters.to   = e.target.value; rerender(); } });
  farmSel.addEventListener('change', e => { iFilters.farmId = e.target.value; populateFields(e.target.value); rerender(); });
  document.getElementById('int-field').addEventListener('change', e => { iFilters.fieldId = e.target.value; rerender(); });
  document.getElementById('int-clear').addEventListener('click', () => {
    iFilters.from    = fmt(sixMoAgo);
    iFilters.to      = fmt(today);
    iFilters.farmId  = '';
    iFilters.fieldId = '';
    iFilters.pestId  = '';
    document.getElementById('int-from').value = iFilters.from;
    document.getElementById('int-to').value   = iFilters.to;
    farmSel.value = '';
    populateFields('');
    rerender();
  });

  // ── Tab switching ─────────────────────────────────────────────────────────
  container.querySelectorAll('[data-itab]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-itab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showActiveTab();
    });
  });

  // ── Initial render ────────────────────────────────────────────────────────
  showActiveTab();

  /* ── Tab dispatcher ──────────────────────────────────────────────────────── */
  async function showActiveTab() {
    // Cancel any in-flight request from a previous tab switch or filter change
    tabController?.abort();
    tabController = new AbortController();
    const { signal } = tabController;

    const activeId = container.querySelector('[data-itab].active')?.dataset?.itab ?? SECTIONS[0].id;
    const body     = document.getElementById('int-body');
    if (!body || !alive) return;

    body.innerHTML = `<div class="card card-p"><div class="skeleton skeleton-card" style="height:320px;"></div></div>`;

    try {
      if (activeId === 'spread') {
        const res  = await getSpreadDirection({ ...iFilters }, signal);
        if (!alive || signal.aborted) return;
        const data = res?.data ?? {};
        body.innerHTML = '';
        await renderSpreadDirection(body, data, (pestId) => {
          iFilters.pestId = pestId ?? '';
          showActiveTab();
        });

      } else if (activeId === 'origin') {
        const res  = await getOriginDetection({ ...iFilters }, signal);
        if (!alive || signal.aborted) return;
        const data = res?.data ?? { origins: [] };
        body.innerHTML = '';
        await renderOriginDetection(body, data);

      } else if (activeId === 'neighbour') {
        const res  = await getNeighbourRisk({ ...iFilters }, iFilters.radiusKm, signal);
        if (!alive || signal.aborted) return;
        const data = res?.data ?? { alerts: [], summary: {} };
        body.innerHTML = '';
        await renderNeighbourRisk(body, data, (newRadius) => {
          iFilters.radiusKm = newRadius;
          showActiveTab();
        });

      } else if (activeId === 'crossfarm') {
        const res  = await getCrossFarmCorrelation({ ...iFilters }, iFilters.minFarms, signal);
        if (!alive || signal.aborted) return;
        const data = res?.data ?? { outbreaks: [], summary: {} };
        body.innerHTML = '';
        await renderCrossFarmCorrelation(body, data, (newMin) => {
          iFilters.minFarms = newMin;
          showActiveTab();
        });

      } else if (activeId === 'velocity') {
        const res  = await getSpreadVelocity({ ...iFilters }, signal);
        if (!alive || signal.aborted) return;
        const data = res?.data ?? { pests: [], summary: {} };
        body.innerHTML = '';
        await renderSpreadVelocity(body, data);
      }
      // Additional tab handlers will go here as features are built
    } catch (err) {
      if (err.name === 'AbortError' || !alive || signal.aborted) return;
      showToast('Intelligence load failed: ' + err.message, 'error');
      body.innerHTML = emptyState('⚠', 'Could not load intelligence data', escapeHtml(err.message));
    }
  }
}
