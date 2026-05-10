import { get } from './client.js';

function buildParams(filters = {}) {
  const p = new URLSearchParams();
  if (filters.from)    p.set('from',    filters.from);
  if (filters.to)      p.set('to',      filters.to);
  if (filters.farmId)  p.set('farmId',  filters.farmId);
  if (filters.fieldId) p.set('fieldId', filters.fieldId);
  if (filters.pestId)  p.set('pestId',  filters.pestId);
  const qs = p.toString();
  return qs ? '?' + qs : '';
}

// ── Spread & Movement ─────────────────────────────────────────────────────────
export const getSpreadDirection  = f => get(`/intelligence/spread-direction${buildParams(f)}`);
export const getSpreadVelocity   = f => get(`/intelligence/spread-velocity${buildParams(f)}`);
export const getOriginDetection  = f => get(`/intelligence/origin-detection${buildParams(f)}`);

export function getNeighbourRisk(filters = {}, radiusKm = 5) {
  const p = new URLSearchParams();
  if (filters.from)    p.set('from',     filters.from);
  if (filters.to)      p.set('to',       filters.to);
  if (filters.farmId)  p.set('farmId',   filters.farmId);
  if (filters.fieldId) p.set('fieldId',  filters.fieldId);
  if (filters.pestId)  p.set('pestId',   filters.pestId);
  p.set('radiusKm', radiusKm);
  return get(`/intelligence/neighbour-risk?${p}`);
}

export function getCrossFarmCorrelation(filters = {}, minFarms = 2) {
  const p = new URLSearchParams();
  if (filters.from)   p.set('from',     filters.from);
  if (filters.to)     p.set('to',       filters.to);
  if (filters.farmId) p.set('farmId',   filters.farmId);
  if (filters.pestId) p.set('pestId',   filters.pestId);
  p.set('minFarms', minFarms);
  return get(`/intelligence/cross-farm-correlation?${p}`);
}

// ── Predictive Intelligence ───────────────────────────────────────────────────
export function getPopulationForecast(filters = {}, weeksAhead = 4) {
  const p = new URLSearchParams();
  if (filters.from)    p.set('from',       filters.from);
  if (filters.to)      p.set('to',         filters.to);
  if (filters.farmId)  p.set('farmId',     filters.farmId);
  if (filters.fieldId) p.set('fieldId',    filters.fieldId);
  if (filters.pestId)  p.set('pestId',     filters.pestId);
  p.set('weeksAhead', weeksAhead);
  return get(`/intelligence/population-forecast?${p}`);
}

// ── I6 · Threshold Breach Probability ────────────────────────────────────────
export const getBreachProbability = f => get(`/intelligence/breach-probability${buildParams(f)}`);

// ── I7 · Optimal Next Scouting Date ──────────────────────────────────────────
export const getNextScoutingDate = f => get(`/intelligence/next-scouting-date${buildParams(f)}`);

// ── I8 · Seasonal Pressure Forecast ──────────────────────────────────────────
export const getSeasonalPressure = f => get(`/intelligence/seasonal-pressure${buildParams(f)}`);

// ── I9 · Weather-Correlated Risk Index ───────────────────────────────────────
export const getWeatherRisk = f => get(`/intelligence/weather-risk${buildParams(f)}`);

// ── I10 · Trap Saturation Prediction ─────────────────────────────────────────
export const getTrapSaturation = f => get(`/intelligence/trap-saturation${buildParams(f)}`);
