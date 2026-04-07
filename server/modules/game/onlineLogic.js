// 多人在线游戏逻辑
const { RedisUtil } = require('../database/redisConfig');
const RankManager = require('../../modules/rank/rankManager');
const { updateUserStats } = require('../../modules/user/user');
const tetrisAI = require('../../utils/ai/tetrisAI');

class OnlineGameLogic {
  constructor() {
    // 存储房间游戏状态
    this.rooms = new Map();
    // 游戏配置
    this.config = {
      rows: 20,
      cols: 10,
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
  }

  // 初始化房间游戏状态
  async initRoomGame(roomId, players, mode = 'MARATHON') {
    try {
      const gameState = {
        roomId,
        mode,
        status: 'waiting',
        isPaused: false, // 暂停状态
        players: {},
        watchers: [],
        startTime: null,
        endTime: null,
        winner: null,
        garbageQueue: {} // 存储每个玩家的垃圾行队列
      };

      // 为每个玩家初始化游戏状态
      for (const player of players) {
        gameState.players[player.id] = this.initPlayerGameState(player);
        gameState.garbageQueue[player.id] = [];
      }

      // 存储游戏状态到Redis
      await RedisUtil.set(`game:${roomId}`, JSON.stringify(gameState));

      this.rooms.set(roomId, gameState);
      return gameState;
    } catch (error) {
      console.error('初始化房间游戏状态失败:', error);
      throw error;
    }
  }

  // 初始化玩家游戏状态
  initPlayerGameState(player) {
    return {
      id: player.id,
      name: player.name,
      board: Array(this.config.rows).fill().map(() => Array(this.config.cols).fill(0)),
      currentPiece: null,
      nextPiece: null,
      holdPiece: null,
      position: { x: 0, y: 0 },
      score: 0,
      lines: 0,
      level: 1,
      dropInterval: this.config.dropInterval, // 初始下落间隔
      gameOver: false,
      canHold: true,
      lastDropTime: 0,
      // 按键映射
      keyBindings: {
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        moveDown: 'ArrowDown',
        rotateRight: 'ArrowUp',
        rotateLeft: 'z',
        hardDrop: ' ',
        hold: 'c',
        pause: 'p'
      }
    };
  }

  // 开始游戏
  async startGame(roomId) {
    try {
      const gameState = await this.getGameState(roomId);
      if (!gameState) {
        throw new Error('游戏状态不存在');
      }

      // 为每个玩家生成初始方块
      for (const playerId in gameState.players) {
        const playerState = gameState.players[playerId];
        this.generateNextPiece(playerState);
        this.generatePiece(playerState);
      }

      gameState.status = 'playing';
      gameState.startTime = Date.now();

      // 更新游戏状态
      await this.updateGameState(roomId, gameState);

      // 开始游戏循环
      this.startGameLoop(roomId);
      
      // 为AI玩家启动自动操作
      this.startAIOperations(roomId);

      // 检查游戏模式的特殊逻辑
      this.checkGameModeLogic(roomId, gameState);

      return gameState;
    } catch (error) {
      console.error('开始游戏失败:', error);
      throw error;
    }
  }

  // 检查游戏模式的特殊逻辑
  checkGameModeLogic(roomId, gameState) {
    // 处理限时积分赛
    if (gameState.mode === 'TIME_ATTACK') {
      setTimeout(async () => {
        const currentGameState = await this.getGameState(roomId);
        if (currentGameState && currentGameState.status === 'playing') {
          await this.endGame(roomId);
        }
      }, 120000); // 2分钟
    }
  }

  // 检查游戏是否结束（基于游戏模式）
  checkGameEndCondition(gameState) {
    // 检查40行挑战赛
    if (gameState.mode === 'FORTY_LINES') {
      for (const playerId in gameState.players) {
        const playerState = gameState.players[playerId];
        if (playerState.lines >= 40) {
          gameState.winner = playerId;
          return true;
        }
      }
    }
    
    // 检查标准游戏结束条件（只有一个玩家未游戏结束）
    const activePlayers = Object.values(gameState.players).filter(p => !p.gameOver);
    if (activePlayers.length <= 1) {
      return true;
    }
    
    return false;
  }
  
  // 为AI玩家启动自动操作
  startAIOperations(roomId) {
    const aiInterval = setInterval(async () => {
      try {
        const gameState = await this.getGameState(roomId);
        if (!gameState || gameState.status !== 'playing' || gameState.isPaused) {
          return;
        }
        
        // 为每个AI玩家执行操作
        for (const playerId in gameState.players) {
          const playerState = gameState.players[playerId];
          // 检查是否是AI玩家
          if (playerState.isAI) {
            await this.executeAIOperation(roomId, playerId, playerState);
          }
        }
      } catch (error) {
        console.error('AI操作执行失败:', error);
      }
    }, 500); // AI每500毫秒执行一次操作
  }
  
  // 执行AI操作
  async executeAIOperation(roomId, playerId, playerState) {
    if (playerState.gameOver) {
      return;
    }
    
    // 使用AI算法获取最佳移动
    const bestMove = tetrisAI.findBestMove(playerState.board, playerState.currentPiece);
    if (!bestMove) {
      return;
    }
    
    // 生成操作指令
    const actions = tetrisAI.generateActions(bestMove, 0, 0); // 简化处理，假设当前旋转为0，位置为0
    
    // 执行操作
    for (const action of actions) {
      switch (action) {
        case 'rotate':
          await this.rotate(roomId, playerId);
          break;
        case 'moveLeft':
          await this.moveLeft(roomId, playerId);
          break;
        case 'moveRight':
          await this.moveRight(roomId, playerId);
          break;
        case 'hardDrop':
          await this.hardDrop(roomId, playerId);
          break;
      }
      // 短暂延迟，模拟真实操作
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // 开始游戏循环
  startGameLoop(roomId) {
    const gameLoop = async (timestamp) => {
      try {
        const gameState = await this.getGameState(roomId);
        if (!gameState || gameState.status !== 'playing') {
          return;
        }

        // 如果游戏暂停，跳过自动下落
        if (!gameState.isPaused) {
          // 处理自动下落
          for (const playerId in gameState.players) {
            const playerState = gameState.players[playerId];
            if (!playerState.gameOver && timestamp - playerState.lastDropTime > playerState.dropInterval) {
              await this.moveDown(roomId, playerId);
              playerState.lastDropTime = timestamp;
            }
          }

          // 检查游戏是否结束
          if (this.checkGameEndCondition(gameState)) {
            await this.endGame(roomId);
            return;
          }
        }

        // 继续游戏循环
        setTimeout(() => gameLoop(Date.now()), 1000 / 60); // 60 FPS
      } catch (error) {
        console.error('游戏循环错误:', error);
      }
    };

    gameLoop(Date.now());
  }

  // 生成新方块
  generatePiece(playerState) {
    if (playerState.nextPiece) {
      playerState.currentPiece = playerState.nextPiece;
    } else {
      const randomIndex = Math.floor(Math.random() * this.tetrominos.length);
      playerState.currentPiece = this.tetrominos[randomIndex];
    }
    playerState.position = {
      x: Math.floor((this.config.cols - playerState.currentPiece[0].length) / 2),
      y: 0
    };

    // 生成下一个方块
    this.generateNextPiece(playerState);
    playerState.canHold = true;

    // 检查游戏是否结束
    if (this.checkCollision(playerState.currentPiece, playerState.position.x, playerState.position.y, playerState.board)) {
      playerState.gameOver = true;
    }
  }

  // 生成下一个方块
  generateNextPiece(playerState) {
    const randomIndex = Math.floor(Math.random() * this.tetrominos.length);
    playerState.nextPiece = this.tetrominos[randomIndex];
  }

  // 碰撞检测
  checkCollision(piece, offsetX, offsetY, board) {
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
          if (newY >= 0 && board[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // 向左移动
  async moveLeft(roomId, playerId) {
    const gameState = await this.getGameState(roomId);
    if (!gameState || !gameState.players[playerId]) return;

    const playerState = gameState.players[playerId];
    if (playerState.gameOver) return;

    if (!this.checkCollision(playerState.currentPiece, playerState.position.x - 1, playerState.position.y, playerState.board)) {
      playerState.position.x--;
      await this.updateGameState(roomId, gameState);
    }
  }

  // 向右移动
  async moveRight(roomId, playerId) {
    const gameState = await this.getGameState(roomId);
    if (!gameState || !gameState.players[playerId]) return;

    const playerState = gameState.players[playerId];
    if (playerState.gameOver) return;

    if (!this.checkCollision(playerState.currentPiece, playerState.position.x + 1, playerState.position.y, playerState.board)) {
      playerState.position.x++;
      await this.updateGameState(roomId, gameState);
    }
  }

  // 向下移动
  async moveDown(roomId, playerId) {
    const gameState = await this.getGameState(roomId);
    if (!gameState || !gameState.players[playerId]) return;

    const playerState = gameState.players[playerId];
    if (playerState.gameOver) return;

    if (!this.checkCollision(playerState.currentPiece, playerState.position.x, playerState.position.y + 1, playerState.board)) {
      playerState.position.y++;
    } else {
      // 方块落地，固定到游戏板
      this.lockPiece(playerState);
      // 检查消除行
      this.clearLines(playerState, gameState, playerId);
      // 处理垃圾行
      if (gameState.garbageQueue[playerId] && gameState.garbageQueue[playerId].length > 0) {
        const totalGarbage = gameState.garbageQueue[playerId].reduce((sum, count) => sum + count, 0);
        this.processGarbageLines(playerState, totalGarbage);
        gameState.garbageQueue[playerId] = [];
      }
      // 生成新方块
      this.generatePiece(playerState);
    }

    await this.updateGameState(roomId, gameState);
  }

  // 旋转方块
  async rotate(roomId, playerId, direction = 'right') {
    const gameState = await this.getGameState(roomId);
    if (!gameState || !gameState.players[playerId]) return;

    const playerState = gameState.players[playerId];
    if (playerState.gameOver) return;

    const rotated = direction === 'right' ? this.rotateMatrixRight(playerState.currentPiece) : this.rotateMatrixLeft(playerState.currentPiece);
    if (!this.checkCollision(rotated, playerState.position.x, playerState.position.y, playerState.board)) {
      playerState.currentPiece = rotated;
      await this.updateGameState(roomId, gameState);
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

  // 快速下降
  async hardDrop(roomId, playerId) {
    const gameState = await this.getGameState(roomId);
    if (!gameState || !gameState.players[playerId]) return;

    const playerState = gameState.players[playerId];
    if (playerState.gameOver) return;

    while (!this.checkCollision(playerState.currentPiece, playerState.position.x, playerState.position.y + 1, playerState.board)) {
      playerState.position.y++;
    }
    // 方块落地，固定到游戏板
    this.lockPiece(playerState);
    // 检查消除行
    this.clearLines(playerState, gameState, playerId);
    // 处理垃圾行
    if (gameState.garbageQueue[playerId] && gameState.garbageQueue[playerId].length > 0) {
      const totalGarbage = gameState.garbageQueue[playerId].reduce((sum, count) => sum + count, 0);
      this.processGarbageLines(playerState, totalGarbage);
      gameState.garbageQueue[playerId] = [];
    }
    // 生成新方块
    this.generatePiece(playerState);

    await this.updateGameState(roomId, gameState);
  }

  // 保存方块
  async hold(roomId, playerId) {
    const gameState = await this.getGameState(roomId);
    if (!gameState || !gameState.players[playerId]) return;

    const playerState = gameState.players[playerId];
    if (playerState.gameOver || !playerState.canHold) return;

    if (playerState.holdPiece) {
      // 交换当前方块和保存的方块
      const temp = playerState.currentPiece;
      playerState.currentPiece = playerState.holdPiece;
      playerState.holdPiece = temp;
      playerState.position = {
        x: Math.floor((this.config.cols - playerState.currentPiece[0].length) / 2),
        y: 0
      };
    } else {
      // 保存当前方块，生成新方块
      playerState.holdPiece = playerState.currentPiece;
      this.generatePiece(playerState);
    }

    playerState.canHold = false;
    await this.updateGameState(roomId, gameState);
  }

  // 固定方块到游戏板
  lockPiece(playerState) {
    for (let y = 0; y < playerState.currentPiece.length; y++) {
      for (let x = 0; x < playerState.currentPiece[y].length; x++) {
        if (playerState.currentPiece[y][x]) {
          const boardY = playerState.position.y + y;
          if (boardY >= 0) {
            playerState.board[boardY][playerState.position.x + x] = playerState.currentPiece[y][x];
          }
        }
      }
    }
  }

  // 消除行
  clearLines(playerState, gameState, playerId) {
    let linesCleared = 0;
    for (let y = this.config.rows - 1; y >= 0; y--) {
      if (playerState.board[y].every(cell => cell !== 0)) {
        // 消除该行
        playerState.board.splice(y, 1);
        // 在顶部添加新行
        playerState.board.unshift(Array(this.config.cols).fill(0));
        // 增加得分
        linesCleared++;
        // 重新检查当前行
        y++;
      }
    }

    // 计算得分
    if (linesCleared > 0) {
      const points = [0, 100, 300, 500, 800];
      playerState.score += points[linesCleared];
      playerState.lines += linesCleared;

      // 更新等级
      const newLevel = Math.floor(playerState.lines / 10) + 1;
      if (newLevel > playerState.level) {
        playerState.level = newLevel;
        // 加速效果：每升一级，下落速度增加10%
        playerState.dropInterval = Math.max(100, this.config.dropInterval * Math.pow(0.9, newLevel - 1));
      }

      // 生成垃圾行（如果游戏模式启用了垃圾行）
      if (gameState.mode && (gameState.mode === 'PVP' || gameState.mode === 'BATTLE_ROYALE' || gameState.mode === 'TEAM_BATTLE')) {
        this.generateGarbageLines(gameState, playerId, linesCleared);
      }

      // 检查40 Lines模式是否完成
      if (gameState.mode === 'FORTY_LINES' && playerState.lines >= 40) {
        playerState.gameOver = true;
        // 检查是否所有玩家都完成了
        const allPlayersFinished = Object.values(gameState.players).every(p => p.gameOver);
        if (allPlayersFinished) {
          this.endGame(gameState.roomId);
        }
      }
    }
  }

  // 检查游戏模式的结束条件
  checkGameModeEndCondition(gameState) {
    // 检查Time Attack模式是否时间到
    if (gameState.mode === 'TIME_ATTACK' && gameState.startTime) {
      const totalTime = 120000; // 2分钟
      const elapsedTime = Date.now() - gameState.startTime;
      if (elapsedTime >= totalTime) {
        // 时间到，结束游戏
        for (const playerId in gameState.players) {
          gameState.players[playerId].gameOver = true;
        }
        this.endGame(gameState.roomId);
      }
    }
  }

  // 生成垃圾行
  generateGarbageLines(gameState, playerId, linesCleared) {
    // 计算要发送的垃圾行数（通常是消行数-1）
    const garbageLines = Math.max(0, linesCleared - 1);
    if (garbageLines === 0) return;

    // 为其他玩家添加垃圾行
    for (const otherPlayerId in gameState.players) {
      if (otherPlayerId !== playerId) {
        gameState.garbageQueue[otherPlayerId].push(garbageLines);
      }
    }
  }

  // 处理垃圾行
  processGarbageLines(playerState, garbageCount) {
    for (let i = 0; i < garbageCount; i++) {
      // 在底部添加一行垃圾行，中间有一个空洞
      const garbageRow = Array(this.config.cols).fill(9); // 9表示垃圾方块
      const holeIndex = Math.floor(Math.random() * this.config.cols);
      garbageRow[holeIndex] = 0;
      
      // 移除最底部的行
      playerState.board.pop();
      // 在顶部添加垃圾行
      playerState.board.unshift(garbageRow);
    }
  }

  // 结束游戏
  async endGame(roomId) {
    const gameState = await this.getGameState(roomId);
    if (!gameState) return;

    gameState.status = 'ended';
    gameState.endTime = Date.now();

    // 确定获胜者
    const activePlayers = Object.values(gameState.players).filter(p => !p.gameOver);
    if (activePlayers.length === 1) {
      gameState.winner = activePlayers[0].id;
    } else {
      // 多个玩家同时结束，比较得分
      const players = Object.values(gameState.players);
      players.sort((a, b) => b.score - a.score);
      gameState.winner = players[0].id;
    }

    await this.updateGameState(roomId, gameState);
    
    // 更新每个玩家的统计数据
    for (const playerId in gameState.players) {
      const player = gameState.players[playerId];
      const isWinner = playerId === gameState.winner;
      await updateUserStats(playerId, player.score, isWinner, gameState.mode);
    }
    
    // 清空房间内排行榜
    await RankManager.clearRoomRank(roomId);
  }

  // 获取游戏状态
  async getGameState(roomId) {
    try {
      // 先从内存中获取
      if (this.rooms.has(roomId)) {
        return this.rooms.get(roomId);
      }

      // 从Redis中获取
      const gameStateStr = await RedisUtil.get(`game:${roomId}`);
      if (gameStateStr) {
        const gameState = JSON.parse(gameStateStr);
        this.rooms.set(roomId, gameState);
        return gameState;
      }

      return null;
    } catch (error) {
      console.error('获取游戏状态失败:', error);
      return null;
    }
  }

  // 更新游戏状态
  async updateGameState(roomId, gameState) {
    try {
      // 检查游戏模式的结束条件
      this.checkGameModeEndCondition(gameState);

      // 更新内存中的状态
      this.rooms.set(roomId, gameState);
      // 更新Redis中的状态
      await RedisUtil.set(`game:${roomId}`, JSON.stringify(gameState));
      
      // 批量更新房间内排行榜
      const players = Object.values(gameState.players).map(player => ({
        id: player.id,
        name: player.name,
        score: player.score
      }));
      await RankManager.batchUpdateRoomRank(roomId, players);
      
      // 广播游戏状态更新
      await RedisUtil.publish(`channel:${roomId}`, JSON.stringify({
        type: 'game_state_update',
        gameState
      }));
      
      // 广播排行榜更新
      const rankResult = await RankManager.getRoomRank(roomId);
      if (rankResult.success) {
        await RedisUtil.publish(`channel:${roomId}`, JSON.stringify({
          type: 'rank_update',
          rankList: rankResult.rankList
        }));
      }
    } catch (error) {
      console.error('更新游戏状态失败:', error);
      throw error;
    }
  }

  // 暂停/恢复游戏
  async togglePause(roomId) {
    try {
      const gameState = await this.getGameState(roomId);
      if (!gameState || gameState.status !== 'playing') {
        return { success: false, message: '游戏未开始' };
      }
      
      gameState.isPaused = !gameState.isPaused;
      await this.updateGameState(roomId, gameState);
      
      return { success: true, isPaused: gameState.isPaused };
    } catch (error) {
      console.error('暂停/恢复游戏失败:', error);
      return { success: false, message: '操作失败' };
    }
  }

  // 更新按键映射
  async updateKeyBindings(roomId, playerId, keyBindings) {
    try {
      const gameState = await this.getGameState(roomId);
      if (!gameState || !gameState.players[playerId]) {
        return { success: false, message: '游戏状态或玩家不存在' };
      }
      
      const playerState = gameState.players[playerId];
      // 只更新提供的按键映射
      playerState.keyBindings = {
        ...playerState.keyBindings,
        ...keyBindings
      };
      
      await this.updateGameState(roomId, gameState);
      
      return { success: true, keyBindings: playerState.keyBindings };
    } catch (error) {
      console.error('更新按键映射失败:', error);
      return { success: false, message: '操作失败' };
    }
  }

  // 开始按键修改过程
  async startKeyBindingEdit(roomId, playerId, action) {
    try {
      const gameState = await this.getGameState(roomId);
      if (!gameState || !gameState.players[playerId]) {
        return { success: false, message: '游戏状态或玩家不存在' };
      }
      
      const playerState = gameState.players[playerId];
      // 验证操作类型是否有效
      const validActions = ['moveLeft', 'moveRight', 'moveDown', 'rotateRight', 'rotateLeft', 'hardDrop', 'hold', 'pause'];
      if (!validActions.includes(action)) {
        return { success: false, message: '无效的操作类型' };
      }
      
      // 设置按键修改状态
      if (!playerState.keyBindingEdit) {
        playerState.keyBindingEdit = {};
      }
      playerState.keyBindingEdit.isEditing = true;
      playerState.keyBindingEdit.currentAction = action;
      
      await this.updateGameState(roomId, gameState);
      
      return { success: true, message: '请按下新的按键' };
    } catch (error) {
      console.error('开始按键修改失败:', error);
      return { success: false, message: '操作失败' };
    }
  }

  // 完成按键修改
  async completeKeyBindingEdit(roomId, playerId, key) {
    try {
      const gameState = await this.getGameState(roomId);
      if (!gameState || !gameState.players[playerId]) {
        return { success: false, message: '游戏状态或玩家不存在' };
      }
      
      const playerState = gameState.players[playerId];
      
      // 检查是否正在进行按键修改
      if (!playerState.keyBindingEdit || !playerState.keyBindingEdit.isEditing) {
        return { success: false, message: '未开始按键修改' };
      }
      
      const action = playerState.keyBindingEdit.currentAction;
      
      // 更新按键映射
      playerState.keyBindings[action] = key;
      
      // 清除按键修改状态
      playerState.keyBindingEdit.isEditing = false;
      playerState.keyBindingEdit.currentAction = null;
      
      await this.updateGameState(roomId, gameState);
      
      return { success: true, keyBindings: playerState.keyBindings, message: `已将${action}的按键修改为${key}` };
    } catch (error) {
      console.error('完成按键修改失败:', error);
      return { success: false, message: '操作失败' };
    }
  }

  // 取消按键修改
  async cancelKeyBindingEdit(roomId, playerId) {
    try {
      const gameState = await this.getGameState(roomId);
      if (!gameState || !gameState.players[playerId]) {
        return { success: false, message: '游戏状态或玩家不存在' };
      }
      
      const playerState = gameState.players[playerId];
      
      // 清除按键修改状态
      if (playerState.keyBindingEdit) {
        playerState.keyBindingEdit.isEditing = false;
        playerState.keyBindingEdit.currentAction = null;
      }
      
      await this.updateGameState(roomId, gameState);
      
      return { success: true, message: '已取消按键修改' };
    } catch (error) {
      console.error('取消按键修改失败:', error);
      return { success: false, message: '操作失败' };
    }
  }

  // 处理玩家操作
  async handlePlayerOperation(roomId, playerId, operation) {
    try {
      const gameState = await this.getGameState(roomId);
      if (gameState.isPaused) {
        return; // 游戏暂停时不处理操作
      }
      
      switch (operation.type) {
        case 'moveLeft':
          await this.moveLeft(roomId, playerId);
          break;
        case 'moveRight':
          await this.moveRight(roomId, playerId);
          break;
        case 'moveDown':
          await this.moveDown(roomId, playerId);
          break;
        case 'rotateRight':
          await this.rotate(roomId, playerId, 'right');
          break;
        case 'rotateLeft':
          await this.rotate(roomId, playerId, 'left');
          break;
        case 'hardDrop':
          await this.hardDrop(roomId, playerId);
          break;
        case 'hold':
          await this.hold(roomId, playerId);
          break;
      }
    } catch (error) {
      console.error('处理玩家操作失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
module.exports = new OnlineGameLogic();
