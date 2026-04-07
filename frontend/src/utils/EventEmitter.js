export class EventEmitter {
  constructor() {
    this.events = new Map();
    this.onceEvents = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(listener);
    return () => this.off(event, listener);
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener.apply(this, args);
    };
    wrapper.listener = listener;
    return this.on(event, wrapper);
  }

  off(event, listener) {
    if (!this.events.has(event)) return;
    
    const listeners = this.events.get(event);
    const index = listeners.findIndex(l => l === listener || l.listener === listener);
    
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  emit(event, ...args) {
    if (!this.events.has(event)) return;
    
    const listeners = [...this.events.get(event)];
    listeners.forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (e) {
        console.error(`Event [${event}] listener error:`, e);
      }
    });
  }

  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }
}

export default new EventEmitter();
