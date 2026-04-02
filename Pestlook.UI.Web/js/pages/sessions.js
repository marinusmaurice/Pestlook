import { getSessions, createPlannedSession, updatePlannedSession, completeSession, deleteSession } from '../api/sessions.js';
import { getTraps } from '../api/traps.js';
import { getPests } from '../api/pests.js';
import { getUsers } from '../api/roles.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDateTime, formatTemperature, toCelsiusForStorage, temperatureUnitLabel, LifeStageValues } from '../utils/helpers.js';
import { getUser } from '../utils/storage.js';
import { navigate } from '../utils/router.js';

let cachedTraps = [];
let cachedPests = [];
let cachedUsers = [];

export async function renderSessions(container) {
  setPageTitle('Scouting Sessions');
  setTopbarCta('＋ Plan Session', () => showPlannedSessionModal(container));

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;">
      <div>
        <div class="page-heading">Scouting Sessions</div>
        <div class="page-desc">Plan, track and review scouting runs</div>
      </div>
    </div>
    <div class="card" id="sessionsTable"><div class="card-p"><div class="skeleton skeleton-card" style="height:300px;"></div></div></div>
  `;

  try {
    const [sessionsRes, trapsRes, pestsRes, usersRes] = await Promise.all([
      getSessions(),
      getTraps(),
      getPests(),
      getUsers(),
    ]);
    cachedTraps = trapsRes.data || [];
    cachedPests = pestsRes.data || [];
    cachedUsers = usersRes.data || [];
    const sessions = sessionsRes.data || [];
    renderTable(sessions, container);
  } catch (err) {
    showToast('Failed to load sessions: ' + err.message, 'error');
  }
}

/* ── Table ──────────────────────────────────────────────────────────────────── */

function renderTable(sessions, container) {
  const el = document.getElementById('sessionsTable');
  const unit = getUser()?.temperatureUnit || 'C';

  if (sessions.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🥾</div><h3>No sessions yet</h3><p>Plan a scouting session to get started</p></div>`;
    return;
  }

  let rows = '';
  for (const s of sessions) {
    const isCompleted = !!s.completedAt;
    const isActive = !!s.startedAt && !isCompleted;
    const isPlanned = s.isPlanned && !s.startedAt && !isCompleted;

    let statusTag;
    if (isCompleted) statusTag = tag('✓ Complete', 'blue');
    else if (isActive) statusTag = tag('● Active', 'green');
    else if (s.isPlanned) statusTag = tag('📋 Planned', 'amber');
    else statusTag = tag('—', 'gray');

    const weatherParts = [
      s.weatherConditions ? escapeHtml(s.weatherConditions) : null,
      s.temperatureCelsius != null ? formatTemperature(s.temperatureCelsius, unit) : null,
    ].filter(Boolean);
    const weatherDisplay = weatherParts.length ? weatherParts.join(', ') : '—';

    const trapCount = (s.observations || []).filter(o => o.observationType === 'Trap' || o.observationType === 0).length;
    const obsCount = (s.observations || []).filter(o => o.observationType === 'AdHoc' || o.observationType === 1).length;
    const itemsSummary = [trapCount ? `${trapCount} trap${trapCount > 1 ? 's' : ''}` : null, obsCount ? `${obsCount} obs` : null].filter(Boolean).join(', ') || '—';

    const dateDisplay = s.scheduledDate ? formatDateTime(s.scheduledDate) : (s.startedAt ? formatDateTime(s.startedAt) : '—');

    let actions = '';
    actions += `<button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;" data-view="${s.id}">View</button> `;
    if (isPlanned) {
      actions += `<button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;" data-edit="${s.id}">Edit</button> `;
      actions += `<button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;color:var(--red);border-color:var(--red);" data-delete="${s.id}">Delete</button>`;
    }
    if (isActive) {
      actions += `<button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;" data-complete="${s.id}">Complete</button>`;
    }

    rows += `
      <tr>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--text-dim);">${s.id.substring(0, 8)}</td>
        <td><div style="font-weight:500;color:var(--text);">${escapeHtml(s.scouterName || '—')}</div></td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--text-dim);">${dateDisplay}</td>
        <td>${weatherDisplay}</td>
        <td style="font-size:0.85rem;">${itemsSummary}</td>
        <td style="font-family:'Fraunces',serif;font-weight:700;font-size:1.1rem;">${s.observationCount}</td>
        <td>${statusTag}</td>
        <td style="white-space:nowrap;">${actions}</td>
      </tr>
    `;
  }

  el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Session</th><th>Scout</th><th>Date</th><th>Weather</th><th>Items</th><th>Results</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  el.querySelectorAll('[data-complete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.complete;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      try {
        await completeSession(id, {});
        showToast('Session completed!', 'success');
        renderSessions(container);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Complete';
      }
    });
  });

  el.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this planned session?')) return;
      const id = btn.dataset.delete;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      try {
        await deleteSession(id);
        showToast('Session deleted.', 'success');
        renderSessions(container);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Delete';
      }
    });
  });

  el.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.edit;
      const session = sessions.find(s => s.id === id);
      if (session) showPlannedSessionModal(container, session);
    });
  });

  el.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate('/sessions/' + btn.dataset.view));
  });
}

/* ── Planned Session Modal ──────────────────────────────────────────────────── */

function showPlannedSessionModal(listContainer, existing = null) {
  const isEdit = !!existing;
  const unit = getUser()?.temperatureUnit || 'C';
  const unitLabel = temperatureUnitLabel(unit);

  // Pre-populate observation items from existing session
  const items = existing?.observations?.length
    ? existing.observations.map(o => ({
        observationType: typeof o.observationType === 'number' ? (o.observationType === 0 ? 'Trap' : 'AdHoc') : o.observationType,
        trapId: o.trapId || '',
        pestId: o.pestId || '',
        captureMode: o.captureMode ?? '',
        count: o.count ?? '',
        isPresent: o.isPresent ?? '',
        latitude: o.latitude ?? '',
        longitude: o.longitude ?? '',
        isUnknownPest: o.isUnknownPest || false,
        notes: o.notes || '',
        lifeStage: o.lifeStage ?? '',
      }))
    : [];

  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label class="input-label">Scout (optional)</label>
        <select class="input-field" id="sessionScout">
          <option value="">— Assign later —</option>
          ${cachedUsers.map(u => `<option value="${u.id}" ${existing?.scouterId === u.id ? 'selected' : ''}>${escapeHtml(u.firstName + ' ' + u.lastName)} (${escapeHtml(u.email)})</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="input-label">Scheduled Date (optional)</label>
        <input class="input-field" type="date" id="sessionDate" value="${existing?.scheduledDate ? existing.scheduledDate.substring(0, 10) : ''}">
      </div>
      <div>
        <label class="input-label">Weather Conditions</label>
        <input class="input-field" type="text" id="sessionWeather" placeholder="e.g. Clear, light breeze" value="${escapeHtml(existing?.weatherConditions || '')}">
      </div>
      <div>
        <label class="input-label">Temperature (${unitLabel})</label>
        <input class="input-field" type="number" step="0.1" id="sessionTemp" placeholder="e.g. ${unit === 'F' ? '75' : '24'}" value="${existing?.temperatureCelsius != null ? (unit === 'F' ? ((existing.temperatureCelsius * 9 / 5) + 32).toFixed(1) : existing.temperatureCelsius) : ''}">
      </div>
      <div>
        <label class="input-label">Notes (optional)</label>
        <textarea class="input-field" rows="2" id="sessionNotes" placeholder="Any notes…">${escapeHtml(existing?.notes || '')}</textarea>
      </div>

      <hr style="border-color:var(--border);margin:4px 0;">

      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <label class="input-label" style="margin:0;">Observation Items</label>
          <div style="display:flex;gap:6px;">
            <button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;" id="addTrapItem">＋ Trap</button>
            <button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;" id="addAdHocItem">＋ Observation</button>
          </div>
        </div>
        <div id="obsItemsList" style="margin-top:10px;display:flex;flex-direction:column;gap:8px;"></div>
      </div>

      <div style="display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelSession">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveSession">${isEdit ? '💾 Update Session' : '📋 Create Planned Session'}</button>
      </div>
    </div>
  `;

  openModal({ title: isEdit ? 'Edit Planned Session' : 'Plan a Scouting Session', subtitle: isEdit ? 'Update the session details and items' : 'Set up traps and observations for a scout', content: form });

  const listEl = document.getElementById('obsItemsList');

  function renderItems() {
    listEl.innerHTML = '';
    if (items.length === 0) {
      listEl.innerHTML = '<div style="font-size:0.8rem;color:var(--text-dim);text-align:center;padding:12px;">No items yet. Add traps or observations above.</div>';
      return;
    }
    items.forEach((item, idx) => {
      const isTrap = item.observationType === 'Trap';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;padding:8px 10px;background:var(--surface2);border-radius:8px;border:1px solid var(--border);';
      row.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:0.7rem;font-weight:600;color:${isTrap ? 'var(--green)' : 'var(--amber)'};min-width:40px;">${isTrap ? '🪤 Trap' : '👁 Obs'}</span>
          ${isTrap ? `
            <select class="input-field" style="flex:2;font-size:0.78rem;padding:4px 8px;" data-field="trapId" data-idx="${idx}">
              <option value="">— Select trap —</option>
              ${cachedTraps.map(t => `<option value="${t.id}" ${item.trapId === t.id ? 'selected' : ''}>${escapeHtml(t.name)}${t.barcode ? ' (' + escapeHtml(t.barcode) + ')' : ''}</option>`).join('')}
            </select>
          ` : ''}
          <select class="input-field" style="flex:2;font-size:0.78rem;padding:4px 8px;" data-field="pestId" data-idx="${idx}">
            <option value="">— Any pest —</option>
            ${cachedPests.map(p => `<option value="${p.id}" ${item.pestId === p.id ? 'selected' : ''}>${escapeHtml(p.commonName)}</option>`).join('')}
          </select>
          <select class="input-field" style="flex:1;font-size:0.78rem;padding:4px 8px;" data-field="captureMode" data-idx="${idx}">
            <option value="">—</option>
            <option value="Count" ${item.captureMode === 'Count' || item.captureMode === 0 ? 'selected' : ''}>Count</option>
            <option value="Presence" ${item.captureMode === 'Presence' || item.captureMode === 1 ? 'selected' : ''}>Presence</option>
          </select>
          <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:1rem;padding:4px;" data-remove="${idx}" title="Remove">×</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:6px;padding-left:48px;flex-wrap:wrap;">
          <input class="input-field" style="width:70px;font-size:0.75rem;padding:4px 6px;" type="number" placeholder="Count" data-field="count" data-idx="${idx}" value="${item.count}">
          <label style="font-size:0.72rem;color:var(--text-dim);display:flex;align-items:center;gap:4px;"><input type="checkbox" data-field="isPresent" data-idx="${idx}" ${item.isPresent === true ? 'checked' : ''}> Present</label>
          <select class="input-field" style="width:90px;font-size:0.75rem;padding:4px 6px;" data-field="lifeStage" data-idx="${idx}">
            <option value="">Stage…</option>
            ${Object.keys(LifeStageValues).map(ls => `<option value="${ls}" ${item.lifeStage === ls ? 'selected' : ''}>${ls}</option>`).join('')}
          </select>
          <input class="input-field" style="width:80px;font-size:0.75rem;padding:4px 6px;" type="number" step="any" placeholder="Lat" data-field="latitude" data-idx="${idx}" value="${item.latitude}">
          <input class="input-field" style="width:80px;font-size:0.75rem;padding:4px 6px;" type="number" step="any" placeholder="Lng" data-field="longitude" data-idx="${idx}" value="${item.longitude}">
          <label style="font-size:0.72rem;color:var(--text-dim);display:flex;align-items:center;gap:4px;"><input type="checkbox" data-field="isUnknownPest" data-idx="${idx}" ${item.isUnknownPest ? 'checked' : ''}> Unknown pest</label>
          <input class="input-field" style="flex:1;min-width:100px;font-size:0.75rem;padding:4px 6px;" type="text" placeholder="Notes" data-field="notes" data-idx="${idx}" value="${escapeHtml(item.notes)}">
        </div>
      `;
      listEl.appendChild(row);
    });

    // Bind change handlers
    listEl.querySelectorAll('[data-field]').forEach(el => {
      const evtName = el.type === 'checkbox' ? 'change' : (el.tagName === 'SELECT' ? 'change' : 'input');
      el.addEventListener(evtName, () => {
        const idx = parseInt(el.dataset.idx);
        const field = el.dataset.field;
        if (el.type === 'checkbox') {
          items[idx][field] = el.checked;
        } else if (el.type === 'number') {
          items[idx][field] = el.value !== '' ? Number(el.value) : '';
        } else {
          items[idx][field] = el.value || '';
        }
      });
    });
    listEl.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        items.splice(parseInt(btn.dataset.remove), 1);
        renderItems();
      });
    });
  }

  renderItems();

  document.getElementById('addTrapItem').addEventListener('click', () => {
    items.push({ observationType: 'Trap', trapId: '', pestId: '', captureMode: '', count: '', isPresent: '', latitude: '', longitude: '', isUnknownPest: false, notes: '', lifeStage: '' });
    renderItems();
  });
  document.getElementById('addAdHocItem').addEventListener('click', () => {
    items.push({ observationType: 'AdHoc', trapId: '', pestId: '', captureMode: '', count: '', isPresent: '', latitude: '', longitude: '', isUnknownPest: false, notes: '', lifeStage: '' });
    renderItems();
  });

  document.getElementById('cancelSession').addEventListener('click', closeModal);
  document.getElementById('saveSession').addEventListener('click', async () => {
    const btn = document.getElementById('saveSession');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const tempRaw = document.getElementById('sessionTemp').value.trim();
      const temperatureCelsius = tempRaw ? toCelsiusForStorage(parseFloat(tempRaw), unit) : null;
      const scouterId = document.getElementById('sessionScout').value || null;
      const scheduledDate = document.getElementById('sessionDate').value || null;

      const observations = items.map(i => ({
        observationType: i.observationType,
        trapId: i.trapId || null,
        pestId: i.pestId || null,
        captureMode: i.captureMode || null,
        count: i.count !== '' && i.count !== null ? Number(i.count) : null,
        isPresent: typeof i.isPresent === 'boolean' ? i.isPresent : null,
        latitude: i.latitude !== '' && i.latitude !== null ? Number(i.latitude) : null,
        longitude: i.longitude !== '' && i.longitude !== null ? Number(i.longitude) : null,
        isUnknownPest: !!i.isUnknownPest,
        notes: i.notes || null,
        lifeStage: i.lifeStage || null,
      }));

      const payload = {
        scouterId,
        scheduledDate,
        weatherConditions: document.getElementById('sessionWeather').value.trim() || null,
        temperatureCelsius,
        notes: document.getElementById('sessionNotes').value.trim() || null,
        observations,
      };

      if (isEdit) {
        await updatePlannedSession(existing.id, payload);
        showToast('Session updated!', 'success');
      } else {
        await createPlannedSession(payload);
        showToast('Planned session created!', 'success');
      }
      closeModal();
      renderSessions(listContainer);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = isEdit ? '💾 Update Session' : '📋 Create Planned Session';
    }
  });
}
