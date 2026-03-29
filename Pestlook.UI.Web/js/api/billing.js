import { get, post } from './client.js';

export function getBillingSnapshots() {
  return get('/billing-snapshots');
}

export function getBillingSnapshot(id) {
  return get(`/billing-snapshots/${id}`);
}

export function generateSnapshot(year, month) {
  return post(`/billing-snapshots/generate`, null, true);
}
