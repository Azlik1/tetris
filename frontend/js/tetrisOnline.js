// 多人在线俄罗斯方块游戏逻辑
class TetrisOnline {
  constructor(socket, roomId, userId) {
    this.socket = socket;
    this.roomId = roomId;
    this.userId = userId;
    this.gameState = null;
    this.canvasMap = new Map();
    this.ctxMap = new Map();
    this.cellSizeMap = new Map();
    this.config = {
      rows: 20,
      cols: 10,
      cellSize: 30,
      colors: [
        '#000000',
        '#00FFFF',
        '#0000FF',
        '#FFA500',
        '#FFFF00',
        '#00FF00',
        '#800080',
        '#FF0000'
      ]
    };
    this.keyboardHandler = null;
    this.isDestroyed = false;
    this.eventsBound = false;
    this.renderThrottleTimeout = null;
    this.gameOverElement = null;
    this.bindEvents();
  }

  // 初始化游戏
  initGame() {
    console.log('初始化游戏，roomId:', this.roomId);
    this.socket.emit('game_init', { roomId: this.roomId, userId: this.userId });
  }

  // 开始游戏
  startGame() {
    this.socket.emit('game_start', { roomId: this.roomId, userId: this.userId });
  }

  // 绑定事件
  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    this.socket.on('game_init_response', (data) => {
      console.log('游戏初始化响应:', data);
      if (data.success) {
        if (data.gameState && data.gameState.players) {
          this.gameState = data.gameState;
          this.initCanvases();
          this.renderGameState();
        } else {
          console.error('游戏状态无效:', data.gameState);
          alert('游戏初始化失败: 服务器返回无效状态');
        }
      } else {
        console.error('游戏初始化失败:', data.message);
        alert('游戏初始化失败: ' + (data.message || '未知错误'));
      }
    });

    this.socket.on('game_start_response', (data) => {
      if (data.success) {
        if (data.gameState && data.gameState.players) {
          this.gameState = data.gameState;
          this.renderGameState();
        }
      } else {
        console.error('游戏开始失败:', data.message);
        alert('游戏开始失败: ' + (data.message || '未知错误'));
      }
    });

    this.socket.on('game_started', (data) => {
      if (data.gameState && data.gameState.players) {
        this.gameState = data.gameState;
        this.renderGameState();
      }
    });

    this.socket.on('game_state_update', (data) => {
      if (data.gameState) {
        this.gameState = data.gameState;
        this.throttledRenderGameState();
      }
    });

    this.socket.on('game_operate_response', (data) => {
      if (!data.success) {
        console.error('操作失败:', data.message);
        this.showToast('操作失败: ' + (data.message || '未知错误'), 'error');
      }
    });

    this.socket.on('game_toggle_pause_response', (data) => {
      if (data.success) {
        if (this.gameState) {
          this.gameState.isPaused = data.isPaused;
          this.renderGameState();
        }
      } else {
        console.error('暂停/恢复失败:', data.message);
        this.showToast('操作失败: ' + (data.message || '未知错误'), 'error');
      }
    });

    this.socket.on('game_paused_updated', (data) => {
      if (this.gameState) {
        this.gameState.isPaused = data.isPaused;
        this.renderGameState();
      }
    });

    this.socket.on('game_start_keybinding_edit_response', (data) => {
      if (!data.success) {
        console.error('开始按键修改失败:', data.message);
        this.showToast('开始按键修改失败: ' + (data.message || '未知错误'), 'error');
      }
    });

    this.socket.on('game_complete_keybinding_edit_response', (data) => {
      if (data.success) {
        if (this.gameState && this.gameState.players[this.userId]) {
          this.gameState.players[this.userId].keyBindings = data.keyBindings;
        }
        this.showToast('按键修改成功', 'success');
      } else {
        console.error('按键修改失败:', data.message);
        this.showToast('按键修改失败: ' + (data.message || '未知错误'), 'error');
      }
    });

    this.socket.on('game_cancel_keybinding_edit_response', (data) => {
      if (!data.success) {
        console.error('取消按键修改失败:', data.message);
        this.showToast('取消按键修改失败: ' + (data.message || '未知错误'), 'error');
      }
    });
  }

  // 节流渲染
  throttledRenderGameState() {
    if (this.renderThrottleTimeout) return;
    this.renderThrottleTimeout = setTimeout(() => {
      this.renderGameState();
      this.renderThrottleTimeout = null;
    }, 16);
  }

  // 初始化画布
  initCanvases() {
    this.canvasMap.clear();
    this.ctxMap.clear();
    this.cellSizeMap.clear();

    const gameArea = document.getElementById('gameArea');
    if (!gameArea) return;

    gameArea.innerHTML = '';

    if (!this.gameState || !this.gameState.players) return;

    const players = Object.values(this.gameState.players);
    const playerCount = players.length;

    const playersContainer = document.createElement('div');
    playersContainer.className = 'players-container';
    playersContainer.style.display = 'flex';
    playersContainer.style.flexWrap = 'wrap';
    playersContainer.style.justifyContent = 'center';

    let cols, cellWidth, cellHeight;
    if (playerCount === 1) {
      cols = 1;
      cellWidth = 400;
      cellHeight = 600;
    } else if (playerCount === 2) {
      cols = 2;
      cellWidth = 350;
      cellHeight = 500;
    } else if (playerCount <= 4) {
      cols = 2;
      cellWidth = 300;
      cellHeight = 450;
    } else if (playerCount <= 6) {
      cols = 3;
      cellWidth = 250;
      cellHeight = 380;
    } else {
      cols = 4;
      cellWidth = 200;
      cellHeight = 320;
    }

    players.forEach((player) => {
      const playerId = player.id;
      const isCurrentPlayer = playerId === this.userId;

      const playerContainer = document.createElement('div');
      playerContainer.className = 'player-container';
      playerContainer.style.border = '1px solid #ddd';
      playerContainer.style.borderRadius = '5px';
      playerContainer.style.padding = '10px';
      playerContainer.style.margin = '5px';
      playerContainer.style.background = isCurrentPlayer ? '#e3f2fd' : '#f9f9f9';
      playerContainer.style.width = `${cellWidth}px`;
      playerContainer.style.boxSizing = 'border-box';

      const playerHeader = document.createElement('h3');
      playerHeader.textContent = isCurrentPlayer ? `${player.name} (我)` : player.name;
      playerHeader.style.textAlign = 'center';
      playerHeader.style.marginTop = '0';
      playerHeader.style.fontSize = '16px';

      const playerInfo = document.createElement('div');
      playerInfo.className = 'player-info';
      playerInfo.style.display = 'flex';
      playerInfo.style.justifyContent = 'space-between';
      playerInfo.style.marginBottom = '10px';
      playerInfo.style.fontSize = '12px';
      playerInfo.innerHTML = `
        <div>得分: <span id="score-${playerId}">${player.score || 0}</span></div>
        <div>行数: <span id="lines-${playerId}">${player.lines || 0}</span></div>
        <div>等级: <span id="level-${playerId}">${player.level || 1}</span></div>
      `;

      const canvasWidth = cellWidth - 20;
      const canvasHeight = cellHeight - 60;
      
      const cellSize = Math.floor(Math.min(canvasWidth / this.config.cols, canvasHeight / this.config.rows));
      const adjustedWidth = cellSize * this.config.cols;
      const adjustedHeight = cellSize * this.config.rows;

      this.cellSizeMap.set(playerId, cellSize);

      const canvas = document.createElement('canvas');
      canvas.id = `tetrisCanvas-${playerId}`;
      canvas.width = adjustedWidth;
      canvas.height = adjustedHeight;
      canvas.style.border = '2px solid #333';
      canvas.style.backgroundColor = '#000';
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';

      const ctx = canvas.getContext('2d');

      this.canvasMap.set(playerId, canvas);
      this.ctxMap.set(playerId, ctx);

      playerContainer.appendChild(playerHeader);
      playerContainer.appendChild(playerInfo);
      playerContainer.appendChild(canvas);
      playersContainer.appendChild(playerContainer);
    });

    gameArea.appendChild(playersContainer);

    this.bindKeyboardEvents();
  }

  // 绑定键盘事件
  bindKeyboardEvents() {
    this.unbindKeyboardEvents();

    this.keyboardHandler = (e) => {
      if (this.isDestroyed || !this.gameState || this.gameState.status !== 'playing') return;

      const playerState = this.gameState.players[this.userId];
      if (!playerState || playerState.gameOver) return;

      if (playerState.keyBindingEdit && playerState.keyBindingEdit.isEditing) {
        this.completeKeyBindingEdit(e.key);
        e.preventDefault();
        return;
      }

      const keyBindings = playerState.keyBindings || {
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        moveDown: 'ArrowDown',
        rotateRight: 'ArrowUp',
        rotateLeft: 'z',
        hardDrop: ' ',
        hold: 'c',
        pause: 'p'
      };

      switch (e.key) {
        case keyBindings.moveLeft:
          this.moveLeft();
          e.preventDefault();
          break;
        case keyBindings.moveRight:
          this.moveRight();
          e.preventDefault();
          break;
        case keyBindings.moveDown:
          this.moveDown();
          e.preventDefault();
          break;
        case keyBindings.rotateRight:
          this.rotate('right');
          e.preventDefault();
          break;
        case keyBindings.rotateLeft:
          this.rotate('left');
          e.preventDefault();
          break;
        case keyBindings.hardDrop:
          this.hardDrop();
          e.preventDefault();
          break;
        case keyBindings.hold:
          this.hold();
          e.preventDefault();
          break;
        case keyBindings.pause:
          this.togglePause();
          e.preventDefault();
          break;
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
  }

  // 解绑键盘事件
  unbindKeyboardEvents() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  // 显示提示消息
  showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '10000';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '500';
    toast.style.transition = 'opacity 0.3s ease';

    if (type === 'error') {
      toast.style.backgroundColor = '#f44336';
      toast.style.color = 'white';
    } else if (type === 'success') {
      toast.style.backgroundColor = '#4caf50';
      toast.style.color = 'white';
    } else {
      toast.style.backgroundColor = '#2196f3';
      toast.style.color = 'white';
    }

    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // 向左移动
  moveLeft() {
    this.socket.emit('game_operate', {
      roomId: this.roomId,
      userId: this.userId,
      operation: { type: 'moveLeft' }
    });
  }

  // 向右移动
  moveRight() {
    this.socket.emit('game_operate', {
      roomId: this.roomId,
      userId: this.userId,
      operation: { type: 'moveRight' }
    });
  }

  // 向下移动
  moveDown() {
    this.socket.emit('game_operate', {
      roomId: this.roomId,
      userId: this.userId,
      operation: { type: 'moveDown' }
    });
  }

  // 旋转
  rotate(direction = 'right') {
    this.socket.emit('game_operate', {
      roomId: this.roomId,
      userId: this.userId,
      operation: { type: direction === 'right' ? 'rotateRight' : 'rotateLeft' }
    });
  }

  // 暂停/恢复游戏
  togglePause() {
    if (!this.gameState) return;
    
    const isCreator = this.gameState.creatorId === this.userId;
    if (!isCreator) {
      this.showToast('仅房主可暂停游戏', 'error');
      return;
    }

    this.socket.emit('game_toggle_pause', {
      roomId: this.roomId,
      userId: this.userId
    });
  }

  // 开始按键修改
  startKeyBindingEdit(action) {
    const playerState = this.gameState && this.gameState.players[this.userId];
    if (!playerState) return;

    const keyBindings = playerState.keyBindings || {
      moveLeft: 'ArrowLeft',
      moveRight: 'ArrowRight',
      moveDown: 'ArrowDown',
      rotateRight: 'ArrowUp',
      rotateLeft: 'z',
      hardDrop: ' ',
      hold: 'c',
      pause: 'p'
    };

    const usedKeys = Object.values(keyBindings);
    if (usedKeys.includes(action)) {
      this.showToast('该按键已被使用', 'error');
      return;
    }

    this.socket.emit('game_start_keybinding_edit', {
      roomId: this.roomId,
      userId: this.userId,
      action: action
    });
  }

  // 完成按键修改
  completeKeyBindingEdit(key) {
    const playerState = this.gameState && this.gameState.players[this.userId];
    if (!playerState || !playerState.keyBindingEdit || !playerState.keyBindingEdit.isEditing) return;

    const keyBindings = playerState.keyBindings || {
      moveLeft: 'ArrowLeft',
      moveRight: 'ArrowRight',
      moveDown: 'ArrowDown',
      rotateRight: 'ArrowUp',
      rotateLeft: 'z',
      hardDrop: ' ',
      hold: 'c',
      pause: 'p'
    };

    const editingAction = playerState.keyBindingEdit.action;
    const usedKeys = Object.entries(keyBindings)
      .filter(([k]) => k !== editingAction)
      .map(([, v]) => v);
    
    if (usedKeys.includes(key)) {
      this.showToast('该按键已被其他操作使用', 'error');
      this.cancelKeyBindingEdit();
      return;
    }

    this.socket.emit('game_complete_keybinding_edit', {
      roomId: this.roomId,
      userId: this.userId,
      key: key
    });
  }

  // 取消按键修改
  cancelKeyBindingEdit() {
    this.socket.emit('game_cancel_keybinding_edit', {
      roomId: this.roomId,
      userId: this.userId
    });
  }

  // 快速下降
  hardDrop() {
    this.socket.emit('game_operate', {
      roomId: this.roomId,
      userId: this.userId,
      operation: { type: 'hardDrop' }
    });
  }

  // 保存方块
  hold() {
    this.socket.emit('game_operate', {
      roomId: this.roomId,
      userId: this.userId,
      operation: { type: 'hold' }
    });
  }

  // 渲染游戏状态
  renderGameState() {
    if (!this.gameState || !this.gameState.players) return;

    for (const playerId in this.gameState.players) {
      const playerState = this.gameState.players[playerId];
      this.renderPlayerState(playerId, playerState);
    }

    if (this.gameState.status === 'ended') {
      this.renderGameOver();
    }

    this.renderGameModeInfo();
  }

  // 渲染游戏模式相关信息
  renderGameModeInfo() {
    if (!this.gameState) return;

    if (this.gameState.mode === 'TIME_ATTACK' && this.gameState.status === 'playing') {
      for (const playerId in this.gameState.players) {
        const canvas = this.canvasMap.get(playerId);
        if (!canvas) continue;

        const ctx = this.ctxMap.get(playerId);
        if (!ctx) continue;

        const totalTime = 120000;
        const elapsedTime = Date.now() - (this.gameState.startTime || Date.now());
        const remainingTime = Math.max(0, totalTime - elapsedTime);
        const seconds = Math.floor(remainingTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`时间: ${minutes}:${remainingSeconds.toString().padStart(2, '0')}`, canvas.width / 2, 30);
      }
    }

    if (this.gameState.mode === 'FORTY_LINES') {
      for (const playerId in this.gameState.players) {
        const canvas = this.canvasMap.get(playerId);
        if (!canvas) continue;

        const ctx = this.ctxMap.get(playerId);
        if (!ctx) continue;

        const playerState = this.gameState.players[playerId];
        if (!playerState) continue;

        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`行数: ${playerState.lines || 0}/40`, canvas.width / 2, 30);
      }
    }
  }

  // 渲染暂停状态
  renderPaused(ctx, canvas) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏暂停', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '16px Arial';
    ctx.fillText('按暂停键继续', canvas.width / 2, canvas.height / 2 + 10);
  }

  // 渲染玩家状态
  renderPlayerState(playerId, playerState) {
    const ctx = this.ctxMap.get(playerId);
    if (!ctx) return;

    const canvas = this.canvasMap.get(playerId);
    if (!canvas) return;

    const cellSize = this.cellSizeMap.get(playerId) || this.config.cellSize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < this.config.rows; y++) {
      for (let x = 0; x < this.config.cols; x++) {
        if (playerState.board && playerState.board[y] && playerState.board[y][x]) {
          ctx.fillStyle = this.config.colors[playerState.board[y][x]];
          ctx.fillRect(
            x * cellSize,
            y * cellSize,
            cellSize - 1,
            cellSize - 1
          );
        }
      }
    }

    if (playerState.currentPiece) {
      for (let y = 0; y < playerState.currentPiece.length; y++) {
        for (let x = 0; x < playerState.currentPiece[y].length; x++) {
          if (playerState.currentPiece[y][x]) {
            ctx.fillStyle = this.config.colors[playerState.currentPiece[y][x]];
            ctx.fillRect(
              (playerState.position.x + x) * cellSize,
              (playerState.position.y + y) * cellSize,
              cellSize - 1,
              cellSize - 1
            );
          }
        }
      }
    }

    const scoreElement = document.getElementById(`score-${playerId}`);
    const linesElement = document.getElementById(`lines-${playerId}`);
    const levelElement = document.getElementById(`level-${playerId}`);
    
    if (scoreElement) scoreElement.textContent = playerState.score || 0;
    if (linesElement) linesElement.textContent = playerState.lines || 0;
    if (levelElement) levelElement.textContent = playerState.level || 1;

    if (playerState.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 20);
    }

    if (this.gameState.isPaused) {
      this.renderPaused(ctx, canvas);
    }
  }

  // 渲染游戏结束
  renderGameOver() {
    if (!this.gameState) return;

    if (this.gameOverElement) {
      this.gameOverElement.remove();
    }

    this.gameOverElement = document.createElement('div');
    this.gameOverElement.className = 'game-over-overlay';
    this.gameOverElement.style.position = 'fixed';
    this.gameOverElement.style.top = '0';
    this.gameOverElement.style.left = '0';
    this.gameOverElement.style.width = '100%';
    this.gameOverElement.style.height = '100%';
    this.gameOverElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.gameOverElement.style.display = 'flex';
    this.gameOverElement.style.flexDirection = 'column';
    this.gameOverElement.style.justifyContent = 'center';
    this.gameOverElement.style.alignItems = 'center';
    this.gameOverElement.style.zIndex = '1000';

    const gameOverTitle = document.createElement('h2');
    gameOverTitle.textContent = '游戏结束';
    gameOverTitle.style.color = 'white';
    gameOverTitle.style.fontSize = '36px';
    gameOverTitle.style.marginBottom = '20px';

    const winnerElement = document.createElement('div');
    const winner = this.gameState.players[this.gameState.winner];
    winnerElement.textContent = `获胜者: ${winner ? winner.name : '无'}`;
    winnerElement.style.color = 'white';
    winnerElement.style.fontSize = '24px';
    winnerElement.style.marginBottom = '30px';

    const scoresElement = document.createElement('div');
    scoresElement.className = 'game-over-scores';
    scoresElement.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    scoresElement.style.padding = '20px';
    scoresElement.style.borderRadius = '5px';
    scoresElement.style.minWidth = '300px';

    const scoresTitle = document.createElement('h3');
    scoresTitle.textContent = '最终得分';
    scoresTitle.style.color = 'white';
    scoresTitle.style.textAlign = 'center';
    scoresTitle.style.marginTop = '0';
    scoresElement.appendChild(scoresTitle);

    for (const playerId in this.gameState.players) {
      const player = this.gameState.players[playerId];
      const playerScore = document.createElement('div');
      playerScore.style.display = 'flex';
      playerScore.style.justifyContent = 'space-between';
      playerScore.style.padding = '8px 0';
      playerScore.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
      playerScore.style.color = 'white';
      playerScore.innerHTML = `
        <span>${player.name}</span>
        <span>${player.score || 0} 分</span>
      `;
      scoresElement.appendChild(playerScore);
    }

    const backButton = document.createElement('button');
    backButton.textContent = '返回房间';
    backButton.style.marginTop = '30px';
    backButton.style.padding = '12px 32px';
    backButton.style.fontSize = '16px';
    backButton.style.cursor = 'pointer';
    backButton.style.backgroundColor = '#4caf50';
    backButton.style.color = 'white';
    backButton.style.border = 'none';
    backButton.style.borderRadius = '4px';
    backButton.onclick = () => {
      this.gameOverElement.remove();
      this.gameOverElement = null;
      window.location.hash = '#room-lobby';
    };

    this.gameOverElement.appendChild(gameOverTitle);
    this.gameOverElement.appendChild(winnerElement);
    this.gameOverElement.appendChild(scoresElement);
    this.gameOverElement.appendChild(backButton);

    document.body.appendChild(this.gameOverElement);
  }

  // 销毁实例
  destroy() {
    this.isDestroyed = true;
    this.unbindKeyboardEvents();
    
    if (this.renderThrottleTimeout) {
      clearTimeout(this.renderThrottleTimeout);
      this.renderThrottleTimeout = null;
    }

    if (this.gameOverElement) {
      this.gameOverElement.remove();
      this.gameOverElement = null;
    }

    this.canvasMap.clear();
    this.ctxMap.clear();
    this.cellSizeMap.clear();
  }
}

export default TetrisOnline;