import { getDashboard } from '../api/dashboard.js';
import { getQuotaStatus } from '../api/quota.js';
import { getUser } from '../utils/storage.js';
import { greeting, todayFormatted, formatTime, formatDateTime, escapeHtml } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';

export async function renderDashboard(container) {

  const user = getUser();
  const name = user?.firstName || 'there';

  container.innerHTML = `
    <div style="margin-bottom:24px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
      <div style="font-family:'Fraunces',serif;font-size:1.6rem;font-weight:600;color:var(--text);letter-spacing:-0.02em;">${greeting()}, ${escapeHtml(name)} 👋</div>
      <div style="font-size:0.85rem;color:var(--text-dim);">Here's what's happening across your farms today — ${todayFormatted()}</div>
    </div>
    <div id="quotaBanner"></div>
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
    const [dashRes, quotaRes] = await Promise.allSettled([getDashboard(), getQuotaStatus()]);

    if (dashRes.status === 'fulfilled') {
      const d = dashRes.value.data;
      renderStats(d.stats.farmCount, d.stats.trapCount, d.stats.enabledTrapCount, d.stats.sessionCount, d.stats.completedSessionCount, d.stats.outstandingSessionCount, d.stats.observationCount);
      renderActiveSessions(d.recentSessions.filter(s => !s.completedAt), d.recentSessions);
      renderActivityFeed(d.recentActivity);
      renderMap(d.traps);
      renderTopPests(d.topPests);
    } else {
      showToast('Failed to load dashboard: ' + dashRes.reason?.message, 'error');
    }

    if (quotaRes.status === 'fulfilled') {
      renderQuotaBanner(quotaRes.value.data);
    }
  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
}

function renderQuotaBanner(quota) {
  const el = document.getElementById('quotaBanner');
  if (!el || !quota) return;

  const { used, captured, quota: limit, isExceeded, excess, isProRata, proRataDays } = quota;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const barColor = pct >= 100 ? 'var(--danger, #C75146)' : pct >= 80 ? 'var(--warning, #E5A52F)' : 'var(--primary, #2B6E4F)';

  const proRataNote = isProRata
    ? `<span style="font-size:0.78rem;color:var(--text-dim);"> · Pro-rated (${proRataDays}-day month)</span>`
    : '';

  const excessNote = isExceeded
    ? `<div style="margin-top:6px;font-size:0.83rem;color:var(--danger,#C75146);">
         ${excess} observation${excess !== 1 ? 's' : ''} captured beyond your quota this month — included in your records but not in analytics.
         <a href="#/settings" style="color:var(--primary);margin-left:6px;">Upgrade plan</a>
       </div>`
    : '';

  el.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
        <span style="font-size:0.88rem;font-weight:600;color:var(--text);">Monthly observations ${proRataNote}</span>
        <span style="font-size:0.88rem;color:var(--text-dim);">${used.toLocaleString()} / ${limit.toLocaleString()} included&nbsp;
          ${captured > used ? `<span style="color:var(--text-dim);">(${captured.toLocaleString()} captured)</span>` : ''}
        </span>
      </div>
      <div style="background:var(--border);border-radius:999px;height:8px;overflow:hidden;">
        <div style="background:${barColor};width:${pct}%;height:100%;border-radius:999px;transition:width 0.4s ease;"></div>
      </div>
      ${excessNote}
    </div>
  `;
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

let _dashMap = null;

function renderMap(traps) {
  const el = document.getElementById('dashMap');

  const located = traps.filter(t => t.latitude != null && t.longitude != null);

  el.innerHTML = `
    <div class="section-head">
      <div class="section-title">Trap Map</div>
      ${tag('Live', 'gray')}
    </div>
    <div id="dashMapLeaflet" style="height:240px;border-radius:8px;overflow:hidden;"></div>
    <div style="display:flex;gap:12px;font-size:0.65rem;color:var(--text-dim);margin-top:6px;">
      <span><span style="color:var(--green);">●</span> Enabled</span>
      <span><span style="color:var(--red);">●</span> Disabled</span>
    </div>
  `;

  if (located.length === 0) {
    document.getElementById('dashMapLeaflet').innerHTML =
      `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:0.82rem;">No trap locations available</div>`;
    return;
  }

  if (_dashMap) { _dashMap.remove(); _dashMap = null; }

  const map = L.map('dashMapLeaflet', { zoomControl: true, attributionControl: false });
  _dashMap = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  const bounds = [];
  for (const t of located) {
    const color = t.isEnabled ? '#6dde84' : '#ef4444';
    const marker = L.circleMarker([t.latitude, t.longitude], {
      radius: 7,
      fillColor: color,
      color: t.isEnabled ? '#3aad54' : '#b91c1c',
      weight: 1.5,
      fillOpacity: 0.9,
    }).addTo(map);
    marker.bindPopup(`<strong>${escapeHtml(t.name || 'Trap')}</strong><br>${t.isEnabled ? '✓ Enabled' : '✗ Disabled'}`);
    bounds.push([t.latitude, t.longitude]);
  }

  map.fitBounds(bounds, { padding: [20, 20] });
}

function renderTopPests(topPests) {
  const el = document.getElementById('dashTopPests');
  const max = topPests.length > 0 ? topPests[0].totalCount : 1;

  let bars = '';
  for (const { pestName, totalCount } of topPests) {
    const pct = Math.round((totalCount / max) * 100);
    bars += `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <span style="font-size:0.83rem;font-weight:500;color:var(--text);">${escapeHtml(pestName)}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--amber);">${totalCount}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;"></div></div>
      </div>
    `;
  }

  if (topPests.length === 0) {
    bars = `<div class="empty-state" style="padding:16px;"><p>No pest data yet</p></div>`;
  }

  el.innerHTML = `
    <div class="section-head">
      <div class="section-title">Top Observed Pests</div>
      <div class="section-sub">From completed sessions · last 3 months</div>
    </div>
    ${bars}
  `;
}
