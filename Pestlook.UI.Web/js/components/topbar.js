export function renderTopbar(container, title) {
  container.innerHTML = `
    <div>
      <div class="page-title" id="pageTitle">${title || 'Dashboard'}</div>
    </div>
    <div class="topbar-right">
      <input class="search-bar" placeholder="🔍  Search farms, pests, sessions…" type="text" id="globalSearch">
      <div class="notif-btn">🔔<div class="notif-dot"></div></div>
      <button class="btn-primary" id="topbarCta">＋ New Session</button>
    </div>
  `;
}

export function setPageTitle(title) {
  const el = document.getElementById('pageTitle');
  if (el) el.textContent = title;
}

export function setTopbarCta(text, onClick) {
  const btn = document.getElementById('topbarCta');
  if (btn) {
    btn.textContent = text;
    btn.onclick = onClick;
    btn.style.display = text ? '' : 'none';
  }
}
