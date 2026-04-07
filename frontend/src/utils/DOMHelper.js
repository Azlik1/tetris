export class DOMHelper {
  static showElement(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) el.style.display = el.tagName === 'DIV' ? 'block' : '';
  }

  static hideElement(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) el.style.display = 'none';
  }

  static toggleElement(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
      el.style.display = el.style.display === 'none' ? '' : 'none';
    }
  }

  static isVisible(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    return el && el.style.display !== 'none';
  }

  static showMenu(menuId) {
    const menus = [
      'mainMenu', 'singlePlayerMenu', 'multiPlayerMenu', 
      'settingsMenu', 'rankMenu', 'gameArea'
    ];
    
    menus.forEach(id => {
      this.hideElement(id);
    });
    
    this.showElement(menuId);
  }

  static showMessage(elementId, message, type = 'error') {
    const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (!el) return;

    el.textContent = message;
    el.className = `message ${type}`;
    el.style.display = 'block';

    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => {
      el.style.display = 'none';
    }, 5000);
  }

  static hideMessage(elementId) {
    const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (el) el.style.display = 'none';
  }

  static setText(elementId, text) {
    const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (el) el.textContent = text;
  }

  static setDisabled(elementId, disabled) {
    const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (el) el.disabled = disabled;
  }

  static safeElement(id) {
    return document.getElementById(id);
  }

  static on(elementOrId, event, handler, options = {}) {
    const el = typeof elementOrId === 'string' 
      ? document.getElementById(elementOrId) 
      : elementOrId;
    if (el) {
      el.addEventListener(event, handler, options);
      return () => el.removeEventListener(event, handler);
    }
    return () => {};
  }

  static delegate(container, selector, event, handler) {
    const containerEl = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    
    if (!containerEl) return () => {};

    const delegateHandler = (e) => {
      const target = e.target.closest(selector);
      if (target && containerEl.contains(target)) {
        handler.call(target, e, target);
      }
    };

    containerEl.addEventListener(event, delegateHandler);
    return () => containerEl.removeEventListener(event, delegateHandler);
  }
}

export default DOMHelper;
