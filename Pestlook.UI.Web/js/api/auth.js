import { post, get, patch } from './client.js';

export function signUp(request) {
  return post('/auth/sign-up', request, false);
}

export function login(email, password) {
  return post('/auth/login', { email, password }, false);
}

export function refresh(accessToken, refreshToken) {
  return post('/auth/refresh', { accessToken, refreshToken }, false);
}

export function revoke(refreshToken) {
  return post('/auth/revoke', refreshToken, false);
}

export function getMe() {
  return get('/auth/me');
}

export function activateAccount(userId, token) {
  return post('/auth/activate', { userId, token }, false);
}

export function resendActivation(email) {
  return post('/auth/resend-activation', { email }, false);
}

export function forgotPassword(email) {
  return post('/auth/forgot-password', { email }, false);
}

export function resetPassword(userId, token, newPassword) {
  return post('/auth/reset-password', { userId, token, newPassword }, false);
}

export function registerUser(request) {
  return post('/auth/register', request);
}

export function updatePreferences(request) {
  return patch('/auth/me/preferences', request);
}
