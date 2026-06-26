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
export const getSpreadDirection  = (f, signal) => get(`/intelligence/spread-direction${buildParams(f)}`,  undefined, true, signal);
export const getSpreadVelocity   = (f, signal) => get(`/intelligence/spread-velocity${buildParams(f)}`,   undefined, true, signal);
export const getOriginDetection  = (f, signal) => get(`/intelligence/origin-detection${buildParams(f)}`,  undefined, true, signal);
export const getPresenceMap      = (f, signal) => get(`/intelligence/presence-map${buildParams(f)}`,      undefined, true, signal);

export function getNeighbourRisk(filters = {}, radiusKm = 5, signal) {
  const p = new URLSearchParams();
  if (filters.from)    p.set('from',     filters.from);
  if (filters.to)      p.set('to',       filters.to);
  if (filters.farmId)  p.set('farmId',   filters.farmId);
  if (filters.fieldId) p.set('fieldId',  filters.fieldId);
  if (filters.pestId)  p.set('pestId',   filters.pestId);
  p.set('radiusKm', radiusKm);
  return get(`/intelligence/neighbour-risk?${p}`, undefined, true, signal);
}

export function getCrossFarmCorrelation(filters = {}, minFarms = 2, signal) {
  const p = new URLSearchParams();
  if (filters.from)   p.set('from',     filters.from);
  if (filters.to)     p.set('to',       filters.to);
  if (filters.farmId) p.set('farmId',   filters.farmId);
  if (filters.pestId) p.set('pestId',   filters.pestId);
  p.set('minFarms', minFarms);
  return get(`/intelligence/cross-farm-correlation?${p}`, undefined, true, signal);
}

// ── Predictive Intelligence ───────────────────────────────────────────────────
export function getPopulationForecast(filters = {}, weeksAhead = 4, signal) {
  const p = new URLSearchParams();
  if (filters.from)    p.set('from',       filters.from);
  if (filters.to)      p.set('to',         filters.to);
  if (filters.farmId)  p.set('farmId',     filters.farmId);
  if (filters.fieldId) p.set('fieldId',    filters.fieldId);
  if (filters.pestId)  p.set('pestId',     filters.pestId);
  p.set('weeksAhead', weeksAhead);
  return get(`/intelligence/population-forecast?${p}`, undefined, true, signal);
}

// ── I6 · Threshold Breach Probability ────────────────────────────────────────
export const getBreachProbability = (f, signal) => get(`/intelligence/breach-probability${buildParams(f)}`, undefined, true, signal);

// ── I7 · Optimal Next Scouting Date ──────────────────────────────────────────
export const getNextScoutingDate = (f, signal) => get(`/intelligence/next-scouting-date${buildParams(f)}`, undefined, true, signal);

// ── I8 · Seasonal Pressure Forecast ──────────────────────────────────────────
export const getSeasonalPressure = (f, signal) => get(`/intelligence/seasonal-pressure${buildParams(f)}`, undefined, true, signal);

// ── I9 · Weather-Correlated Risk Index ───────────────────────────────────────
export const getWeatherRisk = (f, signal) => get(`/intelligence/weather-risk${buildParams(f)}`, undefined, true, signal);

// ── I10 · Trap Saturation Prediction ─────────────────────────────────────────
export const getTrapSaturation = (f, signal) => get(`/intelligence/trap-saturation${buildParams(f)}`, undefined, true, signal);

// ── Actionable Recommendations ────────────────────────────────────────────────
export const getSprayTiming            = (f, signal) => get(`/intelligence/spray-timing${buildParams(f)}`,             undefined, true, signal);
export const getScoutPriority          = (f, signal) => get(`/intelligence/scout-priority${buildParams(f)}`,           undefined, true, signal);
export const getTreatmentEffectiveness = (f, signal) => get(`/intelligence/treatment-effectiveness${buildParams(f)}`,  undefined, true, signal);
export const getOverdueAlerts          = (f, signal) => get(`/intelligence/overdue-alerts${buildParams(f)}`,           undefined, true, signal);
export const getUnderscoutedZones      = (f, signal) => get(`/intelligence/underscouted-zones${buildParams(f)}`,       undefined, true, signal);

// ── Environmental Correlation Intelligence ────────────────────────────────────
export const getTemperatureActivity = (f, signal) => get(`/intelligence/temperature-activity${buildParams(f)}`, undefined, true, signal);
export const getRainfallLag         = (f, signal) => get(`/intelligence/rainfall-lag${buildParams(f)}`,         undefined, true, signal);
export const getDroughtStress       = (f, signal) => get(`/intelligence/drought-stress${buildParams(f)}`,       undefined, true, signal);

// ── Containment Intelligence ──────────────────────────────────────────────────
export const getContainmentZones   = (f, signal) => get(`/intelligence/containment-zones${buildParams(f)}`, undefined, true, signal);
export const getQuarantineFlags    = f => get(`/intelligence/quarantine-flags${buildParams(f)}`);
export const getEntryPointAnalysis = f => get(`/intelligence/entry-point-analysis${buildParams(f)}`);
export const getResistancePatterns = f => get(`/intelligence/resistance-patterns${buildParams(f)}`);
