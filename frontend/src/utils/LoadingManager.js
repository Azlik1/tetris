export class LoadingManager {
  constructor() {
    this.overlay = null;
    this.spinner = null;
    this.messageEl = null;
    this.loadingCount = 0;
    this._init();
  }

  _init() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'loading-overlay';
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
      z-index: 9999;
      flex-direction: column;
    `;

    this.spinner = document.createElement('div');
    this.spinner.style.cssText = `
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;

    this.messageEl = document.createElement('div');
    this.messageEl.style.cssText = `
      color: white;
      margin-top: 15px;
      font-size: 16px;
    `;

    this.overlay.appendChild(this.spinner);
    this.overlay.appendChild(this.messageEl);
    document.body.appendChild(this.overlay);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  show(message = '加载中...') {
    this.loadingCount++;
    this.messageEl.textContent = message;
    this.overlay.style.display = 'flex';
  }

  hide() {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0) {
      this.overlay.style.display = 'none';
    }
  }

  forceHide() {
    this.loadingCount = 0;
    this.overlay.style.display = 'none';
  }

  isLoading() {
    return this.loadingCount > 0;
  }
}

export default new LoadingManager();
