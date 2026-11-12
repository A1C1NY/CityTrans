import Vue from 'vue';
import { apiRequest, configureClient, login as loginRequest } from '../api/client';

const TOKEN_KEY = 'token';

export const authState = Vue.observable({
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: null,
  loading: false,
  ready: false
});

export const ROLE_NAMES = {
  passenger: '普通用户',
  analyst: '分析师',
  admin: '管理员'
};

export function roleName(role) {
  return ROLE_NAMES[role] || role || '-';
}

export function hasRole(...roles) {
  return Boolean(authState.user && roles.includes(authState.user.role));
}

export const isAnalyst = () => hasRole('analyst', 'admin');
export const isAdmin = () => hasRole('admin');

function setToken(value) {
  authState.token = value;
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

configureClient({
  getToken: () => authState.token,
  onUnauthorized: () => {
    if (!authState.token) return;
    setToken(null);
    authState.user = null;
  }
});

export async function login(username, password) {
  const data = await loginRequest(username, password);
  setToken(data.access_token);
  await loadCurrentUser();
  return authState.user;
}

export async function register(username, password) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function loadCurrentUser() {
  if (!authState.token) {
    authState.ready = true;
    return null;
  }
  authState.loading = true;
  try {
    authState.user = await apiRequest('/auth/me');
    return authState.user;
  } catch (error) {
    setToken(null);
    authState.user = null;
    return null;
  } finally {
    authState.loading = false;
    authState.ready = true;
  }
}

export function logout() {
  setToken(null);
  authState.user = null;
}
