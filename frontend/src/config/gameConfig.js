export const GAME_CONFIG = {
  COLS: 10,
  ROWS: 20,
  CELL_SIZE: 30,
  
  DIFFICULTY: {
    EASY: { speed: 1000, name: '简单' },
    NORMAL: { speed: 600, name: '中等' },
    HARD: { speed: 300, name: '困难' }
  },

  COLORS: {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000'
  },

  SHAPES: {
    I: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    O: [[1,1], [1,1]],
    T: [[0,1,0], [1,1,1], [0,0,0]],
    S: [[0,1,1], [1,1,0], [0,0,0]],
    Z: [[1,1,0], [0,1,1], [0,0,0]],
    J: [[1,0,0], [1,1,1], [0,0,0]],
    L: [[0,0,1], [1,1,1], [0,0,0]]
  },

  KEY_BINDINGS: {
    MOVE_LEFT: 'ArrowLeft',
    MOVE_RIGHT: 'ArrowRight',
    MOVE_DOWN: 'ArrowDown',
    ROTATE: 'ArrowUp',
    HARD_DROP: 'Space',
    HOLD: 'KeyC',
    PAUSE: 'KeyP'
  }
};

export const calculateResponsiveCellSize = (canvasWidth, canvasHeight) => {
  return Math.floor(Math.min(
    canvasWidth / GAME_CONFIG.COLS,
    canvasHeight / GAME_CONFIG.ROWS
  ));
};
