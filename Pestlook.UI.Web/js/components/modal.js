let overlay = null;

function ensureOverlay() {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '9999';
    document.body.appendChild(overlay);
  }
  return overlay;
}

export function openModal({ title, subtitle, content, onClose, extraClass }) {
  const ov = ensureOverlay();

  ov.innerHTML = `
    <div class="modal-box${extraClass ? ' ' + extraClass : ''}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div>
          <div style="font-family:'Fraunces',serif;font-size:1.2rem;font-weight:700;color:#fff;">${title}</div>
          ${subtitle ? `<div style="font-size:0.78rem;color:var(--text-dim);margin-top:2px;">${subtitle}</div>` : ''}
        </div>
        <button class="modal-close-btn" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;width:32px;height:32px;cursor:pointer;color:var(--text-dim);font-size:1rem;display:flex;align-items:center;justify-content:center;">×</button>
      </div>
      <div class="modal-body"></div>
    </div>
  `;

  const body = ov.querySelector('.modal-body');
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }

  ov.querySelector('.modal-close-btn').addEventListener('click', () => {
    closeModal();
    if (onClose) onClose();
  });

  ov.classList.add('open');
  return body;
}

export function closeModal() {
  if (overlay) overlay.classList.remove('open');
}
