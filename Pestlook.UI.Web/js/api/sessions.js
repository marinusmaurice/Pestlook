import { get, post, put, patch, del } from './client.js';

export function getSessions() {
  return get('/scouting-sessions');
}

/**
 * Server-side paged, sorted and filtered sessions (no observation payloads).
 * @param {object} opts
 * @param {number}  opts.page
 * @param {number}  opts.pageSize
 * @param {string}  opts.sortBy    - "date"|"scout"|"farm"|"field"|"obs"
 * @param {boolean} opts.sortDesc
 * @param {string}  opts.status    - ""|"completed"|"active"|"planned"|"overdue"
 * @param {string}  opts.search    - free-text on scout/farm/field name
 * @param {string}  opts.farmId
 * @param {string}  opts.fieldId
 */
export function getSessionsPaged(opts = {}) {
  const p = new URLSearchParams();
  if (opts.page     != null) p.set('page',     opts.page);
  if (opts.pageSize != null) p.set('pageSize',  opts.pageSize);
  if (opts.sortBy)           p.set('sortBy',    opts.sortBy);
  if (opts.sortDesc != null) p.set('sortDesc',  opts.sortDesc);
  if (opts.status)           p.set('status',    opts.status);
  if (opts.search)           p.set('search',    opts.search);
  if (opts.farmId)           p.set('farmId',    opts.farmId);
  if (opts.fieldId)          p.set('fieldId',   opts.fieldId);
  const qs = p.toString();
  return get(`/scouting-sessions/paged${qs ? '?' + qs : ''}`);
}

export function getSession(id) {
  return get(`/scouting-sessions/${id}`);
}

export function startSession(request) {
  return post('/scouting-sessions', request);
}

export function createPlannedSession(request) {
  return post('/scouting-sessions/planned', request);
}

export function updatePlannedSession(id, request) {
  return put(`/scouting-sessions/${id}`, request);
}

export function completeSession(id, request) {
  return patch(`/scouting-sessions/${id}/complete`, request);
}

export function deleteSession(id) {
  return del(`/scouting-sessions/${id}`);
}

// ── Individual observation CRUD ──

export function addObservation(sessionId, request) {
  return post(`/scouting-sessions/${sessionId}/observations`, request);
}

export function updateObservation(sessionId, observationId, request) {
  return put(`/scouting-sessions/${sessionId}/observations/${observationId}`, request);
}

export function deleteObservation(sessionId, observationId) {
  return del(`/scouting-sessions/${sessionId}/observations/${observationId}`);
}
