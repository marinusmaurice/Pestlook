import { confirmEmail } from '../api/auth.js';
import { navigate, getHashQuery } from '../utils/router.js';
import { showToast } from '../components/toast.js';

export async function renderConfirmEmail(container) {
  const { userId = '', token = '' } = getHashQuery();

  container.innerHTML = `
    <div class="auth-card" style="text-align:center;">
      <div style="font-size:2.5rem;margin-bottom:16px;">📧</div>
      <h1>Confirming your email…</h1>
      <div class="subtitle" id="ceSubtitle">Please wait a moment.</div>
      <div id="ceSpinner" style="margin:24px auto;width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <div id="ceResult" style="display:none;margin-top:16px;"></div>
      <div class="form-footer" style="margin-top:24px;">
        <a href="#/login">Go to sign in</a>
      </div>
    </div>
  `;

  if (!userId || !token) {
    showResult(false, 'This confirmation link is invalid or has already been used.');
    return;
  }

  try {
    await confirmEmail(userId, token);
    showResult(true, 'Your email has been confirmed! You can now sign in.');
    showToast('Email confirmed successfully!', 'success');
    setTimeout(() => navigate('/login'), 2500);
  } catch (err) {
    showResult(false, err.message || 'Confirmation failed. The link may have expired.');
  }
}

function showResult(success, message) {
  const spinner  = document.getElementById('ceSpinner');
  const result   = document.getElementById('ceResult');
  const subtitle = document.getElementById('ceSubtitle');

  if (spinner) spinner.style.display = 'none';
  if (subtitle) subtitle.textContent = '';

  if (result) {
    result.style.display = 'block';
    result.innerHTML = success
      ? `<div style="background:rgba(46,125,50,0.1);border:1px solid rgba(46,125,50,0.25);border-radius:8px;padding:14px;color:var(--green);font-size:0.9rem;">
           ✓ ${message}
           <div style="margin-top:8px;font-size:0.8rem;color:var(--text-dim);">Redirecting to sign in…</div>
         </div>`
      : `<div style="background:rgba(199,81,70,0.1);border:1px solid rgba(199,81,70,0.25);border-radius:8px;padding:14px;color:var(--red);font-size:0.9rem;">
           ✗ ${message}
           <div style="margin-top:10px;"><a href="#/login" style="color:var(--red);font-weight:600;">Go to sign in →</a></div>
         </div>`;
  }
}
