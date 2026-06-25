import { get } from './client.js';

export function getObservationLog({ from, to, farmId, fieldId, trapId, pestId, scoutId, page = 1, pageSize = 50 } = {}) {
  const p = new URLSearchParams();
  if (from)     p.set('from',     from);
  if (to)       p.set('to',       to);
  if (farmId)   p.set('farmId',   farmId);
  if (fieldId)  p.set('fieldId',  fieldId);
  if (trapId)   p.set('trapId',   trapId);
  if (pestId)   p.set('pestId',   pestId);
  if (scoutId)  p.set('scoutId',  scoutId);
  p.set('page',     String(page));
  p.set('pageSize', String(pageSize));
  return get(`/analytics/observation-log?${p.toString()}`);
}
