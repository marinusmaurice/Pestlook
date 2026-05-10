import { getFarms }  from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/helpers.js';
import { emptyState } from './reports/utils.js';

import {
  getContainmentZones,
  getQuarantineFlags,
  getEntryPointAnalysis,
  getResistancePatterns,
} from '../api/intelligence.js';

import { renderContainmentZones }   from './intelligence/ic1-zones.js';
import { renderQuarantineFlags }    from './intelligence/ic2-quarantine.js';
import { renderEntryPointAnalysis } from './intelligence/ic3-entry.js';
import { renderResistancePatterns } from './intelligence/ic4-resistance.js';

/* ── Tab registry ──────────────────────────────────────────────────────────── */

const SECTIONS = [
  {
    id:    'zones',
    label: '🛡 Containment Zones',
    desc:  'Identifies farms that lie directly in the path of a spreading pest and recommends a containment perimeter to intensively scout and treat.',
  },
  {
    id:    'quarantine',
    label: '🔬 Quarantine Flags',
    desc:  'Detects pest species recorded on a field or tenant for the first time — potential new introductions that may warrant reporting to agricultural authorities.',
  },
  {
    id:    'entry',
    label: '🔍 Entry Point Analysis',
    desc:  'Traces each pest outbreak back to its origin field and assesses whether the source farm is on the perimeter or within the cluster — suggesting the likely vector of introduction.',
  },
  {
    id:    'resistance',
    label: '🧬 Resistance Patterns',
    desc:  'Flags field × pest combinations where threshold breaches have persisted across multiple years without improvement — a signal of possible resistance to current control methods.',
  },
];

/* ── Shared filter state ───────────────────────────────────────────────────── */

const cFilters = { from: '', to: '', farmId: '', fieldId: '', pestId: '' };

/* ── Entry point ───────────────────────────────────────────────────────────── */

export async function renderContainment(container) {
  let alive = true;
  container._cleanup = () => { alive = false; };

  const today     = new Date();
  const twoYrAgo  = new Date(today);
  twoYrAgo.setFullYear(twoYrAgo.getFullYear() - 2);
  const fmt = d => d.toISOString().slice(0, 10);

  cFilters.from    = fmt(twoYrAgo);
  cFilters.to      = fmt(today);
  cFilters.farmId  = '';
  cFilters.fieldId = '';
  cFilters.pestId  = '';

  // ── Shell ─────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;">
      <div>
        <div class="page-heading">🛡 Containment Intelligence</div>
        <div class="page-desc">Containment zones, quarantine flags, entry point analysis, and resistance pattern detection</div>
      </div>
    </div>

    <!-- Tab bar -->
    <div style="overflow-x:auto;margin-bottom:14px;padding-bottom:4px;">
      <div style="display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;width:fit-content;">
        ${SECTIONS.map((s, i) => `
          <button class="tab-btn${i === 0 ? ' active' : ''}" data-ctab="${s.id}" style="white-space:nowrap;">${s.label}</button>
        `).join('')}
      </div>
    </div>

    <!-- Shared filters -->
    <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;">
      <span style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-right:4px;">Filter</span>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        From <input type="date" id="cf-from" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        To   <input type="date" id="cf-to"   class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <select id="cf-farm"  class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;"><option value="">All Farms</option></select>
      <select id="cf-field" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;"><option value="">All Fields</option></select>
      <button id="cf-clear" class="btn-outline" style="padding:6px 12px;font-size:0.8rem;">✕ Clear</button>
    </div>

    <!-- Tab body -->
    <div id="cf-body">
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

  const farmSel = document.getElementById('cf-farm');
  for (const f of farms) {
    const opt = document.createElement('option');
    opt.value = f.id; opt.textContent = f.name;
    farmSel.appendChild(opt);
  }

  function populateFields(farmId) {
    const sel = document.getElementById('cf-field');
    if (!sel) return;
    sel.innerHTML = '<option value="">All Fields</option>';
    cFilters.fieldId = '';
    const list = farmId ? fields.filter(f => String(f.farmId) === farmId) : fields;
    for (const f of list) {
      const opt = document.createElement('option');
      opt.value = f.id; opt.textContent = f.name;
      sel.appendChild(opt);
    }
  }

  document.getElementById('cf-from').value = cFilters.from;
  document.getElementById('cf-to').value   = cFilters.to;

  // ── Filter events ─────────────────────────────────────────────────────────
  const rerender = () => showActiveTab();

  document.getElementById('cf-from').addEventListener('change', e => { if (e.target.value) { cFilters.from    = e.target.value; rerender(); } });
  document.getElementById('cf-to').addEventListener('change',   e => { if (e.target.value) { cFilters.to      = e.target.value; rerender(); } });
  farmSel.addEventListener('change',                            e => { cFilters.farmId  = e.target.value; populateFields(e.target.value); rerender(); });
  document.getElementById('cf-field').addEventListener('change',e => { cFilters.fieldId = e.target.value; rerender(); });
  document.getElementById('cf-clear').addEventListener('click', () => {
    cFilters.from = fmt(twoYrAgo); cFilters.to = fmt(today);
    cFilters.farmId = ''; cFilters.fieldId = ''; cFilters.pestId = '';
    document.getElementById('cf-from').value = cFilters.from;
    document.getElementById('cf-to').value   = cFilters.to;
    farmSel.value = '';
    populateFields('');
    rerender();
  });

  // ── Tab switching ─────────────────────────────────────────────────────────
  container.querySelectorAll('[data-ctab]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-ctab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showActiveTab();
    });
  });

  // ── Initial render ────────────────────────────────────────────────────────
  showActiveTab();

  /* ── Tab dispatcher ────────────────────────────────────────────────────── */
  async function showActiveTab() {
    const activeId = container.querySelector('[data-ctab].active')?.dataset?.ctab ?? SECTIONS[0].id;
    const body     = document.getElementById('cf-body');
    if (!body || !alive) return;

    body.innerHTML = `<div class="card card-p"><div class="skeleton skeleton-card" style="height:320px;"></div></div>`;

    try {
      if (activeId === 'zones') {
        const res = await getContainmentZones({ ...cFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderContainmentZones(body, res?.data ?? {});

      } else if (activeId === 'quarantine') {
        const res = await getQuarantineFlags({ ...cFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderQuarantineFlags(body, res?.data ?? {});

      } else if (activeId === 'entry') {
        const res = await getEntryPointAnalysis({ ...cFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderEntryPointAnalysis(body, res?.data ?? {});

      } else if (activeId === 'resistance') {
        const res = await getResistancePatterns({ ...cFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderResistancePatterns(body, res?.data ?? {});
      }

    } catch (err) {
      if (!alive) return;
      showToast('Load failed: ' + err.message, 'error');
      body.innerHTML = emptyState('⚠', 'Could not load data', escapeHtml(err.message));
    }
  }
}
