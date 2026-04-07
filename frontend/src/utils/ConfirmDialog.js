import Toast from './Toast.js';

export class ConfirmDialog {
  constructor() {
    this.overlay = null;
    this.dialog = null;
    this._init();
  }

  _init() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'confirm-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    this.dialog = document.createElement('div');
    this.dialog.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      animation: dialogIn 0.3s ease;
    `;

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes dialogIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  show(options) {
    return new Promise((resolve) => {
      const {
        title = '确认操作',
        message = '确定要执行此操作吗？',
        confirmText = '确定',
        cancelText = '取消',
        type = 'warning',
        onConfirm = null,
        onCancel = null
      } = options;

      const colors = {
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        success: '#10b981'
      };

      this.dialog.innerHTML = `
        <h3 style="margin: 0 0 12px; color: ${colors[type] || colors.warning}; font-size: 18px;">${title}</h3>
        <p style="margin: 0 0 24px; color: #666; line-height: 1.5;">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button class="cancel-btn" style="padding: 8px 20px; border: 1px solid #ddd; background: #f5f5f5; border-radius: 4px; cursor: pointer;">${cancelText}</button>
          <button class="confirm-btn" style="padding: 8px 20px; background: ${colors[type] || colors.warning}; color: white; border: none; border-radius: 4px; cursor: pointer;">${confirmText}</button>
        </div>
      `;

      this.overlay.style.display = 'flex';

      const cancelBtn = this.dialog.querySelector('.cancel-btn');
      const confirmBtn = this.dialog.querySelector('.confirm-btn');

      const cleanup = () => {
        cancelBtn.removeEventListener('click', handleCancel);
        confirmBtn.removeEventListener('click', handleConfirm);
        this.overlay.style.display = 'none';
      };

      const handleCancel = () => {
        cleanup();
        if (onCancel) onCancel();
        resolve(false);
      };

      const handleConfirm = () => {
        cleanup();
        if (onConfirm) onConfirm();
        resolve(true);
      };

      cancelBtn.addEventListener('click', handleCancel);
      confirmBtn.addEventListener('click', handleConfirm);

      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          handleCancel();
        }
      });
    });
  }

  confirmDanger(message, onConfirm) {
    return this.show({
      title: '危险操作',
      message,
      type: 'danger',
      confirmText: '确认',
      onConfirm
    });
  }

  confirmLogout() {
    return this.show({
      title: '退出登录',
      message: '确定要退出登录吗？',
      type: 'warning'
    });
  }

  confirmQuitRoom() {
    return this.show({
      title: '退出房间',
      message: '确定要退出当前房间吗？游戏进度将不会保存。',
      type: 'warning'
    });
  }
}

export default new ConfirmDialog();
