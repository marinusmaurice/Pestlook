import { getSession, completeSession, addObservation, updateObservation, deleteObservation } from '../api/sessions.js';
import { getTraps } from '../api/traps.js';
import { getPests } from '../api/pests.js';
import { getFields } from '../api/fields.js';
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

  const observations = session.observations || [];
  const canEdit = !isCompleted;
  const observedCount = isCompleted
    ? observations.filter(o => o.observedAt).length
    : session.observationCount;

  // ── Header card ──
  let html = `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-p" style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start;">
        <div style="flex:1;min-width:200px;">
          <div style="font-family:'Fraunces',serif;font-size:1.3rem;font-weight:700;color:var(--text);margin-bottom:8px;">
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
          <div style="font-family:'Fraunces',serif;font-size:2rem;font-weight:700;color:var(--amber);">${observedCount}</div>
          <div style="font-size:0.78rem;color:var(--text-dim);">${isCompleted ? 'Completed observations' : 'Planned observations'}</div>
          ${isCompleted ? `<button class="btn-outline" style="padding:5px 12px;font-size:0.78rem;margin-top:2px;" id="viewScoutingMapBtn">🗺 View Scouting Map</button>` : ''}
          ${isActive ? `<button class="btn-primary" style="padding:6px 16px;font-size:0.82rem;" id="completeSessionBtn">✓ Complete Session</button>` : ''}
        </div>
      </div>
    </div>
  `;

  // ── Observations table ──
  // (observations already declared above)

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
  renderObsTable(observations, session, container, params, canEdit, isCompleted);

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

  // Scouting map button (completed sessions)
  const mapBtn = document.getElementById('viewScoutingMapBtn');
  if (mapBtn) mapBtn.addEventListener('click', () => showScoutingMapModal(session, observations));
}

function renderObsTable(observations, session, container, params, canEdit, isCompleted) {
  const wrap = document.getElementById('obsTableWrap');
  if (observations.length === 0) {
    wrap.innerHTML = '<div style="text-align:center;padding:30px;font-size:0.85rem;color:var(--text-dim);">No observation items yet.</div>';
    return;
  }

  // Sort by observedAt ascending (same ordering as the scouting map) for consistent numbering
  const sorted = [...observations].sort((a, b) => {
    if (a.observedAt && b.observedAt) return new Date(a.observedAt) - new Date(b.observedAt);
    if (a.observedAt) return -1;
    if (b.observedAt) return 1;
    return 0;
  });

  let rows = '';
  sorted.forEach((o, idx) => {
    const rowNum = idx + 1;
    const isTrap = o.observationType === 'Trap' || o.observationType === 0;
    const typeTag = isTrap ? tag('🕸️ Trap', 'green') : tag('👁 AdHoc', 'amber');
    const plannedTag = o.isPlanned ? tag('Planned', 'blue') : tag('Unplanned', 'gray');
    const trapName = o.trapName ? escapeHtml(o.trapName) : '—';
    const pestName = o.pestName ? escapeHtml(o.pestName) : (o.isUnknownPest ? '<em>Unknown pest</em>' : '—');
    const mode = o.captureMode || '—';
    const countVal = o.count != null ? o.count : '—';
    const thresholdVal = o.thresholdCount != null ? o.thresholdCount : '—';
    const presentVal = o.isPresent != null ? (o.isPresent ? '✓ Yes' : '✗ No') : '—';
    const lifeStage = o.lifeStage || '—';
    const coords = (o.latitude != null && o.longitude != null) ? `${Number(o.latitude).toFixed(4)}, ${Number(o.longitude).toFixed(4)}` : '—';
    const notes = o.notes ? escapeHtml(o.notes) : '';
    const createdBy = o.createdByName ? escapeHtml(o.createdByName) : '—';
    const updatedBy = o.updatedByName ? escapeHtml(o.updatedByName) : '—';
    const observedAt = o.observedAt ? formatDateTime(o.observedAt) : '—';

    let actions = '';
    if (canEdit) {
      if (isTrap) actions += `<button class="btn-outline" style="padding:3px 8px;font-size:0.72rem;" data-edit-obs="${o.id}">Edit</button> `;
      actions += `<button class="btn-outline" style="padding:3px 8px;font-size:0.72rem;color:var(--red);border-color:var(--red);" data-del-obs="${o.id}">Del</button>`;
    }

    const thresholdExceeded = o.thresholdCount != null && o.count != null && o.count > o.thresholdCount;
    const rowStyle = thresholdExceeded ? ' style="background:rgba(220,38,38,0.12);box-shadow:inset 0 0 8px rgba(220,38,38,0.25);"' : '';

    rows += `
      <tr${rowStyle}>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--text-dim);text-align:center;">${rowNum}</td>
        <td>${typeTag} ${plannedTag}</td>
        <td>${isTrap ? trapName : '—'}</td>
        <td>${pestName}</td>
        <td>${mode}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;">${countVal}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;">${thresholdVal}</td>
        <td>${presentVal}</td>
        <td>${lifeStage}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--text-dim);">${coords}</td>
        <td style="font-size:0.78rem;color:var(--text-dim);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${notes}">${notes || '—'}</td>
        ${isCompleted ? `<td style="font-size:0.78rem;color:var(--text-dim);white-space:nowrap;">${observedAt}</td>` : ''}
        <td style="font-size:0.78rem;color:var(--text-dim);">${createdBy}</td>
        <td style="font-size:0.78rem;color:var(--text-dim);">${updatedBy}</td>
        <td style="white-space:nowrap;">${actions}</td>
      </tr>
    `;
  });

  wrap.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr>
          <th style="width:1%;text-align:center;">#</th><th>Type</th><th>Trap</th><th>Pest</th><th>Mode</th>
          <th>Count</th><th>Threshold</th><th>Present</th><th>Stage</th><th>Coords</th><th>Notes</th>${isCompleted ? '<th>Observed At</th>' : ''}<th>Created by</th><th>Updated by</th><th style="width:1%;white-space:nowrap;"></th>
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

/* ── Scouting Map Modal ──────────────────────────────────────────────────────── */

function showScoutingMapModal(session, observations) {
  // Sort ALL observations by observedAt first, assign sequence numbers (1..n),
  // then keep only those that have GPS — preserving their original sequence number.
  const sorted = [...observations].sort((a, b) => {
    if (a.observedAt && b.observedAt) return new Date(a.observedAt) - new Date(b.observedAt);
    if (a.observedAt) return -1;
    if (b.observedAt) return 1;
    return 0;
  });

  const gpsObs = sorted
    .map((o, idx) => ({ ...o, _seq: idx + 1 }))
    .filter(o => o.latitude != null && o.longitude != null);

  // Find the field boundary if we have a fieldId
  const field = session.fieldId ? cachedFields.find(f => f.id === session.fieldId) : null;

  // Build overlay
  const overlay = document.createElement('div');
  overlay.id = 'scoutingMapOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9000;
    background:rgba(0,0,0,0.55);
    display:flex;align-items:center;justify-content:center;
  `;

  const hasGps = gpsObs.length > 0;
  const noGpsMsg = !hasGps
    ? `<div style="text-align:center;padding:24px 0;font-size:0.88rem;color:var(--text-dim);">
        No GPS coordinates recorded on any observations in this session.
       </div>`
    : '';

  overlay.innerHTML = `
    <div style="
      background:var(--surface);border:1px solid var(--border);border-radius:14px;
      width:min(900px,95vw);height:min(680px,92vh);
      display:flex;flex-direction:column;overflow:hidden;
      box-shadow:0 24px 60px rgba(0,0,0,0.35);
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border);flex-shrink:0;">
        <div>
          <div style="font-weight:700;font-size:1rem;color:var(--text);">🗺 Scouting Route Map</div>
          <div style="font-size:0.78rem;color:var(--text-dim);margin-top:2px;">
            Session ${session.id.substring(0,8)} · ${gpsObs.length} GPS point${gpsObs.length !== 1 ? 's' : ''}${field ? ' · ' + escapeHtml(field.name) : ''}
          </div>
        </div>
        <button id="closeScoutingMap" style="
          background:none;border:none;cursor:pointer;font-size:1.3rem;
          color:var(--text-dim);padding:4px 8px;border-radius:6px;
        " title="Close">✕</button>
      </div>
      ${noGpsMsg}
      <div id="scoutingMapLeaflet" style="flex:1;min-height:0;${!hasGps ? 'display:none;' : ''}"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  function destroy() {
    if (_scoutingMap) { _scoutingMap.remove(); _scoutingMap = null; }
    overlay.remove();
    document.removeEventListener('keydown', escHandler);
  }
  const escHandler = e => { if (e.key === 'Escape') destroy(); };
  document.addEventListener('keydown', escHandler);
  overlay.addEventListener('click', e => { if (e.target === overlay) destroy(); });
  document.getElementById('closeScoutingMap').addEventListener('click', destroy);

  if (!hasGps) return;

  // Wait for next frame so the container has dimensions
  requestAnimationFrame(() => {
    const L = window.L;
    if (!L) { showToast('Map library not available yet — please try again.', 'error'); destroy(); return; }

    const mapEl = document.getElementById('scoutingMapLeaflet');
    if (!mapEl) return;

    _scoutingMap = L.map(mapEl, { zoomControl: true, scrollWheelZoom: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 22,
    }).addTo(_scoutingMap);

    const bounds = [];

    // ── Field boundary ─────────────────────────────────────────────────────
    if (field?.geoBoundary) {
      try {
        const parsed = JSON.parse(field.geoBoundary);
        const layer = L.geoJSON(parsed, {
          style: {
            color: field.boundaryColor || '#2b6e4f',
            weight: 2.5,
            fillOpacity: 0.10,
            dashArray: '6 4',
          },
        }).addTo(_scoutingMap);
        layer.bindTooltip(escapeHtml(field.name), { permanent: false, direction: 'center' });
        layer.getBounds && bounds.push(...Object.values(layer.getBounds()));
        try { _scoutingMap.fitBounds(layer.getBounds(), { padding: [40, 40] }); } catch {}
      } catch { /* ignore invalid GeoJSON */ }
    }

    // ── Observation markers ────────────────────────────────────────────────
    gpsObs.forEach((o, idx) => {
      const num    = o._seq;
      const lat    = Number(o.latitude);
      const lng    = Number(o.longitude);
      const isPresenceMode = o.captureMode === 'Presence' || o.captureMode === 1;
      const hasCount       = !isPresenceMode && o.count != null;
      const exceeded       = hasCount && o.thresholdCount != null && o.count > o.thresholdCount;
      const bgColor        = exceeded ? '#dc2626' : '#2b6e4f';

      // Numbered circle icon
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:28px;height:28px;border-radius:50%;
          background:${bgColor};color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:700;font-family:sans-serif;
          border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.35);
        ">${num}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const pestName   = o.pestName  || (o.isUnknownPest ? 'Unknown pest' : '—');
      const trapName   = o.trapName  || '—';
      const lifeStage  = o.lifeStage || '—';
      const observedAt = o.observedAt ? formatDateTime(o.observedAt) : '—';
      const notes      = o.notes     ? escapeHtml(o.notes) : '';
      const isTrap     = o.observationType === 'Trap' || o.observationType === 0;

      // Count / presence row
      let countRow;
      if (isPresenceMode) {
        const presentLabel = o.isPresent === true ? '✓ Present' : o.isPresent === false ? '✗ Absent' : '—';
        countRow = `<tr><td style="color:#666;padding-right:8px;">Presence</td><td><strong>${presentLabel}</strong></td></tr>`;
      } else {
        const countDisplay = o.count != null ? o.count : '—';
        const thresholdRow = (o.thresholdCount != null)
          ? ` <span style="color:#999;font-size:0.75rem;">/ ${o.thresholdCount} threshold${exceeded ? '' : ''}</span>${exceeded ? ' <span style="color:#dc2626;font-weight:700;">⚠️ exceeded</span>' : ''}`
          : '';
        countRow = `<tr><td style="color:#666;padding-right:8px;">Count</td><td><strong>${countDisplay}</strong>${thresholdRow}</td></tr>`;
      }

      const popupHtml = `
        <div style="min-width:200px;font-size:0.82rem;line-height:1.6;">
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:6px;color:#1a2e1a;">
            #${num} · ${escapeHtml(pestName)}
          </div>
          <table style="border-collapse:collapse;width:100%;">
            <tr><td style="color:#666;padding-right:8px;">Type</td><td>${isTrap ? '🕸️ Trap' : '👁 AdHoc'}</td></tr>
            ${isTrap ? `<tr><td style="color:#666;padding-right:8px;">Trap</td><td>${escapeHtml(trapName)}</td></tr>` : ''}
            ${countRow}
            <tr><td style="color:#666;padding-right:8px;">Life stage</td><td>${escapeHtml(lifeStage)}</td></tr>
            <tr><td style="color:#666;padding-right:8px;">Observed at</td><td>${escapeHtml(observedAt)}</td></tr>
            <tr><td style="color:#666;padding-right:8px;">GPS</td><td style="font-size:0.75rem;">${lat.toFixed(5)}, ${lng.toFixed(5)}</td></tr>
            ${notes ? `<tr><td style="color:#666;padding-right:8px;vertical-align:top;">Notes</td><td>${notes}</td></tr>` : ''}
          </table>
        </div>
      `;

      L.marker([lat, lng], { icon })
        .bindPopup(popupHtml, { maxWidth: 280 })
        .addTo(_scoutingMap);

      bounds.push([lat, lng]);
    });

    // Fit all points
    if (bounds.length > 0) {
      try { _scoutingMap.fitBounds(bounds, { padding: [50, 50] }); } catch {}
    }

    // Draw a faint polyline connecting the route in order
    if (gpsObs.length > 1) {
      const latlngs = gpsObs.map(o => [Number(o.latitude), Number(o.longitude)]);
      L.polyline(latlngs, { color: '#2b6e4f', weight: 1.5, opacity: 0.5, dashArray: '4 6' }).addTo(_scoutingMap);
    }
  });
}

let _scoutingMap = null;

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
