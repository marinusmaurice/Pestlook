import { activateAccount } from '../api/auth.js';
import { saveTokens, saveUser, isAuthenticated } from '../utils/storage.js';
import { getMe } from '../api/auth.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../components/toast.js';

export async function renderActivate(container, params) {
  if (isAuthenticated()) {
    navigate('/dashboard');
    return;
  }

  container.innerHTML = `
    <div class="auth-card" style="width:460px;text-align:center;">
      <div style="font-size:2.5rem;margin-bottom:16px;" id="activateIcon">⏳</div>
      <h1 id="activateTitle">Activating your account…</h1>
      <p id="activateMsg" style="margin-top:12px;font-size:0.95rem;color:var(--text-muted);line-height:1.6;">
        Please wait while we verify your link.
      </p>
      <div id="activateActions" style="margin-top:24px;"></div>
    </div>
  `;

  const { userId, token } = params;

  if (!userId || !token) {
    renderState('❌', 'Invalid link', 'This activation link is missing required parameters.', 'login');
    return;
  }

  try {
    const res = await activateAccount(userId, token);
    saveTokens(res.data);

    const meRes = await getMe();
    saveUser(meRes.data);

    renderState('✅', 'Account activated!',
      'Your account is ready. Redirecting you to your dashboard…', null);

    showToast('Welcome to PestLook!', 'success');
    setTimeout(() => navigate('/dashboard'), 1800);
  } catch (err) {
    const message = err.message || 'The activation link is invalid or has already been used.';
    renderState('❌', 'Activation failed', message, 'login');
  }
}

function renderState(icon, title, message, action) {
  const iconEl   = document.getElementById('activateIcon');
  const titleEl  = document.getElementById('activateTitle');
  const msgEl    = document.getElementById('activateMsg');
  const actionsEl = document.getElementById('activateActions');

  if (iconEl)   iconEl.textContent   = icon;
  if (titleEl)  titleEl.textContent  = title;
  if (msgEl)    msgEl.textContent    = message;

  if (actionsEl && action === 'login') {
    actionsEl.innerHTML = `
      <a href="#/login" class="btn-primary" style="display:inline-block;text-decoration:none;">
        Go to login
      </a>
      <div style="margin-top:16px;font-size:0.85rem;color:var(--text-muted);">
        Need help? Contact <a href="mailto:admin@pestlook.com">admin@pestlook.com</a>
      </div>
    `;
  }
}
