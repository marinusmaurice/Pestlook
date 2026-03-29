import { get, post } from './client.js';

export function getRoles() {
  return get('/roles');
}

export function getUsers() {
  return get('/roles/users');
}

export function getUser(userId) {
  return get(`/roles/users/${userId}`);
}

export function assignRole(userId, role) {
  return post(`/roles/users/${userId}/assign`, { role });
}
