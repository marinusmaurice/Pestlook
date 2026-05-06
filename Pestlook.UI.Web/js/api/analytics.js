import { get } from './client.js';

export function getAnalyticsSessions() {
  return get('/analytics/sessions');
}
