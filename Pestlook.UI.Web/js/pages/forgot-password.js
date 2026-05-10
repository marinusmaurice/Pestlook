import { forgotPassword } from '../api/auth.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../components/toast.js';

export function renderForgotPassword(container) {
  container.innerHTML = `
    <div class="auth-card">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:2rem;margin-bottom:8px;">🔑</div>
        <h1>Forgot password?</h1>
        <div class="subtitle">Enter your email and we'll send you a reset link</div>
      </div>
      <div class="auth-error" id="fpError"></div>
      <div id="fpSuccess" style="display:none;background:rgba(46,125,50,0.1);border:1px solid rgba(46,125,50,0.25);border-radius:8px;padding:12px 14px;font-size:0.85rem;color:var(--green);margin-bottom:16px;"></div>
      <form id="fpForm">
        <div class="form-group">
          <label class="input-label">Email address</label>
          <input class="input-field" type="email" id="fpEmail" placeholder="you@example.com" required autofocus>
        </div>
        <div class="form-actions">
          <button class="btn-primary full-width" type="submit" id="fpBtn">Send Reset Link</button>
        </div>
      </form>
      <div class="form-footer">
        Remembered it? <a href="#/login">Back to sign in</a>
      </div>
    </div>
  `;

  document.getElementById('fpForm').addEventListener('submit', handleForgotPassword);
}

async function handleForgotPassword(e) {
  e.preventDefault();

  const btn     = document.getElementById('fpBtn');
  const errorEl = document.getElementById('fpError');
  const successEl = document.getElementById('fpSuccess');
  const email   = document.getElementById('fpEmail').value.trim();

  errorEl.classList.remove('visible');
  successEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Sending…';

  try {
    await forgotPassword(email);
    successEl.textContent = `If ${email} is registered you'll receive a reset link shortly. Check your inbox (and spam folder).`;
    successEl.style.display = 'block';
    document.getElementById('fpForm').reset();
    showToast('Reset link sent!', 'success');
  } catch (err) {
    errorEl.textContent = err.message || 'Something went wrong. Please try again.';
    errorEl.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Reset Link';
  }
}
