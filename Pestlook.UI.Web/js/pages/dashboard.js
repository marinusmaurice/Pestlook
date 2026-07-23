import { getDashboard } from '../api/dashboard.js';
import { getSessions } from '../api/sessions.js';
import { getUser } from '../utils/storage.js';
import { greeting, todayFormatted, formatTime, formatDateTime, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { openModal, closeModal } from '../components/modal.js';
import { openImportModal } from './import-observations.js';

export async function renderDashboard(container) {

  const user = getUser();
  const name = user?.firstName || 'there';

  container.innerHTML = `
    <div style="margin-bottom:24px;display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
        <div style="font-family:'Fraunces',serif;font-size:1.6rem;font-weight:600;color:var(--text);letter-spacing:-0.02em;">${greeting()}, ${escapeHtml(name)} 👋</div>
        <div style="font-size:0.85rem;color:var(--text-dim);">Here's what's happening across your farms today — ${todayFormatted()}</div>
      </div>
      <button class="btn-outline" id="dashImportBtn">📥 Import from Paper</button>
    </div>
    <div class="stat-grid" id="dashStats">
      <div class="stat-card"><div class="skeleton skeleton-card"></div></div>
      <div class="stat-card"><div class="skeleton skeleton-card"></div></div>
      <div class="stat-card"><div class="skeleton skeleton-card"></div></div>
      <div class="stat-card"><div class="skeleton skeleton-card"></div></div>
    </div>
    <div class="two-col">
      <div class="card card-p" id="dashCalendar" style="align-self:flex-start;"><div class="skeleton skeleton-card" style="height:230px;"></div></div>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card card-p" id="dashActivity"><div class="skeleton skeleton-card"></div></div>
        <div class="card" id="dashSessions"><div class="card-p"><div class="skeleton skeleton-card"></div></div></div>
      </div>
    </div>
  `;

  document.getElementById('dashImportBtn').addEventListener('click', () => openImportModal(() => renderDashboard(container)));

  try {
    const [dashRes, sessionsRes] = await Promise.all([getDashboard(), getSessions()]);
    const d = dashRes.data;
    const sessions = sessionsRes.data || [];

    renderStats(d.stats.farmCount, d.stats.trapCount, d.stats.enabledTrapCount, d.stats.sessionCount, d.stats.completedSessionCount, d.stats.outstandingSessionCount, d.stats.observationCount);
    renderActivityFeed(d.recentActivity);
    renderActiveSessions(d.recentSessions.filter(s => !s.completedAt), d.recentSessions);
    renderCalendar(sessions);
  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
}

function renderStats(farmCount, trapCount, enabledTrapCount, sessionCount, completedSessionCount, outstandingSessionCount, obsCount) {
  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card has-kpi-tip" style="--accent-color:rgba(109,222,132,0.08);" data-kpi-tip="Total number of farms registered in your tenant. Each farm can contain multiple fields and trap locations.">
      <div class="stat-label">Active Farms</div>
      <div class="stat-value" style="color:var(--green);">${farmCount}</div>
      <div class="stat-delta">Across your tenant</div>
    </div>
    <div class="stat-card has-kpi-tip" style="--accent-color:rgba(96,168,224,0.08);" data-kpi-tip="Total traps configured across all farms. The sub-count shows how many are currently enabled and actively contributing to observations.">
      <div class="stat-label">Traps</div>
      <div class="stat-value" style="color:var(--blue);">${trapCount}</div>
      <div class="stat-delta">${enabledTrapCount} enabled</div>
    </div>
    <div class="stat-card has-kpi-tip" style="--accent-color:rgba(240,168,64,0.08);" data-kpi-tip="Total scouting sessions created in your tenant. Completed sessions have a recorded end time; outstanding sessions are still in progress or awaiting completion.">
      <div class="stat-label">Total Sessions</div>
      <div class="stat-value" style="color:var(--amber);">${sessionCount}</div>
      <div class="stat-delta"><span style="color:var(--green);">✓ ${completedSessionCount} completed</span> &nbsp;·&nbsp; <span style="color:var(--amber);">⏳ ${outstandingSessionCount} outstanding</span></div>
    </div>
    <div class="stat-card has-kpi-tip" style="--accent-color:rgba(224,96,96,0.08);" data-kpi-tip="Total pest observations recorded across all completed scouting sessions. Each observation represents a pest count recorded at a specific trap or field location.">
      <div class="stat-label">Observations</div>
      <div class="stat-value" style="color:var(--red);">${obsCount}</div>
      <div class="stat-delta">From completed sessions</div>
    </div>
  `;
}

function renderActiveSessions(active, allSessions) {
  const el = document.getElementById('dashSessions');
  let rows = '';
  const display = active.length > 0 ? active.slice(0, 5) : allSessions.slice(0, 5);

  for (const s of display) {
    const isActive = !s.completedAt;
    const statusTag = isActive ? tag('● Active', 'green') : tag('✓ Complete', 'blue');
    rows += `
      <tr>
        <td><div style="font-weight:600;color:var(--text);">${escapeHtml(s.scouterName || s.scouterId)}</div></td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--text-dim);">${formatTime(s.startedAt)}</td>
        <td style="font-family:'Fraunces',serif;font-weight:700;color:var(--amber);">${s.observationCount}</td>
        <td>${statusTag}</td>
      </tr>
    `;
  }

  if (display.length === 0) {
    rows = `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:20px;">No sessions yet</td></tr>`;
  }

  el.innerHTML = `
    <div class="card-p" style="border-bottom:1px solid var(--border);">
      <div class="section-head" style="margin-bottom:0;">
        <div>
          <div class="section-title">${active.length > 0 ? 'Active Sessions' : 'Recent Sessions'}</div>
          <div class="section-sub">${active.length > 0 ? 'Currently in the field' : 'Latest sessions'}</div>
        </div>
        <a href="#/sessions" class="btn-outline">View all</a>
      </div>
    </div>
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr><th>Scout</th><th>Started</th><th>Obs</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderActivityFeed(observations) {
  const el = document.getElementById('dashActivity');
  const recent = observations.slice(0, 5);
  let items = '';

  for (const obs of recent) {
    const isUnknown = obs.isUnknownPest;
    const name = isUnknown ? 'Unknown Pest' : (obs.pestName || 'Unknown');
    const dotColor = (obs.count || 0) > 20 ? 'var(--red)' : isUnknown ? 'var(--amber)' : 'var(--green)';
    const lifeStageHtml = obs.lifeStage ? ` &nbsp;<span style="font-size:0.7rem;color:var(--text-dim);">${escapeHtml(obs.lifeStage)}</span>` : '';
    const locationParts = [obs.farmName, obs.fieldName].filter(Boolean).map(s => escapeHtml(s));
    const locationHtml = locationParts.length ? `<span style="color:var(--text-dim);"> · ${locationParts.join(' / ')}</span>` : '';
    items += `
      <div class="activity-item">
        <div class="activity-dot" style="background:${dotColor};"></div>
        <div>
          <div style="font-size:0.83rem;color:var(--text);font-weight:500;">${escapeHtml(name)}${obs.count ? ` — <span style="color:var(--amber);">${obs.count} counted</span>` : ''}${lifeStageHtml}</div>
          <div style="font-size:0.68rem;color:var(--text-dim);margin-top:2px;font-family:'JetBrains Mono',monospace;">${formatDateTime(obs.observedAt)}${locationHtml}</div>
        </div>
      </div>
    `;
  }

  if (recent.length === 0) {
    items = `<div class="empty-state" style="padding:20px;"><p>No observations recorded yet</p></div>`;
  }

  el.innerHTML = `
    <div class="section-head">
      <div>
        <div class="section-title">Recent Activity</div>
        <div class="section-sub">Latest observations</div>
      </div>
    </div>
    ${items}
  `;
}

// ── Calendar ─────────────────────────────────────────────────────────────────

/** yyyy-MM-dd for a Date instant, rendered in the given IANA timezone (falls back to browser-local if omitted). */
function _tzDateKey(date, tz) {
  return date.toLocaleDateString('en-CA', tz ? { timeZone: tz } : undefined);
}

function _pad2(n) { return String(n).padStart(2, '0'); }

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

let _calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let _calSelected = _tzDateKey(new Date(), getUser()?.timezone);
let _calSessionsByDay = {};

/** Bucket sessions by their effective calendar day, in the user's configured timezone (falls back to browser-local). */
function _groupSessionsByDay(sessions) {
  const tz = getUser()?.timezone;
  const map = {};
  for (const s of sessions) {
    const effective = s.completedAt || s.startedAt || s.scheduledDate;
    if (!effective) continue;
    const key = _tzDateKey(new Date(effective), tz);
    (map[key] ||= []).push(s);
  }
  return map;
}

function _sessionDotColor(s) {
  if (s.completedAt) return 'var(--green)';
  if (s.startedAt) return 'var(--amber)';
  return 'var(--blue)';
}

function _sessionStatusTag(s) {
  if (s.completedAt) return tag('✓ Complete', 'green');
  if (s.startedAt) return tag('● Active', 'amber');
  return tag('Planned', 'blue');
}

function renderCalendar(sessions) {
  _calSessionsByDay = _groupSessionsByDay(sessions);
  _renderCalendarGrid();

  document.getElementById('dashCalendar').addEventListener('click', (e) => {
    const prevBtn  = e.target.closest('#calPrev');
    const nextBtn  = e.target.closest('#calNext');
    const todayBtn = e.target.closest('#calToday');
    const dayCell  = e.target.closest('[data-cal-day]');

    if (prevBtn) { _calMonth = new Date(_calMonth.getFullYear(), _calMonth.getMonth() - 1, 1); _renderCalendarGrid(); }
    else if (nextBtn) { _calMonth = new Date(_calMonth.getFullYear(), _calMonth.getMonth() + 1, 1); _renderCalendarGrid(); }
    else if (todayBtn) {
      const now = new Date();
      _calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      _calSelected = _tzDateKey(now, getUser()?.timezone);
      _renderCalendarGrid();
    } else if (dayCell) {
      _calSelected = dayCell.dataset.calDay;
      _openDayPopup(_calSelected);
    }
  });
}

function _renderCalendarGrid() {
  const el = document.getElementById('dashCalendar');
  const year = _calMonth.getFullYear();
  const month = _calMonth.getMonth();
  const monthLabel = _calMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const todayKey = _tzDateKey(new Date(), getUser()?.timezone);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Pure calendar arithmetic — build each cell's key directly from y/m/d parts,
  // never round-tripping through a real Date + timezone-aware formatter, so
  // there's no risk of the grid itself shifting a day under any timezone.
  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 12 : month; // 1-indexed, previous month
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, inMonth: false, key: `${y}-${_pad2(m)}-${_pad2(d)}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, key: `${year}-${_pad2(month + 1)}-${_pad2(d)}` });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const m = month === 11 ? 1 : month + 2; // 1-indexed, next month
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: nextDay, inMonth: false, key: `${y}-${_pad2(m)}-${_pad2(nextDay)}` });
    nextDay++;
  }

  const dayCellsHtml = cells.map(c => {
    const daySessions = _calSessionsByDay[c.key] || [];
    const isToday = c.key === todayKey;
    const dots = daySessions.slice(0, 4).map(s => `<span style="width:4px;height:4px;border-radius:50%;background:${_sessionDotColor(s)};display:inline-block;"></span>`).join('');

    return `
      <div data-cal-day="${c.key}" style="
        height:30px;border-radius:6px;padding:2px;cursor:pointer;
        display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px;
        border:1px solid ${isToday ? 'var(--border2)' : 'transparent'};
        opacity:${c.inMonth ? '1' : '0.32'};
        transition:background 0.15s;"
        onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
        <span style="font-size:0.68rem;font-weight:${isToday ? '700' : '500'};color:${isToday ? 'var(--green)' : 'var(--text)'};">${c.day}</span>
        <span style="display:flex;gap:2px;min-height:4px;">${dots}</span>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="section-head" style="margin-bottom:8px;">
      <div>
        <div class="section-title">Calendar</div>
        <div class="section-sub">${monthLabel}</div>
      </div>
      <div style="display:flex;gap:5px;">
        <button class="btn-outline" id="calPrev" style="padding:3px 9px;font-size:0.76rem;">‹</button>
        <button class="btn-outline" id="calToday" style="padding:3px 9px;font-size:0.68rem;">Today</button>
        <button class="btn-outline" id="calNext" style="padding:3px 9px;font-size:0.76rem;">›</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;margin-bottom:2px;">
      ${WEEKDAY_LABELS.map(w => `<div style="text-align:center;font-size:0.58rem;color:var(--text-dim);font-weight:600;text-transform:uppercase;">${w}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;">
      ${dayCellsHtml}
    </div>
  `;
}

function _openDayPopup(dayKey) {
  const daySessions = _calSessionsByDay[dayKey] || [];
  const [selY, selM, selD] = dayKey.split('-').map(Number);
  const label = new Date(selY, selM - 1, selD).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  const content = daySessions.length === 0
    ? `<div style="font-size:0.82rem;color:var(--text-dim);padding:8px 0;">No sessions scheduled</div>`
    : daySessions.map(s => `
        <a href="#/sessions/${s.id}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;">
          <div style="min-width:0;">
            <div style="font-size:0.85rem;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.scouterName || 'Unassigned')}</div>
            <div style="font-size:0.72rem;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml([s.farmName, s.fieldName].filter(Boolean).join(' / ') || '—')}</div>
          </div>
          <div style="flex-shrink:0;display:flex;align-items:center;gap:8px;">
            ${_sessionStatusTag(s)}
            <span style="color:var(--text-dim);">›</span>
          </div>
        </a>
      `).join('');

  const body = openModal({ title: label, content: `<div>${content}</div>` });
  body.querySelectorAll('a').forEach(a => a.addEventListener('click', closeModal));
}
