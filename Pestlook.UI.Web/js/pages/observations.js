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

    rows += `
      <div class="obs-row">
        <div class="obs-emoji">${emoji}</div>
        <div style="flex:1;">
          <div style="font-weight:500;color:${isUnknown ? 'var(--amber)' : 'var(--text)'};font-size:0.88rem;">${escapeHtml(name)}</div>
          <div style="font-size:0.72rem;color:var(--text-dim);">${desc}</div>
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
}
