import { getFarms }  from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, toLocalDateString } from '../utils/helpers.js';
import { emptyState } from './reports/utils.js';

import {
  getSprayTiming,
  getScoutPriority,
  getTreatmentEffectiveness,
  getOverdueAlerts,
  getUnderscoutedZones,
} from '../api/intelligence.js';

import { renderSprayTiming }            from './intelligence/ia1-spray.js';
import { renderScoutPriority }          from './intelligence/ia2-priority.js';
import { renderTreatmentEffectiveness } from './intelligence/ia3-effectiveness.js';
import { renderOverdueAlerts }          from './intelligence/ia4-overdue.js';
import { renderUnderscoutedZones }      from './intelligence/ia5-underscouted.js';

/* ── Tab registry ──────────────────────────────────────────────────────────── */

const SECTIONS = [
  {
    id:    'spray',
    label: '💉 Spray Timing',
    desc:  'Based on population trajectory and action threshold, recommends the ideal treatment window before the infestation becomes critical.',
  },
  {
    id:    'priority',
    label: '📋 Scout Priority',
    desc:  'Ranks all fields by combined risk score — population trend, days since last visit, threshold breaches, and seasonal pressure.',
  },
  {
    id:    'effectiveness',
    label: '📊 Treatment Effectiveness',
    desc:  'Scores past treatments as Effective / Partially Effective / Ineffective by comparing observation counts before and after each threshold breach.',
  },
  {
    id:    'overdue',
    label: '⏰ Overdue Alerts',
    desc:  'Fields with a threshold breach that have not received a follow-up scouting session within the required response window.',
  },
  {
    id:    'underscouted',
    label: '🔍 Blind Spots',
    desc:  'Cross-references fields with low coverage against high-season pest pressure to reveal intelligence blind spots.',
  },
];

/* ── Shared filter state ───────────────────────────────────────────────────── */

const aFilters = { from: '', to: '', farmId: '', fieldId: '' };

/* ── Entry point ───────────────────────────────────────────────────────────── */

export async function renderActionable(container) {
  let alive = true;
  const prevCssText = container.style.cssText;
  container._cleanup = () => { alive = false; container.style.cssText = prevCssText; };
  container.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;height:100%;';

  const today    = new Date();
  const sixMoAgo = new Date(today);
  sixMoAgo.setDate(sixMoAgo.getDate() - 180);
  const fmt = d => toLocalDateString(d);

  aFilters.from    = fmt(sixMoAgo);
  aFilters.to      = fmt(today);
  aFilters.farmId  = '';
  aFilters.fieldId = '';

  // ── Shell ─────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;flex-shrink:0;">
      <div>
        <div class="page-heading">🎯 Actionable Recommendations</div>
        <div class="page-desc">Spray timing, scout prioritisation, treatment effectiveness, overdue alerts, and coverage blind spots</div>
      </div>
    </div>

    <!-- Tab bar -->
    <div style="overflow-x:auto;margin-bottom:14px;padding-bottom:4px;flex-shrink:0;">
      <div style="display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;width:fit-content;">
        ${SECTIONS.map((s, i) => `
          <button class="tab-btn${i === 0 ? ' active' : ''}" data-atab="${s.id}" style="white-space:nowrap;">${s.label}</button>
        `).join('')}
      </div>
    </div>

    <!-- Shared filters -->
    <div style="margin-bottom:16px;flex-shrink:0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;">
      <span style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-right:4px;">Filter</span>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        From <input type="date" id="af-from" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <label style="font-size:0.8rem;color:var(--text-dim);display:flex;align-items:center;gap:6px;">
        To   <input type="date" id="af-to"   class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;" />
      </label>
      <select id="af-farm"  class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;"><option value="">All Farms</option></select>
      <select id="af-field" class="input-field" style="margin-top:0;width:auto;padding:6px 10px;font-size:0.8rem;"><option value="">All Fields</option></select>
      <button id="af-clear" class="btn-outline" style="padding:6px 12px;font-size:0.8rem;">✕ Clear</button>
    </div>

    <!-- Tab body -->
    <div id="af-body" style="flex:1;min-height:0;overflow-y:auto;">
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

  const farmSel = document.getElementById('af-farm');
  for (const f of farms) {
    const opt = document.createElement('option');
    opt.value = f.id; opt.textContent = f.name;
    farmSel.appendChild(opt);
  }

  function populateFields(farmId) {
    const sel = document.getElementById('af-field');
    if (!sel) return;
    sel.innerHTML = '<option value="">All Fields</option>';
    aFilters.fieldId = '';
    const list = farmId ? fields.filter(f => String(f.farmId) === farmId) : fields;
    for (const f of list) {
      const opt = document.createElement('option');
      opt.value = f.id; opt.textContent = f.name;
      sel.appendChild(opt);
    }
  }

  document.getElementById('af-from').value = aFilters.from;
  document.getElementById('af-to').value   = aFilters.to;

  // ── Filter events ─────────────────────────────────────────────────────────
  const rerender = () => showActiveTab();

  document.getElementById('af-from').addEventListener('change', e => { if (e.target.value) { aFilters.from    = e.target.value; rerender(); } });
  document.getElementById('af-to').addEventListener('change',   e => { if (e.target.value) { aFilters.to      = e.target.value; rerender(); } });
  farmSel.addEventListener('change',                            e => { aFilters.farmId  = e.target.value; populateFields(e.target.value); rerender(); });
  document.getElementById('af-field').addEventListener('change',e => { aFilters.fieldId = e.target.value; rerender(); });
  document.getElementById('af-clear').addEventListener('click', () => {
    aFilters.from = fmt(sixMoAgo); aFilters.to = fmt(today);
    aFilters.farmId = ''; aFilters.fieldId = '';
    document.getElementById('af-from').value = aFilters.from;
    document.getElementById('af-to').value   = aFilters.to;
    farmSel.value = '';
    populateFields('');
    rerender();
  });

  // ── Tab switching ─────────────────────────────────────────────────────────
  container.querySelectorAll('[data-atab]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-atab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showActiveTab();
    });
  });

  // ── Initial render ────────────────────────────────────────────────────────
  showActiveTab();

  /* ── Tab dispatcher ────────────────────────────────────────────────────── */
  async function showActiveTab() {
    const activeId = container.querySelector('[data-atab].active')?.dataset?.atab ?? SECTIONS[0].id;
    const body     = document.getElementById('af-body');
    if (!body || !alive) return;

    body.innerHTML = `<div class="card card-p"><div class="skeleton skeleton-card" style="height:320px;"></div></div>`;

    try {
      if (activeId === 'spray') {
        const res = await getSprayTiming({ ...aFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderSprayTiming(body, res?.data ?? {});

      } else if (activeId === 'priority') {
        const res = await getScoutPriority({ ...aFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderScoutPriority(body, res?.data ?? {});

      } else if (activeId === 'effectiveness') {
        const res = await getTreatmentEffectiveness({ ...aFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderTreatmentEffectiveness(body, res?.data ?? {});

      } else if (activeId === 'overdue') {
        const res = await getOverdueAlerts({ ...aFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderOverdueAlerts(body, res?.data ?? {});

      } else if (activeId === 'underscouted') {
        const res = await getUnderscoutedZones({ ...aFilters });
        if (!alive) return;
        body.innerHTML = '';
        await renderUnderscoutedZones(body, res?.data ?? {});
      }

    } catch (err) {
      if (!alive) return;
      showToast('Load failed: ' + err.message, 'error');
      body.innerHTML = emptyState('⚠', 'Could not load data', escapeHtml(err.message));
    }
  }
}
