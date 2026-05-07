import { get } from './client.js';

// ── Legacy full-payload endpoint (kept for backward compat) ──────────────────
export function getAnalyticsSessions(page = 1, pageSize = 200) {
  return get(`/analytics/sessions?page=${page}&pageSize=${pageSize}`);
}

/** Fetches ALL pages of analytics sessions and returns a flat array. */
export async function getAllAnalyticsSessions() {
  const first = await getAnalyticsSessions(1);
  const paged = first?.data;
  if (!paged) return [];

  const all = [...(paged.items ?? [])];
  const totalPages = paged.totalPages ?? 1;

  for (let p = 2; p <= totalPages; p++) {
    const res = await getAnalyticsSessions(p);
    const items = res?.data?.items;
    if (items?.length) all.push(...items);
  }

  return all;
}

// ── Per-tab aggregate endpoints ──────────────────────────────────────────────

function buildParams(filters) {
  const p = new URLSearchParams();
  if (filters?.from) p.set('from', filters.from);
  if (filters?.to)   p.set('to',   filters.to);
  if (filters?.farmId)   p.set('farmId',  filters.farmId);
  if (filters?.fieldId)  p.set('fieldId', filters.fieldId);
  if (filters?.scoutId)  p.set('scoutId', filters.scoutId);
  const qs = p.toString();
  return qs ? '?' + qs : '';
}

export const getOverview          = f => get(`/analytics/overview${buildParams(f)}`);
export const getAlerts            = f => get(`/analytics/alerts${buildParams(f)}`);
export const getPestPressure      = f => get(`/analytics/pest-pressure${buildParams(f)}`);
export const getSessionsSummary   = f => get(`/analytics/sessions-summary${buildParams(f)}`);
export const getTopPests          = f => get(`/analytics/top-pests${buildParams(f)}`);
export const getTrapPerformance   = f => get(`/analytics/trap-performance${buildParams(f)}`);
export const getScoutProductivity = f => get(`/analytics/scout-productivity${buildParams(f)}`);
export const getSeasonalTrends    = f => get(`/analytics/seasonal-trends${buildParams(f)}`);
export const getUnknownPests      = f => get(`/analytics/unknown-pests${buildParams(f)}`);
export const getFieldCoverage     = f => get(`/analytics/field-coverage${buildParams(f)}`);
export const getBillingAnalytics  = ()  => get(`/analytics/billing`);
