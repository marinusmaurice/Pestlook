import { get, post, put, patch, del } from './client.js';

export function getTraps(enabled) {
  const query = {};
  if (enabled !== undefined && enabled !== null) query.enabled = enabled;
  return get('/traps', Object.keys(query).length ? query : undefined);
}

export function getTrap(id) {
  return get(`/traps/${id}`);
}

export function getTrapByBarcode(barcode) {
  return get(`/traps/barcode/${encodeURIComponent(barcode)}`);
}

export function createTrap(request) {
  return post('/traps', request);
}

export function updateTrap(id, request) {
  return put(`/traps/${id}`, request);
}

export function toggleTrap(id) {
  return patch(`/traps/${id}/toggle`, {});
}

export function deleteTrap(id) {
  return del(`/traps/${id}`);
}
