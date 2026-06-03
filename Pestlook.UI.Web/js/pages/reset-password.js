import { resetPassword } from '../api/auth.js';
import { isAuthenticated } from '../utils/storage.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../components/toast.js';

export async function renderResetPassword(container, params) {
  if (isAuthenticated()) {
    navigate('/dashboard');
    return;
  }

  const { userId, token } = params;

  if (!userId || !token) {
    renderState(container, 'error', 'Invalid link', 'This password reset link is missing required parameters.');
    return;
  }

  container.innerHTML = `
    <div class="auth-card">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:2rem;margin-bottom:8px;">🔒</div>
        <h1>Set a new password</h1>
        <div class="subtitle">Choose a strong password for your account</div>
      </div>
      <div class="auth-error" id="rpError"></div>
      <form id="rpForm">
        <div class="form-group">
          <label class="input-label">New Password</label>
          <input class="input-field" type="password" id="rpPassword" placeholder="Min 8 characters" required minlength="8">
        </div>
        <div class="form-group">
          <label class="input-label">Confirm New Password</label>
          <input class="input-field" type="password" id="rpConfirm" placeholder="Repeat your password" required minlength="8">
        </div>
        <div class="form-actions">
          <button class="btn-primary full-width" type="submit" id="rpBtn">Reset password</button>
        </div>
      </form>
      <div class="form-footer">
        <a href="#/login">← Back to login</a>
      </div>
    </div>
  `;

  document.getElementById('rpForm').addEventListener('submit', (e) => handleReset(e, userId, token));
}

async function handleReset(e, userId, token) {
  e.preventDefault();
  const btn = document.getElementById('rpBtn');
  const errorEl = document.getElementById('rpError');
  const password = document.getElementById('rpPassword').value;
  const confirm = document.getElementById('rpConfirm').value;

  errorEl.classList.remove('visible');

  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.classList.add('visible');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Resetting…';

  try {
    await resetPassword(userId, token, password);
    showToast('Password reset successfully. Please sign in.', 'success');
    navigate('/login');
  } catch (err) {
    errorEl.textContent = err.message || 'Reset link is invalid or has expired. Please request a new one.';
    errorEl.classList.add('visible');
    btn.disabled = false;
    btn.textContent = 'Reset password';
  }
}

function renderState(container, type, title, message) {
  container.innerHTML = `
    <div class="auth-card" style="text-align:center;">
      <div style="font-size:2.5rem;margin-bottom:16px;">${type === 'error' ? '❌' : '✅'}</div>
      <h1 style="margin-bottom:12px;">${title}</h1>
      <p style="font-size:0.95rem;color:var(--text-muted);line-height:1.6;margin-bottom:28px;">${message}</p>
      <a href="#/forgot-password" class="btn-primary" style="display:inline-block;text-decoration:none;">Request a new link</a>
    </div>
  `;
}
