import { getCSRFToken, HTTP_STATUS, ERROR_TYPES, REQUEST_CONFIG, API_ENDPOINTS } from '../config/securityConfig.js';
import Toast from './Toast.js';

/**
 * @typedef {Object} RequestOptions
 * @property {string} [method='GET'] - HTTP方法
 * @property {*} [body] - 请求体
 * @property {Object} [headers] - 请求头
 * @property {number} [timeout] - 超时时间(ms)
 * @property {boolean} [skipAuth=false] - 跳过认证
 * @property {boolean} [skipCache=false] - 跳过缓存
 * @property {boolean} [showError=true] - 显示错误提示
 * @property {boolean} [showLoading=false] - 显示加载状态
 * @property {string} [loadingMessage] - 自定义加载信息
 */

/**
 * 安全HTTP客户端 - 统一请求封装
 * 实现：重试机制 / 请求去重 / 缓存 / 超时 / 统一错误处理
 */
export class HttpClient {
  /**
   * 创建HttpClient实例
   * @param {Object} [options={}] - 配置选项
   * @param {string} [options.baseUrl=''] - 基础URL
   * @param {number} [options.timeout] - 请求超时
   * @param {number} [options.maxRetries] - 最大重试次数
   * @param {number} [options.retryDelay] - 重试延迟(ms)
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.timeout = options.timeout || REQUEST_CONFIG.TIMEOUT_MS;
    this.maxRetries = options.maxRetries || REQUEST_CONFIG.MAX_RETRIES;
    this.retryDelay = options.retryDelay || REQUEST_CONFIG.RETRY_DELAY_MS;
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCSRFToken()
    };
    this.authToken = null;
  }

  /**
   * 设置认证令牌
   * @param {string} token - JWT令牌
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * 清除认证令牌
   */
  clearAuthToken() {
    this.authToken = null;
  }

  /**
   * 发送HTTP请求
   * @param {string} endpoint - 请求端点
   * @param {RequestOptions} [options={}] - 请求选项
   * @param {number} [retryCount=0] - 当前重试次数
   * @returns {Promise<*>} 响应数据
   * @throws {Error} 请求失败时抛出错误
   */
  async request(endpoint, options = {}, retryCount = 0) {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = this.timeout,
      skipAuth = false,
      skipCache = false,
      showError = true,
      showLoading = false,
      loadingMessage = null
    } = options;

    const cacheKey = `${method}:${endpoint}:${JSON.stringify(body || {})}`;

    if (method === 'GET' && !skipCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < REQUEST_CONFIG.CACHE_TTL_MS) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const loadingId = showLoading ? this._showLoading(loadingMessage || endpoint) : null;

    const requestPromise = (async () => {
      try {

        const response = await fetch(this.baseUrl + endpoint, {
          method,
          headers: {
            ...this.defaultHeaders,
            ...headers,
            ...(!skipAuth && this.authToken && {
              Authorization: `Bearer ${this.authToken}`
            })
          },
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        await this._handleHttpStatus(response, showError);

        const data = await response.json();

        if (method === 'GET' && !skipCache) {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        }

        return data;
      } catch (err) {
        clearTimeout(timeoutId);
        if (loadingId) this._hideLoading(loadingId);

        if (err.name === 'AbortError') {
          if (retryCount < this.maxRetries) {
            await this._delay(this.retryDelay * (retryCount + 1));
            return this.request(endpoint, options, retryCount + 1);
          }
          const error = new Error('请求超时，请检查网络连接');
          error.type = ERROR_TYPES.NETWORK_ERROR;
          if (showError) Toast.error(error.message);
          throw error;
        }

        if (err.type === ERROR_TYPES.NETWORK_ERROR && retryCount < this.maxRetries) {
          await this._delay(this.retryDelay * (retryCount + 1));
          return this.request(endpoint, options, retryCount + 1);
        }

        if (showError && err.type !== ERROR_TYPES.UNAUTHORIZED) {
          Toast.error(err.message || '请求失败');
        }

        throw err;
      } finally {
        clearTimeout(timeoutId);
        if (loadingId) this._hideLoading(loadingId);
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  _showLoading(endpointOrMessage) {
    const messageMap = {
      [API_ENDPOINTS.LOGIN]: '登录中...',
      [API_ENDPOINTS.REGISTER]: '注册中...',
      [API_ENDPOINTS.LOGOUT]: '退出中...',
      [API_ENDPOINTS.REFRESH_TOKEN]: '刷新令牌中...'
    };

    const message = endpointOrMessage.startsWith('/')
      ? (messageMap[endpointOrMessage] || '加载中...')
      : endpointOrMessage;

    const id = Date.now() + Math.random();
    Toast.info(message);
    return id;
  }

  _hideLoading(id) {
  }

  /**
   * 处理HTTP状态码
   * @param {Response} response - Fetch响应对象
   * @param {boolean} showError - 是否显示错误提示
   * @throws {Error} HTTP错误时抛出异常
   * @private
   */
  async _handleHttpStatus(response, showError) {
    if (response.ok) return;

    let errorType;
    let message;

    switch (response.status) {
      case HTTP_STATUS.UNAUTHORIZED:
        errorType = ERROR_TYPES.UNAUTHORIZED;
        message = '登录已过期，请重新登录';
        break;
      case HTTP_STATUS.FORBIDDEN:
        errorType = ERROR_TYPES.FORBIDDEN;
        message = '无操作权限';
        break;
      case HTTP_STATUS.NOT_FOUND:
        errorType = ERROR_TYPES.HTTP_ERROR;
        message = '请求的资源不存在';
        break;
      case HTTP_STATUS.SERVER_ERROR:
        errorType = ERROR_TYPES.SERVER_ERROR;
        message = '服务器错误，请稍后重试';
        break;
      default:
        errorType = ERROR_TYPES.HTTP_ERROR;
        message = `请求失败 (${response.status})`;
    }

    const error = new Error(message);
    error.type = errorType;
    error.status = response.status;

    if (errorType === ERROR_TYPES.UNAUTHORIZED) {
      this.clearAuthToken();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    if (showError && errorType !== ERROR_TYPES.UNAUTHORIZED) {
      Toast.error(message);
    }

    throw error;
  }

  /**
   * 发送GET请求
   * @param {string} endpoint - 请求端点
   * @param {RequestOptions} [options={}] - 请求选项
   * @returns {Promise<*>} 响应数据
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  /**
   * 发送POST请求
   * @param {string} endpoint - 请求端点
   * @param {*} body - 请求体
   * @param {RequestOptions} [options={}] - 请求选项
   * @returns {Promise<*>} 响应数据
   */
  post(endpoint, body, options = {}) {
    return this.request(endpoint, { method: 'POST', body, ...options });
  }

  /**
   * 发送PUT请求
   * @param {string} endpoint - 请求端点
   * @param {*} body - 请求体
   * @param {RequestOptions} [options={}] - 请求选项
   * @returns {Promise<*>} 响应数据
   */
  put(endpoint, body, options = {}) {
    return this.request(endpoint, { method: 'PUT', body, ...options });
  }

  /**
   * 发送DELETE请求
   * @param {string} endpoint - 请求端点
   * @param {RequestOptions} [options={}] - 请求选项
   * @returns {Promise<*>} 响应数据
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  /**
   * 清空所有缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 使匹配模式的缓存失效
   * @param {string} pattern - 匹配模式
   */
  invalidateCache(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 延迟函数
   * @param {number} ms - 毫秒数
   * @returns {Promise<void>}
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new HttpClient();
