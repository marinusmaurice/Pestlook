import { get } from './client.js';

export function getAnalyticsSessions(page = 1, pageSize = 200) {
  return get(`/analytics/sessions?page=${page}&pageSize=${pageSize}`);
}

/**
 * Fetches ALL pages of analytics sessions and returns a flat array.
 * Subsequent pages are fetched sequentially to avoid overwhelming the server.
 */
export async function getAllAnalyticsSessions() {
  const first = await getAnalyticsSessions(1);
  const paged = first?.data;
  if (!paged) return [];

  const all = [...(paged.items ?? [])];
  const totalPages = paged.totalPages ?? 1;

  for (let p = 2; p <= totalPages; p++) {
    const res = await getAnalyticsSessions(p);
    const items = res?.data?.items;
    if (items?.length) all.push(...items);
  }

  return all;
}
