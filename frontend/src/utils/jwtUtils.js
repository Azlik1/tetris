import { ERROR_TYPES, JWT_CONFIG } from '../config/securityConfig.js';

/**
 * @typedef {Object} JWTPayload
 * @property {string|number} [sub] - 主题(用户ID)
 * @property {string|number} [userId] - 用户ID
 * @property {string|number} [id] - 用户ID
 * @property {string} [username] - 用户名
 * @property {number} [role] - 角色权限
 * @property {number} [exp] - 过期时间戳
 * @property {number} [iat] - 签发时间戳
 */

/**
 * @typedef {Object} DecodeResult
 * @property {boolean} success - 是否成功
 * @property {JWTPayload} [payload] - 解码成功时的载荷
 * @property {string} [userId] - 用户ID
 * @property {string} [username] - 用户名
 * @property {number} [role] - 角色权限
 * @property {number} [exp] - 过期时间戳
 * @property {number} [iat] - 签发时间戳
 * @property {string} [error] - 错误类型
 * @property {string} [message] - 错误信息
 */

/**
 * JWT自定义错误类
 * @extends Error
 */
export class JWTError extends Error {
  /**
   * 创建JWT错误实例
   * @param {string} type - 错误类型
   * @param {string} message - 错误信息
   */
  constructor(type, message) {
    super(message);
    this.name = 'JWTError';
    this.type = type;
  }
}

/**
 * 验证JWT令牌格式
 * @param {string} token - JWT令牌
 * @returns {string[]} 令牌各部分数组
 * @throws {JWTError} 格式错误时抛出异常
 */
export function validateTokenFormat(token) {
  if (!token || typeof token !== 'string') {
    throw new JWTError(
      ERROR_TYPES.JWT_INVALID_FORMAT,
      '令牌不能为空'
    );
  }

  const parts = token.split('.');
  if (parts.length < JWT_CONFIG.MIN_TOKEN_PARTS) {
    throw new JWTError(
      ERROR_TYPES.JWT_INVALID_FORMAT,
      `令牌格式错误：应为 ${JWT_CONFIG.MIN_TOKEN_PARTS} 段，实际 ${parts.length} 段`
    );
  }

  return parts;
}

/**
 * Base64URL解码
 * @param {string} str - Base64URL编码字符串
 * @returns {string} 解码后的字符串
 * @throws {JWTError} 解码失败时抛出异常
 */
export function base64UrlDecode(str) {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const decoded = atob(padded);
    return decodeURIComponent(Array.prototype.map.call(decoded, c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (e) {
    throw new JWTError(
      ERROR_TYPES.JWT_DECODE_FAILED,
      'Base64 解码失败'
    );
  }
}

/**
 * 解析JWT载荷
 * @param {string} token - JWT令牌
 * @returns {JWTPayload} 解析后的载荷对象
 * @throws {JWTError} 解析失败时抛出异常
 */
export function parsePayload(token) {
  const parts = validateTokenFormat(token);
  
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload;
  } catch (e) {
    if (e instanceof JWTError) throw e;
    throw new JWTError(
      ERROR_TYPES.JWT_DECODE_FAILED,
      'Payload JSON 解析失败'
    );
  }
}

/**
 * 验证令牌过期时间
 * @param {JWTPayload} payload - JWT载荷
 * @returns {boolean} 未过期返回true
 * @throws {JWTError} 已过期时抛出异常
 */
export function validateExpiry(payload) {
  if (!payload.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiryWithLeeway = payload.exp + JWT_CONFIG.EXPIRY_LEEWAY_SECONDS;

  if (now > expiryWithLeeway) {
    throw new JWTError(
      ERROR_TYPES.JWT_EXPIRED,
      `令牌已过期：${new Date(payload.exp * 1000).toLocaleString()}`
    );
  }

  return true;
}

/**
 * 检查令牌是否已过期
 * @param {string} token - JWT令牌
 * @returns {boolean} 已过期返回true，无效或未过期返回false
 */
export function isTokenExpired(token) {
  try {
    const payload = parsePayload(token);
    const now = Math.floor(Date.now() / 1000);
    return now > payload.exp;
  } catch (e) {
    return true;
  }
}

/**
 * 安全解码JWT令牌（含格式校验和过期验证）
 * @param {string} token - JWT令牌
 * @returns {DecodeResult} 解码结果
 */
export function decodeToken(token) {
  try {
    const payload = parsePayload(token);
    validateExpiry(payload);

    return {
      success: true,
      payload,
      userId: payload.sub || payload.userId || payload.id,
      username: payload.username,
      role: payload.role || 0,
      exp: payload.exp,
      iat: payload.iat
    };
  } catch (e) {
    return {
      success: false,
      error: e.type || ERROR_TYPES.JWT_DECODE_FAILED,
      message: e.message,
      payload: null
    };
  }
}

export function isTokenExpired(token) {
  try {
    const payload = parsePayload(token);
    const now = Math.floor(Date.now() / 1000);
    return now > payload.exp;
  } catch (e) {
    return true;
  }
}

export function getTokenRemainingTime(token) {
  try {
    const payload = parsePayload(token);
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, (payload.exp - now) * 1000);
  } catch (e) {
    return 0;
  }
}

export default {
  JWTError,
  validateTokenFormat,
  base64UrlDecode,
  parsePayload,
  validateExpiry,
  decodeToken,
  isTokenExpired,
  getTokenRemainingTime
};
