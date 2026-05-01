import { getSessions, createPlannedSession, updatePlannedSession, completeSession, deleteSession } from '../api/sessions.js';
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
    const [sessionsRes, usersRes, farmsRes, fieldsRes] = await Promise.all([
      getSessions(),
      getUsers(),
      getFarms(),
      getFields(),
    ]);
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

  const [freshUsers, freshFarms, allFields] = await Promise.all([
    getUsers().then(r => r.data || []).catch(() => cachedUsers),
    getFarms().then(r => r.data || []).catch(() => cachedFarms),
    getFields().then(r => r.data || []).catch(() => cachedFields),
  ]);

  const selectedFieldId = existing?.fieldId ?? '';
  const selectedFarmId = allFields.find(f => f.id === selectedFieldId)?.farmId ?? '';

  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label class="input-label">Farm <span style="color:var(--red);">*</span></label>
        <select class="input-field" id="sessionFarm">
          <option value="">— Select farm —</option>
          ${freshFarms.map(f => `<option value="${f.id}" ${selectedFarmId === f.id ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="input-label">Field <span style="color:var(--red);">*</span></label>
        <select class="input-field" id="sessionField">
          <option value="">— Select field —</option>
        </select>
      </div>
      <div>
        <label class="input-label">Scout <span style="color:var(--red);">*</span></label>
        <select class="input-field" id="sessionScout">
          <option value="">— Select scout —</option>
          ${freshUsers.filter(u => u.isActive).map(u => `<option value="${u.id}" ${existing?.scouterId === u.id ? 'selected' : ''}>${escapeHtml(u.firstName + ' ' + u.lastName)} (${escapeHtml(u.email)})</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="input-label">Scheduled Date <span style="color:var(--red);">*</span></label>
        <input class="input-field" type="date" id="sessionDate" value="${existing?.scheduledDate ? existing.scheduledDate.substring(0, 10) : ''}">
      </div>
      <div>
        <label class="input-label">Notes (optional)</label>
        <textarea class="input-field" rows="2" id="sessionNotes" placeholder="Session notes…">${escapeHtml(existing?.notes || '')}</textarea>
      </div>

      <div style="display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelSession">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveSession">${isEdit ? '💾 Update Session' : '📋 Create Planned Session'}</button>
      </div>
    </div>
  `;

  openModal({ title: isEdit ? 'Edit Planned Session' : 'Plan a Scouting Session', subtitle: isEdit ? 'Update the session details' : 'Set up a scouting session for a scout', content: form });

  function populateFieldSelect(farmId, selectedId = '') {
    const fieldSel = document.getElementById('sessionField');
    const filtered = allFields.filter(f => f.farmId === farmId);
    fieldSel.innerHTML = '<option value="">— Select field —</option>' +
      filtered.map(f => `<option value="${f.id}" ${f.id === selectedId ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('');
  }

  populateFieldSelect(selectedFarmId, selectedFieldId);
  document.getElementById('sessionFarm').addEventListener('change', e => populateFieldSelect(e.target.value, ''));

  document.getElementById('cancelSession').addEventListener('click', closeModal);
  document.getElementById('saveSession').addEventListener('click', async () => {
    const btn = document.getElementById('saveSession');

    const farmId = document.getElementById('sessionFarm').value || null;
    const fieldId = document.getElementById('sessionField').value || null;
    const scouterId = document.getElementById('sessionScout').value || null;
    const scheduledDate = document.getElementById('sessionDate').value || null;

    if (!farmId)        { showToast('Please select a farm.', 'error'); return; }
    if (!fieldId)       { showToast('Please select a field.', 'error'); return; }
    if (!scouterId)     { showToast('Please assign a scout.', 'error'); return; }
    if (!scheduledDate) { showToast('Please select a scheduled date.', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const notes = document.getElementById('sessionNotes').value.trim() || null;

      const payload = {
        scouterId,
        scheduledDate,
        fieldId,
        farmId,
        notes,
        observations: isEdit ? null : (existing?.observations?.filter(o => o.isPlanned !== false) ?? []),
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
