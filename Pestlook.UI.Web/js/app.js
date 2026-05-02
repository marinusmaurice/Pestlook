import { registerRoute, navigate, startRouter, setBeforeNavigate, currentPath } from './utils/router.js';
import { isAuthenticated, clearTokens, getRefreshToken, getUser } from './utils/storage.js';
import { renderSidebar, updateActiveNav } from './components/sidebar.js';

import { revoke } from './api/auth.js';
import { showToast } from './components/toast.js';
import { renderLanding } from './pages/landing.js';
import { renderLogin } from './pages/login.js';
import { renderSignUp } from './pages/signup.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderFarms } from './pages/farms.js';
import { renderFarmDetail } from './pages/farm-detail.js';
import { renderSessions } from './pages/sessions.js';
import { renderSessionDetail } from './pages/session-detail.js';
import { renderPests } from './pages/pests.js';
import { renderTraps } from './pages/traps.js';
import { renderSettings } from './pages/settings.js';
import { renderReports } from './pages/reports.js';

const appRoot = document.getElementById('app-root');

const publicPaths = ['/', '/login', '/signup'];

function renderShell() {
  appRoot.innerHTML = `
    <div id="sidebar"></div>
    <div id="main">
      <div class="content-area" id="content"></div>
    </div>
  `;
  renderSidebar(document.getElementById('sidebar'));
}

function renderAuthShell() {
  appRoot.innerHTML = `<div id="auth-content" class="auth-layout"></div>`;
}

function getContent() {
  return document.getElementById('content');
}

function getAuthContent() {
  return document.getElementById('auth-content');
}

let currentShell = null; // 'app' | 'auth' | 'landing'

function ensureShell(type) {
  if (currentShell === type) return;
  if (currentShell === 'landing') {
    document.getElementById('landing-styles')?.remove();
    document.getElementById('landing-fa')?.remove();
    document.getElementById('landing-gfonts')?.remove();
  }
  currentShell = type;
  if (type === 'app') renderShell();
  else if (type === 'auth') renderAuthShell();
  else appRoot.innerHTML = `<div id="landing-content"></div>`;
}

// Auth guard
setBeforeNavigate((path) => {
  if (publicPaths.includes(path)) return true;
  if (!isAuthenticated()) {
    navigate('/login');
    return false;
  }
  return true;
});

// ── Public Routes ──

registerRoute('/', async () => {
  if (isAuthenticated()) {
    navigate('/dashboard');
    return;
  }
  ensureShell('landing');
  renderLanding(document.getElementById('landing-content'));
});

registerRoute('/login', async () => {
  if (isAuthenticated()) { navigate('/dashboard'); return; }
  ensureShell('auth');
  renderLogin(getAuthContent());
});

registerRoute('/signup', async () => {
  if (isAuthenticated()) { navigate('/dashboard'); return; }
  ensureShell('auth');
  renderSignUp(getAuthContent());
});

// ── Authenticated Routes ──

function authedRoute(handler) {
  return async (params) => {
    ensureShell('app');
    const content = getContent();
    const path = currentPath();
    updateActiveNav(path);
    await handler(content, params);
  };
}

registerRoute('/dashboard', authedRoute(async (content) => {
  await renderDashboard(content);
}));

registerRoute('/farms', authedRoute(async (content) => {
  await renderFarms(content);
}));

registerRoute('/farms/:id', authedRoute(async (content, params) => {
  await renderFarmDetail(content, params);
}));

registerRoute('/sessions', authedRoute(async (content) => {
  await renderSessions(content);
}));

registerRoute('/sessions/:id', authedRoute(async (content, params) => {
  await renderSessionDetail(content, params);
}));

registerRoute('/pests', authedRoute(async (content) => {
  await renderPests(content);
}));

registerRoute('/traps', authedRoute(async (content) => {
  await renderTraps(content);
}));

registerRoute('/settings', authedRoute(async (content) => {
  await renderSettings(content);
}));

registerRoute('/reports', authedRoute(async (content) => {
  await renderReports(content);
}));

registerRoute('/logout', async () => {
  try {
    const rt = getRefreshToken();
    if (rt) await revoke(rt);
  } catch { /* best-effort */ }
  clearTokens();
  currentShell = null;
  navigate('/login');
  showToast('You have been signed out.', 'success');
});

// ── Start ──
startRouter();
