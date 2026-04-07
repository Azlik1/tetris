import { STYLES_CONFIG, RENDER_CONFIG } from '../config/onlineConfig.js';

export class OnlineUIManager {
  constructor() {
    this.toastQueue = [];
    this.toastElement = null;
    this.toastTimer = null;
  }

  showToast(message, type = 'info', duration = RENDER_CONFIG.TOAST_DURATION_MS) {
    const style = STYLES_CONFIG.TOAST[type] || STYLES_CONFIG.TOAST.info;

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this._removeToast();
    }

    if (!document.body) {
      console.warn('Body not ready for toast:', message);
      return;
    }

    this.toastElement = document.createElement('div');
    Object.assign(this.toastElement.style, {
      ...STYLES_CONFIG.TOAST,
      ...style
    });
    this.toastElement.textContent = message;
    document.body.appendChild(this.toastElement);

    this.toastTimer = setTimeout(() => {
      this._removeToast();
    }, duration);
  }

  success(message) {
    this.showToast(message, 'success');
  }

  error(message) {
    this.showToast(message, 'error');
  }

  warning(message) {
    this.showToast(message, 'warning');
  }

  info(message) {
    this.showToast(message, 'info');
  }

  _removeToast() {
    if (this.toastElement && this.toastElement.parentNode) {
      this.toastElement.parentNode.removeChild(this.toastElement);
    }
    this.toastElement = null;
    this.toastTimer = null;
  }

  renderGameModeInfo(containerId, mode, extraData = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const modeLabels = {
      MARATHON: '马拉松模式',
      BATTLE: '对战模式',
      TIME_ATTACK: `限时挑战 - 剩余 ${Math.ceil(extraData.remainingTime / 1000)}s`,
      FORTY_LINES: `40行挑战 - ${extraData.lines || 0}/40`
    };

    container.textContent = modeLabels[mode] || mode;
  }

  renderKeyBindings(containerId, bindings, onEdit) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const labels = {
      moveLeft: '左移',
      moveRight: '右移',
      rotateRight: '右旋',
      rotateLeft: '左旋',
      softDrop: '软降',
      hardDrop: '硬降',
      hold: '暂存'
    };

    container.innerHTML = Object.entries(bindings).map(([op, key]) => `
      <div class="key-binding-item" data-operation="${op}" style="display: flex; justify-content: space-between; padding: 5px 0;">
        <span>${labels[op] || op}</span>
        <span class="binding-key" style="background: #e3f2fd; padding: 2px 8px; border-radius: 4px; cursor: pointer;">
          ${key === ' ' ? '空格' : key}
        </span>
      </div>
    `).join('');

    if (onEdit) {
      container.querySelectorAll('.binding-key').forEach(el => {
        el.addEventListener('click', () => {
          const op = el.closest('.key-binding-item').dataset.operation;
          onEdit(op);
        });
      });
    }
  }

  showLoading(containerId, text = '加载中...') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="animation: spin 1s linear infinite;">⏳</div>
        <p>${text}</p>
      </div>
    `;
  }

  hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }
  }

  destroy() {
    this._removeToast();
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }
}

export default OnlineUIManager;
