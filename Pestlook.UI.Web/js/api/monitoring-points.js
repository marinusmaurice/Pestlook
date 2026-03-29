import { get, post, put, del } from './client.js';

export function getMonitoringPoints(farmId, fieldId) {
  const query = {};
  if (farmId) query.farmId = farmId;
  if (fieldId) query.fieldId = fieldId;
  return get('/monitoring-points', Object.keys(query).length ? query : undefined);
}

export function getMonitoringPoint(id) {
  return get(`/monitoring-points/${id}`);
}

export function createMonitoringPoint(request) {
  return post('/monitoring-points', request);
}

export function updateMonitoringPoint(id, request) {
  return put(`/monitoring-points/${id}`, request);
}

export function deleteMonitoringPoint(id) {
  return del(`/monitoring-points/${id}`);
}

export function assignPest(pointId, request) {
  return post(`/monitoring-points/${pointId}/pests`, request);
}

export function removePest(pointId, pestId) {
  return del(`/monitoring-points/${pointId}/pests/${pestId}`);
}
