import { getSessionsPaged, createPlannedSession, updatePlannedSession, completeSession, deleteSession } from '../api/sessions.js';
import { getUsers } from '../api/roles.js';
import { getFarms } from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDateTime, formatTemperature } from '../utils/helpers.js';
import { getUser } from '../utils/storage.js';
import { navigate } from '../utils/router.js';

let cachedUsers = [];
let cachedFarms = [];
let cachedFields = [];

// ── Grid state ────────────────────────────────────────────────────────────────

const state = {
  page:     1,
  pageSize: 25,
  sortBy:   'date',
  sortDesc: true,
  status:   '',
  search:   '',
  farmId:   '',
  fieldId:  '',
};

let _container = null;

// ── Entry point ───────────────────────────────────────────────────────────────

export async function renderSessions(container) {
  _container = container;

  // Lock the content-area scroll so only the grid scrolls internally
  const prevCssText = container.style.cssText;
  container._cleanup = () => { container.style.cssText = prevCssText; };
  container.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;height:100%;';

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;flex-shrink:0;">
      <div>
        <div class="page-heading">Scouting Sessions</div>
        <div class="page-desc">Plan, track and review scouting runs</div>
      </div>
      <button class="btn-primary" id="planSessionBtn">＋ Plan Session</button>
    </div>
    <div class="card" id="sessionsTableCard" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;">
      <div id="sessionsFilterBar" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border);">
        <input type="text" id="sessSearch" class="input-field"
          placeholder="Search scout, farm or field…"
          value=""
          style="margin:0;flex:1;min-width:160px;max-width:280px;padding:6px 10px;font-size:0.8rem;" />
        <select id="sessStatus" class="input-field" style="margin:0;padding:6px 10px;font-size:0.8rem;width:auto;">
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="active">Active</option>
          <option value="planned">Planned</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>
      <div id="sessionsTable" style="overflow-x:auto;overflow-y:auto;flex:1;min-height:0;">
        <div class="card-p"><div class="skeleton skeleton-card" style="height:300px;"></div></div>
      </div>
      <div id="sessionsPagination"></div>
    </div>
  `;

  document.getElementById('planSessionBtn').addEventListener('click', () => showPlannedSessionModal());

  // Search (debounced)
  let _debounce;
  document.getElementById('sessSearch').addEventListener('input', e => {
    clearTimeout(_debounce);
    _debounce = setTimeout(() => {
      state.search = e.target.value.trim();
      state.page   = 1;
      loadTable();
    }, 350);
  });

  document.getElementById('sessStatus').addEventListener('change', e => {
    state.status = e.target.value;
    state.page   = 1;
    loadTable();
  });

  loadTable();
}

// ── Data fetch + render ───────────────────────────────────────────────────────

async function loadTable() {
  const tableEl = document.getElementById('sessionsTable');
  const pagEl   = document.getElementById('sessionsPagination');
  if (!tableEl) return;

  tableEl.innerHTML = `<div class="card-p"><div class="skeleton skeleton-card" style="height:200px;"></div></div>`;
  if (pagEl) pagEl.innerHTML = '';

  try {
    const res   = await getSessionsPaged({ ...state });
    const paged = res?.data;
    if (!paged) { tableEl.innerHTML = `<div class="card-p empty-state"><div class="empty-icon">⚠</div><p>Could not load sessions.</p></div>`; return; }

    renderTable(paged, tableEl, pagEl);
  } catch (err) {
    tableEl.innerHTML = `<div class="card-p empty-state"><div class="empty-icon">⚠</div><h3>Error</h3><p>${escapeHtml(err.message)}</p></div>`;
    showToast('Failed to load sessions: ' + err.message, 'error');
  }
}

// ── Table renderer ────────────────────────────────────────────────────────────

function thBtn(label, key) {
  const active = state.sortBy === key;
  const arrow  = active ? (state.sortDesc ? ' ▼' : ' ▲') : '';
  return `<th style="cursor:pointer;user-select:none;white-space:nowrap;" data-sort="${key}">${label}${arrow}</th>`;
}

function renderTable(paged, tableEl, pagEl) {
  const { items: sessions, totalCount, page, totalPages } = paged;
  const unit = getUser()?.temperatureUnit || 'C';

  if (sessions.length === 0) {
    tableEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🥾</div><h3>No sessions found</h3><p>Try adjusting your filters or plan a new session</p></div>`;
    if (pagEl) pagEl.innerHTML = '';
    return;
  }

  let rows = '';
  for (const s of sessions) {
    const isCompleted = !!s.completedAt;
    const isActive    = !!s.startedAt && !isCompleted;
    const isPlanned   = s.isPlanned && !s.startedAt && !isCompleted;

    let statusTag;
    if (isCompleted)  statusTag = tag('✓ Complete', 'blue');
    else if (isActive) statusTag = tag('● Active', 'green');
    else if (s.isPlanned) statusTag = tag('📋 Planned', 'amber');
    else statusTag = tag('—', 'gray');

    const weatherParts = [
      s.weatherConditions ? escapeHtml(s.weatherConditions) : null,
      s.temperatureCelsius != null ? formatTemperature(s.temperatureCelsius, unit) : null,
    ].filter(Boolean);
    const weatherDisplay = weatherParts.length ? weatherParts.join(', ') : '—';

    const trapCount   = s.trapObservationCount  || 0;
    const obsCount    = s.adHocObservationCount || 0;
    const itemsSummary = [
      trapCount ? `${trapCount} trap${trapCount > 1 ? 's' : ''}` : null,
      obsCount  ? `${obsCount} obs`  : null,
    ].filter(Boolean).join(', ') || '—';

    let dateDisplay, datePill;
    if (s.scheduledDate && !s.startedAt) {
      dateDisplay = formatDateTime(s.scheduledDate);
      datePill = `<span style="display:inline-block;font-size:0.62rem;font-weight:600;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.4);border-radius:20px;padding:1px 7px;vertical-align:middle;margin-left:5px;line-height:1.6;">Scheduled</span>`;
    } else if (s.startedAt && !s.completedAt) {
      dateDisplay = formatDateTime(s.startedAt);
      datePill = `<span style="display:inline-block;font-size:0.62rem;font-weight:600;background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.4);border-radius:20px;padding:1px 7px;vertical-align:middle;margin-left:5px;line-height:1.6;">Started</span>`;
    } else if (s.completedAt) {
      dateDisplay = formatDateTime(s.startedAt || s.completedAt);
      datePill = `<span style="display:inline-block;font-size:0.62rem;font-weight:600;background:rgba(129,140,248,0.15);color:#818cf8;border:1px solid rgba(129,140,248,0.4);border-radius:20px;padding:1px 7px;vertical-align:middle;margin-left:5px;line-height:1.6;">Completed</span>`;
    } else {
      dateDisplay = '—';
      datePill = '';
    }

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
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--text-dim);white-space:nowrap;">${dateDisplay}${datePill}</td>
        <td style="font-size:0.85rem;">${weatherDisplay}</td>
        <td style="font-size:0.85rem;">${itemsSummary}</td>
        <td style="font-family:'Fraunces',serif;font-weight:700;font-size:1.1rem;">${s.observationCount}</td>
        <td>${statusTag}</td>
        <td style="white-space:nowrap;">${actions}</td>
      </tr>
    `;
  }

  tableEl.innerHTML = `
    <table class="data-table" style="width:100%;min-width:760px;">
      <thead style="position:sticky;top:0;z-index:1;background:var(--surface);">
        <tr>
          <th>Session</th>
          ${thBtn('Scout',   'scout')}
          ${thBtn('Farm',    'farm')}
          ${thBtn('Field',   'field')}
          ${thBtn('Date',    'date')}
          <th>Weather</th>
          <th>Items</th>
          ${thBtn('Results', 'obs')}
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Sort click handlers
  tableEl.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sortBy === key) state.sortDesc = !state.sortDesc;
      else { state.sortBy = key; state.sortDesc = true; }
      state.page = 1;
      loadTable();
    });
  });

  // Action button handlers
  tableEl.querySelectorAll('[data-complete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.complete;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      try {
        await completeSession(id, {});
        showToast('Session completed!', 'success');
        loadTable();
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Complete';
      }
    });
  });

  tableEl.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this planned session?')) return;
      const id = btn.dataset.delete;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      try {
        await deleteSession(id);
        showToast('Session deleted.', 'success');
        loadTable();
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Delete';
      }
    });
  });

  tableEl.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.edit;
      const session = sessions.find(s => s.id === id);
      if (session) showPlannedSessionModal(session);
    });
  });

  tableEl.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate('/sessions/' + btn.dataset.view));
  });

  // Pagination bar
  if (pagEl) {
    const start = totalCount === 0 ? 0 : (page - 1) * state.pageSize + 1;
    const end   = Math.min(page * state.pageSize, totalCount);
    pagEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;
                  padding:10px 14px;border-top:1px solid var(--border);font-size:0.8rem;color:var(--text-dim);">
        <span>${start}–${end} of ${totalCount} sessions</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="btn-outline pg-btn" data-action="prev" style="padding:4px 10px;" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>
          <span style="font-size:0.78rem;">Page
            <input type="number" class="input-field pg-input" value="${page}" min="1" max="${totalPages || 1}"
              style="width:52px;padding:3px 6px;font-size:0.78rem;margin:0 4px;display:inline-block;" />
            of ${totalPages || 1}
          </span>
          <button class="btn-outline pg-btn" data-action="next" style="padding:4px 10px;" ${page >= (totalPages || 1) ? 'disabled' : ''}>Next ›</button>
          <select class="input-field pg-size" style="margin:0;padding:4px 8px;font-size:0.78rem;width:auto;">
            ${[10, 25, 50, 100].map(n => `<option value="${n}"${n === state.pageSize ? ' selected' : ''}>${n} / page</option>`).join('')}
          </select>
        </div>
      </div>
    `;

    pagEl.querySelectorAll('.pg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.action === 'prev' && state.page > 1)           { state.page--; loadTable(); }
        if (btn.dataset.action === 'next' && state.page < (totalPages || 1)) { state.page++; loadTable(); }
      });
    });
    pagEl.querySelector('.pg-input').addEventListener('change', e => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 1 && v <= (totalPages || 1)) { state.page = v; loadTable(); }
    });
    pagEl.querySelector('.pg-size').addEventListener('change', e => {
      state.pageSize = parseInt(e.target.value, 10);
      state.page = 1;
      loadTable();
    });
  }
}

/* ── Planned Session Modal ──────────────────────────────────────────────────── */

async function showPlannedSessionModal(existing = null) {
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
      loadTable();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = isEdit ? '💾 Update Session' : '📋 Create Planned Session';
    }
  });
}
