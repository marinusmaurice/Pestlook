import { get } from './client.js';

export function getQuotaStatus() {
  return get('/quota/status');
}
