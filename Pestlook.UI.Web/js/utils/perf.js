/**
 * perf.js — lightweight client-side performance tracker
 *
 * API call tracking:   automatically fed by client.js
 * Page load tracking:  wrap your page render with perfPageLoad(key, asyncFn)
 *
 * Inspect anytime in DevTools:  window.__perf.dump()
 */

const _entries = [];          // all recorded API calls
const _pageLoads = new Map(); // key → { start, end, calls[] }

let _activePage = null;

// ── API call recording ────────────────────────────────────────────────────────

/**
 * Called by client.js after every fetch completes.
 * @param {{ url: string, method: string, status: number,
 *           clientStart: number, clientEnd: number,
 *           serverMs: number|null, requestId: string|null }} entry
 */
export function recordApiCall(entry) {
  const record = {
    ...entry,
    clientMs: Math.round(entry.clientEnd - entry.clientStart),
    overhead: entry.serverMs != null
      ? Math.round((entry.clientEnd - entry.clientStart) - entry.serverMs)
      : null,
    ts: new Date().toISOString(),
  };
  _entries.push(record);

  if (_activePage) {
    const page = _pageLoads.get(_activePage);
    if (page && !page.end) page.calls.push(record);
  }

  return record;
}

// ── Page load tracking ────────────────────────────────────────────────────────

/**
 * Mark the start of a page load.  Call at the top of your render function.
 * @param {string} pageKey  e.g. 'intelligence', 'reports'
 */
export function perfStart(pageKey) {
  _activePage = pageKey;
  _pageLoads.set(pageKey, { key: pageKey, start: performance.now(), end: null, calls: [] });
}

/**
 * Mark the end of a page load.  Call after all DOM mutations are done.
 * Prints a summary to the debug console.
 * @param {string} pageKey
 */
export function perfEnd(pageKey) {
  const page = _pageLoads.get(pageKey);
  if (!page) return;
  page.end = performance.now();
  if (_activePage === pageKey) _activePage = null;
  _printPageSummary(page);
}

/**
 * Convenience wrapper — automatically calls perfStart / perfEnd around
 * an async render function and returns its result.
 *
 * Usage:
 *   export async function renderMyPage(container) {
 *     return perfPageLoad('my-page', async () => {
 *       // ... all your fetch + render logic ...
 *     });
 *   }
 */
export async function perfPageLoad(pageKey, asyncFn) {
  perfStart(pageKey);
  try {
    return await asyncFn();
  } finally {
    perfEnd(pageKey);
  }
}

// ── Console reporting ─────────────────────────────────────────────────────────

function _printPageSummary(page) {
  const total = Math.round(page.end - page.start);
  const calls = page.calls;
  const slowest = calls.length
    ? calls.reduce((a, b) => (a.clientMs > b.clientMs ? a : b))
    : null;

  const rows = calls.map(c => ({
    url:       c.url.replace('/api/v1', ''),
    method:    c.method,
    status:    c.status,
    'client ms': c.clientMs,
    'server ms': c.serverMs ?? '—',
    'overhead ms': c.overhead ?? '—',
    requestId: c.requestId ?? '—',
  }));

  System.Diagnostics?.Debug?.WriteLine?.(`[perf] ${page.key} — total: ${total}ms | api calls: ${calls.length}`);
  console.debug(
    `%c⏱ ${page.key}%c  total load: ${total} ms  |  api calls: ${calls.length}` +
    (slowest ? `  |  slowest: ${slowest.url} (${slowest.clientMs} ms)` : ''),
    'color:#4a9eff;font-weight:700;',
    'color:inherit;'
  );
  if (rows.length) console.table(rows);
}

// ── Public dump helper ────────────────────────────────────────────────────────

export function dump() {
  console.group('%c📊 Pestlook perf log', 'color:#4a9eff;font-weight:700;font-size:1.1em;');

  console.group('API calls');
  const apiRows = _entries.map(e => ({
    url:           e.url.replace('/api/v1', ''),
    method:        e.method,
    status:        e.status,
    'client ms':   e.clientMs,
    'server ms':   e.serverMs ?? '—',
    'overhead ms': e.overhead ?? '—',
    ts:            e.ts,
  }));
  if (apiRows.length) console.table(apiRows); else console.log('(none)');
  console.groupEnd();

  console.group('Page loads');
  for (const [key, page] of _pageLoads) {
    if (!page.end) { console.log(`${key}: still loading…`); continue; }
    const total = Math.round(page.end - page.start);
    console.log(`${key}: ${total} ms  (${page.calls.length} api calls)`);
  }
  console.groupEnd();

  console.groupEnd();
}

// Expose on window so it's callable from DevTools at any time
if (typeof window !== 'undefined') {
  window.__perf = { dump, entries: _entries, pageLoads: _pageLoads };
}
