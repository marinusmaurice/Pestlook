import { get, post, put, patch, del } from './client.js';

export function getSessions() {
  return get('/scouting-sessions');
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
