import { escapeHtml } from '../../utils/helpers.js';

export function drawBoundaries(map, { farms = [], fields = [] } = {}) {
  const L = window.L;
  if (!L) return;

  for (const f of farms) {
    if (!f.boundaryGeoJson) continue;
    try {
      const geo = typeof f.boundaryGeoJson === 'string' ? JSON.parse(f.boundaryGeoJson) : f.boundaryGeoJson;
      L.geoJSON(geo, {
        style: { color: f.boundaryColor || '#3aad5a', weight: 2, fillOpacity: 0.06 },
      }).bindTooltip(escapeHtml(f.name), { permanent: false, className: 'leaflet-label' }).addTo(map);
    } catch { /* skip bad GeoJSON */ }
  }

  for (const f of fields) {
    if (!f.geoBoundary) continue;
    try {
      const geo = typeof f.geoBoundary === 'string' ? JSON.parse(f.geoBoundary) : f.geoBoundary;
      L.geoJSON(geo, {
        style: { color: f.boundaryColor || '#f0b840', weight: 1.8, fillOpacity: 0.1 },
      }).bindTooltip(escapeHtml(f.name), { permanent: false, className: 'leaflet-label' }).addTo(map);
    } catch { /* skip bad GeoJSON */ }
  }
}
