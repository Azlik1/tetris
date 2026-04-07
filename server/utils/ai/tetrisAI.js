class TetrisAI {
  constructor() {
    // 经典Pierre Dellacherie算法的权重
    this.weights = {
      height: -4.500158825082766,
      lines: 3.4181268101392694,
      holes: -3.2178882868487753,
      bumpiness: -1.825888274609375,
      cleared: 1.0
    };
    
    // 方块定义
    this.tetrominos = {
      I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
      L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
      O: [[1, 1], [1, 1]],
      S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
      T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
      Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
    };
  }

  // 旋转矩阵
  rotateMatrix(matrix) {
    const N = matrix.length;
    const rotated = Array(N).fill().map(() => Array(N).fill(0));
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        rotated[x][N - 1 - y] = matrix[y][x];
      }
    }
    return rotated;
  }

  // 获取方块的所有旋转状态
  getPieceRotations(piece) {
    const rotations = [piece];
    let current = piece;
    
    // 对于O型方块，只有一种旋转状态
    if (piece.length === 2 && piece[0].length === 2) {
      return rotations;
    }
    
    // 其他方块有4种旋转状态
    for (let i = 0; i < 3; i++) {
      current = this.rotateMatrix(current);
      rotations.push(current);
    }
    
    return rotations;
  }

  // 检查碰撞
  checkCollision(piece, offsetX, offsetY, board) {
    const rows = board.length;
    const cols = board[0].length;
    
    for (let y = 0; y < piece.length; y++) {
      for (let x = 0; x < piece[y].length; x++) {
        if (piece[y][x]) {
          const newX = offsetX + x;
          const newY = offsetY + y;
          
          // 检查边界
          if (newX < 0 || newX >= cols || newY >= rows) {
            return true;
          }
          // 检查与已落地方块的碰撞
          if (newY >= 0 && board[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // 计算最高高度
  getMaxHeight(board) {
    for (let y = 0; y < board.length; y++) {
      if (board[y].some(cell => cell)) {
        return board.length - y;
      }
    }
    return 0;
  }

  // 计算所有列的高度
  getColumnHeights(board) {
    const cols = board[0].length;
    const heights = [];
    
    for (let x = 0; x < cols; x++) {
      let height = 0;
      for (let y = 0; y < board.length; y++) {
        if (board[y][x]) {
          height = board.length - y;
          break;
        }
      }
      heights.push(height);
    }
    return heights;
  }

  // 计算行数
  getLinesCleared(board) {
    let lines = 0;
    for (let y = board.length - 1; y >= 0; y--) {
      if (board[y].every(cell => cell)) {
        lines++;
      }
    }
    return lines;
  }

  // 计算空洞数
  getHoles(board) {
    const cols = board[0].length;
    let holes = 0;
    
    for (let x = 0; x < cols; x++) {
      let foundBlock = false;
      for (let y = 0; y < board.length; y++) {
        if (board[y][x]) {
          foundBlock = true;
        } else if (foundBlock) {
          holes++;
        }
      }
    }
    return holes;
  }

  // 计算凹凸数
  getBumpiness(heights) {
    let bumpiness = 0;
    for (let i = 0; i < heights.length - 1; i++) {
      bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }
    return bumpiness;
  }

  // 检查是否可以T-spin
  canTSpin(piece, offsetX, offsetY, board) {
    // 只有T型方块可以T-spin
    if (piece.length !== 3 || piece[1][1] !== 1) {
      return false;
    }
    
    // 检查T-spin的条件
    const corners = [
      [offsetY - 1, offsetX - 1],
      [offsetY - 1, offsetX + 1],
      [offsetY + 1, offsetX - 1],
      [offsetY + 1, offsetX + 1]
    ];
    
    let blockedCorners = 0;
    for (const [y, x] of corners) {
      if (y < 0 || y >= board.length || x < 0 || x >= board[0].length || board[y][x]) {
        blockedCorners++;
      }
    }
    
    return blockedCorners >= 3;
  }

  // 计算得分
  calculateScore(board, piece, offsetX, offsetY, linesCleared) {
    // 创建临时棋盘模拟方块落下
    const tempBoard = board.map(row => [...row]);
    for (let y = 0; y < piece.length; y++) {
      for (let x = 0; x < piece[y].length; x++) {
        if (piece[y][x]) {
          const newY = offsetY + y;
          const newX = offsetX + x;
          if (newY >= 0) {
            tempBoard[newY][newX] = 1;
          }
        }
      }
    }
    
    // 计算各项指标
    const maxHeight = this.getMaxHeight(tempBoard);
    const heights = this.getColumnHeights(tempBoard);
    const holes = this.getHoles(tempBoard);
    const bumpiness = this.getBumpiness(heights);
    
    // 检查是否可以T-spin
    const isTSpin = this.canTSpin(piece, offsetX, offsetY, board);
    
    // 计算综合得分
    let score = 0;
    score += this.weights.height * maxHeight;
    score += this.weights.lines * linesCleared;
    score += this.weights.holes * holes;
    score += this.weights.bumpiness * bumpiness;
    score += this.weights.cleared * linesCleared;
    
    // T-spin加分
    if (isTSpin) {
      score += 50; // T-spin奖励
      if (linesCleared > 0) {
        score += linesCleared * 20; // T-spin消除行额外奖励
      }
    }
    
    return score;
  }

  // 找到最佳落点
  findBestMove(board, currentPiece) {
    let bestScore = -Infinity;
    let bestMove = null;
    
    // 获取所有旋转状态
    const rotations = this.getPieceRotations(currentPiece);
    
    for (let rotationIndex = 0; rotationIndex < rotations.length; rotationIndex++) {
      const piece = rotations[rotationIndex];
      
      // 尝试所有可能的水平位置
      const cols = board[0].length;
      for (let offsetX = 0; offsetX <= cols - piece[0].length; offsetX++) {
        // 找到方块可以落下的最低点
        let offsetY = 0;
        while (!this.checkCollision(piece, offsetX, offsetY + 1, board)) {
          offsetY++;
        }
        
        // 计算得分
        const linesCleared = this.getLinesCleared(board); // 这里简化处理，实际需要模拟消除行
        const score = this.calculateScore(board, piece, offsetX, offsetY, linesCleared);
        
        // 更新最佳移动
        if (score > bestScore) {
          bestScore = score;
          bestMove = {
            rotation: rotationIndex,
            offsetX,
            offsetY,
            score
          };
        }
      }
    }
    
    return bestMove;
  }

  // 生成操作指令
  generateActions(bestMove, currentRotation, currentX) {
    const actions = [];
    
    // 旋转操作
    const rotationDiff = bestMove.rotation - currentRotation;
    const rotations = rotationDiff < 0 ? rotationDiff + 4 : rotationDiff;
    for (let i = 0; i < rotations; i++) {
      actions.push('rotate');
    }
    
    // 水平移动
    const xDiff = bestMove.offsetX - currentX;
    if (xDiff > 0) {
      for (let i = 0; i < xDiff; i++) {
        actions.push('moveRight');
      }
    } else if (xDiff < 0) {
      for (let i = 0; i < Math.abs(xDiff); i++) {
        actions.push('moveLeft');
      }
    }
    
    // 快速下降
    actions.push('hardDrop');
    
    return actions;
  }

  // 执行AI操作
  async executeMove(board, currentPiece, currentRotation, currentX) {
    const bestMove = this.findBestMove(board, currentPiece);
    if (!bestMove) {
      return [];
    }
    
    return this.generateActions(bestMove, currentRotation, currentX);
  }
}

module.exports = new TetrisAI();