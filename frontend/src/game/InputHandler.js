import { EventEmitter } from '../utils/EventEmitter.js';
import { KEY_BINDINGS } from '../config/tetrisConfig.js';
import { throttle } from '../utils/performance.js';

export class InputHandler extends EventEmitter {
  constructor() {
    super();
    this.bound = false;
    this.element = null;
    this.handlers = new Map();
  }

  bind(element = document) {
    if (this.bound) return;

    this.element = element;
    this.bound = true;

    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);

    element.addEventListener('keydown', this._handleKeyDown);
    element.addEventListener('keyup', this._handleKeyUp);
  }

  unbind() {
    if (!this.bound) return;

    this.element.removeEventListener('keydown', this._handleKeyDown);
    this.element.removeEventListener('keyup', this._handleKeyUp);

    this.bound = false;
    this.handlers.clear();
  }

  bindButtons(buttonMap) {
    Object.entries(buttonMap).forEach(([action, elementId]) => {
      const element = document.getElementById(elementId);
      if (element) {
        const handler = throttle(() => {
          this.emit(action);
        }, 50);

        element.addEventListener('click', handler);
        this.handlers.set(`${action}-${elementId}`, { element, handler });
      }
    });
  }

  unbindButtons() {
    this.handlers.forEach(({ element, handler }, key) => {
      element.removeEventListener('click', handler);
    });
    this.handlers.clear();
  }

  _handleKeyDown(e) {
    const action = this._keyToAction(e.key);

    if (action) {
      e.preventDefault();
      this.emit(action);
    }
  }

  _handleKeyUp(e) {
    const action = this._keyToAction(e.key);

    if (action) {
      this.emit(`${action}Up`);
    }
  }

  _keyToAction(key) {
    if (KEY_BINDINGS.MOVE_LEFT.includes(key)) return 'moveLeft';
    if (KEY_BINDINGS.MOVE_RIGHT.includes(key)) return 'moveRight';
    if (KEY_BINDINGS.ROTATE_RIGHT.includes(key)) return 'rotateRight';
    if (KEY_BINDINGS.ROTATE_LEFT.includes(key)) return 'rotateLeft';
    if (KEY_BINDINGS.SOFT_DROP.includes(key)) return 'softDrop';
    if (KEY_BINDINGS.HARD_DROP.includes(key)) return 'hardDrop';
    if (KEY_BINDINGS.HOLD.includes(key)) return 'hold';
    if (KEY_BINDINGS.PAUSE.includes(key)) return 'togglePause';

    return null;
  }

  destroy() {
    this.unbind();
    this.unbindButtons();
    this.removeAllListeners();
  }
}

export default InputHandler;
