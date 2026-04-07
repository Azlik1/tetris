import { EventEmitter } from '../utils/EventEmitter.js';
import { decodeToken, isTokenExpired, JWTError } from '../utils/jwtUtils.js';
import HttpClient from '../utils/HttpClient.js';
import Toast from '../utils/Toast.js';
import {
  JWT_CONFIG,
  API_ENDPOINTS,
  RESPONSE_FIELDS,
  ERROR_TYPES,
  VALIDATION_RULES
} from '../config/securityConfig.js';

/**
 * @typedef {Object} UserInfo
 * @property {string|number} id - 用户ID
 * @property {string} username - 用户名
 * @property {string} nickname - 昵称
 * @property {number} role - 角色权限
 * @property {string} avatar - 头像URL
 * @property {number} totalGames - 总游戏次数
 * @property {number} winGames - 胜利次数
 */

/**
 * @typedef {Object} LoginResponse
 * @property {boolean} success - 是否成功
 * @property {string} token - JWT令牌
 * @property {UserInfo} user - 用户信息
 * @property {string} message - 提示信息
 */

/**
 * 用户管理服务 - 安全加固版本
 * 实现：JWT 校验 / CSRF 防护 / 统一错误处理
 */
export class UserManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.storage = options.storage || this._getStorage();
    this.httpClient = options.httpClient || HttpClient;
    this.currentUser = null;
    this.token = null;
    this._init();
  }

  _getStorage() {
    try {
      return JWT_CONFIG.STORAGE_TYPE === 'localStorage'
        ? localStorage
        : sessionStorage;
    } catch (e) {
      console.warn('Storage not available, using in-memory fallback');
      return new Map();
    }
  }

  _init() {
    try {
      const storedToken = this._getTokenFromStorage();
      if (storedToken) {
        const result = decodeToken(storedToken);
        if (result.success) {
          this.token = storedToken;
          this.currentUser = {
            id: result.userId,
            username: result.username,
            role: result.role
          };
          this.httpClient.setAuthToken(storedToken);
          this._scheduleAutoRefresh(result.payload.exp);
        } else {
          this._clearAuth();
        }
      }
    } catch (e) {
      console.debug('Token initialization failed:', e);
      this._clearAuth();
    }

    window.addEventListener('auth:logout', () => {
      this.logout(false);
      Toast.warning('登录已过期，请重新登录');
    });
  }

  _scheduleAutoRefresh(expTimestamp) {
    const remainingTime = (expTimestamp * 1000) - Date.now() - 60000;
    if (remainingTime > 0) {
      setTimeout(() => this._refreshToken(), remainingTime);
    }
  }

  /**
   * 用户注册
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async register(username, password) {
    const validation = this._validateCredentials(username, password);
    if (!validation.valid) {
      Toast.error(validation.message);
      return { success: false, message: validation.message };
    }

    try {
      const result = await this.httpClient.post(
        API_ENDPOINTS.REGISTER,
        { username, password },
        { showLoading: true }
      );

      if (result[RESPONSE_FIELDS.SUCCESS]) {
        Toast.success('注册成功，请登录');
        this.emit('registerSuccess', result);
      } else {
        Toast.error(result[RESPONSE_FIELDS.MESSAGE] || '注册失败');
      }

      return result;
    } catch (err) {
      return {
        success: false,
        message: err.message || '注册失败',
        error: err.type
      };
    }
  }

  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<LoginResponse>}
   */
  async login(username, password) {
    const validation = this._validateCredentials(username, password);
    if (!validation.valid) {
      Toast.error(validation.message);
      return { success: false, message: validation.message };
    }

    try {
      const result = await this.httpClient.post(
        API_ENDPOINTS.LOGIN,
        { username, password },
        { showLoading: true }
      );

      if (result[RESPONSE_FIELDS.SUCCESS]) {
        const token = result[RESPONSE_FIELDS.TOKEN];
        const user = result[RESPONSE_FIELDS.USER];

        this._saveToken(token);
        this.currentUser = user;
        this.httpClient.setAuthToken(token);

        Toast.success(`欢迎回来，${user.nickname || user.username}！`);
        this.emit('loginSuccess', user);
      } else {
        Toast.error(result[RESPONSE_FIELDS.MESSAGE] || '登录失败');
      }

      return result;
    } catch (err) {
      return {
        success: false,
        message: err.message || '登录失败',
        error: err.type
      };
    }
  }

  /**
   * 用户登出
   * @param {boolean} notifyServer - 是否通知服务端
   */
  async logout(notifyServer = true) {
    if (notifyServer && this.token) {
      try {
        await this.httpClient.post(
          API_ENDPOINTS.REVOKE_TOKEN,
          {},
          { showError: false }
        );
      } catch (e) {
        console.debug('Revoke token notification failed');
      }
    }

    this._clearAuth();
    Toast.info('已安全退出登录');
    this.emit('logout');
  }

  /**
   * 获取用户信息
   * @param {string|number} userId - 用户ID（默认当前用户）
   * @returns {Promise<UserInfo|null>}
   */
  async getUserInfo(userId = null) {
    const targetId = userId || this.currentUser?.id;
    if (!targetId) {
      return null;
    }

    if (this.token && isTokenExpired(this.token)) {
      const refreshed = await this._refreshToken();
      if (!refreshed) return null;
    }

    try {
      const result = await this.httpClient.get(
        API_ENDPOINTS.GET_USER(targetId),
        { skipCache: !userId }
      );

      if (result[RESPONSE_FIELDS.SUCCESS]) {
        const user = result[RESPONSE_FIELDS.DATA] || result[RESPONSE_FIELDS.USER];
        if (!userId) {
          this.currentUser = { ...this.currentUser, ...user };
        }
        return user;
      }
      return null;
    } catch (err) {
      if (err.type === ERROR_TYPES.UNAUTHORIZED) {
        this._clearAuth();
      }
      return null;
    }
  }

  /**
   * 检查是否已登录
   * @returns {boolean}
   */
  isLoggedIn() {
    return !!(this.currentUser && this.token && !isTokenExpired(this.token));
  }

  /**
   * 获取当前用户
   * @returns {UserInfo|null}
   */
  getCurrentUser() {
    return this.currentUser ? { ...this.currentUser } : null;
  }

  /**
   * 获取JWT令牌
   * @returns {string|null}
   */
  getToken() {
    return this.token;
  }

  /**
   * 检查是否为管理员
   * @returns {boolean}
   */
  isAdmin() {
    return this.currentUser?.role === 1;
  }

  _saveToken(token) {
    this.token = token;
    try {
      this.storage.setItem(JWT_CONFIG.TOKEN_KEY, token);
    } catch (e) {
      console.warn('Failed to save token to storage');
    }
  }

  _getTokenFromStorage() {
    try {
      return this.storage.getItem(JWT_CONFIG.TOKEN_KEY);
    } catch (e) {
      return null;
    }
  }

  _clearAuth() {
    this.token = null;
    this.currentUser = null;
    this.httpClient.clearAuthToken();
    try {
      this.storage.removeItem(JWT_CONFIG.TOKEN_KEY);
    } catch (e) {
      console.warn('Failed to clear token from storage');
    }
    this.httpClient.clearCache();
  }

  async _refreshToken() {
    try {
      const result = await this.httpClient.post(
        API_ENDPOINTS.REFRESH_TOKEN,
        {},
        { showError: false }
      );

      if (result[RESPONSE_FIELDS.SUCCESS]) {
        const token = result[RESPONSE_FIELDS.TOKEN];
        this._saveToken(token);
        this.httpClient.setAuthToken(token);
        return true;
      }
    } catch (e) {
      console.debug('Token refresh failed');
    }

    this._clearAuth();
    return false;
  }

  _validateCredentials(username, password) {
    if (!username || !username.trim()) {
      return { valid: false, message: '用户名不能为空' };
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < VALIDATION_RULES.USERNAME_MIN) {
      return {
        valid: false,
        message: `用户名至少 ${VALIDATION_RULES.USERNAME_MIN} 个字符`
      };
    }
    if (cleanUsername.length > VALIDATION_RULES.USERNAME_MAX) {
      return {
        valid: false,
        message: `用户名最多 ${VALIDATION_RULES.USERNAME_MAX} 个字符`
      };
    }

    if (!password) {
      return { valid: false, message: '密码不能为空' };
    }
    if (password.length < VALIDATION_RULES.PASSWORD_MIN) {
      return {
        valid: false,
        message: `密码至少 ${VALIDATION_RULES.PASSWORD_MIN} 个字符`
      };
    }
    if (password.length > VALIDATION_RULES.PASSWORD_MAX) {
      return {
        valid: false,
        message: `密码最多 ${VALIDATION_RULES.PASSWORD_MAX} 个字符`
      };
    }

    if (!VALIDATION_RULES.USERNAME_PATTERN.test(cleanUsername)) {
      return {
        valid: false,
        message: '用户名只能包含字母、数字和下划线'
      };
    }

    const passwordChecks = this._checkPasswordComplexity(password);
    if (passwordChecks.length > 0) {
      return {
        valid: false,
        message: `密码需包含：${passwordChecks.join('、')}`
      };
    }

    return { valid: true };
  }

  _checkPasswordComplexity(password) {
    const requirements = [];

    if (VALIDATION_RULES.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      requirements.push('大写字母');
    }
    if (VALIDATION_RULES.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      requirements.push('小写字母');
    }
    if (VALIDATION_RULES.PASSWORD_REQUIRE_NUMBER && !/[0-9]/.test(password)) {
      requirements.push('数字');
    }
    if (VALIDATION_RULES.PASSWORD_REQUIRE_SPECIAL) {
      const specialPattern = new RegExp(`[${VALIDATION_RULES.PASSWORD_SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
      if (!specialPattern.test(password)) {
        requirements.push('特殊字符');
      }
    }

    return requirements;
  }

  /**
   * 销毁实例，清理资源
   */
  destroy() {
    this._clearAuth();
    this.removeAllListeners();
  }
}

export default new UserManager();
