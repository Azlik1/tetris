import { checkBoundary } from '../utils/validators.js';

export class GameBoard {
  constructor(rows = 20, cols = 10) {
    this.rows = Math.max(4, rows);
    this.cols = Math.max(4, cols);
    this.dirtyCells = new Set();
    this.reset();
  }

  reset() {
    this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
    this.markAllDirty();
  }

  get(x, y) {
    if (y < 0 || y >= this.rows || x < 0 || x >= this.cols) {
      return -1;
    }
    return this.board[y][x];
  }

  set(x, y, value) {
    if (y >= 0 && y < this.rows && x >= 0 && x < this.cols) {
      this.board[y][x] = value;
      this.markDirty(x, y);
    }
  }

  markDirty(x, y) {
    this.dirtyCells.add(`${x},${y}`);
  }

  markAllDirty() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.dirtyCells.add(`${x},${y}`);
      }
    }
  }

  clearDirty() {
    this.dirtyCells.clear();
  }

  getDirtyCells() {
    return Array.from(this.dirtyCells).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
  }

  /**
   * 碰撞检测
   * @param {Tetromino} tetromino - 方块
   * @param {Object} offset - 位置偏移 {x, y}
   */
  checkCollision(tetromino, offset = { x: 0, y: 0 }) {
    const posX = tetromino.position.x + offset.x;
    const posY = tetromino.position.y + offset.y;

    for (let y = 0; y < tetromino.matrix.length; y++) {
      for (let x = 0; x < tetromino.matrix[y].length; x++) {
        if (tetromino.matrix[y][x]) {
          const boardX = posX + x;
          const boardY = posY + y;

          if (boardX < 0 || boardX >= this.cols) {
            return true;
          }
          if (boardY >= this.rows) {
            return true;
          }
          if (boardY >= 0 && this.board[boardY][boardX]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * 锁定方块到游戏板
   * @param {Tetromino} tetromino - 方块
   */
  lockPiece(tetromino) {
    const posX = tetromino.position.x;
    const posY = tetromino.position.y;

    for (let y = 0; y < tetromino.matrix.length; y++) {
      for (let x = 0; x < tetromino.matrix[y].length; x++) {
        if (tetromino.matrix[y][x]) {
          const boardX = posX + x;
          const boardY = posY + y;
          const boundary = checkBoundary(boardX, boardY, this.cols, this.rows);
          if (boundary.valid) {
            this.board[boardY][boardX] = tetromino.matrix[y][x];
            this.markDirty(boardX, boardY);
          }
        }
      }
    }
  }

  /**
   * 消除已填满的行
   * @returns {number} 消除的行数
   */
  clearLines() {
    let linesCleared = 0;

    for (let y = this.rows - 1; y >= 0; y--) {
      if (this.board[y].every(cell => cell !== 0)) {
        this.board.splice(y, 1);
        this.board.unshift(Array(this.cols).fill(0));
        linesCleared++;
        y++;
      }
    }

    if (linesCleared > 0) {
      this.markAllDirty();
    }

    return linesCleared;
  }

  /**
   * 获取幽灵方块位置
   * @param {Tetromino} tetromino - 方块
   */
  getGhostPosition(tetromino) {
    let ghostY = 0;
    while (!this.checkCollision(tetromino, { x: 0, y: ghostY + 1 })) {
      ghostY++;
    }
    return ghostY;
  }

  /**
   * 获取游戏板状态副本
   */
  getState() {
    return JSON.parse(JSON.stringify(this.board));
  }

  /**
   * 导出游戏板（用于AI计算）
   */
  exportForAI() {
    return this.getState();
  }
}

export default GameBoard;
