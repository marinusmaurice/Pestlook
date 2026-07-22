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

/* ───────────────────── CSS ───────────────────── */

const LANDING_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #F7F8FA !important; color: #1A1D24; line-height: 1.6; scroll-behavior: smooth; overflow: auto !important; -webkit-font-smoothing: antialiased; }
  #app-root { display: block !important; height: auto !important; }
  #landing-content { width: 100%; }
  :root {
    --primary: #2A5BD7; --primary-dark: #1B3F9E; --primary-light: #EAF0FC; --primary-soft: #D3E1F8;
    --accent: #DFA13C; --accent-dark: #B9832C; --gray-light: #F1F3F6;
    --gray-border: #E3E7EC; --text-dark: #1A1D24; --text-muted: #5B6472;
    --danger: #C75146; --white: #FFFFFF;
    --shadow-xs: 0 1px 2px rgba(31,42,38,0.04);
    --shadow-sm: 0 1px 2px rgba(31,42,38,0.04), 0 6px 16px rgba(31,42,38,0.05);
    --shadow-md: 0 2px 4px rgba(31,42,38,0.04), 0 16px 36px rgba(31,42,38,0.08);
    --shadow-lg: 0 4px 10px rgba(31,42,38,0.06), 0 28px 60px rgba(31,42,38,0.12);
    --ease: cubic-bezier(.22,1,.36,1);
    --radius-lg: 24px; --radius-md: 18px; --radius-sm: 12px; --radius-btn: 11px;
  }
  a { text-decoration: none; color: var(--primary); font-weight: 500; }
  .container { max-width: 1240px !important; margin: 0 auto !important; padding: 0 28px !important; }
  h1, h2, h3, h4 { letter-spacing: -0.02em; color: var(--text-dark); }
  ::selection { background: var(--primary-soft); color: var(--primary-dark); }

  /* header */
  header { background: rgba(247,248,250,0.86); border-bottom: 1px solid var(--gray-border); position: sticky; top: 0; z-index: 50; backdrop-filter: blur(10px) saturate(1.4); -webkit-backdrop-filter: blur(10px) saturate(1.4); }
  .navbar { display: flex; justify-content: space-between; align-items: center; padding: 17px 0; flex-wrap: wrap; }
  .logo { font-size: 1.6rem; font-weight: 750; letter-spacing: -0.03em; color: var(--primary-dark); }
  .logo span { color: var(--accent); }
  .nav-links { display: flex; gap: 30px; align-items: center; flex-wrap: wrap; }
  .nav-links a { font-weight: 500; font-size: 0.93rem; color: var(--text-muted); transition: color 0.15s var(--ease); position: relative; }
  .nav-links a:hover { color: var(--text-dark); }
  .nav-links a.active { color: var(--primary); }

  /* buttons */
  .btn-outline { border: 1.5px solid var(--gray-border); background: var(--white); padding: 9px 19px; border-radius: var(--radius-btn); font-weight: 600; font-size: 0.92rem; color: var(--text-dark); transition: all 0.18s var(--ease); }
  .btn-outline:hover { border-color: var(--primary); color: var(--primary); box-shadow: var(--shadow-xs); }
  .btn-primary { background: var(--primary); color: white; padding: 11px 22px; border-radius: var(--radius-btn); font-weight: 600; font-size: 0.92rem; border: none; cursor: pointer; transition: all 0.18s var(--ease); display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 1px 2px rgba(27,63,158,0.15), 0 8px 20px rgba(42,91,215,0.18); }
  .btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); box-shadow: 0 2px 4px rgba(27,63,158,0.18), 0 12px 28px rgba(42,91,215,0.24); }
  .btn-primary:active { transform: translateY(0); }
  .btn-accent { background: var(--accent); color: #2A1F0A; box-shadow: 0 1px 2px rgba(185,131,44,0.2), 0 8px 20px rgba(223,161,60,0.22); }
  .btn-accent:hover { background: var(--accent-dark); color: white; box-shadow: 0 2px 4px rgba(185,131,44,0.24), 0 12px 28px rgba(223,161,60,0.28); }

  /* views */
  .view { display: none; animation: fade 0.35s var(--ease); }
  .active-view { display: block; }
  @keyframes fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  /* hero */
  .hero { position: relative; display: flex; flex-wrap: wrap; gap: 52px; align-items: center; padding: 76px 0 64px; overflow: visible; }
  .hero-blob { position: absolute; border-radius: 50%; filter: blur(64px); pointer-events: none; z-index: 0; opacity: 0.55; }
  .hero-blob-a { width: 420px; height: 420px; background: radial-gradient(circle, rgba(42,91,215,0.16), transparent 70%); top: -140px; left: -120px; }
  .hero-blob-b { width: 380px; height: 380px; background: radial-gradient(circle, rgba(223,161,60,0.14), transparent 70%); bottom: -160px; right: -80px; }
  .hero-content { flex: 1; min-width: 320px; position: relative; z-index: 1; }
  .hero-badge { background: var(--primary-light); color: var(--primary-dark); padding: 7px 15px; border-radius: 30px; font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 7px; margin-bottom: 22px; border: 1px solid rgba(42,91,215,0.12); }
  .hero h1 { font-size: 3.1rem; font-weight: 780; line-height: 1.14; margin-bottom: 20px; }
  .hero p { font-size: 1.14rem; color: var(--text-muted); max-width: 540px; margin-bottom: 30px; line-height: 1.65; }
  .hero-stats { display: flex; gap: 30px; margin-top: 36px; flex-wrap: wrap; }
  .stat-item { font-size: 0.85rem; color: var(--text-muted); }
  .stat-item strong { display: block; font-size: 1.4rem; color: var(--primary-dark); font-weight: 750; }
  .hero-visual { flex: 1; min-width: 300px; position: relative; z-index: 1; background: var(--white); border-radius: 28px; padding: 38px 30px; text-align: center; border: 1px solid var(--gray-border); box-shadow: var(--shadow-lg); }
  .hero-visual i.fa-map-marked-alt { font-size: 4rem; color: var(--primary); margin-bottom: 14px; }
  .hero-chip { background: var(--gray-light); border: 1px solid var(--gray-border); padding: 6px 13px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; color: var(--text-dark); }

  /* feature cards */
  .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 22px; margin: 72px 0; }
  .feature-card { background: white; border-radius: var(--radius-md); padding: 26px 24px; box-shadow: var(--shadow-sm); border: 1px solid var(--gray-border); transition: all 0.25s var(--ease); }
  .feature-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: rgba(42,91,215,0.22); }
  .feature-card .icon-box { width: 46px; height: 46px; border-radius: 13px; background: var(--primary-light); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
  .feature-card i { font-size: 1.3rem; color: var(--primary); }
  .feature-card h3 { margin-bottom: 9px; font-size: 1.02rem; font-weight: 650; }
  .feature-card p { color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; }

  /* how-it-works */
  .how-section { margin: 56px 0; }
  .how-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 32px; margin-top: 40px; }
  .how-step { text-align: center; position: relative; }
  .step-number { width: 42px; height: 42px; border-radius: 13px; background: var(--primary-dark); color: white; font-weight: 700; font-size: 1.05rem; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 18px; box-shadow: 0 6px 16px rgba(27,63,158,0.22); }
  .how-step h4 { margin-bottom: 8px; font-weight: 650; font-size: 1rem; }
  .how-step p { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; }

  /* analytics banner */
  .analytics-banner { position: relative; overflow: hidden; background: linear-gradient(160deg, var(--primary-dark) 0%, var(--primary) 100%); border-radius: var(--radius-lg); padding: 44px 40px; color: white; margin: 56px 0; box-shadow: var(--shadow-lg); }
  .analytics-banner::before { content: ''; position: absolute; top: -30%; right: -10%; width: 60%; height: 160%; background: radial-gradient(circle, rgba(255,255,255,0.08), transparent 65%); pointer-events: none; }
  .analytics-banner h2 { color: white; font-size: 1.95rem; margin-bottom: 12px; font-weight: 720; }
  .analytics-banner p { opacity: 0.88; font-size: 1.02rem; max-width: 620px; margin-bottom: 26px; line-height: 1.65; }
  .analytics-chips .chip { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.14); padding: 8px 14px; border-radius: 12px; font-size: 0.83rem; font-weight: 500; color: rgba(255,255,255,0.94); line-height: 1.5; }

  /* testimonials */
  .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 22px; margin: 32px 0 48px; }
  .testimonial-card { background: white; border-radius: var(--radius-md); padding: 24px; border: 1px solid var(--gray-border); box-shadow: var(--shadow-sm); }
  .testimonial-card .stars { color: var(--accent); margin-bottom: 12px; }
  .testimonial-card blockquote { font-style: italic; color: var(--text-dark); margin-bottom: 16px; line-height: 1.65; }
  .testimonial-card .author { font-weight: 600; color: var(--text-muted); font-size: 0.88rem; }

  /* pricing */
  .pricing-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 28px; margin: 48px 0; }
  .pricing-card { background: white; border-radius: var(--radius-md); padding: 30px 26px; flex: 1; min-width: 260px; border: 1px solid var(--gray-border); box-shadow: var(--shadow-sm); transition: all 0.2s var(--ease); }
  .pricing-card.popular { box-shadow: var(--shadow-lg); border-color: rgba(42,91,215,0.2); }
  .price { font-size: 2.4rem; font-weight: 780; margin: 16px 0; letter-spacing: -0.02em; }
  .feature-list { list-style: none; margin: 22px 0; }
  .feature-list li { margin-bottom: 12px; display: flex; align-items: center; gap: 10px; font-size: 0.92rem; }
  .feature-list i.fa-check { color: var(--primary); background: var(--primary-light); width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.62rem; flex-shrink: 0; }

  /* dashboard */
  .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 32px 0; }
  .dash-card { background: white; border-radius: var(--radius-sm); padding: 20px; border: 1px solid var(--gray-border); box-shadow: var(--shadow-xs); }
  .scout-log { background: var(--gray-light); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 12px; }
  .logout-btn { background: white; border: 1px solid var(--gray-border); padding: 9px 17px; border-radius: var(--radius-btn); cursor: pointer; font-weight: 600; font-size: 0.88rem; transition: all 0.15s var(--ease); }
  .logout-btn:hover { border-color: var(--primary); color: var(--primary); }

  /* forms */
  .form-group { margin-bottom: 18px; }
  .form-group input { width: 100%; padding: 13px 16px; border-radius: var(--radius-btn); border: 1.5px solid var(--gray-border); font-size: 0.96rem; font-family: inherit; transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease); }
  .form-group input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(42,91,215,0.1); }
  .auth-toggle { text-align: center; margin-top: 18px; color: var(--primary); cursor: pointer; font-weight: 500; font-size: 0.9rem; }
  .error-msg { color: var(--danger); font-size: 0.85rem; margin-top: 8px; }

  /* faq */
  .faq-section { margin: 72px 0; }
  .faq-section h2 { font-size: 1.9rem; text-align: center; margin-bottom: 8px; font-weight: 720; }
  .faq-section > p { text-align: center; color: var(--text-muted); margin-bottom: 34px; }
  .faq-item { border: 1px solid var(--gray-border); border-radius: var(--radius-sm); margin-bottom: 10px; background: white; overflow: hidden; transition: border-color 0.15s var(--ease); }
  .faq-item:hover { border-color: rgba(42,91,215,0.25); }
  .faq-item summary { padding: 18px 22px; font-weight: 600; font-size: 0.96rem; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .faq-item summary::-webkit-details-marker { display: none; }
  .faq-item summary::after { content: '+'; font-size: 1.3rem; font-weight: 400; color: var(--primary); transition: transform 0.25s var(--ease); flex-shrink: 0; }
  .faq-item[open] summary::after { transform: rotate(45deg); }
  .faq-item[open] summary { color: var(--primary-dark); }
  .faq-answer { padding: 0 22px 20px; color: var(--text-muted); line-height: 1.7; font-size: 0.93rem; }

  /* screenshots carousel */
  .screenshots-section { margin: 72px 0; }
  .carousel-wrap { position: relative; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-lg); background: #14161C; line-height: 0; border: 1px solid rgba(0,0,0,0.06); }
  .carousel-track { display: flex; transition: transform 0.5s var(--ease); will-change: transform; }
  .carousel-slide { min-width: 100%; }
  .carousel-slide img { width: 100%; height: auto; display: block; }
  .carousel-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.94); border: none; width: 42px; height: 42px; border-radius: 50%; box-shadow: var(--shadow-md); cursor: pointer; font-size: 1.4rem; line-height: 1; color: var(--primary-dark); z-index: 3; display: flex; align-items: center; justify-content: center; transition: all 0.18s var(--ease); }
  .carousel-btn:hover { background: white; transform: translateY(-50%) scale(1.06); }
  .carousel-prev { left: 14px; }
  .carousel-next { right: 14px; }
  .carousel-caption { text-align: center; margin-top: 16px; color: var(--text-muted); font-size: 0.92rem; font-weight: 500; min-height: 22px; }
  .carousel-dots { display: flex; justify-content: center; gap: 7px; margin-top: 14px; }
  .carousel-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gray-border); border: none; cursor: pointer; padding: 0; transition: all 0.25s var(--ease); }
  .carousel-dot.active { background: var(--primary); width: 22px; border-radius: 4px; }
  .mobile-frames { display: flex; gap: 20px; justify-content: center; margin-top: 52px; flex-wrap: wrap; }
  .mobile-frame { background: #14161C; border-radius: 26px; padding: 9px; box-shadow: var(--shadow-lg); flex: 0 1 180px; }
  .mobile-frame img { width: 100%; border-radius: 18px; display: block; }

  footer { border-top: 1px solid var(--gray-border); margin-top: 88px; padding: 36px 0; text-align: center; color: var(--text-muted); font-size: 0.9rem; }

  @media (max-width: 768px) {
    .navbar { flex-direction: column; gap: 16px; }
    .nav-links { justify-content: center; gap: 20px; }
    .hero { padding: 48px 0 40px; }
    .hero h1 { font-size: 2.2rem; }
    .container { padding: 0 20px; }
    .analytics-banner { padding: 30px 22px; }
    .analytics-banner h2 { font-size: 1.5rem; }
  }
`;

/* ───────────────────── HTML ───────────────────── */

function _getLandingHTML() {
  return `
    <header>
      <div class="container">
        <div class="navbar">
          <div class="logo">Pest<span>Look</span></div>
          <div class="nav-links" id="navLinks">
            <a href="#home" data-nav="home" class="nav-link">Home</a>
            <a href="#pricing" data-nav="pricing" class="nav-link">Pricing &amp; Plans</a>
            <a href="#about" data-nav="about" class="nav-link">About</a>
            <a href="#dashboard" data-nav="dashboard" class="nav-link" id="dashboardNavLink" style="display:none;">Dashboard</a>
            <a href="#account" data-nav="account" class="nav-link" id="accountNavLink">Account</a>
            <button id="logoutBtnMobile" class="logout-btn" style="display:none;">Logout <i class="fas fa-sign-out-alt"></i></button>
          </div>
        </div>
      </div>
    </header>

    <main id="appMain" class="container">
      <!-- HOME VIEW -->
      <div id="homeView" class="view">
        <div class="hero">
          <div class="hero-blob hero-blob-a"></div>
          <div class="hero-blob hero-blob-b"></div>
          <div class="hero-content">
            <div class="hero-badge"><i class="fas fa-seedling"></i> Built for the field</div>
            <h1>One platform to <span style="color:var(--accent);">scout, trap, and protect</span> every hectare</h1>
            <p>PestLook gives farmers and agronomists a complete system to manage farms, deploy traps, run scouting sessions, record pest observations with GPS and photos, and turn field data into actionable analytics reports.</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <a href="#account" class="btn-primary" id="heroCtaBtn"><i class="fas fa-tractor"></i> Start free scouting</a>
              <a href="/downloads/com.pestlook.ui.mobile-Signed.apk" class="btn-outline" download><i class="fab fa-android" style="color:var(--primary);"></i> Download Android app</a>
              <a href="#pricing" class="btn-outline" id="heroPricingBtn">View plans</a>
            </div>
            <div class="hero-stats">
              <div class="stat-item"><strong>Analytics</strong>&amp; intelligence suite</div>
              <div class="stat-item"><strong>100%</strong>offline capable</div>
              <div class="stat-item"><strong>GPS</strong>every observation</div>
            </div>
          </div>
          <div class="hero-visual">
            <i class="fas fa-map-marked-alt"></i>
            <p style="font-weight:650;font-size:1.05rem;margin-bottom:18px;">Your entire operation on one map</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
              <span class="hero-chip"><i class="fas fa-map-pin" style="color:var(--primary);"></i> Farm boundaries</span>
              <span class="hero-chip"><i class="fas fa-crosshairs" style="color:var(--primary);"></i> Trap GPS pins</span>
              <span class="hero-chip"><i class="fas fa-barcode" style="color:var(--primary);"></i> Barcode scanning</span>
              <span class="hero-chip"><i class="fas fa-camera" style="color:var(--primary);"></i> Photo evidence</span>
            </div>
          </div>
        </div>

        <!-- CORE FEATURES -->
        <div style="text-align:center;margin-top:24px;">
          <h2 style="font-size:2rem;">Everything you need from field to report</h2>
          <p style="color:var(--text-muted);margin-top:8px;max-width:620px;margin-left:auto;margin-right:auto;">PestLook replaces paper sheets, scattered WhatsApp photos, and guesswork with one structured, GPS-tagged, offline-ready system.</p>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <div class="icon-box"><i class="fas fa-warehouse"></i></div>
            <h3>Farm &amp; field management</h3>
            <p>Organise your operation by farm, field, crop type, and season. Define geographic boundaries for precision mapping and track area in hectares.</p>
          </div>
          <div class="feature-card">
            <div class="icon-box"><i class="fas fa-crosshairs"></i></div>
            <h3>Trap deployment &amp; barcode scanning</h3>
            <p>Register sticky, pheromone, or pitfall traps with GPS coordinates. Scan barcodes or QR codes in the field for instant trap lookup.</p>
          </div>
          <div class="feature-card">
            <div class="icon-box"><i class="fas fa-clipboard-check"></i></div>
            <h3>Planned &amp; ad-hoc scouting</h3>
            <p>Admins schedule sessions with assigned scouts, target fields, and observation checklists. Scouts can also start ad-hoc runs on the fly from the mobile app.</p>
          </div>
          <div class="feature-card">
            <div class="icon-box"><i class="fas fa-bug"></i></div>
            <h3>Pest observations with thresholds</h3>
            <p>Record counts or presence/absence per pest species and life stage. The system automatically flags when observations exceed economic action thresholds.</p>
          </div>
          <div class="feature-card">
            <div class="icon-box"><i class="fas fa-mobile-alt"></i></div>
            <h3>Offline-first mobile app</h3>
            <p>The mobile app caches farms, fields, pests, traps, and sessions locally. Work offline in remote blocks &mdash; two-way sync uploads everything when connectivity returns.</p>
          </div>
          <div class="feature-card">
            <div class="icon-box"><i class="fas fa-satellite-dish"></i></div>
            <h3>GPS + weather capture</h3>
            <p>Every observation is geotagged with configurable accuracy. Session temperature and weather conditions are recorded automatically alongside your data.</p>
          </div>
          <div class="feature-card">
            <div class="icon-box"><i class="fas fa-chart-pie"></i></div>
            <h3>Analytics &amp; intelligence suite</h3>
            <p>Threshold alerts, pest pressure trends, trap performance, scout productivity, seasonal patterns, field coverage, spread direction, origin detection, neighbour risk, population forecasts, GPS hotspot maps, and more &mdash; all filterable by date, farm, field, or scout.</p>
          </div>
          <div class="feature-card">
            <div class="icon-box"><i class="fas fa-users-cog"></i></div>
            <h3>Multi-tenant team management</h3>
            <p>Each organisation is fully isolated. Admins manage scouts, assign roles, configure trap types, and review billing snapshots &mdash; all from the web dashboard.</p>
          </div>
          <div class="feature-card">
            <div class="icon-box"><i class="fas fa-table"></i></div>
            <h3>Custom reporting</h3>
            <p>Build ad-hoc queries across farms, fields, pests, sessions, observations, and traps. Filter, group, aggregate, sort, and export to CSV &mdash; all scoped automatically to your organisation.</p>
          </div>
          <div class="feature-card">
            <div class="icon-box"><i class="fas fa-file-excel"></i></div>
            <h3>Paper sheet import</h3>
            <p>Download a pre-filled Excel template scoped to one field, with dropdown-validated traps, pests, and scouts. Fill it in offline, upload it back, and PestLook validates every row before creating the session &mdash; converting temperature units and timezones automatically.</p>
          </div>
        </div>

        <!-- SCREENSHOTS -->
        <div class="screenshots-section">
          <div style="text-align:center;margin-bottom:32px;">
            <h2 style="font-size:2rem;">See it in action</h2>
            <p style="color:var(--text-muted);margin-top:8px;max-width:560px;margin-left:auto;margin-right:auto;">Real screens from the live platform — no mockups, no stock photos.</p>
          </div>
          <div class="carousel-wrap">
            <div class="carousel-track" id="carouselTrack">
              <div class="carousel-slide"><img src="/images/dashboard.png" alt="PestLook dashboard overview" loading="lazy"></div>
              <div class="carousel-slide"><img src="/images/field.png" alt="Farm and field management" loading="lazy"></div>
              <div class="carousel-slide"><img src="/images/pests.png" alt="Pest library with thresholds" loading="lazy"></div>
              <div class="carousel-slide"><img src="/images/traps.png" alt="Trap management and GPS" loading="lazy"></div>
              <div class="carousel-slide"><img src="/images/analytics.png" alt="Analytics dashboards" loading="lazy"></div>
              <div class="carousel-slide"><img src="/images/predictive.png" alt="Predictive intelligence" loading="lazy"></div>
              <div class="carousel-slide"><img src="/images/observationlog.png" alt="Observation Log — cross-session explorer" loading="lazy"></div>
            </div>
            <button class="carousel-btn carousel-prev" id="carouselPrev" aria-label="Previous">&#8249;</button>
            <button class="carousel-btn carousel-next" id="carouselNext" aria-label="Next">&#8250;</button>
          </div>
          <div class="carousel-caption" id="carouselCaption"></div>
          <div class="carousel-dots" id="carouselDots"></div>

          <div style="text-align:center;margin-top:52px;margin-bottom:20px;">
            <p style="font-weight:700;font-size:1.05rem;"><i class="fab fa-android" style="color:#3DDC84;"></i> Android app — built for the field</p>
            <p style="color:var(--text-muted);font-size:0.9rem;margin-top:4px;">Offline-first logging, GPS tagging, and barcode scanning — even without signal.</p>
          </div>
          <div class="mobile-frames">
            <div class="mobile-frame"><img src="/images/mobile1.png" alt="Mobile scouting session" loading="lazy"></div>
            <div class="mobile-frame"><img src="/images/mobile2.png" alt="Mobile observation logging" loading="lazy"></div>
            <div class="mobile-frame"><img src="/images/mobile3.png" alt="Mobile GPS mapping" loading="lazy"></div>
          </div>
        </div>

        <!-- HOW IT WORKS -->
        <div class="how-section">
          <div style="text-align:center;">
            <h2 style="font-size:2rem;">How PestLook works</h2>
            <p style="color:var(--text-muted);margin-top:8px;">From setup to insight in four steps</p>
          </div>
          <div class="how-grid">
            <div class="how-step">
              <div class="step-number">1</div>
              <h4>Set up your operation</h4>
              <p>Add farms with GPS boundaries. Create fields by crop type and season. Register traps with barcodes and locations.</p>
            </div>
            <div class="how-step">
              <div class="step-number">2</div>
              <h4>Plan scouting sessions</h4>
              <p>Schedule sessions in the web dashboard with assigned scouts, target fields, and pre-built observation checklists &mdash; or let scouts start ad-hoc from mobile.</p>
            </div>
            <div class="how-step">
              <div class="step-number">3</div>
              <h4>Record in the field</h4>
              <p>Scouts log pest counts, life stages, photos, trap inspections, and GPS locations &mdash; even offline. Barcode scan traps for instant identification.</p>
            </div>
            <div class="how-step">
              <div class="step-number">4</div>
              <h4>Analyse &amp; act</h4>
              <p>Sync data and explore 11 report dashboards: threshold alerts, pest pressure, trap performance, seasonal trends, field coverage, and more.</p>
            </div>
          </div>
        </div>

        <!-- ANALYTICS BANNER -->
        <div class="analytics-banner">
          <h2><i class="fas fa-brain"></i> From field data to decisions &mdash; automatically</h2>
          <p>Every observation your scouts record feeds a living intelligence system. PestLook doesn&rsquo;t just store data &mdash; it analyses trends, forecasts outbreaks, maps pest movement across your fields, and tells you exactly where to look next and when to act. All reports are filterable by date range, farm, field, crop, or scout. Every feature is available on every plan.</p>
          <div style="display:flex;flex-wrap:wrap;gap:24px;margin:28px 0 4px;">
            <div style="flex:1;min-width:220px;">
              <p style="font-weight:700;font-size:0.85rem;opacity:0.8;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">Operations &amp; Monitoring</p>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <span class="chip"><i class="fas fa-tachometer-alt"></i> <strong>Dashboard overview</strong> &mdash; live KPIs across all farms at a glance</span>
                <span class="chip"><i class="fas fa-bell"></i> <strong>Threshold alerts</strong> &mdash; instant notification when pest counts cross your economic action threshold</span>
                <span class="chip"><i class="fas fa-crosshairs"></i> <strong>Trap performance</strong> &mdash; see which traps are active, which need repositioning, and capture rates over time</span>
                <span class="chip"><i class="fas fa-clipboard-list"></i> <strong>Session tracking</strong> &mdash; planned vs. completed, coverage gaps, and missed fields at a glance</span>
                <span class="chip"><i class="fas fa-user-check"></i> <strong>Scout productivity</strong> &mdash; observations per scout, session frequency, and time-in-field metrics</span>
                <span class="chip"><i class="fas fa-layer-group"></i> <strong>Field coverage</strong> &mdash; visual heat map of which fields have been scouted and how recently</span>
              </div>
            </div>
            <div style="flex:1;min-width:220px;">
              <p style="font-weight:700;font-size:0.85rem;opacity:0.8;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">Pest Intelligence</p>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <span class="chip"><i class="fas fa-fire"></i> <strong>Pest pressure trends</strong> &mdash; observation volumes over time per species, field, and season</span>
                <span class="chip"><i class="fas fa-calendar-alt"></i> <strong>Seasonal patterns</strong> &mdash; historical pressure curves that predict peak infestation windows before they arrive</span>
                <span class="chip"><i class="fas fa-bug"></i> <strong>Top pests</strong> &mdash; ranked by frequency, count, life stage, and threshold breach rate</span>
                <span class="chip"><i class="fas fa-compass"></i> <strong>Spread direction</strong> &mdash; AI-tracked pest centroid movement showing bearing and velocity across your fields</span>
                <span class="chip"><i class="fas fa-map-pin"></i> <strong>Origin detection</strong> &mdash; pinpoints the probable source field of an infestation so you can treat the cause, not just the symptoms</span>
                <span class="chip"><i class="fas fa-project-diagram"></i> <strong>Cross-farm correlation</strong> &mdash; detects outbreaks spreading between farms before they escalate into full infestations</span>
              </div>
            </div>
            <div style="flex:1;min-width:220px;">
              <p style="font-weight:700;font-size:0.85rem;opacity:0.8;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">Forecasting &amp; Risk</p>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <span class="chip"><i class="fas fa-chart-area"></i> <strong>Population forecast</strong> &mdash; projected pest counts based on observed growth trajectories, so you can plan treatments ahead</span>
                <span class="chip"><i class="fas fa-exclamation-triangle"></i> <strong>Breach probability</strong> &mdash; likelihood of exceeding your economic threshold before the next scouting date</span>
                <span class="chip"><i class="fas fa-cloud-sun-rain"></i> <strong>Weather risk</strong> &mdash; correlates temperature and conditions against pest pressure spikes in your specific fields</span>
                <span class="chip"><i class="fas fa-calendar-check"></i> <strong>Next scouting date</strong> &mdash; AI-recommended optimal return visit per field based on pressure trends and forecast</span>
                <span class="chip"><i class="fas fa-people-arrows"></i> <strong>Neighbour risk</strong> &mdash; flags adjacent fields most likely to receive pest spillover so scouts can act proactively</span>
                <span class="chip"><i class="fas fa-question-circle"></i> <strong>Unknown pest tracking</strong> &mdash; unidentified observations flagged and monitored for expert review before they become costly</span>
              </div>
            </div>
          </div>
        </div>

        <!-- FAQ -->
        <div class="faq-section">
          <h2>Frequently asked questions</h2>
          <p>Everything you need to know before you start.</p>

          <details class="faq-item">
            <summary>Does PestLook work on a Mac or iPhone?</summary>
            <div class="faq-answer">
              Yes — the full PestLook web application works on any Mac in any browser (Chrome, Safari, Firefox, Edge). There is currently no native iOS mobile app; the offline-first mobile app is Android only. iPad users can access the web dashboard through Safari, but for in-field offline logging and barcode scanning you'll need an Android device.
            </div>
          </details>

          <details class="faq-item">
            <summary>What happens when the beta ends? Will it cost money?</summary>
            <div class="faq-answer">
              We haven't locked in post-beta pricing yet. What we can promise: every current user will receive advance notice before any paid tier is introduced, and we won't flip a switch on you without warning. The goal is to keep a meaningful free tier permanently — the platform is designed to be accessible to individual farmers, not just large agri-businesses.
            </div>
          </details>

          <details class="faq-item">
            <summary>How does offline sync actually work?</summary>
            <div class="faq-answer">
              When you open the Android app with a connection, it pulls down your farms, fields, pest library, trap locations, and any assigned scouting sessions and caches them locally on the device. From that point you can work entirely offline — log pest counts, scan trap barcodes, attach photos, and record GPS coordinates. The moment the device detects connectivity again, everything queued locally is pushed to the server automatically in the background. No manual export, no waiting at the gate.
            </div>
          </details>

          <details class="faq-item">
            <summary>Is my farm data private? Who can see it?</summary>
            <div class="faq-answer">
              Each organisation is fully isolated — your farms, observations, photos, and reports are never visible to other tenants. We do not sell or share your data with third parties. Scouts within your organisation can only access what their role permits; admins control all permissions. Full details are in our <a href="/privacy.html">Privacy Policy</a>.
            </div>
          </details>

          <details class="faq-item">
            <summary>Can I have multiple scouts or users on one account?</summary>
            <div class="faq-answer">
              Yes. Admins can add as many scouts as needed to their organisation, assign them to scouting sessions, and manage their roles from the web dashboard. There is no per-seat charge — unlimited team members are included on every plan.
            </div>
          </details>

          <details class="faq-item">
            <summary>What crops and pests does it support?</summary>
            <div class="faq-answer">
              PestLook is entirely crop-agnostic. You define your own pest library (species, life stages, economic thresholds), your own trap types, and your own field names. It works for row crops, orchards, vegetables, viticulture, and anything else — for any pest, in any region of the world.
            </div>
          </details>

          <details class="faq-item">
            <summary>Do I need a smartphone in the field?</summary>
            <div class="faq-answer">
              For the best in-field experience, yes — the Android app is built for field work: offline logging, barcode/QR trap scanning, GPS tagging, and photo capture. If you only need the web dashboard (reports, session planning, analytics), any device with a browser works fine, including tablets and laptops.
            </div>
          </details>
        </div>

        <!-- FINAL CTA -->
        <div style="background:var(--primary-light);border-radius:28px;padding:40px 32px;text-align:center;margin:24px 0 48px;">
          <h2 style="font-size:1.8rem;margin-bottom:12px;">Ready to protect your crops with real data?</h2>
          <p style="color:var(--text-muted);max-width:520px;margin:0 auto 20px;">Start scouting for free. Add your farms, deploy traps, and run your first scouting session in minutes.</p>
          <a href="#account" class="btn-primary btn-accent" id="bottomCtaBtn" style="font-size:1.1rem;padding:14px 32px;"><i class="fas fa-rocket"></i> Get started free</a>
        </div>
      </div>

      <!-- PRICING VIEW -->
      <div id="pricingView" class="view">
        <div style="text-align:center;margin:40px 0 20px;">
          <h1 style="font-size:2.5rem;">PestLook is free</h1>
          <p style="font-size:1.2rem;color:var(--text-muted);">One plan, no payment, full platform &mdash; every report, every intelligence feature, every tool. Unlimited observations (while in beta), on us.</p>
        </div>
        <div class="pricing-grid" style="max-width:480px;margin:0 auto;">
          <div class="pricing-card popular" style="border-top:none;box-shadow:none;">
            <h3>Free</h3>
            <div class="price">$0<span style="font-size:1rem;"> /month</span></div>
            <p style="color:var(--text-muted);margin-bottom:8px;">For every farmer, scout and agronomist</p>
            <div style="background:var(--primary-light);border-radius:12px;padding:12px 16px;margin:16px 0;text-align:center;">
              <strong style="font-size:1.4rem;color:var(--primary);">Unlimited observations (while in beta)</strong>
            </div>
            <ul class="feature-list">
              <li><i class="fas fa-check"></i> Full analytics &amp; intelligence suite</li>
              <li><i class="fas fa-check"></i> Farms, fields &amp; trap management</li>
              <li><i class="fas fa-check"></i> Planned &amp; ad-hoc scouting sessions</li>
              <li><i class="fas fa-check"></i> Photo &amp; GPS observation logging</li>
              <li><i class="fas fa-check"></i> Economic threshold alerts</li>
              <li><i class="fas fa-check"></i> Scout team roles &amp; assignments</li>
              <li><i class="fas fa-check"></i> Custom pest library &amp; trap types</li>
              <li><i class="fas fa-check"></i> Offline mobile app with auto-sync</li>
            </ul>
            <button class="btn-primary choose-plan" data-plan="Free" style="width:100%;text-align:center;">Get started free</button>
          </div>
        </div>
        <!-- Paid plans disabled — the platform is currently free:
        <div class="pricing-grid">
          <div class="pricing-card">
            <h3>Basic</h3>
            <div class="price">$25<span style="font-size:1rem;"> /month</span></div>
            <p style="color:var(--text-muted);margin-bottom:8px;">For individual farmers and smaller scouting operations</p>
            <div style="background:var(--primary-light);border-radius:12px;padding:12px 16px;margin:16px 0;text-align:center;">
              <strong style="font-size:1.4rem;color:var(--primary);">300 observations</strong><br>
              <span style="font-size:0.85rem;color:var(--text-muted);">per month</span>
            </div>
            <ul class="feature-list">
              <li><i class="fas fa-check"></i> Full analytics &amp; intelligence suite</li>
              <li><i class="fas fa-check"></i> Farms, fields &amp; trap management</li>
              <li><i class="fas fa-check"></i> Planned &amp; ad-hoc scouting sessions</li>
              <li><i class="fas fa-check"></i> Photo &amp; GPS observation logging</li>
              <li><i class="fas fa-check"></i> Economic threshold alerts</li>
              <li><i class="fas fa-check"></i> Scout team roles &amp; assignments</li>
              <li><i class="fas fa-check"></i> Custom pest library &amp; trap types</li>
              <li><i class="fas fa-check"></i> Offline mobile app with auto-sync</li>
            </ul>
            <button class="btn-primary choose-plan" data-plan="Basic" style="width:100%;text-align:center;">Get started</button>
          </div>
          <div class="pricing-card popular">
            <h3>Agronomist <span style="background:var(--accent);font-size:0.7rem;padding:4px 8px;border-radius:30px;color:white;">MOST POPULAR</span></h3>
            <div class="price">$150<span style="font-size:1rem;"> /month</span></div>
            <p style="color:var(--text-muted);margin-bottom:8px;">For professional agronomists and multi-farm operations</p>
            <div style="background:var(--primary-light);border-radius:12px;padding:12px 16px;margin:16px 0;text-align:center;">
              <strong style="font-size:1.4rem;color:var(--primary);">2,000 observations</strong><br>
              <span style="font-size:0.85rem;color:var(--text-muted);">per month</span>
            </div>
            <ul class="feature-list">
              <li><i class="fas fa-check"></i> Full analytics &amp; intelligence suite</li>
              <li><i class="fas fa-check"></i> Farms, fields &amp; trap management</li>
              <li><i class="fas fa-check"></i> Planned &amp; ad-hoc scouting sessions</li>
              <li><i class="fas fa-check"></i> Photo &amp; GPS observation logging</li>
              <li><i class="fas fa-check"></i> Economic threshold alerts</li>
              <li><i class="fas fa-check"></i> Scout team roles &amp; assignments</li>
              <li><i class="fas fa-check"></i> Custom pest library &amp; trap types</li>
              <li><i class="fas fa-check"></i> Offline mobile app with auto-sync</li>
            </ul>
            <button class="btn-primary choose-plan" data-plan="Agronomist" style="width:100%;">Start 14-day trial</button>
          </div>
          <div class="pricing-card">
            <h3>Enterprise / Cooperative</h3>
            <div class="price">Custom</div>
            <p style="color:var(--text-muted);margin-bottom:8px;">For large estates, co-ops &amp; advisory firms</p>
            <div style="background:var(--primary-light);border-radius:12px;padding:12px 16px;margin:16px 0;text-align:center;">
              <strong style="font-size:1.4rem;color:var(--primary);">Unlimited observations (while in beta)</strong><br>
              <span style="font-size:0.85rem;color:var(--text-muted);">tailored to your volume</span>
            </div>
            <ul class="feature-list">
              <li><i class="fas fa-check"></i> Full analytics &amp; intelligence suite</li>
              <li><i class="fas fa-check"></i> Farms, fields &amp; trap management</li>
              <li><i class="fas fa-check"></i> Planned &amp; ad-hoc scouting sessions</li>
              <li><i class="fas fa-check"></i> Photo &amp; GPS observation logging</li>
              <li><i class="fas fa-check"></i> Economic threshold alerts</li>
              <li><i class="fas fa-check"></i> Scout team roles &amp; assignments</li>
              <li><i class="fas fa-check"></i> Custom pest library &amp; trap types</li>
              <li><i class="fas fa-check"></i> Offline mobile app with auto-sync</li>
            </ul>
            <a href="mailto:admin@pestlook.com" class="btn-outline" style="width:100%;display:block;text-align:center;padding:10px 0;">Contact admin@pestlook.com</a>
          </div>
        </div>
        -->
        <div style="background:var(--gray-light);border-radius:24px;padding:24px;margin:40px 0;">
          <h3><i class="fas fa-check-circle" style="color:var(--primary);"></i> Your free plan includes &mdash; no exceptions:</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:16px;">
            <span>&#10003; All analytics &amp; intelligence reports</span>
            <span>&#10003; AI pest spread &amp; forecast engine</span>
            <span>&#10003; Offline-first mobile app</span>
            <span>&#10003; GPS on every observation</span>
            <span>&#10003; Barcode &amp; QR trap scanning</span>
            <span>&#10003; Photo evidence capture</span>
            <span>&#10003; Life stage &amp; weather logging</span>
            <span>&#10003; Two-way auto sync</span>
            <span>&#10003; Full audit trail on all data</span>
            <span>&#10003; Scout team roles &amp; assignments</span>
            <span>&#10003; No ads, ever</span>
          </div>
        </div>
      </div>

      <!-- ABOUT VIEW -->
      <div id="aboutView" class="view">
        <div style="max-width:760px;margin:40px auto;">
          <h1 style="font-size:2.5rem;text-align:center;">About PestLook</h1>

          <div style="background:white;border-radius:24px;padding:32px;margin-top:32px;box-shadow:var(--shadow-md);">
            <h2 style="margin-bottom:16px;"><i class="fas fa-seedling" style="color:var(--primary);"></i> Why is PestLook free?</h2>
            <p style="color:var(--text-muted);line-height:1.7;margin-bottom:16px;">
              PestLook is free because trust is built before it&rsquo;s charged for. The agricultural industry is full of expensive tools that farmers never fully adopt &mdash; we&rsquo;d rather prove the value first.
            </p>
            <p style="color:var(--text-muted);line-height:1.7;margin-bottom:16px;">
              We&rsquo;re in active beta. That means you get a fully functional platform at no cost, and we get real-world feedback from the people who matter most: the people actually standing in the field.
            </p>
            <p style="color:var(--text-muted);line-height:1.7;margin-bottom:16px;">
              A paid tier is coming. It will cover advanced features, integrations, and scale. But the core of what makes PestLook useful &mdash; spray recommendations, pest identification, resistance tracking &mdash; will always remain accessible.
            </p>
            <p style="color:var(--text-muted);line-height:1.7;">
              Once we exit beta, pricing may be introduced depending on where the platform goes and how much it grows. If that happens, you&rsquo;ll know well in advance &mdash; no surprises.
            </p>
          </div>

          <div style="background:white;border-radius:24px;padding:32px;margin-top:24px;box-shadow:var(--shadow-md);">
            <h2 style="margin-bottom:16px;"><i class="fas fa-envelope" style="color:var(--primary);"></i> Contact</h2>
            <p style="color:var(--text-muted);line-height:1.7;">
              Questions, ideas, or problems? Email us at
              <a href="mailto:admin@pestlook.com" style="color:var(--primary);font-weight:600;">admin@pestlook.com</a>
            </p>
          </div>

          <div style="background:white;border-radius:24px;padding:32px;margin-top:24px;box-shadow:var(--shadow-md);">
            <h2 style="margin-bottom:16px;"><i class="fas fa-building" style="color:var(--primary);"></i> Created by</h2>
            <p style="color:var(--text-muted);line-height:1.7;">
              UMBRELLA SOLUTIONS LLC<br>
              PO BOX 587<br>
              BOUND BROOK NJ 08805<br>
              USA
            </p>
          </div>
        </div>
      </div>

      <!-- ACCOUNT VIEW -->
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

      <!-- DASHBOARD VIEW -->
      <div id="dashboardView" class="view">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;margin:24px 0 20px;">
          <h1><i class="fas fa-chart-simple"></i> Scouting Dashboard</h1>
          <button id="logoutBtnDash" class="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
        </div>
        <div class="dashboard-grid">
          <div class="dash-card"><i class="fas fa-bug"></i> <strong>Active traps</strong><br><span style="font-size:2rem;" id="activeTraps">14</span><br>Last 7 days: +2 alerts</div>
          <div class="dash-card"><i class="fas fa-clipboard-list"></i> <strong>Scouting sessions</strong><br><span style="font-size:2rem;" id="scoutCount">4</span><br>This month</div>
          <div class="dash-card"><i class="fas fa-map-marker-alt"></i> <strong>Fields monitored</strong><br><span style="font-size:2rem;" id="fieldsCount">3</span><br>GPS enabled</div>
        </div>
        <div class="dash-card" style="margin-bottom:24px;">
          <h3>Recent scouting logs</h3>
          <div id="recentScoutingList">
            <div class="scout-log"><i class="fas fa-leaf"></i> <strong>Maize field A</strong> &mdash; Fall armyworm: 8 larvae counted, threshold exceeded (treated)</div>
            <div class="scout-log"><i class="fas fa-chart-line"></i> <strong>Trap #4 (Citrus)</strong> &mdash; 12 false codling moth, economic threshold exceeded, alert raised</div>
            <div class="scout-log"><i class="fas fa-camera"></i> <strong>Wheat block</strong> &mdash; Aphids detected, photo uploaded, GPS logged, action taken</div>
          </div>
          <button class="btn-outline" style="margin-top:12px;"><i class="fas fa-plus-circle"></i> Quick scout log (offline-ready)</button>
        </div>
        <div style="background:var(--primary-light);border-radius:24px;padding:20px;">
          <i class="fas fa-chart-line"></i> <strong>Pest pressure forecast:</strong> Low to moderate risk in Eastern regions. Check traps weekly.
        </div>
      </div>
    </main>

    <footer>
      <div class="container">
        <p>&copy; 2026 PestLook &mdash; Complete pest scouting &amp; trap monitoring. Built for farmers, agronomists, and the field.</p>
        <p style="margin-top:8px;"><i class="fas fa-envelope"></i> admin@pestlook.com
          &nbsp;·&nbsp; <a href="/downloads/com.pestlook.ui.mobile-Signed.apk" download style="color:var(--primary);font-weight:600;"><i class="fab fa-android"></i> Android app (.apk)</a></p>
        <p style="margin-top:12px;font-size:0.85rem;">
          <a href="/privacy.html" style="color:var(--text-muted);">Privacy Policy</a>
          &nbsp;·&nbsp;
          <a href="/terms.html" style="color:var(--text-muted);">Terms of Service</a>
        </p>
      </div>
    </footer>
  `;
}

/* ───────────────────── APP LOGIC ───────────────────── */

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
    about:     document.getElementById('aboutView'),
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
        alert(`You're on the ${plan} plan — PestLook is free, no payment needed.`);
      }
    });
  });

  document.getElementById('heroCtaBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/login');
  });

  document.getElementById('heroPricingBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('pricing');
  });

  document.getElementById('bottomCtaBtn')?.addEventListener('click', (e) => {
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

  // Screenshot carousel
  (function initCarousel() {
    const track    = document.getElementById('carouselTrack');
    const dotsEl   = document.getElementById('carouselDots');
    const captionEl = document.getElementById('carouselCaption');
    if (!track) return;

    const captions = [
      'Real-time dashboard — KPIs across all your farms at a glance',
      'Farm & field management — GPS boundaries, crops, and seasons',
      'Pest library — custom species, life stages, and economic thresholds',
      'Trap management — deploy, GPS-tag, and barcode-scan your traps',
      'Analytics — 11 dashboards from threshold alerts to seasonal trends',
      'Predictive intelligence — forecast outbreaks before they arrive',
      'Observation Log — filter and export observations across all sessions',
    ];
    const total = captions.length;
    let current = 0;
    let timer;

    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(dot);
    }

    function goTo(index) {
      current = ((index % total) + total) % total;
      track.style.transform = `translateX(-${current * 100}%)`;
      captionEl.textContent = captions[current];
      dotsEl.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === current));
      clearInterval(timer);
      timer = setInterval(() => goTo(current + 1), 4500);
    }

    document.getElementById('carouselPrev')?.addEventListener('click', () => goTo(current - 1));
    document.getElementById('carouselNext')?.addEventListener('click', () => goTo(current + 1));

    goTo(0);
  })();

  initUsers();
  loadCurrentSession();
  setAuthMode(true);
  navigateTo('home');
  updateAuthUI();
}
