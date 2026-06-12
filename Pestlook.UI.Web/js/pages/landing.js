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

  /* header */
  header { background: rgba(255,255,255,0.96); border-bottom: 1px solid var(--gray-border); position: sticky; top: 0; z-index: 50; backdrop-filter: blur(2px); }
  .navbar { display: flex; justify-content: space-between; align-items: center; padding: 18px 0; flex-wrap: wrap; }
  .logo { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; color: var(--primary-dark); }
  .logo span { color: var(--accent); }
  .nav-links { display: flex; gap: 32px; align-items: center; flex-wrap: wrap; }
  .nav-links a { font-weight: 500; color: var(--text-dark); transition: 0.2s; }
  .nav-links a:hover, .nav-links a.active { color: var(--primary); }

  /* buttons */
  .btn-outline { border: 1.5px solid var(--primary); background: transparent; padding: 8px 18px; border-radius: 40px; font-weight: 600; color: var(--primary); transition: 0.2s; }
  .btn-outline:hover { background: var(--primary-light); }
  .btn-primary { background: var(--primary); color: white; padding: 10px 24px; border-radius: 40px; font-weight: 600; border: none; cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center; gap: 8px; }
  .btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); }
  .btn-accent { background: var(--accent); color: #1E2F2A; font-weight: 700; }
  .btn-accent:hover { background: var(--accent-dark); color: white; }

  /* views */
  .view { display: none; animation: fade 0.25s ease; }
  .active-view { display: block; }
  @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

  /* hero */
  .hero { display: flex; flex-wrap: wrap; gap: 48px; align-items: center; padding: 56px 0 48px; }
  .hero-content { flex: 1; min-width: 320px; }
  .hero-badge { background: var(--primary-light); color: var(--primary-dark); padding: 6px 14px; border-radius: 50px; font-size: 0.85rem; font-weight: 600; display: inline-block; margin-bottom: 20px; }
  .hero h1 { font-size: 3.2rem; font-weight: 800; line-height: 1.15; color: #1F2A26; margin-bottom: 20px; }
  .hero p { font-size: 1.2rem; color: var(--text-muted); max-width: 560px; margin-bottom: 28px; }
  .hero-stats { display: flex; gap: 28px; margin-top: 32px; flex-wrap: wrap; }
  .stat-item strong { font-size: 1.5rem; color: var(--primary); }

  /* feature cards */
  .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 28px; margin: 64px 0; }
  .feature-card { background: white; border-radius: var(--radius-md); padding: 28px 24px; box-shadow: var(--shadow-sm); border: 1px solid var(--gray-border); transition: 0.2s; }
  .feature-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
  .feature-card i { font-size: 2.2rem; color: var(--primary); margin-bottom: 16px; }
  .feature-card h3 { margin-bottom: 8px; }
  .feature-card p { color: var(--text-muted); font-size: 0.95rem; }

  /* how-it-works */
  .how-section { margin: 48px 0; }
  .how-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 32px; margin-top: 36px; }
  .how-step { text-align: center; }
  .step-number { width: 48px; height: 48px; border-radius: 50%; background: var(--primary); color: white; font-weight: 800; font-size: 1.2rem; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
  .how-step h4 { margin-bottom: 8px; }
  .how-step p { color: var(--text-muted); font-size: 0.92rem; }

  /* analytics banner */
  .analytics-banner { background: linear-gradient(135deg, var(--primary-dark), var(--primary)); border-radius: var(--radius-md); padding: 40px 36px; color: white; margin: 48px 0; }
  .analytics-banner h2 { font-size: 2rem; margin-bottom: 12px; }
  .analytics-banner p { opacity: 0.9; font-size: 1.05rem; max-width: 600px; margin-bottom: 24px; }
  .analytics-chips { display: flex; flex-wrap: wrap; gap: 10px; }
  .analytics-chips .chip { background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); padding: 6px 14px; border-radius: 30px; font-size: 0.85rem; font-weight: 500; color: white; }

  /* testimonials */
  .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin: 32px 0 48px; }
  .testimonial-card { background: white; border-radius: var(--radius-md); padding: 24px; border: 1px solid var(--gray-border); box-shadow: var(--shadow-sm); }
  .testimonial-card .stars { color: var(--accent); margin-bottom: 12px; }
  .testimonial-card blockquote { font-style: italic; color: var(--text-dark); margin-bottom: 16px; line-height: 1.6; }
  .testimonial-card .author { font-weight: 600; color: var(--text-muted); font-size: 0.9rem; }

  /* pricing */
  .pricing-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 32px; margin: 48px 0; }
  .pricing-card { background: white; border-radius: var(--radius-md); padding: 28px 24px; flex: 1; min-width: 260px; border: 1px solid var(--gray-border); transition: 0.2s; }
  .pricing-card.popular { border-top: 4px solid var(--accent); box-shadow: var(--shadow-md); }
  .price { font-size: 2.5rem; font-weight: 800; margin: 16px 0; }
  .feature-list { list-style: none; margin: 24px 0; }
  .feature-list li { margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .feature-list i.fa-check { color: var(--primary); }

  /* dashboard */
  .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin: 32px 0; }
  .dash-card { background: white; border-radius: var(--radius-sm); padding: 20px; border: 1px solid var(--gray-border); }
  .scout-log { background: var(--gray-light); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 12px; }
  .logout-btn { background: none; border: 1px solid var(--gray-border); padding: 8px 16px; border-radius: 30px; cursor: pointer; font-weight: 500; }

  /* forms */
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
    .analytics-banner { padding: 28px 20px; }
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
          <div class="hero-content">
            <div class="hero-badge"><i class="fas fa-seedling"></i> Built for the field, not the office</div>
            <h1>One platform to <span style="color:var(--accent);">scout, trap, and protect</span> every hectare</h1>
            <p>PestLook gives farmers and agronomists a complete system to manage farms, deploy traps, run scouting sessions, record pest observations with GPS and photos, and turn field data into actionable analytics reports &mdash; even offline.</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <a href="#account" class="btn-primary" id="heroCtaBtn"><i class="fas fa-tractor"></i> Start free scouting</a>
              <a href="/downloads/com.pestlook.ui.mobile-Signed.apk" class="btn-outline" download><i class="fab fa-android" style="color:var(--primary);"></i> Download Android app</a>
              <a href="#pricing" class="btn-outline" id="heroPricingBtn">View plans</a>
            </div>
            <div class="hero-stats">
              <div class="stat-item"><strong>11</strong><br>analytics reports</div>
              <div class="stat-item"><strong>100%</strong><br>offline capable</div>
              <div class="stat-item"><strong>GPS</strong><br>every observation</div>
            </div>
          </div>
          <div style="flex:1;min-width:300px;background:var(--primary-light);border-radius:40px;padding:36px 28px;text-align:center;">
            <i class="fas fa-map-marked-alt" style="font-size:4.5rem;color:var(--primary);margin-bottom:12px;"></i>
            <p style="font-weight:700;font-size:1.1rem;margin-bottom:16px;">Your entire operation on one map</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
              <span style="background:white;padding:5px 12px;border-radius:20px;font-size:0.82rem;font-weight:500;"><i class="fas fa-map-pin" style="color:var(--primary);"></i> Farm boundaries</span>
              <span style="background:white;padding:5px 12px;border-radius:20px;font-size:0.82rem;font-weight:500;"><i class="fas fa-crosshairs" style="color:var(--primary);"></i> Trap GPS pins</span>
              <span style="background:white;padding:5px 12px;border-radius:20px;font-size:0.82rem;font-weight:500;"><i class="fas fa-barcode" style="color:var(--primary);"></i> Barcode scanning</span>
              <span style="background:white;padding:5px 12px;border-radius:20px;font-size:0.82rem;font-weight:500;"><i class="fas fa-camera" style="color:var(--primary);"></i> Photo evidence</span>
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
            <i class="fas fa-warehouse"></i>
            <h3>Farm &amp; field management</h3>
            <p>Organise your operation by farm, field, crop type, and season. Define geographic boundaries for precision mapping and track area in hectares.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-crosshairs"></i>
            <h3>Trap deployment &amp; barcode scanning</h3>
            <p>Register sticky, pheromone, or pitfall traps with GPS coordinates. Scan barcodes or QR codes in the field for instant trap lookup.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-clipboard-check"></i>
            <h3>Planned &amp; ad-hoc scouting</h3>
            <p>Admins schedule sessions with assigned scouts, target fields, and observation checklists. Scouts can also start ad-hoc runs on the fly from the mobile app.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-bug"></i>
            <h3>Pest observations with thresholds</h3>
            <p>Record counts or presence/absence per pest species and life stage. The system automatically flags when observations exceed economic action thresholds.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-mobile-alt"></i>
            <h3>Offline-first mobile app</h3>
            <p>The mobile app caches farms, fields, pests, traps, and sessions locally. Work offline in remote blocks &mdash; two-way sync uploads everything when connectivity returns.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-satellite-dish"></i>
            <h3>GPS + weather capture</h3>
            <p>Every observation is geotagged with configurable accuracy. Session temperature and weather conditions are recorded automatically alongside your data.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-chart-pie"></i>
            <h3>11 analytics dashboards</h3>
            <p>From threshold alerts and pest pressure trends to trap performance, scout productivity, seasonal patterns, field coverage, and billing &mdash; all filterable by date, farm, or scout.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-users-cog"></i>
            <h3>Multi-tenant team management</h3>
            <p>Each organisation is fully isolated. Admins manage scouts, assign roles, configure trap types, and review billing snapshots &mdash; all from the web dashboard.</p>
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
          <p style="font-size:1.2rem;color:var(--text-muted);">One plan, no payment, full platform &mdash; every report, every intelligence feature, every tool. 10,000 observations per month, on us.</p>
        </div>
        <div class="pricing-grid" style="max-width:480px;margin:0 auto;">
          <div class="pricing-card popular">
            <h3>Free</h3>
            <div class="price">$0<span style="font-size:1rem;"> /month</span></div>
            <p style="color:var(--text-muted);margin-bottom:8px;">For every farmer, scout and agronomist</p>
            <div style="background:var(--primary-light);border-radius:12px;padding:12px 16px;margin:16px 0;text-align:center;">
              <strong style="font-size:1.4rem;color:var(--primary);">10,000 observations</strong><br>
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
              <strong style="font-size:1.4rem;color:var(--primary);">Unlimited observations</strong><br>
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
        <div style="background:#EFF7EC;border-radius:24px;padding:20px;">
          <i class="fas fa-chart-line"></i> <strong>Pest pressure forecast:</strong> Low to moderate risk in Eastern regions. Check traps weekly.
        </div>
      </div>
    </main>

    <footer>
      <div class="container">
        <p>&copy; 2026 PestLook &mdash; Complete pest scouting &amp; trap monitoring. Built for farmers, agronomists, and the field.</p>
        <p style="margin-top:8px;"><i class="fas fa-envelope"></i> admin@pestlook.com
          &nbsp;·&nbsp; <a href="/downloads/com.pestlook.ui.mobile-Signed.apk" download style="color:var(--primary);font-weight:600;"><i class="fab fa-android"></i> Android app (.apk)</a></p>
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

  initUsers();
  loadCurrentSession();
  setAuthMode(true);
  navigateTo('home');
  updateAuthUI();
}
