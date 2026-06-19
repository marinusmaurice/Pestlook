import { customReportsApi } from '../api/customReports.js';
import { showToast }         from '../components/toast.js';
import { escapeHtml }        from '../utils/helpers.js';
import { getAccessToken, getUser } from '../utils/storage.js';

/* ── constants ────────────────────────────────────────────────────────────── */

const OPERATOR_LABELS = {
  eq: '=', neq: '≠', contains: 'contains', startswith: 'starts with',
  endswith: 'ends with', gt: '>', gte: '≥', lt: '<', lte: '≤',
  isempty: 'is empty', isnotempty: 'is not empty',
};
const STRING_OPS = ['eq','neq','contains','startswith','endswith','isempty','isnotempty'];
const NUMBER_OPS = ['eq','neq','gt','gte','lt','lte'];
const BOOL_OPS   = ['eq','neq'];
const DATE_OPS   = ['eq','neq','gt','gte','lt','lte'];
const AGG_FUNCS  = ['count','sum','avg','min','max'];

/* ── state ────────────────────────────────────────────────────────────────── */

const S = {
  schema: {}, entity: '', columns: [], filters: [],
  groupBy: [], aggregates: [], orderBy: '', orderDesc: false,
  page: 1, pageSize: 50, result: null, loading: false,
  savedReports: [], editingId: null,
};

/* ── entry point ─────────────────────────────────────────────────────────── */

export async function renderCustomReports(container) {
  let alive = true;
  container._cleanup = () => { alive = false; };
  container.style.cssText = 'display:flex;flex-direction:column;overflow:hidden;height:100%;';

  container.innerHTML = `<div style="padding:28px;"><div class="skeleton skeleton-title" style="width:220px;"></div><div class="skeleton skeleton-text" style="width:340px;margin-top:8px;"></div></div>`;

  try {
    const [schemaRes, savedRes] = await Promise.all([
      customReportsApi.getSchema(),
      customReportsApi.getSaved(),
    ]);
    if (!alive) return;
    S.schema       = schemaRes.data ?? {};
    S.savedReports = savedRes.data  ?? [];
  } catch (e) {
    container.innerHTML = `<div style="padding:28px;"><p class="page-desc" style="color:var(--red);">Failed to load: ${escapeHtml(e.message)}</p></div>`;
    return;
  }

  mount(container);
}

/* ── mount ───────────────────────────────────────────────────────────────── */

function mount(container) {
  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'padding:24px 28px 0;flex-shrink:0;';
  header.innerHTML = `
    <div class="section-head" style="margin-bottom:16px;">
      <div>
        <div class="page-heading">🔍 Custom Reports</div>
        <div class="page-desc">Build ad-hoc queries across your data. Results are always scoped to your tenant.</div>
      </div>
    </div>`;

  // Body
  const body = document.createElement('div');
  body.style.cssText = 'display:flex;flex:1;overflow:hidden;';

  const sidebar = document.createElement('div');
  sidebar.id = 'cr-sidebar';
  sidebar.style.cssText = 'width:290px;min-width:260px;border-right:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column;background:var(--surface);';

  const main = document.createElement('div');
  main.id = 'cr-main';
  main.style.cssText = 'flex:1;overflow:auto;padding:20px 28px;';

  body.append(sidebar, main);
  container.append(header, body);

  renderSidebar(sidebar);
  renderMain(main);
}

/* ── sidebar ─────────────────────────────────────────────────────────────── */

function renderSidebar(sidebar) {
  sidebar.innerHTML = '';
  const cols = S.entity ? (S.schema[S.entity]?.columns ?? []) : [];

  // Entity
  const sec0 = pane('Table');
  const entitySel = mkSel(
    Object.entries(S.schema).map(([k,v]) => ({ value: k, label: v.label })),
    S.entity, '— pick a table —'
  );
  entitySel.addEventListener('change', () => {
    Object.assign(S, { entity: entitySel.value, columns: [], filters: [], groupBy: [], aggregates: [], orderBy: '', result: null, page: 1, editingId: null });
    renderSidebar(sidebar);
    renderMain(document.getElementById('cr-main'));
  });
  sec0.append(entitySel);
  sidebar.append(sec0);

  if (!S.entity) { sidebar.append(savedPanel()); return; }

  // Columns
  const sec1 = pane('Columns', 'leave empty = all');
  const colGrid = document.createElement('div');
  colGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;';
  cols.forEach(col => {
    const lbl = mkCheckLabel(col.label, col.key, S.columns.includes(col.key), checked => {
      if (checked) { if (!S.columns.includes(col.key)) S.columns.push(col.key); }
      else S.columns = S.columns.filter(c => c !== col.key);
    });
    colGrid.append(lbl);
  });
  sec1.append(colGrid);
  sidebar.append(sec1);

  // Filters
  const sec2 = pane('Filters');
  const filterList = document.createElement('div');
  filterList.id = 'cr-filter-list';
  renderFilterList(filterList, cols);
  const addF = mkLink('+ Add filter');
  addF.addEventListener('click', () => {
    S.filters.push({ column: cols[0]?.key ?? '', operator: 'eq', value: '' });
    renderFilterList(filterList, cols);
  });
  sec2.append(filterList, addF);
  sidebar.append(sec2);

  // Group by + aggregates
  const sec3 = pane('Group By & Aggregate');
  const gbGrid = document.createElement('div');
  gbGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;margin-bottom:10px;';
  cols.forEach(col => {
    gbGrid.append(mkCheckLabel(col.label, col.key, S.groupBy.includes(col.key), checked => {
      if (checked) { if (!S.groupBy.includes(col.key)) S.groupBy.push(col.key); }
      else S.groupBy = S.groupBy.filter(c => c !== col.key);
      renderAggList(aggList, cols);
    }));
  });
  const aggLabel = document.createElement('div');
  aggLabel.className = 'input-label';
  aggLabel.style.marginBottom = '4px';
  aggLabel.textContent = 'Aggregates';
  const aggList = document.createElement('div');
  aggList.id = 'cr-agg-list';
  renderAggList(aggList, cols);
  const addA = mkLink('+ Add aggregate');
  addA.addEventListener('click', () => {
    const numCols = cols.filter(c => c.type === 'number');
    S.aggregates.push({ column: (numCols[0] ?? cols[0])?.key ?? '', function: 'count' });
    renderAggList(aggList, cols);
  });
  sec3.append(gbGrid, aggLabel, aggList, addA);
  sidebar.append(sec3);

  // Sort
  const sec4 = pane('Sort');
  const sortSel = mkSel(cols.map(c => ({ value: c.key, label: c.label })), S.orderBy, '— none —');
  sortSel.addEventListener('change', () => { S.orderBy = sortSel.value; });
  const descLbl = mkCheckLabel('Descending', '__desc', S.orderDesc, v => { S.orderDesc = v; });
  descLbl.style.marginTop = '6px';
  sec4.append(sortSel, descLbl);
  sidebar.append(sec4);

  // Page size
  const sec5 = pane('Page size');
  const psSel = mkSel([25,50,100,250,500].map(n => ({ value: n, label: String(n) })), S.pageSize);
  psSel.addEventListener('change', () => { S.pageSize = Number(psSel.value); S.page = 1; });
  sec5.append(psSel);
  sidebar.append(sec5);

  // Actions
  const actions = document.createElement('div');
  actions.style.cssText = 'padding:14px 16px;display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--border);';

  const runBtn = document.createElement('button');
  runBtn.className = 'btn-primary';
  runBtn.style.cssText += 'justify-content:center;';
  runBtn.textContent = 'Run Report';
  runBtn.addEventListener('click', runReport);

  const row2 = document.createElement('div');
  row2.style.cssText = 'display:flex;gap:8px;';

  const expCsvBtn = document.createElement('button');
  expCsvBtn.className = 'btn-outline';
  expCsvBtn.style.flex = '1';
  expCsvBtn.textContent = 'CSV';
  expCsvBtn.title = 'Export as CSV';
  expCsvBtn.addEventListener('click', exportCsv);

  const expPdfBtn = document.createElement('button');
  expPdfBtn.className = 'btn-outline';
  expPdfBtn.style.flex = '1';
  expPdfBtn.textContent = 'PDF';
  expPdfBtn.title = 'Export as PDF';
  expPdfBtn.addEventListener('click', exportPdf);

  const row3 = document.createElement('div');
  row3.style.cssText = 'display:flex;gap:8px;';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-outline';
  saveBtn.style.cssText = 'flex:1;justify-content:center;';
  saveBtn.textContent = S.editingId ? 'Update' : 'Save Report';
  saveBtn.addEventListener('click', promptSave);

  row2.append(expCsvBtn, expPdfBtn);
  row3.append(saveBtn);
  actions.append(runBtn, row2, row3);
  sidebar.append(actions);

  sidebar.append(savedPanel());
}

function pane(title, sub = '') {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:12px 16px;border-bottom:1px solid var(--border);';
  const hd = document.createElement('div');
  hd.style.cssText = 'display:flex;align-items:baseline;gap:6px;margin-bottom:8px;';
  const t = document.createElement('span');
  t.className = 'input-label';
  t.style.cssText = 'font-size:0.68rem;letter-spacing:.1em;text-transform:uppercase;font-family:"JetBrains Mono",monospace;color:var(--text-dim);font-weight:600;';
  t.textContent = title;
  hd.append(t);
  if (sub) {
    const s = document.createElement('span');
    s.style.cssText = 'font-size:0.65rem;color:var(--text-dim);font-style:italic;';
    s.textContent = sub;
    hd.append(s);
  }
  wrap.append(hd);
  return wrap;
}

function mkSel(options, current, placeholder) {
  const sel = document.createElement('select');
  sel.className = 'input-field';
  sel.style.cssText = 'margin-top:0;padding:6px 10px;font-size:0.81rem;';
  if (placeholder !== undefined) {
    const ph = document.createElement('option');
    ph.value = ''; ph.textContent = placeholder;
    sel.append(ph);
  }
  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value   = o.value ?? o;
    opt.textContent = o.label ?? o;
    if ((o.value ?? o) == current) opt.selected = true;
    sel.append(opt);
  });
  return sel;
}

function mkCheckLabel(text, key, checked, onChange) {
  const lbl = document.createElement('label');
  lbl.style.cssText = 'display:flex;align-items:center;gap:5px;font-size:0.78rem;cursor:pointer;color:var(--text);padding:2px 0;user-select:none;';
  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.value = key; cb.checked = checked;
  cb.addEventListener('change', () => onChange(cb.checked));
  const span = document.createElement('span');
  span.textContent = text;
  lbl.append(cb, span);
  return lbl;
}

function mkLink(text) {
  const a = document.createElement('button');
  a.style.cssText = 'background:none;border:none;padding:4px 0;font-size:0.75rem;color:var(--green);cursor:pointer;font-family:inherit;text-align:left;margin-top:4px;';
  a.textContent = text;
  return a;
}

function renderFilterList(container, cols) {
  container.innerHTML = '';
  S.filters.forEach((f, i) => {
    const colType = cols.find(c => c.key === f.column)?.type ?? 'string';
    const ops = colType === 'number' ? NUMBER_OPS : colType === 'bool' ? BOOL_OPS : colType === 'date' ? DATE_OPS : STRING_OPS;
    const noVal = ['isempty','isnotempty'].includes(f.operator);

    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;';

    const colSel = mkSel(cols.map(c => ({ value: c.key, label: c.label })), f.column);
    colSel.style.cssText = 'margin-top:0;padding:5px 8px;font-size:0.77rem;grid-column:1/-1;';
    colSel.addEventListener('change', () => { S.filters[i].column = colSel.value; renderFilterList(container, cols); });

    const opSel = mkSel(ops.map(o => ({ value: o, label: OPERATOR_LABELS[o] })), f.operator);
    opSel.style.cssText = 'margin-top:0;padding:5px 8px;font-size:0.77rem;';
    opSel.addEventListener('change', () => { S.filters[i].operator = opSel.value; renderFilterList(container, cols); });

    row.append(colSel, opSel);

    if (!noVal) {
      const valIn = document.createElement('input');
      valIn.type = colType === 'date' ? 'date' : 'text';
      valIn.value = f.value;
      valIn.placeholder = 'value…';
      valIn.className = 'input-field';
      valIn.style.cssText = 'margin-top:0;padding:5px 8px;font-size:0.77rem;';
      valIn.addEventListener('input', () => { S.filters[i].value = valIn.value; });
      row.append(valIn);
    }

    const rm = document.createElement('button');
    rm.textContent = 'Remove';
    rm.style.cssText = 'grid-column:1/-1;background:none;border:none;font-size:0.71rem;color:var(--red);cursor:pointer;text-align:left;padding:0;font-family:inherit;';
    rm.addEventListener('click', () => { S.filters.splice(i, 1); renderFilterList(container, cols); });
    row.append(rm);
    container.append(row);
  });
}

function renderAggList(container, cols) {
  container.innerHTML = '';
  S.aggregates.forEach((a, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:4px;align-items:center;margin-bottom:5px;';

    const fnSel = mkSel(AGG_FUNCS.map(f => ({ value: f, label: f })), a.function);
    fnSel.style.cssText = 'margin-top:0;padding:4px 6px;font-size:0.77rem;width:70px;flex-shrink:0;';
    fnSel.addEventListener('change', () => { S.aggregates[i].function = fnSel.value; });

    const colSel = mkSel(cols.map(c => ({ value: c.key, label: c.label })), a.column);
    colSel.style.cssText = 'margin-top:0;padding:4px 6px;font-size:0.77rem;flex:1;';
    colSel.addEventListener('change', () => { S.aggregates[i].column = colSel.value; });

    const rm = document.createElement('button');
    rm.textContent = '×';
    rm.style.cssText = 'background:none;border:none;color:var(--red);cursor:pointer;font-size:1.1rem;line-height:1;padding:0 2px;';
    rm.addEventListener('click', () => { S.aggregates.splice(i, 1); renderAggList(container, cols); });

    row.append(fnSel, colSel, rm);
    container.append(row);
  });
}

function savedPanel() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:12px 16px;flex:1;';
  const h = document.createElement('div');
  h.style.cssText = 'font-size:0.68rem;letter-spacing:.1em;text-transform:uppercase;font-family:"JetBrains Mono",monospace;color:var(--text-dim);font-weight:600;margin-bottom:8px;';
  h.textContent = 'Saved Reports';
  wrap.append(h);

  if (!S.savedReports.length) {
    const em = document.createElement('p');
    em.className = 'page-desc';
    em.style.fontStyle = 'italic';
    em.textContent = 'No saved reports yet.';
    wrap.append(em);
    return wrap;
  }

  S.savedReports.forEach(r => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--border);';

    const name = document.createElement('button');
    name.style.cssText = 'flex:1;background:none;border:none;text-align:left;font-size:0.81rem;color:var(--green);cursor:pointer;font-family:inherit;padding:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    name.textContent = r.name;
    name.title = r.description ?? '';
    name.addEventListener('click', () => loadSaved(r));

    const del = document.createElement('button');
    del.textContent = '×';
    del.style.cssText = 'background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:1rem;padding:0 2px;flex-shrink:0;';
    del.addEventListener('click', () => deleteSaved(r.id));

    row.append(name, del);
    wrap.append(row);
  });
  return wrap;
}

/* ── main results area ───────────────────────────────────────────────────── */

function renderMain(main) {
  main.innerHTML = '';

  if (!S.entity) {
    main.innerHTML = `
      <div class="empty-state" style="padding-top:80px;">
        <div class="empty-icon">📊</div>
        <h3>Pick a table to get started</h3>
        <p>Select a table from the left panel, configure filters and columns, then run your query.</p>
      </div>`;
    return;
  }

  if (S.loading) {
    main.innerHTML = `<div style="padding:20px;"><div class="skeleton skeleton-title" style="width:180px;"></div><div class="skeleton skeleton-card" style="margin-top:12px;height:240px;"></div></div>`;
    return;
  }

  if (!S.result) {
    main.innerHTML = `
      <div class="empty-state" style="padding-top:80px;">
        <div class="empty-icon">▶</div>
        <h3>Ready to run</h3>
        <p>Configure your query and click <strong>Run Report</strong>.</p>
      </div>`;
    return;
  }

  const { columns, rows, totalRows, page, pageSize, totalPages } = S.result;

  // Meta bar
  const meta = document.createElement('div');
  meta.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
  meta.innerHTML = `
    <span class="page-desc"><strong style="color:var(--text);">${totalRows.toLocaleString()}</strong> row${totalRows !== 1 ? 's' : ''} · page ${page} of ${totalPages}</span>`;
  main.append(meta);

  if (!rows.length) {
    const em = document.createElement('div');
    em.className = 'empty-state';
    em.innerHTML = `<div class="empty-icon">🔎</div><h3>No results</h3><p>No rows matched your query. Try adjusting your filters.</p>`;
    main.append(em);
    return;
  }

  // Table
  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'overflow-x:auto;border:1px solid var(--border);border-radius:10px;';
  const table = document.createElement('table');
  table.className = 'data-table';
  table.style.width = '100%';

  const thead = document.createElement('thead');
  const hrow  = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.style.cssText = 'white-space:nowrap;cursor:pointer;user-select:none;';
    const isActive = S.orderBy === col.key;
    th.innerHTML = `${escapeHtml(col.label)}${isActive ? (S.orderDesc ? ' <span style="color:var(--green);">▼</span>' : ' <span style="color:var(--green);">▲</span>') : ' <span style="opacity:.3;">↕</span>'}`;
    th.addEventListener('click', () => {
      if (S.orderBy === col.key) S.orderDesc = !S.orderDesc;
      else { S.orderBy = col.key; S.orderDesc = false; }
      runReport();
    });
    hrow.append(th);
  });
  thead.append(hrow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const td = document.createElement('td');
      td.style.cssText = 'white-space:nowrap;max-width:240px;overflow:hidden;text-overflow:ellipsis;';
      const raw = row[col.key];
      td.textContent = formatCell(raw, col.type);
      td.title = raw != null ? String(raw) : '';
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  tableWrap.append(table);
  main.append(tableWrap);

  // Pagination
  if (totalPages > 1) {
    const pg = document.createElement('div');
    pg.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:14px;';

    const prev = document.createElement('button');
    prev.className = 'btn-outline';
    prev.textContent = '← Prev';
    prev.disabled = page <= 1;
    prev.style.padding = '5px 12px';
    prev.addEventListener('click', () => { S.page--; runReport(); });

    const info = document.createElement('span');
    info.className = 'page-desc';
    info.style.cssText = 'flex:1;text-align:center;';
    info.textContent = `Page ${page} / ${totalPages}`;

    const next = document.createElement('button');
    next.className = 'btn-outline';
    next.textContent = 'Next →';
    next.disabled = page >= totalPages;
    next.style.padding = '5px 12px';
    next.addEventListener('click', () => { S.page++; runReport(); });

    pg.append(prev, info, next);
    main.append(pg);
  }
}

function formatCell(v, type) {
  if (v == null) return '';
  if (type === 'bool') return (v === true || v === 'true') ? 'Yes' : 'No';
  if (type === 'date' && typeof v === 'string') {
    const d = new Date(v);
    if (isNaN(d)) return v;
    // ISO strings with a time part are UTC — toLocaleString converts to local automatically
    return v.includes('T')
      ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : d.toLocaleDateString();
  }
  if (type === 'number' && typeof v === 'number') return v.toLocaleString();
  return String(v);
}

/* ── actions ─────────────────────────────────────────────────────────────── */

async function runReport() {
  if (!S.entity) { showToast('Pick a table first.', 'warning'); return; }
  S.loading = true; S.result = null;
  renderMain(document.getElementById('cr-main'));
  try {
    const res = await customReportsApi.run(buildDef());
    S.result = res.data;
  } catch (e) {
    showToast(e.message ?? 'Query failed', 'error');
  } finally {
    S.loading = false;
    renderMain(document.getElementById('cr-main'));
  }
}

function exportCsv() {
  if (!S.entity) { showToast('Pick a table first.', 'warning'); return; }
  const token  = getAccessToken();
  const tenant = getUser()?.tenantSlug ?? '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  if (tenant) headers['X-Tenant-ID'] = tenant;
  fetch('/api/v1/custom-reports/export', { method: 'POST', headers, body: JSON.stringify(buildDef()) })
    .then(async r => {
      if (!r.ok) throw new Error('Export failed');
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: `pestlook-report-${new Date().toLocaleDateString('en-CA')}.csv` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    })
    .catch(e => showToast(e.message, 'error'));
}

const JSPDF_CDNS = [
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];
const AUTOTABLE_CDNS = [
  'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js',
  'https://unpkg.com/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
];

function loadScriptWithFallback(cdns) {
  return new Promise((resolve, reject) => {
    const tryLoad = (idx) => {
      if (idx >= cdns.length) { reject(new Error('PDF library unavailable — check your connection and try again.')); return; }
      if (document.querySelector(`script[src="${cdns[idx]}"]`)) { resolve(); return; }
      const s = Object.assign(document.createElement('script'), { src: cdns[idx] });
      s.onload = resolve;
      s.onerror = () => { s.remove(); tryLoad(idx + 1); };
      document.head.appendChild(s);
    };
    tryLoad(0);
  });
}

async function exportPdf() {
  if (!S.entity) { showToast('Pick a table first.', 'warning'); return; }
  showToast('Building PDF…', 'info');
  try {
    const res = await customReportsApi.run({ ...buildDef(), page: 1, pageSize: 0 });
    if (!res.success) throw new Error(res.message ?? 'Export failed');
    const { columns, rows } = res.data;

    await loadScriptWithFallback(JSPDF_CDNS);
    await loadScriptWithFallback(AUTOTABLE_CDNS);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait' });
    const entityLabel = S.schema[S.entity]?.label ?? S.entity;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`PestLook — ${entityLabel}`, 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${rows.length.toLocaleString()} rows  ·  Generated ${new Date().toLocaleString()}`, 14, 23);

    doc.autoTable({
      head: [columns.map(c => c.label)],
      body: rows.map(row => columns.map(col => {
        const v = row[col.key];
        if (v == null) return '';
        if (col.type === 'bool') return v ? 'Yes' : 'No';
        if (col.type === 'date' && typeof v === 'string' && v.includes('T'))
          return new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
        if (col.type === 'date' && typeof v === 'string')
          return new Date(v).toLocaleDateString();
        return String(v);
      })),
      startY: 28,
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [43, 110, 79], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 247, 240] },
      margin: { left: 14, right: 14 },
    });

    doc.save(`pestlook-report-${new Date().toLocaleDateString('en-CA')}.pdf`);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function promptSave() {
  if (!S.entity) { showToast('Nothing to save — pick a table first.', 'warning'); return; }
  const existing = S.savedReports.find(r => r.id === S.editingId);
  const name = window.prompt('Report name:', existing?.name ?? '');
  if (!name?.trim()) return;
  const description = window.prompt('Description (optional):') ?? undefined;
  const req = { name: name.trim(), description: description?.trim() || undefined, definition: buildDef() };
  try {
    if (S.editingId) {
      await customReportsApi.updateSaved(S.editingId, req);
      showToast('Report updated.', 'success');
    } else {
      const res  = await customReportsApi.createSaved(req);
      S.editingId = res.data?.id;
      showToast('Report saved.', 'success');
    }
    S.savedReports = (await customReportsApi.getSaved()).data ?? [];
    renderSidebar(document.getElementById('cr-sidebar'));
  } catch (e) { showToast(e.message, 'error'); }
}

function loadSaved(report) {
  const def = report.definition;
  Object.assign(S, {
    entity: def.entity ?? '', columns: def.columns ?? [],
    filters: (def.filters ?? []).map(f => ({ ...f })),
    groupBy: def.groupByColumns ?? [],
    aggregates: (def.aggregates ?? []).map(a => ({ ...a })),
    orderBy: def.orderByColumn ?? '', orderDesc: def.orderDesc ?? false,
    page: 1, pageSize: def.pageSize ?? 50, result: null, editingId: report.id,
  });
  renderSidebar(document.getElementById('cr-sidebar'));
  renderMain(document.getElementById('cr-main'));
}

async function deleteSaved(id) {
  if (!window.confirm('Delete this saved report?')) return;
  try {
    await customReportsApi.deleteSaved(id);
    S.savedReports = S.savedReports.filter(r => r.id !== id);
    if (S.editingId === id) S.editingId = null;
    renderSidebar(document.getElementById('cr-sidebar'));
    showToast('Report deleted.', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

function buildDef() {
  return {
    entity: S.entity, columns: S.columns,
    filters: S.filters.filter(f => f.column),
    groupByColumns: S.groupBy,
    aggregates: S.aggregates.filter(a => a.column && a.function),
    orderByColumn: S.orderBy || null, orderDesc: S.orderDesc,
    page: S.page, pageSize: S.pageSize,
  };
}
