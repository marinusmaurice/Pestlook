import { get, post, put, del } from './client.js';

export function getTrapTypes() {
  return get('/trap-types');
}

export function getTrapType(id) {
  return get(`/trap-types/${id}`);
}

export function createTrapType(request) {
  return post('/trap-types', request);
}

export function updateTrapType(id, request) {
  return put(`/trap-types/${id}`, request);
}

export function deleteTrapType(id) {
  return del(`/trap-types/${id}`);
}
