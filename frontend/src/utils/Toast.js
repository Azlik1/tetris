class Toast {
  static container = null;

  static init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(this.container);
    }
  }

  static show(message, type = 'info', duration = 3000) {
    this.init();
    
    const toast = document.createElement('div');
    const colors = {
      success: 'background: #10b981; color: white;',
      error: 'background: #ef4444; color: white;',
      warning: 'background: #f59e0b; color: white;',
      info: 'background: #3b82f6; color: white;'
    };
    
    toast.style.cssText = `
      ${colors[type] || colors.info}
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 14px;
      animation: slideIn 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
    `;
    toast.textContent = message;
    
    this.container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  static success(message) { this.show(message, 'success'); }
  static error(message) { this.show(message, 'error'); }
  static warning(message) { this.show(message, 'warning'); }
  static info(message) { this.show(message, 'info'); }
}

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

export default Toast;
