import { get, post, put, del } from './client.js';

export function getFields(farmId) {
  return get('/fields', farmId ? { farmId } : undefined);
}

export function getField(id) {
  return get(`/fields/${id}`);
}

export function createField(request) {
  return post('/fields', request);
}

export function updateField(id, request) {
  return put(`/fields/${id}`, request);
}

export function deleteField(id) {
  return del(`/fields/${id}`);
}
