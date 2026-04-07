import Toast from '../utils/Toast.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.eventHandlers = new Map();
  }

  connect(token = null) {
    return new Promise((resolve, reject) => {
      try {
        const options = {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 3000,
          timeout: 10000
        };
        
        if (token) {
          options.auth = { token };
        }
        
        this.socket = io(options);
        
        this.socket.on('connect', () => {
          this.connected = true;
          Toast.success('服务器连接成功');
          resolve();
        });
        
        this.socket.on('disconnect', () => {
          this.connected = false;
          Toast.warning('服务器连接断开，正在重连...');
        });
        
        this.socket.on('connect_error', (err) => {
          this.connected = false;
          console.error('连接错误:', err);
          reject(err);
        });
        
        this.socket.onAny((event, data) => {
          const handlers = this.eventHandlers.get(event);
          if (handlers) {
            handlers.forEach(handler => handler(data));
          }
        });
        
      } catch (err) {
        Toast.error('连接服务器失败');
        reject(err);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.eventHandlers.clear();
    }
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }

  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(event, data, timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        Toast.error('服务器未连接，请稍后重试');
        reject(new Error('Not connected'));
        return;
      }

      const timer = setTimeout(() => {
        Toast.error('请求超时，请稍后重试');
        reject(new Error('Timeout'));
      }, timeout);

      this.socket.emit(event, data, (response) => {
        clearTimeout(timer);
        if (response && !response.success) {
          Toast.error(response.message || '操作失败');
        }
        resolve(response);
      });
    });
  }

  emitWithLoading(event, data, loadingText = '处理中...') {
    Toast.info(loadingText);
    return this.emit(event, data);
  }
}

export default new SocketService();
