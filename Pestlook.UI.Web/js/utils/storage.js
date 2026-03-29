const KEYS = {
  ACCESS_TOKEN: 'pl_access_token',
  REFRESH_TOKEN: 'pl_refresh_token',
  ACCESS_EXPIRY: 'pl_access_expiry',
  REFRESH_EXPIRY: 'pl_refresh_expiry',
  USER: 'pl_user',
};

export function saveTokens({ accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry }) {
  localStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(KEYS.ACCESS_EXPIRY, accessTokenExpiry);
  localStorage.setItem(KEYS.REFRESH_EXPIRY, refreshTokenExpiry);
}

export function getAccessToken() {
  return localStorage.getItem(KEYS.ACCESS_TOKEN);
}

export function getRefreshToken() {
  return localStorage.getItem(KEYS.REFRESH_TOKEN);
}

export function isAccessTokenExpired() {
  const expiry = localStorage.getItem(KEYS.ACCESS_EXPIRY);
  if (!expiry) return true;
  return new Date(expiry) <= new Date();
}

export function isRefreshTokenExpired() {
  const expiry = localStorage.getItem(KEYS.REFRESH_EXPIRY);
  if (!expiry) return true;
  return new Date(expiry) <= new Date();
}

export function clearTokens() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

export function saveUser(user) {
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
}

export function getUser() {
  const raw = localStorage.getItem(KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return !!getAccessToken() && !isRefreshTokenExpired();
}
