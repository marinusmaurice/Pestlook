import { getSession, completeSession, addObservation, updateObservation, deleteObservation } from '../api/sessions.js';
import { getTraps } from '../api/traps.js';
import { getPests } from '../api/pests.js';
import { getFields } from '../api/fields.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDateTime, formatTemperature, toCelsiusForStorage, temperatureUnitLabel, LifeStageValues } from '../utils/helpers.js';
import { getUser } from '../utils/storage.js';
import { navigate } from '../utils/router.js';

let cachedTraps = [];
let cachedPests = [];
let cachedFields = [];

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
    const [sessionRes, trapsRes, pestsRes, fieldsRes] = await Promise.all([
      getSession(sessionId),
      getTraps(),
      getPests(),
      getFields(),
    ]);
    cachedTraps = trapsRes.data || [];
    cachedPests = pestsRes.data || [];
    cachedFields = fieldsRes.data || [];
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
          <div style="display:grid;grid-template-columns:auto 1fr auto 1fr;gap:4px 16px;font-size:0.85rem;color:var(--text-dim);">
            <span>Scout</span><span style="color:var(--text);">${escapeHtml(session.scouterName || '—')}</span>
            ${session.farmName ? `<span>Farm</span><span style="color:var(--text);">${escapeHtml(session.farmName)}</span>` : '<span></span><span></span>'}
            <span>Type</span><span style="color:var(--text);">${session.isPlanned ? 'Planned' : 'Unplanned'}</span>
            ${session.fieldName ? `<span>Field</span><span style="color:var(--text);">${escapeHtml(session.fieldName)}</span>` : '<span></span><span></span>'}
            ${session.scheduledDate
              ? `<span>Scheduled</span><span style="color:var(--text);">${formatDateTime(session.scheduledDate)}</span><span>Created by</span><span style="color:var(--text);">${escapeHtml(session.createdByName || '—')}</span>`
              : `<span>Created by</span><span style="color:var(--text);grid-column:span 3;">${escapeHtml(session.createdByName || '—')}</span>`}
            ${session.startedAt ? `<span>Started</span><span style="color:var(--text);grid-column:span 3;">${formatDateTime(session.startedAt)}</span>` : ''}
            ${session.completedAt ? `<span>Completed</span><span style="color:var(--text);grid-column:span 3;">${formatDateTime(session.completedAt)}</span>` : ''}
            <span>Weather</span><span style="color:var(--text);">${weatherDisplay}</span><span>Updated by</span><span style="color:var(--text);">${escapeHtml(session.updatedByName || '—')}</span>
            ${session.notes ? `<span>Notes</span><span style="color:var(--text);grid-column:span 3;">${escapeHtml(session.notes)}</span>` : ''}
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
  if (addTrapBtn) addTrapBtn.addEventListener('click', () => showObservationModal(session, 'Trap', null, container, params));
  if (addAdHocBtn) addAdHocBtn.addEventListener('click', () => showObservationModal(session, 'AdHoc', null, container, params));
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
    const typeTag = isTrap ? tag('🕸️ Trap', 'green') : tag('👁 AdHoc', 'amber');
    const plannedTag = o.isPlanned ? tag('Planned', 'blue') : tag('Unplanned', 'gray');
    const trapName = o.trapName ? escapeHtml(o.trapName) : '—';
    const pestName = o.pestName ? escapeHtml(o.pestName) : (o.isUnknownPest ? '<em>Unknown pest</em>' : '—');
    const mode = o.captureMode || '—';
    const countVal = o.count != null ? o.count : '—';
    const presentVal = o.isPresent != null ? (o.isPresent ? '✓ Yes' : '✗ No') : '—';
    const lifeStage = o.lifeStage || '—';
    const coords = (o.latitude != null && o.longitude != null) ? `${Number(o.latitude).toFixed(4)}, ${Number(o.longitude).toFixed(4)}` : '—';
    const notes = o.notes ? escapeHtml(o.notes) : '';
    const createdBy = o.createdByName ? escapeHtml(o.createdByName) : '—';
    const updatedBy = o.updatedByName ? escapeHtml(o.updatedByName) : '—';

    let actions = '';
    if (canEdit) {
      if (isTrap) actions += `<button class="btn-outline" style="padding:3px 8px;font-size:0.72rem;" data-edit-obs="${o.id}">Edit</button> `;
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
        <td style="font-size:0.78rem;color:var(--text-dim);">${createdBy}</td>
        <td style="font-size:0.78rem;color:var(--text-dim);">${updatedBy}</td>
        <td style="white-space:nowrap;">${actions}</td>
      </tr>
    `;
  }

  wrap.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr>
          <th>Type</th><th>Trap</th><th>Pest</th><th>Mode</th>
          <th>Count</th><th>Present</th><th>Stage</th><th>Coords</th><th>Notes</th><th>Created by</th><th>Updated by</th><th></th>
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
        showObservationModal(session, type, obs, container, params);
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

async function showObservationModal(session, type, existing, container, params) {
  const isEdit = !!existing;
  const isTrap = type === 'Trap';

  const [freshPests, freshTraps, allFields] = await Promise.all([
    getPests().then(r => r.data || []).catch(() => cachedPests),
    getTraps().then(r => r.data || []).catch(() => cachedTraps),
    getFields().then(r => r.data || []).catch(() => cachedFields),
  ]);

  const filteredTraps = (() => {
    if (session.fieldId) return freshTraps.filter(t => t.fieldId === session.fieldId);
    if (session.farmId) {
      const farmFieldIds = new Set(allFields.filter(f => f.farmId === session.farmId).map(f => f.id));
      return freshTraps.filter(t => farmFieldIds.has(t.fieldId));
    }
    return freshTraps;
  })();

  const existingCaptureMode = existing?.captureMode;
  const isPresence = existingCaptureMode === 'Presence' || existingCaptureMode === 1;

  const form = document.createElement('div');

  if (isTrap) {
    form.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label class="input-label">Trap</label>
          <select class="input-field" id="obsTrap">
            <option value="">— Select trap —</option>
            ${filteredTraps.map(t => `<option value="${t.id}" ${existing?.trapId === t.id ? 'selected' : ''}>${escapeHtml(t.name)}${t.barcode ? ' (' + escapeHtml(t.barcode) + ')' : ''}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="input-label">Pest</label>
          <select class="input-field" id="obsPest">
            <option value="">— Select pest —</option>
            ${freshPests.map(p => `<option value="${p.id}" ${existing?.pestId === p.id ? 'selected' : ''}>${escapeHtml(p.commonName)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="input-label">Capture Mode</label>
          <select class="input-field" id="obsMode">
            <option value="">—</option>
            <option value="Count" ${existingCaptureMode === 'Count' || existingCaptureMode === 0 ? 'selected' : ''}>Count</option>
            <option value="Presence" ${existingCaptureMode === 'Presence' || existingCaptureMode === 1 ? 'selected' : ''}>Presence</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn-outline" style="flex:1;" id="cancelObs">Cancel</button>
          <button class="btn-primary" style="flex:2;justify-content:center;" id="saveObs">${isEdit ? '💾 Update' : '＋ Add Observation'}</button>
        </div>
      </div>
    `;
  } else {
    form.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label class="input-label">Pest</label>
          <select class="input-field" id="obsPest">
            <option value="">— Select pest —</option>
            ${freshPests.map(p => `<option value="${p.id}" ${existing?.pestId === p.id ? 'selected' : ''}>${escapeHtml(p.commonName)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="input-label">Capture Mode</label>
          <select class="input-field" id="obsMode">
            <option value="">—</option>
            <option value="Count" ${existingCaptureMode === 'Count' || existingCaptureMode === 0 ? 'selected' : ''}>Count</option>
            <option value="Presence" ${existingCaptureMode === 'Presence' || existingCaptureMode === 1 ? 'selected' : ''}>Presence</option>
          </select>
        </div>
        <div id="obsCountWrap">
          <label class="input-label">Number of obs</label>
          <input class="input-field" type="number" id="obsCount" value="${existing?.count ?? 1}">
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn-outline" style="flex:1;" id="cancelObs">Cancel</button>
          <button class="btn-primary" style="flex:2;justify-content:center;" id="saveObs">${isEdit ? '💾 Update' : '＋ Add Observation'}</button>
        </div>
      </div>
    `;
  }

  openModal({
    title: isEdit ? 'Edit Observation' : `Add ${isTrap ? 'Trap' : 'Ad-hoc'} Observation`,
    subtitle: isEdit ? 'Update the observation details' : `Record a ${isTrap ? 'trap inspection' : 'field observation'}`,
    content: form
  });

  const modeEl = document.getElementById('obsMode');
  const pestEl = document.getElementById('obsPest');

  if (!isTrap) {
    pestEl.addEventListener('change', () => {
      const pest = freshPests.find(p => p.id === pestEl.value);
      if (pest?.defaultCaptureMode != null) {
        modeEl.value = typeof pest.defaultCaptureMode === 'string'
          ? pest.defaultCaptureMode
          : (pest.defaultCaptureMode === 0 ? 'Count' : 'Presence');
      }
    });
  } else {
    pestEl.addEventListener('change', () => {
      const pest = freshPests.find(p => p.id === pestEl.value);
      if (pest?.defaultCaptureMode != null) {
        modeEl.value = typeof pest.defaultCaptureMode === 'string'
          ? pest.defaultCaptureMode
          : (pest.defaultCaptureMode === 0 ? 'Count' : 'Presence');
      }
    });
  }

  document.getElementById('cancelObs').addEventListener('click', closeModal);
  document.getElementById('saveObs').addEventListener('click', async () => {
    const btn = document.getElementById('saveObs');

    if (isTrap) {
      if (!document.getElementById('obsTrap').value) { showToast('Trap is required', 'error'); return; }
      if (!pestEl.value) { showToast('Pest is required', 'error'); return; }
      if (!modeEl.value) { showToast('Capture Mode is required', 'error'); return; }
    } else {
      if (!pestEl.value) { showToast('Pest is required', 'error'); return; }
      if (!modeEl.value) { showToast('Capture Mode is required', 'error'); return; }
      if (!document.getElementById('obsCount').value.trim()) { showToast('Number of obs is required', 'error'); return; }
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const selectedPest = freshPests.find(p => p.id === pestEl.value);
      const payload = {
        observationType: type,
        trapId: isTrap ? (document.getElementById('obsTrap').value || null) : null,
        pestId: pestEl.value || null,
        captureMode: modeEl.value || null,
        thresholdCount: modeEl.value === 'Count' ? (selectedPest?.thresholdCount ?? null) : null,
        isPlanned: true,
        observationGroupId: existing?.observationGroupId ?? crypto.randomUUID(),
        repeatCount: !isTrap ? (parseInt(document.getElementById('obsCount').value.trim()) || 1) : 1,
        count: null,
        isPresent: null,
        latitude: null,
        longitude: null,
        isUnknownPest: false,
        notes: null,
        lifeStage: null,
      };

      if (isEdit) {
        await updateObservation(session.id, existing.id, payload);
        showToast('Observation updated!', 'success');
      } else {
        await addObservation(session.id, payload);
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
