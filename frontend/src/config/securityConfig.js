export const JWT_CONFIG = {
  TOKEN_KEY: 'tetris_auth_token',
  CSRF_TOKEN_KEY: 'tetris_csrf_token',
  STORAGE_TYPE: 'localStorage',
  EXPIRY_LEEWAY_SECONDS: 60,
  MIN_TOKEN_PARTS: 3
};

export const API_ENDPOINTS = {
  BASE: '/api',
  REGISTER: '/api/register',
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  GET_USER: (id) => `/api/user/${id}`,
  REFRESH_TOKEN: '/api/token/refresh',
  REVOKE_TOKEN: '/api/token/revoke'
};

export const RESPONSE_FIELDS = {
  SUCCESS: 'success',
  TOKEN: 'token',
  USER: 'user',
  MESSAGE: 'message',
  CODE: 'code',
  DATA: 'data'
};

export const ERROR_TYPES = {
  JWT_INVALID_FORMAT: 'JWT_INVALID_FORMAT',
  JWT_EXPIRED: 'JWT_EXPIRED',
  JWT_SIGNATURE_INVALID: 'JWT_SIGNATURE_INVALID',
  JWT_DECODE_FAILED: 'JWT_DECODE_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  PARAM_INVALID: 'PARAM_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SERVER_ERROR: 'SERVER_ERROR'
};

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

export const VALIDATION_RULES = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  USERNAME_PATTERN: /^[a-zA-Z0-9_]+$/,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 50,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: true,
  PASSWORD_SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

export const REQUEST_CONFIG = {
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 500,
  TIMEOUT_MS: 15000,
  CACHE_TTL_MS: 30000,
  DEBOUNCE_MS: 300
};

export function getCSRFToken() {
  const stored = localStorage.getItem(JWT_CONFIG.CSRF_TOKEN_KEY);
  if (stored) return stored;

  const token = generateCSRFToken();
  localStorage.setItem(JWT_CONFIG.CSRF_TOKEN_KEY, token);
  return token;
}

function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  JWT_CONFIG,
  API_ENDPOINTS,
  RESPONSE_FIELDS,
  ERROR_TYPES,
  HTTP_STATUS,
  VALIDATION_RULES,
  REQUEST_CONFIG,
  getCSRFToken
};
