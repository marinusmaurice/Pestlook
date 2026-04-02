import { getUser, isAuthenticated } from '../utils/storage.js';
import { navigate, currentPath } from '../utils/router.js';
import { initials } from '../utils/helpers.js';

const navItems = [
  { section: 'Overview', items: [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/dashboard' },
  ]},
  { section: 'Field Management', items: [
    { id: 'farms', icon: '🌾', label: 'Farms & Fields', path: '/farms' },
    { id: 'traps', icon: '🕸️', label: 'Traps', path: '/traps' },
  ]},
  { section: 'Operations', items: [
    { id: 'sessions', icon: '🥾', label: 'Scouting Sessions', path: '/sessions' },
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
      <div class="user-chip" onclick="location.hash='#/settings'">
        <div class="user-avatar">${userInitials}</div>
        <div>
          <div class="user-name">${firstName} ${lastName}</div>
          <div class="user-role">${role}</div>
        </div>
        <button class="logout-btn" id="logoutBtn" title="Sign out"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
      </div>
    </div>
  `;

  container.innerHTML = html;

  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    navigate('/logout');
  });
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
