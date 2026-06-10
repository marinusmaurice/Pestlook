import { post } from './client.js';

export function createFeedback({ category, subject, message, pageUrl }) {
  return post('/feedback', { category, subject, message, pageUrl });
}
