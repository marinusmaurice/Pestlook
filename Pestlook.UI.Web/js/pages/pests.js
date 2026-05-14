import { getPests, createPest, updatePest, deletePest } from '../api/pests.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { PestCategory, PestCategoryValues, CaptureMode, CaptureModeValues, escapeHtml } from '../utils/helpers.js';

const categoryColors = {
  0: 'red',    // Insect
  1: 'amber',  // Disease
  2: 'green',  // Weed
  3: 'blue',   // Rodent
  4: 'gray',   // Other
};

const categoryEmojis = {
  0: '🦟', 1: '🦠', 2: '🌿', 3: '🐀', 4: '❓',
};

const captureModeColors = { 0: 'amber', 1: 'blue' };

// ── Grid state ────────────────────────────────────────────────────────────────

const state = {
  search:   '',
  category: '',
  sortBy:   'name',
  sortDesc: false,
};

let _allPests   = [];
let _container  = null;

// ── Entry point ───────────────────────────────────────────────────────────────

export async function renderPests(container) {
  _container = container;

  // Reset state on every visit so filters don't persist across navigation
  state.search   = '';
  state.category = '';
  state.sortBy   = 'name';
  state.sortDesc = false;

  const prevCssText = container.style.cssText;
  container._cleanup = () => { container.style.cssText = prevCssText; };
  container.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;height:100%;';

  const categoryOptions = Object.entries(PestCategoryValues)
    .map(([name, val]) => `<option value="${val}">${name}</option>`)
    .join('');

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;flex-shrink:0;">
      <div>
        <div class="page-heading">Pest Catalogue</div>
        <div class="page-desc">Species reference for your tenant</div>
      </div>
      <button class="btn-primary" id="addPestBtn">＋ Add Pest</button>
    </div>
    <div class="card" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border);">
        <input type="text" id="pestSearch" class="input-field"
          placeholder="Search name or scientific name…"
          style="margin:0;flex:1;min-width:160px;max-width:280px;padding:6px 10px;font-size:0.8rem;" />
        <select id="pestCategory" class="input-field" style="margin:0;padding:6px 10px;font-size:0.8rem;width:auto;">
          <option value="">All categories</option>
          ${categoryOptions}
        </select>
      </div>
      <div id="pestsTable" style="overflow-x:auto;overflow-y:auto;flex:1;min-height:0;">
        <div class="card-p"><div class="skeleton skeleton-card" style="height:300px;"></div></div>
      </div>
      <div id="pestCount" style="padding:10px 14px;border-top:1px solid var(--border);font-size:0.8rem;color:var(--text-dim);flex-shrink:0;"></div>
    </div>
  `;

  document.getElementById('addPestBtn').addEventListener('click', () => openCreatePestModal());

  let _debounce;
  document.getElementById('pestSearch').addEventListener('input', e => {
    clearTimeout(_debounce);
    _debounce = setTimeout(() => { state.search = e.target.value.trim(); renderTable(); }, 250);
  });

  document.getElementById('pestCategory').addEventListener('change', e => {
    state.category = e.target.value;
    renderTable();
  });

  await loadPests();
}

// ── Data fetch ────────────────────────────────────────────────────────────────

async function loadPests() {
  const tableEl = document.getElementById('pestsTable');
  if (!tableEl) return;
  tableEl.innerHTML = `<div class="card-p"><div class="skeleton skeleton-card" style="height:200px;"></div></div>`;
  try {
    const res = await getPests();
    _allPests = res.data || [];
    renderTable();
  } catch (err) {
    tableEl.innerHTML = `<div class="card-p empty-state"><div class="empty-icon">⚠</div><h3>Error</h3><p>${escapeHtml(err.message)}</p></div>`;
    showToast('Failed to load pests: ' + err.message, 'error');
  }
}

// ── Table renderer ────────────────────────────────────────────────────────────

function thBtn(label, key) {
  const active = state.sortBy === key;
  const arrow  = active ? (state.sortDesc ? ' ▼' : ' ▲') : '';
  return `<th style="cursor:pointer;user-select:none;white-space:nowrap;" data-sort="${key}">${label}${arrow}</th>`;
}

function renderTable() {
  const tableEl = document.getElementById('pestsTable');
  const countEl = document.getElementById('pestCount');
  if (!tableEl) return;

  // Filter
  let pests = _allPests.filter(p => {
    if (state.category !== '') {
      const catVal = typeof p.category === 'string' ? (PestCategoryValues[p.category] ?? p.category) : p.category;
      if (String(catVal) !== state.category) return false;
    }
    if (state.search) {
      const q = state.search.toLowerCase();
      if (!(p.commonName || '').toLowerCase().includes(q) &&
          !(p.scientificName || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Sort
  pests = pests.slice().sort((a, b) => {
    let av, bv;
    if (state.sortBy === 'name')       { av = (a.commonName || '').toLowerCase(); bv = (b.commonName || '').toLowerCase(); }
    else if (state.sortBy === 'sci')   { av = (a.scientificName || '').toLowerCase(); bv = (b.scientificName || '').toLowerCase(); }
    else if (state.sortBy === 'cat')   { av = a.category; bv = b.category; }
    else if (state.sortBy === 'cap')   { av = a.defaultCaptureMode; bv = b.defaultCaptureMode; }
    else if (state.sortBy === 'thresh'){ av = a.thresholdCount ?? -1; bv = b.thresholdCount ?? -1; }
    else if (state.sortBy === 'type')  { av = a.isSystemPest ? 1 : 0; bv = b.isSystemPest ? 1 : 0; }
    else { av = 0; bv = 0; }
    if (av < bv) return state.sortDesc ? 1 : -1;
    if (av > bv) return state.sortDesc ? -1 : 1;
    return 0;
  });

  if (pests.length === 0) {
    tableEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🦗</div><h3>No pests found</h3><p>${_allPests.length === 0 ? 'Add your first pest species to get started' : 'Try adjusting your search or filter'}</p></div>`;
    if (countEl) countEl.textContent = '';
    return;
  }

  let rows = '';
  for (const p of pests) {
    const catVal  = typeof p.category === 'string' ? (PestCategoryValues[p.category] ?? p.category) : p.category;
    const capVal  = typeof p.defaultCaptureMode === 'string' ? (CaptureModeValues[p.defaultCaptureMode] ?? p.defaultCaptureMode) : p.defaultCaptureMode;
    const catColor = categoryColors[catVal] || 'gray';
    const emoji    = categoryEmojis[catVal] || '❓';
    const catName  = PestCategory[catVal] || p.category || 'Unknown';
    const capName  = CaptureMode[capVal]  || p.defaultCaptureMode || 'Count';
    const capColor = captureModeColors[capVal] || 'gray';
    const isSystem = p.isSystemPest;

    const threshold = p.thresholdCount != null && capVal !== CaptureModeValues.Presence
      ? p.thresholdCount
      : '<span style="color:var(--text-dim);">—</span>';

    const actions = !isSystem ? `
      <button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;" data-edit-pest="${p.id}">Edit</button>
      <button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;color:var(--red);border-color:var(--red);" data-delete-pest="${p.id}">Delete</button>
    ` : '';

    rows += `
      <tr>
        <td>
          <span style="font-size:1.2rem;margin-right:8px;">${emoji}</span>
          <span style="font-weight:600;color:var(--text);">${escapeHtml(p.commonName)}</span>
        </td>
        <td style="font-size:0.8rem;color:var(--text-dim);font-style:italic;">${escapeHtml(p.scientificName || '—')}</td>
        <td>${tag(catName, catColor)}</td>
        <td>${tag(capName, capColor)}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.85rem;">${threshold}</td>
        <td>${tag(isSystem ? 'System' : 'Custom', isSystem ? 'gray' : 'amber')}</td>
        <td style="white-space:nowrap;">${actions}</td>
      </tr>
    `;
  }

  tableEl.innerHTML = `
    <table class="data-table" style="width:100%;min-width:640px;">
      <thead style="position:sticky;top:0;z-index:1;background:var(--surface);">
        <tr>
          ${thBtn('Common Name',    'name')}
          ${thBtn('Scientific Name','sci')}
          ${thBtn('Category',       'cat')}
          ${thBtn('Capture Mode',   'cap')}
          ${thBtn('Threshold',      'thresh')}
          ${thBtn('Type',           'type')}
          <th style="width:1%;white-space:nowrap;"></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  if (countEl) countEl.textContent = `${pests.length} of ${_allPests.length} species`;

  // Sort click handlers
  tableEl.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sortBy === key) state.sortDesc = !state.sortDesc;
      else { state.sortBy = key; state.sortDesc = false; }
      renderTable();
    });
  });

  // Action handlers
  tableEl.querySelectorAll('[data-edit-pest]').forEach(btn => {
    const pest = pests.find(p => String(p.id) === btn.dataset.editPest);
    if (pest) btn.addEventListener('click', e => { e.stopPropagation(); openEditPestModal(pest); });
  });

  tableEl.querySelectorAll('[data-delete-pest]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Delete this pest?')) return;
      try {
        await deletePest(btn.dataset.deletePest);
        showToast('Pest deleted.');
        await loadPests();
      } catch (err) {
        showToast(err.message || 'Failed to delete pest', 'error');
      }
    });
  });
}

function openCreatePestModal() {
  const categoryOptions = Object.entries(PestCategoryValues)
    .map(([name, val]) => `<option value="${val}">${name}</option>`)
    .join('');

  const captureModeOptions = Object.entries(CaptureModeValues)
    .map(([name, val]) => `<option value="${val}">${name}</option>`)
    .join('');

  const body = openModal({
    title: 'Add Pest Species',
    subtitle: 'Add a new pest to your tenant catalogue',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <div class="input-label">Common Name *</div>
          <input class="input-field" id="pest-common" placeholder="e.g. Fall Armyworm" type="text">
        </div>
        <div>
          <div class="input-label">Scientific Name</div>
          <input class="input-field" id="pest-scientific" placeholder="e.g. Spodoptera frugiperda" type="text">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <div class="input-label">Category *</div>
            <select class="input-field" id="pest-category" style="cursor:pointer;">
              ${categoryOptions}
            </select>
          </div>
          <div>
            <div class="input-label">Capture Mode *</div>
            <select class="input-field" id="pest-capture" style="cursor:pointer;">
              ${captureModeOptions}
            </select>
          </div>
        </div>
        <div>
          <div class="input-label">Threshold Count</div>
          <input class="input-field" id="pest-threshold" placeholder="e.g. 20" type="number" min="0">
        </div>
        <div>
          <div class="input-label">Description</div>
          <textarea class="input-field" id="pest-desc" rows="2" placeholder="Brief description…" style="resize:none;"></textarea>
        </div>
        <div>
          <div class="input-label">Image URL</div>
          <input class="input-field" id="pest-image" placeholder="https://..." type="url">
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn-outline" id="pest-cancel" style="flex:1;">Cancel</button>
          <button class="btn-primary" id="pest-submit" style="flex:2;justify-content:center;">🦗 Add Pest</button>
        </div>
      </div>
    `,
  });

  body.querySelector('#pest-cancel').addEventListener('click', closeModal);

  const captureEl = body.querySelector('#pest-capture');
  const thresholdEl = body.querySelector('#pest-threshold');
  function syncThreshold() {
    const isCount = parseInt(captureEl.value) === CaptureModeValues.Count;
    thresholdEl.closest('div').style.display = isCount ? '' : 'none';
    if (!isCount) { thresholdEl.value = ''; }
    else if (!thresholdEl.value || thresholdEl.value === '0') { thresholdEl.value = '1'; }
  }
  captureEl.addEventListener('change', syncThreshold);
  syncThreshold();

  body.querySelector('#pest-submit').addEventListener('click', async () => {
    const commonName = body.querySelector('#pest-common').value.trim();
    if (!commonName) { showToast('Common name is required', 'error'); return; }

    const btn = body.querySelector('#pest-submit');
    btn.disabled = true;
    btn.textContent = 'Adding…';

    try {
      await createPest({
        commonName,
        scientificName: body.querySelector('#pest-scientific').value.trim() || null,
        category: parseInt(body.querySelector('#pest-category').value),
        defaultCaptureMode: parseInt(body.querySelector('#pest-capture').value),
        thresholdCount: body.querySelector('#pest-threshold').value ? parseInt(body.querySelector('#pest-threshold').value) : null,
        description: body.querySelector('#pest-desc').value.trim() || null,
        imageUrl: body.querySelector('#pest-image').value.trim() || null,
      });
      closeModal();
      showToast('Pest added successfully');
      await loadPests();
    } catch (err) {
      showToast(err.message || 'Failed to add pest', 'error');
      btn.disabled = false;
      btn.textContent = '🦗 Add Pest';
    }
  });
}

function openEditPestModal(pest) {
  const categoryOptions = Object.entries(PestCategoryValues)
    .map(([name, val]) => `<option value="${val}" ${name === pest.category || val === pest.category ? 'selected' : ''}>${name}</option>`)
    .join('');

  const captureModeOptions = Object.entries(CaptureModeValues)
    .map(([name, val]) => `<option value="${val}" ${name === pest.defaultCaptureMode || val === pest.defaultCaptureMode ? 'selected' : ''}>${name}</option>`)
    .join('');

  const body = openModal({
    title: 'Edit Pest Species',
    subtitle: 'Update pest details',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <div class="input-label">Common Name *</div>
          <input class="input-field" id="edit-pest-common" placeholder="e.g. Fall Armyworm" type="text" value="${escapeHtml(pest.commonName)}">
        </div>
        <div>
          <div class="input-label">Scientific Name</div>
          <input class="input-field" id="edit-pest-scientific" placeholder="e.g. Spodoptera frugiperda" type="text" value="${escapeHtml(pest.scientificName || '')}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <div class="input-label">Category *</div>
            <select class="input-field" id="edit-pest-category" style="cursor:pointer;">
              ${categoryOptions}
            </select>
          </div>
          <div>
            <div class="input-label">Capture Mode *</div>
            <select class="input-field" id="edit-pest-capture" style="cursor:pointer;">
              ${captureModeOptions}
            </select>
          </div>
        </div>
        <div>
          <div class="input-label">Threshold Count</div>
          <input class="input-field" id="edit-pest-threshold" placeholder="e.g. 20" type="number" min="0" value="${pest.thresholdCount != null ? pest.thresholdCount : ''}">
        </div>
        <div>
          <div class="input-label">Description</div>
          <textarea class="input-field" id="edit-pest-desc" rows="2" placeholder="Brief description…" style="resize:none;">${escapeHtml(pest.description || '')}</textarea>
        </div>
        <div>
          <div class="input-label">Image URL</div>
          <input class="input-field" id="edit-pest-image" placeholder="https://..." type="url" value="${escapeHtml(pest.imageUrl || '')}">
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn-outline" id="edit-pest-cancel" style="flex:1;">Cancel</button>
          <button class="btn-primary" id="edit-pest-submit" style="flex:2;justify-content:center;">💾 Save Changes</button>
        </div>
      </div>
    `,
  });

  body.querySelector('#edit-pest-cancel').addEventListener('click', closeModal);

  const editCaptureEl = body.querySelector('#edit-pest-capture');
  const editThresholdEl = body.querySelector('#edit-pest-threshold');
  function syncEditThreshold() {
    const isCount = parseInt(editCaptureEl.value) === CaptureModeValues.Count;
    editThresholdEl.closest('div').style.display = isCount ? '' : 'none';
    if (!isCount) { editThresholdEl.value = ''; }
    else if (!editThresholdEl.value || editThresholdEl.value === '0') { editThresholdEl.value = '1'; }
  }
  editCaptureEl.addEventListener('change', syncEditThreshold);
  syncEditThreshold();

  body.querySelector('#edit-pest-submit').addEventListener('click', async () => {
    const commonName = body.querySelector('#edit-pest-common').value.trim();
    if (!commonName) { showToast('Common name is required', 'error'); return; }

    const btn = body.querySelector('#edit-pest-submit');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      await updatePest(pest.id, {
        commonName,
        scientificName: body.querySelector('#edit-pest-scientific').value.trim() || null,
        category: parseInt(body.querySelector('#edit-pest-category').value),
        defaultCaptureMode: parseInt(body.querySelector('#edit-pest-capture').value),
        thresholdCount: body.querySelector('#edit-pest-threshold').value ? parseInt(body.querySelector('#edit-pest-threshold').value) : null,
        description: body.querySelector('#edit-pest-desc').value.trim() || null,
        imageUrl: body.querySelector('#edit-pest-image').value.trim() || null,
      });
      closeModal();
      showToast('Pest updated successfully');
      await loadPests();
    } catch (err) {
      showToast(err.message || 'Failed to update pest', 'error');
      btn.disabled = false;
      btn.textContent = '💾 Save Changes';
    }
  });
}
