import { get, post, del } from './client.js';

export function getObservations(query) {
  return get('/pest-observations', query);
}

export function getObservation(id) {
  return get(`/pest-observations/${id}`);
}

export function createObservation(request) {
  return post('/pest-observations', request);
}

export function deleteObservation(id) {
  return del(`/pest-observations/${id}`);
}
