import { GAME_CONFIG, calculateResponsiveCellSize } from '../config/gameConfig.js';

export class GameRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.cellSize = GAME_CONFIG.CELL_SIZE;
    this.overlayElement = null;
  }

  resize() {
    this.cellSize = calculateResponsiveCellSize(
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBoard(board, offsetX = 0, offsetY = 0) {
    const { cellSize } = this;
    
    board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          this.drawCell(
            offsetX + x * cellSize,
            offsetY + y * cellSize,
            GAME_CONFIG.COLORS[cell] || '#666'
          );
        }
      });
    });

    this.drawGrid(offsetX, offsetY, board.length, board[0]?.length || 10);
  }

  drawCell(x, y, color) {
    const { cellSize } = this;
    const padding = 1;
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2);
    
    this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2);
  }

  drawGrid(offsetX, offsetY, rows, cols) {
    const { cellSize } = this;
    
    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.lineWidth = 1;
    
    for (let x = 0; x <= cols; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX + x * cellSize, offsetY);
      this.ctx.lineTo(offsetX + x * cellSize, offsetY + rows * cellSize);
      this.ctx.stroke();
    }
    
    for (let y = 0; y <= rows; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, offsetY + y * cellSize);
      this.ctx.lineTo(offsetX + cols * cellSize, offsetY + y * cellSize);
      this.ctx.stroke();
    }
  }

  drawPiece(piece, x, y) {
    const { cellSize } = this;
    const shape = GAME_CONFIG.SHAPES[piece.type] || piece.shape;
    const color = GAME_CONFIG.COLORS[piece.type] || piece.color;
    
    shape.forEach((row, rowY) => {
      row.forEach((cell, colX) => {
        if (cell) {
          this.drawCell(
            (x + colX) * cellSize,
            (y + rowY) * cellSize,
            color
          );
        }
      });
    });
  }

  drawGhostPiece(piece, x, y) {
    const { cellSize } = this;
    const shape = GAME_CONFIG.SHAPES[piece.type] || piece.shape;
    
    this.ctx.globalAlpha = 0.3;
    shape.forEach((row, rowY) => {
      row.forEach((cell, colX) => {
        if (cell) {
          this.drawCell(
            (x + colX) * cellSize,
            (y + rowY) * cellSize,
            '#888'
          );
        }
      });
    });
    this.ctx.globalAlpha = 1;
  }

  showPaused() {
    this.hidePaused();
    
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'pause-overlay';
    this.overlayElement.innerHTML = '<h2>游戏暂停</h2><p>按 P 继续</p>';
    this.overlayElement.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      z-index: 100;
    `;
    
    this.canvas.parentElement.style.position = 'relative';
    this.canvas.parentElement.appendChild(this.overlayElement);
  }

  hidePaused() {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }

  showGameOver(score) {
    this.hideGameOver();
    
    const overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';
    overlay.innerHTML = `
      <h2>游戏结束</h2>
      <p>最终得分: ${score}</p>
      <button onclick="this.parentElement.remove()">关闭</button>
    `;
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      z-index: 100;
    `;
    
    this.canvas.parentElement.style.position = 'relative';
    this.canvas.parentElement.appendChild(overlay);
  }

  hideGameOver() {
    const existing = this.canvas.parentElement?.querySelector('.game-over-overlay');
    if (existing) existing.remove();
  }

  destroy() {
    this.hidePaused();
    this.hideGameOver();
  }
}
