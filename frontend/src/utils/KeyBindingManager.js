import Toast from './Toast.js';

export const DEFAULT_KEY_BINDINGS = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  moveDown: 'ArrowDown',
  rotateRight: 'ArrowUp',
  rotateLeft: 'KeyZ',
  hardDrop: 'Space',
  hold: 'KeyC',
  pause: 'KeyP'
};

export const KEY_DISPLAY_NAMES = {
  ArrowLeft: '左方向键',
  ArrowRight: '右方向键',
  ArrowUp: '上方向键',
  ArrowDown: '下方向键',
  Space: '空格键',
  KeyZ: 'Z',
  KeyC: 'C',
  KeyP: 'P',
  KeyX: 'X',
  KeyA: 'A',
  KeyS: 'S',
  KeyD: 'D',
  KeyW: 'W',
  ShiftLeft: '左Shift',
  ShiftRight: '右Shift',
  Enter: 'Enter'
};

export const FORBIDDEN_KEYS = [
  'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
  'MetaLeft', 'MetaRight', 'Tab', 'Escape', 'F1', 'F2',
  'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
];

export class KeyBindingManager {
  constructor() {
    this.bindings = { ...DEFAULT_KEY_BINDINGS };
    this.editingBinding = null;
    this.gameInputEnabled = true;
    this.listeners = new Map();
    this._loadFromStorage();
  }

  _loadFromStorage() {
    try {
      const saved = localStorage.getItem('tetris_key_bindings');
      if (saved) {
        this.bindings = { ...DEFAULT_KEY_BINDINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load key bindings:', e);
    }
  }

  _saveToStorage() {
    try {
      localStorage.setItem('tetris_key_bindings', JSON.stringify(this.bindings));
    } catch (e) {
      console.warn('Failed to save key bindings:', e);
    }
  }

  getKeyDisplayName(code) {
    return KEY_DISPLAY_NAMES[code] || code.replace('Key', '');
  }

  getBinding(action) {
    return this.bindings[action];
  }

  getAllBindings() {
    return { ...this.bindings };
  }

  isKeyInUse(code, excludeAction = null) {
    return Object.entries(this.bindings).some(([action, boundCode]) => {
      return action !== excludeAction && boundCode === code;
    });
  }

  isForbiddenKey(code) {
    return FORBIDDEN_KEYS.includes(code);
  }

  setBinding(action, code) {
    if (this.isForbiddenKey(code)) {
      Toast.error('此按键不可用，请选择其他按键');
      return false;
    }

    if (this.isKeyInUse(code, action)) {
      const existingAction = Object.entries(this.bindings).find(
        ([a, c]) => c === code
      )[0];
      Toast.error(`此按键已绑定到 ${existingAction}`);
      return false;
    }

    this.bindings[action] = code;
    this._saveToStorage();
    return true;
  }

  resetToDefaults() {
    this.bindings = { ...DEFAULT_KEY_BINDINGS };
    this._saveToStorage();
  }

  startEditing(action, inputElement) {
    this.editingBinding = action;
    inputElement.value = '请按任意键...';
    inputElement.style.backgroundColor = '#fff3e0';
    inputElement.focus();

    const keyHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        this.cancelEditing(inputElement);
        return;
      }

      const success = this.setBinding(action, e.code);
      if (success) {
        inputElement.value = this.getKeyDisplayName(e.code);
        Toast.success('按键绑定成功');
      }

      this.finishEditing(inputElement);
    };

    const blurHandler = () => {
      this.finishEditing(inputElement);
    };

    inputElement._keyHandler = keyHandler;
    inputElement._blurHandler = blurHandler;

    window.addEventListener('keydown', keyHandler, true);
    inputElement.addEventListener('blur', blurHandler);
  }

  cancelEditing(inputElement) {
    const action = this.editingBinding;
    inputElement.value = this.getKeyDisplayName(this.bindings[action]);
    this.finishEditing(inputElement);
  }

  finishEditing(inputElement) {
    if (inputElement._keyHandler) {
      window.removeEventListener('keydown', inputElement._keyHandler, true);
      inputElement.removeEventListener('blur', inputElement._blurHandler);
      delete inputElement._keyHandler;
      delete inputElement._blurHandler;
    }

    inputElement.style.backgroundColor = '';
    this.editingBinding = null;
  }

  disableGameInput() {
    this.gameInputEnabled = false;
  }

  enableGameInput() {
    this.gameInputEnabled = true;
  }

  shouldHandleGameInput(e) {
    if (!this.gameInputEnabled) return false;
    
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return false;
    }

    if (this.editingBinding) {
      return false;
    }

    return true;
  }

  getActionForKey(code) {
    return Object.entries(this.bindings).find(
      ([action, boundCode]) => boundCode === code
    )?.[0];
  }
}

export default new KeyBindingManager();
