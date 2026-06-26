import { getObservationLog } from '../api/observation-log.js';
import { getFarms }          from '../api/farms.js';
import { getFields }         from '../api/fields.js';
import { getTraps }          from '../api/traps.js';
import { getPests }          from '../api/pests.js';
import { showToast }         from '../components/toast.js';
import { tag }               from '../components/tag.js';
import { escapeHtml, formatDateTime } from '../utils/helpers.js';
import { navigate }          from '../utils/router.js';

/* ── state ─────────────────────────────────────────────────────────────────── */

const S = {
  farms: [], fields: [], traps: [], pests: [],
  filters: { from: '', to: '', farmId: '', fieldId: '', trapId: '', pestId: '', scoutId: '' },
  page: 1, pageSize: 50,
  result: null, loading: false,
};

/* ── entry point ─────────────────────────────────────────────────────────── */

export async function renderObservationLog(container) {
  let alive = true;
  const prevCssText = container.style.cssText;
  container._cleanup = () => { container.style.cssText = prevCssText; };
  container.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;flex:1;min-height:0;padding:20px 28px;';

  container.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;flex-shrink:0;">
      <div>
        <div class="skeleton skeleton-title" style="width:220px;"></div>
        <div class="skeleton skeleton-text" style="width:360px;margin-top:8px;"></div>
      </div>
    </div>
    <div class="card" style="flex:1;min-height:0;">
      <div class="skeleton skeleton-card" style="height:100%;border-radius:0;"></div>
    </div>`;

  try {
    const [farmsRes, fieldsRes, trapsRes, pestsRes] = await Promise.all([
      getFarms(), getFields(), getTraps(), getPests(),
    ]);
    if (!alive) return;
    S.farms  = farmsRes.data  ?? [];
    S.fields = fieldsRes.data ?? [];
    S.traps  = trapsRes.data  ?? [];
    S.pests  = pestsRes.data  ?? [];
  } catch (e) {
    container.innerHTML = `<div style="padding:28px;"><p style="color:var(--red);">Failed to load: ${escapeHtml(e.message)}</p></div>`;
    return;
  }

  mount(container);
  await runQuery(container);
}

/* ── mount ──────────────────────────────────────────────────────────────── */

function mount(container) {
  container.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;flex-shrink:0;">
      <div>
        <div class="page-heading">Observation Log</div>
        <div class="page-desc">Cross-session observation explorer — filter by date, location, pest, or scout</div>
      </div>
      <button class="btn-primary" id="obsLogExportBtn" style="padding:6px 14px;font-size:0.8rem;white-space:nowrap;">⬇ Export CSV</button>
    </div>

    <div class="card" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;transform:none;transition:none;">

      <!-- Filter bar -->
      <div id="obs-log-filter-bar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;padding:10px 14px;border-bottom:1px solid var(--border);flex-shrink:0;">
        <div style="display:flex;flex-direction:column;gap:3px;">
          <label style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;">From</label>
          <input type="date" id="obsLogFrom" class="input-field" style="padding:5px 8px;font-size:0.8rem;width:140px;margin:0;" />
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <label style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;">To</label>
          <input type="date" id="obsLogTo" class="input-field" style="padding:5px 8px;font-size:0.8rem;width:140px;margin:0;" />
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <label style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;">Farm</label>
          <select id="obsLogFarm" class="input-field" style="padding:5px 8px;font-size:0.8rem;width:160px;margin:0;">
            <option value="">All farms</option>
            ${S.farms.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <label style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;">Field</label>
          <select id="obsLogField" class="input-field" style="padding:5px 8px;font-size:0.8rem;width:160px;margin:0;">
            <option value="">All fields</option>
            ${S.fields.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <label style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;">Trap</label>
          <select id="obsLogTrap" class="input-field" style="padding:5px 8px;font-size:0.8rem;width:150px;margin:0;">
            <option value="">All traps</option>
            ${S.traps.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <label style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;">Pest</label>
          <select id="obsLogPest" class="input-field" style="padding:5px 8px;font-size:0.8rem;width:160px;margin:0;">
            <option value="">All pests</option>
            ${S.pests.map(p => `<option value="${p.id}">${escapeHtml(p.commonName)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <label style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;">Scout</label>
          <input type="text" id="obsLogScout" class="input-field" placeholder="Scout name…" style="padding:5px 8px;font-size:0.8rem;width:140px;margin:0;" />
        </div>
        <button class="btn-primary" id="obsLogApply" style="padding:6px 18px;font-size:0.8rem;align-self:flex-end;">Apply</button>
        <button class="btn-outline" id="obsLogClear" style="padding:6px 12px;font-size:0.8rem;align-self:flex-end;">Clear</button>
      </div>

      <!-- Table (scrolls) -->
      <div id="obsLogTableArea" style="overflow-x:auto;overflow-y:auto;flex:1;min-height:0;">
        <div style="text-align:center;padding:60px 0;color:var(--text-dim);">Loading…</div>
      </div>

      <!-- Pagination (pinned, never scrolls) -->
      <div id="obsLogPagination"></div>

    </div>
  `;

  // Farm → cascade field dropdown
  document.getElementById('obsLogFarm').addEventListener('change', () => {
    const farmId = document.getElementById('obsLogFarm').value;
    const fieldSel = document.getElementById('obsLogField');
    fieldSel.innerHTML = `<option value="">All fields</option>` +
      S.fields
        .filter(f => !farmId || f.farmId === farmId)
        .map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`)
        .join('');
    // Also cascade trap dropdown
    const trapSel = document.getElementById('obsLogTrap');
    trapSel.innerHTML = `<option value="">All traps</option>` +
      S.traps
        .filter(t => !farmId || t.farmId === farmId || t.fieldId === farmId)
        .map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`)
        .join('');
  });

  document.getElementById('obsLogApply').addEventListener('click', () => applyFilters(container));
  document.getElementById('obsLogClear').addEventListener('click', () => {
    document.getElementById('obsLogFrom').value  = '';
    document.getElementById('obsLogTo').value    = '';
    document.getElementById('obsLogFarm').value  = '';
    document.getElementById('obsLogField').value = '';
    document.getElementById('obsLogTrap').value  = '';
    document.getElementById('obsLogPest').value  = '';
    document.getElementById('obsLogScout').value = '';
    // Restore full field/trap lists
    document.getElementById('obsLogField').innerHTML = `<option value="">All fields</option>` +
      S.fields.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
    document.getElementById('obsLogTrap').innerHTML = `<option value="">All traps</option>` +
      S.traps.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    S.filters = { from: '', to: '', farmId: '', fieldId: '', trapId: '', pestId: '', scoutId: '' };
    S.page = 1;
    runQuery(container);
  });

  document.getElementById('obsLogExportBtn').addEventListener('click', () => exportCsv());
}

/* ── apply filters ──────────────────────────────────────────────────────── */

function applyFilters(container) {
  S.filters.from    = document.getElementById('obsLogFrom').value;
  S.filters.to      = document.getElementById('obsLogTo').value;
  S.filters.farmId  = document.getElementById('obsLogFarm').value;
  S.filters.fieldId = document.getElementById('obsLogField').value;
  S.filters.trapId  = document.getElementById('obsLogTrap').value;
  S.filters.pestId  = document.getElementById('obsLogPest').value;
  S.filters.scoutId = document.getElementById('obsLogScout').value.trim();
  S.page = 1;
  runQuery(container);
}

/* ── query ──────────────────────────────────────────────────────────────── */

async function runQuery(container) {
  if (S.loading) return;
  S.loading = true;

  const area  = document.getElementById('obsLogTableArea');
  const pagEl = document.getElementById('obsLogPagination');
  if (area) area.innerHTML = `<div style="text-align:center;padding:60px 0;"><span class="spinner"></span></div>`;
  if (pagEl) pagEl.innerHTML = '';

  try {
    const res = await getObservationLog({
      from:     S.filters.from    || undefined,
      to:       S.filters.to      || undefined,
      farmId:   S.filters.farmId  || undefined,
      fieldId:  S.filters.fieldId || undefined,
      trapId:   S.filters.trapId  || undefined,
      pestId:   S.filters.pestId  || undefined,
      scoutId:  S.filters.scoutId || undefined,
      page:     S.page,
      pageSize: S.pageSize,
    });
    S.result = res.data;
    renderTable(container);
  } catch (e) {
    showToast('Failed to load: ' + e.message, 'error');
    if (area) area.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red);">${escapeHtml(e.message)}</div>`;
  } finally {
    S.loading = false;
  }
}

/* ── table ──────────────────────────────────────────────────────────────── */

function renderTable(container) {
  const area = document.getElementById('obsLogTableArea');
  if (!area) return;
  const paged = S.result;
  if (!paged || paged.items.length === 0) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>No observations found</h3><p>Try adjusting your filters</p></div>`;
    const pagEl = document.getElementById('obsLogPagination');
    if (pagEl) pagEl.innerHTML = '';
    return;
  }

  const { items, totalCount, page, pageSize, totalPages } = paged;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalCount);

  let rows = '';
  items.forEach((o, idx) => {
    const isTrap   = o.observationType === 'Trap' || o.observationType === 0;
    const typeTag  = isTrap ? tag('🕸️ Trap', 'green') : tag('👁 AdHoc', 'amber');
    const plannedTag = o.isPlanned ? tag('Planned', 'blue') : tag('Unplanned', 'gray');
    const pestName = o.pestName ? escapeHtml(o.pestName) : (o.isUnknownPest ? '<em>Unknown pest</em>' : '—');
    const trapName = o.trapName ? escapeHtml(o.trapName) : '—';
    const countVal = o.count != null ? o.count : '—';
    const thrVal   = o.thresholdCount != null ? o.thresholdCount : '—';
    const exceeded = o.thresholdCount != null && o.count != null && o.count > o.thresholdCount;
    const presentVal = o.isPresent != null ? (o.isPresent ? '✓ Yes' : '✗ No') : '—';
    const rowStyle = exceeded ? ' style="background:rgba(220,38,38,0.12);"' : '';
    const photos   = o.photoUrls ?? [];
    const photosHtml = photos.length > 0
      ? `<button class="btn-outline obs-log-photos-btn" style="padding:2px 8px;font-size:0.72rem;white-space:nowrap;" data-photos='${JSON.stringify(photos).replace(/'/g, '&#39;')}' data-name="${escapeHtml(o.pestName || 'Observation')}">📷 ${photos.length}</button>`
      : '—';
    const obsDate  = o.observedAt ? formatDateTime(o.observedAt) : formatDateTime(o.createdAt);
    const sessionLink = `<a href="#/sessions/${o.sessionId}" style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--green);text-decoration:none;" title="Open session">${o.sessionId.substring(0,8)}</a>`;

    rows += `<tr${rowStyle}>
      <td style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--text-dim);text-align:center;">${start + idx}</td>
      <td style="font-size:0.78rem;white-space:nowrap;">${obsDate}</td>
      <td style="font-size:0.8rem;">${escapeHtml(o.farmName || '—')}</td>
      <td style="font-size:0.8rem;">${escapeHtml(o.fieldName || '—')}</td>
      <td style="font-size:0.8rem;">${escapeHtml(o.scoutName || '—')}</td>
      <td>${typeTag} ${plannedTag}</td>
      <td style="font-size:0.8rem;">${isTrap ? trapName : '—'}</td>
      <td style="font-size:0.8rem;">${pestName}</td>
      <td style="font-size:0.8rem;">${o.captureMode || '—'}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;${exceeded ? 'color:var(--red);font-weight:700;' : ''}">${countVal}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;">${thrVal}</td>
      <td style="font-size:0.8rem;">${presentVal}</td>
      <td style="font-size:0.8rem;">${o.lifeStage || '—'}</td>
      <td style="font-size:0.78rem;color:var(--text-dim);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(o.notes || '')}">${o.notes ? escapeHtml(o.notes) : '—'}</td>
      <td>${photosHtml}</td>
      <td>${sessionLink}</td>
    </tr>`;
  });

  area.innerHTML = `
    <table class="data-table" style="width:100%;min-width:1100px;">
      <thead style="position:sticky;top:0;z-index:1;background:var(--surface);">
        <tr>
          <th style="width:36px;">#</th>
          <th>Date</th>
          <th>Farm</th>
          <th>Field</th>
          <th>Scout</th>
          <th>Type</th>
          <th>Trap</th>
          <th>Pest</th>
          <th>Mode</th>
          <th>Count</th>
          <th>Threshold</th>
          <th>Present</th>
          <th>Life Stage</th>
          <th>Notes</th>
          <th>Photos</th>
          <th>Session</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  // Pagination (pinned outside scroll area)
  const pagEl = document.getElementById('obsLogPagination');
  if (pagEl) {
    pagEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;
                  padding:10px 14px;border-top:1px solid var(--border);font-size:0.8rem;color:var(--text-dim);">
        <span>${start}–${end} of ${totalCount.toLocaleString()} observations</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="btn-outline" id="obsLogFirst" style="padding:4px 10px;" ${page <= 1 ? 'disabled' : ''}>«</button>
          <button class="btn-outline" id="obsLogPrev"  style="padding:4px 10px;" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>
          <span style="font-size:0.78rem;">Page
            <input type="number" id="obsLogPageInput" value="${page}" min="1" max="${totalPages}"
              style="width:52px;padding:3px 6px;font-size:0.78rem;margin:0 4px;display:inline-block;" class="input-field" />
            of ${totalPages}
          </span>
          <button class="btn-outline" id="obsLogNext"  style="padding:4px 10px;" ${page >= totalPages ? 'disabled' : ''}>Next ›</button>
          <button class="btn-outline" id="obsLogLast"  style="padding:4px 10px;" ${page >= totalPages ? 'disabled' : ''}>»</button>
          <select class="input-field pg-size" style="margin:0;padding:4px 8px;font-size:0.78rem;width:auto;">
            ${[25, 50, 100].map(n => `<option value="${n}"${n === S.pageSize ? ' selected' : ''}>${n} / page</option>`).join('')}
          </select>
        </div>
      </div>`;

    pagEl.querySelector('#obsLogFirst').addEventListener('click', () => { S.page = 1; runQuery(container); });
    pagEl.querySelector('#obsLogPrev').addEventListener('click',  () => { if (S.page > 1) { S.page--; runQuery(container); } });
    pagEl.querySelector('#obsLogNext').addEventListener('click',  () => { if (S.page < totalPages) { S.page++; runQuery(container); } });
    pagEl.querySelector('#obsLogLast').addEventListener('click',  () => { S.page = totalPages; runQuery(container); });
    pagEl.querySelector('#obsLogPageInput').addEventListener('change', e => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 1 && v <= totalPages) { S.page = v; runQuery(container); }
    });
    pagEl.querySelector('.pg-size').addEventListener('change', e => {
      S.pageSize = parseInt(e.target.value, 10);
      S.page = 1;
      runQuery(container);
    });
  }

  // Photo modal
  area.querySelectorAll('.obs-log-photos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const urls  = JSON.parse(btn.dataset.photos);
      const name  = btn.dataset.name;
      showPhotosModal(urls, name);
    });
  });
}

/* ── photo modal ────────────────────────────────────────────────────────── */

function showPhotosModal(urls, name) {
  const existing = document.getElementById('obsLogPhotosModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'obsLogPhotosModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);';
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-weight:600;">${escapeHtml(name)} — Photos</div>
        <button id="obsLogPhotosClose" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:1.2rem;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;">
        ${urls.map(u => `<img src="${escapeHtml(u)}" style="width:100%;border-radius:6px;border:1px solid var(--border);" loading="lazy" />`).join('')}
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('obsLogPhotosClose').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/* ── CSV export ─────────────────────────────────────────────────────────── */

async function exportCsv() {
  showToast('Preparing export…', 'info');
  try {
    const res = await getObservationLog({
      from:     S.filters.from    || undefined,
      to:       S.filters.to      || undefined,
      farmId:   S.filters.farmId  || undefined,
      fieldId:  S.filters.fieldId || undefined,
      trapId:   S.filters.trapId  || undefined,
      pestId:   S.filters.pestId  || undefined,
      scoutId:  S.filters.scoutId || undefined,
      page: 1, pageSize: 100000,
    });
    const items = res.data?.items ?? [];
    if (!items.length) { showToast('No data to export', 'info'); return; }

    const headers = ['#','Date','Farm','Field','Scout','Type','Planned','Trap','Pest','Mode','Count','Threshold','Present','LifeStage','Notes','SessionId'];
    const csvRows = [headers.join(',')];
    items.forEach((o, i) => {
      const isTrap = o.observationType === 'Trap' || o.observationType === 0;
      const obsDate = o.observedAt ? new Date(o.observedAt).toISOString() : new Date(o.createdAt).toISOString();
      csvRows.push([
        i + 1,
        obsDate,
        `"${(o.farmName || '').replace(/"/g, '""')}"`,
        `"${(o.fieldName || '').replace(/"/g, '""')}"`,
        `"${(o.scoutName || '').replace(/"/g, '""')}"`,
        isTrap ? 'Trap' : 'AdHoc',
        o.isPlanned ? 'Planned' : 'Unplanned',
        `"${(o.trapName || '').replace(/"/g, '""')}"`,
        `"${(o.isUnknownPest ? 'Unknown' : o.pestName || '').replace(/"/g, '""')}"`,
        o.captureMode || '',
        o.count ?? '',
        o.thresholdCount ?? '',
        o.isPresent != null ? (o.isPresent ? 'Yes' : 'No') : '',
        o.lifeStage || '',
        `"${(o.notes || '').replace(/"/g, '""')}"`,
        o.sessionId,
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `observation-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${items.length} rows`, 'success');
  } catch (e) {
    showToast('Export failed: ' + e.message, 'error');
  }
}
