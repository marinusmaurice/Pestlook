import { get, post, put, patch, del } from './client.js';

export function getTraps(enabled) {
  const query = {};
  if (enabled !== undefined && enabled !== null) query.enabled = enabled;
  return get('/traps', Object.keys(query).length ? query : undefined);
}

export function getTrapsPaged({ page = 1, pageSize = 25, search = '', trapTypeName = '', enabled, sortBy = 'name', sortDesc = false } = {}) {
  const q = { page, pageSize, sortBy, sortDesc };
  if (search)       q.search       = search;
  if (trapTypeName) q.trapTypeName = trapTypeName;
  if (enabled !== undefined && enabled !== null) q.enabled = enabled;
  return get('/traps/paged', q);
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
