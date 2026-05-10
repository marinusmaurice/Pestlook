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

// ── Actionable Recommendations ────────────────────────────────────────────────
export const getSprayTiming            = f => get(`/intelligence/spray-timing${buildParams(f)}`);
export const getScoutPriority          = f => get(`/intelligence/scout-priority${buildParams(f)}`);
export const getTreatmentEffectiveness = f => get(`/intelligence/treatment-effectiveness${buildParams(f)}`);
export const getOverdueAlerts          = f => get(`/intelligence/overdue-alerts${buildParams(f)}`);
export const getUnderscoutedZones      = f => get(`/intelligence/underscouted-zones${buildParams(f)}`);

// ── Environmental Correlation Intelligence ────────────────────────────────────
export const getTemperatureActivity = f => get(`/intelligence/temperature-activity${buildParams(f)}`);
export const getRainfallLag         = f => get(`/intelligence/rainfall-lag${buildParams(f)}`);
export const getDroughtStress       = f => get(`/intelligence/drought-stress${buildParams(f)}`);

// ── Containment Intelligence ──────────────────────────────────────────────────
export const getContainmentZones   = f => get(`/intelligence/containment-zones${buildParams(f)}`);
export const getQuarantineFlags    = f => get(`/intelligence/quarantine-flags${buildParams(f)}`);
export const getEntryPointAnalysis = f => get(`/intelligence/entry-point-analysis${buildParams(f)}`);
export const getResistancePatterns = f => get(`/intelligence/resistance-patterns${buildParams(f)}`);
