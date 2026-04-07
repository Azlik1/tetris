export const SOCKET_OPERATIONS = {
  MOVE_LEFT: 'moveLeft',
  MOVE_RIGHT: 'moveRight',
  ROTATE_LEFT: 'rotateLeft',
  ROTATE_RIGHT: 'rotateRight',
  SOFT_DROP: 'softDrop',
  HARD_DROP: 'hardDrop',
  HOLD: 'hold',
  TOGGLE_PAUSE: 'togglePause',
  START_EDIT_KEY_BINDING: 'startEditKeyBinding',
  COMPLETE_EDIT_KEY_BINDING: 'completeEditKeyBinding'
};

export const SOCKET_ONLINE_EVENTS = {
  GAME_INIT: 'game_init',
  GAME_INIT_RESPONSE: 'game_init_response',
  GAME_START: 'game_start',
  GAME_STARTED: 'game_started',
  GAME_OPERATE: 'game_operate',
  GAME_OPERATE_RESPONSE: 'game_operate_response',
  GAME_STATE_UPDATE: 'game_state_update',
  GAME_OVER: 'game_over',
  GAME_TOGGLE_PAUSE: 'game_toggle_pause',
  GAME_PAUSED_UPDATED: 'game_paused_updated',
  GAME_COMPLETE_EDIT_KEYBINDING: 'game_complete_keybinding_edit'
};

export const GAME_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended'
};

export const ONLINE_GAME_MODES = {
  MARATHON: 'MARATHON',
  BATTLE: 'BATTLE',
  TIME_ATTACK: 'TIME_ATTACK',
  FORTY_LINES: 'FORTY_LINES'
};

export const RENDER_CONFIG = {
  CANVAS_COLS: 10,
  CANVAS_ROWS: 20,
  DEFAULT_CELL_SIZE: 30,
  MIN_CELL_SIZE: 12,
  RENDER_THROTTLE_MS: 16,
  TOAST_DURATION_MS: 3000
};

export const NETWORK_CONFIG = {
  OPERATION_TIMEOUT_MS: 10000,
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY_BASE_MS: 1000,
  OPERATION_RETRY_COUNT: 2
};

export const DOM_CONFIG = {
  GAME_AREA_ID: 'gameArea',
  PLAYER_BOARD_CLASS: 'player-board',
  CANVAS_CLASS: 'game-canvas',
  SCORE_ELEMENT_SUFFIX: '-score',
  NAME_ELEMENT_SUFFIX: '-name'
};

export const STYLES_CONFIG = {
  BOARD_CONTAINER: {
    display: 'inline-block',
    margin: '10px',
    padding: '10px',
    background: '#f5f5f5',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  SELF_BOARD_BORDER: '3px solid #2196F3',
  OPPONENT_BOARD_BORDER: '2px solid #9E9E9E',
  CANVAS_BG: '#1a1a1a',
  TOAST: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    borderRadius: '4px',
    fontSize: '16px',
    zIndex: 1000,
    success: { background: '#e3f2fd', color: '#1565c0' },
    error: { background: '#ffebee', color: '#c62828' },
    warning: { background: '#fff3e0', color: '#ef6c00' },
    info: { background: '#e3f2fd', color: '#1565c0' }
  }
};

export const KEY_BINDING_CONFIG = {
  DEFAULT_BINDINGS: {
    [SOCKET_OPERATIONS.MOVE_LEFT]: 'ArrowLeft',
    [SOCKET_OPERATIONS.MOVE_RIGHT]: 'ArrowRight',
    [SOCKET_OPERATIONS.ROTATE_RIGHT]: 'ArrowUp',
    [SOCKET_OPERATIONS.ROTATE_LEFT]: 'Control',
    [SOCKET_OPERATIONS.SOFT_DROP]: 'ArrowDown',
    [SOCKET_OPERATIONS.HARD_DROP]: ' ',
    [SOCKET_OPERATIONS.HOLD]: 'Shift'
  },
  EDITABLE_KEYS: [SOCKET_OPERATIONS.MOVE_LEFT, SOCKET_OPERATIONS.MOVE_RIGHT, SOCKET_OPERATIONS.ROTATE_RIGHT, SOCKET_OPERATIONS.ROTATE_LEFT, SOCKET_OPERATIONS.SOFT_DROP, SOCKET_OPERATIONS.HARD_DROP, SOCKET_OPERATIONS.HOLD]
};

export const COLORS = [
  '#000000',
  '#00f0f0',
  '#f0f000',
  '#a000f0',
  '#00f000',
  '#f00000',
  '#0000f0',
  '#f0a000'
];

export function calculateCellSize(containerWidth, containerHeight, playerCount, cols = 10, rows = 20) {
  const boardsPerRow = playerCount <= 2 ? playerCount : Math.ceil(Math.sqrt(playerCount));
  const availableWidth = containerWidth / boardsPerRow - 40;
  const availableHeight = containerHeight / Math.ceil(playerCount / boardsPerRow) - 60;

  const cellByWidth = Math.floor(availableWidth / cols);
  const cellByHeight = Math.floor(availableHeight / rows);

  return Math.max(RENDER_CONFIG.MIN_CELL_SIZE, Math.min(cellByWidth, cellByHeight, RENDER_CONFIG.DEFAULT_CELL_SIZE));
}

export default {
  SOCKET_OPERATIONS,
  SOCKET_ONLINE_EVENTS,
  GAME_STATUS,
  RENDER_CONFIG,
  NETWORK_CONFIG,
  DOM_CONFIG,
  STYLES_CONFIG,
  KEY_BINDING_CONFIG,
  COLORS,
  calculateCellSize
};
