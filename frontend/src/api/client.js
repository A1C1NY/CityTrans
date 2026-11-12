import { notify } from '../stores/toast';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
).replace(/\/+$/, '');

let tokenProvider = () => null;
let unauthorizedHandler = () => {};

export function configureClient({ getToken, onUnauthorized } = {}) {
  if (getToken) tokenProvider = getToken;
  if (onUnauthorized) unauthorizedHandler = onUnauthorized;
}

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = tokenProvider();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      mode: 'cors',
      credentials: 'omit'
    });
  } catch (networkError) {
    notify('无法连接服务器，请确认后端服务已启动', 'error');
    throw new ApiError('无法连接服务器', 'NETWORK_ERROR', 0);
  }

  if (!response.ok) {
    let message = '请求失败';
    let code;
    try {
      const data = await response.json();
      message = data.detail?.message || data.detail || data.message || message;
      code = data.detail?.code;
    } catch (parseError) {
      message = `HTTP ${response.status}: ${response.statusText}`;
    }

    if (response.status === 401) {
      unauthorizedHandler();
    }

    const error = new ApiError(message, code, response.status);
    notify(message, code === 'PASSWORD_INVALID' ? 'warning' : 'error');
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function login(username, password) {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data.detail?.message || data.detail || '登录失败',
      data.detail?.code,
      response.status
    );
  }
  return data;
}

export { API_BASE_URL };
