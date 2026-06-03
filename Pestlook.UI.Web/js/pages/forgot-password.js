import { forgotPassword } from '../api/auth.js';
import { isAuthenticated } from '../utils/storage.js';
import { navigate } from '../utils/router.js';

export function renderForgotPassword(container) {
  if (isAuthenticated()) {
    navigate('/dashboard');
    return;
  }

  container.innerHTML = `
    <div class="auth-card">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:2rem;margin-bottom:8px;">🔑</div>
        <h1>Forgot your password?</h1>
        <div class="subtitle">Enter your email and we'll send you a reset link</div>
      </div>
      <div class="auth-error" id="fpError"></div>
      <form id="fpForm">
        <div class="form-group">
          <label class="input-label">Email</label>
          <input class="input-field" type="email" id="fpEmail" placeholder="you@example.com" required>
        </div>
        <div class="form-actions">
          <button class="btn-primary full-width" type="submit" id="fpBtn">Send reset link</button>
        </div>
      </form>
      <div class="form-footer">
        <a href="#/login">← Back to login</a>
      </div>
    </div>
  `;

  document.getElementById('fpForm').addEventListener('submit', handleForgotPassword);
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const btn = document.getElementById('fpBtn');
  const errorEl = document.getElementById('fpError');
  const email = document.getElementById('fpEmail').value.trim();

  errorEl.classList.remove('visible');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Sending…';

  try {
    await forgotPassword(email);
    showConfirmationScreen(email);
  } catch {
    // Still show confirmation to avoid leaking whether the email exists
    showConfirmationScreen(email);
  }
}

function showConfirmationScreen(email) {
  const container = document.getElementById('auth-content');
  if (!container) return;

  container.innerHTML = `
    <div class="auth-card" style="text-align:center;">
      <div style="font-size:3rem;margin-bottom:16px;">📬</div>
      <h1 style="margin-bottom:8px;">Check your email</h1>
      <div class="subtitle" style="margin-bottom:24px;">
        If an account exists for <strong style="color:var(--primary);">${email}</strong>,
        you'll receive a password reset link shortly.
      </div>
      <p style="font-size:0.9rem;color:var(--text-muted);line-height:1.6;margin-bottom:28px;">
        The link expires in <strong>24 hours</strong>. Check your spam folder if you don't see it.
      </p>
      <a href="#/login" class="btn-primary" style="display:inline-block;text-decoration:none;">Back to login</a>
    </div>
  `;
}
