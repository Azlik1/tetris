export const GAME_MODES = {
  MARATHON: 'MARATHON',
  TIME_ATTACK: 'TIME_ATTACK',
  FORTY_LINES: 'FORTY_LINES'
};

export const GAME_MODE_LABELS = {
  [GAME_MODES.MARATHON]: '马拉松',
  [GAME_MODES.TIME_ATTACK]: '限时挑战',
  [GAME_MODES.FORTY_LINES]: '40行挑战'
};

export const TETROMINOS = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#00f0f0',
    name: 'I'
  },
  O: {
    shape: [
      [2, 2],
      [2, 2]
    ],
    color: '#f0f000',
    name: 'O'
  },
  T: {
    shape: [
      [0, 3, 0],
      [3, 3, 3],
      [0, 0, 0]
    ],
    color: '#a000f0',
    name: 'T'
  },
  S: {
    shape: [
      [0, 4, 4],
      [4, 4, 0],
      [0, 0, 0]
    ],
    color: '#00f000',
    name: 'S'
  },
  Z: {
    shape: [
      [5, 5, 0],
      [0, 5, 5],
      [0, 0, 0]
    ],
    color: '#f00000',
    name: 'Z'
  },
  J: {
    shape: [
      [6, 0, 0],
      [6, 6, 6],
      [0, 0, 0]
    ],
    color: '#0000f0',
    name: 'J'
  },
  L: {
    shape: [
      [0, 0, 7],
      [7, 7, 7],
      [0, 0, 0]
    ],
    color: '#f0a000',
    name: 'L'
  }
};

export const TETROMINO_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const WALL_KICK_DATA = {
  JLSTZ: [
    [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]
  ],
  I: [
    [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]
  ]
};

export const SCORE_TABLE = [0, 100, 300, 500, 800];

export const DROP_INTERVALS = {
  1: 1000,
  2: 900,
  3: 800,
  4: 700,
  5: 600,
  6: 500,
  7: 400,
  8: 300,
  9: 200,
  10: 100,
  11: 80,
  12: 60,
  13: 50,
  14: 40,
  15: 30
};

export const TIME_ATTACK_DURATION = 120000;
export const FORTY_LINES_TARGET = 40;

export const KEY_BINDINGS = {
  MOVE_LEFT: ['ArrowLeft', 'a', 'A'],
  MOVE_RIGHT: ['ArrowRight', 'd', 'D'],
  ROTATE_RIGHT: ['ArrowUp', 'x', 'X'],
  ROTATE_LEFT: ['Control', 'z', 'Z'],
  SOFT_DROP: ['ArrowDown', 's', 'S'],
  HARD_DROP: [' '],
  HOLD: ['Shift', 'c', 'C'],
  PAUSE: ['Escape', 'p', 'P']
};

export const DOM_IDS = {
  CANVAS: 'tetrisCanvas',
  NEXT_CANVAS: 'nextCanvas',
  HOLD_CANVAS: 'holdCanvas',
  SCORE: 'scoreValue',
  LINES: 'linesValue',
  LEVEL: 'levelValue',
  TIME: 'timeValue',
  MODE_INFO: 'gameModeInfo',
  BTN_LEFT: 'btnLeft',
  BTN_RIGHT: 'btnRight',
  BTN_ROTATE: 'btnRotate',
  BTN_DROP: 'btnDrop',
  BTN_HARD_DROP: 'btnHardDrop'
};

export const STYLES = {
  OVERLAY_BG: 'rgba(0, 0, 0, 0.7)',
  FONT: '24px Arial',
  FONT_SMALL: '16px Arial',
  TEXT_COLOR: '#ffffff',
  CANVAS_BG: '#1a1a1a',
  GRID_COLOR: 'rgba(255, 255, 255, 0.1)'
};

export function getDropInterval(level) {
  const clampedLevel = Math.min(Math.max(level, 1), 15);
  return DROP_INTERVALS[clampedLevel];
}

export function calculateLevel(lines) {
  return Math.floor(lines / 10) + 1;
}

export function calculateScore(linesCleared, level, isTSpin = false) {
  let base = SCORE_TABLE[Math.min(linesCleared, 4)];
  if (isTSpin) base *= 1.5;
  return Math.floor(base * level);
}

export function isValidGameMode(mode) {
  return Object.values(GAME_MODES).includes(mode);
}

export function isValidRotation(direction) {
  return direction === 'right' || direction === 'left';
}
