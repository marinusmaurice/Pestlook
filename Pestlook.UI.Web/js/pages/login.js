import { login, getMe } from '../api/auth.js';
import { saveTokens, saveUser, isAuthenticated } from '../utils/storage.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../components/toast.js';

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
            <div style="text-align:right;margin-top:4px;">
              <a href="#/forgot-password" style="font-size:0.78rem;color:var(--text-dim);">Forgot password?</a>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-primary full-width" type="submit" id="loginBtn">Sign In</button>
          </div>
        </form>
        <div class="form-footer">
          Don't have an account? <a href="#/signup">Sign up</a>
        </div>
        <div class="form-footer">
          <a href="#/">← Back to home</a>
        </div>
      </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', handleLogin);
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
    saveUser(meRes.data);

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
