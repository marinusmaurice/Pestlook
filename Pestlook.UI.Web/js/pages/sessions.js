import { getSessions, createPlannedSession, updatePlannedSession, completeSession, deleteSession } from '../api/sessions.js';
import { getTraps } from '../api/traps.js';
import { getPests } from '../api/pests.js';
import { getUsers } from '../api/roles.js';
import { getFarms } from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDateTime, formatTemperature } from '../utils/helpers.js';
import { getUser } from '../utils/storage.js';
import { navigate } from '../utils/router.js';

let cachedTraps = [];
let cachedPests = [];
let cachedUsers = [];
let cachedFarms = [];
let cachedFields = [];

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
    const [sessionsRes, trapsRes, pestsRes, usersRes, farmsRes, fieldsRes] = await Promise.all([
      getSessions(),
      getTraps(),
      getPests(),
      getUsers(),
      getFarms(),
      getFields(),
    ]);
    cachedTraps = trapsRes.data || [];
    cachedPests = pestsRes.data || [];
    cachedUsers = usersRes.data || [];
    cachedFarms = farmsRes.data || [];
    cachedFields = fieldsRes.data || [];
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

    const farmDisplay  = s.farmName  ? escapeHtml(s.farmName)  : '<span style="color:var(--text-dim);">—</span>';
    const fieldDisplay = s.fieldName ? escapeHtml(s.fieldName) : '<span style="color:var(--text-dim);">—</span>';

    rows += `
      <tr>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--text-dim);">${s.id.substring(0, 8)}</td>
        <td><div style="font-weight:500;color:var(--text);">${escapeHtml(s.scouterName || '—')}</div></td>
        <td style="font-size:0.85rem;">${farmDisplay}</td>
        <td style="font-size:0.85rem;">${fieldDisplay}</td>
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
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr><th>Session</th><th>Scout</th><th>Farm</th><th>Field</th><th>Date</th><th>Weather</th><th>Items</th><th>Results</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
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

async function showPlannedSessionModal(listContainer, existing = null) {
  const isEdit = !!existing;

  const [freshPests, freshTraps, freshUsers, freshFarms, allFields] = await Promise.all([
    getPests().then(r => r.data || []).catch(() => cachedPests),
    getTraps().then(r => r.data || []).catch(() => cachedTraps),
    getUsers().then(r => r.data || []).catch(() => cachedUsers),
    getFarms().then(r => r.data || []).catch(() => cachedFarms),
    getFields().then(r => r.data || []).catch(() => cachedFields),
  ]);

  // Group existing planned observations by their observationGroupId so the modal
  // shows one row per group with its repeat count instead of N individual rows.
  const items = existing?.observations?.length
    ? (() => {
        const groups = {};
        const result = [];
        for (const o of (existing.observations || [])) {
          if (o.isPlanned === false) continue;
          const gid = o.observationGroupId;
          const obsType = typeof o.observationType === 'number'
            ? (o.observationType === 0 ? 'Trap' : 'AdHoc')
            : o.observationType;
          if (gid) {
            if (!groups[gid]) groups[gid] = { obs: o, count: 0, observationType: obsType };
            groups[gid].count++;
          } else {
            // Legacy ungrouped observation — show as individual row with count 1
            result.push({
              observationGroupId: null,
              observationType: obsType,
              trapId: o.trapId || '',
              pestId: o.pestId || '',
              captureMode: o.captureMode ?? '',
              repeatCount: 1,
            });
          }
        }
        for (const [gid, { obs, count, observationType }] of Object.entries(groups)) {
          result.push({
            observationGroupId: gid,
            observationType,
            trapId: obs.trapId || '',
            pestId: obs.pestId || '',
            captureMode: obs.captureMode ?? '',
            repeatCount: count,
          });
        }
        return result;
      })()
    : [];

  const selectedFieldId = existing?.fieldId ?? '';
  const selectedFarmId = allFields.find(f => f.id === selectedFieldId)?.farmId ?? '';

  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label class="input-label">Farm (optional)</label>
        <select class="input-field" id="sessionFarm">
          <option value="">— Select farm —</option>
          ${freshFarms.map(f => `<option value="${f.id}" ${selectedFarmId === f.id ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="input-label">Field (optional)</label>
        <select class="input-field" id="sessionField">
          <option value="">— Select field —</option>
        </select>
      </div>
      <div>
        <label class="input-label">Scout (optional)</label>
        <select class="input-field" id="sessionScout">
          <option value="">— Assign later —</option>
          ${freshUsers.filter(u => u.isActive).map(u => `<option value="${u.id}" ${existing?.scouterId === u.id ? 'selected' : ''}>${escapeHtml(u.firstName + ' ' + u.lastName)} (${escapeHtml(u.email)})</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="input-label">Scheduled Date (optional)</label>
        <input class="input-field" type="date" id="sessionDate" value="${existing?.scheduledDate ? existing.scheduledDate.substring(0, 10) : ''}">
      </div>
      <div>
        <label class="input-label">Notes (optional)</label>
        <textarea class="input-field" rows="2" id="sessionNotes" placeholder="Session notes…">${escapeHtml(existing?.notes || '')}</textarea>
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

  function populateFieldSelect(farmId, selectedId = '') {
    const fieldSel = document.getElementById('sessionField');
    const filtered = allFields.filter(f => f.farmId === farmId);
    fieldSel.innerHTML = '<option value="">— Select field —</option>' +
      filtered.map(f => `<option value="${f.id}" ${f.id === selectedId ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('');
  }

  function getFilteredTraps() {
    const fieldId = document.getElementById('sessionField')?.value || '';
    const farmId  = document.getElementById('sessionFarm')?.value  || '';
    if (fieldId) return freshTraps.filter(t => t.fieldId === fieldId);
    if (farmId) {
      const farmFieldIds = new Set(allFields.filter(f => f.farmId === farmId).map(f => f.id));
      return freshTraps.filter(t => farmFieldIds.has(t.fieldId));
    }
    return freshTraps;
  }

  function clearInvalidTraps() {
    syncItemsFromDom();
    const validIds = new Set(getFilteredTraps().map(t => t.id));
    for (const item of items) {
      if (item.observationType === 'Trap' && item.trapId && !validIds.has(item.trapId)) {
        item.trapId = '';
      }
    }
    renderItems();
  }

  populateFieldSelect(selectedFarmId, selectedFieldId);
  document.getElementById('sessionFarm').addEventListener('change', e => {
    populateFieldSelect(e.target.value, '');
    clearInvalidTraps();
  });
  document.getElementById('sessionField').addEventListener('change', () => clearInvalidTraps());

  const listEl = document.getElementById('obsItemsList');

  // Reads every visible [data-field] input/select from the DOM into the items
  // array so that re-renders and the save handler always see current values,
  // regardless of whether change events fired correctly.
  function syncItemsFromDom() {
    listEl.querySelectorAll('[data-field]').forEach(el => {
      const idx = parseInt(el.dataset.idx);
      if (idx >= 0 && idx < items.length) {
        items[idx][el.dataset.field] = el.type === 'number'
          ? (el.value !== '' ? Number(el.value) : '')
          : (el.value || '');
      }
    });
  }

  function renderItems() {
    listEl.innerHTML = '';
    if (items.length === 0) {
      listEl.innerHTML = '<div style="font-size:0.8rem;color:var(--text-dim);text-align:center;padding:12px;">No items yet. Add traps or observations above.</div>';
      return;
    }
    items.forEach((item, idx) => {
      const isTrap = item.observationType === 'Trap';
      const typeLabel = isTrap ? '🕸️ Trap' : '👁 Obs';
      const typeColor = isTrap ? 'var(--green)' : 'var(--amber)';
      const trapSelectHtml = isTrap
        ? `<select class="input-field" style="font-size:0.78rem;" data-field="trapId" data-idx="${idx}">
              <option value="">— Select trap —</option>
              ${getFilteredTraps().map(t => `<option value="${t.id}" ${item.trapId === t.id ? 'selected' : ''}>${escapeHtml(t.name)}${t.barcode ? ' (' + escapeHtml(t.barcode) + ')' : ''}</option>`).join('')}
            </select>`
        : '';
      const repeatCountHtml = !isTrap
        ? `<div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:0.72rem;color:var(--text-dim);white-space:nowrap;">Number of obs:</span>
              <input class="input-field" type="number" min="1" style="font-size:0.78rem;width:80px;" data-field="repeatCount" data-idx="${idx}" value="${item.repeatCount || 1}" title="Number of observation records to create">
            </div>`
        : '';

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:var(--surface2);border-radius:8px;border:1px solid var(--border);';
      row.innerHTML = `
        <span style="font-size:0.7rem;font-weight:600;color:${typeColor};min-width:40px;padding-top:6px;">${typeLabel}</span>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;">
          ${trapSelectHtml}
          <select class="input-field" style="font-size:0.78rem;" data-field="pestId" data-idx="${idx}">
            <option value="">— Any pest —</option>
            ${freshPests.map(p => `<option value="${p.id}" ${item.pestId === p.id ? 'selected' : ''}>${escapeHtml(p.commonName)}</option>`).join('')}
          </select>
          <select class="input-field" style="font-size:0.78rem;" data-field="captureMode" data-idx="${idx}">
            <option value="">— Capture mode —</option>
            <option value="Count" ${item.captureMode === 'Count' || item.captureMode === 0 ? 'selected' : ''}>Count</option>
            <option value="Presence" ${item.captureMode === 'Presence' || item.captureMode === 1 ? 'selected' : ''}>Presence</option>
          </select>
          ${repeatCountHtml}
        </div>
        <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:1rem;padding:4px;align-self:flex-start;" data-remove="${idx}" title="Remove">×</button>
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
        syncItemsFromDom();
        items.splice(parseInt(btn.dataset.remove), 1);
        renderItems();
      });
    });
  }

  renderItems();

  document.getElementById('addTrapItem').addEventListener('click', () => {
    syncItemsFromDom();
    items.push({ observationGroupId: null, observationType: 'Trap', trapId: '', pestId: '', captureMode: '', repeatCount: 1 });
    renderItems();
  });
  document.getElementById('addAdHocItem').addEventListener('click', () => {
    syncItemsFromDom();
    items.push({ observationGroupId: null, observationType: 'AdHoc', trapId: '', pestId: '', captureMode: '', repeatCount: 1 });
    renderItems();
  });

  document.getElementById('cancelSession').addEventListener('click', closeModal);
  document.getElementById('saveSession').addEventListener('click', async () => {
    const btn = document.getElementById('saveSession');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const scouterId = document.getElementById('sessionScout').value || null;
      const scheduledDate = document.getElementById('sessionDate').value || null;
      const fieldId = document.getElementById('sessionField').value || null;
      const farmId = document.getElementById('sessionFarm').value || null;
      const notes = document.getElementById('sessionNotes').value.trim() || null;

      syncItemsFromDom();
      const observations = items.map(i => ({
        observationGroupId: i.observationGroupId || null,
        observationType: i.observationType,
        trapId: i.trapId || null,
        pestId: i.pestId || null,
        captureMode: i.captureMode || null,
        repeatCount: parseInt(i.repeatCount) || 1,
      }));

      const payload = {
        scouterId,
        scheduledDate,
        fieldId,
        farmId,
        notes,
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
