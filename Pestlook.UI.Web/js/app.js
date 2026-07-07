import { registerRoute, navigate, startRouter, setBeforeNavigate, currentPath } from './utils/router.js';
import { isAuthenticated, clearTokens, getRefreshToken, getUser } from './utils/storage.js';
import { renderSidebar, updateActiveNav } from './components/sidebar.js';

import { revoke } from './api/auth.js';
import { showToast } from './components/toast.js';
import { renderLanding } from './pages/landing.js';
import { renderLogin } from './pages/login.js';
import { renderSignUp } from './pages/signup.js';
import { renderActivate } from './pages/activate.js';
import { renderForgotPassword } from './pages/forgot-password.js';
import { renderResetPassword } from './pages/reset-password.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderFarms } from './pages/farms.js';
import { renderFarmDetail } from './pages/farm-detail.js';
import { renderSessions } from './pages/sessions.js';
import { renderSessionDetail } from './pages/session-detail.js';
import { renderPests } from './pages/pests.js';
import { renderTraps } from './pages/traps.js';
import { renderSettings } from './pages/settings.js';
import { renderReports } from './pages/reports.js';
import { renderHelp } from './pages/help.js';
import { renderFeedback } from './pages/feedback.js';
import { renderIntelligence } from './pages/intelligence.js';
import { renderPredictive } from './pages/predictive.js';
import { renderActionable }    from './pages/actionable.js';
import { renderEnvironmental } from './pages/environmental.js';
import { renderContainment }   from './pages/containment.js';
import { renderCustomReports }  from './pages/custom-reports.js';
import { renderObservationLog } from './pages/observation-log.js';
import { startTourIfNeeded, resumeTour } from './utils/tour.js';

const appRoot = document.getElementById('app-root');

const publicPaths = ['/', '/login', '/signup', '/activate', '/forgot-password', '/reset-password'];

function renderShell() {
  appRoot.innerHTML = `
    <div id="sidebar"></div>
    <div id="sidebar-overlay" class="sidebar-overlay"></div>
    <div id="main">
      <div class="mob-bar">
        <button class="mob-hamburger" id="mobHamburger" aria-label="Open navigation menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="2" y1="5" x2="18" y2="5"/>
            <line x1="2" y1="10" x2="18" y2="10"/>
            <line x1="2" y1="15" x2="18" y2="15"/>
          </svg>
        </button>
        <div class="mob-logo">Pest<span>look</span></div>
      </div>
      <div class="content-area" id="content"></div>
    </div>
  `;
  renderSidebar(document.getElementById('sidebar'));

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  document.getElementById('mobHamburger')?.addEventListener('click', () => {
    sidebar.classList.add('sidebar-open');
    overlay.classList.add('open');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('sidebar-open');
    overlay.classList.remove('open');
  });
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item')) {
      sidebar.classList.remove('sidebar-open');
      overlay.classList.remove('open');
    }
  });
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

registerRoute('/activate', async (params) => {
  ensureShell('auth');
  await renderActivate(getAuthContent(), params);
});

registerRoute('/forgot-password', async () => {
  if (isAuthenticated()) { navigate('/dashboard'); return; }
  ensureShell('auth');
  renderForgotPassword(getAuthContent());
});

registerRoute('/reset-password', async (params) => {
  if (isAuthenticated()) { navigate('/dashboard'); return; }
  ensureShell('auth');
  await renderResetPassword(getAuthContent(), params);
});

// ── Authenticated Routes ──

function authedRoute(handler) {
  return async (params) => {
    const isFirstShell = currentShell !== 'app';
    ensureShell('app');
    const content = getContent();
    content._cleanup?.();   // cancel any in-flight async renderer
    content.style.cssText = ''; // reset inline style overrides left by the previous page
    const path = currentPath();
    updateActiveNav(path);
    await handler(content, params);
    if (isFirstShell) startTourIfNeeded();
    else resumeTour(path.split('?')[0]);
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

registerRoute('/analytics', authedRoute(async (content) => {
  await renderReports(content);
}));

registerRoute('/intelligence', authedRoute(async (content) => {
  await renderIntelligence(content);
}));

registerRoute('/predictive', authedRoute(async (content) => {
  await renderPredictive(content);
}));

registerRoute('/actionable', authedRoute(async (content) => {
  await renderActionable(content);
}));

registerRoute('/environmental', authedRoute(async (content) => {
  await renderEnvironmental(content);
}));

registerRoute('/containment', authedRoute(async (content) => {
  await renderContainment(content);
}));

registerRoute('/custom-reports', authedRoute(async (content) => {
  await renderCustomReports(content);
}));

registerRoute('/observation-log', authedRoute(async (content) => {
  await renderObservationLog(content);
}));

// Redirect legacy /reports links to /analytics
registerRoute('/reports', async () => { navigate('/analytics'); });

registerRoute('/help', authedRoute(async (content) => {
  await renderHelp(content);
}));

registerRoute('/feedback', authedRoute(async (content) => {
  await renderFeedback(content);
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
