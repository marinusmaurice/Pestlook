import { isAuthenticated, } from '../utils/storage.js';
import { navigate } from '../utils/router.js';

export function renderLanding(container) {
  if (isAuthenticated()) {
    location.hash = '#/dashboard';
    return;
  }

  _injectStyles();
  _injectExternalResources();
  container.innerHTML = _getLandingHTML();
  _initLandingApp();
}

function _injectStyles() {
  if (document.getElementById('landing-styles')) return;
  const style = document.createElement('style');
  style.id = 'landing-styles';
  style.textContent = LANDING_CSS;
  document.head.appendChild(style);
}

function _injectExternalResources() {
  if (!document.getElementById('landing-fa')) {
    const fa = document.createElement('link');
    fa.id = 'landing-fa';
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
    document.head.appendChild(fa);
  }
  if (!document.getElementById('landing-gfonts')) {
    const gf = document.createElement('link');
    gf.id = 'landing-gfonts';
    gf.rel = 'stylesheet';
    gf.href = 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap';
    document.head.appendChild(gf);
  }
}

const LANDING_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #FEFCF5 !important; color: #1E2F2A; line-height: 1.5; scroll-behavior: smooth; overflow: auto !important; }
  #app-root { display: block !important; height: auto !important; }
  #landing-content { width: 100%; }
  :root {
    --primary: #2B6E4F; --primary-dark: #1F4E38; --primary-light: #EAF7F0;
    --accent: #E5A52F; --accent-dark: #C67C1E; --gray-light: #F9F7F0;
    --gray-border: #E2DFD3; --text-dark: #1F2A26; --text-muted: #5A6B62;
    --danger: #C75146; --white: #FFFFFF;
    --shadow-sm: 0 4px 12px rgba(0,0,0,0.04); --shadow-md: 0 8px 24px rgba(0,0,0,0.06);
    --radius-md: 20px; --radius-sm: 12px;
  }
  a { text-decoration: none; color: var(--primary); font-weight: 500; }
  .container { max-width: 1280px !important; margin: 0 auto !important; padding: 0 24px !important; }
  header { background: rgba(255,255,255,0.96); border-bottom: 1px solid var(--gray-border); position: sticky; top: 0; z-index: 50; backdrop-filter: blur(2px); }
  .navbar { display: flex; justify-content: space-between; align-items: center; padding: 18px 0; flex-wrap: wrap; }
  .logo { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; color: var(--primary-dark); }
  .logo span { color: var(--accent); }
  .nav-links { display: flex; gap: 32px; align-items: center; flex-wrap: wrap; }
  .nav-links a { font-weight: 500; color: var(--text-dark); transition: 0.2s; }
  .nav-links a:hover, .nav-links a.active { color: var(--primary); }
  .btn-outline { border: 1.5px solid var(--primary); background: transparent; padding: 8px 18px; border-radius: 40px; font-weight: 600; color: var(--primary); transition: 0.2s; }
  .btn-outline:hover { background: var(--primary-light); }
  .btn-primary { background: var(--primary); color: white; padding: 10px 24px; border-radius: 40px; font-weight: 600; border: none; cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center; gap: 8px; }
  .btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); }
  .btn-accent { background: var(--accent); color: #1E2F2A; font-weight: 700; }
  .btn-accent:hover { background: var(--accent-dark); color: white; }
  .view { display: none; animation: fade 0.25s ease; }
  .active-view { display: block; }
  @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .hero { display: flex; flex-wrap: wrap; gap: 48px; align-items: center; padding: 56px 0 48px; }
  .hero-content { flex: 1; }
  .hero-badge { background: var(--primary-light); color: var(--primary-dark); padding: 6px 14px; border-radius: 50px; font-size: 0.85rem; font-weight: 600; display: inline-block; margin-bottom: 20px; }
  .hero h1 { font-size: 3.2rem; font-weight: 800; line-height: 1.2; color: #1F2A26; margin-bottom: 20px; }
  .hero p { font-size: 1.2rem; color: var(--text-muted); max-width: 550px; margin-bottom: 28px; }
  .hero-stats { display: flex; gap: 28px; margin-top: 32px; }
  .stat-item strong { font-size: 1.5rem; color: var(--primary); }
  .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 32px; margin: 64px 0; }
  .feature-card { background: white; border-radius: var(--radius-md); padding: 28px 20px; box-shadow: var(--shadow-sm); border: 1px solid var(--gray-border); transition: 0.2s; }
  .feature-card i { font-size: 2.2rem; color: var(--primary); margin-bottom: 16px; }
  .pricing-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 32px; margin: 48px 0; }
  .pricing-card { background: white; border-radius: var(--radius-md); padding: 28px 24px; flex: 1; min-width: 260px; border: 1px solid var(--gray-border); transition: 0.2s; }
  .pricing-card.popular { border-top: 4px solid var(--accent); box-shadow: var(--shadow-md); }
  .price { font-size: 2.5rem; font-weight: 800; margin: 16px 0; }
  .feature-list { list-style: none; margin: 24px 0; }
  .feature-list li { margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .feature-list i.fa-check { color: var(--primary); }
  .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin: 32px 0; }
  .dash-card { background: white; border-radius: var(--radius-sm); padding: 20px; border: 1px solid var(--gray-border); }
  .scout-log { background: var(--gray-light); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 12px; }
  .logout-btn { background: none; border: 1px solid var(--gray-border); padding: 8px 16px; border-radius: 30px; cursor: pointer; font-weight: 500; }
  .form-group { margin-bottom: 20px; }
  .form-group input { width: 100%; padding: 14px 16px; border-radius: 40px; border: 1px solid var(--gray-border); font-size: 1rem; }
  .auth-toggle { text-align: center; margin-top: 16px; color: var(--primary); cursor: pointer; font-weight: 500; }
  .error-msg { color: var(--danger); font-size: 0.85rem; margin-top: 8px; }
  footer { border-top: 1px solid var(--gray-border); margin-top: 80px; padding: 32px 0; text-align: center; color: var(--text-muted); }
  @media (max-width: 768px) {
    .navbar { flex-direction: column; gap: 16px; }
    .nav-links { justify-content: center; gap: 20px; }
    .hero h1 { font-size: 2.3rem; }
    .container { padding: 0 20px; }
  }
`;

function _getLandingHTML() {
  return `
    <header>
      <div class="container">
        <div class="navbar">
          <div class="logo">Pest<span>Look</span></div>
          <div class="nav-links" id="navLinks">
            <a href="#home" data-nav="home" class="nav-link">Home</a>
            <a href="#pricing" data-nav="pricing" class="nav-link">Pricing &amp; Plans</a>
            <a href="#dashboard" data-nav="dashboard" class="nav-link" id="dashboardNavLink" style="display:none;">Dashboard</a>
            <a href="#account" data-nav="account" class="nav-link" id="accountNavLink">Account</a>
            <button id="logoutBtnMobile" class="logout-btn" style="display:none;">Logout <i class="fas fa-sign-out-alt"></i></button>
          </div>
        </div>
      </div>
    </header>

    <main id="appMain" class="container">
      <div id="homeView" class="view">
        <div class="hero">
          <div class="hero-content">
            <div class="hero-badge"><i class="fas fa-seedling"></i> Field-first. Trusted by agronomists</div>
            <h1>Replace paper scouting sheets with <span style="color:var(--accent);">real-time pest monitoring</span></h1>
            <p>Know pest pressure before it damages your crops â€” digital scouting + trap tracking in one system. Works offline, instant reports.</p>
            <a href="#account" class="btn-primary" id="heroCtaBtn"><i class="fas fa-tractor"></i> Start free scouting</a>
            <div class="hero-stats">
              <div class="stat-item"><strong>4x</strong><br>faster scouting</div>
              <div class="stat-item"><strong>30%</strong><br>less crop loss*</div>
              <div class="stat-item"><strong>100%</strong><br>offline capable</div>
            </div>
          </div>
          <div style="flex:1;background:var(--primary-light);border-radius:40px;padding:32px;text-align:center;">
            <i class="fas fa-map-marked-alt" style="font-size:5rem;color:var(--primary);"></i>
            <p style="margin-top:16px;"><strong>GPS trap locations &bull; Photo logs &bull; PDF reports</strong></p>
          </div>
        </div>
        <div class="features-grid">
          <div class="feature-card"><i class="fas fa-mobile-alt"></i><h3>Offline-first</h3><p>Log pests even in remote fields â€” syncs automatically when back online.</p></div>
          <div class="feature-card"><i class="fas fa-chart-line"></i><h3>Smart trap monitoring</h3><p>Track pheromone traps, sticky traps, thresholds. Get infestation alerts.</p></div>
          <div class="feature-card"><i class="fas fa-camera"></i><h3>Photo + GPS logging</h3><p>Take photos, add notes, geotag â€” build digital scouting history.</p></div>
          <div class="feature-card"><i class="fas fa-file-pdf"></i><h3>Instant reports</h3><p>Generate weekly scouting reports for compliance, advisors, or co-ops.</p></div>
        </div>
        <div style="background:var(--primary-light);border-radius:28px;padding:32px;text-align:center;margin:24px 0;">
          <h3>ðŸšœ Trusted by South African farmers &amp; agronomists</h3>
          <p style="margin-top:12px;">"PestLook replaced our messy WhatsApp logs. Now scouting is structured and fast." â€” Riaan, crop consultant</p>
        </div>
      </div>

      <div id="pricingView" class="view">
        <div style="text-align:center;margin:40px 0 20px;">
          <h1 style="font-size:2.5rem;">Simple, transparent plans</h1>
          <p style="font-size:1.2rem;color:var(--text-muted);">All plans include offline mode, trap monitoring &amp; digital scouting logs.</p>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card">
            <h3>Starter Scout</h3>
            <div class="price">$0<span style="font-size:1rem;"> /month</span></div>
            <p>For individual farmers starting digital logs</p>
            <ul class="feature-list">
              <li><i class="fas fa-check"></i> Up to 3 fields</li>
              <li><i class="fas fa-check"></i> Trap monitoring (20 traps)</li>
              <li><i class="fas fa-check"></i> Photo &amp; notes logging</li>
              <li><i class="fas fa-check"></i> Basic PDF reports</li>
              <li><i class="fas fa-check"></i> Offline support</li>
            </ul>
            <button class="btn-primary choose-plan" data-plan="Starter Scout" style="width:100%;text-align:center;">Get started free</button>
          </div>
          <div class="pricing-card popular">
            <h3>Pro Agronomist <span style="background:var(--accent);font-size:0.7rem;padding:4px 8px;border-radius:30px;">MOST POPULAR</span></h3>
            <div class="price">$29<span style="font-size:1rem;"> /month</span></div>
            <p>Perfect for farms &amp; professional scouts</p>
            <ul class="feature-list">
              <li><i class="fas fa-check"></i> Unlimited fields &amp; traps</li>
              <li><i class="fas fa-check"></i> Advanced trap threshold alerts</li>
              <li><i class="fas fa-check"></i> GPS location + offline maps</li>
              <li><i class="fas fa-check"></i> Custom scouting forms</li>
              <li><i class="fas fa-check"></i> Multi-farm / client reports</li>
              <li><i class="fas fa-check"></i> CSV &amp; PDF export</li>
              <li><i class="fas fa-check"></i> Priority email support</li>
            </ul>
            <button class="btn-primary choose-plan" data-plan="Pro Agronomist" style="width:100%;">Start 14-day trial</button>
          </div>
          <div class="pricing-card">
            <h3>Enterprise / Cooperative</h3>
            <div class="price">Custom</div>
            <p>For large estates, co-ops &amp; advisory firms</p>
            <ul class="feature-list">
              <li><i class="fas fa-check"></i> Everything in Pro</li>
              <li><i class="fas fa-check"></i> API access &amp; integrations</li>
              <li><i class="fas fa-check"></i> Dedicated account manager</li>
              <li><i class="fas fa-check"></i> White-label reporting</li>
              <li><i class="fas fa-check"></i> Multi-user roles + permissions</li>
              <li><i class="fas fa-check"></i> On-site training available</li>
            </ul>
            <button class="btn-outline choose-plan" data-plan="Enterprise" style="width:100%;">Contact sales</button>
          </div>
        </div>
        <div style="background:var(--gray-light);border-radius:24px;padding:24px;margin:40px 0;">
          <h3><i class="fas fa-check-circle"></i> All plans include core features:</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:16px;">
            <span>âœ” Digital scouting sheets</span><span>âœ” Trap count history</span>
            <span>âœ” Photo evidence storage</span><span>âœ” Weather tags</span>
            <span>âœ” Pest identification guide</span><span>âœ” Mobile &amp; web sync</span>
            <span>âœ” No ads, ever</span>
          </div>
        </div>
      </div>

      <div id="accountView" class="view">
        <div style="max-width:480px;margin:60px auto;background:white;border-radius:28px;padding:36px 28px;box-shadow:var(--shadow-md);">
          <h2 id="formTitle" style="margin-bottom:24px;">Login to PestLook</h2>
          <div id="authErrorMsg" class="error-msg" style="margin-bottom:12px;"></div>
          <form id="authForm">
            <div class="form-group"><input type="email" id="authEmail" placeholder="Email address" required></div>
            <div class="form-group"><input type="password" id="authPassword" placeholder="Password" required></div>
            <button type="submit" class="btn-primary" id="authSubmitBtn" style="width:100%;justify-content:center;">Login</button>
          </form>
          <div class="auth-toggle" id="toggleAuthMode">Don't have an account? <strong>Register now</strong></div>
        </div>
      </div>

      <div id="dashboardView" class="view">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;margin:24px 0 20px;">
          <h1><i class="fas fa-chart-simple"></i> Scouting Dashboard</h1>
          <button id="logoutBtnDash" class="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
        </div>
        <div class="dashboard-grid">
          <div class="dash-card"><i class="fas fa-bug"></i> <strong>Active traps</strong><br><span style="font-size:2rem;" id="activeTraps">14</span><br>Last 7 days: +2 alerts</div>
          <div class="dash-card"><i class="fas fa-clipboard-list"></i> <strong>Scouting reports</strong><br><span style="font-size:2rem;" id="scoutCount">4</span><br>This month</div>
          <div class="dash-card"><i class="fas fa-map-marker-alt"></i> <strong>Fields monitored</strong><br><span style="font-size:2rem;" id="fieldsCount">3</span><br>GPS enabled</div>
        </div>
        <div class="dash-card" style="margin-bottom:24px;">
          <h3>ðŸ“‹ Recent scouting logs</h3>
          <div id="recentScoutingList">
            <div class="scout-log"><i class="fas fa-leaf"></i> <strong>Maize field A</strong> â€” Fall armyworm: 8 larvae, treated (Nov 12)</div>
            <div class="scout-log"><i class="fas fa-chart-line"></i> <strong>Trap #4 (Citrus)</strong> â€” 12 false codling moth, threshold exceeded</div>
            <div class="scout-log"><i class="fas fa-camera"></i> <strong>Wheat block</strong> â€” Aphids detected, photo uploaded, action taken</div>
          </div>
          <button class="btn-outline" style="margin-top:12px;"><i class="fas fa-plus-circle"></i> Quick scout log (offline-ready)</button>
        </div>
        <div style="background:#EFF7EC;border-radius:24px;padding:20px;">
          <i class="fas fa-chart-line"></i> <strong>Pest pressure forecast:</strong> Low to moderate risk in Eastern regions. Check traps weekly.
        </div>
      </div>
    </main>

    <footer>
      <div class="container">
        <p>&copy; 2025 PestLook â€” Digital scouting &amp; trap monitoring. Built for farmers, agronomists, and the field.</p>
        <p style="margin-top:8px;"><i class="fas fa-envelope"></i> hello@pestlook.com | <i class="fas fa-phone-alt"></i> +27 (0) 21 001 2345</p>
      </div>
    </footer>
  `;
}

function _initLandingApp() {
  let currentUser = null;
  const STORAGE_USERS = 'pestlook_users';
  const STORAGE_CURRENT = 'pestlook_current';

  function initUsers() {
    if (!localStorage.getItem(STORAGE_USERS)) {
      localStorage.setItem(STORAGE_USERS, JSON.stringify([
        { email: 'farmer@demo.com', password: 'demo123', name: 'Demo Farmer' }
      ]));
    }
  }

  function getUsers() { return JSON.parse(localStorage.getItem(STORAGE_USERS)) || []; }
  function saveUsers(users) { localStorage.setItem(STORAGE_USERS, JSON.stringify(users)); }

  function registerUser(email, password) {
    const users = getUsers();
    if (users.find(u => u.email === email)) return { success: false, error: 'Email already registered.' };
    users.push({ email, password, name: email.split('@')[0] });
    saveUsers(users);
    return { success: true };
  }

  function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      currentUser = { email: user.email, name: user.name || user.email.split('@')[0] };
      localStorage.setItem(STORAGE_CURRENT, JSON.stringify(currentUser));
      return true;
    }
    return false;
  }

  function logout() {
    currentUser = null;
    localStorage.removeItem(STORAGE_CURRENT);
    updateAuthUI();
    navigateTo('home');
  }

  function loadCurrentSession() {
    const stored = localStorage.getItem(STORAGE_CURRENT);
    if (stored) {
      try { currentUser = JSON.parse(stored); return true; }
      catch (e) { logout(); }
    }
    return false;
  }

  let activeView = 'home';
  const views = {
    home:      document.getElementById('homeView'),
    pricing:   document.getElementById('pricingView'),
    account:   document.getElementById('accountView'),
    dashboard: document.getElementById('dashboardView')
  };

  function updateAuthUI() {
    const isLogged = !!currentUser;
    const dashboardNav    = document.getElementById('dashboardNavLink');
    const accountNavLink  = document.getElementById('accountNavLink');
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    if (dashboardNav)    dashboardNav.style.display    = isLogged ? 'inline-block' : 'none';
    if (accountNavLink)  accountNavLink.style.display  = isLogged ? 'none' : 'inline-block';
    if (logoutBtnMobile) logoutBtnMobile.style.display = isLogged ? 'inline-block' : 'none';
    if (activeView === 'dashboard' && !isLogged) navigateTo('account');
    if (isLogged && activeView === 'dashboard') renderDashboardContent();
  }

  function renderDashboardContent() {
    if (!currentUser) return;
    document.getElementById('activeTraps').innerText = Math.floor(Math.random() * 20) + 8;
    document.getElementById('scoutCount').innerText  = Math.floor(Math.random() * 12) + 2;
    document.getElementById('fieldsCount').innerText = Math.floor(Math.random() * 7)  + 2;
  }

  function navigateTo(viewId) {
    if (viewId === 'dashboard' && !currentUser) viewId = 'account';
    activeView = viewId;
    Object.keys(views).forEach(v => views[v].classList.remove('active-view'));
    if (views[viewId]) views[viewId].classList.add('active-view');
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href')?.substring(1) === viewId);
    });
    if (viewId === 'dashboard' && currentUser) renderDashboardContent();
  }

  let isLoginMode = true;
  const authForm      = document.getElementById('authForm');
  const authEmail     = document.getElementById('authEmail');
  const authPassword  = document.getElementById('authPassword');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const formTitle     = document.getElementById('formTitle');
  const toggleAuth    = document.getElementById('toggleAuthMode');
  const authErrorMsg  = document.getElementById('authErrorMsg');

  function setAuthMode(loginMode) {
    isLoginMode = loginMode;
    if (isLoginMode) {
      formTitle.innerText = 'Login to PestLook';
      authSubmitBtn.innerText = 'Login';
      toggleAuth.innerHTML = `Don't have an account? <strong>Register now</strong>`;
    } else {
      formTitle.innerText = 'Create your account';
      authSubmitBtn.innerText = 'Register';
      toggleAuth.innerHTML = `Already have an account? <strong>Login</strong>`;
    }
    authErrorMsg.innerText = '';
  }

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email    = authEmail.value.trim();
    const password = authPassword.value.trim();
    if (!email || !password) { authErrorMsg.innerText = 'Please enter email and password.'; return; }
    if (isLoginMode) {
      if (loginUser(email, password)) {
        authErrorMsg.innerText = '';
        authForm.reset();
        updateAuthUI();
        navigateTo('dashboard');
      } else {
        authErrorMsg.innerText = 'Invalid credentials. Try farmer@demo.com / demo123 or register.';
      }
    } else {
      const result = registerUser(email, password);
      if (result.success) {
        loginUser(email, password);
        authForm.reset();
        updateAuthUI();
        navigateTo('dashboard');
      } else {
        authErrorMsg.innerText = result.error;
      }
    }
  });

  toggleAuth.addEventListener('click', () => setAuthMode(!isLoginMode));

  function handleLogout() { logout(); navigateTo('home'); }
  document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);
  document.getElementById('logoutBtnDash')?.addEventListener('click', handleLogout);

  document.querySelectorAll('.choose-plan').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.getAttribute('data-plan');
      if (!currentUser) {
        navigate('/login');
      } else {
        alert(`âœ… Thank you! You selected the ${plan} plan. Payment integration demo.`);
      }
    });
  });

  document.getElementById('heroCtaBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/login');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('href').substring(1);
      if (target === 'account') { navigate('/login'); return; }
      navigateTo(target === 'dashboard' && !currentUser ? 'account' : target);
    });
  });

  initUsers();
  loadCurrentSession();
  setAuthMode(true);
  navigateTo('home');
  updateAuthUI();
}


