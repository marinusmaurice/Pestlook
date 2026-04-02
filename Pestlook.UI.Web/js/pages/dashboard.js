import { getFarms } from '../api/farms.js';
import { getTraps } from '../api/traps.js';
import { getSessions } from '../api/sessions.js';
import { getUser } from '../utils/storage.js';
import { greeting, todayFormatted, formatTime, escapeHtml } from '../utils/helpers.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';

export async function renderDashboard(container) {
  setPageTitle('Dashboard');

  const user = getUser();
  const name = user?.firstName || 'there';

  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <div style="font-family:'Fraunces',serif;font-size:1.6rem;font-weight:600;color:#fff;letter-spacing:-0.02em;">${greeting()}, ${escapeHtml(name)} 👋</div>
      <div style="font-size:0.85rem;color:var(--text-dim);margin-top:3px;">Here's what's happening across your farms today — ${todayFormatted()}</div>
    </div>
    <div class="stat-grid" id="dashStats">
      <div class="stat-card"><div class="skeleton skeleton-card"></div></div>
      <div class="stat-card"><div class="skeleton skeleton-card"></div></div>
      <div class="stat-card"><div class="skeleton skeleton-card"></div></div>
      <div class="stat-card"><div class="skeleton skeleton-card"></div></div>
    </div>
    <div class="two-col" style="margin-bottom:16px;">
      <div class="card" id="dashSessions"><div class="card-p"><div class="skeleton skeleton-card"></div></div></div>
      <div class="card card-p" id="dashActivity"><div class="skeleton skeleton-card"></div></div>
    </div>
    <div class="two-col">
      <div class="card card-p" id="dashMap"><div class="skeleton skeleton-card" style="height:240px;"></div></div>
      <div class="card card-p" id="dashTopPests"><div class="skeleton skeleton-card"></div></div>
    </div>
  `;

  try {
    const [farmsRes, trapsRes, sessionsRes] = await Promise.all([
      getFarms(),
      getTraps(),
      getSessions(),
    ]);

    const farms = farmsRes.data || [];
    const traps = trapsRes.data || [];
    const sessions = sessionsRes.data || [];

    const enabledTraps = traps.filter(t => t.isEnabled);
    const activeSessions = sessions.filter(s => !s.completedAt);
    const allObservations = sessions.flatMap(s => s.observations || []);

    renderStats(farms.length, traps.length, enabledTraps.length, sessions.length, allObservations.length);
    renderActiveSessions(activeSessions, sessions);
    renderActivityFeed(allObservations);
    renderMap(traps);
    renderTopPests(allObservations);
  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
}

function renderStats(farmCount, trapCount, enabledTrapCount, sessionCount, obsCount) {
  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card" style="--accent-color:rgba(109,222,132,0.08);">
      <div class="stat-label">Active Farms</div>
      <div class="stat-value" style="color:var(--green);">${farmCount}</div>
      <div class="stat-delta">Across your tenant</div>
    </div>
    <div class="stat-card" style="--accent-color:rgba(96,168,224,0.08);">
      <div class="stat-label">Traps</div>
      <div class="stat-value" style="color:var(--blue);">${trapCount}</div>
      <div class="stat-delta">${enabledTrapCount} enabled</div>
    </div>
    <div class="stat-card" style="--accent-color:rgba(240,168,64,0.08);">
      <div class="stat-label">Total Sessions</div>
      <div class="stat-value" style="color:var(--amber);">${sessionCount}</div>
      <div class="stat-delta">All scouting sessions</div>
    </div>
    <div class="stat-card" style="--accent-color:rgba(224,96,96,0.08);">
      <div class="stat-label">Observations</div>
      <div class="stat-value" style="color:var(--red);">${obsCount}</div>
      <div class="stat-delta">Recorded observations</div>
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
    <table class="data-table">
      <thead><tr><th>Scout</th><th>Started</th><th>Obs</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
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
    items += `
      <div class="activity-item">
        <div class="activity-dot" style="background:${dotColor};"></div>
        <div>
          <div style="font-size:0.83rem;color:var(--text);font-weight:500;">${escapeHtml(name)}${obs.count ? ` — <span style="color:var(--amber);">${obs.count} counted</span>` : ''}</div>
          <div style="font-size:0.68rem;color:var(--text-dim);margin-top:2px;font-family:'JetBrains Mono',monospace;">${formatTime(obs.createdAt)}</div>
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

function renderMap(traps) {
  const el = document.getElementById('dashMap');
  let pins = '';

  for (const t of traps.slice(0, 12)) {
    const top = 15 + Math.random() * 65;
    const left = 10 + Math.random() * 75;
    const color = t.isEnabled ? '#3aad54' : '#708060';
    const borderColor = t.isEnabled ? '#6dde84' : '#a0b898';
    pins += `<div class="map-pin" style="background:${color};border-color:${borderColor};top:${top}%;left:${left}%;" title="${escapeHtml(t.name)}"></div>`;
  }

  el.innerHTML = `
    <div class="section-head">
      <div class="section-title">Trap Map</div>
      ${tag('Live', 'gray')}
    </div>
    <div class="map-area" style="height:240px;">
      <div class="map-grid"></div>
      ${pins}
      <div style="position:absolute;bottom:12px;left:14px;display:flex;gap:12px;font-size:0.65rem;color:var(--text-dim);">
        <span><span style="color:var(--green);">●</span> Enabled</span>
        <span><span style="color:var(--text-dim);">●</span> Disabled</span>
      </div>
    </div>
  `;
}

function renderTopPests(observations) {
  const el = document.getElementById('dashTopPests');
  const counts = {};
  for (const obs of observations) {
    if (obs.isUnknownPest || !obs.pestName) continue;
    counts[obs.pestName] = (counts[obs.pestName] || 0) + (obs.count || 1);
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = sorted.length > 0 ? sorted[0][1] : 1;

  let bars = '';
  for (const [name, count] of sorted) {
    const pct = Math.round((count / max) * 100);
    bars += `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <span style="font-size:0.83rem;font-weight:500;color:var(--text);">${escapeHtml(name)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--amber);">${count}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;"></div></div>
      </div>
    `;
  }

  if (sorted.length === 0) {
    bars = `<div class="empty-state" style="padding:16px;"><p>No pest data yet</p></div>`;
  }

  el.innerHTML = `
    <div class="section-head">
      <div class="section-title">Top Observed Pests</div>
      <div class="section-sub">By total count</div>
    </div>
    ${bars}
  `;
}
