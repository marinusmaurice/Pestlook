import { get, post, put, del } from './client.js';

export function getFarms() {
  return get('/farms');
}

export function getFarm(id) {
  return get(`/farms/${id}`);
}

export function getFarmGeoJson(id) {
  return get(`/farms/${id}/geojson`);
}

export function createFarm(request) {
  return post('/farms', request);
}

export function updateFarm(id, request) {
  return put(`/farms/${id}`, request);
}

export function deleteFarm(id) {
  return del(`/farms/${id}`);
}
