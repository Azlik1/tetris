// 用户模块管理
class UserManager {
  constructor() {
    this.currentUser = null;
    this.token = localStorage.getItem('jwt_token');
    this.init();
  }
  
  init() {
    // 检查是否已登录
    if (this.token) {
      this.decodeToken();
    }
  }
  
  // 解码JWT令牌
  decodeToken() {
    try {
      const tokenParts = this.token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      this.currentUser = {
        id: payload.id,
        username: payload.username
      };
    } catch (error) {
      // 令牌无效，清除
      this.logout();
    }
  }
  
  // 注册
  async register(username, password) {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('注册失败:', error);
      return { success: false, message: '网络错误，请稍后重试' };
    }
  }
  
  // 登录
  async login(username, password) {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const result = await response.json();
      if (result.success) {
        // 存储令牌
        this.token = result.token;
        localStorage.setItem('jwt_token', result.token);
        this.currentUser = result.user;
      }
      return result;
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, message: '网络错误，请稍后重试' };
    }
  }
  
  // 登出
  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('jwt_token');
  }
  
  // 获取当前用户信息
  async getUserInfo() {
    if (!this.currentUser) return null;
    
    try {
      const response = await fetch(`/api/user/${this.currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        return result.user;
      }
      return null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }
  
  // 检查是否已登录
  isLoggedIn() {
    return !!this.currentUser;
  }
  
  // 获取认证头部
  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }
  
  // 获取用户ID
  getUserId() {
    return this.currentUser ? this.currentUser.id : null;
  }
  
  // 获取当前用户
  getUser() {
    return this.currentUser;
  }
}

// 导出用户管理器实例
const userManager = new UserManager();
export default userManager;