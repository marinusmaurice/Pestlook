/**
 * boundary-map.js
 *
 * Full-screen Leaflet overlay for drawing / editing a single polygon boundary.
 * Custom drawing engine — no third-party drawing plugins required.
 *
 * Modes:
 *   draw   – click to place vertices, double-click to close the polygon
 *   edit   – drag vertex markers to reshape; click a vertex to delete it
 *
 * Usage:
 *   openBoundaryMap({
 *     title:              'Draw Field Boundary',
 *     existingGeoJson:    field.geoBoundary || null,   // GeoJSON Polygon string
 *     centerLat:          farm.latitude,
 *     centerLng:          farm.longitude,
 *     backgroundLayers:   [{ name, geoJson, color }],  // read-only context polygons
 *     onConfirm:          ({ geoJson, areaHectares }) => { ... },
 *   });
 */

let _overlay    = null;
let _map        = null;

// ── drawing state ─────────────────────────────────────────────────────────────
let _mode           = 'idle';   // 'idle' | 'drawing' | 'editing'
let _vertices       = [];       // Array of L.LatLng for the in-progress or finished polygon
let _previewMarkers = [];       // vertex handle markers shown during draw / edit
let _polygon        = null;     // L.Polygon currently rendered
let _previewLine    = null;     // L.Polyline rubber-band line while drawing
let _cursorMarker   = null;     // follows mouse while drawing

const DEFAULT_CENTER = [-28.5, 24.5];
const DEFAULT_ZOOM   = 5;

const POLY_STYLE   = { color: '#3aad5a', weight: 2.5, fillOpacity: 0.2, fillColor: '#3aad5a' };
const VERTEX_STYLE = {
  radius: 7, color: '#3aad5a', weight: 2,
  fillColor: '#fff', fillOpacity: 1,
};
const MIDPOINT_STYLE = {
  radius: 5, color: '#3aad5a', weight: 1.5,
  fillColor: '#3aad5a', fillOpacity: 0.5,
  className: 'bm-midpoint',
};

export function openBoundaryMap({
  title            = 'Draw Boundary',
  existingGeoJson  = null,
  centerLat        = null,
  centerLng        = null,
  backgroundLayers = [],
  onConfirm        = () => {},
} = {}) {
  _destroyOverlay();

  _overlay = document.createElement('div');
  _overlay.id = 'boundary-map-overlay';
  _overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;
    display:flex;flex-direction:column;
    background:var(--bg,#0f1510);
  `;

  _overlay.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:12px 16px;background:var(--surface,#1a211c);
                border-bottom:1px solid var(--border,#2c3830);flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:1.1rem;">🗺</span>
        <div>
          <div style="font-weight:600;color:var(--text,#e8f0eb);font-size:0.9rem;">${title}</div>
          <div id="bm-area-label"
               style="font-size:0.72rem;color:var(--text-dim,#7a9480);margin-top:1px;">
            Click on the map to start drawing, double-click to finish
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button id="bm-draw-btn"
                style="background:rgba(58,173,90,0.12);border:1px solid rgba(58,173,90,0.4);
                       border-radius:7px;padding:5px 11px;color:var(--green,#3aad5a);
                       font-size:0.75rem;cursor:pointer;font-family:inherit;">
          ✏ Draw
        </button>
        <button id="bm-edit-btn"
                style="background:var(--surface2,#222d24);border:1px solid var(--border,#2c3830);
                       border-radius:7px;padding:5px 11px;color:var(--text-mid,#a8bfac);
                       font-size:0.75rem;cursor:pointer;font-family:inherit;" disabled>
          ⬡ Edit
        </button>
        <button id="bm-clear"
                style="background:rgba(224,96,96,0.08);border:1px solid rgba(224,96,96,0.2);
                       border-radius:7px;padding:5px 11px;color:var(--red,#e06060);
                       font-size:0.75rem;cursor:pointer;font-family:inherit;">
          🗑 Clear
        </button>
        <button id="bm-cancel"
                style="background:var(--surface2,#222d24);border:1px solid var(--border,#2c3830);
                       border-radius:7px;padding:6px 14px;color:var(--text-mid,#a8bfac);
                       font-size:0.78rem;cursor:pointer;font-family:inherit;">
          Cancel
        </button>
        <button id="bm-confirm"
                style="background:var(--green,#3aad5a);border:none;border-radius:7px;
                       padding:6px 18px;color:#fff;font-size:0.78rem;font-weight:600;
                       cursor:pointer;font-family:inherit;">
          ✓ Confirm Boundary
        </button>
      </div>
    </div>
    <div id="bm-map" style="flex:1;"></div>
  `;

  document.body.appendChild(_overlay);

  requestAnimationFrame(() => _initMap({
    existingGeoJson, centerLat, centerLng, backgroundLayers, onConfirm,
  }));
}

// ── private ───────────────────────────────────────────────────────────────────

function _initMap({ existingGeoJson, centerLat, centerLng, backgroundLayers, onConfirm }) {
  const L = window.L;
  if (!L) {
    alert('Leaflet is not loaded yet. Please try again in a moment.');
    _destroyOverlay();
    return;
  }

  const osmLayer = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '© OpenStreetMap contributors', maxZoom: 22 },
  );

  const center = (centerLat && centerLng) ? [centerLat, centerLng] : DEFAULT_CENTER;

  _map = L.map('bm-map', {
    center,
    zoom: (centerLat && centerLng) ? 14 : DEFAULT_ZOOM,
    layers: [osmLayer],
    zoomControl: true,
    doubleClickZoom: false,  // we use dblclick to close polygons
  });

  // ── background (read-only) layers ─────────────────────────────────────────
  for (const bg of backgroundLayers) {
    if (!bg.geoJson) continue;
    try {
      L.geoJSON(JSON.parse(bg.geoJson), {
        style: { color: bg.color || '#6aaf7a', weight: 2, fillOpacity: 0.15, dashArray: '5 4' },
      })
        .bindTooltip(bg.name || '', { permanent: false, direction: 'center' })
        .addTo(_map);
    } catch { /* skip invalid */ }
  }

  // ── load existing boundary ─────────────────────────────────────────────────
  if (existingGeoJson) {
    try {
      const parsed = JSON.parse(existingGeoJson);
      // GeoJSON Polygon coords are [lng, lat]; Leaflet wants [lat, lng]
      const ring = parsed.coordinates[0];
      _vertices = ring.slice(0, -1).map(([lng, lat]) => L.latLng(lat, lng));
      _renderPolygon(L);
      _map.fitBounds(_polygon.getBounds(), { padding: [40, 40] });
      _setMode('editing', L);
    } catch { /* ignore */ }
  } else {
    _setMode('drawing', L);
  }

  _updateAreaLabel();

  // ── toolbar ────────────────────────────────────────────────────────────────
  document.getElementById('bm-draw-btn').addEventListener('click', () => _setMode('drawing', L));
  document.getElementById('bm-edit-btn').addEventListener('click', () => _setMode('editing', L));

  document.getElementById('bm-clear').addEventListener('click', () => {
    if (!confirm('Clear the drawn boundary?')) return;
    _clearDrawing(L);
    _setMode('drawing', L);
    _updateAreaLabel();
  });

  document.getElementById('bm-cancel').addEventListener('click', _destroyOverlay);

  document.getElementById('bm-confirm').addEventListener('click', () => {
    if (_vertices.length < 3) {
      alert('Please draw a boundary polygon first (at least 3 points).');
      return;
    }
    const geoJson      = _verticesToGeoJson();
    const areaHectares = _computeHa(L, _vertices);
    _destroyOverlay();
    onConfirm({ geoJson, areaHectares });
  });
}

// ── mode management ───────────────────────────────────────────────────────────

function _setMode(mode, L) {
  _mode = mode;
  _unbindMapEvents();
  _clearPreviewMarkers();
  if (_previewLine) { _map.removeLayer(_previewLine); _previewLine = null; }
  if (_cursorMarker) { _map.removeLayer(_cursorMarker); _cursorMarker = null; }

  const drawBtn = document.getElementById('bm-draw-btn');
  const editBtn = document.getElementById('bm-edit-btn');
  const mapEl   = document.getElementById('bm-map');

  if (mode === 'drawing') {
    _vertices = [];
    _clearDrawing(L);
    mapEl.style.cursor = 'crosshair';
    if (drawBtn) { drawBtn.style.background = 'rgba(58,173,90,0.12)'; drawBtn.style.borderColor = 'rgba(58,173,90,0.4)'; drawBtn.style.color = 'var(--green,#3aad5a)'; }
    if (editBtn) { editBtn.disabled = true; editBtn.style.opacity = '0.4'; }
    _bindDrawEvents(L);
    _updateAreaLabel('Click to place points — double-click to finish');
  } else if (mode === 'editing') {
    mapEl.style.cursor = '';
    if (drawBtn) { drawBtn.style.background = 'var(--surface2,#222d24)'; drawBtn.style.borderColor = 'var(--border,#2c3830)'; drawBtn.style.color = 'var(--text-mid,#a8bfac)'; }
    if (editBtn) { editBtn.disabled = false; editBtn.style.opacity = '1'; editBtn.style.background = 'rgba(58,173,90,0.12)'; editBtn.style.borderColor = 'rgba(58,173,90,0.4)'; editBtn.style.color = 'var(--green,#3aad5a)'; }
    _renderEditHandles(L);
    _updateAreaLabel();
  }
}

// ── draw mode ─────────────────────────────────────────────────────────────────

let _mapClickHandler    = null;
let _mapDblClickHandler = null;
let _mapMoveHandler     = null;

function _bindDrawEvents(L) {
  _mapMoveHandler = (e) => {
    if (_vertices.length === 0) return;
    const pts = [..._vertices, e.latlng];
    if (_previewLine) {
      _previewLine.setLatLngs(pts);
    } else {
      _previewLine = L.polyline(pts, { color: '#3aad5a', weight: 2, dashArray: '6 4' }).addTo(_map);
    }
    if (_cursorMarker) {
      _cursorMarker.setLatLng(e.latlng);
    } else {
      _cursorMarker = L.circleMarker(e.latlng, { ...VERTEX_STYLE, radius: 5, color: '#3aad5a' }).addTo(_map);
    }
  };

  _mapClickHandler = (e) => {
    // Ignore if the click came from a marker (handled by marker itself)
    if (e.originalEvent._bmMarkerClick) return;
    _vertices.push(e.latlng);
    _addDrawVertex(L, _vertices.length - 1);
    if (_vertices.length >= 2) _renderPolygon(L);
    _updateAreaLabel();
  };

  _mapDblClickHandler = () => {
    if (_vertices.length < 3) return;
    if (_previewLine) { _map.removeLayer(_previewLine); _previewLine = null; }
    if (_cursorMarker) { _map.removeLayer(_cursorMarker); _cursorMarker = null; }
    _setMode('editing', L);
  };

  _map.on('click', _mapClickHandler);
  _map.on('dblclick', _mapDblClickHandler);
  _map.on('mousemove', _mapMoveHandler);
}

function _unbindMapEvents() {
  if (_mapClickHandler)    { _map.off('click', _mapClickHandler);       _mapClickHandler    = null; }
  if (_mapDblClickHandler) { _map.off('dblclick', _mapDblClickHandler); _mapDblClickHandler = null; }
  if (_mapMoveHandler)     { _map.off('mousemove', _mapMoveHandler);    _mapMoveHandler     = null; }
}

function _addDrawVertex(L, idx) {
  const m = L.circleMarker(_vertices[idx], { ...VERTEX_STYLE, interactive: true }).addTo(_map);
  m.on('click', (e) => {
    e.originalEvent._bmMarkerClick = true;
    // clicking the first vertex (with ≥3 points) closes the polygon
    if (idx === 0 && _vertices.length >= 3) {
      if (_previewLine) { _map.removeLayer(_previewLine); _previewLine = null; }
      if (_cursorMarker) { _map.removeLayer(_cursorMarker); _cursorMarker = null; }
      _setMode('editing', L);
    }
  });
  _previewMarkers.push(m);
}

// ── edit mode ─────────────────────────────────────────────────────────────────

function _renderEditHandles(L) {
  _clearPreviewMarkers();
  if (_vertices.length < 3) return;

  // Vertex handles
  _vertices.forEach((latlng, idx) => {
    const m = L.circleMarker(latlng, { ...VERTEX_STYLE, interactive: true, bubblingMouseEvents: false }).addTo(_map);

    m.on('mousedown', (e) => {
      L.DomEvent.stop(e);
      _map.dragging.disable();
      const onMove = (me) => {
        _vertices[idx] = me.latlng;
        m.setLatLng(me.latlng);
        _renderPolygon(L);
        _refreshMidpoints(L);
        _updateAreaLabel();
      };
      const onUp = () => {
        _map.dragging.enable();
        _map.off('mousemove', onMove);
        _map.off('mouseup', onUp);
      };
      _map.on('mousemove', onMove);
      _map.on('mouseup', onUp);
    });

    // Right-click or shift-click to delete vertex
    m.on('contextmenu', (e) => {
      L.DomEvent.stop(e);
      if (_vertices.length <= 3) return;
      _vertices.splice(idx, 1);
      _renderPolygon(L);
      _renderEditHandles(L);
      _updateAreaLabel();
    });

    _previewMarkers.push(m);
  });

  // Midpoint handles for inserting new vertices
  _refreshMidpoints(L);
}

function _refreshMidpoints(L) {
  // Remove old midpoint markers (they are appended after vertex markers)
  const vertexCount = _vertices.length;
  while (_previewMarkers.length > vertexCount) {
    const mp = _previewMarkers.pop();
    _map.removeLayer(mp);
  }

  _vertices.forEach((latlng, idx) => {
    const next = _vertices[(idx + 1) % _vertices.length];
    const mid  = L.latLng((latlng.lat + next.lat) / 2, (latlng.lng + next.lng) / 2);
    const mp   = L.circleMarker(mid, { ...MIDPOINT_STYLE, interactive: true }).addTo(_map);

    mp.on('click', (e) => {
      L.DomEvent.stop(e);
      _vertices.splice(idx + 1, 0, mid);
      _renderPolygon(L);
      _renderEditHandles(L);
      _updateAreaLabel();
    });

    _previewMarkers.push(mp);
  });
}

// ── shared helpers ────────────────────────────────────────────────────────────

function _renderPolygon(L) {
  if (_polygon) { _map.removeLayer(_polygon); _polygon = null; }
  if (_vertices.length < 2) return;
  _polygon = L.polygon(_vertices, POLY_STYLE).addTo(_map);
}

function _clearDrawing(L) {
  if (_polygon) { _map.removeLayer(_polygon); _polygon = null; }
  _clearPreviewMarkers();
  _vertices = [];
}

function _clearPreviewMarkers() {
  _previewMarkers.forEach(m => _map.removeLayer(m));
  _previewMarkers = [];
}

function _verticesToGeoJson() {
  const coords = _vertices.map(ll => [ll.lng, ll.lat]);
  coords.push(coords[0]); // close ring
  return JSON.stringify({ type: 'Polygon', coordinates: [coords] });
}

function _updateAreaLabel(hint) {
  const el = document.getElementById('bm-area-label');
  if (!el) return;
  if (hint) { el.textContent = hint; return; }
  if (_vertices.length < 3) {
    el.textContent = 'Click on the map to start drawing, double-click to finish';
    return;
  }
  const L  = window.L;
  const ha = _computeHa(L, _vertices);
  el.innerHTML = `<span style="color:var(--green,#3aad5a);font-weight:600;">${ha.toFixed(2)} ha</span> — drag vertices to reshape, right-click a vertex to delete`;
}

function _computeHa(L, vertices) {
  if (vertices.length < 3) return 0;
  const R = 6371008.8;
  const toRad = d => d * Math.PI / 180;
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = toRad(vertices[i].lng);
    const yi = toRad(vertices[i].lat);
    const xj = toRad(vertices[j].lng);
    const yj = toRad(vertices[j].lat);
    area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
  }
  return Math.abs(area * R * R / 2) / 10_000;
}

function _destroyOverlay() {
  _unbindMapEvents();
  _mode = 'idle';
  _vertices = [];
  _previewMarkers = [];
  _polygon = null;
  _previewLine = null;
  _cursorMarker = null;
  if (_map) { _map.remove(); _map = null; }
  _overlay?.remove();
  _overlay = null;
}

// ── Inline (embedded) boundary map ───────────────────────────────────────────
/**
 * Mount a Leaflet map inside `containerEl` for drawing / editing a polygon.
 *
 * Returns a controller:
 *   {
 *     getGeoJson()     → string | null   current polygon as GeoJSON string
 *     getAreaHa()      → number          area in hectares (0 if no polygon)
 *     destroy()                          remove the map and free resources
 *     setCenter(lat,lng)                 re-centre the map
 *   }
 *
 * Usage:
 *   const bm = createInlineBoundaryMap(el, {
 *     existingGeoJson, centerLat, centerLng, backgroundLayers,
 *   });
 *   // later:
 *   const geoJson = bm.getGeoJson();
 */
export function createInlineBoundaryMap(containerEl, {
  existingGeoJson  = null,
  centerLat        = null,
  centerLng        = null,
  backgroundLayers = [],
} = {}) {
  const L = window.L;
  if (!L) { containerEl.textContent = 'Leaflet not loaded.'; return null; }

  // ── isolated state ────────────────────────────────────────────────────────
  let iMode           = 'idle';
  let iVertices       = [];
  let iPreviewMarkers = [];
  let iPolygon        = null;
  let iPreviewLine    = null;
  let iCursorMarker   = null;
  let iClickH = null, iDblH = null, iMoveH = null;

  let iFinishing  = false; // guard: ignore the click that fires alongside dblclick

  // ── build toolbar HTML inside container ───────────────────────────────────
  containerEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:7px 10px;background:var(--surface2,#222d24);
                border-bottom:1px solid var(--border,#2c3830);border-radius:8px 8px 0 0;flex-shrink:0;">
      <div id="ibm-area-label" style="font-size:0.72rem;color:var(--text-dim,#7a9480);">
        Click on the map to start drawing, double-click to finish
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <button id="ibm-draw-btn"     class="ibm-btn ibm-btn-active">✏ Draw</button>
        <button id="ibm-edit-btn"     class="ibm-btn" disabled>⬡ Edit</button>
        <button id="ibm-clear"        class="ibm-btn ibm-btn-danger">🗑 Clear</button>
      </div>
    </div>
    <div id="ibm-map" style="flex:1;min-height:0;border-radius:0 0 8px 8px;"></div>
  `;

  // ── helpers that close over isolated state ────────────────────────────────
  function updateAreaLabel(hint) {
    const el = containerEl.querySelector('#ibm-area-label');
    if (!el) return;
    if (hint) { el.textContent = hint; return; }
    if (iVertices.length < 3) {
      el.textContent = 'Click to place points — double-click to finish';
      return;
    }
    const ha = computeHa(iVertices);
    el.innerHTML = `<span style="color:var(--green,#3aad5a);font-weight:600;">${ha.toFixed(2)} ha</span> — drag vertices to reshape, right-click a vertex to delete`;
  }

  function computeHa(verts) {
    if (verts.length < 3) return 0;
    // Spherical excess (WGS-84 mean radius) — no plugin required
    const R = 6371008.8; // metres
    const toRad = d => d * Math.PI / 180;
    let area = 0;
    const n = verts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const xi = toRad(verts[i].lng);
      const yi = toRad(verts[i].lat);
      const xj = toRad(verts[j].lng);
      const yj = toRad(verts[j].lat);
      area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
    }
    return Math.abs(area * R * R / 2) / 10_000;
  }

  function renderPolygon() {
    if (iPolygon) { map.removeLayer(iPolygon); iPolygon = null; }
    if (iVertices.length < 2) return;
    iPolygon = L.polygon(iVertices, POLY_STYLE).addTo(map);
  }

  function clearPreviewMarkers() {
    iPreviewMarkers.forEach(m => map.removeLayer(m));
    iPreviewMarkers = [];
  }

  function clearDrawing() {
    if (iPolygon) { map.removeLayer(iPolygon); iPolygon = null; }
    clearPreviewMarkers();
    iVertices = [];
  }

  function unbindMapEvents() {
    if (iClickH)  { map.off('click', iClickH);      iClickH  = null; }
    if (iDblH)    { map.off('dblclick', iDblH);     iDblH    = null; }
    if (iMoveH)   { map.off('mousemove', iMoveH);   iMoveH   = null; }
  }

  function refreshMidpoints() {
    const vc = iVertices.length;
    while (iPreviewMarkers.length > vc) {
      map.removeLayer(iPreviewMarkers.pop());
    }
    iVertices.forEach((latlng, idx) => {
      const next = iVertices[(idx + 1) % iVertices.length];
      const mid  = L.latLng((latlng.lat + next.lat) / 2, (latlng.lng + next.lng) / 2);
      const mp   = L.circleMarker(mid, { ...MIDPOINT_STYLE, interactive: true }).addTo(map);
      mp.on('click', (e) => {
        L.DomEvent.stop(e);
        iVertices.splice(idx + 1, 0, mid);
        renderPolygon();
        renderEditHandles();
        updateAreaLabel();
      });
      iPreviewMarkers.push(mp);
    });
  }

  function renderEditHandles() {
    clearPreviewMarkers();
    if (iVertices.length < 3) return;
    iVertices.forEach((latlng, idx) => {
      const m = L.circleMarker(latlng, { ...VERTEX_STYLE, interactive: true, bubblingMouseEvents: false }).addTo(map);
      m.on('mousedown', (e) => {
        L.DomEvent.stop(e);
        map.dragging.disable();
        const onMove = (me) => {
          iVertices[idx] = me.latlng;
          m.setLatLng(me.latlng);
          renderPolygon();
          refreshMidpoints();
          updateAreaLabel();
        };
        const onUp = () => {
          map.dragging.enable();
          map.off('mousemove', onMove);
          map.off('mouseup', onUp);
        };
        map.on('mousemove', onMove);
        map.on('mouseup', onUp);
      });
      m.on('contextmenu', (e) => {
        L.DomEvent.stop(e);
        if (iVertices.length <= 3) return;
        iVertices.splice(idx, 1);
        renderPolygon();
        renderEditHandles();
        updateAreaLabel();
      });
      iPreviewMarkers.push(m);
    });
    refreshMidpoints();
  }

  function setMode(mode) {
    iMode = mode;
    unbindMapEvents();
    clearPreviewMarkers();
    if (iPreviewLine)   { map.removeLayer(iPreviewLine);   iPreviewLine   = null; }
    if (iCursorMarker)  { map.removeLayer(iCursorMarker);  iCursorMarker  = null; }

    const drawBtn = containerEl.querySelector('#ibm-draw-btn');
    const editBtn = containerEl.querySelector('#ibm-edit-btn');
    const mapEl   = containerEl.querySelector('#ibm-map');

    // use CSS class toggling so ibm-btn-active styles apply (no inline overrides)
    if (drawBtn) { drawBtn.style.cssText = ''; drawBtn.classList.remove('ibm-btn-active'); }
    if (editBtn) { editBtn.style.cssText = ''; editBtn.classList.remove('ibm-btn-active'); editBtn.disabled = false; editBtn.style.opacity = '1'; }

    if (mode === 'drawing') {
      iVertices = [];
      clearDrawing();
      if (mapEl) mapEl.style.cursor = 'crosshair';
      if (drawBtn) drawBtn.classList.add('ibm-btn-active');
      if (editBtn) { editBtn.disabled = true; editBtn.style.opacity = '0.4'; }
      updateAreaLabel('Click to place points — double-click to finish');

      iMoveH = (e) => {
        if (iVertices.length === 0) return;
        const pts = [...iVertices, e.latlng];
        if (iPreviewLine) iPreviewLine.setLatLngs(pts);
        else iPreviewLine = L.polyline(pts, { color: '#3aad5a', weight: 2, dashArray: '6 4' }).addTo(map);
        if (iCursorMarker) iCursorMarker.setLatLng(e.latlng);
        else iCursorMarker = L.circleMarker(e.latlng, { ...VERTEX_STYLE, radius: 5 }).addTo(map);
      };
      iClickH = (e) => {
        if (e.originalEvent._ibmMarkerClick) return;
        if (iFinishing) return;
        iVertices.push(e.latlng);
        // add vertex handle
        const m = L.circleMarker(e.latlng, { ...VERTEX_STYLE, interactive: true }).addTo(map);
        const vidx = iVertices.length - 1;
        m.on('click', (ce) => {
          ce.originalEvent._ibmMarkerClick = true;
          if (vidx === 0 && iVertices.length >= 3) {
            if (iPreviewLine)  { map.removeLayer(iPreviewLine);  iPreviewLine  = null; }
            if (iCursorMarker) { map.removeLayer(iCursorMarker); iCursorMarker = null; }
            setMode('editing');
          }
        });
        iPreviewMarkers.push(m);
        if (iVertices.length >= 2) renderPolygon();
        updateAreaLabel();
      };
      iDblH = () => {
        if (iVertices.length < 3) return;
        iFinishing = true;
        if (iPreviewLine)  { map.removeLayer(iPreviewLine);  iPreviewLine  = null; }
        if (iCursorMarker) { map.removeLayer(iCursorMarker); iCursorMarker = null; }
        // remove the last vertex added by the click that fires just before dblclick
        iVertices.pop();
        setMode('editing');
        setTimeout(() => { iFinishing = false; }, 50);
      };
      map.on('click', iClickH);
      map.on('dblclick', iDblH);
      map.on('mousemove', iMoveH);

    } else if (mode === 'editing') {
      if (mapEl) mapEl.style.cursor = '';
      if (editBtn) editBtn.classList.add('ibm-btn-active');
      renderEditHandles();
      updateAreaLabel();
    }
  }

  // ── init map ──────────────────────────────────────────────────────────────
  const osmLayer = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '© OpenStreetMap contributors', maxZoom: 22 },
  );

  const center = (centerLat && centerLng) ? [centerLat, centerLng] : DEFAULT_CENTER;
  const map = L.map(containerEl.querySelector('#ibm-map'), {
    center,
    zoom: (centerLat && centerLng) ? 14 : DEFAULT_ZOOM,
    layers: [osmLayer],
    zoomControl: true,
    doubleClickZoom: false,
  });

  // prevent the map's default contextmenu from swallowing right-clicks on markers
  map.on('contextmenu', (e) => { L.DomEvent.stop(e); });

  for (const bg of backgroundLayers) {
    if (!bg.geoJson) continue;
    try {
      L.geoJSON(JSON.parse(bg.geoJson), {
        style: { color: bg.color || '#6aaf7a', weight: 2, fillOpacity: 0.15, dashArray: '5 4' },
      }).bindTooltip(bg.name || '', { permanent: false, direction: 'center' }).addTo(map);
    } catch { /* skip */ }
  }

  if (existingGeoJson) {
    try {
      const parsed = JSON.parse(existingGeoJson);
      const ring = parsed.coordinates[0];
      iVertices = ring.slice(0, -1).map(([lng, lat]) => L.latLng(lat, lng));
      renderPolygon();
      map.fitBounds(iPolygon.getBounds(), { padding: [40, 40] });
      setMode('editing');
    } catch { setMode('drawing'); }
  } else {
    setMode('drawing');
  }

  // toolbar events
  containerEl.querySelector('#ibm-draw-btn').addEventListener('click', () => setMode('drawing'));
  containerEl.querySelector('#ibm-edit-btn').addEventListener('click', () => setMode('editing'));
  containerEl.querySelector('#ibm-clear').addEventListener('click', () => {
    if (!confirm('Clear the drawn boundary?')) return;
    clearDrawing();
    setMode('drawing');
    updateAreaLabel();
  });

  // ── public controller ─────────────────────────────────────────────────────
  return {
    getGeoJson() {
      if (iVertices.length < 3) return null;
      const coords = iVertices.map(ll => [ll.lng, ll.lat]);
      coords.push(coords[0]);
      return JSON.stringify({ type: 'Polygon', coordinates: [coords] });
    },
    getAreaHa() {
      return computeHa(iVertices);
    },
    getCentroid() {
      if (iVertices.length < 3) return null;
      let lat = 0, lng = 0;
      for (const v of iVertices) { lat += v.lat; lng += v.lng; }
      return { lat: lat / iVertices.length, lng: lng / iVertices.length };
    },
    setCenter(lat, lng) {
      if (lat && lng) map.setView([lat, lng], 14);
    },
    invalidateSize() {
      map.invalidateSize();
    },
    destroy() {
      unbindMapEvents();
      map.remove();
      containerEl.innerHTML = '';
    },
  };
}
