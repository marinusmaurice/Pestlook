import { get } from './client.js';

export function getDashboard() {
  return get('/dashboard');
}
