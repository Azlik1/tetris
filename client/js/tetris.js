// 俄罗斯方块游戏核心逻辑
class Tetris {
  constructor() {
    // 游戏配置
    this.config = {
      rows: 20,
      cols: 10,
      cellSize: 30,
      dropInterval: 1000, // 1秒下落1格
      colors: [
        '#000000', // 空
        '#00FFFF', // I
        '#0000FF', // J
        '#FFA500', // L
        '#FFFF00', // O
        '#00FF00', // S
        '#800080', // T
        '#FF0000'  // Z
      ]
    };
    
    // 方块定义
    this.tetrominos = [
      // I
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      // J
      [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      // L
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
      ],
      // O
      [
        [1, 1],
        [1, 1]
      ],
      // S
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
      ],
      // T
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      // Z
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
      ]
    ];
    
    // 游戏状态
    this.board = Array(this.config.rows).fill().map(() => Array(this.config.cols).fill(0));
    this.currentPiece = null;
    this.nextPiece = null;
    this.holdPiece = null;
    this.position = { x: 0, y: 0 };
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.gameOver = false;
    this.isPaused = false;
    this.lastDropTime = 0;
    this.canHold = true;
    this.mode = 'MARATHON';
    this.startTime = null;
    
    // 初始化画布
    this.initCanvas();
    // 绑定键盘事件
    this.bindEvents();
    // 绘制初始界面
    this.draw();
  }
  
  // 初始化画布
  initCanvas() {
    // 主游戏画布
    this.canvas = document.getElementById('tetrisCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = this.config.cols * this.config.cellSize;
    this.canvas.height = this.config.rows * this.config.cellSize;
    
    // 创建离屏Canvas，用于离屏渲染
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    
    // 下一方块预览画布
    this.nextCanvas = document.getElementById('nextCanvas');
    this.nextCtx = this.nextCanvas.getContext('2d');
    this.nextCanvas.width = 4 * this.config.cellSize;
    this.nextCanvas.height = 4 * this.config.cellSize;
    
    // 保存方块画布
    this.holdCanvas = document.getElementById('holdCanvas');
    this.holdCtx = this.holdCanvas.getContext('2d');
    this.holdCanvas.width = 4 * this.config.cellSize;
    this.holdCanvas.height = 4 * this.config.cellSize;
    
    // 得分显示
    this.scoreElement = document.getElementById('score');
    this.linesElement = document.getElementById('lines');
    this.levelElement = document.getElementById('level');
  }
  
  // 设置用户管理器
  setUserManager(manager) {
    this.userManager = manager;
  }
  
  // 开始游戏
  startGame(mode = 'MARATHON') {
    this.board = Array(this.config.rows).fill().map(() => Array(this.config.cols).fill(0));
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.gameOver = false;
    this.canHold = true;
    this.holdPiece = null;
    this.mode = mode;
    this.startTime = Date.now();
    this.scoreElement.textContent = this.score;
    this.linesElement.textContent = this.lines;
    this.levelElement.textContent = this.level;
    this.generateNextPiece();
    this.generatePiece();
    this.gameLoop();
  }
  
  // 生成新方块
  generatePiece() {
    if (this.nextPiece) {
      this.currentPiece = this.nextPiece;
    } else {
      const randomIndex = Math.floor(Math.random() * this.tetrominos.length);
      this.currentPiece = this.tetrominos[randomIndex];
    }
    this.position = {
      x: Math.floor((this.config.cols - this.currentPiece[0].length) / 2),
      y: 0
    };
    
    // 生成下一个方块
    this.generateNextPiece();
    this.canHold = true;
    
    // 检查游戏是否结束
    if (this.checkCollision(this.currentPiece, this.position.x, this.position.y)) {
      this.gameOver = true;
      // 游戏结束，更新排行榜
      this.updateRank();
    }
  }
  
  // 更新排行榜
  updateRank() {
    // 检查是否登录
    if (this.userManager && this.userManager.isLoggedIn()) {
      // 只记录单人模式的成绩
      console.log('更新排行榜，分数：', this.score, '模式：', this.mode);
      // 调用排行榜更新API
      fetch('/api/rank/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userManager.token}`
        },
        body: JSON.stringify({
          score: this.score,
          mode: this.mode
        })
      })
      .then(response => response.json())
      .then(data => {
        console.log('排行榜更新结果：', data);
        // 显示成绩记录成功的反馈
        if (data.success) {
          this.showGameOverMessage('成绩已成功记录到排行榜！');
        } else {
          this.showGameOverMessage('成绩记录失败，请稍后重试');
        }
      })
      .catch(error => {
        console.error('更新排行榜失败：', error);
        // 显示成绩记录失败的反馈
        this.showGameOverMessage('成绩记录失败，请稍后重试');
      });
    } else {
      // 未登录，显示提示
      this.showGameOverMessage('请登录后查看排行榜');
    }
  }
  
  // 显示游戏结束消息
  showGameOverMessage(message) {
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.style.position = 'absolute';
    messageElement.style.top = '50%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '20px';
    messageElement.style.borderRadius = '8px';
    messageElement.style.fontSize = '16px';
    messageElement.style.textAlign = 'center';
    messageElement.style.zIndex = '1000';
    messageElement.textContent = message;
    
    // 添加到游戏区域
    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
      gameArea.appendChild(messageElement);
      
      // 3秒后移除消息
      setTimeout(() => {
        gameArea.removeChild(messageElement);
      }, 3000);
    }
  }
  
  // 生成下一个方块
  generateNextPiece() {
    const randomIndex = Math.floor(Math.random() * this.tetrominos.length);
    this.nextPiece = this.tetrominos[randomIndex];
    this.drawNextPiece();
  }
  
  // 绘制下一个方块
  drawNextPiece() {
    this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    for (let y = 0; y < this.nextPiece.length; y++) {
      for (let x = 0; x < this.nextPiece[y].length; x++) {
        if (this.nextPiece[y][x]) {
          this.nextCtx.fillStyle = this.config.colors[this.nextPiece[y][x]];
          this.nextCtx.fillRect(
            x * this.config.cellSize,
            y * this.config.cellSize,
            this.config.cellSize - 1,
            this.config.cellSize - 1
          );
        }
      }
    }
  }
  
  // 绘制保存的方块
  drawHoldPiece() {
    this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
    if (this.holdPiece) {
      for (let y = 0; y < this.holdPiece.length; y++) {
        for (let x = 0; x < this.holdPiece[y].length; x++) {
          if (this.holdPiece[y][x]) {
            this.holdCtx.fillStyle = this.config.colors[this.holdPiece[y][x]];
            this.holdCtx.fillRect(
              x * this.config.cellSize,
              y * this.config.cellSize,
              this.config.cellSize - 1,
              this.config.cellSize - 1
            );
          }
        }
      }
    }
  }
  
  // 保存方块
  hold() {
    if (!this.canHold) return;
    
    if (this.holdPiece) {
      // 交换当前方块和保存的方块
      const temp = this.currentPiece;
      this.currentPiece = this.holdPiece;
      this.holdPiece = temp;
      this.position = {
        x: Math.floor((this.config.cols - this.currentPiece[0].length) / 2),
        y: 0
      };
    } else {
      // 保存当前方块，生成新方块
      this.holdPiece = this.currentPiece;
      this.generatePiece();
    }
    
    this.drawHoldPiece();
    this.canHold = false;
  }
  
  // 快速下降
  hardDrop() {
    while (!this.checkCollision(this.currentPiece, this.position.x, this.position.y + 1)) {
      this.position.y++;
    }
    // 方块落地，固定到游戏板
    this.lockPiece();
    // 检查消除行
    this.clearLines();
    // 生成新方块
    this.generatePiece();
  }
  
  // 游戏循环
  gameLoop(timestamp) {
    if (!this.gameOver) {
      requestAnimationFrame(this.gameLoop.bind(this));
      
      // 自动下落（仅在未暂停时）
      if (!this.isPaused && timestamp - this.lastDropTime > this.config.dropInterval) {
        this.moveDown();
        this.lastDropTime = timestamp;
      }
      
      this.draw();
    } else {
      this.drawGameOver();
    }
  }
  
  // 绘制游戏
  draw() {
    // 清空离屏画布
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    
    // 绘制游戏板
    for (let y = 0; y < this.config.rows; y++) {
      for (let x = 0; x < this.config.cols; x++) {
        if (this.board[y][x]) {
          this.offscreenCtx.fillStyle = this.config.colors[this.board[y][x]];
          this.offscreenCtx.fillRect(
            x * this.config.cellSize,
            y * this.config.cellSize,
            this.config.cellSize - 1,
            this.config.cellSize - 1
          );
        }
      }
    }
    
    // 绘制当前方块
    if (this.currentPiece) {
      for (let y = 0; y < this.currentPiece.length; y++) {
        for (let x = 0; x < this.currentPiece[y].length; x++) {
          if (this.currentPiece[y][x]) {
            this.offscreenCtx.fillStyle = this.config.colors[this.currentPiece[y][x]];
            this.offscreenCtx.fillRect(
              (this.position.x + x) * this.config.cellSize,
              (this.position.y + y) * this.config.cellSize,
              this.config.cellSize - 1,
              this.config.cellSize - 1
            );
          }
        }
      }
    }

    // 绘制游戏模式和剩余时间
    this.drawGameModeInfo();

    // 绘制暂停状态
    if (this.isPaused) {
      this.offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.offscreenCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
      this.offscreenCtx.fillStyle = 'white';
      this.offscreenCtx.font = '24px Arial';
      this.offscreenCtx.textAlign = 'center';
      this.offscreenCtx.fillText('游戏暂停', this.offscreenCanvas.width / 2, this.offscreenCanvas.height / 2);
    }
    
    // 将离屏画布内容绘制到主画布
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  // 绘制游戏模式和剩余时间
  drawGameModeInfo() {
    // 绘制游戏模式
    this.offscreenCtx.fillStyle = '#fff';
    this.offscreenCtx.font = '16px Arial';
    this.offscreenCtx.textAlign = 'center';
    this.offscreenCtx.fillText(`模式: ${this.mode}`, this.offscreenCanvas.width / 2, 30);

    // 绘制timeattack模式的时间显示
    if (this.mode === 'TIME_ATTACK' && !this.gameOver && !this.isPaused) {
      // 计算剩余时间（2分钟=120秒）
      const totalTime = 120000; // 2分钟
      const elapsedTime = Date.now() - this.startTime;
      const remainingTime = Math.max(0, totalTime - elapsedTime);
      const seconds = Math.floor(remainingTime / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      // 绘制时间显示
      this.offscreenCtx.fillStyle = '#fff';
      this.offscreenCtx.font = '16px Arial';
      this.offscreenCtx.textAlign = 'center';
      this.offscreenCtx.fillText(`时间: ${minutes}:${remainingSeconds.toString().padStart(2, '0')}`, this.offscreenCanvas.width / 2, 60);
    }

    // 绘制40行挑战赛的进度
    if (this.mode === 'FORTY_LINES') {
      // 绘制行数进度
      this.offscreenCtx.fillStyle = '#fff';
      this.offscreenCtx.font = '16px Arial';
      this.offscreenCtx.textAlign = 'center';
      this.offscreenCtx.fillText(`行数: ${this.lines}/40`, this.offscreenCanvas.width / 2, 60);
    }
  }
  
  // 绘制游戏结束
  drawGameOver() {
    // 清空离屏画布
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    
    // 绘制游戏板
    for (let y = 0; y < this.config.rows; y++) {
      for (let x = 0; x < this.config.cols; x++) {
        if (this.board[y][x]) {
          this.offscreenCtx.fillStyle = this.config.colors[this.board[y][x]];
          this.offscreenCtx.fillRect(
            x * this.config.cellSize,
            y * this.config.cellSize,
            this.config.cellSize - 1,
            this.config.cellSize - 1
          );
        }
      }
    }
    
    // 绘制游戏结束信息
    this.offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.offscreenCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.offscreenCtx.fillStyle = 'white';
    this.offscreenCtx.font = '24px Arial';
    this.offscreenCtx.textAlign = 'center';
    this.offscreenCtx.fillText('游戏结束', this.offscreenCanvas.width / 2, this.offscreenCanvas.height / 2 - 20);
    this.offscreenCtx.fillText(`得分: ${this.score}`, this.offscreenCanvas.width / 2, this.offscreenCanvas.height / 2 + 20);
    
    // 将离屏画布内容绘制到主画布
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }
  
  // 绑定键盘事件
  bindEvents() {
    document.addEventListener('keydown', (e) => {
      if (this.gameOver) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          if (!this.isPaused) this.moveLeft();
          e.preventDefault();
          break;
        case 'ArrowRight':
          if (!this.isPaused) this.moveRight();
          e.preventDefault();
          break;
        case 'ArrowDown':
          if (!this.isPaused) this.moveDown();
          e.preventDefault();
          break;
        case 'ArrowUp':
          if (!this.isPaused) this.rotate('right');
          e.preventDefault();
          break;
        case 'z':
        case 'Z':
          if (!this.isPaused) this.rotate('left');
          e.preventDefault();
          break;
        case ' ':
          if (!this.isPaused) this.hardDrop();
          e.preventDefault();
          break;
        case 'c':
        case 'C':
          if (!this.isPaused) this.hold();
          e.preventDefault();
          break;
        case 'p':
        case 'P':
          this.togglePause();
          e.preventDefault();
          break;
      }
    });
    
    // 绑定控制按钮事件
    if (document.getElementById('btnLeft')) {
      document.getElementById('btnLeft').addEventListener('click', () => this.moveLeft());
    }
    if (document.getElementById('btnRight')) {
      document.getElementById('btnRight').addEventListener('click', () => this.moveRight());
    }
    if (document.getElementById('btnDown')) {
      document.getElementById('btnDown').addEventListener('click', () => this.moveDown());
    }
    if (document.getElementById('btnRotate')) {
      document.getElementById('btnRotate').addEventListener('click', () => this.rotate());
    }
    if (document.getElementById('btnDrop')) {
      document.getElementById('btnDrop').addEventListener('click', () => this.hardDrop());
    }
    if (document.getElementById('btnHold')) {
      document.getElementById('btnHold').addEventListener('click', () => this.hold());
    }
  }
  
  // 向左移动
  moveLeft() {
    if (!this.checkCollision(this.currentPiece, this.position.x - 1, this.position.y)) {
      this.position.x--;
    }
  }
  
  // 向右移动
  moveRight() {
    if (!this.checkCollision(this.currentPiece, this.position.x + 1, this.position.y)) {
      this.position.x++;
    }
  }
  
  // 向下移动
  moveDown() {
    if (!this.checkCollision(this.currentPiece, this.position.x, this.position.y + 1)) {
      this.position.y++;
    } else {
      // 方块落地，固定到游戏板
      this.lockPiece();
      // 检查消除行
      this.clearLines();
      // 生成新方块
      this.generatePiece();
    }
  }
  
  // 旋转方块
  rotate(direction = 'right') {
    const rotated = direction === 'right' ? this.rotateMatrixRight(this.currentPiece) : this.rotateMatrixLeft(this.currentPiece);
    if (!this.checkCollision(rotated, this.position.x, this.position.y)) {
      this.currentPiece = rotated;
    }
  }

  // 向右旋转矩阵（顺时针）
  rotateMatrixRight(matrix) {
    const N = matrix.length;
    const rotated = Array(N).fill().map(() => Array(N).fill(0));
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        rotated[x][N - 1 - y] = matrix[y][x];
      }
    }
    return rotated;
  }

  // 向左旋转矩阵（逆时针）
  rotateMatrixLeft(matrix) {
    const N = matrix.length;
    const rotated = Array(N).fill().map(() => Array(N).fill(0));
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        rotated[N - 1 - x][y] = matrix[y][x];
      }
    }
    return rotated;
  }

  // 暂停/恢复游戏
  togglePause() {
    this.isPaused = !this.isPaused;
  }
  
  // 碰撞检测
  checkCollision(piece, offsetX, offsetY) {
    for (let y = 0; y < piece.length; y++) {
      for (let x = 0; x < piece[y].length; x++) {
        if (piece[y][x]) {
          const newX = offsetX + x;
          const newY = offsetY + y;
          // 检查边界
          if (newX < 0 || newX >= this.config.cols || newY >= this.config.rows) {
            return true;
          }
          // 检查与已落地方块的碰撞
          if (newY >= 0 && this.board[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  // 固定方块到游戏板
  lockPiece() {
    for (let y = 0; y < this.currentPiece.length; y++) {
      for (let x = 0; x < this.currentPiece[y].length; x++) {
        if (this.currentPiece[y][x]) {
          const boardY = this.position.y + y;
          if (boardY >= 0) {
            this.board[boardY][this.position.x + x] = this.currentPiece[y][x];
          }
        }
      }
    }
  }
  
  // 消除行
  clearLines() {
    let linesCleared = 0;
    for (let y = this.config.rows - 1; y >= 0; y--) {
      if (this.board[y].every(cell => cell !== 0)) {
        // 消除该行
        this.board.splice(y, 1);
        // 在顶部添加新行
        this.board.unshift(Array(this.config.cols).fill(0));
        // 增加得分
        linesCleared++;
        // 重新检查当前行
        y++;
      }
    }
    
    // 计算得分
    if (linesCleared > 0) {
      const points = [0, 100, 300, 500, 800];
      this.score += points[linesCleared];
      this.lines += linesCleared;
      
      // 更新等级
      const newLevel = Math.floor(this.lines / 10) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        // 提高下落速度
        this.config.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
      }
      
      this.scoreElement.textContent = this.score;
      this.linesElement.textContent = this.lines;
      this.levelElement.textContent = this.level;
    }
  }
}

// 初始化游戏
window.addEventListener('load', () => {
  window.tetris = new Tetris();
});