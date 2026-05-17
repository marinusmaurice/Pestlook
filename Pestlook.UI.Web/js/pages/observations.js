import { getObservations } from '../api/observations.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatTime, CaptureMode } from '../utils/helpers.js';

export async function renderObservations(container) {

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;">
      <div>
        <div class="page-heading">Pest Observations</div>
        <div class="page-desc">All recorded pest sightings and counts</div>
      </div>
    </div>
    <div class="two-col" style="margin-bottom:16px;" id="obsSummary">
      <div class="card card-p"><div class="skeleton skeleton-card"></div></div>
      <div class="card card-p"><div class="skeleton skeleton-card"></div></div>
    </div>
    <div class="card card-p" id="obsTable"><div class="skeleton skeleton-card" style="height:300px;"></div></div>
  `;

  try {
    const res = await getObservations();
    const observations = res.data || [];
    renderSummary(observations);
    renderList(observations);
  } catch (err) {
    showToast('Failed to load observations: ' + err.message, 'error');
  }
}

function renderSummary(observations) {
  const el = document.getElementById('obsSummary');
  const highCount = observations.filter(o => (o.count || 0) > 20).length;
  const unknowns = observations.filter(o => o.isUnknownPest).length;

  el.innerHTML = `
    <div class="card card-p" style="display:flex;align-items:center;gap:16px;">
      <div style="width:50px;height:50px;border-radius:12px;background:rgba(224,96,96,0.12);border:1px solid rgba(224,96,96,0.2);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">⚠️</div>
      <div>
        <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.07em;">High-Count Alerts</div>
        <div style="font-family:'Fraunces',serif;font-size:1.8rem;font-weight:700;color:var(--red);">${highCount}</div>
        <div style="font-size:0.72rem;color:var(--text-dim);">Counts above threshold</div>
      </div>
    </div>
    <div class="card card-p" style="display:flex;align-items:center;gap:16px;">
      <div style="width:50px;height:50px;border-radius:12px;background:rgba(240,168,64,0.1);border:1px solid rgba(240,168,64,0.2);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">🔬</div>
      <div>
        <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.07em;">Unknown Pests</div>
        <div style="font-family:'Fraunces',serif;font-size:1.8rem;font-weight:700;color:var(--amber);">${unknowns}</div>
        <div style="font-size:0.72rem;color:var(--text-dim);">Pending identification</div>
      </div>
    </div>
  `;
}

function renderList(observations) {
  const el = document.getElementById('obsTable');

  if (observations.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔬</div><h3>No observations</h3><p>Start a scouting session and record pest observations</p></div>`;
    return;
  }

  let rows = '';
  for (const obs of observations) {
    const isUnknown = obs.isUnknownPest;
    const name = isUnknown ? 'Unknown Pest' : (obs.pestName || 'Unknown');
    const emoji = isUnknown ? '❓' : '🐛';
    const count = obs.count != null ? obs.count : (obs.present != null ? (obs.present ? 'Yes' : 'No') : '—');
    const countColor = (obs.count || 0) > 20 ? 'var(--red)' : 'var(--amber)';
    const statusTag = (obs.count || 0) > 20 ? tag('Alert', 'red') : isUnknown ? tag('ID Needed', 'amber') : tag('Normal', 'green');
    const mode = CaptureMode[obs.captureMode] || '';
    const desc = isUnknown ? escapeHtml(obs.unknownPestDescription || '') : mode;
    const photos = obs.photoUrls || [];
    const photoBtn = photos.length > 0
      ? `<button class="btn-outline obs-photos-btn" style="margin-top:5px;padding:2px 8px;font-size:0.7rem;" data-photos='${JSON.stringify(photos).replace(/'/g, '&#39;')}' data-name="${escapeHtml(name)}">📷 View photos (${photos.length})</button>`
      : '';

    rows += `
      <div class="obs-row">
        <div class="obs-emoji">${emoji}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:500;color:${isUnknown ? 'var(--amber)' : 'var(--text)'};font-size:0.88rem;">${escapeHtml(name)}</div>
          <div style="font-size:0.72rem;color:var(--text-dim);">${desc}</div>
          ${photoBtn}
        </div>
        <div class="obs-count" style="color:${typeof count === 'number' ? countColor : 'var(--text-dim)'};">${count}</div>
        ${statusTag}
        <div style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:var(--text-dim);width:60px;text-align:right;">${formatTime(obs.observedAt)}</div>
      </div>
    `;
  }

  el.innerHTML = `
    <div class="section-head">
      <div class="section-title">Recent Observations</div>
      <span style="font-size:0.78rem;color:var(--text-dim);">${observations.length} total</span>
    </div>
    ${rows}
  `;

  el.querySelectorAll('.obs-photos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const photos = JSON.parse(btn.dataset.photos);
      const name = btn.dataset.name;
      showPhotoCarousel(photos, name);
    });
  });
}

function showPhotoCarousel(photos, title) {
  let current = 0;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;';

  const render = () => {
    overlay.innerHTML = `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;max-width:90vw;max-height:90vh;">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:0 4px;">
          <div style="font-size:0.9rem;font-weight:600;color:#fff;">${escapeHtml(title)} · ${current + 1} / ${photos.length}</div>
          <button id="carouselClose" style="background:rgba(255,255,255,0.12);border:none;border-radius:50%;width:32px;height:32px;color:#fff;font-size:16px;cursor:pointer;">✕</button>
        </div>
        <div style="position:relative;display:flex;align-items:center;gap:12px;">
          <button id="carouselPrev" style="background:rgba(255,255,255,0.12);border:none;border-radius:50%;width:40px;height:40px;color:#fff;font-size:20px;cursor:pointer;flex-shrink:0;${photos.length < 2 ? 'visibility:hidden;' : ''}">‹</button>
          <img src="${escapeHtml(photos[current])}" style="max-width:70vw;max-height:65vh;border-radius:10px;object-fit:contain;box-shadow:0 8px 40px rgba(0,0,0,0.6);" />
          <button id="carouselNext" style="background:rgba(255,255,255,0.12);border:none;border-radius:50%;width:40px;height:40px;color:#fff;font-size:20px;cursor:pointer;flex-shrink:0;${photos.length < 2 ? 'visibility:hidden;' : ''}">›</button>
        </div>
        ${photos.length > 1 ? `
        <div style="display:flex;gap:6px;">
          ${photos.map((_, i) => `<div style="width:8px;height:8px;border-radius:50%;background:${i === current ? '#fff' : 'rgba(255,255,255,0.3)'};transition:background 0.2s;"></div>`).join('')}
        </div>` : ''}
      </div>
    `;

    overlay.querySelector('#carouselClose').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#carouselPrev')?.addEventListener('click', () => { current = (current - 1 + photos.length) % photos.length; render(); });
    overlay.querySelector('#carouselNext')?.addEventListener('click', () => { current = (current + 1) % photos.length; render(); });
  };

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); }
    if (e.key === 'ArrowLeft') { current = (current - 1 + photos.length) % photos.length; render(); }
    if (e.key === 'ArrowRight') { current = (current + 1) % photos.length; render(); }
  });

  document.body.appendChild(overlay);
  render();
}
