import { escapeHtml } from '../../utils/helpers.js';
import { getUser } from '../../utils/storage.js';

/* ── KPI card tooltip (single floating element, fixed-position) ─────────────── */
let _kpiTipEl = null;
function _getKpiTip() {
  if (!_kpiTipEl) {
    _kpiTipEl = document.createElement('div');
    _kpiTipEl.className = 'kpi-tip-box';
    document.body.appendChild(_kpiTipEl);
  }
  return _kpiTipEl;
}
document.addEventListener('mouseover', e => {
  const card = e.target.closest('.has-kpi-tip');
  if (!card) return;
  const tip = _getKpiTip();
  tip.textContent = card.dataset.kpiTip || '';
  // Make visible off-screen first so the browser lays it out and we can read its size
  tip.style.left = '-9999px';
  tip.style.top  = '-9999px';
  tip.classList.add('visible');
  // After reflow, position correctly above the card centred
  requestAnimationFrame(() => {
    const r    = card.getBoundingClientRect();
    const tipH = tip.offsetHeight;
    const tipW = tip.offsetWidth;
    let left = r.left + r.width / 2 - tipW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
    const top = r.top - tipH - 8;
    tip.style.left = left + 'px';
    tip.style.top  = (top < 8 ? r.bottom + 8 : top) + 'px';
  });
});
document.addEventListener('mouseout', e => {
  if (!e.target.closest('.has-kpi-tip')) return;
  if (e.relatedTarget?.closest('.has-kpi-tip')) return;
  _getKpiTip().classList.remove('visible');
});

/* ── Chart.js loader ────────────────────────────────────────────────────────── */

let chartJsLoading = null;
export let chartInstances = {};

const CHARTJS_CDNS = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://unpkg.com/chart.js@4.4.1/dist/chart.umd.js',
];

export function loadChartJs() {
  if (window.Chart) return Promise.resolve();
  if (chartJsLoading) return chartJsLoading;
  chartJsLoading = new Promise((resolve, reject) => {
    const tryLoad = (idx) => {
      if (idx >= CHARTJS_CDNS.length) { chartJsLoading = null; reject(new Error('Failed to load Chart.js from all CDNs')); return; }
      const s = document.createElement('script');
      s.src = CHARTJS_CDNS[idx];
      s.onload = resolve;
      s.onerror = () => { s.remove(); tryLoad(idx + 1); };
      document.head.appendChild(s);
    };
    tryLoad(0);
  });
  return chartJsLoading;
}

export function destroyCharts() {
  for (const k of Object.keys(chartInstances)) {
    try { chartInstances[k]?.destroy(); } catch { /* ignore */ }
  }
  chartInstances = {};
}

export function mkChart(id, type, data, extra = {}) {
  const el = document.getElementById(id);
  if (!el || !window.Chart) return;
  try {
    chartInstances[id]?.destroy();
    chartInstances[id] = new Chart(el, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        ...extra,
      },
    });
  } catch (e) {
    console.warn('Chart error:', id, e);
  }
}

/* ── Palette ─────────────────────────────────────────────────────────────────── */

export const C = {
  green:  '#2b6e4f',
  amber:  '#e5a52f',
  red:    '#c75146',
  blue:   '#3b7db8',
  teal:   '#1b8b6e',
  dim:    '#5a6b62',
  purple: '#7c5cbf',
  orange: '#d97443',
};
export const PALETTE = [C.blue, C.green, C.amber, C.red, C.teal, C.dim, C.purple, C.orange];

/* ── Global filter state ─────────────────────────────────────────────────────── */

export const filters = {
  dateRange: '90',
  farmId:    '',
  fieldId:   '',
  scoutId:   '',
};

/* ── Filter helpers ──────────────────────────────────────────────────────────── */

export function filterCutoff() {
  if (filters.dateRange === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(filters.dateRange, 10));
  return d;
}

export function sessionInRange(s) {
  const cutoff = filterCutoff();
  if (!cutoff) return true;
  const ref = s.completedAt || s.startedAt || s.scheduledDate;
  if (!ref) return false;
  return new Date(ref) >= cutoff;
}

export function applyFilters(rawData) {
  let sessions = rawData.sessions.filter(sessionInRange);
  if (filters.farmId)  sessions = sessions.filter(s => String(s.farmId)  === filters.farmId);
  if (filters.fieldId) sessions = sessions.filter(s => String(s.fieldId) === filters.fieldId);
  if (filters.scoutId) sessions = sessions.filter(s => (s.scouterName || s.scouterId) === filters.scoutId);

  let traps = rawData.traps;
  if (filters.fieldId) traps = traps.filter(t => String(t.fieldId) === filters.fieldId);
  else if (filters.farmId) {
    const farmFieldIds = new Set(rawData.fields.filter(f => String(f.farmId) === filters.farmId).map(f => String(f.id)));
    traps = traps.filter(t => farmFieldIds.has(String(t.fieldId)));
  }

  let fields = rawData.fields;
  if (filters.farmId) fields = fields.filter(f => String(f.farmId) === filters.farmId);

  return { ...rawData, sessions, traps, fields };
}

/* ── Data helpers ────────────────────────────────────────────────────────────── */

export function realObs(session) {
  // Exclude only unexecuted planned slots (no data recorded yet).
  // A planned observation that has been filled in (count or presence recorded)
  // is a real result and must appear in all analytics including breach alerts.
  return (session.observations || []).filter(o =>
    !o.isPlanned || o.count != null || o.isPresent != null
  );
}

export function allRealObs(sessions) {
  return sessions.flatMap(realObs);
}

export function completedSessions(sessions) {
  return sessions.filter(s => !!s.completedAt);
}

export function plannedSessions(sessions) {
  return sessions.filter(s => s.isPlanned && !s.startedAt && !s.completedAt);
}

export function activeSessions(sessions) {
  return sessions.filter(s => !!s.startedAt && !s.completedAt);
}

export function overdueSessions(sessions) {
  const now = new Date();
  return sessions.filter(s =>
    s.isPlanned && !s.startedAt && !s.completedAt &&
    s.scheduledDate && new Date(s.scheduledDate) < now
  );
}

export function sessionDuration(s) {
  if (!s.startedAt || !s.completedAt) return null;
  return Math.round((new Date(s.completedAt) - new Date(s.startedAt)) / 60000);
}

export function trendArrow(now, prev) {
  if (prev === 0 && now === 0) return '<span style="color:var(--text-dim);">— no data</span>';
  if (prev === 0) return `<span style="color:${C.red};">▲ new</span>`;
  const pct = Math.round(((now - prev) / prev) * 100);
  if (Math.abs(pct) < 5) return `<span style="color:${C.dim};">→ stable</span>`;
  if (pct > 0) return `<span style="color:${C.red};">▲ ${pct}%</span>`;
  return `<span style="color:${C.green};">▼ ${Math.abs(pct)}%</span>`;
}

export function lastNWeekLabels(n = 8) {
  const labels = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    labels.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
  }
  return labels;
}

export function weekIndex(dateStr, n = 8) {
  if (!dateStr) return -1;
  const diffMs    = Date.now() - new Date(dateStr).getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  const idx = (n - 1) - diffWeeks;
  return idx >= 0 && idx <= (n - 1) ? idx : -1;
}

/* ── Shared HTML helpers ────────────────────────────────────────────────────── */

export function kpiGrid(cards) {
  return `<div class="stat-grid" style="margin-bottom:16px;">${cards.join('')}</div>`;
}

export function kpiCard(label, value, sub = '', color = '', tooltip = '') {
  const tipAttr = tooltip ? ` data-kpi-tip="${tooltip.replace(/"/g, '&quot;')}"` : '';
  return `
    <div class="stat-card${tooltip ? ' has-kpi-tip' : ''}"${tipAttr} style="cursor:default;">
      <div class="stat-label">${label}</div>
      <div class="stat-value" style="${color ? `color:${color};` : ''}">${value}</div>
      ${sub ? `<div class="stat-delta">${sub}</div>` : ''}
    </div>`;
}

export function chartCard(title, canvasId, height = 200, subtitle = '') {
  return `
    <div class="card card-p card-static" style="margin-bottom:16px;">
      <div style="margin-bottom:12px;">
        <div class="section-title">${title}</div>
        ${subtitle ? `<div class="section-sub">${subtitle}</div>` : ''}
      </div>
      <div style="position:relative;height:${height}px;"><canvas id="${canvasId}"></canvas></div>
    </div>`;
}

export function tableCard(thead, tbody, title = '', subtitle = '') {
  return `
    <div class="card card-static" style="margin-bottom:16px;">
      ${title ? `<div class="card-p" style="padding-bottom:0;">
        <div class="section-title" style="margin-bottom:${subtitle ? 2 : 10}px;">${title}</div>
        ${subtitle ? `<div class="section-sub" style="margin-bottom:10px;">${subtitle}</div>` : ''}
      </div>` : ''}
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr>${thead.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    </div>`;
}

export function emptyState(icon, title, desc = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ''}</div>`;
}

const LOGO_SVG = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="36" height="36" style="display:block;flex-shrink:0;">
  <rect width="32" height="32" rx="5" fill="#1e5c2e"/>
  <circle cx="13.5" cy="13" r="7.5" fill="none" stroke="#ffffff" stroke-width="2.3"/>
  <line x1="19.2" y1="18.7" x2="25" y2="24.5" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/>
  <ellipse cx="13.5" cy="13" rx="3.8" ry="4.7" fill="#ffffff"/>
  <line x1="13.5" y1="8.5" x2="13.5" y2="17.5" stroke="#1e5c2e" stroke-width="1" stroke-linecap="round"/>
  <line x1="13.5" y1="11" x2="15.5" y2="10" stroke="#1e5c2e" stroke-width="0.7" stroke-linecap="round"/>
  <line x1="13.5" y1="13" x2="16" y2="12" stroke="#1e5c2e" stroke-width="0.7" stroke-linecap="round"/>
  <line x1="13.5" y1="15" x2="15.5" y2="14" stroke="#1e5c2e" stroke-width="0.7" stroke-linecap="round"/>
  <line x1="13.5" y1="11" x2="11.5" y2="10" stroke="#1e5c2e" stroke-width="0.7" stroke-linecap="round"/>
  <line x1="13.5" y1="13" x2="11" y2="12" stroke="#1e5c2e" stroke-width="0.7" stroke-linecap="round"/>
  <line x1="13.5" y1="15" x2="11.5" y2="14" stroke="#1e5c2e" stroke-width="0.7" stroke-linecap="round"/>
</svg>`;

export function printReport(reportTitle, rawData) {
  const user = getUser();
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown';
  const now = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const filterParts = [];
  if (filters.from || filters.to) {
    const from = filters.from || '—';
    const to   = filters.to   || '—';
    filterParts.push(`Date: ${from} → ${to}`);
  }
  if (filters.farmId && rawData?.farms) {
    const f = rawData.farms.find(x => String(x.id) === filters.farmId);
    if (f) filterParts.push(`Farm: ${f.name}`);
  }
  if (filters.fieldId && rawData?.fields) {
    const f = rawData.fields.find(x => String(x.id) === filters.fieldId);
    if (f) filterParts.push(`Field: ${f.name}`);
  }
  if (filters.scoutId) filterParts.push(`Scout: ${filters.scoutId}`);

  const existing = document.getElementById('pl-print-header');
  if (existing) existing.remove();

  const header = document.createElement('div');
  header.id = 'pl-print-header';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      ${LOGO_SVG}
      <div>
        <div style="font-family:serif;font-size:1.3rem;font-weight:700;color:#1e5c2e;line-height:1.1;">
          Pest<span style="color:#e5a52f;">Look</span>
        </div>
        <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:.1em;color:#5a6b62;">Field Intelligence</div>
      </div>
      <div style="margin-left:auto;text-align:right;">
        <div style="font-size:1rem;font-weight:700;color:#1f2a26;">${escapeHtml(reportTitle)}</div>
        <div style="font-size:0.72rem;color:#5a6b62;margin-top:2px;">Printed by ${escapeHtml(userName)} · ${escapeHtml(now)}</div>
      </div>
    </div>
    <div style="border-top:2px solid #2b6e4f;padding-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
      ${filterParts.length
        ? filterParts.map(p => `<span style="background:#eaf7f0;border:1px solid #c0ddd0;border-radius:4px;padding:2px 8px;font-size:0.72rem;color:#1e5c2e;">${escapeHtml(p)}</span>`).join('')
        : '<span style="font-size:0.72rem;color:#5a6b62;">No filters applied — showing all data</span>'
      }
    </div>`;

  const body = document.getElementById('rpt-body');
  if (body) body.prepend(header);

  window.print();

  // Remove after print dialog closes
  setTimeout(() => header.remove(), 1000);
}

export function filterBadge(rawData) {
  const parts = [];
  if (filters.dateRange !== 'all') {
    const labels = { '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', '365': 'Last 12 months' };
    parts.push(labels[filters.dateRange] || '');
  }
  if (filters.farmId)  { const f = rawData.farms.find(x => String(x.id) === filters.farmId);  if (f) parts.push(f.name); }
  if (filters.fieldId) { const f = rawData.fields.find(x => String(x.id) === filters.fieldId); if (f) parts.push(f.name); }
  if (filters.scoutId) parts.push(filters.scoutId);
  if (!parts.length) return '';
  return `<div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;display:flex;align-items:center;gap:6px;">
    <span>🔍</span><span>Filtered: <strong>${escapeHtml(parts.join(' · '))}</strong></span>
  </div>`;
}
