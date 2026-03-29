import { getUser, isAuthenticated } from '../utils/storage.js';
import { navigate, currentPath } from '../utils/router.js';
import { initials } from '../utils/helpers.js';

const navItems = [
  { section: 'Overview', items: [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/dashboard' },
  ]},
  { section: 'Field Management', items: [
    { id: 'farms', icon: '🌾', label: 'Farms & Fields', path: '/farms' },
    { id: 'monitoring', icon: '📍', label: 'Monitoring Points', path: '/monitoring-points', badgeId: 'mp-badge' },
  ]},
  { section: 'Operations', items: [
    { id: 'sessions', icon: '🥾', label: 'Scouting Sessions', path: '/sessions' },
    { id: 'observations', icon: '🔬', label: 'Observations', path: '/observations', badgeId: 'obs-badge' },
  ]},
  { section: 'Reference', items: [
    { id: 'pests', icon: '🦗', label: 'Pest Catalogue', path: '/pests' },
    { id: 'settings', icon: '⚙️', label: 'Settings', path: '/settings' },
  ]},
];

export function renderSidebar(container) {
  const user = getUser();
  const firstName = user?.firstName || 'User';
  const lastName = user?.lastName || '';
  const userInitials = initials(firstName, lastName);
  const role = user?.roles?.[0] || 'User';

  let html = `
    <div class="logo-wrap" onclick="location.hash='#/dashboard'">
      <div class="logo-icon">🐛</div>
      <div>
        <div class="logo-text">Pest<span>look</span></div>
        <div class="logo-sub">Field Intelligence</div>
      </div>
    </div>
  `;

  for (const section of navItems) {
    html += `<div class="nav-section"><div class="nav-label">${section.section}</div>`;
    for (const item of section.items) {
      html += `
        <a href="#${item.path}" class="nav-item" data-nav="${item.id}">
          <span class="nav-icon">${item.icon}</span> ${item.label}
          ${item.badgeId ? `<span class="nav-badge" id="${item.badgeId}"></span>` : ''}
        </a>
      `;
    }
    html += `</div>`;
  }

  html += `
    <div class="sidebar-bottom">
      <div class="quota-box">
        <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">Monitoring Points Used</div>
        <div class="progress-bar" style="margin-bottom:4px;"><div class="progress-fill" id="quota-fill" style="width:0%"></div></div>
        <div style="font-size:0.7rem;color:var(--green);font-family:'JetBrains Mono',monospace;" id="quota-text">— / —</div>
      </div>
      <div class="user-chip" onclick="location.hash='#/settings'">
        <div class="user-avatar">${userInitials}</div>
        <div>
          <div class="user-name">${firstName} ${lastName}</div>
          <div class="user-role">${role}</div>
        </div>
        <span style="margin-left:auto;color:var(--text-dim);font-size:0.85rem;">⋯</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

export function updateActiveNav(path) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  for (const section of navItems) {
    for (const item of section.items) {
      if (path.startsWith(item.path)) {
        const navEl = document.querySelector(`[data-nav="${item.id}"]`);
        if (navEl) navEl.classList.add('active');
        return;
      }
    }
  }
}

export function updateQuota(active, total) {
  const fill = document.getElementById('quota-fill');
  const text = document.getElementById('quota-text');
  if (fill) fill.style.width = total > 0 ? `${Math.round((active / total) * 100)}%` : '0%';
  if (text) text.textContent = `${active} / ${total}`;
}

export function updateBadge(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value || '';
    el.style.display = value ? '' : 'none';
  }
}
