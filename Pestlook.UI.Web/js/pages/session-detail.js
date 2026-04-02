import { getSession, completeSession, addObservation, updateObservation, deleteObservation } from '../api/sessions.js';
import { getTraps } from '../api/traps.js';
import { getPests } from '../api/pests.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDateTime, formatTemperature, toCelsiusForStorage, temperatureUnitLabel, LifeStageValues } from '../utils/helpers.js';
import { getUser } from '../utils/storage.js';
import { navigate } from '../utils/router.js';

let cachedTraps = [];
let cachedPests = [];

export async function renderSessionDetail(container, params) {
  const sessionId = params.id;
  setTopbarCta('', null);

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <a href="#/sessions" style="font-size:0.82rem;color:var(--text-dim);text-decoration:none;">← Back to Sessions</a>
    </div>
    <div id="sessionDetail"><div class="skeleton skeleton-card" style="height:200px;"></div></div>
  `;

  try {
    const [sessionRes, trapsRes, pestsRes] = await Promise.all([
      getSession(sessionId),
      getTraps(),
      getPests(),
    ]);
    cachedTraps = trapsRes.data || [];
    cachedPests = pestsRes.data || [];
    const session = sessionRes.data;
    setPageTitle(`Session ${session.id.substring(0, 8)}`);
    renderDetail(session, container, params);
  } catch (err) {
    showToast('Failed to load session: ' + err.message, 'error');
  }
}

function renderDetail(session, container, params) {
  const el = document.getElementById('sessionDetail');
  const unit = getUser()?.temperatureUnit || 'C';
  const isCompleted = !!session.completedAt;
  const isActive = !!session.startedAt && !isCompleted;

  let statusTag;
  if (isCompleted) statusTag = tag('✓ Complete', 'blue');
  else if (isActive) statusTag = tag('● Active', 'green');
  else if (session.isPlanned) statusTag = tag('📋 Planned', 'amber');
  else statusTag = tag('—', 'gray');

  const weatherParts = [
    session.weatherConditions ? escapeHtml(session.weatherConditions) : null,
    session.temperatureCelsius != null ? formatTemperature(session.temperatureCelsius, unit) : null,
  ].filter(Boolean);
  const weatherDisplay = weatherParts.length ? weatherParts.join(', ') : '—';

  const canEdit = !isCompleted;

  // ── Header card ──
  let html = `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-p" style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start;">
        <div style="flex:1;min-width:200px;">
          <div style="font-family:'Fraunces',serif;font-size:1.3rem;font-weight:700;color:#fff;margin-bottom:8px;">
            Session ${session.id.substring(0, 8)} ${statusTag}
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 16px;font-size:0.85rem;color:var(--text-dim);">
            <span>Scout</span><span style="color:var(--text);">${escapeHtml(session.scouterName || '—')}</span>
            <span>Type</span><span style="color:var(--text);">${session.isPlanned ? 'Planned' : 'Unplanned'}</span>
            ${session.scheduledDate ? `<span>Scheduled</span><span style="color:var(--text);">${formatDateTime(session.scheduledDate)}</span>` : ''}
            ${session.startedAt ? `<span>Started</span><span style="color:var(--text);">${formatDateTime(session.startedAt)}</span>` : ''}
            ${session.completedAt ? `<span>Completed</span><span style="color:var(--text);">${formatDateTime(session.completedAt)}</span>` : ''}
            <span>Weather</span><span style="color:var(--text);">${weatherDisplay}</span>
            ${session.notes ? `<span>Notes</span><span style="color:var(--text);">${escapeHtml(session.notes)}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
          <div style="font-family:'Fraunces',serif;font-size:2rem;font-weight:700;color:var(--amber);">${session.observationCount}</div>
          <div style="font-size:0.78rem;color:var(--text-dim);">pest observations</div>
          ${isActive ? `<button class="btn-primary" style="padding:6px 16px;font-size:0.82rem;" id="completeSessionBtn">✓ Complete Session</button>` : ''}
        </div>
      </div>
    </div>
  `;

  // ── Observations table ──
  const observations = session.observations || [];

  html += `
    <div class="card">
      <div class="card-p" style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;">
        <div style="font-weight:600;color:var(--text);">Observation Items (${observations.length})</div>
        ${canEdit ? `
          <div style="display:flex;gap:6px;">
            <button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;" id="addTrapObs">＋ Trap</button>
            <button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;" id="addAdHocObs">＋ Observation</button>
          </div>
        ` : ''}
      </div>
      <div id="obsTableWrap"></div>
    </div>
  `;

  el.innerHTML = html;

  // Render observations table
  renderObsTable(observations, session, container, params, canEdit);

  // Complete button
  const completeBtn = document.getElementById('completeSessionBtn');
  if (completeBtn) {
    completeBtn.addEventListener('click', async () => {
      completeBtn.disabled = true;
      completeBtn.innerHTML = '<span class="spinner"></span>';
      try {
        await completeSession(session.id, {});
        showToast('Session completed!', 'success');
        renderSessionDetail(container, params);
      } catch (err) {
        showToast(err.message, 'error');
        completeBtn.disabled = false;
        completeBtn.textContent = '✓ Complete Session';
      }
    });
  }

  // Add observation buttons
  const addTrapBtn = document.getElementById('addTrapObs');
  const addAdHocBtn = document.getElementById('addAdHocObs');
  if (addTrapBtn) addTrapBtn.addEventListener('click', () => showObservationModal(session.id, 'Trap', null, container, params));
  if (addAdHocBtn) addAdHocBtn.addEventListener('click', () => showObservationModal(session.id, 'AdHoc', null, container, params));
}

function renderObsTable(observations, session, container, params, canEdit) {
  const wrap = document.getElementById('obsTableWrap');
  if (observations.length === 0) {
    wrap.innerHTML = '<div style="text-align:center;padding:30px;font-size:0.85rem;color:var(--text-dim);">No observation items yet.</div>';
    return;
  }

  let rows = '';
  for (const o of observations) {
    const isTrap = o.observationType === 'Trap' || o.observationType === 0;
    const typeTag = isTrap ? tag('🪤 Trap', 'green') : tag('👁 AdHoc', 'amber');
    const plannedTag = o.isPlanned ? tag('Planned', 'blue') : '';
    const trapName = o.trapName ? escapeHtml(o.trapName) : '—';
    const pestName = o.pestName ? escapeHtml(o.pestName) : (o.isUnknownPest ? '<em>Unknown pest</em>' : '—');
    const mode = o.captureMode || '—';
    const countVal = o.count != null ? o.count : '—';
    const presentVal = o.isPresent != null ? (o.isPresent ? '✓ Yes' : '✗ No') : '—';
    const lifeStage = o.lifeStage || '—';
    const coords = (o.latitude != null && o.longitude != null) ? `${Number(o.latitude).toFixed(4)}, ${Number(o.longitude).toFixed(4)}` : '—';
    const notes = o.notes ? escapeHtml(o.notes) : '';

    let actions = '';
    if (canEdit) {
      actions += `<button class="btn-outline" style="padding:3px 8px;font-size:0.72rem;" data-edit-obs="${o.id}">Edit</button> `;
      actions += `<button class="btn-outline" style="padding:3px 8px;font-size:0.72rem;color:var(--red);border-color:var(--red);" data-del-obs="${o.id}">Del</button>`;
    }

    rows += `
      <tr>
        <td>${typeTag} ${plannedTag}</td>
        <td>${isTrap ? trapName : '—'}</td>
        <td>${pestName}</td>
        <td>${mode}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;">${countVal}</td>
        <td>${presentVal}</td>
        <td>${lifeStage}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--text-dim);">${coords}</td>
        <td style="font-size:0.78rem;color:var(--text-dim);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${notes}">${notes || '—'}</td>
        <td style="white-space:nowrap;">${actions}</td>
      </tr>
    `;
  }

  wrap.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr>
          <th>Type</th><th>Trap</th><th>Pest</th><th>Mode</th>
          <th>Count</th><th>Present</th><th>Stage</th><th>Coords</th><th>Notes</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('[data-edit-obs]').forEach(btn => {
    btn.addEventListener('click', () => {
      const obs = observations.find(o => o.id === btn.dataset.editObs);
      if (obs) {
        const type = (obs.observationType === 'Trap' || obs.observationType === 0) ? 'Trap' : 'AdHoc';
        showObservationModal(session.id, type, obs, container, params);
      }
    });
  });

  wrap.querySelectorAll('[data-del-obs]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this observation?')) return;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      try {
        await deleteObservation(session.id, btn.dataset.delObs);
        showToast('Observation deleted.', 'success');
        renderSessionDetail(container, params);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Del';
      }
    });
  });
}

/* ── Add / Edit single observation modal ────────────────────────────────────── */

function showObservationModal(sessionId, type, existing, container, params) {
  const isEdit = !!existing;
  const isTrap = type === 'Trap';
  const unit = getUser()?.temperatureUnit || 'C';

  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      ${isTrap ? `
        <div>
          <label class="input-label">Trap</label>
          <select class="input-field" id="obsTrap">
            <option value="">— Select trap —</option>
            ${cachedTraps.map(t => `<option value="${t.id}" ${existing?.trapId === t.id ? 'selected' : ''}>${escapeHtml(t.name)}${t.barcode ? ' (' + escapeHtml(t.barcode) + ')' : ''}</option>`).join('')}
          </select>
        </div>
      ` : ''}
      <div>
        <label class="input-label">Pest (optional)</label>
        <select class="input-field" id="obsPest">
          <option value="">— Any pest —</option>
          ${cachedPests.map(p => `<option value="${p.id}" ${existing?.pestId === p.id ? 'selected' : ''}>${escapeHtml(p.commonName)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:10px;">
        <div style="flex:1;">
          <label class="input-label">Capture Mode</label>
          <select class="input-field" id="obsMode">
            <option value="">—</option>
            <option value="Count" ${existing?.captureMode === 'Count' || existing?.captureMode === 0 ? 'selected' : ''}>Count</option>
            <option value="Presence" ${existing?.captureMode === 'Presence' || existing?.captureMode === 1 ? 'selected' : ''}>Presence</option>
          </select>
        </div>
        <div style="flex:1;">
          <label class="input-label">Count</label>
          <input class="input-field" type="number" id="obsCount" value="${existing?.count ?? ''}">
        </div>
      </div>
      <div style="display:flex;gap:10px;">
        <div style="flex:1;">
          <label class="input-label">Life Stage</label>
          <select class="input-field" id="obsLifeStage">
            <option value="">—</option>
            ${Object.keys(LifeStageValues).map(ls => `<option value="${ls}" ${existing?.lifeStage === ls ? 'selected' : ''}>${ls}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;display:flex;align-items:center;gap:12px;padding-top:20px;">
          <label style="font-size:0.82rem;color:var(--text-dim);display:flex;align-items:center;gap:4px;">
            <input type="checkbox" id="obsPresent" ${existing?.isPresent === true ? 'checked' : ''}> Present
          </label>
          <label style="font-size:0.82rem;color:var(--text-dim);display:flex;align-items:center;gap:4px;">
            <input type="checkbox" id="obsUnknownPest" ${existing?.isUnknownPest ? 'checked' : ''}> Unknown pest
          </label>
        </div>
      </div>
      <div style="display:flex;gap:10px;">
        <div style="flex:1;">
          <label class="input-label">Latitude</label>
          <input class="input-field" type="number" step="any" id="obsLat" value="${existing?.latitude ?? ''}" placeholder="e.g. -33.9">
        </div>
        <div style="flex:1;">
          <label class="input-label">Longitude</label>
          <input class="input-field" type="number" step="any" id="obsLng" value="${existing?.longitude ?? ''}" placeholder="e.g. 18.4">
        </div>
      </div>
      <div>
        <label class="input-label">Notes</label>
        <textarea class="input-field" rows="2" id="obsNotes" placeholder="Observation notes…">${escapeHtml(existing?.notes || '')}</textarea>
      </div>
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelObs">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveObs">${isEdit ? '💾 Update' : '＋ Add Observation'}</button>
      </div>
    </div>
  `;

  openModal({
    title: isEdit ? 'Edit Observation' : `Add ${isTrap ? 'Trap' : 'Ad-hoc'} Observation`,
    subtitle: isEdit ? 'Update the observation details' : `Record a ${isTrap ? 'trap inspection' : 'field observation'}`,
    content: form
  });

  document.getElementById('cancelObs').addEventListener('click', closeModal);
  document.getElementById('saveObs').addEventListener('click', async () => {
    const btn = document.getElementById('saveObs');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const countRaw = document.getElementById('obsCount').value.trim();
      const latRaw = document.getElementById('obsLat').value.trim();
      const lngRaw = document.getElementById('obsLng').value.trim();

      const payload = {
        observationType: type,
        trapId: isTrap ? (document.getElementById('obsTrap').value || null) : null,
        pestId: document.getElementById('obsPest').value || null,
        captureMode: document.getElementById('obsMode').value || null,
        count: countRaw !== '' ? parseInt(countRaw) : null,
        isPresent: document.getElementById('obsPresent').checked || null,
        latitude: latRaw !== '' ? parseFloat(latRaw) : null,
        longitude: lngRaw !== '' ? parseFloat(lngRaw) : null,
        isUnknownPest: document.getElementById('obsUnknownPest').checked,
        notes: document.getElementById('obsNotes').value.trim() || null,
        lifeStage: document.getElementById('obsLifeStage').value || null,
      };

      if (isEdit) {
        await updateObservation(sessionId, existing.id, payload);
        showToast('Observation updated!', 'success');
      } else {
        await addObservation(sessionId, payload);
        showToast('Observation added!', 'success');
      }
      closeModal();
      renderSessionDetail(container, params);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = isEdit ? '💾 Update' : '＋ Add Observation';
    }
  });
}
