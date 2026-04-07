import { EventEmitter } from '../utils/EventEmitter.js';
import { SOCKET_OPERATIONS, KEY_BINDING_CONFIG } from '../config/onlineConfig.js';

export class KeyBindingManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.scope = options.scope || document;
    this.bindings = { ...KEY_BINDING_CONFIG.DEFAULT_BINDINGS };
    this.bound = false;
    this.editingBinding = null;
    this.keyMap = this._buildKeyMap();
  }

  _buildKeyMap() {
    const map = new Map();
    Object.entries(this.bindings).forEach(([operation, key]) => {
      map.set(key, operation);
    });
    return map;
  }

  bind() {
    if (this.bound) return;

    this._handleKeyDown = this._handleKeyDown.bind(this);
    this.scope.addEventListener('keydown', this._handleKeyDown);
    this.bound = true;
  }

  unbind() {
    if (!this.bound) return;

    this.scope.removeEventListener('keydown', this._handleKeyDown);
    this.bound = false;
    this.editingBinding = null;
  }

  _handleKeyDown(e) {
    if (this.editingBinding) {
      e.preventDefault();
      this._completeEdit(e.key);
      return;
    }

    const operation = this.keyMap.get(e.key);
    if (operation) {
      e.preventDefault();
      this.emit(operation);
    }
  }

  startEdit(operation) {
    if (!KEY_BINDING_CONFIG.EDITABLE_KEYS.includes(operation)) {
      return false;
    }
    this.editingBinding = operation;
    this.emit('editStart', operation);
    return true;
  }

  _completeEdit(key) {
    if (!this.editingBinding) return;

    const duplicate = [...this.keyMap.entries()].find(([k, op]) =>
      k === key && op !== this.editingBinding
    );

    if (duplicate) {
      this.emit('editError', { key, message: '该按键已被占用' });
      this.editingBinding = null;
      return;
    }

    const oldKey = this.bindings[this.editingBinding];
    this.keyMap.delete(oldKey);

    this.bindings[this.editingBinding] = key;
    this.keyMap.set(key, this.editingBinding);

    const operation = this.editingBinding;
    this.editingBinding = null;

    this.emit('bindingChanged', { operation, key, oldKey });
  }

  cancelEdit() {
    this.editingBinding = null;
    this.emit('editCancel');
  }

  getBinding(operation) {
    return this.bindings[operation];
  }

  getAllBindings() {
    return { ...this.bindings };
  }

  isEditing() {
    return this.editingBinding !== null;
  }

  resetToDefault() {
    this.bindings = { ...KEY_BINDING_CONFIG.DEFAULT_BINDINGS };
    this.keyMap = this._buildKeyMap();
    this.emit('reset');
  }

  destroy() {
    this.unbind();
    this.removeAllListeners();
  }
}

export default KeyBindingManager;
