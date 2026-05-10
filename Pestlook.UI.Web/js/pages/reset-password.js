import { resetPassword } from '../api/auth.js';
import { navigate, getHashQuery } from '../utils/router.js';
import { showToast } from '../components/toast.js';

export function renderResetPassword(container) {
  const { email = '', token = '' } = getHashQuery();
  const hasParams = email && token;

  container.innerHTML = `
    <div class="auth-card">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:2rem;margin-bottom:8px;">🔒</div>
        <h1>Reset your password</h1>
        <div class="subtitle">Choose a strong new password for your account</div>
      </div>
      <div class="auth-error" id="rpError"></div>
      ${!hasParams ? `
        <div style="background:rgba(199,81,70,0.1);border:1px solid rgba(199,81,70,0.25);border-radius:8px;padding:12px 14px;font-size:0.85rem;color:var(--red);margin-bottom:16px;">
          This reset link is invalid or has expired. <a href="#/forgot-password" style="color:var(--red);font-weight:600;">Request a new one →</a>
        </div>
      ` : ''}
      <form id="rpForm" ${!hasParams ? 'style="display:none"' : ''}>
        <div class="form-group">
          <label class="input-label">Email address</label>
          <input class="input-field" type="email" id="rpEmail" value="${escHtml(email)}" placeholder="you@example.com" required ${email ? 'readonly style="opacity:0.6"' : ''}>
        </div>
        <div class="form-group" style="position:relative;">
          <label class="input-label">New password</label>
          <input class="input-field" type="password" id="rpPassword" placeholder="Min. 8 characters" required minlength="8" autofocus>
          <button type="button" id="rpToggle" style="position:absolute;right:10px;top:30px;background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:0.9rem;">Show</button>
        </div>
        <div class="form-group">
          <label class="input-label">Confirm new password</label>
          <input class="input-field" type="password" id="rpConfirm" placeholder="Repeat password" required minlength="8">
        </div>
        <div id="rpStrength" style="margin-bottom:14px;font-size:0.78rem;color:var(--text-dim);"></div>
        <div class="form-actions">
          <button class="btn-primary full-width" type="submit" id="rpBtn">Reset Password</button>
        </div>
      </form>
      <div class="form-footer">
        <a href="#/login">← Back to sign in</a>
      </div>
    </div>
  `;

  if (!hasParams) return;

  // Show/hide password toggle
  document.getElementById('rpToggle').addEventListener('click', () => {
    const input = document.getElementById('rpPassword');
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    document.getElementById('rpToggle').textContent = isHidden ? 'Hide' : 'Show';
  });

  // Live strength indicator
  document.getElementById('rpPassword').addEventListener('input', (e) => {
    updateStrength(e.target.value);
  });

  document.getElementById('rpForm').addEventListener('submit', (e) => handleReset(e, email, token));
}

function updateStrength(password) {
  const el = document.getElementById('rpStrength');
  if (!password) { el.textContent = ''; return; }

  let score = 0;
  if (password.length >= 8)  score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['var(--red)', '#f59e0b', '#3b82f6', 'var(--green)'];
  const idx = Math.max(0, score - 1);

  el.innerHTML = `Strength: <strong style="color:${colors[idx]}">${labels[idx]}</strong>`;
}

async function handleReset(e, email, token) {
  e.preventDefault();

  const btn       = document.getElementById('rpBtn');
  const errorEl   = document.getElementById('rpError');
  const password  = document.getElementById('rpPassword').value;
  const confirm   = document.getElementById('rpConfirm').value;

  errorEl.classList.remove('visible');

  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.classList.add('visible');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Resetting…';

  try {
    await resetPassword(email, token, password);
    showToast('Password reset! Please sign in with your new password.', 'success');
    navigate('/login');
  } catch (err) {
    errorEl.textContent = err.message || 'Reset failed. The link may have expired.';
    errorEl.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Reset Password';
  }
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
