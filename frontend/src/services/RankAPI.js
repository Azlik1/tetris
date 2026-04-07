import Toast from '../utils/Toast.js';

class RankAPI {
  constructor() {
    this.baseUrl = '/api';
    this.timeout = 10000;
    this.maxRetries = 3;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}, retryCount = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }

      if (retryCount < this.maxRetries) {
        await this._delay(1000 * (retryCount + 1));
        return this.request(endpoint, options, retryCount + 1);
      }

      throw err;
    }
  }

  async updateRank(mode, score, lines, level) {
    try {
      if (!this.token) {
        return null;
      }

      const result = await this.request('/rank/update', {
        method: 'POST',
        body: JSON.stringify({ mode, score, lines, level })
      });

      return result;
    } catch (err) {
      console.error('更新排行榜失败:', err);
      Toast.info('网络异常，排行榜未更新');
      return null;
    }
  }

  async getRankList(mode, limit = 50) {
    try {
      return await this.request(`/rank/list?mode=${mode}&limit=${limit}`);
    } catch (err) {
      console.error('获取排行榜失败:', err);
      return { success: false, data: [] };
    }
  }

  async getPlayerRank(mode, userId) {
    try {
      return await this.request(`/rank/player?mode=${mode}&userId=${userId}`);
    } catch (err) {
      console.error('获取玩家排名失败:', err);
      return { success: false, rank: -1 };
    }
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new RankAPI();
