import { getAccessToken, getRefreshToken, saveTokens, clearTokens, isAccessTokenExpired, getUser } from '../utils/storage.js';
import { navigate } from '../utils/router.js';
import { recordApiCall } from '../utils/perf.js';

const BASE_URL = '/api/v1';

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  refreshQueue = [];
}

async function refreshTokens() {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!accessToken || !refreshToken) throw new Error('No tokens');

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error('Refresh failed');
  }

  const json = await res.json();
  if (json.success && json.data) {
    saveTokens(json.data);
  } else {
    clearTokens();
    throw new Error('Refresh failed');
  }
}

async function ensureToken() {
  if (!isAccessTokenExpired()) return;

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    await refreshTokens();
    processQueue(null);
  } catch (err) {
    processQueue(err);
    navigate('/login');
    throw err;
  } finally {
    isRefreshing = false;
  }
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, auth = true, query, signal } = options;

  let url = `${BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    await ensureToken();
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const user = getUser();
    if (user?.tenantSlug) headers['X-Tenant-ID'] = user.tenantSlug;
  }

  const clientStart = performance.now();
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err; // let caller handle silently
    throw err;
  }
  const clientEnd = performance.now();

  const serverMs    = res.headers.get('X-Response-Time') != null
    ? Number(res.headers.get('X-Response-Time')) : null;
  const requestId   = res.headers.get('X-Request-Id');

  recordApiCall({ url, method, status: res.status, clientStart, clientEnd, serverMs, requestId });

  if (res.status === 204) return { success: true, data: null };

  if (res.status === 401 && auth) {
    clearTokens();
    navigate('/login');
    throw new Error('Unauthorized');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    const err = new Error(`Server returned non-JSON response (${res.status}): ${text.slice(0, 120)}`);
    err.status = res.status;
    throw err;
  }

  const json = await res.json();

  if (!res.ok) {
    const msg = json.message || json.errors?.join(', ') || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.apiResponse = json;
    throw err;
  }

  return json;
}

export function get(path, query, auth = true, signal) {
  return apiRequest(path, { method: 'GET', query, auth, signal });
}

export function post(path, body, auth = true) {
  return apiRequest(path, { method: 'POST', body, auth });
}

export function put(path, body) {
  return apiRequest(path, { method: 'PUT', body });
}

export function patch(path, body) {
  return apiRequest(path, { method: 'PATCH', body });
}

export function del(path) {
  return apiRequest(path, { method: 'DELETE' });
}
