import { get, post, patch, del } from './client.js';

export function getSessions() {
  return get('/scouting-sessions');
}

export function getSession(id) {
  return get(`/scouting-sessions/${id}`);
}

export function startSession(request) {
  return post('/scouting-sessions', request);
}

export function completeSession(id, request) {
  return patch(`/scouting-sessions/${id}/complete`, request);
}

export function deleteSession(id) {
  return del(`/scouting-sessions/${id}`);
}
