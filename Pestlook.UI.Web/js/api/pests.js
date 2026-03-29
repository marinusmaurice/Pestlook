import { get, post, put, del } from './client.js';

export function getPests() {
  return get('/pests');
}

export function getPest(id) {
  return get(`/pests/${id}`);
}

export function createPest(request) {
  return post('/pests', request);
}

export function updatePest(id, request) {
  return put(`/pests/${id}`, request);
}

export function deletePest(id) {
  return del(`/pests/${id}`);
}
