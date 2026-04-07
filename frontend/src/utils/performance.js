export function throttle(fn, delay = 16) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

export function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export class FPSMeter {
  constructor() {
    this.frames = [];
    this.lastTime = performance.now();
  }

  tick() {
    const now = performance.now();
    this.frames.push(now - this.lastTime);
    this.lastTime = now;
    if (this.frames.length > 60) this.frames.shift();
  }

  getFPS() {
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    return Math.round(1000 / avg);
  }
}
