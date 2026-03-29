import { isAuthenticated } from '../utils/storage.js';

export function renderLanding(container) {
  if (isAuthenticated()) {
    location.hash = '#/dashboard';
    return;
  }

  container.innerHTML = `
    <div class="landing-page">
      <div class="hero-icon">🐛</div>
      <h1>Pest<span>look</span></h1>
      <p class="tagline">
        Field intelligence for modern agriculture. Monitor pests, manage scouting sessions,
        and protect your crops with data-driven insights.
      </p>
      <div class="cta-row">
        <a href="#/signup" class="btn-primary" style="padding:12px 28px;font-size:0.9rem;">Get Started Free</a>
        <a href="#/login" class="btn-outline" style="padding:11px 28px;font-size:0.9rem;text-decoration:none;">Sign In</a>
      </div>
      <div class="landing-features">
        <div class="landing-feature">
          <div class="feat-icon">📍</div>
          <h3>Monitoring Points</h3>
          <p>Place traps and inspection points across your fields with GPS precision.</p>
        </div>
        <div class="landing-feature">
          <div class="feat-icon">🥾</div>
          <h3>Scouting Sessions</h3>
          <p>Track field scouts in real-time and record pest observations on the go.</p>
        </div>
        <div class="landing-feature">
          <div class="feat-icon">📊</div>
          <h3>Actionable Insights</h3>
          <p>Aggregate counts, threshold alerts, and trend analysis across all your farms.</p>
        </div>
      </div>
    </div>
  `;
}
