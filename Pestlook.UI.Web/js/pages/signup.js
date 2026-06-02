import { signUp, getMe } from '../api/auth.js';
import { saveTokens, saveUser, isAuthenticated } from '../utils/storage.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../components/toast.js';
import { SubscriptionPlanValues } from '../utils/helpers.js';

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
            <div class="form-row">
              <div class="form-group">
                <label class="input-label">Tenant Name</label>
                <input class="input-field" type="text" id="tenantName" placeholder="Agri Solutions" required>
              </div>
              <div class="form-group">
                <label class="input-label">Slug</label>
                <input class="input-field" type="text" id="tenantSlug" placeholder="agri-solutions" required>
              </div>
            </div>
            <div class="form-group">
              <label class="input-label">Subscription Plan</label>
              <select class="input-field" id="subPlan">
                <option value="0">Basic</option>
                <option value="1" selected>Professional</option>
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

  document.getElementById('tenantName').addEventListener('input', (e) => {
    document.getElementById('tenantSlug').value = e.target.value
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  });

  document.getElementById('signupForm').addEventListener('submit', handleSignUp);
}

async function handleSignUp(e) {
  e.preventDefault();
  const btn = document.getElementById('signupBtn');
  const errorEl = document.getElementById('signupError');

  const request = {
    tenantName: document.getElementById('tenantName').value.trim(),
    tenantSlug: document.getElementById('tenantSlug').value.trim(),
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
    saveTokens(res.data);

    const meRes = await getMe();
    saveUser(meRes.data);

    showToast('Account created! Welcome to Pestlook.', 'success');
    navigate('/dashboard');
  } catch (err) {
    errorEl.textContent = err.message || 'Sign-up failed';
    errorEl.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}
