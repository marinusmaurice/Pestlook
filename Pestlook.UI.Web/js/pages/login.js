import { login, getMe, updateTimezone, detectBrowserTimezone } from '../api/auth.js';
import { saveTokens, saveUser, isAuthenticated } from '../utils/storage.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../components/toast.js';
import { syncThemeFromUser } from '../utils/theme.js';

export function renderLogin(container) {
  if (isAuthenticated()) {
    navigate('/dashboard');
    return;
  }

  container.innerHTML = `
      <div class="auth-card">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:2rem;margin-bottom:8px;">🐛</div>
          <h1>Welcome back</h1>
          <div class="subtitle">Sign in to your Pestlook account</div>
        </div>
        <div class="auth-error" id="loginError"></div>
        <form id="loginForm">
          <div class="form-group">
            <label class="input-label">Email</label>
            <input class="input-field" type="email" id="loginEmail" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label class="input-label">Password</label>
            <input class="input-field" type="password" id="loginPassword" placeholder="••••••••" required>
          </div>
          <div class="form-actions">
            <button class="btn-primary full-width" type="submit" id="loginBtn">Sign In</button>
          </div>
        </form>
        <div class="form-footer">
          <a href="#/forgot-password">Forgot your password?</a>
        </div>
        <div class="form-footer">
          Don't have an account? <a href="#/signup">Sign up</a>
        </div>
        <div class="form-footer">
          <a href="#/">← Back to home</a>
        </div>

        <div style="margin-top:20px;padding:14px 16px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);">
          <div style="font-size:12px;font-weight:600;color:var(--green);margin-bottom:10px;">Try the demo</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:11px;color:var(--text-dim);">Admin (web &amp; mobile)</span>
              <button type="button" id="demoAdmin"
                style="font-size:11px;color:var(--green);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;">
                admin@demofarm.co
              </button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:11px;color:var(--text-dim);">Scout (mobile only)</span>
              <button type="button" id="demoScout"
                style="font-size:11px;color:var(--green);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;">
                scout@demofarm.co
              </button>
            </div>
            <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">Password: <strong>Demo@1234!</strong> · click to fill in</div>
          </div>
        </div>
      </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  document.getElementById('demoAdmin').addEventListener('click', () => {
    document.getElementById('loginEmail').value = 'admin@demofarm.co';
    document.getElementById('loginPassword').value = 'Demo@1234!';
  });
  document.getElementById('demoScout').addEventListener('click', () => {
    document.getElementById('loginEmail').value = 'scout@demofarm.co';
    document.getElementById('loginPassword').value = 'Demo@1234!';
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  errorEl.classList.remove('visible');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in…';

  try {
    const res = await login(email, password);
    saveTokens(res.data);

    const meRes = await getMe();
    let user = meRes.data;

    // First login: detect the browser timezone and persist it on the profile.
    if (!user.timezone) {
      try {
        const tzRes = await updateTimezone(detectBrowserTimezone());
        user = tzRes.data;
      } catch { /* non-fatal — analytics fall back to UTC until set in Settings */ }
    }
    saveUser(user);
    syncThemeFromUser(user);

    showToast('Welcome back!', 'success');
    navigate('/dashboard');
  } catch (err) {
    errorEl.textContent = err.message || 'Invalid credentials';
    errorEl.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}
