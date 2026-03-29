import { getSessions, startSession, completeSession } from '../api/sessions.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, formatDateTime, formatTime } from '../utils/helpers.js';

export async function renderSessions(container) {
  setPageTitle('Scouting Sessions');
  setTopbarCta('＋ New Session', () => showStartSessionModal(container));

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;">
      <div>
        <div class="page-heading">Scouting Sessions</div>
        <div class="page-desc">Field scouting runs and their results</div>
      </div>
    </div>
    <div class="card" id="sessionsTable"><div class="card-p"><div class="skeleton skeleton-card" style="height:300px;"></div></div></div>
  `;

  try {
    const res = await getSessions();
    const sessions = res.data || [];
    renderTable(sessions, container);
  } catch (err) {
    showToast('Failed to load sessions: ' + err.message, 'error');
  }
}

function renderTable(sessions, container) {
  const el = document.getElementById('sessionsTable');

  if (sessions.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🥾</div><h3>No sessions yet</h3><p>Start a scouting session to begin recording observations</p></div>`;
    return;
  }

  let rows = '';
  for (const s of sessions) {
    const isActive = !s.completedAt;
    const statusTag = isActive ? tag('● Active', 'green') : tag('✓ Complete', 'blue');
    const obsColor = s.observationCount > 20 ? 'var(--red)' : 'var(--amber)';

    rows += `
      <tr>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--text-dim);">${s.id.substring(0, 8)}</td>
        <td><div style="font-weight:500;color:var(--text);">${escapeHtml(s.scouterId)}</div></td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--text-dim);">${formatDateTime(s.startedAt)}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--text-dim);">${s.completedAt ? formatDateTime(s.completedAt) : '—'}</td>
        <td>${escapeHtml(s.weatherConditions || '—')}</td>
        <td style="font-family:'Fraunces',serif;font-weight:700;font-size:1.1rem;color:${obsColor};">${s.observationCount}</td>
        <td>${statusTag}</td>
        <td>
          ${isActive ? `<button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;" data-complete="${s.id}">Complete</button>` : ''}
        </td>
      </tr>
    `;
  }

  el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Session</th><th>Scout</th><th>Started</th><th>Completed</th><th>Weather</th><th>Obs</th><th>Status</th><th></th></tr></thead>
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
}

function showStartSessionModal(listContainer) {
  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label class="input-label">Weather Conditions</label>
        <input class="input-field" type="text" id="sessionWeather" placeholder="e.g. Clear, 24°C, light breeze">
      </div>
      <div>
        <label class="input-label">Notes (optional)</label>
        <textarea class="input-field" rows="2" id="sessionNotes" placeholder="Any notes about today's conditions…"></textarea>
      </div>
      <div style="display:flex;gap:10px;margin-top:6px;">
        <button class="btn-outline" style="flex:1;" id="cancelSession">Cancel</button>
        <button class="btn-primary" style="flex:2;justify-content:center;" id="saveSession">🥾 Start Session</button>
      </div>
    </div>
  `;

  openModal({ title: 'Start Scouting Session', subtitle: 'Begin a new field scouting run', content: form });

  document.getElementById('cancelSession').addEventListener('click', closeModal);
  document.getElementById('saveSession').addEventListener('click', async () => {
    const btn = document.getElementById('saveSession');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      await startSession({
        weatherConditions: document.getElementById('sessionWeather').value.trim() || null,
        notes: document.getElementById('sessionNotes').value.trim() || null,
      });
      closeModal();
      showToast('Session started!', 'success');
      renderSessions(listContainer);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = '🥾 Start Session';
    }
  });
}
