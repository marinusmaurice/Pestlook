import { getPests, createPest, deletePest } from '../api/pests.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
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

export async function renderPests(container) {
  setPageTitle('Pest Catalogue');
  setTopbarCta('＋ Add Pest', () => openCreatePestModal(container));

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;">
      <div>
        <div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.02em;">Pest Catalogue</div>
        <div style="font-size:0.82rem;color:var(--text-dim);">Species reference for your tenant</div>
      </div>
    </div>
    <div id="pests-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">
      <div class="skeleton-block" style="height:140px;border-radius:14px;"></div>
      <div class="skeleton-block" style="height:140px;border-radius:14px;"></div>
      <div class="skeleton-block" style="height:140px;border-radius:14px;"></div>
    </div>
  `;

  await loadPests(container);
}

async function loadPests(container) {
  const grid = container.querySelector('#pests-grid');
  try {
    const res = await getPests();
    const pests = res.data || [];

    if (pests.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
          <div style="font-size:3rem;margin-bottom:12px;">🦗</div>
          <div style="font-family:'Fraunces',serif;font-size:1.1rem;color:#fff;margin-bottom:6px;">No pests yet</div>
          <div style="font-size:0.82rem;color:var(--text-dim);">Add your first pest species to get started</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = pests.map(p => pestCard(p)).join('');
  } catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1;color:var(--red);padding:20px;">Failed to load pests: ${escapeHtml(err.message)}</div>`;
  }
}

function pestCard(p) {
  const catColor = categoryColors[p.category] || 'gray';
  const emoji = categoryEmojis[p.category] || '❓';
  const catName = PestCategory[p.category] || 'Unknown';
  const capName = CaptureMode[p.defaultCaptureMode] || 'Count';
  const capColor = captureModeColors[p.defaultCaptureMode] || 'gray';
  const isSystem = p.isSystem;

  return `
    <div class="pest-card" data-pest-id="${p.id}">
      <div class="pest-icon" style="background:rgba(${catColor === 'red' ? '224,96,96' : catColor === 'amber' ? '240,168,64' : catColor === 'green' ? '109,222,132' : catColor === 'blue' ? '96,168,224' : '112,128,96'},0.12);border:1px solid rgba(${catColor === 'red' ? '224,96,96' : catColor === 'amber' ? '240,168,64' : catColor === 'green' ? '109,222,132' : catColor === 'blue' ? '96,168,224' : '112,128,96'},0.2);">
        ${emoji}
      </div>
      <div style="flex:1;">
        <div style="font-weight:600;color:#fff;margin-bottom:2px;">${escapeHtml(p.commonName)}</div>
        <div style="font-size:0.72rem;color:var(--text-dim);font-style:italic;margin-bottom:8px;">${escapeHtml(p.scientificName || '')}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${tag(catName, catColor)}
          ${tag(capName, capColor)}
          ${tag(isSystem ? 'System' : 'Custom', isSystem ? 'gray' : 'amber')}
        </div>
        ${p.thresholdCount != null ? `<div style="font-size:0.68rem;color:var(--text-dim);margin-top:6px;">Threshold: ${p.thresholdCount}</div>` : ''}
      </div>
    </div>
  `;
}

function openCreatePestModal(container) {
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
      await loadPests(container);
    } catch (err) {
      showToast(err.message || 'Failed to add pest', 'error');
      btn.disabled = false;
      btn.textContent = '🦗 Add Pest';
    }
  });
}
