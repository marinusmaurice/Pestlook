import { signUp } from '../api/auth.js';
import { resendActivation } from '../api/auth.js';
import { isAuthenticated } from '../utils/storage.js';
import { navigate } from '../utils/router.js';

export function renderSignUp(container) {
  if (isAuthenticated()) {
    navigate('/dashboard');
    return;
  }

  container.innerHTML = `
      <div class="auth-card" style="width:500px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:2rem;margin-bottom:8px;">🐛</div>
          <h1>Create your account</h1>
          <div class="subtitle">Set up your organisation and start monitoring</div>
        </div>
        <div class="auth-error" id="signupError"></div>
        <form id="signupForm">
          <div style="margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid var(--border);">
            <div style="font-size:0.82rem;font-weight:600;color:var(--text);margin-bottom:12px;">Organisation</div>
            <div class="form-group">
              <label class="input-label">Organisation Name</label>
              <input class="input-field" type="text" id="tenantName" placeholder="Agri Solutions" required>
            </div>
            <div class="form-group">
              <label class="input-label">Subscription Plan</label>
              <select class="input-field" id="subPlan">
                <option value="0" selected>Free &mdash; Unlimited observations (while in beta)</option>
                <!-- Paid plans disabled:
                <option value="0">Basic</option>
                <option value="1">Professional</option>
                -->
              </select>
            </div>
          </div>
          <div style="margin-bottom:6px;">
            <div style="font-size:0.82rem;font-weight:600;color:var(--text);margin-bottom:12px;">Your Details</div>
            <div class="form-row">
              <div class="form-group">
                <label class="input-label">First Name</label>
                <input class="input-field" type="text" id="firstName" placeholder="Jamie" required>
              </div>
              <div class="form-group">
                <label class="input-label">Last Name</label>
                <input class="input-field" type="text" id="lastName" placeholder="Dlamini" required>
              </div>
            </div>
            <div class="form-group">
              <label class="input-label">Email</label>
              <input class="input-field" type="email" id="signupEmail" placeholder="you@example.com" required>
            </div>
            <div class="form-group">
              <label class="input-label">Password</label>
              <input class="input-field" type="password" id="signupPassword" placeholder="Min 8 characters" required minlength="8">
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-primary full-width" type="submit" id="signupBtn">Create Account</button>
          </div>
        </form>
        <div class="form-footer">
          Already have an account? <a href="#/login">Sign in</a>
        </div>
      </div>
  `;

  document.getElementById('signupForm').addEventListener('submit', handleSignUp);
}

async function handleSignUp(e) {
  e.preventDefault();
  const btn = document.getElementById('signupBtn');
  const errorEl = document.getElementById('signupError');

  const request = {
    tenantName: document.getElementById('tenantName').value.trim(),
    subscriptionPlan: parseInt(document.getElementById('subPlan').value),
    email: document.getElementById('signupEmail').value.trim(),
    password: document.getElementById('signupPassword').value,
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
  };

  errorEl.classList.remove('visible');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating account…';

  try {
    const res = await signUp(request);
    showCheckEmailScreen(res.data.email);
  } catch (err) {
    errorEl.textContent = err.message || 'Sign-up failed';
    errorEl.classList.add('visible');
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

function showCheckEmailScreen(email) {
  const container = document.getElementById('auth-content');
  if (!container) return;

  container.innerHTML = `
    <div class="auth-card" style="width:480px;text-align:center;">
      <div style="font-size:3rem;margin-bottom:16px;">📬</div>
      <h1 style="margin-bottom:8px;">Check your email</h1>
      <div class="subtitle" style="margin-bottom:24px;">
        We sent an activation link to<br>
        <strong style="color:var(--primary);">${email}</strong>
      </div>
      <p style="font-size:0.9rem;color:var(--text-muted);line-height:1.6;margin-bottom:28px;">
        Click the link in the email to activate your account and get started.
        The link expires in <strong>24 hours</strong>.<br>
        <strong>Heads up:</strong> the email can land in your <strong>spam or junk folder</strong> — please check there just in case.
      </p>
      <div style="background:var(--surface-alt,#F5F5F0);border-radius:12px;padding:16px;font-size:0.85rem;color:var(--text-muted);margin-bottom:20px;">
        <strong>Didn't receive it?</strong> Check your spam folder, then try resending below.
      </div>
      <button id="resendBtn" class="btn-outline full-width" style="margin-bottom:16px;">Resend activation email</button>
      <div id="resendMsg" style="font-size:0.85rem;min-height:20px;color:var(--primary);"></div>
      <div style="margin-top:20px;">
        <a href="#/login" style="font-size:0.9rem;color:var(--text-muted);">← Back to login</a>
      </div>
    </div>
  `;

  let cooldown = false;
  document.getElementById('resendBtn').addEventListener('click', async () => {
    if (cooldown) return;
    const btn = document.getElementById('resendBtn');
    const msg = document.getElementById('resendMsg');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await resendActivation(email);
      msg.textContent = 'Email resent. Check your inbox (and spam folder).';
      cooldown = true;
      let secs = 60;
      const interval = setInterval(() => {
        btn.textContent = `Resend again in ${--secs}s`;
        if (secs <= 0) {
          clearInterval(interval);
          btn.disabled = false;
          btn.textContent = 'Resend activation email';
          cooldown = false;
        }
      }, 1000);
    } catch {
      msg.textContent = 'Could not resend. Please try again shortly.';
      btn.disabled = false;
      btn.textContent = 'Resend activation email';
    }
  });
}
