import { RENDER_CONFIG, DOM_CONFIG, STYLES_CONFIG, COLORS, calculateCellSize } from '../config/onlineConfig.js';

export class MultiplayerCanvasManager {
  constructor(containerId = DOM_CONFIG.GAME_AREA_ID) {
    this.container = document.getElementById(containerId);
    this.canvasMap = new Map();
    this.ctxMap = new Map();
    this.dirtyCellsMap = new Map();
    this.lastBoardState = new Map();
    this.cellSize = RENDER_CONFIG.DEFAULT_CELL_SIZE;
  }

  init(playerIds, selfId) {
    if (!this.container) {
      console.warn('Game container not found');
      return;
    }

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      console.warn('Invalid playerIds:', playerIds);
      return;
    }

    this._clearContainer();
    this._calculateCellSize(playerIds.length);

    playerIds.forEach(playerId => {
      if (playerId) {
        this._createPlayerBoard(playerId, playerId === selfId);
        this.dirtyCellsMap.set(playerId, new Set());
      }
    });
  }

  renderAll(gameState) {
    if (!gameState?.players) return;

    Object.values(gameState.players).forEach(player => {
      this.renderPlayer(player);
    });
  }

  renderPlayer(playerState) {
    if (!playerState) return;

    const { playerId, board, score = 0, lines = 0, level = 1 } = playerState;
    const ctx = this.ctxMap.get(playerId);

    if (!ctx) return;
    if (!board || !Array.isArray(board)) {
      console.warn('Invalid board for player:', playerId);
      return;
    }

    const dirtyCells = this.dirtyCellsMap.get(playerId);
    const lastState = this.lastBoardState.get(playerId) || [];

    if (!lastState.length || dirtyCells.size > 50) {
      this._fullRenderPlayer(ctx, playerState);
    } else {
      this._dirtyRenderPlayer(ctx, board, lastState, dirtyCells);
    }

    this.lastBoardState.set(playerId, JSON.parse(JSON.stringify(board)));
    dirtyCells.clear();
  }

  _fullRenderPlayer(ctx, playerState) {
    const { board, score, lines, level } = playerState;
    const { cellSize } = this;

    this._clearCanvas(ctx);
    this._drawGrid(ctx);

    board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          this._drawCell(ctx, x, y, COLORS[cell]);
        }
      });
    });

    this._updatePlayerStats(playerState.playerId, { score, lines, level });
  }

  _dirtyRenderPlayer(ctx, board, lastState, dirtyCells) {
    const { cellSize } = this;

    dirtyCells.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      const cell = board[y]?.[x];
      const lastCell = lastState[y]?.[x];

      if (cell !== lastCell) {
        this._clearCell(ctx, x, y);
        if (cell) {
          this._drawCell(ctx, x, y, COLORS[cell]);
        }
      }
    });
  }

  markCellDirty(playerId, x, y) {
    const dirtyCells = this.dirtyCellsMap.get(playerId);
    if (dirtyCells) {
      dirtyCells.add(`${x},${y}`);
    }
  }

  markAllDirty(playerId) {
    const dirtyCells = this.dirtyCellsMap.get(playerId);
    if (dirtyCells) {
      for (let y = 0; y < RENDER_CONFIG.CANVAS_ROWS; y++) {
        for (let x = 0; x < RENDER_CONFIG.CANVAS_COLS; x++) {
          dirtyCells.add(`${x},${y}`);
        }
      }
    }
  }

  renderGameOver(callback) {
    this.canvasMap.forEach((canvas, playerId) => {
      const parent = canvas.parentElement;
      const existing = parent.querySelector('.game-over-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.className = 'game-over-overlay';
      Object.assign(overlay.style, {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: STYLES_CONFIG.TOAST.error.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: STYLES_CONFIG.TOAST.error.color,
        fontSize: '18px',
        fontWeight: 'bold',
        borderRadius: '8px'
      });
      overlay.textContent = '游戏结束';
      parent.style.position = 'relative';
      parent.appendChild(overlay);
    });

    if (callback) callback();
  }

  renderPaused(isPaused) {
    this.canvasMap.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', canvas.width / 2, canvas.height / 2);
      }
    });
  }

  clearPaused() {
    this.canvasMap.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      for (const playerId of this.canvasMap.keys()) {
        this.markAllDirty(playerId);
      }
    });
  }

  destroy() {
    this.canvasMap.forEach((canvas) => {
      canvas.width = canvas.width;
    });
    this.canvasMap.clear();
    this.ctxMap.clear();
    this.dirtyCellsMap.clear();
    this.lastBoardState.clear();
    this._clearContainer();
  }

  _createPlayerBoard(playerId, isSelf) {
    const { cellSize } = this;
    const cols = RENDER_CONFIG.CANVAS_COLS;
    const rows = RENDER_CONFIG.CANVAS_ROWS;

    const container = document.createElement('div');
    container.className = DOM_CONFIG.PLAYER_BOARD_CLASS;
    container.id = `board-${playerId}`;
    Object.assign(container.style, STYLES_CONFIG.BOARD_CONTAINER);
    container.style.border = isSelf
      ? STYLES_CONFIG.SELF_BOARD_BORDER
      : STYLES_CONFIG.OPPONENT_BOARD_BORDER;

    const nameDiv = document.createElement('div');
    nameDiv.id = `player-${playerId}${DOM_CONFIG.NAME_ELEMENT_SUFFIX}`;
    nameDiv.style.textAlign = 'center';
    nameDiv.style.marginBottom = '5px';
    nameDiv.style.fontWeight = isSelf ? 'bold' : 'normal';
    nameDiv.textContent = isSelf ? '你' : `玩家 ${playerId.slice(0, 4)}`;

    const canvas = document.createElement('canvas');
    canvas.id = `canvas-${playerId}`;
    canvas.className = DOM_CONFIG.CANVAS_CLASS;
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    const scoreDiv = document.createElement('div');
    scoreDiv.id = `player-${playerId}${DOM_CONFIG.SCORE_ELEMENT_SUFFIX}`;
    scoreDiv.style.textAlign = 'center';
    scoreDiv.style.marginTop = '5px';
    scoreDiv.style.fontSize = '14px';

    container.appendChild(nameDiv);
    container.appendChild(canvas);
    container.appendChild(scoreDiv);
    this.container.appendChild(container);

    this.canvasMap.set(playerId, canvas);
    this.ctxMap.set(playerId, canvas.getContext('2d'));
  }

  _clearCanvas(ctx) {
    ctx.fillStyle = STYLES_CONFIG.CANVAS_BG;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  _clearCell(ctx, x, y) {
    const size = this.cellSize;
    ctx.fillStyle = STYLES_CONFIG.CANVAS_BG;
    ctx.fillRect(x * size, y * size, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.strokeRect(x * size, y * size, size, size);
  }

  _drawGrid(ctx) {
    const { cellSize } = this;
    const cols = RENDER_CONFIG.CANVAS_COLS;
    const rows = RENDER_CONFIG.CANVAS_ROWS;

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;

    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(cols * cellSize, y * cellSize);
      ctx.stroke();
    }

    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, rows * cellSize);
      ctx.stroke();
    }
  }

  _drawCell(ctx, x, y, color) {
    const size = this.cellSize - 1;
    ctx.fillStyle = color;
    ctx.fillRect(x * this.cellSize, y * this.cellSize, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x * this.cellSize, y * this.cellSize, size, size / 3);
  }

  _updatePlayerStats(playerId, { score, lines, level }) {
    const scoreEl = document.getElementById(`player-${playerId}${DOM_CONFIG.SCORE_ELEMENT_SUFFIX}`);
    if (scoreEl) {
      scoreEl.textContent = `${score}分 | Lv.${level} | ${lines}行`;
    }
  }

  _calculateCellSize(playerCount) {
    if (this.container) {
      this.cellSize = calculateCellSize(
        this.container.clientWidth,
        this.container.clientHeight,
        playerCount
      );
    }
  }

  _clearContainer() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  getCanvas(playerId) {
    return this.canvasMap.get(playerId);
  }

  getContext(playerId) {
    return this.ctxMap.get(playerId);
  }
}

export default MultiplayerCanvasManager;
