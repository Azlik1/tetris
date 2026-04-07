import { STYLES, TETROMINOS } from '../config/tetrisConfig.js';

export class TetrisRenderer {
  constructor(options = {}) {
    this.cellSize = options.cellSize || 30;
    this.styles = { ...STYLES, ...options.styles };

    this.canvases = {};
    this.contexts = {};
    this.elements = {};

    this.lastBoardState = null;
  }

  initCanvases(canvasIds) {
    Object.entries(canvasIds).forEach(([key, id]) => {
      const canvas = document.getElementById(id);
      if (canvas) {
        this.canvases[key] = canvas;
        this.contexts[key] = canvas.getContext('2d');
      }
    });
  }

  initDOMElements(elementIds) {
    Object.entries(elementIds).forEach(([key, id]) => {
      const element = document.getElementById(id);
      if (element) {
        this.elements[key] = element;
      }
    });
  }

  renderBoard(gameBoard, currentPiece, ghostY = 0) {
    const ctx = this.contexts.main;
    if (!ctx) return;

    const dirtyCells = gameBoard.getDirtyCells();
    const board = gameBoard.getState();

    if (!this.lastBoardState || dirtyCells.length > gameBoard.cols * 5) {
      this._clearCanvas('main');
      this._drawGrid(ctx, gameBoard.rows, gameBoard.cols);

      for (let y = 0; y < gameBoard.rows; y++) {
        for (let x = 0; x < gameBoard.cols; x++) {
          if (board[y][x]) {
            this._drawCell(ctx, x, y, this._getColor(board[y][x]));
          }
        }
      }
    } else {
      dirtyCells.forEach(({ x, y }) => {
        this._clearCell(ctx, x, y);
        if (board[y][x]) {
          this._drawCell(ctx, x, y, this._getColor(board[y][x]));
        }
      });
    }

    if (currentPiece) {
      this._drawGhost(ctx, currentPiece, ghostY);
      this._drawPiece(ctx, currentPiece);
    }

    this.lastBoardState = board;
    gameBoard.clearDirty();
  }

  renderNextPiece(nextPiece) {
    const ctx = this.contexts.next;
    if (!ctx || !nextPiece) return;

    this._clearCanvas('next');

    const centerX = (ctx.canvas.width / this.cellSize - nextPiece.getWidth()) / 2;
    const centerY = (ctx.canvas.height / this.cellSize - nextPiece.getHeight()) / 2;

    this._drawPieceOnCanvas(ctx, nextPiece, centerX, centerY);
  }

  renderHoldPiece(holdPiece, canHold = true) {
    const ctx = this.contexts.hold;
    if (!ctx) return;

    this._clearCanvas('hold');

    if (!holdPiece) return;

    const centerX = (ctx.canvas.width / this.cellSize - holdPiece.getWidth()) / 2;
    const centerY = (ctx.canvas.height / this.cellSize - holdPiece.getHeight()) / 2;

    if (!canHold) {
      ctx.globalAlpha = 0.5;
    }

    this._drawPieceOnCanvas(ctx, holdPiece, centerX, centerY);
    ctx.globalAlpha = 1;
  }

  updateStats(stats) {
    if (this.elements.score) {
      this.elements.score.textContent = stats.score.toLocaleString();
    }
    if (this.elements.lines) {
      this.elements.lines.textContent = stats.lines;
    }
    if (this.elements.level) {
      this.elements.level.textContent = stats.level;
    }
  }

  updateTime(remainingMs) {
    if (this.elements.time) {
      const seconds = Math.ceil(remainingMs / 1000);
      this.elements.time.textContent = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  }

  updateModeInfo(text) {
    if (this.elements.modeInfo) {
      this.elements.modeInfo.textContent = text;
    }
  }

  drawGameOver(canvasKey = 'main', text = '游戏结束') {
    const ctx = this.contexts[canvasKey];
    if (!ctx) return;

    ctx.fillStyle = this.styles.OVERLAY_BG;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = this.styles.TEXT_COLOR;
    ctx.font = this.styles.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, ctx.canvas.width / 2, ctx.canvas.height / 2);
  }

  drawPaused(canvasKey = 'main') {
    const ctx = this.contexts[canvasKey];
    if (!ctx) return;

    ctx.fillStyle = this.styles.OVERLAY_BG;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = this.styles.TEXT_COLOR;
    ctx.font = this.styles.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('已暂停 - 按 P 继续', ctx.canvas.width / 2, ctx.canvas.height / 2);
  }

  clearOverlay(canvasKey = 'main') {
    const ctx = this.contexts[canvasKey];
    if (!ctx) return;
    this.lastBoardState = null;
  }

  _clearCanvas(key) {
    const ctx = this.contexts[key];
    if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = this.styles.CANVAS_BG;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }

  _clearCell(ctx, x, y) {
    const size = this.cellSize;
    ctx.fillStyle = this.styles.CANVAS_BG;
    ctx.fillRect(x * size, y * size, size, size);

    ctx.strokeStyle = this.styles.GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(x * size, y * size, size, size);
  }

  _drawGrid(ctx, rows, cols) {
    ctx.strokeStyle = this.styles.GRID_COLOR;
    ctx.lineWidth = 1;

    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellSize);
      ctx.lineTo(cols * this.cellSize, y * this.cellSize);
      ctx.stroke();
    }

    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellSize, 0);
      ctx.lineTo(x * this.cellSize, rows * this.cellSize);
      ctx.stroke();
    }
  }

  _drawCell(ctx, x, y, color) {
    const size = this.cellSize - 1;
    const offset = 1;

    ctx.fillStyle = color;
    ctx.fillRect(x * this.cellSize + offset, y * this.cellSize + offset, size, size);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * this.cellSize + offset, y * this.cellSize + offset, size, size / 3);
  }

  _drawPiece(ctx, piece) {
    const posX = piece.position.x;
    const posY = piece.position.y;
    this._drawPieceMatrix(ctx, piece.matrix, posX, posY, piece.color);
  }

  _drawPieceOnCanvas(ctx, piece, offsetX, offsetY) {
    this._drawPieceMatrix(ctx, piece.matrix, offsetX, offsetY, piece.color);
  }

  _drawPieceMatrix(ctx, matrix, posX, posY, color) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          this._drawCell(ctx, posX + x, posY + y, color);
        }
      }
    }
  }

  _drawGhost(ctx, piece, ghostY) {
    const posX = piece.position.x;
    const posY = piece.position.y + ghostY;

    ctx.globalAlpha = 0.3;
    this._drawPieceMatrix(ctx, piece.matrix, posX, posY, piece.color);
    ctx.globalAlpha = 1;
  }

  _getColor(value) {
    const types = ['', 'I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    return TETROMINOS[types[value]]?.color || '#666';
  }

  destroy() {
    this.lastBoardState = null;
  }
}

export default TetrisRenderer;
